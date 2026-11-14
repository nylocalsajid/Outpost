/**
 * screens/sol.js
 * -----------------------------------------------------------------------------
 * The main gameplay screen: one day at the outpost.
 *
 * The screen is deliberately spare. It holds three things and nothing else:
 *
 *   the status bar   which day and level this is, and a bar for each thing
 *                    the player has met so far
 *   today's Sun      one line on a quiet day; on a storm day, the choice
 *   the board and    share out the blocks on the left, watch the outpost
 *   the picture      answer on the right, press Run
 *
 * Everything else a player might want (the rules, the NASA sources, leaving
 * the mission) is one tap away behind the Menu button.
 *
 * It also grows with the player. On landing day there are two systems and
 * three bars; the lab and the digger arrive on the next two days. Mission
 * control introduces each new thing as it appears (see coachSteps).
 *
 * The figures that used to sit in and around the picture have moved to where
 * they are asked for: the coloured tag on each row, and the NASA record
 * behind a storm.
 */

import { html, raw, cx } from '../dom.js';
import { icon } from '../components/icons.js';
import { cometFace } from '../components/comet.js';
import { UPGRADES } from '../../config/upgrades.js';
import { hudMeters } from '../components/meter.js';
import {
  allocator,
  powerBlocks,
  shelterOption,
  shelterRow,
} from '../components/allocator.js';
import {
  outpostScene,
  sceneCaption,
  shieldOutlook,
  shieldScars,
} from '../components/outpost-scene.js';
import { BALANCE, getSystem } from '../../config/systems.js';
import { LEVELS, CALM_DAYS } from '../../config/levels.js';

/**
 * What mission control says today, as a short list of steps.
 *
 * Every player hears what is new: the day's arrival during set-up, and each
 * new level after that. A player on their very first mission also gets three
 * pointers on landing day showing where the blocks are, how to move them and
 * how to run the day.
 *
 * `target` picks what gets a highlight (see screens.css); `scrollTo` is
 * brought into view when the step opens.
 *
 * @param {ReturnType<import('../../sim/engine.js').planDay>} plan
 * @param {boolean} firstRun  has this browser never finished the guide?
 */
export function coachSteps(plan, firstRun) {
  const steps = [];
  const dayWord = plan.site.dayWord;

  if (plan.news) {
    const target =
      plan.day === 1
        ? 'share'
        : plan.day === 2
          ? 'science'
          : plan.day === 3
            ? 'shielding'
            : 'level';
    steps.push({
      target,
      scrollTo:
        target === 'level'
          ? '.hud'
          : target === 'share'
            ? '.alloc'
            : `[data-row-system="${target}"]`,
      title: plan.news.title,
      text: plan.news.text,
    });
  }

  // Something other than the Sun has happened. Comet noticed first, and the
  // message points at the row it changes, so it cannot be missed.
  if (plan.event) {
    const row = plan.event.system === 'power' ? null : plan.event.system;
    steps.push({
      target: row || 'power',
      scrollTo: row ? `[data-row-system="${row}"]` : '.board__count',
      title: plan.event.label,
      // The card at the top of the day says what to do; this says who noticed.
      text: plan.event.comet,
      comet: plan.event.id === 'find' || plan.event.id === 'devil' ? 'happy' : 'alert',
    });
  }

  if (firstRun && plan.day === 1) {
    steps.push(
      {
        target: 'power',
        scrollTo: '.board__count',
        title: 'Your power',
        text: 'These yellow blocks are all the power you have today. Every block you give away switches something on.',
      },
      {
        target: 'share',
        scrollTo: '.alloc',
        title: 'Move the blocks',
        text: 'Press + and − to move a block. Try it now and watch the picture change. The coloured tag shows what your blocks will do.',
      },
      {
        target: 'run',
        scrollTo: '[data-action="commit"]',
        title: 'Run the day',
        text: `Happy with your plan? Press Run ${dayWord}. You will see what happened, then plan the next one.`,
      }
    );
  }

  return steps;
}

