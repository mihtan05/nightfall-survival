# Đêm Sinh Tồn — Review bản hiện tại và kế hoạch v3 (giao cho Opus)

Tài liệu này tự đủ để một phiên làm việc mới thực hiện mà không cần đọc lại lịch sử chat.

## 0. Bối cảnh

- Game: mini game kiểu Vampire Survivors, chạy trong trình duyệt. Toàn bộ nằm trong `index.html` (~950 dòng: CSS + JS thuần, Canvas 2D, không build).
- Đã có (Bản 2): 6 vũ khí × 8 cấp, 8 bị động, 6 loại quái (dơi, slime, xương, ma bắn xa, golem, boss), 11 sự kiện trong ván 10 phút, rương boss, tim hồi máu, hạt, rung màn, âm thanh tự sinh bằng WebAudio.
- Mọi hình ảnh hiện vẽ bằng code trong `SHAPES`. Hàm `draw(c, e, kind)` đã có sẵn nhánh sprite: nếu `ASSETS[kind]` có ảnh thì vẽ sprite, không thì vẽ hình code.
- Dữ liệu cân bằng ở đầu file: `CFG`, `ENEMIES`, `WAVES`, `EVENTS`, `WEAPONS`, `PASSIVES`.
- Hook test: `window.__vs` (`tick(sec)`, `spawn(n, type)`, `give(id, lvl)`, `spawnBoss()`, `addXp`, `choose`, `G`).
- Chạy: `python -m http.server 8765` trong thư mục game, mở `http://localhost:8765/index.html`.

## 1. Lỗi khựng phím WASD

### Đã tái hiện được (chắc chắn)

| # | Nguyên nhân | Bằng chứng | Cách sửa |
|---|---|---|---|
| 1 | **Mất phím sau mỗi lần lên cấp.** `openLevelUp()` gọi `keys.clear()`. Khi chọn thẻ xong, phím đang giữ không được ghi nhận lại, vì hệ điều hành chỉ lặp phím bấm sau cùng (hoặc không lặp nữa nếu vừa bấm 1/2/3). Nhân vật đứng im đến khi nhả ra bấm lại. Một ván có ~49 lần lên cấp. | Giữ `D`, lên cấp, chọn thẻ bằng phím `1`, chạy tiếp 1 giây: nhân vật di chuyển 0px (trước đó 75px/0.5s). | Không xoá `keys` khi mở level-up. Chỉ bỏ qua input khi `state !== 'play'`. Xoá `keys` duy nhất ở sự kiện `blur`. |
| 2 | **Bộ gõ tiếng Việt (Telex/Unikey).** Code đọc `e.key`. Với Telex, `w` → `ư`, `a/s/d` là phím dấu, hoặc trình duyệt trả `e.key = "Process"`. Các giá trị này không khớp `'w'/'a'/'s'/'d'`. | Gửi keydown với `key:'Process', code:'KeyW'` và `key:'ư', code:'KeyW'`: nhân vật di chuyển 0px. | Đọc phím vật lý bằng `e.code` (`KeyW`, `KeyA`, `KeyS`, `KeyD`, `ArrowUp`…). Unikey có thể nuốt hẳn sự kiện ở tầng hệ điều hành, nên thêm một dòng gợi ý ở menu: "Tắt bộ gõ tiếng Việt hoặc dùng phím mũi tên". |

### Rất có khả năng (đọc code, chưa đo được vì pane trình duyệt bị ẩn khi test)

