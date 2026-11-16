# KE_HOACH_QA — Đánh giá chất lượng "Nightfall: Survival" + đề xuất cải thiện

Kế hoạch giao cho Opus kiểm trải nghiệm chơi, đồ hoạ, độ ổn định; sửa lỗi chặn ở màn kết thúc; rồi thực hiện các đề xuất cải thiện.
Gồm 3 phần: **A** — kiểm (9 phase nhỏ), **B** — danh sách đề xuất, **C** — phase thực hiện đề xuất.

## Cách dùng

1. Mỗi phase một phiên mới, model Opus. Chỉ cần gõ: `Đọc KE_HOACH_QA.md (mục Nguyên tắc + Ngữ cảnh chung + Phase A1) rồi làm Phase A1.`
2. Làm theo thứ tự A0 → A8. **A1 là lỗi chặn, làm trước mọi thứ khác.** Phần C chỉ làm sau khi người dùng duyệt danh sách ở A8.
3. Xong phase nào, sửa cột Trạng thái trong bảng dưới (1 từ), không viết thêm gì.

| Phase | Nội dung | Cỡ | Cần trước | Trạng thái |
|---|---|---|---|---|
| A0 | Chuẩn bị, số đo gốc | S | — | xong |
| A1 | **Lỗi chặn: hình xanh lá che màn kết thúc** | S | A0 | xong |
| A2 | Mọi nút ở mọi bảng đều bấm được, mọi cỡ màn hình | M | A1 | xong |
| A3 | Luồng chơi và chuyển trạng thái | M | A1 | xong |
| A4 | Đồ hoạ | M | A1 | xong |
| A5 | Trải nghiệm chơi (nhịp, công bằng, phản hồi) | M | A1 | xong |
| A6 | Hiệu năng, ổn định, bản lưu | S | A1 | xong |
| A7 | Âm thanh (bằng số đo) | S | A1 | xong |
| A8 | Tổng hợp, xếp ưu tiên | S | A2–A7 | xong |
| C1–C8 | Thực hiện đề xuất (xem Phần C) | — | A8 + duyệt | chưa |

---

## Lỗi đã biết (chẩn đoán từ đọc code, CHƯA tái hiện trên trình duyệt)

**Hiện tượng:** thắng đợt 4 → màn kết thúc hiện một hình thằn lằn xanh lá khổng lồ đè lên bảng, không bấm được nút nào.

**Nguyên nhân:**
- `css/game.css:11` có quy tắc `canvas{position:fixed;inset:0;width:100vw;height:100vh}` áp cho **mọi** thẻ canvas, không riêng canvas game (`#cv`).
- `spriteIcon()` (`js/ui.js:787`) tạo một `<canvas class="spr">` nhỏ để vẽ hình nhân vật/quái.
- Đã có quy tắc gỡ cho ô chọn nhân vật (`.pick canvas.spr`, css:250) và sổ tay (`.bk canvas`, css:298), **nhưng thiếu cho khối "Sắp đạt được"** (`.goal`). Canvas 32×32 ở đó bị kéo ra toàn màn hình, phần trong suốt của nó nằm trên các nút nên chặn chuột.
- Chỗ gọi: `js/ui.js:653` (vừa mở nhân vật) và `js/ui.js:662–664` (mục tiêu gần nhất là một nhân vật).

**Phạm vi thật rộng hơn "sau 4 đợt":**
- Lần thắng đầu (mở Thằn Lằn Chiến) — đúng như ảnh.
- Lần đầu tới đợt 3 (mở Hiệp Sĩ), lần đầu hạ 1000 quái một ván (mở Tiên Rừng).
- **Mọi màn kết thúc, kể cả thua**, khi mục tiêu mở khoá gần nhất là một nhân vật.

**Vì sao 54 tiêu chí không bắt được:** `runChecks` kiểm trạng thái và DOM, không kiểm "nút có bị che không". A1 thêm lớp kiểm này.

---

## Nguyên tắc làm việc — tiết kiệm token (BẮT BUỘC)

Mục tiêu: token dùng cho **kiểm và sửa**, không dùng cho **kể lại**.

