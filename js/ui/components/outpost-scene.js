/**
 * outpost-scene.js
 * -----------------------------------------------------------------------------
 * A cutaway picture of the base that answers every click.
 *
 * WHY THIS EXISTS. Everything else in this game communicates through numbers
 * and bars. For a twelve-year-old that is fine. For a seven-year-old, "shield:
 * 44 cm" is not a thing, it is a label. This scene makes each of the four
 * systems a thing you can watch:
 *
 *   Life support  the fan spins faster and more air streams through the cabin
 *   Greenhouse    grow lights switch on one by one and the plants stand up
 *   Shielding     the digger drives to the habitat and flings regolith at the
 *                 roof; every block adds one dashed scoop that only turns
 *                 solid TOMORROW
 *   Science       the dish swings up to Earth, the rover drives out and drills
 *   Battery       glows with whatever you chose to save
 *
 * Over all of it sits the shield: a blue glass dome drawn around the pod.
 * It is the picture's way of showing how well the piled regolith will hold
 * against today's Sun. On a storm day it takes the hits: it holds, cracks and
 * reddens, or shatters, and every storm that got through leaves a scar on it
 * for the rest of the mission.
 *
 * Power runs through buried cables from the battery to each building, so a
 * child can follow a block from the button to the thing it switches on.
 *
 * HOW IT STAYS IN STEP. The drawing is still a pure function of mission state
 * plus today's allocation: same input, same markup, always with the same
 * element structure. The app patches attributes in place between clicks (see
 * `morph` in dom.js), so CSS transitions and animations carry on smoothly and
 * the picture can never drift away from the simulation.
 *
 * WHAT IS REAL. The regolith depth is scaled directly from `shieldCm` against
 * the 3 m NASA JPL assessed as full cover, and whether the dome holds, cracks
 * or shatters is decided by the same dose model that decides crew health (see
 * `shieldOutlook`). The glass dome itself is a drawing device, not hardware:
 * the real shield is the soil. Everything else is schematic too, and the game
 * does not claim otherwise.
 */

import { esc } from '../dom.js';
import { cometBody } from './comet.js';
import { tr } from '../i18n.js';
import { BALANCE, getSystem } from '../../config/systems.js';

const W = 600;
const H = 440;
/** The picture starts here: nothing lives in the sky above this line. */
const TOP = 80;
/** Where things stand. */
const GROUND = 320;
/** Top of the cut soil face, below the strip of surface. */
const SOIL = 332;
const INK = '#0c1220';

/** Habitat outline: a capsule with a flat floor, 130 wide and 70 tall. */
const HAB_X = 190;
const HAB_W = 130;
const HAB_CX = HAB_X + HAB_W / 2;
const HAB_D = `M${HAB_X} ${GROUND} V280 A30 30 0 0 1 ${HAB_X + 30} 250 H${
  HAB_X + HAB_W - 30
} A30 30 0 0 1 ${HAB_X + HAB_W} 280 V${GROUND} Z`;

/** Buried cables: where each leaves the battery, how deep it runs, where it surfaces. */
const CABLES = {
  shielding: { from: 108, depth: 358, to: 140 },
  lifeSupport: { from: 93, depth: 402, to: 204 },
  greenhouse: { from: 98, depth: 414, to: 379 },
  science: { from: 103, depth: 426, to: 450 },
};

/** Where the "+1 Air" style pop-ups appear, in scene units. */
const ANCHORS = {
  lifeSupport: [HAB_CX, 276],
  greenhouse: [379, 262],
  shielding: [160, 268],
  science: [478, 280],
  shelter: [301, 268],
};

/** Direction solar particles travel: down and away from the Sun. */
const SEP_DIR = [0.8, 0.6];

const THEMES = {
  moon: {
    sky: ['#02040a', '#0b1428'],
    far: '#283044',
    farLit: '#6d7790',
    surf: ['#98a2b6', '#6c7589'],
    surfDark: '#4d566a',
    soil: ['#394154', '#171b28'],
    strata: '#2a3142',
    rock: '#4a5367',
    mound: ['#a6b0c4', '#69738a'],
    moundEdge: '#c9d1e0',
    shadow: 0.62,
  },
  mars: {
    sky: ['#3d251f', '#d79f69'],
    far: '#8a4f33',
    farLit: '#bd7a4f',
    surf: ['#d07a48', '#a4532d'],
    surfDark: '#7b3a1e',
    soil: ['#6c321a', '#2e140b'],
    strata: '#4f230f',
    rock: '#8a4526',
    mound: ['#de8a55', '#a4532d'],
    moundEdge: '#f0a875',
    shadow: 0.3,
  },
};

/**
 * @param {Object} opts
 * @param {'moon'|'mars'} opts.siteId
 * @param {number} opts.shieldCm        0..320, the shield as it stands today
 * @param {number} [opts.health]        0..100
 * @param {number} [opts.dust]          0..0.45, Mars only
 * @param {Object|boolean|null} [opts.storm]  today's flare, from planDay()
 * @param {string|null} [opts.hazard]   'shadow' | 'dust-storm' | null
 * @param {Object|null} [opts.allocation]  today's blocks; omit for a still picture
 * @param {number} [opts.remaining]     blocks not yet assigned
 * @param {'calm'|'holds'|'cracks'|'breaks'} [opts.outlook]  how the shield
 *        fares against today's Sun, from shieldOutlook()
 * @param {number} [opts.scars]         past storms that got through the shield
 * @param {string[]} [opts.unlocked]    systems on line; the rest are drawn as
 *        kit still waiting to be set up
 * @param {Object} [opts.demands]       blocks each system needs today, when an
 *        event has raised one of them
 * @param {?string} [opts.event]        today's event id (config/events.js)
 * @param {string[]} [opts.upgrades]    upgrades the base has: an extra solar
 *        table and a bigger battery are drawn
 * @param {number} [opts.chargeMax]     most blocks the battery can save today
 * @param {boolean} [opts.running]      the day is being played out: the rover
 *        drives to the edge of the picture and today's scoops set solid
 * @param {boolean} [opts.compact]      short banner crop, for cards
 */
export function outpostScene({
  siteId,
  shieldCm = 0,
  health = 100,
  dust = 0,
  storm = null,
  hazard = null,
  allocation = null,
  remaining = 0,
  outlook = 'calm',
  scars = 0,
  unlocked = null,
  demands = null,
  event = null,
  upgrades = [],
  chargeMax = BALANCE.batteryChargeMax,
  running = false,
  compact = false,
}) {
  const isMoon = siteId === 'moon';
  const theme = THEMES[isMoon ? 'moon' : 'mars'];
  const p = `sc-${siteId}${compact ? '-c' : ''}`;

  const live = Boolean(allocation);
  const online = (id) => !unlocked || unlocked.includes(id);
  const need = (id) => (demands && demands[id]) || getSystem(id).demand;
  const lv = {
    shieldOnline: online('shielding'),
    scienceOnline: online('science'),
    airNeed: need('lifeSupport'),
    foodNeed: need('greenhouse'),
    event,
    running,
    air: live ? allocation.lifeSupport : getSystem('lifeSupport').demand,
    food: live ? allocation.greenhouse : getSystem('greenhouse').demand,
    dig: live ? allocation.shielding : 0,
    sci: live ? allocation.science : 2,
    sheltered: live && Boolean(allocation.shelter),
    cells: chargeMax,
    extraPanel: upgrades.includes('panel'),
    banked: live
      ? clamp(remaining, 0, chargeMax)
      : BALANCE.batteryStart,
  };

  const stormInfo =
    storm && typeof storm === 'object'
      ? storm
      : storm
        ? { severity: 'severe' }
        : null;

  const mound = moundGeometry(shieldCm);
  // Window light dims as the crew wears down.
  const warmth = clamp(health / 100, 0.15, 1);
  // In the banner crop the sky is short, so the Sun and Earth sit lower.
  const skyDrop = compact ? 34 : 0;

  const label = sceneDescription({
    siteId,
    shieldCm,
    stormInfo,
    dust,
    hazard,
    lv,
    live,
    outlook,
  });

  const classes = [
    'scene',
    `scene--${isMoon ? 'moon' : 'mars'}`,
    compact && 'scene--compact',
    live && 'scene--live',
    lv.sheltered && 'is-sheltered',
    stormInfo && 'is-storm',
    running && 'is-running',
    event && `is-${event}`,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    `<svg viewBox="${compact ? '0 124 600 228' : `0 ${TOP} ${W} ${H - TOP}`}" class="${classes}" role="img" ` +
    `aria-label="${esc(label)}" preserveAspectRatio="xMidYMid ${compact ? 'slice' : 'meet'}">` +
    defs(p, theme, isMoon) +
    sky(p, isMoon) +
    sun(p, isMoon, stormInfo, skyDrop, live) +
    (isMoon ? earthFromMoon(p, skyDrop, live) : earthFromMars(skyDrop, live)) +
    farLand(theme, isMoon, hazard) +
    lander(isMoon) +
    ground(p, theme) +
    (compact ? '' : cables(lv)) +
    (compact ? '' : labels(lv, Boolean(stormInfo))) +
    shadows(theme, mound) +
    solarArray(p, event === 'devil' ? 0 : dust, hazard, lv.extraPanel) +
    battery(p, lv) +
    regolith(p, theme, mound, lv) +
    habitat(p, lv, warmth, Boolean(stormInfo)) +
    shieldDome(mound, shieldCm, lv, live, outlook, scars) +
    greenhouse(lv) +
    scienceStation(isMoon, lv, skyDrop) +
    // Comet works outside with the rover, and comes in when the Sun flares.
    (stormInfo ? '' : buddy(lv)) +
    digger(lv, mound) +
    (live ? eventArt(event, isMoon, mound) : '') +
    (live ? `<rect class="scene__sweep" x="-120" y="${TOP}" width="120" height="${SOIL - TOP}"/>` : '') +
    (hazard === 'dust-storm' ? dustStorm() : '') +
    (hazard === 'shadow' ? `<rect x="0" y="0" width="230" height="${SOIL}" fill="url(#${p}-shade)"/>` : '') +
    (stormInfo ? stormParticles(p, stormInfo, mound, outlook) : '') +
    // Click feedback is drawn in here by sceneFeedback(); the patcher leaves it alone.
    `<g class="scene__fx" data-fx data-morph-skip></g>` +
    `</svg>`
  );
}

