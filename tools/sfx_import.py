# -*- coding: utf-8 -*-
"""Nhập âm đã chọn (V5 Phase 6) vào assets/sfx/.

Cách dùng (ở thư mục gốc dự án):  python -I tools/sfx_import.py [tools/sfx-pick.json]
- tools/sfx-pick.json: { "sự_kiện": ["đường/dẫn/nguồn", ...] } — in ra từ tools/sfx-audition.html.
- .ogg: chép nguyên. .wav: đổi về mono, hạ mẫu 44.1 kHz → 22.05 kHz (lọc trung bình 2 mẫu), cắt đuôi im lặng
  dưới -60 dBFS (giữ 20 ms tắt dần), ghi WAV 16-bit. Máy không có ffmpeg nên chưa nén được sang .ogg.
- Nguồn đã nằm trong assets/sfx/ thì giữ nguyên.
- File đích đã có mà khác nội dung → chép bản cũ vào tools/backup/ trước khi ghi đè.
In ra danh sách `files` cho từng sự kiện để dán vào SFX_FILES (js/audio.js).
Tên file đích phải khớp hàm sfxGameName trong tools/sfx-candidates.js.
"""
import json, os, re, shutil, sys, wave
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AS = 'assets/sfx/'
PREFIX = [('vendor/audio/kenney-digital-audio/', 'kd_'), ('vendor/audio/kenney-interface-sounds/', 'ki_'),
          ('vendor/audio/kenney-music-jingles/', 'kj_')]


def game_name(src):
    base = re.sub(r'\.(ogg|wav)$', '', src.split('/')[-1], flags=re.I)
    base = re.sub(r'[^A-Za-z0-9_]+', '_', base)
    if src.startswith(AS):
        return base
    for p, pre in PREFIX:
        if src.startswith(p):
            return pre + base
    return 'r5_' + re.sub(r'^sfx_', '', base)


def backup(dst):
    os.makedirs(os.path.join(ROOT, 'tools/backup'), exist_ok=True)
    b = os.path.join(ROOT, 'tools/backup', os.path.basename(dst) + '.v5')
    if not os.path.exists(b):
        shutil.copy2(dst, b)


def write_if_changed(dst, data):
    if os.path.exists(dst):
        with open(dst, 'rb') as f:
            if f.read() == data:
                return False
        backup(dst)
    with open(dst, 'wb') as f:
        f.write(data)
    return True


def convert_wav(path):
    with wave.open(path, 'rb') as w:
        ch, sw, sr, n = w.getnchannels(), w.getsampwidth(), w.getframerate(), w.getnframes()
        raw = w.readframes(n)
    if sw == 2:
        x = np.frombuffer(raw, '<i2').astype(np.float32) / 32768
    elif sw == 1:
        x = (np.frombuffer(raw, 'u1').astype(np.float32) - 128) / 128
    elif sw == 3:
        b = np.frombuffer(raw, 'u1').reshape(-1, 3).astype(np.int32)
        v = b[:, 0] | (b[:, 1] << 8) | (b[:, 2] << 16)
        x = np.where(v >= 1 << 23, v - (1 << 24), v).astype(np.float32) / (1 << 23)
    else:
        raise ValueError('không hỗ trợ độ sâu %d byte' % sw)
    x = x.reshape(-1, ch).mean(axis=1)
    if sr % 22050 == 0 and sr > 22050:  # hạ mẫu theo bội số nguyên, lọc trung bình
        k = sr // 22050
        x = x[: len(x) // k * k].reshape(-1, k).mean(axis=1)
        sr = 22050
    th = 10 ** (-60 / 20)
    loud = np.nonzero(np.abs(x) > th)[0]
    if len(loud):
        end = min(len(x), loud[-1] + int(sr * 0.02))
        x = x[:end].copy()
        fade = min(len(x), int(sr * 0.02))
        x[-fade:] *= np.linspace(1, 0, fade)
    pcm = (np.clip(x, -1, 1) * 32767).astype('<i2').tobytes()
    import io
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes(pcm)
    return buf.getvalue()


def main():
    pick_path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'tools/sfx-pick.json')
    with open(pick_path, encoding='utf-8') as f:
        pick = json.load(f)
    out, total = {}, 0
    for ev, srcs in pick.items():
        names = []
        for src in srcs:
            full = os.path.join(ROOT, 'src', src) if src.startswith(AS) else os.path.join(ROOT, src)
            name = game_name(src)
            if src.startswith(AS):
                names.append(name if src.endswith('.ogg') else os.path.basename(src))
                continue
            if not os.path.exists(full):
                print('THIẾU', src); continue
            if src.lower().endswith('.wav'):
                data, fname = convert_wav(full), name + '.wav'
            else:
                with open(full, 'rb') as f:
                    data = f.read()
                fname = name + '.ogg'
            changed = write_if_changed(os.path.join(ROOT, 'src', AS, fname), data)
            total += len(data)
            print('%-10s %-34s %6.1f kB%s' % (ev, fname, len(data) / 1024, '' if changed else ' (không đổi)'))
            names.append(name if fname.endswith('.ogg') else fname)
        out[ev] = names
    print('Tổng file mới: %.1f kB' % (total / 1024))
    print('\n// files cho SFX_FILES:')
    for ev, names in out.items():
        print("  %s: [%s]," % (ev, ', '.join("'%s'" % n for n in names)))


if __name__ == '__main__':
    main()
