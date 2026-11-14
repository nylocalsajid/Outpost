/**
 * i18n.js
 * -----------------------------------------------------------------------------
 * English and Arabic.
 *
 * HOW IT WORKS. The game is written in English, and the English sentence is
 * the key: the Arabic dictionary (js/i18n/ar.js) maps each English sentence
 * to its Arabic one. This is the same idea as gettext. It was chosen over
 * giving every sentence a made-up id because:
 *   - the screens stay readable: the words are still where they are used;
 *   - a sentence nobody has translated yet simply stays in English instead of
 *     showing a broken id;
 *   - the test for "is everything translated?" is simple: play the game in
 *     Arabic and look for Latin letters (tools do exactly that).
 *
 * A screen is built as English markup, exactly as before. When the language
 * is Arabic, `localize` parses that markup, replaces each piece of text and
 * each spoken label (aria-label, title) with its translation, and hands back
 * Arabic markup. The simulation, and everything it stores, never changes.
 *
 * Sentences with numbers in them ("Day 5 of 14") are matched by pattern.
 */

import { savedLanguage, saveLanguage } from '../data/persistence.js';
import { AR } from '../i18n/ar.js';

/** @type {'en'|'ar'} */
let lang = savedLanguage() || 'en';

const DICTS = { ar: AR };
const ATTRS = ['aria-label', 'title', 'placeholder', 'alt'];
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'CODE', 'TEXTAREA']);

/** Translations already worked out, per language. */
const cache = { ar: new Map() };
/** English sentences met while Arabic was on that had no translation. */
const missing = new Set();

export function getLang() {
  return lang;
}

export function isRtl() {
  return lang === 'ar';
}

/** Switch language, remember it, and set the page's direction to match. */
export function setLang(next) {
  lang = next === 'ar' ? 'ar' : 'en';
  saveLanguage(lang);
  applyDocumentLanguage();
}

export function applyDocumentLanguage() {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
}

