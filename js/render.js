'use strict';
/* =========================================================
   CANVAS
   ========================================================= */
const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');
/* Hai hệ toạ độ:
   - Màn hình: W×H (px CSS), dùng cho HUD và viền tối.
   - Thế giới: mọi vị trí/tốc độ/kích thước trong game. 1 đơn vị thế giới = ZOOM px thiết bị,
     ZOOM là số NGUYÊN để sprite pixel-art không bị nhoè. ZOOM chọn sao cho chiều ngắn của
     màn hình thấy khoảng CFG.view.height đơn vị (1080p → ZOOM 3 → thấy 360; 768p → ZOOM 2 → thấy 384).
   - VW×VH: vùng thế giới nhìn thấy; spawn, vòng vây, sét... tính theo VW×VH chứ không theo px. */
/* Canvas không cần đủ độ phân giải thiết bị: với pixel-art, vẽ ở độ phân giải thấp hơn theo
   TỈ LỆ NGUYÊN rồi để CSS phóng lên (image-rendering: pixelated) vẫn sắc nét mà số điểm ảnh
   phải tô giảm 4–9 lần. Ví dụ màn 4K: thiết bị cần 6 px/đơn vị → canvas vẽ 3 px/đơn vị, CSS ×2.
   ZOOM = số px CANVAS cho 1 đơn vị thế giới; SCREEN = số px canvas cho 1 px CSS. */
let W = 0, H = 0, DPR = 1, SCREEN = 1;
let ZOOM = 1, VW = 0, VH = 0;
let sheetGen = 0; // tăng lên là mọi tấm sprite đã dựng (xem sheetFor) bị coi là cũ
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = innerWidth; H = innerHeight;
  const devW = W * DPR, devH = H * DPR;
  const devZoom = Math.max(1, Math.round(Math.min(devW, devH) / CFG.view.height));
  let z = devZoom;                                   // ước số lớn nhất của devZoom mà ≤ 3
  while (z > 3 && z % 2 === 0) z /= 2;
  if (z > 3 && z % 3 === 0) z = 3;
  if (z !== ZOOM) sheetGen++;
  ZOOM = z;
  VW = devW / devZoom; VH = devH / devZoom;
  cv.width = Math.round(VW * ZOOM); cv.height = Math.round(VH * ZOOM);
  SCREEN = cv.width / W;
  ctx.imageSmoothingEnabled = false;
}
addEventListener('resize', () => { resize(); vigWave = -1; });
resize();
const snapPx = v => Math.round(v * ZOOM) / ZOOM; // làm tròn về đúng 1 px thiết bị
const REDUCED_MOTION = matchMedia('(prefers-reduced-motion: reduce)').matches;
function calm() { return REDUCED_MOTION || SETTINGS.noFlash; } // tắt co giãn trúng đòn khi bật giảm loé hoặc reduced-motion


/* =========================================================
   ASSETS — sprite sheet + animation (fallback về hình vẽ code nếu thiếu)
   ========================================================= */
// Bản một màu của một ảnh (giữ kênh alpha): trắng để nháy khi trúng đòn, màu khác để làm viền.
function whiten(img, color = '#fff') {
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0); g.globalCompositeOperation = 'source-in';
  g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
  return c;
}
const Assets = {
  imgs: {},   // src -> Image đã nạp xong
  load() {
    const all = [...new Set(Object.values(ASSETS).map(a => a.src))];
    const srcs = all.filter(s => !s.includes('#tint=')), tinted = all.filter(s => s.includes('#tint='));
    if (FX_SRC) srcs.push(FX_SRC);
    return this.loadSrcs(srcs).then(() => { for (const s of tinted) this.makeTint(s); });
  },
  // Bản nhuộm màu của atlas: phủ màu lên phần có hình (giữ kênh alpha)
  makeTint(src) {
    const [base, spec] = src.split('#tint='), [color, a] = spec.split(','), img = this.imgs[base];
    if (!img) return;
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    g.globalCompositeOperation = 'source-atop'; g.globalAlpha = +a; g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
    this.imgs[src] = c;
  },
  loadSrcs(srcs) {
    return Promise.all(srcs.map(src => new Promise(res => {
      const img = new Image();
      img.onload = () => { this.imgs[src] = img; res(); };
      img.onerror = () => { console.warn('Thiếu ảnh, dùng hình vẽ code:', src); res(); };
      img.src = src;
    })));
  },
  // Đăng ký sprite lúc chạy (dùng khi test hoặc khi ảnh được tạo bằng code)
  register(kind, img, meta) { ASSETS[kind] = { ...meta, src: meta.src || ('mem:' + kind) }; this.imgs[ASSETS[kind].src] = img; sheetGen++; },
  get(kind) {
    const meta = ASSETS[kind]; if (!meta) return null;
    const img = this.imgs[meta.src]; return img ? { img, meta } : null;
  },
};

// Chọn animation theo trạng thái; thiếu anim nào thì lùi về 'run' → 'idle' → anim đầu tiên.
function pickAnim(e, kind, anims) {
  let name = 'idle';
  if (kind === 'player') name = e.hurtT > 0.15 ? 'hit' : e.moving ? 'run' : 'idle';
  else if (ENEMIES[kind]) name = e.dying ? 'die' : e.flash > 0 ? 'hit' : 'run';
  return anims[name] || anims.run || anims.idle || anims[Object.keys(anims)[0]];
}
function animTime(e, kind) { return kind === 'player' ? G.t : (e.anim || 0); }

/* =========================================================
   BỘ ĐỆM SPRITE + VIỀN
   Atlas không có viền. Mỗi (loại vật, vai viền, hệ số phóng riêng) được dựng MỘT LẦN thành một tấm
   ảnh đã phóng sẵn về đúng cỡ px canvas, rồi thêm viền ở độ phân giải đó — nên viền dày như nhau
   (CFG.outline.px) dù sprite phóng 1× hay 2.4×, và mỗi khung hình chỉ còn 1 lệnh drawImage 1:1.
   Chỉ dùng drawImage + globalCompositeOperation (không getImageData) để mở bằng file:// vẫn chạy.
   Dựng lại khi ZOOM đổi, khi CFG.outline đổi (__vs.outline) hoặc khi đăng ký sprite mới: sheetGen++.
   ========================================================= */
// Vai viền: người chơi / quái thường / tinh anh / boss nổi giận / vật phẩm, đạn, lưỡi kiếm (mặc định không viền)
function outlineRole(e, kind) {
  if (kind === 'player') return 'player';
  if (!ENEMIES[kind]) return 'item';
  return e.elite ? 'elite' : e.boss && e.raged ? 'rage' : 'enemy';
}
// Cỡ 1 điểm ảnh sprite tính bằng px canvas; làm tròn về số nguyên (điểm ảnh đều nhau) nếu không lệch quá CFG.outline.snap
function texelPx(s) {
  const t = s * ZOOM, r = Math.max(1, Math.round(t)), snap = CFG.outline.snap;
  return snap && Math.abs(r - t) <= snap * t ? r : t;
}
function buildSheet(a, role, sc) {
  const m = a.meta, O = CFG.outline, color = O[role], px = color ? Math.max(0, Math.round(O.px)) : 0;
  const t = texelPx((m.scale || 1) * sc), pad = px + 2;   // lề quanh mỗi khung: đủ chỗ cho 2 vòng viền
  const cells = new Map(); let SW = 0, SH = 0;
  for (const an of Object.values(m.anims)) for (const fr of an.frames) {
    if (cells.has(fr)) continue;
    const w = Math.max(1, Math.round(fr[2] * t)), h = Math.max(1, Math.round(fr[3] * t));
    const ax = m.anchor ? m.anchor[0] : fr[2] / 2, ay = m.anchor ? m.anchor[1] : fr[3] / 2;
    const q = { x: SW, w: w + pad * 2, h: h + pad * 2, bw: w, bh: h, ax: pad + Math.round(ax * t), ay: pad + Math.round(ay * t), fy: 0 };
    q.fy = pad + h - q.ay;   // khoảng cách từ điểm neo xuống mép dưới thân (px canvas): để giữ chân đứng yên khi nhún
    cells.set(fr, q);
    SW += w + pad * 2; SH = Math.max(SH, h + pad * 2);
  }
  const mk = () => { const c = document.createElement('canvas'); c.width = SW; c.height = SH; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; return [c, g]; };
  const [body, bg] = mk();
  for (const [fr, q] of cells) bg.drawImage(a.img, fr[0], fr[1], fr[2], fr[3], q.x + pad, pad, q.bw, q.bh);
  const sheet = { cv: body, white: whiten(body), cells };
  if (!px) return sheet;
  // Viền: bóng một màu của thân, dồn theo hình thoi (4 hướng → góc bo tròn) thành mặt nạ ĐẶC,
  // rồi mới phủ một lần với độ đậm mong muốn — đóng dấu bán trong suốt trực tiếp sẽ loang chỗ đậm chỗ nhạt.
  const [out, og] = mk(), [mask, mg] = mk(), sil = whiten(body, color);
  const ring = (r, alpha) => {
    mg.clearRect(0, 0, SW, SH);
    for (let dy = -r; dy <= r; dy++) for (let dx = Math.abs(dy) - r; dx <= r - Math.abs(dy); dx++) mg.drawImage(sil, dx, dy);
    og.globalAlpha = 1; og.globalCompositeOperation = 'destination-out'; og.drawImage(mask, 0, 0);
    og.globalAlpha = alpha; og.globalCompositeOperation = 'source-over'; og.drawImage(mask, 0, 0);
  };
  if (O.outer > 0) ring(px + 1, O.outer);   // vòng mờ ngoài cùng: mép viền nhạt dần thay vì cắt cụt
  ring(px, O.inner);
  og.globalAlpha = 1; og.drawImage(body, 0, 0);
  sheet.cv = out;
  return sheet;
}
// Tấm sprite của một loại vật (a = Assets.get(kind)); nhớ ngay trên meta của loại đó để khỏi ghép chuỗi mỗi lần vẽ
function sheetFor(a, role, sc) {
  const m = a.meta;
  if (m.shGen !== sheetGen) { m.shGen = sheetGen; m.sh = {}; }
  const key = sc === 1 ? role : role + sc;
  return m.sh[key] || (m.sh[key] = buildSheet(a, role, sc));
}


/* =========================================================
   VẼ  — draw(entity, kind): sprite nếu có, không thì hình vẽ code
   ========================================================= */
