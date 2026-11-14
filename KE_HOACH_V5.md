# KE_HOACH_V5 — Đồ hoạ, âm thanh và cảm giác "chơi thêm ván nữa"

Kế hoạch v5 cho "Đêm Sinh Tồn". Mỗi phase bên dưới là **một prompt tiếng Anh** để dán vào một phiên làm việc mới. Phần cân bằng độ khó **không nằm trong V5** (làm sau).

## Cách dùng

1. Làm lần lượt từng phase, mỗi phase một phiên mới. Dán nguyên khối prompt của phase đó.
2. Mọi prompt đều yêu cầu đọc `CLAUDE.md` và mục **Shared context** của file này trước, nên không cần dán thêm gì.
3. Phase 5 và Phase 10 dừng lại để xin phép tải file (theo quy ước dự án). Phase 6 chỉ chạy sau khi đã duyệt danh sách ở Phase 5.
4. Xong phase nào, người làm tự đánh dấu vào bảng dưới đây.

| Phase | Nội dung | Cỡ | Cần trước | Trạng thái |
|---|---|---|---|---|
| 1 | Viền sprite mảnh, mềm, dày đều ở mọi cỡ quái | M | — | **xong** |
| 2 | Bóng đổ, vùng báo trước, nền, quái xuất hiện/chết | M | 1 | **xong** |
| 3 | Vũ khí đổi hình theo cấp (nhìn là biết mạnh lên) | L | 1 | **xong** |
| 4 | Cột mốc cấp 4/8 + thẻ nâng cấp hiện rõ lộ trình | M | 3 | **xong** |
| 5 | Âm thanh: tìm nguồn CC0 trên web, lập danh sách xin duyệt | S | — | chưa làm |
| 6 | Âm thanh: tải, trang nghe thử, phối âm | L | 5 + duyệt | chưa làm |
| 7 | Phần thưởng trong ván: combo, rương, mốc, hút ngọc | M | 2 | chưa làm |
| 8 | Màn kết thúc kéo người chơi vào ván sau | M | — | chưa làm |
| 9 | Nhiệm vụ, sổ tay sưu tầm, menu sống động | M | 8 | chưa làm |
| 10 | (Tuỳ chọn, cần tải) sprite riêng cho quái biến thể + nhân vật mới | M | 1 + duyệt | chưa làm |

Nếu chỉ đủ thời gian cho vài phase: **1 → 3 → 4 → 6** cho hiệu quả nhìn/nghe thấy rõ nhất.

## Vì sao viền đang dày (đo từ code)

`tools/build_atlas.py` đã vẽ sẵn vào `assets/atlas.png` một viền 1 điểm ảnh **của sprite gốc**, theo 8 hướng, màu tím nhạt `(232,220,255, α150)` cho quái/vật phẩm và vàng `(255,228,160, α170)` cho người chơi/rương. Khi vẽ, viền bị phóng theo `SPRITES[k].scale × e.sc × ZOOM`, nên ở ZOOM 3:

| Vật | Hệ số | Viền trên màn hình |
|---|---|---|
| Người chơi | 1.0 | 3 px |
| Slime | 1.5 | 4.5 px |
| Xương khô | 1.4 | 4.2 px |
| Nhớt mẹ (`splitter`), boss Tử Linh | 2.4 | 7.2 px |
| Boss Thây Ma / Quỷ Đá / Chúa Tể | 1.7–1.9 | 5.1–5.7 px |
| Quái tinh anh | ×1.5 nữa | tới 6.3 px |

Viền 8 hướng còn tạo góc vuông, và hệ số lẻ làm viền chỗ dày chỗ mỏng. Phase 1 xử lý cả ba.

## Không làm trong V5

- Cân bằng độ khó, chạy `tools/balance-bot.js`, chỉnh `WAVE_DEFS` / máu / sát thương quái. Thay đổi nào có thể lệch cân bằng thì ghi vào mục "Cần cân bằng lại" của `CLAUDE.md` để làm sau.
- WebGL, `ctx.filter`, `shadowBlur`, ánh sáng động theo từng vật (lý do như V4: quá chậm với 450 quái).
- Vũ khí mới, hệ chí mạng, bản đồ có tường.

---

## Shared context

Every phase prompt assumes you have read this section and `CLAUDE.md`.

