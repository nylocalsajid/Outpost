/**
 * sw.js — service worker
 * -----------------------------------------------------------------------------
 * Makes OUTPOST work with no connection after the first visit.
 *
 * This is not a technical flourish. The audience is school children, and a
 * large share of classrooms worldwide have intermittent or shared bandwidth.
 * A game that needs the network every time it loads is a game those children
 * play once. Caching the shell means a teacher can open it on twenty machines
 * on a bad connection, or load it once and run the lesson offline entirely.
 *
 * STRATEGY, and why it differs per request type:
 *
 *   App shell (HTML, CSS, JS)  -- network first, cache when offline.
 *                                 A new version of the game has to show up
 *                                 the first time it is loaded, not the second.
 *                                 Cache-first, which this used to be, starts
 *                                 a fraction faster but always shows the
 *                                 PREVIOUS version once after an update, and
 *                                 a player who reloads once never sees what
 *                                 changed. If the network is slow or missing
 *                                 the cached copy is used after a short wait,
 *                                 so the game is still playable offline.
 *
 *   NASA API calls             -- network only, NEVER cached.
 *                                 This is a correctness requirement, not an
 *                                 optimisation: caching DONKI responses would
 *                                 let the game show stale space weather while
 *                                 displaying a "LIVE" badge, which is exactly
 *                                 the dishonesty the project promises to avoid.
 *                                 Offline, the fetch fails and the game falls
 *                                 back to its clearly-labelled archive.
 *
 *   Rover imagery              -- cache on success, so a photo already seen
 *                                 survives offline. Images are immutable once
 *                                 published, so staleness is not a concern.
 */

const VERSION = 'outpost-v11';
const SHELL_CACHE = `${VERSION}-shell`;
const IMAGE_CACHE = `${VERSION}-images`;

const SHELL = [
  './',
  './index.html',
  './css/tokens.css',
  './css/base.css',
  './css/components.css',
  './css/screens.css',
  './css/scene.css',
  './fonts/archivo.woff2',
  './fonts/archivo-italic.woff2',
  './fonts/jetbrains-mono.woff2',
  './fonts/readex-pro-arabic.woff2',
  './js/main.js',
  './js/ui/app.js',
  './js/ui/dom.js',
  './js/ui/audio.js',
  './js/ui/voice.js',
  './js/ui/i18n.js',
  './js/ui/guide.js',
  './js/i18n/ar.js',
  './js/ui/components/icons.js',
  './js/ui/components/meter.js',
  './js/ui/components/comet.js',
  './js/ui/components/allocator.js',
  './js/ui/components/source-tag.js',
  './js/ui/components/chart.js',
  './js/ui/components/outpost-scene.js',
  './js/ui/screens/title.js',
  './js/ui/screens/site-select.js',
  './js/ui/screens/sol.js',
  './js/ui/screens/resolve.js',
  './js/ui/screens/debrief.js',
  './js/ui/screens/sources.js',
  './js/ui/screens/how-to-play.js',
  './js/ui/screens/menu.js',
  './js/ui/screens/supply.js',
  './js/ui/screens/trained.js',
  './js/ui/screens/welcome.js',
  './js/sim/state.js',
  './js/sim/engine.js',
  './js/sim/scoring.js',
  './js/sim/rng.js',
  './js/config/sites.js',
  './js/config/systems.js',
  './js/config/levels.js',
  './js/config/events.js',
  './js/config/upgrades.js',
  './js/config/training.js',
  './js/config/science-notes.js',
  './js/config/experiments.js',
  './js/data/nasa-sources.js',
  './js/data/archive.js',
  './js/data/nasa-client.js',
  './js/data/space-weather.js',
  './js/data/persistence.js',
];

/* ------------------------------------------------------------------ install */

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      // addAll fails the whole install if any single file 404s, which would
      // leave the game uncacheable. Add individually and tolerate misses.
      .then((cache) =>
        Promise.all(
          SHELL.map((url) =>
            cache.add(new Request(url, { cache: 'reload' })).catch(() => null)
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

/* ----------------------------------------------------------------- activate */

self.addEventListener('activate', (event) => {
  const activated = caches
    .keys()
    .then((keys) => {
      const stale = keys.filter((key) => !key.startsWith(VERSION));
      return Promise.all(stale.map((key) => caches.delete(key))).then(
        () => stale.length > 0
      );
    })
    .then((wasUpdate) => self.clients.claim().then(() => wasUpdate));

  event.waitUntil(activated);

  // An older version of the game was running in this tab: reload it, so the
  // player is looking at the new one straight away rather than at whatever
  // the old worker handed over before it was replaced.
  //
  // This is deliberately NOT part of waitUntil. A page load waits for this
  // worker to finish activating, so making activation wait for the page load
  // would leave each waiting for the other, and the tab would hang.
  activated
    .then((wasUpdate) => {
      if (!wasUpdate) return null;
      return self.clients.matchAll({ type: 'window' }).then((tabs) => {
        tabs.forEach((tab) => {
          tab.navigate(tab.url).catch(() => null);
        });
      });
    })
    .catch(() => null);
});

/* -------------------------------------------------------------------- fetch */

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // NASA data endpoints: never cached. See the note at the top of this file.
  if (
    url.hostname === 'api.nasa.gov' ||
    url.hostname === 'osdr.nasa.gov' ||
    url.pathname.includes('/DONKI/')
  ) {
    return; // let the network handle it, and let it fail honestly when offline
  }

  // Rover imagery: cache after a successful fetch.
  if (/\.(jpg|jpeg|png|gif|webp)$/i.test(url.pathname) && url.origin !== self.location.origin) {
    event.respondWith(cacheOnSuccess(request, IMAGE_CACHE));
    return;
  }

  // Everything of our own: the network's copy if we can get it, so an
  // updated game is seen at once; the cached copy if we cannot.
  if (url.origin === self.location.origin) {
    event.respondWith(networkFirst(request));
  }
});

/** How long to wait for the network before falling back to the cache. */
const NETWORK_WAIT_MS = 2500;

async function networkFirst(request) {
  const cache = await caches.open(SHELL_CACHE);

  // Fetched by URL, not by handing the original request on: a page-load
  // request cannot be re-issued with options, and `no-cache` is the option
  // that matters here. It makes the browser check with the server instead of
  // trusting its own stored copy, which is the other place an old build hides.
  const fromNetwork = fetch(request.url, {
    cache: 'no-cache',
    credentials: 'same-origin',
  }).then((response) => {
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  });

  try {
    const response = await Promise.race([
      fromNetwork,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('slow network')), NETWORK_WAIT_MS)
      ),
    ]);
    if (response && response.ok) return response;
    throw new Error('bad response');
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    // Nothing cached: give the slow network its chance after all.
    try {
      return await fromNetwork;
    } catch {
      if (request.mode === 'navigate') {
        const shell = await caches.match('./index.html');
        if (shell) return shell;
      }
      return new Response('Offline and not cached.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain' },
      });
    }
  }
}

async function cacheOnSuccess(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && (response.ok || response.type === 'opaque')) {
      const copy = response.clone();
      caches.open(cacheName).then((cache) => cache.put(request, copy));
    }
    return response;
  } catch {
    return new Response('', { status: 504 });
  }
}
