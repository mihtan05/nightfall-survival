'use strict';
/* =========================================================
   ICON GIAO DIỆN — thay ký tự Unicode/emoji (mỗi máy hiện một kiểu) bằng ảnh pixel 32×32.
   Nguồn: khung sprite trong atlas 0x72 nếu có, còn lại vẽ bằng code theo cùng phong cách.
   ICONS[key] = dataURL; iconEl(key) tạo <img>. Key: id nâng cấp, 'i_' + vật phẩm, 'ui_' + nút.
   ========================================================= */
const ICONS = {};
const ICON_SPEC = {
  // vũ khí & bị động (khớp id trong UPGRADES)
  bolt: ['atlas', 'weapon_arrow'], orbit: ['atlas', 'weapon_red_gem_sword'], lightning: ['draw', 'lightning'],
  knife: ['atlas', 'weapon_knife'], aura: ['atlas', 'flask_green'], nova: ['atlas', 'weapon_big_hammer'],
  might: ['atlas', 'weapon_golden_sword'], haste: ['draw', 'hourglass'], area: ['draw', 'crystal'], swift: ['draw', 'boot'],
  vital: ['atlas', 'ui_heart_full'], magnet: ['shape', 'magnet'], armor: ['draw', 'shield'], regen: ['draw', 'cross'],
  heal: ['atlas', 'flask_big_red'],
  // vật phẩm
  i_potion: ['atlas', 'flask_big_red'], i_magnet: ['shape', 'magnet'], i_shield: ['draw', 'shieldBlue'],
  i_speed: ['atlas', 'flask_big_green'], i_rage: ['atlas', 'flask_big_yellow'], i_bomb: ['atlas', 'bomb_f0'],
  i_freeze: ['shape', 'freeze'], i_xp2: ['shape', 'xp2'],
  // nút giao diện
  ui_pause: ['draw', 'pause'], ui_sound: ['draw', 'sound'], ui_mute: ['draw', 'mute'], ui_fs: ['draw', 'fullscreen'],
  ui_kill: ['atlas', 'skull'],
};

// Hình vẽ code (khung 32×32). Viền tối 1 nét để đồng bộ với sprite có viền.
function poly32(g, pts, fill, stroke = '#120d1c') {
  g.beginPath(); g.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
  g.closePath(); g.fillStyle = fill; g.fill(); g.lineWidth = 2; g.strokeStyle = stroke; g.stroke();
}
const ICON_DRAW = {
  lightning: g => poly32(g, [18, 2, 7, 18, 15, 18, 12, 30, 25, 12, 17, 12, 21, 2], '#ffd23d'),
  hourglass: g => {
    g.fillStyle = '#8a5a2a'; g.fillRect(7, 3, 18, 3); g.fillRect(7, 26, 18, 3);
    poly32(g, [9, 6, 23, 6, 16, 16], '#e8d9a8'); poly32(g, [16, 16, 23, 26, 9, 26], '#e8d9a8');
    g.fillStyle = '#d9a441'; g.fillRect(12, 21, 8, 4);
  },
  crystal: g => { poly32(g, [16, 2, 26, 13, 16, 30, 6, 13], '#b07cff'); g.fillStyle = '#e6d4ff'; g.fillRect(12, 9, 3, 6); },
  boot: g => {
    poly32(g, [10, 4, 19, 4, 19, 20, 28, 22, 28, 28, 8, 28, 8, 20], '#4fbf8a');
    g.fillStyle = '#e6fff1'; poly32(g, [19, 8, 29, 4, 26, 11, 19, 12], '#e6fff1');
  },
  shield: g => poly32(g, [16, 3, 27, 7, 26, 18, 16, 29, 6, 18, 5, 7], '#a9a9bc'),
  shieldBlue: g => { poly32(g, [16, 3, 27, 7, 26, 18, 16, 29, 6, 18, 5, 7], '#4da6ff'); g.fillStyle = '#bfe6ff'; g.fillRect(11, 9, 3, 9); },
  cross: g => poly32(g, [12, 4, 20, 4, 20, 12, 28, 12, 28, 20, 20, 20, 20, 28, 12, 28, 12, 20, 4, 20, 4, 12, 12, 12], '#4fdc6a'),
  pause: g => { g.fillStyle = '#ece6ff'; g.fillRect(9, 7, 5, 18); g.fillRect(18, 7, 5, 18); },
  sound: g => {
    poly32(g, [5, 12, 11, 12, 18, 6, 18, 26, 11, 20, 5, 20], '#ece6ff', '#ece6ff');
    g.strokeStyle = '#ece6ff'; g.lineWidth = 2.5;
    g.beginPath(); g.arc(18, 16, 6, -0.9, 0.9); g.stroke(); g.beginPath(); g.arc(18, 16, 11, -0.9, 0.9); g.stroke();
  },
  mute: g => {
    poly32(g, [4, 12, 10, 12, 17, 6, 17, 26, 10, 20, 4, 20], '#9c90b8', '#9c90b8');
    g.strokeStyle = '#ff5c7a'; g.lineWidth = 3; g.beginPath(); g.moveTo(21, 11); g.lineTo(29, 21); g.moveTo(29, 11); g.lineTo(21, 21); g.stroke();
  },
  fullscreen: g => {
    g.strokeStyle = '#ece6ff'; g.lineWidth = 3; g.beginPath();
    g.moveTo(5, 12); g.lineTo(5, 5); g.lineTo(12, 5); g.moveTo(20, 5); g.lineTo(27, 5); g.lineTo(27, 12);
    g.moveTo(27, 20); g.lineTo(27, 27); g.lineTo(20, 27); g.moveTo(12, 27); g.lineTo(5, 27); g.lineTo(5, 20); g.stroke();
  },
};