function circle(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
function ellipse(c, x, y, rx, ry) { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fill(); }
function poly(c, pts) { c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath(); c.fill(); }
const col = (e, normal) => e.flash > 0 ? '#ffffff' : normal;

const SHAPES = {
  player(c, e) {
    const bob = e.moving ? Math.sin(e.anim) * 1.5 : 0;
    if (e.iframe > 0 && Math.floor(G.t * 20) % 2) c.globalAlpha = 0.45;
    c.fillStyle = '#0007'; ellipse(c, e.x, e.y + 12, 11, 4);
    c.fillStyle = '#4a1f70'; poly(c, [e.x - 11, e.y + 11, e.x + 11, e.y + 11, e.x + 7, e.y - 5 + bob, e.x - 7, e.y - 5 + bob]);
    c.fillStyle = '#7b3fb0'; circle(c, e.x, e.y - 8 + bob, 8.5);
    c.fillStyle = '#f1d9c4'; circle(c, e.x + e.face * 2, e.y - 7 + bob, 5);
    c.fillStyle = '#d0103a';
    c.fillRect(e.x + e.face * 2 - 3, e.y - 8 + bob, 2, 2); c.fillRect(e.x + e.face * 2 + 1, e.y - 8 + bob, 2, 2);
    c.globalAlpha = 1;
  },
  bat(c, e) {
    const flap = Math.sin(e.anim * 16) * 6, y = e.y + Math.sin(e.anim * 4) * 2;
    c.fillStyle = '#0006'; ellipse(c, e.x, e.y + 12, 6, 2);
    c.fillStyle = col(e, '#2e2140');
    poly(c, [e.x - 3, y, e.x - 13, y - 3 - flap, e.x - 9, y + 3]);
    poly(c, [e.x + 3, y, e.x + 13, y - 3 - flap, e.x + 9, y + 3]);
    c.fillStyle = col(e, '#45325e'); circle(c, e.x, y, 5.5);
    c.fillStyle = '#ff3355'; c.fillRect(e.x - 3, y - 2, 2, 2); c.fillRect(e.x + 1, y - 2, 2, 2);
  },
  slime(c, e) {
    const s = Math.sin(e.anim * 6) * 0.12;
    c.fillStyle = '#0006'; ellipse(c, e.x, e.y + 10, 12, 3);
    c.fillStyle = col(e, '#3fae4c'); ellipse(c, e.x, e.y + 2 - s * 6, 12 * (1 + s), 10 * (1 - s));
    c.fillStyle = col(e, '#7be08a'); ellipse(c, e.x - 4, e.y - 3 - s * 6, 3, 2);
    c.fillStyle = '#10301a'; c.fillRect(e.x - 5 + e.face, e.y, 3, 3); c.fillRect(e.x + 2 + e.face, e.y, 3, 3);
  },
  skeleton(c, e) {
    const step = Math.sin(e.anim * 9) * 3;
    c.fillStyle = '#0006'; ellipse(c, e.x, e.y + 13, 8, 3);
    c.fillStyle = col(e, '#cfc7b0');
    c.fillRect(e.x - 4, e.y + 5, 2, 7 + step * 0.5); c.fillRect(e.x + 2, e.y + 5, 2, 7 - step * 0.5);
    c.fillRect(e.x - 5, e.y - 2, 10, 2); c.fillRect(e.x - 4, e.y + 1, 8, 2); c.fillRect(e.x - 1, e.y - 3, 2, 9);
    c.fillStyle = col(e, '#ece6d4'); circle(c, e.x, e.y - 8, 7);
    c.fillStyle = '#1a1020'; c.fillRect(e.x - 4 + e.face, e.y - 10, 3, 3); c.fillRect(e.x + 1 + e.face, e.y - 10, 3, 3);
    c.fillRect(e.x - 2 + e.face, e.y - 5, 4, 1);
  },
  ghost(c, e) {
    const y = e.y + Math.sin(e.anim * 3) * 3, w = Math.sin(e.anim * 8) * 1.5;
    c.fillStyle = '#0005'; ellipse(c, e.x, e.y + 14, 7, 2);
    c.globalAlpha = 0.85;
    c.fillStyle = col(e, '#cfe9ff');
    c.beginPath(); c.arc(e.x, y - 3, 10, Math.PI, 0);
    c.lineTo(e.x + 10, y + 8);
    for (let k = 0; k < 4; k++) c.lineTo(e.x + 10 - (k + 0.5) * 5, y + (k % 2 ? 9 + w : 5 - w));
    c.lineTo(e.x - 10, y + 8); c.closePath(); c.fill();
    c.globalAlpha = 1;
    c.fillStyle = '#1b2440'; ellipse(c, e.x - 4 + e.face * 2, y - 3, 2, 3); ellipse(c, e.x + 3 + e.face * 2, y - 3, 2, 3);
    c.fillRect(e.x - 2 + e.face * 2, y + 2, 3, 2);
  },
  golem(c, e) {
    const step = Math.sin(e.anim * 5) * 2;
    c.fillStyle = '#0007'; ellipse(c, e.x, e.y + 19, 18, 5);
    c.fillStyle = col(e, '#4e443a');
    c.fillRect(e.x - 12, e.y + 8, 8, 10 + step); c.fillRect(e.x + 4, e.y + 8, 8, 10 - step);
    c.fillRect(e.x - 22, e.y - 10 - step, 8, 18); c.fillRect(e.x + 14, e.y - 10 + step, 8, 18);
    c.fillStyle = col(e, '#6d6052'); c.fillRect(e.x - 16, e.y - 14, 32, 26);
    c.fillStyle = col(e, '#7d705f'); c.fillRect(e.x - 9, e.y - 25, 18, 12);
    c.fillStyle = '#3a322a'; c.fillRect(e.x - 8, e.y - 6, 10, 2); c.fillRect(e.x + 2, e.y - 6, 2, 8); c.fillRect(e.x - 12, e.y + 4, 6, 2);
    c.fillStyle = '#ffb030'; c.fillRect(e.x - 6 + e.face * 2, e.y - 21, 4, 3); c.fillRect(e.x + 2 + e.face * 2, e.y - 21, 4, 3);
  },
  boss(c, e) {
    const t = e.anim, bob = Math.sin(t * 3) * 2;
    c.fillStyle = '#0008'; ellipse(c, e.x, e.y + 30, 28, 7);
    c.fillStyle = '#ff204015'; circle(c, e.x, e.y, 44 + Math.sin(t * 4) * 3);
    c.fillStyle = col(e, '#2a0f1e');
    poly(c, [e.x - 30, e.y + 28 + Math.sin(t * 5) * 3, e.x + 30, e.y + 28 + Math.sin(t * 5 + 1) * 3, e.x + 15, e.y - 14 + bob, e.x - 15, e.y - 14 + bob]);
    c.fillStyle = col(e, '#5a1a2e'); c.fillRect(e.x - 12, e.y - 12 + bob, 24, 30);
    c.fillStyle = col(e, '#8a2a40'); c.fillRect(e.x - 2, e.y - 10 + bob, 4, 26);
    c.fillStyle = col(e, '#1a0a10');
    poly(c, [e.x - 9, e.y - 24 + bob, e.x - 20, e.y - 40 + bob, e.x - 5, e.y - 28 + bob]);
    poly(c, [e.x + 9, e.y - 24 + bob, e.x + 20, e.y - 40 + bob, e.x + 5, e.y - 28 + bob]);
    c.fillStyle = col(e, '#d8c8c8'); circle(c, e.x, e.y - 18 + bob, 11);
    c.fillStyle = '#ff2040'; c.fillRect(e.x - 6 + e.face * 2, e.y - 21 + bob, 4, 3); c.fillRect(e.x + 2 + e.face * 2, e.y - 21 + bob, 4, 3);
    c.fillStyle = '#1a0a10'; c.fillRect(e.x - 4 + e.face * 2, e.y - 13 + bob, 8, 2);
  },
  /* Đạn của người chơi: vệt dài, KHÔNG có viền tối (đạn quái là quả cầu có viền tối).
     Hình theo bậc (WEAPON_LOOK.bolt): bậc 1 vệt hồng mảnh; bậc 2 vệt dài hơn + quầng sáng + vài tia lửa phía sau;
     bậc 3 lõi trắng rực + bóng mờ phía sau; tiến hoá: đỏ thẫm. Trong một bậc, mỗi cấp vệt dài thêm `grow`. */
  bolt(c, b) {
    const L = WEAPON_LOOK.bolt.tiers[(b.tier || 1) - 1], sp = Math.hypot(b.vx, b.vy) || 1, ux = b.vx / sp, uy = b.vy / sp;
    const len = L.trail + (b.lv || 0) * L.grow, wd = 3 * L.size, cl = L.after ? len * 0.45 : 3;
    const seg = (a0, a1) => { c.beginPath(); c.moveTo(b.x - ux * a0, b.y - uy * a0); c.lineTo(b.x - ux * a1, b.y - uy * a1); c.stroke(); };
    c.lineCap = 'round';
    if (L.after) { c.globalAlpha = 0.3; c.strokeStyle = L.col; c.lineWidth = wd * 0.7; seg(len * 1.1, len * 1.8); c.globalAlpha = 1; } // bóng mờ phía sau
    c.strokeStyle = L.col; c.lineWidth = wd; seg(-3, len);
    c.strokeStyle = L.col2; c.lineWidth = wd * 0.5; seg(-3, cl);
    if (L.sparks) { // tia lửa rơi lại sau đuôi (vị trí giả ngẫu nhiên theo thời gian sống, không tạo hạt)
      c.fillStyle = L.col2; c.globalAlpha = 0.85;
      for (let k = 0; k < L.sparks; k++) {
        const d = len * (0.7 + 0.35 * k), j = Math.sin(b.life * 37 + k * 2.1) * (2 + k);
        c.fillRect(b.x - ux * d - uy * j - 0.6, b.y - uy * d + ux * j - 0.6, 1.2, 1.2);
      }
      c.globalAlpha = 1;
    }
  },
  knife(c, b) {
    c.save(); c.translate(b.x, b.y); c.rotate(Math.atan2(b.vy, b.vx));
    c.fillStyle = '#ffffff30'; c.fillRect(-22, -1, 14, 2);
    c.fillStyle = '#dfe6f0'; poly(c, [-6, -2, 6, -2, 10, 0, 6, 2, -6, 2]);
    c.fillStyle = '#8a5a2a'; c.fillRect(-11, -2, 5, 4);
    c.restore();
  },
  // Đạn quái: quả cầu có viền tối + lõi trắng nhấp nháy
  shot(c, s) {
    c.fillStyle = '#b04dff40'; circle(c, s.x, s.y, s.r + 5 + Math.sin(s.anim * 20) * 1.5);
    c.fillStyle = '#1a0612'; circle(c, s.x, s.y, s.r + 2.5);
    c.fillStyle = '#c86bff'; circle(c, s.x, s.y, s.r);
    c.fillStyle = '#ffffff'; circle(c, s.x, s.y, s.r * (0.5 + 0.1 * Math.sin(s.anim * TAU * 10)));
  },
  xp(c, g) {
    const y = g.y + Math.sin(g.anim * 4) * 1.5, s = g.v >= 20 ? 8 : g.v >= 5 ? 6.5 : 5;
    c.fillStyle = g.v >= 20 ? '#ffd166' : g.v >= 5 ? '#ff5c7a' : g.v >= 2 ? '#5cff9d' : '#4dc3ff';
    poly(c, [g.x, y - s, g.x + s * 0.7, y, g.x, y + s, g.x - s * 0.7, y]);
    c.fillStyle = '#ffffffaa'; c.fillRect(g.x - 1, y - s + 2, 2, 2);
  },
  heart(c, g) {
    const y = g.y + Math.sin(g.anim * 4) * 1.5, s = 1 + Math.sin(g.anim * 6) * 0.08;
    c.fillStyle = '#ff3b5c30'; circle(c, g.x, y, 12);
    c.fillStyle = '#ff3b5c';
    circle(c, g.x - 3 * s, y - 2, 3.6 * s); circle(c, g.x + 3 * s, y - 2, 3.6 * s);
    poly(c, [g.x - 6.6 * s, y - 1, g.x + 6.6 * s, y - 1, g.x, y + 7 * s]);
  },
  chest(c, g) {
    const y = g.y + Math.sin(g.anim * 3) * 2;
    c.fillStyle = '#ffd16630'; circle(c, g.x, y, 20 + Math.sin(g.anim * 5) * 3);
    c.fillStyle = '#0007'; ellipse(c, g.x, g.y + 12, 12, 3);
    c.fillStyle = '#7a4a1e'; c.fillRect(g.x - 11, y - 5, 22, 14);
    c.fillStyle = '#9a5e26'; c.fillRect(g.x - 12, y - 11, 24, 7);
    c.fillStyle = '#ffd166'; c.fillRect(g.x - 12, y - 5, 24, 2); c.fillRect(g.x - 2, y - 9, 4, 8);
  },
  crate(c, e) {
    c.fillStyle = '#0006'; ellipse(c, e.x, e.y + 11, 10, 3);
    c.fillStyle = col(e, '#8a5a2a'); c.fillRect(e.x - 9, e.y - 12, 18, 22);
    c.fillStyle = col(e, '#5e3a18'); c.fillRect(e.x - 9, e.y - 2, 18, 2); c.fillRect(e.x - 9, e.y - 12, 2, 22); c.fillRect(e.x + 7, e.y - 12, 2, 22);
  },
  // vật phẩm không có sprite trong gói 0x72 → vẽ bằng code (cũng là bản dự phòng cho bình/bom)
  magnet(c, g) {
    const y = g.y + Math.sin(g.anim * 4) * 1.5;
    c.strokeStyle = '#ff4d4d'; c.lineWidth = 4; c.lineCap = 'butt';
    c.beginPath(); c.arc(g.x, y - 1, 6, Math.PI, 0, true); c.stroke();
    c.fillStyle = '#e8e8f0'; c.fillRect(g.x - 8, y - 2, 4, 4); c.fillRect(g.x + 4, y - 2, 4, 4);
  },
  freeze(c, g) {
    const y = g.y + Math.sin(g.anim * 4) * 1.5;
    c.fillStyle = '#bfe6ff'; circle(c, g.x, y, 7);
    c.fillStyle = '#1b2a40'; circle(c, g.x, y, 5.2);
    c.strokeStyle = '#bfe6ff'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(g.x, y); c.lineTo(g.x, y - 4); c.moveTo(g.x, y); c.lineTo(g.x + 3, y + 1); c.stroke();
    c.fillStyle = '#bfe6ff'; c.fillRect(g.x - 2, y - 10, 4, 3);
  },
  xp2(c, g) {
    const y = g.y + Math.sin(g.anim * 4) * 1.5;
    c.fillStyle = '#6a2a9a'; c.fillRect(g.x - 7, y - 6, 14, 12);
    c.fillStyle = '#f3e6c8'; c.fillRect(g.x - 5, y - 5, 10, 10);
    c.fillStyle = '#c86bff'; c.fillRect(g.x - 1, y - 6, 2, 12);
    c.fillStyle = '#6a2a9a'; c.fillRect(g.x - 4, y - 3, 3, 1); c.fillRect(g.x + 1, y - 3, 3, 1); c.fillRect(g.x - 4, y, 3, 1); c.fillRect(g.x + 1, y, 3, 1);
  },
  potion(c, g) { flaskShape(c, g, '#ff3b5c'); },
  shield(c, g) { flaskShape(c, g, '#4da6ff'); },
  speed(c, g)  { flaskShape(c, g, '#3fdc6a'); },
  rage(c, g)   { flaskShape(c, g, '#ffcc33'); },
  bomb(c, g) {
    const y = g.y + Math.sin(g.anim * 4) * 1.5;
    c.fillStyle = '#2a2a33'; circle(c, g.x, y + 1, 6.5);
    c.fillStyle = '#8a8a99'; c.fillRect(g.x - 2, y - 7, 4, 3);
    c.fillStyle = Math.floor(g.anim * 10) % 2 ? '#ffd166' : '#ff6b3d'; c.fillRect(g.x - 1, y - 10, 2, 3);
  },
  // boss mới khi thiếu sprite: phóng to hình của quái thường tương ứng
  bossZombie: scaledShape('skeleton', 2.3),
  bossNecro:  scaledShape('ghost', 2.0),
  bossOgre:   scaledShape('golem', 1.6),
  bomber:     scaledShape('bat', 1.3),
  splitter:   scaledShape('slime', 1.6),
  charger:    scaledShape('skeleton', 1.4),
};
function flaskShape(c, g, color) {
  const y = g.y + Math.sin(g.anim * 4) * 1.5;
  c.fillStyle = '#d8d8e8'; c.fillRect(g.x - 2, y - 8, 4, 4);
  c.fillStyle = color; circle(c, g.x, y + 1, 6);
  c.fillStyle = '#ffffff99'; c.fillRect(g.x - 3, y - 2, 2, 2);
}
function scaledShape(base, k) {
  return (c, e) => { c.save(); c.translate(e.x, e.y); c.scale(k, k); c.translate(-e.x, -e.y); SHAPES[base](c, e); c.restore(); };
}

/* Vẽ một vật: có sprite thì vẽ khung animation hiện tại (lật theo hướng mặt, điểm neo
   `anchor` của khung đặt đúng vào toạ độ vật), không thì vẽ hình code trong SHAPES.
   Vật có `meta.rotate` (dao, kiếm) thì xoay theo hướng bay thay vì lật. Đang nháy trúng đòn → vẽ bản trắng. */
function draw(c, e, kind) {
  const a = Assets.get(kind);
  if (a) {
    const m = a.meta, anim = pickAnim(e, kind, m.anims);
    const fr = anim.frames[Math.floor(animTime(e, kind) * (anim.fps || 8)) % anim.frames.length];
    const rot = m.rotate !== undefined ? Math.atan2(e.vy || 0, e.vx || 0) + m.rotate : null;
    const x = snapPx(e.x), flip = rot === null && e.face < 0, inv = 1 / ZOOM;
    let y = snapPx(e.y);
    const sh = sheetFor(a, outlineRole(e, kind), e.sc || 1), q = sh.cells.get(fr); // hệ số riêng (quái tinh anh) đã nằm sẵn trong tấm sprite
    // Trúng đòn: bẹp ngang một chút theo e.pop (không áp cho người chơi hoặc khi calm())
    let sx = 1, sy = 1;
    if (kind !== 'player' && e.pop > 0 && !calm()) {
      const C = CFG.juice, k = Math.min(1, e.pop / C.pop);
      sx = 1 + C.sx * k; sy = 1 - C.sy * k;
    }
    const ga = c.globalAlpha; let al = ga;
    if (e.anim !== undefined && ENEMIES[kind] && !e.boss && !e.prop && !e.frozen && !(e.stunT > 0)) {
      // Nhún khi đi: co giãn vài px canvas theo nhịp riêng của từng con (e.anim khởi đầu ngẫu nhiên), chân đứng yên
      const B = CFG.bob, dh = B.amp ? Math.round(Math.sin(e.anim * B.rate) * Math.max(1, Math.round(q.bh * B.amp))) : 0;
      if (dh) { sy *= (q.bh + dh) / q.bh; sx *= (q.bw - dh) / q.bw; }
    }
    if (sy !== 1) y += Math.round(q.fy * (1 - sy)) * inv; // neo chân đứng yên khi co giãn (nảy trúng đòn + nhún)
    if (e.inT > 0) { // vừa xuất hiện trong tầm nhìn: lớn dần + hiện dần
      const u = clamp(1 - e.inT / CFG.spawnIn, 0, 1), g = 0.6 + 0.4 * u * (2 - u);
      sx *= g; sy *= g; al *= u; c.globalAlpha = al;
    }
    drawFrame(c, sh.cv, q, x, y, rot, flip, sx, sy);
    // Trúng đòn: phủ lớp trắng mờ lên trên (không thay hẳn sprite) — boss bị đánh liên tục vẫn nhìn rõ hình
    if (e.flash > 0) {
      c.globalAlpha = al * (e.boss ? 0.4 : 0.75);
      drawFrame(c, sh.white, q, x, y, rot, flip, sx, sy);
    }
    if (c.globalAlpha !== ga) c.globalAlpha = ga;
    return;
  }
  SHAPES[kind](c, e);
}
// Vẽ ô `q` (= sh.cells.get(khung)) từ ảnh tấm sprite `img` (sh.cv hoặc sh.white), điểm neo đặt tại (x, y). Không xoay/lật/bẹp → 1 lệnh drawImage 1:1.
function drawFrame(c, img, q, x, y, rot, flip, sx = 1, sy = 1) {
  const inv = 1 / ZOOM;
  if (rot === null && !flip && sx === 1 && sy === 1) { c.drawImage(img, q.x, 0, q.w, q.h, x - q.ax * inv, y - q.ay * inv, q.w * inv, q.h * inv); return; }
  c.save(); c.translate(x, y);
  if (rot !== null) c.rotate(rot);
  c.scale(flip ? -sx : sx, sy);
  c.drawImage(img, q.x, 0, q.w, q.h, -q.ax * inv, -q.ay * inv, q.w * inv, q.h * inv);
  c.restore();
}
// Bóng đổ dưới chân cho vật vẽ bằng sprite (hình code đã tự vẽ bóng): một đốm mờ vẽ sẵn, mỗi vật 1 lệnh drawImage
let shadowCv = null;
function shadowImg() {
  if (!shadowCv) {
    shadowCv = document.createElement('canvas'); shadowCv.width = shadowCv.height = 64;
    const g = shadowCv.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(0,0,0,0.62)'); gr.addColorStop(0.5, 'rgba(0,0,0,0.42)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  }
  return shadowCv;
}
function drawShadow(e) {
  const rx = e.r * (e.boss ? 1.3 : 1.15), ry = rx * 0.38;
  if (e.inT > 0) ctx.globalAlpha = clamp(1 - e.inT / CFG.spawnIn, 0, 1); // đang hiện dần: bóng cũng hiện dần
  ctx.drawImage(shadowImg(), e.x - rx, e.y + e.r * 0.85 - ry, rx * 2, ry * 2);
  if (e.inT > 0) ctx.globalAlpha = 1;
}
// Thanh máu trong thế giới: khung tối 1 đơn vị + vệt nhạt chạy theo sau khi mất máu (k, lag: 0..1)
function drawBar(x, y, w, h, k, lag, color) {
  k = clamp(k, 0, 1); lag = clamp(lag, k, 1);
  ctx.fillStyle = '#0b0812'; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = '#2a2233'; ctx.fillRect(x, y, w, h);
  if (lag > k) { ctx.fillStyle = '#ffe3e8'; ctx.fillRect(x, y, w * lag, h); }
  ctx.fillStyle = color; ctx.fillRect(x, y, w * k, h);
}

/* Nền vẽ SẴN thành một tấm lớn rồi lặp theo camera: mỗi khung chỉ còn 4–6 lệnh drawImage.
   Mỗi đợt một tấm riêng (màu phủ + đồ trang trí theo WAVE_DEFS[i].ground); lúc nghỉ giữa 2 đợt
   tấm mới hiện dần đè lên tấm cũ. Chỉ giữ tối đa 2 tấm trong bộ nhớ. */
const GROUND_TILES = 32;
const groundCvs = {};
const waveIdx = () => Math.min(G.wave.i, WAVE_DEFS.length - 1);
function groundFor(i) {
  if (!groundCvs[i]) {
    for (const k in groundCvs) if (Math.abs(k - i) > 1) delete groundCvs[k];
    const img = ATLAS_SRC && Assets.imgs[ATLAS_SRC], gd = WAVE_DEFS[i].ground;
    groundCvs[i] = img ? buildGroundTiles(img, gd) : buildGround(gd);
  }
  return groundCvs[i];
}
// Đồ trang trí vẽ bằng code (x, y: góc trên trái, đơn vị = px của tấm nền)
const DECOR = {
  tomb(g, x, y) {
    g.fillStyle = '#0006'; g.fillRect(x - 2, y + 20, 22, 4);
    g.fillStyle = '#3b3648'; g.fillRect(x, y + 4, 18, 18); circle(g, x + 9, y + 6, 9);
    g.fillStyle = '#2a2635'; g.fillRect(x + 8, y + 6, 2, 9); g.fillRect(x + 5, y + 9, 8, 2);
  },
  grass(g, x, y) { g.fillStyle = '#2a3a2a'; g.fillRect(x, y + 4, 2, 5); g.fillRect(x + 3, y + 2, 2, 7); g.fillRect(x + 6, y + 5, 2, 4); },
  bones(g, x, y) { g.fillStyle = '#4a4458'; g.fillRect(x + 2, y + 9, 12, 2); g.fillRect(x + 1, y + 8, 2, 4); g.fillRect(x + 13, y + 8, 2, 4); g.fillRect(x + 6, y + 14, 8, 2); },
  rune(g, x, y) {
    g.strokeStyle = 'rgba(122,63,176,0.5)'; g.lineWidth = 1;
    g.beginPath(); g.arc(x + 14, y + 14, 12, 0, TAU); g.stroke(); g.beginPath(); g.arc(x + 14, y + 14, 8, 0, TAU); g.stroke();
    g.beginPath(); for (let k = 0; k < 5; k++) { const a = k * TAU * 2 / 5 - Math.PI / 2; g[k ? 'lineTo' : 'moveTo'](x + 14 + Math.cos(a) * 8, y + 14 + Math.sin(a) * 8); } g.closePath(); g.stroke();
  },
  crack(g, x, y) { g.strokeStyle = '#0a0604'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, y + 6); g.lineTo(x + 9, y + 11); g.lineTo(x + 15, y + 5); g.lineTo(x + 26, y + 12); g.stroke(); },
  rock(g, x, y) { g.fillStyle = '#4a4440'; g.fillRect(x + 2, y + 6, 6, 4); g.fillStyle = '#6a625a'; g.fillRect(x + 2, y + 6, 6, 1); g.fillStyle = '#3e3834'; g.fillRect(x + 10, y + 10, 5, 3); },
  blood(g, x, y) { g.fillStyle = 'rgba(90,6,16,0.5)'; ellipse(g, x + 12, y + 10, 10, 5); ellipse(g, x + 22, y + 14, 4, 2); },
  ember(g, x, y) { g.fillStyle = '#ff7a2a'; g.fillRect(x + 4, y + 4, 2, 2); g.fillStyle = '#ffb04a'; g.fillRect(x + 12, y + 9, 2, 2); },
};
// Rải đồ trang trí ~3% số ô; bỏ 2 hàng/cột cuối để không bị cắt ở mép lặp.
function scatterDecor(g, T, N, gd) {
  if (!gd || !gd.decor.length) return;
  for (let tx = 0; tx < N - 2; tx++) for (let ty = 0; ty < N - 2; ty++) {
    const h = hash(tx + 911, ty + 37);
    if ((h >>> 20) % 100 >= 3) continue;
    DECOR[gd.decor[(h >>> 4) % gd.decor.length]](g, tx * T + (h >>> 9) % 6, ty * T + (h >>> 13) % 6);
  }
}
function buildGround(gd) {
  const T = CFG.tile, S = T * GROUND_TILES;
  const cvs = document.createElement('canvas'); cvs.width = cvs.height = S;
  const g = cvs.getContext('2d');
  g.fillStyle = '#14111d'; g.fillRect(0, 0, S, S);
  for (let tx = 0; tx < GROUND_TILES; tx++) for (let ty = 0; ty < GROUND_TILES; ty++) {
    const h = hash(tx, ty), sx = tx * T, sy = ty * T, v = h % 5;
    if (v === 1) { g.fillStyle = '#17131f'; g.fillRect(sx, sy, T, T); }
    else if (v === 2) { g.fillStyle = '#120f19'; g.fillRect(sx, sy, T, T); }
    g.fillStyle = '#0d0b13'; g.fillRect(sx, sy, T, 1); g.fillRect(sx, sy, 1, T);
  }
  scatterDecor(g, T / 2, GROUND_TILES * 2, gd);
  if (gd) { g.fillStyle = gd.tint; g.fillRect(0, 0, S, S); }
  groundPatches(g, S);
  return cvs;
}
// Mảng sáng/tối lớn (vài trăm đơn vị) phủ lên tấm nền để mắt thôi đọc ra lưới ô; vẽ lặp qua mép nên tấm nền vẫn liền khi lát.
function groundPatches(g, S) {
  const blob = (x, y, r, rgb, a) => {
    for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {
      const cx = x + ox, cy = y + oy;
      if (cx + r < 0 || cx - r > S || cy + r < 0 || cy - r > S) continue;
      const gr = g.createRadialGradient(cx, cy, 0, cx, cy, r);
      gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(1, `rgba(${rgb},0)`);
      g.fillStyle = gr; g.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
  };
  const n = Math.round(26 * (S / 1024) ** 2);
  for (let i = 0; i < n; i++) {
    const h = hash(i * 7 + 3, i * 13 + 5), x = h % S, y = (h >>> 11) % S, r = 110 + (h >>> 5) % 150;
    if (i % 2) { g.globalCompositeOperation = 'lighter'; blob(x, y, r, '255,225,200', 0.07); g.globalCompositeOperation = 'source-over'; }
    else blob(x, y, r, '0,0,0', 0.28);
  }
}
/* Nền lát gạch từ atlas: 64×64 ô 16px (lặp mỗi 1024 đơn vị), ~85% là gạch thường,
   còn lại 7 kiểu gạch nứt/vỡ, thỉnh thoảng một đầu lâu; đồ trang trí theo đợt; phủ màu của đợt. */
function buildGroundTiles(img, gd) {
  const T = 16, N = 64, S = T * N;
  const cvs = document.createElement('canvas'); cvs.width = cvs.height = S;
  const g = cvs.getContext('2d'); g.imageSmoothingEnabled = false;
  const put = (name, x, y) => { const f = ATLAS.frames[name]; if (f) g.drawImage(img, f[0], f[1], f[2], f[3], x, y, f[2], f[3]); };
  for (let tx = 0; tx < N; tx++) for (let ty = 0; ty < N; ty++) {
    const h = hash(tx, ty);
    put(h % 100 < 85 ? 'floor_1' : 'floor_' + (2 + (h >>> 7) % 7), tx * T, ty * T);
    if ((h >>> 12) % 211 === 0) put('skull', tx * T, ty * T);
  }
  // Gạch 0x72 có mép trên/trái tối và mép dưới/phải sáng → lát ra thành lưới kẻ ô rõ; phủ màu thân gạch lên các đường nối cho dịu bớt
  g.fillStyle = 'rgba(72,59,58,0.6)';
  for (let k = 0; k <= N; k++) { g.fillRect(0, k * T - 1, S, 2); g.fillRect(k * T - 1, 0, 2, S); }
  scatterDecor(g, T, N, gd);
  g.fillStyle = gd ? gd.tint : 'rgba(10,8,18,0.5)'; g.fillRect(0, 0, S, S);
  groundPatches(g, S);
  return cvs;
}

// Vẽ trong hệ toạ độ thế giới (đã có transform camera), phủ đúng vùng VW×VH đang nhìn.
function tileGround(cvs, camX, camY) {
  const S = cvs.width;
  const x0 = Math.floor(camX / S) * S, y0 = Math.floor(camY / S) * S;
  for (let x = x0; x < camX + VW; x += S) for (let y = y0; y < camY + VH; y += S) ctx.drawImage(cvs, x, y);
}
function drawGround(camX, camY) {
  const w = G.wave, i = waveIdx();
  tileGround(groundFor(i), camX, camY);
  if (w.phase === 'rest' && i + 1 < WAVE_DEFS.length) { // nghỉ giữa đợt: nền đợt sau hiện dần
    ctx.globalAlpha = clamp(w.t / CFG.restTime, 0, 1); tileGround(groundFor(i + 1), camX, camY); ctx.globalAlpha = 1;
  }
}

/* Viền tối (màu theo đợt) và viền đỏ khi bị đánh: vẽ sẵn ở 1/4 độ phân giải khi đổi cỡ cửa sổ / đổi đợt. */
let vigDark = null, vigRed = null, vigWave = -1;
function buildVignettes(wi = waveIdx()) {
  const w = Math.max(1, Math.ceil(W / 4)), h = Math.max(1, Math.ceil(H / 4));
  const make = (color, inner) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * inner, w / 2, h / 2, Math.max(w, h) * 0.75);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, color);
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    return c;
  };
  vigWave = wi;
  const L = WAVE_DEFS[vigWave].ground.light;
  vigDark = make(`rgba(${L},0.55)`, 0.30); vigRed = make('rgba(200,20,50,1)', 0.35);
}
function drawVignette(hurtT, wi = waveIdx()) {
  if (!vigDark || vigWave !== wi) buildVignettes(wi);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(vigDark, 0, 0, W, H);
  if (hurtT > 0) { ctx.globalAlpha = Math.min(1, 0.25 + hurtT); ctx.drawImage(vigRed, 0, 0, W, H); ctx.globalAlpha = 1; }
  ctx.imageSmoothingEnabled = false;
}

