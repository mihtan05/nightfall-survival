# KE_HOACH_V4 — Upgrade plan for "Đêm Sinh Tồn"

Handoff spec for the implementing model. Read `CLAUDE.md` first: it describes the file layout, how to run the game and the dev hooks. This file says what to build, where, and how to verify it. It was written after reading all of `js/` and running the game with the `__vs` hooks and `tools/balance-bot.js`.

## How to use this plan

- Work one phase at a time, in order. Each phase is shippable on its own. Inside a phase, items are ordered by value per effort.
- Phase 1 is the one to do if there is time for only one: it changes no balance numbers and fixes the things a new player notices in the first minute.
- After every item: bump the `?v=` query on every `<script>`/`<link>` in `index.html` (currently `g6f`), run `await runChecks()` from `tools/checks.js`, and confirm all 17 existing checks still pass.
- Add one check per item to `tools/checks.js` using the acceptance criteria below (label them `giai_doan: 'V4-1'` and so on).
- When a phase is finished, update the "Cấu trúc" and "Trạng thái" sections of `CLAUDE.md`.

## Working principles: do the work, keep the token cost low

The user wants the work done, not narrated. Spend tokens on reading code, editing and verifying.

- **No progress narration.** Do not announce what you are about to do, do not summarize what you just did after each step, and do not restate this plan. Go from one item to the next without a status message.
- **Do not stop to ask for confirmation between items of a phase.** Stop only for something this plan says needs the user: a download, a constraint that cannot be met, or a result that contradicts the plan.
- **One report per phase, at the end, and short.** It contains: the items done, the result of `runChecks()` and of the performance snippet (numbers only), and anything that failed, was skipped or was not verified. No recap of how the work went.
- **Read narrowly.** Open only the files listed under "Where" for the current item. Use search to find a function, then read that range, not the whole file. Do not re-read a file that is already in context or that you just edited.
- **Edit narrowly.** Change the lines that need changing with targeted edits. Do not rewrite a whole file to change part of it.
- **Batch tool calls.** Run independent reads and searches together in one step. Bump all `?v=` values in `index.html` in one edit.
- **Keep verification output small.** Check acceptance criteria with JS in the page that returns a compact object (pass or fail plus the few numbers that matter), not page dumps. Take a screenshot only when a criterion is visual, and only one per criterion.
- **No extra files.** Do not write notes, logs, summaries or planning documents. The only documentation to touch is `CLAUDE.md`, once per finished phase, and `tools/checks.js`.
- **Comments in code stay short.** One line in Vietnamese where the reason is not obvious, as in the existing code. No comments that describe the change itself.

These principles do not relax honesty: a failed check, a missed target or a skipped item must be stated in the phase report.

## Constraints that apply to every item

- Plain JS and Canvas 2D. No frameworks, no build step, no ES modules. Keep the script order in `index.html`.
- Every balance number goes in `js/data.js`. New systems add their own table or `CFG` block there.
- Do not edit `js/atlas.js` or `js/fx-atlas.js`. `vendor/` is not in the repo, so the atlases cannot be rebuilt. No item below needs a new image or sound file. If you think one does, stop and ask the user first (file, source, size, license; CC0 or OFL only).
- Fallbacks must keep working: with no images the game draws `SHAPES`, with no audio files it uses synthesized sound. Every new enemy kind or pickup needs a `SHAPES` entry or a mapping to an existing one.
- All in-game text is Vietnamese. The strings to use are given in each item.
- Touch must keep working: the joystick listens on the canvas, so new touch buttons must be separate DOM elements above it.
- Cinematic timing (slow motion, intro freeze) belongs in `frame()` in `js/ui.js`, never in `update()`. `__vs.tick`, `runChecks` and `runBot` call `update()` directly and must behave as before.

## Performance budget

Baseline measured before any V4 change, 1280×720 canvas, all six weapons at level 8, about 380 skeletons on screen: `update()` 1.9 ms per step, `render()` 12.1 ms per frame, with 137 sprite effects and 149 floating texts alive. The measurement was taken in an embedded browser pane and is probably pessimistic, so treat it as a relative baseline: re-measure on your machine before starting and after each rendering item.

```js
startGame(); for (const w of ['bolt','orbit','lightning','knife','aura','nova']) __vs.give(w, 8);
G.player.maxHp = G.player.hp = 1e6; G.xpNeed = 1e9; __vs.skipTo(3); G.diffT = 500;
__vs.spawn(440, 'skeleton'); __vs.tick(4);
let t = performance.now(); for (let i = 0; i < 120; i++) update(CFG.step); const upd = (performance.now() - t) / 120;
t = performance.now(); for (let i = 0; i < 60; i++) render(1); const ren = (performance.now() - t) / 60;
G.state = 'paused'; ({ upd, ren, enemies: G.enemies.items.length });
```

Rule: no item may raise `ren` by more than 1 ms or `upd` by more than 0.3 ms on this snippet. Phase 1 as a whole should lower `ren` (item 1.2).

## What the playtest showed

These observations are the reasons behind the items. Three bot runs (`runBot()`, default settings):

| Run | Ended | First minute with damage taken | Boss 1 kill time | Final build |
|---|---|---|---|---|
| 1 | 8:43, wave 3 fight | minute 5 | 29 s | all 6 weapons + 2 passives |
| 2 | 5:48, boss 2 | minute 2 | 62 s | all 6 weapons + 1 passive |
| 3 | 11:59, boss 3 | minute 4 | 205 s | all 6 weapons + 2 passives |

- The opening is too safe. The bot takes no damage for the first one to four minutes.
- All damage taken came from contact with slimes, skeletons and golems. None came from boss skills or enemy projectiles. Bosses are damage sponges, and deaths are slow attrition inside a crowd.
- Boss fights vary from 29 s to 205 s with nothing escalating, so a weak build means a three-minute slog.
- Every run ends with all six weapons. Nothing limits what you can take, so builds do not differ between runs and no pick is a real decision.
- The player has one verb: move. Boss telegraphs are good, but there is no skill move to answer them with.
- The end screen shows four numbers and nothing carries over between runs except the best record.

