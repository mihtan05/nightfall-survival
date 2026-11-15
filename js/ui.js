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
    const xk = clamp(G.xp / G.xpNeed, 0, 1);
    if (G.level !== hudLevel) { const up = G.level > hudLevel; hudLevel = G.level; if (up && !REDUCED_MOTION) xpCarry(); else ui.xpfill.style.width = (xk * 100).toFixed(1) + '%'; }
    else if (!xpCarrying) ui.xpfill.style.width = (xk * 100).toFixed(1) + '%';
    const near = xk >= CFG.xpNear; if (near !== xpNear) { xpNear = near; $('xpbar').classList.toggle('near', near); }
    ui.lvl.textContent = 'Lv ' + G.level;
    ui.timer.textContent = fmtTime(G.t);
    const hpk = clamp(p.hp / p.maxHp, 0, 1);
    ui.hpfill.style.width = (hpk * 100).toFixed(1) + '%';
    ui.hp.textContent = Math.ceil(p.hp) + '/' + p.maxHp;
    // Máu thấp (có trễ): bật dưới CFG.lowHp.on, chỉ tắt khi hồi trên CFG.lowHp.off — tắt kèm âm nhẹ + loé xanh
    const low = G.state === 'play' && (lowOn ? hpk < CFG.lowHp.off : hpk < CFG.lowHp.on);
    if (low !== lowOn) {
      if (lowOn && G.state === 'play') { SFX.play('calm'); const l = $('lowhp'); l.classList.remove('clear'); void l.offsetWidth; l.classList.add('clear'); }
      lowOn = low; document.body.classList.toggle('lowhp', low);
    }
    ui.kill.textContent = G.kills;
    ui.wave.textContent = `ĐỢT ${waveLabel(w.i)}` + (w.phase === 'boss' ? ' · BOSS' : w.phase === 'rest' ? ' · NGHỈ' : '');
    ui.waveBar.parentNode.style.visibility = wpct >= 0 ? 'visible' : 'hidden';
    if (wpct >= 0) ui.waveBar.style.width = wpct + '%';
    ui.bossbar.style.display = b ? 'block' : 'none';
    if (b) { const pc = clamp(b.hp / b.maxHp * 100, 0, 100).toFixed(1) + '%'; ui.bossfill.style.width = pc; ui.bossghost.style.width = pc; }
    ui.bossbar.classList.toggle('rage', !!(b && b.raged));
  }
  ui.xpfill.classList.toggle('gain', G.gainT > 0);
  updateComboHud();
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
/* ---------- V5 Phase 7: chuỗi hạ gục, thanh kinh nghiệm, máu thấp, thông báo mốc, thẻ đợt mới, nghi thức mở rương ---------- */
let hudLevel = 1, xpNear = false, xpCarrying = false, lowOn = false;
// Lên cấp: thanh đầy hẳn + loé, rồi về 0 và chạy tới phần dư — thấy được kinh nghiệm thừa chuyển sang cấp mới
function xpCarry() {
  const bar = $('xpbar'); xpCarrying = true;
  ui.xpfill.style.width = '100%'; bar.classList.remove('lvup'); void bar.offsetWidth; bar.classList.add('lvup');
  setTimeout(() => {
    ui.xpfill.style.transition = 'none'; ui.xpfill.style.width = '0%'; void ui.xpfill.offsetWidth; ui.xpfill.style.transition = '';
    ui.xpfill.style.width = (clamp(G.xp / G.xpNeed, 0, 1) * 100).toFixed(1) + '%'; xpCarrying = false;
  }, 160);
}
const comboEl = $('combo'), comboN = $('comboN'), comboBar = $('comboBar');
let comboShown = -1, comboBarK = -1, comboEndUntil = 0;
// Bộ đếm chuỗi: chỉ ghi DOM khi số đổi; vạch thời gian còn lại ghi theo bước 1/40
function updateComboHud() {
  const C = CFG.combo, now = performance.now();
  if (G.comboEnd) { // vừa đứt chuỗi dài: hiện số cuối một lúc
    comboN.textContent = `Chuỗi x${G.comboEnd}`; comboEl.className = 'show end'; comboEndUntil = now + 1400; G.comboEnd = 0; comboShown = -1; return;
  }
  if (G.combo >= C.show && G.state !== 'over') {
    if (G.combo !== comboShown) {
      comboShown = G.combo; comboN.textContent = 'x' + G.combo;
      if (comboEl.className !== 'show') comboEl.className = 'show';
      if (!REDUCED_MOTION && comboN.animate) comboN.animate([{ transform: 'scale(1.35)' }, { transform: 'scale(1)' }], 140);
    }
    const k = Math.round(clamp(G.comboT / C.window, 0, 1) * 40) / 40;
    if (k !== comboBarK) { comboBarK = k; comboBar.style.transform = `scaleX(${k})`; }
    return;
  }
  if (comboEl.className && now >= comboEndUntil) { comboEl.className = ''; comboShown = -1; }
}
// Thông báo mốc: hàng đợi, cách nhau ít nhất CFG.toast.gap giây, nhường chỗ cho chữ lớn của combo (giới hạn chung)
const toastQ = [], toastDone = new Set();
let toastNext = 0, toastCheckT = 0, runBest = null;
function bestPassed() {
  const b = runBest; if (!b || !(b.time > 0) || b.won) return false;
  const wv = G.wave.i + 1, bw = b.wave || 1;
  return wv > bw || (wv === bw && G.t > b.time);
}
function checkToasts(now) {
  if (G.state !== 'play' || !G.player) return;
  if (now >= toastCheckT) { toastCheckT = now + 250; for (const T of TOASTS) if (!toastDone.has(T.id) && T.test()) { toastDone.add(T.id); toastQ.push(T); } checkMissions(); }
  if (toastQ.length && now >= toastNext && G.t - G.calloutT >= 0.5 && !cere.on) { showToast(toastQ.shift()); toastNext = now + CFG.toast.gap * 1000; }
}
function showToast(T) {
  const box = $('toasts'), d = mkEl('div', 'toast' + (T.gold ? ' gold' : ''));
  if (T.icon) d.append(iconEl(T.icon, WEAPONS[T.icon] ? WEAPONS[T.icon].icon : ''));
  d.append(mkEl('span', '', typeof T.text === 'function' ? T.text() : T.text));
  box.append(d); while (box.children.length > CFG.toast.max) box.firstChild.remove();
  SFX.play(String(T.id).startsWith('mis') ? 'mission' : 'milestone');
  setTimeout(() => d.remove(), CFG.toast.life * 1000);
}
// Nghỉ giữa đợt: thẻ tên đợt sắp tới (trong lúc nền đợt mới hiện dần)
let waveCardFor = -1;
function showWaveCard(i) {
  const c = $('waveCard');
  c.querySelector('span').textContent = `ĐỢT ${waveLabel(i)} SẮP ĐẾN`;
  c.querySelector('b').textContent = i < WAVE_DEFS.length && !G.endless ? WAVE_DEFS[i].name : 'Đêm vô tận';
  c.classList.remove('show'); void c.offsetWidth; c.classList.add('show');
}
/* Nghi thức mở rương: chạy trong frame() (không trong update), thế giới đứng yên vì đang ở trạng thái 'levelup'.
   Rương bật mở + cột sáng, các ô icon quay kiểu máy xèng rồi dừng ở đúng các thẻ sắp chọn, chuỗi nốt đi lên;
   xong (hoặc bấm phím / chạm) thì mở bảng thẻ như thường. __vs.tick / runChecks không đi qua đây. */
