# Nguồn asset

## Hình ảnh

**16x16 DungeonTileset II v1.7** — tác giả Robert (0x72), phối màu lại bởi GrafxKid
- Trang gốc: https://0x72.itch.io/dungeontileset-ii
- Giấy phép: **CC0** ("You can use this tileset for whatever you like (CC-0)" — trang gốc). Không bắt buộc ghi nguồn, ghi để cảm ơn tác giả.
- File gốc: `vendor/0x72/0x72_DungeonTilesetII_v1.7.zip` (416 kB, tải ngày 2026-11-14; tải lại 2026-11-15 cho V5 Phase 10, giải nén ở `vendor/0x72/x/`)
- Game dùng: `assets/atlas.png`, ghép bằng `tools/build_atlas.py` từ 134 khung của gói (V5 Phase 10 thêm 47 khung) + 24 khung của gói Niji bên dưới (V8 G3) = 158 khung. Atlas không có viền; viền sáng quanh nhân vật/quái được game vẽ lúc chạy.

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
| Quỷ nổ (V5 Phase 10) | `chort_*` |
| Nhớt mẹ (V5 Phase 10) | `muddy_anim_*` |
| Kỵ sĩ xương (V5 Phase 10) | `masked_orc_*` |
| Nhân vật Hiệp Sĩ / Tiên Rừng / Thằn Lằn Chiến (V5 Phase 10) | `knight_m_*` / `elf_f_*` / `lizard_m_*` |
| Bình máu, khiên, thuốc gió, thuốc cuồng nộ, bom | `flask_big_red/blue/green/yellow`, `bomb_f0–2` |
| Icon giao diện | `weapon_arrow`, `weapon_red_gem_sword`, `weapon_knife`, `weapon_big_hammer`, `weapon_golden_sword`, `flask_green`, `ui_heart_full`, `skull`… (các icon còn lại vẽ bằng code trong `js/icons.js`) |

**DungeonTileset II Extended v1.1** — tác giả Niji (nijikokun), mở rộng gói của 0x72
- Trang gốc: https://nijikokun.itch.io/dungeontileset-ii-extended
- Giấy phép: **CC0** (như gói gốc của 0x72). Không bắt buộc ghi nguồn, ghi để cảm ơn tác giả.
- File gốc: `dungeontileset-extended.png` (1024×1024, không có danh sách khung), giải nén ở `vendor/niji/dungeontiles-extended v1.1/` (người dùng duyệt ở V8 G3).
- Game dùng: 24 khung (V8 G3), toạ độ đo bằng Pillow ghi ở `tools/niji_tiles.txt`, ghép thêm vào cuối `assets/atlas.png` bằng `tools/build_atlas.py` (khung 0x72 cũ giữ nguyên vị trí và điểm ảnh).

| Trong game | Khung (đặt tên trong `tools/niji_tiles.txt`) |
|---|---|
| Đèn thế giới đợt 1: nến trên trụ đá | `niji_candle_f0–7` |
| Đèn thế giới đợt 2: đuốc (game nhuộm tím) | `niji_torch_f0–7` |
| Đèn thế giới đợt 3–4: ngọn lửa trên khe đất / đống than (đế vẽ bằng code) | `niji_flame_f0–7` |

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
| | | `handleCoins`, `handleCoins2` | (không dùng từ V5 Phase 6, giữ lại để đổi lại nếu cần) |
| Interface Sounds | https://opengameart.org/content/interface-sounds | `glass_001–003` | Nhặt ngọc |
| | | `select_001–002` | Chọn thẻ nâng cấp |

**Nhạc: Juhani Junkala — "5 Chiptunes (Action)"** — https://opengameart.org/content/5-chiptunes-action (CC0)
- `assets/music/level1.webm` ← "Level 1" (nhạc trận thường đợt 1–2)
- `assets/music/level3.webm` ← "Level 3" (nhạc khi có boss)
- `assets/music/title.ogg` ← "Title Screen" (nhạc màn hình tiêu đề, V7 B5)
- `assets/music/level2.ogg` ← "Level 2" (nhạc trận từ đợt 3 trở đi, V7 B5)
- `assets/music/ending.ogg` ← "Ending" (nhạc màn kết thúc chiến thắng, V7 B5)
- Đã chuyển từ WAV 44.1 kHz sang Opus/WebM 96 kbps (`level1`, `level3`) và Ogg Vorbis (`title`, `level2`, `ending`).

