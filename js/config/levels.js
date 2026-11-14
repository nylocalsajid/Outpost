/**
 * levels.js
 * -----------------------------------------------------------------------------
 * The mission as four levels, each a little harder than the one before.
 *
 * WHY LEVELS. A new player who meets four systems, two goals, a battery, a
 * shield that only works tomorrow and a solar storm all on the first screen
 * does not know where to look. So the mission now opens the way a real one
 * does: the base is built up over the first three days, one thing at a time,
 * with the Sun quiet. After that the squeeze begins, and it tightens.
 *
 *   Level 1  Set up the base     days 1-3    one new thing each day, no storms
 *   Level 2  The Sun wakes up    days 4-7    10 blocks a day, first flares
 *   Level 3  Storm season        days 8-11    9 blocks a day, bigger flares,
 *                                             and bad-weather days begin
 *   Level 4  The last stretch    days 12-14   8 blocks a day, the biggest one
 *
 * Each level adds one kind of trouble to the last. Level 2 has flares but no
 * bad-weather days, so the first time a player is short of power it is for
 * one reason, not two.
 *
 * HOW IT GETS HARDER. Two things, and only one of them is ours:
 *   - power: the panels make one block less each level. This is game balance,
 *     dressed as wear and dust on the array, and it is the lever we chose.
 *   - storms: the real flare records are laid out in the order they happened,
 *     and in May 2024 the Sun really did build from M-class to X8.7. We did
 *     not arrange that. See data/space-weather.js.
 *
 * These are GAME BALANCE numbers, like everything in config/systems.js. None
 * of them is a NASA figure and the game never claims otherwise.
 */

import { SYSTEM_IDS } from './systems.js';

export const LEVELS = [
  {
    id: 1,
    name: 'Set up the base',
    from: 1,
    to: 3,
    blocks: 11,
    intro:
      'You have just landed. Get the base running, one piece at a time. The Sun is quiet for now.',
  },
  {
    id: 2,
    name: 'The Sun wakes up',
    from: 4,
    to: 7,
    blocks: 10,
    /** Bad-weather days (horizon shadow, dust storms) wait for level 3. */
    hazards: false,
    intro:
      'The base is built. From here the panels make 10 blocks a day, so something always gets less. Solar flares are on their way, and other things can go wrong too. Read the card at the top each day.',
  },
  {
    id: 3,
    name: 'Storm season',
    from: 8,
    to: 11,
    blocks: 9,
    intro:
      'Dust and wear have cost you a panel: 9 blocks a day now. The flares are getting bigger, and from here a bad-weather day can cut your power too.',
  },
  {
    id: 4,
    name: 'The last stretch',
    from: 12,
    to: 14,
    blocks: 8,
    intro:
      'Only 8 blocks a day, and the biggest storm is still to come. Three more days, then the crew flies home.',
  },
];

/**
 * The set-up days. Each one brings a single new thing on line, with just
 * enough power to run what is there, so the first real shortage does not
 * arrive until the player has met every system.
 */
const SETUP_DAYS = {
  1: {
    blocks: 7,
    unlocked: ['lifeSupport', 'greenhouse'],
    news: {
      title: 'Landing day',
      text: 'Only half the solar panels are unfolded, so you have 7 blocks. Your crew needs two things to live: air and food. Give them power, then run the day.',
    },
  },
  2: {
    blocks: 10,
    unlocked: ['lifeSupport', 'greenhouse', 'science'],
    news: {
      title: 'The lab is unpacked',
      text: 'New today: Science Research. It is the reason you came. Give it blocks and the rover goes out to work. Collect enough science and the mission is a success.',
    },
  },
  3: {
    blocks: 11,
    unlocked: SYSTEM_IDS,
    news: {
      title: 'The digger is ready',
      text: 'New today: Shielding. The digger piles soil on the pod to block radiation, but each load only starts working tomorrow. For the first time there is not enough power for everything. You choose.',
    },
  },
};

/**
 * The training mission: three days, each teaching one thing.
 *
 *   day 1  air and food     7 blocks, exactly what the two of them need
 *   day 2  science          10 blocks, exactly enough for all three
 *   day 3  a solar flare    11 blocks, the storm room and the digger
 *
 * The first two days are the first two set-up days of a real mission, so
 * nothing learned here has to be unlearned. The third brings one real flare
 * forward, because a training that never shows a flare has not shown the
 * game. A guide with a voice walks the player through it (see ui/guide.js),
 * so the days carry no written news of their own.
 */
export const TRAINING_DAYS = 3;

const TRAINING_RULES = {
  1: { blocks: SETUP_DAYS[1].blocks, unlocked: SETUP_DAYS[1].unlocked, calm: true },
  2: { blocks: SETUP_DAYS[2].blocks, unlocked: SETUP_DAYS[2].unlocked, calm: true },
  3: { blocks: SETUP_DAYS[3].blocks, unlocked: SYSTEM_IDS, calm: false },
};

/** Days at the start of the mission with no storms and no hazards. */
export const CALM_DAYS = Math.max(...Object.keys(SETUP_DAYS).map(Number));

export function levelForDay(day) {
  return LEVELS.find((l) => day >= l.from && day <= l.to) || LEVELS[LEVELS.length - 1];
}

/**
 * Everything the level system decides about one day.
 *
 * @param {number} day  1-based mission day
 * @param {boolean} [training]  the three-day training mission
 * @returns {{
 *   level: typeof LEVELS[number],
 *   blocks: number,          power the panels make on a clear day
 *   unlocked: string[],      systems that can be given power today
 *   calm: boolean,           a set-up day: no storms, no hazards
 *   hazards: boolean,        can a bad-weather day cut the power today?
 *   news: ?{title: string, text: string},  what is new today, if anything
 * }}
 */
export function dayRules(day, training = false) {
  if (training) {
    const t = TRAINING_RULES[Math.min(day, TRAINING_DAYS)];
    return {
      level: LEVELS[0],
      blocks: t.blocks,
      unlocked: t.unlocked,
      calm: t.calm,
      hazards: false,
      news: null,
    };
  }

  const level = levelForDay(day);
  const setup = SETUP_DAYS[day];

  if (setup) {
    return {
      level,
      blocks: setup.blocks,
      unlocked: setup.unlocked,
      calm: true,
      hazards: false,
      news: setup.news,
    };
  }

  return {
    level,
    blocks: level.blocks,
    unlocked: SYSTEM_IDS,
    calm: false,
    hazards: level.hazards !== false,
    // The first day of a level announces it.
    news: day === level.from ? { title: `Level ${level.id}: ${level.name}`, text: level.intro } : null,
  };
}

/** When does a system come on line? Used to label a locked row. */
export function unlockDay(systemId) {
  const days = Object.keys(SETUP_DAYS).map(Number).sort((a, b) => a - b);
  for (const day of days) {
    if (SETUP_DAYS[day].unlocked.includes(systemId)) return day;
  }
  return 1;
}
