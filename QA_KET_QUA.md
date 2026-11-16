# QA_KET_QUA — kết quả kiểm "Nightfall: Survival"

Số đo gốc (A0, cổng 8766, Chromium pane 1280×720): runChecks 54/54 · lỗi console lúc tải 0, sau ván runChecks (~30+ giây chơi) 0. Sau A1–A2: runChecks 56/56 (thêm V6-1, V6-2).

Sắp theo Mức rồi Loại. Cột Trạng thái: `C?` = phase thực hiện ở Phần C của `KE_HOACH_QA.md`.

| ID | Mức | Loại | Mô tả (≤ 20 từ) | Tái hiện (≤ 15 từ) | Bằng chứng | Trạng thái |
|---|---|---|---|---|---|---|
| Q-001 | S1 | BUG | Canvas .spr ở khối "Sắp đạt được" phủ toàn màn hình, chặn mọi nút màn kết thúc | lưu trắng, thắng đợt 4 / thua mục tiêu nhân vật / tới đợt 3 | css/game.css:11 (canvas 600×563 che #againBtn) | đã sửa |
| Q-007 | S3 | BUG | Hạ boss cuối rồi gục trong 2,2 giây chờ nổ (pha 'won') → tính THUA, mất thắng và mở khoá | skipTo(3), hạ boss, máu=0 khi phase 'won' | js/game.js:192 + :945 | đã sửa (C1) |
| Q-029 | S3 | BUG | Lỗi lặp trong update(): game đứng hình im lặng (120 lỗi/giây ở console), không báo người chơi, không có window.onerror | thay update bằng hàm ném lỗi | G.t không tăng, không thông báo | đã sửa (C1) |
| Q-020 | S3 | BAL | Bot lưu trắng 5 ván: qua boss 1/2/3 = 5/3/2, thắng 1/5 — khó hơn mốc cũ (10/10, 10/10, 5/10, 4/10) | a5Run('bolt') ×5, META trắng | boss 2 chết ở 3/5 ván | đã sửa (C3: 20 ván qua boss 1/2/3 = 20/20/14, thắng 11/20) |
| Q-021 | S3 | BAL | Sát thương từ boss (kỹ năng + đạn) ≈ 0%: nguồn gần như toàn quái thường; vùng nổ 0–4% (trùng B15) | 5 ván bot | src: golem 373, charger 114, zone ≤ 20, không có 'boss' | một phần (C3: sát thương kỹ năng boss tăng, bot vẫn né → 6–11%; CẦN NGƯỜI THẬT) |
| Q-022 | S3 | BAL | Báo trước bị cuồng nộ (×0,85) + nhanh dần (tối đa +50%) rút dưới 0,4 s: spiral 0,28; ring/rings/summon/wall 0,34 | boss nổi giận + cuồng nộ tối đa | game.js:237–238, CFG.enrage.max 0.5 | đã sửa (C3: `CFG.teleMin` 0,4) |
| Q-024 | S3 | BAL | Ván thua đầu (3 phút, 150 quái) được 6 linh hồn, rẻ nhất 40 → cần ~7 ván mới mua được nâng cấp đầu | lưu trắng, endRun ở 180 s | souls 6, metaCost[0] 40 | đã sửa (C3: 150 quái → 10 linh hồn, bậc đầu 30) |
| Q-025 | S3 | BAL | Vũ khí khởi đầu 120 s (bot): bolt 259, lightning 238, nova 219 quái; knife 116, orbit 83 (còn 19 máu), aura 73 và GỤC | a5Run(id, 120) | 1 ván mỗi loại | đã sửa (C3: mọi vũ khí ≥ 111 quái/120 s, không gục) |
| Q-010 | S3 | GFX | Báo trước ring/spiral/summon/rings chỉ là quầng nhỏ sau boss; trên nền đợt 4 (đỏ) gần như không thấy | startSkill(boss, {skills:['ring']}) ở đợt 4 | ảnh ghép 18 kỹ năng; render.js:829 | mở · C5 |
| Q-011 | S3 | GFX | 250 quái + 6 vũ khí cấp 8: 113 số sát thương cùng lúc phủ kín vùng quanh người chơi | give mọi vũ khí cấp 8, 300 quái | G.texts 113 (textCap 160) | mở · C5 |
| Q-013 | S3 | GFX | Người chơi cùng cỡ/độ sáng với sọ trắng; giữa 80 quái chỉ nhận ra nhờ thanh máu đỏ | ảnh ghép 4 nền × 80 quái | ảnh A4 | CẦN NGƯỜI THẬT · C5 |
| Q-002 | S3 | UX | Thua: nút chính dưới mép khung khi cao ≤ 600, focus không cuộn tới (preventScroll) (trùng B7) | thua ở 1280×600 / 812×375 / 375×812 | againBtn đáy 700>600, 797>375, 1018>812; 2000×911 vừa | đã sửa (C2) |
| Q-012 | S3 | UX | HUD cỡ px cố định: ở 2000×911 ô vũ khí 30 px, chữ Lv cao 12 px — rất nhỏ so với màn (trùng B6) | 2000×911, cấp 50 | chip 30 px, #lv 32×12 ở mọi cỡ | đã sửa (C2) |
| Q-023 | S3 | UX | Khoảng lặng phần thưởng dài nhất mỗi ván 25–60 s (giữa đợt 2–3); phút đầu có quãng 8,6–13 s không lên cấp | 5 ván bot | maxRewardGap 46.8/35.5/59.6/50.2/25.2 | mở (C3 chưa đụng; quãng dài nhất 31–73 s) |
| Q-030 | S4 | BUG | Bản lưu sửa tay không bị kẹp: up.hp −3 → máu tối đa 96, up.hp 999 → 8112, linh hồn −50 / 1e12 giữ nguyên | vs_meta {"souls":-50,"up":{"hp":-3}} | game.js:24–33 normMeta | đã sửa (C1) |
| Q-014 | S4 | GFX | Vùng nổ: viền đứt nét tương phản 3.5–4.1 (đạt), lòng vùng chỉ 1.33–1.38 so với nền | addZone ở 4 nền, đo pixel | đợt 1–4: viền 4.13/3.49/3.59/3.81 | mở · C5 |
| Q-015 | S4 | GFX | Quả cầu xoay #ff3b5c và Huyết Tiễn #ff4d8d cùng tông đỏ với vùng báo nguy hiểm rgb(255,60,60) | — | WEAPON_LOOK.col | mở · C5 |
| Q-018 | S4 | GFX | Tầm nhìn theo tỉ lệ: 16:9 640×360, 21:9 840×360 (+31% ngang), dọc 375×812 (+125% dọc); quái vẫn sinh ngoài khung | 2520×1080, 375×812 | VW/VH, ringDist 527–537 | không sửa (C2): zoom nguyên → chặn 21:9 còn 270 đơn vị cao, dọc còn 250 rộng — tệ hơn; quái vẫn sinh ngoài khung |
| Q-003 | S4 | UX | Menu và bảng tạm dừng mở không đặt focus; Tab đầu ở menu vào ô vũ khí, không vào "Bắt đầu" | tải trang, nhấn Tab | activeElement=BODY sau tải và sau Esc | mở · C5 |
| Q-004 | S4 | UX | Bảng chọn thẻ phải cuộn ~24 px ở cao 375 và 812 | levelup ở 812×375, 375×812 | scrollHeight 365/341, 801/778 | đã sửa (C2): 812 px cao không cuộn; 375 px cao (xoay ngang) còn 34 px |
| Q-008 | S4 | UX | Esc ở màn kết thúc và bảng chọn thẻ không làm gì (không có lối tắt về menu/tạm dừng) | màn kết thúc, nhấn Esc | js/input.js:38 | mở · C5 |
| Q-016 | S4 | UX | prefers-reduced-motion không tắt rung màn hình (chỉ theo nút Rung) | bật giảm chuyển động | data.js:49, game.js:417 | mở · C5 |
| Q-017 | S4 | UX | Chữ < 12 px: sổ tay small 11 px, menu small 11,7 px; ★ chấm tiến hoá tương phản 2.0 | mở sổ tay / thẻ | auditAll + đo màu | đã sửa (C2) |
| Q-026 | S4 | UX | Thẻ vũ khí mới (cấp 1) chỉ tả hành vi, không có số (orbit, lightning, knife, aura, nova) | rút thẻ vũ khí chưa có | UPGRADES desc(1) | mở · C4 |
| Q-027 | S4 | UX | Menu nhắc lướt né nhưng không nhắc tiến hoá; người mới chỉ biết qua dòng công thức trên thẻ | đọc chữ menu | index.html:49 | mở · C4 |
| Q-031 | S4 | UX | localStorage đầy/bị chặn: store.set nuốt lỗi, tiến trình không lưu mà không báo người chơi | Storage.setItem ném lỗi | util.js:21 | đã sửa (C1) |
| Q-032 | S4 | AUD | Ẩn tab: nhạc không dừng, chỉ nhỏ 60% + lọc 650 Hz (AudioContext vẫn chạy) | ẩn tab giữa ván | ctx running, musicGain 0.36 | mở · C7 |
| Q-033 | S4 | AUD | Không có âm phản hồi khi: lướt lúc chưa hồi, đổi thẻ hết lượt, mua thiếu linh hồn, mở tạm dừng | bọc SFX.play, gọi từng sự kiện | 4 sự kiện "—" | mở · C7 |
| Q-019 | — | GFX | Dao và Lôi Phạt: ảnh tĩnh khó phân biệt bậc 1 với tiến hoá | ảnh ghép 6 vũ khí × 2 bậc | ảnh A4 | CẦN NGƯỜI THẬT |
| Q-005 | — | UX | Vùng tai thỏ/thanh điều hướng: pane không giả lập safe-area (--sat = 0) | preset mobile | --sat 0px | CẦN NGƯỜI THẬT |
| Q-006 | — | UX | hitAudit chưa phủ thẻ tiến hoá và nghi thức rương (#chestCere không có nút) | — | auditAll | đã sửa (C2): auditAll thêm thẻ tiến hoá; #chestCere không có nút |
| Q-009 | — | UX | Toàn màn hình (cần cử chỉ thật) và xoay máy thật chưa thử; mã: orientationchange → tạm dừng | — | js/ui.js:867, render.js:35 | CHƯA KIỂM |
| Q-028 | — | UX | Cảm giác nhịp, độ khó thật, lướt có "đã" không | — | — | CẦN NGƯỜI THẬT |
| Q-034 | — | AUD | Chất lượng âm, nối vòng nhạc; 12 âm phát nhiều nhất ghi ở phiếu cuối KE_HOACH_QA.md | — | hit 1249/kill 803/gem 744 trong 300 s | CẦN NGƯỜI THẬT · C7 |

## 10 việc nên làm trước

1. Q-007 — thắng bị tính thua nếu gục lúc boss cuối đang nổ (C1).
2. Q-029 — bắt lỗi toàn cục, báo người chơi + nút tải lại (C1, B3).
3. Q-002 — nút "Chơi lại" luôn trong tầm nhìn khi thua ở màn thấp (C2).
4. Q-012 — HUD co giãn theo màn hình (C2, B6).
5. Q-010 — báo trước ring/spiral/summon/rings rõ trên mọi nền (C5, B19).
6. Q-022 — giữ báo trước ≥ 0,4 s kể cả khi boss cuồng nộ tối đa (C3).
7. Q-020 + Q-021 — cân bằng lại độ khó boss, tăng phần sát thương từ kỹ năng boss (C3, B11/B15).
8. Q-024 — linh hồn ván đầu đủ mua 1 nâng cấp sau 2–3 ván (C3, B13).
9. Q-025 — Hào Quang Độc / Vòng Huyết Nguyệt khởi đầu sống được 120 s (C3).
10. Q-011 — gộp/giới hạn số sát thương khi đông quái, tuỳ chọn tắt số (C5, B9).

## Nhật ký phase

A0: 3 mục kiểm, 0 phát hiện
A1: 9 mục kiểm, 2 phát hiện (sửa: #cv thay canvas, canvas.spr chung, .goal 22 px, spriteIcon đặt cỡ; V6-1 thêm; runChecks 55/55; V6-1 bắt được lỗi khi chèn lại CSS cũ). Lúc bị che vẫn có lối thoát (R và Enter chơi lại); linh hồn + nhân vật vừa mở đã lưu vs_meta trước khi bảng hiện.
A2: 10 bảng × 7 cỡ hitAudit = 0 vi phạm; bàn phím menu→ván→thẻ→tạm dừng→kết thúc→R đi hết, viền vàng khi focus; nút lướt/cần gạt hiện ở mobile; không tràn chữ ở 375. 14 mục kiểm, 5 phát hiện; V6-2 thêm, runChecks 56/56
A3: vòng chính menu→thẻ→rương→boss→nghỉ→đợt 2→thắng→vô tận (boss ngẫu nhiên đợt 6–8, "đợt 8 (vô tận)")→thua→chơi lại/menu: G sạch, 0 lỗi; tạm dừng đóng băng điện ảnh + chết chậm; rương+3 lần lên cấp "còn 4 lượt"; ẩn tab → tạm dừng, xả phím, không nhảy giờ; mua đủ/thiếu/tối đa đúng; nhiệm vụ trả 1 lần; Ác mộng chỉ sau thắng; kỷ lục tách; ô đầy → 1–2 thẻ, không 0; bot 400 s khung thật 0 lỗi. 26 mục kiểm, 3 phát hiện
A4: quái tách khỏi 4 nền, không lộ đường nối gạch; vùng nổ (slam/meteor/boulders) + vạch lao rõ; vật phẩm/ngọc 3 cỡ/rương phân biệt bằng dáng; bỏ hết ASSETS vẽ được, 0 lỗi; thứ lớp: đạn quái trên hiệu ứng, số sát thương trên đạn (render.js:1154–1156); tương phản chữ bảng ≥ 4.5 trừ ★. 10 mục kiểm, 10 phát hiện; đạn quái không xuất hiện trong cảnh 300 quái (CHƯA KIỂM bằng ảnh)
A5: quái hạ đầu 1,6–2,7 s; lên cấp đầu 5–10 s; 5–8 lần lên cấp phút đầu; lên cấp/phút ≈ 7 (đợt 1) → 3–3,5 (đợt 2–4); quái không bao giờ sinh gần người chơi (gần nhất 360); lướt bất tử 0,26 s đúng; nghỉ giữa đợt 6 s có gom ngọc; ván thua đầu có mục tiêu đạt được ván sau (Dao Bạc: tới đợt 2). 7 mục kiểm, 9 phát hiện
A6: 6 vũ khí cấp 8, trung vị upd/ren (ms): 100 quái 0,3/1,0 · 300 quái 0,6/2,2 · 450 quái 1,0/3,2; khung dài nhất ren 8,1/18,3/17,7 (< 33); dt chặn 0,25 s + tối đa 5 bước (ui.js:879,894). Rò rỉ — vô tận 26 phút (đợt 13): quái chạm trần 450, fx/decal/đạn/chữ/hạt/ngọc/giọng âm/DOM HUD đều có trần, heap 44–48 MB đứng yên; bản lưu hỏng (rác, {}, thiếu trường, null, mảng, âm, 1e12) → đều vào menu, chơi, kết thúc, 0 lỗi; lỗi 1 lần trong update → vòng lặp tự chạy tiếp; thiếu ảnh/âm/font: có đường dự phòng (render.js:72, audio.js:105/109, font monospace), đã thử tương đương — xoá file thật CHƯA KIỂM. 6 mục kiểm, 3 phát hiện
A7: phản hồi âm đúng tên cho trúng đòn/hạ quái/ngọc/lên cấp/chọn thẻ/lướt/vật phẩm/rương/boss nổi giận/máu thấp/hồi máu/chơi tiếp; đỉnh đầu ra: boss chết 0,62, lên cấp + rương 0,63, bom 300 quái 0,60 — đều < 1; nhạc normal→boss→normal; tạm dừng lọc 674 Hz, âm lượng 60%, trở lại 20 kHz; máu thấp lọc 2,4 kHz rồi tắt khi hồi; thanh âm lượng áp ngay + lưu, tắt tiếng lưu; quay lại sau ẩn tab không chồng bản nhạc. 6 mục kiểm, 3 phát hiện
C1: Q-007, Q-029, Q-030, Q-031 đã sửa; B3 (hộp báo lỗi), B4 (`window.VER`), B5 (ui.js → 5 file) xong; V6-3 thêm; runChecks 57/57
C2: HUD co giãn `--ui` (zoom #hud, 1280×720 = 1, tối đa 2); màn kết thúc 2 cột ở rộng ≥ 900, thua thì hàng nút dính đáy, điện thoại gọn (3 vũ khí, 4 ô số); chữ ≥ 12 px; ★ #a08a5c; V6-4 thêm; runChecks 58/58 ở 1920×1080, 1366×768, 2000×911, 1280×600, 768×1024, 375×812, 812×375 + pane 613×575
C3: bot 20 ván lưu trắng: qua boss 1/2/3 = 20/20/14, thắng 11/20; báo trước ≥ `CFG.teleMin` 0,4 s; máu quái +0,33/phút; quái thường/kỹ năng boss đổi dmg (golem 10, slam 30, meteor 26…); orbit 7, aura 4/60; `metaCost` 30–320, 15 quái/linh hồn; khởi đầu 120 s: mọi vũ khí ≥ 111 quái; V6-5 thêm; runChecks 59/59 ở 1280×720 (pane bị ẩn → rAF dừng thì V6-3 trượt; pane 387×212 thì thẻ tiến hoá phải cuộn); `hitAudit` nay cuộn cả phần tử bị vùng cuộn cắt. Chưa đạt: Q-021 (6–11%), Q-023
A8: 34 dòng, sắp theo mức; S1 1 (đã sửa) · S3 13 · S4 14 · chưa chấm 6 (CẦN NGƯỜI THẬT / CHƯA KIỂM)