export function renderSol(ctx) {
  const { state, plan, deltas, coach, coachList, running } = ctx;
  const site = plan.site;
  const dayLabel = site.dayWord === 'sol' ? 'Sol' : 'Day';
  const outlook = shieldOutlook(plan);
  const step = coach != null && coachList ? coachList[coach] : null;

  return html`
    <section
      class="screen"
      data-sol-day="${plan.day}"
      data-coach="${step ? step.target : 'off'}"
      data-running="${running ? 'yes' : 'no'}"
    >
      ${raw(renderHud(state, plan, deltas, dayLabel))}

      <div class="stack stack--sm" style="margin-bottom: var(--gap)">
        ${raw(
          plan.storm
            ? renderStormReport(ctx, outlook)
            : plan.event
              ? renderEvent(plan.event)
              : renderQuietReport(plan, state)
        )}
        ${raw(plan.hazard ? renderHazard(plan.hazard) : '')}
      </div>

      <div class="sol-grid">
        <!-- The picture comes first in the markup so that on a phone it can
             pin to the top of the screen above the buttons that drive it. -->
        ${raw(renderScene(ctx, outlook))}

        <div class="sol-main stack">${raw(renderPowerBoard(ctx, dayLabel))}</div>
      </div>

      ${raw(step ? renderCoach(coachList, coach) : '')}
    </section>
  `;
}

/* -------------------------------------------------------------------- scene */

/**
 * The outpost picture and the sentence under it.
 *
 * The picture is drawn from the blocks as they are assigned RIGHT NOW, not
 * from yesterday's result, so every press of + or - changes something in it.
 * The caption says the same thing in plain words.
 */
function renderScene(ctx, outlook) {
  const { state, plan, allocation, validation, focus, running } = ctx;
  const caption = sceneCaption({ focus, allocation, plan });
  const dayWord = plan.site.dayWord === 'sol' ? 'Sol' : 'Day';

  return html`
    <div class="scene-frame">
      ${raw(
        outpostScene({
          siteId: plan.site.id,
          shieldCm: state.shieldCm,
          health: state.health,
          dust: state.dust,
          storm: plan.storm,
          hazard: plan.hazard ? plan.hazard.id : null,
          allocation,
          remaining: validation.remaining,
          outlook: outlook.state,
          scars: shieldScars(state),
          unlocked: plan.unlocked,
          demands: plan.demands,
          event: plan.event ? plan.event.id : null,
          upgrades: state.upgrades || [],
          chargeMax: plan.mods.batteryChargeMax,
          running,
        })
      )}
      ${raw(
        running
          ? html`<div class="runbar" role="status">
              <span class="runbar__label"
                >${dayWord} ${plan.day} is under way. Watch your plan play
                out.</span
              >
              <button class="btn btn--ghost btn--sm" type="button" data-action="skip-run">
                Skip
              </button>
              <span class="runbar__track"><span class="runbar__fill"></span></span>
            </div>`
          : html`<p
              class="scene-caption"
              style="${caption.colorVar
                ? raw(`--caption-color: var(${caption.colorVar})`)
                : raw('')}"
            >
              <span class="scene-caption__dot" aria-hidden="true"></span>
              <span>${caption.text}</span>
            </p>`
      )}
    </div>
  `;
}

/* ---------------------------------------------------------------------- HUD */

/**
 * Where you are in the mission: the day, the level, and a row of pips, one
 * per day, grouped by level so the shape of the whole mission is visible.
 */
