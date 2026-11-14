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
  if (code === 'Escape' && metaOpen()) openMeta(false);
  else if (code === 'Escape' || code === 'KeyP') togglePause();
  else if (code === 'KeyM') SFX.toggle();
  else if (code === 'KeyF') { const el = document.getElementById('fps'); el.style.display = el.style.display === 'block' ? 'none' : 'block'; }
  else if (G.state === 'levelup' && /^(Digit|Numpad)[123]$/.test(code)) { const u = G.choices[+code.slice(-1) - 1]; if (u) choose(u); }
  else if ((code === 'Space' || code === 'ShiftLeft' || code === 'ShiftRight') && G.state === 'play') tryDash();
  else if (G.state === 'levelup' && code === 'KeyR') reroll();
  else if (G.state === 'menu' && !metaOpen() && (code === 'Enter' || code === 'Space' || code === 'NumpadEnter')) startGame();
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
  const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
  iv.x = x; iv.y = y;
  return iv;
}
