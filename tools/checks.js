'use strict';
/* Kiểm tra tự động các tiêu chí nghiệm thu Giai đoạn 0–6 (chỉ dùng khi phát triển, game KHÔNG nạp file này).
   Trong console của trang game (sau khi bấm "Bắt đầu" một lần để mở âm thanh):
     const s = document.createElement('script'); s.src = '../tools/checks.js'; document.body.append(s);   // trang game ở /src/index.html
     await runChecks()   // trả về danh sách { giai_doan, tieu_chi, ok, chi_tiet }
   Những gì KHÔNG tự kiểm được (nghe âm thanh, cảm giác tay, khung hình thật khi pane bị ẩn) không có ở đây. */
/* V6 (KE_HOACH_QA A2): mọi phần tử bấm được trong `root` đang hiện phải (a) cạnh ≥ 44 px (ô nhập nằm trong <label> thì đo cả nhãn),
   (b) trong khung nhìn hoặc trong một vùng cuộn được, (c) elementFromPoint ở tâm trả về chính nó/con của nó.
   Trả về mảng vi phạm [bảng, phần tử, lý do]. Có thể cuộn vùng chứa để đưa phần tử vào tầm nhìn. */
window.hitAudit = function (label, root = document) {
  const out = [], vw = innerWidth, vh = innerHeight;
  const desc = e => e ? e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/)[0] : '') + (e.id ? '' : ':' + (e.textContent || '').trim().slice(0, 14)) : 'không gì';
  const els = [...root.querySelectorAll('button, input, .card, .pick, [role=button]')]
    .filter(e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden' && !e.closest('[hidden]'));
  for (const e of els) {
    const tgt = e.tagName === 'INPUT' && e.closest('label') ? e.closest('label') : e;
    let r = tgt.getBoundingClientRect();
    const ow = tgt.offsetWidth, oh = tgt.offsetHeight;   // cỡ bố cục (không tính transform của hiệu ứng mở bảng)
    if (ow < 44 || oh < 44) out.push([label, desc(e), `${ow}×${oh} < 44`]);
    let p = tgt.parentElement, sc = null;   // vùng cuộn gần nhất (bảng dài: phần tử có thể trong khung nhìn nhưng bị vùng cuộn cắt)
    for (; p; p = p.parentElement) { const s = getComputedStyle(p); if (/(auto|scroll)/.test(s.overflowY + s.overflowX) && (p.scrollHeight > p.clientHeight + 1 || p.scrollWidth > p.clientWidth + 1)) { sc = p; break; } }
    const sr = sc && sc.getBoundingClientRect(), clipped = sr && (r.top < sr.top - 0.5 || r.bottom > sr.bottom + 0.5);
    if (clipped || r.left < 0 || r.top < 0 || r.right > vw + 0.5 || r.bottom > vh + 0.5) {
      if (!sc) { out.push([label, desc(e), `ngoài khung (${r.left | 0},${r.top | 0}), không cuộn tới được`]); continue; }
      tgt.scrollIntoView({ block: 'nearest', inline: 'nearest' }); r = tgt.getBoundingClientRect();
      if (r.right > vw + 0.5 || r.left < 0) { out.push([label, desc(e), `tràn ngang ${r.left | 0}..${r.right | 0}`]); continue; }
    }
    const h = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if (!h || !(h === tgt || tgt.contains(h))) out.push([label, desc(e), 'bị ' + desc(h) + ' che']);
  }
  return out;
};
/* Mở lần lượt mọi bảng (menu, nâng cấp vĩnh viễn, sổ tay, HUD + thẻ tên đợt + thông báo, chọn thẻ, tạm dừng,
   kết thúc thua/thắng/sau vô tận) rồi chạy hitAudit. Đổi trạng thái ván và META — runChecks tự sao lưu; gọi tay thì nên tải lại sau. */
