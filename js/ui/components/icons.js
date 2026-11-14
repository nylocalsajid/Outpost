/**
 * icons.js
 * -----------------------------------------------------------------------------
 * Inline SVG icon set. Inline so there is no second request and no icon font,
 * and so each icon inherits `currentColor` from its container.
 *
 * All icons are drawn on a 24x24 grid with a 2px stroke, which is why they sit
 * together consistently at any size.
 */

const ICONS = {
  lungs:
    '<path d="M12 4v8"/><path d="M8.5 12c0-2.5-1-3.5-2.2-3.5C4.9 8.5 4 10 4 13c0 3 .6 5.5 2.4 5.5 1.6 0 2.1-1.3 2.1-3.3z"/><path d="M15.5 12c0-2.5 1-3.5 2.2-3.5C19.1 8.5 20 10 20 13c0 3-.6 5.5-2.4 5.5-1.6 0-2.1-1.3-2.1-3.3z"/>',
  sprout:
    '<path d="M12 20v-7"/><path d="M12 13c0-3.3-2.7-6-6-6 0 3.3 2.7 6 6 6z"/><path d="M12 13c0-3.9 3.1-7 7-7 0 3.9-3.1 7-7 7z"/>',
  shield:
    '<path d="M12 3l7 3v5.5c0 4.2-2.9 8-7 9.5-4.1-1.5-7-5.3-7-9.5V6z"/>',
  flask:
    '<path d="M9 3h6"/><path d="M10 3v5.5L5.6 17A2.5 2.5 0 008 21h8a2.5 2.5 0 002.4-4L14 8.5V3"/><path d="M7.5 14h9"/>',
  heart:
    '<path d="M12 20s-7-4.3-7-9a4 4 0 017-2.6A4 4 0 0119 11c0 4.7-7 9-7 9z"/>',
  bolt: '<path d="M13 2L4 14h6l-1 8 9-12h-6z"/>',
  radiation:
    '<circle cx="12" cy="12" r="2.2"/><path d="M12 9.8V3a9 9 0 00-7.8 4.5l5.9 3.4"/><path d="M13.9 13.2l5.9 3.4A9 9 0 0020 7.5"/><path d="M10.1 13.2l-5.9 3.4A9 9 0 0012 21"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/>',
  alert:
    '<path d="M12 3l9 16H3z"/><path d="M12 9v5"/><circle cx="12" cy="17" r=".6" fill="currentColor" stroke="none"/>',
  check: '<path d="M4 12.5l5 5L20 6.5"/>',
  radio:
    '<circle cx="12" cy="12" r="2"/><path d="M8 8a5.6 5.6 0 000 8M16 8a5.6 5.6 0 010 8"/><path d="M5.2 5.2a9.6 9.6 0 000 13.6M18.8 5.2a9.6 9.6 0 010 13.6"/>',
  book:
    '<path d="M4 5.5A2.5 2.5 0 016.5 3H20v16H6.5A2.5 2.5 0 004 21.5z"/><path d="M4 18h16"/>',
  rocket:
    '<path d="M12 2c3 2.2 5 6 5 10l-5 4-5-4c0-4 2-7.8 5-10z"/><circle cx="12" cy="9" r="1.6"/><path d="M8 16l-2 5 4-2M16 16l2 5-4-2"/>',
  dust: '<path d="M3 8h11M6 12h13M4 16h9M15 16h4"/>',
  moon: '<path d="M20 13A8.5 8.5 0 019.5 3.5 8.5 8.5 0 1020 13z"/>',
  back: '<path d="M14 6l-6 6 6 6"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.8 3 2.8 15 0 18M12 3c-2.8 3-2.8 15 0 18"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 01-8 0z"/><path d="M8 6H5a3 3 0 003 4M16 6h3a3 3 0 01-3 4M12 13v4M8.5 20h7"/>',
  music: '<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>',
  sound: '<path d="M4 10v4h3.5L12 18V6l-4.5 4z"/><path d="M15.5 9a4 4 0 010 6M18 6.5a7.5 7.5 0 010 11"/>',
  leak: '<path d="M4 9h7M4 13h9M4 17h6"/><path d="M15 6l5 5-5 5"/>',
  mould: '<path d="M12 21V11"/><path d="M12 11C8 11 5 8 5 4c4 0 7 3 7 7zM12 14c0-3 2.5-5 6-5 0 3-2.5 5-6 5z"/><circle cx="8" cy="7" r=".8" fill="currentColor" stroke="none"/><circle cx="15.5" cy="11.5" r=".8" fill="currentColor" stroke="none"/>',
  quake: '<path d="M2 13h4l2-6 3 12 3-9 2 5 2-2h4"/>',
  find: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16l.7 1.8 1.8.7-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7z"/>',
  home: '<path d="M4 11l8-7 8 7"/><path d="M6 10v9h12v-9"/>',
  star: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9 6.8 19.7l1-5.9L3.5 9.7l5.9-.8z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><circle cx="12" cy="8" r=".7" fill="currentColor" stroke="none"/>',
  replay:
    '<path d="M3 12a9 9 0 019-9 9 9 0 018.5 6"/><path d="M21 3v6h-6"/><path d="M21 12a9 9 0 01-9 9 9 9 0 01-8.5-6"/><path d="M3 21v-6h6"/>',
};

/**
 * Render an icon.
 * @param {keyof ICONS} name
 * @param {{size?: number, label?: string}} [opts]
 * @returns {string} markup
 */
export function icon(name, { size = 20, label } = {}) {
  const body = ICONS[name];
  if (!body) return '';
  const a11y = label
    ? `role="img" aria-label="${label}"`
    : 'aria-hidden="true" focusable="false"';
  return (
    `<svg ${a11y} width="${size}" height="${size}" viewBox="0 0 24 24" ` +
    'fill="none" stroke="currentColor" stroke-width="2" ' +
    `stroke-linecap="round" stroke-linejoin="round">${body}</svg>`
  );
}

export const ICON_NAMES = Object.keys(ICONS);
