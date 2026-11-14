/**
 * screens/resolve.js
 * -----------------------------------------------------------------------------
 * What happened, shown immediately after the player commits a day.
 *
 * This screen is where the trade-off is actually taught. Every consequence is
 * stated in one short sentence that names the cause ("life support ran 2 blocks
 * short") and the effect ("oxygen fell 12 points"), so the link between choice
 * and outcome is never left for the player to infer.
 *
 * It closes with one real NASA fact chosen to match what just happened.
 */

import { html, raw, cx } from '../dom.js';
import { icon } from '../components/icons.js';
import { cometFace } from '../components/comet.js';
import { pendingSupply } from '../../config/upgrades.js';
import { hudMeters } from '../components/meter.js';
import { sourceTag, sourceTagById } from '../components/source-tag.js';
import { dayRules, LEVELS } from '../../config/levels.js';
import { MEASURED } from '../../data/nasa-sources.js';
import { BALANCE } from '../../config/systems.js';

/**
 * How the day went, according to the dog. One sentence, picked from what
 * actually happened, so it is a second reading of the results that needs no
 * numbers.
 */
function cometSays(outcome, deltas) {
  const eventId = outcome.event ? outcome.event.id : null;
  const rover = 'the rover';
  if (deltas.health < -3) {
    return { mood: 'worried', text: 'is staying close to the crew tonight. They do not feel well.' };
  }
  if (eventId === 'leak') {
    return deltas.oxygen >= 0
      ? { mood: 'happy', text: 'found the hole, the crew patched it, and the hissing has stopped.' }
      : { mood: 'worried', text: 'can still hear the hiss. The pod lost air today.' };
  }
  if (eventId === 'blight') {
    return deltas.food >= 0
      ? { mood: 'happy', text: 'gave the greenhouse one last sniff. The mould is gone.' }
      : { mood: 'worried', text: 'is guarding what is left of the plants. The mould ate some food.' };
  }
  if (eventId === 'quake') {
    return deltas.shieldCm >= 0
      ? { mood: 'happy', text: 'helped the digger push the soil back up. The shield is as thick as before.' }
      : { mood: 'worried', text: 'watched the soil slide off the pod. The shield is thinner tonight.' };
  }
  if (eventId === 'find') {
    return outcome.scienceGained > 0
      ? { mood: 'happy', text: `carried the find home with ${rover}. Double science today!` }
      : { mood: 'worried', text: 'had to leave the find behind. Nobody had power to study it.' };
  }
  if (eventId === 'devil') {
    return { mood: 'happy', text: 'is covered in dust and very pleased. The panels are clean.' };
  }
  if (outcome.storm && outcome.sheltered) {
    return { mood: 'happy', text: 'curled up in the storm room with the crew until the flare passed.' };
  }
  if (outcome.storm) {
    return { mood: 'alert', text: 'did not like that flare one bit.' };
  }
  if (deltas.oxygen < 0 || deltas.food < 0) {
    return { mood: 'worried', text: 'is a little hungry and a little out of breath, like everyone else.' };
  }
  if (outcome.scienceGained > 0) {
    return { mood: 'happy', text: `ran alongside ${rover} all day and came back with a dusty nose.` };
  }
  if (outcome.shieldAdded > 0) {
    return { mood: 'happy', text: 'spent the day barking at the digger. The shield is thicker.' };
  }
  return { mood: 'happy', text: 'had a quiet day and a long nap by the air machine.' };
}

