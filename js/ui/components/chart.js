/**
 * chart.js
 * -----------------------------------------------------------------------------
 * Two small inline SVG charts for the debrief.
 *
 * Deliberately TWO charts, not one:
 *   - oxygen / food / crew health all share a 0-100 scale, so they belong on
 *     one axis together;
 *   - radiation dose is in mSv, a completely different scale, so it gets its
 *     own chart. Putting it on a second y-axis would make the crossings between
 *     lines look meaningful when they are an artefact of the scaling.
 *
 * PALETTE: validated for dark mode against surface #121b2f --
 *   lightness band PASS, chroma floor PASS, CVD separation PASS
 *   (worst adjacent pair deltaE 8.3 deutan / 8.1 tritan), normal-vision
 *   floor PASS (21.9), contrast vs surface PASS.
 * Lines are also directly labelled at their end point, so identity never rests
 * on colour alone. A data table is rendered for screen readers.
 */

import { html, raw } from '../dom.js';

const SERIES = [
  { key: 'oxygen', label: 'Oxygen', color: '#1898c9' },
  { key: 'food', label: 'Food', color: '#5a9418' },
  { key: 'health', label: 'Crew', color: '#cc4a72' },
];

const W = 560;
const H = 190;
const PAD = { top: 16, right: 54, bottom: 26, left: 32 };

/** Line chart of the three 0-100 resources across the mission. */
export function resourceChart(series, dayWord) {
  const days = series.days;
  if (days.length < 2) return '';

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const x = (i) => PAD.left + (i / (days.length - 1)) * plotW;
  const y = (v) => PAD.top + plotH - (v / 100) * plotH;

  // Recessive gridlines at 0, 50, 100.
  const grid = [0, 50, 100]
    .map(
      (v) =>
        `<line class="chart__grid" x1="${PAD.left}" y1="${y(v)}" x2="${
          PAD.left + plotW
        }" y2="${y(v)}"/>` +
        `<text x="${PAD.left - 6}" y="${y(v) + 3.5}" text-anchor="end">${v}</text>`
    )
    .join('');

  // Dashed verticals marking the real solar storms.
  const storms = series.storms
    .map((cls, i) =>
      cls
        ? `<line class="chart__storm" x1="${x(i)}" y1="${PAD.top}" x2="${x(
            i
          )}" y2="${PAD.top + plotH}"/>`
        : ''
    )
    .join('');

  const lastIndex = days.length - 1;

  /**
   * Direct end-labels, nudged apart when two series finish close together.
   * Without this, two lines ending within a few points of each other render
   * their labels on top of one another -- the most common way a small
   * multi-line chart becomes unreadable.
   */
  const MIN_LABEL_GAP = 12;
  const labelPositions = SERIES.map((s) => ({
    key: s.key,
    color: s.color,
    label: s.label,
    value: series[s.key][lastIndex],
    markerY: y(series[s.key][lastIndex]),
    labelY: y(series[s.key][lastIndex]),
  })).sort((a, b) => a.labelY - b.labelY);

  for (let i = 1; i < labelPositions.length; i += 1) {
    const gap = labelPositions[i].labelY - labelPositions[i - 1].labelY;
    if (gap < MIN_LABEL_GAP) {
      labelPositions[i].labelY = labelPositions[i - 1].labelY + MIN_LABEL_GAP;
    }
  }

  const lines = SERIES.map((s) => {
    const pts = series[s.key].map((v, i) => `${x(i)},${y(v)}`).join(' ');
    const pos = labelPositions.find((p) => p.key === s.key);
    return (
      `<polyline class="chart__line" stroke="${s.color}" points="${pts}"/>` +
      `<circle cx="${x(lastIndex)}" cy="${pos.markerY}" r="4" fill="${s.color}" stroke="#121b2f" stroke-width="2"/>` +
      `<text x="${x(lastIndex) + 8}" y="${pos.labelY + 3.5}" fill="${s.color}" font-weight="700">${s.label}</text>`
    );
  }).join('');

  const xLabels = [0, Math.floor((days.length - 1) / 2), days.length - 1]
    .map(
      (i) =>
        `<text x="${x(i)}" y="${H - 8}" text-anchor="middle">${days[i]}</text>`
    )
    .join('');

  return html`
    <figure style="margin: 0">
      <svg
        class="chart"
        viewBox="0 0 ${W} ${H}"
        role="img"
        aria-label="Oxygen, food and crew health across the mission, with dashed lines marking real solar storms."
      >
        ${raw(grid)} ${raw(storms)} ${raw(lines)} ${raw(xLabels)}
        <text x="${W / 2}" y="${H - 8}" text-anchor="middle" opacity="0">x</text>
      </svg>
      <figcaption class="chart-legend">
        ${raw(
          SERIES.map(
            (s) =>
              `<span class="chart-legend__item" style="color:${s.color}"><span class="chart-legend__swatch"></span><span style="color:var(--text-dim)">${s.label}</span></span>`
          ).join('')
        )}
        <span class="chart-legend__item" style="color: var(--danger)">
          <span
            class="chart-legend__swatch"
            style="background: repeating-linear-gradient(90deg, currentColor 0 3px, transparent 3px 6px)"
          ></span>
          <span style="color: var(--text-dim)">Real solar storm</span>
        </span>
      </figcaption>
      <p class="faint" style="font-size: 0.78rem; margin: 0.4rem 0 0">
        Horizontal axis: ${dayWord} 1 to ${days[days.length - 1]}. Vertical
        axis: percent remaining.
      </p>
    </figure>
  `;
}

