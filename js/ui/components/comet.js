/**
 * components/comet.js
 * -----------------------------------------------------------------------------
 * Comet, the crew's dog, as a face you can put next to a sentence.
 *
 * In the picture of the base Comet is a small figure among several. Here it is
 * the one who tells you things: it is next to every message from the base, it
 * is the one who notices when something has gone wrong, and it has an opinion
 * about how each day went. A child who cannot yet read the meters can read
 * the dog.
 *
 * Comet's suit carries the mission's own star, not a space agency's badge.
 */

const INK = '#16233f';

/**
 * @param {Object} [o]
 * @param {number} [o.size]                 pixels
 * @param {'happy'|'alert'|'worried'} [o.mood]
 * @returns {string} SVG markup
 */
export function cometFace({ size = 40, mood = 'happy' } = {}) {
  const earL =
    mood === 'alert'
      ? `<path d="M15.5 18.5 Q11 7.5 17.5 8 Q21 10.5 21.5 16Z" fill="#8a5a2b" stroke="${INK}" stroke-width="1"/>`
      : `<path d="M16 15.5 Q8.5 15.5 10 27 Q15.5 25.5 17.5 18.5Z" fill="#8a5a2b" stroke="${INK}" stroke-width="1"/>`;
  const earR =
    mood === 'alert'
      ? `<path d="M32.5 18.5 Q37 7.5 30.5 8 Q27 10.5 26.5 16Z" fill="#8a5a2b" stroke="${INK}" stroke-width="1"/>`
      : `<path d="M32 15.5 Q39.5 15.5 38 27 Q32.5 25.5 30.5 18.5Z" fill="#8a5a2b" stroke="${INK}" stroke-width="1"/>`;
  const brows =
    mood === 'worried'
      ? `<path d="M17 18.5 l4 -1.6 M31 18.5 l-4 -1.6" stroke="${INK}" stroke-width="1.1" stroke-linecap="round"/>`
      : '';
  const mouth =
    mood === 'happy'
      ? `<path d="M20 29.5 Q24 33.5 28 29.5" fill="none" stroke="${INK}" stroke-width="1.1" stroke-linecap="round"/>` +
        `<path d="M22.6 31.2 h2.8 v2.3 a1.4 1.4 0 0 1 -2.8 0z" fill="#ff7d8e" stroke="${INK}" stroke-width="0.7"/>`
      : mood === 'alert'
        ? `<ellipse cx="24" cy="31" rx="2.1" ry="1.7" fill="${INK}"/>`
        : `<path d="M20.5 31.5 Q24 29 27.5 31.5" fill="none" stroke="${INK}" stroke-width="1.1" stroke-linecap="round"/>`;

  return (
    `<svg class="comet comet--${mood}" viewBox="0 0 48 48" width="${size}" height="${size}" aria-hidden="true" focusable="false">` +
    // suit collar and star
    `<path d="M10 47 Q10 37 24 37 Q38 37 38 47Z" fill="#ff9d4d" stroke="${INK}" stroke-width="1.1"/>` +
    `<rect x="15" y="35" width="18" height="4.5" rx="2.2" fill="#aeb7c6" stroke="${INK}" stroke-width="1"/>` +
    `<path d="M24 40.6 l.9 1.9 2 .3 -1.5 1.4 .4 2 -1.8 -1 -1.8 1 .4 -2 -1.5 -1.4 2 -.3z" fill="#ffe066"/>` +
    // helmet
    `<circle cx="24" cy="21.5" r="18.5" fill="rgba(170,215,255,0.16)" stroke="#eef7ff" stroke-width="1.6"/>` +
    // head
    earL +
    earR +
    `<ellipse cx="24" cy="22" rx="9.6" ry="9.2" fill="#d9a066" stroke="${INK}" stroke-width="1.1"/>` +
    `<ellipse cx="24" cy="27.6" rx="6" ry="4.6" fill="#f1d3a8" stroke="${INK}" stroke-width="1"/>` +
    `<ellipse cx="24" cy="25.4" rx="2.1" ry="1.5" fill="${INK}"/>` +
    `<circle cx="19.6" cy="20.6" r="1.5" fill="${INK}"/><circle cx="28.4" cy="20.6" r="1.5" fill="${INK}"/>` +
    `<circle cx="20.1" cy="20.1" r="0.45" fill="#fff"/><circle cx="28.9" cy="20.1" r="0.45" fill="#fff"/>` +
    brows +
    mouth +
    // glint on the glass
    `<path d="M11 13.5 A15.5 15.5 0 0 1 20 5.6" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity="0.75"/>` +
    `</svg>`
  );
}

