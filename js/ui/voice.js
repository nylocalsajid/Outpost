/**
 * voice.js
 * -----------------------------------------------------------------------------
 * The spoken guide.
 *
 * Speech comes from the browser's own speech synthesis (the Web Speech API),
 * in English or Arabic to match the language the player chose. That means:
 *   - no audio files to download, and nothing recorded by anyone to license;
 *   - it works offline wherever the device has a voice installed;
 *   - the voice itself belongs to the device, so it sounds different on a
 *     phone, a Mac and a Windows laptop, and a device with no voice for a
 *     language cannot speak it. `voiceStatus` reports that, and the guide
 *     says so in one line rather than staying mysteriously silent.
 *
 * Everything said aloud is also on screen. Voice is a help, never the only
 * way to get the information.
 */

import { isVoiceWanted, saveVoiceWanted } from '../data/persistence.js';
import { duckMusic } from './audio.js';

const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;

let wanted = isVoiceWanted();
let voices = [];
/** Bumped on every speak/stop, so a stale callback knows it is stale. */
let token = 0;

function refreshVoices() {
  if (!synth) return;
  voices = synth.getVoices() || [];
}

if (synth) {
  refreshVoices();
  // Most browsers fill the list a moment after the page loads.
  if (typeof synth.addEventListener === 'function') {
    synth.addEventListener('voiceschanged', refreshVoices);
  }
}

/** Voices for a language, best first. */
function voicesFor(lang) {
  if (!voices.length) refreshVoices();
  const list = voices.filter((v) => String(v.lang).toLowerCase().replace('_', '-').startsWith(lang));

  // Prefer the higher-quality voices where a device has several. These are
  // naming conventions of the big platforms, not a guarantee.
  const rank = (v) => {
    const name = `${v.name} ${v.voiceURI}`.toLowerCase();
    let score = 0;
    if (/natural|neural|premium|enhanced/.test(name)) score += 4;
    if (/google|online/.test(name)) score += 2;
    if (lang === 'en' && /en[-_](us|gb)/i.test(v.lang)) score += 1;
    if (lang === 'ar' && /ar[-_](sa|eg)/i.test(v.lang)) score += 1;
    if (v.default) score += 1;
    return score;
  };
  return list.sort((a, b) => rank(b) - rank(a));
}

/**
 * Can this device speak this language?
 * @param {'en'|'ar'} lang
 * @returns {'ok'|'none'|'unsupported'}
 */
export function voiceStatus(lang) {
  if (!synth || typeof SpeechSynthesisUtterance === 'undefined') return 'unsupported';
  return voicesFor(lang).length ? 'ok' : 'none';
}

export function isVoiceOn() {
  return wanted;
}

export function toggleVoice() {
  wanted = !wanted;
  saveVoiceWanted(wanted);
  if (!wanted) stopSpeaking();
  return wanted;
}

export function stopSpeaking() {
  token += 1;
  if (synth) {
    try {
      synth.cancel();
    } catch {
      /* nothing was being said */
    }
  }
  duckMusic(false);
}

/**
 * Say one thing, replacing whatever was being said.
 *
 * @param {string} text  already in the language to be spoken
 * @param {'en'|'ar'} lang
 * @returns {boolean} whether anything will be spoken
 */
export function speak(text, lang) {
  if (!wanted || !synth || typeof SpeechSynthesisUtterance === 'undefined' || !text) {
    return false;
  }
  const [voice] = voicesFor(lang);
  if (!voice) return false;

  stopSpeaking();
  const mine = (token += 1);

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = voice;
  utterance.lang = voice.lang;
  // A touch slower than the default: the listener is a child, and often one
  // reading along in a second language.
  utterance.rate = 0.92;
  utterance.pitch = 1.05;
  utterance.volume = 1;

  const done = () => {
    if (mine === token) duckMusic(false);
  };
  utterance.onend = done;
  utterance.onerror = done;

  duckMusic(true);
  try {
    synth.speak(utterance);
  } catch {
    done();
    return false;
  }
  return true;
}
