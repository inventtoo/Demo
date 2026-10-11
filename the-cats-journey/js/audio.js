/* =====================================================================
   audio.js - Música y efectos de sonido
   ---------------------------------------------------------------------
   Todo el sonido se genera en tiempo real con la Web Audio API, así que
   el juego no necesita archivos de audio. Si el navegador no soporta
   Web Audio, el juego funciona igualmente, solo que en silencio.
   ===================================================================== */
'use strict';

/**
 * Convierte un nombre de nota ("C4", "F#5", "A#2") en su frecuencia (Hz).
 * Se basa en que La4 (A4) = 440 Hz y cada semitono multiplica por 2^(1/12).
 */
function noteToFrequency(noteName) {
  const NOTE_INDEX = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
  const match = /^([A-G]#?)(\d)$/.exec(noteName);
  if (!match) return 0;
  const semitone = NOTE_INDEX[match[1]];
  const octave = Number(match[2]);
  const semitonesFromA4 = semitone - 9 + (octave - 4) * 12;
  return 440 * Math.pow(2, semitonesFromA4 / 12);
}

/**
 * Canciones del juego. Cada pista es una lista de notas separadas por
 * espacios; cada nota dura una corchea. El guion "-" es un silencio.
 */
const SONGS = {
  menu: {
    tempo: 96,
    melodyWave: 'triangle',
    bassWave: 'sine',
    melody: 'G4 - B4 D5 G5 - F#5 D5 E5 - C5 E5 D5 - - - G4 - B4 D5 G5 - A5 B5 C6 - B5 A5 G5 - - -',
    bass: 'G2 - D3 - C3 - D3 - C3 - G2 - D3 - B2 -'
  },
  forest: {
    tempo: 132,
    melodyWave: 'square',
    bassWave: 'triangle',
    melody: 'E5 G5 C6 G5 A5 G5 E5 - F5 A5 D6 A5 G5 - - - E5 G5 C6 G5 A5 C6 D6 E6 D6 C6 A5 G5 C6 - - -',
    bass: 'C3 - G3 - C3 - G3 - F3 - C4 - G3 - D3 - C3 - G3 - C3 - A2 - E3 - F3 - G3 - C3 - G3 -'
  },
  mountains: {
    tempo: 140,
    melodyWave: 'square',
    bassWave: 'triangle',
    melody: 'A4 C5 E5 A5 G5 E5 D5 E5 C5 - A4 - B4 C5 D5 - A4 C5 E5 A5 B5 A5 G5 E5 F5 E5 D5 C5 B4 - - -',
    bass: 'A2 A3 A2 A3 G2 G3 G2 G3 F2 F3 F2 F3 E2 E3 E2 E3'
  },
  castle: {
    tempo: 100,
    melodyWave: 'triangle',
    bassWave: 'sawtooth',
    melody: 'D5 - F5 - A5 - G5 F5 E5 - C#5 - D5 - - - F5 - A5 - D6 - C6 A5 A#5 - G5 - A5 - - -',
    bass: 'D2 - - - A2 - - - A#2 - - - A2 - - -'
  },
  boss: {
    tempo: 168,
    melodyWave: 'square',
    bassWave: 'sawtooth',
    melody: 'E5 E5 G5 E5 A5 G5 F#5 D5 E5 E5 G5 E5 B5 A5 G5 F#5 E5 - B4 - E5 - F#5 G5 A5 - G5 - F#5 - D5 -',
    bass: 'E2 E3 E2 E3 C3 C3 D3 D3 E2 E3 E2 E3 B2 B2 D3 D3'
  },
  victory: {
    tempo: 112,
    melodyWave: 'triangle',
    bassWave: 'sine',
    melody: 'C5 E5 G5 C6 - G5 C6 E6 D6 - B5 G5 C6 - - - A5 C6 F6 - E6 C6 D6 - B5 G5 B5 D6 C6 - - -',
    bass: 'C3 - G3 - A2 - E3 - F2 - C3 - G2 - D3 -'
  }
};

const AudioManager = {
  context: null,
  musicGain: null,
  sfxGain: null,
  musicEnabled: true,
  sfxEnabled: true,
  musicVolume: 0.45,
  sfxVolume: 0.7,

  // Estado del secuenciador de música
  currentSongName: null,
  schedulerId: null,
  nextNoteTime: 0,
  stepIndex: 0,
  parsedSong: null,

  /**
   * Crea el contexto de audio. Los navegadores solo permiten hacerlo
   * después de una interacción del usuario (clic o tecla), por eso se
   * llama desde los manejadores de eventos de entrada.
   */
  init() {
    if (this.context) {
      if (this.context.state === 'suspended') this.context.resume().catch(() => {});
      return;
    }
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return; // Sin soporte: el juego sigue sin sonido

    try {
      this.context = new AudioContextClass();
      this.musicGain = this.context.createGain();
      this.sfxGain = this.context.createGain();
      this.musicGain.connect(this.context.destination);
      this.sfxGain.connect(this.context.destination);
      this.applyVolumes();
      // Si se pidió una canción antes de que existiera el contexto, la iniciamos ahora
      if (this.currentSongName) {
        const pendingSong = this.currentSongName;
        this.currentSongName = null;
        this.playMusic(pendingSong);
      }
    } catch (error) {
      this.context = null;
    }
  },

  applyVolumes() {
    if (!this.context) return;
    this.musicGain.gain.value = this.musicEnabled ? this.musicVolume * 0.35 : 0;
    this.sfxGain.gain.value = this.sfxEnabled ? this.sfxVolume * 0.5 : 0;
  },

  setMusicEnabled(enabled) { this.musicEnabled = enabled; this.applyVolumes(); },
  setSfxEnabled(enabled) { this.sfxEnabled = enabled; this.applyVolumes(); },
  setMusicVolume(volume) { this.musicVolume = volume; this.applyVolumes(); },
  setSfxVolume(volume) { this.sfxVolume = volume; this.applyVolumes(); },

  /**
   * Reproduce un tono sencillo. Es la pieza básica de todos los efectos.
   * @param {number} frequency  Frecuencia inicial en Hz
   * @param {number} duration   Duración en segundos
   * @param {object} options    type (forma de onda), volume, slideTo (frecuencia final), delay, output
   */
  playTone(frequency, duration, options = {}) {
    if (!this.context) return;
    const { type = 'square', volume = 0.3, slideTo = null, delay = 0, output = this.sfxGain } = options;
    const startTime = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const envelope = this.context.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startTime);
    if (slideTo) oscillator.frequency.exponentialRampToValueAtTime(slideTo, startTime + duration);

    // Envolvente: ataque rápido y caída suave para evitar "clics"
    envelope.gain.setValueAtTime(0.0001, startTime);
    envelope.gain.exponentialRampToValueAtTime(volume, startTime + 0.01);
    envelope.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    oscillator.connect(envelope);
    envelope.connect(output);
    oscillator.start(startTime);
    oscillator.stop(startTime + duration + 0.02);
  },

  /** Ruido blanco filtrado: útil para golpes, explosiones y pasos. */
  playNoise(duration, volume = 0.3, filterFrequency = 1200, delay = 0) {
    if (!this.context) return;
    const startTime = this.context.currentTime + delay;
    const sampleCount = Math.floor(this.context.sampleRate * duration);
    const buffer = this.context.createBuffer(1, sampleCount, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i++) data[i] = Math.random() * 2 - 1;

    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const envelope = this.context.createGain();
    source.buffer = buffer;
    filter.type = 'lowpass';
    filter.frequency.value = filterFrequency;
    envelope.gain.setValueAtTime(volume, startTime);
    envelope.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(this.sfxGain);
    source.start(startTime);
  },

  /** Reproduce un efecto de sonido por su nombre. */
  play(soundName) {
    if (!this.context || !this.sfxEnabled) return;
    switch (soundName) {
      case 'jump':
        this.playTone(320, 0.18, { type: 'square', volume: 0.18, slideTo: 640 });
        break;
      case 'coin':
        this.playTone(988, 0.08, { type: 'square', volume: 0.15 });
        this.playTone(1319, 0.25, { type: 'square', volume: 0.15, delay: 0.07 });
        break;
      case 'heart':
        this.playTone(523, 0.12, { type: 'triangle', volume: 0.3 });
        this.playTone(659, 0.12, { type: 'triangle', volume: 0.3, delay: 0.1 });
        this.playTone(784, 0.25, { type: 'triangle', volume: 0.3, delay: 0.2 });
        break;
      case 'star':
        [784, 988, 1175, 1568].forEach((freq, i) => this.playTone(freq, 0.18, { type: 'square', volume: 0.13, delay: i * 0.07 }));
        break;
      case 'key':
        [659, 880, 1109, 1319].forEach((freq, i) => this.playTone(freq, 0.15, { type: 'triangle', volume: 0.3, delay: i * 0.06 }));
        break;
      case 'door':
        this.playTone(110, 0.5, { type: 'sawtooth', volume: 0.2, slideTo: 70 });
        this.playNoise(0.4, 0.2, 500);
        break;
      case 'hurt':
        this.playTone(440, 0.3, { type: 'sawtooth', volume: 0.2, slideTo: 110 });
        break;
      case 'stomp':
        this.playTone(220, 0.12, { type: 'square', volume: 0.22, slideTo: 80 });
        this.playNoise(0.12, 0.25, 900);
        break;
      case 'enemyHit':
        this.playTone(600, 0.1, { type: 'square', volume: 0.15, slideTo: 300 });
        break;
      case 'shoot':
        this.playTone(880, 0.15, { type: 'sine', volume: 0.25, slideTo: 1760 });
        break;
      case 'deflect':
        this.playTone(1500, 0.08, { type: 'square', volume: 0.12 });
        this.playTone(1200, 0.08, { type: 'square', volume: 0.12, delay: 0.05 });
        break;
      case 'crumble':
        this.playNoise(0.35, 0.15, 600);
        break;
      case 'checkpoint':
        [523, 659, 784].forEach((freq, i) => this.playTone(freq, 0.15, { type: 'triangle', volume: 0.3, delay: i * 0.08 }));
        break;
      case 'bossShoot':
        this.playTone(300, 0.35, { type: 'sawtooth', volume: 0.18, slideTo: 900 });
        break;
      case 'bossCharge':
        this.playTone(90, 0.6, { type: 'sawtooth', volume: 0.25, slideTo: 180 });
        break;
      case 'bossSlam':
        this.playTone(80, 0.5, { type: 'square', volume: 0.3, slideTo: 40 });
        this.playNoise(0.5, 0.4, 400);
        break;
      case 'bossHit':
        this.playTone(200, 0.25, { type: 'square', volume: 0.3, slideTo: 60 });
        this.playNoise(0.2, 0.3, 1500);
        break;
      case 'bossLaugh':
        [330, 294, 262, 247].forEach((freq, i) => this.playTone(freq, 0.12, { type: 'sawtooth', volume: 0.15, delay: i * 0.13 }));
        break;
      case 'lifeLost':
        [494, 466, 440, 415, 392].forEach((freq, i) => this.playTone(freq, 0.2, { type: 'triangle', volume: 0.3, delay: i * 0.12 }));
        break;
      case 'oneUp':
        [659, 784, 1319, 1047, 1175, 1568].forEach((freq, i) => this.playTone(freq, 0.12, { type: 'square', volume: 0.12, delay: i * 0.08 }));
        break;
      case 'levelComplete':
        [523, 659, 784, 1047, 784, 1047].forEach((freq, i) => this.playTone(freq, 0.22, { type: 'square', volume: 0.15, delay: i * 0.12 }));
        break;
      case 'victory':
        [523, 659, 784, 1047, 988, 1047, 1319, 1568].forEach((freq, i) => this.playTone(freq, 0.3, { type: 'triangle', volume: 0.3, delay: i * 0.15 }));
        break;
      case 'select':
        this.playTone(660, 0.07, { type: 'square', volume: 0.12 });
        break;
      default:
        break;
    }
  },

  /* ------------------------- Música ------------------------- */

  /** Empieza a reproducir una canción en bucle (si no está sonando ya). */
  playMusic(songName) {
    if (this.currentSongName === songName && this.schedulerId !== null) return;
    this.stopMusic();
    this.currentSongName = songName;
    const song = SONGS[songName];
    if (!song || !this.context) return; // Se iniciará cuando exista el contexto

    this.parsedSong = {
      stepDuration: 60 / song.tempo / 2, // corcheas
      melody: song.melody.split(/\s+/),
      bass: song.bass.split(/\s+/),
      melodyWave: song.melodyWave,
      bassWave: song.bassWave
    };
    this.stepIndex = 0;
    this.nextNoteTime = this.context.currentTime + 0.1;
    // Programamos las notas un poco por adelantado para que suenen a tiempo
    this.schedulerId = setInterval(() => this.scheduleNotes(), 25);
  },

  scheduleNotes() {
    if (!this.context || !this.parsedSong) return;
    const song = this.parsedSong;
    while (this.nextNoteTime < this.context.currentTime + 0.12) {
      const melodyNote = song.melody[this.stepIndex % song.melody.length];
      const bassNote = song.bass[this.stepIndex % song.bass.length];
      const delay = Math.max(0, this.nextNoteTime - this.context.currentTime);

      if (melodyNote && melodyNote !== '-') {
        this.playTone(noteToFrequency(melodyNote), song.stepDuration * 0.9, {
          type: song.melodyWave, volume: 0.18, delay, output: this.musicGain
        });
      }
      if (bassNote && bassNote !== '-') {
        this.playTone(noteToFrequency(bassNote), song.stepDuration * 1.6, {
          type: song.bassWave, volume: 0.22, delay, output: this.musicGain
        });
      }
      this.nextNoteTime += song.stepDuration;
      this.stepIndex++;
    }
  },

  stopMusic() {
    if (this.schedulerId !== null) {
      clearInterval(this.schedulerId);
      this.schedulerId = null;
    }
    this.currentSongName = null;
    this.parsedSong = null;
  }
};
