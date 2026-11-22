# KE_HOACH_V8 — Nâng cấp đồ hoạ "Nightfall: Survival" (sau V7)

> **Cho người/agent thực hiện:** BẮT BUỘC dùng skill `superpowers:subagent-driven-development` (khuyên dùng) hoặc `superpowers:executing-plans` để làm từng task. Các bước dùng ô `- [ ]` để theo dõi.

**Mục tiêu:** Sau V7 game đã có đêm tối và ánh sáng. Ở V8 cần: (1) quái vẫn đọc được trong bóng tối, (2) hạ hàng loạt không làm trắng xoá màn hình, (3) thế giới có sức sống (nguồn sáng, dấu vết, thời tiết), (4) nhân vật "có lực" hơn khi di chuyển. Không thêm thư viện, không cần asset mới.

**Kiến trúc:** Mọi thay đổi nằm ở lớp vẽ (`render.js`), cộng vài dòng gắn sự kiện trong `game.js` (quái chết, lướt, bị đánh). Số mới đặt trong `CFG.*` (`data.js`). Thứ gì cũng có đường lùi: `calm()` (giảm loé / reduced-motion), `SETTINGS.clear` (Dễ nhìn), `lightOn()` tắt thì game trông như V7.

**Công nghệ:** JS thuần (script thường), Canvas 2D. Kiểm bằng `tools/checks.js` → `runChecks()`.

**Spec:** phần "Hiện trạng và quyết định" dưới đây. Nhận xét lấy từ 2 ảnh chụp ngày 22/11/2026 (đợt 3, 60 golem, nova cấp 8 + lôi phạt cấp 6 + vòng kiếm cấp 5, cổng 8766).

## Hiện trạng và quyết định

| # | Thấy gì trên ảnh / trong code | Quyết định V8 | Task |
|---|---|---|---|
| 1 | Golem xanh sẫm trên nền nâu tối, ngoài bán kính đèn nhân vật (150) gần như chìm vào nền. Lightmap tô đều `ambient`, quái không có nguồn sáng nào | Đo tương phản quái/nền thành số; nâng sàn sáng + vẽ "ánh trăng" (bóng trắng mờ của sprite) cho quái gần nhất sau lớp đèn | G1 |
| 2 | Nova hạ ~60 quái cùng lúc: mỗi xác nháy trắng 0.75 suốt nửa đầu `'die'` (`drawFx`) → cả màn loá trắng. Thêm ~40 số "33" giống nhau (`CFG.dmgNum.max` 60) | Giới hạn số xác được nháy trắng mỗi khung; xác còn lại tối dần về màu nền. Khi đông, gộp số sát thương bằng nhau ở gần nhau | G2 |
| 3 | Nền là tấm lặp, ánh sáng chỉ đi theo người chơi / đạn / boss → di chuyển đâu cũng như nhau | Nguồn sáng cố định trên thế giới (nến mộ, lò tử linh, khe dung nham, đống than) đặt theo lưới băm, lập loè nhẹ | G3 |
| 4 | Quái chết biến mất sạch; vết trên nền chỉ có cháy sém (sét) và nứt đất (sóng) | Vết loang mờ theo màu quái, tự tan sau vài giây, có giới hạn riêng để không đẩy vết sét/sóng ra | G4 |
| 5 | Lớp không khí duy nhất là bụi `drawMotes` (36 hạt vuông) | Sương / bụi / tro theo đợt, vẽ sẵn, cuộn chậm, tắt khi Dễ nhìn | G5 |
| 6 | Nhân vật không co giãn: `draw()` loại trừ `player` khỏi `e.pop`; lướt chỉ có 3 bóng mờ | Bóp-giãn khi lướt, bị đánh, lên cấp; tắt khi `calm()` | G6 |

Đã có sẵn, KHÔNG làm lại: lightmap + tự tắt (`drawLights`/`lightTick`), viền sprite (`sheetFor`), bóng mềm, quầng sáng `drawGlows`, vết `addDecal`/`drawDecals`, nảy trúng đòn `CFG.juice`, tỉa số sát thương `CFG.dmgNum`, thanh độ đậm hiệu ứng `SETTINGS.fxAlpha`, vòng sáng nhân vật `CFG.playerRing`.

Cố ý KHÔNG làm: bloom / `ctx.filter` (tốn, đã loại ở V7); vẽ lại sprite hoặc tải atlas mới; đổ bóng theo nguồn sáng (mỗi quái 1 bóng cho mỗi đèn — quá đắt với 300 quái); đổi màu vùng nguy hiểm.

## Ràng buộc chung

- Chữ trong game, chú thích code, tài liệu: tiếng Việt.
- Không thêm thư viện, không bước build, không tải file. Thứ tự nạp script trong `index.html` giữ nguyên.
- Không sửa tay `js/atlas.js`, `js/fx-atlas.js`.
- **Luật màu V7 (A2):** mọi màu sáng mới (đèn, sương, vết) lệch sắc độ ≥ 35° so với đỏ nguy hiểm `CFG.light.zoneCol` (`#ff5040`). G3 có phép thử cho điều này.
- Mỗi task: `runChecks()` không giảm số đạt, thêm đúng 1 tiêu chí `V8-n` (73 → 79), đổi `window.VER` trong `index.html` (`v8a`, `v8b`, …).
- **Ngân sách hiệu năng:** 300 quái + 6 vũ khí cấp 8, trung vị 120 lần `render(1)`: mỗi task tăng ≤ 0,6 ms, cả V8 ≤ 2,0 ms so với Task 0; khung dài nhất < 33 ms. Vượt thì dùng nút giảm ghi trong từng task trước khi tính tiếp.
- Commit sau mỗi task, tác giả là tài khoản git của người dùng, KHÔNG thêm dòng `Co-Authored-By`. Không push (push `main` là deploy Vercel) trừ khi người dùng bảo.
- Mọi số mới nằm trong `js/data.js`, không rải số trong `render.js`.

