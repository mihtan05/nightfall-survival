'use strict';
/* =========================================================
   TIỆN ÍCH
   ========================================================= */
const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
function hash(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}
function pickWeighted(mix) {
  let total = 0; for (const k in mix) total += mix[k];
  let r = Math.random() * total;
  for (const k in mix) { r -= mix[k]; if (r <= 0) return k; }
  return Object.keys(mix)[0];
}
const store = {
  failed: false,
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  // Ghi lỗi (bộ nhớ đầy / bị chặn): báo người chơi MỘT lần bằng thông báo nhỏ, game vẫn chạy tiếp
  set(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); return true; }
    catch (e) {
      if (!store.failed) { store.failed = true; console.warn('Không lưu được', k, e); if (typeof showToast === 'function') showToast({ id: 'saveFail', text: 'Không lưu được tiến trình (bộ nhớ trình duyệt đầy hoặc bị chặn)' }); }
      return false;
    }
  },
};

/* Bắt lỗi toàn cục (C1): lỗi JS bất kỳ → hộp báo lỗi + nút Tải lại / Bỏ qua, ván đang chơi tự tạm dừng.
   Không có hộp này thì một lỗi lặp trong update() làm game đứng hình im lặng. */
const errBox = { n: 0, last: '' };
function reportError(msg) {
  errBox.n++; errBox.last = String(msg || 'Lỗi không rõ').slice(0, 160);
  if (!document.body) { addEventListener('DOMContentLoaded', () => showErrBox()); return; }
  showErrBox();
}
function showErrBox() {
  let el = document.getElementById('errBox');
  if (!el) {
    el = document.createElement('div'); el.id = 'errBox'; el.setAttribute('role', 'alert');
    el.innerHTML = '<b>Có lỗi xảy ra</b><span></span><div><button class="btn" id="errReload" type="button">Tải lại</button><button class="btn ghost" id="errHide" type="button">Bỏ qua</button></div>';
    document.body.append(el);
    el.querySelector('#errReload').addEventListener('click', () => location.reload());
    el.querySelector('#errHide').addEventListener('click', () => el.classList.remove('show'));
  }
  el.querySelector('span').textContent = errBox.last + (errBox.n > 1 ? ` (×${errBox.n})` : '');
  el.classList.add('show');
  try { if (typeof G !== 'undefined' && G.state === 'play' && typeof togglePause === 'function') togglePause(); } catch {}
}
addEventListener('error', e => reportError(e.message || (e.error && e.error.message)));
addEventListener('unhandledrejection', e => reportError('Promise: ' + ((e.reason && e.reason.message) || e.reason)));
const fmtTime = t => { const s = Math.floor(t); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };

class Pool {
  constructor(make) { this.make = make; this.items = []; this.free = []; }
  get() { const o = this.free.pop() || this.make(); o.dead = false; this.items.push(o); return o; }
  sweep() {
    const it = this.items; let j = 0;
    for (let i = 0; i < it.length; i++) { const o = it[i]; if (o.dead) this.free.push(o); else it[j++] = o; }
    it.length = j;
  }
  clear() { for (const o of this.items) o.dead = true; this.sweep(); }
}

class Grid {
  constructor(cell) { this.cell = cell; this.map = new Map(); }
  key(cx, cy) { return (cx + 32768) * 65536 + (cy + 32768); }
  reset() {
    if (this.map.size > 4000) this.map.clear();
    else for (const a of this.map.values()) a.length = 0;
  }
  insert(o) {
    const k = this.key(Math.floor(o.x / this.cell), Math.floor(o.y / this.cell));
    let a = this.map.get(k); if (!a) { a = []; this.map.set(k, a); }
    a.push(o);
  }
  query(x, y, r, out) {
    out.length = 0; const c = this.cell;
    const x0 = Math.floor((x - r) / c), x1 = Math.floor((x + r) / c);
    const y0 = Math.floor((y - r) / c), y1 = Math.floor((y + r) / c);
    for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
      const a = this.map.get(this.key(cx, cy));
      if (a) for (let i = 0; i < a.length; i++) out.push(a[i]);
    }
    return out;
  }
}
