'use strict';
/* Kiểm tra tự động các tiêu chí nghiệm thu Giai đoạn 0–6 (chỉ dùng khi phát triển, game KHÔNG nạp file này).
   Trong console của trang game (sau khi bấm "Bắt đầu" một lần để mở âm thanh):
     const s = document.createElement('script'); s.src = 'tools/checks.js'; document.body.append(s);
     await runChecks()   // trả về danh sách { giai_doan, tieu_chi, ok, chi_tiet }
   Những gì KHÔNG tự kiểm được (nghe âm thanh, cảm giác tay, khung hình thật khi pane bị ẩn) không có ở đây. */
window.runChecks = async function () {
  const out = [], v = __vs, G = v.G;
  const ok = (gd, name, pass, detail = '') => out.push({ giai_doan: gd, tieu_chi: name, ok: !!pass, chi_tiet: String(detail) });
  const kd = (code, key = 'x') => dispatchEvent(new KeyboardEvent('keydown', { code, key }));
  const ku = (code, key = 'x') => dispatchEvent(new KeyboardEvent('keyup', { code, key }));
  const wait = ms => new Promise(r => setTimeout(r, ms));
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
  ok(4, 'Đã nạp SFX và 2 bài nhạc', Object.keys(SFX.bufs).length >= 8 && Object.keys(SFX.music).length === 2, `${Object.keys(SFX.bufs).length} nhóm SFX, nhạc: ${Object.keys(SFX.music).join(',') || 'chưa (cần bấm Bắt đầu để mở âm thanh)'}`);
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
  const tintOk = Assets.get('bomber') && Assets.get('bomber').img !== Assets.get('bat').img;
  fresh(); for (const t of ['bomber', 'splitter', 'charger']) spawnEnemy(t, P().x + rand(-60, 60), P().y + rand(-40, 40));
  const el = v.spawnElite('golem'); el.x = P().x + 50; el.y = P().y;
  const rg = Assets.get; let shapeErr = ''; Assets.get = () => null; try { render(1); } catch (err) { shapeErr = String(err); } Assets.get = rg;
  const gems0 = G.gems.items.length; hitEnemy(el, 1e9, 1, 0); const eliteDrop = G.gems.items.length - gems0;
  ok('V4-3', '3.4 Quỷ nổ, nhớt mẹ, kỵ sĩ xương, tinh anh, ảnh nhuộm, hình dự phòng', bomberOk && sl1 - sl0 === 3 && chTele && Math.abs(chDist - 152) < 15 && tintOk && !shapeErr && eliteDrop >= 2,
    `nổ ${bomberOk}, tách ${sl1 - sl0}, lao ${chTele}/${chDist.toFixed(0)}, nhuộm ${!!tintOk}, dự phòng ${shapeErr || 'ok'}, rơi ${eliteDrop}`);
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
  META.souls = 40; const bought = buyMeta('hp'); const hp41 = newPlayer().maxHp; const kept = (store.get('vs_meta', {}).up || {}).hp === 1;
  ok('V4-4', '4.1 250 quái + 1 boss = 40 linh hồn; mua Sinh lực 1 → 128 máu; lưu lại', s41 === 40 && bought && META.souls === 0 && hp41 === 128 && kept, `linh hồn ${s41}, máu ${hp41}, lưu ${kept}`);
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
  let decMax = 0; for (let i = 0; i < 300; i++) { v.tick(0.05); decMax = Math.max(decMax, G.decals.length); for (let k = 0; k < 5; k++) addDecal('scorch', 0, 0, 10, 5); }
  ok('V5-3', '3.2 Vết trên nền có giới hạn', decMax <= CFG.decals.cap && decMax > 0, `${decMax}/${CFG.decals.cap}`);
  G.state = 'over';
  return out;
};
