/**
 * audio.js
 * -----------------------------------------------------------------------------
 * All sound in the game, effects and background music, synthesised in the
 * browser with the Web Audio API.
 *
 * No audio files. That is a deliberate choice, not a shortcut:
 *   - nothing extra to download, so the game still starts instantly on a slow
 *     school connection;
 *   - it works offline with no cache priming;
 *   - there is no licensing question about where a sound came from. The
 *     music is not a recording of anything: it is the short piece written out
 *     as notes at the bottom of this file, composed for this game, and played
 *     by the browser. There is nobody else's work in it to license.
 *
 * Everything degrades silently. If Web Audio is unavailable, blocked, or the
 * player has muted, every call here is a no-op and the game plays exactly the
 * same. Sound is feedback, never information: nothing is communicated by audio
 * alone.
 */

const STORAGE_KEY = 'outpost.muted';

let ctx = null;
let master = null;
let muted = readMuted();

function readMuted() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function isMuted() {
  return muted;
}

export function toggleMute() {
  muted = !muted;
  try {
    localStorage.setItem(STORAGE_KEY, muted ? '1' : '0');
  } catch {
    /* not persisting a mute preference is survivable */
  }
  if (master) master.gain.value = muted ? 0 : 0.5;
  if (muted) stopMusic();
  else startMusic();
  return muted;
}

/**
 * Browsers refuse to start audio until the user has interacted with the page,
 * so the context is created lazily on the first sound rather than at load.
 */
function ensureContext() {
  if (muted) return null;
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    ctx = new AudioCtx();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);
    return ctx;
  } catch {
    return null;
  }
}

/**
 * One synthesised note.
 * @param {Object} o
 * @param {number} o.freq      starting frequency in Hz
 * @param {number} [o.endFreq] glide to this frequency
 * @param {number} o.duration  seconds
 * @param {OscillatorType} [o.type]
 * @param {number} [o.gain]
 * @param {number} [o.delay]   seconds from now
 */
function tone({ freq, endFreq, duration, type = 'sine', gain = 0.2, delay = 0 }) {
  const audio = ensureContext();
  if (!audio) return;

  const start = audio.currentTime + delay;
  const osc = audio.createOscillator();
  const env = audio.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, start + duration);

  // Short attack, smooth decay: a click or thud rather than a beep.
  env.gain.setValueAtTime(0.0001, start);
  env.gain.exponentialRampToValueAtTime(gain, start + 0.012);
  env.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  osc.connect(env);
  env.connect(master);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

/** Filtered noise, for the storm alert. */
function noise({ duration = 0.5, gain = 0.12, frequency = 900 }) {
  const audio = ensureContext();
  if (!audio) return;

  const frames = Math.floor(audio.sampleRate * duration);
  const buffer = audio.createBuffer(1, frames, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i += 1) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
  }

  const src = audio.createBufferSource();
  src.buffer = buffer;

  const filter = audio.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = frequency;
  filter.Q.value = 1.1;

  const env = audio.createGain();
  env.gain.value = gain;

  src.connect(filter);
  filter.connect(env);
  env.connect(master);
  src.start();
}

/* ------------------------------------------------------------------ sounds */

