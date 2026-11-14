/**
 * guide.js
 * -----------------------------------------------------------------------------
 * The guide: Comet's speech bubble, the arrow, and the ring round whatever
 * the arrow is pointing at.
 *
 * It is a layer of its own on top of the page, not part of any screen, so it
 * survives the screen underneath being redrawn and can point at anything on
 * it. The controller (app.js) decides WHICH step is showing; this file only
 * knows how to show one: put the words up, say them aloud, bring the target
 * into view and keep the arrow on it as the page moves.
 *
 * Nothing here blocks the page. The ring and arrow ignore the pointer, so
 * the button being pointed at is pressed directly.
 */

import { cometFace } from './components/comet.js';
import { icon } from './components/icons.js';
import { tr, getLang } from './i18n.js';
import { speak, stopSpeaking, isVoiceOn, toggleVoice, voiceStatus } from './voice.js';

const ARROW =
  '<svg viewBox="0 0 48 60" width="48" height="60" aria-hidden="true">' +
  '<path d="M17 3 h14 a3 3 0 0 1 3 3 v24 h9.5 a2.5 2.5 0 0 1 1.9 4.1 L26.3 56.2 a3 3 0 0 1 -4.6 0 L2.6 34.1 A2.5 2.5 0 0 1 4.5 30 H14 V6 a3 3 0 0 1 3 -3z" ' +
  'fill="#ffe066" stroke="#16233f" stroke-width="3" stroke-linejoin="round"/></svg>';

/**
 * @param {Object} handlers
 * @param {() => void} handlers.onNext   the Next button
 * @param {() => void} handlers.onLeave  the Leave training button
 */