1. **Không tường thuật.** Không "tôi sẽ…", không nhắc lại kế hoạch, không tóm tắt file vừa đọc, không giải thích lệnh sắp chạy.
2. Giữa các lệnh công cụ: tối đa 1 câu ≤ 15 từ, và chỉ khi đổi hướng hoặc bị chặn.
3. **Mọi phát hiện ghi thẳng vào `QA_KET_QUA.md`**, mỗi phát hiện 1 dòng theo mẫu bên dưới. Không lặp lại nội dung đó trong chat.
4. **Tin nhắn cuối phase ≤ 6 dòng:** số phát hiện theo mức, đã sửa gì, cái gì chưa kiểm được, phase kế tiếp. Không bảng, không tiêu đề.
5. **Số đo thay chữ.** Lệnh JS trả về JSON gọn, chỉ các trường cần; mảng cắt còn ≤ 20 phần tử, tổng ≤ 500 ký tự. Không in cả `G`, `META`, `CFG`.
6. **Ảnh chụp chỉ khi tiêu chí là thị giác.** Dùng `scale` 0.4–0.5 hoặc `zoom` một vùng. Mỗi phase có trần số ảnh; cái gì kiểm được bằng DOM/số thì không chụp.
7. **Đọc code:** Grep trước, Read đúng đoạn (≤ 60 dòng). Không đọc cả `ui.js`, `game.js`, `data.js`, `render.js`. Không bao giờ mở `atlas.js`, `fx-atlas.js`.
8. Không đọc `KE_HOACH_V3/V4/V5.md`. `CLAUDE.md` đã có sẵn trong ngữ cảnh, không đọc lại.
9. **Gộp lệnh:** nhiều thao tác trình duyệt → một `browser_batch`; nhiều phép kiểm → một lệnh JS.
10. **Không dùng subagent** (mỗi agent phải nạp lại ngữ cảnh từ đầu).
11. Không tạo file nào ngoài `QA_KET_QUA.md`. Chỉ sửa code / `tools/checks.js` khi phase ghi rõ.
12. **Trần lệnh công cụ** ghi ở từng phase. Chạm trần mà chưa xong: ghi 1 dòng `DỞ: <còn thiếu gì>` vào `QA_KET_QUA.md` rồi dừng.
13. Gặp lỗi ngoài phạm vi phase: ghi 1 dòng, **không sửa** (trừ lỗi S1 khiến không kiểm tiếp được).
14. `CLAUDE.md` chỉ cập nhật một lần ở A8 và một lần cuối mỗi phase C, mỗi lần ≤ 10 dòng.
15. Không commit, không tải file từ internet nếu người dùng chưa bảo.

---

## Ngữ cảnh chung

- **Chạy game:** `preview_start` với cấu hình cổng **8766** trong `.claude/launch.json` → `http://localhost:8766/index.html`. Dùng 8766 để không đụng tiến trình thật của người dùng ở 8765 (`localStorage` tách theo cổng).
- **Bản lưu:** trước khi xoá/sửa `localStorage`, chép các khoá `vs_*` vào một biến `window.__bk`; cuối phase trả lại. `runChecks()` tự sao lưu rồi.
- **Phải bấm "Bắt đầu" một lần** để mở âm thanh trước khi chạy `runChecks()`.
- **Mỗi lệnh JS trong pane ≤ 45 giây.** Việc dài: `setTimeout` rồi đọc kết quả ở lệnh sau.
- **`__vs.tick(giây)` chỉ chạy `update()`**, không chạy logic trong `frame()` (điện ảnh boss, nghi thức rương, hiện dần màn kết thúc). Mọi phép kiểm giao diện phải để khung hình thật chạy; nếu `tabs_context` báo pane đang ẩn thì `requestAnimationFrame` có thể đứng — ghi `CHƯA KIỂM` chứ không đoán.
- **Hook nhanh:** `__vs.skipTo(i)`, `__vs.give(id, cấp)`, `__vs.evolve(id)`, `__vs.spawn(n, loại)`, `__vs.spawnBoss(id)`, `__vs.spawnElite(loại)`, `__vs.pickItem(id)`. Thắng nhanh: `skipTo(3)` → cho vũ khí cấp 8 → tick tới pha boss → đặt máu boss về 1.
- **Sau khi sửa JS/CSS:** đổi `window.VER` ở đầu `index.html` (từ C1 là một chỗ duy nhất), tải lại.
- **Giới hạn của người kiểm là AI:** không nghe được âm thanh, không cảm được độ trễ tay, khung hình trong pane không phải máy thật. Những mục đó ghi `CẦN NGƯỜI THẬT` và đưa vào phiếu ở cuối file, không tự chấm điểm.

### Mẫu ghi kết quả (`QA_KET_QUA.md`)

Tạo ở A0 với đúng một bảng, các phase sau chỉ thêm dòng:

```
| ID | Mức | Loại | Mô tả (≤ 20 từ) | Tái hiện (≤ 15 từ) | Bằng chứng | Trạng thái |
| Q-001 | S1 | BUG | Canvas .goal phủ toàn màn hình, chặn nút màn kết thúc | lưu trắng, thắng đợt 4 | css/game.css:11 | đã sửa |
```

- **Mức:** S1 chặn (không chơi tiếp được / mất dữ liệu) · S2 nặng (sai chức năng, có cách vòng) · S3 vừa (khó chịu, sai hình rõ) · S4 nhẹ (thẩm mỹ).
- **Loại:** BUG · UX · GFX · AUD · PERF · BAL (cân bằng) · ĐX (đề xuất mới).
- **Bằng chứng:** `file:dòng`, hoặc một con số đo, hoặc lệnh tái hiện. Không dán log.
- **Trạng thái:** mở · đã sửa · CHƯA KIỂM · CẦN NGƯỜI THẬT.
- Thứ đạt yêu cầu thì **không ghi**. Cuối mỗi phase thêm đúng 1 dòng: `A3: 14 mục kiểm, 3 phát hiện`.

---

# PHẦN A — KIỂM

## A0 — Chuẩn bị, số đo gốc · trần 12 lệnh, 0 ảnh

1. Mở game cổng 8766, bấm "Bắt đầu", chạy `runChecks()` → ghi `đạt/tổng` (kỳ vọng 54/54).
2. Đọc lỗi console lúc tải trang và sau 30 giây chơi.
3. Tạo `QA_KET_QUA.md` (bảng rỗng + dòng số đo gốc: kết quả runChecks, số lỗi console, cỡ viewport pane).

**Xong khi:** file tồn tại, có số đo gốc.

## A1 — Lỗi chặn màn kết thúc · trần 30 lệnh, 3 ảnh

1. **Tái hiện** trên lưu trắng: thắng đợt 4 bằng khung hình thật. Đo bằng JS, không cần nhìn: với mọi `canvas` trong DOM trừ `#cv`, lấy `getBoundingClientRect()`; và `document.elementFromPoint(tâm của #againBtn)` có phải chính nút đó không. Chụp 1 ảnh xác nhận giống ảnh người dùng.
2. Kiểm thêm 2 đường vào: thua khi mục tiêu gần nhất là nhân vật; lần đầu tới đợt 3.
3. Kiểm phím: lúc bị che, `R` / `Enter` còn chơi lại được không (ghi 1 dòng — để biết người chơi có lối thoát không). Kiểm linh hồn và nhân vật vừa mở đã được lưu chưa (`localStorage.vs_meta`).
4. **Sửa tận gốc**, không vá từng chỗ:
   - `css/game.css:11`: đổi bộ chọn `canvas` thành `#cv`.
   - Thêm một quy tắc chung `canvas.spr{image-rendering:pixelated;flex:none}`; trong `spriteIcon` đặt `style.width/height` theo `size`. Bỏ các quy tắc gỡ riêng lẻ ở css:250 và css:298 nếu sau đó thừa.
   - `.goal canvas` cỡ 22 px cho khớp `.goal img`.
   - Kiểm `#cereCv` (`index.html:76`) vẫn hiển thị đúng sau khi đổi bộ chọn.
5. **Thêm tiêu chí hồi quy `V6-1`** vào `tools/checks.js`: mở màn kết thúc (thắng lần đầu, thua, thua với mục tiêu là nhân vật) bằng khung hình thật → mọi canvas trừ `#cv` có cạnh ≤ 64 px; tâm của `#againBtn`, `#menuBtn`, `#endlessBtn` (khi hiện) trả về đúng nút qua `elementFromPoint`.
6. Chạy lại `runChecks()`; chụp 1 ảnh màn kết thúc thắng sau khi sửa.

**Xong khi:** 3 đường vào đều bấm được nút bằng chuột; `V6-1` đạt; runChecks không giảm.

## A2 — Mọi nút đều bấm được · trần 35 lệnh, 6 ảnh

Viết một hàm `hitAudit()` trong `tools/checks.js` (dùng lại cho `V6-2`): với bảng đang mở, mọi `button, input, .card, .pick, [role=button]` đang hiển thị phải (a) cạnh ≥ 44 px, (b) nằm trong viewport hoặc trong vùng cuộn được, (c) `elementFromPoint` ở tâm trả về chính nó hoặc con của nó. Trả về mảng vi phạm dạng `[bảng, phần tử, lý do]`.

