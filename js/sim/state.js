/**
 * state.js
 * -----------------------------------------------------------------------------
 * The shape of a mission, and the only place a mission is created.
 *
 * State is a plain serialisable object. The engine never mutates it -- every
 * step returns a new object. That makes the whole simulation replayable,
 * testable and trivially undoable, and it keeps the UI from ever reading a
 * half-updated mission.
 */

import { BALANCE, SYSTEM_IDS } from '../config/systems.js';
import { seedFromCode } from './rng.js';
import { TRAINING_DAYS } from '../config/levels.js';

/**
 * @typedef {Object} MissionState
 * @property {string}  siteId
 * @property {string}  seedCode
 * @property {number}  seed
 * @property {number}  day              1-based; `day` is the day about to be played
 * @property {number}  missionDays
 * @property {number}  oxygen           0-100
 * @property {number}  food             0-100
 * @property {number}  shieldCm
 * @property {number}  health           0-100
 * @property {number}  doseTotalMsv
 * @property {number}  science
 * @property {number}  battery          blocks banked
 * @property {number}  dust             0-1, Mars only
 * @property {boolean} over
 * @property {?string} endReason
 * @property {Array}   log              one entry per resolved day
 * @property {?Object} pendingAdvice    mission-control reply in transit
 * @property {string[]} upgrades        upgrades taken from supply rockets
 */

/**
 * Create a fresh mission.
 * @param {{siteId: string, seedCode: string}} opts
 * @returns {MissionState}
 */
export function createMission({ siteId, seedCode, training = false }) {
  return {
    siteId,
    seedCode,
    seed: seedFromCode(seedCode),
    /** The three-day training mission (see config/levels.js). */
    training,

    day: 1,
    missionDays: training ? TRAINING_DAYS : BALANCE.missionDays,

    oxygen: BALANCE.startOxygen,
    food: BALANCE.startFood,
    shieldCm: BALANCE.startShieldCm,
    health: BALANCE.startHealth,
    doseTotalMsv: 0,
    science: 0,
    battery: BALANCE.batteryStart,
    dust: 0,

    over: false,
    endReason: null,
    log: [],
    pendingAdvice: null,
    /** Ids of named experiments the crew has completed (see config/experiments.js). */
    experiments: [],
    /** Blocks of research banked towards the next study. */
    researchProgress: 0,
    /** Ids of upgrades unpacked from supply rockets (see config/upgrades.js). */
    upgrades: [],
  };
}

/** A blank allocation: zero blocks on everything, not sheltering. */
export function emptyAllocation() {
  return {
    lifeSupport: 0,
    greenhouse: 0,
    shielding: 0,
    science: 0,
    shelter: false,
  };
}

/** Blocks committed by an allocation, including the shelter cost. */
export function allocationTotal(allocation) {
  return (
    allocation.lifeSupport +
    allocation.greenhouse +
    allocation.shielding +
    allocation.science +
    (allocation.shelter ? BALANCE.shelterCost : 0)
  );
}

/**
 * A sensible opening allocation, used as the default each day so a young player
 * is never staring at an empty board. It funds air and food and leaves the
 * interesting decision -- shield or science -- to them.
 */
export function suggestedAllocation(
  blocksAvailable,
  unlocked = SYSTEM_IDS,
  usual = { lifeSupport: 4, greenhouse: 3 }
) {
  const alloc = emptyAllocation();
  let left = blocksAvailable;

  // Air and food get what they USUALLY need. If today's event has raised one
  // of them, the starting plan is deliberately short there: noticing, and
  // deciding what to give up, is the player's job.
  alloc.lifeSupport = Math.min(usual.lifeSupport, left);
  left -= alloc.lifeSupport;

  alloc.greenhouse = Math.min(usual.greenhouse, left);
  left -= alloc.greenhouse;

  // Whatever is left goes to science, so the default is "productive but
  // unshielded" -- a position the first storm will teach them to revisit.
  // On a set-up day before the lab is unpacked, it simply stays spare.
  if (unlocked.includes('science')) alloc.science = Math.max(0, left);

  return alloc;
}

/** Deep-ish clone sufficient for this state shape. */
export function cloneState(state) {
  return {
    ...state,
    log: state.log.map((entry) => ({ ...entry })),
    pendingAdvice: state.pendingAdvice ? { ...state.pendingAdvice } : null,
    experiments: [...(state.experiments || [])],
  };
}

/** Is the mission still playable? */
export function isAlive(state) {
  return state.health > 0 && state.oxygen > 0 && state.food > 0;
}
