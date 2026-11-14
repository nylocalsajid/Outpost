/**
 * experiments.js
 * -----------------------------------------------------------------------------
 * What "science points" actually ARE.
 *
 * An abstract "+24 science" teaches a child nothing. Every point in this game
 * is now attached to a named piece of research that a real mission has actually
 * done, with the instrument or mission that did it. So a player does not just
 * score -- they find out that drilling a rock on Mars is a thing Curiosity does
 * and why anyone cares.
 *
 * Each entry is real work. The `realBasis` line is what makes it checkable, and
 * it is shown in the game beneath the finding.
 */

/**
 * @typedef {Object} Experiment
 * @property {string} id
 * @property {string} name        what the crew did, in a child's words
 * @property {string} finding     what they learned
 * @property {string} realBasis   the real mission or instrument this mirrors
 * @property {('moon'|'mars'|'both')} site
 * @property {number} minDay      not offered before this day
 */

/** @type {Experiment[]} */
export const EXPERIMENTS = [
  /* ------------------------------------------------------------ both sites */
  {
    id: 'regolith-sample',
    name: 'Scooped a regolith sample',
    finding:
      'The dust is sharp and jagged, nothing like sand on Earth, because there is no wind or water to wear it smooth.',
    realBasis:
      'Apollo crews found lunar dust abrasive enough to damage seals and spacesuits.',
    site: 'both',
    minDay: 1,
  },
  {
    id: 'radiation-log',
    name: 'Logged a full day of radiation readings',
    finding:
      'The dose is not steady. It rises and falls through the day as the ground and the sky shield you by different amounts.',
    realBasis:
      "Curiosity's RAD instrument measures exactly this variation on Mars, between about 180 and 225 microgray per sol.",
    site: 'both',
    minDay: 2,
  },
  {
    id: 'crew-health-panel',
    name: 'Ran the crew health panel',
    finding:
      'Everyone has lost a little bone density in their hips and spine. The treadmill helps, but it does not stop it.',
    realBasis:
      'NASA-funded studies of ISS crews found bone mineral density falling roughly 0.4 to 1.8 percent a month.',
    site: 'both',
    minDay: 4,
  },
  {
    id: 'seed-germination',
    name: 'Started a seed germination trial',
    finding:
      'The roots cannot tell which way is down the way they do on Earth, so they grow towards water instead of gravity.',
    realBasis:
      'Plant growth experiments aboard the ISS, archived in NASA’s Open Science Data Repository.',
    site: 'both',
    minDay: 3,
  },
  {
    id: 'dust-toxicity',
    name: 'Tested the dust for toxicity',
    finding:
      'Fine grains get into everything and are bad to breathe. Airlock design matters more than anyone expected.',
    realBasis:
      'Lunar dust exposure is an active NASA health concern for Artemis surface operations.',
    site: 'both',
    minDay: 6,
  },
  {
    id: 'sleep-study',
    name: 'Recorded the crew’s sleep',
    finding:
      'People sleep badly here. Light, noise and a day that is the wrong length all work against them.',
    realBasis:
      'Sleep and circadian studies are a long-running part of NASA’s human research programme.',
    site: 'both',
    minDay: 7,
  },

  /* ------------------------------------------------------------------ moon */
  {
    id: 'psr-ice',
    name: 'Sent the rover into the dark crater floor',
    finding:
      'There is water ice down there, in a place that has not seen sunlight for billions of years.',
    realBasis:
      'Permanently shadowed regions at the lunar south pole, imaged by ShadowCam aboard Danuri.',
    site: 'moon',
    minDay: 3,
  },
  {
    id: 'seismometer',
    name: 'Set up a seismometer',
    finding:
      'The Moon rings like a bell when something hits it. The shaking goes on far longer than an earthquake would.',
    realBasis:
      'Apollo seismic experiments recorded moonquakes lasting far longer than terrestrial equivalents.',
    site: 'moon',
    minDay: 5,
  },
  {
    id: 'albedo-neutrons',
    name: 'Measured neutrons coming back out of the ground',
    finding:
      'Some radiation bounces up out of the soil after cosmic rays hit it. The ground shields you and shoots at you.',
    realBasis:
      "Chang'E-4's LND instrument measured both charged particles and albedo neutrons on the lunar surface.",
    site: 'moon',
    minDay: 8,
  },
  {
    id: 'rim-survey',
    name: 'Surveyed the crater rim for a landing pad',
    finding:
      'Only a few square metres stay in near-constant sunlight. Everyone who comes here will want the same spot.',
    realBasis:
      'Lunar south pole illumination analysis for Artemis surface power planning.',
    site: 'moon',
    minDay: 9,
  },

  /* ------------------------------------------------------------------ mars */
  {
    id: 'delta-core',
    name: 'Drilled a core from the old river delta',
    finding:
      'The layers are mudstone, laid down in still water. Something wet stood here for a long time.',
    realBasis:
      'Perseverance is sampling the Jezero delta for exactly this reason, and caching the cores for return to Earth.',
    site: 'mars',
    minDay: 2,
  },
  {
    id: 'methane-sniff',
    name: 'Sampled the air for methane',
    finding:
      'There are faint traces that come and go with the seasons, and nobody is sure yet what makes them.',
    realBasis:
      'Curiosity has detected seasonal methane variation in Gale Crater that remains unexplained.',
    site: 'mars',
    minDay: 4,
  },
  {
    id: 'oxygen-from-air',
    name: 'Made oxygen out of the atmosphere',
    finding:
      'The air is almost all carbon dioxide. Split it and you get oxygen — you can breathe Mars if you work at it.',
    realBasis:
      'MOXIE aboard Perseverance produced breathable oxygen from Martian atmosphere.',
    site: 'mars',
    minDay: 5,
  },
  {
    id: 'dust-devil',
    name: 'Filmed a dust devil crossing the crater',
    finding:
      'They scour dust off solar panels sometimes. The thing wrecking your power can also clean it.',
    realBasis:
      'Mars rovers have repeatedly imaged dust devils, and unexpected panel cleaning events extended earlier missions.',
    site: 'mars',
    minDay: 7,
  },
  {
    id: 'subsurface-radar',
    name: 'Ran ground-penetrating radar',
    finding:
      'There are buried layers metres down. Digging in could give you shelter the regolith pile cannot match.',
    realBasis:
      "Perseverance's RIMFAX radar images the subsurface structure beneath the rover.",
    site: 'mars',
    minDay: 9,
  },
];

/**
 * Pick the next experiment to award.
 * Deterministic given the mission state, so a replayed seed produces the same
 * research in the same order.
 */
export function pickExperiment({ siteId, day, completed }) {
  const eligible = EXPERIMENTS.filter(
    (e) =>
      !completed.has(e.id) &&
      (e.site === 'both' || e.site === siteId) &&
      e.minDay <= day
  );
  if (!eligible.length) return null;
  // Site-specific work first: it is the more interesting science, and it is
  // what makes the two sites feel like different places to do research.
  const siteSpecific = eligible.filter((e) => e.site === siteId);
  const pool = siteSpecific.length ? siteSpecific : eligible;
  return pool[0];
}

/** How many science points a finished experiment is worth. */
export const POINTS_PER_EXPERIMENT = 8;