/** Does this text contain anything that could need translating? */
const HAS_LATIN = /[A-Za-z]/;
/** A real word, as opposed to NASA, OSD-48 or a mission code. */
const HAS_WORD = /[a-z]{2,}/;
const NUMBER = /\d+(?:\.\d+)?/g;
/** Where one sentence ends and the next begins. */
const SENTENCE_BREAK = /([.!?])\s+(?=[A-Z"“‘'(])/;

/**
 * Translate one piece of text. Returns the text unchanged in English, or when
 * no translation is known.
 */
export function tr(text) {
  if (lang === 'en' || text == null) return text;
  const source = String(text);
  if (!HAS_LATIN.test(source)) return source;

  const memo = cache[lang];

  // Keep whatever space surrounded the words; translate the words.
  const lead = /^\s*/.exec(source)[0];
  const tail = /\s*$/.exec(source)[0];
  const core = source.slice(lead.length, source.length - tail.length).replace(/\s+/g, ' ');
  if (!core) return source;

  let out = memo.get(core);
  if (out === undefined) {
    out = translate(core, DICTS[lang]);
    memo.set(core, out);
  }
  return out === null ? source : lead + out + tail;
}

/**
 * The whole text if the dictionary has it; otherwise sentence by sentence,
 * because the game's longer messages are sentences joined in many different
 * combinations and each sentence is translated once.
 */
function translate(core, dict) {
  const whole = lookup(core, dict);
  if (whole !== null) return polish(whole);

  const sentences = splitSentences(core);
  if (sentences.length > 1) {
    let any = false;
    const parts = sentences.map((sentence) => {
      const t = lookup(sentence, dict);
      if (t === null) {
        missing.add(sentence);
        return sentence;
      }
      any = true;
      return t;
    });
    if (any) return polish(parts.join(' '));
    return null;
  }

  missing.add(core);
  return null;
}

function splitSentences(text) {
  const pieces = text.split(SENTENCE_BREAK);
  // split() with a capture group returns [sentence, mark, sentence, mark, ...]
  const out = [];
  for (let i = 0; i < pieces.length; i += 2) {
    out.push(pieces[i] + (pieces[i + 1] || ''));
  }
  return out.filter((p) => p.trim());
}

/** One sentence (or one label). Null if the dictionary does not have it. */
function lookup(core, dict) {
  if (Object.prototype.hasOwnProperty.call(dict.exact, core)) return dict.exact[core];

  // Nothing to translate: an acronym, an id, a web address we keep.
  if (!HAS_WORD.test(core) || keepSet(dict).has(core)) return core;

  // The same sentence with different numbers in it.
  const numbers = core.match(NUMBER);
  if (numbers) {
    const shape = core.replace(NUMBER, '#');
    if (Object.prototype.hasOwnProperty.call(dict.shapes, shape)) {
      let i = 0;
      return dict.shapes[shape].replace(/#(\d)?/g, (_, n) => {
        const value = n ? numbers[Number(n) - 1] : numbers[i];
        i += 1;
        return value ?? '';
      });
    }
    if (keepSet(dict).has(shape)) return core;
  }

  // The few sentences where words change, not numbers.
  for (const [pattern, template] of dict.patterns) {
    const m = pattern.exec(core);
    if (m) return template(m, piece);
  }
  return null;
}

/** A piece inside a pattern: translated if known, otherwise left as it is. */
function piece(text) {
  const t = translate(String(text), DICTS[lang]);
  return t === null ? text : t;
}

const keepSets = new WeakMap();
function keepSet(dict) {
  if (!keepSets.has(dict)) keepSets.set(dict, new Set(dict.keep || []));
  return keepSets.get(dict);
}

/**
 * Numbers inside right-to-left text. A date (2024-05-01), a time (16:46) or a
 * signed number (+3, −12) is drawn in the wrong order, or with its sign on
 * the wrong side, unless it is marked as a left-to-right island.
 */
const LRI = '\u2066';
const PDI = '\u2069';

function polish(text) {
  return text
    .replace(/[\u2066\u2069]/g, '') // a piece inside a pattern gets here twice
    .replace(
      /(^|[^\w\u2066])([+\-\u2212]?\d+(?:[-:/.,]\d+)+%?|[+\-\u2212]\d+%?)/g,
      (_, before, number) => `${before}${LRI}${number}${PDI}`
    );
}

/** Translate every piece of text under a node, in place. */
export function localizeNode(root) {
  if (lang === 'en' || !root) return;
  const doc = root.ownerDocument || document;
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        if (SKIP_TAGS.has(node.tagName) || node.hasAttribute('data-no-tr')) {
          return NodeFilter.FILTER_REJECT; // and everything inside it
        }
        return NodeFilter.FILTER_ACCEPT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const texts = [];
  const elements = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.nodeType === Node.TEXT_NODE) texts.push(node);
    else elements.push(node);
  }

  for (const node of texts) {
    const translated = tr(node.nodeValue);
    if (translated !== node.nodeValue) node.nodeValue = translated;
  }
  for (const el of elements) {
    for (const name of ATTRS) {
      if (!el.hasAttribute(name)) continue;
      const value = el.getAttribute(name);
      const translated = tr(value);
      if (translated !== value) el.setAttribute(name, translated);
    }
  }
}

/**
 * Translate a string of markup. In English this is free: the markup is
 * returned untouched.
 */
export function localize(markup) {
  if (lang === 'en') return markup;
  const template = document.createElement('template');
  template.innerHTML = markup;
  localizeNode(template.content);
  return template.innerHTML;
}

/**
 * Translate text that is part of the page itself rather than of a screen
 * (the footer). The English is remembered, so switching back restores it.
 */
const originals = new WeakMap();

export function localizeStatic(root) {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!originals.has(node)) originals.set(node, node.nodeValue);
    node.nodeValue = tr(originals.get(node));
  }
}

/** For the translation check: English text seen in Arabic mode, untranslated. */
export function untranslated() {
  return [...missing];
}