// Icon lấy từ atlas: thêm viền sáng 1px (atlas không còn viền vẽ sẵn) — cùng cách dựng với viền sprite trong render.js
function outlineIcon(c) {
  const mk = () => { const o = document.createElement('canvas'); o.width = o.height = 32; return o; };
  const sil = whiten(c, CFG.outline.enemy), mask = mk(), out = mk(), mg = mask.getContext('2d'), og = out.getContext('2d');
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) mg.drawImage(sil, dx, dy);
  og.globalAlpha = CFG.outline.inner; og.drawImage(mask, 0, 0);
  og.globalAlpha = 1; og.drawImage(c, 0, 0);
  return out;
}
function buildIcons() {
  const img = ATLAS_SRC && Assets.imgs[ATLAS_SRC];
  for (const [key, [kind, name]] of Object.entries(ICON_SPEC)) {
    let c = document.createElement('canvas'); c.width = c.height = 32;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    if (kind === 'atlas') {
      const f = img && ATLAS.frames[name];
      if (!f) continue;
      const k = Math.max(1, Math.floor(28 / Math.max(f[2], f[3])));    // phóng theo số nguyên cho sắc nét
      const w = f[2] * k, h = f[3] * k;
      g.drawImage(img, f[0], f[1], f[2], f[3], Math.round((32 - w) / 2), Math.round((32 - h) / 2), w, h);
      c = outlineIcon(c);
    } else if (kind === 'shape') {                                    // dùng lại hình vẽ vật phẩm trong game
      g.translate(16, 16); g.scale(1.9, 1.9);
      SHAPES[name](g, { x: 0, y: 0, anim: 0, flash: 0 });
    } else ICON_DRAW[name](g);
    try { ICONS[key] = c.toDataURL(); } catch { /* file:// trên Chrome: ảnh atlas làm "bẩn" canvas → không xuất được, dùng ký tự dự phòng */ }
  }
  // gắn icon cho các phần tử tĩnh có data-icon
  for (const el of document.querySelectorAll('[data-icon]')) setIcon(el, el.dataset.icon);
}
function iconEl(key, fallback = '') {
  if (ICONS[key]) { const i = new Image(); i.src = ICONS[key]; i.alt = ''; i.draggable = false; return i; }
  const s = document.createElement('span'); s.textContent = fallback; return s;
}
function setIcon(el, key, fallback) { el.replaceChildren(iconEl(key, fallback)); }
