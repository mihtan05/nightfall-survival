# Nguồn asset

## Hình ảnh

**16x16 DungeonTileset II v1.7** — tác giả Robert (0x72), phối màu lại bởi GrafxKid
- Trang gốc: https://0x72.itch.io/dungeontileset-ii
- Giấy phép: **CC0** ("You can use this tileset for whatever you like (CC-0)" — trang gốc). Không bắt buộc ghi nguồn, ghi để cảm ơn tác giả.
- File gốc: `vendor/0x72/0x72_DungeonTilesetII_v1.7.zip` (416 kB, tải ngày 2026-11-14)
- Game dùng: `assets/atlas.png`, ghép bằng `tools/build_atlas.py` từ 64 khung của gói. Atlas không có viền; viền sáng quanh nhân vật/quái được game vẽ lúc chạy.

| Trong game | Sprite gốc |
|---|---|
| Người chơi (pháp sư) | `wizzard_m_*` |
| Tiểu quỷ | `imp_*` |
| Slime | `swampy_anim_*` |
| Xương khô | `skelet_*` |
| Pháp sư tử linh | `necromancer_anim_*` |
| Quỷ khổng lồ | `ogre_*` |
| Chúa Tể Bóng Đêm (boss) | `big_demon_*` |
| Dao Bạc | `weapon_knife` |
| Vòng Huyết Nguyệt | `weapon_red_gem_sword` |
| Rương, tim | `chest_full_open_anim_f0`, `ui_heart_full` |
| Nền | `floor_1` … `floor_8`, `skull` |
| Boss Vua Thây Ma / Đại Pháp Sư Tử Linh / Quỷ Khổng Lồ Đá | `big_zombie_*` / `necromancer_anim_*` (phóng to) / `ogre_*` (phóng to) |
| Thùng gỗ | `crate` |
| Bình máu, khiên, thuốc gió, thuốc cuồng nộ, bom | `flask_big_red/blue/green/yellow`, `bomb_f0–2` |
| Icon giao diện | `weapon_arrow`, `weapon_red_gem_sword`, `weapon_knife`, `weapon_big_hammer`, `weapon_golden_sword`, `flask_green`, `ui_heart_full`, `skull`… (các icon còn lại vẽ bằng code trong `js/icons.js`) |

## Font

**VT323** — The VT323 Project Authors (Peter Hull)
- Nguồn: https://github.com/google/fonts/tree/main/ofl/vt323 (Google Fonts)
- Giấy phép: **SIL Open Font License 1.1** — bản giấy phép đi kèm tại `assets/fonts/OFL.txt` (bắt buộc giữ khi phân phối font).
- File: `assets/fonts/VT323-Regular.ttf` (tải ngày 2026-11-14). Dùng cho tiêu đề, số, HUD; chữ mô tả dài dùng font hệ thống.

Ngọc XP, Huyết Tiễn, đạn quái, hào quang độc, sóng xung kích và hạt hiệu ứng vẫn vẽ bằng code.

## Hiệu ứng (VFX)

**PVFX Foundry 1.0** — Pixel VFX Studio (nerijs)
- Trang gốc: https://nerijs.itch.io/pvfx-foundry
- Giấy phép: **CC0 1.0** cho các file `sprite-sheet.png` và `manifest.json` (theo LICENSE.txt trong gói). Không bắt buộc ghi nguồn; tác giả gợi ý: "VFX from PVFX Foundry by Pixel VFX Studio".
- Trang gốc ghi tác giả có dùng AI hỗ trợ khi phát triển gói.
- File gốc: `vendor/pvfx/PVFX-Foundry-1.0.0.zip` (9.2 MB, tải ngày 2026-11-14)
- Game dùng: `assets/fx.png`, ghép bằng `tools/build_fx_atlas.py` (bản "lit") từ 12 hiệu ứng:

| Trong game | Hiệu ứng gốc |
|---|---|
| Huyết Tiễn trúng | `impacts/hit-spark` |
| Dao Bạc trúng | `projectiles/arrow-impact` |
| Vòng Huyết Nguyệt chém | `melee/shadow-claw` |
| Hào Quang Độc | `nature/spore-burst` |
| Sóng Xung Kích trúng | `impacts/punch-hit` |
| Lôi Phạt | `lightning/lightning-strike` |
| Quái nhỏ chết | `smoke/dust-puff` |
| Quỷ khổng lồ chết | `explosions/small-explosion` |
| Boss chết | `explosions/big-explosion` |
| Lên cấp | `ui/level-up` |
| Nhặt tim | `ui/heart-pickup` |
| Boss sắp bắn | `arcane/magic-circle` |

## Âm thanh

Tất cả gói dưới đây là **CC0** (tải ngày 2026-11-14, file gốc trong `vendor/audio/`). Không bắt buộc ghi nguồn.

**Kenney** (www.kenney.nl) — game dùng 20 file trong `assets/sfx/`:

| Gói | Nguồn | File dùng | Trong game |
|---|---|---|---|
| Impact Sounds (1.0) | https://kenney.nl/assets/impact-sounds | `impactPunch_medium_000–004` | Trúng đòn |
| | | `impactSoft_heavy_000–002` | Quái chết |
| | | `impactPunch_heavy_000–001` | Người chơi bị đánh |
| 50 RPG sound effects | https://opengameart.org/content/50-rpg-sound-effects | `knifeSlice`, `knifeSlice2` | Dao Bạc |
| | | `chop` | Vòng Huyết Nguyệt |
| | | `handleCoins`, `handleCoins2` | Mở rương |
| Interface Sounds | https://opengameart.org/content/interface-sounds | `glass_001–003` | Nhặt ngọc |
| | | `select_001–002` | Chọn thẻ nâng cấp |

**Nhạc: Juhani Junkala — "5 Chiptunes (Action)"** — https://opengameart.org/content/5-chiptunes-action (CC0)
- `assets/music/level1.webm` ← "Level 1" (nhạc trận thường)
- `assets/music/level3.webm` ← "Level 3" (nhạc khi có boss)
- Đã chuyển từ WAV 44.1 kHz (13–14 MB/bài) sang Opus/WebM 96 kbps (~0.9 MB/bài).

Các âm phép thuật (bắn tiễn, sét, sóng, boss gầm, lên cấp, thắng/thua…) vẫn tổng hợp bằng WebAudio trong `js/audio.js`; đây cũng là âm dự phòng khi không nạp được file.
