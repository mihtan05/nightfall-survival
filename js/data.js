'use strict';
/* =========================================================
   CẤU HÌNH & DỮ LIỆU  (chỉnh cân bằng game ở đây)
   ========================================================= */
const CFG = {
  player: { hp: 120, speed: 150, radius: 12, iframe: 0.6, magnet: 100 },
  spawn: { maxEnemies: 450, ringPad: 80 },
  hpScalePerMin: 0.38,   // máu quái +38% mỗi phút GIAO TRANH (G.diffT: không tính lúc đánh boss / nghỉ)
  dmgScalePerMin: 0.08,  // sát thương quái +8% mỗi phút giao tranh
  xpFor: l => Math.floor(2 + l * 2.5 + l * l * 0.3),
  itemChance: 0.016,     // tỉ lệ quái thường rơi vật phẩm (xem ITEMS)
  crates: { max: 5, every: 7 },  // số thùng gỗ tối đa quanh người chơi, giây giữa 2 lần sinh
  restTime: 6,           // giây nghỉ giữa 2 đợt (sau khi hạ boss)
  batchLevel: 20, batchWait: 2, // từ cấp 20: gom các lần lên cấp trong 2 giây vào một lần chọn
  bossSpawnMul: 0.2,     // khi có boss, quái thường ra bằng 20% tốc độ cuối đợt
  gemCap: 400, textCap: 160, partCap: 400,
  step: 1 / 60, grid: 64, tile: 48,
  view: { height: 360 },  // chiều ngắn của màn hình thấy khoảng bấy nhiêu đơn vị thế giới (xem render.js)
  sfxCap: 140,            // tối đa số hiệu ứng sprite cùng lúc
  sfxSoftCap: 90,         // hiệu ứng thường (không có pri) bị bỏ khi đã có bấy nhiêu — chừa chỗ cho hiệu ứng quan trọng
  hurt: { stop: 0.07, pushR: 90, push: 180 }, // bị đánh: khựng hình, đẩy lùi quái quanh người
  levelPush: { r: 120, push: 320 },
  dash: { speed: 520, dur: 0.16, cd: 2.2, iframe: 0.26 }, // lướt né (~83 đơn vị): đủ thoát vạch lao / vòng dậm đất
  slots: { weapons: 4, passives: 4 }, // số ô vũ khí / bị động tối đa
  rerolls: 2,                          // số lần đổi thẻ mỗi ván
  evo: { passiveLvl: 3, shard: { ang: 0.61, dmg: 0.4, life: 0.35, r: 3 }, orbit2: { rMul: 1.75, n: 3, spin: -0.7 },
         chain: { n: 3, range: 90, falloff: 0.6 }, knifeBack: 0.8, auraHeal: { per: 0.5, cap: 4 }, stun: 0.6, bossSlow: 0.3, novaOnHurtCd: 4 },  // lên cấp: sóng đẩy lùi quái (không gây sát thương)
  glowCap: 200,                      // tối đa số quầng sáng mỗi khung
  cine: { dur: 1.4 },                // boss xuất hiện: dừng logic, camera lia tới boss (giây thật)
  bossDeath: { slow: 0.9, rate: 0.3, booms: 5, every: 0.12, winWait: 2.2 }, // boss chết: chậm 30% trong 0.9 giây thật, 5 vụ nổ nối tiếp
  gems: { mergeAt: 150, mergeR: 28, look: 12 },
  bossGap: 1.0,          // giây nghỉ giữa 2 kỹ năng boss
  enrage: { after: 75, every: 15, step: 0.1, max: 0.5 }, // boss sống quá 75 giây: cứ 15 giây nhanh thêm 10% (tối đa 50%)
  elite: { hp: 10, sc: 1.5, r: 1.4, dmg: 1.5, mass: 3, gem: 25, types: ['skeleton', 'ghost', 'golem'] }, // quái tinh anh // nhiều ngọc: ngọc mới gộp vào ngọc gần (trong 12 ngọc rơi gần nhất)
  /* Viền sprite, vẽ lúc chạy ở độ phân giải canvas (xem "BỘ ĐỆM SPRITE" trong render.js):
     px = độ dày vòng trong (px canvas, như nhau ở mọi cỡ quái), inner/outer = độ đậm vòng trong / vòng mờ ngoài cùng,
     snap = làm tròn cỡ điểm ảnh sprite về số nguyên nếu lệch không quá bấy nhiêu (0 = tắt),
     còn lại là màu theo vai (null = không viền). Thử nhanh: __vs.outline({ px: 2, inner: 0.7 }). */
  outline: { px: 1, inner: 0.55, outer: 0.18, snap: 0.12, enemy: '#cfc4ff', player: '#ffe2a0', elite: '#ffd166', rage: '#ff5a6e', item: null },
  spawnIn: 0.2,           // quái sinh ra trong tầm nhìn (nhớt con, quân boss gọi, thùng gỗ): lớn dần + hiện dần trong bấy nhiêu giây (chỉ là hình ảnh)
  bob: { amp: 0.03, rate: 9 }, // quái nhún khi đi: co giãn ±3% chiều cao (làm tròn về px canvas), amp 0 = tắt
  barLag: 8,              // thanh máu: vệt nhạt đuổi theo máu thật, số càng lớn càng nhanh (~0.4 giây)
  shakeMax: 8,            // rung màn tối đa (đơn vị thế giới)
  hitStop: { big: 0.045, boss: 0.06 }, // khựng hình khi hạ quỷ khổng lồ / boss (giây)
};

// Cài đặt người chơi (lưu localStorage)
const SETTINGS = {
  shake: store.get('vs_shake', true),
  musicVol: store.get('vs_music', 0.6),  // 0..1
  sfxVol: store.get('vs_sfx', 0.8),      // 0..1
};

/* pri: hiệu ứng quan trọng, chỉ bị bỏ khi đầy hẳn CFG.sfxCap.
   Hiệu ứng sprite từ js/fx-atlas.js (sinh bởi tools/build_fx_atlas.py, gói PVFX Foundry CC0).
   scale: cỡ vẽ (1 px ảnh = scale đơn vị thế giới); add: hoà màu cộng sáng; under: vẽ dưới nhân vật;
   chance: chỉ phát với xác suất này (cho hiệu ứng xảy ra rất dày như hào quang độc). */
const FX_SRC = typeof FX_ATLAS !== 'undefined' ? FX_ATLAS.src + '?v=g3' : null;
const FX_STYLE = {
  hitSpark:    { scale: 0.4,  add: true },          // Huyết Tiễn trúng
  arrowHit:    { scale: 0.45, add: true },          // Dao Bạc trúng (xoay theo hướng dao)
  claw:        { scale: 0.55 },                     // Vòng Huyết Nguyệt chém
  spore:       { scale: 0.4,  chance: 0.2 },       // Hào Quang Độc
  punch:       { scale: 0.5,  add: true },          // Sóng Xung Kích trúng
  strike:      { scale: 0.85, add: true, pri: 1 },          // Lôi Phạt
  puff:        { scale: 0.45 },                     // quái nhỏ chết
  boom:        { scale: 0.8,  add: true, pri: 1 },          // quỷ khổng lồ chết
  bigBoom:     { scale: 1.5,  add: true, pri: 1 },          // boss chết
  levelUp:     { scale: 0.75, add: true, pri: 1 },
  heartUp:     { scale: 0.7,  add: true, pri: 1 },
  magicCircle: { scale: 0.8,  add: true, under: true, pri: 1 }, // boss sắp bắn vòng đạn
};

