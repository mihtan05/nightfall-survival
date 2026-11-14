'use strict';
/* =========================================================
   TRẠNG THÁI GAME
   ========================================================= */
const G = {
  state: 'menu', t: 0, kills: 0, level: 1, xp: 0, xpNeed: CFG.xpFor(1), pending: 0, spawnAcc: 0, shake: 0,
  boss: null, won: false, chestOpen: false, typeCount: {}, stepId: 0, stats: { dmg: {}, taken: {}, since: {} }, cine: null, slowT: 0, booms: [], gainT: 0, gemStreak: 0, gemLast: -1,
  hitStop: 0, warns: [], zones: [], freezeT: 0, flashT: 0, flashColor: '#fff', crateT: 0, diffT: 0, lvlWait: 0,
  wave: { i: 0, phase: 'fight', t: 0, evIdx: 0, announced: false },
  player: null,
  sfx: new Pool(() => ({})),
  enemies: new Pool(() => ({})),
  bullets: new Pool(() => ({ hit: new Set() })),
  shots: new Pool(() => ({})),
  gems: new Pool(() => ({})),
  parts: new Pool(() => ({})),
  fx: new Pool(() => ({ hit: new Set(), pts: [] })),
  texts: new Pool(() => ({})),
  grid: new Grid(CFG.grid),
  best: store.get('vs_best', { time: 0, kills: 0, level: 1 }), nm: false, endless: false, bossKills: 0,
  choices: [],
};
// Tiến trình lâu dài (linh hồn, nâng cấp vĩnh viễn, vũ khí đã mở, đã thắng chưa)
const META = Object.assign({ souls: 0, up: {}, unlocked: ['bolt'], runs: 0, won: false }, store.get('vs_meta', {}));
const saveMeta = () => store.set('vs_meta', META);
const metaLv = id => META.up[id] || 0;
const SETUP = { start: store.get('vs_start', 'bolt'), nm: false };   // lựa chọn ở menu cho ván tiếp theo
if (!META.unlocked.includes(SETUP.start)) SETUP.start = 'bolt';
const tmp = [];
const POOLS = ['enemies', 'bullets', 'shots', 'gems', 'parts', 'fx', 'sfx', 'texts'];
const lerp = (a, b, t) => a + (b - a) * t;

function newWeapon(id) { return { id, ...WEAPONS[id].base, timer: 0.3 }; }
function newPlayer(start = 'bolt') {
  const hp = CFG.player.hp + 8 * metaLv('hp');
  return {
    x: 0, y: 0, r: CFG.player.radius, hp, maxHp: hp,
    speed: CFG.player.speed * (1 + 0.03 * metaLv('spd')), magnet: CFG.player.magnet * (1 + 0.1 * metaLv('mag')),
    armor: 0, regen: 0, mDmg: 1 + 0.04 * metaLv('dmg'), mCd: 1, mArea: 1, xpMul: 1 + 0.05 * metaLv('xp'),
    iframe: 0, hurtT: 0, face: 1, dirX: 1, dirY: 0, moving: false, anim: 0,
    dashT: 0, dashCd: 0, dashX: 1, dashY: 0, trail: [], trailN: 0,
    buffs: { shield: 0, speed: 0, rage: 0, xp2: 0 }, shieldHits: 0,   // hiệu ứng tạm thời từ vật phẩm (giây còn lại)
    levels: { [start]: 1 },
    weapons: { [start]: newWeapon(start) },
  };
}
// Hệ số sát thương thực tế (gồm thuốc cuồng nộ)
function dmgMul(p) { return p.mDmg * (p.buffs.rage > 0 ? 1.5 : 1); }

function resetWorld() {
  for (const k of POOLS) G[k].clear();
  G.player = newPlayer(SETUP.start);
  Object.assign(G, {
    t: 0, kills: 0, level: 1, xp: 0, xpNeed: CFG.xpFor(1), pending: 0, spawnAcc: 0, shake: 0,
    boss: null, won: false, chestOpen: false, typeCount: {}, hitStop: 0, warns: [], zones: [],
    freezeT: 0, flashT: 0, crateT: CFG.crates.every, diffT: 0, lvlWait: 0,
    cine: null, slowT: 0, booms: [], gainT: 0, gemStreak: 0, gemLast: -1, rerolls: CFG.rerolls + metaRoll(metaLv('roll')).rerolls,
    stats: { dmg: {}, taken: {}, since: { [SETUP.start]: 0 } },
    nm: SETUP.nm, endless: false, bossKills: 0, evolved: false, soulsGiven: 0, endDef: null, novaFreeAt: 0, healT0: -9, healAmt: 0,
    wave: { i: 0, phase: 'fight', t: 0, evIdx: 0, announced: false },
  });
  for (let i = 0; i < 3; i++) spawnCrate(rand(110, 240)); // vài thùng gỗ ngay đầu trận
  renderOwned();
}


/* =========================================================
   SPAWN, ĐỢT QUÁI & SỰ KIỆN
   ========================================================= */
// Khoảng cách sinh quái: ngay ngoài góc vùng thế giới đang nhìn thấy (VW×VH, đơn vị thế giới)
function ringDist() { return Math.hypot(VW, VH) / 2 + CFG.spawn.ringPad; }

function spawnEnemy(type, x, y) {
  const def = ENEMIES[type], p = G.player;
  if (x === undefined) { const a = Math.random() * TAU, R = ringDist(); x = p.x + Math.cos(a) * R; y = p.y + Math.sin(a) * R; }
  const min = G.diffT / 60, N = CFG.nightmare, en = endlessN();
  const modeHp = (G.nm ? N.hp : 1) * CFG.endless.hp ** en;            // Ác mộng / vô tận: nhân cả boss
  const hpMul = (1 + min * CFG.hpScalePerMin) * modeHp, dm = (1 + min * CFG.dmgScalePerMin) * (G.nm ? N.dmg : 1);
  const e = G.enemies.get();
  e.type = type; e.x = x; e.y = y; e.boss = !!def.boss; e.prop = !!def.prop;
  e.r = def.r; e.speed = def.speed * (def.boss ? 1 : rand(0.9, 1.1)); e.mass = def.mass;
  e.maxHp = e.hp = def.hp * (def.prop ? 1 : def.boss ? modeHp : hpMul); e.dmg = def.dmg * dm; e.xp = def.xp; e.dmgScale = dm;
  e.shotDmg = def.ranged ? def.ranged.dmg * dm : 0;
  e.shootT = def.ranged ? rand(1, def.ranged.cd) : 2.5;
  e.flash = 0; e.kx = 0; e.ky = 0; e.anim = Math.random() * 10; e.face = 1; e.orbCd = 0; e.auraCd = 0;
  e.tele = false; e.warned = false; e.txt = null; e.frozen = false; e.fade = 0; e.skill = null; e.stunT = 0; e.slowT = 0; e.raged = false; e.sc = 1; e.elite = false; e.chPhase = 0; e.chT = rand(1, 3); e.chDir = 0;
  e.hpLag = 0; e.inT = Math.abs(x - p.x) < VW / 2 && Math.abs(y - p.y) < VH / 2 ? CFG.spawnIn : 0; // sinh ngay trong tầm nhìn → hiện dần (chỉ là hình ảnh)
  return e;
}