/**
 * Comet from the side, whole: suit, pack, star, bubble helmet. Drawn about
 * 32 units long with its feet on y = 0, so it can be scaled and placed by
 * whoever uses it (the picture of the base, the supply rocket).
 *
 * The parts carry class names (`buddy__tail`, `buddy__leg--a`, `buddy__head`)
 * that scene.css animates.
 *
 * @returns {string} SVG markup, without a wrapper
 */
export function cometBody() {
  const leg = (x, cls) =>
    `<g transform="translate(${x} -7)"><g class="buddy__leg ${cls}"><rect x="-1.7" y="0" width="3.4" height="7" rx="1.5" fill="#f1f4f9" stroke="${INK}" stroke-width="0.6"/><rect x="-1.9" y="5.2" width="3.8" height="1.9" rx="0.9" fill="#3d4d70"/></g></g>`;

  return (
    // tail
    `<g transform="translate(-9.5 -12)"><path class="buddy__tail" d="M0 0 Q-4 -3 -4.5 -8.5" fill="none" stroke="#ff9d4d" stroke-width="3" stroke-linecap="round"/></g>` +
    // far legs, then the body, then the near legs
    leg(-5.5, 'buddy__leg--b') +
    leg(6.5, 'buddy__leg--a') +
    `<rect x="-10.5" y="-15" width="20" height="9.4" rx="4.4" fill="#ff9d4d" stroke="${INK}" stroke-width="0.9"/>` +
    `<rect x="-7.5" y="-19" width="10" height="4.4" rx="1.8" fill="#dfe5ee" stroke="${INK}" stroke-width="0.7"/>` +
    `<circle cx="-2" cy="-10.3" r="2.9" fill="#20304f"/><path d="M-2 -12.4 l.65 1.4 1.5 .2 -1.1 1 .3 1.5 -1.35 -.75 -1.35 .75 .3 -1.5 -1.1 -1 1.5 -.2z" fill="#ffe066"/>` +
    leg(-8, 'buddy__leg--a') +
    leg(4, 'buddy__leg--b') +
    // neck ring and helmet
    `<rect x="7.4" y="-17.6" width="3.2" height="8.6" rx="1.5" fill="#aeb7c6" stroke="${INK}" stroke-width="0.6"/>` +
    `<g class="buddy__head">` +
    `<circle cx="14.2" cy="-17.4" r="8.2" fill="rgba(190,225,255,0.2)" stroke="#f1f8ff" stroke-width="1.3"/>` +
    `<circle cx="13.4" cy="-16.6" r="5" fill="#d9a066" stroke="${INK}" stroke-width="0.8"/>` +
    `<rect x="15.2" y="-16.8" width="6" height="4.2" rx="2" fill="#f1d3a8" stroke="${INK}" stroke-width="0.7"/>` +
    `<circle cx="20.4" cy="-15.6" r="1.15" fill="${INK}"/>` +
    `<circle cx="15" cy="-17.8" r="0.95" fill="${INK}"/>` +
    `<path d="M17 -13.4 q1.4 1.4 2.8 0" fill="none" stroke="${INK}" stroke-width="0.7" stroke-linecap="round"/>` +
    `<path d="M11.6 -21 Q7.4 -20.6 8.4 -14.4 Q11.4 -15.4 11.6 -21Z" fill="#8a5a2b" stroke="${INK}" stroke-width="0.6"/>` +
    `<path d="M9.4 -22.6 A8.2 8.2 0 0 1 16 -25.2" fill="none" stroke="#fff" stroke-width="1.2" stroke-linecap="round" opacity="0.7"/>` +
    `</g>`
  );
}
