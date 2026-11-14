/**
 * training.js
 * -----------------------------------------------------------------------------
 * What Comet says during the three-day training mission, and what it points
 * at while saying it.
 *
 * Each step belongs to one moment of the game (`at`): a day being planned, a
 * day being played out, or a day's results. Within a moment the steps run in
 * order. A step either waits for the Next button, or, if it has `until`,
 * waits for the player to actually do the thing: that is what makes it a
 * lesson and not a slideshow.
 *
 * `target` is what the arrow points at, as a CSS selector. `why` is the short
 * reason shown under the instruction while the player is doing it. A
 * `passive` step is something to watch: it has no button and waits for
 * nothing.
 *
 * The words are written to be SPOKEN, by a device voice, to a child: short
 * sentences, no brackets, no symbols, numbers a voice reads naturally.
 * They are English here; the Arabic is in js/i18n/ar.js like everything else.
 *
 * The rules of the three days themselves are in config/levels.js.
 */

const plus = (system) => `[data-action="alloc-up"][data-system="${system}"]`;

/** @param {{allocation: Object, validation: Object}} ctx */
const has = (system, n) => (ctx) => ctx.allocation[system] >= n;

export const TRAINING_STEPS = [
  /* ----------------------------------------------------------- day 1: air and food */
  {
    at: 'plan:1',
    target: null,
    text: 'Welcome, Commander! Your crew has just landed on the Moon. I am Comet, the crew dog. I will show you how to keep everyone alive.',
  },
  {
    at: 'plan:1',
    target: '.scene-frame',
    text: 'This is your base. Two astronauts live in the pod. Everything here runs on power.',
  },
  {
    at: 'plan:1',
    target: '.board__count',
    text: 'Your solar panels make power. Today you have seven yellow blocks. You decide where every block goes.',
  },
  {
    at: 'plan:1',
    target: plus('lifeSupport'),
    text: 'First, air. The crew has nothing yet, and nobody can live without air. Press the plus button on Life Support four times.',
    why: 'Life Support needs 4 blocks.',
    until: has('lifeSupport', 4),
  },
  {
    at: 'plan:1',
    target: plus('greenhouse'),
    text: 'Well done! Now food. Press plus on the Greenhouse three times.',
    why: 'The Greenhouse needs 3 blocks.',
    until: has('greenhouse', 3),
  },
  {
    at: 'plan:1',
    target: '.scene-frame',
    text: 'Look at the picture. The fan is spinning and the plants are growing. Every block you move changes the base.',
  },
  {
    at: 'plan:1',
    target: '[data-action="commit"]',
    text: 'Your plan is ready. Press the green Run button and watch the day happen.',
    until: () => false,
  },
  { at: 'run:1', target: '.scene-frame', text: 'Watch the base work.', passive: true },
  {
    at: 'result:1',
    target: '.hud__meters',
    text: 'The day is over. These bars are the air, the food and the health of your crew. Keep them full and your crew stays alive.',
  },
  {
    at: 'result:1',
    target: '[data-action="next-day"]',
    text: 'Press here to start day two.',
    until: () => false,
  },

  /* ----------------------------------------------------------------- day 2: science */
  {
    at: 'plan:2',
    target: '[data-row-system="science"]',
    text: 'Something new today: Science Research. Science is the reason you came to the Moon, and it is your score.',
  },
  {
    at: 'plan:2',
    target: plus('lifeSupport'),
    text: 'But air and food always come first. Give Life Support four blocks.',
    why: 'Life Support needs 4 blocks.',
    until: has('lifeSupport', 4),
  },
  {
    at: 'plan:2',
    target: plus('greenhouse'),
    text: 'And give the Greenhouse three blocks.',
    why: 'The Greenhouse needs 3 blocks.',
    until: has('greenhouse', 3),
  },
  {
    at: 'plan:2',
    target: plus('science'),
    text: 'You have three blocks left. Give them all to Science Research, because that is what you came for.',
    why: 'Give Science Research 3 blocks.',
    until: has('science', 3),
  },
  {
    at: 'plan:2',
    target: '[data-action="commit"]',
    text: 'Now press Run, and watch the rover drive out. I will run behind it!',
    until: () => false,
  },
  { at: 'run:2', target: '.scene-frame', text: 'There we go!', passive: true },
  {
    at: 'result:2',
    target: '.hud__meters',
    text: 'Your science went up. Collect enough science and your mission is a success.',
  },
  {
    at: 'result:2',
    target: '[data-action="next-day"]',
    text: 'Press here to start day three.',
    until: () => false,
  },

  /* ------------------------------------------------------------ day 3: a solar flare */
  {
    at: 'plan:3',
    target: '.sunrep',
    text: 'Careful! The Sun has fired a solar flare. Its radiation can make your crew sick. This flare is a real one, recorded by NASA.',
  },
  {
    at: 'plan:3',
    target: '[data-action="set-shelter"][data-shelter="on"]',
    text: 'Send the crew to the storm room. They will be safe in there. It costs two blocks of power.',
    why: 'Choose the storm room.',
    until: (ctx) => Boolean(ctx.allocation.shelter),
  },
  {
    at: 'plan:3',
    target: plus('lifeSupport'),
    text: 'Air first, as always. Give Life Support four blocks.',
    why: 'Life Support needs 4 blocks.',
    until: has('lifeSupport', 4),
  },
  {
    at: 'plan:3',
    target: plus('greenhouse'),
    text: 'Then food. Give the Greenhouse three blocks.',
    why: 'The Greenhouse needs 3 blocks.',
    until: has('greenhouse', 3),
  },
  {
    at: 'plan:3',
    target: plus('shielding'),
    text: 'You have two blocks left. Give them to Shielding. The digger piles soil on the pod, and that soil will protect the crew tomorrow. So build your shield before the big flares come.',
    why: 'Give Shielding 2 blocks.',
    until: has('shielding', 2),
  },
  {
    at: 'plan:3',
    target: '[data-row-system="science"]',
    text: 'Science gets nothing today. That is the price of staying safe. You never have enough power for everything, so every day you choose.',
  },
  {
    at: 'plan:3',
    target: '[data-action="commit"]',
    text: 'Press Run and ride out the storm.',
    until: () => false,
  },
  { at: 'run:3', target: '.scene-frame', text: 'Everybody inside!', passive: true },
  {
    at: 'result:3',
    target: '.hud__meters',
    text: 'You did it! The crew is safe, and the flare has passed.',
  },
  {
    at: 'result:3',
    target: '[data-action="finish-training"]',
    text: 'Press here to finish your training.',
    until: () => false,
  },

  /* ------------------------------------------------------------------------ the end */
  {
    at: 'done',
    target: '[data-action="goto-sites"]',
    text: 'Training complete, Commander! Remember three things. Air and food come first. Science is your score. And build your shield before the flare. The real mission is fourteen days. Good luck!',
    until: () => false,
  },
];

/** The three things the training teaches, for the screen at the end. */
export const TRAINING_LESSONS = [
  { icon: 'lungs', colorVar: '--sys-air', title: 'Air and food come first', text: 'Give Life Support and the Greenhouse what they need before anything else.' },
  { icon: 'flask', colorVar: '--sys-science', title: 'Science is your score', text: 'Spare blocks go to Science Research. It is the reason you came.' },
  { icon: 'shield', colorVar: '--sys-shield', title: 'Build the shield before the flare', text: 'Soil piled today protects the crew tomorrow. On a big flare, use the storm room.' },
];