function spawn(dt, rate, mix) {
  G.spawnAcc += rate * dt * (G.nm ? CFG.nightmare.rate : 1) * (1 + CFG.endless.rate * endlessN());
  while (G.spawnAcc >= 1) {
    G.spawnAcc--;
    if (G.enemies.items.length >= CFG.spawn.maxEnemies) continue;
    let type = pickWeighted(mix);
    const cap = ENEMIES[type].cap; // giới hạn quái bắn xa để không bị "mưa đạn"
    if (cap && (G.typeCount[type] || 0) >= cap + Math.floor(G.diffT / 120)) type = 'skeleton';
    G.typeCount[type] = (G.typeCount[type] || 0) + 1;
    spawnEnemy(type);
  }
}

/* ---------- Thùng gỗ phá được (rơi vật phẩm) ---------- */
function spawnCrate(dist) {
  const p = G.player, a = Math.random() * TAU;
  return spawnEnemy('crate', p.x + Math.cos(a) * dist, p.y + Math.sin(a) * dist);
}
function updateCrates(dt) {
  G.crateT -= dt; if (G.crateT > 0) return;
  G.crateT = CFG.crates.every;
  if ((G.typeCount.crate || 0) < CFG.crates.max) spawnCrate(ringDist() * rand(0.8, 1.3));
}

/* ---------- Đợt quái: đánh → boss → nghỉ → đợt sau; hạ boss cuối là thắng ---------- */
// Số đợt vô tận đã bắt đầu (đợt 5 → 1, đợt 6 → 2 …)
function endlessN() { return Math.max(0, G.wave.i - (WAVE_DEFS.length - 1)); }
// Đợt vô tận: dùng lại định nghĩa đợt 4 với boss ngẫu nhiên (máu/mật độ nhân trong spawnEnemy/spawn)
function waveDef() {
  const i = G.wave.i, last = WAVE_DEFS.length - 1;
  if (i <= last) return WAVE_DEFS[i];
  if (!G.endDef || G.endDef.i !== i) G.endDef = { ...WAVE_DEFS[last], i, name: 'Đêm vô tận', boss: WAVE_DEFS[Math.floor(Math.random() * WAVE_DEFS.length)].boss };
  return G.endDef;
}
const waveLabel = i => i < WAVE_DEFS.length && !G.endless ? `${i + 1}/${WAVE_DEFS.length}` : String(i + 1);
function waveMix(def, t) { let m = def.mix[0].mix; for (const x of def.mix) if (t >= x.t) m = x.mix; return m; }
function updateWave(dt) {
  const w = G.wave, def = waveDef();
  if (!w.announced) { w.announced = true; banner(`Đợt ${waveLabel(w.i)}: ${def.name}`); }
  w.t += dt;
  if (w.phase === 'fight') {
    G.diffT += dt;
    runEvents(def);
    if (def.elites && (w.eliteIdx || 0) < def.elites.length && w.t >= def.elites[w.eliteIdx || 0]) { w.eliteIdx = (w.eliteIdx || 0) + 1; spawnElite(); banner('Quái tinh anh xuất hiện!'); }
    if (!w.warned && def.dur - w.t <= 10) { w.warned = true; banner('Boss sắp xuất hiện!'); SFX.play('warn'); }
    spawn(dt, lerp(def.rate[0], def.rate[1], clamp(w.t / def.dur, 0, 1)), waveMix(def, w.t));
    if (w.t >= def.dur) { w.phase = 'boss'; w.t = 0; spawnBoss(def.boss); }
  } else if (w.phase === 'boss') {
    spawn(dt, def.rate[1] * CFG.bossSpawnMul, waveMix(def, def.dur));   // quái thường thưa hơn khi đánh boss
    if (!G.boss) {
      w.t = 0;
      if (w.i >= WAVE_DEFS.length - 1 && !G.endless) w.phase = 'won';
      else {
        w.phase = 'rest'; banner(`Đợt ${w.i + 1} hoàn thành!`);
        for (const g of G.gems.items) if (g.kind === 'xp') { g.pulled = true; g.sp = 250; } // gom hết ngọc
      }
    }
  } else if (w.phase === 'rest') {
    if (w.t >= CFG.restTime) G.wave = { i: w.i + 1, phase: 'fight', t: 0, evIdx: 0, announced: false };
  } else if (w.phase === 'won') {
    if (w.t >= CFG.bossDeath.winWait) endRun(true); // chờ vụ nổ boss diễn xong
  }
  processWarns();
}

function spawnBoss(type) {
  const def = ENEMIES[type], e = spawnEnemy(type);
  e.skillCd = {}; e.skill = null; e.nextSkill = 2; e.age = 0; e.haste = 0; e.used2 = false;
  G.boss = e; addShake(8); SFX.play('boss');
  G.cine = { t: CFG.cine.dur, x: e.x, y: e.y };
  showBossCard(def);
  setBossName(def.name);
}

function runEvents(def) {
  const p = G.player, w = G.wave;
  while (w.evIdx < def.events.length && w.t >= def.events[w.evIdx].t) {
    const ev = def.events[w.evIdx++];
    if (ev.msg) banner(ev.msg);
    if (ev.kind === 'circle') {
      // Báo trước 1 giây: vẽ vòng tròn cảnh báo quanh người chơi rồi mới sinh quái
      G.warns.push({ at: G.t + 1, type: ev.type, n: ev.n, R: Math.max(140, Math.min(VW, VH) * 0.48) });
    } else if (ev.kind === 'swarm') {
      const a = Math.random() * TAU, R = ringDist(), cx = p.x + Math.cos(a) * R, cy = p.y + Math.sin(a) * R;
      for (let i = 0; i < ev.n; i++) spawnEnemy(ev.type, cx + rand(-70, 70), cy + rand(-70, 70));
    }
  }
}
// Hết thời gian cảnh báo → sinh vòng vây
function processWarns() {
  const p = G.player;
  for (let i = G.warns.length - 1; i >= 0; i--) {
    const w = G.warns[i];
    if (G.t < w.at) continue;
    for (let k = 0; k < w.n; k++) { const a = k / w.n * TAU; spawnEnemy(w.type, p.x + Math.cos(a) * w.R, p.y + Math.sin(a) * w.R); }
    G.warns.splice(i, 1);
  }
}

