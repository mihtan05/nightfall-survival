'use strict';
/* =========================================================
   ÂM THANH
   - Hiệu ứng (SFX): file .ogg/.wav CC0 (Kenney; "512 Sound Effects" của Juhani Junkala) nếu nạp được, không thì âm tổng hợp WebAudio.
     MỌI âm đều có bản tổng hợp trong `defs` để dự phòng (file://, thiếu file, lỗi giải mã).
   - Nhạc nền: 2 bản chiptune của Juhani Junkala (CC0), nén Opus/WebM; đổi bản khi có boss,
     nhỏ lại + lọc trầm khi tạm dừng / chọn thẻ. Không nạp được (vd mở bằng file://) thì im lặng.
   Sơ đồ (V5 Phase 6):
     nguồn → [panner] → duckBus ─┐                     (âm thường, bị nén khi có âm quan trọng)
     nguồn → [panner] → priBus  ─┼→ sfxGain ┐          (âm quan trọng: bị đánh, boss gầm, lên cấp…)
     tổng hợp → synthBus → duckBus / synthPri → priBus  │
     nhạc → musicGain → musicLP (lọc thông thấp) ───────┴→ master (tắt tiếng) → limiter → post → loa
   Số phối âm ở CFG.audio (data.js); âm báo trước kỹ năng boss ở WINDUP_CUES.
   ========================================================= */

/* tên âm: các biến thể (chọn ngẫu nhiên), số bản phát cùng lúc tối đa (max), vai (role → âm lượng theo RMS đo được,
   xem CFG.audio.roleDb), vol = âm lượng dự phòng khi chưa đo được, steal = đầy giọng thì cướp giọng cũ nhất thay vì bỏ
   (âm dày nên theo cú đánh mới nhất), layers = âm tổng hợp phát kèm (lớp lấp lánh…), duck = nén bus thường khi phát. */
