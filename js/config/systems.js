/**
 * systems.js
 * -----------------------------------------------------------------------------
 * The four systems a player can spend power on, plus every GAMEPLAY constant.
 *
 * IMPORTANT DISTINCTION, kept deliberately explicit:
 *   data/nasa-sources.js holds numbers that are REAL MEASUREMENTS.
 *   this file holds numbers that are GAME BALANCE. They are tuned so the
 *   mission is winnable but never comfortable. They are not NASA figures and
 *   the game never claims they are.
 *
 * The one place the two meet is radiation: the dose a player accumulates is
 * computed from real measured dose rates (sites.js) through a shielding model
 * declared here and labelled as a model, not a measurement.
 */

/* ------------------------------------------------------------ the four systems */

export const SYSTEMS = [
  {
    id: 'lifeSupport',
    name: 'Life Support',
    /** What it is for, in words a seven-year-old can read. */
    plain: 'Makes the air your crew breathes.',
    short: 'Air',
    icon: 'lungs',
    /** Blocks needed to simply break even. */
    demand: 4,
    colorVar: '--sys-air',
    /** Underfunding this is dangerous today, so the UI flags it in red. */
    criticalShort: true,
    shortWarning: 'oxygen will drop',
    idleNote: null,
    whatItDoes:
      'Scrubs the carbon dioxide your crew breathes out and splits water to make fresh oxygen.',
    ifYouStarveIt:
      'Oxygen starts dropping. Your crew gets headaches first, then it gets dangerous.',
  },
  {
    id: 'greenhouse',
    name: 'Greenhouse',
    plain: 'Grows the food your crew eats.',
    short: 'Food',
    icon: 'sprout',
    demand: 3,
    colorVar: '--sys-food',
    criticalShort: true,
    shortWarning: 'you will eat into stores',
    idleNote: null,
    whatItDoes:
      'Grow lights, heaters and water pumps for the plants that top up your food supply.',
    ifYouStarveIt:
      'The plants stop growing and you eat into your stored rations. A hungry crew works badly.',
  },
  {
    id: 'shielding',
    name: 'Shielding',
    plain: 'Piles soil on the pod to block radiation.',
    short: 'Shield',
    icon: 'shield',
    demand: 2,
    colorVar: '--sys-shield',
    /** Skipping this is a gamble, not an emergency, so it is not flagged red.
     *  The bill arrives later, during a storm. */
    criticalShort: false,
    shortWarning: null,
    idleNote: 'No regolith piled today. Fine on a quiet day — expensive later.',
    whatItDoes:
      'Runs the robot that piles regolith — Moon or Mars soil — on top of your habitat.',
    ifYouStarveIt:
      'Your shield stays thin. On a quiet day that costs nothing at all. During a solar storm it is the difference between safe and sick.',
  },
  {
    id: 'science',
    name: 'Science Research',
    plain: 'Runs the rover and the lab. This is why you came.',
    short: 'Science',
    icon: 'flask',
    demand: 3,
    colorVar: '--sys-science',
    criticalShort: false,
    shortWarning: null,
    idleNote: 'No research today. Nobody dies of it — but it is why you came.',
    whatItDoes:
      'Powers the rover, the drill and the instruments, and sends your results back to Earth.',
    ifYouStarveIt:
      'You learn nothing. Staying alive is not the mission — it is what lets you do the mission.',
  },
];

export const SYSTEM_IDS = SYSTEMS.map((s) => s.id);

export function getSystem(id) {
  const s = SYSTEMS.find((x) => x.id === id);
  if (!s) throw new Error(`Unknown system: ${id}`);
  return s;
}

/** Total blocks needed to fully fund everything: 12, against a supply of 9. */
export const TOTAL_DEMAND = SYSTEMS.reduce((sum, s) => sum + s.demand, 0);

/* ------------------------------------------------------------- game balance */