/* ---------- Kỹ năng boss: luôn có pha báo trước (tele) rồi mới ra đòn ---------- */
function startSkill(e, def) {
  const list = e.raged && def.skills2 ? def.skills.concat(def.skills2) : def.skills;
  const ready = list.filter(id => !(e.skillCd[id] > 0));
  if (!ready.length) { e.nextSkill = 0.3; return; }
  const id = ready[Math.floor(Math.random() * ready.length)], S = BOSS_SKILLS[id], p = G.player;
  const rage = e.hp < e.maxHp * 0.5, h = 1 + (e.haste || 0);
  const sk = e.skill = { id, phase: 'tele', t: S.tele * (rage ? 0.85 : 1) / h };
  sk.tele0 = sk.t;
  e.skillCd[id] = S.cd * (rage ? 0.7 : 1) / h;
  if (id === 'charge' || id === 'quake') { sk.dir = Math.atan2(p.y - e.y, p.x - e.x); sk.x0 = e.x; sk.y0 = e.y; }
  else if (id === 'wall') sk.hole = Math.floor(Math.random() * S.n);
  else if (id === 'rings') { sk.off = Math.random() * TAU; sk.k = 0; playFx('magicCircle', e.x, e.y, 0, e, e.r * 0.6); }
  else if (id === 'boulders') {
    const a = Math.atan2(p.y - e.y, p.x - e.x);
    for (let i = 0; i < S.n; i++) addZone(e.x + Math.cos(a) * S.step * (i + 1), e.y + Math.sin(a) * S.step * (i + 1), S.r, sk.t + i * S.gap, S.dmg * e.dmgScale);
    e.used2 = true;
  }
  else if (id === 'teleport') { const a = Math.random() * TAU; sk.tx = p.x + Math.cos(a) * 115; sk.ty = p.y + Math.sin(a) * 115; playFx('magicCircle', sk.tx, sk.ty + 10); }
  else if (id === 'summon' || id === 'ring' || id === 'spiral') playFx('magicCircle', e.x, e.y, 0, e, e.r * 0.6);
  else if (id === 'slam' || id === 'meteor') {
    for (let i = 0; i < S.n; i++) {
      const a = Math.random() * TAU, off = id === 'slam' ? (i === 0 ? 0 : rand(45, 80)) : rand(15, 150);
      addZone(p.x + Math.cos(a) * off, p.y + Math.sin(a) * off, S.r, sk.t + i * (id === 'meteor' ? 0.15 : 0.3), S.dmg * e.dmgScale);
    }
  }
  SFX.play('warn');
}
// Trả về hệ số di chuyển của boss trong bước này (0 = đứng yên khi đang tung chiêu)
function updateBoss(e, def, dt) {
  if (!e.raged && e.hp < e.maxHp * 0.5) { // nổi giận: khoảnh khắc riêng để người chơi nhận ra
    e.raged = true; hitStop(0.12); addShake(8);
    const f = addFx('ring', e.x, e.y, 0.35); f.maxR = 140; f.color = '#ff3b5c';
    banner(def.name, 'NỔI GIẬN!'); SFX.play('warn');
  }
  // cuồng nộ dần: trận kéo dài thì boss nhanh hơn (hồi chiêu, báo trước ngắn lại)
  const ER = CFG.enrage; e.age += dt;
  if (e.age > ER.after) {
    const hz = Math.min(ER.max, (Math.floor((e.age - ER.after) / ER.every) + 1) * ER.step);
    if (hz > e.haste + 1e-9) { e.haste = hz; const f = addFx('ring', e.x, e.y, 0.35); f.maxR = 110; f.color = '#ff3b5c'; SFX.play('warn'); }
  }
  for (const k in e.skillCd) e.skillCd[k] -= dt;
  const sk = e.skill;
  if (!sk) { e.tele = false; e.nextSkill -= dt; if (e.nextSkill <= 0) startSkill(e, def); return 1; }
  const S = BOSS_SKILLS[sk.id];
  sk.t -= dt;
  if (sk.phase === 'tele') {
    e.tele = true;
    if (sk.id === 'teleport') e.fade = 1 - Math.max(0, sk.t) / sk.tele0;
    if (sk.t > 0) return (sk.id === 'slam' || sk.id === 'meteor' || sk.id === 'boulders') ? 0.4 : 0;
    // hết báo trước → ra đòn
    e.tele = false; sk.phase = 'act'; sk.t = S.dur || 0;
    if (sk.id === 'ring') {
      const off = Math.random() * TAU;
      for (let i = 0; i < S.n; i++) enemyShoot(e.x, e.y, off + i * TAU / S.n, S.speed, S.dmg * e.dmgScale);
      SFX.play('eshoot');
    } else if (sk.id === 'summon') {
      const sm = def.summon;
      for (let i = 0; i < sm.n; i++) {
        const a = i / sm.n * TAU, m = spawnEnemy(sm.type, e.x + Math.cos(a) * (e.r + 22), e.y + Math.sin(a) * (e.r + 22));
        playFx('puff', m.x, m.y + 6);
      }
    } else if (sk.id === 'teleport') {
      e.x = sk.tx; e.y = sk.ty; e.fade = 0; e.kx = e.ky = 0;
      playFx('puff', e.x, e.y + e.r * 0.5);
      const off = Math.random() * TAU;
      for (let i = 0; i < 8; i++) enemyShoot(e.x, e.y, off + i * TAU / 8, 120, 8 * e.dmgScale);
    } else if (sk.id === 'charge' || sk.id === 'quake') SFX.play('nova');
    else if (sk.id === 'wall') { wallRing(e, S, sk.hole); e.used2 = true; }
    else if (sk.id === 'rings') { ringsStep(e, S, sk); e.used2 = true; }
    if (!S.dur) { e.skill = null; e.nextSkill = CFG.bossGap; }
    return 0;
  }
  // pha ra đòn kéo dài
  if (sk.id === 'charge' || sk.id === 'quake') {
    e.x += Math.cos(sk.dir) * S.speed * dt; e.y += Math.sin(sk.dir) * S.speed * dt; e.kx = e.ky = 0;
    e.face = Math.cos(sk.dir) >= 0 ? 1 : -1;
    if (Math.random() < 0.5) burst(e.x, e.y + e.r * 0.6, '#8a7a68', 1, 40, 3, 0.4);
  } else if (sk.id === 'spiral') {
    sk.acc = (sk.acc || 0) + dt; sk.ang = (sk.ang || 0) + dt * 2.2;
    while (sk.acc >= S.every) { sk.acc -= S.every; for (let k = 0; k < S.arms; k++) enemyShoot(e.x, e.y, sk.ang + k * TAU / S.arms, S.speed, S.dmg * e.dmgScale); }
  } else if (sk.id === 'rings') ringsStep(e, S, sk);
  if (sk.t <= 0) {
    if (sk.id === 'wall') wallRing(e, S, sk.hole + Math.round(S.n / 4)); // vòng 2: khe lệch 90°
    else if (sk.id === 'quake') { // 3 vùng nổ dọc đoạn cuối vệt lao
      const ex = e.x, ey = e.y, dx = Math.cos(sk.dir), dy = Math.sin(sk.dir);
      for (let i = 0; i < S.n; i++) { const back = S.span * (i + 0.5) / S.n; addZone(ex - dx * back, ey - dy * back, S.r, S.warn + i * S.gap, S.dmg * e.dmgScale); }
      e.used2 = true;
    }
    e.skill = null; e.nextSkill = CFG.bossGap;
  }
  return sk.id === 'charge' || sk.id === 'quake' ? 0 : 0.3;
}
// Vòng đạn có khe hở `S.hole` viên bắt đầu từ chỉ số `hole`
function wallRing(e, S, hole) {
  for (let i = 0; i < S.n; i++) { if ((i - hole + S.n) % S.n < S.hole) continue; enemyShoot(e.x, e.y, i * TAU / S.n, S.speed, S.dmg * e.dmgScale); }
  SFX.play('eshoot');
}
// rings: bắn vòng thứ sk.k khi tới lượt (mỗi S.every giây), mỗi vòng lệch nửa bước so với vòng trước
function ringsStep(e, S, sk) {
  while (sk.k < S.k && S.dur - Math.max(0, sk.t) >= sk.k * S.every - 1e-9) {
    const off = sk.off + sk.k * Math.PI / S.n;
    for (let i = 0; i < S.n; i++) enemyShoot(e.x, e.y, off + i * TAU / S.n, S.speed, S.dmg * e.dmgScale);
    sk.k++; SFX.play('eshoot');
  }
}

