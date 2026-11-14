/**
 * engine.js
 * -----------------------------------------------------------------------------
 * The simulation. Pure functions only: no DOM, no fetch, no globals.
 *
 * Two entry points:
 *   planDay(state, weather)                 -> what today looks like
 *   resolveDay(state, plan, allocation)     -> {state, outcome}
 *
 * THE CENTRAL DESIGN RULE, which the whole project exists to teach:
 *   no allocation is free. Once the base is set up, supply (10 blocks, then
 *   9, then 8) is below demand (12 blocks), so every day takes something away
 *   from something else, and the cost of today's choice usually lands on a
 *   later day. The first three days build up to that one system at a time;
 *   see config/levels.js.
 *
 * Storms are not the only trouble. On a clear day something else may happen
 * that leans on a different system: an air leak, mould in the greenhouse, a
 * quake, a lucky find. See config/events.js.
 *
 * THE SECOND DESIGN RULE, which is the real engineering lesson:
 *   regolith piled today protects you from TOMORROW onwards, never from today.
 *   Solar particles arrive within hours of a flare, so a crew cannot build a
 *   shield in response to a warning -- they either prepared in advance or they
 *   hide in the storm room and lose a day of science. This is why the dose
 *   calculation below uses the shield thickness at the START of the day.
 */

import { BALANCE, SYSTEM_IDS, getSystem } from '../config/systems.js';
import { getSite } from '../config/sites.js';
import { dayRules } from '../config/levels.js';
import { pickEvent } from '../config/events.js';
import { upgradeMods } from '../config/upgrades.js';
import { createRng } from './rng.js';
import { isStormDay, describeFlare } from '../data/space-weather.js';
import { pickExperiment } from '../config/experiments.js';
import { allocationTotal, suggestedAllocation, isAlive } from './state.js';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const round1 = (v) => Math.round(v * 10) / 10;

/* ------------------------------------------------------------------ planning */

/**
 * Work out the conditions for the day the player is about to play.
 * Deterministic: same state + same weather always gives the same plan.
 *
 * @param {import('./state.js').MissionState} state
 * @param {import('../data/space-weather.js').SpaceWeather} weather
 */
