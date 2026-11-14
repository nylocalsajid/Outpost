/**
 * source-tag.js
 * -----------------------------------------------------------------------------
 * Attribution. Every real number on screen gets one of these underneath it.
 *
 * This exists because the challenge asks for sources to be attributed inside
 * the tool itself, so a player can see they are engaging with real NASA science
 * rather than a space-themed game. It is also the honesty mechanism: the LIVE
 * vs ARCHIVED badge is rendered here and nowhere else, so it can never
 * accidentally say "live" about stored data.
 */

import { html, raw } from '../dom.js';
import { SOURCES, MEASURED } from '../../data/nasa-sources.js';

/**
 * Attribution for a measured quantity.
 * @param {keyof MEASURED} measuredKey
 */
export function sourceTag(measuredKey) {
  const m = MEASURED[measuredKey];
  if (!m) return '';
  const s = SOURCES[m.source];
  return html`
    <p class="source-tag">
      <strong>Source:</strong>
      <span data-no-tr dir="ltr"
        ><a href="${s.url}" target="_blank" rel="noopener noreferrer">${s.label}</a>
        &mdash; ${s.dataset}</span
      >
    </p>
  `;
}

/** Attribution for a source id directly, when there is no single measurement. */
export function sourceTagById(sourceId, extra) {
  const s = SOURCES[sourceId];
  if (!s) return '';
  return html`
    <p class="source-tag">
      <strong>Source:</strong>
      <span data-no-tr dir="ltr"
        ><a href="${s.url}" target="_blank" rel="noopener noreferrer">${s.label}</a></span
      >${extra ? raw(` &mdash; ${extra}`) : raw('')}
    </p>
  `;
}

/**
 * The LIVE / ARCHIVED badge for the space weather feed.
 * This is the single place that decides what the game claims about its data.
 */
export function dataModeBadge(weather) {
  if (!weather) {
    return html`<span class="badge"
      ><span class="badge__dot"></span>Loading data</span
    >`;
  }
  if (weather.mode === 'live') {
    return html`<span
      class="badge badge--live"
      title="Fetched from NASA DONKI at ${weather.fetchedAt}"
      ><span class="badge__dot"></span>Live NASA data</span
    >`;
  }
  return html`<span
    class="badge badge--archive"
    title="Stored real records, ${weather.windowLabel}"
    ><span class="badge__dot"></span>Archived NASA data</span
  >`;
}

/** One line explaining exactly where the current space weather came from. */
export function dataModeLine(weather) {
  if (!weather) return '';
  const reason = weather.failureReason
    ? ` (live feed unavailable: ${describeFailure(weather.failureReason)})`
    : '';
  return html`
    <p class="faint" style="font-size: 0.8rem; margin: 0.45rem 0 0">
      ${weather.flareCount} real solar flare records, ${weather.windowLabel}.
      ${weather.sourceNote}${raw(reason)}
    </p>
  `;
}

function describeFailure(reason) {
  switch (reason) {
    case 'rate-limited':
      return 'the NASA key reached its hourly limit';
    case 'timeout':
      return 'the request took too long';
    case 'network':
      return 'no connection';
    case 'no-flares-in-window':
      return 'the Sun has been quiet lately';
    case 'unexpected-shape':
      return 'the feed returned something unexpected';
    default:
      return reason;
  }
}