| # | Nguyên nhân | Cách sửa |
|---|---|---|
| 3 | **Hai phím ngược chiều triệt tiêu nhau.** Đang giữ `A`, bấm `D` trước khi nhả `A` → vector = 0 → đứng im. Đổi hướng nhanh là dính. | Phím bấm sau thắng: lưu thứ tự bấm cho từng trục, lấy phím mới nhất. |
| 4 | **Giật hình do bước cố định 60Hz không nội suy.** Trên màn 75/120/144Hz, có khung không cập nhật, có khung cập nhật 1 bước. Trên màn 60Hz, sai số `requestAnimationFrame` thỉnh thoảng cho 0 hoặc 2 bước mỗi khung. | Lưu vị trí bước trước (`px, py`) cho người chơi, quái, đạn; khi vẽ nội suy theo `alpha = acc / step`. Camera bám vị trí nội suy. |
| 5 | **Rác bộ nhớ và việc vẽ thừa mỗi khung.** `inputVec()` tạo object mỗi bước; `nearestEnemies` tạo mảng và sort; `createRadialGradient` 2 lần mỗi khung; `drawGround` vẽ từng ô (tới ~900 ô × nhiều `fillRect`) mỗi khung; `strokeText` cho tới 160 số sát thương. | Dùng lại object/mảng; vẽ vignette và nền ra canvas đệm một lần (nền: một tấm lặp 16×16 ô, dịch theo camera); vẽ số sát thương bằng font bitmap hoặc cache theo giá trị. |
| 6 | **Nút giữ focus.** Sau khi bấm chuột vào nút tạm dừng/âm thanh, nút vẫn giữ focus; phím `Space` kích hoạt lại nút. | Gọi `blur()` sau khi bấm, đặt `tabindex="-1"` cho nút HUD. |
| 7 | **Joystick kẹt.** Nếu `pointerup` xảy ra ngoài cửa sổ, `joy.active` giữ nguyên vector cũ. | Lắng nghe `pointerup`/`lostpointercapture` trên `window`. |

**Tiêu chí nghiệm thu mục 1** (kiểm bằng `__vs` và sự kiện bàn phím giả):
- Giữ `D` → lên cấp → chọn thẻ bằng phím `1` → nhân vật chạy tiếp ngay, không cần bấm lại.
- keydown với `code:'KeyW'` và `key` bất kỳ (`'ư'`, `'Process'`, `'W'`) đều làm nhân vật đi lên.
- Giữ `A` rồi bấm thêm `D` → đi sang phải; nhả `D` → quay lại đi sang trái.
- Bật hiển thị thời gian khung (phím `F`): không có khung nào vượt 20ms trong 60 giây chơi với 300 quái.

## 2. Review bản hiện tại (góc nhìn kỹ sư game + đồ hoạ/giao diện)

### Điểm tốt nên giữ
- Kiến trúc dữ liệu: thêm vũ khí/quái chỉ cần thêm một mục. Pool + spatial hash chạy 400 quái ở ~1ms/bước.
- Vòng chơi đầy đủ: lên cấp, sự kiện, boss, rương, thắng/thua, kỷ lục.
- Nhánh sprite trong `draw()` đã có, thay asset không cần viết lại gameplay.

### Vấn đề, xếp theo mức ảnh hưởng

**A. Khó nhìn (nghiêm trọng nhất sau lỗi phím)**
1. Mọi thứ tối trên nền tối: dơi `#2e2140` trên nền `#14111d`, vignette đen 55%. Ảnh chụp cho thấy phải căng mắt mới thấy quái.
2. Nền gần như phẳng, ô lưới rất mờ, không có mốc. Người chơi khó cảm nhận mình đang di chuyển, cộng hưởng với cảm giác "khựng".
3. Nhân vật và quái quá nhỏ: bán kính 12px trên màn 1080p. Không có tỉ lệ camera, nên màn càng to vật thể càng bé.
4. Không sắp xếp theo trục Y: quái phía sau vẽ đè lên quái phía trước.

**B. Thiếu phản hồi khi đánh (game feel)**
5. Quái chết biến mất tức thì, chỉ có vài hạt vuông. Không có animation trúng đòn/chết, không có hit-stop.
6. Đòn của quái không báo trước: vòng đạn boss và đạn ma xuất hiện không có dấu hiệu chuẩn bị.
7. Số sát thương cùng cỡ, cùng màu trắng; không phân biệt đòn mạnh.
8. Âm thanh là sóng vuông/răng cưa tổng hợp, nghe chói khi dồn dập. Không có nhạc.

**C. Giao diện**
9. Icon là ký tự Unicode/emoji (`✦ ◐ ⚡ † ☣ 🔊`): mỗi máy hiện một kiểu, có máy hiện ô vuông.
10. Máu chỉ là dòng chữ nhỏ góc trái và thanh 28px dưới chân. Thông tin sống còn nhất lại khó đọc nhất.
11. Lên cấp cắt ngang ván quá dày (trung bình ~12 giây một lần), thẻ hiện tức thì không có khoảng khoá input: trên điện thoại ngón tay đang kéo joystick dễ bấm nhầm thẻ.
12. Không có màn tạm dừng hiển thị chỉ số/vũ khí, không có cài đặt âm lượng.
13. Nút HUD 36px, nhỏ hơn mức chạm tối thiểu 44px trên điện thoại.
14. Font hệ thống, không có bản sắc.

