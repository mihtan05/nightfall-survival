# KE_HOACH_V7 — Nâng cấp đồ hoạ và âm thanh "Nightfall: Survival"

> **Cho người/agent thực hiện:** BẮT BUỘC dùng skill `superpowers:subagent-driven-development` (khuyên dùng) hoặc `superpowers:executing-plans` để làm từng task. Các bước dùng ô `- [ ]` để theo dõi.

**Mục tiêu:** Game trông đúng với cái tên "Nightfall" (đêm tối có ánh sáng), đọc được khi 300 quái trên màn, và nghe "đã" mà không ồn — không thêm thư viện, không cần asset mới để chạy.

**Kiến trúc:** Hai nhánh độc lập, làm nhánh nào trước cũng được. Nhánh A (đồ hoạ) thêm một lớp ánh sáng dạng *lightmap* vẽ ở độ phân giải thế giới rồi nhân (multiply) lên cảnh, cộng luật màu và phản hồi trúng đòn. Nhánh B (âm thanh) thêm đo âm lượng theo bus, một biến "độ căng" điều khiển nhạc và tiếng nền, giảm âm theo khoảng cách. Mọi thứ mới đều có công tắc và tự lùi về cách cũ khi máy yếu hoặc thiếu file.

**Công nghệ:** JS thuần (script thường, không module), Canvas 2D, WebAudio. Kiểm bằng `tools/checks.js` → `runChecks()` chạy trong trang game.

**Spec:** không có file spec riêng. Phần "Nghiên cứu và quyết định thiết kế" ngay dưới là spec; số liệu hiện trạng lấy từ `QA_KET_QUA.md` và `CLAUDE.md`.

## Nghiên cứu và quyết định thiết kế

Tìm trên web (tháng 11/2026) không ra bài mổ xẻ kỹ thuật chính thức nào của Vampire Survivors; các điểm dưới đây là thứ có nguồn, và quyết định rút ra cho game này.

