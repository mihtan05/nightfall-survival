'use strict';
/* =========================================================
   INPUT
   ========================================================= */
/* Đọc phím VẬT LÝ (e.code) thay vì ký tự (e.key): bộ gõ tiếng Việt (Telex) biến
   w → ư, a/s/d thành phím dấu hoặc trả key = "Process", nhưng e.code vẫn là KeyW/KeyA...
   Mỗi hướng lưu thứ tự bấm: giữ A rồi bấm D thì D thắng, nhả D lại quay về A. */
const KEY_TO_CODE = {
  w: 'KeyW', a: 'KeyA', s: 'KeyS', d: 'KeyD', p: 'KeyP', m: 'KeyM', f: 'KeyF', r: 'KeyR', shift: 'ShiftLeft',
  arrowup: 'ArrowUp', arrowdown: 'ArrowDown', arrowleft: 'ArrowLeft', arrowright: 'ArrowRight',
  escape: 'Escape', enter: 'Enter', ' ': 'Space', '1': 'Digit1', '2': 'Digit2', '3': 'Digit3',
};
const CODE_DIR = {
  KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
};
const held = new Map(); // code -> thứ tự bấm
let pressSeq = 0;
const joy = { active: false, id: null, ox: 0, oy: 0, dx: 0, dy: 0 };
const joyEl = document.getElementById('joy'), knobEl = document.getElementById('knob');

function keyCode(e) { return e.code || KEY_TO_CODE[(e.key || '').toLowerCase()] || ''; }
function releaseAllKeys() { held.clear(); }

addEventListener('keydown', e => {
  const code = keyCode(e);
  if (CODE_DIR[code]) {
    e.preventDefault();
    if (!held.has(code)) held.set(code, ++pressSeq);
    return;
  }
  if (code === 'Space') e.preventDefault();
  if (e.repeat) return;
  if (cere.on) { e.preventDefault(); endCere(); return; } // mở rương: phím bất kỳ để bỏ qua
  if (endPanelKey(code)) { e.preventDefault(); return; }   // màn kết thúc: khoá phím lúc đầu, hiện hết, chơi lại (R / Enter / Space)
  if (code === 'Escape' && setOpen()) openSettings(false);
  else if (code === 'Escape' && metaOpen()) openMeta(false);
  else if (code === 'Escape' && bookOpen()) openBook(false);
  else if (code === 'Escape' || code === 'KeyP') togglePause();
  else if (code === 'KeyM') SFX.toggle();
  else if (code === 'KeyF') { const el = document.getElementById('fps'); el.style.display = el.style.display === 'block' ? 'none' : 'block'; }
  else if (G.state === 'levelup' && /^(Digit|Numpad)[123]$/.test(code)) { const u = G.choices[+code.slice(-1) - 1]; if (u) choose(u); }
  else if ((code === 'Space' || code === 'ShiftLeft' || code === 'ShiftRight') && G.state === 'play') tryDash();
  else if (G.state === 'levelup' && code === 'KeyR') reroll();
  else if (G.state === 'menu' && !metaOpen() && !bookOpen() && !setOpen() && (code === 'Enter' || code === 'Space' || code === 'NumpadEnter')) startGame();
});
addEventListener('keyup', e => held.delete(keyCode(e)));
// Mất focus thì trình duyệt không gửi keyup: phải xả phím để không bị "kẹt" chạy một hướng.
addEventListener('blur', () => { releaseAllKeys(); endJoy(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { releaseAllKeys(); endJoy(); } });
// Nút đã bấm chuột không giữ focus, để Space/Enter không kích hoạt lại nút đó.
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('button'); if (b) b.blur(); });

cv.addEventListener('pointerdown', e => {
  if (G.state !== 'play' || joy.active) return;
  joy.active = true; joy.id = e.pointerId; joy.ox = e.clientX; joy.oy = e.clientY; joy.dx = joy.dy = 0;
  try { cv.setPointerCapture(e.pointerId); } catch {}
  joyEl.style.left = e.clientX + 'px'; joyEl.style.top = e.clientY + 'px'; joyEl.style.display = 'block';
  knobEl.style.transform = 'translate(0,0)';
});
cv.addEventListener('pointermove', e => {
  if (!joy.active || e.pointerId !== joy.id) return;
  let dx = (e.clientX - joy.ox) / 50, dy = (e.clientY - joy.oy) / 50;
  const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
  joy.dx = dx; joy.dy = dy;
  knobEl.style.transform = `translate(${dx * 36}px,${dy * 36}px)`;
});
// Nút lướt cảm ứng: phần tử riêng nằm trên canvas nên không khởi động joystick
const dashBtn = document.getElementById('dashBtn');
dashBtn.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); tryDash(); });
function endJoy() { joy.active = false; joy.id = null; joy.dx = joy.dy = 0; joyEl.style.display = 'none'; }
// Nhả ngón ở bất kỳ đâu (kể cả ngoài canvas / ngoài cửa sổ) đều kết thúc joystick.
for (const t of [window, cv]) {
  t.addEventListener('pointerup', e => { if (e.pointerId === joy.id) endJoy(); });
  t.addEventListener('pointercancel', e => { if (e.pointerId === joy.id) endJoy(); });
}
cv.addEventListener('lostpointercapture', e => { if (e.pointerId === joy.id) endJoy(); });

