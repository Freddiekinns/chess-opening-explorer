// Night 11: keep deviations that stay in the line's opening — from ply 4 on (the opening is set),
// and the position after them is named in the same family or unnamed. Print the per-line count.
const fs = require('fs'); const d = JSON.parse(fs.readFileSync(process.argv[2]));
const eco = {}; for (const f of fs.readdirSync('api/data/eco')) Object.assign(eco, JSON.parse(fs.readFileSync('api/data/eco/' + f)));
const k4 = (f) => f.split(' ').slice(0, 4).join(' '); const nameBy = {}; for (const [f, o] of Object.entries(eco)) nameBy[k4(f)] = o.name;
const fam = (n) => n.split(':')[0];
let kept = 0, named = 0, clear = 0; const per = {}; const seen = new Set();
for (const l of d) { const ks = l.items.filter((x) => x.ply >= 4 && x.replies && (!nameBy[k4(x.fen)] || fam(nameBy[k4(x.fen)]) === fam(l.name)));
  l.kept = ks; for (const x of ks) { kept++; if (nameBy[k4(x.fen)]) named++; if (x.clear) clear++; seen.add(k4(x.fen)); }
  const n = Math.min(ks.length, 4); per[n] = (per[n] || 0) + 1; }
console.log(JSON.stringify({ kept, named, clear, distinctPositions: seen.size, linesByCount: per }));
fs.writeFileSync(process.argv[3], JSON.stringify(d));