````text
PROJECT
"Đêm Sinh Tồn" is a Vampire-Survivors-style browser game: plain JavaScript, Canvas 2D, no build
step, no ES modules, scripts loaded in a fixed order from index.html. CLAUDE.md describes every
file, how to run the game (python -m http.server 8765, then http://localhost:8765/index.html) and
the __vs dev hooks. V3 and V4 are finished; KE_HOACH_V4.md shows the house style for specs.

GOAL OF V5
Make the game look and sound better and make a player want one more run. The work is judged by
what a player sees, hears and feels in the first minutes, not by difficulty numbers.

OUT OF SCOPE: BALANCE
Difficulty tuning is a separate later pass. Do not run tools/balance-bot.js, do not chase
clear-rate or kill-time targets, and do not retune WAVE_DEFS, ENEMIES or boss numbers. If an item
unavoidably shifts power (it is called out where it does), keep level-8 totals equal on paper and
add one line describing the shift under a "Cần cân bằng lại" heading in CLAUDE.md.

CONSTRAINTS
- All in-game text and all code comments are Vietnamese; talk to the user in Vietnamese.
- Every tunable number lives in js/data.js (CFG or a table next to the system it belongs to).
- js/atlas.js and js/fx-atlas.js are generated; do not hand-edit them. vendor/ is not in the repo.
- Fallbacks must survive: with no images the game draws SHAPES, with no audio files it uses the
  WebAudio synth, and double-clicking index.html (file://) must still run. On file://,
  getImageData on a loaded image throws, so runtime image work must use drawImage and
  globalCompositeOperation only, or be wrapped so failure falls back to the current look.
- Touch must keep working: the joystick listens on the canvas; new touch controls are separate
  DOM elements above it.
- Cinematic timing (freezes, slow motion, ceremonies) belongs in frame() in js/ui.js, never in
  update(). __vs.tick and runChecks() call update() directly and must behave as before.
- Respect the existing REDUCED_MOTION flag and SETTINGS for anything that shakes, flashes or moves
  the camera.
- Sprites are drawn from a per-kind cache built in js/render.js (sheetFor / buildSheet), not from
  the atlas image directly; the outline is added there from CFG.outline. Anything that needs a
  sprite's silhouette or a recoloured copy should reuse that cache.
- Downloads: never download anything without asking the user first with file name, source URL,
  size and licence. CC0 or OFL only. Record every new asset in CREDITS.md.
- This folder is not a git repository. Before overwriting any binary asset, copy the original to
  tools/backup/ with a version suffix so it can be restored.
- After editing JS or CSS, bump the ?v= value on every <script>/<link> in index.html (currently
  v5d). Assets have their own cache tags: ATLAS_SRC and FX_SRC in js/data.js, the sfx/music URLs
  in js/audio.js. Bump those when the file behind them changes.

PERFORMANCE BUDGET
Canvas 2D with up to 450 enemies. No ctx.filter, no shadowBlur, no per-entity gradients created
per frame. Anything soft (shadows, glows, telegraph fills) is pre-rendered once to an offscreen
canvas and blitted. Measure with this snippet before and after any rendering change; a phase may
not raise ren by more than 1 ms or upd by more than 0.3 ms:

  startGame(); for (const w of ['bolt','orbit','lightning','knife','aura','nova']) __vs.give(w, 8);
  G.player.maxHp = G.player.hp = 1e6; G.xpNeed = 1e9; __vs.skipTo(3); G.diffT = 500;
  __vs.spawn(440, 'skeleton'); __vs.tick(4);
  let t = performance.now(); for (let i = 0; i < 120; i++) update(CFG.step);
  const upd = (performance.now() - t) / 120;
  t = performance.now(); for (let i = 0; i < 60; i++) render(1);
  const ren = (performance.now() - t) / 60;
  G.state = 'paused'; ({ upd, ren, enemies: G.enemies.items.length });

REFERENCE SCENE FOR BEFORE/AFTER SCREENSHOTS
Visual work is accepted by screenshot, so take a "before" shot first. This scene puts every size
class on screen (adjust if a hook signature differs from CLAUDE.md):

  startGame(); G.player.maxHp = G.player.hp = 1e6; G.xpNeed = 1e9; __vs.skipTo(1);
  __vs.spawn(6,'slime'); __vs.spawn(6,'skeleton'); __vs.spawn(4,'bat'); __vs.spawn(2,'splitter');
  __vs.spawn(2,'golem'); __vs.spawnElite('golem'); __vs.spawnBoss('bossZombie');
  __vs.tick(1.5); G.state = 'paused';

Capture it at two window sizes, one that gives ZOOM 2 and one that gives ZOOM 3 (read the global
ZOOM to confirm; in the browser pane 1280x720 gives ZOOM 2 and 960x540 gives ZOOM 3). Pane
screenshots are downscaled, so to inspect pixels set cv.style.transform = 'scale(3)' with a
transformOrigin on the area of interest, wait a second, then capture. If port 8765 is taken by
another server, start the "dem-sinh-ton-8766" configuration from .claude/launch.json. Show the user the before/after pair at the end of the phase.

VERIFICATION
- tools/checks.js: `await runChecks()` must still pass. It is a functional regression suite, not
  a balance test. Add a check only where an acceptance criterion is mechanical (a value, a count,
  a call order); visual criteria are accepted by screenshot.
- Check the browser console for errors after each item.

WORKING STYLE
Do the items of the phase in order without stopping for confirmation between them. Stop only for
a download, a constraint that cannot be met, or a result that contradicts the plan. Read and edit
narrowly: search for the function, read that range, change those lines. No notes or planning
files. At the end of the phase: update the "Cấu trúc" and "Trạng thái" sections of CLAUDE.md, set
the phase to "xong" in the table at the top of KE_HOACH_V5.md, and give one short report: what
was done, runChecks() result, the upd/ren numbers, the screenshots, and anything skipped, failed
or not verified.
````

---

## Phase 1 — Viền sprite mảnh và mềm

Mục tiêu: viền dày đúng 1–2 px màn hình ở mọi cỡ quái, bo góc, nhạt dần ra ngoài; người chơi vẫn nổi bật nhất.

````text
Read CLAUDE.md and the "Shared context" section of KE_HOACH_V5.md, then do Phase 1 below.

PROBLEM
Monsters and the player wear a thick, hard, pale ring that looks like a sticker border. The cause
is in tools/build_atlas.py: it baked a one-texel, 8-direction outline into assets/atlas.png, in
LIGHT (232,220,255, alpha 150) for enemies and items and GOLD (255,228,160, alpha 170) for the
player and chest. At draw time that ring is scaled by SPRITES[k].scale * e.sc * ZOOM, so it is
3 device px on the player but 4.5 on a slime, 7.2 on a splitter and up to 6 on bosses and elites.
The 8-direction kernel gives square corners, and non-integer scales make the ring uneven.

TARGET LOOK
An outline whose width is set in device pixels and is the same on every sprite regardless of its
scale: one crisp device pixel at moderate opacity, plus one fainter pixel outside it so the edge
fades instead of stopping. Corners rounded (diamond kernel, not a square one). Enemies get a
cool, low-contrast lavender; the player keeps a warmer, slightly stronger gold because the
player must be found at a glance; elites use gold; a raged boss switches to red. Pickups rely on
their existing glow and get no outline.

APPROACH
1. Remove the baked ring from the atlas. Write tools/strip_outline.py (Pillow, run with
   `python -I`): back up assets/atlas.png to tools/backup/atlas.v4.png, then set every pixel whose
   alpha is 150 or 170 to fully transparent. Before writing, count pixels by alpha value; the
   sprite bodies are expected to be fully opaque, so if any alpha other than 0, 150, 170 or 255
   appears, stop and report instead of guessing. The script is idempotent. Frame rectangles in
   js/atlas.js already include the one-texel margin, so atlas.js and all anchors stay valid.
   Change build_atlas.py the same way (keep the margin, skip outline()) so a future rebuild
   matches. Bump the ATLAS_SRC cache tag in js/data.js. If Pillow is not available, say so and
   ask before choosing another route.
2. Draw the outline at device resolution from a sprite cache in js/render.js. For each
   (kind, outline role, e.sc, ZOOM) build one offscreen sheet holding every frame of every anim,
   pre-scaled with smoothing off to its final device size, with the tint from SPRITES[k].tint
   applied to the body. Then add the outline using compositing only (no getImageData, so file://
   keeps working): make a silhouette of the body in the outline colour; in a scratch canvas stamp
   it at the offsets of a diamond kernel of radius px to form an opaque union mask, and composite
   that mask once behind the body at alpha `inner`; repeat with radius px + 1 at alpha `outer`.
   Building each ring as an opaque mask first matters: stamping semi-transparent copies directly
   leaves blotches where stamps overlap. Build a white copy of each sheet for the hit flash and
   the frozen overlay. Build lazily and rebuild when ZOOM or the outline settings change.
3. Point draw()/drawFrame() at the cache. Keep their names and call order (tools/checks.js wraps
   draw and drawSfx), and keep flip, the rotate path used by knife and orb, the hit squash, the
   player dash trail and Assets.register() working. Whole-atlas tint and white copies that the
   cache makes redundant can go.
4. Add `CFG.outline = { px: 1, inner: 0.55, outer: 0.18, enemy: '#cfc4ff', player: '#ffe2a0',
   elite: '#ffd166', rage: '#ff5a6e' }` to js/data.js and a hook `__vs.outline({ ... })` that
   merges new values and rebuilds the cache, so the user can dial the look in live. Treat the
   numbers as a starting point and adjust them against the screenshots.
5. js/icons.js builds UI icons from some atlas frames that used to carry the ring (knife, sword,
   heart, flasks). Look at the HUD and the level-up cards after stripping and give those icons
   the new outline if they now look thin on the dark panels.
6. Optional refinement, judged by screenshot: round each sprite's texel size (scale * sc * ZOOM)
   to a whole number of device pixels so texels are uniform. It makes sprites crisper, but the
   drawn size then differs slightly between ZOOM levels while hit radii stay the same. Keep it
   only for kinds whose drawn size moves by less than about 12% from nominal at ZOOM 2 and 3, and
   put the switch in CFG.outline.snap.

ACCEPT
- Before/after screenshots of the reference scene at ZOOM 2 and ZOOM 3. In a zoomed capture the
  ring measures CFG.outline.px device pixels plus one faint pixel on the player, a slime, a
  splitter, the elite and the boss alike.
- Hit flash, frozen overlay, dash trail, tinted variants (bomber, charger) and rotated blades
  still look right. With ASSETS emptied the SHAPES fallback still draws. Opening index.html from
  file:// shows the same outline.
- runChecks() passes; ren on the performance snippet is not higher than before.
````

---

## Phase 2 — Thế giới mềm và dễ đọc hơn

Mục tiêu: bỏ cảm giác "dán hình lên nền": bóng mềm, vùng báo trước đẹp hơn, nền bớt kẻ ô, quái hiện ra và biến mất có chuyển động.

````text
Read CLAUDE.md and the "Shared context" section of KE_HOACH_V5.md, then do Phase 2 below.
Phase 1 (outline cache) is already in place.

WHY
With the outlines fixed, the remaining flat spots are what sits around the sprites. In a
screenshot of normal play: shadows are hard black ellipses, the slam telegraph is a flat red
disc with a hard ring, the elite's gold glow reads as a dirty fog patch around the body, the
floor shows its tile grid like graph paper, and enemies blink into and out of existence. Each
item below replaces a hard edge with a pre-rendered soft one or adds a short transition. None of
them changes gameplay.

ITEMS
2.1 Soft contact shadows. Replace the flat ellipse in drawShadow() with one pre-rendered radial
    blob blitted at the entity's size (wider and darker for bosses). One drawImage per entity,
    same count as now.
2.2 Elite and boss light. Move the elite glow from a sphere around the body to a flattened pool
    of light on the ground under the feet, smaller and dimmer than now, so the sprite stays the
    brightest thing. Check the raged-boss red glow with the same eye.
2.3 Telegraphs (drawZones and the boss telegraph branches in drawTelegraph). Keep the timing,
    radius and red hue, because players have learned them, and change the rendering: a
    pre-rendered disc that is transparent in the centre and denser toward the rim, an inner fill
    that grows to the rim as the timer runs out, a thin dashed rim that rotates slowly, and a
    brief white flash in the last 0.12 s. The area under a telegraph must stay readable: the
    player has to see their own feet and any pickup inside it.
2.4 Floor. In buildGroundTiles()/buildGround(), lower the contrast of the tile seams and add
    large, low-frequency light and dark patches (a few hundred units across) baked into the
    pre-rendered ground canvas, so the eye stops reading a grid. Keep the per-wave tint and
    decor, the 1024-unit wrap, and the crossfade during the rest phase. No per-frame cost.
2.5 Arrivals and exits. Enemies that appear on screen (splitter children, elites, anything
    summoned near the player) scale in from 60% and fade in over about 0.2 s. Small enemies that
    die leave a quick white silhouette that shrinks and fades in about 0.12 s under the existing
    dust puff; reuse the white sheet from the Phase 1 cache and respect the effect priority
    system (CFG.sfxSoftCap) so crowds cannot flood the pool.
2.6 Life in the crowd. Give walking enemies a 2 to 3% squash-and-stretch tied to their anim
    time, applied in the transform draw() already sets up, with a per-entity phase offset so a
    crowd does not pulse in unison.
2.7 World-space bars. The player HP bar and elite bars get a 1-unit dark frame and a pale trail
    that catches up over 0.4 s after damage, like the boss bar already has.

ACCEPT
Before/after screenshots of the reference scene plus one of a slam telegraph with the player
standing inside it and one of the bare floor. runChecks() passes. The performance snippet stays
inside the budget.
````

---

## Phase 3 — Vũ khí đổi hình theo cấp

Mục tiêu: lên cấp vũ khí là **nhìn thấy ngay** — không chỉ con số tăng.

````text
Read CLAUDE.md and the "Shared context" section of KE_HOACH_V5.md, then do Phase 3 below.

WHY
The six weapons in WEAPONS (js/data.js) gain "+30% damage" or "+1 projectile" per level, and
only evolution changes how they look. A level-5 bolt looks like a level-1 bolt, so upgrades do
not feel like growth. The rule for this phase: every upgrade is visible or audible within two
seconds of taking it, and a weapon's level can be guessed from a screenshot.

DESIGN
Three visual tiers per weapon plus the existing evolved look: tier 1 is levels 1 to 3, tier 2
is levels 4 to 7, tier 3 is level 8, tier 4 is evolved. Put the boundaries in CFG.tiers and add
a weaponTier(w) helper. Describe each weapon's look per tier in one table in js/data.js
(WEAPON_LOOK: colours, streak or trail length, visual size multiplier, impact effect scale,
particle count, glow name) so that an artist could retune it without reading render code. Inside
a tier, let one property grow a little with every level (streak length, blade glow, ring
thickness) so each single level is also visible. This phase changes visuals only: hit radii,
damage and cooldowns stay exactly as they are.

A direction for each weapon; keep the identity each one already has and escalate it:
- bolt (Huyết Tiễn): thin pink streak; then a longer streak with a glow and a few trailing
  sparks; then a white-hot core with a short afterimage. Evolved crimson stays.
- orbit (Vòng Huyết Nguyệt): bare blades; then each blade drags a pre-rendered arc; then a faint
  continuous ring with brighter blades.
- lightning (Lôi Phạt): one bolt; then a thicker bolt with a side branch and a scorch mark on
  the ground that fades over about 0.6 s; then a larger scorch and a very brief, low-alpha
  screen flash (skipped under REDUCED_MOTION).
- knife (Dao Bạc): bare knife; then a motion streak behind it; then a silver glint and a ghost
  trail.
- aura (Hào Quang Độc): faint ring; then a second inner dashed ring turning the other way; then
  a visible pulse on each damage tick. Keep the centre nearly transparent, as V4 item 1.4
  required, so the floor and telegraphs under it stay readable.
- nova (Sóng Xung Kích): one ring; then a double ring that kicks up dust; then cracks on the
  ground radiating from the player that fade.

Supporting pieces:
- A ground decal layer for scorch marks and cracks: a small pooled list drawn right after the
  ground, capped (about 40), each decal fading out. Pre-render the two or three decal shapes.
- A cast cue: a small flash at the spawn point when a cooldown weapon fires, so the player can
  tell which weapon just went off.
- The upgrade moment: when a weapon card is chosen in choose() (js/ui.js), play a ring in that
  weapon's colour around the player, float the weapon icon up, and set the weapon's timer to 0
  so the improved attack fires immediately and the player sees what they bought.

COST CONTROL
All six weapons at level 8 among 440 enemies is the worst case and is exactly what the
performance snippet measures. Use the existing pools and caps (G.parts, playFx with pri and
CFG.sfxSoftCap, glow() under CFG.glowCap), draw trails as pre-rendered sprites or a single path
per projectile, and drop the cheapest decoration first when a cap is reached.

ACCEPT
For each weapon, one screenshot strip showing levels 1, 4, 8 and evolved side by side (use
__vs.give and __vs.evolve): the four states are clearly different at a glance. Choosing an
upgrade fires the weapon within one step. runChecks() passes and the performance snippet stays
inside the budget.
````

---

## Phase 4 — Cột mốc nâng cấp và thẻ hiện rõ lộ trình

Mục tiêu: người chơi luôn biết vũ khí đang ở đâu trên đường thăng tiến và bước tiếp theo cho mình cái gì.

````text
Read CLAUDE.md and the "Shared context" section of KE_HOACH_V5.md, then do Phase 4 below.
Phase 3 (visual tiers at levels 4 and 8) is already in place.

WHY
Progression exists (8 levels, then evolution with a paired passive) but the player cannot see
the path. A card says "+30% sát thương" with no before and after, nothing marks a level as
special, and the evolution recipe is one line of small text. This phase makes the path legible:
where am I, what does the next step give, what is the goal.

ITEMS
4.1 Milestone levels. Levels 4 and 8 are where the weapon's look changes (Phase 3), so make
    them named milestones that change behaviour rather than a percentage. Do it by reordering
    the existing entries of WEAPONS[id].levels, not by inventing numbers: the same seven steps
    in a different order give identical level-8 totals. Add `ms: '<tên>'` to the two milestone
    entries. Proposed result:

      weapon     level 4 (name, step)                     level 8 (name, step)
      bolt       Xuyên Giáp: xuyên thêm 1 quái            Loạn Tiễn: +1 tiễn, xuyên thêm 1
      orbit      Trăng Tròn: +20% bán kính và tốc độ     Cuồng Nguyệt: +40% sát thương, xoay nhanh
      lightning  Tam Lôi: +1 tia sét (move up from 5)     Lôi Đình: +50% sát thương
      knife      Xuyên Thấu: xuyên thêm 2 (swap 4 and 5)  Tứ Đao: +1 dao (swap 7 and 8)
      aura       Ăn Mòn: gây sát thương nhanh hơn 15%     Đầm Lầy: làm chậm quái 35%
      nova       Lan Rộng: +25% bán kính (swap 4 and 5)   Dư Chấn: phát 2 sóng (swap 7 and 8)

    The mid-level curve moves slightly for lightning, knife and nova. Do not test it; add one
    line about it under "Cần cân bằng lại" in CLAUDE.md.
4.2 Cards that show the change (renderCards, evoCard, css/game.css).
    - A row of 8 pips: filled up to the current level, the next one pulsing, pips 4 and 8 drawn
      as diamonds, a star after the eighth for evolution.
    - A computed before-and-after line instead of only the hand-written text: apply the level's
      function to a copy of the weapon state, diff the numeric fields, and print them with
      Vietnamese labels from one table (for example "Sát thương 8 → 11", "Số tiễn 1 → 2",
      "Hồi chiêu 0.70s → 0.56s"). Passive cards show the running total ("+15% → +30%").
    - Milestone cards carry a "CỘT MỐC" tag, the milestone name and their own border colour;
      evolution keeps its gold "TIẾN HOÁ" style.
    - The evolution recipe as a small picture: weapon icon (level n/8) plus passive icon
      (level n/3) leading to the evolution name, dimmed until each condition is met. Show it on
      the weapon's card and also on the paired passive's card ("Cần cho tiến hoá: Huyết Vũ"), so
      taking the passive reads as progress toward a goal.
    - Entrance: cards slide up and fade in with a 60 ms stagger; milestone and evolution cards
      get one shine sweep. CSS only, disabled under prefers-reduced-motion. Keep the existing
      0.35 s input lock and the keyboard and touch behaviour.
4.3 HUD chips (chip, renderOwned). Each weapon chip shows its tier through its border colour
    and a compact pip strip, and flashes once when that weapon is upgraded. Update only when a
    level changes; do not add per-frame DOM work to updateHud.
4.4 Pause panel (renderPause). One row per weapon: icon, name, pips, the next milestone and its
    name, and the evolution recipe with its current status.

ACCEPT
Screenshots: a level-up with one normal, one milestone and one evolution card; the HUD with
four weapons at different tiers; the pause panel. `__vs.give(id, 8)` on each weapon yields the
same numeric state as before the reorder (compare against values captured before editing).
runChecks() passes.
````

---

## Phase 5 — Âm thanh: tìm nguồn và lập danh sách xin duyệt

Mục tiêu: chọn được bộ âm CC0 hay hơn cho các âm đang là tiếng "bíp" tổng hợp. **Phase này không tải gì.**

````text
Read CLAUDE.md and the "Shared context" section of KE_HOACH_V5.md, then do Phase 5 below.
This phase is research only: download nothing and change no code.

WHERE THINGS STAND
js/audio.js plays 8 events from Kenney files (hit, kill, hurt, knife, orb, gem, select, chest)
and 18 events from a small WebAudio synth: shoot, zap, nova, heal, level, eshoot, boss, bossdie,
death, warn, slam, crate, pickup, shieldHit, bomb, freeze, dash, win. The synth events are thin
one-oscillator blips, and they include the sounds heard most (shoot fires every 0.7 s) and the
ones that should feel best (level up, win, boss entrance). Music is two chiptune tracks.

TASK
Search the web for CC0 sound packs that can replace the synth events and improve the weak file
ones. Aim for one coherent palette: the music is chiptune and the art is 16-px pixel art, so
punchy retro-styled magic and UI sounds sit better than cinematic realistic ones; the existing
Kenney impacts for physical hits can stay.

Starting points from a quick search on 2026-11-15. Treat every licence as unverified until you
have read it on the pack's own page:
- kenney.nl audio packs, all listed as CC0: RPG Audio (50 files), Digital Audio (60), UI Audio
  (50), Interface Sounds, Impact Sounds, Music Jingles (85, candidates for level-up, win, defeat
  and chest stingers).
- OpenGameArt, "512 Sound Effects (8-bit style)" by SubspaceAudio: listed CC0, one zip of about
  20.6 MB.
- itch.io, "FreeCC0 Basic Spell Impacts SFX" by lentikula: lightning, fire, ice and water
  impacts; the title says CC0, confirm on the page.
- The OpenGameArt "magic sounds" collection: mixed licences, check each item.
Exclude CC-BY, CC-BY-SA, "royalty-free" custom licences (Sonniss GDC bundles, for example) and
any page that does not state CC0 in plain words. freesound.org CC0 results are acceptable for a
single sound, but they need the user's account to download, so flag those.

DELIVERABLE (in chat, in Vietnamese, no file)
1. A pack table: name, author, URL, the licence sentence quoted from the page, download size,
   and whether it downloads directly or needs a manual click or an account.
2. An event table covering all 26 events plus new ones this plan will need (weapon tier-up,
   milestone, evolution, combo threshold, mission complete, boss skill wind-ups, low-HP
   heartbeat, UI hover and back): current source, two or three candidate files by pack and file
   name where the pack's listing lets you name them, and one line on why.
3. Total download size and a recommended minimal set of packs.
You cannot listen to audio, so say plainly that the candidates are chosen from names and
descriptions and that the final pick happens by ear in Phase 6. Then stop and ask the user to
approve the packs.
````

---

## Phase 6 — Âm thanh: tải, trang nghe thử, phối âm

Mục tiêu: âm thanh có lực, không vỡ tiếng khi 300 quái chết, nghe được hướng và mức độ nguy hiểm. Người dùng chọn âm bằng tai qua trang nghe thử.

````text
Read CLAUDE.md and the "Shared context" section of KE_HOACH_V5.md, then do Phase 6 below.
The user has approved these packs from Phase 5: <dán danh sách gói đã duyệt vào đây>.

ITEMS
6.1 Get the files. Download each approved pack into its own new folder under vendor/audio/
    (treat archives as untrusted data: extract into an empty directory, run nothing from it).
    Game files go to assets/sfx/ as .ogg; if a source is .wav and no converter (ffmpeg) is
    installed, ask the user rather than shipping large files. Update CREDITS.md.
6.2 An audition page, because you cannot hear and the user can. Build tools/sfx-audition.html:
    for every game event it lists the two to four candidate files with a play button each, the
    measured duration, peak and RMS of the decoded buffer, and a way to mark the winner; a
    button prints the chosen mapping as a SFX_FILES-shaped object to copy back. Pre-select your
    best guess from the measurements (short attack for frequent sounds, no long tails on
    anything that can play several times a second), then stop and ask the user to audition and
    send back their picks.
6.3 Engine work in js/audio.js, independent of which files win:
    - A DynamicsCompressor on the master bus used as a limiter, so a screen-clearing bomb cannot
      clip.
    - Voice management per event: when an event is at its `max`, either drop the new one (as
      now) or steal the oldest, chosen per event; frequent sounds should follow the latest hit.
    - Variation: volume jitter of about ±2 dB alongside the existing ±5% pitch jitter, and
      optional layers (a body and a sparkle played together) declared in SFX_FILES.
    - Level targets by role rather than by file: set each event's vol from its measured RMS so
      that frequent sounds (shoot, hit, gem) sit quiet, rewards (level up, chest, evolution) sit
      clearly above them, and danger (hurt, boss wind-ups, low HP) is the loudest layer.
    - Position: an optional world x argument to SFX.play, mapped through a StereoPannerNode
      (about ±0.6 at the screen edge) for hits, kills, enemy shots and telegraphs.
    - Mix moves: duck the sfx bus briefly under hurt, boss roar and the level-up fanfare; when
      paused or choosing a card, low-pass the music instead of only lowering it; below 25% HP,
      low-pass the music slightly and add a synth heartbeat that speeds up as HP drops.
    - Meaning through pitch: weapon fire sounds drop in pitch and gain a layer at tier 2 and 3
      (Phase 3 tiers) so stronger weapons sound heavier; kill sounds accept a rate so Phase 7
      can ramp them with the combo.
    - Each boss skill wind-up gets its own rising cue, so a telegraph can be dodged by ear.
6.4 Keep the synth definition for every event as the fallback and check it: on file://, where
    fetch is blocked, every event still makes a sound and nothing throws.

ACCEPT
- `await runChecks()` passes (start the game first so audio is unlocked).
- With an AnalyserNode on the master, detonating a bomb among 300 enemies keeps the peak
  below 1.0, and SFX.active returns to zero afterwards.
- The audition page loads every candidate and prints a valid mapping.
- Report which events now use files, which still use synth, and that the mix was set from
  measurements and still needs the user's ears.
````

---

## Phase 7 — Phần thưởng trong ván

Mục tiêu: mỗi 5–10 giây có một khoảnh khắc "đã tay": chuỗi hạ gục, rương, cột mốc, hút ngọc.

````text
Read CLAUDE.md and the "Shared context" section of KE_HOACH_V5.md, then do Phase 7 below.

WHY
The moment-to-moment loop is kill, collect, level up. Each beat works, but nothing ties them
into streaks or peaks, and the biggest reward in a run, a chest, is one banner line. This phase
adds escalation inside the run. Everything here is feedback; the one gameplay-adjacent piece
(gem vacuum) only saves walking.

ITEMS
7.1 Kill combo. G.combo counts kills and resets after about 2.5 s without one (numbers in
    CFG.combo). A HUD counter appears from 10 upward, pops on each increment and drains a thin
    timer bar. Kill sounds rise in pitch with the combo (capped) so a streak sounds like one.
    At 25, 50, 100 and 200: a callout near the player ("x50!"), a coloured ring, and a pulse
    that pulls every gem within about 200 units to the player. When the combo breaks above 25,
    show the final number briefly.
7.2 Chest ceremony. Picking up a chest currently sets G.pending += 2 and shows a banner (see
    updateGems and the G.chestOpen flag, and how js/ui.js consumes it). Turn it into a short
    event driven from frame(), like the boss intro: the world freezes for about 1.2 s, the chest
    opens with a beam of light, icons spin slot-machine style and settle, a rising arpeggio
    plays, then the normal level-up cards open. Any key or tap skips it. The reward is
    unchanged, and update(), __vs.tick and runChecks() see no difference.
7.3 Milestone toasts. Small non-blocking toasts at the side of the screen, at most one per
    second, for moments worth noticing: 100 / 500 / 1000 kills, survival minutes, a weapon
    reaching level 8, the first evolution of the run, a new personal best passed while still
    playing ("Kỷ lục mới!"). Define them in one table in js/data.js.
7.4 XP bar anticipation. Above 85% the bar shimmers; on level-up it flashes and the overflow
    carries visibly into the next level.
7.5 After a boss. When a boss dies, every gem on the map flies to the player during the rest
    phase, and a title card announces the next wave with its name while the ground crossfades.
7.6 Low-HP tension. Below 25% HP a slow red pulse stays at the screen edge and the HP bar
    trembles; it clears with a soft cue once HP is back above 40%. Audio for it comes from
    Phase 6 if that is done.
7.7 Noise budget. With six weapons and 400 enemies the screen is already busy. Callouts, toasts
    and rings share one limiter (no more than one large callout per second), and everything
    honours REDUCED_MOTION and the shake setting.

ACCEPT
- Killing 60 enemies in quick succession brings G.combo to 60, the HUD counter is visible, and
  the 25 and 50 thresholds each pulled nearby gems. Three seconds without a kill resets it.
- Running real frames after picking up a chest shows the ceremony and then the cards;
  `__vs.pickItem`-style test paths and __vs.tick still grant the upgrades without waiting.
- Screenshots of the combo counter, a threshold callout, the chest ceremony and a toast.
- runChecks() passes; the performance snippet stays inside the budget.
````

---

## Phase 8 — Màn kết thúc kéo vào ván sau

Mục tiêu: thua xong muốn bấm chơi lại ngay, và biết mình sắp mở được gì.

````text
Read CLAUDE.md and the "Shared context" section of KE_HOACH_V5.md, then do Phase 8 below.

WHY
The seconds after a run ends decide whether there is another run. The end panel shows totals,
souls and a damage list, but it does not say what is nearly within reach, and restarting takes
longer than it should. Every item here either shortens the path to the next run or gives a
reason to start it.

ITEMS
8.1 Fast retry. "Chơi lại" is the focused default on the end panel; Enter, Space or R starts a
    new run with the same loadout in well under half a second, with no trip through the menu.
    Keep a short input lockout after the panel appears so a held movement key or a dash press
    cannot restart by accident (js/input.js already guards keys pressed after a win; follow
    that pattern). A press during a count-up finishes the count-up instead of being ignored.
8.2 "Sắp đạt được". A block that names the nearest goals with progress bars:
    - the closest locked starting weapon, with real progress ("Hạ 500 quái trong một ván:
      412/500"). UNLOCKS entries only have ok(r) today; add a prog(r) that returns current and
      target.
    - the cheapest permanent upgrade not yet affordable ("Còn thiếu 12 linh hồn để mua Sinh lực
      cấp 2"), or a buy button right there when it is affordable.
    - once Phase 9 exists, the active missions.
8.3 Records that mean something. Each headline stat shows the previous best beside it and a
    "KỶ LỤC" badge when beaten; store bests per stat next to the existing vs_best / vs_best_nm.
8.4 Run timeline. A strip across the panel showing the waves reached, a boss icon for each boss
    killed, and a marker where the run ended with what killed the player (G.stats.taken has the
    source).
8.5 Staging. The panel's parts arrive in sequence over about 1.5 s (title, timeline, stats,
    souls count-up, goals), skippable, so the result reads as a reveal instead of a table. A
    loss leads with the goal block, a win leads with the celebration and the "Tiếp tục (vô
    tận)" choice.

ACCEPT
- From the end panel, one key press returns to state 'play' with a fresh world; a key that was
  already held when the panel appeared does not.
- With empty storage and a run of 412 kills that reached wave 2, the goal block shows the aura
  unlock at 412/500 and the knife unlock as newly earned.
- Screenshots of the end panel after a loss and after a win. runChecks() passes.
````

---

## Phase 9 — Nhiệm vụ, sổ tay sưu tầm, menu sống động

Mục tiêu: lúc nào cũng có một mục tiêu nhỏ đang dở và một ô trống muốn lấp.

````text
Read CLAUDE.md and the "Shared context" section of KE_HOACH_V5.md, then do Phase 9 below.
Phase 8 (end panel goals) is already in place.

WHY
Souls and unlocks give long-term goals, but between them there is nothing small to aim at in
the next ten minutes, and nothing to collect. Short missions and a collection book are the two
cheapest ways to give every run a purpose beyond surviving.

ITEMS
9.1 Missions. A MISSIONS table in js/data.js; three are active at a time, stored in vs_meta,
    and a completed one is replaced by a new one from the pool. Each has a Vietnamese text, a
    progress function over G.stats and the run result, and a soul reward (10 to 25). Mix the
    kinds so they pull players toward things they would not try: use a specific weapon ("Hạ 300
    quái bằng Lôi Phạt"), reach something ("Tiến hoá một vũ khí"), play a certain way ("Không
    trúng đòn trong 60 giây liên tục"), find something ("Mở 3 rương trong một ván"). Show them
    on the menu, in the pause panel with live progress, as a toast on completion (reuse the
    Phase 7 toasts if present), and in the end panel's goal block. Mission souls speed up the
    permanent upgrades; do not tune that, note it under "Cần cân bằng lại" in CLAUDE.md.
9.2 Sổ tay (collection). A menu panel with a grid for weapons, evolutions, enemies, bosses and
    items. An entry is filled the first time it is obtained or killed; before that it is a dark
    silhouette with "???". Evolution entries reveal their recipe once discovered. Show the
    completion count on the menu button ("Sổ tay 14/31") and flag new entries on the end
    panel. Store it in vs_meta and take care not to break existing saves: missing fields
    default to empty.
9.3 A living menu. Behind the menu panel, render a slow attract scene with the real renderer: a
    gentle camera drift over the wave-1 ground with the ambient motes and a few wandering
    enemies, no player and no gameplay update. Add a title treatment that settles in once.
    Honour REDUCED_MOTION (a still frame). It must not start audio before the first user
    gesture and must stop completely when a run starts.
9.4 Panel consistency. Menu, permanent upgrades, collection, pause and end panels share one
    visual language (frame, heading, button and focus styles) and one open/close transition.
    Keyboard focus order and touch targets (at least 44 px) are checked on each.

ACCEPT
- Completing a mission in a run pays its souls once, persists across reload and brings in a
  replacement. A save written before this phase still loads.
- Killing a new enemy kind fills its collection entry; the counter on the menu matches.
- Screenshots of the menu with the attract scene, the mission list, and the collection with
  filled and unfilled entries. runChecks() passes.
````

---

## Phase 10 — (Tuỳ chọn, cần tải) Sprite riêng cho quái biến thể và nhân vật mới

Mục tiêu: `bomber` / `splitter` / `charger` hiện là sprite cũ nhuộm màu; gói 0x72 có sẵn nhiều quái và nhân vật chưa dùng.

````text
Read CLAUDE.md and the "Shared context" section of KE_HOACH_V5.md, then do Phase 10 below.
This phase needs a download, so it starts with a question to the user.

WHY
Three enemy kinds are recoloured copies of other sprites (bomber is an orange imp, charger a
blue skeleton, splitter a large slime), which makes them hard to tell apart in a crowd, and
there is one hero. The source pack, 0x72 "16x16 DungeonTileset II" v1.7 (CC0,
https://0x72.itch.io/dungeontileset-ii, about 416 kB), contains many unused monsters and heroes
in the same style, but vendor/ is not in the repo.

STEP 1 (ask first)
Ask the user for permission to obtain the pack again, giving the file name, source, size and
licence. itch.io downloads usually need a manual click, so the likely route is that the user
downloads the zip and places it at vendor/0x72/. Wait for the answer.

STEP 2 (after the pack is in place)
- Read the pack's tile list and confirm which frames exist before planning around a name. From
  memory, candidates are chort or goblin for the bomber, muddy for the splitter (its children
  stay swampy), orc_warrior or masked_orc for the charger, and knight, elf or lizard heroes;
  verify each against the list.
- Extend NEEDED in tools/build_atlas.py and rebuild. The rebuild must produce an atlas with no
  baked outline (Phase 1 already changed the script) and must keep every existing frame, so the
  current SPRITES entries keep working. Back up assets/atlas.png and js/atlas.js first.
- Point bomber, splitter and charger at their own sprites in SPRITES, with anchors measured
  from the frames, and drop the tints that are no longer needed. Keep the SHAPES fallbacks.
- Heroes as cosmetic skins: two or three alternative heroes selectable on the menu, identical
  in stats, each unlocked by a condition in the style of UNLOCKS, and listed in the collection
  if Phase 9 exists.
- Update CREDITS.md (sprite table) and bump the ATLAS_SRC cache tag.

ACCEPT
A screenshot of a mixed crowd in which bomber, splitter and charger are recognisable by
silhouette alone; each hero skin in the reference scene with the Phase 1 outline; runChecks()
passes; with ASSETS emptied everything still draws through SHAPES.
````