Seen in screenshots and code:

- Enemy shots (`G.shots`) are drawn before `drawFx()` and `drawSfx(false, vis)` in `renderScene()`, so explosions and lightning cover the one thing the player must see. Player bolts (pink orb) and enemy shots (purple orb) are the same shape and a close hue.
- The poison aura at high level is a filled green disc covering close to half the screen height.
- The floor is one near-black tile set for the whole run. There is no light, and no visual change between waves.
- A boss that walks onto the player hides the player sprite completely (Y-sorted draw).
- On the level-up card the key number overlaps the upgrade name (`.card .key` is floated).
- Damage numbers use `system-ui` while the rest of the UI uses VT323, and cost two `fillText` calls each.
- With all weapons maxed the sprite-effect pool sits at 137 of `CFG.sfxCap` 140, so `playFx()` starts returning `null` and effects, including boss telegraph circles, are dropped at random.

---

## Phase 1 — Readability and game feel (no balance change)

### 1.1 Enemy projectiles are always on top and read as hostile — S

**Why.** The player dies to what they cannot see. Hostile and friendly projectiles must differ in silhouette, not only in hue.

**Where.** `js/render.js`: `renderScene()`, `SHAPES.shot`, `SHAPES.bolt`.

**Design.**
- Move the `G.shots` draw loop to after `drawSfx(false, vis)` and before `drawWarnings(p)`.
- Shape language: hostile projectiles are round orbs with a dark ring; player projectiles are streaks or blades with no ring.
- `SHAPES.shot`: dark ring `#1a0612` at radius `s.r + 2.5`, body `#c86bff` at `s.r`, white core at `s.r * 0.5` pulsing between 0.4 and 0.6 of `s.r` at 10 Hz. Keep the outer glow.
- `SHAPES.bolt`: replace the orb with a streak: a 12-unit line along the velocity, 3 units wide in `#ff4d8d`, with a 1.5-unit white line on top over the front 6 units. Collision radius is unchanged.

**Accept.** Wrap `draw` and `drawSfx` as `tools/checks.js` does for draw order and confirm every `'shot'` draw call comes after the last `drawSfx` call in a frame. Spawn `boss`, let it fire a ring, trigger a `strike` on top of the shots: the shots stay visible.

**Risk.** None.

### 1.2 Bitmap damage numbers in the game font — M

**Why.** Numbers are the main reward feedback and currently look foreign to the pixel style. They are also the most expensive text on screen in a crowd.

**Where.** `js/render.js` (text loop at the end of `renderScene()`), `js/game.js` (`addText`, `addDmgText`, `styleDmg`).

**Design.**
- Build a glyph atlas once after `document.fonts.load('16px VT323')` resolves (fall back to `ui-monospace` if it rejects), and again in `resize()` when `ZOOM` changes. Glyphs: `0–9` and `+`. One row per colour used by `styleDmg` (`#ffffff`, `#ffd166`, `#ff9a3d`, `#ff4d4d`) plus heal green `#5cff9d`. Glyph height is 10 world units × `ZOOM` device pixels, each drawn with a 1-pixel `#000` shadow offset baked in.
- Numeric texts (`t.v` defined, or text starting with `+` followed by digits) are drawn with one `drawImage` per glyph, centred on `t.x`, scaled by `t.size * (1 + t.pop * 3)`.
- Non-numeric texts from `addText` (item names) keep `fillText` but switch the font to `VT323`.
- Motion: numbers rise 30 units/s as now, and also drift sideways by a random −8 to +8 units/s chosen at creation, so stacked numbers separate.

**Accept.** With 100 damage texts alive, spy on `ctx.fillText`: zero calls for numeric texts during `render(1)`. The performance snippet shows `ren` lower than baseline. Numbers stay sharp at `ZOOM` 2 and 3.

**Risk.** If the font is missing the atlas must still build from the fallback font.

### 1.3 Hit and hurt feedback — S

**Why.** Enemies only flash for 80 ms when hit. Taking damage gives a shake and a red edge but no moment of impact and no breathing room, so the player loses 60 HP in a crowd without feeling the individual hits.

**Where.** `js/game.js`: `hitEnemy`, `hurtPlayer`, `updateFx`. `js/render.js`: `draw`, `drawFrame`, `drawFx`. `js/data.js`: `CFG`.

**Design.**
- Squash on hit: `drawFrame` takes optional `sx, sy` scale factors. While `e.flash > 0`, with `k = e.flash / 0.1`: `sx = 1 + 0.18k`, `sy = 1 - 0.12k`. Raise `e.flash` on hit from 0.08 to 0.1. This reuses the transform `drawFrame` already sets up, so it adds no draw calls.
- `hurtPlayer` on a real hit (not blocked by the shield): `hitStop(0.07)`, `addShake(6)`, `G.flashT = 0.12` with `G.flashColor = '#ff3b5c'`, and a shockwave: every non-boss enemy within 90 units gets `kx, ky += dir * 260 / mass`. Use a separate scratch array for the grid query, because `hurtPlayer` is called from inside `updateEnemies` while `tmp` is in use. Add an fx type `ring` (expanding stroked circle, 0 → 90 units in 0.2 s, colour parameter) and play it in white.
- Add `CFG.hurt = { stop: 0.07, pushR: 90, push: 260 }`.
- Player death: `hitStop(0.25)`, a 40-particle burst in `#c04dff`, a `die` fx for the player sprite, and show the end panel after 900 ms instead of 600.

**Accept.** Place 10 skeletons on the player, call `hurtPlayer(10)`, then `__vs.tick(0.2)`: all ten are farther than 40 units from the player. `G.hitStop` is 0.07 right after the call. A shield block does not trigger the shockwave.

**Risk.** The push makes crowds slightly less lethal. That is intended and is retuned in 3.7.

### 1.4 Effect priority and a quieter aura — S

**Why.** Effects are dropped at random when the pool is full, and the aura hides the floor, pickups and telegraphs under it.

