'use strict';
/* =========================================================
   HUD & GIAO DIỆN
   ========================================================= */
const $ = id => document.getElementById(id);
const ui = {
  xpfill: $('xpfill'), lvl: $('lvl'), timer: $('timer'), wave: $('waveTxt'), hpfill: $('hpfill'), hp: $('hpTxt'), kill: $('killTxt'),
  ownedW: $('ownedW'), ownedP: $('ownedP'), buffs: $('buffs'), fps: $('fps'), bossbar: $('bossbar'), bossfill: $('bossfill'), bossghost: $('bossghost'), banner: $('banner'), waveBar: $('waveFill'),
};
const ITEM_BUFFS = ['shield', 'speed', 'rage', 'xp2'];
let hudCache = '', buffCache = '', dashCache = -1;

function updateHud() {
  const p = G.player; if (!p) return;
  const b = G.boss && !G.boss.dead ? G.boss : null, w = G.wave;
  const wpct = w.phase === 'fight' ? Math.min(100, Math.round(w.t / waveDef().dur * 100)) : -1;
  const key = [wpct, Math.floor(G.t), G.level, Math.ceil(p.hp), p.maxHp, G.kills, G.xp, b ? Math.ceil(b.hp) : -1, w.i, w.phase].join('|');
  if (key !== hudCache) {
    hudCache = key;
    ui.xpfill.style.width = (G.xp / G.xpNeed * 100).toFixed(1) + '%';
    ui.lvl.textContent = 'Lv ' + G.level;
    ui.timer.textContent = fmtTime(G.t);
    const hpk = clamp(p.hp / p.maxHp, 0, 1);
    ui.hpfill.style.width = (hpk * 100).toFixed(1) + '%';
    ui.hp.textContent = Math.ceil(p.hp) + '/' + p.maxHp;
    document.body.classList.toggle('lowhp', G.state === 'play' && hpk < 0.25);
    ui.kill.textContent = G.kills;
    ui.wave.textContent = `ĐỢT ${waveLabel(w.i)}` + (w.phase === 'boss' ? ' · BOSS' : w.phase === 'rest' ? ' · NGHỈ' : '');
    ui.waveBar.parentNode.style.visibility = wpct >= 0 ? 'visible' : 'hidden';
    if (wpct >= 0) ui.waveBar.style.width = wpct + '%';
    ui.bossbar.style.display = b ? 'block' : 'none';
    if (b) { const pc = clamp(b.hp / b.maxHp * 100, 0, 100).toFixed(1) + '%'; ui.bossfill.style.width = pc; ui.bossghost.style.width = pc; }
    ui.bossbar.classList.toggle('rage', !!(b && b.raged));
  }
  ui.xpfill.classList.toggle('gain', G.gainT > 0);
  document.body.classList.toggle('inplay', G.state === 'play');
  const cdk = Math.ceil(p.dashCd / CFG.dash.cd * 20) / 20;
  if (cdk !== dashCache) { dashCache = cdk; dashBtn.style.setProperty('--cd', cdk); dashBtn.classList.toggle('cd', cdk > 0); }
  // Hiệu ứng đang có (góc dưới trái): icon + số giây còn lại, nhấp nháy khi sắp hết
  const list = ITEM_BUFFS.filter(k => p.buffs[k] > 0).map(k => [k, p.buffs[k]]);
  if (G.freezeT > 0) list.push(['freeze', G.freezeT]);
  const bkey = list.map(([k, t]) => k + Math.ceil(t) + (k === 'shield' ? p.shieldHits : '')).join(',');
  if (bkey !== buffCache) {
    buffCache = bkey;
    ui.buffs.replaceChildren(...list.map(([k, t]) => {
      const d = document.createElement('div'); d.className = 'buff' + (t < 3 ? ' low' : ''); d.title = ITEMS[k].name;
      d.append(iconEl('i_' + k, ITEMS[k].name[0]));
      const n = document.createElement('b'); n.textContent = k === 'shield' ? `${p.shieldHits}` : Math.ceil(t); d.append(n);
      return d;
    }));
  }
}
// Thẻ tên boss lúc xuất hiện (thay cho banner)
function showBossCard(def) {
  const c = $('bossCard');
  c.querySelector('b').textContent = def.name; c.querySelector('span').textContent = def.hint;
  c.classList.remove('show'); void c.offsetWidth; c.classList.add('show');
}
function setBossName(name) { $('bossName').textContent = name.toUpperCase(); }