/* Hạt bụi lơ lửng (toạ độ màn hình, trôi chậm, lệch nhẹ theo camera tạo chiều sâu) */
const MOTES = Array.from({ length: 36 }, () => ({ x: Math.random(), y: Math.random(), vx: rand(-1, 1), vy: rand(-1, 1), s: Math.random() < 0.5 ? 1 : 2, a: rand(0.25, 0.5) }));
function drawMotes(camX, camY, t = G.t, wi = waveIdx()) {
  const col = WAVE_DEFS[wi].ground.mote, k = W / VW * 0.15;
  ctx.fillStyle = col;
  for (const m of MOTES) {
    const sp = 4 + m.s * 3;
    let x = (m.x * W + m.vx * sp * t - camX * k) % W, y = (m.y * H + m.vy * sp * t - camY * k) % H;
    if (x < 0) x += W; if (y < 0) y += H;
    ctx.globalAlpha = m.a; ctx.fillRect(x, y, m.s, m.s);
  }
  ctx.globalAlpha = 1;
}

/* Thời tiết theo đợt (V8 G5): sương/bụi = mảng 128×128 vẽ sẵn theo màu, cuộn chậm có thị sai; tro = hạt rơi chéo.
   Toạ độ màn hình (px CSS), vẽ sau lightmap nên giữ màu riêng. Gọi chỉ khi lightOn() — tắt đèn đêm thì không có sương trên nền sáng. */