/* ------------------------------------------------------------------- helpers */

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function n1(v) {
  return Math.round(v * 10) / 10;
}

/**
 * The regolith mound over the habitat.
 *
 * `t` is the true-to-scale part: 0.2 scene units per centimetre, so the 3 m
 * NASA calls full cover is 60 units, nearly as tall again as the habitat.
 */
function moundGeometry(shieldCm) {
  const t = clamp(shieldCm, 0, BALANCE.shieldCapCm) * 0.2;
  const height = 76 + t;
  const halfWidth = 79 + t * 0.3;
  const yAt = (x) => {
    const u = Math.abs((x - HAB_CX) / halfWidth);
    return u >= 1 ? GROUND : GROUND - height * (1 - u ** 5);
  };
  return {
    t,
    height,
    halfWidth,
    left: HAB_CX - halfWidth,
    right: HAB_CX + halfWidth,
    crest: GROUND - height,
    yAt,
  };
}

/** The glass dome sits a little outside the mound and grows with it. */
function domeGeometry(mound) {
  const gap = 12;
  const height = mound.height + gap;
  const halfWidth = mound.halfWidth + gap;
  const yAt = (x) => {
    const u = Math.abs((x - HAB_CX) / halfWidth);
    return u >= 1 ? GROUND : GROUND - height * (1 - u ** 5);
  };
  return {
    left: HAB_CX - halfWidth,
    right: HAB_CX + halfWidth,
    crest: GROUND - height,
    yAt,
  };
}

/** A smooth outline for a mound or dome, left foot to right foot. */
function hillPath(shape) {
  const steps = 44;
  let d = `M${n1(shape.left)} ${GROUND}`;
  for (let i = 1; i < steps; i += 1) {
    const x = shape.left + (i / steps) * (shape.right - shape.left);
    d += ` L${n1(x)} ${n1(shape.yAt(x))}`;
  }
  return `${d} L${n1(shape.right)} ${GROUND}`;
}

/**
 * How the shield fares against today's Sun.
 *
 * Decided by the dose model, not by taste: the crew loses health for every
 * millisievert over the safe daily limit, so "holds" means working through
 * the storm costs them nothing, "cracks" means it costs a little, and
 * "breaks" means it costs a lot.
 *
 * @param {ReturnType<import('../../sim/engine.js').planDay>} plan
 * @returns {{state: 'calm'|'holds'|'cracks'|'breaks', workLoss: number, shelterLoss: number}}
 */
export function shieldOutlook(plan) {
  const loss = (dose) =>
    Math.max(0, dose - BALANCE.safeDoseMsvPerDay) * BALANCE.healthLossPerExcessMsv;
  const workLoss = loss(plan.projectedDose);
  const shelterLoss = loss(plan.shelteredDose);
  const state = !plan.storm
    ? 'calm'
    : workLoss < 0.5
      ? 'holds'
      : workLoss < 5
        ? 'cracks'
        : 'breaks';
  return {
    state,
    workLoss: Math.round(workLoss),
    shelterLoss: Math.round(shelterLoss),
  };
}

/**
 * How many past storms got through to the crew: each one is a scar on the
 * dome for the rest of the mission.
 */
export function shieldScars(state) {
  return (state.log || []).filter(
    (d) => d.stormClass && d.doseToday > BALANCE.safeDoseMsvPerDay
  ).length;
}

/* ---------------------------------------------------------------------- defs */

function defs(p, theme, isMoon) {
  const grad = (id, [a, b], extra = '') =>
    `<linearGradient id="${p}-${id}" x1="0" y1="0" x2="0" y2="1"${extra}>` +
    `<stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;

  return (
    `<defs>` +
    grad('sky', theme.sky) +
    grad('surf', theme.surf) +
    grad('soil', theme.soil) +
    grad('mound', theme.mound) +
    `<radialGradient id="${p}-sunglow"><stop offset="0" stop-color="${
      isMoon ? '#fff3c4' : '#b9dcff'
    }" stop-opacity="${isMoon ? 0.75 : 0.7}"/><stop offset="1" stop-color="${
      isMoon ? '#fff3c4' : '#b9dcff'
    }" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="${p}-sundisc"><stop offset="0.35" stop-color="#fffdf4"/><stop offset="1" stop-color="#ffd978"/></radialGradient>` +
    `<radialGradient id="${p}-earthglow"><stop offset="0.5" stop-color="#7fc4ff" stop-opacity="0.45"/><stop offset="1" stop-color="#7fc4ff" stop-opacity="0"/></radialGradient>` +
    `<linearGradient id="${p}-panel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3f74bd"/><stop offset="0.55" stop-color="#27508c"/><stop offset="1" stop-color="#1b3a69"/></linearGradient>` +
    `<linearGradient id="${p}-shade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#01030a" stop-opacity="0.72"/><stop offset="1" stop-color="#01030a" stop-opacity="0"/></linearGradient>` +
    `<clipPath id="${p}-hab"><path d="${HAB_D}"/></clipPath>` +
    `<radialGradient id="${p}-charge"><stop offset="0" stop-color="#ffe066" stop-opacity="0.75"/><stop offset="1" stop-color="#ffe066" stop-opacity="0"/></radialGradient>` +
    `<clipPath id="${p}-earth"><circle r="19"/></clipPath>` +
    `<clipPath id="${p}-above"><rect x="0" y="0" width="${W}" height="${GROUND + 4}"/></clipPath>` +
    `</defs>`
  );
}

/* ----------------------------------------------------------------------- sky */

function sky(p, isMoon) {
  let out = `<rect x="0" y="0" width="${W}" height="${SOIL + 2}" fill="url(#${p}-sky)"/>`;

  if (isMoon) {
    const stars = [
      [22, 30, 1.2], [58, 198, 0.9], [96, 52, 0.9], [131, 20, 1.3],
      [150, 96, 0.8], [176, 150, 1.0], [204, 40, 1.1], [232, 110, 0.8],
      [258, 22, 0.9], [287, 74, 1.3], [318, 138, 0.8], [342, 34, 1.0],
      [371, 92, 0.9], [398, 18, 1.2], [421, 152, 1.0], [446, 60, 0.8],
      [468, 196, 0.9], [487, 24, 1.1], [556, 132, 1.2], [574, 36, 0.9],
      [588, 190, 0.8], [36, 236, 0.8], [118, 214, 1.0], [352, 204, 0.9],
      [404, 226, 0.8], [578, 238, 1.0], [300, 180, 0.7], [14, 150, 0.9],
    ];
    out += stars
      .map(
        ([x, y, r], i) =>
          `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity="${n1(0.5 + (i % 4) * 0.13)}"${
            i % 5 === 0 ? ` class="scene__twinkle" style="--delay:${n1((i % 7) * 0.6)}s"` : ''
          }/>`
      )
      .join('');
  } else {
    // Dust hanging low over the horizon: Mars' sky is brightest near the ground.
    out +=
      `<ellipse cx="300" cy="${GROUND - 20}" rx="380" ry="74" fill="#ffd9a8" opacity="0.22"/>` +
      `<ellipse cx="418" cy="112" rx="5.5" ry="4.2" fill="#c9b4a2" opacity="0.75"/>`;
  }
  return out;
}

function sun(p, isMoon, stormInfo, drop, live) {
  const [x, y] = isMoon ? [58, 150 + drop] : [70, 138 + drop];

  // With no air to scatter the light, the Sun over the Moon is a hard bright
  // disc with a crown of rays. On Mars it is small and pale, with a cool blue
  // glow around it.
  const rays = Array.from({ length: 12 }, (_, i) => {
    const long = i % 2 === 0;
    return `<path d="M-1.9 -19 L0 ${long ? -33 : -27} L1.9 -19Z" transform="rotate(${i * 30})"/>`;
  }).join('');
  const core = isMoon
    ? `<circle r="56" fill="url(#${p}-sunglow)"/>` +
      `<g class="sun__rays" fill="#ffe9a8" opacity="0.85">${rays}</g>` +
      `<circle r="15" fill="url(#${p}-sundisc)"/>`
    : `<circle r="46" fill="url(#${p}-sunglow)"/><circle r="8.5" fill="#fff6ea"/>`;

  const flare = stormInfo
    ? `<circle r="15" class="sun__ring"/><circle r="15" class="sun__ring" style="--delay:0.8s"/>` +
      (live ? `<text class="sun__label" x="24" y="-26">Solar flare</text>` : '')
    : live
      ? `<text class="scene__sky-label" y="${isMoon ? 50 : 30}" text-anchor="middle">Sun</text>`
      : '';

  return `<g transform="translate(${x} ${y})" class="sun">${core}${flare}</g>`;
}

/** Earth hanging over the lunar horizon, lit from the Sun's side. */
function earthFromMoon(p, drop, live) {
  return (
    `<g transform="translate(520 ${128 + drop})">` +
    `<circle r="34" fill="url(#${p}-earthglow)"/>` +
    `<g clip-path="url(#${p}-earth)">` +
    `<circle r="19" fill="#2c6fb3"/>` +
    `<path d="M-15 -8 q6 -7 13 -3 q3 5 -3 8 q-6 4 -10 -5z M-2 3 q8 -3 11 4 q-1 8 -7 10 q-6 -4 -4 -14z M7 -15 q6 1 8 6 q-5 2 -8 -6z" fill="#4faa68"/>` +
    `<path d="M-19 -1 q10 -4 19 0 t19 -2 M-17 9 q9 3 16 0" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity="0.7"/>` +
    `<circle cx="11" cy="6" r="21" fill="#01030a" opacity="0.62"/>` +
    `</g>` +
    `<circle r="19" fill="none" stroke="#a9d8ff" stroke-width="1" opacity="0.6"/>` +
    (live ? `<text class="scene__sky-label" y="-27" text-anchor="middle">Earth</text>` : '') +
    `</g>`
  );
}

/** From Mars, Earth is one bright blue-white point in the evening sky. */
function earthFromMars(drop, live) {
  return (
    `<g transform="translate(520 ${110 + drop})">` +
    `<path d="M-7 0H7M0 -7V7" stroke="#e4f1ff" stroke-width="0.8" opacity="0.7"/>` +
    `<circle r="2.4" fill="#e4f1ff"/>` +
    `<circle cx="6" cy="-3" r="0.9" fill="#d5dbe6" opacity="0.8"/>` +
    (live ? `<text class="scene__sky-label" x="-12" y="4" text-anchor="end">Earth</text>` : '') +
    `</g>`
  );
}