/** Bar chart of radiation dose per day, in mSv. Its own chart, its own scale. */
export function doseChart(series, dayWord, safeLine) {
  const days = series.days;
  if (!days.length) return '';

  const w = 560;
  const h = 130;
  const pad = { top: 14, right: 54, bottom: 24, left: 32 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  const peak = Math.max(safeLine * 1.6, ...series.dose);
  const barW = Math.max(6, (plotW / days.length) * 0.62);
  const step = plotW / days.length;

  const x = (i) => pad.left + step * i + (step - barW) / 2;
  const y = (v) => pad.top + plotH - (v / peak) * plotH;

  const bars = series.dose
    .map((v, i) => {
      const over = v > safeLine;
      const height = Math.max(2, pad.top + plotH - y(v));
      return (
        `<rect x="${x(i)}" y="${y(v)}" width="${barW}" height="${height}" rx="3" ` +
        `fill="${over ? '#cc4a72' : '#1898c9'}"/>`
      );
    })
    .join('');

  const safeY = y(safeLine);
  const safe =
    `<line class="chart__grid" stroke="#c08a1a" stroke-dasharray="4 3" x1="${pad.left}" y1="${safeY}" x2="${
      pad.left + plotW
    }" y2="${safeY}"/>` +
    `<text x="${pad.left + plotW + 6}" y="${safeY + 3.5}" fill="#c08a1a" font-weight="700">safe limit</text>`;

  const yLabels = [0, peak]
    .map(
      (v) =>
        `<text x="${pad.left - 6}" y="${y(v) + 3.5}" text-anchor="end">${
          Math.round(v * 10) / 10
        }</text>`
    )
    .join('');

  const xLabels = [0, Math.floor((days.length - 1) / 2), days.length - 1]
    .map(
      (i) =>
        `<text x="${x(i) + barW / 2}" y="${h - 7}" text-anchor="middle">${
          days[i]
        }</text>`
    )
    .join('');

  return html`
    <figure style="margin: 0">
      <svg
        class="chart"
        viewBox="0 0 ${w} ${h}"
        role="img"
        aria-label="Radiation dose taken each ${dayWord}, in millisieverts, against the safe daily limit."
      >
        ${raw(bars)} ${raw(safe)} ${raw(yLabels)} ${raw(xLabels)}
      </svg>
      <p class="faint" style="font-size: 0.78rem; margin: 0.4rem 0 0">
        Radiation dose each ${dayWord}, in millisieverts (mSv). Bars above the
        dashed line cost your crew health.
      </p>
    </figure>
  `;
}

/** Accessible table of the same numbers, for screen readers and for checking. */
export function debriefTable(series, dayWord) {
  const rows = series.days
    .map(
      (d, i) =>
        `<tr><th scope="row">${d}</th><td>${series.oxygen[i]}</td><td>${series.food[i]}</td><td>${series.health[i]}</td><td>${series.shield[i]}</td><td>${series.dose[i]}</td><td>${
          series.storms[i] || '—'
        }</td></tr>`
    )
    .join('');

  return html`
    <details>
      <summary class="btn btn--ghost btn--sm" style="display: inline-flex">
        Show the numbers as a table
      </summary>
      <div style="overflow-x: auto; margin-top: 0.75rem">
        <table
          class="mono"
          style="width: 100%; border-collapse: collapse; font-size: 0.82rem"
        >
          <caption class="visually-hidden">
            Mission log by ${dayWord}
          </caption>
          <thead>
            <tr style="color: var(--text-faint); text-align: left">
              <th scope="col">${raw(dayWord === 'sol' ? 'Sol' : 'Day')}</th>
              <th scope="col">O&#8322;%</th>
              <th scope="col">Food%</th>
              <th scope="col">Crew%</th>
              <th scope="col">Shield cm</th>
              <th scope="col">Dose mSv</th>
              <th scope="col">Flare</th>
            </tr>
          </thead>
          <tbody>
            ${raw(rows)}
          </tbody>
        </table>
      </div>
    </details>
  `;
}
