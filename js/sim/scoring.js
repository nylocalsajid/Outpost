/**
 * scoring.js
 * -----------------------------------------------------------------------------
 * End-of-mission evaluation and, more importantly, the DEBRIEF: turning the
 * player's own log into the lesson.
 *
 * The debrief is the educational payload of the whole project. A player who
 * loses should be told exactly which trade-off beat them, in plain language,
 * with the real number attached -- never just "you lost".
 */

import { BALANCE, TOTAL_DEMAND, scienceTargets } from '../config/systems.js';
import { getSite } from '../config/sites.js';
import { MEASURED } from '../data/nasa-sources.js';
import { RADLAB_CONTEXT } from '../data/archive.js';

/** @returns {{tier:string, title:string, summary:string}} */
export function gradeMission(state) {
  const site = getSite(state.siteId);

  if (state.endReason === 'crew-health') {
    return {
      tier: 'lost',
      title: 'Mission aborted',
      summary:
        'Your crew got too sick to keep working and had to be brought home early. Everything you were trying to learn stopped the moment they left.',
    };
  }
  if (state.endReason === 'oxygen') {
    return {
      tier: 'lost',
      title: 'Out of air',
      summary:
        'The oxygen ran out. Life support is the one system that cannot wait until tomorrow.',
    };
  }
  if (state.endReason === 'food') {
    return {
      tier: 'lost',
      title: 'Out of food',
      summary:
        'The stores emptied and the greenhouse could not catch up. Food takes weeks to grow, so a shortfall today is still a shortfall next month.',
    };
  }

  const survived = `Your crew lasted all ${state.missionDays} ${site.dayWordPlural} at ${site.name}.`;
  const target = scienceTargets(site);

  if (state.science >= target.flagship && state.health >= BALANCE.healthFlagship) {
    return {
      tier: 'flagship',
      title: 'Flagship mission',
      summary: `${survived} You kept them healthy AND got a serious amount of science done. This is what mission planners are actually aiming for — and it is the hardest thing to do.`,
    };
  }
  if (state.science >= target.flagship) {
    return {
      tier: 'success',
      title: 'Mission success, at a price',
      summary: `${survived} You banked ${state.science} science points — an excellent haul — but your crew came home at ${Math.round(state.health)}% health. A flagship mission needs both.`,
    };
  }
  if (state.science >= target.success) {
    return {
      tier: 'success',
      title: 'Mission success',
      summary: `${survived} You brought back enough science to justify the trip, and your crew is still in shape to keep working.`,
    };
  }
  return {
    tier: 'incomplete',
    title: 'Survived, mission incomplete',
    summary: `${survived} But you only banked ${state.science} science points, and the mission needed ${target.success}. Keeping everyone alive is the floor, not the goal — a very expensive rocket brought you here to find something out.`,
  };
}

/**
 * One number for a finished mission, so a player can beat their own best.
 *
 * It is the three things the game has been asking for all along, added up:
 *   science points, as collected
 *   crew health at the end, 0 to 100
 *   5 points for every day the crew stayed
 * so a child can see where their score came from and what would raise it.
 *
 * @returns {{total: number, science: number, health: number, days: number,
 *            daysSurvived: number}}
 */
export function missionScore(state) {
  const daysSurvived = Math.min(state.log.length, state.missionDays);
  const science = Math.round(state.science);
  const health = Math.max(0, Math.round(state.health));
  const days = daysSurvived * 5;
  return { total: science + health + days, science, health, days, daysSurvived };
}

/**
 * What to do differently next time: at most three things, chosen from what
 * actually went wrong in THIS mission, most important first. Each is one
 * action a child can take, not an analysis.
 *
 * @returns {Array<{id: string, title: string, text: string}>}
 */
