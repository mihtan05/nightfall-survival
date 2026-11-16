'use strict';
/* =========================================================
   LÊN CẤP: chọn thẻ, đổi thẻ, tiến hoá; bảng sát thương theo vũ khí
   (tách từ ui.js ở C1; các file ui-*.js nạp trước ui.js — chỉ khai báo hàm/biến và gắn sự kiện,
   mọi lệnh chạy ngay lúc tải nằm cuối ui.js)
   ========================================================= */
/* ---------- Lên cấp ---------- */
let cardLockUntil = 0;
const ownedCount = (p, kind) => UPGRADES.filter(u => u.kind === kind && p.levels[u.id]).length;
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
/* Chọn 3 thẻ: hết ô thì không mời vũ khí/bị động mới; ít vũ khí đầu trận thì luôn có 1 vũ khí mới;
   có món nâng được thì luôn có ít nhất 1 thẻ nâng món đang có. exclude: id các thẻ vừa bị đổi. */
function rollChoices(exclude = []) {
  const p = G.player, own = id => p.levels[id] || 0;
  const nW = ownedCount(p, 'weapon'), nP = ownedCount(p, 'passive');
  const pool = shuffle(UPGRADES.filter(u => own(u.id) < u.max && (own(u.id) || (u.kind === 'weapon' ? nW < CFG.slots.weapons : nP < CFG.slots.passives))));
  let src = pool.filter(u => !exclude.includes(u.id)); if (src.length < 3) src = pool;
  const picks = [], take = f => { const u = src.find(x => !picks.includes(x) && f(x)); if (u) picks.push(u); };
  // tiến hoá sẵn sàng → luôn là thẻ đầu
  const evoId = Object.keys(EVOLUTIONS).find(id => own(id) === 8 && own(EVOLUTIONS[id].passive) >= CFG.evo.passiveLvl);
  if (evoId) picks.push(evoCard(evoId));
  if (nW < 2 && G.level <= 6) take(u => u.kind === 'weapon' && !own(u.id));
  take(u => own(u.id) > 0);
  take(() => true); take(() => true); take(() => true);
  picks.length = Math.min(picks.length, 3);
  if (!evoId) shuffle(picks);
  if (picks.length < 3) picks.push(FALLBACK_UPGRADE);
  return picks;
}
function evoCard(id) {
  const E = EVOLUTIONS[id], W = WEAPONS[id];
  return { id, kind: 'evo', name: E.name, icon: W.icon, max: 9, desc: () => E.desc,
    apply: p => { const w = p.weapons[id]; w.evo = true; G.evolved = true; E.apply(w); bookAdd('evo:' + id); } };
}
// Gợi ý cách tiến hoá cho vũ khí đang có
const evoHint = id => EVOLUTIONS[id] ? `Tiến hoá: cần ${PASSIVES.find(x => x.id === EVOLUTIONS[id].passive).name} cấp ${CFG.evo.passiveLvl}` : '';
const mkEl = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt !== undefined) e.textContent = txt; return e; };
/* Dải chấm cấp: đã có = đầy, cấp sắp lấy = nhấp nháy, cấp cột mốc (4, 8) hình thoi; ngôi sao cuối = tiến hoá */
function pipsEl(cur, next, max, kind, evoAble) {
  const d = mkEl('div', 'pips8'); d.setAttribute('aria-hidden', 'true');
  for (let i = 1; i <= max; i++) {
    const ms = kind === 'weapon' && (i === CFG.tiers.t2 || i === CFG.tiers.t3);
    d.append(mkEl('i', (ms ? 'ms ' : '') + (i <= cur ? 'on' : i === next ? 'nx' : '')));
  }
  if (evoAble) d.append(mkEl('i', 'star' + (cur >= 9 ? ' on' : next === 9 ? ' nx' : ''), '★'));
  return d;
}
/* Dòng "trước → sau" tính từ chính hàm nâng cấp: áp f lên bản sao trạng thái vũ khí rồi so các trường số có nhãn trong STAT_LABELS */
function statDiff(id, w, f) {
  const a = { ...w }, b = { ...w }; f(b);
  const out = [];
  for (const k in STAT_LABELS) {
    if (typeof a[k] !== 'number' || a[k] === b[k]) continue;
    const [lab, fmt] = STAT_LABELS[k], A = fmt(a[k]), B = fmt(b[k]);
    if (String(A) !== String(B)) out.push(`${k === 'count' ? COUNT_NAMES[id] || lab : lab} ${A} → ${B}`);
  }
  return out;
}
/* Công thức tiến hoá dạng hình: [icon vũ khí n/8] + [icon bị động n/3] → tên tiến hoá; phần chưa đạt thì mờ */
function evoRecipe(id, wl, pl) {
  const E = EVOLUTIONS[id]; if (!E) return null;
  const P = PASSIVES.find(x => x.id === E.passive), need = CFG.evo.passiveLvl, d = mkEl('div', 'recipe');
  const part = (key, glyph, txt, ok) => { const s = mkEl('span', 'rp' + (ok ? ' ok' : '')); s.append(iconEl(key, glyph), mkEl('b', '', txt)); return s; };
  d.append(part(id, WEAPONS[id].icon, `${Math.min(wl, 8)}/8`, wl >= 8), mkEl('span', 'op', '+'),
    part(P.id, P.icon, `${Math.min(pl, need)}/${need}`, pl >= need), mkEl('span', 'op', '→'), mkEl('span', 'rn' + (wl >= 8 && pl >= need ? ' ok' : ''), E.name));
  d.title = `Tiến hoá ${E.name}: ${WEAPONS[id].name} cấp 8 + ${P.name} cấp ${need}`;
  return d;
}
// Mốc kế tiếp của vũ khí ở cấp l: { lv, name } hoặc null
function nextMilestone(id, l) {
  const L = WEAPONS[id].levels;
  for (let k = l + 1; k <= L.length + 1; k++) if (L[k - 2] && L[k - 2].ms) return { lv: k, name: L[k - 2].ms };
  return null;
}
function openLevelUp() {
  // KHÔNG xả phím/joystick ở đây: người chơi vẫn đang giữ hướng, chọn thẻ xong phải chạy tiếp ngay.
  G.state = 'levelup';
  G.choices = rollChoices();
  $('luTitle').textContent = (G.chestOpen ? 'Rương báu!' : 'Lên cấp!') + (G.pending > 1 ? ` (còn ${G.pending} lượt)` : '');
  renderCards();
  show('levelup', true);
  SFX.play('level');
}
/* Thẻ nâng cấp (V5 Phase 4): dải chấm cấp, dòng "trước → sau" tính từ hàm nâng cấp, thẻ CỘT MỐC (cấp 4/8) có viền riêng,
   công thức tiến hoá dạng hình trên thẻ vũ khí và trên thẻ bị động ghép đôi. */
