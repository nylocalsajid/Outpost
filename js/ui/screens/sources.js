/**
 * screens/sources.js
 * -----------------------------------------------------------------------------
 * Full data provenance, inside the tool.
 *
 * Three sections, because judges and teachers need different things:
 *   1. what is real, and where each number came from
 *   2. what is modelled, stated plainly -- the honesty section
 *   3. the API key control, so a player can use their own and get live data
 *
 * Section 2 is the one most projects leave out. It is here deliberately: a tool
 * that says which of its numbers are NOT NASA data is more trustworthy, not
 * less.
 */

import { html, raw } from '../dom.js';
import { icon } from '../components/icons.js';
import {
  dataSources,
  backgroundSources,
  MEASURED,
  SOURCES,
} from '../../data/nasa-sources.js';
import { dataModeBadge, dataModeLine } from '../components/source-tag.js';
import { BALANCE } from '../../config/systems.js';
import { getApiKey, usingOwnKey } from '../../data/nasa-client.js';
import { ARCHIVE_WINDOW } from '../../data/archive.js';

export function renderSources(ctx) {
  const { weather, osdr } = ctx;

  const renderSourceGroup = (list) =>
    list
      .map(
        (s) => html`
          <div class="source-item">
            <div class="source-item__label">${s.label}</div>
            <!-- A reference is given as published: names and titles stay as they are. -->
            <div class="source-item__meta" data-no-tr>
              ${s.authors} &mdash; <em>${s.title}</em>${s.publication
                ? raw(`, ${s.publication}`)
                : ''}
            </div>
            <div class="source-item__dataset" data-no-tr>${s.dataset}</div>
            <a
              data-no-tr
              href="${s.url}"
              target="_blank"
              rel="noopener noreferrer"
              style="font-size: 0.82rem"
              >${s.url}</a
            >
          </div>
        `
      )
      .join('');

  const measurements = Object.entries(MEASURED)
    .map(([key, m]) => {
      const s = SOURCES[m.source];
      const value = Array.isArray(m.value) ? m.value.join(' to ') : m.value;
      return html`
        <tr>
          <td style="padding: 0.4rem 0.6rem 0.4rem 0">
            <strong data-no-tr dir="ltr">${value} ${m.unit}</strong>
          </td>
          <td style="padding: 0.4rem 0.6rem 0.4rem 0; color: var(--text-dim)">
            ${m.note}
          </td>
          <td style="padding: 0.4rem 0">
            <a data-no-tr href="${s.url}" target="_blank" rel="noopener noreferrer"
              >${s.id}</a
            >
          </td>
        </tr>
      `;
    })
    .join('');

  return html`
    <section class="screen stack stack--lg">
      <div>
        <button class="btn btn--ghost btn--sm" type="button" data-action="back">
          ${raw(icon('back', { size: 16 }))} Back
        </button>
      </div>

      <div>
        <h1>Where the data comes from</h1>
        <p class="dim" style="max-width: 64ch">
          Everything this game tells you about radiation, solar flares,
          sunlight, radio delay and astronaut health is a real published
          measurement. This page lists all of it, and then lists the parts that
          are <em>not</em> real, so you can tell the difference.
        </p>
      </div>

      <!-- 1. live status -------------------------------------------------- -->
      <div class="card">
        <div class="card__head">
          <h2 style="margin: 0">Space weather feed</h2>
          ${raw(dataModeBadge(weather))}
        </div>
        ${raw(dataModeLine(weather))}
        <hr class="divider" />
        <p class="dim" style="font-size: 0.92rem">
          The game asks NASA's DONKI database for every solar flare in the last
          60 days. If that works, your mission's storms are the ones the Sun has
          actually produced recently, and the badge says
          <strong>Live</strong>. If it does not work &mdash; no connection, or
          the key has reached its hourly limit &mdash; the game falls back to a
          stored set of real records from ${ARCHIVE_WINDOW.label}, and the badge
          says <strong>Archived</strong>. It never shows stored data as live.
        </p>

        <div class="provenance">
          <div class="provenance__row">
            <span class="provenance__key">Archive window</span>
            <span class="provenance__val"
              >${ARCHIVE_WINDOW.startDate} to ${ARCHIVE_WINDOW.endDate},
              ${ARCHIVE_WINDOW.activeRegion}</span
            >
          </div>
          <div class="provenance__row">
            <span class="provenance__key">Why that window</span>
            <span class="provenance__val">${ARCHIVE_WINDOW.summary}</span>
          </div>
        </div>
      </div>

      <!-- 2. your own key ------------------------------------------------- -->
      <div class="card card--inset">
        <h2 style="margin-bottom: 0.4rem">Use your own NASA API key</h2>
        <p class="dim" style="font-size: 0.92rem">
          The game uses Team Sajid's own free NASA key. If a lot of people
          play at once, it can reach its hourly limit. A free key of your own
          from
          <a href="https://api.nasa.gov/" target="_blank" rel="noopener noreferrer"
            >api.nasa.gov</a
          >
          takes a few seconds to get and keeps live data coming. It is stored
          only in your own browser.
        </p>
        <div class="row">
          <input
            id="api-key-input"
            type="text"
            placeholder="${usingOwnKey() ? getApiKey() : 'Paste your key here'}"
            autocomplete="off"
            spellcheck="false"
            style="flex: 1 1 220px; min-height: var(--touch); padding: 0 0.9rem; border-radius: var(--radius-pill); border: 1px solid var(--line-strong); background: var(--bg-inset); color: var(--text); font: inherit; font-family: var(--font-mono)"
          />
          <button class="btn btn--sm" type="button" data-action="save-key">
            Save key
          </button>
          ${raw(
            usingOwnKey()
              ? html`<button
                  class="btn btn--sm btn--ghost"
                  type="button"
                  data-action="clear-key"
                >
                  Use the team key
                </button>`
              : ''
          )}
        </div>
        <p class="faint" style="font-size: 0.8rem; margin: 0.5rem 0 0">
          Currently using:
          <strong>${usingOwnKey() ? 'your own key' : 'the Team Sajid key'}</strong>
        </p>
      </div>

      <!-- 3. every measurement -------------------------------------------- -->
      <div class="card">
        <h2>Every real number in the game</h2>
        <div style="overflow-x: auto">
          <table style="width: 100%; border-collapse: collapse; font-size: 0.88rem">
            <thead>
              <tr
                style="text-align: left; color: var(--text-faint); border-bottom: 1px solid var(--line)"
              >
                <th scope="col" style="padding: 0.4rem 0.6rem 0.4rem 0">Value</th>
                <th scope="col" style="padding: 0.4rem 0.6rem 0.4rem 0">
                  What it means
                </th>
                <th scope="col" style="padding: 0.4rem 0">Source</th>
              </tr>
            </thead>
            <tbody>
              ${raw(measurements)}
            </tbody>
          </table>
        </div>
      </div>

      <!-- 4. what is NOT real --------------------------------------------- -->
      <div class="card card--warn">
        <div class="row row--tight" style="margin-bottom: 0.5rem">
          ${raw(icon('alert', { size: 20 }))}
          <h2 style="margin: 0">What is <em>not</em> real</h2>
        </div>
        <p class="dim" style="font-size: 0.92rem">
          A game has to turn measurements into rules, and the rules are ours,
          not NASA's. These are the parts we invented or simplified:
        </p>
        <ul class="dim" style="font-size: 0.92rem">
          <li>
            <strong>Power blocks.</strong> Real outposts budget power in
            kilowatt-hours. A handful of countable blocks a day is a teaching
            abstraction, not an engineering figure.
          </li>
          <li>
            <strong>Flare to dose conversion.</strong> The flares are real
            DONKI records, but turning a GOES class into a surface dose uses a
            simple ladder (M-class ${BALANCE.sepDoseByClass.M} mSv, X1&ndash;X4
            ${BALANCE.sepDoseByClass.X_small} mSv, X5 and up
            ${BALANCE.sepDoseByClass.X_large} mSv unshielded). Real surface
            doses depend on the particle energies, the direction of the event
            and the local atmosphere, and vary enormously between events.
          </li>
          <li>
            <strong>Shielding curve.</strong> Dose falls off exponentially with
            regolith depth in this model, scaled so that 3 m cuts it to about
            13%. The 3 m figure is NASA's; the exponential shape is a
            simplification. Real shielding is stranger than this &mdash; NASA
            Langley calculations show that adding more of certain
            non-hydrogen-rich materials past a point can
            <em>increase</em> dose, because fast particles smashing into the
            shield create showers of secondary particles.
          </li>
          <li>
            <strong>Oxygen, food and crew health scales.</strong> Percentages
            and the rates they change at are tuned for a fourteen-day game, not
            derived from life-support engineering.
          </li>
          <li>
            <strong>Mission control's advice.</strong> Written by us, based on
            the state of your outpost. The radio delay it is subject to is real.
          </li>
        </ul>
        <p class="faint" style="font-size: 0.82rem; margin: 0">
          ${raw(
            `Source for the secondary-particle point: <a href="${SOURCES.SHIELD_SLABA_2017.url}" target="_blank" rel="noopener noreferrer">${SOURCES.SHIELD_SLABA_2017.label}</a>.`
          )}
        </p>
      </div>

      <!-- 5. how it was made --------------------------------------------- -->
      <div class="card">
        <h2 style="margin-bottom: 0.4rem">How this game was made</h2>
        <p class="dim" style="font-size: 0.92rem">
          OUTPOST is a game by Team Sajid (Saged) for the 2026 NASA Space Apps
          Challenge.
        </p>
        <ul class="dim" style="font-size: 0.92rem">
          <li>
            <strong>Idea and direction.</strong> Saged decided what the game is,
            how it should look and what it should teach, and tested every version.
          </li>
          <li>
            <strong>Sound.</strong> The music and sound effects are played by
            the browser from notes written in that code. The spoken guide uses
            the voice already built into your device.
          </li>
          <li>
            <strong>Data.</strong> Every NASA measurement and solar flare
            record comes from a real published source, listed on this page.
          </li>
        </ul>
      </div>

      <!-- 6. OSDR live library -------------------------------------------- -->
      <div class="card">
        <div class="card__head">
          <h2 style="margin: 0">Astronaut health studies</h2>
          <button class="btn btn--sm btn--ghost" type="button" data-action="load-osdr">
            ${raw(icon('replay', { size: 15 }))} Search OSDR
          </button>
        </div>
        <p class="dim" style="font-size: 0.92rem">
          Real studies from NASA's Open Science Data Repository on what
          spaceflight does to a body &mdash; the reason crew health is a resource
          in this game and not a number that only goes down when you are
          careless.
        </p>
        ${raw(renderOsdr(osdr))}
      </div>

      <!-- 6. sources -------------------------------------------------------- -->
      <div>
        <h2>Datasets the game actually reads</h2>
        <p class="dim" style="font-size: 0.92rem">
          The game pulls real numbers or images out of each of these. Nothing is
          listed here that the game does not genuinely use.
        </p>
        <div class="source-list">${raw(renderSourceGroup(dataSources()))}</div>
      </div>

      <div>
        <h2>Background the game cites</h2>
        <p class="dim" style="font-size: 0.92rem">
          These support statements the game makes in words &mdash; the 3 m
          shielding figure, the radio delay to Mars, what spaceflight does to
          bone. The game does not read numbers from them automatically.
        </p>
        <div class="source-list">
          ${raw(renderSourceGroup(backgroundSources()))}
        </div>
      </div>

      <div>
        <button class="btn btn--primary" type="button" data-action="back">
          ${raw(icon('back', { size: 16 }))} Back to the game
        </button>
      </div>
    </section>
  `;
}