const SFX_FILES = {
  // va chạm vật lý: Kenney Impact/RPG (giữ từ trước)
  hit:    { files: ['impactPunch_medium_000', 'impactPunch_medium_001', 'impactPunch_medium_002', 'impactPunch_medium_003', 'impactPunch_medium_004'], vol: 0.3, max: 4, role: 'frequent', steal: true },
  kill:   { files: ['impactSoft_heavy_000', 'impactSoft_heavy_001', 'impactSoft_heavy_002'], vol: 0.45, max: 4, role: 'frequent', steal: true },
  hurt:   { files: ['impactPunch_heavy_000', 'impactPunch_heavy_001'], vol: 0.7, max: 1, role: 'danger', duck: true },
  knife:  { files: ['knifeSlice', 'knifeSlice2'], vol: 0.35, max: 3, role: 'frequent', steal: true },
  orb:    { files: ['chop'], vol: 0.3, max: 3, role: 'frequent', steal: true },
  gem:    { files: ['glass_001', 'glass_002', 'glass_003'], vol: 0.3, max: 3, role: 'frequent', steal: true },
  select: { files: ['select_001', 'select_002'], vol: 0.6, max: 1, role: 'ui' },
  // V5 Phase 6 — r5_* = "512 Sound Effects" (Juhani Junkala), kd_/ki_/kj_ = Kenney Digital / Interface / Music Jingles.
  // Chọn từ số đo + tên file (tools/sfx-audition.html), còn chờ người dùng nghe duyệt.
  shoot:     { files: ['r5_wpn_laser1.wav'], vol: 0.3, max: 3, role: 'frequent', steal: true },
  zap:       { files: ['r5_exp_shortest_hard1.wav'], vol: 0.4, max: 3, role: 'frequent', steal: true },
  nova:      { files: ['r5_exp_short_soft1.wav'], vol: 0.4, max: 2, role: 'frequent', steal: true },
  eshoot:    { files: ['r5_wpn_laser9.wav'], vol: 0.3, max: 3, role: 'ui', steal: true },
  crate:     { files: ['r5_sounds_impact5.wav'], vol: 0.4, max: 2, role: 'frequent' },
  heal:      { files: ['r5_sounds_powerup3.wav'], vol: 0.5, max: 1, role: 'reward' },
  pickup:    { files: ['r5_sounds_powerup1.wav'], vol: 0.5, max: 1, role: 'reward' },
  chest:     { files: ['r5_coin_cluster3.wav'], vol: 0.6, max: 1, role: 'reward', layers: ['sparkle'] },
  level:     { files: ['kj_jingles_NES03'], vol: 0.5, max: 1, role: 'reward', duck: true },
  tierUp:    { files: ['kd_powerUp7'], vol: 0.5, max: 1, role: 'reward', layers: ['tierBody'] },
  evolve:    { files: ['r5_movement_portal1.wav'], vol: 0.6, max: 1, role: 'reward', duck: true, layers: ['sparkle'] },
  mission:   { files: ['r5_coin_double1.wav'], vol: 0.5, max: 1, role: 'reward', layers: ['sparkle'] },
  milestone: { files: ['ki_confirmation_002'], vol: 0.5, max: 1, role: 'ui' },
  win:       { files: ['kj_jingles_NES00'], vol: 0.6, max: 1, role: 'reward', duck: true },
  bomb:      { files: ['r5_exp_long2.wav'], vol: 0.6, max: 1, role: 'reward' },
  freeze:    { files: ['kd_zapThreeToneDown'], vol: 0.4, max: 1, role: 'reward' },
  shieldHit: { files: ['kd_phaseJump1'], vol: 0.5, max: 1, role: 'danger' },
  dash:      { files: ['r5_movement_jump1.wav'], vol: 0.4, max: 1, role: 'ui' },
  warn:      { files: ['r5_sounds_error1.wav'], vol: 0.5, max: 1, role: 'danger' },
  slam:      { files: ['r5_exp_short_hard1.wav'], vol: 0.5, max: 2, role: 'danger', steal: true },
  boss:      { files: ['r5_exp_long1.wav'], vol: 0.7, max: 1, role: 'danger', duck: true },
  bossdie:   { files: ['r5_exp_long4.wav'], vol: 0.7, max: 1, role: 'reward', duck: true },
  death:     { files: ['r5_sounds_negative1.wav'], vol: 0.7, max: 1, role: 'danger', duck: true },
  hover:     { files: ['ki_tick_001'], vol: 0.3, max: 1, role: 'ui' },
  back:      { files: ['ki_back_001'], vol: 0.4, max: 1, role: 'ui' },
};
const MUSIC = {
  normal: { src: 'assets/music/level1.webm', vol: 0.55 },
  boss:   { src: 'assets/music/level3.webm', vol: 0.6 },
};
// Âm tổng hợp được coi là "quan trọng": đi bus riêng (không bị nén) và nén bus thường theo CFG.audio.duck
const SYNTH_PRI = { boss: 1, level: 1, bossdie: 1, death: 1, win: 1, evolve: 1, heart: 1, hurt: 1 };

const dbToGain = db => Math.pow(10, db / 20);

