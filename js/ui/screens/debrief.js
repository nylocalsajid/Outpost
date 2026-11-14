/**
 * screens/debrief.js
 * -----------------------------------------------------------------------------
 * The end of the mission, and the actual point of the game.
 *
 * It opens with the flight home: the ship lifts off from the Moon or Mars and
 * crosses to Earth, and only when it arrives does the result appear. The whole
 * page changes colour with it, from the black of deep space to the blue of
 * home (see the `data-screen` rules in base.css).
 *
 * A player who lost is told which trade-off beat them and what the real number
 * was. A player who won is told what it cost them. Nobody gets a bare score.
 *
 * Replay is offered two ways on purpose:
 *   - "Same mission again" keeps the seed and the space weather, so a player can
 *     test one different decision against an identical Sun. This is the single
 *     most useful button for learning a trade-off.
 *   - "New mission" rerolls everything.
 */

import { html, raw } from '../dom.js';
import { icon } from '../components/icons.js';
import { cometFace } from '../components/comet.js';
import { EVENTS } from '../../config/events.js';
import { getSite } from '../../config/sites.js';
import { UPGRADES } from '../../config/upgrades.js';
import {
  gradeMission,
  buildDebrief,
  debriefSeries,
  missionScore,
  nextTimeTips,
} from '../../sim/scoring.js';
import { levelForDay } from '../../config/levels.js';
import { resourceChart, doseChart, debriefTable } from '../components/chart.js';
import { dataModeBadge } from '../components/source-tag.js';
import { BALANCE, scienceTargets } from '../../config/systems.js';
import { EXPERIMENTS } from '../../config/experiments.js';

/**
 * The score: one number, where it came from, how far the crew got, and
 * whether it beats the player's best at this world.
 */
function renderScore(state, result) {
  const score = result ? result.score : missionScore(state);
  const reachedDay = Math.max(1, score.daysSurvived);
  const level = levelForDay(reachedDay);
  const previous = result ? result.previousBest : null;
  const part = (label, value, colorVar) =>
    `<li class="scorecard__part" style="--part: var(${colorVar})"><strong>${value}</strong><span>${label}</span></li>`;

  return html`
    <div class="card scorecard${result && result.isBest ? ' scorecard--best' : ''}">
      <div class="scorecard__main">
        <span class="scorecard__icon">${raw(icon('trophy', { size: 30 }))}</span>
        <div>
          <p class="scorecard__label">Your score</p>
          <p class="scorecard__total">${score.total} <span>points</span></p>
        </div>
        <p class="scorecard__best">
          ${result && result.isBest
            ? previous
              ? `New best! Your old best here was ${previous.total}.`
              : 'Your first score here. That is the one to beat.'
            : previous
              ? `Your best here is ${previous.total}.`
              : ''}
        </p>
      </div>
      <ul class="scorecard__parts">
        ${raw(part('science', score.science, '--sys-science'))}
        ${raw(part('crew health', score.health, '--sys-health'))}
        ${raw(part('for days survived', score.days, '--sys-power'))}
      </ul>
      <p class="scorecard__reached">
        You reached day ${reachedDay} of ${state.missionDays}, in level ${level.id}: ${level.name}.
      </p>
    </div>
  `;
}

/** What to do differently next time: up to three things, from this mission. */
function renderTips(state, site) {
  const tips = nextTimeTips(state);
  const other = site.id === 'moon' ? 'Mars' : 'the Moon';
  return html`
    <div class="card nexttime">
      <h2 class="nexttime__title">How to do better next time</h2>
      <ol class="nexttime__list">
        ${raw(
          tips
            .map(
              (t) =>
                `<li class="nexttime__tip"><strong>${t.title}.</strong> <span>${t.text}</span></li>`
            )
            .join('')
        )}
      </ol>
      <p class="nexttime__next">
        <strong>What next?</strong>
        <span>Play this same mission again to try these, or take a new one on ${other}.</span>
      </p>
    </div>
  `;
}

/**
 * What this mission met and what it was given: the events, in the order they
 * happened, and the upgrades taken from the supply rockets. It is the part of
 * the result that differs from one mission to the next.
 */
