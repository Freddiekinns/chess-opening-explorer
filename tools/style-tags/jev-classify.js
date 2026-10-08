#!/usr/bin/env node
/**
 * Classifier B: asks Jev to tag each opening brief against the style taxonomy.
 *
 *   node tools/style-tags/jev-classify.js [slug ...]
 *   node tools/style-tags/jev-classify.js --new   (only briefs Jev has not answered)
 *   node tools/style-tags/jev-classify.js --states [slug ...]   (classifier A's input)
 *
 * Jev reads the brief's evidence only, never the site's current tags, so its
 * answers are independent of the old classification and of classifier A. The
 * criteria wording mirrors docs/style-taxonomy.md; change both together.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createJevAsk, MODEL } = require('../video-pipeline/lib/jev-filter');
const { plans } = require('./taxonomy');

const BRIEFS = path.join(__dirname, '../data/style-briefs');
const OUT = path.join(BRIEFS, '_classify/jev.json');

const AXES = {
  character: {
    solid: 'Hard to break down, with few ways to lose quickly. Play is steady rather than forcing.',
    balanced: 'A mix of strategic and tactical play, neither notably slow nor notably forcing.',
    sharp: 'Concrete, forcing play where both sides take risks. One wrong move can lose quickly.',
  },
  gambit: {
    none: "No material is deliberately given up, any material given comes straight back by force (as in the Queen's Gambit), or a gambit was offered and declined.",
    white:
      'White deliberately gives up material, usually a pawn, that Black can keep if they choose.',
    black:
      'Black deliberately gives up material, usually a pawn, that White can keep if they choose.',
  },
  soundness: {
    sound: 'Strong players and engines consider it objectively sound for both sides.',
    dubious:
      'Strong players or engines consider the line refuted or close to it for the side that chose it. It scores through surprise and traps.',
  },
  structure: {
    open: 'In the typical middlegame the central pawns have come off, leaving open files and diagonals.',
    semi_open:
      'The centre is partly open; usually one side has a half-open file to press on, as after an exchange on d5 or a Sicilian ...cxd4.',
    flexible:
      "The centre stays in tension or is not yet decided, with pawns facing each other but not locked: the Queen's Gambit Declined, the London, the Italian with d3, or a flank opening.",
    closed:
      'The central pawns lock together in chains that cannot easily be exchanged, and play moves to the wings.',
  },
  approach: {
    system:
      'A set-up that can be played against almost any reply. Plans matter more than move orders.',
    standard:
      'A respectable line of opening theory played at every level, including openings that are less common than the main lines.',
    offbeat: 'Seldom played by strong players at all. Chosen mainly for surprise.',
  },
  level: {
    beginner:
      'Clear plans and little to memorise, and objectively sound. A good first repertoire choice.',
    intermediate: 'Some theory and some subtlety, but manageable for a club player.',
    advanced: 'Either long forcing lines you need to know, or plans that are hard to get right.',
  },
};

const LEVEL_NOTE =
  ' Judge it for the side that studies the line: Black for a defence and its variations, White for a White opening, system or anti-line.';

function question(axis, criteria) {
  return {
    type: 'choice',
    instructions:
      `Classify this chess opening's ${axis.replace('_', ' ')}. Judge only from the evidence given.` +
      (axis === 'level' ? LEVEL_NOTE : ''),
    criteria,
  };
}

/** What Jev reads: the brief's evidence, without sources or the site's current text. */
function briefState(brief) {
  const notes = {};
  for (const [axis, ev] of Object.entries(brief.axis_evidence || {})) {
    const { sources, ...rest } = ev;
    notes[axis] = rest;
  }
  return {
    opening: brief.root.name,
    moves: brief.root.moves,
    overview: brief.overview,
    white_ideas: (brief.white_ideas || []).map((i) => i.idea),
    black_ideas: (brief.black_ideas || []).map((i) => i.idea),
    typical_structures: (brief.typical_structures || []).map((s) => s.structure),
    evidence: notes,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const statesOnly = args.includes('--states');
  const onlyNew = args.includes('--new');
  // --only structure,plans re-asks just those questions and keeps the rest.
  const onlyAt = args.indexOf('--only');
  const only = onlyAt > -1 ? args[onlyAt + 1].split(',') : null;
  const wanted = args.filter((a, i) => !a.startsWith('--') && i !== onlyAt + 1);
  let files = fs
    .readdirSync(BRIEFS)
    .filter((f) => f.endsWith('.json'))
    .filter((f) => !wanted.length || wanted.includes(f.replace(/\.json$/, '')));
  const answered = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
  if (onlyNew) files = files.filter((f) => !answered[f.replace(/\.json$/, '')]);

  // Classifier A reads exactly what Jev reads, which keeps the two comparable
  // and spares it the sources and audit it is told to ignore anyway.
  if (statesOnly) {
    const states = {};
    for (const f of files) {
      const brief = JSON.parse(fs.readFileSync(path.join(BRIEFS, f), 'utf8'));
      states[brief.slug] = briefState(brief);
    }
    const file = path.join(BRIEFS, '_classify/states.json');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(states, null, 2) + '\n');
    console.log(`${files.length} states written to ${path.relative(process.cwd(), file)}`);
    return;
  }

  const apiKey = process.env.JEV_API_KEY;
  if (!apiKey) throw new Error('JEV_API_KEY is not set');

  const ask = createJevAsk(apiKey);
  const out = answered;
  const questions = {};
  for (const [axis, criteria] of Object.entries(AXES)) questions[axis] = question(axis, criteria);
  // One choice over the plans list; its three most probable answers are what
  // validate.js intersects with classifier A's picks.
  questions.plans = {
    type: 'choice',
    instructions:
      'Which of these typical plans or structures is most characteristic of this chess opening? Judge only from the evidence given.',
    criteria: Object.fromEntries(plans().map((p) => [p.key, `${p.label}: ${p.glossary}`])),
  };
  if (only) for (const k of Object.keys(questions)) if (!only.includes(k)) delete questions[k];

  let inputTokens = 0;
  for (const f of files) {
    const brief = JSON.parse(fs.readFileSync(path.join(BRIEFS, f), 'utf8'));
    const res = await ask(briefState(brief), questions);
    inputTokens += (res.usage && res.usage.input_tokens) || 0;
    const kept = (only && out[brief.slug] && out[brief.slug].answers) || {};
    out[brief.slug] = { model: MODEL, answers: kept };
    for (const axis of Object.keys(questions)) {
      const a = res.answers && res.answers[axis];
      out[brief.slug].answers[axis] = a
        ? { choice: a.choice, probabilities: a.probabilities }
        : null;
    }
    const summary = Object.entries(out[brief.slug].answers)
      .map(
        ([k, a]) =>
          `${k}=${a ? `${a.choice}(${(a.probabilities[a.choice] || 0).toFixed(2)})` : '?'}`
      )
      .join(' ');
    console.log(brief.slug.padEnd(28), summary);
    // Saved after every answer so a long run that fails part-way keeps its work.
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
  }
  console.log(`\n${files.length} briefs, ${inputTokens} input tokens`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