function renderCards() {
  const p = G.player, box = $('cards'); box.replaceChildren();
  const nW = ownedCount(p, 'weapon'), nP = ownedCount(p, 'passive');
  G.choices.forEach((u, idx) => {
    const cur = u.kind === 'evo' ? 8 : p.levels[u.id] || 0, next = u.kind === 'evo' ? 9 : cur + 1;
    const lvDef = u.kind === 'weapon' && next >= 2 ? WEAPONS[u.id].levels[next - 2] : null, ms = lvDef && lvDef.ms;
    const b = mkEl('button', 'card' + (u.kind === 'weapon' ? ' weapon' : u.kind === 'evo' ? ' evo' : '') + (ms ? ' ms' : ''));
    b.innerHTML = `<span class="key">${idx + 1}</span><div class="top"><div class="ic"></div><div><div class="nm"></div><div class="lv ${cur ? '' : 'new'}"></div></div></div>`;
    b.querySelector('.ic').append(iconEl(u.id, u.icon));
    b.querySelector('.nm').textContent = u.name;
    b.querySelector('.lv').textContent = u.kind === 'evo' ? `TIẾN HOÁ · ${WEAPONS[u.id].name}` : u.kind === 'item' ? 'Vật phẩm' : cur ? `Cấp ${cur} → ${next}`
      : u.kind === 'weapon' ? `Vũ khí mới ${nW + 1}/${CFG.slots.weapons}` : `Bị động mới ${nP + 1}/${CFG.slots.passives}`;
    if (u.kind === 'weapon' || u.kind === 'evo') b.append(pipsEl(cur, next, 8, 'weapon', !!EVOLUTIONS[u.id]));
    else if (u.kind === 'passive') b.append(pipsEl(cur, next, u.max, 'passive', false));
    if (ms) { const t = mkEl('div', 'mstag'); t.append(mkEl('span', 'tag', 'CỘT MỐC'), mkEl('b', '', ms)); b.append(t); }
    b.append(mkEl('div', 'ds', u.desc(next)));
    const w = p.weapons[u.id];
    let diff = [];
    if (u.kind === 'weapon' && cur && w) diff = statDiff(u.id, w, lvDef.f);
    else if (u.kind === 'evo' && w) diff = statDiff(u.id, w, x => { x.evo = true; EVOLUTIONS[u.id].apply(x); });
    else if (u.kind === 'passive' && u.tot) diff = [cur ? `Tổng ${u.tot(cur)} → ${u.tot(next)}` : `Tổng ${u.tot(next)}`];
    if (diff.length) { const ul = mkEl('ul', 'diff'); for (const t of diff) ul.append(mkEl('li', '', t)); b.append(ul); }
    if (u.kind === 'weapon' && EVOLUTIONS[u.id]) b.append(evoRecipe(u.id, next, p.levels[EVOLUTIONS[u.id].passive] || 0));
    if (u.kind === 'passive') {
      const evoId = Object.keys(EVOLUTIONS).find(k => EVOLUTIONS[k].passive === u.id && p.levels[k]);
      if (evoId) { b.append(mkEl('div', 'evoh', `Cần cho tiến hoá: ${EVOLUTIONS[evoId].name}`)); b.append(evoRecipe(evoId, p.levels[evoId], next)); }
    }
    b.addEventListener('click', () => choose(u));
    box.append(b);
  });
  const rb = $('rerollBtn'); rb.textContent = `Đổi thẻ (${G.rerolls})`; rb.disabled = G.rerolls <= 0;
  // khoá bấm 0.35 giây: ngón tay đang kéo joystick / phím đang gõ không chọn nhầm thẻ
  cardLockUntil = performance.now() + 350;
  box.classList.add('locked'); setTimeout(() => box.classList.remove('locked'), 350);
}
function reroll(force) {
  if (G.state !== 'levelup' || G.rerolls <= 0) return false;
  if (!force && performance.now() < cardLockUntil) return false;
  G.rerolls--; G.choices = rollChoices(G.choices.map(u => u.id)); renderCards(); SFX.play('select');
  return true;
}