**Cách chạy kiểm** (như V7): `preview_start` cấu hình `nightfall-survival-8766`, khung 1280×720, `show_pane('preview')` (pane ẩn thì rAF dừng). Nạp `tools/checks.js?v=<Date.now()>` bằng thẻ `<script>`, bấm `#startBtn`, gọi `runChecks()` qua `setTimeout` rồi đọc `window.__rc` (mỗi lệnh JS trong pane tối đa 45 giây).

**Đoạn đo hiệu năng dùng chung** (gọi là `perf()` ở các task, dán vào console):

```js
async function perf(n = 120) {
  for (const id of ['bolt', 'orbit', 'lightning', 'knife', 'aura', 'nova']) __vs.give(id, 8);
  __vs.spawn(300, 'skeleton'); __vs.tick(2);
  const t = []; for (let i = 0; i < n; i++) { const a = performance.now(); render(1); t.push(performance.now() - a); }
  t.sort((a, b) => a - b); return +t[n >> 1].toFixed(2);
}
```

(Đủ 6 khoá của `WEAPONS` trong `data.js`.)

## Trọng tâm review

1. **Máy yếu:** mọi lớp mới (ánh trăng G1, đèn thế giới G3, sương G5) phải biến mất khi `light.failed` (tự tắt V7) hoặc khi người chơi tắt "Ánh sáng đêm" — không để lại cảnh tối không đèn (G1, G3, G5).
2. **Giảm loé / reduced-motion:** không lập loè (G3), không bóp-giãn (G6), xác không nháy trắng (G2).
3. **Dễ nhìn (`SETTINGS.clear`):** không có sương, vết xác mờ hơn (G4, G5).
4. **Vô tận (đợt ≥ 5):** mọi bảng theo đợt (`props`, `weather`) dùng `waveIdx()` nên phải có giá trị cho đợt 4 trở đi, không `undefined` (G3, G5).
5. **Menu (`renderAttract`):** cảnh menu dùng nền đợt 1; đèn/sương mới không được gọi `G.*` chưa khởi tạo (G3, G5).

---

## Cấu trúc file

| File | Đổi | Trách nhiệm |
|---|---|---|
| `js/data.js` | sửa | `CFG.rim`, `CFG.die`, `CFG.dmgNum.merge`, `CFG.props`, `WAVE_DEFS[i].props`, `CFG.remains`, `WAVE_DEFS[i].weather`, `CFG.weather`, `CFG.squash` |
| `js/render.js` | sửa | `drawRim` (G1), giới hạn nháy trong `drawFx` (G2), `propsOnCam`/`drawProps` (G3), ảnh vết `'stain'` trong `decalImg` (G4), `drawWeather` (G5), nhánh người chơi trong `draw` (G6) |
| `js/game.js` | sửa | gộp số trong `addDmgText` (G2), `addDecal('stain', …)` trong `killEnemy` (G4), đặt `p.sq` ở `tryDash`/`hurtPlayer`/lên cấp (G6) |
| `tools/checks.js` | sửa | `V8-1` … `V8-6` |
| `index.html` | sửa | `window.VER` |
| `CLAUDE.md` | sửa | dòng `KE_HOACH_V8.md` + trạng thái khi xong |

---

### Task 0: Mốc "trước V8"

- [x] **Bước 1:** `runChecks()` → ghi số đạt (mong đợi 73/73, V6-2/V6-3 cần pane hiện).
- [x] **Bước 2:** `perf()` 3 lần, ghi trung vị → **mốc ren** cho cả V8.
- [x] **Bước 3:** Chụp 4 ảnh mốc (mỗi đợt: `__vs.skipTo(i)`, `__vs.spawn(60, 'golem')`, `__vs.tick(1)`), cộng 1 ảnh "hạ hàng loạt" (đợt 3, 60 golem, `__vs.give('nova', 8)`, chờ 3 giây thật). Lưu vào `tools/shots/v8-before-*.png` (thư mục mới, KHÔNG nằm trong `.vercelignore` thì thêm vào).

**Kết quả Task 0** (22/11/2026, pane 1280×720, ZOOM 2): `runChecks()` 73/73 (lần chạy sau đó V7-5 — đo âm — chập chờn, không liên quan đồ hoạ). `perf()` 3 lần (máy thật, GPU): 1.3 / 1.2 / 1.1 ms → **mốc ren 1.2 ms** (độ phân giải `performance.now` 0.1 ms). Ảnh: `tools/shots/v8-before-wave1..4.png` + `v8-before-masskill.png` — lệch kế hoạch: `spawn(60) + tick(1)` để quái ngoài màn hình nên đặt 60 golem cố định quanh người chơi (100–280 đơn vị) bằng `spawnEnemy`, `tick(0.2)`; ảnh lấy từ `cv.toDataURL` (chỉ canvas, không có HUD). `tools/` đã nằm trong `.vercelignore` nên không cần thêm dòng.

