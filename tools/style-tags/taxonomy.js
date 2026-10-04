/**
 * Reads the parts of docs/style-taxonomy.md that scripts need, so the doc stays
 * the single source: the plans list and the anchors table.
 */
const fs = require('fs');
const path = require('path');

const DOC = path.join(__dirname, '../../docs/style-taxonomy.md');
const AXES = ['character', 'gambit', 'soundness', 'structure', 'approach', 'level'];

const doc = () => fs.readFileSync(DOC, 'utf8');
const cells = (line) => line.split('|').map((c) => c.trim());

/** Same slug rule as select-roots.js: "Family: first variation", ASCII, dashed. */
function variationSlug(name) {
  const [family, rest = ''] = name.split(/:\s*/);
  const first = rest.split(',')[0].trim();
  return (first ? `${family}: ${first}` : family)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** The plans table: [{ key, label, glossary }]. */
function plans() {
  const section = doc().split('### Plans')[1].split('\n## ')[0];
  return section
    .split('\n')
    .map(cells)
    .filter((c) => c.length >= 5 && /^[a-z][a-z0-9_]*$/.test(c[1]) && c[1] !== 'key')
    .map((c) => ({ key: c[1], label: c[2], glossary: c[3] }));
}

/** The anchors table: [{ axis, value, name, slug }]. */
function anchors() {
  const section = doc().split('## Anchors')[1].split('\n## ')[0];
  const out = [];
  for (const c of section.split('\n').map(cells)) {
    if (c.length < 4 || !AXES.includes(c[1].toLowerCase())) continue;
    const axis = c[1].toLowerCase();
    const value = c[2].split(' ')[0].toLowerCase().replace('-', '_');
    for (const name of c[3].split('·').map((s) => s.trim()))
      out.push({ axis, value, name, slug: variationSlug(name) });
  }
  return out;
}

module.exports = { AXES, plans, anchors, variationSlug };