**Where.** `js/data.js`: `FX_STYLE`, `CFG.sfxCap`. `js/game.js`: `playFx`. `js/render.js`: `drawAura`.

**Design.**
- Add `pri: 1` to important styles in `FX_STYLE`: `strike`, `boom`, `bigBoom`, `levelUp`, `heartUp`, `magicCircle`. In `playFx`, styles without `pri` are refused once `G.sfx.items.length >= 90`; styles with `pri` are refused only at `CFG.sfxCap`.
- Lower `spore.chance` from 0.35 to 0.2.
- `drawAura` cache: gradient stops `0 → 0.00`, `0.8 → 0.04`, `1 → 0.12` alpha. Edge stroke alpha 0.55. Add a dashed ring at 0.72 R, alpha 0.25, dash 6/8 units, baked into the cached canvas. Draw the cached canvas rotated by `w.pulse * 0.3` radians.

**Accept.** Run the performance snippet's setup, then `__vs.spawnBoss('boss')` and tick until it starts a `ring` skill: an sfx with key `magicCircle` exists. `G.sfx.items.filter(s => !FX_STYLE[s.key].pri).length <= 90` at all times.

**Risk.** None.

### 1.5 HUD, banner and level-up card fixes — S

**Why.** Small defects on the screens the player sees most, plus the missing answer to "how long until the boss?".

**Where.** `css/game.css`, `index.html`, `js/ui.js` (`updateHud`, `banner`, `openLevelUp`), `js/game.js` (`spawnBoss`, `updateWave`), `js/render.js` (`renderScene`).

**Design.**
- Card key overlap: `.card { position: relative }`, `.card .key { position: absolute; top: 8px; right: 10px; float: none }`, `.card .nm { padding-right: 18px }`.
- Wave progress: add `<div id="waveBar"><i></i></div>` under `#waveTxt` (120 × 4 px, `#000c` background, `#ffb3c0` fill). Width is `w.t / def.dur` in the fight phase; hidden in boss and rest phases. Include the fill percentage in the `updateHud` cache key, rounded to whole percent.
- Ten seconds before the boss: banner `Boss sắp xuất hiện!` and `SFX.play('warn')`. Use a flag on `G.wave` so it fires once.
- Banner: move `#banner` from `top: 26%` to `top: 15%` and cap the font at 36 px so it no longer covers the area around the player. Change `banner(text, sub)` to accept an optional second line rendered at 60% size. In `spawnBoss`, pass the name as `text` and the hint as `sub`.
- Player under a boss: after the sorted entity loop, if a live boss was drawn after the player and `Math.hypot(b.x - p.x, b.y - p.y) < b.r + 40`, draw the player again at `globalAlpha = 0.6`, with a 1-unit gold ring (`#ffd166`) of radius `p.r + 3` at the feet.

**Accept.** Screenshot the level-up panel: no overlap. `__vs.skipTo(0); __vs.tick(70)`: `#waveBar i` width is about 50%. With a boss placed 5 units below the player, the player sprite is visible in a screenshot.

**Risk.** None.

---

## Phase 2 — Atmosphere and presentation

### 2.1 A ground palette and decoration set per wave — M

**Why.** The wave names promise four places (graveyard, necromancer, quaking earth, final night). The screen shows one. A change of floor is the cheapest way to make progress visible, and it costs nothing per frame because the ground is pre-rendered.

**Where.** `js/render.js`: `buildGroundTiles`, `buildGround`, `drawGround`. `js/data.js`: `WAVE_DEFS`. `js/game.js`: `updateWave`.

**Design.**
- Add `ground: { tint, decor }` to each `WAVE_DEFS` entry. Tints replace the fixed `rgba(10,8,18,0.5)` overlay:
  1. `rgba(10,8,18,0.50)`, decor: tombstones, dry grass.
  2. `rgba(38,10,48,0.50)`, decor: scattered bones, rune circles (two concentric 1-unit strokes in `#7a3fb0`, alpha 0.5).
  3. `rgba(48,26,8,0.50)`, decor: cracks (3-segment dark polylines), rocks (grey 6×4-unit blocks with a 1-unit highlight).
  4. `rgba(60,6,14,0.55)`, decor: blood pools (dark red ellipses, alpha 0.5), embers (2×2 orange pixels).
- Draw decor in code into `groundCv` after the tiles and before the tint, on tiles chosen by `hash(tx, ty)`, at about 3% density. Reuse the tombstone, grass and bones code from the fallback `buildGround()`. Keep each decor inside its own tile or the tile to its right and below, and skip the last row and column, so nothing is cut at the 1024-unit wrap.
- Rebuild lazily: `renderScene` keeps `groundWave`; when it differs from `G.wave.i`, build the new canvas. This also covers `__vs.skipTo`.
- Crossfade during the rest phase: when the rest phase starts, build the next wave's canvas into `groundNext`. For the 6 s of rest, draw both with `globalAlpha = w.t / CFG.restTime` on the new one, then swap.
- The no-atlas fallback `buildGround()` takes the same tint parameter.

**Accept.** Sample the average colour of `groundCv` for waves 0–3: four different hues. Performance snippet: `ren` unchanged outside the rest phase.

**Risk.** Building a 1024² canvas takes a few milliseconds once per wave. It happens when the rest phase begins, when the screen is calm.

### 2.2 Glow layer, tinted light mask and ambient motes — M

**Why.** The scene is flat: nothing emits light. A glow under projectiles, pickups and bosses plus a coloured edge gives depth without any real lighting pass.

**Where.** `js/render.js`: new `buildGlows()`, `drawGlow()`, changes in `renderScene()` and `buildVignettes()`. `js/data.js`: `WAVE_DEFS[i].ground.light`, `CFG.glowCap`.

