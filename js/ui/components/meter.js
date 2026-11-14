/**
 * meter.js
 * -----------------------------------------------------------------------------
 * The resource meter: icon, name, value, bar, and optional change-since-
 * yesterday delta.
 *
 * Deliberately NOT a generic progress bar. Each meter knows its own critical
 * threshold, so the bar turns red when a seven-year-old needs to notice, and
 * the accessible text spells the state out for a screen reader.
 */

import { html, raw, cx, pct, signed } from '../dom.js';
import { icon } from './icons.js';
import { getSite } from '../../config/sites.js';
import { scienceTargets } from '../../config/systems.js';

/**
 * @param {Object} opts
 * @param {string} opts.name         display name, e.g. "Oxygen"
 * @param {number} opts.value
 * @param {number} [opts.max=100]
 * @param {string} opts.colorVar     CSS custom property, e.g. '--sys-air'
 * @param {string} opts.iconName
 * @param {string} [opts.unit='']
 * @param {number} [opts.critical]   below this, the meter reads as critical
 * @param {number} [opts.delta]      change since the previous day
 * @param {boolean} [opts.showDelta=false]
 * @param {string} [opts.display]    text to show instead of value + unit
 */
export function meter({
  name,
  value,
  max = 100,
  colorVar,
  iconName,
  unit = '',
  critical,
  delta,
  showDelta = false,
  display,
}) {
  const rounded = Math.round(value);
  const shown = display || `${rounded}${unit}`;
  const isCritical = critical != null && value < critical;
  const deltaClass =
    delta == null || Math.round(delta) === 0
      ? 'flat'
      : delta > 0
        ? 'up'
        : 'down';

  const a11y = `${name}: ${shown}${isCritical ? ', critical' : ''}`;

  return html`
    <div
      class="${cx('meter', isCritical && 'meter--critical')}"
      style="--meter-color: var(${raw(colorVar)})"
      role="group"
      aria-label="${a11y}"
    >
      <span class="meter__icon">${raw(icon(iconName))}</span>
      <div class="meter__body">
        <div class="meter__top">
          <span class="meter__name">${name}</span>
          <span class="meter__value">${shown}</span>
        </div>
        <div class="meter__track">
          <div class="meter__fill" style="width: ${raw(pct(value, max))}"></div>
        </div>
      </div>
      ${showDelta
        ? raw(
            `<span class="meter__delta meter__delta--${deltaClass}">${
              delta == null ? '' : signed(delta)
            }</span>`
          )
        : raw('<span></span>')}
    </div>
  `;
}

/**
 * The HUD strip shown at the top of every mission screen.
 *
 * It shows a bar only for what the player has met so far. On landing day that
 * is air, food and the crew; the shield and the science goal join as their
 * systems come on line, so a new player is never looking at a bar they have
 * no way to move yet.
 *
 * Science is the last bar and it is the goal: it fills towards the amount the
 * mission needs.
 *
 * @param {import('../../sim/state.js').MissionState} state
 * @param {Object} [deltas]
 * @param {{unlocked?: string[]}} [opts]
 */
export function hudMeters(state, deltas = {}, { unlocked } = {}) {
  const on = (id) => !unlocked || unlocked.includes(id);
  const target = scienceTargets(getSite(state.siteId)).success;

  const meters = [
    meter({
      name: 'Oxygen',
      value: state.oxygen,
      colorVar: '--sys-air',
      iconName: 'lungs',
      unit: '%',
      critical: 30,
      delta: deltas.oxygen,
      showDelta: true,
    }),
    meter({
      name: 'Food',
      value: state.food,
      colorVar: '--sys-food',
      iconName: 'sprout',
      unit: '%',
      critical: 30,
      delta: deltas.food,
      showDelta: true,
    }),
    on('shielding')
      ? meter({
          name: 'Shield',
          value: state.shieldCm,
          max: 320,
          colorVar: '--sys-shield',
          iconName: 'shield',
          unit: 'cm',
          delta: deltas.shieldCm,
          showDelta: true,
        })
      : '',
    meter({
      name: 'Crew',
      value: state.health,
      colorVar: '--sys-health',
      iconName: 'heart',
      unit: '%',
      critical: 40,
      delta: deltas.health,
      showDelta: true,
    }),
    on('science')
      ? meter({
          name: 'Science',
          value: state.science,
          max: target,
          colorVar: '--sys-science',
          iconName: 'flask',
          display: `${state.science}/${target}`,
          delta: deltas.science,
          showDelta: true,
        })
      : '',
  ].filter(Boolean);

  return html`
    <div class="hud__meters hud__meters--${meters.length}">
      ${raw(meters.join(''))}
    </div>
  `;
}
