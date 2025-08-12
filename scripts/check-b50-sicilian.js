const data = require('../api/data/eco/ecoB.json');
const b50Entry = Object.values(data).find(entry => entry.name === 'Sicilian Defense' && entry.eco === 'B50');

console.log('B50 Sicilian analysis structure:');
console.log(JSON.stringify(b50Entry.analysis_json, null, 2));
