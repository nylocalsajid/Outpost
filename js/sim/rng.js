/**
 * rng.js
 * -----------------------------------------------------------------------------
 * Seeded pseudo-random number generator (mulberry32).
 *
 * Why seeded: the hazards that are NOT real data -- horizon shadows, dust
 * storms, equipment faults -- still need to vary between playthroughs for
 * replayability. Seeding them means a mission is reproducible, so a player can
 * replay the exact same mission and try a different strategy, which is the
 * single most useful thing for learning a trade-off.
 */

/** @returns {() => number} a function producing floats in [0, 1) */
export function createRng(seed) {
  let a = (seed >>> 0) || 1;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A short, human-typeable seed, e.g. "7KQ2F". */
export function randomSeedCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 5; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

/** Turn a seed code back into a numeric seed. Stable across sessions. */
export function seedFromCode(code) {
  const s = String(code || '').toUpperCase();
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
