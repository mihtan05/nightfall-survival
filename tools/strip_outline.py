"""Xoá viền 1px đã vẽ sẵn trong assets/atlas.png (V5 Phase 1).

Chạy:  python -I tools/strip_outline.py

Viền cũ do tools/build_atlas.py thêm vào: màu tím nhạt alpha 150 (quái, vật phẩm) và vàng alpha 170
(người chơi, rương). Thân sprite luôn đục hoàn toàn (alpha 255), nên điểm ảnh có alpha 150/170 chính
là viền. Viền mới được vẽ lúc chạy ở độ phân giải màn hình (js/render.js, CFG.outline).

- Bản gốc được chép sang tools/backup/atlas.v4.png (chỉ chép lần đầu).
- Chạy lại nhiều lần không sao: lần sau không còn điểm viền nào để xoá.
- Gặp giá trị alpha lạ (khác 0/150/170/255) thì dừng, không ghi gì.
"""
import shutil
import sys
from collections import Counter
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'assets' / 'atlas.png'
BACKUP = ROOT / 'tools' / 'backup' / 'atlas.v4.png'
RING_ALPHA = (150, 170)


def main():
    img = Image.open(SRC).convert('RGBA')
    px = img.load()
    w, h = img.size
    alphas = Counter(px[x, y][3] for y in range(h) for x in range(w))
    print('Số điểm ảnh theo alpha:', dict(sorted(alphas.items())))
    odd = [a for a in alphas if a not in (0, 255, *RING_ALPHA)]
    if odd:
        sys.exit(f'Dừng: có alpha lạ {odd} — không chắc đâu là viền.')
    ring = sum(alphas[a] for a in RING_ALPHA)
    if not ring:
        print('Không còn viền để xoá.')
        return
    if not BACKUP.exists():
        BACKUP.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(SRC, BACKUP)
        print('Đã chép bản gốc sang', BACKUP.relative_to(ROOT))
    for y in range(h):
        for x in range(w):
            if px[x, y][3] in RING_ALPHA:
                px[x, y] = (0, 0, 0, 0)
    img.save(SRC, optimize=True)
    print(f'Đã xoá {ring} điểm viền khỏi {SRC.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