function renderHud(state, plan, deltas, dayLabel) {
  const level = plan.level;
  const training = Boolean(state.training);

  const pips = training
    ? `<span class="pips__level pips__level--1 is-now">${Array.from(
        { length: state.missionDays },
        (_, i) =>
          `<span class="pip${i + 1 < state.day ? ' is-done' : i + 1 === state.day ? ' is-now' : ''}"></span>`
      ).join('')}</span>`
    : LEVELS.map((l) => {
    const days = [];
    for (let d = l.from; d <= l.to; d += 1) {
      days.push(
        `<span class="pip${d < state.day ? ' is-done' : d === state.day ? ' is-now' : ''}"></span>`
      );
    }
    return `<span class="pips__level pips__level--${l.id}${l.id === level.id ? ' is-now' : ''}">${days.join('')}</span>`;
      }).join('');

  return html`
    <header class="hud">
      <div class="hud__top">
        <div class="hud__where">
          <span class="hud__day"
            >${dayLabel} ${state.day} <span>of ${state.missionDays}</span></span
          >
          ${raw(
            training
              ? `<span class="level level--1 level--training">Training <span>with Comet</span></span>`
              : `<span class="level level--${level.id}">Level ${level.id} <span>${level.name}</span></span>`
          )}
        </div>
        <div
          class="pips"
          role="img"
          aria-label="${dayLabel} ${state.day} of ${state.missionDays}"
        >
          ${raw(pips)}
        </div>
        <button
          class="btn btn--ghost btn--sm hud__menu"
          type="button"
          data-action="menu-open"
        >
          ${raw(icon('menu', { size: 16 }))} Menu
        </button>
      </div>

      ${raw(hudMeters(state, deltas, { unlocked: plan.unlocked }))}
    </header>
  `;
}

/* --------------------------------------------------------------- Sun report */

/** A small Sun for the report: calm, or throwing a flare. */
function sunBadge(stormy) {
  const rays = Array.from(
    { length: 12 },
    (_, i) =>
      `<path d="M-2.2 -17 L0 ${i % 2 ? -25 : -30} L2.2 -17Z" transform="rotate(${i * 30})"/>`
  ).join('');
  return (
    `<svg class="sunbadge${stormy ? ' sunbadge--storm' : ''}" viewBox="-36 -36 72 72" aria-hidden="true">` +
    (stormy
      ? `<circle r="15" class="sunbadge__ring"/><circle r="15" class="sunbadge__ring" style="animation-delay:0.7s"/>`
      : '') +
    `<g class="sunbadge__rays">${rays}</g>` +
    `<circle r="13" class="sunbadge__disc"/>` +
    (stormy
      ? `<path class="sunbadge__flare" d="M9 -9 Q22 -24 30 -14 Q22 -16 16 -4Z"/>`
      : '') +
    `</svg>`
  );
}

/**
 * How big today's flare is on the scale scientists use, as four boxes with
 * one lit. Children do not need to know what "M2.1" means to see that the
 * lit box is one step from the top.
 */
