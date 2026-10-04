/**
 * The final tags for each variation, from the classifiers' answers. One rule,
 * used by validate.js, report.js and the export, in this order of precedence:
 *
 *   1. an owner-reviewed override (overrides.json), which must give a reason
 *   2. the judge's ruling
 *   3. A and Jev where they agree
 *   4. A's answer where either chose the hidden middle value: a blind audit of
 *      14 such disputes found A right in 13 (A reads the taxonomy's notes and
 *      anchors; Jev sees only the criteria and seldom picks a middle value)
 *   5. otherwise unresolved, for the judge
 *
 * Plans are A's picks that are also among Jev's three most probable, in A's
 * order; where they share none, A's first pick, so a page is not left empty
 * when the classifiers merely ranked plans differently.
 */
const fs = require('fs');
const path = require('path');
const { AXES, plans } = require('./taxonomy');

const CLASSIFY = path.join(__dirname, '../data/style-briefs/_classify');

const MIDDLE = {
  character: 'balanced',
  gambit: 'none',
  soundness: 'sound',
  structure: 'flexible',
  approach: 'standard',
  level: 'intermediate',
};

/** User-facing words for the values a page shows; middle values have none. */
const LABELS = {
  gambit: { white: 'White gambit', black: 'Black gambit' },
  character: { solid: 'Solid', sharp: 'Sharp' },
  soundness: { dubious: 'Dubious' },
  structure: { open: 'Open', semi_open: 'Semi-open', closed: 'Closed' },
  approach: { system: 'System', offbeat: 'Offbeat' },
  level: { beginner: 'Beginner', advanced: 'Advanced' },
};
const SHOWN = Object.fromEntries(Object.entries(LABELS).map(([k, v]) => [k, Object.keys(v)]));
const PLANS_SHOWN = 2;

function load(file) {
  const p = path.join(CLASSIFY, file);
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : {};
}

function loadOverrides() {
  const { overrides } = JSON.parse(fs.readFileSync(path.join(__dirname, 'overrides.json'), 'utf8'));
  for (const [slug, axes] of Object.entries(overrides))
    for (const [axis, o] of Object.entries(axes))
      if (!o.reason) throw new Error(`overrides.json: ${slug}.${axis} has no reason`);
  return overrides;
}

function finalPlans(a, b) {
  const picked = (a && a.plans && a.plans.value) || [];
  const probs = (b && b.answers && b.answers.plans && b.answers.plans.probabilities) || {};
  const top = new Set(
    Object.entries(probs)
      .sort((x, y) => y[1] - x[1])
      .slice(0, 3)
      .map(([k]) => k)
  );
  const agreed = picked.filter((p) => top.has(p));
  return agreed.length ? agreed : picked.slice(0, 1);
}

/**
 * @returns {{ final: Object, byRule: string[] }} final[slug][axis] is a value
 *   or null (unresolved); final[slug].plans is an array of plan keys.
 */
function finalAnswers({
  A = load('claude.json'),
  B = load('jev.json'),
  J = load('judge.json'),
  O = loadOverrides(),
} = {}) {
  const final = {};
  const byRule = [];
  for (const slug of new Set([...Object.keys(A), ...Object.keys(B)])) {
    final[slug] = {};
    for (const axis of AXES) {
      const a = A[slug] && A[slug][axis] && A[slug][axis].value;
      const b = B[slug] && B[slug].answers && B[slug].answers[axis] && B[slug].answers[axis].choice;
      const j = J[slug] && J[slug][axis] && J[slug][axis].value;
      const o = O[slug] && O[slug][axis] && O[slug][axis].value;
      if (o || j || (a && a === b)) final[slug][axis] = o || j || a;
      else if (a && b && (a === MIDDLE[axis] || b === MIDDLE[axis])) {
        final[slug][axis] = a;
        byRule.push(`${slug}.${axis} (A ${a}, Jev ${b})`);
      } else final[slug][axis] = null;
    }
    final[slug].plans = finalPlans(A[slug], B[slug]);
  }
  return { final, byRule };
}

/** What a page shows: tag words in a fixed order, then up to two plan labels. */
function display(answers) {
  const planLabel = Object.fromEntries(plans().map((p) => [p.key, p.label]));
  const words = Object.keys(LABELS)
    .map((axis) => LABELS[axis][answers[axis]])
    .filter(Boolean);
  return { words, plans: answers.plans.slice(0, PLANS_SHOWN).map((k) => planLabel[k]) };
}

module.exports = { MIDDLE, LABELS, SHOWN, load, finalAnswers, display };