/* ---------- Vùng nổ báo trước (dậm đất, thiên thạch) ---------- */
// hurtE: sát thương lên quái trong vùng (vùng nổ của quỷ nổ — dụ chúng vào đám đông)
function addZone(x, y, r, delay, dmg, hurtE = 0) { G.zones.push({ x, y, r, t: delay, max: delay, dmg, hurtE }); }
// Quỷ nổ phát nổ: tạo vùng báo trước rồi biến mất
function bomberBlast(e) {
  const B = ENEMIES[e.type].bomb; addZone(e.x, e.y, B.r, B.delay, B.dmg * e.dmgScale, B.enemyDmg);
  playFx('puff', e.x, e.y + 6); SFX.play('warn');
}
// Kỵ sĩ xương: 0 đi bộ → 1 báo trước (đứng yên, vạch đỏ) → 2 lao thẳng. Trả về [hệ số di chuyển, tốc độ lao hoặc 0]
function updateCharger(e, C, d, dx, dy, dt) {
  e.chT -= dt;
  if (e.chPhase === 0) {
    if (e.chT <= 0 && d > C.min && d < C.max) { e.chPhase = 1; e.chT = C.tele; e.chDir = Math.atan2(dy, dx); e.tele = true; }
    return 1;
  }
  if (e.chPhase === 1) { if (e.chT > 0) return 0; e.chPhase = 2; e.chT = C.dur; e.tele = false; return -1; } // hết báo trước: lao ngay bước này
  if (e.chT <= 0) { e.chPhase = 0; e.chT = C.cd; return 1; }
  return -1; // đang lao
}
function spawnElite(type) {
  const E = CFG.elite, e = spawnEnemy(type || E.types[Math.floor(Math.random() * E.types.length)]);
  e.maxHp = e.hp *= E.hp; e.sc = E.sc; e.r *= E.r; e.dmg *= E.dmg; e.mass *= E.mass; e.elite = true; e.xp = E.gem;
  SFX.play('warn');
  return e;
}
function updateZones(dt) {
  const p = G.player;
  for (let i = G.zones.length - 1; i >= 0; i--) {
    const z = G.zones[i]; z.t -= dt;
    if (z.t > 0) continue;
    if (Math.hypot(p.x - z.x, p.y - z.y) < z.r + p.r * 0.4) hurtPlayer(z.dmg, 'zone');
    if (z.hurtE) {
      G.grid.query(z.x, z.y, z.r + 20, tmp);
      for (let j = 0; j < tmp.length; j++) { const e = tmp[j]; if (!e.dead && !e.prop && Math.hypot(e.x - z.x, e.y - z.y) < z.r + e.r) hitEnemy(e, z.hurtE, e.x - z.x, e.y - z.y, 1, null, 'zone'); }
    }
    playFx('boom', z.x, z.y + z.r * 0.3); burst(z.x, z.y, '#ff9a3d', 10, 160, 3, 0.4);
    addShake(3); SFX.play('slam');
    G.zones.splice(i, 1);
  }
}

function updateBooms(dt) {
  for (let i = G.booms.length - 1; i >= 0; i--) {
    const b = G.booms[i]; if ((b.t -= dt) > 0) continue;
    playFx('boom', b.x, b.y); burst(b.x, b.y, '#ffd166', 10, 160, 3, 0.5); addShake(4); SFX.play('slam');
    if (b.chest) dropPickup(b.cx, b.cy, 'chest', 0);
    G.booms.splice(i, 1);
  }
}

/* ---------- Vật phẩm ---------- */
function rollItem() {
  let tot = 0; for (const k in ITEMS) tot += ITEMS[k].w;
  let r = Math.random() * tot;
  for (const k in ITEMS) { r -= ITEMS[k].w; if (r <= 0) return k; }
  return 'potion';
}
function pickItem(kind) {
  const p = G.player, it = ITEMS[kind];
  addText(p.x, p.y - 30, it.name, it.color);
  burst(p.x, p.y, it.color, 12, 140, 3, 0.5);
  if (kind === 'potion') { p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * 0.3)); playFx('heartUp', p.x, p.y, 0, p, 4); SFX.play('heal'); }
  else if (kind === 'magnet') { for (const g of G.gems.items) if (g.kind === 'xp') { g.pulled = true; g.sp = Math.max(g.sp, 250); } SFX.play('pickup'); }
  else if (kind === 'bomb') detonate();
  else if (kind === 'freeze') { G.freezeT = it.dur; G.flashT = 0.25; G.flashColor = '#bfe6ff'; SFX.play('freeze'); }
  else { p.buffs[kind] = it.dur; if (kind === 'shield') p.shieldHits = 3; SFX.play('pickup'); }
}
// Bom: quái thường trên màn hình chết ngay, boss mất 8% máu tối đa
function detonate() {
  const p = G.player;
  G.flashT = 0.35; G.flashColor = '#fff1d6'; addShake(CFG.shakeMax); hitStop(0.05); SFX.play('bomb');
  for (const e of G.enemies.items) {
    if (e.dead || Math.abs(e.x - p.x) > VW / 2 + 20 || Math.abs(e.y - p.y) > VH / 2 + 20) continue;
    hitEnemy(e, e.boss ? e.maxHp * 0.08 : e.hp + 1, e.x - p.x, e.y - p.y, 2, null, 'bomb');
  }
}

/* ---------- Cảm giác đánh: rung màn, khựng hình, hiệu ứng sprite ---------- */
function addShake(v) {
  if (!SETTINGS.shake) return;
  G.shake = Math.min(CFG.shakeMax, Math.max(G.shake, v));
}
function hitStop(sec) { G.hitStop = Math.max(G.hitStop, sec); }

// Phát hiệu ứng sprite tại (x, y); `follow` = vật để bám theo. Thiếu fx atlas → bỏ qua (đã có hạt thay thế).
function playFx(key, x, y, rot = 0, follow = null, oy = 0) {
  const st = FX_STYLE[key];
  if (!st || !fxReady()) return null;
  if (st.chance !== undefined && Math.random() > st.chance) return null;
  if (G.sfx.items.length >= (st.pri ? CFG.sfxCap : CFG.sfxSoftCap)) return null;
  const meta = FX_ATLAS.fx[key], s = G.sfx.get();
  s.key = key; s.x = x; s.y = y + oy; s.oy = oy; s.t = 0; s.rot = rot; s.follow = follow;
  s.dur = meta.frames.length * meta.ms / 1000;
  return s;
}
function updateSfx(dt) {
  for (const s of G.sfx.items) {
    s.t += dt;
    if (s.follow) { if (s.follow.dead) s.follow = null; else { s.x = s.follow.x; s.y = s.follow.y + s.oy; } }
    if (s.t >= s.dur) s.dead = true;
  }
}

/* =========================================================
   CẬP NHẬT
   ========================================================= */
