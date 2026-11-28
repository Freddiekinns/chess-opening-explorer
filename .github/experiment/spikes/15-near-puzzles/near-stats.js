const N = require(process.argv[2]); const res = {};
for (const d of [1, 0.85, 0.75, 0.66]) for (const s0 of [0.8, 0.7]) { let n = 0; for (const s of N) if (s.c.filter((x) => x[2] >= d && x[1] >= s0).length >= 3) n++; res[`def>=${d},sim>=${s0}`] = n; }
console.log(JSON.stringify(res));
for (const name of process.argv.slice(3)) { const s = N.find((x) => x.name === name); if (!s) continue; console.log('\n' + name, 'moved pieces', s.nD); for (const x of s.c.slice(0, 3)) console.log(' ', x[0], 'sim', x[1], 'def', x[2], 'dm', x[3], 'r', x[4], x[6], x[7]); }