| Quan sát từ game cùng thể loại | Nguồn | Quyết định cho V7 |
|---|---|---|
| Vampire Survivors dùng sprite đơn giản; sức hút đến từ "juice" — phản hồi dư thừa cho mỗi hành động. Người chơi không ngắm bắn nên phản hồi gánh cảm giác sức mạnh | [hackread](https://hackread.com/the-juice-factor-designing-game-feel/), [arXiv 2011.09201](https://ar5iv.arxiv.org/html/2011.09201) | Không vẽ lại sprite. Đầu tư vào ánh sáng + phản hồi trúng đòn (A1, A3) |
| 20 Minutes Till Dawn: bảng màu gần đơn sắc, tối; nhân vật luôn có viền sáng để không lạc giữa đám đông | [gamescreed](https://www.gamescreed.com/reviews/20-minutes-till-dawn-pc-review), [destructoid](https://www.destructoid.com/20-minutes-till-dawn-roguelike-survival-pc-steam-impressions/) | Nhân vật là nguồn sáng mạnh nhất màn + vòng sáng luôn bật (A1, A2). Sửa Q-013 |
| Vampire Survivors cho tắt số sát thương và hiệu ứng loé; Soulstone Survivors có thanh "Special effects visibility"; rối mắt là lý do hoàn tiền hàng đầu của Soulstone | [familygamingdatabase](https://www.familygamingdatabase.com/accessibility/Vampire+Survivors), [Steam](https://steamcommunity.com/app/2066020/discussions/0/3591086730691827584), [vaporlens](https://vaporlens.app/app/2066020/soulstone_survivors/stats/analysis) | Đã có công tắc số sát thương / giảm loé (C5). Thêm thanh độ đậm hiệu ứng vũ khí (A4) và luật bớt số khi đông (A3). Sửa Q-011 |
| Lightmap 2D: vẽ đèn kiểu cộng lên canvas phụ rồi nhân lên cảnh; nội dung tĩnh nên vẽ sẵn ra canvas phụ | [slembcke](https://slembcke.github.io/2D-Lighting-Overview), [web.dev](https://web.dev/articles/canvas-performance/) | A1 dùng đúng cách này, canvas phụ chỉ ~640×360 px (một điểm ảnh = một đơn vị thế giới ở 1280×720) nên rẻ |
| Âm thanh game đông quái: giới hạn số bản của cùng một âm, cướp giọng ưu tiên thấp, bỏ âm ở xa trước khi cấp giọng, ducking theo thứ tự ưu tiên | [Audiokinetic](https://www.audiokinetic.com/en/how-to-get-a-hold-on-your-voices-optimizing-for-cpu-part-1), [Unreal Sound Concurrency](https://dev.epicgames.com/documentation/unreal-engine/sound-concurrency-reference-guide) | Giới hạn + cướp giọng + ducking đã có (V5 Phase 6). Còn thiếu: bỏ/giảm âm theo khoảng cách (B3) |
| Nhạc thích ứng: xếp lớp theo số địch đang giao chiến (Just Cause 4); phải làm mượt trạng thái và giữ tối thiểu để nhạc không giật khi giao tranh bật/tắt liên tục | [gamedeveloper](https://gamedeveloper.com/audio/adaptive-music-in-competitive-games), [bugnet](https://bugnet.io/blog/how-to-make-music-that-adapts-to-gameplay) | Game chỉ có 2 bản nhạc trộn sẵn, không có stem → "độ căng" điều khiển bộ lọc + âm lượng nhạc + tiếng nền, lên nhanh xuống chậm (B2) |

Đã có sẵn, KHÔNG làm lại: viền sprite, bóng, quầng sáng, vết trên nền, hình vũ khí theo bậc (V5 P1–P3); bus/ducking/giới hạn giọng/âm theo vai (V5 P6); cao độ nhặt ngọc tăng dần (`G.gemStreak`); công tắc Rung / Số sát thương / Giảm loé / Dễ nhìn (C5); `CFG.audio.sfxTrim` 0.6.

Cố ý KHÔNG làm: bloom (chưa có nguồn đáng tin cho Canvas 2D, `ctx.filter` tốn); lớp nhạc tổng hợp chồng lên nhạc có sẵn (lệch tông); vẽ lại sprite; đổi màu vùng nguy hiểm (chữ trong game đều gọi là "vùng đỏ").

## Ràng buộc chung

- Chữ trong game, chú thích code, tài liệu: tiếng Việt.
- Không thêm thư viện, không bước build. Script thường, thứ tự nạp trong `index.html` giữ nguyên.
- Tải bất kỳ file nào từ internet: hỏi người dùng trước (tên file, nguồn, dung lượng, giấy phép). Chỉ CC0/OFL, ghi `CREDITS.md`. Task B5 là task duy nhất cần tải.
- Giữ cơ chế dự phòng: thiếu ảnh/âm thanh, chạy trên `file://`, hay máy không hỗ trợ `multiply` thì game vẫn chạy như trước V7.
- Không sửa tay `js/atlas.js`, `js/fx-atlas.js`.
- Mỗi task: `runChecks()` không giảm số đạt, thêm đúng 1 tiêu chí `V7-n`, đổi `window.VER` trong `index.html` (`v7a`, `v7b`, …).
- Ngân sách hiệu năng: với 300 quái + 6 vũ khí cấp 8, trung vị thời gian `render()` tăng không quá 1,0 ms so với trước task; khung dài nhất < 33 ms.
- Commit sau mỗi task, tác giả là tài khoản git của người dùng, KHÔNG thêm dòng `Co-Authored-By`. Không push (push `main` là deploy Vercel) trừ khi người dùng bảo.
- Mọi số mới đặt trong `js/data.js` (`CFG.*`), không rải số trong `render.js` / `audio.js`.

**Cách chạy kiểm (dùng cho mọi bước "Chạy"):** `preview_start` cấu hình `nightfall-survival-8766`, đặt khung 1280×720, gọi `show_pane('preview')` (pane ẩn thì `requestAnimationFrame` dừng và V6-3 trượt). Trong trang: nạp `tools/checks.js?v=<Date.now()>` bằng thẻ `<script>`, bấm `#startBtn`, rồi `runChecks()` qua `setTimeout` + đọc `window.__rc` (mỗi lệnh JS trong pane tối đa 45 giây). Kết quả là mảng `{ giai_doan, tieu_chi, ok, chi_tiet }`.

## Trọng tâm review

Năm tình huống kế hoạch dễ bỏ sót nhất, mỗi dòng đã có phép thử gắn vào task ghi trong ngoặc.

1. Máy yếu hoặc trình duyệt không hỗ trợ `multiply`: ánh sáng phải tự tắt, game không chậm đi hay đen màn (A1, bước 1 — `autoOff`).
2. Đổi cỡ cửa sổ / xoay máy giữa ván: canvas ánh sáng phải theo cỡ mới, không lệch hay kéo giãn (A1, bước 1 — `resize`).
3. Thiếu file nhạc mới, hoặc chạy `file://`: tiếng nền và việc chọn nhạc không ném lỗi, lùi về bản đang có (B2, B5).
4. Ẩn tab rồi quay lại: không chồng hai bản nhạc, không còn tiếng khi tab ẩn (B4).
5. Người bật "Giảm loé màn" hoặc hệ thống đặt giảm chuyển động: hiệu ứng nảy khi trúng đòn và nhấp nháy đèn phải tắt (A3).

---

## Cấu trúc file

| File | Thêm / đổi | Trách nhiệm |
|---|---|---|
| `js/data.js` | sửa | `CFG.light`, `WAVE_DEFS[i].ambient`, `CFG.juice`, `CFG.dmgNum`, `SETTINGS.light/fxAlpha`, `CFG.audio.intensity/amb/dist`, màu `WEAPON_LOOK`, khoá `MUSIC` mới |
| `js/render.js` | sửa | lightmap (`lightImg`, `addLight`, `drawLights`), nảy khi trúng, độ đậm hiệu ứng |
| `js/game.js` | sửa | đặt `e.pop` khi trúng, luật bớt số sát thương, truyền `y` cho `SFX.play` |
| `js/audio.js` | sửa | `busMeter`, `updateIntensity`, tiếng nền, `distGain`, âm `deny`/`pauseIn`, treo khi ẩn tab |
| `js/ui.js`, `index.html`, `css/game.css` | sửa | 2 mục cài đặt mới trong `#optBox` |
| `tools/checks.js` | sửa | tiêu chí `V7-1` … `V7-9` |
| `tools/loop-seam.js` | tạo | `snapLoop()` — dời điểm nối vòng lặp nhạc về chỗ không lách tách |
| `CLAUDE.md`, `QA_KET_QUA.md`, `CREDITS.md` | sửa | ghi kết quả từng task (≤ 3 dòng mỗi task) |

---

### Task 0: Chốt phần đang dở (v6l)

Cây làm việc đang có thay đổi chưa commit: `sfxTrim`, mức Dễ, C5 (cài đặt ở menu, tay cầm, dễ nhìn), C6 (4 luật vô tận). `runChecks` 64/64. V7 phải bắt đầu từ cây sạch.

**Files:** không sửa code. Sửa `QA_KET_QUA.md`, `KE_HOACH_QA.md`, `CLAUDE.md`.

- [ ] **Bước 1: Chạy bot vô tận 10 ván.** Nạp `tools/balance-bot.js`, đặt `CFG.hints.on = false`, chạy 10 lần `runBot({ endless: true, stopWave: 6, maxT: 1500 })` nối nhau bằng `setTimeout`, gom `r.end` vào `window.__bots`. Chờ bằng lệnh nền, đọc `window.__bots` sau.
  Đạt khi: ≥ 3/10 ván có `end.wave >= 7` (đã qua đợt 6). Không đạt: giảm `CFG.endless.hp` 1.5 → 1.4 rồi chạy lại một lần; vẫn không đạt thì ghi số thật, không chỉnh nữa.
- [ ] **Bước 2: Chạy `runChecks()`.** Mong đợi: 64/64.
- [ ] **Bước 3: Ghi tài liệu.** `QA_KET_QUA.md`: thay dòng "ĐANG DỞ" bằng dòng kết quả có số bot. `KE_HOACH_QA.md`: gạch B9, B14, B18, B19, B21; B20 ghi "chữ lớn xong, đổi phím chưa làm"; B22, B23 ghi "chưa làm". `CLAUDE.md`: 61 → 64 tiêu chí, thêm ≤ 6 dòng về `CFG.easy`, `#settings`/`#optBox`, `pollPad`, `CFG.endless.rules`, `CFG.audio.sfxTrim`.
- [ ] **Bước 4: Commit.** `git add -A && git commit -m "QA C5 + C6 + mức Dễ: cài đặt ở menu, tay cầm, 4 luật vô tận; hiệu ứng nhỏ lại"`

---

## NHÁNH A — ĐỒ HOẠ

### Task A1: Lớp ánh sáng đêm (lightmap)

**Files:**
- Sửa: `js/data.js` (`CFG.light`, `WAVE_DEFS[0..3].ambient`, `SETTINGS.light`)
- Sửa: `js/render.js` (hàm mới + 1 chỗ gọi trong `renderScene`; `drawLights` tự tạo lại canvas khi `VW`/`VH` đổi nên không cần sửa `resize`)
- Sửa: `index.html`, `js/ui.js` (ô `#optLight` "Ánh sáng đêm" trong `#optBox`, nối như `optClear`)
- Kiểm: `tools/checks.js` (`V7-1`)

**Interfaces:**
- Dùng: `VW`, `VH`, `ZOOM`, `SCREEN`, `W`, `H`, `ctx`, `glowImg`, `waveIdx()`, `G.zones`, `G.boss`, `G.gems`, `G.bullets`, `G.enemies` (đều có sẵn trong `render.js` / `game.js`).
- Tạo ra:
  - `CFG.light = { player: 150, playerCol: '#fff2d0', gem: 14, gemCol: '#7fe6ff', bullet: 24, zone: 1.25, zoneCol: '#ff5040', boss: 120, elite: 55, eliteCol: '#ffd166', rageCol: '#ff5a6e', rageMul: 1.3, max: 160, autoOff: { ms: 20, hold: 3 } }`
  - `WAVE_DEFS[i].ambient`: `'#8088b8'`, `'#6f78a8'`, `'#6a5f96'`, `'#7a5560'` (đợt 1 → 4; đợt vô tận dùng của đợt 4)
  - `SETTINGS.light` (khoá `vs_light`, mặc định `true`)
  - `lightOn(): boolean` — `SETTINGS.light && !light.failed`
  - `addLight(x: number, y: number, r: number, color: string, a = 1): void` — thêm đèn vào danh sách của khung hiện tại, bỏ qua khi đã đủ `CFG.light.max`
  - `drawLights(camX: number, camY: number): void` — dựng lightmap và nhân lên `ctx`
  - `light = { cv: HTMLCanvasElement|null, failed: false, slowT: 0, n: 0 }` — `failed` đặt `true` khi không hỗ trợ `multiply` hoặc khi tự tắt; `n` = số đèn của khung vừa vẽ
  - `lightTick(dt: number, renderMs: number): void` — cộng `slowT` khi `renderMs > autoOff.ms`, về 0 khi nhanh lại; `slowT >= autoOff.hold` thì `light.failed = true`

- [ ] **Bước 1: Viết tiêu chí trượt `V7-1`** trong `tools/checks.js`, đặt trước khối khôi phục `META` cuối `runChecks`:

```js
{ // ---- V7-1 (A1): lớp ánh sáng đêm ----
  const lum = (x, y) => { const d = ctx.getImageData(x, y, 8, 8).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; return s / (d.length / 4); };
  const shot = on => { SETTINGS.light = on; light.failed = false; render(1); return [lum(cv.width / 2 - 60, cv.height / 2 + 40), lum(12, 12)]; };
  fresh(); G.enemies.clear(); G.gems.clear(); G.shake = 0;
  const [cOff, kOff] = shot(false), [cOn, kOn] = shot(true);
  const sized = light.cv && light.cv.width === Math.ceil(VW) && light.cv.height === Math.ceil(VH);
  addZone(P().x + 150, P().y - 80, 30, 2, 1); render(1); const lit = light.n;          // số đèn của khung vừa vẽ
  G.zones.length = 0;
  const vw0 = VW, vh0 = VH; VW = Math.round(vw0 * 0.75); VH = Math.round(vh0 * 0.75); render(1);          // giả lập đổi cỡ cửa sổ (resize() đặt VW/VH)
  const resized = light.cv.width === Math.ceil(VW) && light.cv.height === Math.ceil(VH); VW = vw0; VH = vh0; render(1);
  for (let i = 0; i < 40; i++) lightTick(0.1, 25); const autoOff = light.failed === true && lightOn() === false;
  light.failed = false; light.slowT = 0; SETTINGS.light = true;
  ok('V7-1', '1.1 Ánh sáng đêm: giữa màn gần như nguyên sáng, góc màn tối 30–75%; tắt là như cũ; canvas đèn theo cỡ thế giới kể cả sau khi đổi cỡ; khung chậm 3 giây thì tự tắt',
    cOn / cOff >= 0.9 && kOn / kOff >= 0.3 && kOn / kOff <= 0.75 && sized && lit >= 2 && resized && autoOff,
    `giữa ${(cOn / cOff).toFixed(2)}, góc ${(kOn / kOff).toFixed(2)}, cỡ ${sized}/${resized}, đèn ${lit}, tự tắt ${autoOff}`);
}
```

- [ ] **Bước 2: Chạy `runChecks()`.** Mong đợi: lỗi `light is not defined` (tiêu chí chưa có gì để gọi).

- [ ] **Bước 3: Thêm cấu hình** vào `js/data.js` đúng các giá trị ở khối Interfaces.

- [ ] **Bước 4: Viết `lightImg`, `addLight`, `drawLights`, `lightTick` trong `js/render.js`**, đặt ngay sau `glow()`. Thuật toán (chữ ký và phép thử không tự suy ra được thứ tự này):

```js
// 1) canvas phụ light.cv cỡ ceil(VW) × ceil(VH) — MỘT điểm ảnh = một đơn vị thế giới; tạo lại khi cỡ đổi
// 2) g.globalCompositeOperation = 'source-over'; tô kín bằng WAVE_DEFS[waveIdx()].ambient
// 3) g.globalCompositeOperation = 'lighter'; với mỗi đèn: g.globalAlpha = a; g.drawImage(lightImg(color), x - camX - r, y - camY - r, 2r, 2r)
//    lightImg(color): canvas 64×64 vẽ sẵn, gradient tròn từ màu (alpha 1) ở tâm tới alpha 0 ở mép — lưu theo màu
// 4) trên ctx chính: setTransform(SCREEN,0,0,SCREEN,0,0); globalCompositeOperation = 'multiply';
//    nếu ctx.globalCompositeOperation !== 'multiply' → light.failed = true, thoát;
//    imageSmoothingEnabled = true; drawImage(light.cv, 0, 0, W, H); trả lại 'source-over' + imageSmoothingEnabled = false
// 5) light.n = số đèn đã vẽ; xoá danh sách
```

  Trong `drawLights`, trước bước 2, gom đèn: người chơi (`player`, `playerCol`); mỗi ngọc trong tầm nhìn (`gem`); mỗi đạn của người chơi (`bullet`, màu `WEAPON_LOOK[kind].col`); mỗi vùng nổ (`z.r * zone`, `zoneCol`, alpha `0.5 + 0.5 * (1 - z.t / z.max)`); boss (`boss`, màu `ENEMIES[type].color`; đang `raged` thì `rageCol` và bán kính × `rageMul`); tinh anh (`elite`, `eliteCol`).

- [ ] **Bước 5: Gọi trong `renderScene`.** Chèn `if (lightOn()) drawLights(camX, camY);` ngay SAU `drawSfx(false, vis)` và TRƯỚC vòng vẽ `G.shots` — đạn quái, cảnh báo ngoài màn (`drawWarnings`), số sát thương và mũi tên chỉ boss luôn sáng nguyên. Sau lời gọi phải đặt lại `ctx.setTransform(ZOOM, 0, 0, ZOOM, -camX * ZOOM, -camY * ZOOM)`.

- [ ] **Bước 6: Tự tắt khi chậm.** Trong `frame()` (`js/ui.js`), khối `try` của phần vẽ: đo `performance.now()` quanh `render(...)` rồi gọi `lightTick(dt, ms)`. Khi `light.failed` chuyển sang `true` do chậm, gọi `showToast({ id: 'lightOff', text: 'Đã tắt ánh sáng đêm để game mượt hơn' })` một lần.

- [ ] **Bước 7: Thêm ô cài đặt** `#optLight` (nhãn "Ánh sáng đêm") vào `#optBox`, thêm `['optLight', 'light', 'vs_light']` vào vòng nối cài đặt trong `js/ui.js`.

- [ ] **Bước 8: Chạy `runChecks()`.** Mong đợi: `V7-1` đạt, tổng 65/65.

- [ ] **Bước 9: Đo hiệu năng.** Trong trang: `__vs.give` cả 6 vũ khí cấp 8, `__vs.spawn(300, 'skeleton')`, `__vs.tick(2)`; đo trung vị 120 lần `render(1)` với `SETTINGS.light` tắt rồi bật. Đạt khi chênh ≤ 1,0 ms. Vượt: giảm `CFG.light.max` xuống 80 và bỏ đèn của ngọc, đo lại.

- [ ] **Bước 10: Chụp 4 ảnh** (mỗi đợt một ảnh, `__vs.skipTo(i)` + 60 quái) gửi người dùng xem. Quái ở mép màn phải còn nhận ra dáng; nếu không, nâng `ambient` của đợt đó lên 10% độ sáng.

- [ ] **Bước 11: Commit.** `git add -A && git commit -m "V7 A1: lớp ánh sáng đêm (lightmap), tự tắt khi máy chậm"`

---

### Task A2: Luật màu — đỏ chỉ dành cho nguy hiểm, nhân vật luôn nổi

Hiện Huyết Tiễn (`#ff4d8d`, sắc độ 338°) và Vòng Huyết Nguyệt (`#ff3b5c`, 350°) gần trùng màu vùng nguy hiểm `rgb(255,60,60)` (0°) — Q-015. Nhân vật cùng độ sáng với sọ trắng — Q-013.

**Files:**
- Sửa: `js/data.js` (`WEAPON_LOOK.bolt`, `WEAPON_LOOK.orbit`, `CFG.playerRing`)
- Sửa: `js/render.js` (`drawPlayerBuffs`)
- Sửa: mọi chỗ trong `js/` còn ghi cứng các mã màu cũ (tìm bằng `grep -n "ff4d8d\|ff3b5c\|ff2040\|ff7ab0\|b0103a\|d0103a" js/*.js`)
- Kiểm: `tools/checks.js` (`V7-2`)

**Interfaces:**
- Tạo ra: `CFG.playerRing = { a: 0.35, clear: 0.8 }` — độ đậm vòng sáng quanh nhân vật, thường và khi bật "Dễ nhìn".
- Bảng đổi màu (giữ nguyên `col2`, độ dài vệt và mọi trường khác):

| Vũ khí | Bậc 1 | Bậc 2 | Bậc 3 | Bậc 4 (tiến hoá) | `glow` |
|---|---|---|---|---|---|
| `bolt` (và `col` gốc) | `#ff4dc4` | `#ff4dc4` | `#ff7ad6` | `#c0109a` | `'pink'` |
| `orbit` (và `col` gốc `#c44dff`) | `#b020ff` | `#b020ff` | `#c44dff` | `#8a10d0` | `'purple'` |

- [ ] **Bước 1: Viết tiêu chí trượt `V7-2`:**

```js
{ // ---- V7-2 (A2): luật màu ----
  const hue = h => { const n = parseInt(h.slice(1), 16), r = n >> 16, g = n >> 8 & 255, b = n & 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn || 1;
    const x = mx === r ? (g - b) / d % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return (x * 60 + 360) % 360; };
  const far = h => Math.min(hue(h), 360 - hue(h));          // khoảng cách sắc độ tới đỏ 0°
  const cols = ['bolt', 'orbit'].flatMap(id => [WEAPON_LOOK[id].col, ...WEAPON_LOOK[id].tiers.map(t => t.col)]);
  const near = cols.filter(c => far(c) < 35);
  const left = ['ff4d8d', 'ff3b5c', 'ff2040'].filter(c => JSON.stringify([WEAPON_LOOK, FX_STYLE]).toLowerCase().includes(c));
  ok('V7-2', '2.1 Màu vũ khí cách màu đỏ nguy hiểm ≥ 35° sắc độ; không còn mã màu cũ trong bảng hình; vòng sáng nhân vật luôn bật',
    !near.length && !left.length && CFG.playerRing.a > 0 && CFG.playerRing.clear > CFG.playerRing.a, `gần đỏ: ${near.join(',') || 'không'}; mã cũ: ${left.join(',') || 'không'}`);
}
```

- [ ] **Bước 2: Chạy `runChecks()`.** Mong đợi: `V7-2` trượt, `chi_tiet` liệt kê các mã màu gần đỏ.
- [ ] **Bước 3: Đổi màu theo bảng** trong `WEAPON_LOOK`, rồi chạy lệnh `grep` ở mục Files và đổi nốt các chỗ ghi cứng (màu hạt, `FX_STYLE`, icon trong `js/icons.js` nếu dùng đúng mã đó) sang màu bậc 1 mới của vũ khí tương ứng.
- [ ] **Bước 4: Vòng sáng nhân vật luôn bật.** Trong `drawPlayerBuffs`, bỏ điều kiện `if (SETTINGS.clear)`; độ đậm = `SETTINGS.clear ? CFG.playerRing.clear : CFG.playerRing.a`.
- [ ] **Bước 5: Chạy `runChecks()`.** Mong đợi: `V7-2` đạt; `V5-3` (hình vũ khí theo bậc) vẫn đạt.
- [ ] **Bước 6: Chụp ảnh** Huyết Tiễn bậc 2 + Vòng Huyết Nguyệt bậc 3 bay qua một vùng nổ đang báo trước; gửi người dùng.
- [ ] **Bước 7: Commit.** `git commit -am "V7 A2: màu vũ khí tránh màu đỏ nguy hiểm, vòng sáng nhân vật luôn bật"`

---

### Task A3: Phản hồi trúng đòn + bớt số sát thương khi đông

**Files:**
- Sửa: `js/data.js` (`CFG.juice`, `CFG.dmgNum`)
- Sửa: `js/game.js` (`hitEnemy(e, dmg, kx, ky, kb, fx, src, fxk)`: đặt `e.pop`; hàm tạo số sát thương ngay trên `styleDmg` — chỗ đang kiểm `CFG.textCap` và `SETTINGS.dmgNum`; vòng cập nhật quái trong `update`: giảm `e.pop`)
- Sửa: `js/render.js` (`draw`: co giãn theo `e.pop`)
- Kiểm: `tools/checks.js` (`V7-3`)

**Interfaces:**
- Tạo ra:
  - `CFG.juice = { pop: 0.09, sx: 0.18, sy: 0.12 }` — thời gian nảy (giây), giãn ngang, co dọc ở đỉnh.
  - `CFG.dmgNum = { busy: 40, keep: 0.6, ema: 0.05 }` — từ `busy` số trên màn trở lên, số mới chỉ được tạo khi `dmg >= keep × G.dmgAvg`; `G.dmgAvg` là trung bình trượt hệ số `ema`.
  - `e.pop: number` (giây còn lại, 0 = không nảy), đặt lại 0 trong `spawnEnemy`.
  - `calm(): boolean` trong `render.js` — `REDUCED_MOTION || SETTINGS.noFlash`.

- [ ] **Bước 1: Viết tiêu chí trượt `V7-3`:**

```js
{ // ---- V7-3 (A3): nảy khi trúng + bớt số sát thương khi đông ----
  fresh(); const e = spawnEnemy('golem', P().x + 40, P().y); hitEnemy(e, 1, 0, 0); const popped = e.pop === CFG.juice.pop;
  v.tick(CFG.juice.pop + 0.05); const settled = e.pop === 0;
  const nf = SETTINGS.noFlash; SETTINGS.noFlash = true; const quiet = calm() === true; SETTINGS.noFlash = nf;
  fresh(); for (const w of ['bolt', 'orbit', 'lightning', 'knife', 'aura', 'nova']) v.give(w, 8); v.spawn(300, 'skeleton');
  let peak = 0; for (let i = 0; i < 50; i++) { v.tick(0.1); peak = Math.max(peak, G.texts.items.filter(t => t.num).length); }
  fresh(); const one = spawnEnemy('golem', P().x + 40, P().y); hitEnemy(one, 3, 0, 0); const few = G.texts.items.some(t => t.owner === one);
  ok('V7-3', '3.1 Quái nảy 0,09 giây khi trúng rồi về bình thường; giảm loé thì không nảy; 300 quái + 6 vũ khí cấp 8: tối đa 60 số cùng lúc; ít quái thì đòn nào cũng có số',
    popped && settled && quiet && peak <= 60 && few, `nảy ${popped}/${settled}, yên ${quiet}, đỉnh ${peak} số, ít quái ${few}`);
}
```

- [ ] **Bước 2: Chạy `runChecks()`.** Mong đợi: `V7-3` trượt (`e.pop` là `undefined`, đỉnh ≈ 113 số).
- [ ] **Bước 3: Thêm `CFG.juice`, `CFG.dmgNum`** vào `js/data.js`; `G.dmgAvg: 0` vào trạng thái ván trong `resetWorld`.
- [ ] **Bước 4: Đặt và giảm `e.pop`.** `hitEnemy` đặt `e.pop = CFG.juice.pop`; vòng cập nhật quái trong `update` trừ `dt`, kẹp về 0; `spawnEnemy` đặt 0.
- [ ] **Bước 5: Co giãn trong `draw(c, e, kind)`.** Khi `e.pop > 0 && !calm()`: `k = e.pop / CFG.juice.pop`, nhân tỉ lệ ngang với `1 + sx·k`, dọc với `1 − sy·k`, neo ở chân sprite. Không áp cho `kind === 'player'`.
- [ ] **Bước 6: Luật bớt số.** Trong hàm tạo số sát thương (`js/game.js`, ngay chỗ đang kiểm `CFG.textCap`): cập nhật `G.dmgAvg += (dmg − G.dmgAvg) × ema`; nếu số số-sát-thương đang sống ≥ `busy` và `dmg < keep × G.dmgAvg` thì thoát. Số đang cộng dồn trên cùng một quái (`e.txt`) không bị ảnh hưởng.
- [ ] **Bước 7: Chạy `runChecks()`.** Mong đợi: `V7-3` đạt.
- [ ] **Bước 8: Commit.** `git commit -am "V7 A3: quái nảy khi trúng đòn, bớt số sát thương khi đông quái"`

---

### Task A4: Thanh "Độ đậm hiệu ứng vũ khí"

**Files:**
- Sửa: `js/data.js` (`SETTINGS.fxAlpha`)
- Sửa: `js/render.js` (`drawAura`, `drawOrbit`, `drawKnifeLook`, `drawSfx`, `drawFx`)
- Sửa: `index.html`, `js/ui.js`, `css/game.css` (thanh trượt `#optFx` trong `#optBox`, cùng kiểu `.opt.vol`)
- Kiểm: `tools/checks.js` (`V7-4`)

**Interfaces:**
- Tạo ra: `SETTINGS.fxAlpha: number` (khoá `vs_fxalpha`, mặc định `1`, thanh trượt 40–100 bước 10, lưu dạng 0.4–1).
- Phạm vi: CHỈ hình của vũ khí người chơi — hào quang, quả cầu xoay, vệt dao, hiệu ứng sprite không có cờ `pri`, hiệu ứng code `'nova'` / `'bolt'` / `'cast'`. KHÔNG áp cho vùng nổ, báo trước của boss, đạn quái, hiệu ứng `pri`, số sát thương.

- [ ] **Bước 1: Viết tiêu chí trượt `V7-4`:**

```js
{ // ---- V7-4 (A4): độ đậm hiệu ứng vũ khí ----
  const k = cv.width / VW, px = (wx, wy) => { const d = ctx.getImageData(Math.round((wx - (P().x - VW / 2)) * k), Math.round((wy - (P().y - VH / 2)) * k), 4, 4).data; return d[0] + d[1] + d[2]; };
  const fa = SETTINGS.fxAlpha, li = SETTINGS.light; SETTINGS.light = false;
  fresh(); G.enemies.clear(); G.shake = 0; v.give('aura', 8); addZone(P().x + 120, P().y, 24, 5, 1);
  const A = P().weapons.aura.radius * 0.7;
  SETTINGS.fxAlpha = 0; render(1); const base = px(P().x + A, P().y), zone0 = px(P().x + 120, P().y);
  SETTINGS.fxAlpha = 1; render(1); const full = px(P().x + A, P().y) - base;
  SETTINGS.fxAlpha = 0.4; render(1); const dim = px(P().x + A, P().y) - base, zone1 = px(P().x + 120, P().y);
  SETTINGS.fxAlpha = fa; SETTINGS.light = li; G.zones.length = 0;
  ok('V7-4', '4.1 Độ đậm hiệu ứng 40%: hào quang nhạt đi ít nhất 40% so với 100%; vùng nổ không đổi',
    full > 0 && dim <= full * 0.6 && Math.abs(zone1 - zone0) <= 6, `hào quang ${full} → ${dim}, vùng nổ ${zone0} → ${zone1}`);
}
```

- [ ] **Bước 2: Chạy `runChecks()`.** Mong đợi: `V7-4` trượt (`dim` bằng `full`).
- [ ] **Bước 3: Thêm `SETTINGS.fxAlpha`** và thanh trượt `#optFx` (nhãn "Độ đậm hiệu ứng"); khi đổi: `SETTINGS.fxAlpha = el.value / 100; store.set('vs_fxalpha', SETTINGS.fxAlpha)`.
- [ ] **Bước 4: Áp vào 5 hàm vẽ.** Mỗi hàm nhân `ctx.globalAlpha` với `SETTINGS.fxAlpha` cho phần thuộc phạm vi ở trên và trả `globalAlpha` về 1 khi xong.
- [ ] **Bước 5: Chạy `runChecks()`.** Mong đợi: `V7-4` đạt; `V6-2` (`hitAudit`) vẫn đạt với thanh trượt mới.
- [ ] **Bước 6: Commit.** `git commit -am "V7 A4: thanh độ đậm hiệu ứng vũ khí"`

---

## NHÁNH B — ÂM THANH

### Task B1: Đo âm lượng theo bus và đặt mức phối chuẩn

Người dùng báo hiệu ứng to hơn nhạc. `sfxTrim` 0.6 là chỉnh theo cảm giác; task này thay bằng số đo.

**Files:**
- Sửa: `js/audio.js` (`SFX.init`: 2 `AnalyserNode`; `SFX.busMeter`)
- Sửa: `js/data.js` (`CFG.audio.mix`, có thể chỉnh `sfxTrim`, `roleDb.frequent`)
- Kiểm: `tools/checks.js` (`V7-5`)

**Interfaces:**
- Tạo ra:
  - `SFX.busMeter(): { sfx: number, music: number }` — RMS tức thời (biên độ 0–1) đo SAU `sfxGain` và SAU `musicLP`; trả `{ sfx: 0, music: 0 }` khi chưa có `ctx`.
  - `CFG.audio.mix = { lo: -9, hi: 0 }` — khoảng cho phép của (hiệu ứng − nhạc), tính bằng dB trên trung vị RMS.
  - `window.mixProbe(sec = 8): Promise<{ sfxDb, musicDb, diff }>` trong `tools/checks.js` — dựng cảnh chuẩn (4 vũ khí cấp 4, 150 `skeleton`, máu 1e6), để khung hình THẬT chạy `sec` giây, lấy mẫu `busMeter()` mỗi 100 ms, trả trung vị quy ra dB.

- [ ] **Bước 1: Viết tiêu chí trượt `V7-5`:**

```js
{ // ---- V7-5 (B1): mức phối hiệu ứng so với nhạc ----
  const m = await mixProbe(8), M = CFG.audio.mix;
  ok('V7-5', '5.1 Cảnh chuẩn 150 quái, thanh trượt mặc định: hiệu ứng nhỏ hơn hoặc bằng nhạc và không nhỏ hơn quá 9 dB',
    m.diff <= M.hi && m.diff >= M.lo, `hiệu ứng ${m.sfxDb.toFixed(1)} dB, nhạc ${m.musicDb.toFixed(1)} dB, chênh ${m.diff.toFixed(1)} dB`);
}
```

  Đặt `SETTINGS.sfxVol = 0.8`, `SETTINGS.musicVol = 0.6` (mặc định) trong lúc đo rồi trả lại giá trị cũ.

- [ ] **Bước 2: Chạy `runChecks()`.** Mong đợi: lỗi `mixProbe is not defined`.
- [ ] **Bước 3: Viết `SFX.busMeter` và `mixProbe`** theo chữ ký trên. `AnalyserNode` dùng `fftSize = 2048`, đọc bằng `getFloatTimeDomainData`.
- [ ] **Bước 4: Chạy `mixProbe(8)` ba lần, ghi 3 số `diff`.** Nếu trung vị nằm ngoài `[-9, 0]`: chỉnh `CFG.audio.sfxTrim` (mỗi lần ×0,85 hoặc ×1,15) và đo lại; nếu riêng tiếng trúng/hạ quái lấn át thì hạ `roleDb.frequent` từng 1 dB. Không đụng `roleDb.danger`.
- [ ] **Bước 5: Chạy `runChecks()`.** Mong đợi: `V7-5` đạt; `V5-6` (đỉnh đầu ra < 1, thứ tự vai) vẫn đạt.
- [ ] **Bước 6: Commit.** Ghi 3 số đo vào `QA_KET_QUA.md`. `git commit -am "V7 B1: đo âm lượng theo bus, đặt mức phối hiệu ứng so với nhạc"`

---

### Task B2: "Độ căng" điều khiển nhạc + tiếng nền đêm

**Files:**
- Sửa: `js/data.js` (`CFG.audio.intensity`, `CFG.audio.amb`)
- Sửa: `js/audio.js` (`updateIntensity`, `startAmbience`, sửa `sync` và `applyVolumes`)
- Kiểm: `tools/checks.js` (`V7-6`)

**Interfaces:**
- Dùng: `SFX.musicLP`, `SFX.musicGain`, `SFX.master`, `SFX.applyVolumes()`, `SFX.ducked`, `SFX.lowMix` (có sẵn).
- Tạo ra:
  - `CFG.audio.intensity = { full: 120, boss: 0.4, low: 0.2, up: 1.5, down: 4, lpCalm: 4500, gainCalm: 0.8 }` — `full`: số quái ứng với 0,6 điểm; `up`/`down`: hằng số thời gian lên/xuống (giây).
  - `CFG.audio.amb = { vol: 0.12, f: [420, 520, 380, 300], q: 0.6, lfo: 0.1, fall: 0.7 }` — tần số lọc theo đợt 1–4 (vô tận dùng của đợt 4); `fall`: phần tiếng nền bị bớt khi độ căng = 1.
  - `SFX.intensity: number` (0–1).
  - `SFX.intensityTarget(): number` — `clamp(0.6 × min(1, số quái / full) + (có boss sống ? boss : 0) + (máu thấp ? low : 0), 0, 1)`; trả 0 khi `G.state !== 'play'`.
  - `SFX.updateIntensity(dt: number): number` — kéo `intensity` về đích theo `1 − exp(−dt / τ)`, `τ = up` khi đang tăng, `down` khi đang giảm; trả giá trị mới. Không đụng node âm thanh (để thử được không cần `ctx`).
  - `SFX.startAmbience(): void` — gọi một lần cuối `SFX.init`; tạo bộ đệm nhiễu hồng 4 giây (lặp), lọc `bandpass`, một LFO `lfo` Hz rung âm lượng ±30%, nối `ambGain → master`. Không tải file.
  - `SFX.ambGain: GainNode`.
- Ánh xạ trong `applyVolumes` (ưu tiên từ trên xuống): đang tạm dừng/chọn thẻ → như cũ (`lpPause`); máu thấp → như cũ (`lpLow`); còn lại → tần số lọc = `lpCalm + (lpOpen − lpCalm) × intensity²`, âm lượng nhạc × `gainCalm + (1 − gainCalm) × intensity`. Tiếng nền = `amb.vol × musicVol × (1 − fall × intensity)`, × 0,5 khi tạm dừng.

- [ ] **Bước 1: Viết tiêu chí trượt `V7-6`:**

```js
{ // ---- V7-6 (B2): độ căng + tiếng nền ----
  const I = CFG.audio.intensity, step = (sec, n = 20) => { for (let i = 0; i < n; i++) SFX.updateIntensity(sec / n); return SFX.intensity; };
  fresh(); G.enemies.clear(); SFX.intensity = 0; const calm0 = step(3);
  v.spawn(150, 'skeleton'); v.spawnBoss('bossOgre'); G.cine = null; const hot = step(6);
  G.enemies.clear(); G.boss = null; const hold = step(1), cool = step(14);
  G.state = 'menu'; const menuT = SFX.intensityTarget(); G.state = 'play';
  // đo node thật: giữ đúng hoàn cảnh để sync() trong khung hình không kéo intensity đi chỗ khác
  v.spawn(150, 'skeleton'); v.spawnBoss('bossOgre'); G.cine = null; SFX.intensity = 1; SFX.applyVolumes(); await wait(600);
  const lpHot = SFX.musicLP.frequency.value, ambHot = SFX.ambGain.gain.value;
  G.enemies.clear(); G.boss = null; SFX.intensity = 0; SFX.applyVolumes(); await wait(600);
  const lpCalm = SFX.musicLP.frequency.value, ambCalm = SFX.ambGain.gain.value;
  ok('V7-6', '6.1 Độ căng: không quái ≈ 0; 150 quái + boss sau 6 giây > 0,9; hết quái 1 giây vẫn > 0,6 (xuống chậm), 15 giây về < 0,1; nhạc mở lọc khi căng; tiếng nền to khi yên, nhỏ khi căng',
    calm0 < 0.05 && hot > 0.9 && hold > 0.6 && cool < 0.1 && menuT === 0 && lpCalm < I.lpCalm * 1.3 && lpHot > 15000 && ambCalm > ambHot && ambHot > 0,
    `yên ${calm0.toFixed(2)}, căng ${hot.toFixed(2)}, giữ ${hold.toFixed(2)}, nguội ${cool.toFixed(2)}, lọc ${Math.round(lpCalm)} → ${Math.round(lpHot)} Hz, nền ${ambCalm.toFixed(3)} / ${ambHot.toFixed(3)}`);
}
```

- [ ] **Bước 2: Chạy `runChecks()`.** Mong đợi: lỗi `SFX.updateIntensity is not a function`.
- [ ] **Bước 3: Thêm 2 khối cấu hình** vào `CFG.audio`.
- [ ] **Bước 4: Viết `intensityTarget`, `updateIntensity`.** Trong `sync()`: tính `dt` từ `ctx.currentTime` giữa hai lần gọi (kẹp ≤ 0,25), gọi `updateIntensity(dt)`; gọi `applyVolumes()` khi `intensity` lệch ≥ 0,02 so với lần áp gần nhất (không gọi mỗi khung).
- [ ] **Bước 5: Viết `startAmbience`** và phần ánh xạ trong `applyVolumes`. Đổi tần số lọc tiếng nền theo `waveIdx()` trong `sync()` khi đợt đổi. Tắt tiếng (`SFX.muted`) thì tiếng nền im theo `master`.
- [ ] **Bước 6: Chạy `runChecks()`.** Mong đợi: `V7-6` đạt; `V5-6` vẫn đạt (xoá hết `SFX.bufs` vẫn không lỗi).
- [ ] **Bước 7: Commit.** `git commit -am "V7 B2: độ căng điều khiển nhạc, tiếng nền đêm tổng hợp"`

---

### Task B3: Âm nhỏ dần và bị bỏ theo khoảng cách

**Files:**
- Sửa: `js/data.js` (`CFG.audio.dist`)
- Sửa: `js/audio.js` (`SFX.distGain`, `SFX.play`)
- Sửa: `js/game.js` (các lời gọi `SFX.play(..., { x: … })` gắn với một vị trí: thêm `y`)
- Kiểm: `tools/checks.js` (`V7-7`)

**Interfaces:**
- Tạo ra:
  - `CFG.audio.dist = { near: 140, far: 420, min: 0.15 }` — trong `near` đơn vị: nguyên âm lượng; tới `far`: còn `min`; quá `far`: không phát.
  - `SFX.distGain(x: number, y: number): number` — khoảng cách tới `G.player`; trả 1 khi ≤ `near`, 0 khi > `far`, giữa hai mốc giảm theo bình phương từ 1 xuống `min`. Thiếu `y` hoặc chưa có người chơi → 1.
  - `SFX.play(name, { rate, x, y, tier })` — có `y` thì nhân âm lượng với `distGain(x, y)`; bằng 0 thì thoát TRƯỚC khi xin giọng. Âm có `duck: true` hoặc thuộc `SYNTH_PRI` (boss, lên cấp, bị thương…) không bị giảm.

- [ ] **Bước 1: Viết tiêu chí trượt `V7-7`:**

```js
{ // ---- V7-7 (B3): âm theo khoảng cách ----
  fresh(); const D = CFG.audio.dist, p = P();
  const g0 = SFX.distGain(p.x + 50, p.y), g1 = SFX.distGain(p.x + (D.near + D.far) / 2, p.y), g2 = SFX.distGain(p.x + D.far + 50, p.y), g3 = SFX.distGain(p.x + 50);
  await wait(300); const nv = () => (SFX.voices.kill || []).length, v0 = nv(); SFX.play('kill', { x: p.x + D.far + 200, y: p.y }); const culled = nv() === v0;
  SFX.play('kill', { x: p.x + 30, y: p.y }); const played = nv() === v0 + 1;
  ok('V7-7', '7.1 Âm ở gần nguyên âm lượng, ở giữa nhỏ dần, quá 420 đơn vị không phát và không chiếm giọng; thiếu y thì như cũ',
    g0 === 1 && g1 > D.min && g1 < 1 && g2 === 0 && g3 === 1 && culled && played, `gần ${g0}, giữa ${g1.toFixed(2)}, xa ${g2}, bỏ ${culled}, phát ${played}`);
}
```

  (`SFX.voices` là object: tên âm → mảng giọng đang phát.)

- [ ] **Bước 2: Chạy `runChecks()`.** Mong đợi: lỗi `SFX.distGain is not a function`.
- [ ] **Bước 3: Viết `distGain`, sửa `play`** theo Interfaces.
- [ ] **Bước 4: Thêm `y`** vào các lời gọi trong `js/game.js` có `x:` lấy từ một quái, vùng nổ hay vật phẩm (tìm bằng `grep -n "SFX.play(.*x:" js/game.js`). Lời gọi dùng vị trí người chơi thì để nguyên.
- [ ] **Bước 5: Chạy `runChecks()`.** Mong đợi: `V7-7` đạt; `V7-5` vẫn trong khoảng (ít âm xa hơn có thể làm `diff` giảm — nếu rơi dưới −9 dB thì nâng `sfxTrim` một nấc).
- [ ] **Bước 6: Commit.** `git commit -am "V7 B3: âm nhỏ dần và bị bỏ theo khoảng cách"`

---

### Task B4: Âm phản hồi còn thiếu + im hẳn khi ẩn tab

Sửa Q-033 (lướt lúc chưa hồi, đổi thẻ hết lượt, mua thiếu linh hồn, mở tạm dừng đều im lặng) và Q-032 (ẩn tab nhạc vẫn chạy).

**Files:**
- Sửa: `js/audio.js` (`SFX.defs.deny`, `SFX.defs.pauseIn`; xử lý `visibilitychange`)
- Sửa: `js/game.js` (`tryDash`), `js/ui-cards.js` (`reroll`), `js/ui-menu.js` (`buyMeta`), `js/ui.js` (`togglePause`), `js/input.js` (`padFocus`)
- Kiểm: `tools/checks.js` (`V7-8`)

**Interfaces:**
- Tạo ra (đều là âm tổng hợp, không cần file):
  - `'deny'` — hai nốt đi xuống ngắn (220 → 160 Hz, 0,09 giây), vai `ui`, `gap: 0.25`.
  - `'pauseIn'` — một nốt trầm mềm (330 Hz, 0,12 giây), vai `ui`.
  - `padFocus` phát `'hover'` mỗi lần focus thật sự đổi phần tử.
- Ẩn tab: `document.hidden` → `SFX.ctx.suspend()`; hiện lại → `SFX.ctx.resume()`. Hiện nay ẩn tab chỉ làm game tự tạm dừng (`js/ui.js`), nhạc vẫn chạy ở mức tạm dừng (60% + lọc 650 Hz); giữ nguyên phần tạm dừng đó.

- [ ] **Bước 1: Viết tiêu chí trượt `V7-8`:**

```js
{ // ---- V7-8 (B4): âm phản hồi còn thiếu + ẩn tab ----
  const heard = [], op = SFX.play; SFX.play = function (n, o) { heard.push(n); return op.call(this, n, o); };
  const cnt = n => heard.filter(x => x === n).length;
  fresh(); tryDash(); tryDash(); const dashDeny = cnt('deny') === 1;
  G.pending = 1; openLevelUp(); G.rerolls = 0; reroll(); const rrDeny = cnt('deny') === 2;
  show('levelup', false); G.state = 'play'; G.pending = 0;
  META.souls = 0; buyMeta(META_UPGRADES[0].id); const buyDeny = cnt('deny') === 3;
  togglePause(); const pIn = cnt('pauseIn') === 1; togglePause();
  SFX.play = op;
  Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); await wait(250);
  const susp = SFX.ctx.state === 'suspended';
  delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); await wait(250);
  if (G.state === 'paused') togglePause();                       // ui.js tự tạm dừng khi tab ẩn
  const back = SFX.ctx.state === 'running', oneTrack = !!SFX.trackNode;
  ok('V7-8', '8.1 Lướt lúc chưa hồi, đổi thẻ hết lượt, mua thiếu linh hồn đều có tiếng báo; mở tạm dừng có tiếng; ẩn tab thì âm thanh dừng hẳn, hiện lại chạy tiếp đúng một bản nhạc',
    dashDeny && rrDeny && buyDeny && pIn && susp && back && oneTrack, `lướt ${dashDeny}, đổi thẻ ${rrDeny}, mua ${buyDeny}, dừng ${pIn}, ẩn ${susp}, hiện ${back}`);
}
```

  (Tiêu chí đếm số LẦN GỌI `SFX.play('deny')`, không phụ thuộc `gap`. Khi chạy kiểm trong pane, người chạy thường gắn tay một bộ chặn `visibilitychange` ở pha capture để game không tự tạm dừng; bộ lắng nghe mới của `audio.js` đăng ký trên `document` ở pha capture ngay lúc tải file nên chạy trước bộ chặn đó.)

- [ ] **Bước 2: Chạy `runChecks()`.** Mong đợi: `V7-8` trượt (không có âm `deny`).
- [ ] **Bước 3: Thêm 2 âm tổng hợp** vào `SFX.defs`; nối 4 lời gọi `SFX.play('deny')` / `SFX.play('pauseIn')` vào đúng nhánh "không làm được" của `tryDash`, `reroll`, `buyMeta` và nhánh mở của `togglePause`; `padFocus` phát `'hover'`.
- [ ] **Bước 4: Treo/tiếp tục `AudioContext`** theo `document.hidden` (bộ lắng nghe `visibilitychange` trên `document`, pha capture, đăng ký lúc tải `audio.js`; chưa có `ctx` thì bỏ qua).
- [ ] **Bước 5: Chạy `runChecks()`.** Mong đợi: `V7-8` đạt.
- [ ] **Bước 6: Commit.** `git commit -am "V7 B4: âm báo khi không làm được, tiếng mở tạm dừng, ẩn tab thì im hẳn"`

---

### Task B5: Điểm nối vòng lặp nhạc + nhạc theo giai đoạn ván (CẦN NGƯỜI DÙNG DUYỆT TẢI FILE)

Phần code làm được ngay và có ích cả khi không tải gì. Phần tải file chỉ làm sau khi người dùng đồng ý.

**Files:**
- Tạo: `tools/loop-seam.js`
- Sửa: `js/audio.js` (`MUSIC`, `SFX.wantTrack`, dùng `snapLoop` sau `trimSilence`)
- Sửa (sau khi được duyệt): `assets/music/`, `CREDITS.md`
- Kiểm: `tools/checks.js` (`V7-9`)

**Interfaces:**
- Tạo ra:
  - `snapLoop(data: Float32Array, sampleRate: number, start: number, end: number): { start: number, end: number }` — nhận và trả giây. Trong ±20 ms quanh mỗi điểm, tìm chỗ tín hiệu đi qua 0 theo chiều đi lên gần nhất; không tìm thấy thì giữ nguyên. File này nạp được cả trong trang game (gán `window.snapLoop`).
  - `MUSIC` thêm 3 khoá, file có thì dùng, thiếu thì bỏ qua: `title: { src: 'assets/music/title.ogg', vol: 0.5 }`, `late: { src: 'assets/music/level2.ogg', vol: 0.55 }`, `win: { src: 'assets/music/ending.ogg', vol: 0.55 }`.
  - `SFX.wantTrack(): string|null` — menu → `'title'`; màn kết thúc thắng → `'win'`, thua → `null`; có boss sống → `'boss'`; đợt ≥ 3 (chỉ số ≥ 2, gồm cả vô tận) → `'late'`; còn lại `'normal'`. Khoá được chọn mà `SFX.music[khoá]` chưa có thì lùi: `late` → `normal`, `title`/`win` → `null`.

- [ ] **Bước 1: Viết tiêu chí trượt `V7-9`:**

```js
{ // ---- V7-9 (B5): điểm nối vòng lặp + chọn nhạc theo giai đoạn ----
  const sr = 8000, d = new Float32Array(sr * 2); for (let i = 0; i < d.length; i++) d[i] = Math.sin(2 * Math.PI * 50 * i / sr);
  const s = snapLoop(d, sr, 0.5037, 1.5061), at = t => d[Math.round(t * sr)], up = t => d[Math.round(t * sr) + 1] > d[Math.round(t * sr)];
  const snapped = Math.abs(at(s.start)) < 0.05 && Math.abs(at(s.end)) < 0.05 && up(s.start) && up(s.end) && Math.abs(s.start - 0.5037) <= 0.02 && Math.abs(s.end - 1.5061) <= 0.02;
  const flat = snapLoop(new Float32Array(sr), sr, 0.2, 0.6), kept = flat.start === 0.2 && flat.end === 0.6;
  const mu = SFX.music, fake = { buf: 1 }; SFX.music = { normal: fake, boss: fake, late: fake, title: fake, win: fake };
  fresh(); const a = SFX.wantTrack(); v.skipTo(2); const b = SFX.wantTrack(); v.spawnBoss('bossOgre'); G.cine = null; const c = SFX.wantTrack();
  G.enemies.clear(); G.boss = null; G.state = 'menu'; const m = SFX.wantTrack(); G.state = 'over'; G.won = true; const w = SFX.wantTrack(); G.won = false; const l = SFX.wantTrack();
  SFX.music = { normal: fake, boss: fake }; G.state = 'play'; const fb = SFX.wantTrack(); G.state = 'menu'; const fm = SFX.wantTrack(); G.state = 'play';
  SFX.music = mu;
  ok('V7-9', '9.1 Điểm nối vòng lặp dời về chỗ tín hiệu qua 0 (≤ 20 ms), tín hiệu phẳng thì giữ nguyên; nhạc: đợt 1–2 thường, đợt 3+ bản sau, boss, menu, thắng; thiếu file thì lùi về bản đang có',
    snapped && kept && a === 'normal' && b === 'late' && c === 'boss' && m === 'title' && w === 'win' && l === null && fb === 'normal' && fm === null,
    `nối ${snapped}/${kept}; ${a}, ${b}, ${c}, ${m}, ${w}, ${l}; thiếu file: ${fb}, ${fm}`);
}
```

- [ ] **Bước 2: Chạy `runChecks()`.** Mong đợi: lỗi `snapLoop is not defined`.
- [ ] **Bước 3: Viết `tools/loop-seam.js`** (`snapLoop`) và nạp nó trong `checks.js` trước khi chạy `V7-9`. Chép hàm `snapLoop` vào `js/audio.js` cạnh `trimSilence` (game không nạp file trong `tools/`), gọi nó trên kết quả `trimSilence` cho mọi bản nhạc.
- [ ] **Bước 4: Thêm 3 khoá `MUSIC`, viết `SFX.wantTrack`**, thay biểu thức `want` trong `sync()` bằng `this.wantTrack()`. `loadFiles` đã bắt lỗi từng file nên thiếu file không ném lỗi.
- [ ] **Bước 5: Chạy `runChecks()`.** Mong đợi: `V7-9` đạt. Game lúc này vẫn chỉ phát 2 bản cũ.
- [ ] **Bước 6: Commit phần code.** `git commit -am "V7 B5: dời điểm nối vòng lặp nhạc, chọn nhạc theo giai đoạn ván (chưa thêm file)"`
- [ ] **Bước 7: HỎI NGƯỜI DÙNG trước khi tải.** Nội dung hỏi: tải gói "5 Chiptunes (Action)" của Juhani Junkala từ https://opengameart.org/content/5-chiptunes-action (CC0 — đúng gói đang dùng cho `level1`/`level3`), lấy thêm 3 bản "Title Screen", "Level 2", "Ending"; báo dung lượng thật của file tải (đọc trên trang trước khi hỏi). Không đồng ý → dừng task ở đây, ghi "chưa thêm nhạc" vào `QA_KET_QUA.md`.
- [ ] **Bước 8 (chỉ khi được duyệt): Thêm file.** Giải nén vào thư mục trống `vendor/audio/junkala-chiptunes/`. Máy chưa có ffmpeg nên dùng thẳng bản `.ogg` trong gói (nếu gói chỉ có `.wav`: hỏi người dùng có cho cài ffmpeg không, đừng tự cài). Chép thành `assets/music/title.ogg`, `level2.ogg`, `ending.ogg`; ghi 3 dòng vào `CREDITS.md` dưới mục nhạc sẵn có. Tải lại trang, vào menu → nghe được nhạc tiêu đề; `__vs.skipTo(2)` → đổi sang `level2`. Commit: `git add assets/music CREDITS.md && git commit -m "V7 B5: thêm nhạc tiêu đề, đợt 3+, chiến thắng (Juhani Junkala, CC0)"`

---

### Task 10: Nghiệm thu chung và bàn giao

**Files:** `CLAUDE.md`, `QA_KET_QUA.md`, `README.md`.

- [ ] **Bước 1: `runChecks()` toàn bộ.** Mong đợi: 73/73 (64 + `V7-1` … `V7-9`) ở 1280×720.
- [ ] **Bước 2: Đo hiệu năng cuối** như A1 bước 9, với mọi thứ của V7 bật. Ghi trung vị `render()` trước/sau vào `QA_KET_QUA.md`. Vượt ngân sách 1,0 ms: tắt đèn của ngọc trước, rồi tới đèn của đạn.
- [ ] **Bước 3: `auditAll()`** ở 1280×720 và 375×812 — `#optBox` có thêm 1 ô + 1 thanh trượt, phải không tràn và mọi nút ≥ 44 px.
- [ ] **Bước 4: Chạy 5 ván bot** (`runBot()`), so tỉ lệ qua boss 1/2/3 với số sau C3 (20/20, 20/20, 14/20). V7 không đổi cân bằng: lệch quá 2 ván trên 5 ở boss 1 hoặc 2 là có lỗi logic lọt vào — tìm trước khi bàn giao.
- [ ] **Bước 5: Cập nhật `CLAUDE.md`** (≤ 10 dòng): `CFG.light` + `drawLights` + tự tắt; luật màu; `e.pop` + `CFG.dmgNum`; `SETTINGS.fxAlpha`; `busMeter` + `CFG.audio.mix`; `SFX.intensity` + tiếng nền; `distGain`; `wantTrack`; số tiêu chí 73.
- [ ] **Bước 6: Commit.** `git commit -am "V7: nghiệm thu chung, cập nhật tài liệu"`
- [ ] **Bước 7: Bàn giao cho người dùng** kèm phiếu dưới đây. Chưa push.

## Phiếu nghe/nhìn cho người thật (10 phút, sau Task 10)

Code không chấm được các mục này. Chơi 2 ván có loa, mỗi mục cho điểm 1–5, ghi một dòng nếu ≤ 3.

| # | Mục | Điểm |
|---|---|---|
| 1 | Ánh sáng đêm: có hợp tên game không, quái ở mép màn còn thấy rõ không | |
| 2 | Giữa đám đông có lúc nào mất dấu nhân vật không | |
| 3 | Vùng đỏ nguy hiểm có lẫn với hiệu ứng vũ khí không | |
| 4 | Hiệu ứng so với nhạc: vừa / hiệu ứng vẫn to / nhạc to quá | |
| 5 | Nhạc "mở ra" khi đông quái, lắng lại khi vắng — có nhận ra không, có khó chịu không | |
| 6 | Tiếng nền đêm: có thêm không khí hay chỉ là tiếng rè | |
| 7 | Chỗ nhạc lặp lại có nghe tiếng lách tách không | |
| 8 | Máy có nóng/giật hơn trước V7 không (bấm `F` xem "khung dài nhất") | |

Việc còn lại ngoài V7: C7 của `KE_HOACH_QA.md` (nghe duyệt từng âm trên `tools/sfx-audition.html`) vẫn chờ người dùng.
