const fs = require('fs');
const path = require('path');

const data = require('../api/data/eco/ecoB.json');
const sicilianEntries = Object.entries(data).filter(([fen, entry]) => entry.name === 'Sicilian Defense');

console.log('Found', sicilianEntries.length, 'Sicilian Defense entries:');

sicilianEntries.forEach(([fen, entry]) => {
  const analysis = entry.analysis_json || {};
  const hasFullAnalysis = analysis.style_tags && analysis.tactical_tags && analysis.common_plans;
  console.log(`- ${entry.eco}: ${hasFullAnalysis ? '✅ Complete' : '❌ Missing fields'} - Fields: ${Object.keys(analysis).join(', ')}`);
  
  if (!hasFullAnalysis) {
    console.log(`  FEN: ${fen}`);
  }
});