### Thêm ở V5 Phase 6 (tải ngày 2026-11-15, đều CC0, file gốc trong `vendor/audio/`)

| Gói | Tác giả / nguồn | Giấy phép (trên trang gốc) | Tải | Tiền tố trong `assets/sfx/` |
|---|---|---|---|---|
| Digital Audio | Kenney — https://kenney.nl/assets/digital-audio | "Creative Commons CC0" (+ License.txt trong gói) | 0.99 MB | `kd_` |
| Interface Sounds | Kenney — https://kenney.nl/assets/interface-sounds | "Creative Commons CC0" | 0.83 MB | `ki_` |
| Music Jingles | Kenney — https://kenney.nl/assets/music-jingles | "Creative Commons CC0" | 1.24 MB | `kj_` |
| The Essential Retro Video Game Sound Effects Collection [512 sounds] | Juhani Junkala (SubspaceAudio) — https://opengameart.org/content/512-sound-effects-8-bit-style | License(s): CC0 | 20.6 MB | `r5_` |

| Trong game | File | Gốc |
|---|---|---|
| Huyết Tiễn bắn / đạn quái | `r5_wpn_laser1.wav` / `r5_wpn_laser9.wav` | 512: Weapons/Lasers |
| Lôi Phạt / Sóng Xung Kích | `r5_exp_shortest_hard1.wav` / `r5_exp_short_soft1.wav` | 512: Explosions |
| Boss xuất hiện / boss chết / bom | `r5_exp_long1/4/2.wav` | 512: Explosions/Long |
| Dậm đất, vùng nổ | `r5_exp_short_hard1.wav` | 512: Explosions/Short |
| Gục | `r5_sounds_negative1.wav` | 512: General Sounds/Negative |
| Cảnh báo | `r5_sounds_error1.wav` | 512: General Sounds/Negative |
| Hồi máu / nhặt vật phẩm | `r5_sounds_powerup3.wav` / `r5_sounds_powerup1.wav` | 512: Positive Sounds |
| Rương / xong nhiệm vụ | `r5_coin_cluster3.wav` / `r5_coin_double1.wav` | 512: Coins |
| Thùng gỗ vỡ | `r5_sounds_impact5.wav` | 512: Impacts |
| Lướt né | `r5_movement_jump1.wav` | 512: Movement |
| Tiến hoá | `r5_movement_portal1.wav` | 512: Portals and Transitions |
| Lên cấp / thắng | `kj_jingles_NES03` / `kj_jingles_NES00` | Music Jingles: 8-Bit |
| Vũ khí lên bậc | `kd_powerUp7` | Digital Audio |
| Đồng hồ băng / khiên đỡ đòn | `kd_zapThreeToneDown` / `kd_phaseJump1` | Digital Audio |
| Thông báo mốc / rê chuột / quay lại | `ki_confirmation_002` / `ki_tick_001` / `ki_back_001` | Interface Sounds |

File `.wav` của gói 512 được `tools/sfx_import.py` đổi về mono 22.05 kHz 16-bit và cắt đuôi im lặng (máy chưa có ffmpeg để nén .ogg); tổng ~0.7 MB.
Danh sách đang chọn: `tools/sfx-pick.json`; nghe thử và đổi bằng `tools/sfx-audition.html`.

Còn tổng hợp bằng WebAudio trong `js/audio.js`: mốc combo, nghi thức mở rương, hết nguy kịch, nhịp tim máu thấp, âm báo trước từng kỹ năng boss (`WINDUP_CUES`), lớp thêm theo bậc vũ khí. Mọi âm đều còn bản tổng hợp làm dự phòng khi không nạp được file.