export function planDay(state, weather) {
  const site = getSite(state.siteId);
  const timelineDay = weather.timeline[state.day - 1] || {
    day: state.day,
    flare: null,
    sepDose: 0,
    severity: 'none',
  };

  // What the level system says about today: how much the panels make, which
  // systems are on line yet, and whether this is still a calm set-up day.
  const rules = dayRules(state.day, state.training);
  // What the supply rockets have added to the base so far.
  const mods = upgradeMods(state);

  // Seeded per day so the same mission always rolls the same hazards.
  const rng = createRng(state.seed + state.day * 7919);
  const roll = rng();

  let hazard = null;
  let powerFactor = 1;

  if (!rules.hazards) {
    // Set-up days and level 2: no bad-weather days yet. A player meets being
    // short of power, and then flares, before the two can land together.
  } else if (site.hazard.shadowChance && roll < site.hazard.shadowChance) {
    hazard = {
      id: 'shadow',
      label: site.hazard.shadowLabel,
      detail: site.hazard.shadowDetail,
    };
    powerFactor *= BALANCE.shadowPowerFactor;
  } else if (site.hazard.dustStormChance && roll < site.hazard.dustStormChance) {
    hazard = {
      id: 'dust-storm',
      label: site.hazard.dustStormLabel,
      detail: site.hazard.dustStormDetail,
    };
    powerFactor *= BALANCE.dustStormPowerFactor;
  }

  const storm =
    !rules.calm && isStormDay(timelineDay) ? describeFlare(timelineDay) : null;

  // Something other than the Sun: one event at most, and only on a day that
  // has no storm and no bad weather already.
  const event = pickEvent({
    state,
    site,
    rules,
    busy: Boolean(storm || hazard),
  });

  // Accumulated dust on the panels (Mars). A slow squeeze, not an event,
  // unless a dust devil has just swept them clean.
  const dustFactor =
    event && event.cleansPanels ? 1 : 1 - state.dust * BALANCE.dustPowerPenalty;
  powerFactor *= dustFactor;

  const generated = Math.max(
    2,
    Math.round((rules.blocks + mods.blocks) * powerFactor)
  );
  const blocksAvailable = generated + state.battery;

  // What each system needs today: its normal demand, less anything an
  // upgrade saves, plus anything today's event adds.
  const demands = {};
  const usual = {};
  for (const id of SYSTEM_IDS) {
    const extra = event && event.demandExtra ? event.demandExtra[id] || 0 : 0;
    usual[id] = Math.max(1, getSystem(id).demand + (mods.demand[id] || 0));
    demands[id] = usual[id] + extra;
  }

  return {
    day: state.day,
    site,
    generated,
    battery: state.battery,
    blocksAvailable,
    /** Which of the four levels this day belongs to. */
    level: rules.level,
    /** Systems that can be given power today. */
    unlocked: rules.unlocked,
    /** What is new today, for mission control to announce. */
    news: rules.news,
    hazard,
    /** Today's event, if any (see config/events.js). */
    event,
    /** Blocks each system needs today, after upgrades and any event. */
    demands,
    /** The same on an ordinary day: what the board starts from. */
    usual,
    /** What the base's upgrades change (see config/upgrades.js). */
    mods,
    dustFactor,
    storm,
    sepDose: storm ? timelineDay.sepDose : 0,
    /** Dose the crew would take today with their CURRENT shield, no shelter. */
    projectedDose: projectDose(state, storm ? timelineDay : QUIET_DAY, false),
    /** Dose if they shelter instead. */
    shelteredDose: projectDose(state, storm ? timelineDay : QUIET_DAY, true),
    suggested: suggestedAllocation(blocksAvailable, rules.unlocked, usual),
    totalDemand: SYSTEM_IDS.reduce((sum, id) => sum + demands[id], 0),
  };
}

/** A day with no flare, for working out the background dose. */
const QUIET_DAY = { sepDose: 0 };

/** Shield attenuation factor from regolith thickness. */
export function shieldFactor(shieldCm) {
  return Math.exp(-shieldCm / BALANCE.shieldScaleCm);
}

/** Dose in mSv for one day, given shield at the start of the day. */
function projectDose(state, timelineDay, sheltered) {
  const site = getSite(state.siteId);
  const factor = shieldFactor(state.shieldCm);
  const base = site.baseDoseMsvPerDay * factor;
  const sep =
    (timelineDay.sepDose || 0) *
    factor *
    (sheltered ? BALANCE.shelterDoseFactor : 1);
  const shelterBase = sheltered ? base * BALANCE.shelterDoseFactor : base;
  return round1(shelterBase + sep);
}

/* ------------------------------------------------------------------ validation */

/**
 * Is this allocation legal?
 * @returns {{valid: boolean, reason: ?string, spent: number, remaining: number}}
 */
export function validateAllocation(plan, allocation) {
  const spent = allocationTotal(allocation);
  const remaining = plan.blocksAvailable - spent;

  // A system that is not on line yet cannot take power.
  const unlocked = plan.unlocked || SYSTEM_IDS;
  const locked = SYSTEM_IDS.find(
    (id) => !unlocked.includes(id) && allocation[id] > 0
  );
  if (locked) {
    return {
      valid: false,
      reason: `${getSystem(locked).name} is not set up yet.`,
      spent,
      remaining,
    };
  }

  if (spent > plan.blocksAvailable) {
    return {
      valid: false,
      reason: `You have only ${plan.blocksAvailable} blocks of power today.`,
      spent,
      remaining,
    };
  }
  return { valid: true, reason: null, spent, remaining };
}