function choose(u, force) {
  if (G.state !== 'levelup') return;
  if (!force && performance.now() < cardLockUntil) return;
  const p = G.player, l = (p.levels[u.id] || 0) + 1;
  if (u.kind !== 'item') p.levels[u.id] = l;
  u.apply(p, l);
  upgradeCue(u);
  G.pending--; SFX.play('select'); renderOwned();
  p.iframe = Math.max(p.iframe, 0.5); // vừa đóng bảng chọn: 0.5 giây bất tử để định hướng lại
  show('levelup', false);
  G.state = 'play';
  if (G.pending > 0) openLevelUp(); else G.chestOpen = false;
}

/* Khoảnh khắc nâng cấp vũ khí (V5 Phase 3): vòng màu vũ khí quanh người, icon bay lên, và vũ khí bắn NGAY
   (đặt hồi chiêu về 0) để người chơi thấy luôn cái vừa mua. */
function upgradeCue(u) {
  if (u.kind !== 'weapon' && u.kind !== 'evo') return;
  const p = G.player, w = p.weapons[u.id], L = WEAPON_LOOK[u.id]; if (!w || !L) return;
  w.timer = 0;
  // âm riêng: tiến hoá / lên bậc (cấp 4, 8 — cũng là cột mốc)
  if (u.kind === 'evo') SFX.play('evolve'); else if ((w.lv || 1) === CFG.tiers.t2 || (w.lv || 1) === CFG.tiers.t3) SFX.play('tierUp');
  const f = addFx('ring', p.x, p.y, CFG.upgradeCue.ringLife); f.maxR = CFG.upgradeCue.ring; f.color = weaponLook(w).col;
  const el = document.createElement('div'); el.className = 'upfloat'; el.style.setProperty('--c', weaponLook(w).col);
  el.append(iconEl(u.id, WEAPONS[u.id].icon)); document.getElementById('hud').append(el);
  setTimeout(() => el.remove(), 1000);
}

/* ---------- Bảng sát thương theo vũ khí (kết thúc + tạm dừng) ---------- */
const SRC_NAMES = { bat: 'Tiểu quỷ', slime: 'Nhớt', skeleton: 'Bộ xương', ghost: 'Pháp sư tử linh', golem: 'Quỷ khổng lồ', shot: 'Đạn phép', zone: 'Vùng nổ',
  bomber: 'Quỷ nổ', splitter: 'Nhớt mẹ', charger: 'Kỵ sĩ xương' };
const srcName = k => SRC_NAMES[k] || (ENEMIES[k] && ENEMIES[k].name) || k;
const fmtNum = v => v >= 10000 ? Math.round(v / 1000) + 'k' : v >= 1000 ? (v / 1000).toFixed(1) + 'k' : String(Math.round(v));
function renderDmgList(el) {
  const p = G.player, S = G.stats; el.replaceChildren();
  const rows = UPGRADES.filter(u => u.kind === 'weapon' && p.levels[u.id])
    .map(u => { const d = S.dmg[u.id] || 0; return { u, d, dps: d / Math.max(1, G.t - (S.since[u.id] || 0)) }; })
    .sort((a, b) => b.d - a.d);
  const tot = rows.reduce((a, r) => a + r.d, 0) || 1;
  const h = document.createElement('h3'); h.textContent = 'Sát thương theo vũ khí'; el.append(h);
  for (const r of rows) {
    const row = document.createElement('div'); row.className = 'dmgrow';
    row.innerHTML = `<span class="ic"></span><span class="nm"></span><span class="bar"><i></i></span><b></b><small></small>`;
    row.querySelector('.ic').append(iconEl(r.u.id, r.u.icon));
    row.querySelector('.nm').textContent = r.u.name;
    row.querySelector('i').style.width = (r.d / tot * 100).toFixed(1) + '%';
    row.querySelector('b').textContent = fmtNum(r.d) + ' · ' + Math.round(r.d / tot * 100) + '%';
    row.querySelector('small').textContent = r.dps.toFixed(1) + '/giây';
    el.append(row);
  }
  const taken = Object.entries(S.taken).sort((a, b) => b[1] - a[1]).slice(0, 2);
  if (taken.length) {
    const t = document.createElement('p'); t.className = 'taken';
    t.textContent = 'Nguồn sát thương nhận vào: ' + taken.map(([k, v]) => `${srcName(k)} ${Math.round(v)}`).join(' · ');
    el.append(t);
  }
}
