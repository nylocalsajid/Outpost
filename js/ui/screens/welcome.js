/**
 * screens/welcome.js
 * -----------------------------------------------------------------------------
 * The first thing a new player sees: which language, and would you like to be
 * shown how to play.
 *
 * Two questions, one at a time. The language question is written in both
 * languages at once, because the player has not chosen yet. The second is in
 * the language they picked.
 */

import { html, raw } from '../dom.js';
import { icon } from '../components/icons.js';
import { cometFace } from '../components/comet.js';

/**
 * @param {Object} ctx
 * @param {'lang'|'offer'} ctx.stage
 * @param {'en'|'ar'} ctx.lang
 */
export function renderWelcome(ctx) {
  const body =
    ctx.stage === 'lang'
      ? html`
          <div class="welcome__face">${raw(cometFace({ size: 92, mood: 'happy' }))}</div>
          <h2 class="welcome__title" data-no-tr>
            <span lang="en" dir="ltr">Choose your language</span>
            <span lang="ar" dir="rtl">اختر لغتك</span>
          </h2>
          <div class="welcome__langs" data-no-tr>
            <button class="welcome__lang" type="button" data-action="set-lang" data-lang="en" lang="en" dir="ltr">
              English
            </button>
            <button class="welcome__lang" type="button" data-action="set-lang" data-lang="ar" lang="ar" dir="rtl">
              العربية
            </button>
          </div>
        `
      : html`
          <div class="welcome__face">${raw(cometFace({ size: 92, mood: 'happy' }))}</div>
          <h2 class="welcome__title">Hello! I am Comet</h2>
          <p class="welcome__text">
            Shall I show you how to play? It is a short training mission: three
            days on the Moon. I will talk you through it and point at every
            button.
          </p>
          <div class="welcome__actions">
            <button class="btn btn--go btn--lg btn--block" type="button" data-action="start-training">
              ${raw(icon('sound', { size: 20 }))} Yes, show me how to play
            </button>
            <button class="btn btn--ghost btn--block" type="button" data-action="welcome-skip">
              No thanks, I know how to play
            </button>
          </div>
        `;

  return html`
    <div class="modal-backdrop">
      <div class="modal welcome" role="dialog" aria-modal="true" aria-label="Welcome">
        ${raw(body)}
      </div>
    </div>
  `;
}