export const sfx = {
  /** A power block assigned. Pitch rises with the count so it feels cumulative. */
  blockUp(count = 1) {
    tone({
      freq: 420 + Math.min(count, 8) * 38,
      duration: 0.085,
      type: 'triangle',
      gain: 0.16,
    });
  },

  /** A power block taken back. */
  blockDown(count = 1) {
    tone({
      freq: 400 + Math.min(count, 8) * 30,
      endFreq: 240,
      duration: 0.1,
      type: 'triangle',
      gain: 0.13,
    });
  },

  /** A space weather warning has appeared. Two-tone alarm plus a hiss. */
  stormAlert() {
    tone({ freq: 640, duration: 0.22, type: 'square', gain: 0.1 });
    tone({ freq: 480, duration: 0.3, type: 'square', gain: 0.1, delay: 0.2 });
    noise({ duration: 0.7, gain: 0.07, frequency: 1300 });
  },

  /** The crew sealed into the storm room: a heavy door. */
  shelter() {
    tone({ freq: 220, endFreq: 90, duration: 0.34, type: 'sawtooth', gain: 0.17 });
  },

  /** A day resolved without harm. */
  dayGood() {
    tone({ freq: 523, duration: 0.14, type: 'sine', gain: 0.16 });
    tone({ freq: 784, duration: 0.22, type: 'sine', gain: 0.14, delay: 0.1 });
  },

  /** A day resolved badly. */
  dayBad() {
    tone({ freq: 300, endFreq: 150, duration: 0.4, type: 'sawtooth', gain: 0.15 });
  },

  /** A named study completed. */
  discovery() {
    [659, 784, 988].forEach((f, i) =>
      tone({ freq: f, duration: 0.3, type: 'sine', gain: 0.13, delay: i * 0.085 })
    );
  },

  /** Mission succeeded. */
  missionWin() {
    [523, 659, 784, 1047].forEach((f, i) =>
      tone({ freq: f, duration: 0.5, type: 'sine', gain: 0.15, delay: i * 0.13 })
    );
  },

  /** Mission failed. */
  missionLost() {
    [392, 330, 262].forEach((f, i) =>
      tone({ freq: f, duration: 0.55, type: 'sine', gain: 0.15, delay: i * 0.18 })
    );
  },

  /** Generic interface press. */
  click() {
    tone({ freq: 660, duration: 0.05, type: 'square', gain: 0.07 });
  },

  /** Comet has something to tell you: two quick barks. */
  bark() {
    [0, 0.17].forEach((delay) => {
      tone({ freq: 620, endFreq: 300, duration: 0.09, type: 'sawtooth', gain: 0.07, delay });
      tone({ freq: 310, endFreq: 170, duration: 0.11, type: 'triangle', gain: 0.1, delay });
    });
  },

  /** A supply rocket crate is unpacked. */
  upgrade() {
    [392, 523, 659, 784, 1047].forEach((f, i) =>
      tone({ freq: f, duration: 0.26, type: 'triangle', gain: 0.12, delay: i * 0.07 })
    );
  },
};

/* ========================================================================== */
/* Background music                                                           */
/* ========================================================================== */

/**
 * A slow, quiet loop under the game: a soft held chord, a bass note, and a
 * few plucked notes with an echo. Four chords, two bars each, about half a
 * minute round.
 *
 * It is written here as notes and played by oscillators, so it is original to
 * this game and there is no recording, sample or library behind it.
 *
 * There are three versions of the same piece, which swap at the next chord so
 * the change is never a jolt:
 *   calm   an ordinary day
 *   storm  a solar flare is coming: darker chords, no plucked notes
 *   home   the front page and the flight home: brighter
 */

const MUSIC_KEY = 'outpost.music';
const BPM = 66;
const BEAT = 60 / BPM;
const BEATS_PER_CHORD = 8;

