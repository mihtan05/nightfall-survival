"""Ghép atlas cho game từ gói 0x72 DungeonTileset II (CC0).

Chạy:  python -I tools/build_atlas.py vendor/0x72/x/0x72_DungeonTilesetII_v1.7/0x72_DungeonTilesetII_v1.7.png vendor/0x72/x/0x72_DungeonTilesetII_v1.7/tile_list_v1.7 "vendor/niji/dungeontiles-extended v1.1/dungeontileset-extended.png" tools/niji_tiles.txt

- Hai tham số cuối (tuỳ chọn, V8 G3): ảnh + danh sách khung của gói thứ hai (Niji "DungeonTileset II Extended", CC0);
  mọi khung trong danh sách đó được thêm SAU các khung 0x72 (không lề) nên toạ độ khung cũ không đổi.

- Chỉ lấy các khung game dùng (danh sách NEEDED bên dưới).
- Mỗi khung đặt trong ô có 2px đệm trong suốt để không "lem" sang khung bên cạnh.
- Nhân vật/quái/vật phẩm (mục có màu trong NEEDED) được chừa lề trong suốt 1px quanh khung.
  Từ V5 atlas KHÔNG còn viền vẽ sẵn: viền vẽ lúc chạy ở độ phân giải màn hình (js/render.js).
  Màu trong NEEDED chỉ còn đánh dấu "khung có lề"; hàm outline() giữ lại để tham khảo.
- Ghi ra assets/atlas.png và js/atlas.js (toạ độ từng khung).
"""
import json
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
PAD = 2

# (tiền tố hoặc tên, số khung, có viền?, màu viền RGBA)
LIGHT = (232, 220, 255, 150)
GOLD = (255, 228, 160, 170)
NEEDED = [
    ('wizzard_m_idle_anim_f', 4, GOLD), ('wizzard_m_run_anim_f', 4, GOLD), ('wizzard_m_hit_anim_f', 1, GOLD),
    ('imp_idle_anim_f', 4, LIGHT), ('imp_run_anim_f', 4, LIGHT),
    ('swampy_anim_f', 4, LIGHT),
    ('skelet_idle_anim_f', 4, LIGHT), ('skelet_run_anim_f', 4, LIGHT),
    ('necromancer_anim_f', 4, LIGHT),
    ('ogre_idle_anim_f', 4, LIGHT), ('ogre_run_anim_f', 4, LIGHT),
    ('big_demon_idle_anim_f', 4, LIGHT), ('big_demon_run_anim_f', 4, LIGHT),
    ('weapon_knife', 0, LIGHT), ('weapon_red_gem_sword', 0, LIGHT),
    ('chest_full_open_anim_f', 3, GOLD), ('ui_heart_full', 0, LIGHT),
    ('floor_', 8, None), ('skull', 0, None),
    # Giai đoạn 5: boss thây ma, thùng phá được, vật phẩm, icon
    ('big_zombie_idle_anim_f', 4, LIGHT), ('big_zombie_run_anim_f', 4, LIGHT),
    ('crate', 0, LIGHT), ('bomb_f', 3, LIGHT),
    ('flask_big_red', 0, LIGHT), ('flask_big_blue', 0, LIGHT), ('flask_big_green', 0, LIGHT), ('flask_big_yellow', 0, LIGHT),
    ('weapon_arrow', 0, None), ('weapon_red_magic_staff', 0, None), ('weapon_big_hammer', 0, None),
    ('weapon_golden_sword', 0, None), ('flask_green', 0, None), ('flask_blue', 0, None), ('flask_yellow', 0, None),
    # V5 Phase 10: sprite riêng cho quái biến thể (quỷ nổ = chort, nhớt mẹ = muddy, kỵ sĩ = masked_orc) + 3 nhân vật (skin)
    ('chort_idle_anim_f', 4, LIGHT), ('chort_run_anim_f', 4, LIGHT), ('muddy_anim_f', 4, LIGHT),
    ('masked_orc_idle_anim_f', 4, LIGHT), ('masked_orc_run_anim_f', 4, LIGHT),
    ('knight_m_idle_anim_f', 4, GOLD), ('knight_m_run_anim_f', 4, GOLD), ('knight_m_hit_anim_f', 1, GOLD),
    ('elf_f_idle_anim_f', 4, GOLD), ('elf_f_run_anim_f', 4, GOLD), ('elf_f_hit_anim_f', 1, GOLD),
    ('lizard_m_idle_anim_f', 4, GOLD), ('lizard_m_run_anim_f', 4, GOLD), ('lizard_m_hit_anim_f', 1, GOLD),
]