export function renderResolve(ctx) {
  const { state, outcome, note, deltas, site } = ctx;
  const dayLabel = site.dayWord === 'sol' ? 'Sol' : 'Day';
  const isLast = state.over;
  const rules = dayRules(outcome.day, state.training);
  // Finishing the last day of a level is worth marking.
  const levelDone = !isLast && rules.level.to === outcome.day ? rules.level : null;
  const nextLevel = levelDone ? LEVELS.find((l) => l.id === levelDone.id + 1) : null;
  const cameHome = state.endReason === 'completed';
  // Earth sends a rocket after each of the first three levels.
  const rocket = !isLast && pendingSupply(state);
  const comet = cometSays(outcome, deltas);

  const effects = outcome.effects
    .map(
      (e, i) => html`
        <li
          class="${cx('effect', `effect--${e.tone}`)}"
          style="animation-delay: ${i * 60}ms"
        >
          <span class="effect__mark"
            >${e.tone === 'good' ? '✓' : e.tone === 'bad' ? '!' : '~'}</span
          >
          <span>${e.text}</span>
        </li>
      `
    )
    .join('');

  return html`
    <section class="screen stack stack--lg">
      <header class="resolve__head">
        <div>
          <div class="label">${dayLabel} ${outcome.day} complete</div>
          <div class="resolve__day">${dayLabel} ${outcome.day}</div>
        </div>
        <button class="btn btn--ghost btn--sm" type="button" data-action="menu-open">
          ${raw(icon('menu', { size: 16 }))} Menu
        </button>
      </header>
      <div>
        ${raw(
          outcome.storm
            ? html`<p class="dim">
                You got through a real ${outcome.storm.headline}.
              </p>`
            : ''
        )}
      </div>

      ${raw(
        levelDone
          ? html`<div class="levelup levelup--${levelDone.id}">
              <div class="levelup__done">
                ${raw(icon('check', { size: 18 }))} Level ${levelDone.id}
                complete: ${levelDone.name}
              </div>
              ${raw(
                nextLevel
                  ? html`<div class="levelup__next">
                      Next, level ${nextLevel.id}: <strong>${nextLevel.name}</strong>
                    </div>`
                  : ''
              )}
              ${raw(
                rocket
                  ? html`<div class="levelup__rocket">
                      ${raw(icon('rocket', { size: 16 }))} A supply rocket from
                      Earth has landed. Pick one upgrade for your base.
                    </div>`
                  : ''
              )}
            </div>`
          : ''
      )}

      <div class="card">
        ${raw(hudMeters(state, deltas, { unlocked: rules.unlocked }))}
      </div>

      <div class="cometsays cometsays--${comet.mood}">
        <span class="cometsays__face">${raw(cometFace({ size: 46, mood: comet.mood }))}</span>
        <p><strong>Comet</strong> ${comet.text}</p>
      </div>

      <ul class="effects">
        ${raw(effects)}
      </ul>

      <div class="scoreboard">
        ${raw(
          tile('Dose today', `${outcome.doseToday}`, 'mSv', doseColor(outcome.doseToday))
        )}
        ${raw(tile('Science', `+${outcome.scienceGained}`, 'points', 'var(--sys-science)'))}
        ${raw(
          tile(
            'Shield',
            outcome.shieldAdded > 0 ? `+${outcome.shieldAdded}` : '0',
            'cm',
            'var(--sys-shield)'
          )
        )}
        ${raw(
          tile(
            'Banked',
            `${outcome.banked}`,
            outcome.banked === 1 ? 'block' : 'blocks',
            'var(--sys-power)'
          )
        )}
      </div>

      ${raw(outcome.experiment ? renderExperiment(outcome.experiment) : '')}
      ${raw(note ? renderNote(note) : '')}
      ${raw(state.pendingAdvice ? '' : renderArrivedAdvice(ctx))}
      ${raw(ctx.marsPhoto && site.id === 'mars' ? renderMarsPhoto(ctx.marsPhoto) : '')}

      <button
        class="btn btn--primary btn--lg btn--block"
        type="button"
        data-action="${isLast ? (state.training ? 'finish-training' : 'goto-debrief') : 'next-day'}"
      >
        ${state.training && isLast
          ? raw(`${icon('check')} Finish training`)
          : isLast
          ? raw(
              cameHome
                ? `${icon('rocket')} Fly the crew home`
                : `${icon('rocket')} Bring the crew home`
            )
          : rocket
            ? raw(`${icon('rocket')} Open the supply rocket`)
            : raw(`${icon('sun')} Start ${site.dayWord} ${state.day}`)}
      </button>
    </section>
  `;
}