const cere = { on: false, done: false, t: 0, spinT: 0, slots: [], pool: [] };
function startCere() {
  Object.assign(cere, { on: true, done: true, t: 0, spinT: 0, slots: [] });
  show('levelup', false); cardLockUntil = Infinity;
  cere.pool = UPGRADES.map(u => u.id).filter(id => ICONS[id]);
  const box = $('cereSlots'); box.replaceChildren();
  G.choices.slice(0, 3).forEach((u, i) => {
    const s = mkEl('span', 'slot'), img = iconEl(u.id, u.icon); s.append(img); box.append(s);
    cere.slots.push({ el: s, img, u, stop: REDUCED_MOTION ? 0 : 0.45 + 0.2 * i, settled: false });
  });
  drawCereChest(0); show('chestCere', true); SFX.play('chestArp');
}
function updateCere(dt) {
  cere.t += dt; cere.spinT += dt;
  for (const s of cere.slots) {
    if (s.settled) continue;
    if (cere.t >= s.stop) { s.settled = true; if (s.img.tagName === 'IMG' && ICONS[s.u.id]) s.img.src = ICONS[s.u.id]; s.el.classList.add('set'); SFX.play('select'); }
    else if (cere.spinT >= CFG.chestCere.spin && s.img.tagName === 'IMG' && cere.pool.length) s.img.src = ICONS[cere.pool[Math.floor(Math.random() * cere.pool.length)]];
  }
  if (cere.spinT >= CFG.chestCere.spin) cere.spinT = 0;
  drawCereChest(cere.t);
  if (cere.t >= CFG.chestCere.dur) endCere();
}
function endCere() {
  if (!cere.on) return;
  cere.on = false; show('chestCere', false);
  if (G.state === 'levelup') { renderCards(); show('levelup', true); }
}
function drawCereChest(t) {
  const c = $('cereCv'), g = c.getContext('2d'); g.clearRect(0, 0, c.width, c.height); g.imageSmoothingEnabled = false;
  const img = ATLAS_SRC && Assets.imgs[ATLAS_SRC], f = img && ATLAS.frames['chest_full_open_anim_f' + (t < 0.2 ? 0 : t < 0.35 ? 1 : 2)];
  if (f) { const k = Math.floor(80 / Math.max(f[2], f[3])); g.drawImage(img, f[0], f[1], f[2], f[3], (96 - f[2] * k) / 2, (96 - f[3] * k) / 2, f[2] * k, f[3] * k); }
  else { g.save(); g.translate(48, 52); g.scale(3, 3); SHAPES.chest(g, { x: 0, y: 0, anim: 0 }); g.restore(); }
}
$('chestCere').addEventListener('pointerdown', e => { e.preventDefault(); endCere(); });