**Design.**
- Pre-render six 64×64 radial-gradient canvases (alpha 0.5 at the centre to 0 at the edge) in pink `#ff4d8d`, purple `#c86bff`, cyan `#7fd4ff`, gold `#ffd166`, green `#5cff9d`, red `#ff3b5c`.
- One glow pass straight after `drawSfx(true, vis)`: set `globalCompositeOperation = 'lighter'` once, draw, reset. Sources, each one `drawImage`:
  - player bullets, radius 10, by kind (skip all bullets when there are more than 80);
  - enemy shots, radius 14, purple;
  - item pickups, hearts and chests, radius 16 (remove the `fillStyle = it.color` circle now drawn for items in the gem loop);
  - xp gems only when `g.v >= 5` and there are at most 120 gems;
  - bosses, radius `e.r * 2.2`, red; elites (item 3.4), gold.
  - Stop at `CFG.glowCap = 200` glows per frame.
- Light mask: `buildVignettes()` builds the dark vignette from `WAVE_DEFS[G.wave.i].ground.light` at edge alpha 0.55, with the inner radius at 0.30 of the short side. Colours: `#05030c`, `#0c0316`, `#0d0703`, `#120205`. Rebuild when the wave changes. It stays a single `drawImage`.
- Ambient motes: 36 fixed objects in screen space, 1–2 px, alpha 0.25–0.5, drifting 4–10 px/s, drawn after the vignette. Position is `(base - cam * 0.15)` wrapped to the screen, which gives a slight parallax. Colour per wave: pale blue, violet, dust brown, ember orange.

**Accept.** Performance snippet: `ren` rises by less than 1 ms. In a frame with 300 bullets, the number of glow `drawImage` calls is at most `CFG.glowCap`.

**Risk.** `'lighter'` over a large area is the costly part. Keep glow radii small and obey the caps. If the budget is exceeded, drop the bullet glows first.

### 2.3 Boss entrance, rage moment and death sequence — M

**Why.** Bosses are the four peaks of a run, and right now they appear with a text banner and die with one explosion. Their rage phase at 50% HP changes numbers but shows nothing.

**Where.** `js/ui.js`: `frame()`, `updateHud`. `js/game.js`: `spawnBoss`, `updateBoss`, `killEnemy`, `updateWave`. `js/render.js`: `renderScene` (camera). `index.html`, `css/game.css`.

**Design.**
- Entrance: `spawnBoss` sets `G.cine = { t: 1.4, x: e.x, y: e.y }`. In `frame()`, while `G.cine.t > 0`, do not call `update()`; keep calling `updateParts` and `updateSfx`, and count the timer down with real `dt`. The camera in `renderScene` adds an offset toward the boss: ease to 70% of the way over 0.5 s, hold 0.5 s, ease back over 0.4 s. Two letterbox bars (`#cineTop`, `#cineBot`, 40 px, CSS transform transition 0.25 s) slide in. A name card `#bossCard` replaces the banner: name at 56 px VT323, hint at 22 px, a red underline that sweeps in over 0.4 s.
- Rage: the first time `e.hp < e.maxHp * 0.5`, set `e.raged = true` once, then `hitStop(0.12)`, `addShake(8)`, a red `ring` fx (from 1.3) of radius 140, and `banner(def.name, 'NỔI GIẬN!')`. While raged, draw a red glow of radius `e.r * 2.6` pulsing at 3 Hz behind the boss (use the 2.2 glow; if 2.2 is not implemented, a `rgba(255,40,70,0.18)` circle). `#bossbar` gets class `rage` (fill pulses) and a 2-px tick at 50% via `#bossbar .bar::after`.
- Boss bar trail: add `#bossghost`, a white bar behind `#bossfill` with `transition: width .4s`, so chunks of damage are visible.
- Death: `killEnemy` for a boss sets `G.slowT = 0.9`. In `frame()`, while `G.slowT > 0`, multiply the `dt` fed to the accumulator by 0.3 and count `G.slowT` down with real `dt`. Schedule five `boom` effects at random offsets within `e.r * 1.2`, one every 0.12 s of game time (a small list processed in `updateFx`), then drop the chest. `G.flashT = 0.2`, white. For the final boss, the `won` phase waits 2.2 s instead of 1.5 s.

**Accept.** After `__vs.spawnBoss('bossOgre')`, run real frames for one second: `G.t` has not advanced and `G.cine.t` is about 0.4. `__vs.tick(1)` in the same state does advance `G.t`. Set boss HP to 49% and tick once: `G.boss.raged === true` and `#bossbar` has class `rage`.

**Risk.** The intro must not stall bots and checks, which is why it lives in `frame()`.

### 2.4 Experience gems: merging, pickup pitch ladder, level-up shockwave — S

**Why.** Collecting XP is the most frequent action in the game and has one flat sound. Late in a run the floor is carpeted with gems, which costs draw time and hides pickups.

**Where.** `js/game.js`: `dropGem`, `updateGems`, `addXp`. `js/audio.js`: `SFX.play`. `js/render.js`: `SHAPES.xp`. `js/ui.js`: `choose`, `updateHud`. `css/game.css`.

**Design.**
- Merge on drop: when there are more than 150 gems, `dropGem` checks the last 12 entries of `G.gems.items`; if one is an xp gem within 28 units, add the value to it. Kills from area weapons are close together, so this catches most of them at a cost of 12 distance checks.
- A fourth tier: `g.v >= 20` is gold `#ffd166`, size 8, and always gets a glow.
- Pitch ladder: `SFX.play(name, rate = 1)` gains an optional playback-rate argument, applied to file playback and to synth frequencies. In `updateGems`, keep `gemStreak`: if the previous xp pickup was under 0.25 s ago, `gemStreak = min(gemStreak + 1, 12)`, otherwise 0. Play `'gem'` at `1 + gemStreak * 0.05`.
- XP bar: toggle a `gain` class on `#xpfill` for 120 ms on each pickup (brightness 1.6).
- Level-up shockwave: when `addXp` raises the level, push every non-boss enemy within 120 units (same code as 1.3, strength 320, no damage) and play a gold `ring` fx. In `choose()`, when the panel closes, set `p.iframe = Math.max(p.iframe, 0.5)`.

**Accept.** Kill 600 slimes in one spot with `__vs.spawn` and `detonate()`: gem count stays under 200 and the total xp value equals the sum of the kills. Level up while surrounded: no enemy is within 60 units 0.2 s later.