/** Note name to frequency: 'A3' -> 220. */
function hz(note) {
  const semis = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };
  const m = /^([A-G])(#|b)?(\d)$/.exec(note);
  const n = semis[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (Number(m[3]) - 4) * 12;
  return 440 * 2 ** (n / 12);
}

/** Each chord: a bass note, the held notes, and the notes the pluck plays. */
const SONGS = {
  calm: [
    { bass: 'A1', pad: ['A2', 'E3', 'G3', 'B3', 'C4'], pluck: ['E4', 'G4', 'B4', 'C5', 'B4', 'G4', 'E4', 'G4'] },
    { bass: 'F1', pad: ['F2', 'C3', 'E3', 'A3', 'C4'], pluck: ['C4', 'E4', 'A4', 'C5', 'A4', 'E4', 'C4', 'E4'] },
    { bass: 'C2', pad: ['C3', 'G3', 'B3', 'D4', 'E4'], pluck: ['E4', 'G4', 'B4', 'D5', 'B4', 'G4', 'D4', 'G4'] },
    { bass: 'G1', pad: ['G2', 'D3', 'E3', 'B3', 'D4'], pluck: ['D4', 'E4', 'B4', 'D5', 'B4', 'E4', 'D4', 'B3'] },
  ],
  storm: [
    { bass: 'A1', pad: ['A2', 'E3', 'A3', 'C4'], pluck: [] },
    { bass: 'F1', pad: ['F2', 'C3', 'F3', 'Ab3'], pluck: [] },
    { bass: 'D1', pad: ['D2', 'A2', 'D3', 'F3'], pluck: [] },
    { bass: 'E1', pad: ['E2', 'B2', 'E3', 'G#3'], pluck: [] },
  ],
  home: [
    { bass: 'C2', pad: ['C3', 'G3', 'B3', 'E4'], pluck: ['E4', 'G4', 'C5', 'E5', 'D5', 'C5', 'G4', 'E4'] },
    { bass: 'G1', pad: ['G2', 'D3', 'G3', 'B3'], pluck: ['D4', 'G4', 'B4', 'D5', 'B4', 'G4', 'D4', 'G4'] },
    { bass: 'A1', pad: ['A2', 'E3', 'G3', 'C4'], pluck: ['E4', 'A4', 'C5', 'E5', 'C5', 'A4', 'G4', 'E4'] },
    { bass: 'F1', pad: ['F2', 'C3', 'A3', 'C4'], pluck: ['C4', 'F4', 'A4', 'C5', 'A4', 'G4', 'F4', 'C4'] },
  ],
};

let musicOn = readMusicOn();
let musicBus = null;
let musicTimer = null;
let nextChordAt = 0;
let chordIndex = 0;
let mood = 'home';

function readMusicOn() {
  try {
    return localStorage.getItem(MUSIC_KEY) !== '0';
  } catch {
    return true;
  }
}

export function isMusicOn() {
  return musicOn;
}

export function toggleMusic() {
  musicOn = !musicOn;
  try {
    localStorage.setItem(MUSIC_KEY, musicOn ? '1' : '0');
  } catch {
    /* fine */
  }
  if (musicOn) startMusic();
  else stopMusic();
  return musicOn;
}

/** Which version of the piece to play from the next chord on. */
export function setMusicMood(next) {
  if (SONGS[next]) mood = next;
}

/**
 * Start the music if it is wanted and not already playing. Safe to call on
 * every click: browsers only allow sound after the player has touched the
 * page, so the first press of any button is what actually starts it.
 */
export function startMusic() {
  if (!musicOn || muted || musicTimer) return;
  const audio = ensureContext();
  if (!audio) return;

  if (!musicBus) {
    musicBus = audio.createGain();
    musicBus.gain.value = 0;

    // An echo for the plucked notes, which is most of what makes it "space".
    const echo = audio.createDelay(1.5);
    echo.delayTime.value = BEAT * 0.75;
    const feedback = audio.createGain();
    feedback.gain.value = 0.38;
    const echoTone = audio.createBiquadFilter();
    echoTone.type = 'lowpass';
    echoTone.frequency.value = 1800;
    musicBus.echoIn = audio.createGain();
    musicBus.echoIn.connect(echo);
    echo.connect(echoTone);
    echoTone.connect(feedback);
    feedback.connect(echo);
    echoTone.connect(musicBus);

    musicBus.connect(master);
  }

  // Fade in, so it arrives rather than starts.
  const now = audio.currentTime;
  musicBus.gain.cancelScheduledValues(now);
  musicBus.gain.setValueAtTime(musicBus.gain.value, now);
  musicBus.gain.linearRampToValueAtTime(ducked ? MUSIC_DUCKED : MUSIC_LEVEL, now + 2.5);

  nextChordAt = now + 0.15;
  schedule();
  musicTimer = setInterval(schedule, 500);
}

/** How loud the music is normally, and while the guide is speaking. */
const MUSIC_LEVEL = 0.85;
const MUSIC_DUCKED = 0.22;
let ducked = false;

/**
 * Turn the music down while the spoken guide is talking, and back up after.
 * Safe to call whether or not the music is playing.
 */
export function duckMusic(on) {
  ducked = Boolean(on);
  if (!ctx || !musicBus || !musicTimer) return;
  const now = ctx.currentTime;
  musicBus.gain.cancelScheduledValues(now);
  musicBus.gain.setValueAtTime(musicBus.gain.value, now);
  musicBus.gain.linearRampToValueAtTime(ducked ? MUSIC_DUCKED : MUSIC_LEVEL, now + 0.4);
}

export function stopMusic() {
  if (musicTimer) clearInterval(musicTimer);
  musicTimer = null;
  if (ctx && musicBus) {
    const now = ctx.currentTime;
    musicBus.gain.cancelScheduledValues(now);
    musicBus.gain.setValueAtTime(musicBus.gain.value, now);
    musicBus.gain.linearRampToValueAtTime(0, now + 0.6);
  }
}

/** Queue up whatever starts in the next couple of seconds. */
function schedule() {
  if (!ctx || !musicBus) return;
  // A tab that was asleep: skip the gap instead of playing it all at once.
  if (nextChordAt < ctx.currentTime - 0.5) nextChordAt = ctx.currentTime + 0.1;
  while (nextChordAt < ctx.currentTime + 1.5) {
    const song = SONGS[mood];
    playChord(song[chordIndex % song.length], nextChordAt);
    chordIndex += 1;
    nextChordAt += BEAT * BEATS_PER_CHORD;
  }
}

function playChord(chord, at) {
  const length = BEAT * BEATS_PER_CHORD;

  // The held chord: two slightly detuned voices per note, through a filter
  // that opens and closes once over the chord, like a slow breath.
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.Q.value = 0.6;
  filter.frequency.setValueAtTime(380, at);
  filter.frequency.linearRampToValueAtTime(1050, at + length * 0.5);
  filter.frequency.linearRampToValueAtTime(420, at + length + 1.2);
  filter.connect(musicBus);

  const padGain = ctx.createGain();
  padGain.gain.setValueAtTime(0.0001, at);
  padGain.gain.linearRampToValueAtTime(0.085, at + 2.2);
  padGain.gain.setValueAtTime(0.085, at + length - 0.6);
  padGain.gain.linearRampToValueAtTime(0.0001, at + length + 1.6);
  padGain.connect(filter);

  chord.pad.forEach((note, i) => {
    [-5, 6].forEach((cents) => {
      const osc = ctx.createOscillator();
      osc.type = i % 2 ? 'triangle' : 'sawtooth';
      osc.frequency.value = hz(note);
      osc.detune.value = cents;
      const level = ctx.createGain();
      level.gain.value = osc.type === 'sawtooth' ? 0.32 : 0.75;
      osc.connect(level);
      level.connect(padGain);
      osc.start(at);
      osc.stop(at + length + 1.8);
    });
  });

  // The bass: one soft note at the start of each bar.
  [0, 4].forEach((beat) => {
    const t = at + beat * BEAT;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = hz(chord.bass) * 2;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(beat === 0 ? 0.3 : 0.18, t + 0.06);
    env.gain.exponentialRampToValueAtTime(0.0001, t + BEAT * 3.6);
    osc.connect(env);
    env.connect(musicBus);
    osc.start(t);
    osc.stop(t + BEAT * 3.8);
  });

  // The plucked notes, one per beat, with the echo.
  chord.pluck.forEach((note, beat) => {
    const t = at + beat * BEAT;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = hz(note);
    const env = ctx.createGain();
    const loud = beat % 4 === 0 ? 0.1 : 0.07;
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(loud, t + 0.012);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    osc.connect(env);
    env.connect(musicBus);
    env.connect(musicBus.echoIn);
    osc.start(t);
    osc.stop(t + 1);
  });
}

// Music should not carry on in a tab nobody is looking at.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend().catch(() => {});
    else if (!muted) ctx.resume().catch(() => {});
  });
}