---

### Task G1: Quái đọc được trong bóng tối

**Files:** `js/data.js`, `js/render.js` (`drawRim`, gọi trong `renderScene`), `tools/checks.js` (`V8-1`).

**Interfaces:**
- `CFG.rim = { max: 80, near: 90, far: 260, a: 0.22, floor: 0.12 }` — tối đa `max` quái gần nhất; trong `near` không vẽ (đèn nhân vật đã đủ), từ `near` → `far` độ đậm tăng dần tới `a`; `floor` cộng thêm vào `ambient` khi dựng lightmap (nâng sàn sáng chung).
- `drawRim(camX, camY): void` — vẽ `sh.white` (bóng trắng của sprite, có sẵn từ `sheetFor`) với `globalAlpha = a × k × fxAlpha`, kiểu `'source-over'`, cho các quái trong tầm nhìn ngoài `near`. Không vẽ cho boss / quái đang `inT`.

- [x] **Bước 1: Viết `V8-1` (trượt trước)** — đo tương phản bằng mặt nạ: vẽ 1 khung với quái, 1 khung không quái, lấy độ chênh độ sáng trung bình tại vị trí 20 con golem ở cách người chơi 200 đơn vị.

```js
{ // ---- V8-1 (G1): quái đọc được trong bóng tối ----
  const lumAt = (pts) => { let s = 0; for (const [x, y] of pts) { const d = ctx.getImageData(x - 2, y - 2, 4, 4).data; for (let i = 0; i < d.length; i += 4) s += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; } return s / (pts.length * 16); };
  fresh(); __vs.skipTo(2); G.enemies.clear(); G.gems.clear(); G.shake = 0; SETTINGS.light = true; light.failed = false;
  const ring = []; for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2; ring.push([P().x + Math.cos(a) * 200, P().y + Math.sin(a) * 200]); }
  const scr = ([x, y]) => [Math.round(cv.width / 2 + (x - P().x) * ZOOM * SCREEN), Math.round(cv.height / 2 + (y - P().y) * ZOOM * SCREEN)];
  render(1); const bg = lumAt(ring.map(scr));
  for (const [x, y] of ring) { const e = spawnEnemy('golem', x, y); e.vx = e.vy = 0; e.inT = 0; }
  render(1); const fg = lumAt(ring.map(scr));
  const contrast = Math.abs(fg - bg) / Math.max(1, bg);
  ok('V8-1', '1.1 Golem ở 200 đơn vị (ngoài đèn nhân vật) chênh độ sáng với nền ≥ 35% khi bật ánh sáng đêm',
    contrast >= 0.35, `nền ${bg.toFixed(1)}, quái ${fg.toFixed(1)}, chênh ${(contrast * 100).toFixed(0)}%`);
}
```

(`spawnEnemy(type, x, y)` trả về quái, `game.js` dòng 122. `cv`, `ZOOM`, `SCREEN` là biến có sẵn của `render.js`.)

- [x] **Bước 2:** Chạy → ghi số chênh hiện tại (mong đợi trượt, khoảng 10–25%). **Nếu đã ≥ 35%** thì báo người dùng và hỏi có cần G1 không trước khi làm tiếp.
  - **Kết quả bước 2:** V8-1 ĐÃ ĐẠT khi chưa sửa gì: nền 12.0, quái 17.6–18.2, chênh 47–52% (4 lần đo). Lưu ý: nền rất tối nên tỉ lệ tương đối phóng đại — chênh tuyệt đối chỉ ≈ 6/255. Theo kế hoạch: DỪNG, chờ người dùng quyết có làm G1 không (hoặc đổi thước đo, vd. chênh tuyệt đối). V8-1 đã thêm vào `tools/checks.js` (74 tiêu chí).
  - **Quyết định:** BỎ bước 3–7 của G1. Ảnh 1280×720 (`v8-before-wave3.png`) cho thấy golem ngoài đèn vẫn rõ dáng nhờ viền sprite Phase 1; ảnh 800×600 lúc lập kế hoạch bị thu nhỏ nên trông tối hơn thực tế. Giữ `V8-1` làm tiêu chí chống thụt lùi (các task sau không được làm quái chìm). Nếu người thật thấy quái khó nhìn (phiếu câu 1) thì làm lại G1 từ bước 3.
- [ ] **Bước 3:** Thêm `CFG.rim`. Trong `drawLights`, ngay sau khi tô `ambient`: tô thêm `rgba(255,255,255,floor)` kiểu `'lighter'` (nâng sàn sáng). Chạy lại, ghi số.
- [ ] **Bước 4:** Viết `drawRim`. Gom quái trong tầm nhìn vào mảng tạm (dùng lại `drawList` đã sắp theo Y của khung, lọc `!== p`), chọn `max` con gần nhất bằng khoảng cách bình phương (không sort toàn bộ khi > `max`: một vòng chọn ngưỡng là đủ — `shortcut: sort cả mảng khi ≤ 300 quái, đổi sang chọn k nhỏ nhất nếu perf vượt`). Với mỗi con: `sh = sheetFor(...)`, `q = sh.cells.get(fr)` y như `draw()` — tách đoạn lấy `sh/q/x/y/flip` trong `draw()` thành hàm `spriteRef(e, kind)` dùng chung, KHÔNG chép code.
- [ ] **Bước 5:** Gọi `if (lightOn()) drawRim(camX, camY);` ngay SAU `drawLights` (đã đặt lại transform thế giới). Tắt hẳn khi `!lightOn()` (không có bóng tối thì không cần).
- [ ] **Bước 6:** `runChecks()` → `V8-1` đạt, 74/74. `perf()` ≤ mốc + 0,6 ms. Vượt: hạ `CFG.rim.max` 80 → 40, đo lại.
- [ ] **Bước 7:** Chụp lại 4 ảnh đợt, đặt cạnh ảnh Task 0 gửi người dùng. Quái phải trông "ánh trăng chiếu", không như phát sáng; nếu giống phát sáng thì hạ `a` 0.22 → 0.15.
- [ ] **Bước 8:** VER `v8a`, commit `V8 G1: quái đọc được trong bóng tối (sàn sáng + ánh trăng)`.

