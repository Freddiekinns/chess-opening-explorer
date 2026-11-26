// Classify engine-checked hits. Usage: node classify.js evals.json [list]
const H = JSON.parse(require('fs').readFileSync(process.argv[2]));
const P = (x) => (x * 100).toFixed(0);
const cls = (h, other) => {
  const lf = h.root - h.ev[h.san], lo = h.root - h.ev[other];
  if (lo > lf + 30) return 'unsound'; // "better" move is engine-worse than the flagged one (Dragon 7...Ng4)
  if (lf >= 80 && lo <= 50) return 'real'; // flagged move is a real error and the alternative is sound
  if (lf < 50) return 'quiet'; // flagged move is fine by the engine: a human-results preference, not a mistake
  return 'mixed';
};
for (const h of H) { h.cBest = cls(h, h.best); h.cAlt = h.alt ? cls(h, h.alt) : null; h.c = h.cBest === 'real' || h.cAlt === 'real' ? 'real' : h.cBest; }
const count = (arr, k) => arr.reduce((a, h) => ((a[h[k]] = (a[h[k]] || 0) + 1), a), {});
console.log('all', H.length, 'vs top-score move', count(H, 'cBest'));
console.log('strict', H.filter((h) => h.strict).length, 'vs most-played alt', count(H.filter((h) => h.strict), 'cAlt'));
console.log('either (real if best or alt is a sound fix)', count(H, 'c'));
const fam = {};
for (const h of H.filter((h) => h.c === 'real')) fam[h.family] = (fam[h.family] || 0) + 1;
console.log('real by family', Object.entries(fam).sort((a, b) => b[1] - a[1]).map((x) => x.join(' ')).join(', '));
console.log('real positions', new Set(H.filter((h) => h.c === 'real').map((h) => h.fen)).size);
if (process.argv[3])
  for (const h of H.sort((a, b) => b.g - a.g))
    console.log(`[${h.c}] ${h.family} | ${h.moves} | ${h.san} ${P(h.sh)}% scores ${P(h.s)}% (eng ${h.ev[h.san] - h.root}) | best ${h.best} ${P(h.bestSh)}% ${P(h.bestS)}% (eng ${h.ev[h.best] - h.root})${h.alt ? ` | alt ${h.alt} ${P(h.altSh)}% ${P(h.altS)}% (eng ${h.ev[h.alt] - h.root})` : ''} | sf ${h.engineBest} ${h.root}`);