const SFX = {
  ctx: null, master: null, limiter: null, sfxGain: null, duckBus: null, priBus: null, musicGain: null, musicLP: null,
  synthBus: null, synthPri: null, noiseBuf: null, out: null,
  last: {}, active: {}, voices: {}, bufs: {}, gain: {}, meas: {}, music: {}, track: null, trackNode: null, ducked: false,
  heartNext: 0, lowMix: false, meterNode: null,
  muted: store.get('vs_muted', false),

  init() {
    if (this.ctx) { this.ctx.resume(); return; }
    try {
      const c = this.ctx = new (window.AudioContext || window.webkitAudioContext)(), A = CFG.audio, L = A.limiter;
      // Bus tổng: master (tắt tiếng) → limiter → post → loa
      const post = c.createGain(); post.gain.value = A.post; post.connect(c.destination); this.post = post;
      if (c.createDynamicsCompressor) {
        const lim = this.limiter = c.createDynamicsCompressor();
        lim.threshold.value = L.threshold; lim.knee.value = L.knee; lim.ratio.value = L.ratio; lim.attack.value = L.attack; lim.release.value = L.release;
        lim.connect(post);
      }
      this.master = c.createGain(); this.master.gain.value = this.muted ? 0 : 1; this.master.connect(this.limiter || post);
      this.sfxGain = c.createGain(); this.sfxGain.connect(this.master);
      this.duckBus = c.createGain(); this.duckBus.connect(this.sfxGain);
      this.priBus = c.createGain(); this.priBus.connect(this.sfxGain);
      this.musicLP = c.createBiquadFilter(); this.musicLP.type = 'lowpass'; this.musicLP.frequency.value = A.music.lpOpen; this.musicLP.connect(this.master);
      this.musicGain = c.createGain(); this.musicGain.connect(this.musicLP);
      this.synthBus = c.createGain(); this.synthBus.gain.value = 0.35; this.synthBus.connect(this.duckBus);
      this.synthPri = c.createGain(); this.synthPri.gain.value = 0.35; this.synthPri.connect(this.priBus);
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
      Promise.all(def.files.map(f => load(`assets/sfx/${/\.\w+$/.test(f) ? f : f + '.ogg'}?v=v5`)))   // không ghi đuôi = .ogg
        .then(list => { this.bufs[name] = list; this.level(name); })
        .catch(() => console.warn('Không nạp được âm', name, '— dùng âm tổng hợp'));
    }
    for (const [key, m] of Object.entries(MUSIC)) {
      load(m.src + '?v=g4').then(buf => { this.music[key] = { buf, ...trimSilence(buf) }; })
        .catch(() => console.warn('Không nạp được nhạc', key));
    }
  },
  // Đặt âm lượng theo vai từ RMS đo được (trung bình các biến thể)
  level(name) {
    const def = SFX_FILES[name], m = this.meas[name] = measureBufs(this.bufs[name]), A = CFG.audio;
    this.gain[name] = def.role && isFinite(m.rmsDb) ? clamp(dbToGain(A.roleDb[def.role] - m.rmsDb), A.gainMin, A.gainMax) : def.vol;
  },

  applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, M = CFG.audio.music;
    this.sfxGain.gain.setTargetAtTime(SETTINGS.sfxVol, t, 0.02);
    this.musicGain.gain.setTargetAtTime(SETTINGS.musicVol * (this.ducked ? M.pauseVol : 1), t, 0.15);
    // Tạm dừng / chọn thẻ: lọc trầm nhạc (nghe như vọng từ xa); máu thấp: lọc nhẹ; bình thường: mở hết
    this.musicLP.frequency.setTargetAtTime(this.ducked ? M.lpPause : this.lowMix ? M.lpLow : M.lpOpen, t, 0.12);
  },
  // Nén bus thường (âm quan trọng nổi lên trên)
  duck(name) {
    const D = CFG.audio.duck[name]; if (!D || !this.ctx) return;
    const g = this.duckBus.gain, t = this.ctx.currentTime;
    g.cancelScheduledValues(t); g.setTargetAtTime(D[0], t, 0.01); g.setTargetAtTime(1, t + D[1], 0.12);
  },
  // Lệch trái/phải theo vị trí thế giới so với người chơi (camera bám người chơi)
  panFor(x) {
    if (x == null || !G.player || !this.ctx.createStereoPanner || !VW) return null;
    const v = clamp((x - G.player.x) / (VW / 2), -1, 1) * CFG.audio.pan;
    if (Math.abs(v) < 0.04) return null;
    const p = this.ctx.createStereoPanner(); p.pan.value = v; return p;
  },

  /* ---------- âm tổng hợp (dự phòng + các âm phép thuật không có file) ---------- */
  tone(type, f0, f1, dur, vol, t) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.out || this.synthBus); o.start(t); o.stop(t + dur + 0.02);
  },
  noise(dur, vol, freq, t) {
    const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noiseBuf; f.type = 'lowpass'; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f).connect(g).connect(this.out || this.synthBus); s.start(t); s.stop(t + dur + 0.02);
  },
  arp(notes, step, type, vol, t) { notes.forEach((f, i) => this.tone(type, f, f, step * 1.5, vol, t + i * step)); },
  defs: {
    shoot:   { gap: 0.05, fn: (s, t, r) => s.tone('square', 900 * r, 300 * r, 0.08, 0.05, t) },
    knife:   { gap: 0.06, fn: (s, t, r) => { s.noise(0.06, 0.08, 5000 * r, t); s.tone('triangle', 1400 * r, 700 * r, 0.05, 0.04, t); } },
    orb:     { gap: 0.08, fn: (s, t, r) => s.tone('sine', 700 * r, 480 * r, 0.06, 0.06, t) },
    zap:     { gap: 0.1,  fn: (s, t, r) => { s.noise(0.25, 0.28, 4000 * r, t); s.tone('sawtooth', 130 * r, 40, 0.25, 0.12, t); } },
    nova:    { gap: 0.2,  fn: (s, t, r) => { s.tone('sine', 170 * r, 40, 0.4, 0.35, t); s.noise(0.3, 0.12, 700 * r, t); } },
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
    // V5 Phase 6: âm mới (chỉ tổng hợp; Phase 6.2 có thể thay bằng file sau khi nghe thử)
    tierUp:    { gap: 0.3,  fn: (s, t) => { s.arp([392, 587, 784, 1175], 0.06, 'square', 0.07, t); s.tone('sine', 98, 49, 0.4, 0.3, t); } },       // vũ khí lên bậc (cấp 4/8)
    evolve:    { gap: 1,    fn: (s, t) => { s.arp([262, 330, 392, 523, 659, 784, 1047], 0.07, 'sawtooth', 0.06, t); s.tone('sine', 65, 40, 0.9, 0.35, t); s.noise(0.8, 0.08, 7000, t + 0.4); } },
    milestone: { gap: 0.5,  fn: (s, t) => s.arp([659, 988], 0.07, 'triangle', 0.12, t) },                                                     // thông báo mốc
    mission:   { gap: 0.5,  fn: (s, t) => { s.arp([523, 784, 1047, 1568], 0.06, 'triangle', 0.13, t); s.tone('sine', 2093, 2637, 0.4, 0.05, t + 0.25); } },
    hover:     { gap: 0.05, fn: (s, t) => s.tone('triangle', 1800, 1500, 0.025, 0.05, t) },
    back:      { gap: 0.08, fn: (s, t) => s.tone('triangle', 700, 420, 0.07, 0.12, t) },
    heart:     { gap: 0.2,  fn: (s, t) => { const v = CFG.audio.heart.vol; s.tone('sine', 72, 40, 0.13, v, t); s.tone('sine', 62, 36, 0.11, v * 0.7, t + 0.17); } },
    // lớp thêm theo bậc vũ khí: thân trầm (bậc 2+) và lấp lánh (bậc 3+)
    tierBody:  { gap: 0.06, fn: (s, t, r) => { s.tone('sine', 140 * r, 55, 0.12, 0.18, t); s.noise(0.06, 0.06, 900, t); } },
    tierSpark: { gap: 0.06, fn: (s, t, r) => s.tone('sine', 2400 * r, 3200 * r, 0.06, 0.04, t + 0.01) },
    sparkle:   { gap: 0.2,  fn: (s, t) => { s.tone('sine', 2093, 3136, 0.15, 0.05, t + 0.05); s.tone('sine', 2637, 3520, 0.15, 0.04, t + 0.12); } },
    // tiếng chốt cuối âm báo trước kỹ năng boss
    wEnd_thud:  { gap: 0.1, fn: (s, t) => { s.tone('sine', 110, 40, 0.25, 0.3, t); s.noise(0.15, 0.15, 600, t); } },
    wEnd_chime: { gap: 0.1, fn: (s, t) => s.tone('triangle', 1320, 990, 0.12, 0.1, t) },
    wEnd_zip:   { gap: 0.1, fn: (s, t) => { s.tone('sine', 1800, 300, 0.12, 0.1, t); s.noise(0.08, 0.06, 5000, t); } },
  },

  /* ---------- phát hiệu ứng ----------
     play(name)                       — như trước
     play(name, rate)                 — hệ số cao độ (vd chuỗi nhặt ngọc, combo)
     play(name, { rate, x, tier })    — x: toạ độ thế giới để lệch trái/phải; tier: bậc vũ khí (âm nặng hơn + thêm lớp) */
  play(name, opt) {
    if (this.muted || !this.ctx) return;
    let rate = 1, x = null, tier = 0;
    if (typeof opt === 'number') rate = opt; else if (opt) { rate = opt.rate || 1; x = opt.x; tier = opt.tier || 0; }
    const d = this.defs[name], t = this.ctx.currentTime, A = CFG.audio;
    if (!d) return;
    if (this.last[name] && t - this.last[name] < d.gap) return;
    if (tier) {
      rate *= A.tier.rate[tier] || 1;
      const n = A.tier.layer[tier] || 0;
      if (n >= 1) this.play('tierBody', { rate: A.tier.rate[tier], x });
      if (n >= 2) this.play('tierSpark', { x });
    }
    const bufs = this.bufs[name], def = SFX_FILES[name];
    if (bufs) {
      // Quản lý giọng: đủ `max` bản cùng loại thì bỏ âm mới, hoặc (steal) cắt bản cũ nhất nếu nó đã phát được một chút
      const vs = this.voices[name] || (this.voices[name] = []);
      if (vs.length >= def.max) {
        if (!def.steal || t - vs[0].t < A.stealAge) return;
        const old = vs.shift(); old.g.gain.cancelScheduledValues(t); old.g.gain.setTargetAtTime(0, t, 0.008);
        try { old.src.stop(t + 0.04); } catch (e) {}
      }
      this.last[name] = t;
      const src = this.ctx.createBufferSource(), g = this.ctx.createGain(), pan = this.panFor(x);
      src.buffer = bufs[Math.floor(Math.random() * bufs.length)];
      src.playbackRate.value = rate * (1 + rand(-A.pitch, A.pitch));          // lệch cao độ cho đỡ nhàm
      g.gain.value = (this.gain[name] ?? def.vol) * dbToGain(rand(-A.jitterDb, A.jitterDb)); // lệch âm lượng ±dB
      const bus = def.duck ? this.priBus : this.duckBus;
      if (pan) src.connect(g).connect(pan).connect(bus); else src.connect(g).connect(bus);
      const v = { src, g, t }; vs.push(v);
      this.active[name] = (this.active[name] || 0) + 1;
      src.onended = () => { this.active[name] = Math.max(0, (this.active[name] || 0) - 1); const i = vs.indexOf(v); if (i >= 0) vs.splice(i, 1); };
      src.start(t);
      if (def.duck) this.duck(name);
      if (def.layers) for (const l of def.layers) this.play(l, { x });
      return;
    }
    this.last[name] = t;
    const pri = SYNTH_PRI[name], pan = this.panFor(x);
    if (pan) pan.connect(pri ? this.synthPri : this.synthBus);
    this.out = pan || (pri ? this.synthPri : null);
    try { d.fn(this, t, rate); } finally { this.out = null; }
    if (CFG.audio.duck[name]) this.duck(name);
  },

  /* Âm báo trước kỹ năng boss: tiếng dâng kéo dài đúng `dur` giây (thời gian báo trước), chốt bằng tiếng riêng khi ra đòn.
     Luôn là âm tổng hợp (không cần file), lệch theo vị trí boss. */
  windup(id, dur, x) {
    if (this.muted || !this.ctx) return;
    const W = WINDUP_CUES[id]; if (!W) { this.play('warn', { x }); return; }
    const c = this.ctx, t = c.currentTime, o = c.createOscillator(), g = c.createGain(), pan = this.panFor(x);
    dur = Math.max(0.15, dur);
    o.type = W.wave; o.frequency.setValueAtTime(W.f0, t); o.frequency.exponentialRampToValueAtTime(W.f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(W.vol, t + dur * 0.85); g.gain.exponentialRampToValueAtTime(0.0005, t + dur + 0.05);
    let node = o.connect(g);
    if (W.lfo) { // rung biên độ: nhanh = gấp
      const l = c.createOscillator(), lg = c.createGain(), am = c.createGain();
      l.frequency.value = W.lfo; lg.gain.value = 0.5; am.gain.value = 0.5;
      l.connect(lg).connect(am.gain); node = node.connect(am); l.start(t); l.stop(t + dur + 0.1);
    }
    node.connect(pan || this.synthPri); if (pan) pan.connect(this.synthPri);
    o.start(t); o.stop(t + dur + 0.1);
    const endName = 'wEnd_' + W.end;
    setTimeout(() => { if (G.state === 'play') this.play(endName, { x }); }, dur * 1000);
  },

  /* ---------- nhạc nền + lớp nền theo tình huống ---------- */
  // Gọi mỗi khung: tự chọn bản nhạc theo trạng thái game, chỉ làm gì khi có thay đổi.
  sync() {
    if (!this.ctx) return;
    const want = (G.state === 'menu' || G.state === 'over') ? null : (G.boss && !G.boss.dead ? 'boss' : 'normal');
    if (want !== this.track && (want === null || this.music[want])) this.switchTrack(want);
    const duck = G.state === 'paused' || G.state === 'levelup';
    // Máu thấp: lọc nhẹ nhạc + nhịp tim nhanh dần khi máu tụt
    const H = CFG.audio.heart, p = G.player, k = p && G.state === 'play' ? p.hp / p.maxHp : 1, low = k < H.on && p.hp > 0;
    if (duck !== this.ducked || low !== this.lowMix) { this.ducked = duck; this.lowMix = low; this.applyVolumes(); }
    if (low) {
      const t = this.ctx.currentTime;
      if (t >= this.heartNext) { this.play('heart'); this.heartNext = t + H.fast + (H.slow - H.fast) * clamp(k / H.on, 0, 1); }
    }
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

  // Đo đỉnh ở đầu ra (sau limiter) — dùng trong tools/checks.js. Trả về hàm đọc đỉnh lớn nhất từ lúc gọi.
  meter() {
    if (!this.ctx) return () => 0;
    if (!this.meterNode) { this.meterNode = this.ctx.createAnalyser(); this.meterNode.fftSize = 2048; this.post.connect(this.meterNode); }
    const a = this.meterNode, buf = new Float32Array(a.fftSize); let peak = 0, run = true;
    const tick = () => { if (!run) return; a.getFloatTimeDomainData(buf); for (let i = 0; i < buf.length; i++) { const v = Math.abs(buf[i]); if (v > peak) peak = v; } setTimeout(tick, 15); };
    tick();
    return (stop) => { if (stop) run = false; return peak; };
  },

  toggle() {
    this.muted = !this.muted; store.set('vs_muted', this.muted); updateMuteBtn();
    if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : 1, this.ctx.currentTime, 0.02);
  },
};

