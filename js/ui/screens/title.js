/**
 * screens/title.js
 * -----------------------------------------------------------------------------
 * The front door. Three jobs, in order of importance:
 *   1. say what the player is about to do, in one sentence a child can read
 *   2. show the central trade-off up front, so the game is not a surprise
 *   3. prove the data is real before anyone clicks anything
 */

import { html, raw } from '../dom.js';
import { icon } from '../components/icons.js';
import { dataModeBadge, dataModeLine } from '../components/source-tag.js';
import { BALANCE, TOTAL_DEMAND } from '../../config/systems.js';

export function renderTitle(ctx) {
  const { weather } = ctx;

  return html`
    <section class="screen title">
      <!-- Animated dogfight: spaceship pursuing an alien UFO -->
      <div class="space-chase" aria-hidden="true">
        <div class="space-chase__convoy">
          <!-- Chasing Spaceship (Behind) -->
          <div class="space-chase__fighter">
            <svg viewBox="0 0 58 32" class="ship-svg ship-svg--fighter">
              <!-- Thruster flame -->
              <polygon points="6,12 -14,16 6,20" fill="#ff4d4d" class="thruster-flame" />
              <polygon points="7,13 -6,16 7,19" fill="#ffe066" class="thruster-core" />
              <!-- Wings -->
              <path d="M14 11 L0 2 L20 11 Z" fill="#24324f" stroke="#4fd1ff" stroke-width="1.6" />
              <path d="M14 21 L0 30 L20 21 Z" fill="#24324f" stroke="#4fd1ff" stroke-width="1.6" />
              <!-- Fuselage -->
              <path d="M6 11 L38 12 L56 16 L38 20 L6 21 L10 16 Z" fill="#141f36" stroke="#4fd1ff" stroke-width="1.8" />
              <!-- Cockpit glow -->
              <polygon points="28,14 42,16 42,16 28,18" fill="#4fd1ff" opacity="0.95" />
              <!-- Wingtip cannons -->
              <circle cx="2" cy="2" r="1.6" fill="#ffe066" />
              <circle cx="2" cy="30" r="1.6" fill="#ffe066" />
            </svg>
          </div>

          <!-- Laser blasts firing from fighter toward UFO -->
          <div class="space-chase__lasers">
            <span class="laser laser--1"></span>
            <span class="laser laser--2"></span>
          </div>

          <!-- Alien Saucer (In front, evading) -->
          <div class="space-chase__alien">
            <svg viewBox="0 0 54 32" class="ship-svg ship-svg--alien">
              <!-- Alien green energy dome -->
              <ellipse cx="27" cy="12" rx="12" ry="8" fill="#5fe08a" opacity="0.85" />
              <ellipse cx="27" cy="10.5" rx="8" ry="5" fill="#c3ffd9" />
              <!-- Saucer disc -->
              <ellipse cx="27" cy="18.5" rx="25" ry="7" fill="#1b2a47" stroke="#5fe08a" stroke-width="1.8" />
              <!-- Porthole lights -->
              <circle cx="11" cy="18.5" r="2" fill="#ffe066" />
              <circle cx="19" cy="20.5" r="2" fill="#5fe08a" />
              <circle cx="27" cy="21.5" r="2.2" fill="#ffe066" />
              <circle cx="35" cy="20.5" r="2" fill="#5fe08a" />
              <circle cx="43" cy="18.5" r="2" fill="#ffe066" />
              <!-- Plasma wake -->
              <path d="M2 18.5 Q -10 17 -18 18.5" stroke="#5fe08a" stroke-width="2.5" stroke-linecap="round" opacity="0.7" />
            </svg>
          </div>
        </div>
      </div>

      <div class="title__eyebrow">${raw(dataModeBadge(weather))}</div>

      <div class="title__name-wrap">
        <h1 class="title__name" data-no-tr>OUTPOST</h1>
        ${raw(renderAlienFlagPerched())}
      </div>
      <p class="title__tagline">
        Command an outpost on the Moon or Mars. Every choice costs power, air, food, or radiation shielding.
      </p>
      <p class="title__by">A game by Team Sajid</p>

      ${raw(
        ctx.hasSave
          ? html`<div class="title__actions title__actions--primary">
              <button
                class="btn btn--go btn--lg"
                type="button"
                data-action="resume-mission"
              >
                ${raw(icon('replay'))} Continue your mission
              </button>
              <button
                class="btn btn--ghost btn--sm"
                type="button"
                data-action="abandon-mission"
              >
                Start over instead
              </button>
            </div>`
          : ''
      )}

      <div class="title__actions title__actions--primary">
        <button
          class="${ctx.hasSave ? 'btn btn--lg' : 'btn btn--primary btn--lg'}"
          type="button"
          data-action="goto-sites"
        >
          ${raw(icon('rocket'))} ${ctx.hasSave ? 'New mission' : 'Start a mission'}
        </button>
        <button class="btn btn--lg" type="button" data-action="start-training">
          ${raw(icon('sound'))} Training with Comet
        </button>
        <button class="btn btn--lg" type="button" data-action="goto-howto">
          ${raw(icon('info'))} How to play
        </button>
      </div>
      ${raw(
        ctx.best
          ? html`<p class="title__best">
              ${raw(icon('trophy', { size: 17 }))}
              <span>Your best: <strong>${ctx.best.total} points</strong></span>
              <span class="title__best-stars" aria-label="${ctx.best.stars} out of 3 stars">
                ${raw(
                  [0, 1, 2]
                    .map((i) => `<span class="${i < ctx.best.stars ? 'is-on' : ''}">${icon('star', { size: 15 })}</span>`)
                    .join('')
                )}
              </span>
            </p>`
          : ''
      )}

      <div class="title__actions title__actions--secondary">
        <button class="btn btn--ghost btn--sm" type="button" data-action="toggle-lang" data-no-tr>
          ${raw(icon('globe', { size: 15 }))} ${ctx.lang === 'ar' ? 'English' : 'العربية'}
        </button>
        <button class="btn btn--ghost btn--sm" type="button" data-action="goto-sources">
          ${raw(icon('book', { size: 15 }))} NASA data sources
        </button>
        <button
          class="btn btn--ghost btn--sm"
          type="button"
          data-action="toggle-mute"
          aria-pressed="${ctx.muted ? 'true' : 'false'}"
        >
          ${ctx.muted ? 'Music and sound off' : 'Music and sound on'}
        </button>
      </div>

      <div class="title__facts">
        <div class="title__fact-card title__fact-card--power">
          <div class="title__fact-icon">${raw(icon('bolt', { size: 22 }))}</div>
          <h3 class="title__fact-title">Scarce Power</h3>
          <div class="title__fact-stat">
            ${BALANCE.baseBlocksPerDay} ⚡ / day
            <span class="title__fact-need">(${TOTAL_DEMAND} ⚡ needed)</span>
          </div>
          <p class="title__fact-desc">
            You never have enough power to run everything. Every choice sacrifices one system for another.
          </p>
        </div>

        <div class="title__fact-card title__fact-card--weather">
          <div class="title__fact-icon">${raw(icon('radiation', { size: 22 }))}</div>
          <h3 class="title__fact-title">Real Space Weather</h3>
          <div class="title__fact-stat">
            DONKI &amp; Curiosity
          </div>
          <p class="title__fact-desc">
            Solar flares that hit your outpost actually happened. Real radiation data from lunar &amp; Mars rovers.
          </p>
          <div class="title__fact-badge">${raw(dataModeLine(weather))}</div>
        </div>

        <div class="title__fact-card title__fact-card--mission">
          <div class="title__fact-icon">${raw(icon('sun', { size: 22 }))}</div>
          <h3 class="title__fact-title">Fast-Paced Run</h3>
          <div class="title__fact-stat">
            ${BALANCE.missionDays} Days
            <span class="title__fact-time">· 4 levels · ~10 minutes</span>
          </div>
          <p class="title__fact-desc">
            It starts easy and gets harder. Survive ${BALANCE.missionDays} days of solar storms and power shortages, then fly your crew home.
          </p>
        </div>
      </div>
    </section>
  `;
}