export function nextTimeTips(state) {
  const site = getSite(state.siteId);
  const target = scienceTargets(site);
  const log = state.log;
  const tips = [];
  const add = (id, title, text) => {
    if (tips.length < 3 && !tips.some((t) => t.id === id)) tips.push({ id, title, text });
  };

  const stormDays = log.filter((d) => d.stormClass);
  const bigUnsheltered = stormDays.filter(
    (d) => !d.sheltered && String(d.stormClass).toUpperCase().startsWith('X')
  );
  const shieldBlocks = log.reduce((sum, d) => sum + d.allocation.shielding, 0);
  const earlyShieldBlocks = log
    .filter((d) => d.day <= 7)
    .reduce((sum, d) => sum + d.allocation.shielding, 0);
  const lowAir = log.filter((d, i) => d.oxygen < (i ? log[i - 1].oxygen : BALANCE.startOxygen)).length;
  const lowFood = log.filter((d, i) => d.food < (i ? log[i - 1].food : BALANCE.startFood)).length;

  if (state.endReason === 'oxygen') {
    add('air', 'Air comes first', 'Fill Life Support before anything else, every single day. Nothing else matters once the air runs out.');
  }
  if (state.endReason === 'food') {
    add('food', 'Keep the greenhouse fed', 'Give the Greenhouse what it needs on most days. Food takes a long time to grow back.');
  }

  const hurt = state.endReason === 'crew-health' || state.health < BALANCE.healthFlagship;
  if (hurt && bigUnsheltered.length) {
    add('shelter', 'Use the storm room on the big flares', 'When the flare card says the shield will break, send the crew to the storm room. You lose some science that day and keep your crew.');
  }
  if (hurt && earlyShieldBlocks < 6) {
    add('shield', 'Build the shield early', 'Give Shielding a block or two on the quiet days of levels 1 and 2. Soil piled today only protects tomorrow, so it has to be there before the big flares.');
  }
  if (state.endReason !== 'oxygen' && lowAir >= 4) {
    add('air', 'Do not let the air slide', 'Oxygen fell on many days. Give Life Support the number on its tag before you spend blocks on anything else.');
  }
  if (state.endReason !== 'food' && lowFood >= 4) {
    add('food', 'Feed the greenhouse', 'Food fell on many days. A hungry crew gets sick, and a sick crew does less science.');
  }
  if (state.science < target.success) {
    add('science', 'Spend more on science', 'Once air and food have what they need, put your spare blocks into Science Research. On a lucky find day it counts double.');
  }
  if (shieldBlocks > 30 && state.science < target.flagship) {
    add('balance', 'You can stop digging sooner', 'Your shield was thick enough well before the end. After that, the same blocks are worth more as science.');
  }
  if (state.science >= target.success && state.science < target.flagship) {
    add('flagship', 'Go for the flagship', 'You have the science for a success. For three stars you need even more science and a healthy crew at the same time.');
  }
  if (!tips.length) {
    add('top', 'You reached the top', 'Three stars. Try the other world, or play this same mission again and beat your own score.');
  }
  return tips;
}

/**
 * Read the log and work out what actually drove the result.
 * Returns an ordered list of findings, most important first.
 */