/* Tay cầm (C5, B18) — gọi mỗi khung từ frame(). Trong ván: cần trái / D-pad di chuyển, A lướt, Start tạm dừng.
   Ngoài ván: D-pad / cần chuyển focus giữa các nút của bảng trên cùng, A bấm nút đang focus (chưa focus thì chọn nút mặc định),
   B = Esc, X = đổi thẻ, màn kết thúc A = Enter (đi qua endPanelKey). Thanh trượt âm lượng chưa chỉnh được bằng tay cầm. */
const pad = { dx: 0, dy: 0, was: [], nav: 0 };
function padKey(code) { dispatchEvent(new KeyboardEvent('keydown', { code })); dispatchEvent(new KeyboardEvent('keyup', { code })); }
// Chuyển focus trong bảng trên cùng; trả về phần tử ĐANG focus từ trước (null nếu lần này mới đặt focus)
function padFocus(step) {
  const tops = document.querySelectorAll('.overlay.show'), top = tops[tops.length - 1]; if (!top) return null;
  const els = [...top.querySelectorAll('button:not([disabled]), input')].filter(e => e.getClientRects().length), i = els.indexOf(document.activeElement);
  const el = i < 0 ? top.querySelector('.card, #startBtn, #resumeBtn') || els[0] : els[(i + step + els.length) % els.length];
  if (el) { const changed = el !== document.activeElement; el.focus(); if (changed) SFX.play('hover'); }
  return i < 0 ? null : el;
}
function pollPad() {
  const gp = navigator.getGamepads ? [...navigator.getGamepads()].find(g => g && g.connected) : null;
  if (!gp) { pad.dx = pad.dy = 0; return; }
  const b = i => !!(gp.buttons[i] && gp.buttons[i].pressed), hit = i => b(i) && !pad.was[i], D = CFG.pad.dead;
  const x = (b(15) ? 1 : 0) - (b(14) ? 1 : 0) + (Math.abs(gp.axes[0]) > D ? gp.axes[0] : 0), y = (b(13) ? 1 : 0) - (b(12) ? 1 : 0) + (Math.abs(gp.axes[1]) > D ? gp.axes[1] : 0);
  const play = G.state === 'play' && !cere.on;
  pad.dx = play ? x : 0; pad.dy = play ? y : 0;
  if (hit(9)) padKey('Escape');
  if (play) { if (hit(0)) tryDash(); }
  else {
    const nav = Math.abs(x) > 0.5 || Math.abs(y) > 0.5 ? (Math.abs(x) > Math.abs(y) ? Math.sign(x) : Math.sign(y)) : 0;
    if (nav && nav !== pad.nav) padFocus(nav);
    pad.nav = nav;
    if (hit(0)) {
      if (cere.on || G.state === 'over') padKey('Enter');
      else { const el = padFocus(0); if (el) { el.click(); if (el.isConnected) el.focus(); } }
    }
    if (hit(1)) padKey('Escape');
    if (hit(2)) padKey('KeyR');
  }
  for (let i = 0; i < 16; i++) pad.was[i] = b(i);
}

// Lấy hướng mới bấm nhất trong một trục (0 nếu không giữ phím nào)
function axis(negDir, posDir) {
  let negSeq = 0, posSeq = 0;
  for (const [code, seq] of held) {
    const d = CODE_DIR[code];
    if (d === negDir && seq > negSeq) negSeq = seq;
    else if (d === posDir && seq > posSeq) posSeq = seq;
  }
  return negSeq > posSeq ? -1 : posSeq > negSeq ? 1 : 0;
}
const iv = { x: 0, y: 0 }; // dùng lại mỗi bước, không tạo rác
function inputVec() {
  let x = axis('left', 'right'), y = axis('up', 'down');
  if (joy.active) { x += joy.dx; y += joy.dy; }
  x += pad.dx; y += pad.dy;
  const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
  iv.x = x; iv.y = y;
  return iv;
}