/* ------------------------------------------------------------------ resolution */

/**
 * Play one day.
 *
 * @param {import('./state.js').MissionState} state
 * @param {ReturnType<typeof planDay>} plan
 * @param {Object} allocation
 * @returns {{state: import('./state.js').MissionState, outcome: Object}}
 */
export function resolveDay(state, plan, allocation) {
  const site = plan.site;
  const next = { ...state, log: [...state.log] };
  const effects = [];

  /* ---- 1. power bookkeeping ------------------------------------------- */
  const mods = plan.mods || upgradeMods(state);
  const spent = allocationTotal(allocation);
  const unspent = Math.max(0, plan.blocksAvailable - spent);
  const banked = Math.min(unspent, mods.batteryChargeMax);
  next.battery = clamp(banked, 0, BALANCE.batteryCap);

  /* ---- 2. radiation, using the shield as it stood this morning -------- */
  const factor = shieldFactor(state.shieldCm);
  const baseDose =
    site.baseDoseMsvPerDay *
    factor *
    (allocation.shelter ? BALANCE.shelterDoseFactor : 1);
  const sepDose =
    plan.sepDose *
    factor *
    (allocation.shelter ? BALANCE.shelterDoseFactor : 1);
  const doseToday = round1(baseDose + sepDose);

  next.doseTotalMsv = round1(state.doseTotalMsv + doseToday);

  /* ---- 3. life support ------------------------------------------------- */
  const event = plan.event || null;
  const demands = plan.demands || {};
  const lsNeed = demands.lifeSupport ?? getSystem('lifeSupport').demand;
  const lsShort = Math.max(0, lsNeed - allocation.lifeSupport);
  let oxygenDelta =
    lsShort > 0
      ? -lsShort * BALANCE.oxygenLossPerShortBlock
      : BALANCE.oxygenSurplusPerDay;
  if (site.waterBonus && lsShort === 0) oxygenDelta += 1;
  next.oxygen = clamp(state.oxygen + oxygenDelta, 0, 100);

  if (lsShort > 0) {
    effects.push({
      tone: 'bad',
      system: 'lifeSupport',
      text: `Life support ran ${lsShort} block${lsShort > 1 ? 's' : ''} short. Oxygen fell ${Math.abs(oxygenDelta)} points.`,
    });
  } else if (event && event.id === 'leak') {
    effects.push({
      tone: 'good',
      system: 'lifeSupport',
      text: `The crew found the leak and patched it, and life support kept up. Oxygen up ${oxygenDelta}.`,
    });
  } else {
    effects.push({
      tone: 'good',
      system: 'lifeSupport',
      text: site.waterBonus
        ? `Life support held steady, and the ice down in the crater topped up your tanks. Oxygen up ${oxygenDelta}.`
        : `Life support held steady. Oxygen up ${oxygenDelta}.`,
    });
  }

  /* ---- 4. greenhouse --------------------------------------------------- */
  const ghNeed = demands.greenhouse ?? getSystem('greenhouse').demand;
  const ghShort = Math.max(0, ghNeed - allocation.greenhouse);
  const foodDelta =
    ghShort > 0
      ? -ghShort * BALANCE.foodLossPerShortBlock
      : BALANCE.foodSurplusPerDay;
  next.food = clamp(state.food + foodDelta, 0, 100);

  effects.push(
    ghShort > 0
      ? {
          tone: 'bad',
          system: 'greenhouse',
          text: `The greenhouse was ${ghShort} block${ghShort > 1 ? 's' : ''} short. The plants stalled and you ate ${Math.abs(foodDelta)} points of stores.`,
        }
      : {
          tone: 'good',
          system: 'greenhouse',
          text:
            event && event.id === 'blight'
              ? `The extra light and warm air beat the mould. Food up ${foodDelta}.`
              : `The greenhouse produced a small surplus. Food up ${foodDelta}.`,
        }
  );

  /* ---- 5. shielding (applies from tomorrow) ---------------------------- */
  const shieldAdded = Math.min(
    allocation.shielding * mods.shieldCmPerBlock,
    BALANCE.shieldCapCm - state.shieldCm
  );
  // A quake slides soil off the pod during the day. Like everything else to
  // do with the shield, it is tomorrow's shield that changes, not today's.
  const shieldLost = Math.min(
    event ? event.shieldLossCm : 0,
    state.shieldCm + shieldAdded
  );
  next.shieldCm = clamp(
    state.shieldCm + shieldAdded - shieldLost,
    0,
    BALANCE.shieldCapCm
  );

  if (shieldLost > 0) {
    effects.push({
      tone: shieldAdded >= shieldLost ? 'mixed' : 'bad',
      system: 'shielding',
      text:
        shieldAdded >= shieldLost
          ? `The quake shook ${shieldLost} cm of soil off the pod, and the digger put ${shieldAdded} cm back.`
          : `The quake shook ${shieldLost} cm of soil off the pod. Your shield is down to ${next.shieldCm} cm.`,
    });
  }

  if (shieldAdded > 0 && shieldLost === 0) {
    effects.push({
      tone: 'good',
      system: 'shielding',
      text: `The robot piled ${shieldAdded} cm more regolith on the habitat. Your shield is now ${next.shieldCm} cm, and it protects you from tomorrow on.`,
    });
  }

  /* ---- 6. science ------------------------------------------------------ */
  const healthFactor = Math.max(BALANCE.scienceHealthFloor, state.health / 100);
  const shelterFactor = allocation.shelter ? BALANCE.shelterScienceFactor : 1;
  const findFactor = event ? event.scienceFactor : 1;
  const scienceGained = Math.round(
    allocation.science *
      mods.sciencePerBlock *
      healthFactor *
      shelterFactor *
      findFactor
  );
  next.science = state.science + scienceGained;

  /**
   * Science points are the score, but an experiment is the STORY. Two or more
   * blocks of research in a day finishes a named piece of work -- a real thing
   * a real mission has done -- so the player learns what their points bought.
   */
  next.experiments = [...(state.experiments || [])];
  next.researchProgress = (state.researchProgress || 0) + allocation.science;

  let experiment = null;
  if (next.researchProgress >= BALANCE.blocksPerExperiment) {
    experiment = pickExperiment({
      siteId: state.siteId,
      day: state.day,
      completed: new Set(next.experiments),
    });
    if (experiment) {
      next.experiments.push(experiment.id);
      next.researchProgress -= BALANCE.blocksPerExperiment;
      // Deliberately NOT added to `effects`: the resolve screen gives a
      // completed study its own card, and listing it twice buries the
      // consequences of the other four systems.
    } else {
      // Every study already done: stop banking progress towards nothing.
      next.researchProgress = BALANCE.blocksPerExperiment;
    }
  }

  const scienceOnLine = (plan.unlocked || SYSTEM_IDS).includes('science');

  if (!scienceOnLine) {
    // The lab is still in its crates: nothing to praise or scold yet.
  } else if (allocation.science > 0) {
    if (allocation.shelter) {
      effects.push({
        tone: 'mixed',
        system: 'science',
        text: `Sheltering kept the crew inside, so the rover sat still. Only ${scienceGained} science points instead of ${allocation.science * mods.sciencePerBlock * findFactor}.`,
      });
    } else {
      effects.push({
        tone: 'good',
        system: 'science',
        text:
          findFactor > 1
            ? `The lucky find doubled the day's work: ${scienceGained} science points.`
            : `The crew got ${scienceGained} science points of work done.`,
      });
    }
  } else {
    effects.push({
      tone: 'bad',
      system: 'science',
      text:
        findFactor > 1
          ? 'The rover made a lucky find, but there was no power to study it.'
          : 'No power for science today. You stayed alive, but you did not learn anything.',
    });
  }

  /* ---- 7. radiation narration ------------------------------------------ */
  if (plan.storm) {
    effects.push({
      tone: allocation.shelter ? 'good' : 'bad',
      system: 'radiation',
      text: allocation.shelter
        ? `The crew sealed themselves in the storm room. The ${plan.storm.headline} gave them ${doseToday} mSv instead of the ${plan.projectedDose} mSv they would have taken outside.`
        : `The crew worked through the ${plan.storm.headline} with a ${state.shieldCm} cm shield. They took ${doseToday} mSv in one day.`,
    });
  }

  /* ---- 8. crew health -------------------------------------------------- */
  let healthDelta = 0;
  const healthReasons = [];

  if (doseToday > BALANCE.safeDoseMsvPerDay) {
    const excess = doseToday - BALANCE.safeDoseMsvPerDay;
    const loss = excess * BALANCE.healthLossPerExcessMsv;
    healthDelta -= loss;
    healthReasons.push(
      `radiation above the safe daily limit cost ${Math.round(loss)} health`
    );
  }
  if (next.oxygen < BALANCE.oxygenCriticalBelow) {
    const loss =
      (BALANCE.oxygenCriticalBelow - next.oxygen) * BALANCE.healthLossPerOxygenPoint;
    healthDelta -= loss;
    healthReasons.push(`thin air cost ${Math.round(loss)} health`);
  }
  if (next.food < BALANCE.foodCriticalBelow) {
    const loss =
      (BALANCE.foodCriticalBelow - next.food) * BALANCE.healthLossPerFoodPoint;
    healthDelta -= loss;
    healthReasons.push(`short rations cost ${Math.round(loss)} health`);
  }

  next.health = clamp(state.health + healthDelta, 0, 100);

  if (healthReasons.length) {
    effects.push({
      tone: 'bad',
      system: 'health',
      text: `Crew health dropped: ${healthReasons.join(', ')}.`,
    });
  } else {
    effects.push({
      tone: 'good',
      system: 'health',
      text: 'The crew finished the day in good shape.',
    });
  }

  /* ---- 9. dust accumulation (Mars) ------------------------------------- */
  if (site.hazard.dustGrowthPerDay) {
    let dust = state.dust + site.hazard.dustGrowthPerDay;
    if (plan.hazard && plan.hazard.id === 'dust-storm') dust += 0.08;
    // A dust devil leaves the panels clean for tomorrow.
    if (event && event.cleansPanels) {
      dust = 0;
      effects.push({
        tone: 'good',
        system: 'power',
        text: 'The dust devil swept your solar panels clean. They start tomorrow with no dust on them.',
      });
    }
    next.dust = clamp(dust, 0, 0.45);
  }

  /* ---- 10. mission-control advice in transit --------------------------- */
  if (state.pendingAdvice && state.pendingAdvice.arrivesOnDay <= state.day) {
    next.pendingAdvice = null;
  }

  /* ---- 11. log and advance -------------------------------------------- */
  next.log.push({
    day: state.day,
    allocation: { ...allocation },
    generated: plan.generated,
    blocksAvailable: plan.blocksAvailable,
    spent,
    banked,
    doseToday,
    stormClass: plan.storm ? plan.storm.record.classType : null,
    sheltered: Boolean(allocation.shelter),
    oxygen: next.oxygen,
    food: next.food,
    shieldCm: next.shieldCm,
    health: next.health,
    science: next.science,
    hazard: plan.hazard ? plan.hazard.id : null,
    event: event ? event.id : null,
  });

  next.day = state.day + 1;

  /* ---- 12. end conditions --------------------------------------------- */
  if (!isAlive(next)) {
    next.over = true;
    next.endReason = endReasonFor(next);
  } else if (next.day > next.missionDays) {
    next.over = true;
    next.endReason = 'completed';
  }

  return {
    state: next,
    outcome: {
      day: state.day,
      effects,
      doseToday,
      scienceGained,
      shieldAdded,
      banked,
      oxygenDelta,
      foodDelta,
      healthDelta: Math.round(healthDelta),
      storm: plan.storm,
      hazard: plan.hazard,
      event,
      shieldLost,
      sheltered: Boolean(allocation.shelter),
      experiment,
    },
  };
}