/* -------------------------------------------------------------- far landscape */

function farLand(theme, isMoon, hazard) {
  if (isMoon) {
    return (
      // A ridge that slides in front of the Sun on a horizon-shadow day.
      (hazard === 'shadow'
        ? `<path d="M0 98 L20 110 L42 100 L70 106 L94 138 L116 148 L138 198 L162 258 L178 ${GROUND} H0Z" fill="#111726"/>` +
          // the hidden Sun still rims the ridge with light
          `<path d="M20 110 L42 100 L70 106 L94 138 L116 148" fill="none" stroke="#fff3c4" stroke-width="1.6" stroke-linejoin="round" opacity="0.7"/>`
        : '') +
      `<path d="M0 288 L44 270 L96 282 L150 262 L212 278 L270 258 L332 276 L398 262 L452 278 L500 268 H580 L600 262 V${GROUND} H0Z" fill="${theme.far}"/>` +
      // Slopes facing the Sun catch the light; everything else is black.
      `<path d="M0 288 L44 270 L52 282Z M96 282 L150 262 L160 278Z M212 278 L270 258 L282 274Z M332 276 L398 262 L410 274Z M452 278 L500 268 L506 276Z" fill="${theme.farLit}" opacity="0.8"/>` +
      `<path d="M452 278 L500 268 H580 L600 262" fill="none" stroke="${theme.farLit}" stroke-width="1.4" opacity="0.8"/>`
    );
  }
  return (
    // The delta scarp on the edge of Jezero, layered like the real one.
    `<path d="M0 292 L30 282 L118 280 L150 266 L232 264 L252 276 L330 278 L362 262 L468 260 L490 268 H582 L600 274 V${GROUND} H0Z" fill="${theme.far}"/>` +
    `<path d="M150 272 H240 M362 268 H476 M362 276 H484" stroke="${theme.farLit}" stroke-width="1.6" opacity="0.6" fill="none"/>` +
    `<path d="M150 266 L232 264 L236 268 L150 270Z M362 262 L468 260 L472 264 L362 266Z" fill="${theme.farLit}" opacity="0.75"/>` +
    // A dust devil wandering the crater floor.
    `<g transform="translate(490 ${GROUND - 2})"><path class="scene__devil" d="M-2 0 Q-7 -12 -3 -22 Q-9 -30 -11 -42 H11 Q8 -30 3 -22 Q6 -12 2 0Z" fill="#f6cfa6" opacity="0.26"/></g>`
  );
}

/**
 * The crew's ride home, parked on the ridge behind the base. A boxy lunar
 * lander on the Moon; a slim ascent rocket on Mars, where you need far more
 * push to get back to orbit.
 */
function lander(isMoon) {
  const body = isMoon
    ? `<path d="M-12 -14 L-23 0 M12 -14 L23 0 M-12 -22 L-23 0 M12 -22 L23 0" stroke="#aeb7c6" stroke-width="1.8" fill="none" stroke-linecap="round"/>` +
      `<ellipse cx="-23" cy="0" rx="5.5" ry="1.8" fill="#d9dfe9"/><ellipse cx="23" cy="0" rx="5.5" ry="1.8" fill="#d9dfe9"/>` +
      `<path d="M-5 -13 L-8 -4 H8 L5 -13Z" fill="#4a5367" stroke="${INK}" stroke-width="0.8"/>` +
      `<path d="M-16 -27 H16 L18 -20 L14 -12 H-14 L-18 -20Z" fill="#c9963a" stroke="${INK}" stroke-width="1"/>` +
      `<path d="M-6 -27 L-4 -12 M7 -27 L4 -12 M-17 -20 H17" stroke="#8a6220" stroke-width="0.8" fill="none"/>` +
      `<path d="M-10 -27 V-40 Q-10 -46 -4 -46 H4 Q10 -46 10 -40 V-27Z" fill="#e9edf4" stroke="${INK}" stroke-width="1"/>` +
      `<path d="M-6 -41 H2 L-1 -34 H-6Z" fill="#20304f"/>` +
      `<path d="M6 -46 L11 -57" stroke="#aeb7c6" stroke-width="1.2"/><circle cx="11" cy="-57" r="2" fill="#e9edf4"/>` +
      `<circle cx="-6" cy="-48" r="1.9" class="scene__beacon"/>`
    : `<path d="M-9 -8 L-27 0 M9 -8 L27 0 M-4 -6 L-10 0 M4 -6 L10 0" stroke="#aeb7c6" stroke-width="1.8" fill="none" stroke-linecap="round"/>` +
      `<rect x="-21" y="-10" width="42" height="5" rx="1.5" fill="#8d97a8" stroke="${INK}" stroke-width="0.8"/>` +
      `<path d="M-7 -10 V-18 L-13 -10Z M7 -10 V-18 L13 -10Z" fill="#c8502f" stroke="${INK}" stroke-width="0.8"/>` +
      `<path d="M-7 -10 V-44 Q-7 -58 0 -66 Q7 -58 7 -44 V-10Z" fill="#eef2f8" stroke="${INK}" stroke-width="1"/>` +
      `<path d="M-6.4 -48 Q-5 -58 0 -66 Q5 -58 6.4 -48Z" fill="#c8502f"/>` +
      `<rect x="-7" y="-27" width="14" height="3" fill="#20304f"/>` +
      `<circle cx="0" cy="-38" r="2.8" fill="#20304f" stroke="#9fb0c9" stroke-width="0.8"/>` +
      `<circle cx="0" cy="-67" r="1.9" class="scene__beacon"/>`;
  return `<g transform="translate(541 268)" class="scene__lander">${body}</g>`;
}

/* -------------------------------------------------------------------- ground */

function ground(p, theme) {
  return (
    `<rect x="0" y="${GROUND}" width="${W}" height="${SOIL - GROUND}" fill="url(#${p}-surf)"/>` +
    // little craters and stones on the surface strip
    [[36, 9], [168, 6], [342, 8], [426, 5], [566, 10]]
      .map(
        ([x, rx]) =>
          `<ellipse cx="${x}" cy="${GROUND + 6}" rx="${rx}" ry="2.3" fill="${theme.surfDark}" opacity="0.55"/>`
      )
      .join('') +
    `<rect x="0" y="${SOIL}" width="${W}" height="${H - SOIL}" fill="url(#${p}-soil)"/>` +
    `<path d="M0 ${SOIL}H${W}" stroke="${theme.surfDark}" stroke-width="2"/>` +
    `<path d="M0 372 Q150 362 300 374 T600 366 M0 408 Q160 418 320 406 T600 412" fill="none" stroke="${theme.strata}" stroke-width="5" opacity="0.55"/>` +
    [[30, 392, 9, 5], [182, 432, 12, 5], [312, 392, 7, 4], [418, 376, 10, 5], [520, 398, 13, 6], [556, 362, 6, 3.5], [70, 428, 6, 3]]
      .map(
        ([x, y, rx, ry]) =>
          `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${theme.rock}" opacity="0.5"/>`
      )
      .join('')
  );
}

/** Hard-edged shadows thrown to the right, away from the Sun. */
function shadows(theme, mound) {
  const cast = (x0, x1) =>
    `<path d="M${n1(x0)} ${GROUND} H${n1(x1)} L${n1(x1 + 12)} ${SOIL} H${n1(x0 + 12)}Z"/>`;
  return (
    `<g fill="#000" opacity="${theme.shadow}">` +
    cast(22, 44) +
    cast(60, 82) +
    cast(88, 114) +
    cast(mound.left + 4, mound.right) +
    cast(346, 420) +
    cast(432, 468) +
    `</g>`
  );
}

/* --------------------------------------------------------------------- power */

function cablePath({ from, depth, to }) {
  const r = 6;
  return `M${from} ${SOIL} V${depth - r} Q${from} ${depth} ${from + r} ${depth} H${to - r} Q${to} ${depth} ${to} ${depth - r} V${SOIL}`;
}

/**
 * One buried cable per system. The more blocks a system has, the brighter its
 * cable and the more pulses run along it. A life-critical system running
 * short makes its cable stutter.
 */
function cables(lv) {
  const blocks = {
    lifeSupport: lv.air,
    greenhouse: lv.food,
    shielding: lv.dig,
    science: lv.sci,
  };

  const waiting = {
    shielding: !lv.shieldOnline,
    science: !lv.scienceOnline,
  };

  return Object.entries(CABLES)
    .filter(([id]) => !waiting[id])
    .map(([id, route]) => {
      const system = getSystem(id);
      const n = blocks[id];
      // Shielding and science have no "enough": two blocks reads as a healthy flow.
      const needs = { lifeSupport: lv.airNeed, greenhouse: lv.foodNeed };
      const demand = needs[id] || system.demand;
      const full = system.criticalShort ? demand : 2;
      const short = system.criticalShort && n < demand;
      const gap = n > 0 ? Math.max(7, Math.round(66 / n) - 5) : 60;
      const d = cablePath(route);
      const cls = ['cable', n > 0 && 'is-on', short && 'is-short']
        .filter(Boolean)
        .join(' ');
      const style =
        `--c:var(${system.colorVar});--lit:${n1(Math.min(1, n / full) * 0.6)};` +
        `--gap:${gap};--period:${gap + 5};--t:${((gap + 5) / 40).toFixed(2)}s`;

      return (
        `<g class="${cls}" style="${style}">` +
        `<path class="cable__duct" d="${d}"/>` +
        `<path class="cable__glow" d="${d}"/>` +
        `<path class="cable__flow" d="${d}" data-cable="${id}"/>` +
        `<rect class="cable__port" x="${route.to - 5.5}" y="${SOIL - 4}" width="11" height="8" rx="2.5"/>` +
        `</g>`
      );
    })
    .join('');
}

function labels(lv, stormToday) {
  const tag = (x, y, anchor, colorVar, text) =>
    `<text class="scene__label" x="${x}" y="${y}" text-anchor="${anchor}" style="fill:var(${colorVar})">${text}</text>`;
  return (
    tag(84, 350, 'end', '--sys-power', 'Battery') +
    (lv.shieldOnline ? tag(128, 376, 'middle', '--sys-shield', 'Shield') : '') +
    tag(197, 350, 'end', '--sys-air', 'Air') +
    `<text class="scene__label scene__label--bay${stormToday ? ' is-needed' : ''}" x="302" y="364" text-anchor="middle">Storm room</text>` +
    // one line lower than the other labels: in Arabic it is wide enough to
    // run into "Food" beside it
    `<path d="M302 353 V${SOIL + 1}" class="scene__leader${stormToday ? ' is-needed' : ''}"/>` +
    tag(372, 350, 'end', '--sys-food', 'Food') +
    (lv.scienceOnline ? tag(443, 350, 'end', '--sys-science', 'Science') : '')
  );
}

