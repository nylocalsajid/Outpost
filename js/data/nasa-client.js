/**
 * nasa-client.js
 * -----------------------------------------------------------------------------
 * Thin, isolated access layer for NASA's public APIs. Nothing else in the code
 * base knows that HTTP exists.
 *
 * All calls run in the PLAYER'S browser against api.nasa.gov / osdr.nasa.gov,
 * both of which send permissive CORS headers. Every call is:
 *   - time-boxed (so a slow network can never hang the game),
 *   - fail-soft (returns {ok:false, reason} instead of throwing),
 *   - cached in sessionStorage (so replays do not re-hit the rate limit).
 *
 * The game calls NASA with Team Sajid's own free key from https://api.nasa.gov/.
 * A NASA key is not a secret: it identifies the caller and carries an hourly
 * limit, and anyone can read it in this file. If the limit is reached, the
 * game says so and plays the stored archive instead. A player can paste a key
 * of their own on the sources page; it is kept in their browser only.
 */

const API_ROOT = 'https://api.nasa.gov';
const OSDR_SEARCH = 'https://osdr.nasa.gov/osdr/data/search';
const KEY_STORAGE = 'outpost.nasaApiKey';
const CACHE_PREFIX = 'outpost.cache.';
const DEFAULT_TIMEOUT_MS = 8000;
const TEAM_KEY = 'W9d9k8thWN8kLPgFrrMLfqbmHrGbbwqhG6bHzPfQ';

/* ------------------------------------------------------------------ api key */

export function getApiKey() {
  try {
    return localStorage.getItem(KEY_STORAGE) || TEAM_KEY;
  } catch {
    return TEAM_KEY;
  }
}

export function setApiKey(key) {
  const clean = String(key || '').trim();
  try {
    if (clean) localStorage.setItem(KEY_STORAGE, clean);
    else localStorage.removeItem(KEY_STORAGE);
  } catch {
    /* private browsing: key simply is not persisted */
  }
}

/** Has the player pasted a key of their own? */
export function usingOwnKey() {
  return getApiKey() !== TEAM_KEY;
}

/* ------------------------------------------------------------------- caching */

