'use strict';
/* Bot cân bằng (chỉ dùng khi phát triển, game KHÔNG nạp file này).
   Dùng trong console của trang game:
     const s = document.createElement('script'); s.src = 'tools/balance-bot.js'; document.body.append(s);
     runBot()            // chơi 1 ván giả lập (tối đa 15 phút game), trả về báo cáo
   Bot phản xạ 12 lần/giây: né quái, đạn, vùng nổ, vạch lao của boss; đi nhặt ngọc/vật phẩm/phá thùng khi an toàn;
   chọn thẻ: vũ khí trước, rồi bị động phòng thủ/sát thương. Đây là người chơi "khá", không phải người chơi giỏi. */
window.runBot = function (opts = {}) {
  const maxT = opts.maxT || 900, react = opts.react || 12;
  ['over', 'levelup', 'paused', 'menu'].forEach(id => document.getElementById(id).classList.remove('show'));
  startGame();
  const v = __vs, G = v.G;
  let cur = new Set();
  const setKeys = ks => {
    for (const k of cur) if (!ks.includes(k)) dispatchEvent(new KeyboardEvent('keyup', { code: k, key: 'x' }));
    for (const k of ks) if (!cur.has(k)) dispatchEvent(new KeyboardEvent('keydown', { code: k, key: 'x' }));
    cur = new Set(ks);
  };
  const rec = { dmgByMin: [], src: {}, bosses: [], levelByMin: [] };
  const origHurt = hurtPlayer;
  window.hurtPlayer = function (dmg, src0) { // ghi lại sát thương nhận vào theo phút (nguồn lấy từ G.stats.taken)
    const P = G.player, before = P.hp; origHurt(dmg, src0);
    const lost = before - P.hp; if (lost <= 0) return;
    if (rec.firstHit === undefined) rec.firstHit = Math.round(G.t);
    const m = Math.floor(G.t / 60); rec.dmgByMin[m] = (rec.dmgByMin[m] || 0) + lost;
    const src = ENEMIES[src0] && ENEMIES[src0].boss ? 'boss' : src0;
    rec.src[src] = (rec.src[src] || 0) + lost;
  };
  let lastBoss = null, bossStart = 0;
  try {
    for (let s = 0; s < maxT * react; s++) {
      const P = G.player; let fx = 0, fy = 0, near = 0;
      for (const e of G.enemies.items) {
        if (e.dead || e.prop || e.frozen) continue;
        const dx = P.x - e.x, dy = P.y - e.y, d2 = dx * dx + dy * dy, R = e.boss ? 170 : 190;
        if (d2 < R * R) { const w = (e.boss ? 3 : 1) / d2; fx += dx * w; fy += dy * w; if (d2 < 70 * 70) near++; }
      }
      for (const sh of G.shots.items) { const dx = P.x - sh.x, dy = P.y - sh.y, d2 = dx * dx + dy * dy; if (d2 < 120 * 120) { fx += dx / d2 * 3; fy += dy / d2 * 3; } }
      fx *= 300; fy *= 300;
      for (const z of G.zones) { const dx = P.x - z.x, dy = P.y - z.y, d = Math.hypot(dx, dy) || 1; if (d < z.r + 25) { fx += dx / d * 4; fy += dy / d * 4; } }
      const b = G.boss;
      if (b && b.skill && (b.skill.id === 'charge' || b.skill.id === 'quake')) { // né khỏi vạch lao
        const ux = Math.cos(b.skill.dir), uy = Math.sin(b.skill.dir), rx = P.x - b.x, ry = P.y - b.y;
        const along = rx * ux + ry * uy, perp = -rx * uy + ry * ux;
        if (along > -20 && along < 300 && Math.abs(perp) < b.r * 1.6 + 20) { const sg = perp >= 0 ? 1 : -1; fx += -uy * sg * 5; fy += ux * sg * 5; }
      }
      let best = null, bd = 380 * 380;
      for (const g of G.gems.items) { const d2 = ((g.x - P.x) ** 2 + (g.y - P.y) ** 2) * (g.kind === 'xp' ? 1 : 0.15); if (d2 < bd) { bd = d2; best = g; } }
      for (const e of G.enemies.items) if (e.prop && !e.dead) { const d2 = ((e.x - P.x) ** 2 + (e.y - P.y) ** 2) * 0.5; if (d2 < bd) { bd = d2; best = e; } }
      if (best && near < 3) { const d = Math.hypot(best.x - P.x, best.y - P.y) || 1; fx += (best.x - P.x) / d * 1.2; fy += (best.y - P.y) / d * 1.2; }
      const a = s * 0.003; fx += Math.cos(a) * 0.25; fy += Math.sin(a) * 0.25;
      const ks = [], l = Math.hypot(fx, fy) || 1;
      if (fx / l > 0.38) ks.push('KeyD'); if (fx / l < -0.38) ks.push('KeyA'); if (fy / l > 0.38) ks.push('KeyS'); if (fy / l < -0.38) ks.push('KeyW');
      let danger = G.zones.some(z => z.t < 0.3 && Math.hypot(P.x - z.x, P.y - z.y) < z.r + P.r);
      if (b && b.skill && (b.skill.id === 'charge' || b.skill.id === 'quake') && (b.skill.phase === 'act' || b.skill.t < 0.25)) {
        const ux = Math.cos(b.skill.dir), uy = Math.sin(b.skill.dir), rx = P.x - b.x, ry = P.y - b.y, al = rx * ux + ry * uy;
        if (al > -10 && al < 260 && Math.abs(-rx * uy + ry * ux) < b.r + 14) danger = true;
      }
      if (danger && P.dashCd <= 0) { dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ' })); dispatchEvent(new KeyboardEvent('keyup', { code: 'Space', key: ' ' })); rec.dashes = (rec.dashes || 0) + 1; }
      setKeys(ks);
      v.tick(1 / react);
      while (G.state === 'levelup') {
        const c = G.choices.find(u => u.kind === 'evo') || G.choices.find(u => u.kind === 'weapon') || G.choices.find(u => ['vital', 'armor', 'regen', 'might', 'haste', 'area'].includes(u.id)) || G.choices[0];
        v.choose(c);
      }
      if (G.boss && G.boss !== lastBoss) { lastBoss = G.boss; bossStart = G.t; rec.bosses.push({ type: G.boss.type, at: Math.round(G.t), lvl: G.level, hp: Math.round(G.boss.maxHp) }); }
      if (lastBoss && lastBoss.dead && rec.bosses.length && rec.bosses[rec.bosses.length - 1].killedIn === undefined) rec.bosses[rec.bosses.length - 1].killedIn = Math.round(G.t - bossStart);
      if (s % (60 * react) === 60 * react - 1) rec.levelByMin.push(G.level);
      if (G.state !== 'play') break;
    }
  } finally { setKeys([]); window.hurtPlayer = origHurt; }
  rec.end = { state: G.state, won: G.won, t: Math.round(G.t), wave: G.wave.i + 1, phase: G.wave.phase, lvl: G.level, kills: G.kills, hpLeft: Math.round(G.player.hp) };
  rec.dmgByMin = Array.from(rec.dmgByMin, x => Math.round(x || 0));
  for (const k in rec.src) rec.src[k] = Math.round(rec.src[k]);
  rec.build = JSON.stringify(G.player.levels);
  rec.dealt = Object.fromEntries(Object.entries(G.stats.dmg).map(([k, x]) => [k, Math.round(x)]));
  if (G.state === 'play') G.state = 'over';
  return rec;
};
