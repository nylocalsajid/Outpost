/**
 * events.js
 * -----------------------------------------------------------------------------
 * The things that go wrong (and occasionally right) on a day with no flare.
 *
 * WHY THESE EXIST. A solar storm teaches one lesson: build the shield early.
 * If storms were the only trouble, a player would learn one habit and repeat
 * it. Each event here leans on a DIFFERENT system, so the same ten blocks
 * have to be thought about a different way:
 *
 *   air leak        life support needs more than usual today
 *   mould           the greenhouse needs more than usual today
 *   quake           the shield loses soil unless the digger puts it back
 *   lucky find      science is worth double, if you can spare the power
 *   dust devil      the panels are swept clean: more power, on Mars
 *
 * WHAT IS REAL AND WHAT IS NOT. Every one of these has happened to a real
 * mission, and `real` says where. The SIZE of the effect in blocks or
 * centimetres is game balance, chosen so that each event is worth about two
 * blocks of power: enough to change a plan, not enough to end a mission.
 *
 * An event never lands on a set-up day, never on a storm day and never on a
 * bad-weather day. One problem at a time.
 */

import { createRng } from '../sim/rng.js';

export const EVENTS = {
  leak: {
    id: 'leak',
    /** The row this event is about, for highlighting. */
    system: 'lifeSupport',
    fromLevel: 2,
    label: () => 'Air leak',
    text: () =>
      'A speck of rock has punched a pinhole in the pod, and air is hissing out. Life support needs 2 more blocks than usual today.',
    real: () =>
      'The International Space Station has sprung small air leaks more than once. Each time the crew had to hunt down the hole and patch it.',
    demandExtra: { lifeSupport: 2 },
    comet: () => 'Comet is barking at the pod wall. Listen: a hiss!',
    todo: () => 'Give life support 2 more blocks today. You will have to take them from something else.',
  },

  blight: {
    id: 'blight',
    system: 'greenhouse',
    fromLevel: 3,
    label: () => 'Mould in the greenhouse',
    text: () =>
      'Mould is spreading on the leaves. Extra light and warm, dry air will beat it: the greenhouse needs 2 more blocks than usual today.',
    real: () =>
      'In 2015 mould grew on the zinnias in the space station’s Veggie garden. Astronaut Scott Kelly nursed them back, and they flowered.',
    demandExtra: { greenhouse: 2 },
    comet: () => 'Comet will not stop sniffing the greenhouse door. Something smells wrong.',
    todo: () => 'Give the greenhouse 2 more blocks today, or you will lose food.',
  },

  quake: {
    id: 'quake',
    system: 'shielding',
    fromLevel: 3,
    /** Only worth having when there is soil to lose. */
    when: (state) => state.shieldCm >= 36,
    label: (site) => (site.id === 'moon' ? 'Moonquake' : 'Marsquake'),
    text: (site) =>
      `The ground is shaking, and soil is sliding off the pod. By tonight your shield will have lost 16 cm, unless the digger piles it back. ${
        site.id === 'moon' ? 'Moonquakes' : 'Marsquakes'
      } do no other harm.`,
    real: (site) =>
      site.id === 'moon'
        ? 'Instruments left by the Apollo astronauts recorded thousands of moonquakes. Some went on for ten minutes.'
        : 'NASA’s InSight lander recorded more than 1,300 marsquakes in four years on Mars.',
    shieldLossCm: 16,
    comet: () => 'Comet’s ears went up, and then the ground began to shake.',
    todo: () => 'Soil is sliding off your shield. Give shielding some blocks to pile it back.',
  },

  find: {
    id: 'find',
    system: 'science',
    fromLevel: 2,
    label: () => 'A lucky find',
    text: (site) =>
      site.id === 'moon'
        ? 'The rover has spotted ice glinting in a shadowed hollow. Every block of science research counts double today.'
        : 'The rover has spotted a rock with odd rings in it, right by the base. Every block of science research counts double today.',
    real: (site) =>
      site.id === 'moon'
        ? 'Water ice really is there: NASA’s LCROSS mission found it in a permanently shadowed crater near the south pole in 2009.'
        : 'Perseverance collects rocks like this in Jezero crater, because they could hold signs of ancient life.',
    scienceFactor: 2,
    comet: (site) =>
      site.id === 'moon'
        ? 'Comet is pulling the rover towards something shiny in the shadows.'
        : 'Comet has dug up a very odd rock and is very proud of it.',
    todo: () => 'Science research counts double today. Give it every block you can spare.',
  },

  devil: {
    id: 'devil',
    system: 'power',
    fromLevel: 3,
    sites: ['mars'],
    /** Only worth having when there is dust to clean off. */
    when: (state) => state.dust >= 0.1,
    label: () => 'Dust devil',
    text: () =>
      'A whirlwind has swept across your solar panels and blown the dust off. They make full power today, and start clean tomorrow.',
    real: () =>
      'This saved real missions: dust devils cleaned the panels of the Spirit and Opportunity rovers again and again, giving them years more power.',
    cleansPanels: true,
    comet: () => 'Comet chased a whirlwind right across the solar panels.',
    todo: () => 'Your panels are clean, so you have more power. Spend the extra blocks well.',
  },
};

/** How likely a clear day is to bring an event, by level. */
const CHANCE = { 2: 1, 3: 1, 4: 1 };

/**
 * Which event, if any, happens today.
 *
 * Deterministic: the same mission seed and day always give the same answer,
 * so a replay meets the same trouble.
 *
 * @param {Object} opts
 * @param {import('../sim/state.js').MissionState} opts.state
 * @param {Object} opts.site
 * @param {{level: {id: number}, calm: boolean}} opts.rules
 * @param {boolean} opts.busy  is there already a storm or bad weather today?
 * @returns {?{id: string, system: string, label: string, text: string, real: string,
 *            demandExtra?: Object, shieldLossCm?: number, scienceFactor?: number,
 *            cleansPanels?: boolean}}
 */
export function pickEvent({ state, site, rules, busy }) {
  if (rules.calm || busy) return null;

  const rng = createRng(state.seed + state.day * 104729);
  if (rng() > (CHANCE[rules.level.id] ?? 0)) return null;

  const pool = Object.values(EVENTS).filter(
    (e) =>
      e.fromLevel <= rules.level.id &&
      (!e.sites || e.sites.includes(site.id)) &&
      (!e.when || e.when(state))
  );
  if (!pool.length) return null;

  // Something this mission has not met yet, while there is anything left:
  // there are only a handful of storm-free days, and the point is variety.
  const met = new Set(state.log.map((entry) => entry.event).filter(Boolean));
  const fresh = pool.filter((e) => !met.has(e.id));
  const from = fresh.length ? fresh : pool;

  let index = Math.floor(rng() * from.length) % from.length;

  // And never the same thing two days running.
  const last = state.log.length ? state.log[state.log.length - 1].event : null;
  if (from.length > 1 && from[index].id === last) index = (index + 1) % from.length;

  const e = from[index];
  return {
    id: e.id,
    system: e.system,
    label: e.label(site),
    text: e.text(site),
    real: e.real(site),
    comet: e.comet(site),
    todo: e.todo(site),
    demandExtra: e.demandExtra || null,
    shieldLossCm: e.shieldLossCm || 0,
    scienceFactor: e.scienceFactor || 1,
    cleansPanels: Boolean(e.cleansPanels),
  };
}