---

### Task G2: Hạ hàng loạt không loá trắng, số sát thương gộp

**Files:** `js/data.js`, `js/render.js` (`drawFx` nhánh `'die'`, `buildNumAtlas`/`NUM_GLYPHS` thêm `×`), `js/game.js` (`addDmgText`), `tools/checks.js` (`V8-2`).

**Interfaces:**
- `CFG.die = { flashMax: 10, dark: 0.55 }` — mỗi khung tối đa `flashMax` xác được nháy trắng (ưu tiên xác mới nhất = `life` lớn nhất); xác còn lại không nháy, vẽ với `globalAlpha` × (1 − `dark`) (mờ hơn, chìm vào nền).
- `CFG.dmgNum.merge = { r: 28, busy: 12 }` — khi đang có ≥ `busy` số trên màn, số mới có cùng giá trị làm tròn với một số còn sống trong bán kính `r` thì cộng dồn vào số đó (`t.v += dmg`, `t.n = (t.n||1)+1`, hiện `"33×3"`), không tạo số mới.

- [x] **Bước 1: Viết `V8-2` (trượt trước):**

```js
{ // ---- V8-2 (G2): hạ hàng loạt không loá trắng ----
  const whiteShare = () => { const d = ctx.getImageData(0, 0, cv.width, cv.height).data; let w = 0; for (let i = 0; i < d.length; i += 64) if (d[i] > 235 && d[i + 1] > 235 && d[i + 2] > 235) w++; return w / (d.length / 64); };
  fresh(); __vs.skipTo(2); G.shake = 0; SETTINGS.dmgNum = true;
  __vs.spawn(60, 'golem'); for (const e of G.enemies.items) { e.x = P().x + rand(-150, 150); e.y = P().y + rand(-100, 100); e.inT = 0; }
  for (const e of [...G.enemies.items]) killEnemy(e);
  for (let i = 0; i < 3; i++) G.fx.items.forEach(f => f.life -= 0.02);   // vào nửa đầu thời gian 'die' (đang nháy)
  render(1); const ws = whiteShare();
  let nums = 0; for (let i = 0; i < 60; i++) addDmgText(G.enemies.items[0] || { x: P().x + (i % 6) * 4, y: P().y, r: 8 }, 33);
  for (const t of G.texts.items) if (t.num && !t.dead) nums++;
  ok('V8-2', '2.1 Hạ 60 quái cùng lúc: điểm ảnh trắng ≤ 4% màn; 60 đòn 33 sát nhau thành ≤ 15 số',
    ws <= 0.04 && nums <= 15, `trắng ${(ws * 100).toFixed(1)}%, số ${nums}`);
}
```

(`addDmgText(e, dmg)` ở `js/game.js` ~dòng 681; nhánh đầu hàm đã cộng dồn số vào `e.txt` của chính con quái đó — G2 chỉ thêm gộp giữa các quái khác nhau.)

- [x] **Bước 2:** Chạy → ghi % trắng và số đếm hiện tại.
- [x] **Bước 3:** Trong `drawFx`, trước vòng lặp: đếm xác `'die'` có `a > 0.55`; nếu > `flashMax` thì tìm ngưỡng `life` của xác thứ `flashMax` (mới nhất trước). Trong nhánh `'die'`: `dieProxy.flash = a > 0.55 && f.life >= ngưỡng ? 1 : 0`; xác không nháy: `ctx.globalAlpha = Math.min(1, a * 1.4) * (1 - CFG.die.dark)`. Boss (`f.kind` là boss) luôn được nháy.
- [x] **Bước 4:** Gộp số trong hàm thêm số sát thương: chỉ khi `live >= merge.busy`, duyệt số còn sống, cùng `Math.round(v/n)` và trong `r` → cộng dồn, đặt lại `life`/`pop`, `return`. Hiển thị `×n` trong `drawTexts` (atlas số `buildNumAtlas` có ký tự `×` không? Nếu không có thì thêm ký tự đó vào atlas số, KHÔNG dùng `fillText` mỗi khung).
- [x] **Bước 5:** `runChecks()` → 75/75; V7-3 (bớt số khi đông) vẫn đạt. `perf()` không đổi đáng kể.
- [x] **Bước 6:** Chụp lại ảnh "hạ hàng loạt" cạnh ảnh Task 0.
- [x] **Bước 7:** VER `v8b`, commit `V8 G2: giới hạn nháy trắng khi hạ hàng loạt, gộp số sát thương`.