/* Sprite (Giai đoạn 2 điền vào). Mỗi mục là một loại vật (player, bat, slime, boss, xp, chest...):
   kind: {
     src: 'assets/atlas.png',          // nhiều mục có thể dùng chung một ảnh atlas
     anchor: [8, 20],                  // điểm trong khung (px ảnh) đặt trùng toạ độ vật; mặc định giữa khung
     scale: 1,                         // 1 px ảnh = bao nhiêu đơn vị thế giới
     anims: {                          // thiếu anim nào thì lùi về run → idle
       idle: { fps: 6,  frames: [[x, y, w, h], ...] },
       run:  { fps: 10, frames: [...] },
       hit:  { fps: 12, frames: [...] },  // quái: khi đang nháy trúng đòn; người chơi: vừa bị đánh
       die:  { fps: 12, frames: [...] },  // dùng khi có trạng thái chết (Giai đoạn 2)
     },
   }
   Thiếu mục hoặc ảnh nạp lỗi → vẽ bằng hình code trong SHAPES. */
const ASSETS = {};

/* Gắn sprite từ atlas (js/atlas.js, sinh bởi tools/build_atlas.py từ gói 0x72 CC0).
   Tên hiển thị theo sprite: bat → Tiểu quỷ (imp), ghost → Pháp sư tử linh (necromancer),
   golem → Quỷ khổng lồ (ogre), boss → Chúa Tể Bóng Đêm (big_demon). Mã nội bộ giữ nguyên.
   anims: tên: [tiền tố khung, số khung (0 = một khung không đánh số), fps]
   anchor tính theo px trong khung (đã gồm lề trong suốt 1px), đặt trùng tâm va chạm của vật. */
const ATLAS_SRC = typeof ATLAS !== 'undefined' ? ATLAS.src + '?v=g6' : null;
const SPRITES = {
  player:   { anchor: [9, 19],    scale: 1,   anims: { idle: ['wizzard_m_idle_anim_f', 4, 6], run: ['wizzard_m_run_anim_f', 4, 10], hit: ['wizzard_m_hit_anim_f', 1, 1] } },
  bat:      { anchor: [9, 11],    scale: 1.2, anims: { idle: ['imp_idle_anim_f', 4, 8], run: ['imp_run_anim_f', 4, 12] } },
  slime:    { anchor: [9, 11],    scale: 1.5, anims: { run: ['swampy_anim_f', 4, 8] } },
  skeleton: { anchor: [9, 11],    scale: 1.4, anims: { idle: ['skelet_idle_anim_f', 4, 6], run: ['skelet_run_anim_f', 4, 10] } },
  ghost:    { anchor: [9, 15],    scale: 1.2, anims: { run: ['necromancer_anim_f', 4, 6] } },
  golem:    { anchor: [17, 25],   scale: 1.1, anims: { idle: ['ogre_idle_anim_f', 4, 5], run: ['ogre_run_anim_f', 4, 8] } },
  boss:     { anchor: [17, 23],   scale: 1.8, anims: { idle: ['big_demon_idle_anim_f', 4, 5], run: ['big_demon_run_anim_f', 4, 8] } },
  bossZombie: { anchor: [17, 25], scale: 1.7, anims: { idle: ['big_zombie_idle_anim_f', 4, 5], run: ['big_zombie_run_anim_f', 4, 8] } },
  bossNecro:  { anchor: [9, 15],  scale: 2.4, anims: { run: ['necromancer_anim_f', 4, 6] } },
  bossOgre:   { anchor: [17, 25], scale: 1.9, anims: { idle: ['ogre_idle_anim_f', 4, 4], run: ['ogre_run_anim_f', 4, 6] } },
  // biến thể: dùng lại sprite có sẵn, nhuộm màu (tint: [màu, độ đậm]) và đổi cỡ
  bomber:   { anchor: [9, 11],    scale: 1.35, tint: ['#ff9a3d', 0.45], anims: { idle: ['imp_idle_anim_f', 4, 8], run: ['imp_run_anim_f', 4, 14] } },
  splitter: { anchor: [9, 11],    scale: 2.4, anims: { run: ['swampy_anim_f', 4, 6] } },
  charger:  { anchor: [9, 11],    scale: 1.6, tint: ['#6fa8ff', 0.4], anims: { idle: ['skelet_idle_anim_f', 4, 6], run: ['skelet_run_anim_f', 4, 10] } },
  crate:    { anchor: [9, 17],    scale: 1.2, anims: { idle: ['crate', 0, 1] } },
  potion:   { anchor: [9, 9],     scale: 1,   anims: { idle: ['flask_big_red', 0, 1] } },
  shield:   { anchor: [9, 9],     scale: 1,   anims: { idle: ['flask_big_blue', 0, 1] } },
  speed:    { anchor: [9, 9],     scale: 1,   anims: { idle: ['flask_big_green', 0, 1] } },
  rage:     { anchor: [9, 9],     scale: 1,   anims: { idle: ['flask_big_yellow', 0, 1] } },
  bomb:     { anchor: [9, 10],    scale: 1.1, anims: { idle: ['bomb_f', 3, 6] } },
  knife:    { anchor: [4, 7.5],   scale: 1,   rotate: Math.PI / 2, anims: { idle: ['weapon_knife', 0, 1] } },
  orb:      { anchor: [6, 11.5],  scale: 1,   rotate: Math.PI / 2, anims: { idle: ['weapon_red_gem_sword', 0, 1] } },
  chest:    { anchor: [9, 10],    scale: 1.3, anims: { idle: ['chest_full_open_anim_f', 1, 1] } },
  heart:    { anchor: [7.5, 7],   scale: 1.1, anims: { idle: ['ui_heart_full', 0, 1] } },
};
if (ATLAS_SRC) {
  for (const [kind, s] of Object.entries(SPRITES)) {
    const anims = {};
    for (const [name, [base, n, fps]] of Object.entries(s.anims)) {
      const names = n ? Array.from({ length: n }, (_, i) => base + i) : [base];
      const frames = names.map(nm => ATLAS.frames[nm]).filter(Boolean);
      if (frames.length) anims[name] = { fps, frames };
    }
    // ảnh nhuộm màu: src = atlas + '#tint=màu,độ đậm' (Assets.load tạo bản nhuộm từ atlas gốc)
    const src = s.tint ? `${ATLAS_SRC}#tint=${s.tint[0]},${s.tint[1]}` : ATLAS_SRC;
    if (Object.keys(anims).length) ASSETS[kind] = { src, anchor: s.anchor, scale: s.scale, rotate: s.rotate, anims };
  }
}