function chip(u, l, cls) {
  const s = document.createElement('span'); s.className = 'chip ' + cls; s.title = `${u.name} — cấp ${l}`;
  s.append(iconEl(u.id, u.icon));
  const i = document.createElement('i'); i.textContent = l >= 9 ? '★' : l; s.append(i);
  if (l >= 9) s.classList.add('evo');
  return s;
}
function renderOwned() {
  const p = G.player; if (!p) return;
  ui.ownedW.replaceChildren(); ui.ownedP.replaceChildren();
  for (const u of UPGRADES) {
    const l = p.levels[u.id]; if (!l) continue;
    (u.kind === 'weapon' ? ui.ownedW : ui.ownedP).append(chip(u, l, u.kind === 'weapon' ? 'w' : ''));
  }
  // ô trống (viền đứt nét) cho biết còn bao nhiêu chỗ
  for (const [row, n] of [[ui.ownedW, CFG.slots.weapons], [ui.ownedP, CFG.slots.passives]])
    for (let i = row.children.length; i < n; i++) { const e = document.createElement('span'); e.className = 'chip empty'; row.append(e); }
}
// Dòng chữ lớn giữa màn hình; `sub` = dòng phụ nhỏ hơn (vd gợi ý né đòn của boss)
function banner(text, sub) {
  ui.banner.textContent = text;
  if (sub) { const s = document.createElement('small'); s.textContent = sub; ui.banner.append(document.createElement('br'), s); } ui.banner.classList.remove('show'); void ui.banner.offsetWidth; ui.banner.classList.add('show');
}
function updateMuteBtn() { setIcon($('muteBtn'), SFX.muted ? 'ui_mute' : 'ui_sound', SFX.muted ? '×' : '♪'); }
function show(id, on) { $(id).classList.toggle('show', on); }
const bestKey = () => SETUP.nm ? 'vs_best_nm' : 'vs_best';
function updateBestTxt() {
  const b = store.get(bestKey(), { time: 0 });
  const wv = b.wave > WAVE_DEFS.length ? `vô tận đến đợt ${b.wave}` : b.won ? 'chiến thắng' : `đợt ${b.wave || 1}`;
  $('bestTxt').textContent = b.time > 0 ? `Kỷ lục${SETUP.nm ? ' Ác mộng' : ''}: ${wv} · ${fmtTime(b.time)} · cấp ${b.level} · ${b.kills} quái` : '';
}

