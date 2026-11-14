/**
 * space-weather.js
 * -----------------------------------------------------------------------------
 * Turns real solar flare records into a mission timeline: one entry per mission
 * day, each either quiet or carrying a real flare.
 *
 * This is the module that makes the central claim of the project true -- that
 * the storms a player survives actually happened. It tries live DONKI first and
 * falls back to the embedded archive, and it always reports which one it used so
 * the UI can badge it honestly.
 */

import { fetchDonkiFlares } from './nasa-client.js';
import { ARCHIVE_FLARES, ARCHIVE_WINDOW } from './archive.js';
import { sepDoseForClass, flareSeverity } from '../config/systems.js';
import { CALM_DAYS } from '../config/levels.js';

/**
 * @typedef {Object} TimelineDay
 * @property {number}  day        1-based mission day
 * @property {?Object} flare      real flare record, or null on a quiet day
 * @property {number}  sepDose    modelled unshielded SEP dose in mSv
 * @property {string}  severity   'none' | 'minor' | 'moderate' | 'severe' | 'extreme'
 */

/**
 * @typedef {Object} SpaceWeather
 * @property {'live'|'archive'} mode
 * @property {TimelineDay[]} timeline
 * @property {string} windowLabel
 * @property {?string} fetchedAt
 * @property {?string} failureReason  why live was unavailable, if it was
 * @property {number} flareCount
 */

/**
 * Build the mission timeline.
 *
 * @param {Object}  opts
 * @param {number}  opts.missionDays
 * @param {boolean} [opts.preferLive=true]
 * @returns {Promise<SpaceWeather>}
 */
export async function loadSpaceWeather({ missionDays, preferLive = true }) {
  if (preferLive) {
    const live = await fetchDonkiFlares({ days: 60 });
    if (live.ok && live.flares.length) {
      return {
        mode: 'live',
        timeline: buildTimeline(live.flares, missionDays),
        windowLabel: `${live.window.startDate} to ${live.window.endDate}`,
        fetchedAt: live.fetchedAt,
        failureReason: null,
        flareCount: live.flares.length,
        sourceNote:
          'Fetched live from NASA’s DONKI space weather database just now.',
      };
    }
    return {
      ...archiveWeather(missionDays),
      failureReason: live.ok ? 'no-flares-in-window' : live.reason,
    };
  }
  return archiveWeather(missionDays);
}

/** The offline path: the embedded, clearly-labelled May 2024 dataset. */
export function archiveWeather(missionDays) {
  return {
    mode: 'archive',
    timeline: buildTimeline(ARCHIVE_FLARES, missionDays),
    windowLabel: `${ARCHIVE_WINDOW.startDate} to ${ARCHIVE_WINDOW.endDate}`,
    fetchedAt: null,
    failureReason: null,
    flareCount: ARCHIVE_FLARES.length,
    sourceNote: `Stored records from ${ARCHIVE_WINDOW.label}. Real events, recorded at the time — not live.`,
  };
}

/**
 * The Sun for the three-day training mission: two quiet days, then one real
 * flare. It is the first X-class flare in the archive, brought forward: big
 * enough that sheltering visibly matters, and still a genuine NASA record, so
 * the guide can say so truthfully.
 */
export function trainingWeather() {
  const archive = archiveWeather(TRAINING_SOURCE_DAYS);
  const flareDay =
    archive.timeline.find(
      (d) => isStormDay(d) && String(d.flare.classType).toUpperCase().startsWith('X')
    ) || archive.timeline.find((d) => isStormDay(d));
  const quiet = (day) => ({ day, flare: null, sepDose: 0, severity: 'none' });

  return {
    ...archive,
    timeline: [quiet(1), quiet(2), flareDay ? { ...flareDay, day: 3 } : quiet(3)],
  };
}

/** The archive is laid out over a full mission before one flare is borrowed. */
const TRAINING_SOURCE_DAYS = 14;

/**
 * Distribute real flares across mission days, preserving their real order and
 * their real spacing as closely as the mission length allows.
 *
 * Flares are bucketed by calendar date so that two flares on the same real day
 * land on the same mission day, and the quiet stretches between them stay quiet.
 */