const ENEMIES = {
  bat:      { hp: 5,   speed: 105, dmg: 6,  r: 9,  xp: 1, mass: 0.6, color: '#d04a3a' },
  slime:    { hp: 14,  speed: 50,  dmg: 9,  r: 12, xp: 2, mass: 1.4, color: '#4fbf5a' },
  skeleton: { hp: 26,  speed: 66,  dmg: 10, r: 11, xp: 3, mass: 1.0, color: '#e8e2d0' },
  ghost:    { hp: 18,  speed: 62,  dmg: 8,  r: 11, xp: 4, mass: 0.8, color: '#9b7bd1', cap: 6, ranged: { range: 200, cd: 3.4, speed: 150, dmg: 6 } },
  golem:    { hp: 95,  speed: 38,  dmg: 12, r: 18, xp: 8, mass: 4,   color: '#b8956a' },
  // Quỷ nổ: lao nhanh, tới gần (hoặc bị hạ) thì nổ thành vùng sát thương — vùng này cũng làm hại quái
  bomber:   { hp: 10,  speed: 125, dmg: 0,  r: 10, xp: 3, mass: 0.6, color: '#ff9a3d', cap: 8, bomb: { near: 46, r: 40, delay: 0.55, dmg: 14, enemyDmg: 30 } },
  // Nhớt mẹ: chết thì tách thành 3 nhớt con
  splitter: { hp: 70,  speed: 40,  dmg: 11, r: 18, xp: 4, mass: 3,   color: '#4fbf5a', split: { type: 'slime', n: 3, kb: 120 } },
  // Kỵ sĩ xương: dừng lại báo trước (vạch đỏ) rồi lao thẳng
  charger:  { hp: 45,  speed: 60,  dmg: 14, r: 12, xp: 5, mass: 1.5, color: '#6fa8ff', cap: 6, charge: { min: 70, max: 190, tele: 0.5, dur: 0.4, speed: 380, cd: 4, len: 150 } },
  crate:    { hp: 1,   speed: 0,   dmg: 0,  r: 9,  xp: 0, mass: 99,  color: '#a8743e', prop: true }, // thùng gỗ phá được

  /* Boss cuối mỗi đợt. skills: tên kỹ năng trong BOSS_SKILLS (lặp tên = hay dùng hơn); summon: lâu la gọi ra.
     Dưới 50% máu boss "nổi giận": hồi kỹ năng nhanh hơn 30%, báo trước ngắn hơn 15%, và có thêm kỹ năng skills2. */
  bossZombie: { name: 'Vua Thây Ma', hint: 'Coi chừng cú lao thẳng!', hp: 750,  speed: 60, dmg: 18, r: 24, xp: 0, mass: 25, color: '#6fae5a', boss: true,
                skills: ['charge', 'charge', 'summon'], skills2: ['quake'], summon: { type: 'slime', n: 5 } },
  bossNecro:  { name: 'Đại Pháp Sư Tử Linh', hint: 'Nó dịch chuyển và bắn đạn xoắn ốc!', hp: 1150, speed: 48, dmg: 16, r: 20, xp: 0, mass: 25, color: '#9b7bd1', boss: true,
                skills: ['teleport', 'spiral', 'summon', 'ring'], skills2: ['wall'], summon: { type: 'skeleton', n: 4 } },
  bossOgre:   { name: 'Quỷ Khổng Lồ Đá', hint: 'Tránh khỏi vòng đỏ dưới chân!', hp: 2100, speed: 44, dmg: 24, r: 28, xp: 0, mass: 30, color: '#b8956a', boss: true,
                skills: ['slam', 'slam', 'ring', 'charge'], skills2: ['boulders'], summon: { type: 'golem', n: 2 } },
  boss:       { name: 'Chúa Tể Bóng Đêm', hint: 'Trận chiến cuối cùng!', hp: 4200, speed: 58, dmg: 22, r: 28, xp: 0, mass: 25, color: '#d0304a', boss: true,
                skills: ['ring', 'meteor', 'charge', 'spiral', 'summon'], skills2: ['rings'], summon: { type: 'bat', n: 8 } },
};

/* Kỹ năng boss. Mỗi kỹ năng báo trước (tele, giây) rồi mới ra đòn — người chơi luôn có thời gian né.
   cd: hồi chiêu riêng của kỹ năng; giữa 2 kỹ năng bất kỳ nghỉ CFG.bossGap giây. */
const BOSS_SKILLS = {
  charge:   { tele: 0.8, cd: 4.5, speed: 430, dur: 0.5 },                                 // lao thẳng (vạch đỏ báo trước)
  summon:   { tele: 0.6, cd: 9 },                                                        // gọi lâu la (vòng phép)
  ring:     { tele: 0.6, cd: 4,   n: 12, speed: 135, dmg: 11 },                           // vòng đạn tỏa ra
  spiral:   { tele: 0.5, cd: 7,   dur: 2.4, every: 0.09, arms: 3, speed: 115, dmg: 8 },  // đạn xoắn ốc
  teleport: { tele: 0.7, cd: 6 },                                                        // dịch chuyển tới cạnh người chơi
  slam:     { tele: 1.0, cd: 4.5, n: 3, r: 44, dmg: 26 },                                // dậm đất: vòng nổ chỗ người chơi
  meteor:   { tele: 1.1, cd: 6,   n: 6, r: 32, dmg: 22 },                                // mưa thiên thạch quanh người chơi
  // kỹ năng pha 2 (skills2)
  quake:    { tele: 0.8, cd: 6,   speed: 430, dur: 0.5, n: 3, r: 36, dmg: 16, warn: 0.6, gap: 0.15, span: 120 }, // lao + 3 vùng nổ dọc vệt lao
  wall:     { tele: 0.6, cd: 7,   n: 20, hole: 4, speed: 110, dmg: 8, dur: 0.6 },              // 2 vòng đạn có khe hở, khe vòng 2 lệch 90°
  boulders: { tele: 0.9, cd: 6,   n: 5, r: 30, dmg: 18, step: 55, gap: 0.18 },                 // 5 tảng đá rơi thành hàng về phía người chơi
  rings:    { tele: 0.6, cd: 7,   n: 16, k: 3, every: 0.5, speed: 125, dmg: 9, dur: 1.0 },     // 3 vòng đạn liên tiếp, lệch nửa bước
};

/* Vật phẩm nhặt được: rơi từ thùng gỗ (luôn rơi) hoặc từ quái thường (CFG.itemChance).
   w: trọng số khi bốc ngẫu nhiên; dur: thời gian hiệu lực (giây) của vật phẩm có thời hạn. */
const ITEMS = {
  potion: { name: 'Bình máu',       w: 26,          color: '#ff6b81', desc: 'Hồi 30% máu' },
  magnet: { name: 'Nam châm',       w: 14,          color: '#ff5c5c', desc: 'Hút toàn bộ ngọc kinh nghiệm' },
  shield: { name: 'Khiên phép',     w: 12, dur: 20, color: '#7fc8ff', desc: 'Chặn 3 đòn trong 20 giây' },
  speed:  { name: 'Thuốc gió',      w: 12, dur: 10, color: '#5cff9d', desc: '+40% tốc chạy trong 10 giây' },
  rage:   { name: 'Thuốc cuồng nộ', w: 12, dur: 10, color: '#ffd166', desc: '+50% sát thương trong 10 giây' },
  bomb:   { name: 'Bom',            w: 7,           color: '#ff9a3d', desc: 'Nổ tung mọi quái trên màn hình' },
  freeze: { name: 'Đồng hồ băng',   w: 8,  dur: 5,  color: '#bfe6ff', desc: 'Đóng băng quái trong 5 giây' },
  xp2:    { name: 'Sách cổ',        w: 9,  dur: 20, color: '#c86bff', desc: 'x2 kinh nghiệm trong 20 giây' },
};

/* 4 đợt quái. Mỗi đợt: đánh `dur` giây (tốc độ sinh tăng dần rate[0] → rate[1]), rồi boss xuất hiện
   (quái thường vẫn ra nhưng thưa hơn). Hạ boss → nghỉ CFG.restTime giây → đợt sau. Hạ boss đợt cuối là thắng.
   mix: thành phần quái theo giây trong đợt; events: sự kiện theo giây trong đợt. */