window.auditAll = async function () {
  const wait = ms => new Promise(r => setTimeout(r, ms)), res = [], hideAll = () => document.querySelectorAll('.overlay.show').forEach(e => e.classList.remove('show'));
  const end = async (lbl, won, setup) => { hideAll(); startGame(); G.player.hp = G.player.maxHp = 1e6; setup(); G.soulsGiven = 0; endRun(won); clearTimeout(overTimer); openEndPanel(won); finishStaging(); await wait(260); res.push(...hitAudit(lbl, $('over'))); };
  hideAll(); renderMenu(); show('menu', true); await wait(260); res.push(...hitAudit('menu', $('menu')));
  openSettings(true); await wait(260); res.push(...hitAudit('settings', $('settings'))); openSettings(false);
  openMeta(true); await wait(260); res.push(...hitAudit('meta', $('meta'))); show('meta', false);
  openBook(true); await wait(260); res.push(...hitAudit('book', $('book'))); show('book', false);
  hideAll(); startGame(); G.player.hp = G.player.maxHp = 1e6; G.xpNeed = 1e9;
  showWaveCard(1); showToast(TOASTS[0]); await wait(400); res.push(...hitAudit('hud', $('hud')));
  G.pending = 1; openLevelUp(); await wait(900); res.push(...hitAudit('levelup', $('levelup')));
  show('levelup', false); G.state = 'play'; G.pending = 0;
  { // thẻ tiến hoá (thẻ đầu) — C2
    const id = Object.keys(EVOLUTIONS)[0], pid = EVOLUTIONS[id].passive, P = PASSIVES.find(x => x.id === pid);
    __vs.give(id, 8); for (let l = (G.player.levels[pid] || 0) + 1; l <= CFG.evo.passiveLvl; l++) { G.player.levels[pid] = l; P.apply(G.player, l); }
    G.pending = 1; openLevelUp(); await wait(900);
    if (G.choices[0].kind !== 'evo') res.push(['levelup-evo', '-', 'không có thẻ tiến hoá']);
    res.push(...hitAudit('levelup-evo', $('levelup'))); show('levelup', false); G.state = 'play'; G.pending = 0;
  }
  togglePause(); await wait(260); res.push(...hitAudit('paused', $('paused'))); if (G.state === 'paused') togglePause();
  await end('over-thua', false, () => { G.wave.i = 0; G.kills = 20; });
  await end('over-thắng', true, () => { G.wave.i = 3; G.bossKills = 4; G.kills = 300; });
  await end('over-vô tận', false, () => { G.endless = true; G.won = true; G.wave.i = 6; G.bossKills = 7; G.kills = 2000; });
  hideAll(); $('toasts').replaceChildren();
  return res;
};
// Đo cân bằng phối âm hiệu ứng / nhạc trong cảnh chuẩn (4 vũ khí cấp 4, 150 skeleton, lấy mẫu busMeter mỗi 100 ms)
window.mixProbe = async function (sec = 8) {
  const sfxBak = SETTINGS.sfxVol, musBak = SETTINGS.musicVol, hintBak = CFG.hints.on;
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const med = arr => {
    const a = arr.slice().sort((x, y) => x - y), n = a.length;
    return n ? (n % 2 ? a[n >> 1] : (a[(n >> 1) - 1] + a[n >> 1]) / 2) : 0;
  };
  const toDb = x => 20 * Math.log10(Math.max(1e-6, x));
  try {
    CFG.hints.on = false; SETTINGS.sfxVol = 0.8; SETTINGS.musicVol = 0.6;
    if (SFX.ctx && SFX.ctx.state === 'suspended') await SFX.ctx.resume();
    ['over', 'levelup', 'paused', 'menu'].forEach(id => document.getElementById(id).classList.remove('show'));
    startGame(); G.enemies.clear(); G.player.hp = G.player.maxHp = 1e6; G.xpNeed = 1e9;
    ['bolt', 'orbit', 'lightning', 'knife'].forEach(id => __vs.give(id, 4));
    const p = G.player;
    for (let i = 0; i < 150; i++) {
      const a = i * 2.39996, r = 65 + (i % 14) * 10;
      const e = spawnEnemy('skeleton', p.x + Math.cos(a) * r, p.y + Math.sin(a) * r);
      e.hp = e.maxHp = 1e6;
    }
    SFX.intensity = 0; SFX.ducked = false; SFX.lowMix = false; SFX.sync(); SFX.applyVolumes();
    await wait(200);
    const n = Math.max(1, Math.round(sec * 10)), sfxS = [], musS = [];
    for (let i = 0; i < n; i++) {
      const m = SFX.busMeter();
      sfxS.push(m.sfx); musS.push(m.music);
      await wait(100);
    }
    const sfxDb = toDb(med(sfxS)), musicDb = toDb(med(musS));
    return { sfxDb, musicDb, diff: sfxDb - musicDb };
  } finally {
    SETTINGS.sfxVol = sfxBak; SETTINGS.musicVol = musBak; CFG.hints.on = hintBak;
    SFX.applyVolumes();
  }
};
window.runChecks = async function () {
  const out = [], v = __vs, G = v.G;
  const ok = (gd, name, pass, detail = '') => out.push({ giai_doan: gd, tieu_chi: name, ok: !!pass, chi_tiet: String(detail) });
  const kd = (code, key = 'x') => dispatchEvent(new KeyboardEvent('keydown', { code, key }));
  const ku = (code, key = 'x') => dispatchEvent(new KeyboardEvent('keyup', { code, key }));
  const wait = ms => new Promise(r => setTimeout(r, ms));
  // Giữ nguyên tiến trình thật của người chơi: sao lưu META + localStorage, trả lại ở cuối
  const metaAll = JSON.stringify(META), lsKeys = ['vs_meta', 'vs_best', 'vs_best_nm', 'vs_best_easy', 'vs_stat', 'vs_stat_nm', 'vs_stat_easy', 'vs_start', 'vs_clear', 'vs_light', 'vs_fxalpha'], lsAll = lsKeys.map(k => [k, localStorage.getItem(k)]);
  const easyBak = SETUP.easy, lightBak = SETTINGS.light, fxAlphaBak = SETTINGS.fxAlpha; SETUP.easy = false;   // mức Dễ đang bật ở menu không được làm lệch số đo
  CFG.hints.on = false;   // gợi ý ván đầu (C4) không chen vào hàng thông báo của các tiêu chí khác; V6-6 gọi checkHints trực tiếp
  const fresh = () => { ['over', 'levelup', 'paused', 'menu'].forEach(id => document.getElementById(id).classList.remove('show')); startGame(); G.enemies.clear(); G.player.hp = G.player.maxHp = 1e6; G.xpNeed = 1e9; };

  // ---- Giai đoạn 0: input ----
  fresh(); const P = () => G.player;
  kd('KeyD', 'd'); let x = P().x; v.tick(0.5); const before = P().x - x;
  G.xp = G.xpNeed; addXp(0); v.tick(0.02); const lvState = G.state;
  await wait(400); kd('Digit1', '1'); ku('Digit1', '1');
  x = P().x; v.tick(1); const after = P().x - x; ku('KeyD', 'd');
  ok(0, 'Giữ D qua màn lên cấp vẫn chạy tiếp', lvState === 'levelup' && G.state === 'play' && after > 100, `trước ${Math.round(before)}, sau ${Math.round(after)}`);
  let allIme = true;
  for (const k of ['ư', 'Process', 'W']) { kd('KeyW', k); const y = P().y; v.tick(0.3); allIme = allIme && P().y < y - 30; ku('KeyW', k); }
  ok(0, 'Bộ gõ tiếng Việt: e.code KeyW với key ư / Process / W', allIme);
  kd('KeyA'); v.tick(0.1); kd('KeyD'); x = P().x; v.tick(0.3); const right = P().x - x > 0; ku('KeyD'); x = P().x; v.tick(0.3); const left = P().x - x < 0; ku('KeyA');
  ok(0, 'Giữ A + bấm D → phải; nhả D → trái', right && left);

  // ---- Giai đoạn 1: camera, thứ tự vẽ ----
  ok(1, 'ZOOM nguyên, thấy ~360 đơn vị theo chiều ngắn', Number.isInteger(ZOOM) && Math.min(VW, VH) >= 280 && Math.min(VW, VH) <= 460, `ZOOM ${ZOOM}, ${Math.round(VW)}×${Math.round(VH)}`);
  fresh(); const a = spawnEnemy('golem', P().x + 60, P().y + 20), b = spawnEnemy('slime', P().x + 62, P().y + 5); a.speed = b.speed = 0;
  const order = [], realDraw = window.draw; window.draw = (c, e, k) => { order.push(e); realDraw(c, e, k); }; render(1); window.draw = realDraw;
  ok(1, 'Quái đứng thấp hơn vẽ đè quái đứng cao hơn', order.indexOf(b) < order.indexOf(a));

  // ---- Giai đoạn 2: sprite ----
  const kinds = ['player', 'bat', 'slime', 'skeleton', 'ghost', 'golem', 'boss', 'bossZombie', 'bossNecro', 'bossOgre', 'crate', 'knife', 'orb', 'chest', 'potion', 'bomb'];
  const missing = kinds.filter(k => !Assets.get(k));
  ok(2, 'Sprite đã nạp cho nhân vật, quái, boss, vật phẩm', !missing.length, missing.length ? 'thiếu: ' + missing.join(',') : `${kinds.length} loại`);

  // ---- Giai đoạn 3: hiệu ứng ----
  fresh(); ['orbit', 'lightning', 'knife', 'aura', 'nova'].forEach(id => v.give(id, 3));
  for (let i = 0; i < 30; i++) spawnEnemy(['skeleton', 'golem'][i % 2], P().x + Math.cos(i) * 70, P().y + Math.sin(i) * 70).speed = 0;
  const seen = new Set(); for (let i = 0; i < 40; i++) { v.tick(0.05); for (const s of G.sfx.items) seen.add(s.key); }
  const need = ['hitSpark', 'arrowHit', 'claw', 'spore', 'punch', 'strike'];
  ok(3, 'Mỗi vũ khí có hiệu ứng trúng đòn riêng', need.every(k => seen.has(k)), [...seen].join(','));
  G.hitStop = 0; const g = spawnEnemy('golem', P().x + 50, P().y); hitEnemy(g, 1e9, 1, 0);
  ok(3, 'Hạ quỷ khổng lồ có khựng hình (hit-stop)', G.hitStop > 0, G.hitStop.toFixed(3));

  // ---- Giai đoạn 4: âm thanh ----
  ok(4, 'Đã nạp SFX và 2 bài nhạc', Object.keys(SFX.bufs).length >= 8 && Object.keys(SFX.music).length >= 2, `${Object.keys(SFX.bufs).length} nhóm SFX, nhạc: ${Object.keys(SFX.music).join(',') || 'chưa (cần bấm Bắt đầu để mở âm thanh)'}`);
  if (SFX.ctx && SFX.bufs.kill) {
    SFX.last = {}; SFX.active = {}; let started = 0; const orig = SFX.ctx.createBufferSource.bind(SFX.ctx);
    SFX.ctx.createBufferSource = () => { started++; return orig(); };
    for (let i = 0; i < 300; i++) { SFX.last.kill = 0; SFX.play('kill'); }
    SFX.ctx.createBufferSource = orig;
    ok(4, '300 âm "quái chết" cùng lúc bị giới hạn', started <= SFX_FILES.kill.max, `${started} phát`);
  }

  // ---- Giai đoạn 5: giao diện, vật phẩm, đợt ----
  const btns = [...document.querySelectorAll('#btns .icon')].filter(e => e.offsetParent);
  ok(5, 'Nút HUD ≥ 44px', btns.every(e => e.offsetWidth >= 44 && e.offsetHeight >= 44), btns.map(e => e.offsetWidth).join(','));
  ok(5, 'Không cuộn ngang', document.documentElement.scrollWidth <= innerWidth);
  ok(5, 'Icon đã tạo đủ', Object.keys(ICON_SPEC).every(k => ICONS[k]), `${Object.keys(ICONS).length}/${Object.keys(ICON_SPEC).length}`);
  fresh(); let itemsOk = true; const res = {};
  for (const k of Object.keys(ITEMS)) { try { v.pickItem(k); res[k] = 'ok'; } catch (e) { itemsOk = false; res[k] = String(e); } }
  ok(5, 'Nhặt đủ 8 loại vật phẩm không lỗi', itemsOk, JSON.stringify(res));
  fresh(); const c = v.spawnCrate(40); hitEnemy(c, 5, 1, 0);
  ok(5, 'Thùng gỗ vỡ rơi vật phẩm, không tính quái hạ', c.dead && G.kills === 0 && G.gems.items.some(g2 => ITEMS[g2.kind]));
  fresh(); const T = s => { for (let i = 0; i < s / 0.05; i++) { while (G.state === 'levelup') v.choose(G.choices[0]); if (G.state !== 'play') break; v.tick(0.05); } };
  const bosses = [];
  for (let w = 0; w < WAVE_DEFS.length; w++) {
    G.wave.t = WAVE_DEFS[w].dur - 0.02; T(0.1);
    if (!G.boss) break; bosses.push(G.boss.type); hitEnemy(G.boss, 1e9, 1, 0); T(w < 3 ? CFG.restTime + 0.4 : CFG.bossDeath.winWait + 0.4);
  }
  ok(5, '4 đợt, mỗi đợt một boss, hạ boss cuối là thắng', bosses.length === 4 && G.won, bosses.join(' → ') + ` · won=${G.won}`);

  // ---- Giai đoạn 6: gộp lượt lên cấp ----
  fresh(); G.level = CFG.batchLevel; G.pending = 2; v.tick(0.5); const waiting = G.state === 'play' && G.pending >= 2;
  v.tick(CFG.batchWait); const opened = G.state === 'levelup' && /còn \d+ lượt/.test(document.getElementById('luTitle').textContent);
  ok(6, `Từ cấp ${CFG.batchLevel}: gom lượt lên cấp trong ${CFG.batchWait} giây vào một lần chọn`, waiting && opened, document.getElementById('luTitle').textContent);
  while (G.state === 'levelup') v.choose(G.choices[0]);
  document.getElementById('levelup').classList.remove('show');

  // ---- V4 Giai đoạn 1: dễ nhìn & cảm giác đánh ----
  fresh(); v.spawnBoss('boss'); G.boss.x = P().x + 60; G.boss.y = P().y;
  for (let i = 0; i < 12; i++) enemyShoot(G.boss.x, G.boss.y, i / 12 * TAU, 100, 1);
  v.tick(0.1); strike(G.boss.x, G.boss.y, 1, 40);
  const calls = [], rd = window.draw, rs = window.drawSfx;
  window.draw = (c, e, k) => { calls.push(k === 'shot' ? 'shot' : 'x'); rd(c, e, k); };
  window.drawSfx = (u, vv) => { calls.push('sfx'); rs(u, vv); };
  render(1); window.draw = rd; window.drawSfx = rs;
  ok('V4-1', '1.1 Đạn quái vẽ sau mọi hiệu ứng sprite', calls.includes('shot') && calls.lastIndexOf('sfx') < calls.indexOf('shot'));
  fresh(); const tg = spawnEnemy('golem', P().x + 300, P().y); tg.speed = 0;
  for (let i = 0; i < 100; i++) { addText(P().x + i, P().y, String(i + 10), '#ffffff'); }
  let ft = 0; const rf = ctx.fillText; ctx.fillText = function (...a) { ft++; return rf.apply(this, a); }; render(1); ctx.fillText = rf;
  ok('V4-1', '1.2 Số sát thương vẽ bằng ảnh, không dùng fillText', ft === 0, `${ft} lần fillText`);
  fresh(); const ring = [];
  for (let i = 0; i < 10; i++) { const e = spawnEnemy('skeleton', P().x + Math.cos(i) * 15, P().y + Math.sin(i) * 15); e.speed = 0; ring.push(e); }
  G.grid.reset(); for (const e of G.enemies.items) G.grid.insert(e);
  G.player.hp = 1e6; G.hitStop = 0; hurtPlayer(10); const hs = G.hitStop; G.player.iframe = 10; v.tick(0.2);
  ok('V4-1', '1.3 Bị đánh: khựng hình + đẩy lùi quái quanh người', Math.abs(hs - CFG.hurt.stop) < 1e-9 && ring.every(e => Math.hypot(e.x - P().x, e.y - P().y) > 30), `hitStop ${hs}, gần nhất ${Math.round(Math.min(...ring.map(e => Math.hypot(e.x - P().x, e.y - P().y))))}`);
  fresh(); for (const w of ['bolt', 'orbit', 'lightning', 'knife', 'aura', 'nova']) v.give(w, 8); v.spawn(300, 'skeleton');
  let maxLow = 0; for (let i = 0; i < 40; i++) { v.tick(0.05); maxLow = Math.max(maxLow, G.sfx.items.filter(s2 => !FX_STYLE[s2.key].pri).length); }
  const before2 = G.sfx.items.length; v.spawnBoss('boss'); G.boss.x = P().x + 80; G.boss.y = P().y; startSkill(G.boss, ENEMIES.boss);
  ok('V4-1', '1.4 Hiệu ứng thường ≤ sfxSoftCap, hiệu ứng quan trọng vẫn có chỗ', maxLow <= CFG.sfxSoftCap && (G.boss.skill.id !== 'ring' && G.boss.skill.id !== 'spiral' && G.boss.skill.id !== 'summon' || G.sfx.items.some(s2 => s2.key === 'magicCircle')), `thường tối đa ${maxLow}, tổng ${before2}`);
  fresh(); G.wave.t = WAVE_DEFS[0].dur / 2 - 0.1; v.tick(0.2); updateHud();
  const wb = parseFloat(document.getElementById('waveFill').style.width);
  ok('V4-1', '1.5 Thanh tiến độ đợt', Math.abs(wb - 50) <= 2, wb + '%');

  // ---- V4 Giai đoạn 2: không khí & trình bày ----
  const avg = cv0 => { const d = cv0.getContext('2d').getImageData(0, 0, 256, 256).data; let r = 0, g = 0, b = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; } const n = d.length / 4; return [r / n, g / n, b / n].map(Math.round); };
  const cols = WAVE_DEFS.map((_, i) => avg(groundFor(i)));
  ok('V4-2', '2.1 Nền mỗi đợt một màu', new Set(cols.map(c => c.join(','))).size === 4, cols.map(c => c.join('/')).join(' · '));
  fresh(); for (let i = 0; i < 300; i++) enemyShoot(P().x + rand(-150, 150), P().y + rand(-100, 100), 0, 1, 1);
  for (let i = 0; i < 300; i++) fireBullet('bolt', P().x, P().y, i, 1, 5, 1, 1, 5, 1);
  render(1);
  ok('V4-2', '2.2 Số quầng sáng mỗi khung ≤ glowCap', glowCount <= CFG.glowCap && glowCount > 0, `${glowCount}/${CFG.glowCap}`);
  fresh(); v.spawnBoss('bossOgre'); const t0 = G.t;
  { const base = performance.now(); last = base; for (let i = 1; i <= 10; i++) frame(base + i * 100); } // 1 giây khung thật (chạy được cả khi tab bị ẩn)
  const cineOk = G.t === t0 && G.cine.t > 0.2 && G.cine.t < 0.6;
  const t1 = G.t; v.tick(1); const tickOk = G.t > t1;
  G.boss.hp = G.boss.maxHp * 0.49; G.cine.t = 0; v.tick(0.05); updateHud();
  ok('V4-2', '2.3 Boss xuất hiện dừng logic 1.4 giây; dưới 50% máu thì nổi giận', cineOk && tickOk && G.boss.raged && document.getElementById('bossbar').classList.contains('rage'), `cine còn ${G.cine && G.cine.t.toFixed(2)}`);
  fresh(); const sum = () => G.gems.items.reduce((a, g2) => a + (g2.kind === 'xp' ? g2.v : 0), 0);
  for (let i = 0; i < 600; i++) spawnEnemy('slime', P().x + 60 + rand(-20, 20), P().y + rand(-20, 20));
  const xp0 = sum(); detonate(); const gemsN = G.gems.items.length, xp1 = sum();
  ok('V4-2', '2.4 Ngọc gộp lại, tổng kinh nghiệm giữ nguyên', gemsN < 200 && xp1 - xp0 === 600 * ENEMIES.slime.xp, `${gemsN} ngọc, +${xp1 - xp0} xp`);
  fresh(); const near = [];
  for (let i = 0; i < 12; i++) { const e = spawnEnemy('skeleton', P().x + Math.cos(i) * 30, P().y + Math.sin(i) * 30); e.speed = 0; near.push(e); }
  v.tick(0.02); G.xp = G.xpNeed; addXp(0);
  for (let i = 0; i < 12; i++) { while (G.state === 'levelup') v.choose(G.choices[0]); v.tick(1 / 60); }
  ok('V4-2', '2.4 Lên cấp đẩy lùi quái quanh người', near.every(e => Math.hypot(e.x - P().x, e.y - P().y) > 60) && G.player.iframe > 0, `gần nhất ${Math.round(Math.min(...near.map(e => Math.hypot(e.x - P().x, e.y - P().y))))}`);

  // ---- V4 Giai đoạn 3 ----
  fresh(); kd('KeyD', 'd'); v.tick(0.1); let x0 = P().x; kd('Space', ' '); ku('Space', ' '); v.tick(0.16); const dashD = P().x - x0;
  const hp0 = P().hp; G.player.dashT = 0.1; G.player.iframe = 0.1; hurtPlayer(10); const noHurt = P().hp === hp0;
  v.tick(0.3); x0 = P().x; kd('Space', ' '); ku('Space', ' '); v.tick(0.16); const again = P().x - x0; ku('KeyD', 'd');
  ok('V4-3', '3.1 Lướt ~83 đơn vị, bất tử khi lướt, có hồi chiêu', Math.abs(dashD - 83) <= 5 && noHurt && again < 30, `lướt ${dashD.toFixed(1)}, lần 2 ${again.toFixed(1)}`);
  fresh(); ['bolt', 'knife', 'orbit', 'aura'].forEach(id => v.give(id, 1)); let newW = 0;
  for (let i = 0; i < 50; i++) { G.pending = 1; openLevelUp(); newW += G.choices.filter(u => u.kind === 'weapon' && !G.player.levels[u.id]).length; v.choose(G.choices.find(u => u.kind !== 'weapon') || G.choices[0]); }
  fresh(); v.give('bolt', 3); let alwaysNew = true;
  for (let i = 0; i < 50; i++) { G.pending = 1; G.level = 3; openLevelUp(); alwaysNew = alwaysNew && G.choices.some(u => u.kind === 'weapon' && !G.player.levels[u.id]); G.state = 'play'; show('levelup', false); G.pending = 0; }
  G.pending = 1; openLevelUp(); const ids0 = G.choices.map(u => u.id).join(); const rr = v.reroll(); const ids1 = G.choices.map(u => u.id).join();
  v.choose(G.choices[0]);
  ok('V4-3', '3.2 Đủ 4 vũ khí thì không mời vũ khí mới; ít vũ khí thì luôn có; đổi thẻ', newW === 0 && alwaysNew && rr && G.rerolls === CFG.rerolls - 1 && ids0 !== ids1, `mời vũ khí mới khi đủ ô: ${newW}, đổi: ${ids0} → ${ids1}`);
  fresh(); ['orbit', 'lightning', 'knife', 'aura', 'nova'].forEach(id => v.give(id, 4));
  for (let i = 0; i < 80; i++) spawnEnemy('skeleton', P().x + rand(-120, 120), P().y + rand(-90, 90));
  let hpGone = 0; const hpBefore = new Map(); G.enemies.items.forEach(e => hpBefore.set(e, e.hp));
  const rh = window.hitEnemy; window.hitEnemy = function (e, d, ...a) { if (!e.dead && !e.prop) hpGone += Math.min(d, Math.max(0, e.hp)); return rh.call(this, e, d, ...a); };
  v.tick(5); window.hitEnemy = rh;
  const dealt = Object.values(G.stats.dmg).reduce((a, b2) => a + b2, 0);
  renderDmgList(document.getElementById('rDmg')); const rowsN = document.querySelectorAll('#rDmg .dmgrow').length;
  ok('V4-3', '3.6 Thống kê sát thương khớp máu quái mất; bảng liệt kê đúng số vũ khí', Math.abs(dealt - hpGone) <= hpGone * 0.01 && rowsN === 6, `ghi ${Math.round(dealt)} / thực ${Math.round(hpGone)}, ${rowsN} dòng`);
  fresh(); v.give('bolt', 8); v.give('might', 3); G.pending = 1; openLevelUp(); const evoFirst = G.choices[0].kind === 'evo';
  v.choose(G.choices[0]); const evoApplied = G.player.weapons.bolt.evo && G.player.levels.bolt === 9;
  const evoRes = {}; let evoAll = true;
  for (const id of Object.keys(EVOLUTIONS)) {
    const run = evo => {
      fresh(); G.player.weapons = {}; G.player.levels = {};
      if (evo) v.evolve(id); else v.give(id, 8);
      for (let i = 0; i < 100; i++) { const a = i * 2.4, rr = 40 + (i % 10) * 10, e = spawnEnemy('skeleton', P().x + Math.cos(a) * rr, P().y + Math.sin(a) * rr); e.speed = 0; e.hp = e.maxHp = 1e6; }
      v.tick(10); return G.stats.dmg[id] || 0;
    };
    try { const b0 = run(false), b1 = run(true); evoRes[id] = Math.round(b1 / Math.max(1, b0) * 100) + '%'; evoAll = evoAll && b1 > b0; }
    catch (err) { evoRes[id] = String(err); evoAll = false; }
  }
  ok('V4-3', '3.3 Tiến hoá: thẻ đầu khi đủ điều kiện; mỗi tiến hoá mạnh hơn cấp 8', evoFirst && evoApplied && evoAll, JSON.stringify(evoRes));
  fresh(); const bm = spawnEnemy('bomber', P().x + 30, P().y); bm.speed = 0; const z0 = G.zones.length; v.tick(1 / 60);
  const bomberOk = bm.dead && G.zones.length === z0 + 1 && G.kills === 0;
  fresh(); const sp = spawnEnemy('splitter', P().x + 80, P().y); const sl0 = G.enemies.items.filter(e => e.type === 'slime').length; hitEnemy(sp, 1e9, 1, 0); const sl1 = G.enemies.items.filter(e => e.type === 'slime').length;
  fresh(); const ch = spawnEnemy('charger', P().x + 150, P().y); ch.chT = 0; G.player.hp = 1e9; v.tick(1 / 60); const chTele = ch.chPhase === 1;
  v.tick(0.5); const cx0 = ch.x; v.tick(0.4); const chDist = Math.abs(ch.x - cx0);
  // V5 Phase 10: biến thể có sprite riêng (khung khác hẳn quái gốc) thay cho ảnh nhuộm
  const fr0 = k => Assets.get(k) && JSON.stringify(Assets.get(k).meta.anims.run.frames[0]);
  const tintOk = fr0('bomber') && fr0('bomber') !== fr0('bat') && fr0('charger') !== fr0('skeleton') && fr0('splitter') !== fr0('slime');
  fresh(); for (const t of ['bomber', 'splitter', 'charger']) spawnEnemy(t, P().x + rand(-60, 60), P().y + rand(-40, 40));
  const el = v.spawnElite('golem'); el.x = P().x + 50; el.y = P().y;
  const rg = Assets.get; let shapeErr = ''; Assets.get = () => null; try { render(1); } catch (err) { shapeErr = String(err); } Assets.get = rg;
  const gems0 = G.gems.items.length; hitEnemy(el, 1e9, 1, 0); const eliteDrop = G.gems.items.length - gems0;
  ok('V4-3', '3.4 Quỷ nổ, nhớt mẹ, kỵ sĩ xương, tinh anh, sprite riêng, hình dự phòng', bomberOk && sl1 - sl0 === 3 && chTele && Math.abs(chDist - 152) < 15 && tintOk && !shapeErr && eliteDrop >= 2,
    `nổ ${bomberOk}, tách ${sl1 - sl0}, lao ${chTele}/${chDist.toFixed(0)}, sprite riêng ${!!tintOk}, dự phòng ${shapeErr || 'ok'}, rơi ${eliteDrop}`);
  fresh(); G.player.hp = G.player.maxHp = 1e9; v.spawnBoss('bossZombie'); G.cine = null; G.boss.x = P().x + 200;
  v.tick(90); const hasteOk = G.boss.haste >= 0.1;
  const used = {};
  for (const bt of ['bossZombie', 'bossNecro', 'bossOgre', 'boss']) {
    fresh(); G.player.hp = G.player.maxHp = 1e9; G.player.iframe = 1e9; v.spawnBoss(bt); G.cine = null; const b2 = G.boss;
    b2.x = P().x + 150; b2.raged = true; b2.hp = b2.maxHp * 0.4;
    let t = 0; while (t < 60 && !b2.used2) { v.tick(0.5); t += 0.5; b2.hp = b2.maxHp * 0.4; while (G.state === 'levelup') v.choose(G.choices[0]); }
    used[bt] = b2.used2 ? Math.round(t) + 's' : 'không';
  }
  ok('V4-3', '3.5 Boss cuồng nộ dần sau 75 giây; mỗi boss dùng chiêu pha 2', hasteOk && Object.values(used).every(x => x !== 'không'), `haste ${G.boss ? '' : ''}${hasteOk}, ${JSON.stringify(used)}`);
  // ---------- V4 Giai đoạn 4 ----------
  const metaBak = JSON.stringify(META), setupBak = { ...SETUP }, lsBak = ['vs_meta', 'vs_start'].map(k => [k, localStorage.getItem(k)]);
  Object.assign(META, { souls: 0, up: {}, unlocked: ['bolt'], runs: 0, won: false }); SETUP.start = 'bolt'; SETUP.nm = false;
  fresh(); G.kills = 250; G.bossKills = 1; const s41 = runSouls();
  META.souls = CFG.metaCost[0]; const bought = buyMeta('hp'); const hp41 = newPlayer().maxHp; const kept = (store.get('vs_meta', {}).up || {}).hp === 1;
  const exp41 = Math.floor(250 / CFG.souls.perKills) + CFG.souls.boss;   // C3: 15 quái/linh hồn → 46
  ok('V4-4', `4.1 250 quái + 1 boss = ${exp41} linh hồn; mua Sinh lực 1 → 128 máu; lưu lại`, s41 === exp41 && bought && META.souls === 0 && hp41 === 128 && kept, `linh hồn ${s41}, máu ${hp41}, lưu ${kept}`);
  META.up = {}; renderMenu(); const open0 = document.querySelectorAll('#startPick .pick:not(.locked)').length;
  fresh(); G.wave.i = 1; G.kills = 0; G.bossKills = 0; G.soulsGiven = 0; const g42 = grantMeta();
  SETUP.start = 'knife'; fresh(); const lv42 = JSON.stringify(G.player.levels), w42 = Object.keys(G.player.weapons).join();
  ok('V4-4', '4.2 Ban đầu chỉ mở bolt; đến đợt 2 mở dao; bắt đầu bằng dao', open0 === 1 && g42.fresh.join() === 'knife' && lv42 === '{"knife":1}' && w42 === 'knife', `mở ${open0}, mới ${g42.fresh}, levels ${lv42}`);
  SETUP.start = 'bolt'; META.won = true; renderMenu(); const nmShown = !document.getElementById('nmWrap').hidden;
  const skelHp = nm => { SETUP.nm = nm; fresh(); G.diffT = 120; return spawnEnemy('skeleton').maxHp; };
  const hpN = skelHp(false), hpNm = skelHp(true); SETUP.nm = false;
  fresh(); G.won = true; G.state = 'over'; const cont = continueEndless(); v.tick(1); updateHud();
  const hud = document.getElementById('waveTxt').textContent, en = endlessN(), d5 = waveDef();
  ok('V4-4', '4.3 Ác mộng: xương máu ×1.5; thắng → vô tận đợt 5', nmShown && Math.abs(hpNm / hpN - 1.5) < 1e-6 && cont && G.state === 'play' && G.wave.i === 4 && en === 1 && /ĐỢT 5/.test(hud) && !!ENEMIES[d5.boss],
    `toggle ${nmShown}, tỉ lệ ${(hpNm / hpN).toFixed(2)}, ${hud}, boss ${d5.boss}`);
  Object.assign(META, JSON.parse(metaBak)); Object.assign(SETUP, setupBak);
  for (const [k, val] of lsBak) val === null ? localStorage.removeItem(k) : localStorage.setItem(k, val);
  renderMenu();
  // ---------- V5 Phase 3: vũ khí đổi hình theo cấp ----------
  fresh(); const tiers = [1, 3, 4, 7, 8].map(l => { G.player.weapons = {}; G.player.levels = {}; v.give('bolt', l); return weaponTier(G.player.weapons.bolt); });
  v.evolve('bolt'); tiers.push(weaponTier(G.player.weapons.bolt));
  ok('V5-3', '3.0 Bậc hình: cấp 1/3 → 1, 4/7 → 2, 8 → 3, tiến hoá → 4', tiers.join() === '1,1,2,2,3,4', tiers.join());
  fresh(); const tg3 = spawnEnemy('skeleton', P().x + 80, P().y); tg3.speed = 0; tg3.hp = tg3.maxHp = 1e6;
  G.player.weapons.bolt.timer = 5; const nb0 = G.bullets.items.length; G.pending = 1; G.state = 'levelup';
  G.choices = [UPGRADES.find(u => u.id === 'bolt')]; v.choose(G.choices[0]); update(CFG.step);
  ok('V5-3', '3.1 Chọn thẻ nâng vũ khí → bắn ngay trong 1 bước', G.bullets.items.length > nb0 && G.player.levels.bolt === 2, `${nb0} → ${G.bullets.items.length} tiễn`);
  fresh(); G.player.weapons = {}; G.player.levels = {}; v.give('lightning', 8);
  for (let i = 0; i < 20; i++) { const e = spawnEnemy('skeleton', P().x + rand(-100, 100), P().y + rand(-80, 80)); e.speed = 0; e.hp = e.maxHp = 1e6; }
  let decMax = 0; for (let i = 0; i < 300; i++) { v.tick(0.05); decMax = Math.max(decMax, G.decals.filter(d => d.kind !== 'stain').length);for (let k = 0; k < 5; k++) addDecal('scorch', 0, 0, 10, 5); }
  ok('V5-3', '3.2 Vết trên nền có giới hạn', decMax <= CFG.decals.cap && decMax > 0, `${decMax}/${CFG.decals.cap}`);
  // ---------- V5 Phase 4: cột mốc + thẻ hiện lộ trình ----------
  const EXP8 = {"bolt":{"dmg":15.679999999999998,"cd":0.5599999999999999,"count":4,"pierce":3,"speed":504,"life":1.3,"r":5,"range":520},"orbit":{"dmg":16.561999999999998,"count":5,"radius":74.39999999999999,"spin":4.5,"r":8,"hitCd":0.45,"ang":0},"lightning":{"dmg":27.299999999999997,"cd":1.87,"count":4,"aoe":44.8},"knife":{"dmg":10.92,"cd":0.44000000000000006,"count":4,"pierce":4,"speed":540,"life":0.8,"r":4},"aura":{"dmg":9,"radius":103.67999999999999,"tick":0.425,"slow":0.35,"pulse":0},"nova":{"dmg":32.76,"cd":2.975,"maxR":171.875,"kb":5.25,"count":2}}; // trạng thái cấp 8 đo TRƯỚC khi đổi thứ tự cấp (C3: orbit dmg gốc 6→7, aura dmg 3→4 + bán kính 55→60 — đo lại)
  const st8 = {}; let same8 = true;
  for (const id of Object.keys(WEAPONS)) { fresh(); G.player.weapons = {}; G.player.levels = {}; v.give(id, 8); const w = G.player.weapons[id];
    for (const [k, val] of Object.entries(EXP8[id])) if (Math.abs(w[k] - val) > 1e-9) { same8 = false; st8[id] = k; } }
  const msOk = Object.values(WEAPONS).every(W => W.levels[CFG.tiers.t2 - 2].ms && W.levels[CFG.tiers.t3 - 2].ms && W.levels.filter(l => l.ms).length === 2);
  ok('V5-4', '4.1 Cấp 4 và 8 là cột mốc; give(id, 8) cho đúng trạng thái như trước khi đổi thứ tự', same8 && msOk, same8 ? 'khớp 6 vũ khí' : JSON.stringify(st8));
  fresh(); v.give('bolt', 3); G.pending = 1; G.state = 'levelup'; G.choices = [UPGRADES.find(u => u.id === 'bolt'), UPGRADES.find(u => u.id === 'might'), evoCard('bolt')]; renderCards();
  const cardsEl = document.querySelectorAll('#cards .card'), txt0 = cardsEl[0].textContent;
  const cardOk = cardsEl[0].classList.contains('ms') && /CỘT MỐC/.test(txt0) && /Xuyên 1 → 2/.test(txt0) && cardsEl[0].querySelectorAll('.pips8 i.on').length === 3 && cardsEl[0].querySelector('.recipe')
    && /Tổng \+15% sát thương/.test(cardsEl[1].textContent) && /Cần cho tiến hoá: Huyết Vũ/.test(cardsEl[1].textContent) && cardsEl[2].classList.contains('evo');
  ok('V5-4', '4.2 Thẻ: chấm cấp, CỘT MỐC, dòng trước → sau, công thức tiến hoá trên thẻ vũ khí và bị động', cardOk, txt0.replace(/\s+/g, ' ').slice(0, 120));
  G.state = 'play'; show('levelup', false); G.pending = 0;
  // ---------- V5 Phase 7: phần thưởng trong ván ----------
  fresh(); G.player.weapons = {}; G.player.levels = {};
  const foes = []; for (let i = 0; i < 60; i++) { const e = spawnEnemy('skeleton', P().x + 300 + i, P().y); e.speed = 0; foes.push(e); }
  const gemAt = () => { dropPickup(P().x + 150, P().y, 'xp', 1); return G.gems.items[G.gems.items.length - 1]; };
  const gA = gemAt(); for (let i = 0; i < 25; i++) hitEnemy(foes[i], 1e9, 1, 0); const pulledA = gA.pulled;
  const gB = gemAt(), preB = gB.pulled; for (let i = 25; i < 60; i++) hitEnemy(foes[i], 1e9, 1, 0); const pulledB = gB.pulled;
  updateHud(); const comboVis = document.getElementById('combo').classList.contains('show') && /x60/.test(document.getElementById('comboN').textContent);
  const c60 = G.combo; v.tick(3);
  ok('V5-7', '7.1 Hạ 60 quái liên tiếp: combo 60, HUD hiện; mốc 25 và 50 kéo ngọc gần; 3 giây không hạ thì về 0', c60 === 60 && comboVis && pulledA && !preB && pulledB && G.combo === 0,
    `combo ${c60}, HUD ${comboVis}, kéo ${pulledA}/${pulledB}, sau 3 giây ${G.combo}`);
  fresh(); dropPickup(P().x, P().y, 'chest', 0); v.tick(0.05);
  const chestTick = G.state === 'levelup' && G.pending === 2;
  { const base = performance.now(); last = base; frame(base + 16); }
  const cereOn = cere.on && !document.getElementById('levelup').classList.contains('show') && document.getElementById('chestCere').classList.contains('show');
  { const base = performance.now(); last = base; for (let i = 1; i <= 14; i++) frame(base + i * 100); }
  const cardsAfter = !cere.on && document.getElementById('levelup').classList.contains('show');
  while (G.state === 'levelup') v.choose(G.choices[0]);
  ok('V5-7', '7.2 Rương: tick nhận ngay 2 lượt; chạy khung thật thì có nghi thức rồi mới mở thẻ', chestTick && cereOn && cardsAfter && G.pending === 0, `tick ${chestTick}, nghi thức ${cereOn}, thẻ sau ${cardsAfter}`);
  fresh(); G.kills = 120; { const base = performance.now(); last = base; frame(base + 16); frame(base + 32); }
  const toastOk = [...document.querySelectorAll('#toasts .toast')].some(t => /100 quái/.test(t.textContent));
  ok('V5-7', '7.3 Thông báo mốc (100 quái)', toastOk);
  // ---------- V5 Phase 8: màn kết thúc ----------
  const bak8 = JSON.stringify(META), ls8 = ['vs_meta', 'vs_best', 'vs_best_nm', 'vs_stat', 'vs_stat_nm', 'vs_start'].map(k => [k, localStorage.getItem(k)]);
  fresh(); G.player.hp = 0; v.tick(0.02); const overNow = G.state === 'over';
  kd('Enter'); ku('Enter'); const earlyIgnored = G.state === 'over';            // bấm trước khi bảng hiện: bỏ qua
  openEndPanel(false); dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD', key: 'd', repeat: true })); ku('KeyD', 'd');
  kd('Enter'); ku('Enter'); const lockIgnored = G.state === 'over';             // trong thời gian khoá ngay sau khi hiện: bỏ qua
  overShownAt = performance.now() - 1000; kd('Space', ' '); ku('Space', ' '); const finished = G.state === 'over' && !staging; // đang hiện dần: hiện hết
  const tR = performance.now(); kd('KeyR', 'r'); ku('KeyR', 'r'); const retryMs = performance.now() - tR;
  const retried = G.state === 'play' && G.t === 0 && G.kills === 0 && !document.getElementById('over').classList.contains('show');
  ok('V5-8', '8.1 Một phím ở màn kết thúc → ván mới ngay; phím bấm sớm / đang giữ không chơi lại nhầm', overNow && earlyIgnored && lockIgnored && finished && retried && retryMs < 500,
    `sớm ${earlyIgnored}, khoá ${lockIgnored}, hiện hết ${finished}, chơi lại ${retried} (${retryMs.toFixed(0)} ms)`);
  for (const [k] of ls8) localStorage.removeItem(k);
  Object.assign(META, { souls: 0, up: {}, unlocked: ['bolt'], runs: 0, won: false }); delete META.missions; delete META.book;
  fresh(); G.wave.i = 1; G.kills = 412; G.bossKills = 0; G.evolved = false; G.soulsGiven = 0; endRun(false);
  const goalsTxt = document.getElementById('rGoals').textContent;
  ok('V5-8', '8.2 Lưu trắng, 412 quái, tới đợt 2: khối mục tiêu có Hào Quang Độc 412/500 và Dao Bạc vừa mở', /412\/500/.test(goalsTxt) && /Vừa mở: bắt đầu với Dao Bạc/.test(goalsTxt) && /Hào Quang Độc/.test(goalsTxt), goalsTxt.slice(0, 140));
  for (const k of Object.keys(META)) delete META[k];
  Object.assign(META, JSON.parse(bak8));
  for (const [k, val] of ls8) val === null ? localStorage.removeItem(k) : localStorage.setItem(k, val);
  fresh(); renderMenu();
  // ---------- V5 Phase 9: nhiệm vụ, sổ tay, menu sống động, bảng thống nhất ----------
  fresh(); META.missions = [{ id: 'chest3' }, { id: 'items6' }, { id: 'lvl20' }]; delete META.lastMis; const souls9 = META.souls;
  G.chests = 3; checkMissions(); const paid9 = META.souls - souls9, saved9 = store.get('vs_meta', {});
  const replaced9 = META.missions.length === 3 && !META.missions.some(a => a.id === 'chest3') && META.missions.some(a => a.fresh);
  checkMissions(); const once9 = META.souls - souls9 === paid9;
  const old9 = normMeta({ souls: 50, up: { hp: 1 }, unlocked: ['bolt', 'knife'], runs: 3, won: false });
  ok('V5-9', '9.1 Nhiệm vụ xong trả linh hồn một lần, lưu ngay, có nhiệm vụ thay; bản lưu cũ vẫn nạp', paid9 === 20 && once9 && replaced9 && saved9.souls === META.souls && (saved9.missions || []).length === 3
    && Array.isArray(old9.book) && old9.missions.length === 0 && old9.souls === 50 && old9.up.hp === 1, `+${paid9}, thay ${replaced9}, lưu ${saved9.souls === META.souls}`);
  META.book = META.book.filter(k => k !== 'golem'); fresh(); const n9 = bookCount();
  const g9 = spawnEnemy('golem', P().x + 50, P().y); hitEnemy(g9, 1e9, 1, 0); renderMenu();
  const btn9 = document.getElementById('bookBtn').textContent;
  ok('V5-9', '9.2 Hạ loại quái mới → ghi vào sổ tay, số trên nút menu khớp', META.book.includes('golem') && bookCount() === n9 + 1 && btn9 === `Sổ tay ${bookCount()}/${bookTotal()}` && G.bookNew.includes('golem'), btn9);
  { let nA = 0; const ra = window.renderAttract; window.renderAttract = d => { nA++; ra(d); };
    G.state = 'menu'; const gt = G.t, at = attract.t, base = performance.now(); last = base; for (let i = 1; i <= 5; i++) frame(base + i * 50);
    const menuOk = nA === 5 && G.t === gt && (REDUCED_MOTION || attract.t > at);
    fresh(); nA = 0; { const b2 = performance.now(); last = b2; frame(b2 + 16); } window.renderAttract = ra;
    ok('V5-9', '9.3 Menu: cảnh nền chạy mà không gọi update; vào ván thì dừng hẳn', menuOk && nA === 0, `menu ${menuOk}, khi chơi ${nA} lần`); }
  const small = [];
  fresh(); G.pending = 1; openLevelUp();
  for (const id of ['menu', 'meta', 'book', 'paused', 'over', 'levelup']) {
    if (id === 'meta') renderMeta(); if (id === 'book') renderBook(); if (id === 'paused') renderPause();
    const el9 = document.getElementById(id), was = el9.classList.contains('show'); el9.classList.add('show');
    for (const b of el9.querySelectorAll('button')) if (b.offsetParent && (b.offsetHeight < 44 || b.offsetWidth < 44)) small.push(`${id}#${b.id || b.className}:${b.offsetWidth}×${b.offsetHeight}`);
    if (!was) el9.classList.remove('show');
  }
  while (G.state === 'levelup') v.choose(G.choices[0]); show('levelup', false);
  ok('V5-9', '9.4 Mọi nút trong menu, nâng cấp, sổ tay, tạm dừng, kết thúc, lên cấp ≥ 44 px', !small.length, small.join(', ') || 'ok');

  // ---- V5 Phase 6: động cơ âm thanh ----
  if (SFX.ctx && !SFX.muted) {
    await SFX.ctx.resume();
    fresh(); for (let i = 0; i < 300; i++) { const e = spawnEnemy('skeleton', P().x + rand(-160, 160), P().y + rand(-110, 110)); e.speed = 0; }
    const read = SFX.meter(); SFX.last = {};
    for (let i = 0; i < 10; i++) v.tick(CFG.step); // vài bước cho quái vào lưới
    v.pickItem('bomb'); v.tick(0.5); await wait(900);
    const peak6 = read();
    // chờ mọi âm file kết thúc (âm dài nhất ~1 giây)
    let act = 1; for (let k = 0; k < 20 && act; k++) { await wait(150); act = Object.values(SFX.active).reduce((a, b) => a + b, 0) + Object.values(SFX.voices).reduce((a, b) => a + b.length, 0); }
    read(true);
    ok('V5-6', '6.1 Bom giữa 300 quái: đỉnh đầu ra < 1.0, số giọng đang phát về 0', peak6 > 0 && peak6 < 1 && act === 0, `đỉnh ${peak6.toFixed(3)}, còn ${act} giọng`);
  } else ok('V5-6', '6.1 Bom giữa 300 quái: đỉnh < 1.0 (cần bấm Bắt đầu, không tắt tiếng)', false, 'chưa mở âm thanh');
  { // dự phòng: bỏ hết file → mọi âm vẫn phát bằng tổng hợp, không ném lỗi; có lệch trái/phải và bậc vũ khí
    const bufs = SFX.bufs, errs = []; SFX.bufs = {}; SFX.last = {};
    for (const n of Object.keys(SFX.defs)) { try { SFX.play(n, { x: P().x + 100, tier: 3 }); } catch (e) { errs.push(n + ': ' + e.message); } }
    for (const id of Object.keys(BOSS_SKILLS)) { try { SFX.windup(id, 0.3, P().x - 50); } catch (e) { errs.push(id + ': ' + e.message); } }
    SFX.bufs = bufs;
    const missing = Object.keys(SFX_FILES).filter(n => !SFX.defs[n]).concat(Object.keys(BOSS_SKILLS).filter(id => !WINDUP_CUES[id]));
    ok('V5-6', '6.2 Mọi âm có bản tổng hợp dự phòng, mọi kỹ năng boss có âm báo trước riêng, không lỗi', !errs.length && !missing.length, errs.concat(missing).join('; ') || `${Object.keys(SFX.defs).length} âm, ${Object.keys(WINDUP_CUES).length} âm báo trước`);
  }
  { // âm lượng theo vai: âm dày nhỏ hơn phần thưởng, phần thưởng nhỏ hơn nguy hiểm (tính theo RMS sau hệ số)
    const lv = n => SFX.meas[n] ? SFX.meas[n].rmsDb + 20 * Math.log10(SFX.gain[n]) : NaN;
    const f = Math.max(lv('hit'), lv('gem'), lv('kill')), rw = lv('chest'), dg = lv('hurt');
    ok('V5-6', '6.3 Âm lượng theo vai: âm dày < phần thưởng < nguy hiểm', f < rw && rw < dg, `dày ${f.toFixed(1)} dB, thưởng ${rw.toFixed(1)} dB, nguy hiểm ${dg.toFixed(1)} dB`);
  }
  { // ---- V5 Phase 10: nhân vật (chỉ đổi hình) ----
    META.skins = ['wizard']; fresh(); G.wave.i = 2; G.kills = 10; G.bossKills = 0; grantMeta();
    const opened = META.skins.includes('knight') && G.freshSkins.includes('knight') && !META.skins.includes('lizard');
    applySkin('knight'); const swapped = ASSETS.heroKnight && ASSETS.player === ASSETS.heroKnight; applySkin('wizard');
    const back = ASSETS.player === ASSETS.heroWizard;
    SETUP.skin = 'knight'; startGame(); const booked = META.book.includes('skin:knight') && ASSETS.player === ASSETS.heroKnight;
    const same = G.player.maxHp === newPlayer(SETUP.start).maxHp && G.player.speed === newPlayer(SETUP.start).speed;
    SETUP.skin = 'wizard'; applySkin('wizard'); renderMenu();
    const skinBtns = document.querySelectorAll('#skinPick button').length;
    ok('V5-10', '10.1 Đến đợt 3 mở Hiệp Sĩ; chọn nhân vật chỉ đổi hình, ghi sổ tay, menu có 4 ô', opened && swapped && back && same && booked && skinBtns === 4,
      `mở ${opened}, đổi hình ${!!swapped}, về gốc ${back}, chỉ số như nhau ${same}, ghi sổ ${booked}, ${skinBtns} ô`);
  }
  { // ---- V6-1: màn kết thúc không bị canvas sprite (.spr) phủ lên — nút bấm được bằng chuột ----
    const bak = JSON.stringify(META), ls = ['vs_meta', 'vs_best', 'vs_best_nm', 'vs_stat', 'vs_stat_nm', 'vs_start'].map(k => [k, localStorage.getItem(k)]);
    const cases = [
      ['thắng lần đầu', true, ['wizard'], () => { G.wave.i = 3; G.bossKills = 4; G.kills = 300; }],
      ['thua', false, ['wizard'], () => { G.wave.i = 0; G.kills = 20; }],
      ['thua, mục tiêu là nhân vật', false, ['wizard', 'knight', 'lizard'], () => { G.wave.i = 1; G.kills = 950; }],
      ['thua, lần đầu tới đợt 3', false, ['wizard'], () => { G.wave.i = 2; G.kills = 100; }],
    ], bad = [];
    for (const [name, won, skins, setup] of cases) {
      Object.assign(META, { souls: 0, up: {}, unlocked: ['bolt'], runs: 0, won: false, skins: skins.slice() });
      fresh(); setup(); G.soulsGiven = 0; G.evolved = false; endRun(won); clearTimeout(overTimer);
      openEndPanel(won); finishStaging(); await wait(120);   // để khung hình thật chạy và trình duyệt dàn trang
      const spr = document.querySelectorAll('#over canvas.spr').length;
      for (const c of document.querySelectorAll('canvas:not(#cv)')) { const r = c.getBoundingClientRect(); if (c.getClientRects().length && (r.width > 64 || r.height > 64)) bad.push(`${name}: ${c.id || c.className} ${r.width | 0}×${r.height | 0}`); }
      for (const id of ['againBtn', 'menuBtn', 'endlessBtn']) {
        const b = document.getElementById(id); if (b.hidden || !b.getClientRects().length) { if (id !== 'endlessBtn' || won) bad.push(`${name}: #${id} ẩn`); continue; }
        b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(), e = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        if (!e || !(e === b || b.contains(e))) bad.push(`${name}: #${id} bị ${e ? e.tagName + '.' + e.className : 'ngoài màn'} che`);
      }
      if (name !== 'thua' && !spr) bad.push(`${name}: không có hình nhân vật`);   // đúng đường vào có canvas
    }
    const viol = await auditAll();   // V6-2 (A2); META/localStorage trả lại ngay dưới đây
    show('over', false);
    for (const k of Object.keys(META)) delete META[k];
    Object.assign(META, JSON.parse(bak));
    for (const [k, val] of ls) val === null ? localStorage.removeItem(k) : localStorage.setItem(k, val);
    ok('V6-1', '1.1 Màn kết thúc (thắng lần đầu, thua, thua với mục tiêu nhân vật, lần đầu tới đợt 3): canvas phụ ≤ 64 px, nút không bị che', !bad.length, bad.join('; ') || 'ok');
    ok('V6-2', '2.1 hitAudit mọi bảng (menu, nâng cấp, sổ tay, HUD, chọn thẻ, tạm dừng, kết thúc ×3): nút ≥ 44 px, tới được, không bị che', !viol.length,
      viol.slice(0, 8).map(a => a.join(' ')).join('; ') || `ok (${innerWidth}×${innerHeight})`);
  }
  { // ---- V6-3 (C1): lưới an toàn ----
    // (a) Hạ boss cuối rồi trúng đòn chí mạng trong lúc chờ vụ nổ: vẫn là THẮNG (Q-007)
    fresh(); v.skipTo(3); G.boss = null; G.wave.phase = 'won'; G.wave.t = 0; G.player.hp = G.player.maxHp = 100; G.player.iframe = 0;
    hurtPlayer(1e6, 'skeleton'); const noHurt = G.player.hp === 100;
    v.tick(CFG.bossDeath.winWait + 0.1); clearTimeout(overTimer); const won = G.state === 'over' && G.won === true;
    // (b) Lỗi lặp trong update(): hộp báo lỗi hiện, ván tự tạm dừng, vòng lặp còn sống
    const eb = () => document.getElementById('errBox'), hideEb = () => { if (eb()) eb().classList.remove('show'); errBox.n = 0; };
    const origU = window.update, origR = window.render;
    const until = async (f, ms = 5000) => { const t = performance.now(); while (!f() && performance.now() - t < ms) await wait(30); return f(); };   // chờ khung hình thật (pane có thể chạy chậm)
    fresh(); hideEb(); window.update = () => { throw new Error('lỗi giả V6-3'); };
    await until(() => eb() && eb().classList.contains('show')); window.update = origU;
    const boxU = !!(eb() && eb().classList.contains('show') && /lỗi giả V6-3/.test(eb().textContent)), pausedU = G.state === 'paused';
    if (G.state === 'paused') togglePause(); hideEb();
    // (c) Lỗi khi vẽ: HUD vẫn cập nhật (vòng lặp không đứng)
    window.render = () => { throw new Error('lỗi vẽ giả V6-3'); }; G.kills = 4321;
    await until(() => eb() && eb().classList.contains('show') && document.getElementById('killTxt').textContent.replace(/\D/g, '') === '4321'); window.render = origR;
    const boxR = !!(eb() && eb().classList.contains('show')), hudR = document.getElementById('killTxt').textContent.replace(/\D/g, '') === '4321';
    if (G.state === 'paused') togglePause(); hideEb();
    // (d) Bản lưu sửa tay: kẹp về khoảng hợp lệ (Q-030)
    const m1 = META_UPGRADES[0].id, m2 = META_UPGRADES[1].id;
    const nm = normMeta({ souls: -5, runs: 'x', up: { [m1]: -3, [m2]: 999, zzz: 2 }, unlocked: 'bolt', skins: ['nobody'], missions: [null] });
    const clampOk = nm.souls === 0 && nm.runs === 0 && !(m1 in nm.up) && nm.up[m2] === CFG.metaCost.length && !('zzz' in nm.up) && nm.unlocked.includes('bolt') && nm.skins[0] === 'wizard';
    // (e) Không ghi được localStorage: báo một lần, không vỡ
    const origSet = Storage.prototype.setItem; store.failed = false; let threw = false;
    Storage.prototype.setItem = () => { throw new Error('quota'); };
    try { store.set('vs_meta', META); store.set('vs_meta', META); } catch { threw = true; } finally { Storage.prototype.setItem = origSet; }
    const toasts = [...document.querySelectorAll('#toasts .toast')].filter(t => /Không lưu được/.test(t.textContent)).length;
    store.failed = false; document.getElementById('toasts').replaceChildren();
    ok('V6-3', '3.1 Lưới an toàn: thắng không thành thua khi chờ nổ; lỗi update/vẽ hiện hộp báo, vòng lặp sống; bản lưu hỏng được kẹp; lưu thất bại báo 1 lần',
      noHurt && won && boxU && pausedU && boxR && hudR && clampOk && !threw && toasts === 1,
      `thắng ${noHurt}/${won}, lỗi update ${boxU}/${pausedU}, lỗi vẽ ${boxR}/HUD ${hudR}, kẹp ${clampOk}, lưu hỏng ${!threw}/${toasts} thông báo`);
  }
  { // ---- V6-4 (C2): bố cục co giãn ở cỡ màn hiện tại ----
    const k = clamp(Math.min(innerHeight / 720, innerWidth / 1280), 1, 2), z = parseFloat(getComputedStyle(document.getElementById('hud')).zoom) || 1;
    fresh(); for (const id of ['nova', 'aura', 'bolt', 'knife']) { v.give(id, 5); G.stats.dmg[id] = 1000 + 500 * Object.keys(G.stats.dmg).length; } G.stats.taken.skeleton = 50;
    await wait(200);
    let minFs = 99, minEl = ''; for (const e of document.querySelectorAll('#hud *')) { if (!e.getClientRects().length || e.id === 'fps' || ![...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue; const fs = parseFloat(getComputedStyle(e).fontSize) * z; if (fs < minFs) { minFs = fs; minEl = e.id || e.className || e.tagName; } }
    const tall = innerHeight >= 700, end = [];
    for (const won of [false, true]) {
      G.state = 'play'; G.wave.i = won ? 3 : 1; G.bossKills = won ? 4 : 1; G.kills = 900; G.soulsGiven = 0; endRun(won); clearTimeout(overTimer); openEndPanel(won); finishStaging(); await wait(350);
      const p = document.getElementById('overPanel'); p.scrollTop = 0; await wait(30);
      const b = document.getElementById(won ? 'endlessBtn' : 'againBtn'), r = b.getBoundingClientRect(), h = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      const over = p.scrollHeight - p.clientHeight;
      if (tall && over > 1) end.push(`${won ? 'thắng' : 'thua'} cuộn ${over}px`);
      if (!h || !(h === b || b.contains(h))) end.push(`${won ? 'thắng' : 'thua'}: nút chính không thấy khi chưa cuộn`);
      show('over', false); fresh();
    }
    G.pending = 1; openLevelUp(); await wait(900); const lp = document.querySelector('#levelup .panel'), cardsOver = lp.scrollHeight - lp.clientHeight; while (G.state === 'levelup') v.choose(G.choices[0]);
    if (tall && cardsOver > 1) end.push(`bảng thẻ cuộn ${cardsOver}px`);
    ok('V6-4', '4.1 Bố cục co giãn: HUD phóng theo màn (--ui), chữ HUD ≥ 12 px thật; màn kết thúc + bảng thẻ không cuộn khi cao ≥ 700; nút chính luôn thấy',
      Math.abs(z - k) < 0.01 && minFs >= 12 && !end.length, `${innerWidth}×${innerHeight}: ui ${z} (cần ${k.toFixed(3)}), chữ nhỏ nhất ${minFs.toFixed(1)}px (${minEl}); ${end.join('; ') || 'kết thúc/thẻ ok'}`);
  }
  { // ---- V6-5 (C3): cân bằng — báo trước tối thiểu, linh hồn ván đầu ----
    fresh(); const short = [];
    for (const [bid, def] of Object.entries(ENEMIES).filter(([, d]) => d.boss)) for (const id of new Set(def.skills.concat(def.skills2 || []))) {
      const e = spawnEnemy(bid, P().x + 200, P().y); e.hp = e.maxHp * 0.4; e.raged = true; e.haste = CFG.enrage.max; e.skillCd = {};
      startSkill(e, { skills: [id] }); if (!(e.skill.t >= CFG.teleMin - 1e-9)) short.push(`${id} ${e.skill.t.toFixed(2)}s`);
      G.enemies.clear(); G.zones.length = 0;
    }
    fresh(); G.t = 180; G.kills = 150; G.bossKills = 0; G.won = false; G.endless = false; G.nm = false;
    const s3 = runSouls();
    ok('V6-5', '5.1 Báo trước kỹ năng boss ≥ CFG.teleMin kể cả nổi giận + cuồng nộ tối đa; ván thua 3 phút/150 quái đủ ≥ 1/3 nâng cấp đầu',
      !short.length && s3 * 3 >= CFG.metaCost[0], `${short.join(', ') || 'mọi kỹ năng ≥ ' + CFG.teleMin + ' s'}; 150 quái → ${s3} linh hồn, bậc đầu ${CFG.metaCost[0]}`);
  }
  { // ---- V6-6 (C4): gợi ý ván đầu + thẻ tên quái đặc biệt, mỗi cái đúng một lần ----
    META.hints = []; fresh(); toastQ.length = 0; G.t = 0.5; checkHints(); const early = toastQ.length;
    G.t = 1.2; checkHints(); const afterMove = toastQ.map(t => t.id).join();
    dropGem(P().x + 30, P().y, 1); addZone(P().x + 300, P().y, 30, 2, 1); v.give('bolt', 3); P().levels.might = 1; spawnEnemy('bomber', P().x + 60, P().y); spawnEnemy('charger', P().x + 900, P().y);
    checkHints(); checkHints(); const ids = toastQ.map(t => t.id).sort().join(), evoTxt = (toastQ.find(t => t.id === 'hint:evo') || {}).text || '';
    showToast(toastQ[0]); const shown = !!document.querySelector('#toasts .toast.hint'); document.getElementById('toasts').replaceChildren();
    const saved = (store.get('vs_meta', {}).hints || []).length;
    fresh(); G.t = 5; dropGem(P().x + 30, P().y, 1); addZone(P().x + 300, P().y, 30, 2, 1); spawnEnemy('bomber', P().x + 60, P().y); checkHints(); const again = toastQ.length;
    G.zones.length = 0;
    ok('V6-6', '6.1 Gợi ý: di chuyển (sau 1 s) → ngọc → vùng đỏ → tiến hoá + thẻ tên quái đặc biệt ở gần; mỗi cái một lần, lưu ngay, ván sau không hiện lại',
      early === 0 && afterMove === 'hint:move' && ids === 'hint:bomber,hint:dash,hint:evo,hint:gem,hint:move' && /cấp 8/.test(evoTxt) && shown && saved === 5 && again === 0,
      `sớm ${early}, sau 1 s "${afterMove}", đủ "${ids}", "${evoTxt}", hiện ${shown}, lưu ${saved}, ván sau ${again}`);
  }
  { // ---- V6-7 (C8): chơi ngoại tuyến — worker đã đăng ký và kho đã có trang + mã game ----
    const sw = 'serviceWorker' in navigator && await navigator.serviceWorker.getRegistration();
    const hit = async u => !!(await caches.match(u, { ignoreSearch: true }));
    const got = sw ? await Promise.all([location.pathname, 'js/game.js', 'css/game.css', 'assets/atlas.png'].map(hit)) : [];
    const man = await fetch('manifest.webmanifest').then(r => r.json()).catch(() => null);
    ok('V6-7', '7.1 Ngoại tuyến: service worker đã đăng ký, kho lưu có trang + js + css + atlas; manifest có tên và 2 icon',
      sw && got.length === 4 && got.every(Boolean) && man && man.name === 'Nightfall: Survival' && man.icons.length === 2, `worker ${!!sw}, kho ${got.map(x => +x).join('')}, manifest ${man ? man.name : 'thiếu'}`);
  }
  { // ---- V6-8 (C5): tay cầm giả lập + cài đặt mở từ menu ----
    const gp = { connected: true, axes: [0, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false })) };
    navigator.getGamepads = () => [gp];
    const press = i => { gp.buttons[i].pressed = true; pollPad(); gp.buttons[i].pressed = false; pollPad(); };
    ['over', 'levelup', 'paused'].forEach(id => document.getElementById(id).classList.remove('show'));
    G.state = 'menu'; renderMenu(); show('menu', true); if (document.activeElement) document.activeElement.blur(); pollPad();
    press(0); const focStart = document.activeElement && document.activeElement.id === 'startBtn'; press(0); const started = G.state === 'play';
    G.enemies.clear(); P().hp = P().maxHp = 1e6; G.xpNeed = 1e9;
    gp.axes[0] = 1; pollPad(); const x0 = P().x; v.tick(0.5); const moved = P().x - x0; gp.axes[0] = 0; pollPad();
    const d0 = G.stats.dashes; press(0); const dashed = G.stats.dashes - d0;
    press(9); const paused = G.state === 'paused'; press(9); const resumed = G.state === 'play';
    G.pending = 1; openLevelUp(); if (document.activeElement) document.activeElement.blur();
    press(15); press(15); const cards = [...document.querySelectorAll('#levelup .card')], foc = cards.indexOf(document.activeElement);
    await wait(Math.max(0, cardLockUntil - performance.now()) + 30);   // thẻ khoá bấm một nhịp sau khi hiện (chống bấm nhầm)
    press(0); const picked = G.pending === 0;
    show('levelup', false); G.state = 'menu'; show('menu', true);
    openSettings(true); const inSet = $('optBox').parentNode.id === 'setBody'; const c0 = SETTINGS.clear;
    $('optClear').click(); const togg = SETTINGS.clear === !c0 && store.get('vs_clear', null) === !c0; $('optClear').click();
    openSettings(false); const back = $('optBox').closest('#paused') !== null;
    delete navigator.getGamepads; pollPad();
    ok('V6-8', '8.1 Tay cầm: A ở menu chọn rồi bấm "Bắt đầu", cần trái di chuyển, A lướt, Start tạm dừng/chơi tiếp, D-pad + A chọn thẻ thứ 2; Cài đặt mở từ menu, đổi là lưu, đóng thì trả về bảng tạm dừng',
      focStart && started && moved > 20 && dashed === 1 && paused && resumed && foc === 1 && picked && inSet && togg && back,
      `focus ${focStart}, vào ván ${started}, đi ${moved.toFixed(0)}, lướt ${dashed}, dừng ${paused}/${resumed}, thẻ ${foc}, chọn ${picked}, cài đặt ${inSet}/${togg}/${back}`);
  }
  { // ---- V6-9 (C6): vô tận — đợt 5–8 mỗi đợt một luật ----
    fresh(); G.won = true; continueEndless(); G.enemies.clear();
    const names = [4, 5, 6, 7].map(i => waveDef(i).name), cyc = waveDef(8).name === names[0];
    const fast = spawnEnemy('bat').speed / ENEMIES.bat.speed;
    const elites = waveDef(5).elites.length, giant = !!waveDef(7).mix[0].mix.golem && waveDef(7).rate[1] < WAVE_DEFS[3].rate[1];
    showWaveCard(5); const card = document.querySelector('#waveCard b').textContent;
    G.enemies.clear(); G.wave = { i: 6, phase: 'fight', t: waveDef(6).dur - 0.05, evIdx: 99, announced: true, warned: true }; v.tick(0.1);
    const bs = G.enemies.items.filter(e => e.boss), two = bs.length === 2 && bs[0].type !== bs[1].type && G.boss === bs[1];
    const hpOk = bs.length === 2 && Math.abs(bs[0].maxHp - ENEMIES[bs[0].type].hp * CFG.endless.hp ** 3 * 0.6) < 1;
    G.enemies.clear(); G.boss = null; G.cine = null;
    ok('V6-9', '9.1 Vô tận: đợt 5–8 bốn luật khác nhau rồi xoay vòng — quái nhanh ×1.35, tinh anh dày, 2 boss (máu ×0.6), quái to thưa; thẻ đợt hiện tên luật',
      new Set(names).size === 4 && cyc && fast >= 1.35 * 0.9 - 1e-9 && elites >= 5 && giant && card === names[1] && two && hpOk,
      `${names.join(' / ')}; xoay vòng ${cyc}; dơi ×${fast.toFixed(2)}; tinh anh ${elites}; khổng lồ ${giant}; thẻ "${card}"; 2 boss ${two}, máu ${hpOk}`);
  }
  { // ---- V6-10: mức Dễ (B14) + âm lượng hiệu ứng chung ----
    SETUP.easy = false; const hpN = newPlayer().maxHp; fresh(); const dN = spawnEnemy('skeleton').dmg, sN = spawnEnemy('skeleton').speed / 1; G.kills = 300; const soulN = runSouls();
    SETUP.easy = true; const hpE = newPlayer().maxHp, key = bestKey(); fresh(); const dE = spawnEnemy('skeleton').dmg; G.kills = 300; const soulE = runSouls();
    SETUP.easy = false; fresh();
    SFX.applyVolumes(); await wait(200); const sg = SFX.sfxGain ? SFX.sfxGain.gain.value : -1, want = SETTINGS.sfxVol * CFG.audio.sfxTrim;
    ok('V6-10', '10.1 Mức Dễ: máu ×1.3, sát thương quái ×0.8, linh hồn ×0.75, kỷ lục riêng; âm lượng hiệu ứng = thanh trượt × sfxTrim (< 1)',
      hpE === Math.round(hpN * CFG.easy.hp) && Math.abs(dE / dN - CFG.easy.dmg) < 1e-6 && soulE === Math.floor(soulN * CFG.easy.souls) && key === 'vs_best_easy' && CFG.audio.sfxTrim < 1 && Math.abs(sg - want) < 0.02,
      `máu ${hpN} → ${hpE}, dmg ×${(dE / dN).toFixed(2)}, linh hồn ${soulN} → ${soulE}, khoá ${key}, hiệu ứng ${sg.toFixed(2)} (cần ${want.toFixed(2)})`);
  }
  { // ---- V7-1 (A1): lớp ánh sáng đêm ----
    const lum = (x, y) => { const d = ctx.getImageData(x, y, 8, 8).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; return s / (d.length / 4); };
    // chỉ đo lightmap: tắt lớp thời tiết G5 (mảng sương trùng góc 8×8 làm góc sáng lên — phần đó do V8-5 kiểm)
    const shot = on => { const dw = window.drawWeather; window.drawWeather = () => {}; SETTINGS.light = on; light.failed = false; render(1); window.drawWeather = dw; return [lum(cv.width / 2 - 60, cv.height / 2 + 40), lum(12, 12)]; };
    fresh(); G.enemies.clear(); G.gems.clear(); G.shake = 0;
    const [cOff, kOff] = shot(false), [cOn, kOn] = shot(true);
    const sized = light.cv && light.cv.width === Math.ceil(VW) && light.cv.height === Math.ceil(VH);
    addZone(P().x + 150, P().y - 80, 30, 2, 1); render(1); const lit = light.n;          // số đèn của khung vừa vẽ
    G.zones.length = 0;
    const vw0 = VW, vh0 = VH; VW = Math.round(vw0 * 0.75); VH = Math.round(vh0 * 0.75); render(1);          // giả lập đổi cỡ cửa sổ (resize() đặt VW/VH)
    const resized = light.cv.width === Math.ceil(VW) && light.cv.height === Math.ceil(VH); VW = vw0; VH = vh0; render(1);
    for (let i = 0; i < 40; i++) lightTick(0.1, 25); const autoOff = light.failed === true && lightOn() === false;
    light.failed = false; light.slowT = 0; SETTINGS.light = true;
    ok('V7-1', '1.1 Ánh sáng đêm: giữa màn gần như nguyên sáng, góc màn tối 30–75%; tắt là như cũ; canvas đèn theo cỡ thế giới kể cả sau khi đổi cỡ; khung chậm 3 giây thì tự tắt',
      cOn / cOff >= 0.9 && kOn / kOff >= 0.3 && kOn / kOff <= 0.75 && sized && lit >= 2 && resized && autoOff,
      `giữa ${(cOn / cOff).toFixed(2)}, góc ${(kOn / kOff).toFixed(2)}, cỡ ${sized}/${resized}, đèn ${lit}, tự tắt ${autoOff}`);
  }
  { // ---- V7-2 (A2): luật màu ----
    const hue = h => { const n = parseInt(h.slice(1), 16), r = n >> 16, g = n >> 8 & 255, b = n & 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn || 1;
      const x = mx === r ? (g - b) / d % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return (x * 60 + 360) % 360; };
    const far = h => Math.min(hue(h), 360 - hue(h));          // khoảng cách sắc độ tới đỏ 0°
    const cols = ['bolt', 'orbit'].flatMap(id => [WEAPON_LOOK[id].col, ...WEAPON_LOOK[id].tiers.map(t => t.col)]);
    const near = cols.filter(c => far(c) < 35);
    const left = ['ff4d8d', 'ff3b5c', 'ff2040'].filter(c => JSON.stringify([WEAPON_LOOK, FX_STYLE]).toLowerCase().includes(c));
    ok('V7-2', '2.1 Màu vũ khí cách màu đỏ nguy hiểm ≥ 35° sắc độ; không còn mã màu cũ trong bảng hình; vòng sáng nhân vật luôn bật',
      !near.length && !left.length && CFG.playerRing && CFG.playerRing.a > 0 && CFG.playerRing.clear > CFG.playerRing.a, `gần đỏ: ${near.join(',') || 'không'}; mã cũ: ${left.join(',') || 'không'}`);
  }
  { // ---- V7-3 (A3): nảy khi trúng + bớt số sát thương khi đông ----
    fresh(); const e = spawnEnemy('golem', P().x + 40, P().y); hitEnemy(e, 1, 0, 0);
    const popDur = CFG.juice ? CFG.juice.pop : 0.09;
    const popped = !!(CFG.juice && e.pop === CFG.juice.pop);
    v.tick(popDur + 0.05); const settled = e.pop === 0;
    const nf = SETTINGS.noFlash; SETTINGS.noFlash = true; const quiet = typeof calm === 'function' && calm() === true; SETTINGS.noFlash = nf;
    fresh(); for (const w of ['bolt', 'orbit', 'lightning', 'knife', 'aura', 'nova']) v.give(w, 8); v.spawn(300, 'skeleton');
    let peak = 0; for (let i = 0; i < 50; i++) { v.tick(0.1); peak = Math.max(peak, G.texts.items.filter(t => t.num).length); }
    fresh(); const one = spawnEnemy('golem', P().x + 40, P().y); hitEnemy(one, 3, 0, 0); const few = G.texts.items.some(t => t.owner === one);
    ok('V7-3', '3.1 Quái nảy 0,09 giây khi trúng rồi về bình thường; giảm loé thì không nảy; 300 quái + 6 vũ khí cấp 8: tối đa 60 số cùng lúc; ít quái thì đòn nào cũng có số',
      popped && settled && quiet && peak <= 60 && few, `nảy ${popped}/${settled}, yên ${quiet}, đỉnh ${peak} số, ít quái ${few}`);
  }
  { // ---- V7-4 (A4): độ đậm hiệu ứng vũ khí ----
    const k = cv.width / VW, px = (wx, wy) => { const d = ctx.getImageData(Math.round((wx - (P().x - VW / 2)) * k), Math.round((wy - (P().y - VH / 2)) * k), 4, 4).data; return d[0] + d[1] + d[2]; };
    const fa = SETTINGS.fxAlpha, li = SETTINGS.light; SETTINGS.light = false;
    fresh(); G.enemies.clear(); G.shake = 0; v.give('aura', 8); addZone(P().x + 120, P().y, 24, 5, 1);
    const A = P().weapons.aura.radius * 0.7;
    SETTINGS.fxAlpha = 0; render(1); const base = px(P().x + A, P().y), zone0 = px(P().x + 120, P().y);
    SETTINGS.fxAlpha = 1; render(1); const full = px(P().x + A, P().y) - base;
    SETTINGS.fxAlpha = 0.4; render(1); const dim = px(P().x + A, P().y) - base, zone1 = px(P().x + 120, P().y);
    SETTINGS.fxAlpha = fa; SETTINGS.light = li; G.zones.length = 0;
    ok('V7-4', '4.1 Độ đậm hiệu ứng 40%: hào quang nhạt đi ít nhất 40% so với 100%; vùng nổ không đổi',
      full > 0 && dim <= full * 0.6 && Math.abs(zone1 - zone0) <= 6, `hào quang ${full} → ${dim}, vùng nổ ${zone0} → ${zone1}`);
  }
  { // ---- V7-5 (B1): mức phối hiệu ứng so với nhạc ----
    const m = await mixProbe(8), M = CFG.audio.mix;
    ok('V7-5', '5.1 Cảnh chuẩn 150 quái, thanh trượt mặc định: hiệu ứng nhỏ hơn hoặc bằng nhạc và không nhỏ hơn quá 9 dB',
      m.diff <= M.hi && m.diff >= M.lo, `hiệu ứng ${m.sfxDb.toFixed(1)} dB, nhạc ${m.musicDb.toFixed(1)} dB, chênh ${m.diff.toFixed(1)} dB`);
  }
  { // ---- V7-6 (B2): độ căng + tiếng nền ----
    const I = CFG.audio.intensity, step = (sec, n = 20) => { for (let i = 0; i < n; i++) SFX.updateIntensity(sec / n); return SFX.intensity; };
    fresh(); G.enemies.clear(); SFX.intensity = 0; const calm0 = step(3);
    v.spawn(150, 'skeleton'); v.spawnBoss('bossOgre'); G.cine = null; const hot = step(6);
    G.enemies.clear(); G.boss = null; const hold = step(1), cool = step(14);
    G.state = 'menu'; const menuT = SFX.intensityTarget(); G.state = 'play';
    // đo node thật: giữ đúng hoàn cảnh để sync() trong khung hình không kéo intensity đi chỗ khác
    v.spawn(150, 'skeleton'); v.spawnBoss('bossOgre'); G.cine = null; SFX.intensity = 1; SFX.applyVolumes(); await wait(600);
    const lpHot = SFX.musicLP.frequency.value, ambHot = SFX.ambGain.gain.value;
    G.enemies.clear(); G.boss = null; SFX.intensity = 0; SFX.applyVolumes(); await wait(600);
    const lpCalm = SFX.musicLP.frequency.value, ambCalm = SFX.ambGain.gain.value;
    ok('V7-6', '6.1 Độ căng: không quái ≈ 0; 150 quái + boss sau 6 giây > 0,9; hết quái 1 giây vẫn > 0,6 (xuống chậm), 15 giây về < 0,1; nhạc mở lọc khi căng; tiếng nền to khi yên, nhỏ khi căng',
      calm0 < 0.05 && hot > 0.9 && hold > 0.6 && cool < 0.1 && menuT === 0 && lpCalm < I.lpCalm * 1.3 && lpHot > 15000 && ambCalm > ambHot && ambHot > 0,
      `yên ${calm0.toFixed(2)}, căng ${hot.toFixed(2)}, giữ ${hold.toFixed(2)}, nguội ${cool.toFixed(2)}, lọc ${Math.round(lpCalm)} → ${Math.round(lpHot)} Hz, nền ${ambCalm.toFixed(3)} / ${ambHot.toFixed(3)}`);
  }
  { // ---- V7-7 (B3): âm theo khoảng cách ----
    fresh(); const D = CFG.audio.dist, p = P();
    const g0 = SFX.distGain(p.x + 50, p.y), g1 = SFX.distGain(p.x + (D.near + D.far) / 2, p.y), g2 = SFX.distGain(p.x + D.far + 50, p.y), g3 = SFX.distGain(p.x + 50);
    await wait(300); const nv = () => (SFX.voices.kill || []).length, v0 = nv(); SFX.play('kill', { x: p.x + D.far + 200, y: p.y }); const culled = nv() === v0;
    SFX.play('kill', { x: p.x + 30, y: p.y }); const played = nv() === v0 + 1;
    ok('V7-7', '7.1 Âm ở gần nguyên âm lượng, ở giữa nhỏ dần, quá 420 đơn vị không phát và không chiếm giọng; thiếu y thì như cũ',
      g0 === 1 && g1 > D.min && g1 < 1 && g2 === 0 && g3 === 1 && culled && played, `gần ${g0}, giữa ${g1.toFixed(2)}, xa ${g2}, bỏ ${culled}, phát ${played}`);
  }
  { // ---- V7-8 (B4): âm phản hồi còn thiếu + ẩn tab ----
    const heard = [], op = SFX.play; SFX.play = function (n, o) { heard.push(n); return op.call(this, n, o); };
    const cnt = n => heard.filter(x => x === n).length;
    fresh(); tryDash(); tryDash(); const dashDeny = cnt('deny') === 1;
    G.pending = 1; openLevelUp(); G.rerolls = 0; reroll(); const rrDeny = cnt('deny') === 2;
    show('levelup', false); G.state = 'play'; G.pending = 0;
    META.souls = 0; buyMeta(META_UPGRADES[0].id); const buyDeny = cnt('deny') === 3;
    togglePause(); const pIn = cnt('pauseIn') === 1; togglePause();
    SFX.play = op;
    Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange'));
    for (let i = 0; i < 30 && SFX.ctx && SFX.ctx.state !== 'suspended'; i++) await wait(50);
    const susp = SFX.ctx.state === 'suspended';
    delete document.hidden; document.dispatchEvent(new Event('visibilitychange'));
    for (let i = 0; i < 30 && SFX.ctx && SFX.ctx.state !== 'running'; i++) await wait(100);
    if (G.state === 'paused') togglePause();                       // ui.js tự tạm dừng khi tab ẩn
    const back = SFX.ctx.state === 'running', oneTrack = !!SFX.trackNode;
    ok('V7-8', '8.1 Lướt lúc chưa hồi, đổi thẻ hết lượt, mua thiếu linh hồn đều có tiếng báo; mở tạm dừng có tiếng; ẩn tab thì âm thanh dừng hẳn, hiện lại chạy tiếp đúng một bản nhạc',
      dashDeny && rrDeny && buyDeny && pIn && susp && back && oneTrack, `lướt ${dashDeny}, đổi thẻ ${rrDeny}, mua ${buyDeny}, dừng ${pIn}, ẩn ${susp}, hiện ${back}`);
  }
  if (!window.__loopSeam) await new Promise((res, rej) => { const s = document.createElement('script'); s.src = '../tools/loop-seam.js?v=' + Date.now(); s.onload = res; s.onerror = rej; document.body.append(s); });
  { // ---- V7-9 (B5): điểm nối vòng lặp + chọn nhạc theo giai đoạn ----
    const sr = 8000, d = new Float32Array(sr * 2); for (let i = 0; i < d.length; i++) d[i] = Math.sin(2 * Math.PI * 50 * i / sr);
    const s = snapLoop(d, sr, 0.5037, 1.5061), at = t => d[Math.round(t * sr)], up = t => d[Math.round(t * sr) + 1] > d[Math.round(t * sr)];
    const snapped = Math.abs(at(s.start)) < 0.05 && Math.abs(at(s.end)) < 0.05 && up(s.start) && up(s.end) && Math.abs(s.start - 0.5037) <= 0.02 && Math.abs(s.end - 1.5061) <= 0.02;
    const flat = snapLoop(new Float32Array(sr), sr, 0.2, 0.6), kept = flat.start === 0.2 && flat.end === 0.6;
    const mu = SFX.music, fake = { buf: 1 }; SFX.music = { normal: fake, boss: fake, late: fake, title: fake, win: fake };
    fresh(); const a = SFX.wantTrack(); v.skipTo(2); const b = SFX.wantTrack(); v.spawnBoss('bossOgre'); G.cine = null; const c = SFX.wantTrack();
    G.enemies.clear(); G.boss = null; G.state = 'menu'; const m = SFX.wantTrack(); G.state = 'over'; G.won = true; const w = SFX.wantTrack(); G.won = false; const l = SFX.wantTrack();
    SFX.music = { normal: fake, boss: fake }; G.state = 'play'; const fb = SFX.wantTrack(); G.state = 'menu'; const fm = SFX.wantTrack(); G.state = 'play';
    SFX.music = mu;
    ok('V7-9', '9.1 Điểm nối vòng lặp dời về chỗ tín hiệu qua 0 (≤ 20 ms), tín hiệu phẳng thì giữ nguyên; nhạc: đợt 1–2 thường, đợt 3+ bản sau, boss, menu, thắng; thiếu file thì lùi về bản đang có',
      snapped && kept && a === 'normal' && b === 'late' && c === 'boss' && m === 'title' && w === 'win' && l === null && fb === 'normal' && fm === null,
      `nối ${snapped}/${kept}; ${a}, ${b}, ${c}, ${m}, ${w}, ${l}; thiếu file: ${fb}, ${fm}`);
  }
  { // ---- V8-1 (G1): quái đọc được trong bóng tối ----
    const lumAt = (pts) => { let s = 0; for (const [x, y] of pts) { const d = ctx.getImageData(x - 2, y - 2, 4, 4).data; for (let i = 0; i < d.length; i += 4) s += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; } return s / (pts.length * 16); };
    fresh(); v.skipTo(2); G.enemies.clear(); G.gems.clear(); G.shake = 0; SETTINGS.light = true; light.failed = false;
    const ring = []; for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2; ring.push([P().x + Math.cos(a) * 200, P().y + Math.sin(a) * 200]); }
    const scr = ([x, y]) => [Math.round(cv.width / 2 + (x - P().x) * ZOOM * SCREEN), Math.round(cv.height / 2 + (y - P().y) * ZOOM * SCREEN)];
    render(1); const bg = lumAt(ring.map(scr));
    for (const [x, y] of ring) { const e = spawnEnemy('golem', x, y); e.vx = e.vy = 0; e.inT = 0; }
    render(1); const fg = lumAt(ring.map(scr));
    const contrast = Math.abs(fg - bg) / Math.max(1, bg);
    G.enemies.clear();
    ok('V8-1', '1.1 Golem ở 200 đơn vị (ngoài đèn nhân vật) chênh độ sáng với nền ≥ 35% khi bật ánh sáng đêm',
      contrast >= 0.35, `nền ${bg.toFixed(1)}, quái ${fg.toFixed(1)}, chênh ${(contrast * 100).toFixed(0)}%`);
  }
  { // ---- V8-2 (G2): hạ hàng loạt không loá trắng, số sát thương gộp ----
    // "trắng" = cả 3 kênh > 170: lớp nháy trắng phủ 0.75 lên golem sẫm chỉ ra ~200, ngưỡng 235 chỉ bắt chỗ 2 xác chồng nhau (đo: nháy 8%, không nháy 0.25%)
    const whiteShare = () => { const d = ctx.getImageData(0, 0, cv.width, cv.height).data; let w = 0; for (let i = 0; i < d.length; i += 64) if (d[i] > 170 && d[i + 1] > 170 && d[i + 2] > 170) w++; return w / (d.length / 64); };
    fresh(); v.skipTo(2); G.enemies.clear(); G.gems.clear(); G.fx.clear(); G.texts.clear(); G.shake = 0;
    const lightWas = SETTINGS.light, noFlashWas = SETTINGS.noFlash, numWas = SETTINGS.dmgNum;
    SETTINGS.light = false; SETTINGS.noFlash = false; SETTINGS.dmgNum = true; // trường hợp xấu nhất: không có lớp đêm làm tối nháy trắng
    for (let i = 0; i < 60; i++) { const e = spawnEnemy('golem', P().x + rand(-150, 150), P().y + rand(-100, 100)); e.vx = e.vy = 0; e.inT = 0; }
    for (const e of [...G.enemies.items]) killEnemy(e); // đường hạ quái thật → 60 hiệu ứng 'die'
    for (const f of G.fx.items) if (f.type === 'die') f.life -= 0.06; // còn ~73% thời gian: đang trong pha nháy trắng (a > 0.55)
    render(1); const ws = whiteShare();
    G.texts.clear(); G.dmgAvg = 0;
    for (let i = 0; i < 60; i++) addDmgText({ x: P().x + (i % 6) * 4, y: P().y + ((i / 6) | 0) * 2, r: 8 }, 33); // 60 quái khác nhau, sát nhau
    let nums = 0; for (const t of G.texts.items) if (t.num && !t.dead) nums++;
    G.texts.clear(); G.fx.clear();
    SETTINGS.light = lightWas; SETTINGS.noFlash = noFlashWas; SETTINGS.dmgNum = numWas;
    ok('V8-2', '2.1 Hạ 60 quái cùng lúc: điểm ảnh trắng ≤ 4% màn; 60 đòn 33 sát nhau thành ≤ 15 số',
      ws <= 0.04 && nums <= 15, `trắng ${(ws * 100).toFixed(1)}%, số ${nums}`);
  }
  { // ---- V8-3 (G3): nguồn sáng cố định theo đợt ----
    const hue = h => { const [r, g, b] = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255), M = Math.max(r, g, b), m = Math.min(r, g, b), d = M - m;
      if (!d) return 0; const x = M === r ? ((g - b) / d) % 6 : M === g ? (b - r) / d + 2 : (r - g) / d + 4; return (x * 60 + 360) % 360; };
    const hdist = (a, b) => { const d = Math.abs(hue(a) - hue(b)); return Math.min(d, 360 - d); };
    const has = typeof propsOnCam === 'function', lightWas = SETTINGS.light, nfWas = SETTINGS.noFlash;
    const clean = () => { G.enemies.clear(); G.gems.clear(); G.bullets.clear(); G.fx.clear(); G.zones.length = 0; G.shake = 0; };
    let seen = [], same = false, nMax = 0, hueMin = 0, flick = -1, still = -1, endless = 'không có propsOnCam';
    if (has) {
      SETTINGS.light = true; light.failed = false; SETTINGS.noFlash = false;
      // (a) đi 2000 đơn vị theo trục x ở mỗi đợt: số đèn thế giới trong khung (trừ đèn người chơi) luôn 1..6; (d) tổng đèn ≤ CFG.light.max
      for (let i = 0; i < 4; i++) { fresh(); v.skipTo(i); clean(); for (let d = 0; d <= 2000; d += 100) { P().x = d; P().y = 50; render(1); seen.push(light.n - 1); nMax = Math.max(nMax, light.n); } }
      // (b) cố định theo toạ độ
      const a1 = JSON.stringify(propsOnCam(123, 456, [], 100)), a2 = JSON.stringify(propsOnCam(123, 456, [], 100));
      same = a1 === a2 && a1 !== '[]';
      // (c) luật màu V7
      hueMin = Math.min(...WAVE_DEFS.map(w => w.props ? hdist(w.props.col, CFG.light.zoneCol) : 0));
      // (e) lập loè: điểm ảnh lightmap cạnh một đèn ở 150 đơn vị bên phải người chơi (ngoài đèn nhân vật), 2 thời điểm; giảm loé thì bằng nhau
      fresh(); clean();
      const f = propsOnCam(-500, -500, [], 0)[0];
      if (f) {
        P().x = f.x - 150; P().y = f.y;
        const camX = snapPx(P().x - VW / 2), camY = snapPx(P().y - VH / 2), off = CFG.props.r * WAVE_DEFS[0].props.k * 0.6;   // lệch khỏi tâm đèn để không bão hoà 255
        const at = t => { G.t = t; render(1); const d = light.cv.getContext('2d').getImageData(Math.round(f.x + off - camX), Math.round(f.y - camY), 1, 1).data; return d[0] + d[1] + d[2]; };
        flick = Math.abs(at(0.3) - at(1.1));
        SETTINGS.noFlash = true; still = Math.abs(at(0.3) - at(1.1));
      }
      fresh(); v.skipTo(6); clean(); try { render(1); endless = light.n > 1 ? 'ok' : 'không có đèn'; } catch (e) { endless = e.message; }
    }
    SETTINGS.light = lightWas; SETTINGS.noFlash = nfWas;
    ok('V8-3', '3.1 Đèn thế giới: đi 2000 đơn vị ở mỗi đợt luôn thấy 1–6 đèn; cố định theo toạ độ; màu lệch ≥ 35° so với đỏ nguy hiểm; không vượt CFG.light.max; lập loè, giảm loé thì đứng yên; vô tận có đèn',
      has && Math.min(...seen) >= 1 && Math.max(...seen) <= 6 && same && hueMin >= 35 && nMax <= CFG.light.max && flick > 0 && still === 0 && endless === 'ok',
      `đèn ${has ? Math.min(...seen) + '–' + Math.max(...seen) : '-'}, cố định ${same}, sắc độ ≥ ${hueMin.toFixed(1)}°, tổng ≤ ${nMax}/${CFG.light.max}, lập loè ${flick}, giảm loé ${still}, vô tận ${endless}`);
  }
  { // ---- V8-4 (G4): vết loang khi quái chết — giới hạn riêng, tự tan ----
    const R = CFG.remains || {}, chanceWas = R.chance, stains = () => G.decals.filter(d => d.kind === 'stain').length;
    fresh(); v.skipTo(2); G.enemies.clear(); G.decals.length = 0; R.chance = 1;   // chắc chắn có vết để phép thử không đạt nhờ may
    addDecal('scorch', P().x, P().y, 20, 99); const scorch = G.decals[0];
    for (let i = 0; i < 200; i++) killEnemy(spawnEnemy('skeleton', P().x + rand(-150, 150), P().y + rand(-100, 100)));
    const st = stains(), kept = G.decals.includes(scorch);
    G.decals = G.decals.filter(d => d.kind !== 'stain');
    const boss = spawnEnemy('bossZombie', P().x + 60, P().y), crate = spawnEnemy('crate', P().x - 60, P().y);
    killEnemy(boss); killEnemy(crate); const bc = stains();
    G.booms.length = 0; G.slowT = 0; G.boss = null; G.flashT = 0; G.enemies.clear(); G.gems.clear();
    for (let i = 0; i < 10; i++) killEnemy(spawnEnemy('skeleton', P().x + i * 10, P().y + 40));
    R.chance = 0; v.tick((R.life || 0) + 1); const left = stains();   // không sinh vết mới trong lúc chờ
    R.chance = chanceWas; G.decals.length = 0;
    ok('V8-4', '4.1 Hạ 200 quái: có vết loang, ≤ cap riêng, vết sét cũ vẫn còn; sau life + 1 giây hết vết; boss và thùng gỗ không để vết',
      st > 0 && st <= R.cap && kept && bc === 0 && left === 0, `vết ${st}/${R.cap}, sét còn ${kept}, boss+thùng ${bc}, còn sau chờ ${left}`);
  }
  { // ---- V8-5 (G5): sương, bụi, tro theo đợt ----
    const hue = h => { const [r, g, b] = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255), M = Math.max(r, g, b), m = Math.min(r, g, b), d = M - m;
      if (!d) return 0; const x = M === r ? ((g - b) / d) % 6 : M === g ? (b - r) / d + 2 : (r - g) / d + 4; return (x * 60 + 360) % 360; };
    const hdist = (a, b) => { const d = Math.abs(hue(a) - hue(b)); return Math.min(d, 360 - d); };
    const has = typeof drawWeather === 'function', clearWas = SETTINGS.clear, lightWas = SETTINGS.light;
    const calls = fn => { let n = 0; const di = ctx.drawImage, fr = ctx.fillRect;   // đếm lệnh vẽ trong fn
      ctx.drawImage = function () { n++; return di.apply(this, arguments); }; ctx.fillRect = function () { n++; return fr.apply(this, arguments); };
      try { fn(); } finally { delete ctx.drawImage; delete ctx.fillRect; } return n; };
    let drawn = [], clearN = -1, endless = 'không có drawWeather', maxCh = 1, hueMin = 0;
    if (has) {
      SETTINGS.clear = false; for (let i = 0; i < 4; i++) drawn.push(calls(() => drawWeather(0, 0, 1, i)));
      SETTINGS.clear = true; clearN = 0; for (let i = 0; i < 4; i++) clearN += calls(() => drawWeather(0, 0, 1, i));
      SETTINGS.clear = false; SETTINGS.light = true; light.failed = false;
      fresh(); v.skipTo(6); try { render(1); endless = calls(() => render(1)) > 0 ? 'ok' : 'không vẽ'; } catch (e) { endless = e.message; }
      // tâm màn (người chơi): độ sáng trung bình vùng 40×40 px khi có / không có thời tiết
      const lum = () => { const d = ctx.getImageData((cv.width >> 1) - 20, (cv.height >> 1) - 20, 40, 40).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; return s / (d.length / 4); };
      const dw = window.drawWeather; maxCh = 0;
      for (let i = 0; i < 4; i++) {
        v.skipTo(i); G.enemies.clear(); G.gems.clear(); G.fx.clear(); G.parts.clear(); G.texts.clear(); G.shake = 0;
        render(1); const on = lum(); window.drawWeather = () => {}; render(1); const off = lum(); window.drawWeather = dw;
        maxCh = Math.max(maxCh, Math.abs(on - off) / Math.max(1, off));
      }
      hueMin = Math.min(...WAVE_DEFS.map(w => w.weather ? hdist(w.weather.col, CFG.light.zoneCol) : 0));
      SETTINGS.clear = clearWas; SETTINGS.light = lightWas;
    }
    ok('V8-5', '5.1 Thời tiết: mỗi đợt có vẽ, Dễ nhìn thì không vẽ gì; đợt 7 (vô tận) không lỗi; tâm màn đổi ≤ 8%; màu lệch ≥ 35° so với đỏ nguy hiểm',
      has && drawn.every(n => n > 0) && clearN === 0 && endless === 'ok' && maxCh <= 0.08 && hueMin >= 35,
      `vẽ ${drawn.join('/')}, Dễ nhìn ${clearN}, vô tận ${endless}, tâm đổi ${(maxCh * 100).toFixed(1)}%, sắc độ ≥ ${hueMin.toFixed(0)}°`);
  }
  { // ---- V8-6 (G6): nhân vật bóp-giãn ----
    // Vẽ riêng nhân vật lên canvas trống, đo khung điểm ảnh không trong suốt (vùng 96×96: sprite cao 40 px ở ZOOM 2 và lệch lên trên tâm, giãn dọc 1.18 vẫn lọt).
    // So với chính nhân vật đó bỏ `sq` (cùng khung hoạt ảnh) → chỉ còn phần bóp-giãn.
    const box = o => { const S = 96; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.setTransform(ZOOM, 0, 0, ZOOM, (cv.width >> 1) - o.x * ZOOM, (cv.height >> 1) - o.y * ZOOM); draw(ctx, o, 'player'); ctx.setTransform(1, 0, 0, 1, 0, 0);
      const d = ctx.getImageData((cv.width >> 1) - S / 2, (cv.height >> 1) - S / 2, S, S).data; let x0 = S, x1 = -1, y0 = S, y1 = -1;
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (d[(y * S + x) * 4 + 3] > 0) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      return [x1 - x0 + 1, y1 - y0 + 1]; };
    const vs = () => { const a = box(P()), b = box({ ...P(), sq: null }); return { dw: a[0] - b[0], dh: a[1] - b[1], w: a[0] / b[0], h: a[1] / b[1] }; };
    const dash = (dx, dy) => { const p = P(); p.dashCd = p.dashT = 0; p.dirX = dx; p.dirY = dy; tryDash(); v.tick(1 / 60); return vs(); };
    const same = r => Math.abs(r.dw) <= 1 && Math.abs(r.dh) <= 1, nfWas = SETTINGS.noFlash, live = !REDUCED_MOTION;
    SETTINGS.noFlash = false; fresh();
    const hor = dash(1, 0), ver = dash(0, 1); v.tick(0.5); const back = vs();
    P().iframe = 0; hurtPlayer(1); const hurt = vs();
    G.xpNeed = 1; addXp(1); const lvl = vs(); G.pending = 0; G.state = 'play';
    SETTINGS.noFlash = true; const quiet = dash(1, 0); SETTINGS.noFlash = nfWas;
    const moved = live ? hor.w >= 1.08 && ver.h >= 1.08 && hurt.dw < 0 && hurt.dh > 0 && lvl.dw < 0 && lvl.dh > 0 : same(hor) && same(ver) && same(hurt) && same(lvl);
    const f = r => `${r.dw >= 0 ? '+' : ''}${r.dw}/${r.dh >= 0 ? '+' : ''}${r.dh} px`;
    ok('V8-6', '6.1 Nhân vật: lướt ngang giãn ngang ≥ 8%, lướt dọc giãn dọc ≥ 8%, bị đánh / lên cấp bóp lại; sau 0,5 giây như cũ; giảm loé thì không đổi (±1 px)',
      moved && same(back) && same(quiet),
      `ngang ×${hor.w.toFixed(2)}, dọc ×${ver.h.toFixed(2)}, bị đánh ${f(hurt)}, lên cấp ${f(lvl)}, sau 0,5 s ${f(back)}, giảm loé ${f(quiet)}${live ? '' : ' (máy bật reduced-motion: chỉ kiểm không đổi)'}`);
  }
  SFX.intensity = 0; SFX.ducked = false; SFX.lowMix = false; SFX.applyVolumes();
  G.enemies.clear(); G.boss = null; G.zones.length = 0;
  CFG.hints.on = true;
  SETUP.easy = easyBak;
  if (typeof lightBak === 'boolean') SETTINGS.light = lightBak;
  if (document.getElementById('optLight')) document.getElementById('optLight').checked = SETTINGS.light;
  if (typeof fxAlphaBak === 'number') SETTINGS.fxAlpha = fxAlphaBak;
  if (document.getElementById('optFx')) {
    const el = document.getElementById('optFx');
    el.value = Math.round(SETTINGS.fxAlpha * 100);
    if (document.getElementById('optFxV')) document.getElementById('optFxV').textContent = el.value + '%';
  }
  for (const k of Object.keys(META)) delete META[k];
  Object.assign(META, JSON.parse(metaAll));
  for (const [k, val] of lsAll) val === null ? localStorage.removeItem(k) : localStorage.setItem(k, val);
  renderMenu();
  G.state = 'over';
  return out;
};