export function buildDebrief(state) {
  const site = getSite(state.siteId);
  const log = state.log;
  const findings = [];

  if (!log.length) return findings;

  /* ---- the storm days: the moment the trade-off bit ------------------- */
  const stormDays = log.filter((d) => d.stormClass);
  const unsheltered = stormDays.filter((d) => !d.sheltered);
  const worstDose = log.reduce((m, d) => Math.max(m, d.doseToday), 0);

  if (stormDays.length) {
    const sheltered = stormDays.length - unsheltered.length;
    findings.push({
      key: 'storms',
      heading: `You lived through ${stormDays.length} real solar storm${stormDays.length > 1 ? 's' : ''}`,
      body:
        `Those flares really happened — they came out of NASA's DONKI space weather database. ` +
        `You took shelter for ${sheltered} of them and worked through ${unsheltered.length}. ` +
        `Your worst single day was ${worstDose} mSv.`,
      tone: unsheltered.length > sheltered ? 'warn' : 'good',
    });
  }

  /* ---- the shield decision -------------------------------------------- */
  const shieldStart = BALANCE.startShieldCm;
  const shieldEnd = state.shieldCm;
  const shieldBlocks = log.reduce((s, d) => s + d.allocation.shielding, 0);
  const scienceBlocks = log.reduce((s, d) => s + d.allocation.science, 0);

  findings.push({
    key: 'shield',
    heading: `You spent ${shieldBlocks} blocks on shielding and ${scienceBlocks} on science`,
    body:
      (shieldEnd === shieldStart
        ? `You never piled a single load of regolith, so your shield stayed at the ${shieldStart} cm you landed with. `
        : `Your shield went from ${shieldStart} cm to ${shieldEnd} cm. `) +
      shieldAdvice(shieldEnd, unsheltered.length) +
      ` For comparison, NASA engineers reckon about ${MEASURED.REGOLITH_FULL_SHIELD_M.value} metres of regolith — ${MEASURED.REGOLITH_FULL_SHIELD_M.value * 100} cm — is enough to shield a habitat even during a flare.`,
    tone: 'neutral',
  });

  /* ---- total dose, against real yardsticks ---------------------------- */
  const perDay = state.log.length
    ? Math.round((state.doseTotalMsv / state.log.length) * 100) / 100
    : 0;
  const instrument =
    site.id === 'moon' ? "Chang'E-4's LND instrument" : "Curiosity's RAD instrument";
  const stormShare = stormDays.length
    ? ' Almost all of that came from the handful of storm days, not the steady background — which is exactly why one bad decision during a flare matters more than a fortnight of ordinary ones.'
    : '';

  findings.push({
    key: 'dose',
    heading: `Total radiation dose: ${state.doseTotalMsv} mSv`,
    body:
      `That averages ${perDay} mSv per ${site.dayWord}. ` +
      `The steady background on ${site.body} is ${site.baseDoseMsvPerDay} mSv a ${site.dayWord} unshielded, measured by ${instrument}.` +
      stormShare +
      ` Astronauts on the International Space Station pick up roughly ${RADLAB_CONTEXT.issDoseEqMsvPerDay[0]} to ${RADLAB_CONTEXT.issDoseEqMsvPerDay[1]} mSv a day, because Earth's magnetic field still shelters them.`,
    tone: 'neutral',
  });

  /* ---- the hungriest constraint --------------------------------------- */
  const lsShortDays = log.filter((d) => d.allocation.lifeSupport < 4).length;
  const ghShortDays = log.filter((d) => d.allocation.greenhouse < 3).length;

  if (lsShortDays || ghShortDays) {
    const parts = [];
    if (lsShortDays) {
      parts.push(
        `life support on ${countOf(lsShortDays, site.dayWord, site.dayWordPlural)}`
      );
    }
    if (ghShortDays) {
      parts.push(
        `the greenhouse on ${countOf(ghShortDays, site.dayWord, site.dayWordPlural)}`
      );
    }
    findings.push({
      key: 'starved',
      heading: 'Where you cut corners',
      body:
        `You underfunded ${parts.join(' and ')}. ` +
        'Those are the two systems whose bill always arrives late — you save power today and pay in oxygen or food several days later.',
      tone: 'warn',
    });
  } else {
    findings.push({
      key: 'starved',
      heading: 'You never starved air or food',
      body:
        'You funded life support and the greenhouse every single day. That is the safe way to play it — and it is why your science total was squeezed. There is no version of this where you get everything.',
      tone: 'good',
    });
  }

  /* ---- the power squeeze, stated plainly ------------------------------ */
  const totalAvailable = log.reduce((s, d) => s + d.blocksAvailable, 0);
  const totalNeeded = log.length * BALANCE.baseBlocksPerDay;
  findings.push({
    key: 'squeeze',
    heading: 'The thing you could never fix',
    body:
      `Over ${log.length} ${site.dayWordPlural} you had ${totalAvailable} blocks of power. Running everything properly would have needed ${log.length * TOTAL_DEMAND}. ` +
      'That gap is the whole job. Real mission planners do not solve it either — they decide, every day, which thing gets less than it needs.',
    tone: 'neutral',
    emphasis: true,
  });

  return findings;
}

/** "1 sol" / "4 sols" -- never "1 sols". */
function countOf(n, singular, pluralForm) {
  return `${n} ${n === 1 ? singular : pluralForm}`;
}

function shieldAdvice(shieldEnd, unshelteredStorms) {
  if (shieldEnd >= 200) {
    return 'That is a thick, serious shield. It cost you science points, and it is the reason the storms did not hurt you.';
  }
  if (shieldEnd >= 100) {
    return 'That is a reasonable shield — enough to take the edge off a flare without giving up all your research.';
  }
  if (unshelteredStorms > 0) {
    return 'That is a thin shield, and you were caught outside it. Regolith you pile today only protects you tomorrow, so there is no way to catch up once a flare has already gone off.';
  }
  return 'That is a thin shield. You got away with it this time, mostly by hiding in the storm room.';
}

/** Compact per-day series for the debrief chart. */
export function debriefSeries(state) {
  return {
    days: state.log.map((d) => d.day),
    oxygen: state.log.map((d) => Math.round(d.oxygen)),
    food: state.log.map((d) => Math.round(d.food)),
    health: state.log.map((d) => Math.round(d.health)),
    shield: state.log.map((d) => d.shieldCm),
    dose: state.log.map((d) => d.doseToday),
    science: state.log.map((d) => d.science),
    storms: state.log.map((d) => d.stormClass),
  };
}