const WAVE_DEFS = [
  { name: 'Nghĩa địa thức giấc', dur: 110, rate: [1.1, 3.0], boss: 'bossZombie',
    ground: { tint: 'rgba(10,8,18,0.50)', decor: ['tomb', 'grass', 'grass'], light: '5,3,12', mote: '#bcd6ff' },
    mix: [{ t: 0, mix: { bat: 1 } }, { t: 20, mix: { bat: 3, slime: 1 } }, { t: 55, mix: { bat: 2, slime: 2, splitter: 0.5 } }, { t: 85, mix: { bat: 2, slime: 2, skeleton: 1, splitter: 0.5 } }], elites: [75],
    events: [{ t: 30, kind: 'circle', type: 'bat', n: 26, msg: 'Bị bao vây!' }, { t: 65, kind: 'swarm', type: 'bat', n: 25, msg: 'Bầy tiểu quỷ kéo đến!' }] },
  { name: 'Tiếng gọi tử linh', dur: 140, rate: [2.0, 3.6], boss: 'bossNecro',
    ground: { tint: 'rgba(38,10,48,0.50)', decor: ['bones', 'rune', 'bones'], light: '12,3,22', mote: '#c9a6ff' },
    mix: [{ t: 0, mix: { bat: 3, slime: 2, skeleton: 1 } }, { t: 30, mix: { bat: 2, slime: 2, skeleton: 2, ghost: 1, bomber: 1 } }, { t: 110, mix: { bat: 2, slime: 2, skeleton: 2, ghost: 1, golem: 1, bomber: 1, charger: 1 } }], elites: [60, 110],
    events: [{ t: 50, kind: 'circle', type: 'slime', n: 36, msg: 'Bị bao vây!' }, { t: 110, kind: 'swarm', type: 'bat', n: 45, msg: 'Bầy tiểu quỷ kéo đến!' }] },
  { name: 'Đất rung chuyển', dur: 140, rate: [4.2, 7.0], boss: 'bossOgre',
    ground: { tint: 'rgba(48,26,8,0.50)', decor: ['crack', 'rock', 'crack'], light: '13,7,3', mote: '#b89a72' },
    mix: [{ t: 0, mix: { bat: 2, skeleton: 3, ghost: 2, golem: 1, bomber: 2, charger: 2, splitter: 1 } }, { t: 70, mix: { bat: 3, slime: 2, skeleton: 3, ghost: 2, golem: 1, bomber: 2, charger: 2, splitter: 1 } }], elites: [60, 110],
    events: [{ t: 45, kind: 'circle', type: 'skeleton', n: 40, msg: 'Bị bao vây!' }, { t: 100, kind: 'swarm', type: 'skeleton', n: 50, msg: 'Đội quân xương trỗi dậy!' }] },
  { name: 'Màn đêm cuối cùng', dur: 140, rate: [7.0, 11.5], boss: 'boss',
    ground: { tint: 'rgba(60,6,14,0.55)', decor: ['blood', 'ember', 'ember'], light: '18,2,5', mote: '#ff9a4a' },
    mix: [{ t: 0, mix: { bat: 3, skeleton: 4, ghost: 2, golem: 2, bomber: 2, charger: 3, splitter: 1 } }, { t: 70, mix: { bat: 4, skeleton: 4, ghost: 3, golem: 2, bomber: 2, charger: 3, splitter: 1 } }], elites: [60, 110],
    events: [{ t: 40, kind: 'circle', type: 'golem', n: 24, msg: 'Quỷ khổng lồ bao vây!' }, { t: 95, kind: 'swarm', type: 'bat', n: 80, msg: 'Màn đêm cuối cùng!' }] },
];

/* ---------- Vũ khí: mỗi vũ khí có base, 7 cấp nâng và hàm update ----------
   ms: tên CỘT MỐC (cấp 4 và cấp 8 — đúng lúc vũ khí đổi hình, xem CFG.tiers). V5 Phase 4 chỉ ĐỔI THỨ TỰ các bước có sẵn
   (tổng ở cấp 8 không đổi) để cấp 4/8 là bước đổi cách đánh chứ không chỉ cộng %. */