Chạy `hitAudit()` cho ma trận:
- **Bảng:** menu · nâng cấp vĩnh viễn (`#meta`) · sổ tay (`#book`) · chọn thẻ (3 thẻ + đổi thẻ + thẻ tiến hoá) · mở rương (`#chestCere`) · tạm dừng · kết thúc thua · kết thúc thắng · kết thúc sau vô tận · HUD (toàn màn hình, tiếng, tạm dừng) · thẻ tên đợt + toast (không được che nút).
- **Cỡ màn hình:** 1920×1080 · 1366×768 · 2000×911 (máy người dùng) · 1280×600 · 768×1024 · 375×812 · 812×375.

Kiểm thêm, mỗi mục 1 dòng nếu sai:
- Chỉ dùng bàn phím đi hết: menu → ván → chọn thẻ → tạm dừng → kết thúc → chơi lại. Viền focus luôn thấy.
- Bảng kết thúc ở chiều cao 911 và 600: có phải cuộn không, nút chính có luôn trong tầm nhìn không.
- Cảm ứng (preset mobile): cần gạt, nút lướt, không có phần tử nào nằm dưới vùng tai thỏ/thanh điều hướng.
- Chữ không tràn, không bị cắt ở 375 px (tên vũ khí dài, dòng "trước → sau").

**Xong khi:** `V6-2` trong `runChecks` chạy `hitAudit()` cho các bảng ở cỡ mặc định; ma trận đầy đủ đã chạy tay một lần.

## A3 — Luồng chơi và chuyển trạng thái · trần 40 lệnh, 4 ảnh

Chạy **một ván thật bằng bot** (`runBot()` qua `setTimeout`) để `frame()` được thử, rồi kiểm từng chuyển trạng thái bằng hook:

| Nhóm | Phải kiểm |
|---|---|
| Vòng chính | menu → ván → lên cấp → rương → boss → nghỉ → đợt sau → thắng → vô tận → thua → chơi lại; thua → menu → ván mới (trạng thái `G` sạch, không sót quái/hiệu ứng/âm từ ván trước) |
| Chồng trạng thái | tạm dừng lúc: đang điện ảnh boss, boss chết chậm, nghi thức rương, đang hiện thẻ, banner đợt · lên cấp đúng lúc boss chết · 2 lần lên cấp liền · rương + lên cấp cùng khung · chết đúng lúc lên cấp · thắng đúng lúc máu về 0 |
| Phím | bấm 2 phím cùng lúc ở màn chọn thẻ; giữ `Space` qua các bảng; `Esc` ở mọi bảng; `R` ở màn chọn thẻ (đổi thẻ) so với `R` ở màn kết thúc (chơi lại) không lẫn nhau |
| Cửa sổ | mất focus / ẩn tab giữa ván rồi quay lại (không nhảy thời gian, không kẹt phím); đổi cỡ cửa sổ và vào/ra toàn màn hình giữa ván; xoay máy |
| Tiến trình | mua nâng cấp vĩnh viễn (đủ / thiếu / mức tối đa); nhiệm vụ xong trả thưởng đúng một lần; đổi vũ khí khởi đầu, nhân vật; Ác mộng chỉ hiện sau lần thắng đầu; kỷ lục thường và Ác mộng không lẫn |
| Vô tận | chơi tới đợt 8: boss ngẫu nhiên có ra, thanh tiến độ và tên đợt đúng, màn kết thúc sau vô tận đúng số đợt |
| Ô đầy | 4 vũ khí + 4 bị động đầy, mọi thứ cấp tối đa: thẻ còn ra gì, có khi nào 0 thẻ không |

**Xong khi:** mỗi ô trong bảng đã thử; mọi sai lệch thành 1 dòng trong file.

## A4 — Đồ hoạ · trần 35 lệnh, 14 ảnh (scale 0.5)

Dựng cảnh bằng hook, chụp, chấm **đạt / chưa đạt** theo tiêu chí; chỉ ghi cái chưa đạt.

