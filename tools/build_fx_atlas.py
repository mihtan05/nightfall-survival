"""Ghép atlas hiệu ứng từ gói PVFX Foundry 1.0 (CC0) — đọc thẳng trong file zip.

Chạy:  python -I tools/build_fx_atlas.py vendor/pvfx/PVFX-Foundry-1.0.0.zip

- Chỉ lấy các hiệu ứng trong USE (bản "lit": có ánh sáng cộng và trong suốt mềm).
- Mỗi hiệu ứng được cắt sát vùng có hình (hợp của mọi khung) để atlas nhỏ.
- Ghi ra assets/fx.png và js/fx-atlas.js (khung, điểm neo, thời lượng mỗi khung).
"""
import io
import json
import sys
import zipfile
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
PAD = 1
MAX_W = 1024

# tên trong game : id hiệu ứng trong gói
USE = {
    'hitSpark':   'impacts/hit-spark',          # Huyết Tiễn trúng
    'arrowHit':   'projectiles/arrow-impact',   # Dao Bạc trúng
    'claw':       'melee/shadow-claw',          # Vòng Huyết Nguyệt chém
    'spore':      'nature/spore-burst',         # Hào Quang Độc
    'punch':      'impacts/punch-hit',          # Sóng Xung Kích trúng
    'strike':     'lightning/lightning-strike', # Lôi Phạt
    'puff':       'smoke/dust-puff',            # quái nhỏ chết
    'boom':       'explosions/small-explosion', # quỷ khổng lồ chết
    'bigBoom':    'explosions/big-explosion',   # boss chết
    'levelUp':    'ui/level-up',                # lên cấp
    'heartUp':    'ui/heart-pickup',            # nhặt tim
    'magicCircle': 'arcane/magic-circle',       # boss sắp bắn (báo trước)
}


def main(zip_path):
    z = zipfile.ZipFile(zip_path)
    pack = json.loads(z.read('pack.json'))
    by_id = {e['id']: e for e in pack['effects']}

    pieces = []  # (key, frames[Image], pivot, frame_ms, loop)
    for key, eid in USE.items():
        e = by_id[eid]
        grid = e['artifacts']['lit']['grid']
        sheet = Image.open(io.BytesIO(z.read(grid['sheet']))).convert('RGBA')
        fw, fh = e['size']
        frames = [sheet.crop(((i % 8) * fw, (i // 8) * fh, (i % 8) * fw + fw, (i // 8) * fh + fh)) for i in range(e['frames'])]
        # hợp vùng có hình của mọi khung
        boxes = [f.getbbox() for f in frames if f.getbbox()]
        x0 = min(b[0] for b in boxes); y0 = min(b[1] for b in boxes)
        x1 = max(b[2] for b in boxes); y1 = max(b[3] for b in boxes)
        frames = [f.crop((x0, y0, x1, y1)) for f in frames]
        pivot = [e['pivot'][0] - x0, e['pivot'][1] - y0]
        pieces.append((key, eid, frames, pivot, e['frame_ms'], e.get('loop', False)))

    # xếp hàng
    placed, x, y, row_h = [], 0, 0, 0
    for key, eid, frames, pivot, ms, loop in pieces:
        rects = []
        for f in frames:
            w, h = f.size
            if x + w + PAD > MAX_W:
                x, y, row_h = 0, y + row_h + PAD, 0
            rects.append((x, y, w, h))
            x += w + PAD
            row_h = max(row_h, h)
        placed.append((key, eid, frames, rects, pivot, ms, loop))
    out_h = 1 << (y + row_h).bit_length()
    atlas = Image.new('RGBA', (MAX_W, out_h), (0, 0, 0, 0))
    meta = {}
    for key, eid, frames, rects, pivot, ms, loop in placed:
        for f, (rx, ry, _, _) in zip(frames, rects):
            atlas.paste(f, (rx, ry))
        meta[key] = {'id': eid, 'frames': [list(r) for r in rects], 'pivot': pivot, 'ms': ms, 'loop': loop}

    (ROOT / 'src' / 'assets').mkdir(exist_ok=True)
    atlas.save(ROOT / 'src' / 'assets' / 'fx.png', optimize=True)
    js = ("'use strict';\n// TỰ SINH bởi tools/build_fx_atlas.py — không sửa tay.\n"
          "// Nguồn: PVFX Foundry 1.0 (CC0), https://nerijs.itch.io/pvfx-foundry\n"
          f"const FX_ATLAS = {json.dumps({'src': 'assets/fx.png', 'size': atlas.size, 'fx': meta}, separators=(',', ':'))};\n")
    (ROOT / 'src' / 'js' / 'fx-atlas.js').write_text(js, encoding='utf-8')
    total = sum(len(p[2]) for p in pieces)
    print(f'fx atlas {atlas.size}, {len(pieces)} hiệu ứng, {total} khung')
    for key, eid, frames, rects, pivot, ms, loop in placed:
        print(f'  {key:12s} {eid:28s} {len(frames):2d} khung {frames[0].size} {ms}ms pivot {pivot}')


if __name__ == '__main__':
    main(sys.argv[1])