const WEAPONS = {
  bolt: {
    name: 'Huyết Tiễn', icon: '✦', desc: 'Bắn tiễn vào quái gần nhất',
    base: { dmg: 8, cd: 0.7, count: 1, pierce: 1, speed: 420, life: 1.3, r: 5, range: 520 },
    levels: [
      { d: '+1 tiễn',                        f: s => s.count++ },
      { d: '+40% sát thương',                f: s => s.dmg *= 1.4 },
      { d: 'Xuyên thêm 1 quái',              f: s => s.pierce++, ms: 'Xuyên Giáp' },
      { d: '+1 tiễn',                        f: s => s.count++ },
      { d: '-20% hồi chiêu',                 f: s => s.cd *= 0.8 },
      { d: '+40% sát thương, bay nhanh hơn', f: s => { s.dmg *= 1.4; s.speed *= 1.2; } },
      { d: '+1 tiễn, xuyên thêm 1',          f: s => { s.count++; s.pierce++; }, ms: 'Loạn Tiễn' },
    ],
    update(w, p, dt) {
      w.timer -= dt; if (w.timer > 0) return;
      const targets = nearestEnemies(p.x, p.y, w.count, w.range);
      const b = G.boss; // mũi tên đầu tiên ưu tiên boss (không thì lâu la quanh boss hứng hết)
      if (b && !b.dead && (b.x - p.x) ** 2 + (b.y - p.y) ** 2 < w.range * w.range && !targets.includes(b)) { if (targets.length >= w.count) targets.pop(); targets.unshift(b); }
      if (!targets.length) { w.timer = 0.1; return; }
      w.timer = w.cd * p.mCd;
      for (let i = 0; i < w.count; i++) {
        const t = targets[i % targets.length], extra = Math.floor(i / targets.length);
        const ang = Math.atan2(t.y - p.y, t.x - p.x) + (extra ? (extra % 2 ? 1 : -1) * Math.ceil(extra / 2) * 0.18 : 0);
        const bl = fireBullet('bolt', p.x, p.y - 4, ang, w.speed, w.life, w.dmg * dmgMul(p), w.pierce, w.r * Math.sqrt(p.mArea), 1);
        if (w.evo) { bl.evo = true; bl.split = true; }
        lookBullet(bl, w);
      }
      const a0 = Math.atan2(targets[0].y - p.y, targets[0].x - p.x); castCue(w, p.x + Math.cos(a0) * 12, p.y - 4 + Math.sin(a0) * 12); // loé phía trước, không che mặt
      SFX.play('shoot');
    },
  },
  orbit: {
    name: 'Vòng Huyết Nguyệt', icon: '◐', desc: 'Cầu máu xoay quanh người, chém quái chạm phải',
    base: { dmg: 6, count: 2, radius: 62, spin: 3, r: 8, hitCd: 0.45, ang: 0 },
    levels: [
      { d: '+1 cầu',                          f: s => s.count++ },
      { d: '+30% sát thương',                 f: s => s.dmg *= 1.3 },
      { d: '+20% bán kính và tốc độ xoay',    f: s => { s.radius *= 1.2; s.spin *= 1.2; }, ms: 'Trăng Tròn' },
      { d: '+1 cầu',                          f: s => s.count++ },
      { d: '+30% sát thương',                 f: s => s.dmg *= 1.3 },
      { d: '+1 cầu',                          f: s => s.count++ },
      { d: '+40% sát thương, xoay nhanh hơn', f: s => { s.dmg *= 1.4; s.spin *= 1.25; }, ms: 'Cuồng Nguyệt' },
    ],
    update(w, p, dt) {
      w.ang += w.spin * dt; w.ang2 = (w.ang2 || 0) + w.spin * CFG.evo.orbit2.spin * dt;
      const r = w.r * Math.sqrt(p.mArea);
      for (const [n, ang, R] of orbitRings(w, p)) for (let i = 0; i < n; i++) {
        const a = ang + i * TAU / n, ox = p.x + Math.cos(a) * R, oy = p.y + Math.sin(a) * R;
        G.grid.query(ox, oy, r + 30, tmp);
        for (let j = 0; j < tmp.length; j++) {
          const e = tmp[j];
          if (e.dead || e.orbCd > 0) continue;
          const rr = e.r + r;
          if ((e.x - ox) ** 2 + (e.y - oy) ** 2 < rr * rr) {
            e.orbCd = w.hitCd; hitEnemy(e, w.dmg * dmgMul(p), e.x - p.x, e.y - p.y, 0.7, 'claw', 'orbit', weaponLook(w).impact); SFX.play('orb');
          }
        }
      }
    },
  },
  lightning: {
    name: 'Lôi Phạt', icon: '⚡', desc: 'Sét đánh ngẫu nhiên vào quái, gây sát thương vùng',
    base: { dmg: 14, cd: 2.2, count: 1, aoe: 32 },
    levels: [
      { d: '+1 tia sét',      f: s => s.count++ },
      { d: '+30% sát thương', f: s => s.dmg *= 1.3 },
      { d: '+1 tia sét',      f: s => s.count++, ms: 'Tam Lôi' },
      { d: '-15% hồi chiêu',  f: s => s.cd *= 0.85 },
      { d: '+40% vùng nổ',    f: s => s.aoe *= 1.4 },
      { d: '+1 tia sét',      f: s => s.count++ },
      { d: '+50% sát thương', f: s => s.dmg *= 1.5, ms: 'Lôi Đình' },
    ],
    update(w, p, dt) {
      w.timer -= dt; if (w.timer > 0) return;
      const cands = lightCands; cands.length = 0;
      for (const e of G.enemies.items) if (!e.dead && !e.prop && Math.abs(e.x - p.x) < VW / 2 && Math.abs(e.y - p.y) < VH / 2) cands.push(e);
      if (!cands.length) { w.timer = 0.2; return; }
      w.timer = w.cd * p.mCd;
      for (let i = 0; i < w.count; i++) {
        const b = G.boss, bossOn = b && !b.dead && Math.abs(b.x - p.x) < VW / 2 && Math.abs(b.y - p.y) < VH / 2;
        const t = i === 0 && bossOn ? b : cands[Math.floor(Math.random() * cands.length)];
        strike(t.x, t.y, w.dmg * dmgMul(p), w.aoe * p.mArea, 'lightning', w);
        if (w.evo) chainLightning(t, w.dmg * dmgMul(p));
      }
    },
  },
  knife: {
    name: 'Dao Bạc', icon: '†', desc: 'Ném dao theo hướng di chuyển, xuyên qua quái',
    base: { dmg: 6, cd: 0.55, count: 1, pierce: 2, speed: 540, life: 0.8, r: 4 },
    levels: [
      { d: '+1 dao',            f: s => s.count++ },
      { d: '+30% sát thương',   f: s => s.dmg *= 1.3 },
      { d: 'Xuyên thêm 2 quái', f: s => s.pierce += 2, ms: 'Xuyên Thấu' },
      { d: '+1 dao',            f: s => s.count++ },
      { d: '-20% hồi chiêu',    f: s => s.cd *= 0.8 },
      { d: '+40% sát thương',   f: s => s.dmg *= 1.4 },
      { d: '+1 dao',            f: s => s.count++, ms: 'Tứ Đao' },
    ],
    update(w, p, dt) {
      w.timer -= dt; if (w.timer > 0) return;
      w.timer = w.cd * p.mCd;
      const ang = Math.atan2(p.dirY, p.dirX), nx = -Math.sin(ang), ny = Math.cos(ang);
      for (let i = 0; i < w.count; i++) {
        const off = (i - (w.count - 1) / 2) * 9;
        const kb = fireBullet('knife', p.x + nx * off, p.y + ny * off, ang, w.speed, w.life, w.dmg * dmgMul(p), w.pierce, w.r, 0.5);
        if (w.evo) kb.ret = 1; // bay hết tầm thì quay về
        lookBullet(kb, w);
      }
      castCue(w, p.x + p.dirX * 14, p.y + p.dirY * 14);
      SFX.play('knife');
    },
  },
  aura: {
    name: 'Hào Quang Độc', icon: '☣', desc: 'Vùng độc quanh người, gây sát thương liên tục',
    base: { dmg: 3, radius: 55, tick: 0.5, slow: 0.1, pulse: 0 },
    levels: [
      { d: '+20% bán kính',                 f: s => s.radius *= 1.2 },
      { d: '+2 sát thương',                 f: s => s.dmg += 2 },
      { d: 'Gây sát thương nhanh hơn 15%',  f: s => s.tick *= 0.85, ms: 'Ăn Mòn' },
      { d: '+20% bán kính',                 f: s => s.radius *= 1.2 },
      { d: '+3 sát thương',                 f: s => s.dmg += 3 },
      { d: '+20% bán kính',                 f: s => s.radius *= 1.2 },
      { d: 'Làm chậm quái 35%',             f: s => s.slow = 0.35, ms: 'Đầm Lầy' },
    ],
    update(w, p, dt) { w.pulse += dt; }, // sát thương xử lý trong updateEnemies (tiết kiệm 1 vòng duyệt)
  },
  nova: {
    name: 'Sóng Xung Kích', icon: '◉', desc: 'Định kỳ phát sóng đẩy lùi quái xung quanh',
    base: { dmg: 12, cd: 3.5, maxR: 110, kb: 3.5, count: 1 },
    levels: [
      { d: '+25% bán kính',              f: s => s.maxR *= 1.25 },
      { d: '+30% sát thương',            f: s => s.dmg *= 1.3 },
      { d: '+25% bán kính',              f: s => s.maxR *= 1.25, ms: 'Lan Rộng' },
      { d: '-15% hồi chiêu',             f: s => s.cd *= 0.85 },
      { d: '+40% sát thương',            f: s => s.dmg *= 1.4 },
      { d: '+50% sát thương và lực đẩy', f: s => { s.dmg *= 1.5; s.kb *= 1.5; } },
      { d: 'Phát 2 sóng liên tiếp',      f: s => s.count = 2, ms: 'Dư Chấn' },
    ],
    update(w, p, dt) {
      w.timer -= dt; if (w.timer > 0) return;
      w.timer = w.cd * p.mCd;
      for (let i = 0; i < w.count; i++) fireNova(w, p, i * 0.25);
      castCue(w, p.x, p.y + 11); // loé dưới chân
    },
  },
};

/* Tiến hoá: vũ khí cấp 8 + bị động ghép đôi đạt CFG.evo.passiveLvl → lần lên cấp sau thẻ đầu là tiến hoá.
   Thông số hành vi đặc biệt nằm ở CFG.evo. */
/* ---------- V5 Phase 3: vũ khí đổi hình theo cấp (CHỈ là hình ảnh — bán kính trúng, sát thương, hồi chiêu giữ nguyên) ----------
   Bậc 1 = cấp 1–3, bậc 2 = cấp 4–7, bậc 3 = cấp 8, bậc 4 = đã tiến hoá. Ranh giới ở CFG.tiers (cấp bắt đầu bậc 2 / bậc 3). */
CFG.tiers = { t2: 4, t3: 8 };
CFG.decals = { cap: 40 };            // vết trên nền (cháy sém, nứt đất): tối đa bấy nhiêu cùng lúc, cũ nhất bị bỏ trước
CFG.upgradeCue = { ring: 70, ringLife: 0.45 }; // lúc chọn thẻ vũ khí: vòng màu vũ khí quanh người (bán kính, giây)
/* Bảng hình dáng: mỗi vũ khí một màu chủ đạo (col, dùng cho vòng lên cấp + loé khi bắn) và 4 bậc. Trường chung:
     col/col2 = màu chính/phụ · trail = độ dài vệt (đơn vị thế giới) · grow = phần cộng thêm cho MỖI cấp trong cùng bậc
     size = hệ số cỡ hình · impact = hệ số cỡ hiệu ứng trúng đòn · parts = số hạt · glow = tên quầng sáng (GLOW_COLORS) hoặc null
   Trường riêng: sparks (tia lửa sau tiễn), after (bóng mờ phía sau), arc (cung kéo sau lưỡi, radian), ring (độ đậm vòng liền),
     branch (nhánh sét phụ), scorch (cỡ vết cháy, ×vùng nổ), flash (loé màn hình, độ đậm), ring2 (vòng đứt nét bên trong),
     pulse (sóng theo nhịp gây sát thương), double (vòng sóng thứ 2), dust (hạt bụi tung lên), cracks (cỡ vết nứt, ×bán kính),
     glint (lấp lánh ở mũi dao), ghost (số bóng mờ dao). */