/**
 * Cute green alien perched atop the real letter 'O', holding the flag of
 * Sudan in its left hand and the flag of Egypt in its right. The alien faces
 * us, so Sudan is on our right and Egypt on our left. The two flags are the
 * same size, each flying away from its pole.
 */
function renderAlienFlagPerched() {
  return `
    <span class="title__alien-flag" aria-hidden="true">
      <svg viewBox="-24 0 104 75" class="alien-flag-svg">
        <defs>
          <filter id="flag-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.65)" />
          </filter>
          <filter id="alien-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="rgba(95,224,138,0.7)" />
          </filter>
        </defs>

        <!-- Cute Green Alien standing firmly on top of the O -->
        <!-- Legs & boots -->
        <path d="M22 72 L22 65 L25 60" stroke="#38b000" stroke-width="3.5" stroke-linecap="round" fill="none" />
        <path d="M34 72 L34 65 L31 60" stroke="#38b000" stroke-width="3.5" stroke-linecap="round" fill="none" />
        <ellipse cx="22" cy="72" rx="3.5" ry="2" fill="#2d6a4f" />
        <ellipse cx="34" cy="72" rx="3.5" ry="2" fill="#2d6a4f" />

        <!-- Torso -->
        <ellipse cx="28" cy="51" rx="10" ry="12" fill="#5fe08a" stroke="#38b000" stroke-width="2" />
        <path d="M20 55 Q28 59 36 55" stroke="#2d6a4f" stroke-width="2" fill="none" />

        <!-- Arms: one out to each flagpole -->
        <path d="M19 47 L13 45" stroke="#5fe08a" stroke-width="3.8" stroke-linecap="round" fill="none" />
        <circle cx="13" cy="45" r="2.8" fill="#5fe08a" />
        <path d="M37 47 L43 45" stroke="#5fe08a" stroke-width="3.8" stroke-linecap="round" fill="none" />
        <circle cx="43" cy="45" r="2.8" fill="#5fe08a" />

        <!-- Head -->
        <ellipse cx="28" cy="31" rx="15" ry="13" fill="#5fe08a" stroke="#38b000" stroke-width="2" filter="url(#alien-glow)" />

        <!-- Antenna with glowing orb -->
        <path d="M28 19 Q28 10 24 6" stroke="#5fe08a" stroke-width="2.6" stroke-linecap="round" fill="none" />
        <circle cx="24" cy="6" r="3.5" fill="#ffe066" />

        <!-- Big Expressive Alien Eyes -->
        <ellipse cx="21" cy="30" rx="4.5" ry="6.2" fill="#070b16" transform="rotate(-12 21 30)" />
        <ellipse cx="35" cy="30" rx="4.5" ry="6.2" fill="#070b16" transform="rotate(12 35 30)" />
        <circle cx="22" cy="27.5" r="2.1" fill="#ffffff" />
        <circle cx="36" cy="27.5" r="2.1" fill="#ffffff" />
        <circle cx="20" cy="32.5" r="1.1" fill="#ffffff" />
        <circle cx="34" cy="32.5" r="1.1" fill="#ffffff" />

        <!-- Happy little alien smile -->
        <path d="M25 38 Q28 41 31 38" stroke="#1d6639" stroke-width="1.8" stroke-linecap="round" fill="none" />

        <!-- Golden flagpole in the alien's left hand (on our right): Sudan.
             This is the side where a flag flies the usual way round, with its
             hoist on the left, so Sudan's green triangle sits where it should. -->
        <line x1="43" y1="73" x2="43" y2="4" stroke="#d4af37" stroke-width="3.2" stroke-linecap="round" />
        <circle cx="43" cy="4" r="3.5" fill="#ffe066" stroke="#b58900" stroke-width="1" />

        <!-- Sudanese Flag waving -->
        <g class="sudan-flag" filter="url(#flag-glow)">
          <!-- Red stripe (Top) -->
          <rect x="43" y="5" width="36" height="8" fill="#d21034" />
          <!-- White stripe (Middle) -->
          <rect x="43" y="13" width="36" height="8" fill="#ffffff" />
          <!-- Black stripe (Bottom) -->
          <rect x="43" y="21" width="36" height="8" fill="#0e0e0e" />
          <!-- Green triangle at the hoist, on the left against the pole -->
          <polygon points="43,5 43,29 55,17" fill="#007229" />
          <!-- Wave highlights -->
          <line x1="55" y1="5" x2="55" y2="29" stroke="rgba(255,255,255,0.25)" stroke-width="1.6" />
          <line x1="67" y1="5" x2="67" y2="29" stroke="rgba(0,0,0,0.25)" stroke-width="1.6" />
        </g>

        <!-- Golden flagpole in the alien's right hand (on our left): Egypt.
             Same pole, same height, same 36 x 24 flag. Its stripes and eagle
             are symmetrical, so flying the other way changes nothing. -->
        <line x1="13" y1="73" x2="13" y2="4" stroke="#d4af37" stroke-width="3.2" stroke-linecap="round" />
        <circle cx="13" cy="4" r="3.5" fill="#ffe066" stroke="#b58900" stroke-width="1" />

        <!-- Egyptian Flag waving -->
        <g class="egypt-flag" filter="url(#flag-glow)">
          <!-- Red stripe (Top) -->
          <rect x="-23" y="5" width="36" height="8" fill="#ce1126" />
          <!-- White stripe (Middle) -->
          <rect x="-23" y="13" width="36" height="8" fill="#ffffff" />
          <!-- Golden Eagle of Saladin (Coat of Arms of Egypt), centred -->
          <path d="M-8.5 15 h7 l1.2 2 h-2 v2 h2 l-1.2 1.8 h-7 l-1.2 -1.8 h2 v-2 h-2 z" fill="#c69214" stroke="#8c6403" stroke-width="0.5" />
          <circle cx="-5" cy="14.2" r="1.3" fill="#c69214" />
          <!-- Black stripe (Bottom) -->
          <rect x="-23" y="21" width="36" height="8" fill="#0e0e0e" />
          <!-- Wave highlights -->
          <line x1="1" y1="5" x2="1" y2="29" stroke="rgba(255,255,255,0.25)" stroke-width="1.6" />
          <line x1="-11" y1="5" x2="-11" y2="29" stroke="rgba(0,0,0,0.25)" stroke-width="1.6" />
        </g>
      </svg>
    </span>
  `;
}