| Cảnh | Tiêu chí |
|---|---|
| 4 nền đợt, mỗi nền có ~80 quái | Người chơi tìm thấy trong < 1 giây (viền, độ sáng); quái tách khỏi nền; đường nối gạch không lộ |
| 300 quái + 6 vũ khí cấp 8 | Đạn quái vẫn thấy trên lớp hiệu ứng; số sát thương không phủ kín người chơi; không nhấp nháy khó chịu |
| Từng boss × từng kỹ năng lúc báo trước | Vùng báo trước đọc được trên **cả 4 nền** (đo tương phản màu vùng với nền, ghi tỉ lệ nếu < 3:1); biết rõ lúc nào đòn nổ |
| 6 vũ khí × 4 bậc hình | Nhìn 2 ảnh cạnh nhau phân biệt được bậc; màu vũ khí không trùng màu đạn quái |
| Tinh anh, quái biến thể, thùng gỗ, vật phẩm, ngọc 3 cỡ | Nhận ra bằng dáng, không chỉ bằng màu |
| HUD ở 1366×768, 2000×911, 375×812 | Chữ nhỏ nhất ≥ 12 px thật; ô vũ khí, "Lv", thanh máu đọc được ở màn rộng (ảnh người dùng: "Lv 50" và ô vũ khí rất nhỏ ở 2000 px) |
| Mọi bảng | Thẳng hàng, khoảng cách đều, tương phản chữ ≥ 4.5:1 (đo bằng JS trên màu tính được), icon không mờ do phóng số lẻ |
| Tỉ lệ khung | 21:9 và dọc 9:19: tầm nhìn có công bằng không (màn rộng thấy xa hơn bao nhiêu đơn vị), có viền đen/kéo giãn không |
| `prefers-reduced-motion` | Tắt đúng các hiệu ứng loé/rung, game vẫn đọc được |
| Bỏ hết `ASSETS` | Hình vẽ code vẫn đủ phân biệt, không lỗi |

Kiểm thứ tự lớp bằng code (Grep `draw` trong `render.js`), không bằng ảnh.

**Xong khi:** mọi hàng đã chụp và chấm.

## A5 — Trải nghiệm chơi · trần 35 lệnh, 2 ảnh

Đo bằng bot và thống kê `G.stats`, không chấm cảm tính.

1. **60 giây đầu** (3 ván bot): giây có quái hạ đầu tiên, lần lên cấp đầu, số lựa chọn có nghĩa trong phút đầu. Ghi nếu lần lên cấp đầu > 20 giây hoặc có đoạn > 8 giây không có gì xảy ra.
2. **Nhịp:** số lần lên cấp mỗi phút theo từng đợt; khoảng lặng dài nhất giữa hai phần thưởng (lên cấp/rương/vật phẩm); thời lượng nghỉ giữa đợt so với việc có để làm.
3. **Công bằng:** tỉ lệ sát thương nhận theo nguồn (`G.stats`); có đòn nào trúng mà không có báo trước ≥ 0,4 giây không; quái sinh ra có đè lên người chơi không; lướt né có bất tử đúng như chữ mô tả không.
4. **Phản hồi:** lập bảng hành động × (hình, âm, số) cho: trúng đòn, hạ quái, nhặt ngọc, lên cấp, chọn thẻ, lướt, lướt chưa hồi, nhặt vật phẩm, mở rương, boss đổi pha, máu thấp, đổi thẻ hết lượt, mua không đủ linh hồn. Chỉ ghi ô **trống**.
5. **Độ khó** (5 ván bot thường): tỉ lệ qua từng boss, so với mục tiêu ở mục Trạng thái của `CLAUDE.md`. Một ván mỗi vũ khí khởi đầu, 120 giây: quái hạ (dao đang yếu — xác nhận lại).
6. **Tính dễ hiểu:** mỗi thẻ nâng cấp có nói rõ nó làm gì bằng số không; người mới có biết có lướt né, có tiến hoá không (đọc chữ menu + thẻ, ghi chỗ thiếu).
7. **Động lực ván sau:** sau ván thua đầu trên lưu trắng, màn kết thúc có cho ít nhất 1 mục tiêu đạt được trong 1–2 ván không; số linh hồn ván đầu mua được gì.

**Xong khi:** 7 mục có số đo; mục cần cảm nhận ghi `CẦN NGƯỜI THẬT`.

## A6 — Hiệu năng, ổn định, bản lưu · trần 25 lệnh, 0 ảnh

1. Thời gian `update` và `render` (trung vị, khung dài nhất) ở 100 / 300 / 450 quái với 6 vũ khí cấp 8. Ghi nếu khung dài nhất > 33 ms.
2. **Rò rỉ:** `tick` 20 phút vô tận, cứ 5 phút ghi độ dài `G.enemies`, `G.fx`, `G.decals`, đạn, chữ nổi, `SFX.voices`, số nút DOM trong `#hud`/`#toasts`. Cái nào tăng không dừng là lỗi.
3. **Bản lưu hỏng:** đặt `vs_meta` là chuỗi rác, `{}`, bản thiếu trường, số âm, `souls: 1e12` → tải lại, game phải vào được menu. Đầy `localStorage` (ghi lỗi) → không vỡ vòng lặp.
4. **Lỗi im lặng:** ném một lỗi giả trong `update` → vòng lặp có chết đứng không, người chơi có được báo gì không (hiện không có `window.onerror`).
5. Tải khi thiếu `assets/atlas.png`, thiếu thư mục `sfx`, thiếu font → vẫn chơi được.
6. `dt` lớn (ẩn tab 30 giây rồi quay lại) có bị giới hạn không.

