/* ============================================================
   AUDIO — Web Audio API sound engine.
   Every sound and music track is SYNTHESIZED procedurally, so
   the game ships with zero audio files and works offline.
   Drop real files into assets/music + assets/sounds later and
   swap the implementation of play()/playMusic() if desired.
   ============================================================ */

class AudioManager {
  static ctx = null;
  static musicGain = null;
  static sfxGain = null;
  static musicTimer = null;   // scheduler interval for looping music
  static currentTrack = null;
  static _noiseBuffer = null;

  /** Must be called after a user gesture (browser autoplay policy). */
  static init() {
    if (AudioManager.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    AudioManager.ctx = ctx;

    AudioManager.musicGain = ctx.createGain();
    AudioManager.sfxGain = ctx.createGain();
    AudioManager.musicGain.connect(ctx.destination);
    AudioManager.sfxGain.connect(ctx.destination);
    AudioManager.setMusicVolume(Settings.get('musicVolume'));
    AudioManager.setSfxVolume(Settings.get('sfxVolume'));
  }

  static resume() {
    if (AudioManager.ctx && AudioManager.ctx.state === 'suspended') {
      AudioManager.ctx.resume();
    }
  }

  static setMusicVolume(v) {
    if (AudioManager.musicGain) AudioManager.musicGain.gain.value = v * 0.5;
  }
  static setSfxVolume(v) {
    if (AudioManager.sfxGain) AudioManager.sfxGain.gain.value = v;
  }

  /* ---------------- Shared synth helpers ---------------- */

  /** One oscillator note with an amplitude envelope. */
  static tone({ freq = 440, endFreq = null, type = 'sine', dur = 0.3, gain = 0.3,
                attack = 0.01, when = 0, dest = null }) {
    const ctx = AudioManager.ctx;
    if (!ctx) return;
    const t = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(dest || AudioManager.sfxGain);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  /** White-noise burst through a filter (whoosh / explosion / crackle). */
  static noise({ dur = 0.4, gain = 0.3, filterType = 'lowpass',
                 freq = 1000, endFreq = null, q = 1, when = 0, dest = null }) {
    const ctx = AudioManager.ctx;
    if (!ctx) return;
    if (!AudioManager._noiseBuffer) {
      const len = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      AudioManager._noiseBuffer = buf;
    }
    const t = ctx.currentTime + when;
    const src = ctx.createBufferSource();
    src.buffer = AudioManager._noiseBuffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.Q.value = q;
    filter.frequency.setValueAtTime(freq, t);
    if (endFreq) filter.frequency.exponentialRampToValueAtTime(Math.max(10, endFreq), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter).connect(g).connect(dest || AudioManager.sfxGain);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  /* ---------------- Sound effect library ---------------- */

  static play(name) {
    if (!AudioManager.ctx) return;
    AudioManager.resume();
    const A = AudioManager;
    switch (name) {
      case 'hover':
        A.tone({ freq: 700, endFreq: 900, type: 'sine', dur: 0.08, gain: 0.10 });
        break;
      case 'click':
        A.tone({ freq: 520, endFreq: 300, type: 'triangle', dur: 0.12, gain: 0.22 });
        A.tone({ freq: 1040, type: 'sine', dur: 0.06, gain: 0.08 });
        break;
      case 'fireball':
        A.noise({ dur: 0.45, gain: 0.35, freq: 400, endFreq: 2400 });
        A.tone({ freq: 140, endFreq: 60, type: 'sawtooth', dur: 0.45, gain: 0.20 });
        break;
      case 'explosion':
        A.noise({ dur: 0.7, gain: 0.55, freq: 2600, endFreq: 120 });
        A.tone({ freq: 110, endFreq: 35, type: 'sine', dur: 0.6, gain: 0.5 });
        break;
      case 'lightning':
        A.noise({ dur: 0.30, gain: 0.4, filterType: 'highpass', freq: 1200 });
        A.tone({ freq: 1600, endFreq: 90, type: 'square', dur: 0.28, gain: 0.14 });
        A.noise({ dur: 0.15, gain: 0.3, filterType: 'bandpass', freq: 3200, q: 4, when: 0.05 });
        break;
      case 'ice':
        [1400, 1750, 2100, 2800].forEach((f, i) =>
          A.tone({ freq: f, type: 'triangle', dur: 0.22, gain: 0.10, when: i * 0.05 }));
        A.noise({ dur: 0.35, gain: 0.12, filterType: 'highpass', freq: 5000 });
        break;
      case 'shield':
        A.tone({ freq: 220, endFreq: 330, type: 'sine', dur: 0.55, gain: 0.22, attack: 0.15 });
        A.tone({ freq: 330, endFreq: 495, type: 'sine', dur: 0.55, gain: 0.14, attack: 0.15 });
        break;
      case 'shieldBlock':
        A.tone({ freq: 880, endFreq: 440, type: 'square', dur: 0.18, gain: 0.2 });
        A.noise({ dur: 0.25, gain: 0.3, filterType: 'bandpass', freq: 2400, q: 3 });
        break;
      case 'heal':
        [523, 659, 784, 1047].forEach((f, i) =>
          A.tone({ freq: f, type: 'sine', dur: 0.35, gain: 0.14, when: i * 0.08 }));
        break;
      case 'hit':
        A.tone({ freq: 180, endFreq: 60, type: 'triangle', dur: 0.18, gain: 0.35 });
        A.noise({ dur: 0.12, gain: 0.2, freq: 900, endFreq: 200 });
        break;
      case 'crit':
        A.tone({ freq: 200, endFreq: 50, type: 'sawtooth', dur: 0.3, gain: 0.35 });
        A.noise({ dur: 0.3, gain: 0.35, freq: 3000, endFreq: 200 });
        A.tone({ freq: 1200, endFreq: 2400, type: 'sine', dur: 0.15, gain: 0.12, when: 0.02 });
        break;
      case 'tick': // soft spell-wheel step
        A.tone({ freq: 1100, type: 'sine', dur: 0.04, gain: 0.05 });
        break;
      case 'countdown':
        A.tone({ freq: 660, type: 'sine', dur: 0.15, gain: 0.2 });
        break;
      case 'fight':
        A.tone({ freq: 880, type: 'sine', dur: 0.4, gain: 0.3 });
        A.tone({ freq: 1320, type: 'sine', dur: 0.4, gain: 0.18 });
        break;
    }
  }

  /* ---------------- Music (generative loops) ---------------- */

  static TRACKS = {
    // [beat, freq, durBeats, type, gain] — one bar loops forever
    menu: {
      tempo: 66, beatsPerBar: 8,
      notes: [
        // Slow mystical arpeggio (A minor add9)
        [0, 220.00, 2.2, 'sine', 0.20], [1, 329.63, 2.2, 'sine', 0.13],
        [2, 440.00, 2.2, 'sine', 0.12], [3, 493.88, 2.2, 'sine', 0.10],
        [4, 523.25, 2.2, 'sine', 0.13], [5, 440.00, 2.2, 'sine', 0.10],
        [6, 329.63, 2.2, 'sine', 0.12], [7, 246.94, 2.2, 'sine', 0.10],
        // Deep pad root
        [0, 110.00, 8.0, 'triangle', 0.10], [0, 164.81, 8.0, 'sine', 0.07]
      ]
    },
    battle: {
      tempo: 138, beatsPerBar: 8,
      notes: [
        // Driving bass (E minor)
        [0, 82.41, 0.9, 'sawtooth', 0.16], [2, 82.41, 0.9, 'sawtooth', 0.16],
        [4, 98.00, 0.9, 'sawtooth', 0.16], [6, 73.42, 0.9, 'sawtooth', 0.16],
        // Percussive pulse
        [0, 55, 0.2, 'sine', 0.30], [2, 55, 0.2, 'sine', 0.30],
        [4, 55, 0.2, 'sine', 0.30], [6, 55, 0.2, 'sine', 0.30],
        // Tense arpeggio
        [0, 329.63, 0.4, 'square', 0.05], [1, 392.00, 0.4, 'square', 0.05],
        [2, 493.88, 0.4, 'square', 0.05], [3, 392.00, 0.4, 'square', 0.05],
        [4, 329.63, 0.4, 'square', 0.05], [5, 440.00, 0.4, 'square', 0.05],
        [6, 493.88, 0.4, 'square', 0.05], [7, 587.33, 0.4, 'square', 0.05]
      ]
    }
  };

  /** Start a looping track ('menu' | 'battle') or stop with null. */
  static playMusic(trackName) {
    if (!AudioManager.ctx) { AudioManager.currentTrack = trackName; return; }
    if (AudioManager.currentTrack === trackName && AudioManager.musicTimer) return;
    AudioManager.stopMusic();
    AudioManager.currentTrack = trackName;
    if (!trackName) return;

    const track = AudioManager.TRACKS[trackName];
    if (!track) return;
    const ctx = AudioManager.ctx;
    const beatDur = 60 / track.tempo;
    const barDur = beatDur * track.beatsPerBar;
    let nextBar = ctx.currentTime + 0.1;

    const scheduleBar = () => {
      // Schedule the next bar slightly ahead of playback time
      while (nextBar < ctx.currentTime + 0.3) {
        for (const [beat, freq, durB, type, gain] of track.notes) {
          AudioManager.tone({
            freq, type, gain,
            dur: durB * beatDur,
            attack: 0.02,
            when: (nextBar - ctx.currentTime) + beat * beatDur,
            dest: AudioManager.musicGain
          });
        }
        nextBar += barDur;
      }
    };
    scheduleBar();
    AudioManager.musicTimer = setInterval(scheduleBar, 120);
  }

  static stopMusic() {
    if (AudioManager.musicTimer) {
      clearInterval(AudioManager.musicTimer);
      AudioManager.musicTimer = null;
    }
    AudioManager.currentTrack = null;
  }

  /** One-shot victory fanfare (played over silence). */
  static playVictory() {
    if (!AudioManager.ctx) return;
    AudioManager.stopMusic();
    const notes = [
      [0.00, 523.25], [0.18, 659.25], [0.36, 783.99],
      [0.54, 1046.5], [0.90, 783.99], [1.08, 1046.5]
    ];
    for (const [when, freq] of notes) {
      AudioManager.tone({ freq, type: 'triangle', dur: 0.5, gain: 0.22, when, dest: AudioManager.musicGain });
      AudioManager.tone({ freq: freq / 2, type: 'sine', dur: 0.5, gain: 0.14, when, dest: AudioManager.musicGain });
    }
  }
}

window.AudioManager = AudioManager;
