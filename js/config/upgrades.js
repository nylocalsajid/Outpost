/**
 * upgrades.js
 * -----------------------------------------------------------------------------
 * The supply rocket.
 *
 * At the end of each of the first three levels, Earth sends a cargo rocket and
 * the player chooses ONE thing from it. That is three choices in a mission,
 * out of six possible upgrades, so no two missions end up with the same base.
 *
 * WHY A CHOICE AND NOT A SHOP. The suggestion was coins to spend on upgrades.
 * Coins would be one more number on a screen we have been taking numbers off,
 * and a second budget to manage on top of the power blocks. A single pick from
 * three, a few days apart, gives the same feeling of building the base up,
 * and it is the same kind of decision as the rest of the game: you cannot have
 * everything, so what do you want most?
 *
 * Each upgrade eases ONE system. Which one is worth taking depends on what
 * has been hurting, which is the point.
 *
 * Resupply by cargo rocket is real: it is how the International Space Station
 * has been kept running for more than twenty years. The upgrades themselves,
 * and their sizes, are game balance.
 */

import { createRng } from '../sim/rng.js';
import { LEVELS } from './levels.js';
import { BALANCE } from './systems.js';

export const UPGRADES = {
  panel: {
    id: 'panel',
    name: 'Extra solar panel',
    text: 'One more block of power, every day.',
    icon: 'bolt',
    colorVar: '--sys-power',
  },
  recycler: {
    id: 'recycler',
    name: 'Air recycler',
    text: 'Life support needs one block less.',
    icon: 'lungs',
    colorVar: '--sys-air',
  },
  lamps: {
    id: 'lamps',
    name: 'Better grow lights',
    text: 'The greenhouse needs one block less.',
    icon: 'sprout',
    colorVar: '--sys-food',
  },
  digger: {
    id: 'digger',
    name: 'Bigger digger bucket',
    text: 'Every block of shielding piles half as much soil again.',
    icon: 'shield',
    colorVar: '--sys-shield',
  },
  drill: {
    id: 'drill',
    name: 'Sharper rover drill',
    text: 'Every block of science research earns a quarter more.',
    icon: 'flask',
    colorVar: '--sys-science',
  },
  battery: {
    id: 'battery',
    name: 'Bigger battery',
    text: 'Saves up to 5 spare blocks for tomorrow, instead of 3.',
    icon: 'bolt',
    colorVar: '--sys-power',
  },
};

/**
 * What a mission's upgrades change, as plain numbers the engine and the
 * screens both read. With no upgrades this is exactly the base game.
 *
 * @param {{upgrades?: string[]}} state
 */
export function upgradeMods(state) {
  const has = (id) => (state.upgrades || []).includes(id);
  return {
    /** Extra blocks the panels make each day. */
    blocks: has('panel') ? 1 : 0,
    /** Change to what a system needs. Never takes a need below 1. */
    demand: {
      lifeSupport: has('recycler') ? -1 : 0,
      greenhouse: has('lamps') ? -1 : 0,
    },
    shieldCmPerBlock: has('digger')
      ? Math.round(BALANCE.shieldCmPerBlock * 1.5)
      : BALANCE.shieldCmPerBlock,
    sciencePerBlock: has('drill')
      ? Math.round(BALANCE.sciencePerBlock * 1.25)
      : BALANCE.sciencePerBlock,
    batteryChargeMax: has('battery') ? BALANCE.batteryCap : BALANCE.batteryChargeMax,
  };
}

/** How many supply rockets have arrived by the morning of `day`. */
function rocketsDue(day) {
  // One per finished level, except the last: after that the crew goes home.
  return LEVELS.slice(0, -1).filter((l) => l.to < day).length;
}

/**
 * The rocket waiting to be unpacked, if there is one: three upgrades the
 * player does not have yet. Null when nothing is waiting.
 *
 * Deterministic, so a replay of the same mission is offered the same crates.
 *
 * @param {import('../sim/state.js').MissionState} state
 * @returns {?{level: number, options: Array<typeof UPGRADES[keyof typeof UPGRADES]>}}
 */
export function pendingSupply(state) {
  if (state.over) return null;
  const owned = state.upgrades || [];
  const due = rocketsDue(state.day);
  if (owned.length >= due) return null;

  const level = owned.length + 1;
  const pool = Object.values(UPGRADES).filter((u) => !owned.includes(u.id));

  // Seeded shuffle, then the first three.
  const rng = createRng(state.seed + level * 7907);
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return { level, options: pool.slice(0, 3) };
}

/** Unpack one crate. Returns a new state; ignores anything not on offer. */
export function takeUpgrade(state, id) {
  const offer = pendingSupply(state);
  if (!offer || !offer.options.some((u) => u.id === id)) return state;
  return { ...state, upgrades: [...(state.upgrades || []), id] };
}