function renderJourney(state, grade) {
  const events = state.log
    .filter((entry) => entry.event && EVENTS[entry.event])
    .map((entry) => {
      const label = EVENTS[entry.event].label(getSite(state.siteId));
      return `<li><span class="journey__day">Day ${entry.day}</span> ${label}</li>`;
    });
  const upgrades = (state.upgrades || []).map((id) => UPGRADES[id]).filter(Boolean);
  if (!events.length && !upgrades.length) return '';

  const mood = grade.tier === 'lost' ? 'worried' : 'happy';
  return html`
    <div class="card journey">
      <div class="journey__head">
        ${raw(cometFace({ size: 52, mood }))}
        <div>
          <h2 class="journey__title">What happened on your mission</h2>
          <p class="dim journey__sub">
            ${grade.tier === 'lost'
              ? 'Comet is ready to try again whenever you are.'
              : 'Comet came home too, and slept the whole way.'}
          </p>
        </div>
      </div>
      ${raw(
        events.length
          ? `<ul class="journey__events">${events.join('')}</ul>`
          : ''
      )}
      ${raw(
        upgrades.length
          ? `<ul class="upgrades" aria-label="Upgrades from supply rockets">${upgrades
              .map(
                (u) =>
                  `<li class="upgrades__chip" style="--chip: var(${u.colorVar})">${icon(u.icon, { size: 14 })}<span>${u.name}</span></li>`
              )
              .join('')}</ul>`
          : ''
      )}
    </div>
  `;
}

export function renderDebrief(ctx) {
  const { state, site, weather } = ctx;
  const grade = gradeMission(state);
  const findings = buildDebrief(state);
  const series = debriefSeries(state);

  const findingCards = findings
    .map(
      (f) => html`
        <div
          class="finding finding--${f.tone}${f.emphasis ? ' finding--emphasis' : ''}"
        >
          <div class="finding__heading">${f.heading}</div>
          <p class="finding__body">${f.body}</p>
        </div>
      `
    )
    .join('');

  const stars = STARS[grade.tier] || 0;

  return html`
    <section
      class="screen debrief stack stack--lg${ctx.flown ? ' is-landed' : ''}"
    >
      ${raw(returnFlight(site, grade.tier, ctx.flown))}

      <div class="debrief__results stack stack--lg">
      <div class="verdict verdict--${grade.tier}">
        <div class="label">${site.name}, ${site.body}</div>
        <div
          class="stars"
          role="img"
          aria-label="${stars} out of 3 stars"
        >
          ${raw(
            [0, 1, 2]
              .map(
                (i) =>
                  `<span class="stars__one${i < stars ? ' is-on' : ''}" style="--i:${i}">${icon('star', { size: 34 })}</span>`
              )
              .join('')
          )}
        </div>
        <h1 class="verdict__title">${grade.title}</h1>
        <p class="verdict__summary">${grade.summary}</p>
      </div>

      ${raw(renderScore(state, ctx.scoreResult))}
      ${raw(renderTips(state, site))}
      ${raw(renderJourney(state, grade))}

      <div class="scoreboard">
        ${raw(
          tile(
            'Science',
            state.science,
            `of ${scienceTargets(site).success} needed`,
            'var(--sys-science)'
          )
        )}
        ${raw(tile('Crew health', `${Math.round(state.health)}%`, 'at the end', 'var(--sys-health)'))}
        ${raw(tile('Total dose', state.doseTotalMsv, 'mSv', 'var(--sys-air)'))}
        ${raw(tile('Shield built', `${state.shieldCm}`, 'cm of regolith', 'var(--sys-shield)'))}
      </div>

      <div class="card">
        <div class="card__head">
          <h2 style="margin: 0">How the mission went</h2>
        </div>
        ${raw(resourceChart(series, site.dayWord))}
        <hr class="divider" />
        ${raw(doseChart(series, site.dayWord, BALANCE.safeDoseMsvPerDay))}
        <hr class="divider" />
        ${raw(debriefTable(series, site.dayWord))}
      </div>

      ${raw(renderResearchLog(state))}

      <div>
        <h2>What your choices actually did</h2>
        <div class="stack stack--sm">${raw(findingCards)}</div>
      </div>

      <div class="card card--inset">
        <div class="card__head">
          <h3 style="margin: 0">The data you just played against</h3>
          ${raw(dataModeBadge(weather))}
        </div>
        <p class="dim" style="font-size: 0.92rem">
          ${weather.flareCount} real solar flare records from NASA's DONKI
          database, ${weather.windowLabel}. ${weather.sourceNote}
        </p>
        <button class="btn btn--ghost btn--sm" type="button" data-action="goto-sources">
          ${raw(icon('book', { size: 15 }))} See every source
        </button>
      </div>

      <div class="stack stack--sm">
        <button
          class="btn btn--block"
          type="button"
          data-action="copy-result"
        >
          ${raw(icon(ctx.copied ? 'check' : 'book', { size: 16 }))}
          ${ctx.copied
            ? 'Copied — paste it to a friend'
            : 'Copy my result to share'}
        </button>
        <button
          class="btn btn--primary btn--lg btn--block"
          type="button"
          data-action="replay-same"
        >
          ${raw(icon('replay'))} Same mission again &mdash; try one thing
          differently
        </button>
        <p class="faint center" style="font-size: 0.82rem; margin: 0">
          Keeps mission ${state.seedCode}: the same Sun, the same storms, the
          same dust. The only thing that changes is you.
        </p>
        <div class="row" style="justify-content: center; margin-top: 0.5rem">
          <button class="btn" type="button" data-action="goto-sites">
            ${raw(icon('rocket', { size: 16 }))} New mission
          </button>
          <button class="btn btn--ghost" type="button" data-action="goto-title">
            ${raw(icon('home', { size: 16 }))} Main menu
          </button>
        </div>
      </div>
      </div>
    </section>
  `;
}