def parse_tile_list(path):
    tiles = {}
    for line in Path(path).read_text(encoding='utf-8').splitlines():
        parts = line.split()
        if not parts or parts[0].startswith('#'):
            continue
        if len(parts) >= 5:
            name, x, y, w, h = parts[0], *map(int, parts[1:5])
            tiles[name] = (x, y, w, h)
    return tiles


def outline(img, color):
    """Thêm viền 1px (8 hướng) quanh pixel không trong suốt. img đã có đệm."""
    w, h = img.size
    src = img.load()
    out = img.copy()
    dst = out.load()
    for y in range(h):
        for x in range(w):
            if src[x, y][3] > 0:
                continue
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h and src[nx, ny][3] > 0:
                        dst[x, y] = color
                        break
                else:
                    continue
                break
    return out


def main(atlas_path, list_path, extra_path=None, extra_list=None):
    tiles = parse_tile_list(list_path)
    sheet = Image.open(atlas_path).convert('RGBA')
    src = {}   # tên khung -> ảnh nguồn (mặc định: gói 0x72)

    names = []
    for base, n, col in NEEDED:
        group = [base + str(i) for i in range(n)] if n else [base]
        if base == 'floor_':
            group = [f'floor_{i}' for i in range(1, n + 1)]
        for name in group:
            if name not in tiles:
                sys.exit(f'Không tìm thấy khung: {name}')
            names.append((name, col))
    if extra_path:
        extra = Image.open(extra_path).convert('RGBA')
        for name, rect in parse_tile_list(extra_list).items():
            tiles[name] = rect
            src[name] = extra
            names.append((name, None))

    # xếp theo hàng (shelf packing), rộng tối đa 256px
    cells, x, y, row_h, max_w = [], 0, 0, 0, 256
    for name, col in names:
        _, _, w, h = tiles[name]
        cw, ch = w + PAD * 2, h + PAD * 2
        if x + cw > max_w:
            x, y, row_h = 0, y + row_h, 0
        cells.append((name, col, x, y))
        x += cw
        row_h = max(row_h, ch)
    out_h = y + row_h
    out_h = 1 << (out_h - 1).bit_length()
    atlas = Image.new('RGBA', (max_w, out_h), (0, 0, 0, 0))

    frames = {}
    for name, col, cx, cy in cells:
        sx, sy, w, h = tiles[name]
        cell = Image.new('RGBA', (w + PAD * 2, h + PAD * 2), (0, 0, 0, 0))
        cell.paste(src.get(name, sheet).crop((sx, sy, sx + w, sy + h)), (PAD, PAD))
        if col:
            # V5: KHÔNG vẽ viền vào atlas nữa (viền vẽ lúc chạy, xem CFG.outline trong js/data.js);
            # vẫn giữ lề trong suốt 1px để toạ độ khung và điểm neo trong SPRITES không đổi.
            frames[name] = [cx + PAD - 1, cy + PAD - 1, w + 2, h + 2]
        else:
            frames[name] = [cx + PAD, cy + PAD, w, h]
        atlas.paste(cell, (cx, cy))

    (ROOT / 'assets').mkdir(exist_ok=True)
    atlas.save(ROOT / 'assets' / 'atlas.png', optimize=True)
    js = ("'use strict';\n// TỰ SINH bởi tools/build_atlas.py — không sửa tay.\n"
          "// Nguồn: 0x72 DungeonTileset II v1.7 (CC0), https://0x72.itch.io/dungeontileset-ii\n"
          + ("// + Niji DungeonTileset II Extended v1.1 (CC0), https://nijikokun.itch.io/dungeontileset-ii-extended\n" if extra_path else "") +
          f"const ATLAS = {json.dumps({'src': 'assets/atlas.png', 'size': atlas.size, 'frames': frames}, separators=(',', ':'))};\n")
    (ROOT / 'js' / 'atlas.js').write_text(js, encoding='utf-8')
    print(f'atlas {atlas.size}, {len(frames)} khung')


if __name__ == '__main__':
    main(*sys.argv[1:5])