function endReasonFor(state) {
  if (state.health <= 0) return 'crew-health';
  if (state.oxygen <= 0) return 'oxygen';
  if (state.food <= 0) return 'food';
  return 'completed';
}

/* ------------------------------------------------------------- mission control */

/**
 * Ask Earth for advice. The whole point of this feature is the delay: on the
 * Moon the reply is instant, and on Mars it cannot possibly arrive before the
 * player has already had to decide.
 */
export function requestAdvice(state, plan) {
  const site = plan.site;
  const text = adviceText(state, plan);

  if (site.adviceDelayDays === 0) {
    return {
      state,
      advice: {
        text,
        immediate: true,
        latency: site.commsOneWay,
        explain: `Your radio call reached Earth in ${site.commsOneWay} and the answer came straight back. On the Moon you can actually have a conversation.`,
      },
    };
  }

  const arrivesOnDay = state.day + site.adviceDelayDays;
  return {
    state: {
      ...state,
      pendingAdvice: { text, arrivesOnDay, askedOnDay: state.day },
    },
    advice: {
      text: null,
      immediate: false,
      latency: site.commsOneWay,
      explain: `Your question takes ${site.commsOneWay} to reach Earth, and the answer just as long to come back. By then today is over. Mission control's reply will arrive on ${site.dayWord} ${arrivesOnDay} — you have to decide this one yourself.`,
    },
  };
}