**Risk.** None.

---

## Phase 3 — Mechanics depth

Do 3.1 to 3.6 before 3.7. Each of them shifts the balance, and 3.7 retunes once at the end.

### 3.1 Dash — M

**Why.** The telegraphs are already good (charge lanes, slam circles, bullet rings), but the only answer is to walk. One skill move with a cooldown gives the player something to be good at.

**Where.** `js/data.js`: `CFG.dash`. `js/input.js`: keydown handler, new touch button. `js/game.js`: `update`, `hurtPlayer`, `newPlayer`. `js/render.js`: player draw in `renderScene`. `js/audio.js`: `defs.dash`. `index.html`, `css/game.css`. `tools/balance-bot.js`.

**Design.**
- `CFG.dash = { speed: 520, dur: 0.16, cd: 2.2, iframe: 0.26 }`. Distance is about 83 units, which clears a boss charge lane (half-width about 22) and a slam circle (radius 44).
- Input: `Space`, `ShiftLeft`, `ShiftRight` call `tryDash()` when `G.state === 'play'`. `Space` still starts the game from the menu and end screens. Touch: `<button id="dashBtn">` 72 px, bottom-right with safe-area insets, `pointer-events: auto`, shown only under `(hover: none) and (pointer: coarse)`. It reacts on `pointerdown`. It is a separate element above the canvas, so it does not start the joystick, and the joystick's pointer id is untouched.
- Logic: `tryDash()` needs `p.dashCd <= 0`. Direction is the current input vector, or `p.dirX, p.dirY` when there is no input. It sets `p.dashT = dur`, `p.dashCd = cd`, `p.iframe = Math.max(p.iframe, CFG.dash.iframe)`. In `update`, while `p.dashT > 0`, the player moves along the locked direction at `CFG.dash.speed` and input is ignored.
- Visuals: no invulnerability blink while `p.dashT > 0`. Keep a ring buffer of the last three positions (one per two steps) and draw the player sprite there at alpha 0.35, 0.22 and 0.10. Under the player's HP bar, a 22 × 1-unit cyan bar (`#7fd4ff`) fills as the cooldown recovers and is hidden when ready. `#dashBtn` shows the same with a `conic-gradient`.
- Sound: synth `dash`: `s.noise(0.08, 0.12, 3000, t)` plus `s.tone('triangle', 500, 900, 0.08, 0.06, t)`.
- Menu hint: add `<kbd>Space</kbd> lướt né` to the keyboard line, and `Nút tròn bên phải để lướt né.` to the touch line.
- Bot: in `tools/balance-bot.js`, dispatch `Space` when the player is inside a zone with `z.t < 0.3` or inside an active charge lane.

**Accept.** Hold `KeyD`, dispatch `Space`, `__vs.tick(0.16)`: the player moved about 83 units (±5) instead of 24. `hurtPlayer(10)` during the dash leaves HP unchanged. A second `Space` inside 2.2 s does nothing. Check 0 of the existing suite (hold D through level-up) still passes.

**Risk.** Makes boss skills easier to dodge. Item 3.5 gives bosses more to throw.

### 3.2 Weapon and passive slots, guaranteed useful offers, reroll — M

**Why.** With six weapons and eight passives all obtainable, every run converges on the same build. A limit of four and four makes each new pick exclude something, which is what makes it a decision.

**Where.** `js/data.js`: `CFG.slots`, `CFG.rerolls`. `js/ui.js`: `openLevelUp`, `renderOwned`, `renderPause`. `js/input.js`. `index.html`, `css/game.css`.

**Design.**
- `CFG.slots = { weapons: 4, passives: 4 }`, `CFG.rerolls = 2` per run (`G.rerolls`, reset in `resetWorld`).
- Pool filter in `openLevelUp`: when the player owns four weapons, weapons not owned leave the pool; the same for passives.
- Offer rules, applied in this order after shuffling:
  1. No duplicates.
  2. If the player owns fewer than two weapons and `G.level <= 6`, one card is a new weapon.
  3. If any owned item can be upgraded, at least one card upgrades an owned item.
  4. Fill the remaining cards from the pool; if the pool has fewer than three entries, add `FALLBACK_UPGRADE` as now.
- Reroll: a button `#rerollBtn` under the cards, text `Đổi thẻ (2)`, key `R`, disabled at 0. It draws three new cards, excluding the ones shown when the pool allows it. It respects the 0.35 s card lock.
- HUD: `#ownedW` and `#ownedP` each show four boxes; empty slots are dashed boxes (`border: 1px dashed var(--line)`). The pause panel's equipment list shows `Vũ khí 3/4` and `Bị động 2/4` headings.
- Card sub-label for a new item: `Vũ khí mới · ô 3/4`.

**Accept.** Give four weapons, then open 50 level-ups: no unowned weapon is ever offered. With one weapon at level 3, 50 level-ups always include a new-weapon card. Reroll decrements `G.rerolls` and changes the offered ids.

**Risk.** Fewer weapons means less screen coverage, but levels concentrate into them. Retune in 3.7.

### 3.3 Weapon evolutions — L

**Why.** Slots create a constraint; evolutions create a goal. "Take the passive that evolves my weapon" is the planning layer this genre runs on, and it gives passives a second purpose.

**Where.** `js/data.js`: new `EVOLUTIONS` table, weapon `update` functions. `js/game.js`: `updateBullets`, `updateEnemies`, `updateFx`, `strike`, `killEnemy`, `hurtPlayer`. `js/ui.js`: `openLevelUp`, `choose`, `chip`, `__vs`. `js/render.js`: `drawOrbit`, `drawAura`, `drawFx`, `SHAPES.bolt`. `css/game.css`.

**Design.**
- Rule: a weapon at level 8 whose paired passive is at level 3 or higher is eligible. On the next level-up, the first card is its evolution (`kind: 'evo'`, gold border, label `TIẾN HOÁ`). Taking it sets `w.evo = true` and `p.levels[id] = 9`. The HUD chip shows `★` instead of the level and gets class `evo`.
- Discovery: once a weapon is owned, its card and its pause-panel row show `Tiến hoá: cần {tên bị động} cấp 3` in small gold text.
- The table (weapon + passive → name: effect):