**Kết quả G2** (22/11/2026, pane 1280×720 — pane bị ẩn nên rAF dừng): `runChecks()` 73/75 — chỉ trượt V6-3 (cần pane hiển thị, trượt y hệt trước khi sửa) và V7-5 (đo âm, chập chờn); V7-3 vẫn đạt (đỉnh 33 số). `V8-2` trước → sau: trắng 8.0% → 1.0%, số 60 → 12. Lệch kế hoạch: (1) ngưỡng "trắng" đổi từ 235 sang 170 mỗi kênh — lớp nháy phủ 0.75 lên golem sẫm chỉ ra ~200 nên ngưỡng 235 chỉ bắt chỗ 2 xác chồng nhau (đo bằng ngưỡng 235: 0.45% kể cả khi cả 60 xác nháy → tiêu chí vô nghĩa); (2) phép thử tắt ánh sáng đêm (trường hợp xấu nhất), dùng `spawnEnemy` + `killEnemy` thật, `life −= 0.06` để vào pha nháy, và 60 quái giả KHÁC nhau cho phần số (bản phác gọi lại cùng `G.enemies.items[0]` nên luôn gộp sẵn); (3) xác chết cùng khung có `life` bằng nhau → cắt theo số chỗ còn lại (`ties`), xác bị bớt nháy giữ cờ `f.dim` đến hết (không loé sáng lại khi qua nửa sau); người chơi + boss luôn nháy; `calm()` thì không xác nào nháy. Số gộp đặt `owner = null` để nhánh cộng dồn theo quái không ghi đè chữ `33×3`. `perf()` cùng phiên (máy chậm hơn lúc Task 0): trước 1.7/1.9/2.2 → sau 2.2/1.9/2.4 ms (trung vị 1.9 → 2.2, +0.3 ≤ 0.6). Ảnh: `tools/shots/v8-after-masskill.png` (cùng cảnh Task 0 rồi `killEnemy` cả 60 con, chụp ở pha nháy: 10 xác trắng, 50 xác mờ).

---

### Task G3: Nguồn sáng cố định trên thế giới

**Files:** `js/data.js`, `js/render.js` (`propsOnCam`, `drawProps`, thêm đèn trong `drawLights`), `tools/checks.js` (`V8-3`).

**Interfaces:**
- `CFG.props = { cell: 380, chance: 0.45, flick: 0.12, flickHz: 7, r: 95 }` — lưới thế giới ô `cell` đơn vị, mỗi ô có xác suất `chance` (theo `hash(cx, cy)`, cố định, không `Math.random`) chứa 1 nguồn sáng; bán kính đèn `r` × hệ số riêng; lập loè ±`flick` theo 2 sóng sin lệch pha từ hash.
- `WAVE_DEFS[i].props = { kind, col, k }`:
  - đợt 1 `{ kind: 'candle', col: '#ffcf7a', k: 0.8 }` (nến trên mộ)
  - đợt 2 `{ kind: 'brazier', col: '#b583ff', k: 1.0 }` (lò lửa tử linh)
  - đợt 3 `{ kind: 'vent', col: '#ffc04a', k: 1.1 }` (khe đất phát sáng)
  - đợt 4 `{ kind: 'pyre', col: '#ffd060', k: 1.2 }` (đống than)
  Màu đều lệch ≥ 35° sắc độ so với `#ff5040`.
- `propsOnCam(camX, camY, out): out` — trả danh sách `{x, y, h}` các ô trong tầm nhìn + lề `r`.
- `PROP_DRAW[kind](c, x, y, t)` — hình vẽ bằng code nhỏ (≤ 16×20 đơn vị), như `DECOR`, có ngọn lửa 2–3 điểm ảnh đổi khung theo `t`.

- [ ] **Bước 1: Viết `V8-3` (trượt trước):** (a) đi 2000 đơn vị theo một hướng, đếm số nguồn sáng thấy được ở mỗi 100 đơn vị: luôn ≥ 1 và ≤ 6; (b) cùng toạ độ gọi `propsOnCam` 2 lần ra cùng kết quả (cố định); (c) mọi `WAVE_DEFS[i].props.col` lệch sắc độ ≥ 35° so với `CFG.light.zoneCol`; (d) `light.n` khung có đèn thế giới vẫn ≤ `CFG.light.max`; (e) `calm()` đúng thì độ sáng đèn ở 2 thời điểm khác nhau bằng nhau (không lập loè).

```js
const hue = h => { const [r, g, b] = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255), M = Math.max(r, g, b), m = Math.min(r, g, b), d = M - m;
  if (!d) return 0; let x = M === r ? ((g - b) / d) % 6 : M === g ? (b - r) / d + 2 : (r - g) / d + 4; return (x * 60 + 360) % 360; };
const hdist = (a, b) => { const d = Math.abs(hue(a) - hue(b)); return Math.min(d, 360 - d); };
```

