'use strict';
/* =========================================================
   ÂM THANH
   - Hiệu ứng (SFX): file .ogg của Kenney (CC0) nếu nạp được, không thì âm tổng hợp WebAudio.
   - Nhạc nền: 2 bản chiptune của Juhani Junkala (CC0), nén Opus/WebM; đổi bản khi có boss,
     nhỏ lại khi tạm dừng / chọn thẻ. Không nạp được (vd mở bằng file://) thì im lặng.
   Sơ đồ: nguồn → [sfxBus | synthBus] → sfxGain ┐
                                    nhạc → musicGain ┴→ master (tắt tiếng) → loa
   ========================================================= */

// tên âm: các biến thể (chọn ngẫu nhiên), âm lượng riêng, số bản phát cùng lúc tối đa
const SFX_FILES = {
  hit:    { files: ['impactPunch_medium_000', 'impactPunch_medium_001', 'impactPunch_medium_002', 'impactPunch_medium_003', 'impactPunch_medium_004'], vol: 0.3, max: 4 },
  kill:   { files: ['impactSoft_heavy_000', 'impactSoft_heavy_001', 'impactSoft_heavy_002'], vol: 0.45, max: 4 },
  hurt:   { files: ['impactPunch_heavy_000', 'impactPunch_heavy_001'], vol: 0.7, max: 1 },
  knife:  { files: ['knifeSlice', 'knifeSlice2'], vol: 0.35, max: 3 },
  orb:    { files: ['chop'], vol: 0.3, max: 3 },
  gem:    { files: ['glass_001', 'glass_002', 'glass_003'], vol: 0.3, max: 3 },
  select: { files: ['select_001', 'select_002'], vol: 0.6, max: 1 },
  chest:  { files: ['handleCoins', 'handleCoins2'], vol: 0.8, max: 1 },
};
const MUSIC = {
  normal: { src: 'assets/music/level1.webm', vol: 0.55 },
  boss:   { src: 'assets/music/level3.webm', vol: 0.6 },
};