/** What mission control would say, based on the actual state of the outpost. */
function adviceText(state, plan) {
  const lines = [];

  if (plan.storm && state.shieldCm < 80) {
    lines.push(
      `Your shield is only ${state.shieldCm} cm and there is a ${plan.storm.record.classType} flare today. Get into the storm room.`
    );
  } else if (plan.storm) {
    lines.push(
      `${state.shieldCm} cm of regolith is decent cover for a ${plan.storm.record.classType}. You can probably keep working, but watch the dose.`
    );
  }

  // Today's event, if there is one: say which system it leans on.
  const event = plan.event;
  if (event && event.id === 'leak') {
    lines.push(`You have an air leak. Give life support ${plan.demands.lifeSupport} blocks today, even if science has to wait.`);
  } else if (event && event.id === 'blight') {
    lines.push(`Mould in the greenhouse. Give it ${plan.demands.greenhouse} blocks today or you will be eating your stores.`);
  } else if (event && event.id === 'quake') {
    lines.push('The quake is shaking soil off the pod. Two blocks on shielding will put it back.');
  } else if (event && event.id === 'find') {
    lines.push('That find is worth double. Put every block you can spare into science research today.');
  } else if (event && event.id === 'devil') {
    lines.push('Clean panels: you have extra power today. Spend it on whatever you have been neglecting.');
  }

  if (state.oxygen < 50) {
    lines.push(`Oxygen is down to ${Math.round(state.oxygen)}. Fund life support fully before anything else.`);
  }
  if (state.food < 50) {
    lines.push(`Food is at ${Math.round(state.food)}. The greenhouse needs its full three blocks.`);
  }
  if (state.shieldCm < 60 && !plan.storm) {
    lines.push('Quiet day. This is exactly when you should be piling regolith — you cannot build a shield once a flare has already gone off.');
  }
  if (state.science === 0 && state.day > 3) {
    lines.push('You have no science on the board. Surviving is not the mission.');
  }

  if (!lines.length) {
    lines.push('Outpost looks healthy from here. Keep the balance you have and bank a little power.');
  }

  return lines.join(' ');
}
