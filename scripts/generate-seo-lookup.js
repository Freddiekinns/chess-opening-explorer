const fs = require('fs');
const path = require('path');

const ECO_DIR = path.join(__dirname, '..', 'api', 'data', 'eco');
const OUTPUT_PATH = path.join(__dirname, '..', 'packages', 'web', 'public', 'seo-lookup.json');

const ECO_FILES = ['ecoA.json', 'ecoB.json', 'ecoC.json', 'ecoD.json', 'ecoE.json'];

function generateSeoLookup() {
  const lookup = {};
  let totalEntries = 0;

  for (const file of ECO_FILES) {
    const filePath = path.join(ECO_DIR, file);
    if (!fs.existsSync(filePath)) {
      console.warn(`Warning: ${file} not found at ${filePath}`);
      continue;
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const entries = Object.entries(data);
    console.log(`  ${file}: ${entries.length} entries`);

    for (const [fen, entry] of entries) {
      // Use raw FEN as key; array format [name, eco, shortMoves] to minimize size
      const moves = (entry.moves || '').split(/\s+/).slice(0, 7).join(' ');
      lookup[fen] = [entry.name || 'Unknown Opening', entry.eco || '', moves];
      totalEntries++;
    }
  }

  const output = JSON.stringify(lookup);
  fs.writeFileSync(OUTPUT_PATH, output, 'utf-8');

  const fileSizeKB = (Buffer.byteLength(output) / 1024).toFixed(1);
  console.log(`\nGenerated seo-lookup.json:`);
  console.log(`  Entries: ${totalEntries}`);
  console.log(`  Size: ${fileSizeKB} KB`);

  if (parseFloat(fileSizeKB) > 2500) {
    console.warn(`  WARNING: File exceeds 2.5MB — consider trimming fields`);
  }
}

generateSeoLookup();
