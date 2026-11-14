/**
 * simulation.test.mjs
 * -----------------------------------------------------------------------------
 * Headless tests for the simulation core. Run with:
 *
 *   node tests/simulation.test.mjs
 *
 * These exist because the simulation is pure (no DOM, no network), which is the
 * whole reason for the architecture: the educational claims of the game are
 * claims about its MECHANICS, so the mechanics need to be checkable without
 * clicking through fifteen days in a browser.
 *
 * What is asserted:
 *   0. the mission is four levels that get harder, after a calm set-up
 *   8. events other than storms each lean on a different system
 *   9. a supply rocket arrives after each of the first three levels
 *  10. the training mission is three days and teaches one thing a day
 *  11. the score adds up, and the tips match what went wrong
 *   1. supply is permanently below demand -- the core design rule
 *   2. the same seed always produces the same mission (replay works)
 *   3. no resource ever escapes its bounds, and nothing ever becomes NaN
 *   4. regolith piled today does NOT reduce today's dose (the key lesson)
 *   5. no strategy is cost-free: each one fails at something
 *   6. the greedy "all science, no shield" strategy is punished by real storms
 */

import { createMission, emptyAllocation } from '../js/sim/state.js';
import { planDay, resolveDay, validateAllocation } from '../js/sim/engine.js';
import { gradeMission } from '../js/sim/scoring.js';
import { archiveWeather } from '../js/data/space-weather.js';
import {
  BALANCE,
  TOTAL_DEMAND,
  SYSTEMS,
  scienceTargets,
} from '../js/config/systems.js';
import { getSite } from '../js/config/sites.js';
import { LEVELS, CALM_DAYS, dayRules } from '../js/config/levels.js';
import { EVENTS } from '../js/config/events.js';
import { UPGRADES, upgradeMods, pendingSupply, takeUpgrade } from '../js/config/upgrades.js';
import { trainingWeather } from '../js/data/space-weather.js';
import { missionScore, nextTimeTips } from '../js/sim/scoring.js';

let passed = 0;
let failed = 0;

