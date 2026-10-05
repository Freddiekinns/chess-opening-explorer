const fs = require('fs');
const pathResolver = require('../utils/path-resolver');

/**
 * The style tags of docs/style-taxonomy.md, read from api/data/style-tags.json,
 * which tools/style-tags/export.js writes. They sit beside analysis_json, not
 * over it: the old LLM tags stay in the data, and nothing user-facing reads them.
 *
 * Positions with no entry (hubs such as 1.e4, and variations not classified yet)
 * get null, and a page shows no tags rather than a guess.
 */

const PLANS_SHOWN = 2;

let data;

function load() {
  if (data === undefined) {
    const file = pathResolver.getAPIDataPath('style-tags.json');
    data = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
  }
  return data;
}

/** For tests: drop the loaded file, or stand another in its place. */
function reset(replacement) {
  data = replacement;
}

/**
 * Every axis value plus all three plans, for search and filtering. Middle
 * values are included: they are never shown, but they are not unknown.
 * @returns {{character, gambit, soundness, structure, approach, level, plans: string[]} | null}
 */
function axesFor(fen) {
  const d = load();
  // A file without positions is treated as absent: tags are secondary content,
  // and must not take a detail page down with them.
  const slug = d && d.positions && d.positions[fen];
  return (slug && d.variations[slug]) || null;
}

/**
 * What a page shows: the shown words in the taxonomy's order (gambit first,
 * level last) and up to two plans, each with its glossary line for a tooltip.
 * @returns {{ words: {axis, value, label, glossary}[], plans: {key, label, glossary}[] } | null}
 */
function profileFor(fen) {
  const axes = axesFor(fen);
  if (!axes) return null;
  const { labels, plans } = load();
  const words = [];
  for (const [axis, values] of Object.entries(labels)) {
    const shown = values[axes[axis]];
    if (shown) words.push({ axis, value: axes[axis], ...shown });
  }
  return {
    words,
    plans: axes.plans.slice(0, PLANS_SHOWN).map((key) => ({ key, ...plans[key] })),
  };
}

module.exports = { axesFor, profileFor, reset };
