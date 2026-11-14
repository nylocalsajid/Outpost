/**
 * screens/trained.js
 * -----------------------------------------------------------------------------
 * The end of the training mission: the three things it taught, and the way
 * into a real one.
 */

import { html, raw } from '../dom.js';
import { icon } from '../components/icons.js';
import { cometFace } from '../components/comet.js';
import { TRAINING_LESSONS } from '../../config/training.js';
import { BALANCE } from '../../config/systems.js';

export function renderTrained() {
  const lessons = TRAINING_LESSONS.map(
    (l, i) => html`
      <li class="lesson" style="--lesson: var(${l.colorVar}); --i: ${i}">
        <span class="lesson__icon">${raw(icon(l.icon, { size: 24 }))}</span>
        <div>
          <h2 class="lesson__title">${l.title}</h2>
          <p class="lesson__text">${l.text}</p>
        </div>
      </li>
    `
  ).join('');

  return html`
    <section class="screen stack stack--lg trained">
      <header class="trained__head">
        ${raw(cometFace({ size: 96, mood: 'happy' }))}
        <div>
          <p class="trained__kicker">${raw(icon('check', { size: 16 }))} Training complete</p>
          <h1 class="trained__title">You are ready, Commander</h1>
          <p class="trained__sub">
            That was three days. A real mission is ${BALANCE.missionDays} days, on the
            Moon or on Mars, and it gets harder as it goes.
          </p>
        </div>
      </header>

      <ol class="lessons">
        ${raw(lessons)}
      </ol>

      <div class="trained__actions">
        <button class="btn btn--go btn--lg" type="button" data-action="goto-sites">
          ${raw(icon('rocket'))} Start a real mission
        </button>
        <button class="btn" type="button" data-action="start-training">
          ${raw(icon('replay', { size: 17 }))} Do the training again
        </button>
        <button class="btn btn--ghost" type="button" data-action="goto-title">
          ${raw(icon('home', { size: 17 }))} Main menu
        </button>
      </div>
    </section>
  `;
}
