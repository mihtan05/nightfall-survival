'use strict';
/* Ứng viên âm thanh cho từng sự kiện game (V5 Phase 6) — dùng bởi tools/sfx-audition.html.
   Đường dẫn tính từ thư mục gốc dự án. vendor/audio/ KHÔNG có trong repo: tải lại 4 gói (xem CREDITS.md) rồi giải nén vào
     vendor/audio/kenney-digital-audio, kenney-interface-sounds, kenney-music-jingles, oga512.
   'synth' = âm tổng hợp hiện có trong js/audio.js (dự phòng, luôn có). Ứng viên đầu tiên là dự đoán tốt nhất. */
const KD = 'vendor/audio/kenney-digital-audio/Audio/';
const KI = 'vendor/audio/kenney-interface-sounds/Audio/';
const KJ = 'vendor/audio/kenney-music-jingles/Audio/';
const O5 = 'vendor/audio/oga512/The Essential Retro Video Game Sound Effects Collection [512 sounds] By Juhani Junkala/';
const AS = 'assets/sfx/';
// vai: frequent (dày, phát liên tục) | ui | reward (phần thưởng) | danger (nguy hiểm)
const SFX_CANDIDATES = {
  shoot:     { role: 'frequent', c: [KD + 'laser4.ogg', O5 + 'Weapons/Lasers/sfx_wpn_laser1.wav', KD + 'pepSound1.ogg', O5 + 'Weapons/Lasers/sfx_wpn_laser6.wav', 'synth'] },
  zap:       { role: 'frequent', c: [O5 + 'Explosions/Shortest/sfx_exp_shortest_hard1.wav', KD + 'zap1.ogg', KD + 'zapTwoTone.ogg', 'synth'] },
  nova:      { role: 'frequent', c: [O5 + 'Explosions/Short/sfx_exp_short_soft1.wav', O5 + 'Weapons/Cannon/sfx_wpn_cannon1.wav', KD + 'lowThreeTone.ogg', 'synth'] },
  knife:     { role: 'frequent', c: [AS + 'knifeSlice.ogg', O5 + 'Weapons/Melee/sfx_wpn_dagger.wav', O5 + 'Weapons/Melee/sfx_wpn_sword1.wav', 'synth'] },
  orb:       { role: 'frequent', c: [AS + 'chop.ogg', O5 + 'Weapons/Melee/sfx_wpn_punch1.wav', KD + 'phaserDown1.ogg', 'synth'] },
  hit:       { role: 'frequent', c: [AS + 'impactPunch_medium_000.ogg', O5 + 'General Sounds/Impacts/sfx_sounds_impact1.wav', O5 + 'General Sounds/Simple Damage Sounds/sfx_damage_hit1.wav', 'synth'] },
  kill:      { role: 'frequent', c: [AS + 'impactSoft_heavy_000.ogg', O5 + 'Explosions/Shortest/sfx_exp_shortest_soft1.wav', O5 + 'Explosions/Shortest/sfx_exp_shortest_soft3.wav', 'synth'] },
  gem:       { role: 'frequent', c: [AS + 'glass_001.ogg', O5 + 'General Sounds/Coins/sfx_coin_single1.wav', KI + 'pluck_001.ogg', KD + 'highUp.ogg', 'synth'] },
  hurt:      { role: 'danger',   c: [O5 + 'General Sounds/Simple Damage Sounds/sfx_damage_hit2.wav', AS + 'impactPunch_heavy_000.ogg', O5 + 'General Sounds/Negative Sounds/sfx_sounds_damage1.wav', 'synth'] },
  heal:      { role: 'reward',   c: [O5 + 'General Sounds/Positive Sounds/sfx_sounds_powerup3.wav', KD + 'powerUp2.ogg', 'synth'] },
  level:     { role: 'reward',   c: [KJ + '8-Bit jingles/jingles_NES03.ogg', O5 + 'General Sounds/Fanfares/sfx_sounds_fanfare1.wav', KJ + 'Pizzicato jingles/jingles_PIZZI01.ogg', 'synth'] },
  select:    { role: 'ui',       c: [O5 + 'General Sounds/Menu Sounds/sfx_menu_select1.wav', AS + 'select_001.ogg', KI + 'confirmation_001.ogg', 'synth'] },
  chest:     { role: 'reward',   c: [O5 + 'General Sounds/Coins/sfx_coin_cluster3.wav', AS + 'handleCoins.ogg', KJ + '8-Bit jingles/jingles_NES09.ogg', 'synth'] },
  eshoot:    { role: 'danger',   c: [KD + 'laser8.ogg', O5 + 'Weapons/Lasers/sfx_wpn_laser9.wav', KD + 'phaserUp3.ogg', 'synth'] },
  boss:      { role: 'danger',   c: [O5 + 'Explosions/Long/sfx_exp_long1.wav', O5 + 'Weapons/Cannon/sfx_wpn_cannon4.wav', KJ + 'Hit jingles/jingles_HIT00.ogg', 'synth'] },
  bossdie:   { role: 'reward',   c: [O5 + 'Explosions/Long/sfx_exp_long4.wav', O5 + 'Explosions/Double/sfx_exp_double1.wav', 'synth'] },
  death:     { role: 'danger',   c: [KJ + '8-Bit jingles/jingles_NES14.ogg', KD + 'lowDown.ogg', O5 + 'General Sounds/Negative Sounds/sfx_sounds_negative1.wav', 'synth'] },
  warn:      { role: 'danger',   c: [O5 + 'General Sounds/Negative Sounds/sfx_sounds_error1.wav', KI + 'error_004.ogg', 'synth'] },
  slam:      { role: 'danger',   c: [O5 + 'Explosions/Short/sfx_exp_short_hard1.wav', O5 + 'Explosions/Medium Length/sfx_exp_medium1.wav', 'synth'] },
  crate:     { role: 'frequent', c: [O5 + 'General Sounds/Impacts/sfx_sounds_impact5.wav', KI + 'drop_002.ogg', 'synth'] },
  pickup:    { role: 'reward',   c: [O5 + 'General Sounds/Positive Sounds/sfx_sounds_powerup1.wav', KD + 'powerUp5.ogg', KI + 'maximize_003.ogg', 'synth'] },
  shieldHit: { role: 'danger',   c: [KD + 'phaseJump1.ogg', O5 + 'General Sounds/Impacts/sfx_sounds_impact10.wav', 'synth'] },
  bomb:      { role: 'reward',   c: [O5 + 'Explosions/Long/sfx_exp_long2.wav', O5 + 'Explosions/Double/sfx_exp_double2.wav', 'synth'] },
  freeze:    { role: 'reward',   c: [KD + 'zapThreeToneDown.ogg', KD + 'phaserDown3.ogg', 'synth'] },
  dash:      { role: 'ui',       c: [O5 + 'Movement/Jumping and Landing/sfx_movement_jump1.wav', KD + 'phaserUp1.ogg', 'synth'] },
  combo:     { role: 'reward',   c: ['synth', KD + 'threeTone1.ogg', KD + 'zapThreeToneUp.ogg'] },
  chestArp:  { role: 'reward',   c: ['synth', KJ + '8-Bit jingles/jingles_NES09.ogg'] },
  calm:      { role: 'ui',       c: ['synth', KD + 'twoTone1.ogg'] },
  win:       { role: 'reward',   c: [KJ + '8-Bit jingles/jingles_NES00.ogg', O5 + 'General Sounds/Fanfares/sfx_sounds_fanfare3.wav', KJ + 'Sax jingles/jingles_SAX00.ogg', 'synth'] },
  tierUp:    { role: 'reward',   c: [KD + 'powerUp7.ogg', KJ + 'Steel jingles/jingles_STEEL02.ogg', 'synth'] },
  evolve:    { role: 'reward',   c: [O5 + 'Movement/Portals and Transitions/sfx_movement_portal1.wav', KJ + '8-Bit jingles/jingles_NES05.ogg', 'synth'] },
  milestone: { role: 'ui',       c: [KI + 'confirmation_002.ogg', KD + 'twoTone2.ogg', 'synth'] },
  mission:   { role: 'reward',   c: [O5 + 'General Sounds/Coins/sfx_coin_double1.wav', KJ + 'Pizzicato jingles/jingles_PIZZI03.ogg', 'synth'] },
  hover:     { role: 'ui',       c: [KI + 'tick_001.ogg', O5 + 'General Sounds/Menu Sounds/sfx_menu_move1.wav', KI + 'click_002.ogg', 'synth'] },
  back:      { role: 'ui',       c: [KI + 'back_001.ogg', KI + 'close_001.ogg', O5 + 'General Sounds/Menu Sounds/sfx_menu_move4.wav', 'synth'] },
};
// Tên file trong assets/sfx (không đuôi) cho một nguồn: giữ nguyên file đã có; còn lại gắn tiền tố theo gói
function sfxGameName(src) {
  const base = src.split('/').pop().replace(/\.(ogg|wav)$/i, '').replace(/[^A-Za-z0-9_]+/g, '_');
  if (src.startsWith(AS)) return base;
  if (src.startsWith(KD)) return 'kd_' + base;
  if (src.startsWith(KI)) return 'ki_' + base;
  if (src.startsWith(KJ)) return 'kj_' + base;
  return 'r5_' + base.replace(/^sfx_/, '');
}
