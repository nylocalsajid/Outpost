/**
 * screens/supply.js
 * -----------------------------------------------------------------------------
 * The supply rocket.
 *
 * Shown between levels. Earth has sent a cargo rocket with three crates, and
 * there is room in the base for one. This is the whole of the "upgrade"
 * system: no coins, no shop, one choice, three times a mission.
 *
 * The rules are in config/upgrades.js; this is only the screen.
 */

import { html, raw } from '../dom.js';
import { icon } from '../components/icons.js';
import { cometFace, cometBody } from '../components/comet.js';
import { UPGRADES } from '../../config/upgrades.js';
import { LEVELS } from '../../config/levels.js';

const INK = '#16233f';

/** A cargo rocket coming down on its engine, with Comet waiting for it. */
function rocketArt(isMoon) {
  const ground = isMoon ? '#8e96a8' : '#b9623c';
  const groundDark = isMoon ? '#5d6579' : '#7d3a1f';
  const sky = isMoon
    ? ['#04060f', '#0d1430', '#1a2752']
    : ['#3a1c14', '#8a4a2c', '#d58a55'];
  const crate = (x, y, color, r = 0) =>
    `<g transform="translate(${x} ${y}) rotate(${r})"><rect x="-13" y="-22" width="26" height="22" rx="3" fill="${color}" stroke="${INK}" stroke-width="1.6"/><path d="M-13 -11h26M0 -22v22" stroke="${INK}" stroke-width="1.2" opacity="0.5"/></g>`;

  // A fixed scatter of stars: the same sky every time.
  const stars = isMoon
    ? [
        [40, 22, 1.1], [96, 60, 0.8], [150, 18, 1.3], [212, 44, 0.9], [262, 84, 0.8],
        [300, 20, 1], [430, 30, 1.2], [470, 70, 0.8], [520, 16, 1], [575, 52, 1.3],
        [630, 28, 0.9], [690, 66, 1.1], [330, 58, 0.7], [405, 92, 0.7],
      ]
        .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity="0.8"/>`)
        .join('')
    : '';

  // Home: a small blue world on the Moon, a bright point of light on Mars.
  const earth = isMoon
    ? `<circle cx="252" cy="46" r="13" fill="#2f7fd6" stroke="#bfe1ff" stroke-width="1"/><path d="M244 42 q5 -6 11 -2 q3 4 -2 7 q-6 2 -9 -5z M254 52 q4 -1 6 2 q-3 4 -7 2z" fill="#4fc27a"/>`
    : `<circle cx="252" cy="40" r="2.2" fill="#dff1ff"/><circle cx="252" cy="40" r="6" fill="#dff1ff" opacity="0.18"/>`;

  return (
    `<svg class="supply__art" viewBox="0 0 720 176" preserveAspectRatio="xMidYMax slice" role="img" aria-label="A cargo rocket landing next to the base, with three crates and Comet the dog">` +
    `<defs><linearGradient id="supply-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="0.65" stop-color="${sky[1]}"/><stop offset="1" stop-color="${sky[2]}"/></linearGradient></defs>` +
    `<rect width="720" height="176" fill="url(#supply-sky)"/>` +
    stars +
    earth +
    `<path d="M0 138 Q120 116 250 134 T470 128 T720 122 V176 H0Z" fill="${groundDark}" opacity="0.75"/>` +
    `<path d="M0 150 Q180 140 360 149 T720 146 V176 H0Z" fill="${ground}"/>` +
    // the rocket, settling on its engine
    `<g class="supply__rocket">` +
    `<path class="supply__flame" d="M346 120 Q360 164 374 120Z" fill="#ffb020"/>` +
    `<path class="supply__flame supply__flame--in" d="M352 120 Q360 146 368 120Z" fill="#fff3c4"/>` +
    `<path d="M342 116 L326 149 M378 116 L394 149" stroke="#c9d1e0" stroke-width="3.2" stroke-linecap="round"/>` +
    `<path d="M320 149 h12 M388 149 h12" stroke="#c9d1e0" stroke-width="3.2" stroke-linecap="round"/>` +
    `<path d="M360 20 Q386 52 381 120 H339 Q334 52 360 20Z" fill="#f1f4f9" stroke="${INK}" stroke-width="2"/>` +
    `<path d="M360 20 Q373 35 377.5 54 H342.5 Q347 35 360 20Z" fill="#ff9d4d" stroke="${INK}" stroke-width="2"/>` +
    `<circle cx="360" cy="78" r="9.5" fill="#4fd1ff" stroke="${INK}" stroke-width="2"/>` +
    `<path d="M355 74 a7 7 0 0 1 6 -3" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>` +
    `<rect x="345" y="99" width="30" height="13" rx="2" fill="#dfe5ee" stroke="${INK}" stroke-width="1.4"/>` +
    `<path d="M350 105.5h20" stroke="${INK}" stroke-width="1.2"/>` +
    `</g>` +
    `<g class="supply__crates">` +
    crate(424, 150, '#5ad1ff') +
    crate(453, 150, '#6ee7a8') +
    crate(439, 128, '#ffcf5a', -4) +
    `</g>` +
    // Comet, come to see what has arrived
    `<g class="buddy" transform="translate(268 151)"><ellipse cx="4" cy="1" rx="28" ry="3.5" fill="#000" opacity="0.25"/><g transform="scale(1.9)">${cometBody()}</g></g>` +
    `</svg>`
  );
}

/**
 * @param {Object} ctx
 * @param {import('../../sim/state.js').MissionState} ctx.state
 * @param {{level: number, options: Array}} ctx.offer
 */
export function renderSupply(ctx) {
  const { state, site, offer } = ctx;
  const done = LEVELS.find((l) => l.id === offer.level);
  const owned = (state.upgrades || []).map((id) => UPGRADES[id]).filter(Boolean);

  const crates = offer.options
    .map(
      (u) => html`
        <button
          class="crate"
          type="button"
          data-action="take-upgrade"
          data-upgrade="${u.id}"
          style="--crate: var(${u.colorVar})"
        >
          <span class="crate__icon">${raw(icon(u.icon, { size: 26 }))}</span>
          <span class="crate__name">${u.name}</span>
          <span class="crate__text">${u.text}</span>
          <span class="crate__take">Take this one</span>
        </button>
      `
    )
    .join('');

  return html`
    <section class="screen stack stack--lg supply">
      <header class="supply__head">
        <div>
          <p class="supply__kicker">
            ${raw(icon('check', { size: 16 }))} Level ${done.id} complete
          </p>
          <h1 class="supply__title">A supply rocket from Earth</h1>
        </div>
        <button class="btn btn--ghost btn--sm" type="button" data-action="menu-open">
          ${raw(icon('menu', { size: 16 }))} Menu
        </button>
      </header>

      <div class="supply__scene">${raw(rocketArt(site.id === 'moon'))}</div>

      <div class="supply__say">
        <span class="supply__face">${raw(cometFace({ size: 52, mood: 'happy' }))}</span>
        <p>
          <strong>Comet met the rocket.</strong> It brought three crates, but the
          base only has room for one. Which will help you most? You keep it for
          the rest of the mission.
        </p>
      </div>

      <div class="crates">${raw(crates)}</div>

      ${raw(
        owned.length
          ? html`<p class="dim supply__owned">
              You already have: ${owned.map((u) => u.name).join(', ')}.
            </p>`
          : ''
      )}
    </section>
  `;
}