function buildTimeline(flares, missionDays) {
  const byDate = new Map();
  for (const f of flares) {
    const date = String(f.beginTime).slice(0, 10);
    // Keep the strongest flare of each day: that is the one that would drive
    // the crew's decision.
    const existing = byDate.get(date);
    if (!existing || sepDoseForClass(f.classType) > sepDoseForClass(existing.classType)) {
      byDate.set(date, f);
    }
  }

  const dates = [...byDate.keys()].sort();
  const timeline = Array.from({ length: missionDays }, (_, i) => ({
    day: i + 1,
    flare: null,
    sepDose: 0,
    severity: 'none',
  }));

  if (!dates.length) return timeline;

  // Map the real date span onto the mission span, keeping relative spacing.
  const first = Date.parse(dates[0]);
  const last = Date.parse(dates[dates.length - 1]);
  const span = Math.max(1, (last - first) / 86400000);

  // The set-up days at the start of the mission are kept quiet, so a player
  // has met every system before the first flare. The real records keep their
  // real order and spacing across the days after that.
  const firstStormDay = Math.min(missionDays, CALM_DAYS + 1);

  for (const date of dates) {
    const offset = (Date.parse(date) - first) / 86400000;
    const slot =
      firstStormDay + Math.round((offset / span) * (missionDays - firstStormDay));
    const index = Math.min(missionDays, Math.max(firstStormDay, slot)) - 1;

    const flare = byDate.get(date);
    const dose = sepDoseForClass(flare.classType);

    // If two real dates collide on one mission day, keep the stronger and push
    // the weaker to the next free day so no real event is silently dropped.
    let target = index;
    while (target < missionDays && timeline[target].flare) {
      if (dose > timeline[target].sepDose) break;
      target += 1;
    }
    if (target >= missionDays) continue;

    if (timeline[target].flare && dose > timeline[target].sepDose) {
      const displaced = timeline[target].flare;
      const displacedDose = timeline[target].sepDose;
      assign(timeline, target, flare, dose);
      // Try to re-home the displaced event.
      let alt = target + 1;
      while (alt < missionDays && timeline[alt].flare) alt += 1;
      if (alt < missionDays) assign(timeline, alt, displaced, displacedDose);
    } else {
      assign(timeline, target, flare, dose);
    }
  }

  return timeline;
}

function assign(timeline, index, flare, dose) {
  timeline[index].flare = flare;
  timeline[index].sepDose = dose;
  timeline[index].severity = flareSeverity(flare.classType);
}

/** Does this mission day carry a flare the crew should react to? */
export function isStormDay(timelineDay) {
  return Boolean(timelineDay && timelineDay.flare && timelineDay.sepDose > 0);
}

/**
 * Plain-language warning text for a storm day, written for a 7-12 year old but
 * carrying the real numbers.
 */
export function describeFlare(timelineDay) {
  if (!isStormDay(timelineDay)) return null;
  const f = timelineDay.flare;
  const when = String(f.beginTime).replace('T', ' at ').replace('Z', ' UTC');
  const region = f.activeRegionNum ? `sunspot group ${f.activeRegionNum}` : 'a sunspot group';
  return {
    headline: `${f.classType} solar flare`,
    severity: timelineDay.severity,
    detail: `The Sun fired off a ${f.classType} flare from ${region} on ${when}.`,
    plainMeaning: plainFlareMeaning(f.classType),
    note: f.note || null,
    verbatim: Boolean(f.verbatim),
    record: f,
  };
}

function plainFlareMeaning(classType) {
  const letter = String(classType || '').charAt(0).toUpperCase();
  const scale = parseFloat(String(classType || '').slice(1)) || 1;
  if (letter === 'X' && scale >= 5) {
    return 'X-class is the strongest kind of flare, and this one is a big X. A wave of fast-moving particles is heading your way.';
  }
  if (letter === 'X') {
    return 'X-class flares are the strongest kind. Each letter step — C, M, X — is ten times more powerful than the one before.';
  }
  if (letter === 'M') {
    return 'M-class is the middle size. Not the worst, but enough to matter if you are standing outside with a thin shield.';
  }
  return 'A small flare. Worth noticing, not worth panicking about.';
}