/** Solar tables facing the Sun. Dust dulls them, which is how Mars slowly strangles you. */
function solarArray(p, dust, hazard, extraPanel) {
  const grime = clamp(dust * 1.7, 0, 0.78);
  const face = 'M0 -10 L8 -32 H40 L32 -10Z';
  const table = (x) =>
    `<g transform="translate(${x} ${GROUND})">` +
    `<path d="M20 -10 V0 M13 0 H27" stroke="#8d97a8" stroke-width="2.6" stroke-linecap="round"/>` +
    `<path d="${face}" fill="url(#${p}-panel)" stroke="#dfe7f3" stroke-width="1.4" stroke-linejoin="round"/>` +
    `<path d="M10.7 -10 L18.7 -32 M21.3 -10 L29.3 -32 M4 -21 H36" stroke="#14294a" stroke-width="1"/>` +
    `<path d="M3 -12 L10 -30 H15 L8 -12Z" fill="#fff" opacity="0.16"/>` +
    (grime > 0
      ? `<path d="${face}" fill="#c58a57" opacity="${n1(grime)}"/>` +
        `<path d="M9 -15 h5 M20 -24 h6 M26 -14 h4 M14 -27 h3" stroke="#e0a877" stroke-width="1.6" stroke-linecap="round" opacity="${n1(Math.min(1, grime * 1.6))}"/>`
      : '') +
    (hazard === 'shadow' ? `<path d="${face}" fill="#03060e" opacity="0.62"/>` : '') +
    `</g>`;

  return (
    `<g class="scene__solar">` +
    // the extra table from a supply rocket stands behind the first two
    (extraPanel
      ? `<g transform="translate(26 -17) scale(0.82)" transform-origin="20 ${GROUND}" opacity="0.92">${table(4)}</g>`
      : '') +
    table(4) +
    table(42) +
    `<path d="M24 ${GROUND - 1} H90" stroke="#e8c94a" stroke-width="1.6" opacity="0.7"/>` +
    `</g>`
  );
}

/**
 * The battery. Its cells show what is being SAVED: blocks you leave
 * unassigned today, up to the most it can charge in a day. It glows brighter
 * the more it holds, and goes dull when you spend everything.
 */
function battery(p, lv) {
  // Three cells as built; five with the bigger battery from a supply rocket.
  const n = lv.cells;
  const pitch = 27 / n;
  const cells = Array.from({ length: n }, (_, i) => i)
    .map(
      (i) =>
        `<rect class="battery__cell${i < lv.banked ? ' is-on' : ''}" x="92" y="${n1(317.5 - (i + 1) * pitch)}" width="18" height="${n1(pitch - 2.2)}" rx="1.4" style="--delay:${i * 0.18}s"/>`
    )
    .join('');
  return (
    `<g class="battery${lv.banked > 0 ? ' is-charged' : ''}" style="--charge:${n1(lv.banked / n)}">` +
    `<ellipse class="battery__glow" cx="101" cy="300" rx="30" ry="34" fill="url(#${p}-charge)"/>` +
    `<rect class="battery__cap" x="97" y="280" width="8" height="4" rx="1"/>` +
    `<rect class="battery__case" x="88" y="284" width="26" height="36" rx="4.5"/>` +
    cells +
    `</g>`
  );
}

/* ---------------------------------------------------------------- the shield */

/**
 * Regolith over the habitat: the real shield.
 *
 * The solid mound is today's regolith, drawn to scale. Each block spent on
 * shielding adds one dashed scoop on the crest: countable, and visibly NOT
 * part of the mound yet, because regolith piled today only protects the crew
 * from tomorrow.
 */
function regolith(p, theme, mound, lv) {
  const outline = hillPath(mound);

  // Pebbles sit just under the surface so the band reads as piled soil.
  const pebbles = [-58, -31, -8, 22, 47, 66]
    .map((dx, i) => {
      const x = HAB_CX + dx * (mound.halfWidth / 79);
      return `<circle cx="${n1(x)}" cy="${n1(mound.yAt(x) + 4 + (i % 2) * 2)}" r="${1.4 + (i % 3) * 0.5}" fill="${theme.moundEdge}" opacity="0.55"/>`;
    })
    .join('');

  // Scoops fill outwards from the middle, so one block is one bump.
  const offsets = [0, 13, -13, 26, -26, 39, -39, 52, -52, 65, -65];
  const scoops = offsets
    .map((dx, i) => {
      const x = HAB_CX + dx;
      const yl = mound.yAt(x - 6.5);
      const yr = mound.yAt(x + 6.5);
      const top = Math.min(yl, yr) - 13;
      return `<path class="scoop${i < lv.dig ? ' is-on' : ''}" d="M${x - 6.5} ${n1(yl)} Q${x} ${n1(top)} ${x + 6.5} ${n1(yr)}Z"/>`;
    })
    .join('');

  return (
    `<g class="sys" data-sys="shielding" style="--c:var(--sys-shield)">` +
    `<path d="${outline}Z" fill="url(#${p}-mound)"/>` +
    `<path d="${outline}" fill="none" stroke="${theme.moundEdge}" stroke-width="1.6" stroke-linejoin="round"/>` +
    pebbles +
    scoops +
    `</g>`
  );
}

/** A branching crack running inward from a point on the glass. */
function crackPath(x, y, i, size = 1) {
  const s = i % 2 ? -1 : 1;
  const k = size * (1 + (i % 3) * 0.2);
  const run = [[3, 6], [-4, 5], [5, 7], [-2, 6]]
    .map(([dx, dy]) => `l${n1(dx * s * k)} ${n1(dy * k)}`)
    .join(' ');
  return (
    `M${n1(x)} ${n1(y)} ${run} ` +
    `M${n1(x + 3 * s * k)} ${n1(y + 6 * k)} l${n1(7 * s * k)} ${n1(3 * k)} l${n1(3 * s * k)} ${n1(5 * k)} ` +
    `M${n1(x - s * k)} ${n1(y + 11 * k)} l${n1(-7 * s * k)} ${n1(4 * k)}`
  );
}

/**
 * The shield dome.
 *
 * Blue glass around the pod, thicker and brighter the deeper the regolith.
 * What it does on a storm day comes straight from `outlook`:
 *
 *   holds   it flashes as it turns the particles away
 *   cracks  cracks spread across it and it turns from blue to orange
 *   breaks  it cracks, turns red, and shatters, leaving the pod open
 *
 * The sequence repeats every few seconds so it cannot be missed. On quiet
 * days it is whole again, but every storm that reached the crew stays on it
 * as a scar.
 */
function shieldDome(mound, shieldCm, lv, live, outlook, scars) {
  const dome = domeGeometry(mound);
  const outline = hillPath(dome);
  const strength = n1(clamp(shieldCm / 300, 0, 1));

  const onGlass = (dx) => {
    const x = HAB_CX + dx * ((dome.right - HAB_CX) / 91);
    return [x, dome.yAt(x)];
  };

  // Fresh cracks, where today's particles land.
  const hits = outlook === 'breaks' ? 6 : outlook === 'cracks' ? 3 : 0;
  const cracks = [-50, 32, -12, 60, -34, 10]
    .slice(0, hits)
    .map((dx, i) => {
      const [x, y] = onGlass(dx);
      // Three cracks are spread across the whole sequence; six come faster.
      const slot = hits === 3 ? i * 2 + 1 : i + 1;
      return `<path class="crack crack--${slot}" pathLength="1" d="${crackPath(x, y, i)}"/>`;
    })
    .join('');

  // Old damage: one hairline per storm that reached the crew.
  const old = [46, -66, 18, -22, 72]
    .slice(0, Math.min(scars, 5))
    .map((dx, i) => {
      const [x, y] = onGlass(dx);
      return `<path class="dome__scar" d="${crackPath(x, y, i + 1, 0.7)}"/>`;
    })
    .join('');

  // The pieces that fly off when it goes.
  const shards =
    outlook === 'breaks'
      ? [-70, -46, -20, 6, 30, 54, 76]
          .map((dx, i) => {
            const [x, y] = onGlass(dx);
            return `<g transform="translate(${n1(x)} ${n1(y)})"><path class="shard" d="M0 -6 L6 4 L-5 3Z" style="--fx:${n1(dx * 0.45)}px;--fy:${26 + (i % 3) * 8}px;--turn:${(i % 2 ? -1 : 1) * (120 + i * 25)}deg"/></g>`;
          })
          .join('')
      : '';

  // A streak of light across the upper left, so it reads as glass.
  const [sx0, sy0] = onGlass(-66);
  const [sx1, sy1] = onGlass(-30);
  const shine = `<path class="dome__shine" d="M${n1(sx0 + 5)} ${n1(sy0 + 9)} Q${n1(sx0 + 12)} ${n1(sy1 + 6)} ${n1(sx1)} ${n1(sy1 + 5)}"/>`;

  return (
    `<g class="dome dome--${outlook}" style="--strength:${strength}">` +
    `<path class="dome__fill" d="${outline}Z"/>` +
    `<path class="dome__halo" d="${outline}"/>` +
    `<path class="dome__edge" d="${outline}"/>` +
    `<path class="dome__edge dome__edge--broken" d="${outline}"/>` +
    shine +
    old +
    `<g class="dome__cracks">${cracks}</g>` +
    shards +
    (live && lv.dig > 0
      ? `<text class="scene__depth" x="${HAB_CX}" y="${n1(dome.crest - 20)}" text-anchor="middle">Ready tomorrow</text>`
      : '') +
    `</g>`
  );
}

/**
 * The digger. Parked and dark with no power. With power it scoops at the pit,
 * drives over to the habitat, flings the load up onto the mound and drives
 * back for more, quicker the more blocks it has.
 */
