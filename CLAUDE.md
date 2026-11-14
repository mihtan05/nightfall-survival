# Đêm Sinh Tồn — mini game kiểu Vampire Survivors (HTML5 Canvas, JS thuần)

Người dùng nói tiếng Việt; trả lời, chú thích code và chữ trong game đều bằng tiếng Việt.

## Chạy game
- Đầy đủ âm thanh: chạy `python -m http.server 8765` trong thư mục này, mở http://localhost:8765/index.html (nhấn Ctrl+F5 sau khi sửa).
- Bấm đúp `index.html` cũng chơi được, nhưng `fetch` bị chặn trên `file://` → âm tổng hợp, không có nhạc.
- Sau mỗi lần sửa JS/CSS: tăng số phiên bản `?v=...` trong các thẻ `<script>`/`<link>` của `index.html` (tránh trình duyệt dùng bản cũ).

## Cấu trúc
- `index.html` — khung HUD + các bảng (menu, lên cấp, tạm dừng, kết thúc). Script nạp theo thứ tự: util → atlas → fx-atlas → data → audio → render → game → input → icons → ui (script thường, không phải ES module).
- `js/data.js` — **mọi số cân bằng**: `CFG`, `SETTINGS`, `ENEMIES` (gồm 4 boss + `crate`), `BOSS_SKILLS`, `ITEMS`, `WAVE_DEFS` (4 đợt), `WEAPONS` (6 vũ khí × 8 cấp), `PASSIVES`, `SPRITES`/`ASSETS`, `FX_STYLE`.
- `js/game.js` — trạng thái `G`, sinh quái, đợt quái (`updateWave`: fight → boss → rest → đợt sau; hạ boss đợt 4 là thắng), AI boss (`startSkill`/`updateBoss`, mọi kỹ năng có pha báo trước), vùng nổ (`zones`), vật phẩm (`pickItem`, `detonate`), thùng gỗ (`spawnCrate`), va chạm, `update(dt)`.
- `js/render.js` — camera zoom số nguyên (`ZOOM`, thế giới thấy ~360 đơn vị), nội suy vị trí, `draw()` (sprite atlas, không có thì `SHAPES` vẽ bằng code), nền, hiệu ứng sprite (`drawSfx`), báo trước đòn, vignette.
- `js/audio.js` — SFX Kenney (`SFX_FILES`) + nhạc (`MUSIC`), dự phòng âm tổng hợp WebAudio; `SFX.sync()` đổi nhạc khi có boss.
- `js/input.js` — đọc phím vật lý `e.code` (chống lỗi bộ gõ Telex), phím bấm sau thắng, joystick cảm ứng.
- `js/icons.js` — icon pixel 32×32 cho giao diện (`ICONS`, `iconEl`). `js/ui.js` — HUD, thẻ nâng cấp, tạm dừng, kết thúc, vòng lặp `frame()`, hook test `window.__vs`.
- `js/atlas.js`, `js/fx-atlas.js` — TỰ SINH, không sửa tay.
- `assets/` — `atlas.png` (sprite 0x72), `fx.png` (PVFX), `sfx/*.ogg`, `music/*.webm`, `fonts/VT323` (+ `OFL.txt`).
- `CREDITS.md` — nguồn & giấy phép mọi asset (CC0, font OFL). Cập nhật khi thêm asset.
- `KE_HOACH_V3.md` — kế hoạch v3 (Giai đoạn 0–6) — **đã làm xong cả 7 giai đoạn**.
- `KE_HOACH_V4.md` — kế hoạch v4 (4 giai đoạn). Đã xong: Giai đoạn 1 (đạn quái vẽ trên cùng, số sát thương ảnh VT323 `drawTexts`, phản hồi bị đánh `pushAround`, ưu tiên hiệu ứng `pri`/`CFG.sfxSoftCap`, thanh tiến độ đợt `#waveBar`, `banner(text, sub)`); Giai đoạn 2 (nền theo đợt `groundFor`/`DECOR` + `WAVE_DEFS[i].ground`, quầng sáng `drawGlows`, bụi `drawMotes`, boss xuất hiện `G.cine` + nổi giận `e.raged` + chết chậm `G.slowT`/`G.booms`, gộp ngọc `CFG.gems`, sóng lên cấp). Logic điện ảnh nằm trong `frame()`, không trong `update()`. Giai đoạn 3 (lướt né `tryDash`/`CFG.dash` + nút `#dashBtn`; 4 ô vũ khí + 4 ô bị động `CFG.slots`, `rollChoices`, đổi thẻ `reroll`; tiến hoá `EVOLUTIONS` + `CFG.evo`; quái `bomber`/`splitter`/`charger` (ảnh nhuộm `SPRITES[k].tint`) + tinh anh `spawnElite`/`WAVE_DEFS[i].elites`; boss cuồng nộ dần `CFG.enrage` + kỹ năng pha 2 `skills2`; thống kê `G.stats` + bảng `renderDmgList`). Giai đoạn 4 (linh hồn `META`/`vs_meta` + `META_UPGRADES`/`CFG.metaCost`, bảng `#meta`, `runSouls`/`grantMeta`; vũ khí khởi đầu `SETUP.start`/`vs_start` + `UNLOCKS`; Ác mộng `CFG.nightmare`/`SETUP.nm` (kỷ lục `vs_best_nm`, hiện sau lần thắng đầu); vô tận `continueEndless`, `endlessN()`, `waveDef()` đợt ≥5 dùng lại đợt 4 + boss ngẫu nhiên, `CFG.endless`). Đã xong cả 4 giai đoạn V4.

