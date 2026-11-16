'use strict';
/* =========================================================
   HUD: thanh máu/kinh nghiệm, chuỗi hạ gục, thông báo, thẻ đợt, nghi thức rương, ô trang bị
   (tách từ ui.js ở C1; các file ui-*.js nạp trước ui.js — chỉ khai báo hàm/biến và gắn sự kiện,
   mọi lệnh chạy ngay lúc tải nằm cuối ui.js)
   ========================================================= */
const $ = id => document.getElementById(id);
const ui = {
  xpfill: $('xpfill'), lvl: $('lvl'), timer: $('timer'), wave: $('waveTxt'), hpfill: $('hpfill'), hp: $('hpTxt'), kill: $('killTxt'),
  ownedW: $('ownedW'), ownedP: $('ownedP'), buffs: $('buffs'), fps: $('fps'), bossbar: $('bossbar'), bossfill: $('bossfill'), bossghost: $('bossghost'), banner: $('banner'), waveBar: $('waveFill'),
};
// C2: HUD co giãn: hệ số --ui theo màn (1280×720 = 1), không nhỏ hơn 1 (điện thoại giữ nguyên), tối đa 2
function uiScale() { document.documentElement.style.setProperty('--ui', clamp(Math.min(innerHeight / 720, innerWidth / 1280), 1, 2).toFixed(3)); }
uiScale(); addEventListener('resize', uiScale);
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
