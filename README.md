# Nightfall: Survival

Game sinh tồn góc nhìn từ trên xuống, kiểu "bullet heaven": vũ khí tự tấn công, người chơi chỉ di chuyển, né đòn, nhặt ngọc để lên cấp và chọn nâng cấp. Viết bằng HTML5 Canvas + JavaScript thuần, không cần cài đặt hay build.

## Chơi thử

- **Đầy đủ âm thanh:** trong thư mục dự án chạy
  ```bash
  python -m http.server 8765
  ```
  rồi mở http://localhost:8765/src/index.html.
- **Nhanh:** bấm đúp `src/index.html`. Game vẫn chạy, nhưng trình duyệt chặn nạp file trên `file://` nên chỉ có âm tổng hợp, không có nhạc.

**Điều khiển:** WASD hoặc phím mũi tên để di chuyển · Space lướt né · Esc/P tạm dừng · M tắt tiếng · 1/2/3 chọn thẻ · R chơi lại ở màn kết thúc. Trên điện thoại: joystick cảm ứng và nút LƯỚT. Game đọc phím vật lý, nên vẫn dùng được khi đang bật bộ gõ tiếng Việt.

## Nội dung game

- **4 đợt quái**, mỗi đợt kết thúc bằng một boss có kỹ năng riêng. Mọi đòn của boss đều có báo trước bằng hình và bằng tiếng. Hạ boss đợt 4 là thắng; sau đó có thể chơi tiếp chế độ vô tận.
- **6 vũ khí × 8 cấp:** Huyết Tiễn, Vòng Huyết Nguyệt, Lôi Phạt, Dao Bạc, Hào Quang Độc, Sóng Xung Kích. Vũ khí đổi hình ở cấp 4 và cấp 8 (cột mốc). Ghép với đúng món bị động thì vũ khí tiến hoá.
- **Quái:** 8 loại thường (có Quỷ nổ, Nhớt mẹ tách đôi, Kỵ sĩ xương lao thẳng), quái tinh anh, và thùng gỗ rơi vật phẩm (bom, nam châm, khiên, đồng hồ băng…).
- **Trong một ván:** chuỗi hạ gục (combo), nghi thức mở rương, thông báo mốc, máu thấp có nhịp tim.
- **Giữa các ván:** linh hồn để mua nâng cấp vĩnh viễn, mở khoá vũ khí khởi đầu, 3 nhiệm vụ luôn mở, sổ tay sưu tầm (36 mục), 4 nhân vật (chỉ đổi hình), chế độ Ác mộng sau lần thắng đầu.

## Trạng thái hiện tại

| Kế hoạch | Nội dung | Trạng thái |
|---|---|---|
| V3 (`KE_HOACH_V3.md`) | Lõi game, sprite, âm thanh, boss | Xong |
| V4 (`KE_HOACH_V4.md`) | Cảm giác đánh, nền theo đợt, lướt né, tiến hoá, tiến trình lâu dài | Xong |
| V5 (`KE_HOACH_V5.md`) | Đồ hoạ, âm thanh, cảm giác "chơi thêm ván nữa" — 10 phase | Xong cả 10 phase |
| V6 / QA (`KE_HOACH_QA.md`) | Lưới an toàn, bố cục co giãn, cân bằng C3, gợi ý ván đầu, tay cầm, cài đặt menu, vô tận 4 luật, mức Dễ, PWA ngoại tuyến | Xong (C1–C6, C8) |
| V7 (`KE_HOACH_V7.md`) | Ánh sáng đêm (lightmap), luật màu, phản hồi trúng đòn, độ đậm hiệu ứng, đo bus âm thanh, nhạc thích ứng + tiếng nền, âm theo khoảng cách, 5 bản nhạc theo giai đoạn | Xong (`v7i`) |
| V8 (`KE_HOACH_V8.md`) | Hạ hàng loạt không loá trắng + gộp số sát thương, đèn cố định theo đợt (sprite Niji CC0), vết loang khi quái chết, sương/bụi/tro, nhân vật bóp-giãn | Xong (`v8h`) |