function cacheGet(key) {
  try {
    const raw = sessionStorage.getItem(CACHE_PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function cacheSet(key, value) {
  try {
    sessionStorage.setItem(CACHE_PREFIX + key, JSON.stringify(value));
  } catch {
    /* storage full or blocked: caching is an optimisation, not a requirement */
  }
}

/* ---------------------------------------------------------------- transport */

async function getJson(url, { timeout = DEFAULT_TIMEOUT_MS } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (res.status === 429) {
      return { ok: false, reason: 'rate-limited' };
    }
    if (!res.ok) {
      return { ok: false, reason: `http-${res.status}` };
    }
    const data = await res.json();
    return { ok: true, data };
  } catch (err) {
    const reason = err && err.name === 'AbortError' ? 'timeout' : 'network';
    return { ok: false, reason };
  } finally {
    clearTimeout(timer);
  }
}

/* -------------------------------------------------------------------- dates */

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

/** A window ending today, `days` long. DONKI indexes by calendar date. */
export function recentWindow(days = 30) {
  const end = new Date();
  const start = new Date(end.getTime() - days * 86400000);
  return { startDate: isoDate(start), endDate: isoDate(end) };
}

/* ------------------------------------------------------- DONKI solar flares */

/**
 * Fetch real solar flare records from DONKI.
 * @returns {Promise<{ok:true, flares:Array, window:Object, fetchedAt:string}
 *                  | {ok:false, reason:string}>}
 */
export async function fetchDonkiFlares({ days = 60 } = {}) {
  const window = recentWindow(days);
  const cacheKey = `donki-flr-${window.startDate}-${window.endDate}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const url =
    `${API_ROOT}/DONKI/FLR?startDate=${window.startDate}` +
    `&endDate=${window.endDate}&api_key=${encodeURIComponent(getApiKey())}`;

  const res = await getJson(url);
  if (!res.ok) return res;
  if (!Array.isArray(res.data)) return { ok: false, reason: 'unexpected-shape' };

  const flares = res.data
    .map(normaliseDonkiFlare)
    .filter((f) => f && f.classType)
    .sort((a, b) => a.beginTime.localeCompare(b.beginTime));

  const payload = {
    ok: true,
    flares,
    window,
    fetchedAt: new Date().toISOString(),
  };
  cacheSet(cacheKey, payload);
  return payload;
}

/** Map a raw DONKI FLR record onto the shape the rest of the game expects. */
function normaliseDonkiFlare(raw) {
  if (!raw || !raw.beginTime) return null;
  const region =
    raw.activeRegionNum != null ? Number(raw.activeRegionNum) : null;
  return {
    activityId: raw.flrID || null,
    beginTime: raw.beginTime,
    peakTime: raw.peakTime || null,
    endTime: raw.endTime || null,
    classType: raw.classType || null,
    sourceLocation: raw.sourceLocation || null,
    activeRegionNum: region,
    catalog: raw.catalog || 'M2M_CATALOG',
    linkedCME:
      Array.isArray(raw.linkedEvents) && raw.linkedEvents.length
        ? raw.linkedEvents[0].activityID
        : null,
    instrument:
      Array.isArray(raw.instruments) && raw.instruments.length
        ? raw.instruments[0].displayName
        : null,
    verbatim: true,
    note: null,
  };
}

/* ---------------------------------------------------- Mars rover photography */

/**
 * One real Curiosity photo, used as the Mars outpost backdrop.
 * Deliberately requests an older sol: recent sols are sometimes not yet
 * published, and an empty result would mean no picture.
 */
export async function fetchMarsPhoto({ sol = 1000, camera = 'NAVCAM' } = {}) {
  const cacheKey = `mars-photo-${sol}-${camera}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const url =
    `${API_ROOT}/mars-photos/api/v1/rovers/curiosity/photos?sol=${sol}` +
    `&camera=${camera}&page=1&api_key=${encodeURIComponent(getApiKey())}`;

  const res = await getJson(url);
  if (!res.ok) return res;

  const photos = (res.data && res.data.photos) || [];
  if (!photos.length) return { ok: false, reason: 'no-photos' };

  const pick = photos[Math.floor(photos.length / 2)];
  const payload = {
    ok: true,
    photo: {
      url: pick.img_src,
      sol: pick.sol,
      earthDate: pick.earth_date,
      camera: pick.camera && pick.camera.full_name,
      rover: pick.rover && pick.rover.name,
    },
    fetchedAt: new Date().toISOString(),
  };
  cacheSet(cacheKey, payload);
  return payload;
}

/* ----------------------------------------------------------- OSDR biology */

/**
 * Keyword search against the NASA Open Science Data Repository.
 * Used by the in-game Science Library so the health findings players read are
 * real published NASA studies rather than flavour text.
 */
export async function searchOsdr(term, { limit = 5 } = {}) {
  const cacheKey = `osdr-${term}-${limit}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const url = `${OSDR_SEARCH}?term=${encodeURIComponent(term)}&size=${limit}`;
  const res = await getJson(url);
  if (!res.ok) return res;

  const hits =
    (res.data && res.data.hits && res.data.hits.hits) ||
    (res.data && res.data.hits) ||
    [];

  const studies = (Array.isArray(hits) ? hits : [])
    .map((h) => {
      const src = h._source || h;
      return {
        accession:
          src['Accession'] || src.accession || src['Study Identifier'] || null,
        title:
          src['Study Title'] || src.title || src['Project Title'] || null,
        organism: src['organism'] || src['Organism'] || null,
      };
    })
    .filter((s) => s.title);

  if (!studies.length) return { ok: false, reason: 'no-results' };

  const payload = { ok: true, studies, fetchedAt: new Date().toISOString() };
  cacheSet(cacheKey, payload);
  return payload;
}
