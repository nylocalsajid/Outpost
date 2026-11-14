/**
 * dom.js
 * -----------------------------------------------------------------------------
 * Minimal DOM utilities. No framework, no build step.
 *
 * The pattern used throughout the UI:
 *   - a screen module exports `render(ctx) -> html string`
 *   - the app mounts that string once
 *   - interaction is handled by ONE delegated listener reading [data-action]
 *
 * That keeps every screen a pure function of state, which is why there are no
 * scattered querySelector calls or stray event listeners anywhere in this
 * code base.
 */

import { tr } from './i18n.js';

/** Escape text for safe interpolation into markup. */
export function esc(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Tagged template that escapes every interpolated value by default.
 * Use `raw()` to opt a trusted fragment out of escaping.
 */
export function html(strings, ...values) {
  return strings.reduce((out, str, i) => {
    if (i === 0) return str;
    const v = values[i - 1];
    return out + serialise(v) + str;
  }, '');
}

function serialise(v) {
  if (v == null || v === false) return '';
  if (Array.isArray(v)) return v.map(serialise).join('');
  if (typeof v === 'object' && v.__raw) return v.value;
  return esc(v);
}

/** Mark a string as already-safe markup. */
export function raw(value) {
  return { __raw: true, value: value == null ? '' : String(value) };
}

/** Join conditional class names. */
export function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

/** Replace the contents of a node. */
export function mount(node, markup) {
  node.innerHTML = markup;
  return node;
}

/**
 * Update a node to match new markup WITHOUT throwing the old elements away.
 *
 * `mount` replaces everything, which restarts every CSS animation and drops
 * keyboard focus. That is fine between screens. Within one day of play it is
 * not: the outpost picture has to keep moving while the numbers around it
 * change, and a child tabbing between the + and - buttons must not lose their
 * place on every press.
 *
 * So this walks the old tree and the new one side by side. Where a node still
 * matches, only its attributes and text are brought up to date; where it does
 * not, it is swapped. The result is always identical to what `mount` would
 * have produced. An element marked [data-morph-skip] keeps its children,
 * which is how short-lived effects survive a re-render.
 */
export function morph(node, markup) {
  const template = document.createElement('template');
  template.innerHTML = markup;
  morphChildren(node, template.content);
  return node;
}

function morphChildren(from, to) {
  const oldKids = Array.from(from.childNodes);
  const newKids = Array.from(to.childNodes);
  const shared = Math.min(oldKids.length, newKids.length);

  for (let i = 0; i < shared; i += 1) morphNode(oldKids[i], newKids[i]);
  for (let i = shared; i < oldKids.length; i += 1) oldKids[i].remove();
  for (let i = shared; i < newKids.length; i += 1) from.appendChild(newKids[i]);
}

function morphNode(from, to) {
  if (from.nodeType !== to.nodeType || from.nodeName !== to.nodeName) {
    from.replaceWith(to);
    return;
  }
  if (from.nodeType !== Node.ELEMENT_NODE) {
    if (from.nodeValue !== to.nodeValue) from.nodeValue = to.nodeValue;
    return;
  }

  for (const { name } of Array.from(from.attributes)) {
    // A <details> the player has opened stays open across a re-render.
    if (name === 'open' && from.nodeName === 'DETAILS') continue;
    if (!to.hasAttribute(name)) from.removeAttribute(name);
  }
  for (const { name, value } of Array.from(to.attributes)) {
    if (from.getAttribute(name) !== value) from.setAttribute(name, value);
  }

  if (from.hasAttribute('data-morph-skip')) return;
  morphChildren(from, to);
}

/** querySelector scoped to a root, returning null-safe. */
export function qs(root, selector) {
  return root.querySelector(selector);
}

export function qsa(root, selector) {
  return [...root.querySelectorAll(selector)];
}

/**
 * Delegate clicks on [data-action] within `root`.
 * @param {Element} root
 * @param {(action: string, dataset: DOMStringMap, event: Event) => void} handler
 * @returns {() => void} detach
 */
export function delegate(root, handler) {
  const onClick = (event) => {
    const target = event.target.closest('[data-action]');
    if (!target || !root.contains(target)) return;
    handler(target.dataset.action, target.dataset, event);
  };
  root.addEventListener('click', onClick);
  return () => root.removeEventListener('click', onClick);
}

/** Announce a message to screen readers without moving focus. */
export function announce(message) {
  const text = tr(message);
  let region = document.getElementById('sr-live');
  if (!region) {
    region = document.createElement('div');
    region.id = 'sr-live';
    region.className = 'visually-hidden';
    region.setAttribute('role', 'status');
    region.setAttribute('aria-live', 'polite');
    document.body.appendChild(region);
  }
  region.textContent = '';
  // A tick later so repeated identical messages are still announced.
  setTimeout(() => {
    region.textContent = text;
  }, 50);
}

/** Scroll the app shell to the top after a screen change. */
export function scrollToTop() {
  // Instant, on purpose. This runs when one screen replaces another, and a
  // smooth scroll started at that moment can be cut short by the new page
  // settling, leaving the player part-way down a screen whose most important
  // news (today's flare, today's event) is at the top.
  window.scrollTo({ top: 0, behavior: 'instant' });
}

/** Format a signed number for display: +3, -6, 0. */
export function signed(value) {
  const rounded = Math.round(value);
  if (rounded > 0) return `+${rounded}`;
  return String(rounded);
}

/**
 * Pluralise a count. `plural(1, 'sol', 'sols')` -> "1 sol".
 * Used everywhere a day count is printed, so "1 days" can never appear.
 */
export function plural(count, singular, pluralForm) {
  const word = count === 1 ? singular : pluralForm || `${singular}s`;
  return `${count} ${word}`;
}

/** Clamp a value to a percentage string for meter widths. */
export function pct(value, max = 100) {
  const n = Math.max(0, Math.min(100, (value / max) * 100));
  return `${n.toFixed(1)}%`;
}