export const BALANCE = {
  modelled: true,

  /** Mission length. Short enough to finish in one sitting: four levels,
   *  see config/levels.js. */
  missionDays: 14,

  /** Power blocks generated on a typical day. Deliberately below TOTAL_DEMAND.
   *  10 against a demand of 12 leaves three discretionary blocks once air and
   *  food are funded: enough for a real choice every day, never enough to do
   *  everything. The actual figure steps down level by level, from 11 to 8;
   *  config/levels.js holds the schedule. This is the middle of it. */
  baseBlocksPerDay: 10,

  /** Battery carries spare blocks between days. It lands empty, so that the
   *  first day's power is exactly what the two systems on line need. */
  batteryStart: 0,
  batteryCap: 5,
  /** Most blocks that can be banked in a single day. */
  batteryChargeMax: 3,

  /* --- starting resources --------------------------------------------- */
  startOxygen: 85,
  startFood: 80,
  startShieldCm: 20,
  startHealth: 100,

  /* --- how systems convert blocks into outcomes ----------------------- */
  /** Oxygen change if life support is fully funded. */
  oxygenSurplusPerDay: 2,
  /** Oxygen lost per block short of demand. */
  oxygenLossPerShortBlock: 6,

  foodSurplusPerDay: 2,
  foodLossPerShortBlock: 7,

  /** Centimetres of regolith piled per block spent on shielding. */
  shieldCmPerBlock: 8,
  shieldCapCm: 320,

  /** Science points per block. */
  sciencePerBlock: 8,
  /**
   * Blocks of research that finish one named study. Progress carries across
   * days, so an outpost that can only spare one block a day still completes
   * real work -- it just takes longer. Without this, power-poor Mars missions
   * finished almost no studies and the science felt unreachable there.
   */
  blocksPerExperiment: 2,
  /** Science is less productive with an unwell crew. */
  scienceHealthFloor: 0.4,

  /* --- shelter decision ------------------------------------------------- */
  /** Blocks to seal the crew into the regolith-covered storm room. */
  shelterCost: 2,
  /** Dose multiplier while sheltered. Modelled, not measured. */
  shelterDoseFactor: 0.25,
  /** Sheltering stops rover work, so science is lost that day. */
  shelterScienceFactor: 0.25,

  /* --- radiation model -------------------------------------------------- */
  /**
   * Shielding attenuation: factor = exp(-cm / SHIELD_SCALE_CM).
   * SHIELD_SCALE_CM is chosen so that ~300 cm of regolith cuts the dose to
   * about 13%, consistent with NASA JPL's assessment that roughly 3 m of
   * regolith is sufficient shielding (see REGOLITH_FULL_SHIELD_M).
   * The exponential SHAPE is a simplification for gameplay.
   */
  shieldScaleCm: 150,

  /** Daily dose above this starts costing crew health. */
  safeDoseMsvPerDay: 1.5,
  healthLossPerExcessMsv: 1.2,

  /** Health loss when oxygen or food run low. */
  oxygenCriticalBelow: 30,
  healthLossPerOxygenPoint: 0.5,
  foodCriticalBelow: 30,
  healthLossPerFoodPoint: 0.4,

  /**
   * Solar energetic particle dose added by a flare, by GOES class, in mSv at
   * the surface with no shielding.
   *
   * MODELLED, NOT MEASURED. Real surface SEP doses depend on the particle
   * energy spectrum, the event's direction and the local atmosphere, and vary
   * hugely between events. These values are a deliberately simple ladder that
   * preserves the real ordering (X-class >> M-class) so the gameplay lesson is
   * honest even though the figures are not a NASA product. The flare records
   * themselves -- date, time, class, active region -- ARE real DONKI data.
   */
  sepDoseByClass: {
    M: 3,
    X_small: 10, // X1 to X4.9
    X_large: 18, // X5 and above
  },

  /* --- dust (Mars) ------------------------------------------------------ */
  /** Power lost at full dust coverage. */
  dustPowerPenalty: 0.4,
  /** Dust storm cuts generation to this fraction. Gentler than it once was:
   *  the levels already take a block away every few days, and a bad-weather
   *  day on top of that has to stay survivable. */
  dustStormPowerFactor: 0.7,
  /** Horizon shadow (Moon) cuts generation to this fraction. */
  shadowPowerFactor: 0.6,
  /** Cleaning panels is free but costs a block of science time. */

  /* --- scoring thresholds ----------------------------------------------- */
  /** Fallbacks. Each site overrides these; see config/sites.js. */
  scienceSuccess: 110,
  scienceFlagship: 180,
  /** A flagship mission needs a healthy crew as well as a full notebook. */
  healthFlagship: 70,
};

/** Science targets for a site, falling back to the global defaults. */
export function scienceTargets(site) {
  return {
    success: site.scienceSuccess ?? BALANCE.scienceSuccess,
    flagship: site.scienceFlagship ?? BALANCE.scienceFlagship,
  };
}

/** Map a GOES flare class string ("X8.7", "M7.0") onto a modelled SEP dose. */
export function sepDoseForClass(classType) {
  if (!classType) return 0;
  const letter = String(classType).trim().charAt(0).toUpperCase();
  const scale = parseFloat(String(classType).slice(1)) || 1;
  if (letter === 'X') {
    return scale >= 5
      ? BALANCE.sepDoseByClass.X_large
      : BALANCE.sepDoseByClass.X_small;
  }
  if (letter === 'M') return BALANCE.sepDoseByClass.M;
  return 0; // C and B class flares do not meaningfully dose a surface crew
}

/** Human-readable severity used for warning copy and styling. */
export function flareSeverity(classType) {
  if (!classType) return 'none';
  const letter = String(classType).trim().charAt(0).toUpperCase();
  const scale = parseFloat(String(classType).slice(1)) || 1;
  if (letter === 'X' && scale >= 5) return 'extreme';
  if (letter === 'X') return 'severe';
  if (letter === 'M') return 'moderate';
  return 'minor';
}