| Weapon | Passive | Evolution | Effect |
|---|---|---|---|
| `bolt` | `might` | Huyết Vũ | `count += 2`, `cd *= 0.75`. On its first hit each bolt spawns two shards at ±35° from its direction: 40% damage, pierce 1, life 0.35 s, radius 3. Mark the bolt `split` so it happens once. Darker crimson streak. |
| `orbit` | `area` | Nguyệt Thực | A second ring: radius × 1.75, three blades, rotating at `-spin * 0.7`. `hitCd` 0.45 → 0.30, `dmg *= 1.25`. |
| `lightning` | `haste` | Thiên Lôi | Each strike chains to up to three more enemies, each within 90 units of the previous target, each doing 60% of the previous damage. Draw each link with a new fx type `chain` (a jagged 4-point polyline, life 0.15 s). `cd *= 0.85`. |
| `knife` | `swift` | Vạn Đao | `pierce = 99`, `dmg *= 1.2`. Knives return: when `life` runs out the knife clears `b.hit`, turns and homes on the player at the same speed for up to 0.8 s, and is removed on reaching the player. |
| `aura` | `regen` | Huyết Trường | `radius *= 1.25`, `dmg *= 1.5`. Each enemy that dies inside the aura heals 0.5 HP, capped at 4 HP per second. The aura cache is drawn in crimson (`255,70,90`). |
| `nova` | `armor` | Địa Chấn | `count = 3`, `maxR *= 1.2`. Each hit stuns a non-boss enemy for 0.6 s (`e.stunT`; in `updateEnemies` a stunned enemy skips movement and contact damage, like `frozen`). Bosses are slowed 30% for 0.6 s instead. When the player is hurt, one free wave fires (internal cooldown 4 s). |

- `vital` and `magnet` have no evolution and stay generic picks.
- Hooks: `__vs.evolve(id)`.

**Accept.** `__vs.give('bolt', 8); __vs.give('might', 3);` then force a level-up: `G.choices[0].kind === 'evo'`. For each evolution, `__vs.evolve(id)` followed by `__vs.tick(10)` among 100 skeletons runs without errors and deals more damage than the level-8 weapon over the same time (compare with the counters from 3.6, or by kills).

**Risk.** The stun on `nova` is strong crowd control; the 0.6 s value is deliberately short. `knife` return bullets live up to 1.6 s, so watch the bullet count with `count` at 4.

### 3.4 Enemy variety from tinted variants, and elites — L

**Why.** Five enemy types, four of which do the same thing: walk at the player. Different behaviours force different movement. The atlas has no unused monster sprites, so variants are recoloured and rescaled versions of existing ones.

**Where.** `js/render.js`: `Assets` (new `tinted`), `draw`, `drawTelegraph`, `SHAPES`. `js/data.js`: `SPRITES`, `ENEMIES`, `WAVE_DEFS`. `js/game.js`: `spawnEnemy`, `updateEnemies`, `killEnemy`, `addZone`, `updateZones`, `updateWave`.

**Design.**
- Tint infrastructure: `SPRITES[kind].tint = [color, alpha]`. At load, for each distinct tint, make a copy of the atlas image with `source-atop` fill (same technique as `whiten`), register it in `Assets.imgs` under `ATLAS_SRC + '#' + color`, and point that kind's `ASSETS` entry at it. `draw()` is unchanged, so there is no per-frame cost. Also give the tinted copy a `white` version.
- Per-entity scale: `draw()` multiplies `m.scale` by `e.sc || 1`.
- New entries in `ENEMIES` (with `SHAPES` fallbacks mapped to the base shape):
  - `bomber`, "Quỷ nổ": imp sprite, tint `['#ff9a3d', 0.45]`, scale 1.35. `hp 10, speed 125, dmg 0, r 10, xp 3, mass 0.6, cap 8`. When closer than 46 units to the player, or when killed, it calls `addZone(e.x, e.y, 40, 0.55, 14 * e.dmgScale)` and removes itself. Self-detonation gives no kill credit and no xp. Zones gain a flag `hitsEnemies`: a bomber zone also deals 30 damage to enemies inside it, so the player can bait bombers into a crowd.
  - `splitter`, "Nhớt mẹ": swampy sprite, scale 2.4. `hp 70, speed 40, dmg 11, r 18, xp 4, mass 3`. On death it spawns three `slime` 12 units away at 120° spacing, each with an outward knockback of 120.
  - `charger`, "Kỵ sĩ xương": skeleton sprite, tint `['#6fa8ff', 0.4]`, scale 1.6. `hp 45, speed 60, dmg 14, r 12, xp 5, mass 1.5, cap 6`. When 70 < distance < 190 and its cooldown is ready: stop for 0.5 s with `e.tele = true` and a thin red lane 150 units long (a small branch in `drawTelegraph`), then move at 380 units/s for 0.4 s in the locked direction. Cooldown 4 s. Write a separate `updateCharger`; `updateBoss` is only for bosses.
- Elites: `spawnElite(type)` spawns a `skeleton`, `ghost` or `golem` with `hp × 10`, `e.sc = 1.5`, `r × 1.4`, `dmg × 1.5`, `e.elite = true`. It has a gold glow (2.2) or a gold backlight circle, and a 20 × 2-unit HP bar above it. On death: one item from `rollItem()` and one gem worth 25 xp. Schedule with `WAVE_DEFS[i].elites` in seconds of the fight phase: wave 1 `[90]`, waves 2 to 4 `[60, 110]`. Play `SFX.play('warn')` on spawn.
- Wave mixes: wave 1 adds `splitter: 0.5` from t = 70. Wave 2 adds `bomber: 1` from t = 30 and `charger: 1` from t = 110. Wave 3 adds `bomber: 2, charger: 2, splitter: 1`. Wave 4 adds `bomber: 2, charger: 3, splitter: 1`.