const WEAPON_LOOK = {
  bolt: { col: '#ff4d8d', tiers: [
    { col: '#ff4d8d', col2: '#ffffff', trail: 9,  grow: 1.5, size: 1,    impact: 1,    parts: 0, glow: null,   sparks: 0, after: 0 },
    { col: '#ff4d8d', col2: '#ffe0ec', trail: 14, grow: 2,   size: 1.2,  impact: 1.25, parts: 0, glow: 'pink', sparks: 2, after: 0 },
    { col: '#ff7ab0', col2: '#ffffff', trail: 20, grow: 0,   size: 1.45, impact: 1.5,  parts: 0, glow: 'pink', sparks: 3, after: 1 },
    { col: '#b0103a', col2: '#ffd6de', trail: 20, grow: 0,   size: 1.45, impact: 1.5,  parts: 0, glow: 'red',  sparks: 3, after: 1 },
  ] },
  orbit: { col: '#ff3b5c', tiers: [
    { col: '#ff2040', col2: '#ff9aa8', trail: 0,   grow: 0,    size: 1,    impact: 1,    parts: 0, glow: null,  arc: 0,   ring: 0 },
    { col: '#ff2040', col2: '#ff9aa8', trail: 0.5, grow: 0.08, size: 1.05, impact: 1.2,  parts: 0, glow: null,  arc: 0.5, ring: 0 },
    { col: '#ff3b5c', col2: '#ffc2cc', trail: 0.8, grow: 0,    size: 1.1,  impact: 1.4,  parts: 0, glow: 'red', arc: 0.8, ring: 0.16 },
    { col: '#d0103a', col2: '#ffd166', trail: 0.8, grow: 0,    size: 1.1,  impact: 1.4,  parts: 0, glow: 'red', arc: 0.8, ring: 0.22 },
  ] },
  lightning: { col: '#7fd4ff', tiers: [
    { col: '#7fc8ff', col2: '#ffffff', trail: 0, grow: 0,   size: 1,    impact: 1,    parts: 10, glow: null,   branch: 0, scorch: 0,   flash: 0 },
    { col: '#7fd4ff', col2: '#ffffff', trail: 0, grow: 0.25, size: 1.6, impact: 1.15, parts: 12, glow: 'cyan', branch: 1, scorch: 1,   flash: 0 },
    { col: '#bfe6ff', col2: '#ffffff', trail: 0, grow: 0,   size: 2.2,  impact: 1.3,  parts: 16, glow: 'cyan', branch: 2, scorch: 1.5, flash: 0.08 },
    { col: '#d6a6ff', col2: '#ffffff', trail: 0, grow: 0,   size: 2.2,  impact: 1.3,  parts: 16, glow: 'purple', branch: 2, scorch: 1.5, flash: 0.08 },
  ] },
  knife: { col: '#dfe6f0', tiers: [
    { col: '#dfe6f0', col2: '#ffffff', trail: 0,  grow: 0, size: 1, impact: 1,    parts: 0, glow: null,   glint: 0, ghost: 0 },
    { col: '#dfe6f0', col2: '#ffffff', trail: 16, grow: 4, size: 1, impact: 1.2,  parts: 0, glow: null,   glint: 0, ghost: 0 },
    { col: '#ffffff', col2: '#bfe6ff', trail: 30, grow: 0, size: 1, impact: 1.4,  parts: 0, glow: 'cyan', glint: 1, ghost: 2 },
    { col: '#ffe9a8', col2: '#ffd166', trail: 30, grow: 0, size: 1, impact: 1.4,  parts: 0, glow: 'gold', glint: 1, ghost: 2 },
  ] },
  aura: { col: '#6eff8c', tiers: [
    { col: '#6eff8c', col2: '#8cffa0', trail: 0, grow: 0,    size: 1, impact: 1, parts: 0, glow: null, ring: 0.35, ring2: 0, pulse: 0 },
    { col: '#6eff8c', col2: '#8cffa0', trail: 0, grow: 0.05, size: 1, impact: 1, parts: 0, glow: null, ring: 0.5,  ring2: 0.28, pulse: 0 },
    { col: '#8cffa8', col2: '#c8ffd4', trail: 0, grow: 0,    size: 1, impact: 1, parts: 0, glow: null, ring: 0.6,  ring2: 0.34, pulse: 0.22 },
    { col: '#ff465a', col2: '#ff8296', trail: 0, grow: 0,    size: 1, impact: 1, parts: 0, glow: null, ring: 0.6,  ring2: 0.34, pulse: 0.25 },
  ] },
  nova: { col: '#7fd4ff', tiers: [
    { col: '#7fd4ff', col2: '#ffffff', trail: 0, grow: 0,   size: 1,   impact: 1,    parts: 0,  glow: null, double: 0, dust: 0,  cracks: 0 },
    { col: '#7fd4ff', col2: '#ffffff', trail: 0, grow: 0.04, size: 1.1, impact: 1.2,  parts: 14, glow: null, double: 1, dust: 1,  cracks: 0 },
    { col: '#a8e4ff', col2: '#ffffff', trail: 0, grow: 0,    size: 1.3, impact: 1.4,  parts: 20, glow: null, double: 1, dust: 1,  cracks: 0.75 },
    { col: '#ffd166', col2: '#ffffff', trail: 0, grow: 0,    size: 1.3, impact: 1.4,  parts: 20, glow: null, double: 1, dust: 1,  cracks: 0.85 },
  ] },
};

/* ---------- V5 Phase 7: phần thưởng trong ván (chỉ là phản hồi; kéo ngọc ở mốc combo chỉ đỡ phải đi nhặt) ---------- */
// Chuỗi hạ gục: mất chuỗi sau `window` giây không hạ quái; HUD hiện từ `show`; ở mỗi mốc `steps`: chữ lớn + vòng + kéo ngọc trong `pull` đơn vị.
// Âm hạ quái cao dần: tốc phát = 1 + min(pitchMax, combo × pitch). endShow: đứt chuỗi từ bấy nhiêu thì hiện số cuối.
CFG.combo = { window: 2.5, show: 10, steps: [25, 50, 100, 200], pull: 200, pitch: 0.004, pitchMax: 0.3, endShow: 25,
  colors: { 25: '#5cff9d', 50: '#4dc3ff', 100: '#c86bff', 200: '#ffd166' } };