function digger(lv, mound) {
  const on = lv.dig > 0;
  const pace = [2.8, 3.4, 2.7, 2.1, 1.6][Math.min(lv.dig, 4)] * (lv.running ? 0.45 : 1);
  const home = 136;
  const run = 24;
  // The clods leave the raised bucket at the far end of the run.
  const fromX = 30 + run;
  const fromY = -30;
  const clod = (i) => {
    const x = HAB_CX - 40 + i * 24;
    return `<circle class="clod" cx="${fromX}" cy="${fromY}" r="${n1(2.8 - i * 0.4)}" style="--ex:${n1(x - home - fromX)}px;--ey:${n1(mound.yAt(x) - GROUND - fromY)}px"/>`;
  };
  const wheel = (x) =>
    `<g transform="translate(${x} -4.5)"><circle r="2.6" fill="#8d97a8"/><g class="digger__wheel"><path d="M-2.4 0 H2.4" stroke="#262d3e" stroke-width="1.1"/></g></g>`;

  return (
    `<g transform="translate(${home} ${GROUND})" class="sys digger${on ? ' is-on' : ''}${lv.shieldOnline ? '' : ' is-waiting'}" data-sys="shielding" style="--c:var(--sys-shield);--dig:${pace}s;--run:${run}px">` +
    // the pit it digs from
    `<ellipse cx="33" cy="4" rx="10" ry="2.6" fill="#000" opacity="0.38"/>` +
    `<g class="digger__drive">` +
    `<rect x="-17" y="-9" width="32" height="9" rx="4.5" fill="#262d3e" stroke="#cfd6e2" stroke-width="1"/>` +
    wheel(-11) +
    wheel(-1) +
    wheel(9) +
    `<g class="digger__cab">` +
    `<rect x="-14" y="-23" width="24" height="14" rx="3.5" fill="#ffc94d" stroke="${INK}" stroke-width="1"/>` +
    `<rect x="-1" y="-20" width="8" height="6.5" rx="1.5" fill="#20304f"/>` +
    `<path d="M-12 -12 l3 -4 M-7 -12 l3 -4" stroke="${INK}" stroke-width="1.4"/>` +
    `<circle cx="-9" cy="-25" r="2.6" class="digger__lamp"/>` +
    `</g>` +
    `<g transform="translate(9 -17)"><g class="digger__arm">` +
    `<path d="M0 0 L16 -6 L24 3" fill="none" stroke="#e0a82e" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="M19 2 H30 L27.5 10 H21.5Z" fill="#aeb7c6" stroke="${INK}" stroke-width="1" stroke-linejoin="round"/>` +
    `<circle r="2.4" fill="#8a6220"/>` +
    `</g></g>` +
    `</g>` +
    clod(0) +
    clod(1) +
    clod(2) +
    `</g>`
  );
}

/* --------------------------------------------------------------- the habitat */

/**
 * The habitat, cut open. Life support is the machine on the left. Its fan
 * turns faster, and more air streams across the cabin, with every block. Run
 * it short and the fan slows, the streams thin out and the cabin goes red.
 */
function habitat(p, lv, warmth, dogIndoors) {
  // Everything here is drawn from how much of TODAY'S need is met, so that on
  // a leak day four blocks looks like what it is: not enough.
  const demand = lv.airNeed;
  const share = clamp(lv.air / demand, 0, 1);
  const short = lv.air < demand;
  // Quarters of full power: 0 stopped, 4 flat out.
  const level = share === 0 ? 0 : Math.max(1, Math.floor(share * 4 + 0.001));
  // Seconds per turn of the fan, and per sweep of the air streams.
  const spin = [0, 3.6, 1.8, 0.9, 0.45][level];
  const wind = [0, 2.6, 1.8, 1.2, 0.7][level];

  const bubbles = [
    [204, 0], [214, 0.9], [209, 1.7], [219, 0.4],
  ]
    .map(
      ([x, delay], i) =>
        `<g transform="translate(${x} 268)"><circle class="bubble${i < level ? ' is-on' : ''}" r="${3 + (i % 2) * 0.8}" style="--delay:${delay}s"/></g>`
    )
    .join('');

  // Air blowing out of the machine and across to the crew.
  const streams = [283, 293, 303]
    .map(
      (y, i) =>
        `<path class="stream${i < Math.min(level, 3) ? ' is-on' : ''}" d="M231 ${y} q10 -4 20 0 t20 0 t20 0 t20 0" style="--delay:${-(i * 0.4)}s"/>`
    )
    .join('');

  const blade = (turn, fill) =>
    `<path d="M0 -11.5 Q6 -5.5 0 0 Q-6 -5.5 0 -11.5Z" fill="${fill}" transform="rotate(${turn})"/>`;

  return (
    `<g class="sys hab${short ? ' is-short' : ''}" data-sys="lifeSupport" data-air="${level}" style="--c:var(--sys-air);--spin:${spin || 1}s;--wind:${wind || 1}s">` +
    // connecting tunnel to the greenhouse
    `<rect x="316" y="297" width="26" height="15" rx="4" fill="#aeb7c6" stroke="${INK}" stroke-width="1"/>` +
    `<path d="M324 297 v15 M332 297 v15" stroke="#7d8798" stroke-width="1.2"/>` +
    `<g clip-path="url(#${p}-hab)">` +
    `<rect x="${HAB_X}" y="250" width="${HAB_W}" height="70" fill="#1d2a48"/>` +
    `<rect x="${HAB_X}" y="250" width="${HAB_W}" height="70" fill="#ffcf7a" opacity="${n1(0.08 + warmth * 0.24)}" class="hab__light"/>` +
    `<rect x="${HAB_X}" y="250" width="${HAB_W}" height="70" class="hab__alarm"/>` +
    // a screen, so it reads as somewhere people live
    `<rect x="250" y="258" width="17" height="11" rx="2" fill="#0f1830" stroke="#6f7f9f" stroke-width="1"/>` +
    `<path d="M253 264 h3 l2 -3 l2 6 l2 -3 h2" fill="none" stroke="#5fe08a" stroke-width="1.1" opacity="${n1(0.35 + warmth * 0.65)}"/>` +
    // the storm room: the most heavily walled corner of the pod
    `<rect x="284" y="270" width="34" height="42" rx="3" fill="#101a30"/>` +
    `<path d="M288 277 h8 M288 282 h8" stroke="#3d4d70" stroke-width="1.6" stroke-linecap="round"/>` +
    `<rect x="${HAB_X}" y="312" width="${HAB_W}" height="8" fill="#8d97a8"/>` +
    streams +
    // life support machine
    `<rect x="195" y="273" width="34" height="39" rx="4" fill="#263657" stroke="var(--sys-air)" stroke-width="1.4"/>` +
    `<circle cx="212" cy="290" r="13.5" fill="#0d1630" stroke="#7fdfff" stroke-width="1.1"/>` +
    `<g transform="translate(212 290)"><g class="fan">` +
    blade(0, '#e8f9ff') +
    blade(90, 'var(--sys-air)') +
    blade(180, 'var(--sys-air)') +
    blade(270, 'var(--sys-air)') +
    `<circle r="2.2" fill="#fff"/>` +
    `</g></g>` +
    `<rect x="200" y="306" width="24" height="3.5" rx="1.75" fill="#0d1630"/>` +
    `<rect x="200" y="306" width="${n1(share * 24)}" height="3.5" rx="1.75" class="hab__gauge"/>` +
    bubbles +
    `<circle cx="${HAB_CX}" cy="256" r="2.6" class="hab__lamp"/>` +
    `</g>` +
    astronaut(241, '#ff9d4d', 51, 0) +
    astronaut(260, '#4fd1ff', 47, 1) +
    (dogIndoors ? spaceDog(278, 19) : '') +
    // bay walls and its door, drawn over the crew so they are seen inside it
    `<g class="sys bay${lv.sheltered ? ' is-on' : ''}" data-sys="shelter" style="--c:var(--good)" clip-path="url(#${p}-hab)">` +
    `<rect class="bay__door" x="284" y="270" width="34" height="42" rx="3"/>` +
    `<rect class="bay__wall" x="284" y="270" width="34" height="42" rx="3"/>` +
    `<path class="bay__badge" d="M301 276 l5 2 v4 q0 4 -5 6 q-5 -2 -5 -6 v-4z"/>` +
    `</g>` +
    `<path d="${HAB_D}" fill="none" stroke="#e9edf4" stroke-width="4" stroke-linejoin="round"/>` +
    `<path d="${HAB_D}" fill="none" stroke="${INK}" stroke-width="1" opacity="0.5"/>` +
    `</g>`
  );
}

/**
 * Comet, the crew's dog, indoors.
 *
 * On a flare day Comet is brought inside with the crew (the rest of the time
 * it is out with the rover; see `buddy`). Its tail wags when the pod has the
 * air it needs and droops when it does not, which a five-year-old reads
 * faster than any gauge. It follows the crew into the storm room.
 *
 * The suit carries the mission's own star patch, not a space agency's badge.
 */
function spaceDog(x, bayDx) {
  const INK_ = INK;
  return (
    `<g transform="translate(${x} 312) scale(1.28)"><g class="crew dog" style="--bx:${bayDx}px;--by:0px;--delay:0.24s">` +
    // tail, wagging from where it joins the suit
    `<g transform="translate(5.5 -6.5)"><path class="dog__tail" d="M0 0 Q4 -2 4.5 -6.5" fill="none" stroke="#c98a4b" stroke-width="2.2" stroke-linecap="round"/></g>` +
    // legs in white boots
    `<rect x="-5.2" y="-3" width="2.6" height="3" rx="1" fill="#f1f4f9" stroke="${INK_}" stroke-width="0.5"/>` +
    `<rect x="2.6" y="-3" width="2.6" height="3" rx="1" fill="#f1f4f9" stroke="${INK_}" stroke-width="0.5"/>` +
    // orange suit, with a mission patch and a pack on its back
    `<rect x="-6.2" y="-9.6" width="12.4" height="7.4" rx="3.2" fill="#ff9d4d" stroke="${INK_}" stroke-width="0.7"/>` +
    `<rect x="-1.6" y="-11.2" width="5.6" height="2.4" rx="1" fill="#dfe5ee" stroke="${INK_}" stroke-width="0.5"/>` +
    `<circle cx="1.2" cy="-6" r="1.9" fill="#20304f"/><path d="M1.2 -7.3 l.4 .9 .9 .1 -.7 .6 .2 .9 -.8 -.5 -.8 .5 .2 -.9 -.7 -.6 .9 -.1z" fill="#ffe066"/>` +
    // neck ring and head
    `<rect x="-7.4" y="-10.4" width="2.6" height="5.4" rx="1.2" fill="#aeb7c6" stroke="${INK_}" stroke-width="0.5"/>` +
    `<g class="dog__head">` +
    `<circle cx="-9.2" cy="-11.4" r="4" fill="#d9a066" stroke="${INK_}" stroke-width="0.7"/>` +
    `<rect x="-14.2" y="-11.4" width="5" height="3.4" rx="1.6" fill="#f1d3a8" stroke="${INK_}" stroke-width="0.6"/>` +
    `<circle cx="-13.8" cy="-10.4" r="0.9" fill="${INK_}"/>` +
    `<circle cx="-10.4" cy="-12.2" r="0.75" fill="${INK_}"/>` +
    `<path class="dog__ear" d="M-8.4 -14.6 Q-5 -14.4 -5.6 -9.6 Q-8 -10.4 -8.4 -14.6Z" fill="#8a5a2b" stroke="${INK_}" stroke-width="0.5"/>` +
    `</g>` +
    `</g></g>`
  );
}