- [ ] **Bước 2:** Thêm cấu hình, `propsOnCam` (duyệt ô từ `floor((camX - r)/cell)` tới `floor((camX + VW + r)/cell)`, tương tự trục Y; vị trí trong ô = `cx*cell + h%(cell-60) + 30`).
- [ ] **Bước 3:** Trong `drawLights`, gom đèn thế giới SAU vùng nổ và TRƯỚC tinh anh (ưu tiên: người chơi → boss → vùng nổ → đèn thế giới → tinh anh → đạn). Độ đậm = `1 + flick × (sin(t·flickHz + h) + sin(t·flickHz·1.7 + h·3)) / 2`; `calm()` thì = 1.
- [ ] **Bước 4:** `drawProps` vẽ hình nguồn sáng ngay sau `drawDecals` (dưới quái, như đồ trang trí). Vẽ cả khi `!lightOn()` (vẫn là đồ trang trí), chỉ đèn là tắt.
- [ ] **Bước 5:** `renderAttract` (menu) gọi `drawProps` + đèn với đợt 1 — kiểm không đụng `G.player`/`G.enemies` chưa có.
- [ ] **Bước 6:** `runChecks()` → 76/76; V7-1 (độ tối góc màn 30–75%) vẫn đạt — nếu góc sáng quá vì có đèn, đặt người chơi ở toạ độ không có đèn trong phép thử V7-1, KHÔNG nới tiêu chí.
- [ ] **Bước 7:** `perf()` ≤ +0,6 ms (mỗi khung chỉ thêm ~4–9 đèn và hình). Chụp 4 ảnh đợt.
- [ ] **Bước 8:** VER `v8c`, commit `V8 G3: nguồn sáng cố định theo đợt (nến, lò tử linh, khe đất, đống than)`.

---

### Task G4: Dấu vết xác quái

**Files:** `js/data.js`, `js/game.js` (`killEnemy`, `addDecal`), `js/render.js` (`decalImg` kiểu `'stain'`, `drawDecals`), `tools/checks.js` (`V8-4`).

**Interfaces:**
- `CFG.remains = { cap: 50, chance: 0.4, life: 7, r: [9, 14], a: 0.55, aClear: 0.3 }`.
- `addDecal('stain', x, y, r, life)` thêm trường `d.col = ENEMIES[type].color`. Vết loại `'stain'` có giới hạn riêng `CFG.remains.cap` (đếm riêng; đầy thì bỏ vết `'stain'` cũ nhất, KHÔNG bỏ cháy sém/nứt đất). `CFG.decals.cap` vẫn áp cho 2 loại cũ.
- `decalImg('stain:' + col)` — loang dẹt 64×64 (vài hình elip chồng, màu quái tối đi 55%), lưu theo màu (≤ ~10 màu).

- [x] **Bước 1: Viết `V8-4` (trượt trước):** hạ 200 quái liên tiếp → số vết `'stain'` ≤ `cap`, vết sét đã có trước đó vẫn còn; `__vs.tick(CFG.remains.life + 1)` → hết vết `'stain'`; boss và thùng gỗ (`crate`) không để vết.
- [x] **Bước 2:** Viết phần game: trong `killEnemy`, sau `addFx('die', …)`, nếu `!e.boss && Math.random() < chance` thì `addDecal('stain', …)` với `r` ngẫu nhiên trong khoảng × `e.sc || 1`.
- [x] **Bước 3:** Phần vẽ: `drawDecals` đọc `d.col` để lấy ảnh; độ đậm × (`SETTINGS.clear ? aClear : a`).
- [x] **Bước 4:** `runChecks()` → 77/77, `perf()` ≤ +0,6 ms. Vượt: hạ `cap` 50 → 30.
- [x] **Bước 5:** VER `v8d`, commit `V8 G4: vết loang khi quái chết (giới hạn riêng, tự tan)`.

**Kết quả G4** (22/11/2026, pane 1280×720 hiện, G3 bỏ qua chờ người dùng nên đếm 75 → 76): `runChecks()` 76/76. `V8-4` trước → sau: `vết 0/undefined` (trượt) → `vết 50/50, sét còn true, boss+thùng 0, còn sau chờ 0`. Lệch kế hoạch: (1) phép thử đặt `CFG.remains.chance = 1` khi hạ 200 quái và thêm điều kiện "có vết" (`> 0`) — bản phác chỉ kiểm `≤ cap` nên đạt sẵn khi chưa làm gì; lúc chờ `life + 1` giây đặt `chance = 0` để quái do vũ khí hạ trong lúc `tick` không sinh vết mới; (2) `addDecal(kind, x, y, r, life, col)` đếm riêng 2 nhóm trong cùng `G.decals` (đầy nhóm nào bỏ vết cũ nhất của nhóm đó); V5-3 (giới hạn vết sét) nay chỉ đếm vết không phải `'stain'`; (3) vết đặt ở chân quái (`e.y + e.r·0.5`), ảnh 64×64 theo màu (`'stain:#rrggbb'`), `drawDecals` tính vùng cắt theo `img.width` nên dùng chung cho ảnh 256 cũ; độ tối `CFG.remains.dark` 0.55 nằm trong `data.js`. Vết tối + mờ (đỉnh ≈ 0.7 × 0.55) nên không cần kiểm luật màu V7. `perf()` cùng phiên, xen kẽ tắt/bật vết (`chance` 0 / 0.4): 1.2/1.1/1.0 → 1.2/1.2/1.1 ms (trung vị 1.1 → 1.2, +0.1); ép 50 vết: 1.2 ms.

---

### Task G5: Sương, bụi, tro theo đợt

**Files:** `js/data.js`, `js/render.js` (`fogImg`, `drawWeather`), `tools/checks.js` (`V8-5`).

**Interfaces:**
- `WAVE_DEFS[i].weather`:
  - đợt 1 `{ kind: 'fog', col: '#9fb0dc', a: 0.10 }`
  - đợt 2 `{ kind: 'fog', col: '#a58ad8', a: 0.10 }`
  - đợt 3 `{ kind: 'dust', col: '#b89a72', a: 0.08 }`
  - đợt 4 `{ kind: 'ash', col: '#ffb46a', a: 0.12 }`