CFG.callGap = 1;          // giới hạn chung: tối đa 1 dòng chữ lớn (mốc combo) mỗi giây; thông báo nhỏ cũng giãn ít nhất bấy nhiêu
CFG.chestCere = { dur: 1.2, spin: 0.06 };   // mở rương: dừng thế giới bấy nhiêu giây thật (bỏ qua bằng phím/chạm); đổi icon mỗi spin giây
CFG.xpNear = 0.85;        // thanh kinh nghiệm lấp lánh khi đầy hơn mức này
CFG.lowHp = { on: 0.25, off: 0.4 }; // viền đỏ + thanh máu run khi máu < on; tắt (kèm âm nhẹ) khi máu > off
CFG.toast = { gap: 1, life: 2.8, max: 3 }; // thông báo mốc bên phải màn hình: cách nhau ít nhất gap giây, tối đa max cái cùng lúc
/* Thông báo mốc (không chặn chơi). test() đọc trạng thái ván; mỗi id chỉ hiện một lần mỗi ván. */
const TOASTS = [
  { id: 'k100',  text: 'Hạ 100 quái',  test: () => G.kills >= 100 },
  { id: 'k500',  text: 'Hạ 500 quái',  test: () => G.kills >= 500 },
  { id: 'k1000', text: 'Hạ 1000 quái', test: () => G.kills >= 1000 },
  ...[1, 3, 5, 8, 10, 13].map(m => ({ id: 'm' + m, text: `Sống sót ${m} phút`, test: () => G.t >= m * 60 })),
  ...['bolt', 'orbit', 'lightning', 'knife', 'aura', 'nova'].map(id => ({ id: 'l8' + id, icon: id, text: () => `${WEAPONS[id].name} đạt cấp 8`, test: () => G.player.levels[id] >= 8 })),
  { id: 'evo',   text: 'Tiến hoá đầu tiên của ván', test: () => G.evolved },
  { id: 'best',  text: 'Kỷ lục mới!', gold: true, test: () => bestPassed() },
];

/* ---------- V5 Phase 9: nhiệm vụ + sổ tay ----------
   Nhiệm vụ: luôn có CFG.missions.active cái đang làm (lưu trong vs_meta). Mỗi cái tính trong MỘT ván: prog(r) trên kết quả ván
   (r = missionRun() trong ui.js: kby = số quái hạ theo vũ khí, noHit = chuỗi giây dài nhất không trúng đòn, …), xong khi prog ≥ goal.
   Xong thì trả `reward` linh hồn một lần, lưu ngay, và thay bằng nhiệm vụ khác (nhiệm vụ mới chỉ tính từ ván sau). */
CFG.missions = { active: 3 };
const MISSIONS = [
  { id: 'bolt400',      text: 'Hạ 400 quái bằng Huyết Tiễn',        goal: 400, reward: 10, prog: r => r.kby.bolt || 0 },
  { id: 'lightning300', text: 'Hạ 300 quái bằng Lôi Phạt',          goal: 300, reward: 20, prog: r => r.kby.lightning || 0 },
  { id: 'knife250',     text: 'Hạ 250 quái bằng Dao Bạc',           goal: 250, reward: 15, prog: r => r.kby.knife || 0 },
  { id: 'aura250',      text: 'Hạ 250 quái bằng Hào Quang Độc',     goal: 250, reward: 15, prog: r => r.kby.aura || 0 },
  { id: 'orbit250',     text: 'Hạ 250 quái bằng Vòng Huyết Nguyệt', goal: 250, reward: 15, prog: r => r.kby.orbit || 0 },
  { id: 'nova200',      text: 'Hạ 200 quái bằng Sóng Xung Kích',    goal: 200, reward: 15, prog: r => r.kby.nova || 0 },
  { id: 'evo',          text: 'Tiến hoá một vũ khí',                goal: 1,   reward: 25, prog: r => r.evo ? 1 : 0 },
  { id: 'nohit60',      text: 'Không trúng đòn trong 60 giây liên tục', goal: 60, reward: 20, prog: r => Math.floor(r.noHit) },
  { id: 'chest3',       text: 'Mở 3 rương trong một ván',           goal: 3,   reward: 20, prog: r => r.chests },
  { id: 'combo100',     text: 'Đạt chuỗi hạ gục x100',              goal: 100, reward: 15, prog: r => r.comboMax },
  { id: 'elite3',       text: 'Hạ 3 quái tinh anh trong một ván',   goal: 3,   reward: 15, prog: r => r.elites },
  { id: 'items6',       text: 'Nhặt 6 vật phẩm trong một ván',      goal: 6,   reward: 10, prog: r => r.items },
  { id: 'boss2',        text: 'Hạ 2 boss trong một ván',            goal: 2,   reward: 25, prog: r => r.bosses },
  { id: 'lvl20',        text: 'Đạt cấp 20',                         goal: 20,  reward: 15, prog: r => r.level },
  { id: 'dash30',       text: 'Lướt né 30 lần trong một ván',       goal: 30,  reward: 10, prog: r => r.dashes },
];
// Sổ tay: các mục theo nhóm. Khoá trong vs_meta.book: vũ khí 'w:id', tiến hoá 'evo:id', quái/boss = mã quái, vật phẩm = mã vật phẩm.
const BOOK = [
  { title: 'Vũ khí',   keys: ['bolt', 'orbit', 'lightning', 'knife', 'aura', 'nova'].map(id => 'w:' + id) },
  { title: 'Tiến hoá', keys: ['bolt', 'orbit', 'lightning', 'knife', 'aura', 'nova'].map(id => 'evo:' + id) },
  { title: 'Quái',     keys: ['bat', 'slime', 'skeleton', 'ghost', 'golem', 'bomber', 'splitter', 'charger'] },
  { title: 'Boss',     keys: ['bossZombie', 'bossNecro', 'bossOgre', 'boss'] },
  { title: 'Vật phẩm', keys: ['potion', 'magnet', 'shield', 'speed', 'rage', 'bomb', 'freeze', 'xp2'] },
];
CFG.attract = { enemies: 7, drift: 0.05, range: 260 };   // menu: số quái lang thang, tốc độ lia camera, bán kính vùng lia (đơn vị thế giới)

const EVOLUTIONS = {
  bolt:      { passive: 'might', name: 'Huyết Vũ',     desc: '+2 tiễn, hồi chiêu -25%. Tiễn vỡ thành 2 mảnh khi trúng',   apply: w => { w.count += 2; w.cd *= 0.75; } },
  orbit:     { passive: 'area',  name: 'Nguyệt Thực',  desc: 'Thêm vòng ngoài 3 lưỡi xoay ngược, chém nhanh hơn',         apply: w => { w.hitCd = 0.36; } },
  lightning: { passive: 'haste', name: 'Thiên Lôi',    desc: 'Mỗi tia sét nảy sang 3 quái gần đó',                         apply: w => { w.cd *= 0.85; } },
  knife:     { passive: 'swift', name: 'Vạn Đao',      desc: 'Dao xuyên vô hạn và bay ngược về tay',                       apply: w => { w.pierce = 99; } },
  aura:      { passive: 'regen', name: 'Huyết Trường', desc: 'Vùng rộng và độc hơn; quái chết trong vùng hồi máu cho bạn', apply: w => { w.radius *= 1.25; w.dmg *= 1.5; } },
  nova:      { passive: 'armor', name: 'Địa Chấn',     desc: '3 sóng làm choáng quái; bị đánh thì tự phát một sóng',       apply: w => { w.count = 3; w.maxR *= 1.2; } },
};