export function createGuide({ onNext, onLeave }) {
  let layer = null;
  let ring = null;
  let arrow = null;
  let bubble = null;

  /** The step on show, and the extras it was shown with. */
  let step = null;
  let extras = {};
  let frame = null;
  let placement = 'bottom';
  /** Until when the page is being scrolled to the target (ms timestamp). */
  let settleUntil = 0;
  /** The step the "no voice on this device" note is attached to, if shown. */
  let noteFor = null;

  function build() {
    if (layer) return;
    layer = document.createElement('div');
    layer.className = 'guide';
    layer.hidden = true;
    layer.innerHTML =
      '<div class="guide__ring"></div>' +
      `<div class="guide__arrow">${ARROW}</div>` +
      '<div class="guide__bubble" role="dialog" aria-live="polite"></div>';
    document.body.appendChild(layer);
    ring = layer.querySelector('.guide__ring');
    arrow = layer.querySelector('.guide__arrow');
    bubble = layer.querySelector('.guide__bubble');

    bubble.addEventListener('click', (event) => {
      const button = event.target.closest('[data-guide]');
      if (!button) return;
      const what = button.dataset.guide;
      if (what === 'next') onNext();
      else if (what === 'leave') onLeave();
      else if (what === 'again') say();
      else if (what === 'voice') {
        const on = toggleVoice();
        paint();
        if (on) say();
      }
    });
  }

  function say() {
    if (step) speak(tr(step.text), getLang());
  }

  /** Draw the bubble for the current step. */
  function paint() {
    if (!step) return;
    const lang = getLang();
    const waits = Boolean(step.until);
    const status = voiceStatus(lang);
    const voiceOn = isVoiceOn();
    const { index = 0, total = 1, stuck = false } = extras;
    const progress = Math.round(((index + 1) / total) * 100);

    // Said once per language, on the first step it applies to, not on all 29.
    const noteDue = voiceOn && status !== 'ok' && (noteFor === null || noteFor === step);
    if (noteDue) noteFor = step;
    const note =
      noteDue
        ? lang === 'ar'
          ? 'This device has no Arabic voice, so read along with me instead.'
          : 'This device has no English voice, so read along with me instead.'
        : '';

    bubble.innerHTML =
      `<div class="guide__bar" aria-hidden="true"><span style="width:${progress}%"></span></div>` +
      `<div class="guide__row">` +
      `<span class="guide__face">${cometFace({ size: 56, mood: step.mood || 'happy' })}</span>` +
      `<div class="guide__words">` +
      `<p class="guide__text">${escapeHtml(tr(step.text))}</p>` +
      (step.why
        ? `<p class="guide__why">${icon('bolt', { size: 15 })}<span>${escapeHtml(tr(step.why))}</span></p>`
        : '') +
      (stuck
        ? `<p class="guide__stuck">${escapeHtml(tr('No blocks left? Press minus on another row to take one back.'))}</p>`
        : '') +
      (note ? `<p class="guide__note">${escapeHtml(tr(note))}</p>` : '') +
      `</div></div>` +
      `<div class="guide__foot">` +
      `<button class="guide__ghost" type="button" data-guide="voice" aria-pressed="${voiceOn}">${icon('sound', { size: 16 })}<span>${escapeHtml(tr(voiceOn ? 'Voice on' : 'Voice off'))}</span></button>` +
      (voiceOn && status === 'ok'
        ? `<button class="guide__ghost" type="button" data-guide="again">${icon('replay', { size: 16 })}<span>${escapeHtml(tr('Say it again'))}</span></button>`
        : '') +
      `<button class="guide__ghost guide__leave" type="button" data-guide="leave">${escapeHtml(tr('Leave training'))}</button>` +
      (step.passive
        ? ''
        : waits
          ? `<span class="guide__turn">${escapeHtml(tr('Your turn'))}</span>`
          : `<button class="btn btn--primary guide__next" type="button" data-guide="next">${escapeHtml(tr('Next'))}</button>`) +
      `</div>`;
  }

  function target() {
    return step && step.target ? document.querySelector(step.target) : null;
  }

  /** Height of anything pinned to the top of the window (the day's top bar). */
  function pinnedTop() {
    const hud = document.querySelector('.hud');
    if (!hud) return 0;
    const style = getComputedStyle(hud);
    return style.position === 'sticky' || style.position === 'fixed'
      ? hud.getBoundingClientRect().bottom
      : 0;
  }

  /** Scroll so the target sits in the middle of the space the bubble leaves. */
  function bringIntoView() {
    const el = target();
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const top = Math.max(pinnedTop(), 0) + 70; // room for the arrow
    const bottom = window.innerHeight - bubble.offsetHeight - 24;
    const fits = rect.top >= top && rect.bottom <= bottom;
    if (fits) return;

    const middle = (top + bottom) / 2;
    const wanted = rect.top + Math.min(rect.height, bottom - top) / 2 - middle;
    settleUntil = performance.now() + 700;
    window.scrollBy({ top: wanted, behavior: 'smooth' });
  }

  /** Keep the ring and arrow on the target. Runs every frame while showing. */
  function track() {
    frame = requestAnimationFrame(track);
    if (!step) return;
    const el = target();

    if (!el) {
      ring.style.display = 'none';
      arrow.style.display = 'none';
      layer.classList.toggle('guide--center', !step.target);
      return;
    }
    layer.classList.remove('guide--center');

    const rect = el.getBoundingClientRect();
    const pad = 7;
    ring.style.display = 'block';
    ring.style.transform = `translate(${Math.round(rect.left - pad)}px, ${Math.round(rect.top - pad)}px)`;
    ring.style.width = `${Math.round(rect.width + pad * 2)}px`;
    ring.style.height = `${Math.round(rect.height + pad * 2)}px`;

    // The arrow sits above the target pointing down, unless there is no room.
    const roomAbove = rect.top - Math.max(pinnedTop(), 0) > 72;
    const x = Math.round(rect.left + rect.width / 2 - 24);
    const y = roomAbove ? Math.round(rect.top - 70) : Math.round(rect.bottom + 10);
    arrow.style.display = 'block';
    arrow.style.transform = `translate(${x}px, ${y}px)`;
    arrow.classList.toggle('guide__arrow--up', !roomAbove);

    // The bubble moves out of the target's way, once the page has settled.
    if (performance.now() > settleUntil) {
      const centre = (rect.top + rect.bottom) / 2 / window.innerHeight;
      if (placement === 'bottom' && centre > 0.66) placement = 'top';
      else if (placement === 'top' && centre < 0.4) placement = 'bottom';
      layer.classList.toggle('guide--top', placement === 'top');
    }
  }

  return {
    /**
     * Show a step. Showing the step already on show only refreshes its extras
     * (it is not said again).
     *
     * @param {Object} next    a step from config/training.js
     * @param {Object} [info]  { index, total, stuck }
     */
    show(next, info = {}) {
      build();
      const isNew = next !== step;
      step = next;
      extras = info;
      layer.hidden = false;
      layer.dataset.target = next.target || '';
      paint();
      if (!frame) frame = requestAnimationFrame(track);

      if (isNew) {
        placement = 'bottom';
        layer.classList.remove('guide--top');
        say();
        // After the screen underneath has been laid out.
        requestAnimationFrame(() => requestAnimationFrame(bringIntoView));
        if (!next.until) {
          const button = bubble.querySelector('[data-guide="next"]');
          if (button) button.focus({ preventScroll: true });
        }
      }
    },

    /** Redraw the words: the language has changed. */
    repaint() {
      noteFor = null;
      if (step && layer && !layer.hidden) {
        paint();
        say();
      }
    },

    hide() {
      if (!layer || layer.hidden) {
        step = null;
        return;
      }
      layer.hidden = true;
      step = null;
      if (frame) cancelAnimationFrame(frame);
      frame = null;
      stopSpeaking();
    },

    isShowing() {
      return Boolean(step);
    },
  };
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
