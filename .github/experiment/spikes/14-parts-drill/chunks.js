const pages = require(process.argv[2]);
const side = (n) => (/Defen[cs]e/.test(n.split(':')[0]) ? 'b' : 'w');
const chunk = (k, size = 3) => { const parts = []; for (let i = 0; i < k; i += size) parts.push(Math.min(size, k - i)); if (parts.length > 1 && parts[parts.length - 1] === 1) { parts.pop(); parts[parts.length - 1]++; } return parts; };
const dist = {}, partsDist = {};
for (const p of pages) { const n = p.moves.split(' ').length; const mine = side(p.name) === 'w' ? Math.ceil(n / 2) : Math.floor(n / 2);
  dist[mine] = (dist[mine] || 0) + 1; const c = chunk(mine).length; partsDist[c] = (partsDist[c] || 0) + 1; }
console.log('lines', pages.length, '\nown moves', JSON.stringify(dist), '\nparts (size 3)', JSON.stringify(partsDist));
