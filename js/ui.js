'use strict';
/* =========================================================
   TẠM DỪNG, BẮT ĐẦU VÁN, GẮN NÚT, VÒNG LẶP CHÍNH, HOOK KIỂM THỬ, KHỞI ĐỘNG
   (phần còn lại ở ui-hud.js, ui-menu.js, ui-cards.js, ui-end.js — nạp trước file này)
   ========================================================= */
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
  // C1: logic, vẽ và HUD bọc riêng — một lỗi ở phần này không làm đứng phần kia; lỗi hiện hộp báo (reportError, util.js)
  try {
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
  } catch (e) { acc = 0; console.error(e); reportError(e && e.message || e); }
  // Nội suy giữa 2 bước logic: màn 75/120/144Hz không còn khung "đứng hình" xen khung "nhảy cóc"
  try {
    if (G.state === 'menu') renderAttract(dt);   // menu: cảnh nền sống động (không có người chơi, không gọi update)
    else render(G.state === 'play' ? acc / CFG.step : 1);
  } catch (e) { console.error(e); reportError(e && e.message || e); }
  try { updateHud(); } catch (e) { console.error(e); reportError(e && e.message || e); }
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