// Thẻ tên boss lúc xuất hiện (thay cho banner)
function showBossCard(def) {
  const c = $('bossCard');
  c.querySelector('b').textContent = def.name; c.querySelector('span').textContent = def.hint;
  c.classList.remove('show'); void c.offsetWidth; c.classList.add('show');
}
function setBossName(name) { $('bossName').textContent = name.toUpperCase(); }

/* Ô trang bị trên HUD. Vũ khí: viền màu theo bậc hình (CFG.tierColors) + dải chấm cấp nhỏ; vừa lên cấp thì nháy một lần.
   Chỉ dựng lại khi cấp đổi (renderOwned gọi từ choose/give/resetWorld), không có việc DOM mỗi khung. */
let ownedSeen = {}, ownedFor = null;
function chip(u, l, cls) {
  const s = document.createElement('span'); s.className = 'chip ' + cls; s.title = `${u.name} — cấp ${l}`;
  s.append(iconEl(u.id, u.icon));
  const i = document.createElement('i'); i.textContent = l >= 9 ? '★' : l; s.append(i);
  if (l >= 9) s.classList.add('evo');
  const w = u.kind === 'weapon' && G.player.weapons[u.id];
  if (w) {
    s.style.borderColor = CFG.tierColors[weaponTier(w) - 1];
    const pp = document.createElement('b'); pp.className = 'pp';
    for (let k = 1; k <= 8; k++) { const d = document.createElement('u'); if (k <= l) d.style.background = CFG.tierColors[Math.max(1, weaponTier(w)) - 1]; pp.append(d); }
    s.append(pp);
  }
  if (ownedSeen[u.id] && l > ownedSeen[u.id]) s.classList.add('up');   // vừa nâng cấp: nháy một lần (CSS)
  ownedSeen[u.id] = l;
  return s;
}
function renderOwned() {
  const p = G.player; if (!p) return;
  if (ownedFor !== p) { ownedFor = p; ownedSeen = {}; }   // ván mới: không nháy
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
  // Nhân vật (V5 Phase 10): chỉ đổi hình
  const sb = $('skinPick'); sb.replaceChildren();
  for (const [id, S] of Object.entries(SKINS)) {
    const open = META.skins.includes(id), b = document.createElement('button');
    b.className = 'pick skin' + (open ? '' : ' locked'); b.type = 'button';
    b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', String(SETUP.skin === id));
    b.setAttribute('aria-label', S.name + (open ? '' : ' (khoá: ' + S.unlock.text + ')'));
    b.title = open ? S.name : 'Khoá: ' + S.unlock.text;
    b.append(spriteIcon(S.sprite, 40));
    if (!open) { const k = document.createElement('i'); k.textContent = '🔒'; k.setAttribute('aria-hidden', 'true'); b.append(k); }
    b.addEventListener('click', () => {
      if (!open) { $('skinHint').textContent = `${S.name} — khoá: ${S.unlock.text}`; return; }
      SETUP.skin = id; store.set('vs_skin', id); renderMenu();
    });
    sb.append(b);
  }
  $('skinHint').textContent = 'Nhân vật: ' + SKINS[SETUP.skin].name + ' (chỉ đổi hình)';
  $('nmWrap').hidden = !META.won; $('optNm').checked = SETUP.nm;
  $('soulTxt').textContent = META.souls > 0 ? `Linh hồn: ${META.souls}` : '';
  normMeta(META); fillMissions(false);
  const ml = $('mList'); renderMissions(ml, false); ml.prepend(mkEl('h3', '', 'Nhiệm vụ'));
  $('bookBtn').textContent = `Sổ tay ${bookCount()}/${bookTotal()}`;
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
function openMeta(on) { if (!on && $('meta').classList.contains('show')) SFX.play('back'); if (on) renderMeta(); show('meta', on); (on ? $('metaBack') : $('metaBtn')).focus(); }
$('metaBtn').addEventListener('click', () => openMeta(true));
$('metaBack').addEventListener('click', () => openMeta(false));
$('optNm').addEventListener('change', e => { SETUP.nm = e.target.checked; updateBestTxt(); });
function toMenu() { ['over', 'paused', 'levelup', 'book'].forEach(id => show(id, false)); G.state = 'menu'; renderMenu(); show('menu', true); }

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
  G.freshSkins = [];
  for (const [id, S] of Object.entries(SKINS)) if (S.unlock && !META.skins.includes(id) && S.unlock.ok(r)) { META.skins.push(id); G.freshSkins.push(id); }
  saveMeta();
  return { gain, fresh };
}
let soulAnim = 0;
// Đếm linh hồn tăng dần; finish = hiện ngay số cuối (bấm phím trong lúc màn kết thúc đang hiện dần)
let soulGain = 0, lastFresh = [];
function showSouls(gain, fresh, finish = false) {
  const el = $('rSouls'), t0 = performance.now(), dur = REDUCED_MOTION || finish ? 0 : CFG.souls.countUp * 1000, id = ++soulAnim;
  soulGain = gain;
  const step = now => {
    if (id !== soulAnim) return;
    const k = dur ? Math.min(1, (now - t0) / dur) : 1;
    el.textContent = `+${Math.round(gain * k)} linh hồn`;
    if (k < 1) requestAnimationFrame(step);
  };
  el.textContent = '+0 linh hồn'; requestAnimationFrame(step); if (!dur) step(t0);
  const fs = G.freshSkins || [];
  $('rUnlock').textContent = [fresh.length ? `Mở khoá: bắt đầu với ${fresh.map(id => WEAPONS[id].name).join(', ')}` : '', fs.length ? `Nhân vật mới: ${fs.map(id => SKINS[id].name).join(', ')}` : ''].filter(Boolean).join(' · ');
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

/* ---------- Tạm dừng: trang bị + chỉ số + cài đặt ---------- */
function renderPause() {
  const p = G.player, equip = $('pEquip'); equip.replaceChildren();
  const add = (u, l) => {
    const r = document.createElement('div'); r.className = 'it';
    r.append(iconEl(u.id, u.icon));
    const evo = l >= 9 && EVOLUTIONS[u.id];
    r.append(evo ? EVOLUTIONS[u.id].name : u.name);
    const b = document.createElement('b'); b.textContent = evo ? '★' : 'Lv ' + l; r.append(b); equip.append(r);
    if (u.kind !== 'weapon') return;
    // Vũ khí: dải chấm cấp, cột mốc kế tiếp, công thức tiến hoá + trạng thái
    const sub = mkEl('div', 'wsub'); sub.append(pipsEl(l, 0, 8, 'weapon', !!EVOLUTIONS[u.id]));
    const nm = nextMilestone(u.id, l);
    sub.append(mkEl('span', 'nms', evo ? 'Đã tiến hoá' : nm ? `Cột mốc kế: cấp ${nm.lv} · ${nm.name}` : 'Đã đủ cấp 8'));
    equip.append(sub);
    if (!evo && EVOLUTIONS[u.id]) equip.append(evoRecipe(u.id, l, p.levels[EVOLUTIONS[u.id].passive] || 0));
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
  renderMissions($('pMissions'), true);
  $('pStats').replaceChildren(...rows.flatMap(([k, v]) => { const dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = k; dd.textContent = v; return [dt, dd]; }));
}
function togglePause() {
  if (G.state === 'play') { G.state = 'paused'; endJoy(); renderPause(); show('paused', true); }
  else if (G.state === 'paused') { G.state = 'play'; show('paused', false); SFX.play('back'); }
}
// Âm rê chuột lên nút / thẻ (V5 Phase 6): chỉ khi con trỏ đi vào nút mới, không lặp khi rê trong cùng một nút
let hoverEl = null;
document.addEventListener('pointerover', ev => {
  if (ev.pointerType !== 'mouse') return;
  const b = ev.target.closest && ev.target.closest('button:not([disabled])');
  if (b === hoverEl) return; hoverEl = b;
  if (b && b.id !== 'dashBtn' && !b.classList.contains('icon')) SFX.play('hover');
});

function startGame() {
  SFX.init();
  clearTimeout(overTimer); stageTimers.forEach(clearTimeout); stageTimers = []; staging = false; overShownAt = Infinity;
  normMeta(META);
  for (const a of META.missions) delete a.fresh;   // nhiệm vụ thay vào ở ván trước bắt đầu tính từ ván này
  fillMissions(false); saveMeta();
  resetWorld();
  applySkin(SETUP.skin); bookAdd('skin:' + SETUP.skin);
  hudLevel = 1; lowOn = false; xpCarrying = false; document.body.classList.remove('lowhp'); comboEl.className = ''; comboShown = -1;
  toastQ.length = 0; toastDone.clear(); toastNext = toastCheckT = 0; $('toasts').replaceChildren(); waveCardFor = -1; runBest = store.get(bestKey(), { time: 0 });
  if (cere.on) { cere.on = false; show('chestCere', false); }
  ['menu', 'over', 'paused', 'levelup'].forEach(id => show(id, false));
  G.state = 'play';
}

function endRun(won) {
  G.state = 'over'; G.won = won; endJoy(); document.body.classList.remove('lowhp'); lowOn = false; comboEl.className = '';
  if (won) { SFX.play('win'); for (const e of G.enemies.items) burst(e.x, e.y, ENEMIES[e.type].color, 3, 100, 3, 0.6); G.enemies.clear(); }
  else SFX.play('death');
  const wave = G.wave.i + 1;
  // xếp hạng: thắng > đợt xa hơn > sống lâu hơn
  const score = r => (r.won ? 1e7 : 0) + (r.wave || 1) * 1e5 + r.time;
  const run = { time: G.t, kills: G.kills, level: G.level, wave, won: won || G.endless };
  const key = G.nm ? 'vs_best_nm' : 'vs_best', prev = store.get(key, { time: 0 });
  const newBest = score(run) > score(prev);
  renderStatBests(run);   // trước khi ghi vs_best (lần đầu kỷ lục từng chỉ số lấy từ vs_best cũ)
  if (newBest) { store.set(key, run); if (!G.nm) G.best = run; }
  checkMissions();
  const { gain, fresh } = grantMeta(); lastFresh = fresh; showSouls(gain, fresh, true);
  $('overTitle').textContent = won ? 'Bạn đã đánh bại Chúa Tể Bóng Đêm!' : G.endless ? `Gục ngã ở đợt ${wave} (vô tận)` : 'Bạn đã gục ngã';
  $('rWave').textContent = won ? '★' : waveLabel(G.wave.i);
  $('endlessBtn').hidden = !won;
  $('rTime').textContent = fmtTime(G.t); $('rLvl').textContent = G.level; $('rKills').textContent = G.kills;
  $('rBest').textContent = newBest ? 'Kỷ lục mới!' : '';
  renderDmgList($('rDmg'));
  renderTimeline(won);
  renderGoals(fresh);
  updateBestTxt();
  prepEndPanel(won);
  const myRun = G.player, E = CFG.endPanel;
  clearTimeout(overTimer);
  overTimer = setTimeout(() => { if (G.state === 'over' && G.player === myRun) openEndPanel(won); }, (won ? E.delayWin : E.delayLose) * 1000);
}

/* ---------- V5 Phase 8: màn kết thúc kéo vào ván sau ---------- */
let overTimer = 0, overShownAt = Infinity, stageTimers = [], staging = false;
const statKey = () => G.nm ? 'vs_stat_nm' : 'vs_stat';
// Kỷ lục từng chỉ số (đợt, thời gian, cấp, quái): hiện kỷ lục cũ bên cạnh + nhãn KỶ LỤC khi vượt; lưu cạnh vs_best / vs_best_nm
function renderStatBests(run) {
  const seed = store.get(G.nm ? 'vs_best_nm' : 'vs_best', {});  // lần đầu: lấy từ kỷ lục cả ván đã có
  const prev = store.get(statKey(), null) || { wave: seed.wave || 0, time: seed.time || 0, level: seed.level || 0, kills: seed.kills || 0 };
  const rows = [['sWave', 'wave', v => v > WAVE_DEFS.length ? 'đợt ' + v : 'đợt ' + v], ['sTime', 'time', fmtTime], ['sLvl', 'level', v => 'cấp ' + v], ['sKills', 'kills', v => v + ' quái']];
  const next = { ...prev };
  for (const [id, k, fmt] of rows) {
    const box = $(id), sm = box.querySelector('small'), beat = prev[k] > 0 && run[k] > prev[k];
    box.classList.toggle('rec', beat);
    sm.textContent = beat ? `KỶ LỤC · cũ ${fmt(prev[k])}` : prev[k] > 0 ? `Kỷ lục: ${fmt(prev[k])}` : '';
    next[k] = Math.max(prev[k] || 0, run[k]);
  }
  store.set(statKey(), next);
}
// Dòng thời gian: các đợt đã qua (icon boss đã hạ), đợt đang đánh tới đâu, và chỗ gục ngã + nguồn đòn cuối
function renderTimeline(won) {
  const box = $('rTimeline'); box.replaceChildren();
  const w = G.wave, deadAt = won ? -1 : w.phase === 'rest' ? w.i + 1 : w.i;   // gục lúc nghỉ giữa đợt → dấu ✕ ở đầu đợt sau
  const n = Math.max(WAVE_DEFS.length, deadAt + 1, w.i + 1);
  for (let i = 0; i < n; i++) {
    const done = won || i < w.i || (i === w.i && (w.phase === 'rest' || w.phase === 'won'));
    const seg = mkEl('div', 'seg' + (done ? ' done' : i === deadAt ? ' cur' : ''));
    seg.append(mkEl('span', 'wl', 'Đợt ' + (i + 1)));
    const bar = mkEl('i', 'fill'); seg.append(bar);
    const def = i < WAVE_DEFS.length ? WAVE_DEFS[i] : WAVE_DEFS[WAVE_DEFS.length - 1];
    let k = done ? 1 : 0;
    if (!done && i === w.i) k = w.phase === 'fight' ? Math.min(0.8, w.t / def.dur * 0.8) : 0.9;  // 80% là giao tranh, 20% cuối là boss
    bar.style.width = (k * 100).toFixed(0) + '%';
    const boss = mkEl('span', 'boss' + (done ? ' on' : '')); boss.append(iconEl('ui_kill', '☠')); boss.title = done ? 'Đã hạ boss' : 'Boss'; seg.append(boss);
    if (!done && i === deadAt) {
      const m = mkEl('span', 'dead'); m.style.left = clamp(k * 100, 18, 82).toFixed(0) + '%';
      m.append(mkEl('b', '', '✕'), mkEl('em', '', G.stats.last ? 'Gục vì ' + srcName(G.stats.last) : 'Gục ngã'));
      seg.append(m);
    }
    box.append(seg);
  }
}
/* "Sắp đạt được": vũ khí khởi đầu sắp mở (tiến độ thật trong ván này), nâng cấp vĩnh viễn rẻ nhất (thiếu bao nhiêu / nút mua ngay),
   và (Phase 9) nhiệm vụ đang làm. */
function goalRow(label, cur, max, extra) {
  const r = mkEl('div', 'goal'); r.append(mkEl('span', 'gl', label));
  if (max) { const b = mkEl('span', 'gbar'), f = mkEl('i'); f.style.width = clamp(cur / max * 100, 0, 100).toFixed(0) + '%'; b.append(f); r.append(b, mkEl('b', '', `${cur}/${max}`)); }
  if (extra) r.append(extra);
  return r;
}
function renderGoals(fresh) {
  const box = $('rGoals'); box.replaceChildren(); box.append(mkEl('h3', '', 'Sắp đạt được'));
  const r = { wave: G.wave.i + 1, kills: G.kills, bosses: G.bossKills, evo: G.evolved };
  for (const id of fresh) { const d = mkEl('div', 'goal done'); d.append(iconEl(id, WEAPONS[id].icon), mkEl('span', 'gl', `Vừa mở: bắt đầu với ${WEAPONS[id].name}`), mkEl('b', '', '✓')); box.append(d); }
  for (const id of G.freshSkins || []) { const d = mkEl('div', 'goal done'); d.append(spriteIcon(SKINS[id].sprite, 32), mkEl('span', 'gl', `Vừa mở nhân vật: ${SKINS[id].name}`), mkEl('b', '', '✓')); box.append(d); }
  // mục tiêu mở khoá gần nhất (vũ khí hoặc nhân vật)
  let best = null;
  for (const [id, u] of Object.entries(UNLOCKS)) {
    if (!u || META.unlocked.includes(id)) continue;
    const [c, m] = u.prog(r); if (!best || c / m > best.c / best.m) best = { id, u, c, m, name: WEAPONS[id].name, ic: () => iconEl(id, WEAPONS[id].icon) };
  }
  for (const [id, S] of Object.entries(SKINS)) {
    if (!S.unlock || META.skins.includes(id)) continue;
    const [c, m] = S.unlock.prog(r); if (!best || c / m > best.c / best.m) best = { id, u: S.unlock, c, m, name: 'Nhân vật ' + S.name, ic: () => spriteIcon(S.sprite, 32) };
  }
  if (best) { const row = goalRow(`${best.name} — ${best.u.text}`, best.c, best.m); row.prepend(best.ic()); box.append(row); }
  let cheap = null;
  for (const m of META_UPGRADES) { const lv = metaLv(m.id), cost = CFG.metaCost[lv]; if (cost !== undefined && (!cheap || cost < cheap.cost)) cheap = { m, lv, cost }; }
  if (cheap) {
    const { m, lv, cost } = cheap, ic = iconEl(m.icon, m.glyph);
    if (META.souls >= cost) {
      const b = mkEl('button', 'btn buy', `Mua · ${cost}`); b.type = 'button';
      b.addEventListener('click', () => { if (buyMeta(m.id)) renderGoals([]); });
      const row = goalRow(`${m.name} cấp ${lv + 1}: ${m.desc(lv + 1)}`, 0, 0, b); row.prepend(ic); box.append(row);
    } else { const row = goalRow(`Còn thiếu ${cost - META.souls} linh hồn để mua ${m.name} cấp ${lv + 1}`, META.souls, cost); row.prepend(ic); box.append(row); }
  }
  if (typeof renderMissionGoals === 'function') renderMissionGoals(box);
  if (box.children.length === 1) box.append(mkEl('p', 'sub', 'Đã mở hết vũ khí và nâng cấp. Thử Ác mộng hoặc vô tận!'));
}
// Trình tự hiện: thua → tiêu đề, mục tiêu, dòng thời gian, chỉ số, sát thương, linh hồn, nút; thắng → tiêu đề, nút (Tiếp tục vô tận), …, mục tiêu
function stageOrder(won) { return won ? ['title', 'btns', 'timeline', 'stats', 'dmg', 'souls', 'goals'] : ['title', 'goals', 'timeline', 'stats', 'dmg', 'souls', 'btns']; }
function prepEndPanel(won) {
  stageTimers.forEach(clearTimeout); stageTimers = []; staging = false; overShownAt = Infinity;
  const panel = $('overPanel'); panel.classList.toggle('win', won);
  stageOrder(won).forEach((k, i) => { const e = panel.querySelector(`[data-k="${k}"]`); e.style.order = i; e.classList.remove('in'); });
  soulAnim++; $('rSouls').textContent = '';   // dừng bộ đếm cũ; đếm lại khi tới lượt phần "linh hồn"
}
function openEndPanel(won) {
  const panel = $('overPanel'), E = CFG.endPanel;
  show('over', true); overShownAt = performance.now(); staging = true; panel.scrollTop = 0;
  const focusBtn = won ? $('endlessBtn') : $('againBtn');
  stageOrder(won).forEach((k, i) => stageTimers.push(setTimeout(() => {
    panel.querySelector(`[data-k="${k}"]`).classList.add('in');
    if (k === 'souls') showSouls(soulGain, lastFresh);
    if (k === 'btns') focusBtn.focus({ preventScroll: true });
    if (i === stageOrder(won).length - 1) staging = false;
  }, REDUCED_MOTION ? 0 : i * E.step * 1000)));
}
// Bấm phím trong lúc đang hiện dần: hiện hết ngay, đếm linh hồn xong luôn
function finishStaging() {
  if (!staging) return false;
  stageTimers.forEach(clearTimeout); stageTimers = []; staging = false;
  const panel = $('overPanel'); panel.querySelectorAll('.stg').forEach(e => e.classList.add('in'));
  showSouls(soulGain, lastFresh, true);
  (G.won ? $('endlessBtn') : $('againBtn')).focus({ preventScroll: true });
  return true;
}
/* Phím ở màn kết thúc (gọi từ input.js). Trả về true nếu đã xử lý.
   - Trước khi bảng hiện + CFG.endPanel.lock giây: bỏ qua (phím đang giữ / vừa bấm lướt không chơi lại nhầm).
   - Đang hiện dần: hiện hết. - Sau đó: R = chơi lại; Enter/Space = bấm nút đang chọn (mặc định "Chơi lại"). */
function endPanelKey(code) {
  if (G.state !== 'over' || metaOpen() || bookOpen()) return false;
  if (!/^(Enter|NumpadEnter|Space|KeyR)$/.test(code)) return false;
  if (performance.now() < overShownAt + CFG.endPanel.lock * 1000) return true;
  if (finishStaging()) return true;
  const b = document.activeElement;
  if (code !== 'KeyR' && b && b.tagName === 'BUTTON' && b.closest('#over') && !b.hidden) b.click(); else startGame();
  return true;
}

/* ---------- V5 Phase 9: nhiệm vụ ---------- */
const misDef = id => MISSIONS.find(m => m.id === id);
// Luôn đủ CFG.missions.active nhiệm vụ; bốc ngẫu nhiên trong những cái chưa có (không lặp lại ngay cái vừa xong)
function fillMissions(fresh) {
  const act = META.missions;
  while (act.length < CFG.missions.active) {
    const pool = MISSIONS.filter(m => !act.some(a => a.id === m.id) && m.id !== META.lastMis);
    if (!pool.length) break;
    act.push(fresh ? { id: pool[Math.floor(Math.random() * pool.length)].id, fresh: true } : { id: pool[Math.floor(Math.random() * pool.length)].id });
  }
}
function missionRun() {
  const S = G.stats;
  return { kby: S.kby, evo: !!G.evolved, noHit: Math.max(S.noHitMax, G.t - S.lastHurt), chests: G.chests || 0, comboMax: S.comboMax,
    elites: S.elites, items: S.items, bosses: G.bossKills, level: G.level, dashes: S.dashes };
}
// Kiểm nhiệm vụ đang làm (bỏ qua nhiệm vụ vừa thay vào trong ván này). Xong → trả linh hồn MỘT lần, lưu ngay, thay bằng nhiệm vụ mới.
function checkMissions() {
  if (!G.player || !G.stats.kby) return;
  const r = missionRun();
  for (const a of [...META.missions]) {
    if (a.fresh) continue;
    const d = misDef(a.id); if (!d || d.prog(r) < d.goal) continue;
    META.missions.splice(META.missions.indexOf(a), 1); META.lastMis = a.id;
    META.souls += d.reward; META.misDone = (META.misDone || 0) + 1;
    fillMissions(true); saveMeta();
    G.misDone.push(d);
    toastQ.push({ id: 'mis' + d.id, gold: true, text: `Nhiệm vụ xong: ${d.text} · +${d.reward} linh hồn` });
  }
}
function missionEl(a, r) {
  const d = misDef(a.id), row = mkEl('div', 'mis' + (a.fresh ? ' fresh' : ''));
  row.append(mkEl('span', 'mt', d.text));
  if (r) {
    const c = Math.min(d.goal, d.prog(r)), b = mkEl('span', 'gbar'), f = mkEl('i'); f.style.width = (c / d.goal * 100).toFixed(0) + '%'; b.append(f);
    row.append(b, mkEl('b', 'mc', `${c}/${d.goal}`));
  } else if (a.fresh) row.append(mkEl('em', 'mnew', 'Mới · từ ván sau'));
  row.append(mkEl('b', 'mr', `+${d.reward}`));
  return row;
}
function renderMissions(box, live) {
  box.replaceChildren();
  const r = live && G.player ? missionRun() : null;
  for (const a of META.missions) if (misDef(a.id)) box.append(missionEl(a, a.fresh ? null : r));
}
// Khối mục tiêu ở màn kết thúc: nhiệm vụ vừa xong, nhiệm vụ đang làm (tiến độ ván này), mục sổ tay mới
function renderMissionGoals(box) {
  for (const d of G.misDone) { const row = mkEl('div', 'goal done'); row.append(mkEl('span', 'gl', `Nhiệm vụ xong: ${d.text}`), mkEl('b', '', `+${d.reward}`)); box.append(row); }
  const r = missionRun();
  for (const a of META.missions) {
    const d = misDef(a.id); if (!d) continue;
    if (a.fresh) { const row = mkEl('div', 'goal'); row.append(mkEl('span', 'gl', `Nhiệm vụ mới: ${d.text}`), mkEl('b', '', `+${d.reward}`)); box.append(row); }
    else box.append(goalRow(`Nhiệm vụ: ${d.text} (+${d.reward})`, Math.min(d.goal, d.prog(r)), d.goal));
  }
  if (G.bookNew.length) { const row = mkEl('div', 'goal done'); row.append(mkEl('span', 'gl', `Sổ tay +${G.bookNew.length} mục mới: ${G.bookNew.map(k => bookName(k)).join(', ')}`)); box.append(row); }
}

/* ---------- V5 Phase 9: sổ tay sưu tầm ---------- */
const bookTotal = () => BOOK.reduce((n, g) => n + g.keys.length, 0);
const bookCount = () => BOOK.reduce((n, g) => n + g.keys.filter(k => META.book.includes(k)).length, 0);
function bookName(k) {
  if (k.startsWith('w:')) return WEAPONS[k.slice(2)].name;
  if (k.startsWith('evo:')) return EVOLUTIONS[k.slice(4)].name;
  if (k.startsWith('skin:')) return SKINS[k.slice(5)].name;
  if (ITEMS[k]) return ITEMS[k].name;
  return SRC_NAMES[k] || (ENEMIES[k] && ENEMIES[k].name) || k;
}
// Hình quái/boss cho sổ tay: vẽ khung đầu tiên từ atlas lên một canvas nhỏ (không dùng toDataURL nên chạy được cả file://)
function spriteIcon(kind, size = 40) {
  const c = document.createElement('canvas'); c.width = c.height = size; c.className = 'spr';
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  const a = Assets.get(kind);
  if (a) {
    const an = a.meta.anims.idle || a.meta.anims.run || Object.values(a.meta.anims)[0], fr = an.frames[0];
    const k = Math.max(1, Math.floor(size / Math.max(fr[2], fr[3])));
    const w = Math.min(size, fr[2] * k), h = Math.min(size, fr[3] * k);
    g.drawImage(a.img, fr[0], fr[1], fr[2], fr[3], (size - w) / 2, (size - h) / 2, w, h);
  } else if (SHAPES[kind]) { g.translate(size / 2, size / 2); g.scale(0.8, 0.8); SHAPES[kind](g, { x: 0, y: 0, anim: 0, flash: 0, face: 1, r: 10 }); }
  return c;
}
function bookIcon(k) {
  if (k.startsWith('w:')) return iconEl(k.slice(2), WEAPONS[k.slice(2)].icon);
  if (k.startsWith('evo:')) return iconEl(k.slice(4), WEAPONS[k.slice(4)].icon);
  if (ITEMS[k]) return iconEl('i_' + k, ITEMS[k].name[0]);
  if (k.startsWith('skin:')) return spriteIcon(SKINS[k.slice(5)].sprite);
  return spriteIcon(k);
}
function renderBook() {
  const grid = $('bookGrid'); grid.replaceChildren();
  $('bookCount').textContent = `Đã ghi ${bookCount()}/${bookTotal()} mục. Mục mới được ghi lần đầu bạn có hoặc hạ được nó.`;
  for (const grp of BOOK) {
    const have = grp.keys.filter(k => META.book.includes(k)).length;
    grid.append(mkEl('h3', '', `${grp.title} ${have}/${grp.keys.length}`));
    const row = mkEl('div', 'bkrow');
    for (const k of grp.keys) {
      const on = META.book.includes(k), cell = mkEl('div', 'bk' + (on ? '' : ' off') + (k.startsWith('evo:') ? ' evo' : ''));
      cell.append(bookIcon(k), mkEl('span', 'bn', on ? bookName(k) : '???'));
      if (on && k.startsWith('evo:')) { const id = k.slice(4), P = PASSIVES.find(x => x.id === EVOLUTIONS[id].passive); cell.append(mkEl('small', '', `${WEAPONS[id].name} 8 + ${P.name} ${CFG.evo.passiveLvl}`)); }
      cell.title = on ? bookName(k) : 'Chưa khám phá';
      row.append(cell);
    }
    grid.append(row);
  }
}
const bookOpen = () => $('book').classList.contains('show');
function openBook(on) { if (!on && $('book').classList.contains('show')) SFX.play('back'); if (on) renderBook(); show('book', on); if (on) $('book').querySelector('.panel').scrollTop = 0; (on ? $('bookBack') : $('bookBtn')).focus({ preventScroll: true }); }
$('bookBtn').addEventListener('click', () => openBook(true));
$('bookBack').addEventListener('click', () => openBook(false));

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
  // V5 Phase 7: nghi thức mở rương, thẻ đợt mới, thông báo mốc (phần trình bày — không nằm trong update())
  if (!G.chestOpen) cere.done = false;
  if (G.state === 'levelup' && G.chestOpen && !cere.on && !cere.done) startCere();
  if (cere.on) updateCere(dt);
  if (G.state === 'play' && G.wave.phase === 'rest' && G.wave.t >= 1.2 && waveCardFor !== G.wave.i) { waveCardFor = G.wave.i; showWaveCard(G.wave.i + 1); }
  checkToasts(now);
  SFX.sync(); // nhạc nền theo trạng thái game (đổi bản khi có boss, nhỏ lại khi tạm dừng)
  // Nội suy giữa 2 bước logic: màn 75/120/144Hz không còn khung "đứng hình" xen khung "nhảy cóc"
  if (G.state === 'menu') renderAttract(dt);   // menu: cảnh nền sống động (không có người chơi, không gọi update)
  else render(G.state === 'play' ? acc / CFG.step : 1);
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
// Tiêu đề menu chỉ "rơi vào chỗ" một lần mỗi lần mở trang
document.querySelector('#menu h1').addEventListener('animationend', e => e.currentTarget.classList.remove('intro'), { once: true });
Assets.load().then(() => { buildIcons(); updateMuteBtn(); renderOwned(); renderMenu(); requestAnimationFrame(t => { last = t; frame(t); }); });