// src: nguồn sát thương (loại quái, 'shot', 'zone') — ghi vào G.stats.taken
function hurtPlayer(dmg, src = '?') {
  const p = G.player;
  if (p.iframe > 0) return;
  if (p.buffs.shield > 0 && p.shieldHits > 0) { // khiên phép chặn đòn
    p.shieldHits--; if (!p.shieldHits) p.buffs.shield = 0;
    p.iframe = CFG.player.iframe; burst(p.x, p.y, '#7fc8ff', 14, 160, 3, 0.4); SFX.play('shieldHit');
    return;
  }
  const lost = Math.min(p.hp, Math.max(1, dmg - p.armor));
  p.hp -= lost; G.stats.taken[src] = (G.stats.taken[src] || 0) + lost;
  p.iframe = CFG.player.iframe; p.hurtT = 0.3; addShake(6);
  hitStop(CFG.hurt.stop); G.flashT = 0.12; G.flashColor = '#ff3b5c';
  pushAround(p.x, p.y, CFG.hurt.pushR, CFG.hurt.push, '#ffffff');
  const nw = p.weapons.nova;
  if (nw && nw.evo && G.t >= (G.novaFreeAt || 0)) { G.novaFreeAt = G.t + CFG.evo.novaOnHurtCd; fireNova(nw, p, 0); }
  SFX.play('hurt');
}
// Lướt né theo hướng đang bấm (không bấm thì theo hướng vừa đi); bất tử trong lúc lướt
function tryDash() {
  const p = G.player, D = CFG.dash;
  if (G.state !== 'play' || !p || p.dashCd > 0 || p.dashT > 0) return false;
  const v = inputVec(); let dx = v.x, dy = v.y;
  if (!dx && !dy) { dx = p.dirX; dy = p.dirY; }
  const l = Math.hypot(dx, dy) || 1;
  p.dashX = dx / l; p.dashY = dy / l; if (dx) p.face = dx > 0 ? 1 : -1;
  p.dashT = D.dur; p.dashCd = D.cd; p.iframe = Math.max(p.iframe, D.iframe); p.trail.length = 0; p.trailN = 0;
  burst(p.x, p.y + 8, '#7fd4ff', 8, 100, 2.5, 0.3); SFX.play('dash');
  return true;
}
// Đẩy lùi quái thường quanh (x, y) và vẽ vòng sóng (bị đánh, lên cấp). Mảng riêng vì có thể gọi giữa lúc `tmp` đang dùng.
const pushTmp = [];
function pushAround(x, y, R, force, color) {
  G.grid.query(x, y, R, pushTmp);
  for (let i = 0; i < pushTmp.length; i++) {
    const e = pushTmp[i]; if (e.dead || e.boss || e.prop) continue;
    const dx = e.x - x, dy = e.y - y, d = Math.hypot(dx, dy) || 1;
    if (d < R + e.r) { e.kx += dx / d * force / e.mass; e.ky += dy / d * force / e.mass; }
  }
  const f = addFx('ring', x, y, 0.2); f.maxR = R; f.color = color;
}

function enemyShoot(x, y, ang, speed, dmg) {
  const s = G.shots.get();
  s.x = x; s.y = y; s.vx = Math.cos(ang) * speed; s.vy = Math.sin(ang) * speed; s.life = 4; s.dmg = dmg; s.r = 6; s.anim = 0;
}

function updateEnemies(dt) {
  const p = G.player, far = ringDist() * 1.5, kDecay = Math.pow(0.001, dt);
  const aura = p.weapons.aura, auraR = aura ? aura.radius * p.mArea : 0;
  const frozen = G.freezeT > 0;
  for (const e of G.enemies.items) {
    if (e.dead) continue;
    const def = ENEMIES[e.type];
    let dx = p.x - e.x, dy = p.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    if (e.inT > 0) e.inT -= dt;
    if (e.elite) e.hpLag = e.hpLag > e.hp ? e.hpLag + (e.hp - e.hpLag) * Math.min(1, dt * CFG.barLag) : e.hp;
    if (e.prop) { if (d > far * 1.3) e.dead = true; e.flash -= dt; continue; } // thùng gỗ: đứng yên, xa quá thì bỏ
    if (d > far && !e.boss) { // quái bị bỏ xa: đưa lại vòng spawn
      const a = Math.random() * TAU, R = ringDist();
      e.x = p.x + Math.cos(a) * R; e.y = p.y + Math.sin(a) * R; continue;
    }
    e.orbCd -= dt; e.auraCd -= dt;
    let spd = e.speed;
    if (aura && d < auraR + e.r) {
      if (!e.boss) spd *= 1 - aura.slow;
      if (e.auraCd <= 0) { e.auraCd = aura.tick; hitEnemy(e, aura.dmg * dmgMul(p), -dx, -dy, 0.15, 'spore', 'aura'); if (e.dead) continue; }
    }
    // Đồng hồ băng: quái thường đứng im và không gây sát thương; boss chỉ chậm lại một nửa
    e.frozen = frozen && !e.boss;
    if (e.frozen) { e.flash -= dt; e.tele = false; continue; }
    if (e.stunT > 0) { e.stunT -= dt; e.flash -= dt; e.kx *= kDecay; e.ky *= kDecay; e.x += e.kx * dt; e.y += e.ky * dt; continue; } // Địa Chấn: choáng
    if (e.slowT > 0) { e.slowT -= dt; spd *= 1 - CFG.evo.bossSlow; }
    let mx = dx / d, my = dy / d, mv = 1;
    if (def.bomb && d < def.bomb.near) { e.dead = true; bomberBlast(e); continue; } // tự nổ: không tính quái hạ, không rơi ngọc
    if (def.charge) {
      const c = updateCharger(e, def.charge, d, dx, dy, dt);
      if (c === 0) mv = 0;
      else if (c < 0) { mx = Math.cos(e.chDir); my = Math.sin(e.chDir); spd = def.charge.speed; e.face = mx >= 0 ? 1 : -1; }
    }
    if (def.ranged) { // pháp sư tử linh: giữ khoảng cách và bắn
      const R = def.ranged.range;
      if (d < R * 0.55) { mx = -mx * 0.5; my = -my * 0.5; } else if (d < R * 0.85) { mx *= 0.15; my *= 0.15; }
      e.shootT -= dt;
      e.tele = e.shootT < 0.3 && d < R + 60; // báo trước 0.3 giây: quả cầu tím tụ trên đầu
      if (e.shootT <= 0 && d < R + 60) { e.shootT = def.ranged.cd * rand(0.8, 1.2); e.tele = false; enemyShoot(e.x, e.y, Math.atan2(dy, dx), def.ranged.speed, e.shotDmg); SFX.play('eshoot'); }
    }
    if (e.boss) { mv = updateBoss(e, def, frozen ? dt * 0.5 : dt); if (frozen) spd *= 0.5; }
    // tách quái để không chồng lên nhau
    let sx = 0, sy = 0;
    G.grid.query(e.x, e.y, e.r * 2, tmp);
    for (let i = 0; i < tmp.length; i++) {
      const o = tmp[i]; if (o === e || o.prop) continue;
      const ox = e.x - o.x, oy = e.y - o.y, sum = e.r + o.r, dd = ox * ox + oy * oy;
      if (dd < sum * sum && dd > 0.01) { const dist = Math.sqrt(dd), push = (sum - dist) / sum * (o.mass / (o.mass + e.mass)) * 2; sx += ox / dist * push; sy += oy / dist * push; }
    }
    e.x += (mx * spd * mv + sx * 80 + e.kx) * dt;
    e.y += (my * spd * mv + sy * 80 + e.ky) * dt;
    e.kx *= kDecay; e.ky *= kDecay;
    e.flash -= dt; e.anim += dt;
    if (!(e.skill && (e.skill.id === 'charge' || e.skill.id === 'quake') && e.skill.phase === 'act') && e.chPhase !== 2) e.face = dx >= 0 ? 1 : -1;
    if (e.dmg > 0 && d < e.r + p.r) hurtPlayer(e.dmg, e.type);
  }
}