/** One crew member. They walk into the storm room when sheltering. */
function astronaut(x, accent, bayDx, i) {
  // --bx is how far this one walks to reach the storm room.
  return (
    `<g transform="translate(${x} 312)"><g class="crew" style="--bx:${bayDx}px;--by:0px;--delay:${i * 0.12}s"><g class="crew__bob" style="--delay:${-i * 1.3}s">` +
    `<rect x="-4.2" y="-8" width="3.4" height="8" rx="1.4" fill="#dfe5ee"/><rect x="0.8" y="-8" width="3.4" height="8" rx="1.4" fill="#dfe5ee"/>` +
    `<path d="M-5.6 -15 L-8.4 -9 M5.6 -15 L8.4 -9" stroke="#f1f4f9" stroke-width="2.8" stroke-linecap="round"/>` +
    `<rect x="-5.6" y="-18" width="11.2" height="12" rx="3.2" fill="#f1f4f9" stroke="${INK}" stroke-width="0.8"/>` +
    `<rect x="-3.2" y="-14.6" width="6.4" height="2.6" rx="1" fill="${accent}"/>` +
    `<circle cy="-22.5" r="5.4" fill="#f1f4f9" stroke="${INK}" stroke-width="0.8"/>` +
    `<rect x="-3.6" y="-24.8" width="7.2" height="4.4" rx="2.1" fill="#20304f"/>` +
    `<path d="M-2.2 -23.6 h2" stroke="#9fd0ff" stroke-width="0.9" stroke-linecap="round"/>` +
    `</g></g></g>`
  );
}

/* ----------------------------------------------------------------- greenhouse */

/**
 * The greenhouse. One grow light per block, up to the three it needs. The
 * plants stand taller under more light, and wilt with none.
 */
function greenhouse(lv) {
  const demand = lv.foodNeed;
  const share = clamp(lv.food / demand, 0, 1);
  // Thirds of full power: one grow light each.
  const level = share === 0 ? 0 : Math.max(1, Math.floor(share * 3 + 0.001));
  const grow = [0.48, 0.68, 0.86, 1][level];
  const dome = `M338 ${GROUND} V294 A41 36 0 0 1 420 294 V${GROUND}Z`;

  const lamps = [359, 379, 399]
    .map(
      (x, i) =>
        `<g class="lamp${i < level ? ' is-on' : ''}">` +
        `<path class="lamp__cone" d="M${x - 4} 277 H${x + 4} L${x + 11} 311 H${x - 11}Z"/>` +
        `<rect x="${x - 5.5}" y="272" width="11" height="5" rx="1.5" fill="#d9dfe9" stroke="${INK}" stroke-width="0.7"/>` +
        `<rect class="lamp__bulb" x="${x - 3.5}" y="276" width="7" height="2" rx="1"/>` +
        `</g>`
    )
    .join('');

  const plants = [353, 370, 388, 405]
    .map(
      (x, i) =>
        `<g transform="translate(${x} 311)"><g class="plant" style="--grow:${n1(grow * (0.9 + (i % 2) * 0.1))};--lean:${i % 2 ? 16 : -16}deg"><g class="plant__sway" style="--delay:${-(i * 0.7)}s">` +
        `<path d="M0 0 C-1 -6 1 -11 0 -19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>` +
        `<path d="M0 -5 Q-8 -8 -8 -13 Q-2 -12 0 -5Z M0 -9 Q8 -11 9 -17 Q2 -16 0 -9Z M0 -14 Q-6 -17 -5 -22 Q0 -20 0 -14Z M0 -18 Q4 -21 3 -25 Q-1 -23 0 -18Z" fill="currentColor"/>` +
        (i === 1 || i === 2
          ? `<circle class="plant__fruit" cx="${i === 1 ? 5 : -4}" cy="-9" r="2.3"/>`
          : '') +
        `</g></g></g>`
    )
    .join('');

  // Specks of new growth drifting up, only at full power.
  const growth = [[361, 0], [381, 0.8], [399, 1.5]]
    .map(
      ([x, delay]) =>
        `<g transform="translate(${x} 292)"><path class="gh__growth" d="M0 -3 L1 -1 L3 0 L1 1 L0 3 L-1 1 L-3 0 L-1 -1Z" style="--delay:${delay}s"/></g>`
    )
    .join('');

  return (
    `<g class="sys gh${lv.food < demand ? ' is-short' : ''}" data-sys="greenhouse" data-food="${level}" style="--c:var(--sys-food)">` +
    `<path d="${dome}" class="gh__air"/>` +
    `<path d="M352 272 H406" stroke="#8d97a8" stroke-width="1.6"/>` +
    lamps +
    `<rect x="344" y="311" width="70" height="9" rx="2" fill="#5b4631" stroke="${INK}" stroke-width="0.8"/>` +
    `<rect x="344" y="311" width="70" height="2.5" rx="1" fill="#33271a"/>` +
    plants +
    growth +
    `<path d="${dome}" fill="none" stroke="#b9f0d2" stroke-width="2.4" stroke-linejoin="round"/>` +
    `<path d="M365 260.2 V${GROUND} M393 260.2 V${GROUND}" stroke="#b9f0d2" stroke-width="1" opacity="0.4"/>` +
    `<path d="M346 290 A36 31 0 0 1 366 265" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity="0.35"/>` +
    `</g>`
  );
}

/* -------------------------------------------------------------------- science */

/**
 * The lab, its dish and the rover. With no power the dish hangs down, the lab
 * is dark and the rover sits parked. The first block swings the dish up to
 * Earth; each block after sends the rover further out to drill and packs
 * more data into the beam. Sheltering keeps the rover home.
 */
function scienceStation(isMoon, lv, drop) {
  const on = lv.sci > 0;
  const working = on && !lv.sheltered;
  const reach = working ? Math.min(lv.sci, 5) * 12 : 0;
  const earth = isMoon ? [511, 145 + drop] : [519.5, 113 + drop];
  const gap = on ? Math.max(4, 16 - lv.sci * 2.4) : 14;

  return (
    `<g class="sys sci${on ? ' is-on' : ''}${working ? ' is-working' : ''}${lv.scienceOnline ? '' : ' is-waiting'}" data-sys="science" style="--c:var(--sys-science)">` +
    `<line class="beam" x1="452" y1="253.5" x2="${earth[0]}" y2="${earth[1]}" style="--gap:${n1(gap)};--period:${n1(gap + 3)}"/>` +
    // lab module
    `<rect x="432" y="288" width="36" height="32" rx="5" fill="#e3e8f0" stroke="${INK}" stroke-width="1.1"/>` +
    `<rect x="432" y="295" width="36" height="4" fill="var(--sys-science)"/>` +
    `<rect x="437" y="303" width="13" height="10" rx="2" class="sci__window"/>` +
    `<path d="M442 305.5 v2.5 l-2.4 3.6 h6.8 l-2.4 -3.6 v-2.5" fill="none" stroke="#e3e8f0" stroke-width="1" stroke-linejoin="round" opacity="0.85"/>` +
    `<circle class="sci__fizz" cx="442" cy="310" r="0.9"/><circle class="sci__fizz" cx="444" cy="310" r="0.7" style="--delay:0.5s"/>` +
    `<rect x="456" y="304" width="9" height="16" rx="1.5" fill="#8d97a8"/>` +
    // dish, aimed at Earth
    `<path d="M449 288 V266" stroke="#8d97a8" stroke-width="2.6"/>` +
    `<g transform="translate(449 262)"><g class="dish">` +
    `<path d="M-14 0 Q0 9 14 0Z" fill="#e3e8f0" stroke="${INK}" stroke-width="1"/>` +
    `<path d="M-7 1 L0 -9 L7 1" fill="none" stroke="#8d97a8" stroke-width="1.2"/>` +
    `<circle cy="-9" r="2.2" class="sci__feed"/>` +
    `<path class="dish__wave" d="M-5 -13 Q0 -17 5 -13"/>` +
    `<path class="dish__wave" d="M-8 -17 Q0 -24 8 -17" style="--delay:0.25s"/>` +
    `<path class="dish__wave" d="M-11 -21 Q0 -31 11 -21" style="--delay:0.5s"/>` +
    `</g></g>` +
    // markers the rover plants as the day plays out
    [528, 553, 578]
      .map(
        (x, i) =>
          `<g transform="translate(${x} ${GROUND})"><g class="sample" style="--at:${i}"><path d="M0 0 V-11" stroke="#cfd6e2" stroke-width="1.3"/><path d="M0 -11 L7 -8.5 L0 -6Z" fill="var(--sys-science)"/></g></g>`
      )
      .join('') +
    // rover
    `<g transform="translate(474 ${GROUND})"><g class="rover" style="--go:${reach}px"><g class="rover__body">` +
    `<path d="M5 -5 L17 -11 L29 -5" fill="none" stroke="#8d97a8" stroke-width="1.8"/>` +
    [5, 17, 29]
      .map(
        (x) =>
          `<g transform="translate(${x} -5)"><circle r="5" fill="#262d3e" stroke="#cfd6e2" stroke-width="1.3"/><g class="rover__wheel"><path d="M-3.4 0 H3.4 M0 -3.4 V3.4" stroke="#cfd6e2" stroke-width="1.1"/></g></g>`
      )
      .join('') +
    `<rect x="-2" y="-18" width="7" height="5" rx="1.2" fill="#5b6478" transform="rotate(-14 2 -15)"/>` +
    `<rect x="3" y="-19" width="28" height="9" rx="2.8" fill="#eef2f8" stroke="${INK}" stroke-width="1"/>` +
    `<rect x="7" y="-16" width="9" height="3" rx="1" fill="var(--sys-science)"/>` +
    `<path d="M25 -19 V-28" stroke="#aeb7c6" stroke-width="2"/>` +
    `<rect x="19.5" y="-35" width="12" height="7" rx="2.4" fill="#eef2f8" stroke="${INK}" stroke-width="0.9"/>` +
    `<circle cx="23.3" cy="-31.5" r="1.7" class="rover__eye"/><circle cx="28" cy="-31.5" r="1.7" class="rover__eye"/>` +
    `<path d="M31 -14 H38 V-7" fill="none" stroke="#8d97a8" stroke-width="2" stroke-linejoin="round"/>` +
    `<g transform="translate(38 -7)"><g class="rover__drill"><path d="M-2.4 0 H2.4 L0 7Z" fill="#cfd6e2"/><path d="M-2.4 2 L2 3.4" stroke="#5b6478" stroke-width="0.9"/></g></g>` +
    `<g transform="translate(38 -1)"><circle class="rover__chip" r="1.6" style="--dx:-7px"/><circle class="rover__chip" r="1.3" style="--dx:7px;--delay:0.3s"/><circle class="rover__chip" r="1.1" style="--dx:3px;--delay:0.55s"/></g>` +
    `</g></g></g>` +
    `</g>`
  );
}