**Xong khi:** 6 mục có số.

## A7 — Âm thanh bằng số đo · trần 20 lệnh, 0 ảnh

1. Mỗi sự kiện ở bảng phản hồi của A5 gọi `SFX.play` đúng tên, không có sự kiện câm (bọc `SFX.play` để đếm).
2. `SFX.meter()` đỉnh < 1.0 ở: bom giữa 300 quái, boss chết, lên cấp + rương cùng lúc.
3. Nhạc đổi khi vào/ra boss; lọc nhạc khi tạm dừng/chọn thẻ rồi trở lại bình thường; nhịp tim tắt khi máu hồi.
4. Nút tắt tiếng và 2 thanh âm lượng: lưu qua tải lại, áp ngay, áp cho cả nhạc đang phát.
5. Ẩn tab: nhạc dừng; quay lại: tiếp tục, không chồng 2 bản.
6. Ghi danh sách ≤ 12 âm cần người nghe nhất (theo tần suất phát) vào phiếu cuối file.

## A8 — Tổng hợp · trần 12 lệnh, 0 ảnh

1. Sắp `QA_KET_QUA.md` theo Mức rồi Loại; gộp dòng trùng.
2. Thêm cuối file mục "10 việc nên làm trước" (mỗi việc 1 dòng, trỏ ID).
3. Mỗi phát hiện loại ĐX hoặc chưa sửa: gán vào một phase ở Phần C (thêm mã `C?` vào cột Trạng thái). Đề xuất ở Phần B mà phép kiểm cho thấy không cần: gạch đi, ghi lý do ≤ 8 từ.
4. Cập nhật `CLAUDE.md` ≤ 10 dòng (có `KE_HOACH_QA.md`, `QA_KET_QUA.md`, `V6-1`, `V6-2`, `hitAudit`).
5. Tin nhắn cuối: số phát hiện theo mức + câu hỏi duy nhất "duyệt các phase C nào".

---

# PHẦN B — ĐỀ XUẤT CẢI THIỆN

Xếp theo ưu tiên (P1 nên làm ngay, P3 để sau). "Căn cứ" là thứ đã thấy trong code/ảnh/`CLAUDE.md`; mục ghi *(cần A-x xác nhận)* thì chờ kết quả kiểm.

### Chất lượng và quy trình
| ID | Ưu tiên | Đề xuất | Căn cứ | Phase |
|---|---|---|---|---|
| ~~B1~~ | ~~P1~~ | ~~Bộ chọn CSS toàn cục → theo id/class; rà các bộ chọn thẻ trần khác (`img`, `button`, `p`)~~ | Đã làm ở A1 (`#cv`, `canvas.spr`) | A1 |
| ~~B2~~ | ~~P1~~ | ~~Lớp kiểm "khói" đầu-cuối trong `runChecks`: chạy khung hình thật tới màn thắng và màn thua, `hitAudit()` mọi bảng~~ | Đã làm: V6-1, V6-2 | A1, A2 |
| ~~B3~~ | ~~P1~~ | ~~Bắt lỗi toàn cục (`error`, `unhandledrejection`): hiện một dòng báo lỗi + nút tải lại, vòng lặp `frame()` bọc try/catch để một lỗi vẽ không làm đứng game~~ | Đã làm ở C1 (`reportError`, V6-3) | C1 |
| ~~B4~~ | ~~P2~~ | ~~Một hằng phiên bản duy nhất thay cho 10 chỗ `?v=` sửa tay~~ | Đã làm ở C1 (`window.VER`) | C1 |
| ~~B5~~ | ~~P3~~ | ~~Tách `ui.js` (HUD / thẻ / màn kết thúc / tiến trình)~~ | Đã làm ở C1 (5 file `ui-*.js`) | C1 |

