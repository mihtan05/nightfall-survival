'use strict';
/* =========================================================
   KẾT THÚC VÁN: endRun, màn kết thúc hiện lần lượt, kỷ lục, dòng thời gian, mục tiêu
   (tách từ ui.js ở C1; các file ui-*.js nạp trước ui.js — chỉ khai báo hàm/biến và gắn sự kiện,
   mọi lệnh chạy ngay lúc tải nằm cuối ui.js)
   ========================================================= */
function endRun(won) {
  G.state = 'over'; G.won = won; endJoy(); document.body.classList.remove('lowhp'); lowOn = false; comboEl.className = '';
  if (won) { SFX.play('win'); for (const e of G.enemies.items) burst(e.x, e.y, ENEMIES[e.type].color, 3, 100, 3, 0.6); G.enemies.clear(); }
  else SFX.play('death');
  const wave = G.wave.i + 1;
  // xếp hạng: thắng > đợt xa hơn > sống lâu hơn
  const score = r => (r.won ? 1e7 : 0) + (r.wave || 1) * 1e5 + r.time;
  const run = { time: G.t, kills: G.kills, level: G.level, wave, won: won || G.endless };
  const key = 'vs_best' + modeSfx(G), prev = store.get(key, { time: 0 });
  const newBest = score(run) > score(prev);
  renderStatBests(run);   // trước khi ghi vs_best (lần đầu kỷ lục từng chỉ số lấy từ vs_best cũ)
  if (newBest) { store.set(key, run); if (!G.nm && !G.easy) G.best = run; }
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
const statKey = () => 'vs_stat' + modeSfx(G);
// Kỷ lục từng chỉ số (đợt, thời gian, cấp, quái): hiện kỷ lục cũ bên cạnh + nhãn KỶ LỤC khi vượt; lưu cạnh vs_best / vs_best_nm
function renderStatBests(run) {
  const seed = store.get('vs_best' + modeSfx(G), {});  // lần đầu: lấy từ kỷ lục cả ván đã có
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