/* ------------------------------------------------------------------- Comet */

/**
 * Comet, outdoors: a dog in a suit and bubble helmet, big enough to find at a
 * glance. It stands a step nearer to us than the buildings, at the front edge
 * of the ground, which is what lets it be drawn larger than the crew without
 * looking wrong, and it wears its name.
 *
 * Comet is the rover's partner. When science research has power it trots out
 * behind the rover, exactly as far as the rover goes, and when the day is
 * played out it runs with it to the edge of the picture. With no power for
 * research it sits at the lab door and waits.
 */
function buddy(lv) {
  const working = lv.sci > 0 && lv.scienceOnline && !lv.sheltered;
  const reach = working ? Math.min(lv.sci, 5) * 12 : 0;
  return (
    `<g transform="translate(438 ${GROUND + 9})" class="buddy${working ? ' is-working' : ''}">` +
    `<g class="buddy__go" style="--go:${reach}px">` +
    `<ellipse cx="2" cy="0.5" rx="17" ry="2.6" fill="#000" opacity="0.28"/>` +
    // name tag
    `<g class="buddy__tag"><rect x="-7" y="-47" width="34" height="11" rx="5.5" fill="#ff9d4d" stroke="${INK}" stroke-width="0.8"/>` +
    `<path d="M8 -36.2 l2.4 3 2.4 -3z" fill="#ff9d4d" stroke="${INK}" stroke-width="0.8" stroke-linejoin="round"/>` +
    `<rect x="7" y="-37.4" width="6.8" height="1.6" fill="#ff9d4d"/>` +
    `<text x="10" y="-38.6" text-anchor="middle" font-size="7.4" font-weight="700" fill="${INK}">Comet</text></g>` +
    `<g class="buddy__bob" transform="scale(1.3)">` +
    cometBody() +
    `</g></g>` +
    `</g>`
  );
}

/* --------------------------------------------------------------------- events */

/**
 * What today's event looks like in the picture.
 *
 * Each one is drawn on the thing it is about, so the picture points at the
 * same row the board is highlighting.
 */
function eventArt(event, isMoon, mound) {
  if (event === 'leak') {
    // A pinhole in the tunnel between pod and greenhouse, venting air.
    const puffs = [0, 1, 2, 3]
      .map(
        (i) =>
          `<circle class="leak__puff" r="${2.2 + i * 0.5}" style="--delay:${(i * 0.28).toFixed(2)}s;--dx:${(i % 2 ? 7 : -5) + i}px"/>`
      )
      .join('');
    return (
      `<g transform="translate(329 297)" class="leak">` +
      puffs +
      `<circle r="2.4" fill="#0c1220"/><circle r="4.2" class="leak__mark"/>` +
      `</g>`
    );
  }

  if (event === 'blight') {
    // Grey-green mould on the leaves.
    const spots = [[350, 300], [357, 294], [368, 303], [374, 296], [385, 301], [391, 293], [402, 299], [408, 305]]
      .map(
        ([x, y], i) =>
          `<circle class="mould__spot" cx="${x}" cy="${y}" r="${1.6 + (i % 3) * 0.5}" style="--delay:${(i * 0.3).toFixed(1)}s"/>`
      )
      .join('');
    return `<g class="mould">${spots}</g>`;
  }

  if (event === 'quake') {
    // Loose soil skittering down both sides of the mound.
    const stones = [-1, 1, -1, 1, -1, 1]
      .map((side, i) => {
        const x = HAB_CX + side * (20 + i * 9);
        return `<circle class="quake__stone" cx="${x}" cy="${n1(mound.yAt(x) - 1)}" r="${1.8 + (i % 2)}" style="--dx:${side * (26 + i * 4)}px;--dy:${22 + i * 5}px;--delay:${(i * 0.35).toFixed(2)}s"/>`;
      })
      .join('');
    return (
      `<g class="quake">` +
      `<path d="M150 ${SOIL} l6 9 l-5 8 l7 10 M352 ${SOIL} l-5 10 l6 7 l-4 9" class="quake__crack"/>` +
      stones +
      `</g>`
    );
  }

  if (event === 'find') {
    // Something glinting at the far edge of the picture, where the rover goes.
    const thing = isMoon
      ? `<path d="M-7 0 L-4 -9 L0 -13 L5 -8 L7 0Z" fill="#bfe6ff" stroke="#fff" stroke-width="1"/><path d="M-4 -9 L0 -4 L5 -8 M0 -13 V-4 M0 -4 L-1 0" fill="none" stroke="#7fc4ef" stroke-width="0.8"/>`
      : `<ellipse cx="0" cy="-5" rx="8" ry="5.5" fill="#b9744a" stroke="#f0c79c" stroke-width="1"/><ellipse cx="0" cy="-5" rx="5" ry="3.2" fill="none" stroke="#f6e3c8" stroke-width="0.9"/><ellipse cx="0" cy="-5" rx="2.2" ry="1.3" fill="#f6e3c8"/>`;
    return (
      `<g transform="translate(588 ${GROUND})" class="find">` +
      thing +
      `<path class="find__glint" d="M0 -22 L1.6 -17.6 L6 -16 L1.6 -14.4 L0 -10 L-1.6 -14.4 L-6 -16 L-1.6 -17.6Z"/>` +
      `<path class="find__glint" style="--delay:0.5s" d="M-11 -12 L-10 -9.4 L-7.4 -8.4 L-10 -7.4 L-11 -4.8 L-12 -7.4 L-14.6 -8.4 L-12 -9.4Z"/>` +
      `</g>`
    );
  }

  if (event === 'devil') {
    // The whirlwind crossing the solar panels, taking the dust with it.
    return (
      `<g transform="translate(20 ${GROUND - 2})"><g class="sweeper">` +
      `<path d="M-3 0 Q-10 -16 -4 -30 Q-12 -42 -15 -58 H15 Q11 -42 4 -30 Q9 -16 3 0Z" fill="#f6cfa6" opacity="0.55"/>` +
      `<path d="M-9 -20 h18 M-12 -40 h24" stroke="#fff3e0" stroke-width="1.4" stroke-linecap="round" opacity="0.6"/>` +
      `</g></g>`
    );
  }

  return '';
}

/* ---------------------------------------------------------------- bad weather */

/** A Martian dust storm: the sky fills in and the Sun dims. */
function dustStorm() {
  const streaks = [
    [-40, 70, 150], [120, 120, 120], [-80, 170, 180], [220, 200, 130],
    [40, 236, 160], [-120, 268, 140], [300, 96, 110], [160, 292, 170],
  ];
  return (
    `<g class="scene__duststorm">` +
    `<rect x="0" y="0" width="${W}" height="${SOIL}" fill="#b9713f" opacity="0.42"/>` +
    streaks
      .map(
        ([x, y, len], i) =>
          `<g transform="translate(${x} ${y})"><path class="scene__gust" d="M0 0 h${len}" style="--delay:${-(i * 0.45).toFixed(2)}s;--d:${(2.4 + (i % 3) * 0.6).toFixed(1)}s"/></g>`
      )
      .join('') +
    `</g>`
  );
}

/**
 * Solar particles. Deliberately drawn as fast streaks rather than a fireball:
 * what actually hurts a crew is a stream of charged particles, not an
 * explosion, and the drawing should not teach the wrong picture.
 *
 * Six of them are aimed at the habitat. A shield that holds turns all six
 * away at the glass; one that cracks lets half through; one that breaks lets
 * nearly all of them into the cabin.
 */
