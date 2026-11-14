/**
 * screens/menu.js
 * -----------------------------------------------------------------------------
 * The pause menu: one button in the corner of the game that leads everywhere
 * else, so the screen a child plays on carries one way out instead of three.
 *
 * Nothing here loses a mission by accident. Leaving for the main menu keeps
 * the mission saved, and restarting asks once before it throws a mission away.
 */

import { html, raw } from '../dom.js';
import { icon } from '../components/icons.js';
import { dataModeBadge } from '../components/source-tag.js';
import { getSite } from '../../config/sites.js';

/**
 * @param {Object} ctx
 * @param {'open'|'confirm-restart'} ctx.menu
 * @param {boolean} ctx.musicOn
 * @param {boolean} ctx.muted
 */
export function renderMenu(ctx) {
  const { mission, weather, menu, musicOn, muted, voiceOn, lang } = ctx;
  const training = Boolean(mission && mission.training);
  const site = mission ? getSite(mission.siteId) : null;
  const confirming = menu === 'confirm-restart';
  const playing = mission && !mission.over;

  return html`
    <div class="modal-backdrop">
      <div class="modal menu" role="dialog" aria-modal="true" aria-label="Menu">
        <div class="menu__head">
          <h2 class="menu__title">Paused</h2>
          ${raw(dataModeBadge(weather))}
        </div>
        ${raw(
          playing
            ? html`<p class="dim menu__where">
                ${site.dayWord === 'sol' ? 'Sol' : 'Day'} ${mission.day} of
                ${mission.missionDays} at ${site.name}.
                ${training
                  ? 'This is the training mission.'
                  : 'Your mission is saved, so you can leave and come back.'}
              </p>`
            : ''
        )}

        <div class="menu__list">
          <button class="btn btn--primary btn--lg btn--block" type="button" data-action="menu-close">
            ${raw(icon('check'))} Keep playing
          </button>
          <div class="menu__sound">
            <button
              class="btn btn--block"
              type="button"
              data-action="toggle-music"
              aria-pressed="${musicOn && !muted ? 'true' : 'false'}"
              ${muted ? raw('disabled') : raw('')}
            >
              ${raw(icon('music', { size: 17 }))} Music: ${musicOn && !muted ? 'on' : 'off'}
            </button>
            <button
              class="btn btn--block"
              type="button"
              data-action="toggle-mute"
              aria-pressed="${muted ? 'false' : 'true'}"
            >
              ${raw(icon('sound', { size: 17 }))} All sound: ${muted ? 'off' : 'on'}
            </button>
          </div>
          <div class="menu__sound">
            <button
              class="btn btn--block"
              type="button"
              data-action="toggle-voice"
              aria-pressed="${voiceOn ? 'true' : 'false'}"
            >
              ${raw(icon('radio', { size: 17 }))} Voice: ${voiceOn ? 'on' : 'off'}
            </button>
            <button class="btn btn--block" type="button" data-action="toggle-lang" data-no-tr>
              ${raw(icon('globe', { size: 17 }))} ${lang === 'ar' ? 'English' : 'العربية'}
            </button>
          </div>
          <button class="btn btn--block" type="button" data-action="goto-howto">
            ${raw(icon('info', { size: 17 }))} How to play
          </button>
          <button class="btn btn--block" type="button" data-action="goto-sources">
            ${raw(icon('book', { size: 17 }))} NASA data sources
          </button>
          ${raw(
            mission
              ? confirming
                ? html`<div class="menu__confirm">
                    <p>Start this mission again from day 1? Today's progress will be lost.</p>
                    <div class="row">
                      <button class="btn btn--danger" type="button" data-action="menu-restart-yes">
                        Yes, restart
                      </button>
                      <button class="btn btn--ghost" type="button" data-action="menu-restart-no">
                        No, go back
                      </button>
                    </div>
                  </div>`
                : html`<button class="btn btn--block" type="button" data-action="menu-restart">
                    ${raw(icon('replay', { size: 17 }))}
                    ${training ? 'Restart training' : 'Restart mission'}
                  </button>`
              : ''
          )}
          <button class="btn btn--block" type="button" data-action="menu-home">
            ${raw(icon('back', { size: 17 }))} Main menu
          </button>
        </div>
      </div>
    </div>
  `;
}
