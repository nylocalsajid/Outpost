/**
 * screens/how-to-play.js
 * -----------------------------------------------------------------------------
 * The rules, in four screens' worth of plain language on one page.
 *
 * Written to be read by a seven-year-old, or skipped entirely by a twelve-year
 * old who would rather press buttons. It is reachable from the title screen and
 * from the HUD during a mission, so a player who gets lost on sol 6 can check
 * the rules without losing their game.
 *
 * The tone rule here: explain the SYSTEM, never the optimal strategy. Telling a
 * child "always build your shield first" would remove the decision the whole
 * game exists to teach.
 */

import { html, raw } from '../dom.js';
import { icon } from '../components/icons.js';
import { cometFace } from '../components/comet.js';
import { UPGRADES } from '../../config/upgrades.js';
import { SYSTEMS, BALANCE, TOTAL_DEMAND } from '../../config/systems.js';
import { LEVELS } from '../../config/levels.js';
import { EVENTS } from '../../config/events.js';
import { SITES } from '../../config/sites.js';

export function renderHowToPlay() {
  const systemRows = SYSTEMS.map(
    (s) => html`
      <div
        class="alloc__row"
        style="--row-color: var(${raw(s.colorVar)}); grid-template-columns: 1fr"
      >
        <div class="alloc__info">
          <div class="alloc__name">
            ${raw(icon(s.icon, { size: 17 }))} ${s.name}
            <span class="faint" style="font-weight: 600; font-size: 0.85rem"
              >&mdash; wants ${s.demand} blocks</span
            >
          </div>
          <p class="dim" style="font-size: 0.88rem; margin: 0.3rem 0 0">
            ${s.whatItDoes}
          </p>
          <p
            class="faint"
            style="font-size: 0.85rem; margin: 0.3rem 0 0; font-style: italic"
          >
            Starve it: ${s.ifYouStarveIt}
          </p>
        </div>
      </div>
    `
  ).join('');

  return html`
    <section class="screen stack stack--lg">
      <div>
        <button class="btn btn--ghost btn--sm" type="button" data-action="back">
          ${raw(icon('back', { size: 16 }))} Back
        </button>
      </div>

      <div>
        <h1>How to play</h1>
        <p class="dim" style="max-width: 60ch">
          You are the person who decides what the outpost does each day. Nobody
          else. Here is everything you need.
        </p>
      </div>

      <!-- levels ---------------------------------------------------------- -->
      <div class="card card--lg">
        <h2>The mission is ${BALANCE.missionDays} days, in four levels</h2>
        <p>It starts easy and gets harder. Each level you get less power.</p>
        <div class="levels-list">
          ${raw(
            LEVELS.map(
              (l) => `
                <div class="levels-list__row">
                  <span class="level level--${l.id}">Level ${l.id}</span>
                  <span>
                    <strong>${l.name}</strong>
                    <span class="dim"> &middot; days ${l.from} to ${l.to}</span>
                    <br />
                    <span class="dim" style="font-size: 0.9rem">${l.intro}</span>
                  </span>
                </div>`
            ).join('')
          )}
        </div>
        <p class="dim" style="margin: var(--gap-sm) 0 0">
          After day ${BALANCE.missionDays}, your crew flies home and you find
          out how the mission went.
        </p>
      </div>

      <!-- 1 --------------------------------------------------------------- -->
      <div class="card card--lg">
        <div class="row row--tight" style="margin-bottom: 0.5rem">
          <span class="badge">Step 1</span>
          <h2 style="margin: 0">You get power. Not enough of it.</h2>
        </div>
        <p>
          Every day your solar panels make <strong>power blocks</strong>. You
          can see them as little yellow bars at the top of the power board.
        </p>
        <p>
          Running everything properly takes
          <strong>${TOTAL_DEMAND} blocks</strong>. Once the base is set up you
          never have ${TOTAL_DEMAND}: you get
          ${LEVELS.slice(1).map((l) => l.blocks).join(', then ')} as the levels
          go on.
        </p>
        <div class="pill-note">
          <strong>This is the whole game.</strong> You are always a few blocks
          short, so every day you choose what to leave hungry. There is no
          clever answer that gives you everything &mdash; real mission planners
          do not have one either.
        </div>
      </div>

      <!-- 2 --------------------------------------------------------------- -->
      <div class="card card--lg">
        <div class="row row--tight" style="margin-bottom: 0.5rem">
          <span class="badge">Step 2</span>
          <h2 style="margin: 0">Share the blocks between four systems</h2>
        </div>
        <p>
          Use the big <strong>+</strong> and <strong>&minus;</strong> buttons to
          move blocks around.
        </p>
        <div class="stack stack--sm" style="margin: var(--gap) 0">
          ${raw(systemRows)}
        </div>
        <p class="dim" style="font-size: 0.92rem; margin: 0">
          Air and food turn <strong>red</strong> when they are short, because
          running out of those hurts your crew quickly. Shielding and science go
          <strong>dim</strong> instead when you skip them &mdash; skipping those
          is allowed, and sometimes right. The bill just arrives later.
        </p>
      </div>

      <!-- 3 --------------------------------------------------------------- -->
      <div class="card card--lg">
        <div class="row row--tight" style="margin-bottom: 0.5rem">
          <span class="badge badge--danger"
            ><span class="badge__dot"></span>Step 3</span
          >
          <h2 style="margin: 0">When the Sun flares, you cannot build</h2>
        </div>
        <p>
          Some days a <strong>space weather warning</strong> appears in red. A
          real solar flare has gone off, and a wave of fast particles is coming.
        </p>
        <p>
          Here is the part that catches everyone out:
          <strong
            >regolith you pile today does not protect you until tomorrow.</strong
          >
          The particles arrive within hours of the flare. You cannot shovel dirt
          fast enough.
        </p>
        <p>
          Watch the <strong>blue shield</strong> around your pod in the
          picture. It shows what your pile of regolith can take: it holds, it
          cracks and turns orange, or it turns red and shatters. A storm that
          gets through leaves a scar on it for the rest of the mission.
        </p>
        <p>So on a storm day you only have two real options:</p>
        <ul>
          <li>
            <strong>Keep working</strong> and take the dose your current shield
            lets through.
          </li>
          <li>
            <strong>Shelter in the storm room</strong> &mdash; much safer, but the
            rover stops and you lose most of the day's science.
          </li>
        </ul>
        <div class="pill-note">
          The game shows you both numbers before you choose: how many mSv you
          take if you work, and how many if you hide. If you have no spare
          blocks, pressing shelter will quietly take them back from science for
          you.
        </div>
      </div>

      <!-- events ---------------------------------------------------------- -->
      <div class="card card--lg">
        <h2>It is not only the Sun</h2>
        <p>
          From level 2 on, every day with no flare brings something else. Each
          one makes a <strong>different</strong> system the important one for
          the day, so the plan that worked yesterday may be wrong today. You
          cannot miss them: a big card at the top of the day tells you what
          happened and what to do.
        </p>
        <div class="levels-list">
          ${raw(
            Object.values(EVENTS)
              .map(
                (e) => `
                <div class="levels-list__row">
                  <strong>${e.label(SITES.moon) === 'Moonquake' ? 'Quake' : e.label(SITES.moon)}</strong>
                  <span>
                    <span class="dim">${e.text(e.sites ? SITES[e.sites[0]] : SITES.moon)}</span>
                    <br />
                    <span class="faint" style="font-size: 0.85rem">Really happens: ${e.real(e.sites ? SITES[e.sites[0]] : SITES.moon)}</span>
                  </span>
                </div>`
              )
              .join('')
          )}
        </div>
      </div>

      <!-- Comet ----------------------------------------------------------- -->
      <div class="card card--lg">
        <div class="howto-comet">
          ${raw(cometFace({ size: 72, mood: 'happy' }))}
          <div>
            <h2>Comet, the crew&rsquo;s dog</h2>
            <p>
              Comet wears an orange suit and a bubble helmet, and has a name
              tag so you can find it in the picture. Give
              <strong>Science Research</strong> some power and Comet trots out
              behind the rover. When the Sun flares, Comet comes indoors with
              the crew.
            </p>
            <p class="dim" style="margin-bottom: 0">
              Comet is also the first to notice trouble. When something goes
              wrong it barks, and after each day it tells you how the day went.
            </p>
          </div>
        </div>
      </div>

      <!-- supply rockets -------------------------------------------------- -->
      <div class="card card--lg">
        <h2>Supply rockets</h2>
        <p>
          Each time you finish a level, Earth sends a cargo rocket with three
          crates. Your base has room for <strong>one</strong>. You keep it for
          the rest of the mission, so by the end you have three upgrades, and
          no two missions build the same base.
        </p>
        <div class="levels-list">
          ${raw(
            Object.values(UPGRADES)
              .map(
                (u) => `
                <div class="levels-list__row">
                  <strong>${u.name}</strong>
                  <span class="dim">${u.text}</span>
                </div>`
              )
              .join('')
          )}
        </div>
        <p class="faint" style="font-size: 0.85rem; margin-bottom: 0">
          Really happens: cargo rockets have kept the International Space
          Station supplied for more than twenty years.
        </p>
      </div>

      <!-- 4 --------------------------------------------------------------- -->
      <div class="card card--lg">
        <div class="row row--tight" style="margin-bottom: 0.5rem">
          <span class="badge">Step 4</span>
          <h2 style="margin: 0">Staying alive is not winning</h2>
        </div>
        <p>
          You could fund air and food every single day, hide from every storm,
          and reach the end with a perfectly healthy crew. That is a
          <strong>failed mission</strong>.
        </p>
        <p>
          A rocket cost billions to put you there, and it was sent to find
          something out. You need <strong>science points</strong>, and the only
          way to get them is to spend power on research &mdash; power you could
          have spent making yourself safer.
        </p>
        <p class="dim" style="margin: 0">
          The best missions do both. They are hard.
        </p>
      </div>

      <!-- the meters ------------------------------------------------------ -->
      <div class="card">
        <h2>The bars at the top</h2>
        <ul class="dim" style="font-size: 0.95rem; margin: 0">
          <li>
            <strong style="color: var(--sys-air)">Oxygen</strong> &mdash; the air
            your crew breathes. Below 30% they start getting hurt.
          </li>
          <li>
            <strong style="color: var(--sys-food)">Food</strong> &mdash; stores
            plus whatever the greenhouse grows. Below 30% they go hungry.
          </li>
          <li>
            <strong style="color: var(--sys-shield)">Shield</strong> &mdash;
            centimetres of soil piled on the habitat. Only this protects you from
            flares.
          </li>
          <li>
            <strong style="color: var(--sys-health)">Crew</strong> &mdash; how
            your people are doing. Hits zero and the mission is over.
          </li>
          <li>
            <strong style="color: var(--sys-science)">Science</strong>
            &mdash; how much science you have collected, and how much the
            mission needs. Fill this bar to succeed.
          </li>
        </ul>
      </div>

      <!-- words ----------------------------------------------------------- -->
      <div class="card card--inset">
        <h2>Words you will see</h2>
        <div class="provenance">
          <div class="provenance__row">
            <span class="provenance__key">mSv (millisievert)</span>
            <span class="provenance__val"
              >How much radiation a body soaked up. A chest X-ray is about 0.1
              mSv.</span
            >
          </div>
          <div class="provenance__row">
            <span class="provenance__key">Regolith</span>
            <span class="provenance__val"
              >The loose broken rock and dust covering the Moon and Mars. Free
              building material, and good shielding.</span
            >
          </div>
          <div class="provenance__row">
            <span class="provenance__key">Sol</span>
            <span class="provenance__val"
              >A day on Mars. 24 hours and 39 minutes &mdash; about 40 minutes
              longer than yours.</span
            >
          </div>
          <div class="provenance__row">
            <span class="provenance__key">Solar flare</span>
            <span class="provenance__val"
              >A huge burst of energy from the Sun. Sorted into classes:
              C, then M, then X. Each letter is ten times stronger than the one
              before.</span
            >
          </div>
          <div class="provenance__row">
            <span class="provenance__key">Dose equivalent</span>
            <span class="provenance__val"
              >Radiation measured by how much harm it does to living tissue, not
              just how much energy it carries.</span
            >
          </div>
        </div>
      </div>

      <div class="row" style="justify-content: center">
        <button class="btn btn--primary btn--lg" type="button" data-action="goto-sites">
          ${raw(icon('rocket'))} Start a mission
        </button>
        <button class="btn btn--ghost" type="button" data-action="back">
          Back
        </button>
      </div>
    </section>
  `;
}
