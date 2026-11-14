/**
 * allocator.js
 * -----------------------------------------------------------------------------
 * The power allocation board: the one screen where the whole game happens.
 *
 * Design decisions that matter for a 7-12 year old:
 *   - power is COUNTABLE BLOCKS, not a percentage or a slider. A child can see
 *     "I have nine and I need twelve" without reading a single number.
 *   - each row shows its demand as dashed outline pips, so "short" is visible
 *     as a shape rather than something you work out from arithmetic.
 *   - +/- steppers are 48px circles, usable with a thumb on a tablet.
 *   - a row that is underfunded turns red and says, in words, what will happen.
 */

import { html, raw, cx } from '../dom.js';
import { icon } from './icons.js';
import { SYSTEMS, SYSTEM_IDS, BALANCE } from '../../config/systems.js';
import { unlockDay } from '../../config/levels.js';

/** Row of yellow blocks showing available / spent power. */
export function powerBlocks({ generated, battery, spent }) {
  const total = generated + battery;
  const cells = [];
  for (let i = 0; i < total; i += 1) {
    const isBattery = i >= generated;
    const isSpent = i < spent;
    cells.push(
      `<span class="${cx(
        'block',
        isSpent && 'block--spent',
        !isSpent && isBattery && 'block--battery'
      )}"></span>`
    );
  }
  return html`<div
    class="blocks"
    role="img"
    aria-label="${spent} of ${total} power blocks assigned"
  >
    ${raw(cells.join(''))}
  </div>`;
}

/**
 * What today's blocks will do to a system's number, before the day is run.
 *
 * This is the same arithmetic the simulation applies when the day resolves,
 * shown early: a child should be able to see "Oxygen -12" appear the moment
 * they take the block away, not discover it on the results screen.
 *
 * @returns {{ text: string, tone: 'good'|'bad'|'flat' }}
 */
export function effectPreview(system, allocation, state, plan) {
  const site = plan.site;
  const event = plan.event;
  const n = allocation[system.id];
  const need = plan.demands ? plan.demands[system.id] : system.demand;
  const short = Math.max(0, need - n);

  switch (system.id) {
    case 'lifeSupport':
      return short > 0
        ? { text: `Oxygen \u2212${short * BALANCE.oxygenLossPerShortBlock}`, tone: 'bad' }
        : {
            text: `Oxygen +${BALANCE.oxygenSurplusPerDay + (site.waterBonus ? 1 : 0)}`,
            tone: 'good',
          };
    case 'greenhouse':
      return short > 0
        ? { text: `Food \u2212${short * BALANCE.foodLossPerShortBlock}`, tone: 'bad' }
        : { text: `Food +${BALANCE.foodSurplusPerDay}`, tone: 'good' };
    case 'shielding': {
      const added = Math.min(
        n * (plan.mods ? plan.mods.shieldCmPerBlock : BALANCE.shieldCmPerBlock),
        BALANCE.shieldCapCm - state.shieldCm
      );
      // On a quake day the digger is working against soil sliding off.
      const lost = Math.min(event ? event.shieldLossCm : 0, state.shieldCm + added);
      const net = added - lost;
      if (net > 0) return { text: `Shield +${net} cm tomorrow`, tone: 'good' };
      if (net < 0) return { text: `Shield \u2212${-net} cm tomorrow`, tone: 'bad' };
      return {
        text: lost > 0 ? 'Shield holds steady' : 'Shield +0',
        tone: lost > 0 ? 'good' : 'flat',
      };
    }
    case 'science': {
      const healthFactor = Math.max(BALANCE.scienceHealthFloor, state.health / 100);
      const gain = Math.round(
        n *
          (plan.mods ? plan.mods.sciencePerBlock : BALANCE.sciencePerBlock) *
          healthFactor *
          (allocation.shelter ? BALANCE.shelterScienceFactor : 1) *
          (event ? event.scienceFactor : 1)
      );
      return gain > 0
        ? { text: `Science +${gain}`, tone: 'good' }
        : { text: 'Science +0', tone: 'flat' };
    }
    default:
      return { text: '', tone: 'flat' };
  }
}

/**
 * The allocation board.
 *
 * Each row answers three questions without the player having to ask:
 * what is this for, how much does it need, and what will my blocks do today.
 *
 * @param {Object} opts
 * @param {ReturnType<import('../../sim/engine.js').planDay>} opts.plan
 * @param {Object} opts.allocation
 * @param {{spent:number, remaining:number}} opts.validation
 * @param {import('../../sim/state.js').MissionState} opts.state
 */