- `CFG.weather = { blobs: 10, size: [220, 360], drift: 6, parallax: 0.35, ash: 40 }`.
- `fogImg(col)` — mảng sương 128×128 vẽ sẵn (vài gradient tròn chồng), lưu theo màu.
- `drawWeather(camX, camY, t, wi)` — `fog`/`dust`: `blobs` mảng sương cuộn chậm với thị sai `parallax`, vẽ ở toạ độ màn; `ash`: `ash` hạt rơi chéo chậm (như `drawMotes` nhưng rơi xuống, sáng nhẹ). Vẽ SAU `drawLights` (sương nhận màu riêng, không bị lightmap làm đen), TRƯỚC đạn quái.

- [x] **Bước 1: Viết `V8-5` (trượt trước):** (a) `SETTINGS.clear = true` → `drawWeather` không vẽ gì (đếm bằng cách bọc `ctx.drawImage`/`fillRect` trong 1 khung); (b) đợt 7 (vô tận) không ném lỗi; (c) điểm ảnh ở tâm màn (người chơi) độ sáng đổi ≤ 8% khi bật/tắt thời tiết (sương không che nhân vật).
- [x] **Bước 2:** Viết `fogImg`, `drawWeather`. Mảng sương tránh tâm màn: độ đậm × `clamp(khoảng cách tới tâm / 120, 0.3, 1)`.
- [x] **Bước 3:** Gọi trong `renderScene` và `renderAttract` (đợt 1).
- [x] **Bước 4:** `runChecks()` → 78/78, `perf()` ≤ +0,6 ms. Chụp 4 ảnh đợt.
- [x] **Bước 5:** VER `v8e`, commit `V8 G5: sương, bụi, tro theo đợt`.

**Kết quả G5** (22/11/2026, pane 1280×720 hiện, G3 vẫn bỏ qua nên đếm 76 → 77): `runChecks()` 77/77. `V8-5` trước → sau: `không có drawWeather` (trượt) → `vẽ 10/10/10/40, Dễ nhìn 0, vô tận ok, tâm đổi 1.5%, sắc độ ≥ 37°`. Lệch kế hoạch: (1) **màu**: bụi đợt 3 `#b89a72` (lệch 29°) → `#b4a888` (39°), tro đợt 4 `#ffb46a` (25°) → `#ffdc8c` (37°) để giữ luật màu V7; V8-5 thêm (d) kiểm mọi `weather.col` lệch ≥ 35° so với `CFG.light.zoneCol`, và (a) kiểm thêm chiều ngược "mỗi đợt CÓ vẽ" (không thì "Dễ nhìn không vẽ gì" đạt sẵn); (2) thời tiết **chỉ vẽ khi `lightOn()`** (trong khối `drawLights` của `renderScene`; menu cũng vậy) — theo trọng tâm review 1 và Task 7: tắt ánh sáng đêm/tự tắt vì máy yếu thì không có sương trên nền sáng; (3) thêm vào `CFG.weather`: `ashFall` 14 (đơn vị/giây), `ashA` [2.5, 5] (độ đậm hạt tro = `weather.a` × hệ số → 0.3–0.6), `clearR` 120 (bán kính mờ quanh tâm); vẽ sương bật `imageSmoothingEnabled` (ảnh 128 px phóng ~1000 px); (4) (c) đo trung bình vùng 40×40 px ở tâm, cả 4 đợt, so với `drawWeather` thay bằng hàm rỗng. Lưu ý: với `a` 0.10 của kế hoạch, sương rất nhạt — bỏ hẳn vùng mờ quanh tâm thì tâm cũng chỉ đổi 2.6% (nên (c) khó trượt với số hiện tại); nếu người dùng muốn sương rõ hơn thì tăng `weather.a`, (c) sẽ giữ tâm màn. `perf()` cùng phiên, xen kẽ thay `drawWeather` bằng hàm rỗng / bật: đợt 1 1.3/1.2/1.3 → 1.2/1.4/1.3 ms (trung vị 1.3 → 1.3), đợt 4 1.1/1.3/1.1 → 1.2/1.2/1.3 (1.1 → 1.2); chỉ đo thời gian CPU của `render(1)`, phần tô GPU của 10 mảng ~1000 px không đo được ở đây. Ảnh: `tools/shots/v8-after-wave1..4.png` (cùng cảnh Task 0: 60 golem 100–280 đơn vị, `tick(0.2)`, bật đèn; lúc chụp G3 chưa làm nên chỉ khác ở sương/tro + vết loang G4).