### Giao diện và bố cục
| ID | Ưu tiên | Đề xuất | Căn cứ | Phase |
|---|---|---|---|---|
| ~~B6~~ | ~~P1~~ | ~~HUD co giãn theo màn hình (biến `--ui` theo chiều cao viewport)~~ | Đã làm ở C2 (V6-4) | C2 |
| ~~B7~~ | ~~P1~~ | ~~Màn kết thúc vừa một màn hình ở chiều cao ≥ 700: 2 cột trên màn rộng, bảng sát thương thu gọn~~ | Đã làm ở C2 (V6-4) | C2 |
| ~~B8~~ | ~~P2~~ | ~~Giới hạn tầm nhìn theo tỉ lệ khung~~ | Không làm: zoom nguyên làm tầm nhìn hẹp hơn nhiều | C2 |
| B9 | P2 | Nút "Cài đặt" ở menu (âm lượng, rung, số sát thương, giảm loé) — hiện chỉ có trong bảng tạm dừng | `index.html:112–113` | C5 |
| ~~B10~~ | ~~P2~~ | ~~Hỏi lại trước khi "Menu" giữa ván / thoát khi đang chơi~~ | Không cần: giữa ván không có nút Menu | C5 |

### Lối chơi và cân bằng
| ID | Ưu tiên | Đề xuất | Căn cứ | Phase |
|---|---|---|---|---|
| ~~B11~~ | ~~P1~~ | ~~Vòng cân bằng bằng bot: boss 3 đang 5/10, thắng 4/10; chốt mục tiêu rồi chỉnh~~ | Đã làm ở C3: 20 ván bot qua boss 1/2/3 = 20/20/14, thắng 11/20 | ~~C3~~ |
| ~~B12~~ | ~~P1~~ | ~~Dao Bạc khởi đầu: tự ngắm quái gần nhất khi đứng yên hoặc khi không có quái trước mặt~~ | Không cần: bot nay hạ 116 quái/120 s | C3 |
| ~~B13~~ | ~~P2~~ | ~~Chỉnh `CFG.metaCost` sau khi nhiệm vụ trả thêm linh hồn; kiểm lại mốc combo kéo ngọc và thứ tự cấp 4–7 đã đổi~~ | Đã làm ở C3: `metaCost` 30–320, 15 quái/linh hồn; 20 ván bot sau đổi vẫn trong mục tiêu | ~~C3~~ |
| B14 | P2 | Mức "Dễ" cho người mới (máu +, quái chậm hơn), linh hồn ×0,75 | Tỉ lệ thắng của bot khá thấp cho ván đầu | C3 |
| B15 | P2 | Tăng phần sát thương đến từ kỹ năng boss (hiện ~9%, mục tiêu 15–35%): đòn đuổi, đòn bịt hướng lướt | `CLAUDE.md` | C3 |

### Người chơi mới
| ID | Ưu tiên | Đề xuất | Căn cứ | Phase |
|---|---|---|---|---|
| ~~B16~~ | ~~P1~~ | ~~Gợi ý theo ngữ cảnh trong ván đầu (di chuyển → nhặt ngọc → lướt khi có vùng đỏ → tiến hoá khi đủ điều kiện), mỗi gợi ý hiện một lần~~ | Đã làm ở C4 (`HINTS`, V6-6) | C4 |
| ~~B17~~ | ~~P2~~ | ~~Lần đầu gặp mỗi loại quái đặc biệt: thẻ tên 1 dòng (đã có cho boss qua `hint`)~~ | Đã làm ở C4 (`ENEMIES.*.hint` cho bomber/splitter/charger) | C4 |

### Điều khiển và trợ năng
| ID | Ưu tiên | Đề xuất | Căn cứ | Phase |
|---|---|---|---|---|
| B18 | P2 | Hỗ trợ tay cầm (Gamepad API): cần trái, A lướt, Start tạm dừng, điều hướng bảng | Chưa có trong `input.js` | C5 |
| B19 | P2 | Chế độ dễ nhìn: vùng báo trước thêm hoạ tiết/viền sáng không phụ thuộc màu đỏ; tuỳ chọn giảm loé màn | A4 Q-010, Q-014, Q-015, Q-016 | C5 |
| B20 | P3 | Tuỳ chọn cỡ chữ lớn; đổi phím | — | C5 |

### Nội dung
| ID | Ưu tiên | Đề xuất | Căn cứ | Phase |
|---|---|---|---|---|
| B21 | P2 | Vô tận có nội dung riêng: đợt 5+ có luật đổi mỗi đợt (quái nhanh, toàn tinh anh, 2 boss) thay vì lặp đợt 4 | `waveDef()` đợt ≥ 5 dùng lại đợt 4 | C6 |
| B22 | P3 | 1–2 vũ khí + bị động mới, sự kiện giữa đợt (đàn dơi, vòng vây, rương vàng) | 6 vũ khí, 4 đợt | C6 |
| B23 | P3 | Lưu và tiếp tục ván dở tại lúc nghỉ giữa đợt | Ván thắng dài ~13 phút | C6 |

