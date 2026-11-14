/**
 * app.js
 * -----------------------------------------------------------------------------
 * The controller. Owns view state, dispatches actions, re-renders.
 *
 * Architecture, kept strict on purpose:
 *   - the SIMULATION (js/sim) never touches the DOM
 *   - SCREENS (js/ui/screens) are pure functions: state in, markup out
 *   - this file is the ONLY place that mutates anything or talks to both sides
 *
 * That means any bug is in exactly one of three places, and the simulation can
 * be tested without a browser.
 */

import { mount, morph, delegate, announce, scrollToTop } from './dom.js';
import {
  createMission,
  emptyAllocation,
  suggestedAllocation,
  allocationTotal,
} from '../sim/state.js';
import {
  planDay,
  validateAllocation,
  resolveDay,
  requestAdvice,
} from '../sim/engine.js';
import { getSite } from '../config/sites.js';
import { BALANCE, getSystem } from '../config/systems.js';
import {
  loadSpaceWeather,
  archiveWeather,
  trainingWeather,
} from '../data/space-weather.js';
import { pickNote } from '../config/science-notes.js';
import { searchOsdr, setApiKey, fetchMarsPhoto } from '../data/nasa-client.js';
import { OSDR_FALLBACK_STUDIES } from '../data/archive.js';
import { randomSeedCode } from '../sim/rng.js';
import {
  sfx,
  toggleMute,
  isMuted,
  startMusic,
  toggleMusic,
  isMusicOn,
  setMusicMood,
} from './audio.js';
import { pendingSupply, takeUpgrade, UPGRADES } from '../config/upgrades.js';
import {
  saveMission,
  loadMission,
  clearMission,
  hasSavedMission,
  hasSeenGuide,
  markGuideSeen,
  savedLanguage,
  hasBeenWelcomed,
  markWelcomed,
  saveScore,
  bestScore,
} from '../data/persistence.js';
import { gradeMission, missionScore } from '../sim/scoring.js';
import { TRAINING_STEPS } from '../config/training.js';
import { localize, localizeStatic, getLang, setLang, applyDocumentLanguage, tr } from './i18n.js';
import { createGuide } from './guide.js';
import { speak, stopSpeaking, toggleVoice, isVoiceOn } from './voice.js';
import { EXPERIMENTS } from '../config/experiments.js';

import { sceneFeedback } from './components/outpost-scene.js';
import { renderMenu } from './screens/menu.js';
import { playReturnFlight } from './screens/debrief.js';

import { renderTitle } from './screens/title.js';
import { renderSiteSelect } from './screens/site-select.js';
import { renderSol, coachSteps } from './screens/sol.js';
import { renderResolve } from './screens/resolve.js';
import { renderSupply } from './screens/supply.js';
import { renderTrained } from './screens/trained.js';
import { renderWelcome } from './screens/welcome.js';
import { renderDebrief } from './screens/debrief.js';
import { renderSources } from './screens/sources.js';
import { renderHowToPlay } from './screens/how-to-play.js';

const SCREENS = {
  title: renderTitle,
  howto: renderHowToPlay,
  sites: renderSiteSelect,
  sol: renderSol,
  resolve: renderResolve,
  supply: renderSupply,
  trained: renderTrained,
  debrief: renderDebrief,
  sources: renderSources,
};

