/**
 * main.js
 * -----------------------------------------------------------------------------
 * Entry point. Finds the mount node, starts the app, and reports failure in a
 * way a player can act on rather than a blank screen.
 */

import { createApp } from './ui/app.js';

const root = document.getElementById('app');

if (!root) {
  throw new Error('OUTPOST: #app mount node is missing from the document.');
}

/**
 * Register the service worker so the game works offline after one visit.
 * Entirely optional: if registration fails, or the page is served from
 * file://, the game runs exactly as before, just without offline support.
 */
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* offline support unavailable; not worth telling the player about */
    });
  });
}

try {
  const app = createApp(root);
  app.start();
} catch (error) {
  // A hard failure here means the game cannot run at all, so say so plainly
  // instead of leaving an empty page.
  console.error('OUTPOST failed to start:', error);
  root.innerHTML = `
    <div class="card card--danger" style="margin-top: 2rem">
      <h1>The outpost would not boot</h1>
      <p class="dim">
        Something went wrong starting the game. Reloading the page usually
        fixes it.
      </p>
      <p class="faint mono" style="font-size: 0.8rem">${String(error)}</p>
      <button class="btn btn--primary" onclick="location.reload()">
        Reload
      </button>
    </div>
  `;
}