/** How many stars each outcome earns. */
const STARS = { lost: 0, incomplete: 1, success: 2, flagship: 3 };

/* --------------------------------------------------------------- flight home */

/**
 * The flight home.
 *
 * The world the crew is leaving sits bottom left, with the outpost they built
 * still on it. Earth is on the right. The ship crosses between them along a
 * dotted route, leaving a trail, and shrinks as it nears home.
 *
 * The drawing is static markup; `playReturnFlight` moves the ship. If the
 * screen is drawn again after the flight (copying a result re-renders it),
 * `flown` draws everything in its arrived state instead of replaying.
 */
function returnFlight(site, tier, flown) {
  const isMoon = site.id === 'moon';
  const from = isMoon ? 'the Moon' : 'Mars';
  const INK = '#0c1220';
  const route = 'M268 246 C 430 6, 770 0, 884 150';
  const early = tier === 'lost';

  const world = isMoon
    ? `<circle cx="120" cy="560" r="330" fill="url(#fl-world)"/>` +
      [[70, 300, 34], [196, 322, 22], [300, 372, 26], [20, 372, 20], [150, 392, 16]]
        .map(
          ([x, y, r]) =>
            `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.5}" fill="#4d566a" opacity="0.55"/>`
        )
        .join('')
    : `<circle cx="120" cy="560" r="330" fill="url(#fl-world)"/>` +
      `<path d="M-40 330 q90 -34 190 -8 q70 18 150 -6 q30 30 -20 54 q-110 30 -200 6 q-80 -20 -120 -46z" fill="#7a3518" opacity="0.5"/>` +
      `<ellipse cx="60" cy="380" rx="44" ry="14" fill="#7a3518" opacity="0.45"/>`;

  const stars = [
    [40, 60, 1.2], [130, 130, 0.9], [210, 40, 1.4], [330, 96, 1], [420, 170, 0.8],
    [470, 50, 1.3], [560, 120, 0.9], [640, 210, 1.1], [700, 70, 1], [760, 300, 0.9],
    [820, 30, 1.2], [600, 330, 0.8], [500, 280, 1], [380, 250, 0.9], [1170, 40, 1.1],
    [1150, 360, 0.9], [900, 370, 1], [680, 150, 0.7],
  ]
    .map(
      ([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity="0.7"/>`
    )
    .join('');

  return (
    `<div class="flight flight--${tier}${flown ? ' is-home' : ''}" data-flight>` +
    `<svg viewBox="0 0 1200 400" preserveAspectRatio="xMidYMid slice" role="img" aria-label="The crew's ship flying from ${from} back to Earth">` +
    `<defs>` +
    `<radialGradient id="fl-world" cx="0.4" cy="0.1" r="0.9"><stop offset="0" stop-color="${isMoon ? '#c9d1e0' : '#f09a5e'}"/><stop offset="1" stop-color="${isMoon ? '#59627a' : '#8a3d1c'}"/></radialGradient>` +
    `<radialGradient id="fl-earth" cx="0.34" cy="0.3" r="0.85"><stop offset="0" stop-color="#63b4f5"/><stop offset="1" stop-color="#143f80"/></radialGradient>` +
    `<radialGradient id="fl-air"><stop offset="0.74" stop-color="#8fd0ff" stop-opacity="0.5"/><stop offset="1" stop-color="#8fd0ff" stop-opacity="0"/></radialGradient>` +
    `<clipPath id="fl-earth-clip"><circle cx="1010" cy="205" r="135"/></clipPath>` +
    `</defs>` +
    stars +

    // the world they are leaving, with the outpost still on it
    world +
    `<g transform="translate(236 246)">` +
    `<path d="M-34 6 Q-30 -28 0 -28 Q30 -28 34 6Z" fill="rgba(90,169,255,0.22)" stroke="#5aa9ff" stroke-width="2"/>` +
    `<path d="M-20 6 V-6 A10 10 0 0 1 -10 -16 H10 A10 10 0 0 1 20 -6 V6Z" fill="#e9edf4" stroke="${INK}" stroke-width="1"/>` +
    `<rect x="-12" y="-8" width="6" height="5" rx="1" fill="#ffd27f"/><rect x="-2" y="-8" width="6" height="5" rx="1" fill="#ffd27f"/>` +
    `</g>` +

    // home
    `<circle cx="1010" cy="205" r="176" fill="url(#fl-air)" class="flight__air"/>` +
    `<g clip-path="url(#fl-earth-clip)">` +
    `<circle cx="1010" cy="205" r="135" fill="url(#fl-earth)"/>` +
    `<path d="M905 150 q40 -46 96 -30 q30 20 -6 52 q-20 30 -54 20 q-40 -8 -36 -42z M1000 232 q52 -22 82 22 q8 54 -40 76 q-52 -22 -42 -98z M1076 100 q40 4 58 40 q-30 18 -58 -40z M900 262 q26 6 34 34 q-20 14 -34 -34z" fill="#5fb873"/>` +
    `<path d="M880 190 q70 -26 130 -2 t140 -14 M900 300 q60 20 120 -2 M930 110 q50 -14 96 4" fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round" opacity="0.55"/>` +
    `<circle cx="1070" cy="250" r="150" fill="#020814" opacity="0.5"/>` +
    `</g>` +
    `<circle cx="1010" cy="205" r="135" fill="none" stroke="#bfe3ff" stroke-width="2" opacity="0.7"/>` +
    `<circle cx="884" cy="150" r="14" class="flight__ring"/>` +

    // the way home, and the trail the ship leaves along it
    `<path class="flight__route" d="${route}"/>` +
    `<path class="flight__trail" d="${route}" pathLength="1" style="stroke-dashoffset:${flown ? 0 : 1}"/>` +

    // the ship
    `<g class="flight__ship" data-ship transform="translate(268 246) rotate(-56)">` +
    `<g transform="scale(1.7)">` +
    `<g transform="translate(-27 0)"><path class="hero__flame" d="M0 -6 Q-30 0 0 6 Q-9 0 0 -6Z" fill="#ffb347"/><path class="hero__flame" d="M0 -3.4 Q-16 0 0 3.4Z" fill="#fff3c4"/></g>` +
    `<path d="M-20 -8 L-32 -17 L-27 -8Z M-20 8 L-32 17 L-27 8Z" fill="#d9534a" stroke="${INK}" stroke-width="1"/>` +
    `<path d="M-27 -8 H10 Q32 0 10 8 H-27Z" fill="#eef2f8" stroke="${INK}" stroke-width="1.2"/>` +
    `<path d="M10 -8 Q32 0 10 8 Q16 0 10 -8Z" fill="#d9534a"/>` +
    `<circle cx="-2" cy="0" r="4" fill="#2d4f7c" stroke="#9fb0c9" stroke-width="1"/>` +
    `<path d="M-16 -8 V8" stroke="#9aa4b6" stroke-width="1.4"/>` +
    `</g></g>` +
    `</svg>` +
    `<div class="flight__caption">` +
    `<span class="flight__going">${early ? `Bringing the crew home early from ${from}` : `Lift-off. The crew is leaving ${from}`}</span>` +
    `<span class="flight__arrived">${early ? 'The crew is back on Earth' : 'Home. The crew is back on Earth'}</span>` +
    `</div>` +
    `</div>`
  );
}

/**
 * Fly the ship home, then let the result appear.
 *
 * Driven from script rather than CSS so that it plays the same in every
 * browser and can be held on its last frame. Safe to call when the flight is
 * not on screen: it simply reports done.
 *
 * @param {Element} root
 * @param {() => void} [done]  called once the ship has arrived
 */
export function playReturnFlight(root, done = () => {}) {
  const box = root.querySelector('[data-flight]');
  const route = box && box.querySelector('.flight__route');
  const ship = box && box.querySelector('[data-ship]');
  const trail = box && box.querySelector('.flight__trail');
  if (!box || !route || !ship || typeof route.getTotalLength !== 'function') {
    done();
    return;
  }

  const total = route.getTotalLength();
  const duration = 5200;
  const hold = 700;
  const began = performance.now() + hold;

  const place = (k) => {
    const at = route.getPointAtLength(total * k);
    const ahead = route.getPointAtLength(Math.min(total, total * k + 3));
    const turn = (Math.atan2(ahead.y - at.y, ahead.x - at.x) * 180) / Math.PI;
    // Further away means smaller: the ship shrinks towards Earth.
    const size = 1 - 0.55 * k;
    ship.setAttribute(
      'transform',
      `translate(${at.x.toFixed(1)} ${at.y.toFixed(1)}) rotate(${turn.toFixed(1)}) scale(${size.toFixed(3)})`
    );
    if (trail) trail.style.strokeDashoffset = String(1 - k);
  };

  const step = (now) => {
    // The player left before the ship landed: stop quietly.
    if (!box.isConnected) return;
    const t = Math.max(0, Math.min(1, (now - began) / duration));
    const eased = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
    place(eased);
    if (t < 1) {
      requestAnimationFrame(step);
      return;
    }
    box.classList.add('is-home');
    const screen = box.closest('.debrief');
    if (screen) screen.classList.add('is-landed');
    done();
  };

  place(0);
  requestAnimationFrame(step);
}

/**
 * Everything the crew actually found out.
 *
 * This is the answer to "what was it all for?" -- and it is deliberately the
 * thing a player screenshots. A mission that banked points but completed no
 * research reads as empty here, which is the intended lesson.
 */
function renderResearchLog(state) {
  const done = (state.experiments || [])
    .map((id) => EXPERIMENTS.find((e) => e.id === id))
    .filter(Boolean);

  if (!done.length) {
    return html`
      <div class="card card--warn">
        <h2 style="margin-bottom: 0.3rem">You finished no research at all</h2>
        <p class="dim" style="margin: 0">
          ${state.log.length} days of keeping people alive, and nothing to send
          home. Research needs at least two blocks of power in a
          day to finish anything — single spare blocks keep the instruments
          warm but complete no work.
        </p>
      </div>
    `;
  }

  const items = done
    .map(
      (e) => html`
        <li style="margin-bottom: 0.7rem">
          <strong>${e.name}</strong>
          <br />
          <span class="dim" style="font-size: 0.92rem">${e.finding}</span>
          <br />
          <span class="faint" style="font-size: 0.8rem"
            >Really happens: ${e.realBasis}</span
          >
        </li>
      `
    )
    .join('');

  return html`
    <div class="card">
      <div class="card__head">
        <h2 style="margin: 0">What your crew found out</h2>
        <span class="badge">${done.length} studies</span>
      </div>
      <p class="dim" style="font-size: 0.92rem">
        Every one of these mirrors work a real mission has actually done.
      </p>
      <ul style="margin: 0; padding-left: 1.1rem">
        ${raw(items)}
      </ul>
    </div>
  `;
}

function tile(label, value, unit, color) {
  return html`
    <div class="score-tile" style="--tile-color: ${raw(color)}">
      <div class="score-tile__num">${value}</div>
      <div class="score-tile__label">${label}</div>
      <div class="faint" style="font-size: 0.72rem">${unit}</div>
    </div>
  `;
}