**D. Cân bằng và nội dung**
15. Độ khó chưa có người thật thử. Bot né tốt nhất vẫn chết ở boss đầu (~2:40).
16. Chưa có tiến hoá vũ khí, chưa có mục tiêu chơi lại.

**E. Kỹ thuật**
17. Một file 950 dòng: thêm asset và UI nữa sẽ khó bảo trì.
18. Các điểm hiệu năng đã nêu ở mục 1 (#4, #5).

## 3. Asset đề xuất

Nguyên tắc: **một gói hình chính** để đồng nhất phong cách, chỉ CC0, ghi nguồn vào `CREDITS.md`.

| Hạng mục | Gói | Giấy phép | Ghi chú |
|---|---|---|---|
| Nhân vật, quái, boss, vũ khí, nền, rương, tim | **0x72 — 16x16 DungeonTileset II** — https://0x72.itch.io/dungeontileset-ii | CC0 theo tác giả trả lời trong phần bình luận trang itch | Phải kiểm lại ô "License" trên trang khi tải. Sprite 16px có animation idle/run. |
| Hit effect, nổ, sét | **Nerijs — PVFX Foundry Thirteen** — https://nerijs.itch.io/pvfx-foundry-thirteen | CC0 | 13 hiệu ứng 96×96, 20 FPS, ~294 kB (có Electric Impact, Warm Explosion). |
| Nổ khi quái/boss chết | **Aim Studios — Explosions Pixel Art** — https://aim-studios.itch.io/explosions-pixel-art | CC0 | 9 sprite sheet, 5 kiểu nổ, 32×32 và 64×64. |
| SFX đánh, trúng, nhặt đồ, UI | **Kenney — Impact Sounds, RPG Audio, Interface Sounds, Digital Audio** — https://kenney.nl/assets | CC0 (Digital Audio đã thấy ghi CC0 trên kenney.nl; ba gói còn lại kiểm trên trang khi tải) | Chọn ~15 file, không tải cả gói vào game. |
| Nhạc nền | **Juhani Junkala — 5 Chiptunes (Action)** — https://opengameart.org/content/5-chiptunes-action | CC0 | 5 bản lặp liền mạch. Tông khá tươi, **cần nghe thử**; nếu không hợp chủ đề gothic thì tìm bản CC0 khác trên OpenGameArt. |
| Font | **VT323** (Google Fonts) | OFL | Có bộ ký tự tiếng Việt. Dùng cho tiêu đề, số, HUD; chữ mô tả dài vẫn dùng font hệ thống cho dễ đọc. Không dùng Tiny5 (không có tiếng Việt). |
| Dự phòng | **Kenney — Tiny Dungeon** — https://kenney-assets.itch.io/tiny-dungeon | CC0 | Dùng nếu gói 0x72 thiếu sprite nào đó. Phong cách khác 0x72, không trộn tuỳ tiện. |

### Ánh xạ vào game (tên sprite theo trí nhớ về gói 0x72, **phải đối chiếu file danh sách tile trong gói sau khi tải**)

| Trong game | Sprite dự kiến | Thay đổi kèm theo |
|---|---|---|
| Người chơi (pháp sư) | `wizzard_m` idle/run/hit | — |
| Dơi (nhanh, yếu) | `imp` | Gói không có dơi; đổi tên thành "Tiểu quỷ" |
| Slime | `swampy` hoặc `muddy` | — |
| Xương khô | `skelet` | — |
| Ma bắn xa | `necromancer` hoặc `orc_shaman` | Đổi tên thành "Pháp sư tử linh"; hợp vai bắn phép hơn |
| Golem | `ogre` hoặc `big_zombie` (32px) | Đổi tên theo sprite |
| Boss | `big_demon` (32×36), vẽ phóng to thêm | — |
| Dao Bạc | `weapon_knife` | — |
| Vòng Huyết Nguyệt | `weapon_red_gem_sword` xoay quanh người | — |
| Rương, tim, bình máu | `chest_*_open_anim`, `ui_heart_full`, `flask_big_red` | — |
| Nền | `floor_1…8` + cột, đầu lâu, thùng làm vật trang trí | — |
| Ngọc XP, Huyết Tiễn, đạn quái, hào quang, sóng | Giữ vẽ bằng code, chỉnh màu cho hợp bảng màu gói | Gói không có các sprite này |
| Sét, trúng đòn, nổ | PVFX Foundry Thirteen + Aim Studios | — |

## 4. Kế hoạch thực hiện (theo thứ tự, mỗi giai đoạn chơi được và kiểm được)

### Ràng buộc chung
- **Tải file phải hỏi người dùng trước**: liệt kê tên file, nguồn, dung lượng, chờ đồng ý rồi mới tải. Giải nén mỗi gói vào thư mục riêng `vendor/<tên gói>/`, chỉ chép file thực sự dùng sang `assets/`.
- Thiếu asset nào thì game vẫn chạy bằng hình vẽ code / âm tổng hợp (giữ cơ chế fallback hiện có).
- Không đổi luật chơi và số cân bằng ngoài những chỗ kế hoạch nêu.
- Sau mỗi giai đoạn: mở game trong trình duyệt, không lỗi console, chạy bài kiểm của giai đoạn đó, chụp ảnh màn hình.
- Giữ `window.__vs`.

### Giai đoạn 0 — Sửa input và nhịp khung hình (không cần asset, làm trước tiên)
1. Sửa #1, #2, #3, #6, #7 ở mục 1.
2. Nội suy khi vẽ (#4).
3. Bỏ rác bộ nhớ và cache nền/vignette (#5).
4. Phím `F` hiện thêm thời gian khung lớn nhất trong 1 giây gần nhất.

Nghiệm thu: bốn tiêu chí ở cuối mục 1.

### Giai đoạn 1 — Nền tảng dựng hình
1. Tách file: `index.html`, `css/game.css`, `js/` (`data.js`, `input.js`, `audio.js`, `render.js`, `game.js`, `ui.js`) nạp bằng thẻ `<script>` thường (không dùng ES module để vẫn mở được bằng `file://`).
2. Tỉ lệ camera: thế giới luôn cao ~360 đơn vị, phóng theo bội số nguyên của 16px; tắt làm mịn ảnh. Vùng spawn và vòng vây tính theo kích thước thế giới nhìn thấy, không theo pixel màn hình.
3. Bộ nạp sprite sheet + animator: mỗi mục trong `ASSETS` khai báo các animation (`idle`, `run`, `hit`, `die`) gồm danh sách khung và tốc độ.
4. Sắp xếp theo Y khi vẽ quái + người chơi; bóng đổ dưới chân.
5. Tăng tương phản tạm thời cho hình vẽ code (viền sáng 1px quanh quái, giảm vignette xuống ~30%).

Nghiệm thu: ở 1366×768 và 1920×1080 nhân vật chiếm cùng tỉ lệ chiều cao màn hình; quái đứng thấp hơn luôn vẽ đè quái đứng cao hơn; thời gian vẽ khung ≤ 4ms với 300 quái.

### Giai đoạn 2 — Tích hợp hình ảnh
1. Xin phép và tải gói 0x72; kiểm ô License; đối chiếu tên sprite với bảng ánh xạ, cập nhật bảng nếu khác.
2. Ghép các khung cần dùng thành 1 atlas (`assets/atlas.png` + khai báo toạ độ trong `data.js`).
3. Thay lần lượt: người chơi → quái → boss → vật phẩm → vũ khí → nền. Đổi tên hiển thị của quái theo bảng.
4. Quái trúng đòn nháy trắng (vẽ lại sprite với `globalCompositeOperation`), có animation chết ngắn (thu nhỏ + mờ dần 0.2s) thay cho biến mất tức thì.
5. Viết `CREDITS.md` (tên gói, tác giả, đường dẫn, giấy phép).

Nghiệm thu: không còn hình vẽ code nào cho các mục có sprite trong bảng; xoá thử `atlas.png` thì game vẫn chạy bằng hình code; ảnh chụp cho thấy quái nổi rõ trên nền.

### Giai đoạn 3 — Hiệu ứng và cảm giác đánh
1. Xin phép và tải 2 gói hiệu ứng; đưa vào atlas hiệu ứng riêng.
2. Hiệu ứng trúng đòn theo vũ khí; nổ khi quái chết (to hơn với golem/boss); sét dùng sprite.
3. Hit-stop 40–60ms khi hạ quái to/boss; rung màn có giới hạn và có công tắc.
4. Báo trước đòn: boss loé sáng 0.5s trước khi bắn vòng đạn; pháp sư tử linh giơ tay 0.3s trước khi bắn; vòng vây hiện vòng tròn cảnh báo 1s trước khi quái xuất hiện.
5. Số sát thương: cỡ và màu theo độ lớn; gộp số khi một quái trúng nhiều đòn liên tiếp.

Nghiệm thu: mỗi vũ khí có hiệu ứng trúng nhận ra được trên ảnh chụp; giới hạn hạt + hiệu ứng vẫn giữ khung ≤ 16ms với 300 quái và đủ 6 vũ khí cấp 8.

### Giai đoạn 4 — Âm thanh
1. Xin phép và tải các gói Kenney + nhạc; chọn ~15 SFX, chuyển về `.ogg` nếu cần.
2. Nạp bằng `fetch` + `decodeAudioData`; nếu thất bại (mở bằng `file://`) thì dùng âm tổng hợp hiện có.
3. Giới hạn số âm cùng loại phát đồng thời, đổi cao độ ngẫu nhiên ±5% để đỡ nhàm.
4. Nhạc nền lặp; đổi bản khi có boss; nhỏ lại khi tạm dừng/lên cấp.
5. Hai thanh âm lượng (nhạc, hiệu ứng), lưu `localStorage`.

Nghiệm thu: 300 quái chết dồn dập không gây vỡ tiếng; tắt mạng/đổi sang `file://` vẫn có tiếng tổng hợp. Cần người nghe thật xác nhận, vì kiểm tự động không nghe được.

### Giai đoạn 5 — Giao diện
1. Font VT323 cho tiêu đề/số (nhúng file font vào `assets/`, có font dự phòng).
2. Icon vũ khí/bị động lấy từ sprite thay ký tự Unicode; nút HUD dùng icon vẽ, tối thiểu 44px.
3. Thanh máu lớn cạnh thanh XP ở mép trên; viền màn hình đỏ nhịp khi máu dưới 25%.
4. Thẻ nâng cấp: hiện có animation 0.2s và khoá input 0.35s; hiện rõ "Cấp 3 → 4" và thay đổi chỉ số.
5. Màn tạm dừng: danh sách vũ khí, bị động, chỉ số, cài đặt (âm lượng, rung màn, số sát thương).
6. Menu chính: thêm dòng gợi ý về bộ gõ tiếng Việt; ẩn gợi ý phím trên thiết bị cảm ứng.
7. Điện thoại: bố cục ngang/dọc, vùng an toàn (notch), nút toàn màn hình.

Nghiệm thu: ảnh chụp ở 375×812 và 1920×1080 không tràn, không cuộn ngang; mọi nút chạm ≥ 44px; không còn ký tự emoji trong giao diện.

### Giai đoạn 6 — Cân bằng và chốt
1. Chạy bot 5 ván (`__vs`) để lấy đường cong sát thương nhận vào mỗi phút; mục tiêu: bot né cơ bản sống qua boss đầu ở ≥ 3/5 ván.
2. Giảm tần suất cắt ngang: sau cấp 20 gộp lượt lên cấp dồn vào một lần chọn nếu chúng xảy ra trong vòng 2 giây.
3. Kiểm lại toàn bộ tiêu chí các giai đoạn trước; ghi lại những gì chưa kiểm được.

### Để sau (không làm trong v3)
Tiến hoá vũ khí, vàng và nâng cấp vĩnh viễn, mở khoá nhân vật, bản đồ có chướng ngại vật.

## 5. Rủi ro

| Rủi ro | Xử lý |
|---|---|
| Tên sprite trong gói 0x72 khác bảng ánh xạ (bảng viết theo trí nhớ) | Đối chiếu file danh sách tile ngay sau khi tải, cập nhật bảng trước khi code |
| Giấy phép 0x72 mới chỉ thấy qua bình luận của tác giả | Đọc ô License trên trang; nếu không phải CC0 thì chuyển sang Kenney Tiny Dungeon |
| Nhạc chiptune quá tươi so với chủ đề | Người dùng nghe thử trước khi chốt; tìm bản khác nếu cần |
| Unikey nuốt phím ở tầng hệ điều hành, `e.code` không cứu được | Gợi ý tắt bộ gõ + hỗ trợ phím mũi tên |
| Sprite 16px phóng to bị nhoè | Chỉ phóng theo bội số nguyên, tắt `imageSmoothingEnabled` |