function flareScale(classType) {
  const letter = classType ? String(classType).trim().charAt(0).toUpperCase() : '';
  const size = parseFloat(String(classType || '').slice(1)) || 1;
  const level =
    letter === 'X' ? (size >= 5 ? 3 : 2) : letter === 'M' ? 1 : 0;
  const steps = ['Quiet', 'Medium', 'Big', 'Huge'];
  return html`
    <div class="flarescale" role="img" aria-label="Flare size today: ${steps[level]}">
      ${raw(
        steps
          .map(
            (name, i) =>
              `<span class="flarescale__step flarescale__step--${i}${
                i === level ? ' is-now' : ''
              }">${name}</span>`
          )
          .join('')
      )}
    </div>
  `;
}

/** A quiet day gets one line. There is nothing to decide about the Sun. */
function renderQuietReport(plan, state) {
  const shieldOnLine = plan.unlocked.includes('shielding');
  const thin = state.shieldCm < 80;

  const text =
    plan.day <= CALM_DAYS && !shieldOnLine
      ? 'No flares while you set up the base.'
      : thin
        ? 'A good day to build your shield. Once a flare goes off, it is too late.'
        : 'Your shield is strong. A good day for science.';

  return html`
    <div class="today">
      ${raw(sunBadge(false))}
      <p class="today__text"><strong>The Sun is quiet.</strong> ${text}</p>
    </div>
  `;
}

/**
 * A storm day.
 *
 * The decision comes first and in plain terms: what happens to the shield,
 * and what each choice costs the crew. The measurements, and the DONKI record
 * that proves the flare is real, are one tap away rather than in the way.
 */
function renderStormReport(ctx, outlook) {
  const { plan, state, allocation, validation } = ctx;
  const s = plan.storm;
  const rec = s.record;
  const shelter = shelterOption({ allocation, validation });

  const verdict = {
    holds: 'Your shield will <strong>hold</strong>. The crew can keep working.',
    cracks:
      'Your shield will <strong>crack</strong>. Some radiation reaches the crew.',
    breaks:
      'Your shield will <strong>break</strong>. A lot of radiation reaches the crew.',
  }[outlook.state];

  const cost = (loss) =>
    loss > 0 ? `Crew health −${loss}` : 'Crew stays safe';

  return html`
    <div
      class="${cx('sunrep', 'sunrep--storm', `sunrep--${outlook.state}`)}"
      role="alert"
    >
      ${raw(sunBadge(true))}
      <div class="sunrep__body">
        <h2 class="sunrep__head">Solar storm today</h2>
        <p class="sunrep__verdict">${raw(verdict)}</p>
      </div>
      ${raw(flareScale(rec.classType))}

      <div class="choice" role="group" aria-label="What should the crew do?">
        <button
          class="${cx('choice__opt', !shelter.active && 'is-picked')}"
          type="button"
          data-action="set-shelter"
          data-shelter="off"
          aria-pressed="${shelter.active ? 'false' : 'true'}"
        >
          <span class="choice__name">Keep working</span>
          <span
            class="${cx('choice__cost', outlook.workLoss > 0 ? 'choice__cost--bad' : 'choice__cost--good')}"
            >${cost(outlook.workLoss)}</span
          >
          <span class="choice__note">Science as normal</span>
        </button>
        <button
          class="${cx('choice__opt', shelter.active && 'is-picked')}"
          type="button"
          data-action="set-shelter"
          data-shelter="on"
          aria-pressed="${shelter.active ? 'true' : 'false'}"
          ${!shelter.affordable ? raw('disabled') : raw('')}
        >
          <span class="choice__name">Shelter in the storm room</span>
          <span
            class="${cx('choice__cost', outlook.shelterLoss > 0 ? 'choice__cost--bad' : 'choice__cost--good')}"
            >${cost(outlook.shelterLoss)}</span
          >
          <span class="choice__note">
            ${!shelter.affordable
              ? `Needs ${BALANCE.shelterCost} blocks. Take some back from air or food first.`
              : `Costs ${BALANCE.shelterCost} blocks and stops the rover`}
          </span>
        </button>
      </div>

      <details class="sunrep__record">
        <summary>This flare really happened. See the numbers</summary>
        <p class="alert__detail">
          <strong>${s.headline}.</strong> ${s.plainMeaning}
        </p>
        <p class="alert__detail">${s.detail}</p>
        ${raw(
          rec.note
            ? html`<p class="alert__detail"><em>${rec.note}</em></p>`
            : ''
        )}
        <div class="provenance">
          <div class="provenance__row">
            <span class="provenance__key">Radiation today</span>
            <span class="provenance__val">
              ${plan.projectedDose} mSv if the crew works,
              ${plan.shelteredDose} mSv if it shelters. The safe limit is
              ${BALANCE.safeDoseMsvPerDay} mSv a day, with a ${state.shieldCm}
              cm shield.
            </span>
          </div>
          <div class="provenance__row">
            <span class="provenance__key">DONKI record</span>
            <span class="provenance__val" data-no-tr dir="ltr">
              ${rec.activityId || `${rec.classType} — ${rec.beginTime}`}
            </span>
          </div>
          <div class="provenance__row">
            <span class="provenance__key">Class / region / start</span>
            <span class="provenance__val" data-no-tr dir="ltr">
              ${rec.classType} &middot;
              ${rec.sourceLocation || (rec.activeRegionNum ? `AR ${rec.activeRegionNum}` : 'region not given')}
              &middot; ${rec.beginTime}
            </span>
          </div>
          ${raw(
            rec.verbatim
              ? ''
              : html`<div class="provenance__row">
                  <span class="provenance__key">Note</span>
                  <span class="provenance__val"
                    >Date and class from the published event record; time is
                    day-level only.</span
                  >
                </div>`
          )}
        </div>
      </details>
    </div>
  `;
}

/**
 * Something other than a storm. One card: what happened, what it needs, and
 * a line on when it happened for real.
 */
function renderEvent(event) {
  const iconName = {
    leak: 'leak',
    blight: 'mould',
    quake: 'quake',
    find: 'find',
    devil: 'dust',
  }[event.id];
  const good = event.id === 'find' || event.id === 'devil';

  return html`
    <div class="${cx('happening', good ? 'happening--good' : 'happening--bad')}" role="status">
      <span class="happening__comet">${raw(cometFace({ size: 64, mood: good ? 'happy' : 'alert' }))}</span>
      <div class="happening__body">
        <p class="happening__tag">
          ${raw(icon(iconName, { size: 15 }))}
          ${good ? 'Good news today' : 'Something has gone wrong'}
        </p>
        <h2 class="happening__title">${event.label}</h2>
        <p class="happening__text">${event.text}</p>
        <p class="happening__todo">${raw(icon('bolt', { size: 15 }))} ${event.todo}</p>
        <p class="happening__real">This really happens. ${event.real}</p>
      </div>
    </div>
  `;
}

function renderHazard(hazard) {
  return html`
    <div class="today today--warn">
      <span class="today__icon"
        >${raw(icon(hazard.id === 'shadow' ? 'moon' : 'dust', { size: 22 }))}</span
      >
      <p class="today__text">
        <strong>${hazard.label}: less power today.</strong> ${hazard.detail}
      </p>
    </div>
  `;
}

/* -------------------------------------------------------------- power board */

/**
 * The one place the player acts: see the blocks, share them out, run the day.
 * The Run button lives at the bottom of the board, not at the bottom of the
 * page, so the last step is where the eye already is.
 */
function renderPowerBoard(ctx, dayLabel) {
  const { plan, allocation, validation, state, running } = ctx;
  const over = validation.spent > plan.blocksAvailable;
  const left = validation.remaining;
  // What it would take to run everything that is set up so far, today.
  const need = plan.unlocked.reduce(
    (sum, id) => sum + (plan.demands ? plan.demands[id] : getSystem(id).demand),
    0
  );
  const enough = plan.blocksAvailable >= need;

  return html`
    <div class="card board">
      <div class="board__head">
        <h2 class="board__title">Share out today&rsquo;s power</h2>
        <div class="row row--tight">
          ${raw(
            plan.day > CALM_DAYS && !state.pendingAdvice && !ctx.advice
              ? html`<button class="btn btn--ghost btn--sm" type="button" data-action="ask-earth">
                  ${raw(icon('radio', { size: 15 }))} Ask Earth
                </button>`
              : ''
          )}
          <button
            class="btn btn--ghost btn--sm"
            type="button"
            data-action="reset-alloc"
          >
            ${raw(icon('replay', { size: 15 }))} Reset
          </button>
        </div>
      </div>

      ${raw(renderEarth(ctx))}
      ${raw(renderUpgrades(state))}

      <div class="${cx('board__count', over && 'board__count--over')}">
        <span class="board__num">${left}</span>
        <span class="board__numlabel"
          >block${left === 1 ? '' : 's'} left to share<small
            >${enough
              ? `You have ${plan.blocksAvailable}. Enough for everything today.`
              : `You have ${plan.blocksAvailable}. Everything needs ${need}.`}</small
          ></span
        >
      </div>

      ${raw(
        powerBlocks({
          generated: plan.generated,
          battery: plan.battery,
          spent: validation.spent,
        })
      )}

      <hr class="divider" />

      ${raw(allocator({ plan, allocation, validation, state }))}
      ${raw(
        allocation.shelter
          ? html`<div style="margin-top: var(--gap-sm)">${raw(shelterRow())}</div>`
          : ''
      )}

      <div class="board__run">
        ${raw(
          left > 0
            ? html`<p class="pill-note">
                ${left > plan.mods.batteryChargeMax
                  ? `The battery saves ${plan.mods.batteryChargeMax} spare blocks for tomorrow. The rest is wasted.`
                  : `The battery saves your spare block${left > 1 ? 's' : ''} for tomorrow.`}
              </p>`
            : ''
        )}
        <button
          class="btn btn--go btn--lg btn--block"
          type="button"
          data-action="commit"
          ${!validation.valid || running ? raw('disabled') : raw('')}
        >
          ${running
            ? raw(`<span class="spinner"></span> Running ${dayLabel.toLowerCase()} ${plan.day}`)
            : raw(`${icon('check')} Run ${dayLabel.toLowerCase()} ${plan.day}`)}
        </button>
        ${raw(
          !validation.valid
            ? html`<p class="center" style="color: var(--danger); font-weight: 700">
                ${validation.reason}
              </p>`
            : ''
        )}
      </div>
    </div>
  `;
}

/**
 * Mission control's answer, when the player has asked Earth for advice.
 *
 * On the Moon the reply is there at once. On Mars the question is still in
 * flight when the day has to be decided, which is the point: the delay is
 * real, and it is why a Mars crew has to think for itself.
 */
function renderEarth(ctx) {
  const { state, plan, advice } = ctx;
  const site = plan.site;

  if (state.pendingAdvice) {
    return html`
      <div class="earth earth--wait">
        ${raw(icon('radio', { size: 17 }))}
        <p>
          <strong>Waiting for Earth.</strong> Your question takes
          ${site.commsOneWay} each way, so the answer arrives on
          ${site.dayWord} ${state.pendingAdvice.arrivesOnDay}. Today you decide
          on your own.
        </p>
      </div>
    `;
  }

  if (advice) {
    return html`
      <div class="earth">
        ${raw(icon('radio', { size: 17 }))}
        <p>
          <strong>${advice.immediate ? 'Earth says:' : 'Message sent.'}</strong>
          ${advice.text ? `“${advice.text}”` : advice.explain}
        </p>
      </div>
    `;
  }

  return '';
}

/* -------------------------------------------------------------------- coach */

/**
 * Mission control, saying what is new today. It rides the bottom edge of the
 * screen and never blocks a button: the player can ignore it and just play.
 */
/** What the supply rockets have added to the base, so far. */
function renderUpgrades(state) {
  const owned = (state.upgrades || []).map((id) => UPGRADES[id]).filter(Boolean);
  if (!owned.length) return '';
  return html`
    <ul class="upgrades" aria-label="Upgrades from supply rockets">
      ${raw(
        owned
          .map(
            (u) =>
              `<li class="upgrades__chip" style="--chip: var(${u.colorVar})" title="${u.text}">${icon(u.icon, { size: 14 })}<span>${u.name}</span></li>`
          )
          .join('')
      )}
    </ul>
  `;
}

function renderCoach(steps, index) {
  const step = steps[index];
  const last = index === steps.length - 1;
  const dots =
    steps.length > 1
      ? steps
          .map((_, i) => `<span class="${i === index ? 'is-now' : ''}"></span>`)
          .join('')
      : '';

  return html`
    <aside
      class="coach"
      role="dialog"
      aria-label="Mission control, message ${index + 1} of ${steps.length}"
    >
      <div class="coach__who">
        ${raw(
          step.comet
            ? `<span class="coach__face">${cometFace({ size: 38, mood: step.comet })}</span>`
            : icon('radio', { size: 16 })
        )}
        ${step.title}
        <span class="coach__dots" aria-hidden="true">${raw(dots)}</span>
      </div>
      <p class="coach__text">${step.text}</p>
      <div class="coach__foot">
        ${raw(
          last
            ? ''
            : `<button class="btn btn--ghost btn--sm" type="button" data-action="coach-skip">Skip</button>`
        )}
        <button class="btn btn--primary btn--sm" type="button" data-action="coach-next">
          ${last ? 'Got it' : 'Next'}
        </button>
      </div>
    </aside>
  `;
}