export function createApp(root) {
  /** @type {Object} all view state lives here and nowhere else */
  const view = {
    screen: 'title',
    /** Where `back` returns to after an overlay screen. */
    returnTo: 'title',
    weather: null,
    mission: null,
    plan: null,
    allocation: emptyAllocation(),
    /** The system the player last gave or took a block from, for the caption. */
    focus: null,
    /** What mission control has to say today, and which line it is on
     *  (null once the player has heard it all). */
    coachList: [],
    coach: null,
    /** True while a day is being played out in the picture, between pressing
     *  Run and seeing the results. */
    running: false,
    /** The pause menu: null, 'open', or 'confirm-restart'. */
    menu: null,
    /**
     * The welcome a new player gets: 'lang' (which language?), then 'offer'
     * (shall Comet show you how to play?), then null for good.
     */
    welcome: hasBeenWelcomed() ? null : savedLanguage() ? 'offer' : 'lang',
    /** How many steps of the training guide the player has been through. */
    guideSeen: 0,
    /** How the mission just finished compares with the best so far. */
    scoreResult: null,
    /** Has the flight home at the end of this mission already played? */
    flown: false,
    advice: null,
    arrivedAdvice: null,
    outcome: null,
    note: null,
    deltas: {},
    shownNotes: new Set(),
    osdr: null,
    /** A real Curiosity photo, loaded once per Mars mission. */
    marsPhoto: null,
    /** Is there a mission in progress from a previous visit? */
    hasSave: hasSavedMission(),
    /** Transient confirmation after copying the mission result. */
    copied: false,
  };

  /* ------------------------------------------------------------- rendering */

  /** What is currently on screen, when it is something that can be patched. */
  let mountedKey = null;

  function render() {
    const renderer = SCREENS[view.screen];
    if (!renderer) throw new Error(`No screen: ${view.screen}`);

    const ctx = buildContext();
    const english =
      renderer(ctx) +
      (view.menu
        ? renderMenu({
            mission: view.mission,
            weather: view.weather,
            menu: view.menu,
            musicOn: isMusicOn(),
            muted: isMuted(),
            voiceOn: isVoiceOn(),
            lang: getLang(),
          })
        : '') +
      (view.welcome ? renderWelcome({ stage: view.welcome, lang: getLang() }) : '');
    // Every screen is written in English; this is where it becomes Arabic.
    const markup = localize(english);

    // The music follows the game: darker when a flare is coming, brighter on
    // the front page and on the way home.
    setMusicMood(
      view.screen === 'sol' && view.plan
        ? view.plan.storm
          ? 'storm'
          : 'calm'
        : view.screen === 'resolve' || view.screen === 'supply'
          ? 'calm'
          : 'home'
    );

    // The page itself changes mood with the game: a little more of the Sun's
    // glare each level, and a different sky altogether once the crew is home.
    document.body.dataset.screen = view.screen;
    document.body.dataset.training =
      view.mission && view.mission.training && view.screen !== 'title' ? 'yes' : 'no';
    document.body.dataset.level =
      view.screen === 'sol' && view.plan ? String(view.plan.level.id) : '';
    document.body.dataset.tier =
      view.screen === 'debrief' && view.mission ? gradeMission(view.mission).tier : '';

    // Re-rendering the day already on screen (a block moved, Earth replied)
    // patches it in place, so the outpost picture keeps moving and the button
    // just pressed keeps focus. Anything else is a clean swap.
    const key = screenKey();
    if (key && key === mountedKey) morph(root, markup);
    else mount(root, markup);
    mountedKey = key;

    syncGuide();
  }

  function screenKey() {
    if (view.screen !== 'sol' || !view.mission) return null;
    return `sol:${view.mission.seedCode}:${view.mission.day}:${getLang()}`;
  }

  /** Assemble exactly what the current screen needs. */
  function buildContext() {
    const base = {
      weather: view.weather,
      osdr: view.osdr,
      marsPhoto: view.marsPhoto,
      hasSave: view.hasSave,
      muted: isMuted(),
      musicOn: isMusicOn(),
      copied: view.copied,
      lang: getLang(),
      best: bestScore(),
    };

    switch (view.screen) {
      case 'sol':
        return {
          ...base,
          state: view.mission,
          plan: view.plan,
          allocation: view.allocation,
          validation: validateAllocation(view.plan, view.allocation),
          focus: view.focus,
          coach: view.coach,
          coachList: view.coachList,
          running: view.running,
          advice: view.advice,
          deltas: view.deltas,
          site: view.plan.site,
        };
      case 'resolve':
        return {
          ...base,
          state: view.mission,
          outcome: view.outcome,
          note: view.note,
          deltas: view.deltas,
          arrivedAdvice: view.arrivedAdvice,
          site: getSite(view.mission.siteId),
        };
      case 'supply':
        return {
          ...base,
          state: view.mission,
          site: getSite(view.mission.siteId),
          offer: pendingSupply(view.mission),
        };
      case 'debrief':
        return {
          ...base,
          state: view.mission,
          site: getSite(view.mission.siteId),
          flown: view.flown,
          scoreResult: view.scoreResult,
        };
      default:
        return base;
    }
  }

  /**
   * Screens you can open and then return from, without losing your place.
   * Opening one records where you came from; `back` returns exactly there.
   *
   * Tracking this explicitly, rather than "the previous screen", matters:
   * during a mission the previous screen is often the last day's results, and
   * returning there would drop the player back into a day they already played.
   */
  const OVERLAY_SCREENS = new Set(['sources', 'howto']);

  function goto(screen) {
    if (OVERLAY_SCREENS.has(screen) && !OVERLAY_SCREENS.has(view.screen)) {
      view.returnTo = view.screen;
    }
    view.screen = screen;
    view.menu = null;
    render();
    scrollToTop();
  }

  /* ------------------------------------------------------- mission control */

  function startMission(siteId, seedCode = randomSeedCode()) {
    view.mission = createMission({ siteId, seedCode });
    view.shownNotes = new Set();
    view.advice = null;
    view.arrivedAdvice = null;
    view.copied = false;
    view.flown = false;
    view.scoreResult = null;
    beginDay();
    saveMission(view.mission);
    view.hasSave = true;
    goto('sol');
    speakCoach();

    // Real Curiosity imagery for Mars missions. Loaded after the screen is
    // already up, so a slow or blocked request never delays play; if it never
    // arrives, the outpost card simply has no photo.
    if (siteId === 'mars' && !view.marsPhoto) {
      loadMarsPhoto();
    }
    announce(
      `Mission started at ${getSite(siteId).name}. Day 1 of ${BALANCE.missionDays}.`
    );
  }

  /** Prepare the day the player is about to play. */
  function beginDay() {
    view.running = false;
    // A quick player can start a mission before the live feed has answered.
    // The bundled NASA archive is always there, so play it from that rather
    // than wait; the same storms a mission starts with, it keeps.
    if (!view.weather) view.weather = archiveWeather(BALANCE.missionDays);
    const training = Boolean(view.mission.training);
    view.plan = planDay(view.mission, training ? trainingWeather() : view.weather);
    // In training the board starts empty: the player places every block
    // themselves, with Comet pointing. Otherwise it starts from a sensible plan.
    view.allocation = training
      ? emptyAllocation()
      : suggestedAllocation(view.plan.blocksAvailable, view.plan.unlocked, view.plan.usual);
    view.focus = null;
    // Mission control speaks when there is something new: a system coming on
    // line, a new level, or a first-time player who needs showing around.
    // (In training the guide does all the talking.)
    view.coachList = training ? [] : coachSteps(view.plan, !hasSeenGuide());
    view.coach = view.coachList.length ? 0 : null;
    view.advice = null;
    view.deltas = {};
    if (view.plan.storm) sfx.stormAlert();
    else if (view.plan.event) sfx.bark();
  }

  /**
   * Go to the day the mission is on -- by way of the supply rocket, if one
   * has arrived and has not been unpacked yet.
   */
  function enterDay() {
    if (pendingSupply(view.mission)) {
      goto('supply');
      announce('A supply rocket has arrived. Choose one of three upgrades.');
      return;
    }
    beginDay();
    goto('sol');
    speakCoach();
  }

  /** Say mission control's current message aloud, if the voice is on. */
  function speakCoach() {
    const step = view.coach != null ? view.coachList[view.coach] : null;
    if (step) speak(`${tr(step.title)}. ${tr(step.text)}`, getLang());
  }

  /* ----------------------------------------------------- training mission */

  /**
   * The three-day training mission. It is a real mission in every way but
   * its length and its rules (config/levels.js), played with the guide on.
   * It is never saved, and never touches a real mission that is.
   */
  function startTraining() {
    markWelcomed();
    view.welcome = null;
    view.mission = createMission({ siteId: 'moon', seedCode: 'TRAIN', training: true });
    view.guideSeen = 0;
    view.shownNotes = new Set();
    view.advice = null;
    view.arrivedAdvice = null;
    view.scoreResult = null;
    beginDay();
    goto('sol');
    announce('Training mission started. Comet will show you what to do.');
  }

  function leaveTraining() {
    view.mission = null;
    view.hasSave = hasSavedMission();
    markWelcomed();
    goto('title');
  }

  /** Which moment of the training the screen is at, or null if not training. */
  function trainingMoment() {
    const m = view.mission;
    if (!m || !m.training) return null;
    if (view.screen === 'sol') return view.running ? `run:${m.day}` : `plan:${m.day}`;
    if (view.screen === 'resolve' && view.outcome) return `result:${view.outcome.day}`;
    if (view.screen === 'trained') return 'done';
    return null;
  }

  /**
   * The step the guide should be on right now: within the current moment,
   * the first thing the player has not yet done or been told.
   *
   * It is worked out afresh every time, from what is actually on the board,
   * so if a player takes back a block they were asked to place, the guide
   * goes back and asks for it again instead of carrying on regardless.
   */
  function currentGuideStep() {
    const moment = trainingMoment();
    if (!moment) return null;
    const ctx = {
      allocation: view.allocation,
      validation: view.plan ? validateAllocation(view.plan, view.allocation) : null,
    };
    let last = -1;
    for (let i = 0; i < TRAINING_STEPS.length; i += 1) {
      const step = TRAINING_STEPS[i];
      if (step.at !== moment) continue;
      last = i;
      if (step.until) {
        if (!step.until(ctx)) return { step, index: i, ctx };
      } else if (i >= view.guideSeen) {
        return { step, index: i, ctx };
      }
    }
    return last >= 0 ? { step: TRAINING_STEPS[last], index: last, ctx } : null;
  }

  /** Put the guide on the right step, or away. Runs after every render. */
  function syncGuide() {
    const current = view.menu || view.welcome ? null : currentGuideStep();
    if (!current) {
      guide.hide();
      return;
    }
    const { step, index, ctx } = current;
    const stuck =
      Boolean(step.until) &&
      String(step.target).includes('alloc-up') &&
      ctx.validation &&
      ctx.validation.remaining <= 0;
    guide.show(step, { index, total: TRAINING_STEPS.length, stuck });
  }

  const guide = createGuide({
    onNext() {
      const current = currentGuideStep();
      if (!current) return;
      view.guideSeen = Math.max(view.guideSeen, current.index + 1);
      sfx.click();
      syncGuide();
    },
    onLeave: () => leaveTraining(),
  });

  function chooseUpgrade(id) {
    const next = takeUpgrade(view.mission, id);
    if (next === view.mission) return;
    view.mission = next;
    saveMission(view.mission);
    sfx.upgrade();
    announce(`${UPGRADES[id].name} added to the base.`);
    enterDay();
  }

  /**
   * Resume a mission saved on a previous visit.
   *
   * The saved mission carries its own seed, so the hazards replay identically.
   * The space weather is whatever the feed gives today, which can differ from
   * the original session -- an honest consequence of using live data, and
   * preferable to freezing a stale copy of the Sun.
   */
  function resumeMission() {
    const saved = loadMission();
    if (!saved) {
      view.hasSave = false;
      render();
      return;
    }
    view.mission = saved.mission;
    view.shownNotes = new Set();
    view.advice = null;
    view.arrivedAdvice = null;
    view.copied = false;
    view.flown = false;
    enterDay();
    announce(
      `Mission resumed at ${getSite(view.mission.siteId).name}, day ${view.mission.day}.`
    );
    if (view.mission.siteId === 'mars' && !view.marsPhoto) loadMarsPhoto();
  }

  function abandonMission() {
    clearMission();
    view.hasSave = false;
    view.mission = null;
    goto('title');
  }

  /**
   * How long the picture acts the day out before the results appear. Long
   * enough to see the rover reach the edge and the scoops set; short enough
   * not to drag over fourteen days. The CSS that does the acting uses the
   * same length (see --run in scene.css and .runbar__fill in screens.css).
   */
  const RUN_MS = 3800;
  let runTimer = null;

  /**
   * Run pressed. The plan is locked and the picture plays it out; the day is
   * actually resolved when that finishes, or when the player skips it.
   */
  function commitDay() {
    if (view.running) return;
    const validation = validateAllocation(view.plan, view.allocation);
    if (!validation.valid) return;

    // In training, Run waits until the plan is the one being taught: the
    // guide's next lines describe what that plan did.
    if (view.mission.training) {
      const current = currentGuideStep();
      if (current && !String(current.step.target).includes('"commit"')) {
        view.guideSeen = Math.min(view.guideSeen, current.index);
        guide.repaint();
        return;
      }
    }

    // Running a day is the last thing the walkthrough teaches.
    endCoach();

    view.running = true;
    sfx.click();
    render();
    announce(`Running ${view.plan.site.dayWord} ${view.plan.day}.`);
    runTimer = setTimeout(finishDay, RUN_MS);
  }

  function finishDay() {
    if (runTimer) clearTimeout(runTimer);
    runTimer = null;
    if (!view.running) return;
    view.running = false;

    const before = view.mission;
    const pending = before.pendingAdvice;

    const { state: after, outcome } = resolveDay(before, view.plan, view.allocation);

    view.deltas = {
      oxygen: after.oxygen - before.oxygen,
      food: after.food - before.food,
      shieldCm: after.shieldCm - before.shieldCm,
      health: after.health - before.health,
      science: after.science - before.science,
    };

    // Did a delayed mission-control reply land today?
    view.arrivedAdvice =
      pending && pending.arrivesOnDay <= before.day ? pending : null;

    view.mission = after;
    view.outcome = outcome;

    // Persist after every resolved day, so an interrupted session loses at
    // most the day in progress. Training is never saved, and never disturbs a
    // real mission that is.
    if (after.training) {
      /* nothing to keep */
    } else if (after.over) {
      clearMission();
      view.hasSave = false;
      // The mission is finished: score it and see whether it is a new best.
      const grade = gradeMission(after);
      const score = missionScore(after);
      const compared = saveScore({
        siteId: after.siteId,
        seedCode: after.seedCode,
        total: score.total,
        science: score.science,
        health: score.health,
        daysSurvived: score.daysSurvived,
        stars: { lost: 0, incomplete: 1, success: 2, flagship: 3 }[grade.tier] ?? 0,
        tier: grade.tier,
        at: new Date().toISOString(),
      });
      view.scoreResult = { score, ...compared };
    } else {
      saveMission(after);
      view.hasSave = true;
    }

    if (outcome.experiment) sfx.discovery();
    else if (view.deltas.health < 0) sfx.dayBad();
    else sfx.dayGood();

    const note = pickNote({
      state: after,
      outcome,
      shown: view.shownNotes,
    });
    if (note) view.shownNotes.add(note.id);
    view.note = note;

    goto('resolve');
    announce(summariseOutcome(outcome, after));
  }

  function nextDay() {
    enterDay();
  }

  /* ---------------------------------------------------------- allocation */

  function adjust(systemId, delta) {
    if (view.running) return;
    const system = getSystem(systemId);
    const current = view.allocation[systemId];
    const next = Math.max(0, current + delta);

    const candidate = { ...view.allocation, [systemId]: next };
    const check = validateAllocation(view.plan, candidate);
    if (!check.valid && delta > 0) return;
    if (next === current) return;

    view.allocation = candidate;
    view.focus = systemId;
    if (delta > 0) sfx.blockUp(next);
    else sfx.blockDown(next);
    render();
    sceneFeedback(root, systemId, delta);
  }

  /**
   * Toggle the storm shelter.
   *
   * If every block is already assigned, the shelter is not simply refused:
   * blocks are taken from the least critical systems first (science, then
   * shielding) so the player can always make the safety choice. That is the
   * point of the mechanic -- sheltering is always possible, it just always
   * costs you something, and the UI then shows exactly what it cost.
   */
  function toggleShelter() {
    if (view.running) return;
    const wantOn = !view.allocation.shelter;

    if (!wantOn) {
      view.allocation = { ...view.allocation, shelter: false };
      view.focus = 'shelter';
      sfx.click();
      render();
      sceneFeedback(root, 'shelter', -1);
      return;
    }

    const candidate = { ...view.allocation, shelter: true };
    let needed = allocationTotal(candidate) - view.plan.blocksAvailable;
    const taken = [];

    // Never raid life support or the greenhouse automatically: starving air or
    // food to hide from a storm is a decision the player must make themselves.
    for (const id of ['science', 'shielding']) {
      while (needed > 0 && candidate[id] > 0) {
        candidate[id] -= 1;
        needed -= 1;
        taken.push(id);
      }
    }

    if (needed > 0) return; // genuinely unaffordable

    view.allocation = candidate;
    view.focus = 'shelter';
    sfx.shelter();
    render();
    sceneFeedback(root, 'shelter', 1);

    if (taken.length) {
      const from = [...new Set(taken)]
        .map((id) => getSystem(id).name.toLowerCase())
        .join(' and ');
      announce(`Sheltering. ${taken.length} blocks taken from ${from}.`);
    }
  }

  /** Storm report buttons: pick "keep working" or "shelter" by name. */
  function setShelter(want) {
    if (Boolean(view.allocation.shelter) !== want) toggleShelter();
  }

  function resetAllocation() {
    if (view.running) return;
    view.allocation = view.mission.training
      ? emptyAllocation()
      : suggestedAllocation(view.plan.blocksAvailable, view.plan.unlocked, view.plan.usual);
    view.focus = null;
    render();
  }

  /* ------------------------------------------------------------- coach */

  function coachNext() {
    if (view.coach == null) return;
    if (view.coach >= view.coachList.length - 1) {
      endCoach();
      render();
      return;
    }
    view.coach += 1;
    sfx.click();
    render();
    const step = view.coachList[view.coach];
    announce(`${step.title}. ${step.text}`);
    speakCoach();
    const target = root.querySelector(step.scrollTo);
    if (target) target.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  function endCoach() {
    if (view.coach == null) return;
    view.coach = null;
    stopSpeaking();
    // Landing day is where the first-time pointers live. Once a player has
    // been through it, they are not shown again.
    if (view.mission && view.mission.day === 1) markGuideSeen();
  }

  /* -------------------------------------------------------------- menu */

  function openMenu() {
    if (view.running) return;
    view.menu = 'open';
    sfx.click();
    render();
    const first = root.querySelector('.menu [data-action="menu-close"]');
    if (first) first.focus();
  }

  function closeMenu() {
    if (!view.menu) return;
    view.menu = null;
    render();
  }

  /** Back to the front page. The mission stays saved, ready to continue. */
  function goHome() {
    view.menu = null;
    view.hasSave = hasSavedMission();
    goto('title');
  }

  /* ---------------------------------------------------------- flight home */

  function flyHome() {
    const grade = gradeMission(view.mission);
    if (grade.tier === 'lost') sfx.missionLost();
    else sfx.missionWin();
    view.flown = false;
    goto('debrief');
    playReturnFlight(root, () => {
      view.flown = true;
    });
  }

  /* ------------------------------------------------------------- comms */

  function askEarth() {
    if (view.running) return;
    const { state, advice } = requestAdvice(view.mission, view.plan);
    view.mission = state;
    view.advice = advice;
    render();
    announce(advice.text || advice.explain);
  }

  /* ------------------------------------------------------ sharing a result */

  /**
   * A result a child can paste to a friend or a teacher.
   *
   * It carries the seed, because the seed is the interesting part: another
   * player can run the identical mission -- same Sun, same storms -- and
   * compare decisions rather than luck.
   */
  function missionResultText() {
    const m = view.mission;
    const site = getSite(m.siteId);
    const grade = gradeMission(m);
    const studies = (m.experiments || []).length;

    return [
      `OUTPOST — ${grade.title}`,
      `${site.name}, ${site.body} — mission ${m.seedCode}`,
      `Science ${m.science} · Crew ${Math.round(m.health)}% · Dose ${m.doseTotalMsv} mSv · Shield ${m.shieldCm} cm`,
      `${studies} ${studies === 1 ? 'study' : 'studies'} completed`,
      `Storms were real NASA DONKI records. Try mission ${m.seedCode} yourself.`,
    ].join('\n');
  }

  async function copyResult() {
    const text = missionResultText();
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      // Clipboard API is blocked in some contexts; fall back to a selection.
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand('copy');
        document.body.removeChild(ta);
      } catch {
        ok = false;
      }
    }
    view.copied = ok;
    sfx.click();
    render();
    announce(ok ? 'Mission result copied.' : 'Could not copy automatically.');
  }

  /* --------------------------------------------------- Mars rover imagery */

  async function loadMarsPhoto() {
    // Sol 1000 is used because recent sols are not always published yet, and
    // an empty result would mean no picture at all.
    const res = await fetchMarsPhoto({ sol: 1000, camera: 'NAVCAM' });
    if (!res.ok) return;
    view.marsPhoto = res.photo;
    if (view.screen === 'resolve') render();
  }

  /* --------------------------------------------------------------- OSDR */

  async function loadOsdrStudies() {
    view.osdr = { loading: true, studies: [], live: false };
    render();

    const res = await searchOsdr('bone density spaceflight', { limit: 5 });
    view.osdr = res.ok
      ? { loading: false, studies: res.studies, live: true }
      : { loading: false, studies: OSDR_FALLBACK_STUDIES, live: false };
    render();
  }

  /* ------------------------------------------------------------ API key */

  function saveKey() {
    const input = root.querySelector('#api-key-input');
    if (!input || !input.value.trim()) return;
    setApiKey(input.value.trim());
    reloadWeatherAndRender('Key saved. Reloading live space weather.');
  }

  function clearKey() {
    setApiKey('');
    reloadWeatherAndRender('Switched back to the team key.');
  }

  async function reloadWeatherAndRender(message) {
    announce(message);
    view.weather = await loadSpaceWeather({
      missionDays: BALANCE.missionDays,
      preferLive: true,
    });
    render();
  }

  /* -------------------------------------------------------------- language */

  function changeLanguage(lang) {
    setLang(lang);
    // Answering the first question of the welcome leads to the second.
    if (view.welcome === 'lang') view.welcome = 'offer';
    localizeStatic(document.querySelector('.footer'));
    stopSpeaking();
    render();
    guide.repaint();
  }

  /* --------------------------------------------------------------- actions */

  const actions = {
    'goto-title': () => goto('title'),
    'goto-sites': () => goto('sites'),
    'goto-sources': () => goto('sources'),
    'goto-howto': () => goto('howto'),
    'goto-debrief': () => flyHome(),

    'menu-open': () => openMenu(),
    'menu-close': () => closeMenu(),
    'menu-home': () => goHome(),
    'menu-restart': () => {
      view.menu = 'confirm-restart';
      render();
    },
    'menu-restart-no': () => {
      view.menu = 'open';
      render();
    },
    'menu-restart-yes': () =>
      view.mission.training ? startTraining() : startMission(view.mission.siteId),
    back: () => goto(view.returnTo || 'title'),

    'choose-site': (data) => startMission(data.site),
    'replay-same': () => startMission(view.mission.siteId, view.mission.seedCode),
    'resume-mission': () => resumeMission(),
    'abandon-mission': () => abandonMission(),
    'copy-result': () => copyResult(),
    'toggle-mute': () => {
      toggleMute();
      if (!isMuted()) sfx.click();
      render();
    },
    'toggle-music': () => {
      toggleMusic();
      render();
    },
    'take-upgrade': (data) => chooseUpgrade(data.upgrade),

    'set-lang': (data) => changeLanguage(data.lang),
    'toggle-lang': () => changeLanguage(getLang() === 'ar' ? 'en' : 'ar'),
    'toggle-voice': () => {
      toggleVoice();
      render();
    },
    'start-training': () => startTraining(),
    'finish-training': () => goto('trained'),
    'welcome-skip': () => {
      markWelcomed();
      view.welcome = null;
      render();
    },

    'alloc-up': (data) => adjust(data.system, 1),
    'alloc-down': (data) => adjust(data.system, -1),
    'toggle-shelter': () => toggleShelter(),
    'set-shelter': (data) => setShelter(data.shelter === 'on'),
    'coach-next': () => coachNext(),
    'coach-skip': () => {
      endCoach();
      render();
    },
    'reset-alloc': () => resetAllocation(),

    commit: () => commitDay(),
    'skip-run': () => finishDay(),
    'next-day': () => nextDay(),

    'ask-earth': () => askEarth(),
    'load-osdr': () => loadOsdrStudies(),
    'save-key': () => saveKey(),
    'clear-key': () => clearKey(),
  };

  delegate(root, (action, dataset) => {
    const handler = actions[action];
    if (handler) handler(dataset);
  });

  // Browsers only allow sound once the player has touched the page, so the
  // music starts with the first press of anything. After that this is a no-op.
  const wakeMusic = () => startMusic();
  document.addEventListener('pointerdown', wakeMusic, { passive: true });
  document.addEventListener('keydown', wakeMusic);

  // Escape closes the pause menu, as a player would expect.
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && view.menu) closeMenu();
  });

  /* ----------------------------------------------------------------- boot */

  async function start() {
    applyDocumentLanguage();
    localizeStatic(document.querySelector('.footer'));
    render(); // paint the title screen immediately, with a "loading data" badge
    const loaded = await loadSpaceWeather({
      missionDays: BALANCE.missionDays,
      preferLive: true,
    });
    // If a mission was started while this was loading, it is already running
    // on the archive. Leave it be: the Sun must not change mid-mission.
    if (!view.weather) view.weather = loaded;
    render();
  }

  return { start };
}

/** Screen-reader summary of a resolved day. */
function summariseOutcome(outcome, state) {
  const bits = [`Day ${outcome.day} complete.`];
  if (outcome.storm) {
    bits.push(
      `${outcome.storm.headline}. Dose ${outcome.doseToday} millisieverts.`
    );
  }
  bits.push(
    `Oxygen ${Math.round(state.oxygen)} percent, food ${Math.round(
      state.food
    )} percent, crew health ${Math.round(state.health)} percent.`
  );
  bits.push(`Science ${state.science} points.`);
  return bits.join(' ');
}