- `KE_HOACH_V5.md` — kế hoạch v5 (đồ hoạ, âm thanh, cảm giác chơi; 10 phase, mỗi phase là một prompt tiếng Anh dán vào phiên mới; bảng trạng thái ở đầu file). V5 không gồm cân bằng độ khó (làm sau). Đã xong: Phase 1 (viền sprite: atlas KHÔNG còn viền vẽ sẵn; `render.js` dựng tấm sprite đã phóng sẵn theo từng loại vật/vai/hệ số — `sheetFor`, `buildSheet`, `outlineRole`, `texelPx`, `sheetGen` — và vẽ viền ở độ phân giải canvas theo `CFG.outline`; `drawFrame(c, sh, img, fr, …)` vẽ từ tấm đó; icon lấy từ atlas được thêm viền trong `outlineIcon`); Phase 2 (bóng mềm vẽ sẵn `shadowImg`/`drawShadow`; vũng sáng dẹt dưới chân boss/tinh anh trong `drawGlows`; vùng báo trước dùng hoạ tiết vẽ sẵn `teleImg` ('zone'/'fill'/'lane') + viền đứt nét xoay, `teleGlow` cho boss tụ lực; nền: làm dịu đường nối gạch + mảng sáng tối lớn `groundPatches`; quái sinh trong tầm nhìn hiện dần `e.inT`/`CFG.spawnIn`; quái nhún khi đi `CFG.bob`; thanh máu có khung + vệt trễ `drawBar`, `p.hpLag`/`e.hpLag`, `CFG.barLag`). Hiệu ứng quái chết co lại + nháy trắng (`'die'` trong `drawFx`) có từ trước, giữ nguyên.

## Công cụ phát triển
- `tools/strip_outline.py` (`python -I tools/strip_outline.py`) — xoá viền vẽ sẵn khỏi `assets/atlas.png` (đã chạy; chạy lại không đổi gì). Bản atlas cũ có viền: `tools/backup/atlas.v4.png`. Thư mục này không dùng git: trước khi ghi đè file ảnh/âm thanh, chép bản cũ vào `tools/backup/`.
- Viền sprite: chỉnh thử ngay trong console bằng `__vs.outline({ px: 2, inner: 0.7, outer: 0.25, enemy: '#fff' })`; giá trị mặc định ở `CFG.outline` (`js/data.js`).
- `.claude/launch.json` có 2 cấu hình máy chủ: cổng 8765 và 8766 (dùng 8766 khi 8765 đang bận). `localStorage` tách theo cổng, nên tiến trình lưu ở cổng này không hiện ở cổng kia.
- `tools/build_atlas.py <0x72 atlas.png> <tile_list>` (từ V5 không vẽ viền vào atlas nữa) và `tools/build_fx_atlas.py <PVFX zip>` — ghép lại atlas. Cần các gói gốc ở `vendor/` (thư mục `vendor/` KHÔNG có ở đây; muốn ghép lại thì phải tải lại gói: 0x72 DungeonTileset II v1.7, PVFX Foundry 1.0).
- Trong console trang game: `__vs.tick(giây)`, `__vs.give('nova', 8)`, `__vs.spawn(50,'golem')`, `__vs.spawnBoss('bossOgre')`, `__vs.pickItem('bomb')`, `__vs.skipTo(2)`, `__vs.evolve('knife')`, `__vs.spawnElite('golem')`, `__vs.reroll()`. Tiến trình lâu dài: `META` (xoá `localStorage.vs_meta` để về trắng), `buyMeta('hp')`, `continueEndless()` (sau khi thắng).
- `tools/checks.js` → `await runChecks()`: 17 tiêu chí nghiệm thu GĐ0–6 + tiêu chí V4 (`V4-1`…) (bấm "Bắt đầu" trước để mở âm thanh).
- `tools/balance-bot.js` → `runBot()`: bot chơi 1 ván (≈25–60 giây thật), báo cáo sát thương/phút, nguồn sát thương, thời gian hạ boss. Mỗi lệnh JS trong pane trình duyệt bị giới hạn 45 giây → chạy bot bằng `setTimeout` rồi đọc kết quả sau.

## Quy ước
- Tải bất kỳ file/asset nào từ internet: hỏi người dùng trước (tên file, nguồn, dung lượng, giấy phép). Chỉ dùng CC0/OFL, ghi vào `CREDITS.md`.
- Giữ cơ chế dự phòng: thiếu ảnh/âm thanh thì game vẫn chạy bằng hình vẽ code / âm tổng hợp.

## Trạng thái (cân bằng gần nhất, sau V4 Giai đoạn 3)
Bot (né đòn mức "khá", có lướt né), 10 ván qua 2 đợt chỉnh cuối: qua boss 1 ở 10/10, boss 2 ở 10/10, boss 3 ở 5/10, thắng 4/10; ván thắng dài 12:54–13:50; ở đợt chỉnh cuối, đòn trúng đầu tiên lúc giây 32 ở 4/5 ván (vòng vây giây 30). Thời gian hạ boss phần lớn 30–80 giây (vài trận 82–104 giây; cuồng nộ dần chặn trên).
Chưa đạt mục tiêu: tỉ lệ sát thương nhận từ kỹ năng boss + đạn chỉ 0–30% (trung bình ~9%, mục tiêu 15–35%) vì bot lướt né đòn báo trước rất tốt; boss 2 hơi dễ (mục tiêu 4/5).
Vũ khí khởi đầu (bot, 120 giây, 2 ván mỗi loại): bolt/aura/orbit/lightning/nova đều sống, hạ 85–250 quái; dao chỉ hạ 2–10 quái vì bot luôn chạy xa quái mà dao bay theo hướng chạy — cần người thật thử.
Chưa kiểm bằng người thật: độ khó, cảm giác lướt, chất lượng âm thanh/vòng lặp nhạc, khung hình thật (phím `F` hiện "khung dài nhất").