// n quái gần nhất, sắp xếp chèn trên 2 mảng dùng lại (không tạo rác mỗi lần bắn)
const nearD = [], nearE = [], lightCands = [];
function nearestEnemies(x, y, n, range) {
  nearD.length = 0; nearE.length = 0;
  const r2 = range * range;
  for (const e of G.enemies.items) {
    if (e.dead || e.prop) continue;
    const d2 = (e.x - x) ** 2 + (e.y - y) ** 2;
    if (d2 > r2) continue;
    let i;
    if (nearE.length < n) { nearD.push(d2); nearE.push(e); i = nearE.length - 1; }
    else if (d2 < nearD[n - 1]) { nearD[n - 1] = d2; nearE[n - 1] = e; i = n - 1; }
    else continue;
    while (i > 0 && nearD[i - 1] > nearD[i]) {
      const td = nearD[i]; nearD[i] = nearD[i - 1]; nearD[i - 1] = td;
      const te = nearE[i]; nearE[i] = nearE[i - 1]; nearE[i - 1] = te;
      i--;
    }
  }
  return nearE;
}

// Vòng cầu của Vòng Huyết Nguyệt: [số cầu, góc, bán kính]; tiến hoá thêm vòng ngoài xoay ngược
function orbitRings(w, p) {
  const R = w.radius * p.mArea, O = CFG.evo.orbit2;
  return w.evo ? [[w.count, w.ang, R], [O.n, w.ang2 || 0, R * O.rMul]] : [[w.count, w.ang, R]];
}
function fireNova(w, p, delay) {
  const f = addFx('nova', p.x, p.y, 0.5);
  f.delay = delay; f.r = 0; f.maxR = w.maxR * p.mArea; f.dmg = w.dmg * dmgMul(p); f.kb = w.kb; f.hit.clear(); f.started = false; f.stun = !!w.evo;
}
// Thiên Lôi: sét nảy từ mục tiêu sang tối đa 3 quái gần nhất chưa trúng, mỗi lần yếu đi
const chainTmp = [], chainHit = new Set();
function chainLightning(from, dmg) {
  const C = CFG.evo.chain; chainHit.clear(); chainHit.add(from);
  let cur = from, d = dmg;
  for (let k = 0; k < C.n; k++) {
    G.grid.query(cur.x, cur.y, C.range, chainTmp);
    let best = null, bd = C.range * C.range;
    for (const e of chainTmp) { if (e.dead || e.prop || chainHit.has(e)) continue; const dd = (e.x - cur.x) ** 2 + (e.y - cur.y) ** 2; if (dd < bd) { bd = dd; best = e; } }
    if (!best) break;
    d *= C.falloff; chainHit.add(best);
    const f = addFx('chain', cur.x, cur.y, 0.15); f.x2 = best.x; f.y2 = best.y;
    hitEnemy(best, d, best.x - cur.x, best.y - cur.y, 0.4, null, 'lightning');
    cur = best;
  }
}
function fireBullet(kind, x, y, ang, speed, life, dmg, pierce, r, kb) {
  const b = G.bullets.get();
  b.kind = kind; b.x = x; b.y = y; b.vx = Math.cos(ang) * speed; b.vy = Math.sin(ang) * speed;
  b.life = life; b.dmg = dmg; b.pierce = pierce; b.r = r; b.kb = kb; b.hit.clear(); b.src = kind; b.evo = false; b.split = false; b.ret = 0;
  return b;
}

function strike(x, y, dmg, aoe, src = 'lightning') {
  if (!playFx('strike', x, y)) { // không có sprite sét → vẽ tia sét bằng code
    const f = addFx('zap', x, y, 0.3);
    f.r = aoe; f.pts.length = 0;
    for (let i = 0; i <= 7; i++) f.pts.push(rand(-14, 14));
  }
  G.grid.query(x, y, aoe + 30, tmp);
  for (let i = 0; i < tmp.length; i++) {
    const e = tmp[i]; if (e.dead) continue;
    const rr = aoe + e.r;
    if ((e.x - x) ** 2 + (e.y - y) ** 2 < rr * rr) hitEnemy(e, dmg, e.x - x, e.y - y, 0.6, null, src);
  }
  burst(x, y, '#bfe6ff', 10, 160, 2.5, 0.35);
  addShake(1.5);
  SFX.play('zap');
}

function addText(x, y, txt, color) {
  if (G.texts.items.length >= CFG.textCap) return;
  const t = G.texts.get();
  t.x = x + rand(-4, 4); t.y = y; t.txt = txt; t.life = 0.6; t.color = color || '#fff';
  t.owner = null; t.size = 1; t.pop = 0; t.vx = rand(-8, 8); t.num = /^\+?\d+$/.test(txt);
}

/* Số sát thương: cỡ và màu theo độ lớn; nhiều đòn liên tiếp vào cùng một quái được GỘP
   vào một con số (đỡ rối, và người chơi thấy tổng sát thương). */
function styleDmg(t) {
  const v = t.v;
  t.size = v >= 100 ? 1.5 : v >= 30 ? 1.25 : v >= 12 ? 1.1 : 1;
  t.color = v >= 100 ? '#ff4d4d' : v >= 30 ? '#ff9a3d' : v >= 12 ? '#ffd166' : '#ffffff';
}
function addDmgText(e, dmg) {
  const t0 = e.txt;
  if (t0 && !t0.dead && t0.owner === e && t0.life > 0.3) {
    t0.v += dmg; t0.txt = Math.round(t0.v); t0.life = 0.6; t0.pop = 0.12;
    t0.x = e.x; styleDmg(t0); return;
  }
  if (G.texts.items.length >= CFG.textCap) return;
  const t = G.texts.get();
  t.owner = e; e.txt = t; t.v = dmg; t.txt = Math.round(dmg);
  t.x = e.x + rand(-4, 4); t.y = e.y - e.r; t.life = 0.6; t.pop = 0.12; t.vx = rand(-8, 8); t.num = true;
  styleDmg(t);
}

function addFx(type, x, y, life) {
  const f = G.fx.get(); f.type = type; f.x = x; f.y = y; f.life = f.max = life; return f;
}

function burst(x, y, color, n, spd = 120, size = 3, life = 0.5) {
  for (let i = 0; i < n; i++) {
    if (G.parts.items.length >= CFG.partCap) return;
    const q = G.parts.get(), a = Math.random() * TAU, v = spd * rand(0.3, 1);
    q.x = x; q.y = y; q.vx = Math.cos(a) * v; q.vy = Math.sin(a) * v;
    q.life = q.max = life * rand(0.6, 1); q.color = color; q.size = size * rand(0.6, 1.3);
  }
}

function dropGem(x, y, v) {
  const it = G.gems.items, C = CFG.gems;
  if (it.length > C.mergeAt) { // gộp vào ngọc vừa rơi gần đó (quái chết theo cụm nên bắt được phần lớn)
    for (let i = it.length - 1; i >= Math.max(0, it.length - C.look); i--) {
      const g = it[i];
      if (g.kind === 'xp' && !g.dead && (g.x - x) ** 2 + (g.y - y) ** 2 < C.mergeR * C.mergeR) { g.v += v; return; }
    }
  }
  if (G.gems.items.length >= CFG.gemCap) {
    for (const g of G.gems.items) if (g.kind === 'xp') { g.v += v; return; }
  }
  dropPickup(x, y, 'xp', v);
}
function dropPickup(x, y, kind, v) {
  const g = G.gems.get(); g.kind = kind; g.x = x; g.y = y; g.v = v; g.pulled = false; g.sp = 0; g.anim = Math.random() * 10;
}

