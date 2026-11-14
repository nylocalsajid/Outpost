/**
 * persistence.js
 * -----------------------------------------------------------------------------
 * Saving a mission in progress to the player's own browser.
 *
 * Why this matters more than it looks: the target audience is children, often
 * on a shared classroom machine, often interrupted by a bell. Losing a mission
 * because a tab closed is the single most likely reason a child never reaches
 * the debrief -- and the debrief is where the whole lesson lands.
 *
 * Everything here is best-effort. Storage can be full, blocked, or disabled in
 * private browsing; in every one of those cases the game carries on without
 * saving rather than failing.
 */

const SAVE_KEY = 'outpost.mission';
/** Bumped when the rules change enough that an old save would not make sense:
 *  v3 is the four-level, 14-day mission with events and supply rockets. */
const SAVE_VERSION = 3;

/**
 * Persist a mission in progress.
 * @param {import('../sim/state.js').MissionState} mission
 * @param {{seedCode: string}} [meta]
 */
export function saveMission(mission) {
  if (!mission || mission.over) {
    clearMission();
    return false;
  }
  try {
    const payload = {
      version: SAVE_VERSION,
      savedAt: new Date().toISOString(),
      mission,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

/**
 * Read a saved mission, if one exists and is still compatible.
 * A save written by an older version of the game is discarded rather than
 * loaded, because the simulation's shape may have changed under it.
 *
 * @returns {{mission: Object, savedAt: string} | null}
 */
export function loadMission() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;

    const payload = JSON.parse(raw);
    if (!payload || payload.version !== SAVE_VERSION) {
      clearMission();
      return null;
    }

    const m = payload.mission;
    if (!m || typeof m.day !== 'number' || !m.siteId || m.over) {
      clearMission();
      return null;
    }

    // Fields added after a save was written must not come back undefined.
    m.experiments = m.experiments || [];
    m.researchProgress = m.researchProgress || 0;
    m.log = m.log || [];
    m.upgrades = m.upgrades || [];

    return { mission: m, savedAt: payload.savedAt };
  } catch {
    clearMission();
    return null;
  }
}

export function clearMission() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* nothing to do: the save simply stays until the browser clears it */
  }
}

export function hasSavedMission() {
  return loadMission() !== null;
}

/* ------------------------------------------------------------ first-run guide */

const GUIDE_KEY = 'outpost.guideSeen';

/** Has this browser already been walked through its first day? */
export function hasSeenGuide() {
  try {
    return localStorage.getItem(GUIDE_KEY) === '1';
  } catch {
    return false;
  }
}

export function markGuideSeen() {
  try {
    localStorage.setItem(GUIDE_KEY, '1');
  } catch {
    // Storage blocked: the guide simply shows again next time.
  }
}


/* ---------------------------------------------------------------- best scores */

const SCORES_KEY = 'outpost.scores';
const SCORES_KEPT = 10;

/**
 * Every finished mission is kept (the best ten per world), so a player can
 * see what they reached last time and whether they beat it.
 *
 * @typedef {Object} ScoreEntry
 * @property {string} siteId
 * @property {string} seedCode
 * @property {number} total
 * @property {number} science
 * @property {number} health
 * @property {number} daysSurvived
 * @property {number} stars        0 to 3
 * @property {string} tier
 * @property {string} at           ISO date
 */

/** @returns {ScoreEntry[]} best first */
export function loadScores() {
  try {
    const list = JSON.parse(localStorage.getItem(SCORES_KEY) || '[]');
    return Array.isArray(list) ? list.filter((e) => e && typeof e.total === 'number') : [];
  } catch {
    return [];
  }
}

/** The best score at one world, or across both. Null if none yet. */
export function bestScore(siteId = null) {
  const list = loadScores().filter((e) => !siteId || e.siteId === siteId);
  return list.length ? list.reduce((best, e) => (e.total > best.total ? e : best)) : null;
}

/**
 * Record a finished mission.
 * @returns {{previousBest: ?ScoreEntry, isBest: boolean}} how it compares
 *          with the best at the same world BEFORE this one was added
 */
export function saveScore(entry) {
  const previousBest = bestScore(entry.siteId);
  const isBest = !previousBest || entry.total > previousBest.total;
  try {
    const all = loadScores();
    all.push(entry);
    // Best ten per world.
    const kept = [];
    for (const siteId of new Set(all.map((e) => e.siteId))) {
      kept.push(
        ...all
          .filter((e) => e.siteId === siteId)
          .sort((a, b) => b.total - a.total)
          .slice(0, SCORES_KEPT)
      );
    }
    localStorage.setItem(SCORES_KEY, JSON.stringify(kept));
  } catch {
    /* a score that is not kept is not worth interrupting the result for */
  }
  return { previousBest, isBest };
}

/* ----------------------------------------------------------- small preferences */

function readFlag(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeFlag(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* the choice simply lasts for this visit */
  }
}

/** The language the player chose: 'en', 'ar', or null if never asked. */
export function savedLanguage() {
  const v = readFlag('outpost.lang');
  return v === 'en' || v === 'ar' ? v : null;
}

export function saveLanguage(lang) {
  writeFlag('outpost.lang', lang);
}

/** Has the player been through (or turned down) the training mission? */
export function hasBeenWelcomed() {
  return readFlag('outpost.welcomed') === '1';
}

export function markWelcomed() {
  writeFlag('outpost.welcomed', '1');
}

/** Is the spoken guide switched on? On unless the player turned it off. */
export function isVoiceWanted() {
  return readFlag('outpost.voice') !== '0';
}

export function saveVoiceWanted(on) {
  writeFlag('outpost.voice', on ? '1' : '0');
}