// Đo thời lượng / đỉnh / độ to của một nhóm buffer. Độ to = RMS lớn nhất trong cửa sổ 100 ms (dBFS, trung bình các biến thể):
// với âm ngắn, đo cả file sẽ phạt oan các âm có đuôi dài (rương), nên lấy đoạn to nhất — gần với tai nghe hơn.
function measureBufs(list) {
  let dbSum = 0, rmsSum = 0, peak = 0, dur = 0, n = 0;
  for (const b of list || []) {
    const d = b.getChannelData(0), W = Math.max(1, Math.round(b.sampleRate * 0.1)), S = Math.max(1, W >> 2);
    let best = 0, all = 0;
    for (let i = 0; i < d.length; i++) { const v = d[i]; all += v * v; if (Math.abs(v) > peak) peak = Math.abs(v); }
    for (let i = 0; i < Math.max(1, d.length - W + 1); i += S) {
      let e = 0; const end = Math.min(d.length, i + W);
      for (let j = i; j < end; j++) e += d[j] * d[j];
      if (e > best) best = e;
    }
    dbSum += 10 * Math.log10(Math.max(1e-12, best / W)); rmsSum += Math.sqrt(all / Math.max(1, d.length)); dur = Math.max(dur, b.duration); n++;
  }
  return { dur, peak, rms: n ? rmsSum / n : 0, rmsDb: n ? dbSum / n : -Infinity };
}

// Tìm đoạn có tiếng thật trong bản nhạc (bỏ khoảng lặng đầu/cuối do bộ mã hoá) để vòng lặp liền mạch
function trimSilence(buf) {
  const d = buf.getChannelData(0), n = d.length, th = 1e-3;
  let a = 0, b = n - 1;
  while (a < n && Math.abs(d[a]) < th) a++;
  while (b > a && Math.abs(d[b]) < th) b--;
  return { start: a / buf.sampleRate, end: (b + 1) / buf.sampleRate };
}