// fx: tên hiệu ứng trúng đòn trong FX_STYLE (mỗi vũ khí một kiểu)
// src: vũ khí gây sát thương (id vũ khí, 'bomb', 'zone') — ghi vào G.stats.dmg
function hitEnemy(e, dmg, kx, ky, kb = 1, fx = null, src = '?') {
  if (e.dead) return;
  if (!e.prop) G.stats.dmg[src] = (G.stats.dmg[src] || 0) + Math.min(dmg, Math.max(0, e.hp));
  if (e.prop) { e.hp -= dmg; e.flash = 0.1; if (e.hp <= 0) killEnemy(e); return; }
  e.hp -= dmg; e.flash = 0.1;
  const l = Math.hypot(kx, ky) || 1; e.kx += kx / l * 90 * kb / e.mass; e.ky += ky / l * 90 * kb / e.mass;
  if (fx) playFx(fx, e.x + rand(-3, 3), e.y - e.r * 0.2, fx === 'arrowHit' ? Math.atan2(ky, kx) : 0);
  addDmgText(e, dmg);
  if (e.hp <= 0) killEnemy(e);
  else { SFX.play('hit'); if (G.parts.items.length < CFG.partCap * 0.6) burst(e.x, e.y, ENEMIES[e.type].color, 2, 90, 2, 0.25); }
}

function killEnemy(e) {
  e.dead = true;
  if (e.prop) { // thùng gỗ: không tính là quái hạ, luôn rơi một vật phẩm
    playFx('puff', e.x, e.y + 6); burst(e.x, e.y, ENEMIES.crate.color, 10, 120, 3, 0.4); SFX.play('crate');
    dropPickup(e.x, e.y, rollItem(), 0);
    return;
  }
  G.kills++;
  // Xác quái co lại + mờ dần (vẽ trong drawFx), logic thì bỏ quái ngay
  const df = addFx('die', e.x, e.y, e.boss ? 0.6 : 0.22);
  df.kind = e.type; df.face = e.face; df.anim = e.anim; df.r = e.r;
  const color = ENEMIES[e.type].color;
  if (e.boss) {
    playFx('bigBoom', e.x, e.y + e.r * 0.5);
    burst(e.x, e.y, color, 60, 260, 4, 0.9); burst(e.x, e.y, '#ffd166', 30, 200, 3, 0.8);
    // chuỗi nổ nối tiếp rồi mới rơi rương; frame() làm chậm thời gian (G.slowT)
    const D = CFG.bossDeath;
    for (let i = 0; i < D.booms; i++) {
      const a = Math.random() * TAU, r = Math.random() * e.r * 1.2;
      G.booms.push({ t: (i + 1) * D.every, x: e.x + Math.cos(a) * r, y: e.y + Math.sin(a) * r, chest: i === D.booms - 1, cx: e.x, cy: e.y });
    }
    G.slowT = D.slow; G.flashT = 0.2; G.flashColor = '#ffffff';
    if (G.boss === e) G.boss = null;
    G.bossKills++;
    addShake(CFG.shakeMax); hitStop(CFG.hitStop.boss); SFX.play('bossdie');
  } else {
    const big = e.r > 15;
    playFx(big ? 'boom' : 'puff', e.x, e.y + e.r * 0.6);
    if (big) { addShake(3); hitStop(CFG.hitStop.big); }
    burst(e.x, e.y, color, big ? 16 : 6, 140, 3, 0.45);
    dropGem(e.x, e.y, e.xp);
    const def = ENEMIES[e.type];
    if (def.bomb) bomberBlast(e);
    if (def.split) for (let k = 0; k < def.split.n; k++) {
      const a = k / def.split.n * TAU + Math.random(), m = spawnEnemy(def.split.type, e.x + Math.cos(a) * 12, e.y + Math.sin(a) * 12);
      m.kx = Math.cos(a) * def.split.kb; m.ky = Math.sin(a) * def.split.kb;
    }
    if (e.elite) { dropPickup(e.x + 10, e.y, rollItem(), 0); burst(e.x, e.y, '#ffd166', 24, 200, 3, 0.6); }
    const P = G.player, aw = P.weapons.aura;
    if (aw && aw.evo && Math.hypot(e.x - P.x, e.y - P.y) < aw.radius * P.mArea + e.r) {
      const H = CFG.evo.auraHeal;
      if (G.t - (G.healT0 || -9) >= 1) { G.healT0 = G.t; G.healAmt = 0; }
      if (G.healAmt < H.cap) { const h = Math.min(H.per, H.cap - G.healAmt); G.healAmt += h; P.hp = Math.min(P.maxHp, P.hp + h); }
    }
    if (Math.random() < CFG.itemChance * (1 + 0.05 * metaRoll(metaLv('roll')).item)) dropPickup(e.x + 10, e.y, rollItem(), 0);
    SFX.play('kill');
  }
}

function updateBullets(dt) {
  for (const b of G.bullets.items) {
    if (b.ret === 2) { // dao Vạn Đao bay về tay
      const p = G.player, dx = p.x - b.x, dy = p.y - b.y, d = Math.hypot(dx, dy) || 1, sp = Math.hypot(b.vx, b.vy);
      if (d < p.r + 6) { b.dead = true; continue; }
      b.vx = dx / d * sp; b.vy = dy / d * sp;
    }
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    if (b.life <= 0) {
      if (b.ret === 1) { b.ret = 2; b.life = CFG.evo.knifeBack; b.hit.clear(); }
      else { b.dead = true; continue; }
    }
    G.grid.query(b.x, b.y, b.r + 30, tmp);
    for (let i = 0; i < tmp.length; i++) {
      const e = tmp[i];
      if (e.dead || b.hit.has(e)) continue;
      const rr = e.r + b.r;
      if ((e.x - b.x) ** 2 + (e.y - b.y) ** 2 < rr * rr) {
        hitEnemy(e, b.dmg, b.vx, b.vy, b.kb, b.kind === 'knife' ? 'arrowHit' : 'hitSpark', b.src); b.hit.add(e);
        if (b.split) { // Huyết Vũ: vỡ thành 2 mảnh tỏa ra hai bên
          b.split = false; const S = CFG.evo.shard, a0 = Math.atan2(b.vy, b.vx), sp = Math.hypot(b.vx, b.vy);
          for (const s of [-1, 1]) { const sh = fireBullet('bolt', e.x, e.y, a0 + s * S.ang, sp, S.life, b.dmg * S.dmg, 1, S.r, 0.5); sh.evo = true; sh.hit.add(e); }
        }
        if (--b.pierce <= 0) { b.dead = true; break; }
      }
    }
  }
}

function updateShots(dt) {
  const p = G.player;
  for (const s of G.shots.items) {
    s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; s.anim += dt;
    if (s.life <= 0) { s.dead = true; continue; }
    const rr = s.r + p.r - 3;
    if ((s.x - p.x) ** 2 + (s.y - p.y) ** 2 < rr * rr) { s.dead = true; hurtPlayer(s.dmg, 'shot'); }
  }
}