function renderOsdr(osdr) {
  if (!osdr) {
    return html`<p class="faint" style="font-size: 0.88rem">
      Press <strong>Search OSDR</strong> to query the live repository.
    </p>`;
  }
  if (osdr.loading) {
    return html`<div class="row row--tight">
      <span class="spinner"></span>
      <span class="dim" style="font-size: 0.9rem">Searching OSDR&hellip;</span>
    </div>`;
  }

  const items = osdr.studies
    .map(
      (s) => html`
        <li>
          <span data-no-tr dir="ltr"><strong>${s.accession || 'study'}</strong> &mdash; ${s.title}</span>
          ${s.plain ? raw(`<br /><span class="faint">${s.plain}</span>`) : ''}
        </li>
      `
    )
    .join('');

  return html`
    <div>
      <div class="row row--tight" style="margin-bottom: 0.4rem">
        <span class="badge ${osdr.live ? 'badge--live' : 'badge--archive'}"
          ><span class="badge__dot"></span>${osdr.live
            ? 'Live OSDR results'
            : 'Stored OSDR studies'}</span
        >
      </div>
      <ul class="dim" style="font-size: 0.9rem">
        ${raw(items)}
      </ul>
      ${raw(
        osdr.live
          ? ''
          : html`<p class="faint" style="font-size: 0.8rem; margin: 0">
              The live search could not be reached, so these are real study
              records stored in the game.
            </p>`
      )}
    </div>
  `;
}