V5 gồm:
1. Viền sprite mảnh và đều.
2. Bóng đổ, vùng báo trước, nền dịu hơn.
3. Vũ khí đổi hình theo cấp.
4. Thẻ nâng cấp hiện rõ lộ trình.
5. Tìm nguồn âm thanh CC0.
6. Âm thanh mới và phối âm: chặn vỡ tiếng, âm trái/phải, nhịp tim khi máu thấp, âm báo trước từng kỹ năng boss.
7. Phần thưởng trong ván.
8. Màn kết thúc kéo người chơi vào ván sau.
9. Nhiệm vụ, sổ tay sưu tầm, menu sống động.
10. Sprite riêng cho quái biến thể, thêm 3 nhân vật.

Kiểm tra tự động: `runChecks()` đạt **79/79** tiêu chí (`V1`–`V8`).

**Chưa kiểm bằng người thật:**
- Độ khó.
- Cảm giác lướt né.
- Bộ âm thanh mới: được chọn qua số đo, chưa nghe bằng tai. Nghe thử và đổi âm ở `tools/sfx-audition.html`.
- Khung hình trên máy thật.

**Việc tiếp theo:** một đợt cân bằng độ khó. V5 cố ý không chỉnh cân bằng. Những thay đổi có thể làm lệch độ khó được ghi ở mục "Cần cân bằng lại" trong `CLAUDE.md`.

## Cấu trúc

```
src/                  toàn bộ game (Vercel phát hành đúng thư mục này, xem vercel.json)
  index.html          khung HUD và các bảng (menu, lên cấp, tạm dừng, kết thúc, sổ tay…)
  sw.js, manifest.webmanifest   chạy ngoại tuyến (PWA)
  css/game.css        giao diện
  js/util.js          tiện ích
  js/data.js          mọi con số cân bằng, bảng quái/vũ khí/boss/vật phẩm, cấu hình phối âm
  js/audio.js         hiệu ứng âm thanh + nhạc, âm tổng hợp dự phòng
  js/render.js        camera, vẽ sprite/nền/hiệu ứng
  js/game.js          trạng thái ván, quái, boss, va chạm
  js/input.js         bàn phím và cảm ứng
  js/icons.js         icon giao diện
  js/ui-hud.js        HUD, combo, thông báo, nghi thức rương
  js/ui-menu.js       menu, nâng cấp vĩnh viễn, nhiệm vụ, sổ tay
  js/ui-cards.js      lên cấp, thẻ nâng cấp
  js/ui-end.js        màn kết thúc
  js/ui.js            tạm dừng, bắt đầu ván, vòng lặp chính, khởi động
  js/atlas.js, js/fx-atlas.js   tự sinh — không sửa tay
  assets/             atlas sprite, hiệu ứng, âm thanh, nhạc, font
tools/                bộ kiểm tra, bot cân bằng, trang nghe thử âm, script ghép atlas / nhập âm, ảnh chụp
```

Chi tiết kỹ thuật (tên hàm, công cụ console `__vs`, quy ước phát triển) có trong `CLAUDE.md`.

## Công cụ cho người phát triển

Mở trang game trong trình duyệt, bấm "Bắt đầu" để mở âm thanh, rồi dùng console:

- **Bộ kiểm tra:** nạp `../tools/checks.js` (trang game ở `/src/index.html`), rồi chạy `await runChecks()`.
- **Bot chơi thử để đo cân bằng:** nạp `../tools/balance-bot.js`, rồi chạy `runBot()`.
- **Lệnh nhanh:** `__vs.give('nova', 8)`, `__vs.spawnBoss('bossOgre')`, `__vs.skipTo(3)`…

Các gói tài nguyên gốc nằm trong `vendor/`. Thư mục này không có trong repo; chỉ cần nó khi muốn ghép lại atlas hoặc nghe thử âm. Link tải nằm trong `CREDITS.md`.

## Giấy phép tài nguyên

Mọi hình ảnh, hiệu ứng, âm thanh và nhạc đều là **CC0**: 0x72 DungeonTileset II, DungeonTileset II Extended (Niji), PVFX Foundry, Kenney, Juhani Junkala. Font VT323 dùng giấy phép **SIL OFL 1.1**. Nguồn và danh sách file cụ thể ở `CREDITS.md`.