function updateFx(dt) {
  const p = G.player;
  for (const f of G.fx.items) {
    if (f.type === 'nova') {
      if (f.delay > 0) { f.delay -= dt; continue; }
      if (!f.started) { f.started = true; f.x = p.x; f.y = p.y; SFX.play('nova'); addShake(2.5); }
      if (f.r < f.maxR) {
        f.r = Math.min(f.maxR, f.r + f.maxR / 0.35 * dt);
        G.grid.query(f.x, f.y, f.r + 30, tmp);
        for (let i = 0; i < tmp.length; i++) {
          const e = tmp[i]; if (e.dead || f.hit.has(e)) continue;
          const dd = Math.hypot(e.x - f.x, e.y - f.y);
          if (dd < f.r + e.r) {
            f.hit.add(e); hitEnemy(e, f.dmg, e.x - f.x, e.y - f.y, f.kb, 'punch', 'nova');
            if (f.stun && !e.dead && !e.prop) { if (e.boss) e.slowT = CFG.evo.stun; else e.stunT = CFG.evo.stun; }
          }
        }
        continue;
      }
    }
    f.life -= dt; if (f.life <= 0) f.dead = true;
  }
}

function addXp(v) {
  if (G.player) v *= G.player.xpMul || 1;          // nâng cấp vĩnh viễn Ham học
  if (G.player && G.player.buffs.xp2 > 0) v *= 2; // sách cổ: x2 kinh nghiệm
  G.xp += v;
  while (G.xp >= G.xpNeed) {
    G.xp -= G.xpNeed; G.level++; G.xpNeed = CFG.xpFor(G.level); G.pending++;
    const p = G.player;
    if (p) {
      if (!playFx('levelUp', p.x, p.y, 0, p, 12)) addFx('lvl', p.x, p.y, 0.6);
      burst(p.x, p.y, '#ffd166', 18, 180, 3, 0.6);
      pushAround(p.x, p.y, CFG.levelPush.r, CFG.levelPush.push, '#ffd166');
    }
  }
}

function updateGems(dt) {
  const p = G.player;
  for (const g of G.gems.items) {
    g.anim += dt;
    const dx = p.x - g.x, dy = p.y - g.y, d = Math.hypot(dx, dy) || 1;
    if (!g.pulled && d < p.magnet) { g.pulled = true; g.sp = -60; }
    if (g.pulled) {
      g.sp += 900 * dt;
      const m = Math.min(d, g.sp * dt);
      g.x += dx / d * m; g.y += dy / d * m;
    }
    if (d < p.r + 8) {
      g.dead = true;
      if (g.kind === 'xp') { // nhặt liên tiếp: cao độ tăng dần
        G.gemStreak = G.t - G.gemLast < 0.25 ? Math.min(G.gemStreak + 1, 12) : 0; G.gemLast = G.t; G.gainT = 0.12;
        addXp(g.v); SFX.play('gem', 1 + G.gemStreak * 0.05);
      }
      else if (g.kind === 'heart') { const h = 30; p.hp = Math.min(p.maxHp, p.hp + h); addText(p.x, p.y - 24, '+' + h, '#5cff9d'); playFx('heartUp', p.x, p.y, 0, p, 4); burst(p.x, p.y, '#ff6b81', 12, 120, 3, 0.5); SFX.play('heal'); }
      else if (ITEMS[g.kind]) pickItem(g.kind);
      else if (g.kind === 'chest') { G.pending += 2; p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.3); burst(g.x, g.y, '#ffd166', 40, 220, 3.5, 0.8); banner('Rương báu: +2 nâng cấp!'); SFX.play('chest'); G.chestOpen = true; }
    }
  }
}

function updateParts(dt) {
  const decay = Math.pow(0.03, dt);
  for (const q of G.parts.items) { q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= decay; q.vy *= decay; q.life -= dt; if (q.life <= 0) q.dead = true; }
}

function updateTexts(dt) {
  for (const t of G.texts.items) { t.life -= dt; t.y -= 30 * dt; t.x += (t.vx || 0) * dt; t.pop = Math.max(0, (t.pop || 0) - dt); if (t.life <= 0) t.dead = true; }
}

function update(dt) {
  snapPrev();
  G.t += dt;
  const p = G.player, v = inputVec();
  // hiệu ứng tạm thời từ vật phẩm
  for (const k in p.buffs) if (p.buffs[k] > 0) { p.buffs[k] -= dt; if (p.buffs[k] <= 0) { p.buffs[k] = 0; if (k === 'shield') p.shieldHits = 0; } }
  G.freezeT = Math.max(0, G.freezeT - dt); G.flashT = Math.max(0, G.flashT - dt); G.gainT = Math.max(0, G.gainT - dt);
  const spd = p.speed * (p.buffs.speed > 0 ? 1.4 : 1);
  p.dashCd = Math.max(0, p.dashCd - dt);
  if (p.dashT > 0) { // đang lướt: hướng đã khoá, bỏ qua phím
    const m = Math.min(dt, p.dashT) * CFG.dash.speed; p.dashT -= dt;
    p.x += p.dashX * m; p.y += p.dashY * m;
    if (++p.trailN % 2 === 0) { p.trail.unshift({ x: p.x, y: p.y, t: G.t }); if (p.trail.length > 3) p.trail.pop(); }
  } else { p.x += v.x * spd * dt; p.y += v.y * spd * dt; }
  p.moving = !!(v.x || v.y) || p.dashT > 0;
  if (p.moving) {
    p.anim += dt * 10; const l = Math.hypot(v.x, v.y); p.dirX = v.x / l; p.dirY = v.y / l;
    if (p.buffs.speed > 0 && Math.random() < 0.35) burst(p.x - p.dirX * 8, p.y + 10, '#5cff9d', 1, 30, 2.5, 0.35);
  }
  if (v.x) p.face = v.x > 0 ? 1 : -1;
  p.iframe -= dt; p.hurtT -= dt; G.shake = Math.max(0, G.shake - 30 * dt);
  if (p.regen) p.hp = Math.min(p.maxHp, p.hp + p.regen * dt);
  p.hpLag = p.hpLag > p.hp ? p.hpLag + (p.hp - p.hpLag) * Math.min(1, dt * CFG.barLag) : p.hp; // vệt trễ của thanh máu

  const tc = G.typeCount; for (const k in tc) tc[k] = 0;
  for (const e of G.enemies.items) tc[e.type] = (tc[e.type] || 0) + 1;
  updateWave(dt);
  if (G.state !== 'play') return; // vừa thắng
  updateCrates(dt);
  G.grid.reset(); for (const e of G.enemies.items) G.grid.insert(e);
  updateEnemies(dt);
  G.grid.reset(); for (const e of G.enemies.items) if (!e.dead) G.grid.insert(e);
  for (const id in p.weapons) WEAPONS[id].update(p.weapons[id], p, dt);
  updateBullets(dt);
  updateShots(dt);
  updateZones(dt);
  updateBooms(dt);
  updateFx(dt);
  updateGems(dt);
  updateParts(dt);
  updateSfx(dt);
  updateTexts(dt);
  for (const k of POOLS) G[k].sweep();

  if (p.hp <= 0) {
    p.hp = 0; addShake(CFG.shakeMax);
    burst(p.x, p.y, '#c04dff', 40, 220, 3.5, 0.9);
    const df = addFx('die', p.x, p.y, 0.9); df.kind = 'player'; df.face = p.face; df.anim = 0; df.r = p.r;
    endRun(false); return;
  }
  // Từ cấp CFG.batchLevel, gom các lần lên cấp trong vòng 2 giây vào MỘT lần mở bảng chọn (đỡ ngắt quãng);
  // rương boss thì mở ngay.
  if (G.pending > 0) {
    if (G.chestOpen || G.level < CFG.batchLevel) { G.lvlWait = 0; openLevelUp(); }
    else if ((G.lvlWait += dt) >= CFG.batchWait) { G.lvlWait = 0; openLevelUp(); }
  }
}