const FOG_IMG = {};
function fogImg(col) {
  let c = FOG_IMG[col]; if (c) return c;
  c = FOG_IMG[col] = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), rgb = hexRgb(col);
  for (let i = 0; i < 5; i++) {
    const x = 64 + (i ? hash(i, 31) % 50 - 25 : 0), y = 64 + (i ? hash(i, 37) % 50 - 25 : 0), r = i ? 26 + hash(i, 41) % 14 : 60;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(${rgb},0.5)`); gr.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  }
  return c;
}
const FOG = Array.from({ length: CFG.weather.blobs }, () => ({ x: Math.random(), y: Math.random(), s: Math.random(), vx: rand(0.5, 1), vy: rand(-0.4, 0.4) }));
const ASH = Array.from({ length: CFG.weather.ash }, () => ({ x: Math.random(), y: Math.random(), v: rand(0.6, 1), s: Math.random() < 0.5 ? 1 : 2, a: rand(CFG.weather.ashA[0], CFG.weather.ashA[1]) }));
function drawWeather(camX, camY, t, wi) {
  const wd = WAVE_DEFS[wi].weather, C = CFG.weather, k = W / VW;
  if (!wd || SETTINGS.clear) return;
  if (wd.kind === 'ash') {
    ctx.fillStyle = wd.col;
    for (const m of ASH) {
      const sp = C.ashFall * m.v;
      let x = (m.x * W + (sp * 0.5 * t - camX * C.parallax) * k) % W, y = (m.y * H + (sp * t - camY * C.parallax) * k) % H;
      if (x < 0) x += W; if (y < 0) y += H;
      ctx.globalAlpha = Math.min(1, wd.a * m.a); ctx.fillRect(x, y, m.s, m.s);
    }
  } else {
    const img = fogImg(wd.col);
    ctx.imageSmoothingEnabled = true;   // phóng 128 px lên ~1000 px: không làm mượt thì thành ô vuông
    for (const b of FOG) {   // x, y: tâm mảng sương, đơn vị thế giới tính từ góc màn
      const s = C.size[0] + b.s * (C.size[1] - C.size[0]), spX = VW + s, spY = VH + s;
      let x = (b.x * spX + C.drift * b.vx * t - camX * C.parallax) % spX, y = (b.y * spY + C.drift * b.vy * t - camY * C.parallax) % spY;
      if (x < 0) x += spX; if (y < 0) y += spY;
      x -= s / 2; y -= s / 2;
      ctx.globalAlpha = wd.a * clamp(Math.hypot(x - VW / 2, y - VH / 2) / C.clearR, 0.3, 1);
      ctx.drawImage(img, (x - s / 2) * k, (y - s / 2) * k, s * k, s * k);
    }
    ctx.imageSmoothingEnabled = false;
  }
  ctx.globalAlpha = 1;
}

/* Lớp phát sáng: quầng sáng vẽ sẵn (64×64), cộng sáng một lượt dưới mọi vật. Có giới hạn số quầng mỗi khung. */
const GLOW_COLORS = { pink: '255,77,196', purple: '200,107,255', cyan: '127,212,255', gold: '255,209,102', green: '92,255,157', red: '255,59,92' };
const GLOWS = {};
function glowImg(name) {
  let c = GLOWS[name];
  if (!c) {
    c = GLOWS[name] = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, `rgba(${GLOW_COLORS[name]},0.5)`); gr.addColorStop(1, `rgba(${GLOW_COLORS[name]},0)`);
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  }
  return c;
}
const ITEM_GLOW = { potion: 'red', magnet: 'red', shield: 'cyan', speed: 'green', rage: 'gold', bomb: 'gold', freeze: 'cyan', xp2: 'purple', heart: 'red', chest: 'gold' };
let glowCount = 0;
function glow(name, x, y, r, ry = r) {
  if (glowCount >= CFG.glowCap) return;
  glowCount++; ctx.drawImage(glowImg(name), x - r, y - ry, r * 2, ry * 2);
}

/* Lớp ánh sáng đêm (lightmap): vẽ các nguồn sáng kiểu cộng lên canvas phụ ở độ phân giải thế giới (1 px = 1 đơn vị),
   rồi nhân (multiply) lên cảnh trước đạn quái / cảnh báo / số sát thương. */
const hexRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).join(',');
const light = { cv: null, failed: false, slowT: 0, n: 0 };
const LIGHT_IMGS = {}, lightList = [], eliteTmp = [];
let lightG = null;
function lightOn() { return SETTINGS.light && !light.failed; }
function lightImg(color) {
  let c = LIGHT_IMGS[color];
  if (!c) {
    c = LIGHT_IMGS[color] = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'), rgb = hexRgb(color), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  }
  return c;
}
function addLight(x, y, r, color, a = 1) {
  if (lightList.length >= CFG.light.max * 5) return;
  lightList.push(x, y, r, color, a);
}
function drawLights(camX, camY) {
  const L = CFG.light, p = G.player;
  const cw = Math.max(1, Math.ceil(VW)), ch = Math.max(1, Math.ceil(VH));
  if (!light.cv || light.cv.width !== cw || light.cv.height !== ch) {
    light.cv = document.createElement('canvas'); light.cv.width = cw; light.cv.height = ch;
    lightG = light.cv.getContext('2d');
  }
  lightList.length = 0; eliteTmp.length = 0;
  const onCam = (x, y, r) => x + r > camX && x - r < camX + VW && y + r > camY && y - r < camY + VH;
  // Gom đèn theo thứ tự ưu tiên (người chơi → boss → vùng nổ → tinh anh → đạn; bỏ đèn ngọc để giữ ngân sách khung hình)
  if (p) addLight(p.x, p.y, L.player, L.playerCol);
  for (let i = 0, it = G.enemies.items; i < it.length; i++) {
    const e = it[i]; if (e.dead) continue;
    if (e.boss) {
      const br = e.raged ? L.boss * L.rageMul : L.boss;
      if (onCam(e.x, e.y, br)) addLight(e.x, e.y, br, e.raged ? L.rageCol : ENEMIES[e.type].color);
    } else if (e.elite) eliteTmp.push(e);
  }
  for (let i = 0; i < G.zones.length; i++) {
    const z = G.zones[i], zr = z.r * L.zone;
    if (onCam(z.x, z.y, zr)) addLight(z.x, z.y, zr, L.zoneCol, clamp(0.5 + 0.5 * (1 - z.t / (z.max || 1)), 0, 1));
  }
  for (let i = 0; i < eliteTmp.length; i++) {
    const e = eliteTmp[i];
    if (onCam(e.x, e.y, L.elite)) addLight(e.x, e.y, L.elite, L.eliteCol);
  }
  for (let i = 0, it = G.bullets.items; i < it.length; i++) {
    const b = it[i];
    if (!b.dead && onCam(b.x, b.y, L.bullet)) addLight(b.x, b.y, L.bullet, (WEAPON_LOOK[b.kind] && WEAPON_LOOK[b.kind].col) || '#ffffff');
  }
  const g = lightG;
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  g.fillStyle = WAVE_DEFS[waveIdx()].ambient; g.fillRect(0, 0, cw, ch);
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < lightList.length; i += 5) {
    const x = lightList[i], y = lightList[i + 1], r = lightList[i + 2];
    g.globalAlpha = lightList[i + 4];
    g.drawImage(lightImg(lightList[i + 3]), x - camX - r, y - camY - r, r * 2, r * 2);
  }
  g.globalAlpha = 1;
  ctx.setTransform(SCREEN, 0, 0, SCREEN, 0, 0);
  ctx.globalCompositeOperation = 'multiply';
  if (ctx.globalCompositeOperation !== 'multiply') {
    ctx.globalCompositeOperation = 'source-over';
    light.failed = true; light.n = 0; lightList.length = 0; return;
  }
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(light.cv, 0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';
  ctx.imageSmoothingEnabled = false;
  light.n = lightList.length / 5;
  lightList.length = 0;
}
function lightTick(dt, renderMs) {
  if (!lightOn()) return;
  const A = CFG.light.autoOff;
  if (renderMs > A.ms) { light.slowT += dt; if (light.slowT >= A.hold) light.failed = true; }
  else light.slowT = 0;
}

function drawGlows(vis) {
  glowCount = 0;
  ctx.globalCompositeOperation = 'lighter';
  for (const e of G.enemies.items) {
    if (e.dead || !vis(e)) continue;
    // Boss / tinh anh: vũng sáng dẹt dưới chân (không phải quầng tròn quanh thân) để sprite vẫn là thứ sáng nhất
    const fy = e.y + e.r * 0.75;
    if (e.boss) { const k = e.raged ? 1.25 * (0.92 + 0.08 * Math.sin(G.t * TAU * 3)) : 1; glow('red', e.x, fy, e.r * 2.1 * k, e.r * 0.85 * k); }
    else if (e.elite) { ctx.globalAlpha = 0.75; glow('gold', e.x, fy, e.r * 1.8, e.r * 0.7); ctx.globalAlpha = 1; }
  }
  for (const s of G.shots.items) if (vis(s)) glow('purple', s.x, s.y, 14);
  for (const g of G.gems.items) {
    if (!vis(g)) continue;
    const it = ITEM_GLOW[g.kind];
    if (it) glow(it, g.x, g.y, 16);
    else if (g.v >= 20) glow('gold', g.x, g.y, 12);
    else if (g.v >= 5 && G.gems.items.length <= 120) glow('pink', g.x, g.y, 10);
  }
  if (G.bullets.items.length <= 80) for (const b of G.bullets.items) {
    if (!vis(b)) continue;
    const L = WEAPON_LOOK[b.kind] && WEAPON_LOOK[b.kind].tiers[(b.tier || 1) - 1];
    if (L && L.glow) glow(L.glow, b.x, b.y, 6 + 4 * L.size); else glow(b.kind === 'knife' ? 'cyan' : 'pink', b.x, b.y, 10);
  }
  ctx.globalCompositeOperation = 'source-over';
}

/* Hào quang độc: vẽ sẵn ở đúng độ phân giải thiết bị (bán kính × ZOOM), chỉ vẽ lại khi bán kính, ZOOM hoặc bậc đổi.
   Theo bậc (WEAPON_LOOK.aura): bậc 1 vòng mờ; bậc 2 thêm vòng đứt nét bên trong xoay ngược; bậc 3 thêm sóng toả theo nhịp
   gây sát thương. Giữa vùng luôn gần trong suốt để nền, vật phẩm và vùng báo trước bên dưới vẫn đọc được. */
const auraCache = { key: '', cv: null, size: 0 };
function drawAura(p) {
  const w = p.weapons.aura; if (!w) return;
  const L = weaponLook(w), R = Math.round(w.radius * p.mArea), ringA = Math.min(0.85, L.ring + lookStep(w) * L.grow);
  const key = R + '@' + ZOOM + '|' + weaponTier(w) + '|' + ringA.toFixed(2);
  const rgb = hexRgb(L.col), rgb2 = hexRgb(L.col2);
  if (auraCache.key !== key) {
    const Rp = R * ZOOM, m = Rp + 2;
    const mk = () => { const c = document.createElement('canvas'); c.width = c.height = m * 2; return [c, c.getContext('2d')]; };
    const [c, g] = mk();
    const gr = g.createRadialGradient(m, m, Rp * 0.2, m, m, Rp);
    gr.addColorStop(0, `rgba(${rgb},0)`); gr.addColorStop(0.8, `rgba(${rgb},0.04)`); gr.addColorStop(1, `rgba(${rgb},0.12)`);
    g.fillStyle = gr; circle(g, m, m, Rp);
    g.strokeStyle = `rgba(${rgb2},${ringA})`; g.lineWidth = 1.5 * ZOOM; g.beginPath(); g.arc(m, m, Rp, 0, TAU); g.stroke();
    Object.assign(auraCache, { key, cv: c, size: (m * 2) / ZOOM });
  }
  // Ảnh vòng tròn đối xứng nên không cần xoay (xoay ảnh lớn rất tốn); chỉ phập phồng nhẹ
  const fa = SETTINGS.fxAlpha;
  ctx.globalAlpha = fa;
  const size = auraCache.size * (1 + Math.sin(w.pulse * 4) * 0.03);
  ctx.drawImage(auraCache.cv, p.x - size / 2, p.y - size / 2, size, size);
  if (L.ring2) { // vòng đứt nét bên trong, xoay ngược chiều: vẽ nét (rẻ hơn một ảnh lớn nữa)
    ctx.strokeStyle = `rgba(${rgb2},${L.ring2})`; ctx.lineWidth = 1; ctx.setLineDash([6, 8]); ctx.lineDashOffset = REDUCED_MOTION ? 0 : w.pulse * 12;
    ctx.beginPath(); ctx.arc(p.x, p.y, R * 0.72, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
  }
  if (L.pulse) { // sóng mảnh toả từ tâm ra mép theo nhịp gây sát thương
    const ph = (w.pulse % w.tick) / w.tick;
    ctx.globalAlpha = L.pulse * (1 - ph) * fa; ctx.strokeStyle = `rgb(${rgb2})`; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(p.x, p.y, R * (0.25 + 0.75 * ph), 0, TAU); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/* Nội suy: logic chạy 60 bước/giây cố định, còn màn hình có thể 75/120/144Hz.
   Khi vẽ, đặt tạm mỗi vật ở vị trí giữa bước trước và bước hiện tại theo `alpha`,
   vẽ xong trả lại vị trí thật. Vật mới sinh trong bước này (chưa có vị trí trước) thì vẽ nguyên. */
const LERP_POOLS = ['enemies', 'bullets', 'shots', 'gems'];
function snapPrev() {
  const s = ++G.stepId, p = G.player;
  p.px = p.x; p.py = p.y; p.ps = s;
  for (const k of LERP_POOLS) for (const o of G[k].items) { o.px = o.x; o.py = o.y; o.ps = s; }
}
function lerpOne(o, a) {
  o.rx = o.x; o.ry = o.y;
  if (o.ps === G.stepId) { o.x = o.px + (o.x - o.px) * a; o.y = o.py + (o.y - o.py) * a; }
}
function lerpIn(a) { lerpOne(G.player, a); for (const k of LERP_POOLS) for (const o of G[k].items) lerpOne(o, a); }
function lerpOut() {
  const p = G.player; p.x = p.rx; p.y = p.ry;
  for (const k of LERP_POOLS) for (const o of G[k].items) { o.x = o.rx; o.y = o.ry; }
}

/* Vòng Huyết Nguyệt theo bậc (WEAPON_LOOK.orbit): bậc 1 lưỡi trơn; bậc 2 mỗi lưỡi kéo theo một cung mờ (dài thêm mỗi cấp);
   bậc 3 thêm vòng liền mờ trên quỹ đạo và lưỡi sáng hơn (quầng cộng sáng). */
function drawOrbit(p) {
  const w = p.weapons.orbit; if (!w) return;
  const fa = SETTINGS.fxAlpha;
  const r = w.r * Math.sqrt(p.mArea), L = weaponLook(w), arc = L.arc ? L.arc + lookStep(w) * L.grow : 0;
  const spr = Assets.get('orb'), rings = orbitRings(w, p);
  ctx.lineCap = 'round';
  rings.forEach(([n, ang, R], ri) => {
    if (L.ring) { ctx.globalAlpha = L.ring * fa; ctx.strokeStyle = L.col; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(p.x, p.y, R, 0, TAU); ctx.stroke(); }
    if (arc) { // cung kéo sau mỗi lưỡi: phía ngược chiều xoay (vòng ngoài của Nguyệt Thực xoay ngược)
      const dir = ri ? Math.sign(CFG.evo.orbit2.spin) : 1;
      ctx.strokeStyle = L.col;
      ctx.globalAlpha = 0.24 * fa; ctx.lineWidth = r * 0.9; ctx.beginPath();
      for (let i = 0; i < n; i++) { // mọi cung của một vòng gom vào MỘT path
        const a = ang + i * TAU / n, a0 = dir > 0 ? a - arc : a, a1 = dir > 0 ? a : a + arc;
        ctx.moveTo(p.x + Math.cos(a0) * R, p.y + Math.sin(a0) * R); ctx.arc(p.x, p.y, R, a0, a1);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  });
  for (const [n, ang, R] of rings) for (let i = 0; i < n; i++) {
    const a = ang + i * TAU / n, x = p.x + Math.cos(a) * R, y = p.y + Math.sin(a) * R;
    ctx.globalAlpha = fa;
    if (spr) { // kiếm ngọc đỏ, mũi kiếm hướng ra ngoài
      ctx.fillStyle = L.glow ? '#c44dff40' : '#b020ff26'; circle(ctx, x, y, r + (L.glow ? 6 : 4));
      const sh = sheetFor(spr, 'item', 1), q = sh.cells.get(spr.meta.anims.idle.frames[0]);
      drawFrame(ctx, sh.cv, q, x, y, a + spr.meta.rotate, false);
      if (L.glow) { ctx.globalAlpha = 0.35 * fa; drawFrame(ctx, sh.white, q, x, y, a + spr.meta.rotate, false); } // bậc 3: lưỡi sáng hơn
      continue;
    }
    ctx.fillStyle = '#b020ff30'; circle(ctx, x, y, r + 5);
    ctx.fillStyle = L.col; circle(ctx, x, y, r);
    ctx.fillStyle = L.col2; circle(ctx, x - r * 0.3, y - r * 0.3, r * 0.4);
  }
  ctx.globalAlpha = 1;
}

/* Dao Bạc theo bậc (WEAPON_LOOK.knife): bậc 2 vệt chuyển động phía sau (dài thêm mỗi cấp); bậc 3 thêm bóng mờ và lấp lánh ở mũi. */
const STREAKS = {};
function streakImg(color) { // vệt thon vẽ sẵn: trong suốt ở đuôi (trái) → đậm ở đầu (phải)
  let c = STREAKS[color]; if (c) return c;
  c = STREAKS[color] = document.createElement('canvas'); c.width = 64; c.height = 8;
  const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 64, 0);
  gr.addColorStop(0, `rgba(${hexRgb(color)},0)`); gr.addColorStop(1, `rgba(${hexRgb(color)},0.75)`);
  g.fillStyle = gr; g.beginPath(); g.moveTo(0, 4); g.lineTo(64, 0.5); g.lineTo(64, 7.5); g.closePath(); g.fill();
  return c;
}
const ghostProxy = { x: 0, y: 0, vx: 0, vy: 0, face: 1, flash: 0 };
function drawKnifeLook(b, after) {
  const fa = SETTINGS.fxAlpha;
  const L = WEAPON_LOOK.knife.tiers[(b.tier || 1) - 1], sp = Math.hypot(b.vx, b.vy) || 1, ux = b.vx / sp, uy = b.vy / sp;
  if (after) { // sau khi vẽ dao: lấp lánh hình chữ thập ở mũi
    if (!L.glint) return;
    const k = 0.6 + 0.4 * Math.sin(b.life * 30), tx = b.x + ux * 7, ty = b.y + uy * 7, s = 2.5 * k;
    ctx.globalAlpha = 0.9 * fa; ctx.fillStyle = L.col; ctx.fillRect(tx - s, ty - 0.5, s * 2, 1); ctx.fillRect(tx - 0.5, ty - s, 1, s * 2); ctx.globalAlpha = 1;
    return;
  }
  const len = L.trail + (b.lv || 0) * L.grow;
  if (len > 0) {
    ctx.globalAlpha = fa;
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(Math.atan2(b.vy, b.vx));
    ctx.drawImage(streakImg(L.col2), -len - 4, -1.5, len, 3); ctx.restore();
  }
  const ng = G.bullets.items.length > 40 ? 0 : L.ghost;   // nhiều đạn quá thì bỏ bóng mờ trước (trang trí rẻ nhất để bỏ)
  for (let k = ng; k >= 1; k--) { // bóng mờ: chính con dao, lùi lại phía sau
    Object.assign(ghostProxy, { x: b.x - ux * k * 10, y: b.y - uy * k * 10, vx: b.vx, vy: b.vy });
    ctx.globalAlpha = (0.32 / k) * fa; draw(ctx, ghostProxy, 'knife');
  }
  ctx.globalAlpha = 1;
}

/* Vết trên nền (G.decals): cháy sém của sét, nứt đất của sóng xung kích. Hình vẽ sẵn một lần, mỗi vết 1 drawImage, vẽ ngay sau nền. */
const DECAL_IMG = {};
function decalImg(kind) {
  let c = DECAL_IMG[kind]; if (c) return c;
  const S = kind.startsWith('stain:') ? 64 : 256;   // vết loang (G4) nhỏ, mỗi màu quái một ảnh
  c = DECAL_IMG[kind] = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  g.translate(0, S / 2 - S / 2 * 0.62); g.scale(1, 0.62);   // dẹt theo phối cảnh mặt đất, vẽ sẵn (khỏi xoay/co lúc vẽ)
  if (S === 64) { // stain: vài vũng tròn mềm chồng nhau, màu quái tối đi CFG.remains.dark
    const k = 1 - CFG.remains.dark, rgb = kind.slice(6).match(/\w\w/g).map(h => Math.round(parseInt(h, 16) * k)).join(',');
    for (let i = 0; i < 4; i++) {
      const x = 32 + (i ? (hash(i, 13) % 24) - 12 : 0), y = 32 + (i ? (hash(i, 17) % 16) - 8 : 0), r = i ? 10 + hash(i, 19) % 8 : 22;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, `rgba(${rgb},0.7)`); gr.addColorStop(0.6, `rgba(${rgb},0.45)`); gr.addColorStop(1, `rgba(${rgb},0)`);
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    }
  } else if (kind === 'scorch') {
    const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, 'rgba(8,5,6,0.75)'); gr.addColorStop(0.45, 'rgba(14,8,8,0.5)'); gr.addColorStop(1, 'rgba(14,8,8,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    g.strokeStyle = 'rgba(6,4,4,0.6)'; g.lineWidth = 5; g.lineCap = 'round';
    for (let i = 0; i < 9; i++) { const a = i / 9 * TAU + (hash(i, 3) % 100) / 200, r0 = 30, r1 = 80 + hash(i, 7) % 40; g.beginPath(); g.moveTo(128 + Math.cos(a) * r0, 128 + Math.sin(a) * r0); g.lineTo(128 + Math.cos(a) * r1, 128 + Math.sin(a) * r1); g.stroke(); }
    const gl = g.createRadialGradient(128, 128, 0, 128, 128, 34); gl.addColorStop(0, 'rgba(160,220,255,0.35)'); gl.addColorStop(1, 'rgba(160,220,255,0)');
    g.fillStyle = gl; g.fillRect(0, 0, 256, 256);  // lõi còn hơi sáng của tia sét
  } else { // crack: các đường nứt gấp khúc toả ra từ tâm
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (const [col, wd, ox] of [['rgba(255,236,210,0.14)', 2, 2], ['rgba(10,6,4,0.7)', 2.5, 0]]) {
      g.strokeStyle = col; g.lineWidth = wd;
      for (let i = 0; i < 7; i++) {
        let a = i / 7 * TAU + (hash(i, 11) % 100) / 120, x = 128 + ox, y = 128 + ox; g.beginPath(); g.moveTo(x, y);
        const n = 4 + hash(i, 5) % 3, len = 70 + hash(i, 9) % 50;
        for (let k = 1; k <= n; k++) { a += ((hash(i, k) % 100) / 100 - 0.5) * 0.7; x = 128 + ox + Math.cos(a) * len * k / n; y = 128 + ox + Math.sin(a) * len * k / n; g.lineTo(x, y); }
        g.stroke();
      }
    }
  }
  return c;
}
function drawDecals() {
  const RM = CFG.remains, sa = SETTINGS.clear ? RM.aClear : RM.a;
  for (const d of G.decals) {
    const st = d.kind === 'stain';
    ctx.globalAlpha = clamp(d.life / d.max * 1.5, 0, 1) * (st ? sa : 1);
    const img = decalImg(st ? 'stain:' + d.col : d.kind), h = d.r * 0.62, S = img.width, sy = S / 2 - S / 2 * 0.62;
    if (d.rot > Math.PI) { ctx.save(); ctx.translate(d.x, d.y); ctx.scale(-1, 1); ctx.drawImage(img, 0, sy, S, S * 0.62, -d.r, -h, d.r * 2, h * 2); ctx.restore(); } // lật ngang cho đỡ lặp
    else ctx.drawImage(img, 0, sy, S, S * 0.62, d.x - d.r, d.y - h, d.r * 2, h * 2);
  }
  ctx.globalAlpha = 1;
}

/* ---------- Hiệu ứng sprite (fx atlas) ---------- */
function fxReady() { return FX_SRC ? Assets.imgs[FX_SRC] : null; }
// Vẽ 2 lượt: hiệu ứng thường trước, hiệu ứng cộng sáng sau — đổi chế độ hoà màu chỉ 1 lần mỗi lượt.
function drawSfx(under, vis) {
  const img = fxReady(); if (!img) return;
  const fa = SETTINGS.fxAlpha;
  for (const additive of [false, true]) {
    ctx.globalCompositeOperation = additive ? 'lighter' : 'source-over';
    for (const s of G.sfx.items) {
      const st = FX_STYLE[s.key];
      if (!!st.under !== under || !!st.add !== additive || !vis(s)) continue;
      ctx.globalAlpha = st.pri ? 1 : fa;
      const meta = FX_ATLAS.fx[s.key], sc = st.scale * (s.k || 1);
      const f = meta.frames[Math.min(meta.frames.length - 1, Math.floor(s.t * 1000 / meta.ms))];
      const ox = -meta.pivot[0] * sc, oy = -meta.pivot[1] * sc;
      if (s.rot) {
        ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.rot);
        ctx.drawImage(img, f[0], f[1], f[2], f[3], ox, oy, f[2] * sc, f[3] * sc);
        ctx.restore();
      } else {
        ctx.drawImage(img, f[0], f[1], f[2], f[3], s.x + ox, s.y + oy, f[2] * sc, f[3] * sc);
      }
    }
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
}

/* ---------- Báo trước đòn tấn công ---------- */
/* Hoạ tiết báo trước vẽ sẵn (giữ nguyên thời gian, bán kính, tông đỏ — chỉ đổi cách vẽ cho mềm):
   zone = đĩa đỏ gần trong suốt ở giữa, đậm dần ra mép (vẫn thấy chân mình và vật phẩm bên trong);
   fill = lõi cam lớn dần tới lúc nổ; lane = vạch lao, đậm ở hai mép, nhạt dần về cuối. */
const TELE = {};
function teleImg(name) {
  let c = TELE[name]; if (c) return c;
  c = TELE[name] = document.createElement('canvas');
  const g = c.getContext('2d');
  if (name === 'lane') {
    c.width = 64; c.height = 16;
    let gr = g.createLinearGradient(0, 0, 0, 16);
    gr.addColorStop(0, 'rgba(255,40,70,0.42)'); gr.addColorStop(0.5, 'rgba(255,40,70,0.10)'); gr.addColorStop(1, 'rgba(255,40,70,0.42)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 16);
    gr = g.createLinearGradient(40, 0, 64, 0); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,1)');
    g.globalCompositeOperation = 'destination-out'; g.fillStyle = gr; g.fillRect(40, 0, 24, 16);
    return c;
  }
  c.width = c.height = 128;
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  if (name === 'zone') { gr.addColorStop(0, 'rgba(255,60,60,0.03)'); gr.addColorStop(0.55, 'rgba(255,60,60,0.08)'); gr.addColorStop(0.9, 'rgba(255,60,60,0.27)'); gr.addColorStop(1, 'rgba(255,60,60,0.36)'); }
  else { gr.addColorStop(0, 'rgba(255,130,60,0.10)'); gr.addColorStop(0.75, 'rgba(255,130,60,0.24)'); gr.addColorStop(1, 'rgba(255,130,60,0.36)'); }
  g.fillStyle = gr; g.beginPath(); g.arc(64, 64, 64, 0, TAU); g.fill();
  return c;
}
// Quầng sáng mềm sau lưng boss khi tụ lực (thay cho đĩa màu phẳng)
function teleGlow(name, x, y, R, alpha) {
  if (SETTINGS.clear) { R *= 1.35; alpha *= 1.6; }   // Dễ nhìn: quầng báo trước của boss to và đậm hơn (Q-010)
  ctx.globalAlpha = clamp(alpha, 0, 1); ctx.drawImage(glowImg(name), x - R, y - R, R * 2, R * 2); ctx.globalAlpha = 1;
}
// Boss: quầng đỏ nhấp nháy sau lưng trước khi bắn vòng đạn. Pháp sư tử linh: quả cầu tím lớn dần trên đầu.
function drawTelegraph(e) {
  if (e.boss) {
    const sk = e.skill; if (!sk) return;
    const S = BOSS_SKILLS[sk.id], k = clamp(1 - sk.t / (sk.tele0 || S.tele), 0, 1);    // 0 → 1 khi sắp ra đòn
    const blink = 0.6 + 0.4 * Math.sin(G.t * 40);
    if (sk.id === 'charge' || sk.id === 'quake') {          // vạch đỏ theo hướng lao
      const len = S.speed * S.dur + e.r;
      ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(sk.dir);
      ctx.globalAlpha = 0.45 + 0.55 * k; ctx.drawImage(teleImg('lane'), 0, -e.r * 0.8, len, e.r * 1.6); ctx.globalAlpha = 1;
      ctx.fillStyle = `rgba(255,90,110,${0.5 * blink})`; ctx.fillRect(0, -e.r * 0.8, len * k, 2); ctx.fillRect(0, e.r * 0.8 - 2, len * k, 2);
      ctx.restore();
    } else if (sk.id === 'teleport') { // vòng đích đến
      ctx.strokeStyle = `rgba(200,107,255,${0.4 + 0.4 * blink})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(sk.tx, sk.ty, e.r * (1.4 - 0.4 * k), 0, TAU); ctx.stroke();
    } else if (sk.id === 'wall') { // cung tím chỉ chỗ khe hở của vòng đạn đầu
      const a0 = sk.hole * TAU / S.n - TAU / S.n / 2;
      ctx.strokeStyle = `rgba(200,107,255,${0.5 + 0.4 * blink})`; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 26, a0, a0 + S.hole * TAU / S.n); ctx.stroke();
      teleGlow('purple', e.x, e.y, e.r + 16 + k * 18, 0.45 + 0.55 * k);
    } else if (sk.id !== 'slam' && sk.id !== 'meteor' && sk.id !== 'boulders') { // vòng đạn / xoắn ốc / gọi quân: quầng sáng
      const name = sk.id === 'spiral' || sk.id === 'rings' ? 'purple' : sk.id === 'summon' ? 'green' : 'red';
      teleGlow(name, e.x, e.y, e.r + 16 + k * 18, 0.45 + 0.75 * k * blink);
    }
  } else if (e.chPhase === 1) { // kỵ sĩ xương: vạch lao mảnh
    const C = ENEMIES[e.type].charge, k = clamp(1 - e.chT / C.tele, 0, 1);
    ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.chDir);
    ctx.globalAlpha = 0.4 + 0.5 * k; ctx.drawImage(teleImg('lane'), 0, -e.r * 0.6, C.len, e.r * 1.2); ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255,90,110,0.7)'; ctx.fillRect(0, -e.r * 0.6, C.len * k, 1); ctx.fillRect(0, e.r * 0.6 - 1, C.len * k, 1);
    ctx.restore();
  } else {
    const k = 1 - Math.max(0, e.shootT) / 0.3;
    const y = e.y - e.r - 8;
    ctx.fillStyle = 'rgba(200,107,255,0.35)'; circle(ctx, e.x, y, 3 + k * 5);
    ctx.fillStyle = '#e8c4ff'; circle(ctx, e.x, y, 1.5 + k * 2.5);
  }
}
// Vùng sắp nổ (dậm đất, thiên thạch): đĩa đỏ đậm dần ra mép + lõi cam lớn dần tới lúc nổ + viền đứt nét xoay chậm;
// 0.12 giây cuối loé trắng. Phần giữa gần trong suốt để vẫn thấy chân mình và vật phẩm trong vùng.
function drawZones() {
  if (!G.zones.length) return;
  const disc = teleImg('zone'), fill = teleImg('fill');
  ctx.lineWidth = 1; ctx.setLineDash([5, 4]); ctx.lineDashOffset = REDUCED_MOTION ? 0 : -G.t * 14;
  for (const z of G.zones) {
    const k = clamp(1 - z.t / z.max, 0, 1), r = z.r, ri = r * k, hot = z.t < 0.12 ? 1 - Math.max(0, z.t) / 0.12 : 0;
    ctx.drawImage(disc, z.x - r, z.y - r, r * 2, r * 2);
    if (ri > 1) ctx.drawImage(fill, z.x - ri, z.y - ri, ri * 2, ri * 2);
    if (hot > 0) { ctx.fillStyle = `rgba(255,255,255,${0.3 * hot})`; circle(ctx, z.x, z.y, r); }
    ctx.strokeStyle = hot > 0 ? '#ffffff' : 'rgba(255,100,100,0.9)';
    ctx.beginPath(); ctx.arc(z.x, z.y, r, 0, TAU); ctx.stroke();
    if (SETTINGS.clear) { ctx.save(); ctx.setLineDash([]); ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.arc(z.x, z.y, r + 1.5, 0, TAU); ctx.stroke(); ctx.restore(); }   // Dễ nhìn: viền trắng liền, không dựa vào màu đỏ
  }
  ctx.setLineDash([]);
}
// Hiệu ứng tạm thời quanh người chơi: khiên phép (vòng xanh + số đòn còn chặn), cuồng nộ (quầng đỏ)
function drawPlayerBuffs(p) {
  ctx.strokeStyle = `rgba(255,255,255,${SETTINGS.clear ? CFG.playerRing.clear : CFG.playerRing.a})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(p.x, p.y + 2, p.r + 6, 0, TAU); ctx.stroke();   // Vòng sáng quanh nhân vật luôn bật (Q-013)
  if (p.buffs.rage > 0) { ctx.fillStyle = `rgba(255,90,50,${0.16 + 0.08 * Math.sin(G.t * 12)})`; circle(ctx, p.x, p.y + 2, p.r + 7); }
  if (p.buffs.shield > 0 && p.shieldHits > 0) {
    const fading = p.buffs.shield < 3 && Math.floor(G.t * 8) % 2;
    ctx.globalAlpha = fading ? 0.35 : 0.8;
    ctx.fillStyle = 'rgba(127,200,255,0.12)'; circle(ctx, p.x, p.y, p.r + 10);
    ctx.strokeStyle = '#7fc8ff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 10, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#bfe6ff';
    for (let i = 0; i < p.shieldHits; i++) { const a = G.t * 2 + i * TAU / 3; circle(ctx, p.x + Math.cos(a) * (p.r + 10), p.y + Math.sin(a) * (p.r + 10), 2); }
    ctx.globalAlpha = 1;
  }
}
// Vòng vây sắp xuất hiện: vòng đỏ đứt nét quanh người chơi, nhấp nháy nhanh dần
function drawWarnings(p) {
  for (const w of G.warns) {
    const left = Math.max(0, w.at - G.t), k = 1 - left;
    ctx.globalAlpha = 0.35 + 0.45 * Math.abs(Math.sin(G.t * (6 + k * 14)));
    ctx.strokeStyle = '#ff3b5c'; ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]); ctx.lineDashOffset = -G.t * 40;
    ctx.beginPath(); ctx.arc(p.x, p.y, w.R, 0, TAU); ctx.stroke();
    ctx.setLineDash([]); ctx.globalAlpha = 1;
  }
}

/* ---------- Số sát thương: ảnh chữ số VT323 vẽ sẵn (mỗi màu một hàng), mỗi chữ số 1 drawImage ---------- */
const NUM_GLYPHS = '0123456789+×', NUM_COLORS = ['#ffffff', '#ffd166', '#ff9a3d', '#ff4d4d', '#5cff9d'];
const NUM_H = 10; // chiều cao chữ số (đơn vị thế giới)
let numAtlas = null, numFontOk = false;
if (document.fonts) document.fonts.load('16px VT323').then(() => { numFontOk = true; numAtlas = null; }, () => {});
function buildNumAtlas() {
  const fs = Math.round(NUM_H * ZOOM), rowH = fs + 2, font = `${fs}px VT323, ui-monospace, monospace`;
  const c = document.createElement('canvas'), g = c.getContext('2d');
  g.font = font;
  const ws = [...NUM_GLYPHS].map(ch => Math.ceil(g.measureText(ch).width) + 1), xs = [];
  let x = 0; for (const w of ws) { xs.push(x); x += w + 2; }
  c.width = x; c.height = rowH * NUM_COLORS.length;
  g.font = font; g.textBaseline = 'top';
  NUM_COLORS.forEach((col, r) => [...NUM_GLYPHS].forEach((ch, i) => {
    g.fillStyle = '#000'; g.fillText(ch, xs[i] + 1, r * rowH + 1);
    g.fillStyle = col; g.fillText(ch, xs[i], r * rowH);
  }));
  numAtlas = { cv: c, zoom: ZOOM, ws, xs, rowH };
}
function drawTexts(vis) {
  if (!numAtlas || numAtlas.zoom !== ZOOM) buildNumAtlas();
  const A = numAtlas, inv = 1 / ZOOM;
  const cssPerUnit = W / VW, fsTxt = Math.max(6, 14 / cssPerUnit) * 1.3, sd = 1 / cssPerUnit;
  let lastFont = '';
  ctx.textAlign = 'center';
  for (const t of G.texts.items) {
    if (!vis(t)) continue;
    ctx.globalAlpha = clamp(t.life / 0.4, 0, 1);
    const k = (t.size || 1) * (1 + (t.pop || 0) * 3), row = t.num ? NUM_COLORS.indexOf(t.color) : -1;
    if (row >= 0) {
      const s = String(t.txt), sc = inv * k, h = A.rowH * sc;
      let w = 0; for (let i = 0; i < s.length; i++) w += A.ws[NUM_GLYPHS.indexOf(s[i])];
      let x = t.x - w * sc / 2; const y = t.y - h / 2;
      for (let i = 0; i < s.length; i++) {
        const gi = NUM_GLYPHS.indexOf(s[i]), gw = A.ws[gi];
        ctx.drawImage(A.cv, A.xs[gi], row * A.rowH, gw, A.rowH, x, y, gw * sc, h);
        x += gw * sc;
      }
      continue;
    }
    const font = `${(fsTxt * k).toFixed(1)}px VT323, ui-monospace, monospace`;
    if (font !== lastFont) { ctx.font = font; lastFont = font; }
    ctx.fillStyle = '#000'; ctx.fillText(t.txt, t.x + sd, t.y + sd);
    ctx.fillStyle = t.color; ctx.fillText(t.txt, t.x, t.y);
  }
  ctx.globalAlpha = 1;
}

const dieProxy = { x: 0, y: 0, face: 1, anim: 0, r: 10, flash: 0 };
function drawFx() {
  const fa = SETTINGS.fxAlpha, D = CFG.die;
  // Hạ hàng loạt: chỉ flashMax xác mới nhất (life lớn nhất) được nháy trắng — tìm ngưỡng life của xác thứ flashMax
  let flashLife = 0, nFlash = 0, ties = 0;
  for (const f of G.fx.items) if (f.type === 'die' && f.life > 0.55 * f.max) nFlash++;
  if (nFlash > D.flashMax) {
    const ls = []; for (const f of G.fx.items) if (f.type === 'die' && f.life > 0.55 * f.max) ls.push(f.life);
    ls.sort((a, b) => b - a); flashLife = ls[D.flashMax - 1];
    ties = D.flashMax; for (const l of ls) if (l > flashLife) ties--; // nhiều xác chết cùng khung có life bằng nhau: chỉ cho số chỗ còn lại
  }
  for (const f of G.fx.items) {
    const a = clamp(f.life / f.max, 0, 1);
    if (f.type === 'zap') {
      ctx.globalAlpha = a;
      ctx.strokeStyle = '#7fc8ff'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const top = f.y - 320;
      ctx.beginPath(); ctx.moveTo(f.x + f.pts[0], top);
      for (let i = 1; i < f.pts.length; i++) ctx.lineTo(f.x + (i === f.pts.length - 1 ? 0 : f.pts[i]), top + (f.y - top) * i / (f.pts.length - 1));
      ctx.stroke(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#bfe6ff55'; circle(ctx, f.x, f.y, f.r * (1.2 - a * 0.2));
      ctx.globalAlpha = 1;
    } else if (f.type === 'bolt') { // Lôi Phạt bậc 2+: tia sét dày, có nhánh phụ (vẽ thêm trên hiệu ứng sprite)
      const top = f.y - 260, n = f.pts.length - 1, X = i => f.x + (i === n ? 0 : f.pts[i]), Y = i => top + (f.y - top) * i / n;
      ctx.globalAlpha = a * fa; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (const [col, wd] of [[f.color, 1.2 + 1.3 * f.w], ['#ffffff', 0.6 + 0.4 * f.w]]) {
        ctx.strokeStyle = col; ctx.lineWidth = wd; ctx.beginPath(); ctx.moveTo(X(0), Y(0));
        for (let i = 1; i <= n; i++) ctx.lineTo(X(i), Y(i));
        for (let k = 0; k < f.br; k++) { // nhánh phụ: tách sang một bên rồi tắt dần
          const i0 = f.bi + k * 2, sd = k ? -f.bs : f.bs; if (i0 >= n) break;
          ctx.moveTo(X(i0), Y(i0)); ctx.lineTo(X(i0) + sd * 14, Y(i0) + 12); ctx.lineTo(X(i0) + sd * 22, Y(i0) + 26);
        }
        ctx.stroke();
      }
      if (f.glow) { ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(glowImg(f.glow), f.x - f.r * 1.3, f.y - f.r * 0.8, f.r * 2.6, f.r * 1.6); ctx.globalCompositeOperation = 'source-over'; } // quầng sáng chỗ sét đánh
      ctx.globalAlpha = 1;
    } else if (f.type === 'cast') { // loé nhỏ ở chỗ bắn
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.75 * a * fa; ctx.fillStyle = f.color; circle(ctx, f.x, f.y, f.r * (1.4 - 0.4 * a));
      ctx.globalAlpha = a * fa; ctx.fillStyle = '#ffffff'; circle(ctx, f.x, f.y, f.r * 0.4 * a);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    } else if (f.type === 'nova') {
      if (f.delay > 0 || !f.started) continue;
      const fade = f.r < f.maxR ? 1 : a, L = WEAPON_LOOK.nova.tiers[(f.tier || 1) - 1], k = L.size + (f.lv || 0) * L.grow;
      ctx.globalAlpha = fade * fa;
      ctx.strokeStyle = L.col; ctx.lineWidth = (8 * fade + 1) * k; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, TAU); ctx.stroke();
      ctx.strokeStyle = L.col2; ctx.lineWidth = 2; ctx.stroke();
      if (L.double && f.r > 12) { ctx.globalAlpha = fade * 0.55 * fa; ctx.strokeStyle = L.col; ctx.lineWidth = 3 * k; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 0.72, 0, TAU); ctx.stroke(); } // vòng thứ hai bám sau
      ctx.globalAlpha = 1;
    } else if (f.type === 'die') {
      // Quái chết: nháy trắng, co lại và mờ dần trong ~0.22 giây thay vì biến mất tức thì
      dieProxy.x = f.x; dieProxy.y = f.y; dieProxy.face = f.face; dieProxy.anim = f.anim; dieProxy.r = f.r;
      const big = f.kind === 'player' || ENEMIES[f.kind]?.boss;
      if (!big && a > 0.55 && (f.life < flashLife || (f.life === flashLife && ties-- <= 0))) f.dim = true; // bị bớt nháy khi quá flashMax; giữ mờ đến hết để không loé sáng lại
      dieProxy.flash = a > 0.55 && !f.dim && !calm() ? 1 : 0;
      const k = 0.55 + 0.45 * a;
      ctx.globalAlpha = Math.min(1, a * 1.4) * (f.dim ? 1 - D.dark : 1); // xác không được nháy thì mờ đi, chìm vào nền
      ctx.save(); ctx.translate(f.x, f.y + f.r * (1 - k)); ctx.scale(k, k); ctx.translate(-f.x, -f.y);
      draw(ctx, dieProxy, f.kind);
      ctx.restore(); ctx.globalAlpha = 1;
    } else if (f.type === 'ring') { // sóng đẩy lùi khi bị đánh / lên cấp
      ctx.globalAlpha = a; ctx.strokeStyle = f.color || '#fff'; ctx.lineWidth = 3 * a + 1;
      ctx.beginPath(); ctx.arc(f.x, f.y, (1 - a) * f.maxR, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
    } else if (f.type === 'chain') { // tia sét nảy: đường gấp khúc 4 điểm
      ctx.globalAlpha = a; ctx.strokeStyle = '#bfe6ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(f.x, f.y);
      for (let k = 1; k < 4; k++) { const u = k / 4; ctx.lineTo(f.x + (f.x2 - f.x) * u + rand(-5, 5), f.y + (f.y2 - f.y) * u + rand(-5, 5)); }
      ctx.lineTo(f.x2, f.y2); ctx.stroke(); ctx.globalAlpha = 1;
    } else if (f.type === 'lvl') {
      ctx.globalAlpha = a; ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(f.x, f.y, (1 - a) * 90 + 10, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
    }
  }
}

function render(alpha = 1) {
  const interp = alpha < 1 && G.stepId > 0;
  if (interp) lerpIn(alpha);
  try { renderScene(); } finally { if (interp) lerpOut(); }
}

// Quái + người chơi vẽ theo thứ tự Y tăng dần: vật đứng thấp hơn (gần người xem) đè lên vật đứng cao hơn.
const drawList = [];
const byY = (a, b) => a.y - b.y;
// Quầng sáng nhẹ sau lưng quái để tách khỏi nền tối (sprite ở Giai đoạn 2 sẽ có viền thật).
function drawBacklight(e) {
  ctx.fillStyle = 'rgba(190,170,255,0.13)';
  circle(ctx, e.x, e.y, e.r + 3);
}

// Boss xuất hiện: camera lia 70% quãng tới boss (0.5 giây), giữ 0.5 giây, lia về 0.4 giây
const cineOff = { x: 0, y: 0 };
function cineOffset(p) {
  cineOff.x = cineOff.y = 0;
  const c = G.cine; if (!c || c.t <= 0 || REDUCED_MOTION) return cineOff;
  const e = CFG.cine.dur - c.t, ease = u => u * u * (3 - 2 * u);
  const f = e < 0.5 ? ease(e / 0.5) : e < 1 ? 1 : 1 - ease(clamp((e - 1) / 0.4, 0, 1));
  cineOff.x = (c.x - p.x) * 0.7 * f; cineOff.y = (c.y - p.y) * 0.7 * f;
  return cineOff;
}

/* Cảnh nền menu (V5 Phase 9): camera lia chậm trên nền đợt 1, vài con quái lang thang, bụi lơ lửng.
   Không có người chơi, không gọi update(), không ghi gì vào G; không phát âm thanh. REDUCED_MOTION → một khung đứng yên.
   Chỉ được gọi từ frame() khi G.state === 'menu', nên vào ván là dừng hẳn. */
const attract = { t: 0, mobs: null, list: [] };
const ATTRACT_TYPES = ['bat', 'slime', 'skeleton', 'ghost', 'golem', 'bat', 'skeleton', 'slime'];
function renderAttract(dt) {
  const A = CFG.attract;
  if (!REDUCED_MOTION) attract.t += Math.min(dt, 0.1);
  const t = attract.t, cx = Math.sin(t * A.drift) * A.range * 0.6, cy = Math.sin(t * A.drift * 0.7 + 1) * A.range * 0.4;
  if (!attract.mobs) attract.mobs = Array.from({ length: A.enemies }, (_, i) => {
    const type = ATTRACT_TYPES[i % ATTRACT_TYPES.length];
    return { type, x: rand(-VW / 2, VW / 2), y: rand(-VH / 2, VH / 2), vx: 0, vy: 0, a: Math.random() * TAU, anim: Math.random() * 10, face: 1, flash: 0, sc: 1, r: ENEMIES[type].r, turn: rand(1, 3) };
  });
  for (const m of attract.mobs) {
    if (REDUCED_MOTION) break;
    m.turn -= dt; if (m.turn <= 0) { m.turn = rand(1.5, 4); m.a += rand(-1.6, 1.6); }
    if (Math.abs(m.x - cx) > VW * 0.55 || Math.abs(m.y - cy) > VH * 0.55) m.a = Math.atan2(cy - m.y, cx - m.x); // lạc xa thì quay về giữa
    const sp = ENEMIES[m.type].speed * 0.35; m.vx = Math.cos(m.a) * sp; m.vy = Math.sin(m.a) * sp;
    m.x += m.vx * Math.min(dt, 0.1); m.y += m.vy * Math.min(dt, 0.1); m.anim += Math.min(dt, 0.1); m.face = m.vx >= 0 ? 1 : -1;
  }
  const camX = snapPx(cx - VW / 2), camY = snapPx(cy - VH / 2);
  ctx.setTransform(ZOOM, 0, 0, ZOOM, -camX * ZOOM, -camY * ZOOM);
  tileGround(groundFor(0), camX, camY);
  const L = attract.list; L.length = 0; for (const m of attract.mobs) L.push(m); L.sort(byY);
  for (const m of L) { if (Assets.get(m.type)) drawShadow(m); draw(ctx, m, m.type); }
  ctx.setTransform(SCREEN, 0, 0, SCREEN, 0, 0);
  if (lightOn()) drawWeather(camX, camY, t, 0);
  drawVignette(0, 0);
  drawMotes(camX, camY, t, 0);
}

function renderScene() {
  const p = G.player;
  const sh = G.shake * 0.5;
  const shx = sh ? rand(-sh, sh) : 0, shy = sh ? rand(-sh, sh) : 0;
  const co = cineOffset(p);
  const camX = snapPx(p.x - VW / 2 + shx + co.x), camY = snapPx(p.y - VH / 2 + shy + co.y);

  ctx.setTransform(ZOOM, 0, 0, ZOOM, -camX * ZOOM, -camY * ZOOM);
  drawGround(camX, camY);
  if (G.decals.length) drawDecals();
  const x0 = camX - 60, x1 = camX + VW + 60, y0 = camY - 60, y1 = camY + VH + 60;
  const vis = o => o.x > x0 && o.x < x1 && o.y > y0 && o.y < y1;
  drawAura(p);
  drawZones();
  drawSfx(true, vis);
  drawGlows(vis);
  for (const g of G.gems.items) {
    if (!vis(g)) continue;
    draw(ctx, g, g.kind);
  }

  drawList.length = 0;
  for (const e of G.enemies.items) if (vis(e)) drawList.push(e);
  drawList.push(p);
  drawList.sort(byY);
  for (let i = 0; i < drawList.length; i++) {
    const o = drawList[i];
    if (o === p) {
      if (p.hp <= 0) continue; // đã gục: hiệu ứng 'die' thay thế
      const spr = Assets.get('player');
      if (spr) {
        drawShadow(p);
        // bóng mờ khi lướt
        for (let k = 0; k < p.trail.length; k++) { const tr = p.trail[k]; if (G.t - tr.t > 0.2) break; ctx.globalAlpha = [0.35, 0.22, 0.1][k]; draw(ctx, { ...p, x: tr.x, y: tr.y, hurtT: 0 }, 'player'); }
        ctx.globalAlpha = 1;
        if (p.iframe > 0 && !(p.dashT > 0) && Math.floor(G.t * 20) % 2) ctx.globalAlpha = 0.45; // nhấp nháy khi bất tử (không nhấp nháy khi lướt)
      }
      draw(ctx, p, 'player');
      ctx.globalAlpha = 1;
      drawPlayerBuffs(p);
      drawBar(p.x - 11, p.y + 16, 22, 3, p.hp / p.maxHp, (p.hpLag || 0) / p.maxHp, '#e0405a');
      if (p.dashCd > 0) { ctx.fillStyle = '#7fd4ff'; ctx.fillRect(p.x - 11, p.y + 21, 22 * (1 - p.dashCd / CFG.dash.cd), 1); } // hồi lướt
    } else {
      if (Assets.get(o.type)) drawShadow(o); else drawBacklight(o);
      if (o.tele && o.boss) drawTelegraph(o);
      if (o.fade) ctx.globalAlpha = 1 - o.fade * 0.85;        // boss đang dịch chuyển: mờ dần
      draw(ctx, o, o.type);
      if (o.stunT > 0) { ctx.fillStyle = '#ffd166'; for (let k = 0; k < 3; k++) { const a = G.t * 6 + k * TAU / 3; circle(ctx, o.x + Math.cos(a) * o.r * 0.8, o.y - o.r - 4 + Math.sin(a) * 2, 1.5); } } // sao choáng
      if (o.frozen) { // bị đóng băng: phủ lớp trắng xanh + vũng băng dưới chân
        const f = o.flash; o.flash = 1; ctx.globalAlpha = 0.45; draw(ctx, o, o.type); o.flash = f; ctx.globalAlpha = 1;
        ctx.fillStyle = 'rgba(150,210,255,0.35)'; ellipse(ctx, o.x, o.y + o.r * 0.85, o.r, o.r * 0.35);
      }
      ctx.globalAlpha = 1;
      if (o.tele && !o.boss) drawTelegraph(o);
      if (o.elite) drawBar(o.x - 10, o.y - o.r - 8, 20, 2, o.hp / o.maxHp, (o.hpLag || 0) / o.maxHp, '#ffd166');
    }
  }
  // Boss đứng đè lên người chơi: vẽ lại người chơi mờ + vòng vàng dưới chân để không mất dấu
  const bb = G.boss;
  if (bb && !bb.dead && p.hp > 0 && bb.y > p.y && Math.hypot(bb.x - p.x, bb.y - p.y) < bb.r + 40) {
    ctx.globalAlpha = 0.6; draw(ctx, p, 'player'); ctx.globalAlpha = 1;
    ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(p.x, p.y + p.r * 0.85, p.r + 3, (p.r + 3) * 0.4, 0, 0, TAU); ctx.stroke();
  }
  drawOrbit(p);
  for (const b of G.bullets.items) {
    if (!vis(b)) continue;
    const kl = b.kind === 'knife' && b.tier > 1;
    if (kl) drawKnifeLook(b, false);
    draw(ctx, b, b.kind);
    if (kl) drawKnifeLook(b, true);
  }
  for (const q of G.parts.items) {
    if (!vis(q)) continue;
    ctx.globalAlpha = clamp(q.life / q.max, 0, 1); ctx.fillStyle = q.color;
    ctx.fillRect(q.x - q.size / 2, q.y - q.size / 2, q.size, q.size);
  }
  ctx.globalAlpha = 1;
  drawFx();
  drawSfx(false, vis);
  if (lightOn()) {
    drawLights(camX, camY);
    ctx.setTransform(SCREEN, 0, 0, SCREEN, 0, 0); drawWeather(camX, camY, G.t, waveIdx());   // sương/tro trên lightmap, dưới đạn quái
    ctx.setTransform(ZOOM, 0, 0, ZOOM, -camX * ZOOM, -camY * ZOOM);
  }
  for (const s of G.shots.items) if (vis(s)) draw(ctx, s, 'shot'); // đạn quái luôn nằm trên mọi hiệu ứng
  drawWarnings(p);
  drawTexts(vis);
  // chỉ hướng boss khi boss ngoài màn hình
  const b = G.boss;
  if (b && !b.dead && !(b.x > camX && b.x < camX + VW && b.y > camY && b.y < camY + VH)) {
    const ang = Math.atan2(b.y - p.y, b.x - p.x), rr = Math.min(VW, VH) / 2 - 16;
    const ax = p.x + Math.cos(ang) * rr, ay = p.y + Math.sin(ang) * rr;
    ctx.save(); ctx.translate(ax, ay); ctx.rotate(ang); ctx.fillStyle = '#ff3b5c';
    poly(ctx, [8, 0, -6, -6, -3, 0, -6, 6]); ctx.restore();
  }

  ctx.setTransform(SCREEN, 0, 0, SCREEN, 0, 0); // về toạ độ màn hình (px CSS)
  drawVignette(p.hurtT);
  drawMotes(camX, camY);
  if (G.freezeT > 0) { ctx.fillStyle = 'rgba(150,210,255,0.08)'; ctx.fillRect(0, 0, W, H); }
  if (G.flashT > 0) { ctx.globalAlpha = Math.min(1, G.flashT / 0.35) * (SETTINGS.noFlash ? 0.15 : 0.6); ctx.fillStyle = G.flashColor; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  if (G.zapFlash > 0 && !SETTINGS.noFlash) { ctx.globalAlpha = G.zapFlashA * G.zapFlash / 0.1; ctx.fillStyle = '#dff4ff'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; } // Lôi Phạt bậc 3: loé rất nhẹ
}