**Accept.** A bomber spawned 30 units from the player creates a zone and is gone within one step. Killing a `splitter` raises the slime count by three. A `charger` 150 units away enters `tele`, then covers about 150 units in 0.4 s. `Assets.get('bomber')` returns an image different from `Assets.get('bat')`. With `ASSETS` emptied, all new kinds still draw through `SHAPES`.

**Risk.** Bomber zones are drawn by `drawZones` with three fills each; `cap: 8` bounds that. Chargers in a crowd are hard to read, hence the cap of 6 and the lane.

### 3.5 Boss soft enrage and one new second-phase skill each — M

**Why.** Boss fights last anywhere from 29 to 205 seconds and the bot took no damage from any boss skill. With dash in the game, bosses need more to say, and a fight that drags should escalate instead of stalling.

**Where.** `js/data.js`: `ENEMIES` boss entries, `BOSS_SKILLS`, `CFG.enrage`. `js/game.js`: `startSkill`, `updateBoss`. `js/render.js`: `drawTelegraph`.

**Design.**
- Soft enrage: `CFG.enrage = { after: 75, every: 15, step: 0.1, max: 0.5 }`. A boss alive for more than 75 s gains `e.haste += 0.1` every 15 s up to 0.5. Skill cooldowns and telegraph times are divided by `1 + e.haste`. Each step plays the red `ring` fx.
- Each boss gets `skills2`, added to its list while `e.raged` (below 50% HP):
  - `bossZombie`: `quake`. After a `charge` ends, three slam zones (radius 36, 16 damage) appear along the last 120 units of the charge path, 0.15 s apart, with a 0.6 s warning.
  - `bossNecro`: `wall`. A ring of 20 shots at speed 110 with a gap of four consecutive shots, then a second ring 0.6 s later with the gap rotated by 90°. Telegraph: the purple quarter-arc where the first gap will be, drawn for 0.6 s.
  - `bossOgre`: `boulders`. Five zones (radius 30, 18 damage) in a line from the boss toward the player, 55 units apart, 0.18 s apart, 0.9 s warning on the first.
  - `boss`: `rings`. Three rings of 16 shots, 0.5 s apart, each rotated by half a step from the previous one, speed 125.
- Contact damage is unchanged.

**Accept.** A boss kept alive for 90 s of `__vs.tick` has `e.haste >= 0.1`. Each boss at 40% HP uses its `skills2` skill at least once in 60 s. Each new skill creates its zones or shots only after its telegraph time.

**Risk.** `wall` and `rings` add up to 48 shots at once. The shot pool handles it; check `ren` with the performance snippet plus the final boss.

### 3.6 Damage attribution and a real run summary — S

**Why.** The player cannot tell which weapon is carrying the run, so they cannot learn to build better. Tuning needs the same data.

**Where.** `js/game.js`: `hitEnemy`, `hurtPlayer` and every caller, `resetWorld`. `js/ui.js`: `endRun`, `renderPause`. `index.html`, `css/game.css`. `tools/balance-bot.js`.

**Design.**
- `hitEnemy(e, dmg, kx, ky, kb, fx, src)`: `src` is the weapon id, or `'bomb'`, or `'zone'`. Add `Math.min(dmg, e.hp)` to `G.stats.dmg[src]` (skip props). `fireBullet` stores the source on the bullet. `strike`, the aura branch in `updateEnemies`, the orbit hit and the nova hit pass their id.
- `hurtPlayer(dmg, src)`: contact passes `e.type`, shots pass `'shot'`, zones pass `'zone'`. Add the HP actually lost to `G.stats.taken[src]`.
- `G.stats.since[id]` records `G.t` when a weapon is first obtained.
- End screen: under the four tiles, a list `Sát thương theo vũ khí`. One row per weapon owned: icon, name, total, share as a bar, and damage per second since it was obtained. Sorted by total. A second line `Nguồn sát thương nhận vào: …` names the top two sources.
- The pause panel shows the same weapon list.
- `tools/balance-bot.js` reads `G.stats` and stops replacing `window.hurtPlayer`.

**Accept.** After a fight, the sum of `G.stats.dmg` equals the sum of HP removed from non-prop enemies within 1%. The end panel lists exactly the owned weapons.

**Risk.** None. One addition per hit.

### 3.7 Retune against stated targets — M

**Why.** Items 1.3, 3.1 to 3.5 all change difficulty. Tune once, at the end, against numbers.

**Where.** `js/data.js` only: `WAVE_DEFS`, `ENEMIES`, `CFG.hpScalePerMin`, `CFG.dmgScalePerMin`, boss HP.

**Design.** Run `runBot()` five times per configuration (start it with `setTimeout`, read the result later, as `CLAUDE.md` explains). Targets for the bot with the 3.1 dash logic:

| Measure | Baseline before V4 | Target |
|---|---|---|
| First minute with damage taken | minute 2 to 5 | within the first 75 s in at least 4 of 5 runs |
| Share of damage taken from boss skills and shots | 0% | 15% to 35% |
| Boss kill time | 29 to 205 s | 30 to 80 s |
| Boss clear rate, bosses 1/2/3/4 | 3/3, 2/3, 0/3, 0/3 | 5/5, 4/5, 3/5, 1 or 2 of 5 |
| Length of a winning run | no win observed | 11 to 14 minutes |

Levers to try first, one at a time:
- Opening: wave 1 `dur 140 → 110`, `rate [0.7, 2.4] → [1.1, 3.0]`, and an extra swarm of 20 `bat` at t = 45.
- Mid-run cliff: `CFG.hpScalePerMin 0.30 → 0.26`; wave 3 `rate [3.6, 6.0] → [3.2, 5.4]`.
- Boss length: `bossZombie.hp 600 → 750`. The upper end is now bounded by the 3.5 enrage.

Record the final numbers and the five-run results in the "Trạng thái" section of `CLAUDE.md`.

**Accept.** The five-run table meets the targets, or the write-up says which target was missed and by how much.

**Risk.** The bot is a "decent" player, not a human. Say so in the write-up; human testing is still owed.