/* ---------- Menu: vũ khí khởi đầu, Ác mộng, nâng cấp vĩnh viễn ---------- */
function renderMenu() {
  const box = $('startPick'); box.replaceChildren();
  for (const id of Object.keys(UNLOCKS)) {
    const open = META.unlocked.includes(id), b = document.createElement('button');
    b.className = 'pick' + (open ? '' : ' locked'); b.type = 'button';
    b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', String(SETUP.start === id));
    b.setAttribute('aria-label', WEAPONS[id].name + (open ? '' : ' (khoá: ' + UNLOCKS[id].text + ')'));
    b.title = open ? WEAPONS[id].name : 'Khoá: ' + UNLOCKS[id].text;
    b.append(iconEl(id, WEAPONS[id].icon));
    if (!open) { const k = document.createElement('i'); k.textContent = '🔒'; k.setAttribute('aria-hidden', 'true'); b.append(k); }
    b.addEventListener('click', () => {
      if (!open) { $('startHint').textContent = `${WEAPONS[id].name} — khoá: ${UNLOCKS[id].text}`; return; }
      SETUP.start = id; store.set('vs_start', id); renderMenu();
    });
    box.append(b);
  }
  $('startHint').textContent = 'Vũ khí khởi đầu: ' + WEAPONS[SETUP.start].name;
  $('nmWrap').hidden = !META.won; $('optNm').checked = SETUP.nm;
  $('soulTxt').textContent = META.souls > 0 ? `Linh hồn: ${META.souls}` : '';
  updateBestTxt();
}
function renderMeta() {
  $('mSouls').textContent = META.souls;
  const grid = $('metaGrid'); grid.replaceChildren();
  for (const m of META_UPGRADES) {
    const lv = metaLv(m.id), max = CFG.metaCost.length, cost = CFG.metaCost[lv];
    const c = document.createElement('div'); c.className = 'mcard';
    c.innerHTML = `<div class="top"><span class="ic"></span><div><div class="nm"></div><div class="pips" aria-hidden="true"></div></div></div><div class="ds"></div><button class="btn buy" type="button"></button>`;
    c.querySelector('.ic').append(iconEl(m.icon, m.glyph));
    c.querySelector('.nm').textContent = m.name;
    c.querySelector('.pips').innerHTML = Array.from({ length: max }, (_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('');
    c.querySelector('.ds').textContent = lv ? m.desc(lv) + (lv < max ? ` → ${m.desc(lv + 1)}` : '') : 'Cấp 1: ' + m.desc(1);
    const b = c.querySelector('.buy');
    if (lv >= max) { b.textContent = 'Tối đa'; b.disabled = true; }
    else { b.textContent = `Mua · ${cost}`; b.disabled = META.souls < cost; b.setAttribute('aria-label', `Mua ${m.name} cấp ${lv + 1}, giá ${cost} linh hồn`); }
    b.addEventListener('click', () => buyMeta(m.id));
    grid.append(c);
  }
  const r = $('metaReset'); r.dataset.arm = ''; r.textContent = 'Đặt lại (hoàn linh hồn)';
}
function buyMeta(id) {
  const lv = metaLv(id), cost = CFG.metaCost[lv];
  if (cost === undefined || META.souls < cost) return false;
  META.souls -= cost; META.up[id] = lv + 1; saveMeta(); SFX.play('select'); renderMeta(); renderMenu();
  return true;
}
function resetMeta() {
  let back = 0;
  for (const [id, lv] of Object.entries(META.up)) for (let i = 0; i < lv; i++) back += CFG.metaCost[i];
  META.souls += back; META.up = {}; saveMeta(); renderMeta(); renderMenu();
}
let metaArmT = 0;
$('metaReset').addEventListener('click', e => {   // bước xác nhận: bấm 2 lần trong 3 giây
  const r = e.currentTarget;
  if (r.dataset.arm && performance.now() < metaArmT) { resetMeta(); return; }
  r.dataset.arm = '1'; metaArmT = performance.now() + 3000; r.textContent = 'Bấm lần nữa để hoàn lại tất cả';
});
const metaOpen = () => $('meta').classList.contains('show');
function openMeta(on) { if (on) renderMeta(); show('meta', on); (on ? $('metaBack') : $('metaBtn')).focus(); }
$('metaBtn').addEventListener('click', () => openMeta(true));
$('metaBack').addEventListener('click', () => openMeta(false));
$('optNm').addEventListener('change', e => { SETUP.nm = e.target.checked; updateBestTxt(); });
function toMenu() { ['over', 'paused', 'levelup'].forEach(id => show(id, false)); G.state = 'menu'; renderMenu(); show('menu', true); }

/* ---------- Linh hồn + mở khoá khi kết thúc ván ---------- */
function runSouls() {
  const s = Math.floor(G.kills / CFG.souls.perKills) + CFG.souls.boss * G.bossKills + (G.won || G.endless ? CFG.souls.win : 0);
  return Math.floor(s * (G.nm ? CFG.nightmare.souls : 1));
}
function grantMeta() {
  const total = runSouls(), gain = total - G.soulsGiven;   // vô tận: chỉ cộng phần chênh so với lần trao trước
  G.soulsGiven = total; META.souls += gain;
  if (G.won) META.won = true;
  const r = { wave: G.wave.i + 1, kills: G.kills, bosses: G.bossKills, evo: G.evolved }, fresh = [];
  for (const [id, u] of Object.entries(UNLOCKS)) if (u && !META.unlocked.includes(id) && u.ok(r)) { META.unlocked.push(id); fresh.push(id); }
  saveMeta();
  return { gain, fresh };
}
let soulAnim = 0;
function showSouls(gain, fresh) {
  const el = $('rSouls'), t0 = performance.now(), dur = REDUCED_MOTION ? 0 : CFG.souls.countUp * 1000, id = ++soulAnim;
  const step = now => {
    if (id !== soulAnim) return;
    const k = dur ? Math.min(1, (now - t0) / dur) : 1;
    el.textContent = `+${Math.round(gain * k)} linh hồn`;
    if (k < 1) requestAnimationFrame(step);
  };
  el.textContent = '+0 linh hồn'; requestAnimationFrame(step); if (!dur) step(t0);
  $('rUnlock').textContent = fresh.length ? `Mở khoá: bắt đầu với ${fresh.map(id => WEAPONS[id].name).join(', ')}` : '';
}

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
    apply: p => { const w = p.weapons[id]; w.evo = true; G.evolved = true; E.apply(w); } };
}
// Gợi ý cách tiến hoá cho vũ khí đang có
const evoHint = id => EVOLUTIONS[id] ? `Tiến hoá: cần ${PASSIVES.find(x => x.id === EVOLUTIONS[id].passive).name} cấp ${CFG.evo.passiveLvl}` : '';
function openLevelUp() {
  // KHÔNG xả phím/joystick ở đây: người chơi vẫn đang giữ hướng, chọn thẻ xong phải chạy tiếp ngay.
  G.state = 'levelup';
  G.choices = rollChoices();
  $('luTitle').textContent = (G.chestOpen ? 'Rương báu!' : 'Lên cấp!') + (G.pending > 1 ? ` (còn ${G.pending} lượt)` : '');
  renderCards();
  show('levelup', true);
  SFX.play('level');
}
function renderCards() {
  const p = G.player, box = $('cards'); box.replaceChildren();
  const nW = ownedCount(p, 'weapon'), nP = ownedCount(p, 'passive');
  G.choices.forEach((u, idx) => {
    const cur = p.levels[u.id] || 0, next = cur + 1;
    const b = document.createElement('button'); b.className = 'card' + (u.kind === 'weapon' ? ' weapon' : u.kind === 'evo' ? ' evo' : '');
    b.innerHTML = `<span class="key">${idx + 1}</span><div class="top"><div class="ic"></div><div><div class="nm"></div><div class="lv ${cur ? '' : 'new'}"></div></div></div><div class="ds"></div>`;
    b.querySelector('.ic').append(iconEl(u.id, u.icon));
    b.querySelector('.nm').textContent = u.name;
    b.querySelector('.lv').textContent = u.kind === 'evo' ? `TIẾN HOÁ · ${WEAPONS[u.id].name}` : u.kind === 'item' ? 'Vật phẩm' : cur ? `Cấp ${cur} → ${next}`
      : u.kind === 'weapon' ? `Vũ khí mới ${nW + 1}/${CFG.slots.weapons}` : `Bị động mới ${nP + 1}/${CFG.slots.passives}`;
    b.querySelector('.ds').textContent = u.desc(next);
    if (u.kind === 'weapon' && cur && EVOLUTIONS[u.id]) { const h = document.createElement('div'); h.className = 'evoh'; h.textContent = evoHint(u.id); b.append(h); }
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

/* ---------- Tạm dừng: trang bị + chỉ số + cài đặt ---------- */
function renderPause() {
  const p = G.player, equip = $('pEquip'); equip.replaceChildren();
  const add = (u, l) => {
    const r = document.createElement('div'); r.className = 'it';
    r.append(iconEl(u.id, u.icon));
    const evo = l >= 9 && EVOLUTIONS[u.id];
    r.append(evo ? EVOLUTIONS[u.id].name : u.name);
    const b = document.createElement('b'); b.textContent = evo ? '★' : 'Lv ' + l; r.append(b); equip.append(r);
    if (u.kind === 'weapon' && !evo && EVOLUTIONS[u.id]) { const h = document.createElement('div'); h.className = 'evoh'; h.textContent = evoHint(u.id); equip.append(h); }
  };
  const weapons = UPGRADES.filter(u => u.kind === 'weapon' && p.levels[u.id]);
  const passives = UPGRADES.filter(u => u.kind === 'passive' && p.levels[u.id]);
  const head = t => { const h = document.createElement('div'); h.className = 'eqh'; h.textContent = t; equip.append(h); };
  head(`Vũ khí ${weapons.length}/${CFG.slots.weapons}`); weapons.forEach(u => add(u, p.levels[u.id]));
  if (passives.length) { const s = document.createElement('div'); s.className = 'sep'; equip.append(s); head(`Bị động ${passives.length}/${CFG.slots.passives}`); passives.forEach(u => add(u, p.levels[u.id])); }
  const pct = v => (v >= 0 ? '+' : '') + Math.round(v * 100) + '%';
  const rows = [
    ['Đợt', waveLabel(G.wave.i)], ['Thời gian', fmtTime(G.t)], ['Cấp', G.level], ['Quái hạ', G.kills],
    ['Máu', `${Math.ceil(p.hp)}/${p.maxHp}`], ['Sát thương', pct(dmgMul(p) - 1)], ['Hồi chiêu', pct(p.mCd - 1)],
    ['Vùng ảnh hưởng', pct(p.mArea - 1)], ['Tốc chạy', pct(p.speed / CFG.player.speed - 1)], ['Giáp', p.armor],
    ['Hồi máu', p.regen.toFixed(1) + '/s'], ['Tầm hút ngọc', Math.round(p.magnet)],
  ];
  renderDmgList($('pDmg'));
  $('pStats').replaceChildren(...rows.flatMap(([k, v]) => { const dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = k; dd.textContent = v; return [dt, dd]; }));
}
function togglePause() {
  if (G.state === 'play') { G.state = 'paused'; endJoy(); renderPause(); show('paused', true); }
  else if (G.state === 'paused') { G.state = 'play'; show('paused', false); }
}

function startGame() {
  SFX.init();
  resetWorld();
  ['menu', 'over', 'paused', 'levelup'].forEach(id => show(id, false));
  G.state = 'play';
}

function endRun(won) {
  G.state = 'over'; G.won = won; endJoy(); document.body.classList.remove('lowhp');
  if (won) { SFX.play('win'); for (const e of G.enemies.items) burst(e.x, e.y, ENEMIES[e.type].color, 3, 100, 3, 0.6); G.enemies.clear(); }
  else SFX.play('death');
  const wave = G.wave.i + 1;
  // xếp hạng: thắng > đợt xa hơn > sống lâu hơn
  const score = r => (r.won ? 1e7 : 0) + (r.wave || 1) * 1e5 + r.time;
  const run = { time: G.t, kills: G.kills, level: G.level, wave, won: won || G.endless };
  const key = G.nm ? 'vs_best_nm' : 'vs_best', prev = store.get(key, { time: 0 });
  const newBest = score(run) > score(prev);
  if (newBest) { store.set(key, run); if (!G.nm) G.best = run; }
  const { gain, fresh } = grantMeta(); showSouls(gain, fresh);
  $('overTitle').textContent = won ? 'Bạn đã đánh bại Chúa Tể Bóng Đêm!' : G.endless ? `Gục ngã ở đợt ${wave} (vô tận)` : 'Bạn đã gục ngã';
  $('rWave').textContent = won ? '★' : waveLabel(G.wave.i);
  $('endlessBtn').hidden = !won;
  $('rTime').textContent = fmtTime(G.t); $('rLvl').textContent = G.level; $('rKills').textContent = G.kills;
  $('rBest').textContent = newBest ? 'Kỷ lục mới!' : '';
  renderDmgList($('rDmg'));
  updateBestTxt();
  setTimeout(() => show('over', true), won ? 1200 : 900);
}

$('startBtn').addEventListener('click', startGame);
$('againBtn').addEventListener('click', startGame);
$('menuBtn').addEventListener('click', toMenu);
// Sau chiến thắng: chơi tiếp vô tận từ đợt 5 (giữ nguyên nhân vật)
function continueEndless() {
  if (!G.won) return false;
  G.won = false; G.endless = true; G.boss = null;
  G.wave = { i: WAVE_DEFS.length, phase: 'fight', t: 0, evIdx: 0, announced: false };
  show('over', false); G.state = 'play'; SFX.sync && SFX.sync();
  return true;
}
$('endlessBtn').addEventListener('click', continueEndless);
$('resumeBtn').addEventListener('click', togglePause);
$('rerollBtn').addEventListener('click', () => reroll());
// Âm lượng nhạc / hiệu ứng (lưu lại cho lần chơi sau)
for (const [id, key, storeKey] of [['optMusic', 'musicVol', 'vs_music'], ['optSfx', 'sfxVol', 'vs_sfx']]) {
  const el = $(id), out = $(id + 'V');
  el.value = Math.round(SETTINGS[key] * 100); out.textContent = el.value + '%';
  el.addEventListener('input', () => {
    SETTINGS[key] = el.value / 100; out.textContent = el.value + '%';
    store.set(storeKey, SETTINGS[key]); SFX.applyVolumes();
  });
}
// Công tắc rung màn hình (lưu lại cho lần chơi sau)
$('optShake').checked = SETTINGS.shake;
$('optShake').addEventListener('change', e => { SETTINGS.shake = e.target.checked; store.set('vs_shake', SETTINGS.shake); if (!SETTINGS.shake) G.shake = 0; });
$('pauseBtn').addEventListener('click', togglePause);
$('muteBtn').addEventListener('click', () => { SFX.init(); SFX.toggle(); });
// Toàn màn hình (chỉ hiện nút khi trình duyệt hỗ trợ)
if (document.fullscreenEnabled) {
  $('fsBtn').style.display = 'grid';
  $('fsBtn').addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
  });
}
document.addEventListener('visibilitychange', () => { if (document.hidden && G.state === 'play') togglePause(); });
// Xoay máy / đổi cỡ cửa sổ giữa trận: tạm dừng để người chơi định hướng lại
addEventListener('orientationchange', () => { if (G.state === 'play') togglePause(); });

/* =========================================================
   VÒNG LẶP CHÍNH
   ========================================================= */
let last = performance.now(), acc = 0, fpsT = 0, fpsN = 0, gapMax = 0, workMax = 0, cineOn = false;
function frame(now) {
  requestAnimationFrame(frame);
  const w0 = performance.now();
  const gap = now - last; last = now;
  if (gap > gapMax) gapMax = gap;
  let dt = gap / 1000;
  if (dt > 0.25) dt = 0.25;
  // Boss xuất hiện: dừng logic (chỉ hạt/hiệu ứng chạy), viền đen điện ảnh. Ở đây chứ không trong update()
  // để __vs.tick / runChecks / runBot không bị ảnh hưởng.
  const cine = G.state === 'play' && !!G.cine && G.cine.t > 0;
  if (cine !== cineOn) { cineOn = cine; document.body.classList.toggle('cine', cine); }
  if (cine) {
    G.cine.t -= dt; acc = 0;
    updateParts(dt); updateSfx(dt); G.parts.sweep(); G.sfx.sweep();
  } else if (G.state === 'play' && G.hitStop > 0) {
    // Khựng hình (hit-stop): dừng logic vài chục ms khi hạ quái to để cú đánh "nặng" hơn
    G.hitStop -= dt; acc = 0;
  } else if (G.state === 'play') {
    let gdt = dt;
    if (G.slowT > 0) { G.slowT -= dt; gdt = dt * CFG.bossDeath.rate; } // boss chết: chậm lại
    acc += gdt; let n = 0;
    while (acc >= CFG.step && n < 5) {
      update(CFG.step); acc -= CFG.step; n++;
      if (G.state !== 'play') { acc = 0; break; }
    }
    if (n === 5) acc = 0;
  } else if (G.state === 'over') { // hạt và hiệu ứng vẫn chạy khi kết thúc
    updateParts(dt); updateSfx(dt); G.parts.sweep(); G.sfx.sweep();
    for (const f of G.fx.items) if (f.type !== 'nova' && (f.life -= dt) <= 0) f.dead = true;
    G.fx.sweep(); G.shake = Math.max(0, G.shake - 30 * dt);
  }
  SFX.sync(); // nhạc nền theo trạng thái game (đổi bản khi có boss, nhỏ lại khi tạm dừng)
  // Nội suy giữa 2 bước logic: màn 75/120/144Hz không còn khung "đứng hình" xen khung "nhảy cóc"
  render(G.state === 'play' ? acc / CFG.step : 1);
  updateHud();
  const work = performance.now() - w0; if (work > workMax) workMax = work;
  fpsN++; fpsT += dt;
  if (fpsT >= 1) {
    if (ui.fps.style.display === 'block')
      ui.fps.textContent = `${Math.round(fpsN / fpsT)} FPS · khung dài nhất ${gapMax.toFixed(1)}ms · xử lý tối đa ${workMax.toFixed(1)}ms · ${G.enemies.items.length} quái · ${G.parts.items.length} hạt`;
    fpsN = 0; fpsT = 0; gapMax = 0; workMax = 0;
  }
}

// Hook debug để kiểm thử (vd: __vs.give('nova', 8), __vs.tick(30), __vs.skipTo(2) nhảy tới đợt 3)
window.__vs = {
  G, addXp, choose: u => choose(u, true), spawnBoss, pickItem, spawnCrate,
  spawn: (n, type = 'bat') => { for (let i = 0; i < n; i++) spawnEnemy(type); },
  reroll: () => reroll(true),
  spawnElite: type => spawnElite(type),
  outline: o => { Object.assign(CFG.outline, o); sheetGen++; render(); return CFG.outline; }, // chỉnh viền sprite ngay lúc chạy
  evolve: id => { const p = G.player; window.__vs.give(id, 8); p.levels[id] = 9; evoCard(id).apply(p); renderOwned(); },
  give: (id, lvl = 1) => { const u = UPGRADES.find(x => x.id === id); for (let l = (G.player.levels[id] || 0) + 1; l <= lvl; l++) { G.player.levels[id] = l; u.apply(G.player, l); } renderOwned(); },
  skipTo: i => { G.wave = { i, phase: 'fight', t: 0, evIdx: 0, announced: false }; },
  tick: sec => { // chạy logic giả lập `sec` giây (dùng khi test)
    const t0 = performance.now();
    for (let i = 0; i < sec / CFG.step && G.state === 'play'; i++) update(CFG.step);
    render(); updateHud();
    return performance.now() - t0;
  },
};

renderMenu();
resetWorld();
Assets.load().then(() => { buildIcons(); updateMuteBtn(); renderOwned(); renderMenu(); requestAnimationFrame(t => { last = t; frame(t); }); });
