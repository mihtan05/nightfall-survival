'use strict';
/* =========================================================
   MENU, NÂNG CẤP VĨNH VIỄN, LINH HỒN, NHIỆM VỤ, SỔ TAY
   (tách từ ui.js ở C1; các file ui-*.js nạp trước ui.js — chỉ khai báo hàm/biến và gắn sự kiện,
   mọi lệnh chạy ngay lúc tải nằm cuối ui.js)
   ========================================================= */
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
  if (!META_UPGRADES.some(m => m.id === id)) { SFX.play('deny'); return false; }
  const lv = metaLv(id), cost = CFG.metaCost[lv];
  if (cost === undefined || META.souls < cost) { SFX.play('deny'); return false; }
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
$('optNm').addEventListener('change', e => { SETUP.nm = e.target.checked; if (SETUP.nm) setEasy(false); updateBestTxt(); });
// Mức Dễ (B14): lưu lựa chọn; không đi cùng Ác mộng; kỷ lục riêng (vs_best_easy)
function setEasy(on) { SETUP.easy = on; store.set('vs_easy', on); $('optEasy').checked = on; if (on) { SETUP.nm = false; $('optNm').checked = false; } updateBestTxt(); }
$('optEasy').checked = SETUP.easy;
$('optEasy').addEventListener('change', e => setEasy(e.target.checked));
// Cài đặt mở từ menu (B9): dùng chung khối #optBox với bảng tạm dừng — mượn sang rồi trả về chỗ cũ khi đóng
const optHome = $('optBox').parentNode, setOpen = () => $('settings').classList.contains('show');
function openSettings(on) { if (!on && setOpen()) SFX.play('back'); (on ? $('setBody') : optHome).append($('optBox')); show('settings', on); (on ? $('setBack') : $('setBtn')).focus(); }
$('setBtn').addEventListener('click', () => openSettings(true));
$('setBack').addEventListener('click', () => openSettings(false));
function toMenu() { ['over', 'paused', 'levelup', 'book'].forEach(id => show(id, false)); G.state = 'menu'; renderMenu(); show('menu', true); }

/* ---------- Linh hồn + mở khoá khi kết thúc ván ---------- */
function runSouls() {
  const s = Math.floor(G.kills / CFG.souls.perKills) + CFG.souls.boss * G.bossKills + (G.won || G.endless ? CFG.souls.win : 0);
  return Math.floor(s * (G.nm ? CFG.nightmare.souls : G.easy ? CFG.easy.souls : 1));
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
  c.style.width = c.style.height = size + 'px';   // cỡ hiển thị = cỡ vẽ (CSS từng chỗ như .goal có thể thu nhỏ)
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