---

## Phase 4 — Reasons to play again

### 4.1 Souls and permanent upgrades — M

**Why.** A lost run currently gives nothing. A small permanent gain turns "I died in wave 3" into progress and gives a reason for one more run.

**Where.** `js/data.js`: new `META_UPGRADES`, `CFG.souls`. `js/game.js`: `newPlayer`. `js/ui.js`: `endRun`, new menu panel. `index.html`, `css/game.css`.

**Design.**
- Souls earned at `endRun`: `floor(kills / 25) + 30 per boss killed + 100 for a win`. Show `+N linh hồn` on the end screen with a count-up over 0.8 s.
- Stored in `localStorage` as `vs_meta = { souls, up: {}, unlocked: [], runs }`.
- Six upgrades, five levels each, costs 40 / 80 / 140 / 220 / 320:

| id | Name | Per level |
|---|---|---|
| `hp` | Sinh lực | +8 max HP |
| `dmg` | Sức mạnh | +4% damage |
| `spd` | Nhanh nhẹn | +3% move speed |
| `mag` | Nam châm | +10% pickup radius |
| `xp` | Ham học | +5% experience |
| `roll` | Đổi vận | +1 reroll per run at levels 2 and 4; +5% item drop chance at levels 1, 3 and 5 |

- Menu: two buttons, `Bắt đầu` and `Nâng cấp vĩnh viễn`. The second opens a panel with six cards (icon, name, five pips, cost, buy button) and the soul total. A `Đặt lại` link refunds everything after a confirm step.
- Applied in `newPlayer()`.

**Accept.** A run with 250 kills and one boss gives 40 souls. Buying `hp` level 1 costs 40 and the next run starts with 128 HP. Reloading the page keeps the purchase.

**Risk.** The full set is +40 HP and +20% damage, a modest edge. Item 4.3 gives strong players somewhere to go.

### 4.2 Choice of starting weapon, with unlocks — M

**Why.** Every run starts with the same bolt, so the first two minutes always play the same. A different first weapon changes the whole opening without any new art.

**Where.** `js/data.js`: new `UNLOCKS`. `js/game.js`: `newPlayer(startId)`. `js/ui.js`: `startGame`, `endRun`, menu. `index.html`, `css/game.css`.

**Design.**
- The menu shows a row of six weapon icons. Locked ones are dimmed and show the condition on hover or tap. The selection is stored as `vs_start`.
- Unlock conditions, checked at `endRun`:

| Weapon | Condition | Text |
|---|---|---|
| `bolt` | always | — |
| `knife` | reach wave 2 | Đến đợt 2 |
| `aura` | 500 kills in one run | Hạ 500 quái trong một ván |
| `orbit` | defeat the first boss | Hạ Vua Thây Ma |
| `lightning` | defeat the second boss | Hạ Đại Pháp Sư Tử Linh |
| `nova` | evolve any weapon | Tiến hoá một vũ khí bất kỳ |

- On unlock, the end screen shows `Mở khoá: bắt đầu với {tên vũ khí}`.
- All weapons stay obtainable during a run whether or not they are unlocked as a starting choice. Nothing is removed from the level-up pool.

**Accept.** With empty storage only `bolt` is selectable. A run that reaches wave 2 unlocks `knife`; starting with it gives `p.levels` equal to `{ knife: 1 }`.

**Risk.** `aura` and `nova` as sole starting weapons have short range. Check that the first minute is survivable with each; if not, give that start one free passive.

### 4.3 Nightmare difficulty and endless continuation — S to M

**Why.** After the first win there is nothing left to do.

**Where.** `js/data.js`: `CFG.nightmare`, `CFG.endless`. `js/game.js`: `spawnEnemy`, `spawn`, `updateWave`, `waveDef`. `js/ui.js`: `endRun`, menu, best-record text.

**Design.**
- After the first win (stored in `vs_meta`), the menu shows a toggle `Ác mộng`: `CFG.nightmare = { hp: 1.5, dmg: 1.3, rate: 1.25 }`, souls × 1.5. Its best record is stored separately as `vs_best_nm`.
- The victory panel gets a second button, `Tiếp tục (vô tận)`. The run resumes with wave index 4 and up: `waveDef()` returns wave 4's definition with `rate × (1 + 0.15 × n)`, enemy HP × `1.5^n`, and a random boss, where `n` is the number of endless waves started. The HUD shows `ĐỢT 5`, `ĐỢT 6` and so on. The best record keeps the highest wave.

**Accept.** With the win flag set, the toggle appears and a nightmare run spawns skeletons with 1.5 × the HP of a normal run at the same `G.diffT`. After a win, `Tiếp tục (vô tận)` returns to `play` with `G.wave.i === 4`.

**Risk.** Endless will reach `CFG.spawn.maxEnemies` quickly. That cap is the safeguard; do not raise it.

---

## Not recommended

- **A WebGL or engine rewrite, `ctx.filter` or `shadowBlur` bloom, per-entity dynamic lights.** The glow layer and light mask in 2.2 get most of the look at a fraction of the cost. Canvas filters are slow at this entity count.
- **A tile map with walls and obstacles.** It needs collision and pathfinding for 450 enemies and breaks the ring spawns and surround events.
- **Boss arena walls.** They conflict with the open-field kiting the game is built on and with enemies spawning off-screen. Dash and the soft enrage solve the "kite forever" problem instead.
- **New weapons before slots and evolutions exist.** More content in a system with no build identity changes nothing. After Phase 3, a seventh weapon is worth considering.
- **A critical-hit system.** It adds random variance to numbers without adding a decision.
- **Hit-stop on every hit.** With area weapons it would freeze the game continuously. Keep it for big kills, player damage and boss moments.
- **New hero characters or tile sets now.** The atlas has one hero and one floor set, and `vendor/` is gone. It would need the 0x72 DungeonTileset II v1.7 pack again (CC0, itch.io; needs download and the user's approval). Item 4.2 gives run variety with no new art.
- **Online leaderboards or accounts.** Out of proportion for a single-file-style static game.
