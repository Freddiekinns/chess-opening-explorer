const fs = require('fs');
const path = require('path');

// Load all ECO files
const ecoDir = path.join(__dirname, '../../api/data/eco');
const allOpenings = [];

for (const letter of ['A', 'B', 'C', 'D', 'E']) {
  const filePath = path.join(ecoDir, `eco${letter}.json`);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  for (const [fen, entry] of Object.entries(data)) {
    allOpenings.push({ fen, moves: entry.moves, name: entry.name, eco: entry.eco });
  }
}

console.log(`Total openings loaded: ${allOpenings.length}\n`);

// Parse move strings into arrays of individual moves
function parseMoves(moveStr) {
  // "1. e4 c5 2. Nf3 d6" -> ["e4", "c5", "Nf3", "d6"]
  return moveStr
    .replace(/\d+\.\s*/g, '') // remove move numbers
    .trim()
    .split(/\s+/)
    .filter((m) => m.length > 0);
}

// Build a map: move prefix -> set of next moves (with counts)
// We'll store all parsed move sequences
const allSequences = allOpenings.map((o) => ({
  ...o,
  parsed: parseMoves(o.moves),
}));

// Generic function: given a prefix (as array of moves), find all distinct next moves
function findBranches(prefix) {
  const results = {};
  for (const seq of allSequences) {
    const moves = seq.parsed;
    if (moves.length <= prefix.length) continue;
    // Check prefix match
    let match = true;
    for (let i = 0; i < prefix.length; i++) {
      if (moves[i] !== prefix[i]) {
        match = false;
        break;
      }
    }
    if (match) {
      const nextMove = moves[prefix.length];
      if (!results[nextMove]) results[nextMove] = 0;
      results[nextMove]++;
    }
  }
  return results;
}

// Also count openings that START with a prefix (including exact match)
function countDescendants(prefix) {
  let count = 0;
  for (const seq of allSequences) {
    const moves = seq.parsed;
    if (moves.length < prefix.length) continue;
    let match = true;
    for (let i = 0; i < prefix.length; i++) {
      if (moves[i] !== prefix[i]) {
        match = false;
        break;
      }
    }
    if (match) count++;
  }
  return count;
}

function printBranches(label, prefix) {
  const branches = findBranches(prefix);
  const sorted = Object.entries(branches).sort((a, b) => b[1] - a[1]);
  console.log(`=== ${label} ===`);
  console.log(`Distinct next moves: ${sorted.length}`);
  for (const [move, count] of sorted) {
    console.log(`  ${move}: ${count} openings`);
  }
  console.log();
}

// Q1: From "1. e4"
printBranches('Q1: After 1. e4 — distinct Black responses', ['e4']);

// Q2: From "1. e4 e5"
printBranches('Q2: After 1. e4 e5 — distinct White 2nd moves', ['e4', 'e5']);

// Q3: From "1. e4 c5" (Sicilian)
printBranches('Q3: After 1. e4 c5 (Sicilian) — distinct White 2nd moves', ['e4', 'c5']);

// Q4: From Najdorf "1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6"
printBranches('Q4: After Najdorf (1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6)', [
  'e4',
  'c5',
  'Nf3',
  'd6',
  'd4',
  'cxd4',
  'Nxd4',
  'Nf6',
  'Nc3',
  'a6',
]);

// Q5: From "1. d4"
printBranches('Q5: After 1. d4 — distinct Black responses', ['d4']);

// Q6: Maximum branching factor
// Check every prefix that corresponds to an actual opening's move sequence
console.log('=== Q6: Maximum branching factor ===');
let maxBranching = 0;
let maxPrefix = [];
let maxMoves = '';
let maxName = '';

// Build set of all unique prefixes from opening move sequences
const prefixSet = new Map(); // stringified prefix -> {name, moves}
for (const seq of allSequences) {
  const key = seq.parsed.join(' ');
  if (!prefixSet.has(key)) {
    prefixSet.set(key, { name: seq.name, moves: seq.moves });
  }
}

// Check every opening position as a potential branching point
for (const seq of allSequences) {
  const prefix = seq.parsed;
  const branches = findBranches(prefix);
  const branchCount = Object.keys(branches).length;
  if (branchCount > maxBranching) {
    maxBranching = branchCount;
    maxPrefix = prefix;
    maxMoves = seq.moves;
    maxName = seq.name;
  }
}

console.log(`Maximum branching factor: ${maxBranching}`);
console.log(`Position: "${maxMoves}" (${maxName})`);
const maxBranches = findBranches(maxPrefix);
const sortedMax = Object.entries(maxBranches).sort((a, b) => b[1] - a[1]);
for (const [move, count] of sortedMax) {
  console.log(`  ${move}: ${count} openings`);
}
console.log();

// Also check all sub-prefixes (not just full openings)
// A position after N moves may not itself be a named opening but still branch
console.log('=== Q6b: Checking ALL possible prefixes (including partial) ===');
const allPrefixes = new Map();
for (const seq of allSequences) {
  for (let len = 0; len <= seq.parsed.length; len++) {
    const prefix = seq.parsed.slice(0, len);
    const key = prefix.join('|');
    if (!allPrefixes.has(key)) {
      allPrefixes.set(key, prefix);
    }
  }
}

let maxBranching2 = 0;
let maxPrefixKey2 = '';
let maxPrefix2 = [];

for (const [key, prefix] of allPrefixes) {
  const branches = findBranches(prefix);
  const branchCount = Object.keys(branches).length;
  if (branchCount > maxBranching2) {
    maxBranching2 = branchCount;
    maxPrefixKey2 = key;
    maxPrefix2 = prefix;
  }
}

// Reconstruct the move string for display
function prefixToMoveStr(prefix) {
  let str = '';
  for (let i = 0; i < prefix.length; i++) {
    if (i % 2 === 0) str += `${Math.floor(i / 2) + 1}. `;
    str += prefix[i] + ' ';
  }
  return str.trim();
}

console.log(`Maximum branching factor (any prefix): ${maxBranching2}`);
console.log(`Position after: "${prefixToMoveStr(maxPrefix2)}"`);
const maxBranches2 = findBranches(maxPrefix2);
const sortedMax2 = Object.entries(maxBranches2).sort((a, b) => b[1] - a[1]);
for (const [move, count] of sortedMax2) {
  console.log(`  ${move}: ${count} openings`);
}
console.log();

// Q7: Leaf nodes — openings where no other opening extends their move sequence
console.log('=== Q7: Leaf nodes ===');
let leafCount = 0;
const leafExamples = [];
for (const seq of allSequences) {
  const branches = findBranches(seq.parsed);
  if (Object.keys(branches).length === 0) {
    leafCount++;
    if (leafExamples.length < 5) {
      leafExamples.push(`${seq.name} (${seq.eco}): ${seq.moves}`);
    }
  }
}
console.log(
  `Leaf nodes (no further named extensions): ${leafCount} out of ${allSequences.length} total`
);
console.log(`Percentage: ${((leafCount / allSequences.length) * 100).toFixed(1)}%`);
console.log('Examples:');
for (const ex of leafExamples) {
  console.log(`  ${ex}`);
}