**Sương rõ hơn** (22/11/2026, VER `v8f`): `weather.a` đợt 1 0.10 → 0.22, đợt 2 0.10 → 0.20, bụi đợt 3 giữ 0.08, tro đợt 4 0.12 → 0.16. Giới hạn thật là `V8-1` (tương phản TƯƠNG ĐỐI ở 200 đơn vị, nền chỉ ≈ 12/255): sương nâng nền nên tỉ lệ tụt dù chênh tuyệt đối gần như không đổi (đợt 1: Δ ≈ 10 ở mọi `a`). Đo 16 bố cục sương ngẫu nhiên (cách đo V8-1, áp cho từng đợt): đợt 1 `a` 0.22 trung vị 51% (0.25 → 46%), đợt 2 0.20 → 43%, đợt 3 0.10 → 40% (0.15 → 34% trượt); riêng hoạt ảnh/nhún của golem đã làm V8-1 dao động ±4% giữa các lần (trong `runChecks` với bụi 0.10: 35–36%, sát ngưỡng) → bụi đợt 3 GIỮ 0.08 (V8-1 chỉ kiểm đợt 3; muốn bụi rõ hơn thì phải làm G1 hoặc đổi thước đo V8-1 sang chênh tuyệt đối — việc của người dùng). Phát hiện: với vị trí sương `Math.random` lúc tải, V8-1 và V7-1 **chập chờn ngay cả ở số cũ** (V8-1 đợt 3 `a` 0.08 thấp nhất 28%; V7-1 góc 8×8 bị mảng sương phủ lên tới 0.83 > 0.75) → vị trí mảng sương nay cố định theo `hash` (`fogU`, cảnh không đổi kiểu), và V7-1 tắt `drawWeather` khi đo (V7-1 kiểm lightmap; ảnh hưởng của sương do V8-5 kiểm). `runChecks()` 77/77 (pane 1280×720 hiện): V7-1 góc 0.56, V8-1 41% (lần trước với bụi 0.10: 35–36%), V8-5 tâm đổi 0.0% (bố cục cố định không có mảng nào ở tâm lúc đo). Ảnh `tools/shots/v8-after-wave1..4.png` chụp lại (cùng cảnh, cùng cách chụp): đợt 1–2 thấy rõ các mảng sương xanh/tím ở vùng tối, golem vẫn rõ viền; đợt 3 bụi vẫn rất nhạt; đợt 4 hạt tro thấy được.

---

### Task G6: Nhân vật bóp-giãn

**Files:** `js/data.js`, `js/game.js` (`tryDash`, `hurtPlayer`, chỗ lên cấp), `js/render.js` (`draw`, vòng vẽ người chơi trong `renderScene`), `tools/checks.js` (`V8-6`).

**Interfaces:**
- `CFG.squash = { dash: [1.18, 0.86, 0.14], hurt: [0.84, 1.12, 0.12], lvl: [0.9, 1.14, 0.2], land: [1.1, 0.92, 0.08] }` — mỗi loại `[sx, sy, giây]`; `land` chạy ngay sau khi `dash` hết.
- `p.sq = { sx, sy, t, max }` — đặt bởi `squashPlayer(kind)` (`game.js`); `draw()` khi `kind === 'player' && p.sq.t > 0 && !calm()` nội suy từ `[sx, sy]` về `[1, 1]` theo `t/max` (ease-out), neo chân như nhánh `e.pop` hiện có.
- Lướt sang trái/phải thì giãn ngang; lướt lên/xuống thì đổi `sx`↔`sy` (giãn dọc).

- [ ] **Bước 1: Viết `V8-6` (trượt trước):** gọi `tryDash()` → khung kế tiếp bề rộng điểm ảnh không trong suốt của nhân vật (đo bằng `getImageData` vùng 48×48 quanh tâm) lớn hơn lúc đứng ≥ 8%; `SETTINGS.noFlash = true` → bằng lúc đứng (±1 px); sau 0,5 giây về như cũ.
- [ ] **Bước 2:** `squashPlayer` trong `game.js`, gọi ở 3 chỗ; lướt hết → `land`.
- [ ] **Bước 3:** Nhánh người chơi trong `draw()`; bóng mờ khi lướt (`p.trail`) dùng cùng hệ số giãn.
- [ ] **Bước 4:** `runChecks()` → 79/79. `perf()` không đổi.
- [ ] **Bước 5:** VER `v8f`, commit `V8 G6: nhân vật bóp-giãn khi lướt, bị đánh, lên cấp`.

---

### Task 7: Nghiệm thu chung và bàn giao

- [ ] `runChecks()` 79/79 (V6-2/V6-3 với pane hiện).
- [ ] `perf()` 3 lần: tổng ≤ mốc Task 0 + 2,0 ms. Khung dài nhất (phím `F`) < 33 ms trong 60 giây đợt 4 với 300 quái.
- [ ] Tắt "Ánh sáng đêm" → cảnh giống V7 tắt đèn (không có ánh trăng/đèn thế giới/sương lơ lửng trên nền sáng).
- [ ] Bật "Giảm loé" → không lập loè, không bóp-giãn, xác không nháy.
- [ ] `file://` (bấm đúp `index.html`): vào ván, qua 1 đợt, không lỗi trong `#errBox`.
- [ ] Bộ ảnh trước/sau 4 đợt + ảnh hạ hàng loạt gửi người dùng.
- [ ] Cập nhật `CLAUDE.md`: dòng `KE_HOACH_V8.md` (đã xong, VER), tên hàm/cấu hình mới.

## Phiếu nhìn cho người thật (5 phút, sau Task 7)

1. Đợt 1–4, đứng yên 10 giây: quái ở mép màn có nhận ra ngay không? (có / phải nhìn kỹ / không)
2. Nova cấp 8 giữa đám đông: màn có loá, khó chịu không? Còn thấy đạn quái không?
3. Đèn thế giới: có làm bạn tưởng là vùng nguy hiểm không? Lập loè có khó chịu không?
4. Sương/tro: đẹp hay rối? Có lúc nào che mất quái hoặc đạn không?
5. Lướt: cảm giác có "lực" hơn không? Có thấy nhân vật méo kỳ quặc không?
6. Máy bạn: có lúc nào giật không (phím `F` xem khung dài nhất)?
