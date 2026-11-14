/**
 * screens/site-select.js
 * -----------------------------------------------------------------------------
 * The first real trade-off, made before the mission even starts.
 *
 * The two sites are NOT "easy" and "hard". They are different problems, and the
 * numbers shown on each card are the real measured ones, so a player can see
 * why: the Moon doses you twice as fast, and Mars cuts you off from help.
 */

import { html, raw } from '../dom.js';
import { icon } from '../components/icons.js';
import { SITE_LIST } from '../../config/sites.js';
import { MEASURED } from '../../data/nasa-sources.js';
import { outpostScene } from '../components/outpost-scene.js';

export function renderSiteSelect() {
  const cards = SITE_LIST.map((site) => {
    const doseHard = site.baseDoseMsvPerDay > 1;
    const commsHard = site.adviceDelayDays > 0;

    return html`
      <button
        class="site-card site-card--${site.id}"
        type="button"
        data-action="choose-site"
        data-site="${site.id}"
      >
        ${raw(
          outpostScene({
            siteId: site.id,
            shieldCm: 20,
            health: 100,
            dust: site.id === 'mars' ? 0.2 : 0,
            compact: true,
          })
        )}

        <div class="row" style="gap: var(--gap)">
          <span class="site-card__orb"></span>
          <span>
            <span class="site-card__body">${site.body}</span>
            <h2 class="site-card__name">${site.name}</h2>
          </span>
        </div>

        <p class="dim" style="font-size: 0.93rem">${site.blurb}</p>

        <div class="site-card__stats">
          <div class="site-stat">
            <span class="site-stat__label">Radiation, unshielded</span>
            <span
              class="site-stat__value ${doseHard
                ? 'site-stat__value--hard'
                : 'site-stat__value--ok'}"
              >${site.baseDoseMsvPerDay} mSv / ${site.dayWord}</span
            >
          </div>
          <div class="site-stat">
            <span class="site-stat__label">Message to Earth</span>
            <span
              class="site-stat__value ${commsHard
                ? 'site-stat__value--hard'
                : 'site-stat__value--ok'}"
              >${site.commsOneWay}</span
            >
          </div>
          <div class="site-stat">
            <span class="site-stat__label">Length of a ${site.dayWord}</span>
            <span class="site-stat__value">${site.dayLengthLabel}</span>
          </div>
          <div class="site-stat">
            <span class="site-stat__label">Main power problem</span>
            <span class="site-stat__value"
              >${site.id === 'moon' ? 'Shadow on the rim' : 'Dust on the panels'}</span
            >
          </div>
        </div>
      </button>
    `;
  });

  return html`
    <section class="screen stack stack--lg">
      <div>
        <button class="btn btn--ghost btn--sm" type="button" data-action="goto-title">
          ${raw(icon('back', { size: 16 }))} Back
        </button>
      </div>

      <div>
        <h1>Where do you want to build?</h1>
        <p class="dim" style="max-width: 62ch">
          Neither one is the easy option. The Moon gives your crew more than
          twice the radiation, but Earth can answer a radio call in a couple of
          seconds. Mars shields you better, but nobody can help you in time.
        </p>
      </div>

      <div class="sites">${raw(cards.join(''))}</div>

      <div class="card card--inset">
        <h3 class="row row--tight">
          ${raw(icon('radiation', { size: 18 }))} Where those radiation numbers
          come from
        </h3>
        <p class="dim" style="font-size: 0.9rem; margin-bottom: 0.5rem">
          ${MEASURED.MOON_DOSE_EQ_MSV_PER_DAY.note}
          ${MEASURED.MARS_DOSE_EQ_MSV_PER_SOL.note}
        </p>
        <p class="faint" style="font-size: 0.8rem; margin: 0">
          A millisievert (mSv) measures how much radiation a body has absorbed,
          adjusted for how much harm that particular kind of radiation does.
        </p>
      </div>
    </section>
  `;
}