function check(name, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${name}${detail ? ` -- ${detail}` : ''}`);
  }
}

function section(title) {
  console.log(`\n${title}`);
}

/* -------------------------------------------------------------- strategies */

/**
 * Put up to `n` blocks into a system, if it is on line and there is power.
 * During the set-up days some systems are not unpacked yet; a strategy that
 * asks for them simply gets nothing, and the power stays spare.
 */
function give(a, plan, id, n, budget) {
  if (!plan.unlocked.includes(id)) return;
  const k = Math.max(0, Math.min(n, budget.left));
  a[id] = k;
  budget.left -= k;
}

/** Fund air and food, everything else to science. Never builds a shield. */
const greedy = (plan) => {
  const a = emptyAllocation();
  const budget = { left: plan.blocksAvailable };
  give(a, plan, 'lifeSupport', plan.demands.lifeSupport, budget);
  give(a, plan, 'greenhouse', plan.demands.greenhouse, budget);
  give(a, plan, 'science', Infinity, budget);
  return a;
};

/** Fund air and food, then shield first, science with the remainder. */
const cautious = (plan) => {
  const a = emptyAllocation();
  const budget = { left: plan.blocksAvailable };
  give(a, plan, 'lifeSupport', plan.demands.lifeSupport, budget);
  give(a, plan, 'greenhouse', plan.demands.greenhouse, budget);
  give(a, plan, 'shielding', 2, budget);
  give(a, plan, 'science', Infinity, budget);
  return a;
};

/**
 * How a thoughtful player actually plays: fund air, shelter when the Sun is
 * firing, build the shield on quiet days, and take science with what is left.
 */
const prudent = (plan, state) => {
  const a = emptyAllocation();
  const budget = { left: plan.blocksAvailable };

  // Air first, always.
  give(a, plan, 'lifeSupport', plan.demands.lifeSupport, budget);

  // Shelter beats everything else on a storm day.
  if (plan.storm && budget.left >= BALANCE.shelterCost) {
    a.shelter = true;
    budget.left -= BALANCE.shelterCost;
  }

  give(a, plan, 'greenhouse', plan.demands.greenhouse, budget);

  // Build the shield while it is quiet; it is useless to start once a flare
  // has already gone off.
  if (!plan.storm && state.shieldCm < 170) give(a, plan, 'shielding', 2, budget);

  give(a, plan, 'science', Infinity, budget);
  return a;
};

/** Everything into shielding after air and food. No science at all. */
const bunker = (plan) => {
  const a = emptyAllocation();
  const budget = { left: plan.blocksAvailable };
  give(a, plan, 'lifeSupport', plan.demands.lifeSupport, budget);
  give(a, plan, 'greenhouse', plan.demands.greenhouse, budget);
  give(a, plan, 'shielding', Infinity, budget);
  return a;
};

/** Starve life support to maximise science. Should end badly. */
const reckless = (plan) => {
  const a = emptyAllocation();
  const budget = { left: plan.blocksAvailable };
  give(a, plan, 'lifeSupport', 2, budget);
  give(a, plan, 'greenhouse', 1, budget);
  give(a, plan, 'science', Infinity, budget);
  return a;
};

/* ----------------------------------------------------------------- runner */

/**
 * @param {(offer: {options: Array<{id: string}>}) => string} [choose]
 *        which crate to take from a supply rocket; the first, by default
 */
function runMission(siteId, seedCode, strategy, choose = (offer) => offer.options[0].id) {
  const weather = archiveWeather(BALANCE.missionDays);
  let state = createMission({ siteId, seedCode });
  const issues = [];
  const perDay = [];
  const rockets = [];

  while (!state.over) {
    // A supply rocket is unpacked before the day is planned, as in the game.
    const offer = pendingSupply(state);
    if (offer) {
      rockets.push({ day: state.day, options: offer.options.map((u) => u.id) });
      state = takeUpgrade(state, choose(offer));
    }

    const plan = planDay(state, weather);
    const allocation = strategy(plan, state);
    const validation = validateAllocation(plan, allocation);

    if (!validation.valid) {
      issues.push(`day ${state.day}: strategy produced an illegal allocation`);
      break;
    }

    const shieldBefore = state.shieldCm;
    const { state: after, outcome } = resolveDay(state, plan, allocation);

    perDay.push({
      day: outcome.day,
      generated: plan.generated,
      hazard: plan.hazard ? plan.hazard.id : null,
      event: plan.event ? plan.event.id : null,
      demands: plan.demands,
      usual: plan.usual,
      scienceGained: outcome.scienceGained,
      scienceBlocks: allocation.science,
      shieldLost: outcome.shieldLost,
      dustAfter: after.dust,
      shieldBefore,
      shieldAfter: after.shieldCm,
      dose: outcome.doseToday,
      storm: Boolean(plan.storm),
      projected: plan.projectedDose,
      sheltered: Boolean(allocation.shelter),
    });

    for (const [key, value] of Object.entries({
      oxygen: after.oxygen,
      food: after.food,
      health: after.health,
      shieldCm: after.shieldCm,
      doseTotalMsv: after.doseTotalMsv,
      science: after.science,
      battery: after.battery,
    })) {
      if (!Number.isFinite(value)) issues.push(`day ${outcome.day}: ${key} is not finite`);
    }
    if (after.oxygen < 0 || after.oxygen > 100) issues.push(`day ${outcome.day}: oxygen out of range`);
    if (after.food < 0 || after.food > 100) issues.push(`day ${outcome.day}: food out of range`);
    if (after.health < 0 || after.health > 100) issues.push(`day ${outcome.day}: health out of range`);
    if (after.battery > BALANCE.batteryCap) issues.push(`day ${outcome.day}: battery over cap`);

    state = after;
  }

  return { state, issues, perDay, rockets, grade: gradeMission(state) };
}

/* ====================================================================== */

console.log('OUTPOST simulation tests\n' + '='.repeat(60));

/* --- 0. levels -------------------------------------------------------- */
section('0. Four levels, easy to hard');
check(
  `the mission is ${BALANCE.missionDays} days, covered exactly by the levels`,
  LEVELS[0].from === 1 &&
    LEVELS[LEVELS.length - 1].to === BALANCE.missionDays &&
    LEVELS.every((l, i) => i === 0 || l.from === LEVELS[i - 1].to + 1)
);
check(
  'each level makes less power than the one before',
  LEVELS.every((l, i) => i === 0 || l.blocks < LEVELS[i - 1].blocks),
  LEVELS.map((l) => l.blocks).join(' > ')
);
check(
  'once the base is set up, the panels never cover full demand',
  Array.from({ length: BALANCE.missionDays }, (_, i) => dayRules(i + 1)).every(
    (r) => r.calm || r.blocks < TOTAL_DEMAND
  )
);
check(
  'the first day brings only air and food on line, with exactly enough power',
  dayRules(1).unlocked.join() === 'lifeSupport,greenhouse' && dayRules(1).blocks === 7
);
check(
  'every system is on line by the end of set-up',
  dayRules(CALM_DAYS).unlocked.length === SYSTEMS.length
);
check(
  'the first real shortage arrives on the last set-up day, not before',
  dayRules(1).blocks >= 7 && dayRules(2).blocks >= 10 && dayRules(3).blocks < TOTAL_DEMAND
);
{
  // Leave the extra solar panel in its crate, so that power is the level's own.
  const noPanel = (offer) => offer.options.find((u) => u.id !== 'panel').id;
  const run = ['moon', 'mars'].map((site) => runMission(site, 'LVL01', greedy, noPanel));
  check(
    'set-up days have no storms and no hazards, on either site',
    run.every((r) =>
      r.perDay.slice(0, CALM_DAYS).every((d) => !d.storm && !d.hazard)
    )
  );
  const clear = run[0].perDay.filter((d) => !d.hazard);
  const byLevel = LEVELS.map((l) =>
    clear.filter((d) => d.day >= l.from && d.day <= l.to).map((d) => d.generated)
  );
  check(
    'on clear days the Moon base makes what its level says',
    LEVELS.slice(1).every((l, i) => byLevel[i + 1].every((g) => g === l.blocks)),
    byLevel.map((g) => g.join(',')).join(' | ')
  );
  const many = ['LVL01', 'LVL02', 'LVL03', 'LVL04', 'LVL05', 'LVL06'].flatMap((seed) =>
    ['moon', 'mars'].map((site) => runMission(site, seed, greedy))
  );
  const level3 = LEVELS[2];
  check(
    'bad-weather days never arrive before level 3',
    many.every((r) => r.perDay.filter((d) => d.day < level3.from).every((d) => !d.hazard))
  );
  check(
    'but they do arrive from level 3 on',
    many.some((r) => r.perDay.some((d) => d.day >= level3.from && d.hazard))
  );
  const plan1 = planDay(createMission({ siteId: 'moon', seedCode: 'LVL01' }), archiveWeather(BALANCE.missionDays));
  const cheat = { ...emptyAllocation(), lifeSupport: 4, science: 1 };
  check(
    'a system that is not on line yet cannot be given power',
    !validateAllocation(plan1, cheat).valid
  );
  check(
    'a fresh mission lasts the full length when played sensibly',
    run[0].state.log.length <= BALANCE.missionDays
  );
}

/* --- 1. the core design rule ----------------------------------------- */
section('1. Supply is permanently below demand');
check(
  `demand (${TOTAL_DEMAND}) exceeds daily supply (${BALANCE.baseBlocksPerDay})`,
  TOTAL_DEMAND > BALANCE.baseBlocksPerDay,
  `demand ${TOTAL_DEMAND}, supply ${BALANCE.baseBlocksPerDay}`
);
check(
  'every system has a non-zero demand, so none is free to ignore',
  SYSTEMS.every((s) => s.demand > 0)
);
check(
  'air and food alone take most of the budget',
  4 + 3 >= BALANCE.baseBlocksPerDay - 3,
  'the shield-or-science choice must be forced'
);

/* --- 2. determinism --------------------------------------------------- */
section('2. The same seed replays identically');
const a1 = runMission('moon', 'TESTA', cautious);
const a2 = runMission('moon', 'TESTA', cautious);
check(
  'identical seed and strategy give identical science',
  a1.state.science === a2.state.science,
  `${a1.state.science} vs ${a2.state.science}`
);
check(
  'identical seed and strategy give identical total dose',
  a1.state.doseTotalMsv === a2.state.doseTotalMsv,
  `${a1.state.doseTotalMsv} vs ${a2.state.doseTotalMsv}`
);
const b1 = runMission('moon', 'TESTB', cautious);
check(
  'a different seed gives a different mission',
  JSON.stringify(a1.perDay) !== JSON.stringify(b1.perDay)
);

/* --- 3. bounds and finiteness ---------------------------------------- */
section('3. Resources stay in bounds across every strategy and site');
const matrix = [];
for (const site of ['moon', 'mars']) {
  for (const [name, strategy] of Object.entries({
    greedy,
    cautious,
    prudent,
    bunker,
    reckless,
  })) {
    const run = runMission(site, 'GRID1', strategy);
    matrix.push({ site, name, run });
    check(`${site}/${name}: no invariant violations`, run.issues.length === 0, run.issues.join('; '));
  }
}

/* --- 4. the key educational mechanic --------------------------------- */
section("4. Regolith piled today does not protect you today");
const shieldRun = runMission('moon', 'SHLD1', bunker);
const builtDays = shieldRun.perDay.filter((d) => d.shieldAfter > d.shieldBefore);
check('the bunker strategy did build shielding', builtDays.length > 0);
/**
 * On a quiet, unsheltered day the dose must equal exactly
 * base rate x exp(-morning shield / scale), rounded to one decimal.
 * If the engine ever credited the regolith built that same day, every one of
 * these days would come out lower than this.
 */
const MOON_BASE = 1.369;
const round1 = (v) => Math.round(v * 10) / 10;

const quietBuildDays = builtDays.filter((d) => !d.storm && !d.sheltered);
check(
  'there are quiet days where the shield grew, to test against',
  quietBuildDays.length >= 3,
  `${quietBuildDays.length} such days`
);

const mismatched = quietBuildDays.filter(
  (d) => d.dose !== round1(MOON_BASE * Math.exp(-d.shieldBefore / BALANCE.shieldScaleCm))
);
check(
  "today's dose is computed from this morning's shield thickness",
  mismatched.length === 0,
  mismatched
    .map(
      (d) =>
        `day ${d.day}: got ${d.dose}, expected ${round1(
          MOON_BASE * Math.exp(-d.shieldBefore / BALANCE.shieldScaleCm)
        )}`
    )
    .join('; ')
);

const creditedSameDay = quietBuildDays.filter(
  (d) => d.dose === round1(MOON_BASE * Math.exp(-d.shieldAfter / BALANCE.shieldScaleCm)) &&
    round1(MOON_BASE * Math.exp(-d.shieldAfter / BALANCE.shieldScaleCm)) !==
      round1(MOON_BASE * Math.exp(-d.shieldBefore / BALANCE.shieldScaleCm))
);
check(
  'the dose never matches the evening shield instead',
  creditedSameDay.length === 0,
  `${creditedSameDay.length} days credited same-day regolith`
);

/* --- 5. no strategy is cost-free -------------------------------------- */
section('5. Every strategy pays for itself somewhere');
const moonGreedy = matrix.find((m) => m.site === 'moon' && m.name === 'greedy').run;
const moonBunker = matrix.find((m) => m.site === 'moon' && m.name === 'bunker').run;
const moonPrudent = matrix.find((m) => m.site === 'moon' && m.name === 'prudent').run;
const moonReckless = matrix.find((m) => m.site === 'moon' && m.name === 'reckless').run;

check(
  'the bunker strategy banks no science and so cannot succeed',
  moonBunker.state.science < scienceTargets(getSite('moon')).success,
  `science ${moonBunker.state.science}`
);
check(
  'the bunker strategy still builds a real shield',
  moonBunker.state.shieldCm > 150,
  `shield ${moonBunker.state.shieldCm} cm`
);
check(
  'the greedy strategy earns more science than the prudent one',
  moonGreedy.state.science > moonPrudent.state.science,
  `greedy ${moonGreedy.state.science} vs prudent ${moonPrudent.state.science}`
);
check(
  'but the greedy strategy ends with worse crew health',
  moonGreedy.state.health < moonPrudent.state.health,
  `greedy ${Math.round(moonGreedy.state.health)}% vs prudent ${Math.round(
    moonPrudent.state.health
  )}%`
);
check(
  'starving life support ends the mission early or ruins the crew',
  moonReckless.state.endReason !== 'completed' || moonReckless.state.health < 60,
  `endReason ${moonReckless.state.endReason}, health ${Math.round(
    moonReckless.state.health
  )}%`
);

/* --- 6. the storms actually bite ------------------------------------- */
section('6. Real solar storms punish an unshielded crew');
const weather = archiveWeather(BALANCE.missionDays);
const stormDays = weather.timeline.filter((d) => d.sepDose > 0);
check(
  'the archive window contains real storm days',
  stormDays.length >= 3,
  `${stormDays.length} storm days`
);
check(
  'the set-up days are always quiet, so a new player can learn the controls',
  weather.timeline.slice(0, CALM_DAYS).every((d) => !d.flare)
);
{
  const order = stormDays.map((d) => d.sepDose);
  const firstHalf = order.slice(0, Math.floor(order.length / 2));
  const secondHalf = order.slice(Math.floor(order.length / 2));
  const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
  check(
    'the real May 2024 flares get stronger as the mission goes on',
    mean(secondHalf) > mean(firstHalf) &&
      order[order.length - 1] === Math.max(...order),
    stormDays.map((d) => d.flare.classType).join(', ')
  );
}
const greedyStormDoses = moonGreedy.perDay.filter((d) => d.storm).map((d) => d.dose);
check(
  'an unshielded crew takes a dose well above the safe daily limit in a storm',
  greedyStormDoses.some((d) => d > BALANCE.safeDoseMsvPerDay * 3),
  `storm doses: ${greedyStormDoses.join(', ')} mSv`
);
const prudentStormDoses = moonPrudent.perDay
  .filter((d) => d.storm)
  .map((d) => d.dose);
check(
  'sheltering and shielding measurably cut the storm dose',
  Math.max(...prudentStormDoses) < Math.max(...greedyStormDoses),
  `prudent peak ${Math.max(...prudentStormDoses)} vs greedy peak ${Math.max(
    ...greedyStormDoses
  )}`
);

/* --- 7. the game is winnable, and over-caution is its own failure ---- */
section('7. The mission is winnable, but neither extreme wins it');

/** Build a shield early, shelter only for the serious storms, then research. */
const balanced = (plan, state) => {
  const a = emptyAllocation();
  const budget = { left: plan.blocksAvailable };

  give(a, plan, 'lifeSupport', plan.demands.lifeSupport, budget);

  // With the food bar getting low, the greenhouse comes before anything else.
  const hungry = state.food < 45;
  if (hungry) give(a, plan, 'greenhouse', plan.demands.greenhouse, budget);

  if (plan.storm && plan.projectedDose > 5) {
    // In the last level a bad-weather day can leave too little power to both
    // run life support at full and shelter. With the tanks comfortably full,
    // a sensible player runs the air a block or two short for one day.
    while (
      budget.left < BALANCE.shelterCost &&
      a.lifeSupport > 2 &&
      state.oxygen > 60
    ) {
      a.lifeSupport -= 1;
      budget.left += 1;
    }
    if (budget.left >= BALANCE.shelterCost) {
      a.shelter = true;
      budget.left -= BALANCE.shelterCost;
    }
  }
  if (!hungry) give(a, plan, 'greenhouse', plan.demands.greenhouse, budget);

  // Put back what a quake shakes off; otherwise one load a day while it is quiet.
  if (plan.event && plan.event.id === 'quake') give(a, plan, 'shielding', 2, budget);
  else if (!plan.storm && state.shieldCm < 140) give(a, plan, 'shielding', 1, budget);
  give(a, plan, 'science', Infinity, budget);
  return a;
};

const SEEDS = ['WIN01', 'ALPHA', 'BRAVO', 'DELTA', 'ECHO'];

for (const site of ['moon', 'mars']) {
  const target = scienceTargets(getSite(site));
  const runs = SEEDS.map((seed) => runMission(site, seed, balanced));

  check(
    `${site}: a balanced player survives every seed`,
    runs.every((r) => r.state.endReason === 'completed'),
    runs.map((r) => r.state.endReason).join(', ')
  );
  check(
    `${site}: a balanced player reaches the science target`,
    runs.every((r) => r.state.science >= target.success),
    `science ${runs.map((r) => r.state.science).join(', ')} vs target ${target.success}`
  );
  check(
    `${site}: a balanced player keeps the crew healthy`,
    runs.every((r) => r.state.health >= BALANCE.healthFlagship),
    `health ${runs.map((r) => Math.round(r.state.health)).join(', ')}`
  );

  // The important one: playing it too safe is also a way to fail.
  const overCautious = runMission(site, 'WIN01', prudent);
  check(
    `${site}: playing it too safe misses the science target`,
    overCautious.state.science < target.success,
    `over-cautious science ${overCautious.state.science} vs target ${target.success}`
  );

  // And so is chasing science with no shield.
  const reckless2 = runMission(site, 'WIN01', greedy);
  check(
    `${site}: chasing science with no shield wrecks the crew`,
    reckless2.state.health < BALANCE.healthFlagship,
    `greedy health ${Math.round(reckless2.state.health)}%`
  );

  const best = runs.map((r) => r.state.science);
  console.log(
    `        ${site}: balanced science ${Math.min(...best)}-${Math.max(
      ...best
    )} (target ${target.success}, flagship ${target.flagship}), ` +
      `health ${Math.round(runs[0].state.health)}%, dose ${runs[0].state.doseTotalMsv} mSv`
  );
}

/* --- 8. events other than storms -------------------------------------- */
section('8. Other events each lean on a different system');
{
  const seeds = Array.from({ length: 40 }, (_, i) => `EVT${i}`);
  const runs = seeds.flatMap((seed) =>
    ['moon', 'mars'].map((site) => ({ site, run: runMission(site, seed, cautious) }))
  );
  const days = runs.flatMap((r) => r.run.perDay.map((d) => ({ ...d, site: r.site })));
  const withEvent = days.filter((d) => d.event);
  const seen = new Set(withEvent.map((d) => d.event));

  check(
    'every kind of event turns up across a spread of missions',
    Object.keys(EVENTS).every((id) => seen.has(id)),
    `seen: ${[...seen].join(', ')}`
  );
  check(
    'no event on a set-up day',
    withEvent.every((d) => d.day > CALM_DAYS)
  );
  check(
    'never on top of a storm or a bad-weather day: one problem at a time',
    withEvent.every((d) => !d.storm && !d.hazard)
  );
  check(
    'never the same event two days running',
    runs.every((r) =>
      r.run.perDay.every(
        (d, i) => !d.event || i === 0 || r.run.perDay[i - 1].event !== d.event
      )
    )
  );
  check(
    'an air leak raises what life support needs, and only that',
    withEvent
      .filter((d) => d.event === 'leak')
      .every((d) => d.demands.lifeSupport === d.usual.lifeSupport + 2 && d.demands.greenhouse === d.usual.greenhouse)
  );
  check(
    'mould raises what the greenhouse needs, and only that',
    withEvent
      .filter((d) => d.event === 'blight')
      .every((d) => d.demands.greenhouse === d.usual.greenhouse + 2 && d.demands.lifeSupport === d.usual.lifeSupport)
  );
  check(
    'a quake takes soil off the shield',
    withEvent.filter((d) => d.event === 'quake').every((d) => d.shieldLost > 0)
  );
  check(
    'a quiet day never loses shield',
    days.filter((d) => d.event !== 'quake').every((d) => !d.shieldLost)
  );
  check(
    'a dust devil only visits Mars, and leaves the panels clean',
    withEvent
      .filter((d) => d.event === 'devil')
      .every((d) => d.site === 'mars' && d.dustAfter === 0)
  );

  // The same day, played with and without the find, to isolate its effect.
  const findRun = runs.find((r) => r.run.perDay.some((d) => d.event === 'find' && d.scienceBlocks > 0));
  const findDay = findRun && findRun.run.perDay.find((d) => d.event === 'find' && d.scienceBlocks > 0);
  check(
    'a lucky find doubles the science each block earns',
    Boolean(findDay) &&
      findDay.scienceGained >= findDay.scienceBlocks * BALANCE.sciencePerBlock * 2 * BALANCE.scienceHealthFloor,
    findDay ? `${findDay.scienceBlocks} blocks earned ${findDay.scienceGained}` : 'no find day with science'
  );

  const again = runMission('mars', 'EVT7', cautious);
  const first = runs.find((r) => r.site === 'mars' && r.run.state.seedCode === 'EVT7').run;
  check(
    'the same seed meets the same events',
    again.perDay.map((d) => d.event).join() === first.perDay.map((d) => d.event).join()
  );
}

/* --- 9. supply rockets ------------------------------------------------ */
section('9. A supply rocket after each of the first three levels');
{
  const run = runMission('moon', 'SUP01', cautious);
  check(
    'three rockets in a full mission, on the first day of levels 2, 3 and 4',
    run.rockets.map((r) => r.day).join() === LEVELS.slice(1).map((l) => l.from).join(),
    run.rockets.map((r) => r.day).join()
  );
  check(
    'each rocket offers three different upgrades the base does not have',
    run.rockets.every((r) => new Set(r.options).size === 3) &&
      run.rockets.every((r, i) =>
        r.options.every((id) => !run.state.upgrades.slice(0, i).includes(id))
      )
  );
  check(
    'the mission ends with three upgrades, all different',
    run.state.upgrades.length === 3 && new Set(run.state.upgrades).size === 3,
    run.state.upgrades.join()
  );
  check(
    'the same seed is offered the same crates',
    JSON.stringify(runMission('moon', 'SUP01', cautious).rockets) === JSON.stringify(run.rockets)
  );

  const fresh = createMission({ siteId: 'moon', seedCode: 'SUP02' });
  check('a new mission has no rocket waiting', pendingSupply(fresh) === null);
  check(
    'taking something that is not on offer changes nothing',
    takeUpgrade({ ...fresh, day: 4 }, 'no-such-thing').upgrades.length === 0
  );

  // Each upgrade, in isolation: same day, with and without it.
  const w = archiveWeather(BALANCE.missionDays);
  const day5 = { ...fresh, day: 5 };
  const base = planDay(day5, w);
  const withUp = (id) => planDay({ ...day5, upgrades: [id] }, w);
  check(
    'an extra panel makes exactly one more block',
    withUp('panel').generated === base.generated + 1
  );
  check(
    'the air recycler takes one block off what life support needs',
    withUp('recycler').demands.lifeSupport === base.demands.lifeSupport - 1
  );
  check(
    'better grow lights take one block off what the greenhouse needs',
    withUp('lamps').demands.greenhouse === base.demands.greenhouse - 1
  );
  const dig = { ...emptyAllocation(), lifeSupport: 4, greenhouse: 3, shielding: 2 };
  const shieldGain = (state) => {
    const plan = planDay(state, w);
    const a = { ...dig, lifeSupport: plan.demands.lifeSupport, greenhouse: plan.demands.greenhouse };
    return resolveDay(state, plan, a).outcome.shieldAdded;
  };
  const day3 = { ...fresh, day: 3 };
  check(
    'a bigger bucket piles more soil per block',
    shieldGain({ ...day3, upgrades: ['digger'] }) > shieldGain(day3),
    `${shieldGain({ ...day3, upgrades: ['digger'] })} cm vs ${shieldGain(day3)} cm`
  );
  const sci = (state) => {
    const plan = planDay(state, w);
    const a = { ...emptyAllocation(), lifeSupport: 4, greenhouse: 3, science: 2 };
    return resolveDay(state, plan, a).outcome.scienceGained;
  };
  check(
    'a sharper drill earns more science per block',
    sci({ ...day3, upgrades: ['drill'] }) > sci(day3),
    `${sci({ ...day3, upgrades: ['drill'] })} vs ${sci(day3)}`
  );
  const bank = (state) => {
    const plan = planDay(state, w);
    return resolveDay(state, plan, emptyAllocation()).outcome.banked;
  };
  check(
    'a bigger battery saves more spare blocks',
    bank({ ...day3, upgrades: ['battery'] }) === BALANCE.batteryCap &&
      bank(day3) === BALANCE.batteryChargeMax
  );
  check(
    'with no upgrades the numbers are exactly the base game',
    upgradeMods(fresh).blocks === 0 &&
      upgradeMods(fresh).shieldCmPerBlock === BALANCE.shieldCmPerBlock &&
      upgradeMods(fresh).sciencePerBlock === BALANCE.sciencePerBlock &&
      upgradeMods(fresh).batteryChargeMax === BALANCE.batteryChargeMax
  );
  check('there are six upgrades to choose between', Object.keys(UPGRADES).length === 6);
}

/* --- 10. the training mission ------------------------------------------ */
section('10. The training mission');
{
  const w = trainingWeather();
  let state = createMission({ siteId: 'moon', seedCode: 'TRAIN', training: true });
  check('it is three days long', state.missionDays === 3 && w.timeline.length === 3);

  const days = [];
  // Play it the way the guide asks.
  const asked = [
    { lifeSupport: 4, greenhouse: 3 },
    { lifeSupport: 4, greenhouse: 3, science: 3 },
    // the storm room costs 2 blocks, so science gets nothing: the lesson of the day
    { lifeSupport: 4, greenhouse: 3, shielding: 2, shelter: true },
  ];
  while (!state.over) {
    const plan = planDay(state, w);
    const allocation = { ...emptyAllocation(), ...asked[state.day - 1] };
    days.push({ plan, valid: validateAllocation(plan, allocation).valid });
    state = resolveDay(state, plan, allocation).state;
  }

  check('day 1 has only air and food, and exactly enough power for them',
    days[0].plan.unlocked.join() === 'lifeSupport,greenhouse' && days[0].plan.blocksAvailable === 7);
  check('day 2 adds science, with exactly enough for all three',
    days[1].plan.unlocked.includes('science') && !days[1].plan.unlocked.includes('shielding') &&
      days[1].plan.blocksAvailable === 10);
  check('days 1 and 2 are quiet', !days[0].plan.storm && !days[1].plan.storm);
  check('day 3 brings a real X-class flare and the digger',
    Boolean(days[2].plan.storm) && /^X/.test(days[2].plan.storm.record.classType) &&
      days[2].plan.unlocked.includes('shielding'),
    days[2].plan.storm ? days[2].plan.storm.headline : 'no storm');
  check('no events, no bad weather, no written news in training',
    days.every((d) => !d.plan.event && !d.plan.hazard && !d.plan.news));
  check('what the guide asks for is always a plan the game accepts', days.every((d) => d.valid));
  check('the crew finishes training alive, fed and with some science',
    state.endReason === 'completed' && state.health > 85 && state.oxygen >= BALANCE.startOxygen &&
      state.food >= BALANCE.startFood && state.science > 0,
    `health ${Math.round(state.health)}%, science ${state.science}`);
  check('a real mission is unchanged: 14 days, day 3 quiet',
    createMission({ siteId: 'moon', seedCode: 'X' }).missionDays === BALANCE.missionDays &&
      !planDay({ ...createMission({ siteId: 'moon', seedCode: 'X' }), day: 3 }, archiveWeather(BALANCE.missionDays)).storm);
}

/* --- 11. score and tips ------------------------------------------------ */
section('11. Score and next-time tips');
{
  const good = runMission('moon', 'SCORE1', balanced);
  const greedyRun = runMission('moon', 'SCORE1', greedy);
  const timid = runMission('moon', 'SCORE1', cautious);

  const sc = missionScore(good.state);
  check('the score is science + crew health + 5 a day',
    sc.total === sc.science + sc.health + sc.days && sc.days === sc.daysSurvived * 5,
    `${sc.total} = ${sc.science} + ${sc.health} + ${sc.days}`);
  check('a balanced mission outscores an over-cautious one',
    missionScore(good.state).total > missionScore(timid.state).total,
    `${missionScore(good.state).total} vs ${missionScore(timid.state).total}`);

  const ids = (run) => nextTimeTips(run.state).map((t) => t.id);
  check('never more than three tips, never none',
    [good, greedyRun, timid].every((r) => ids(r).length >= 1 && ids(r).length <= 3));
  check('the player who ignored the shield is told to build it or shelter',
    ids(greedyRun).includes('shield') || ids(greedyRun).includes('shelter'), ids(greedyRun).join());
  check('the player who missed the science target is told to spend more on science',
    nextTimeTips({ ...timid.state, science: 10 }).some((t) => t.id === 'science'));
  check('running out of air puts air first',
    nextTimeTips({ ...good.state, endReason: 'oxygen' })[0].id === 'air');
}

/* ====================================================================== */
console.log('\n' + '='.repeat(60));
console.log(`${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