/* ---------- V4 GĐ4: chơi lại nhiều lần ---------- */
// Linh hồn nhận khi kết thúc ván: floor(quái/25) + 30 mỗi boss + 100 nếu thắng (Ác mộng ×1.5)
CFG.souls = { perKills: 25, boss: 30, win: 100, countUp: 0.8 };
CFG.metaCost = [40, 80, 140, 220, 320];
CFG.nightmare = { hp: 1.5, dmg: 1.3, rate: 1.25, souls: 1.5 };
CFG.endless = { rate: 0.15, hp: 1.5 };       // đợt vô tận thứ n: mật độ ×(1+0.15n), máu quái ×1.5^n
// Nâng cấp vĩnh viễn (5 cấp mỗi loại), áp dụng trong newPlayer()
const META_UPGRADES = [
  { id: 'hp',   name: 'Sinh lực',   icon: 'vital',  glyph: '♥', desc: l => `+${8 * l} máu tối đa` },
  { id: 'dmg',  name: 'Sức mạnh',   icon: 'might',  glyph: '⚔', desc: l => `+${4 * l}% sát thương` },
  { id: 'spd',  name: 'Nhanh nhẹn', icon: 'swift',  glyph: '»', desc: l => `+${3 * l}% tốc độ chạy` },
  { id: 'mag',  name: 'Nam châm',   icon: 'magnet', glyph: '◎', desc: l => `+${10 * l}% tầm hút ngọc` },
  { id: 'xp',   name: 'Ham học',    icon: 'i_xp2',  glyph: '✦', desc: l => `+${5 * l}% kinh nghiệm` },
  { id: 'roll', name: 'Đổi vận',    icon: 'area',   glyph: '✧', desc: l => { const r = metaRoll(l); return [r.rerolls && `+${r.rerolls} lượt đổi thẻ`, `+${r.item * 5}% tỉ lệ rơi vật phẩm`].filter(Boolean).join(' · '); } },
];
// Đổi vận: cấp 2, 4 thêm lượt đổi thẻ; cấp 1, 3, 5 thêm 5% tỉ lệ rơi vật phẩm
const metaRoll = l => ({ rerolls: (l >= 2) + (l >= 4), item: (l >= 1) + (l >= 3) + (l >= 5) });
// Mở khoá vũ khí khởi đầu (kiểm ở endRun; r = { wave, kills, bosses, evo }).
// prog(r) = [hiện tại, mục tiêu] trong ván vừa chơi — khối "Sắp đạt được" ở màn kết thúc (V5 Phase 8)
const UNLOCKS = {
  bolt: null,
  knife:     { text: 'Đến đợt 2',                  ok: r => r.wave >= 2,     prog: r => [Math.min(r.wave, 2), 2] },
  aura:      { text: 'Hạ 500 quái trong một ván',  ok: r => r.kills >= 500,  prog: r => [Math.min(r.kills, 500), 500] },
  orbit:     { text: 'Hạ Vua Thây Ma',             ok: r => r.bosses >= 1,   prog: r => [Math.min(r.bosses, 1), 1] },
  lightning: { text: 'Hạ Đại Pháp Sư Tử Linh',     ok: r => r.bosses >= 2,   prog: r => [Math.min(r.bosses, 2), 2] },
  nova:      { text: 'Tiến hoá một vũ khí bất kỳ', ok: r => r.evo,           prog: r => [r.evo ? 1 : 0, 1] },
};
/* Màn kết thúc (V5 Phase 8): bảng hiện sau delay giây; khoá phím `lock` giây sau khi hiện (phím đang giữ / lướt không bấm nhầm);
   các phần hiện lần lượt mỗi `step` giây (bấm phím trong lúc này = hiện hết ngay). */
CFG.endPanel = { delayLose: 0.9, delayWin: 1.2, lock: 0.35, step: 0.2 };

// tot(l): tổng cộng dồn ở cấp l (thẻ bị động hiện "+15% → +30%")
const pctTot = (k, l, sign = '+') => sign + Math.round(Math.abs(k ** l - 1) * 100) + '%';
const PASSIVES = [
  { id: 'might',  name: 'Nộ Huyết',          icon: '⚔', max: 5, desc: () => '+15% sát thương',        apply: p => p.mDmg += 0.15,        tot: l => `+${15 * l}% sát thương` },
  { id: 'haste',  name: 'Đồng Hồ Cát',       icon: '⌛', max: 5, desc: () => '-8% hồi chiêu',          apply: p => p.mCd *= 0.92,         tot: l => pctTot(0.92, l, '-') + ' hồi chiêu' },
  { id: 'area',   name: 'Tinh Thể Hư Không', icon: '✧', max: 5, desc: () => '+10% vùng ảnh hưởng',    apply: p => p.mArea *= 1.1,        tot: l => pctTot(1.1, l) + ' vùng' },
  { id: 'swift',  name: 'Ủng Bóng Đêm',      icon: '»', max: 5, desc: () => '+10% tốc độ chạy',       apply: p => p.speed *= 1.1,        tot: l => pctTot(1.1, l) + ' tốc chạy' },
  { id: 'vital',  name: 'Tim Quỷ',           icon: '♥', max: 5, desc: () => '+20 máu tối đa, hồi 20', apply: p => { p.maxHp += 20; p.hp = Math.min(p.maxHp, p.hp + 20); }, tot: l => `+${20 * l} máu` },
  { id: 'magnet', name: 'Nam Châm Linh Hồn', icon: '◎', max: 5, desc: () => '+35% bán kính hút ngọc', apply: p => p.magnet *= 1.35,     tot: l => pctTot(1.35, l) + ' tầm hút' },
  { id: 'armor',  name: 'Giáp Xương',        icon: '◆', max: 5, desc: () => '-1 sát thương nhận vào', apply: p => p.armor += 1,          tot: l => `-${l} sát thương nhận` },
  { id: 'regen',  name: 'Máu Bất Tử',        icon: '✚', max: 5, desc: () => '+0.4 máu mỗi giây',      apply: p => p.regen += 0.4,        tot: l => `+${(0.4 * l).toFixed(1)} máu/giây` },
];
/* Nhãn tiếng Việt cho dòng "trước → sau" trên thẻ vũ khí (V5 Phase 4). fmt: cách in giá trị; count dùng tên riêng theo vũ khí.
   Trường không có ở đây (timer, ang, pulse, life, r, range, lv…) không được in. */
const STAT_LABELS = {
  dmg: ['Sát thương', v => Math.round(v)], count: ['Số lượng', v => v], pierce: ['Xuyên', v => v >= 99 ? '∞' : v],
  cd: ['Hồi chiêu', v => v.toFixed(2) + 's'], speed: ['Tốc bay', v => Math.round(v)], radius: ['Bán kính', v => Math.round(v)],
  spin: ['Tốc xoay', v => v.toFixed(1)], hitCd: ['Nhịp chém', v => v.toFixed(2) + 's'], aoe: ['Vùng nổ', v => Math.round(v)],
  tick: ['Nhịp độc', v => v.toFixed(2) + 's'], slow: ['Làm chậm', v => Math.round(v * 100) + '%'], maxR: ['Bán kính sóng', v => Math.round(v)],
  kb: ['Lực đẩy', v => v.toFixed(1)],
};
const COUNT_NAMES = { bolt: 'Số tiễn', orbit: 'Số cầu', lightning: 'Số tia sét', knife: 'Số dao', nova: 'Số sóng' };
CFG.tierColors = ['#6d4a20', '#4dc3ff', '#c86bff', '#ffd166']; // viền ô vũ khí trên HUD theo bậc 1..4

const UPGRADES = [
  ...Object.entries(WEAPONS).map(([id, w]) => ({
    id, kind: 'weapon', name: w.name, icon: w.icon, max: w.levels.length + 1,
    desc: l => l === 1 ? w.desc : w.levels[l - 2].d,
    apply: (p, l) => { if (l === 1) { p.weapons[id] = newWeapon(id); G.stats.since[id] = G.t; bookAdd('w:' + id); } else w.levels[l - 2].f(p.weapons[id]); p.weapons[id].lv = l; },
  })),
  ...PASSIVES.map(x => ({ ...x, kind: 'passive' })),
];
const FALLBACK_UPGRADE = { id: 'heal', kind: 'item', name: 'Bình Máu', icon: '❤', max: Infinity, desc: () => 'Hồi 40 máu', apply: p => p.hp = Math.min(p.maxHp, p.hp + 40) };