export function allocator({ plan, allocation, validation, state }) {
  const unlocked = plan.unlocked || SYSTEM_IDS;
  const dayWord = plan.site.dayWord;

  const rows = SYSTEMS.map((system) => {
    // Not set up yet: one quiet line saying when it arrives, and no buttons.
    if (!unlocked.includes(system.id)) {
      return html`
        <div
          class="alloc__row alloc__row--locked"
          style="--row-color: var(${raw(system.colorVar)})"
        >
          <div class="alloc__name">
            ${raw(icon(system.icon, { size: 17 }))} ${system.name}
          </div>
          <div class="alloc__soon">
            Ready on ${dayWord} ${unlockDay(system.id)}
          </div>
        </div>
      `;
    }

    const assigned = allocation[system.id];
    // What it needs today. An event can raise this for one day.
    const need = plan.demands ? plan.demands[system.id] : system.demand;
    const raised = need > system.demand;
    // Is this the row today's event is about?
    const inFocus = Boolean(plan.event && plan.event.system === system.id);
    const short = Math.max(0, need - assigned);
    /**
     * Only air and food are flagged red when short. Skipping shielding or
     * science is a legitimate gamble whose cost arrives later, and painting it
     * as an emergency would teach the wrong thing -- that there is one "safe"
     * allocation rather than a judgement to make.
     */
    const critical = short > 0 && system.criticalShort;
    const idle = assigned === 0 && !system.criticalShort;
    const canAdd = validation.remaining > 0;
    const pipCount = Math.max(need, assigned);
    const effect = effectPreview(system, allocation, state, plan);

    const pips = Array.from({ length: pipCount }, (_, i) => {
      const on = i < assigned;
      const needed = i < need;
      return `<span class="${cx(
        'alloc__pip',
        on && 'alloc__pip--on',
        !on && needed && 'alloc__pip--need'
      )}"></span>`;
    }).join('');

    return html`
      <div
        class="${cx(
          'alloc__row',
          critical && 'alloc__row--short',
          idle && !inFocus && 'alloc__row--idle',
          inFocus && 'alloc__row--event'
        )}"
        style="--row-color: var(${raw(system.colorVar)})"
        data-row-system="${system.id}"
      >
        <div class="alloc__info">
          <div class="alloc__name">
            ${raw(icon(system.icon, { size: 17 }))} ${system.name}
            <span class="${cx('alloc__needs', raised && 'alloc__needs--up')}"
              >needs ${need}${raised ? ' today' : ''}</span
            >
          </div>
          <div class="alloc__plain">${system.plain}</div>
          <div class="alloc__pips" aria-hidden="true">${raw(pips)}</div>
        </div>
        <div class="alloc__side">
          <div class="alloc__controls">
            <button
              class="stepper"
              type="button"
              data-action="alloc-down"
              data-system="${system.id}"
              aria-label="Take one power block away from ${system.name}"
              ${assigned <= 0 ? raw('disabled') : raw('')}
            >
              &minus;
            </button>
            <span class="alloc__count" aria-live="off">${assigned}</span>
            <button
              class="stepper"
              type="button"
              data-action="alloc-up"
              data-system="${system.id}"
              aria-label="Give one more power block to ${system.name}"
              ${!canAdd ? raw('disabled') : raw('')}
            >
              +
            </button>
          </div>
          <div class="alloc__effect alloc__effect--${effect.tone}">
            ${effect.text}
          </div>
        </div>
      </div>
    `;
  });

  return html`<div class="alloc">${raw(rows.join(''))}</div>`;
}

/**
 * Can the crew shelter today, and what would it take?
 *
 * Sheltering is never refused while the blocks can be found by taking them
 * from science or shielding -- the app does that automatically. A child should
 * never be locked out of the safe choice by a budgeting puzzle; they should
 * just be shown, clearly, what the safe choice costs.
 */
export function shelterOption({ allocation, validation }) {
  const active = Boolean(allocation.shelter);
  const shortfall = Math.max(0, BALANCE.shelterCost - validation.remaining);
  const reclaimable = allocation.science + allocation.shielding;
  return {
    active,
    shortfall,
    affordable: active || shortfall === 0 || reclaimable >= shortfall,
  };
}

/** The storm room's line in the power board, shown while the crew shelters. */
export function shelterRow() {
  const pips = Array.from(
    { length: BALANCE.shelterCost },
    () => '<span class="alloc__pip alloc__pip--on"></span>'
  ).join('');
  return html`
    <div class="alloc__row alloc__row--bay" style="--row-color: var(--good)">
      <div class="alloc__info">
        <div class="alloc__name">${raw(icon('shield', { size: 17 }))} Storm room</div>
        <div class="alloc__plain">
          The crew is shut in the safest room. The rover is parked.
        </div>
        <div class="alloc__pips" aria-hidden="true">${raw(pips)}</div>
      </div>
      <div class="alloc__side">
        <div class="alloc__controls">
          <span class="alloc__count">${BALANCE.shelterCost}</span>
        </div>
        <div class="alloc__effect alloc__effect--good">Crew sheltered</div>
      </div>
    </div>
  `;
}