const SFX = {
  ctx: null, master: null, sfxGain: null, musicGain: null, synthBus: null, noiseBuf: null,
  last: {}, active: {}, bufs: {}, music: {}, track: null, trackNode: null, ducked: false,
  muted: store.get('vs_muted', false),

  init() {
    if (this.ctx) { this.ctx.resume(); return; }
    try {
      const c = this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = c.createGain(); this.master.gain.value = this.muted ? 0 : 1; this.master.connect(c.destination);
      this.sfxGain = c.createGain(); this.sfxGain.connect(this.master);
      this.musicGain = c.createGain(); this.musicGain.connect(this.master);
      this.synthBus = c.createGain(); this.synthBus.gain.value = 0.35; this.synthBus.connect(this.sfxGain);
      this.applyVolumes();
      const len = c.sampleRate; this.noiseBuf = c.createBuffer(1, len, c.sampleRate);
      const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.loadFiles();
    } catch (e) { this.ctx = null; }
  },

  // Nạp file song song; lỗi file nào thì âm đó dùng bản tổng hợp
  loadFiles() {
    const load = url => fetch(url).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then(b => new Promise((ok, fail) => this.ctx.decodeAudioData(b, ok, fail)));
    for (const [name, def] of Object.entries(SFX_FILES)) {
      Promise.all(def.files.map(f => load(`assets/sfx/${f}.ogg?v=g4`)))
        .then(list => { this.bufs[name] = list; })
        .catch(() => console.warn('Không nạp được âm', name, '— dùng âm tổng hợp'));
    }
    for (const [key, m] of Object.entries(MUSIC)) {
      load(m.src + '?v=g4').then(buf => { this.music[key] = { buf, ...trimSilence(buf) }; })
        .catch(() => console.warn('Không nạp được nhạc', key));
    }
  },

  applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.sfxGain.gain.setTargetAtTime(SETTINGS.sfxVol, t, 0.02);
    this.musicGain.gain.setTargetAtTime(SETTINGS.musicVol * (this.ducked ? 0.3 : 1), t, 0.15);
  },

  /* ---------- âm tổng hợp (dự phòng + các âm phép thuật không có file) ---------- */
  tone(type, f0, f1, dur, vol, t) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.synthBus); o.start(t); o.stop(t + dur + 0.02);
  },
  noise(dur, vol, freq, t) {
    const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noiseBuf; f.type = 'lowpass'; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f).connect(g).connect(this.synthBus); s.start(t); s.stop(t + dur + 0.02);
  },
  arp(notes, step, type, vol, t) { notes.forEach((f, i) => this.tone(type, f, f, step * 1.5, vol, t + i * step)); },
  defs: {
    shoot:   { gap: 0.05, fn: (s, t) => s.tone('square', 900, 300, 0.08, 0.05, t) },
    knife:   { gap: 0.06, fn: (s, t) => { s.noise(0.06, 0.08, 5000, t); s.tone('triangle', 1400, 700, 0.05, 0.04, t); } },
    orb:     { gap: 0.08, fn: (s, t) => s.tone('sine', 700, 480, 0.06, 0.06, t) },
    zap:     { gap: 0.1,  fn: (s, t) => { s.noise(0.25, 0.28, 4000, t); s.tone('sawtooth', 130, 40, 0.25, 0.12, t); } },
    nova:    { gap: 0.2,  fn: (s, t) => { s.tone('sine', 170, 40, 0.4, 0.35, t); s.noise(0.3, 0.12, 700, t); } },
    hit:     { gap: 0.03, fn: (s, t) => s.noise(0.05, 0.13, 2500, t) },
    kill:    { gap: 0.04, fn: (s, t, r) => { s.noise(0.12, 0.16, 900 * r, t); s.tone('triangle', 220 * r, 60, 0.12, 0.1, t); } },
    gem:     { gap: 0.03, fn: (s, t, r) => s.tone('sine', rand(1050, 1250) * r, 1800 * r, 0.07, 0.09, t) },
    heal:    { gap: 0.2,  fn: (s, t) => s.arp([660, 880, 1100], 0.06, 'sine', 0.12, t) },
    level:   { gap: 0.2,  fn: (s, t) => s.arp([523, 659, 784, 1047], 0.08, 'square', 0.07, t) },
    select:  { gap: 0.05, fn: (s, t) => s.tone('triangle', 660, 990, 0.1, 0.15, t) },
    chest:   { gap: 0.5,  fn: (s, t) => s.arp([523, 659, 784, 1047, 1319, 1568], 0.07, 'triangle', 0.16, t) },
    eshoot:  { gap: 0.1,  fn: (s, t) => s.tone('square', 520, 240, 0.12, 0.04, t) },
    hurt:    { gap: 0.15, fn: (s, t) => s.tone('sawtooth', 220, 70, 0.18, 0.18, t) },
    boss:    { gap: 2,    fn: (s, t) => { s.tone('sawtooth', 82, 55, 1.4, 0.25, t); s.tone('square', 123, 82, 1.4, 0.1, t); s.noise(1.2, 0.14, 300, t); } },
    bossdie: { gap: 1,    fn: (s, t) => { s.noise(0.9, 0.3, 900, t); s.tone('sawtooth', 220, 30, 0.9, 0.2, t); } },
    death:   { gap: 1,    fn: (s, t) => { s.tone('sawtooth', 300, 40, 0.9, 0.22, t); s.noise(0.6, 0.2, 600, t); } },
    warn:      { gap: 0.3,  fn: (s, t) => { s.tone('square', 196, 262, 0.22, 0.05, t); s.tone('square', 262, 196, 0.22, 0.04, t + 0.12); } },
    slam:      { gap: 0.12, fn: (s, t) => { s.tone('sine', 120, 35, 0.35, 0.35, t); s.noise(0.3, 0.2, 500, t); } },
    crate:     { gap: 0.05, fn: (s, t) => { s.noise(0.12, 0.2, 1400, t); s.tone('triangle', 260, 90, 0.1, 0.12, t); } },
    pickup:    { gap: 0.1,  fn: (s, t) => s.arp([784, 1047, 1319], 0.05, 'triangle', 0.14, t) },
    shieldHit: { gap: 0.1,  fn: (s, t) => { s.tone('sine', 1200, 600, 0.18, 0.15, t); s.noise(0.1, 0.1, 6000, t); } },
    bomb:      { gap: 0.5,  fn: (s, t) => { s.noise(1.0, 0.4, 1200, t); s.tone('sawtooth', 160, 30, 0.8, 0.25, t); } },
    freeze:    { gap: 0.5,  fn: (s, t) => { s.arp([1568, 1319, 1047, 784], 0.05, 'sine', 0.12, t); s.noise(0.5, 0.08, 8000, t); } },
    dash:    { gap: 0.1,  fn: (s, t) => { s.noise(0.08, 0.12, 3000, t); s.tone('triangle', 500, 900, 0.08, 0.06, t); } },
    // V5 Phase 7 (chỉ âm tổng hợp, không có file): mốc combo, nghi thức mở rương, hết nguy kịch
    combo:   { gap: 0.3,  fn: (s, t) => s.arp([784, 1175, 1568], 0.045, 'square', 0.06, t) },
    chestArp:{ gap: 1,    fn: (s, t) => { s.arp([392, 494, 587, 784, 988, 1175, 1568], 0.09, 'triangle', 0.15, t); s.tone('sine', 1568, 2093, 0.6, 0.06, t + 0.7); } },
    calm:    { gap: 1,    fn: (s, t) => s.arp([523, 659], 0.12, 'sine', 0.07, t) },
    win:     { gap: 2,    fn: (s, t) => s.arp([392, 523, 659, 784, 1047, 784, 1047, 1319], 0.12, 'triangle', 0.18, t) },
  },

  /* ---------- phát hiệu ứng ---------- */
  // rate: hệ số cao độ (vd chuỗi nhặt ngọc)
  play(name, rate = 1) {
    if (this.muted || !this.ctx) return;
    const d = this.defs[name], t = this.ctx.currentTime;
    if (this.last[name] && t - this.last[name] < d.gap) return;
    const bufs = this.bufs[name], def = SFX_FILES[name];
    if (bufs) {
      // Giới hạn số bản cùng loại đang phát: 300 quái chết cùng lúc không làm vỡ tiếng
      if ((this.active[name] || 0) >= def.max) return;
      this.last[name] = t;
      const src = this.ctx.createBufferSource(), g = this.ctx.createGain();
      src.buffer = bufs[Math.floor(Math.random() * bufs.length)];
      src.playbackRate.value = rate * (1 + rand(-0.05, 0.05));   // lệch cao độ ±5% cho đỡ nhàm
      g.gain.value = def.vol;
      src.connect(g).connect(this.sfxGain);
      this.active[name] = (this.active[name] || 0) + 1;
      src.onended = () => { this.active[name]--; };
      src.start(t);
      return;
    }
    this.last[name] = t; d.fn(this, t, rate);
  },

  /* ---------- nhạc nền ---------- */
  // Gọi mỗi khung: tự chọn bản nhạc theo trạng thái game, chỉ làm gì khi có thay đổi.
  sync() {
    if (!this.ctx) return;
    const want = (G.state === 'menu' || G.state === 'over') ? null : (G.boss && !G.boss.dead ? 'boss' : 'normal');
    if (want !== this.track && (want === null || this.music[want])) this.switchTrack(want);
    const duck = G.state === 'paused' || G.state === 'levelup';
    if (duck !== this.ducked) { this.ducked = duck; this.applyVolumes(); }
  },
  switchTrack(key) {
    const c = this.ctx, t = c.currentTime, FADE = 1.2;
    if (this.trackNode) { // tắt dần bản đang phát
      const { src, gain } = this.trackNode;
      gain.gain.setTargetAtTime(0, t, FADE / 4); src.stop(t + FADE * 1.5);
      this.trackNode = null;
    }
    this.track = key;
    if (!key) return;
    const m = this.music[key], src = c.createBufferSource(), gain = c.createGain();
    src.buffer = m.buf; src.loop = true; src.loopStart = m.start; src.loopEnd = m.end;
    gain.gain.setValueAtTime(0, t); gain.gain.setTargetAtTime(MUSIC[key].vol, t, FADE / 4);
    src.connect(gain).connect(this.musicGain);
    src.start(t, m.start);
    this.trackNode = { src, gain };
  },

  toggle() {
    this.muted = !this.muted; store.set('vs_muted', this.muted); updateMuteBtn();
    if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : 1, this.ctx.currentTime, 0.02);
  },
};

// Tìm đoạn có tiếng thật trong bản nhạc (bỏ khoảng lặng đầu/cuối do bộ mã hoá) để vòng lặp liền mạch
function trimSilence(buf) {
  const d = buf.getChannelData(0), n = d.length, th = 1e-3;
  let a = 0, b = n - 1;
  while (a < n && Math.abs(d[a]) < th) a++;
  while (b > a && Math.abs(d[b]) < th) b--;
  return { start: a / buf.sampleRate, end: (b + 1) / buf.sampleRate };
}