function tile(label, value, unit, color) {
  return html`
    <div class="score-tile" style="--tile-color: ${raw(color)}">
      <div class="score-tile__num">${value}</div>
      <div class="score-tile__label">${label}</div>
      <div class="faint" style="font-size: 0.72rem">${unit}</div>
    </div>
  `;
}

function doseColor(dose) {
  return dose > BALANCE.safeDoseMsvPerDay ? 'var(--danger)' : 'var(--sys-air)';
}

/**
 * The named piece of research the crew finished today.
 *
 * This is what a science point buys. `realBasis` is the line that keeps it
 * honest: it names the mission or instrument that really did this work, so the
 * player can go and look it up.
 */
function renderExperiment(experiment) {
  return html`
    <div class="card card--good">
      <div class="row row--tight" style="margin-bottom: 0.4rem">
        ${raw(icon('flask', { size: 18 }))}
        <span class="label" style="color: var(--good)">Research complete</span>
      </div>
      <div style="font-size: 1.05rem; font-weight: 850; margin-bottom: 0.25rem">
        ${experiment.name}
      </div>
      <p class="dim" style="font-size: 0.95rem; margin-bottom: 0.5rem">
        ${experiment.finding}
      </p>
      <p class="faint" style="font-size: 0.82rem; margin: 0">
        <strong>Really happens:</strong> ${experiment.realBasis}
      </p>
    </div>
  `;
}

function renderNote(note) {
  const m = MEASURED[note.measured];
  if (!m) return '';
  return html`
    <div class="science-note">
      <div class="science-note__kicker">
        ${raw(icon('flask', { size: 15 }))} Real NASA science
      </div>
      <div class="science-note__title">${note.title}</div>
      <p class="dim" style="font-size: 0.95rem; margin: 0">${m.note}</p>
      ${raw(sourceTag(note.measured))}
    </div>
  `;
}

function renderArrivedAdvice(ctx) {
  const { arrivedAdvice, site } = ctx;
  if (!arrivedAdvice) return '';
  return html`
    <div class="card card--inset">
      <div class="row row--tight" style="margin-bottom: 0.4rem">
        ${raw(icon('radio', { size: 18 }))}
        <strong>Earth's reply finally arrived</strong>
      </div>
      <p style="font-size: 0.95rem">&ldquo;${arrivedAdvice.text}&rdquo;</p>
      <p class="faint" style="font-size: 0.82rem; margin: 0">
        You asked on ${site.dayWord} ${arrivedAdvice.askedOnDay}. This is the
        answer, and it is already out of date. Real crews on Mars will have to
        work this way.
      </p>
    </div>
  `;
}

/* ------------------------------------------------------- real Mars imagery */

/**
 * A real photograph taken by Curiosity, shown between days on Mars missions.
 *
 * It is not decoration: it is the ground the player is notionally standing on,
 * fetched live from NASA's Mars Rover Photos API, with the sol and Earth date
 * it was taken attached. Children who have been told the data is real can see
 * a piece of it. It lives here, between days, rather than on the planning
 * screen, where it was one more thing competing with the decision.
 */
function renderMarsPhoto(photo) {
  return html`
    <div class="card card--inset">
      <div class="row row--tight" style="margin-bottom: var(--gap-sm)">
        ${raw(icon('info', { size: 18 }))}
        <strong>Outside your window</strong>
      </div>
      <img
        src="${photo.url}"
        alt="A real photograph of the Martian surface taken by NASA's Curiosity rover on sol ${photo.sol}."
        loading="lazy"
        style="width: 100%; border-radius: var(--radius-sm); display: block; background: var(--bg-inset)"
      />
      <p class="faint" style="font-size: 0.78rem; margin: 0.5rem 0 0">
        Really Mars. Taken by ${photo.rover || 'Curiosity'}'s
        ${photo.camera || 'navigation camera'} on sol ${photo.sol}
        (${photo.earthDate}).
      </p>
      ${raw(
        sourceTagById(
          'MARS_ROVER_PHOTOS',
          'fetched live from the Mars Rover Photos API'
        )
      )}
    </div>
  `;
}

