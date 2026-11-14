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
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
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
