/**
 * science-notes.js
 * -----------------------------------------------------------------------------
 * One real NASA fact shown after each day, chosen to match what just happened.
 *
 * Every note's `measured` key points at an entry in data/nasa-sources.js, so
 * the text on screen and the citation beneath it can never drift apart.
 */

/**
 * @typedef {Object} ScienceNote
 * @property {string}  id
 * @property {string}  title
 * @property {string}  measured  key into MEASURED
 * @property {(ctx: Object) => boolean} when  does this note fit today?
 * @property {number}  priority  higher wins when several fit
 */

/** @type {ScienceNote[]} */
export const SCIENCE_NOTES = [
  {
    id: 'storm-dose',
    title: 'Why a flare is worse than a normal day',
    measured: 'REFERENCE_MISSION_DOSE_SV',
    priority: 10,
    when: (ctx) => Boolean(ctx.outcome.storm) && !ctx.outcome.sheltered,
  },
  {
    id: 'shelter-worked',
    title: 'Three metres of dirt',
    measured: 'REGOLITH_FULL_SHIELD_M',
    priority: 10,
    when: (ctx) => Boolean(ctx.outcome.storm) && ctx.outcome.sheltered,
  },
  {
    id: 'moon-dose',
    title: 'How much radiation the Moon really gives you',
    measured: 'MOON_DOSE_EQ_USV_PER_HOUR',
    priority: 6,
    when: (ctx) => ctx.state.siteId === 'moon' && ctx.outcome.day <= 3,
  },
  {
    id: 'mars-dose',
    title: 'Why Mars is gentler than the Moon',
    measured: 'MARS_DOSE_EQ_MSV_PER_SOL',
    priority: 6,
    when: (ctx) => ctx.state.siteId === 'mars' && ctx.outcome.day <= 3,
  },
  {
    id: 'sol-length',
    title: 'A day that is not 24 hours',
    measured: 'SOL_LENGTH',
    priority: 5,
    when: (ctx) => ctx.state.siteId === 'mars' && ctx.outcome.day === 2,
  },
  {
    id: 'shadow',
    title: 'Sunlight at the lunar south pole',
    measured: 'SHACKLETON_ILLUMINATION_FRACTION',
    priority: 8,
    when: (ctx) => ctx.outcome.hazard && ctx.outcome.hazard.id === 'shadow',
  },
  {
    id: 'tilt',
    title: 'Why the Moon has places the Sun never reaches',
    measured: 'MOON_AXIAL_TILT_DEG',
    priority: 4,
    when: (ctx) => ctx.state.siteId === 'moon',
  },
  {
    id: 'bone',
    title: 'What space does to bones',
    measured: 'BONE_BMD_LOSS_PCT_PER_MONTH',
    priority: 7,
    when: (ctx) => ctx.outcome.healthDelta < 0,
  },
  {
    id: 'bone-strength',
    title: 'Fourteen percent',
    measured: 'BONE_HIP_STRENGTH_LOSS_PCT',
    priority: 6,
    when: (ctx) => ctx.state.health < 70,
  },
  {
    id: 'comms',
    title: 'Why nobody on Earth can help you in time',
    measured: 'MARS_OWLT_MINUTES',
    priority: 7,
    when: (ctx) => ctx.state.siteId === 'mars' && Boolean(ctx.outcome.storm),
  },
  {
    id: 'cruise',
    title: 'The journey is worse than the destination',
    measured: 'CRUISE_ABSORBED_MGY_PER_DAY',
    priority: 3,
    when: (ctx) => ctx.outcome.day >= 5,
  },
  {
    id: 'gcr-band',
    title: 'Radiation that wobbles through the day',
    measured: 'MARS_GCR_BAND_UGY_PER_SOL',
    priority: 3,
    when: (ctx) => ctx.state.siteId === 'mars' && ctx.outcome.day >= 4,
  },
  {
    id: 'shackleton-size',
    title: 'The hole you are standing on the edge of',
    measured: 'SHACKLETON_DIAMETER_KM',
    priority: 2,
    when: (ctx) => ctx.state.siteId === 'moon',
  },
  {
    id: 'mission-total',
    title: 'A whole career in one trip',
    measured: 'REFERENCE_MISSION_DOSE_SV',
    priority: 2,
    when: () => true,
  },
];

/**
 * Pick the best-fitting note that has not been shown yet.
 * @param {{state: Object, outcome: Object, shown: Set<string>}} ctx
 */
export function pickNote(ctx) {
  const candidates = SCIENCE_NOTES.filter(
    (n) => !ctx.shown.has(n.id) && safeWhen(n, ctx)
  ).sort((a, b) => b.priority - a.priority);

  if (candidates.length) return candidates[0];

  // Everything has been shown: fall back to the most relevant repeat.
  const repeats = SCIENCE_NOTES.filter((n) => safeWhen(n, ctx)).sort(
    (a, b) => b.priority - a.priority
  );
  return repeats[0] || null;
}

function safeWhen(note, ctx) {
  try {
    return Boolean(note.when(ctx));
  } catch {
    return false;
  }
}