function stormParticles(p, stormInfo, mound, outlook) {
  const [ux, uy] = SEP_DIR;
  const dome = domeGeometry(mound);
  const count =
    stormInfo.severity === 'extreme' ? 20 : stormInfo.severity === 'moderate' ? 11 : 15;

  const starts = [
    [-30, 20], [60, -30], [150, -20], [250, -36], [340, -16], [430, -30],
    [-40, 120], [-20, 210], [100, 60], [300, 70], [390, 40], [480, -10],
    [200, 30], [-50, 60], [520, 60], [40, 150], [560, 10], [120, 120],
    [360, 150], [-10, 260],
  ].slice(0, count);

  const tail = `x2="${-ux * 26}" y2="${-uy * 26}"`;

  const background = starts
    .map(
      ([x, y], i) =>
        `<g transform="translate(${x} ${y})"><line class="sep" x1="0" y1="0" ${tail} style="--delay:${-(i * 0.23).toFixed(2)}s;--d:${(1.2 + (i % 4) * 0.25).toFixed(2)}s"/></g>`
    )
    .join('');

  // How many of the six get through goes with what the dome is doing.
  const through = outlook === 'breaks' ? 5 : outlook === 'cracks' ? 3 : 0;
  const order = [2, 4, 0, 3, 5, 1];
  const run = 230;

  const aimed = [0, 1, 2, 3, 4, 5]
    .map((i) => {
      // Every one of the six is on course for a spot inside the cabin.
      const cabinX = 212 + i * 13;
      const cabinY = 270 + (i % 3) * 11;
      const sx = cabinX - ux * run;
      const sy = cabinY - uy * run;
      const passes = order.indexOf(i) < through;

      // The ones the shield stops end where their path first meets the glass.
      let ex = cabinX;
      let ey = cabinY;
      if (!passes) {
        for (let d = 0; d <= run; d += 1.5) {
          const x = sx + ux * d;
          const y = sy + uy * d;
          if (y >= dome.yAt(x)) {
            ex = x;
            ey = y;
            break;
          }
        }
      }

      const delay = -(i * 0.37).toFixed(2);
      return (
        `<g transform="translate(${n1(sx)} ${n1(sy)})"><line class="hit" x1="0" y1="0" ${tail} style="--tx:${n1(ex - sx)}px;--ty:${n1(ey - sy)}px;--delay:${delay}s"/></g>` +
        `<g transform="translate(${n1(ex)} ${n1(ey)})"><path class="spark${passes ? ' spark--through' : ''}" d="M0 -7 L1.8 -1.8 L7 0 L1.8 1.8 L0 7 L-1.8 1.8 L-7 0 L-1.8 -1.8Z" style="--delay:${delay}s"/></g>`
      );
    })
    .join('');

  return (
    `<g class="scene__storm" clip-path="url(#${p}-above)">` +
    `<rect x="0" y="0" width="${W}" height="${SOIL}" fill="#ff6b6b" opacity="0.06"/>` +
    background +
    aimed +
    `</g>`
  );
}

/* ------------------------------------------------------------ click feedback */

const SVG_NS = 'http://www.w3.org/2000/svg';

function svgEl(name, attrs) {
  const el = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

/**
 * Show one click landing in the picture.
 *
 * A spark runs along the buried cable from the battery to the building (or
 * back again when a block is taken away), the building lights up, and a small
 * "+1 Air" pops above it. This is the link between the button and the thing it
 * controls, so it is the one place the scene is animated from JavaScript.
 *
 * @param {Element} root
 * @param {string} id       a system id, or 'shelter'
 * @param {number} delta    +1 or -1
 */
export function sceneFeedback(root, id, delta) {
  const svg = root.querySelector('svg.scene--live');
  if (!svg) return;
  const fx = svg.querySelector('[data-fx]');
  const anchor = ANCHORS[id];
  if (!fx || !anchor) return;

  const adding = delta > 0;
  const isShelter = id === 'shelter';
  const color = isShelter ? 'var(--good)' : `var(${getSystem(id).colorVar})`;
  const word = isShelter
    ? adding
      ? 'Sheltering'
      : 'Back to work'
    : `${adding ? '+' : '−'} ${getSystem(id).short}`;

  // The building answers with a ring of its own colour.
  const arrive = () => {
    const ring = svgEl('circle', {
      class: 'scene-ring',
      cx: anchor[0],
      cy: anchor[1] + 14,
      r: 16,
    });
    ring.style.stroke = color;
    fx.appendChild(ring);
    setTimeout(() => ring.remove(), 700);
  };

  const label = svgEl('text', {
    class: `scene-float${adding ? '' : ' scene-float--down'}`,
    x: anchor[0],
    y: anchor[1],
    'text-anchor': 'middle',
  });
  label.style.fill = color;
  label.textContent = tr(word);

  const cable = svg.querySelector(`[data-cable="${id}"]`);
  if (!cable || typeof cable.getTotalLength !== 'function') {
    arrive();
    fx.appendChild(label);
    setTimeout(() => label.remove(), 1000);
    return;
  }

  const spark = svgEl('g', { class: 'scene-spark' });
  spark.style.color = color;
  spark.appendChild(svgEl('circle', { r: 8, fill: 'currentColor', opacity: 0.35 }));
  spark.appendChild(svgEl('circle', { r: 3.6, fill: '#fff' }));
  fx.appendChild(spark);

  const length = cable.getTotalLength();
  const duration = 380;
  const began = performance.now();

  if (!adding) {
    // Taking a block away: say so at once, then show it running home.
    fx.appendChild(label);
    setTimeout(() => label.remove(), 1000);
  }

  const step = (now) => {
    const k = Math.min(1, (now - began) / duration);
    const eased = 1 - (1 - k) ** 2;
    const at = cable.getPointAtLength(length * (adding ? eased : 1 - eased));
    spark.setAttribute('transform', `translate(${at.x} ${at.y})`);
    if (k < 1) {
      requestAnimationFrame(step);
      return;
    }
    spark.remove();
    if (adding) {
      arrive();
      fx.appendChild(label);
      setTimeout(() => label.remove(), 1000);
    }
  };
  requestAnimationFrame(step);
}

/* ------------------------------------------------------------------- caption */

/**
 * One plain sentence about what the picture is showing for the system the
 * player last touched. The picture shows it; this says it, with the number.
 *
 * @param {Object} opts
 * @param {string|null} opts.focus   last system touched, 'shelter', or null
 * @returns {{ colorVar: string|null, text: string }}
 */
export function sceneCaption({ focus, allocation, plan }) {
  if (focus === 'shelter') {
    return allocation.shelter
      ? {
          colorVar: '--good',
          text: 'The crew shuts itself in the storm room, the safest room in the pod. The rover stays parked.',
        }
      : {
          colorVar: '--warn',
          text: 'The crew is back at work, with only the shield between them and the storm.',
        };
  }

  if (focus === 'lifeSupport') {
    const sys = getSystem(focus);
    const n = allocation.lifeSupport;
    const text =
      n === 0
        ? 'Life support is off. The fan has stopped and the air is running out.'
        : n < sys.demand
          ? 'Life support is short. The fan slows and the cabin light goes red.'
          : n > sys.demand
            ? 'Life support has more than it needs. The extra makes no extra air.'
            : 'Life support has all it needs. The fan spins and fresh air flows.';
    return { colorVar: sys.colorVar, text };
  }

  if (focus === 'greenhouse') {
    const sys = getSystem(focus);
    const n = allocation.greenhouse;
    const text =
      n === 0
        ? 'The grow lights are off. The plants wilt and the crew eats from the stores.'
        : n < sys.demand
          ? 'Some grow lights are off. The plants stall and the crew eats from the stores.'
          : n > sys.demand
            ? 'The greenhouse has more than it needs. The extra grows no extra food.'
            : 'Every grow light is on. The plants are growing.';
    return { colorVar: sys.colorVar, text };
  }

  if (focus === 'shielding') {
    const sys = getSystem(focus);
    return {
      colorVar: sys.colorVar,
      text:
        allocation.shielding === 0
          ? 'The digger is parked. No new soil goes on the pod today.'
          : 'The digger piles soil on the pod. The dashed scoops only start working tomorrow.',
    };
  }

  if (focus === 'science') {
    const sys = getSystem(focus);
    const text =
      allocation.science === 0
        ? 'The rover is parked and the dish hangs down. No science today.'
        : allocation.shelter
          ? 'The crew is sheltering, so the rover stays home. Very little science today.'
          : 'The rover drives out to drill, and the dish sends what it finds to Earth.';
    return { colorVar: sys.colorVar, text };
  }

  const eventHint = {
    leak: 'Air is hissing out of the pod. Give life support more blocks, until its tag turns green.',
    blight: 'Mould is spreading on the plants. Give the greenhouse more blocks, until its tag turns green.',
    quake: 'The ground is shaking soil off the pod. The digger can pile it back.',
    find: 'The rover has found something at the edge of the base. Science research counts double today.',
    devil: 'A dust devil has swept your panels clean. You have extra power today.',
  }[plan.event ? plan.event.id : ''];

  return {
    colorVar: eventHint ? '--warn' : null,
    text: plan.storm
      ? 'A solar storm is hitting the shield. Blue flashes are stopped. Red ones reach the crew.'
      : eventHint || 'Press + or − on any row and watch what changes here.',
  };
}

/* ------------------------------------------------------------ description */

/** The alt text. It has to carry the same information the picture does. */
function sceneDescription({ siteId, shieldCm, stormInfo, dust, hazard, lv, live, outlook }) {
  const place = siteId === 'moon' ? 'the Moon' : 'Mars';
  const cover =
    shieldCm >= 200
      ? 'buried under a thick mound of regolith'
      : shieldCm >= 100
        ? 'under a solid bank of regolith'
        : shieldCm >= 50
          ? 'under a low bank of regolith'
          : 'with only a thin skin of regolith over it';

  const bits = [`A cutaway of your outpost on ${place}, the habitat ${cover}.`];

  if (live) {
    const air = lv.airNeed;
    const food = lv.foodNeed;
    bits.push(
      lv.air >= air
        ? 'The life support fan is spinning.'
        : lv.air === 0
          ? 'The life support fan has stopped.'
          : 'The life support fan is slow and the cabin light is red.'
    );
    bits.push(
      lv.food >= food
        ? 'All the grow lights are on.'
        : lv.food === 0
          ? 'The grow lights are off and the plants are wilting.'
          : `${lv.food} of ${food} grow lights are on.`
    );
    bits.push(
      lv.dig > 0
        ? `The digger is adding ${lv.dig} scoop${lv.dig > 1 ? 's' : ''} of regolith for tomorrow.`
        : 'The digger is parked.'
    );
    bits.push(
      lv.sci > 0 && !lv.sheltered
        ? 'The rover is out drilling and the dish is beaming to Earth.'
        : 'The rover is parked.'
    );
  }

  if (stormInfo) {
    bits.push(
      outlook === 'breaks'
        ? 'The blue shield dome cracks, turns red and shatters.'
        : outlook === 'cracks'
          ? 'The blue shield dome is cracking and turning orange.'
          : 'The blue shield dome is holding.'
    );
    bits.push(
      lv.sheltered
        ? 'Solar particles are streaking in and the crew is shut in the storm room.'
        : 'Solar particles are streaking in at the habitat.'
    );
  }
  if (hazard === 'shadow') bits.push('A ridge is blocking the Sun from the solar panels.');
  if (hazard === 'dust-storm') bits.push('A dust storm has dimmed the sky.');
  if (dust > 0.2) bits.push('The solar panels are coated in dust.');
  return bits.join(' ');
}