### Âm thanh
| ID | Ưu tiên | Đề xuất | Căn cứ | Phase |
|---|---|---|---|---|
| B24 | P1 | Người dùng nghe duyệt bộ âm trên `tools/sfx-audition.html`, thay âm chưa hợp; kiểm điểm nối vòng lặp nhạc | Bộ âm chọn theo tên file + số đo, chưa ai nghe | C7 |

### Phát hành
| ID | Ưu tiên | Đề xuất | Căn cứ | Phase |
|---|---|---|---|---|
| ~~B25~~ | ~~P3~~ | ~~Chơi ngoại tuyến + cài như ứng dụng (manifest, service worker), favicon, trang GitHub Pages~~ | Đã làm ở C8 (manifest, `sw.js`, icon; V6-7). Phát hành trên Vercel thay GitHub Pages | C8 |

---

# PHẦN C — PHASE THỰC HIỆN ĐỀ XUẤT

Chỉ làm phase đã được duyệt sau A8. Cùng **Nguyên tắc** và **Ngữ cảnh chung** như Phần A. Mỗi phase kết thúc bằng: `runChecks()` không giảm, thêm ≥ 1 tiêu chí `V6-*` cho thứ vừa làm, tăng `?v=`.

| Phase | Gồm | Cỡ | Xong khi |
|---|---|---|---|
| C1 Lưới an toàn | B3, B4, B5 + các lỗi S1/S2 còn mở | M | Ném lỗi giả trong `update`/`draw`: game báo lỗi và còn tải lại được; đổi phiên bản ở 1 chỗ |
| C2 Bố cục co giãn | B6, B7, B8 + lỗi UX/GFX về bố cục | M | `hitAudit()` sạch ở cả 7 cỡ màn hình; màn kết thúc không cuộn ở ≥ 700 px cao; chữ HUD ≥ 12 px thật ở mọi cỡ |
| C3 Cân bằng | B11–B15 | L | 10 ván bot: boss 1–2 ≥ 9/10, boss 3 ≥ 7/10, thắng 5–6/10; mỗi vũ khí khởi đầu hạ ≥ 60 quái/120 giây; ghi số mới vào `CLAUDE.md` |
| C4 Người chơi mới | B16, B17 | S | Lưu trắng: 4 gợi ý hiện đúng lúc, đúng một lần; ván thứ hai không hiện lại |
| C5 Điều khiển, trợ năng | B9, B10, B18–B20 | M | Chơi trọn một ván chỉ bằng tay cầm (giả lập qua `navigator.getGamepads`); cài đặt mở được từ menu và lưu lại |
| C6 Nội dung | B21–B23 | L | Đợt 5–8 mỗi đợt một luật khác nhau; bot sống qua đợt 6 ở ≥ 3/10 ván |
| C7 Âm thanh | B24 | S | **Cần người dùng nghe trước**; Opus chỉ nhập bản đã chọn bằng `tools/sfx_import.py` |
| C8 Phát hành | B25 | S | Tắt mạng vẫn tải được game lần hai; có tải file mới thì hỏi trước theo quy ước |

---

# PHIẾU CHƠI THỬ CHO NGƯỜI THẬT (15 phút)

Những thứ AI không chấm được. Chơi 2 ván, cho điểm 1–5 và ghi 1 dòng nếu ≤ 3.

1. Nhân vật có nghe lời tay không (đổi hướng, dừng)?
2. Lướt né có kịp và có "đã" không?
3. Lúc đông quái có lúc nào không biết mình đang ở đâu?
4. Có lần nào mất máu mà không hiểu vì sao?
5. Có đoạn nào thấy chán / chờ?
6. Boss nào thấy bất công, boss nào quá dễ?
7. Âm nào chói, quá to, lặp gây mệt? Nhạc có nối vòng mượt không?
8. Khung hình có giật không (phím `F` xem "khung dài nhất")?
9. Thẻ nâng cấp có đọc kịp và hiểu không?
10. Chơi xong có muốn chơi ván nữa không, vì điều gì?

**Âm cần nghe nhất** (A7, số lần phát trong 300 giây bot): `hit` 1249 · `kill` 803 · `gem` 744 · `shoot` 478 · `zap` 173 · `nova` 89 · `tierBody` 77 · `slam` 49 · `warn` 44 · `eshoot` 38 · `level` 22 · `select` 22. Nghe trên `tools/sfx-audition.html`, chú ý 4 âm đầu (lặp liên tục).
