#!/usr/bin/env node

/**
 * Analyze Top Chess Openings from Popularity Stats
 * Extracts and displays the top 100 most popular chess openings
 */

const fs = require('fs');
const path = require('path');

// Load ECO data for opening names and moves
function loadECOData() {
  const ecoDir = path.join(__dirname, '../../data/eco');
  const ecoFiles = ['ecoA.json', 'ecoB.json', 'ecoC.json', 'ecoD.json', 'ecoE.json'];
  
  let allOpenings = {};
  
  for (const filename of ecoFiles) {
    const filePath = path.join(ecoDir, filename);
    if (fs.existsSync(filePath)) {
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        // Merge all ECO data
        Object.assign(allOpenings, data);
      } catch (error) {
        console.warn(`Could not load ${filename}:`, error.message);
      }
    }
  }
  
  return allOpenings;
}

// Load popularity stats
function loadPopularityStats() {
  // Try multiple potential paths
  const potentialPaths = [
    path.join(__dirname, '../../api/data/popularity_stats.json'),  // From tools/analysis
    path.join(__dirname, 'api/data/popularity_stats.json')          // From project root
  ];
  
  let statsPath = null;
  for (const p of potentialPaths) {
    if (fs.existsSync(p)) {
      statsPath = p;
      break;
    }
  }
  
  if (!statsPath) {
    console.error('Popularity stats file not found. Tried:');
    potentialPaths.forEach(p => console.error(`  - ${p}`));
    process.exit(1);
  }
  
  try {
    const data = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
    return data.positions || data; // Handle both data structures
  } catch (error) {
    console.error('Error loading popularity stats:', error.message);
    process.exit(1);
  }
}

// Find opening data by FEN in ECO database
function findOpeningData(fen, ecoData) {
  return ecoData[fen] || null;
}

// Main analysis function
function analyzeTopOpenings() {
  console.log('🚀 Analyzing Top 100 Chess Openings...\n');
  
  // Load data
  const popularityStats = loadPopularityStats();
  const ecoData = loadECOData();
  
  console.log(`📊 Total positions in popularity stats: ${Object.keys(popularityStats).length}`);
  console.log(`📚 Total positions in ECO database: ${Object.keys(ecoData).length}\n`);
  
  // Convert to array and sort by popularity score (descending)
  const openings = Object.entries(popularityStats)
    .map(([fen, stats]) => {
      const ecoInfo = findOpeningData(fen, ecoData);
      return {
        fen,
        popularity_score: stats.popularity_score,
        frequency_count: stats.frequency_count,
        games_analyzed: stats.games_analyzed,
        white_win_rate: stats.white_win_rate,
        black_win_rate: stats.black_win_rate,
        draw_rate: stats.draw_rate,
        avg_rating: stats.avg_rating,
        confidence_score: stats.confidence_score,
        // ECO data
        name: ecoInfo?.name || 'Unknown Opening',
        eco: ecoInfo?.eco || 'Unknown',
        moves: ecoInfo?.moves || 'Unknown',
        src: ecoInfo?.src || 'Unknown',
        isEcoRoot: ecoInfo?.isEcoRoot || false
      };
    })
    .sort((a, b) => b.games_analyzed - a.games_analyzed) // Sort by game volume instead of popularity
    .slice(0, 100); // Top 100
  
  // Display results
  console.log('🏆 TOP 100 OPENINGS BY GAME VOLUME\n');
  console.log('=' .repeat(110));
  console.log('Rank | Games        | ECO  | Root | Opening Name                           | Moves');
  console.log('=' .repeat(110));
  
  openings.forEach((opening, index) => {
    const rank = (index + 1).toString().padStart(4);
    const games = opening.games_analyzed.toLocaleString().padStart(12);
    const eco = opening.eco.padEnd(5);
    const isRoot = opening.isEcoRoot ? ' ✓ ' : '   ';
    const name = opening.name.length > 38 ? opening.name.substring(0, 35) + '...' : opening.name.padEnd(38);
    const moves = opening.moves.length > 40 ? opening.moves.substring(0, 37) + '...' : opening.moves;
    
    console.log(`${rank} | ${games} | ${eco} | ${isRoot} | ${name} | ${moves}`);
  });
  
  console.log('=' .repeat(110));
  
  // Calculate root opening statistics
  const rootOpenings = openings.filter(o => o.isEcoRoot);
  
  console.log('\n📈 SUMMARY STATISTICS:');
  console.log(`• Most games analyzed: ${openings[0].games_analyzed.toLocaleString()}`);
  console.log(`• Total games in top 100: ${openings.reduce((sum, o) => sum + o.games_analyzed, 0).toLocaleString()}`);
  console.log(`• Average games per opening: ${Math.round(openings.reduce((sum, o) => sum + o.games_analyzed, 0) / 100).toLocaleString()}`);
  console.log(`• ECO root openings in top 100: ${rootOpenings.length}/100 (${Math.round(rootOpenings.length)}%)`);
  console.log(`• Non-root variations: ${100 - rootOpenings.length}/100 (${100 - rootOpenings.length}%)`);
  
  // Additional analysis: ECO root openings with popularity score of 10
  const allOpenings = Object.entries(popularityStats)
    .map(([fen, stats]) => {
      const ecoInfo = findOpeningData(fen, ecoData);
      return {
        fen,
        popularity_score: stats.popularity_score,
        games_analyzed: stats.games_analyzed,
        name: ecoInfo?.name || 'Unknown Opening',
        eco: ecoInfo?.eco || 'Unknown',
        moves: ecoInfo?.moves || 'Unknown',
        isEcoRoot: ecoInfo?.isEcoRoot || false
      };
    });
  
  const rootOpeningsWithScore10 = allOpenings.filter(o => 
    o.isEcoRoot && o.popularity_score === 10
  );
  
  console.log(`• ECO root openings with popularity score of 10: ${rootOpeningsWithScore10.length}`);
  
  if (rootOpeningsWithScore10.length > 0) {
    console.log('\n🔍 ECO ROOT OPENINGS WITH POPULARITY SCORE = 10:');
    console.log('=' .repeat(80));
    console.log('ECO  | Games        | Opening Name                | Moves');
    console.log('=' .repeat(80));
    
    rootOpeningsWithScore10
      .sort((a, b) => b.games_analyzed - a.games_analyzed)
      .forEach(opening => {
        const eco = opening.eco.padEnd(5);
        const games = opening.games_analyzed.toLocaleString().padStart(12);
        const name = opening.name.length > 25 ? opening.name.substring(0, 22) + '...' : opening.name.padEnd(25);
        const moves = opening.moves.length > 25 ? opening.moves.substring(0, 22) + '...' : opening.moves;
        
        console.log(`${eco} | ${games} | ${name} | ${moves}`);
      });
    console.log('=' .repeat(80));
  }
  
  // Get all ECO root openings with popularity score 10
  const allRootOpeningsScore10 = allOpenings.filter(o => 
    o.isEcoRoot && o.popularity_score === 10
  ).sort((a, b) => b.games_analyzed - a.games_analyzed);
  
  // Get the FENs of the top 100 openings to avoid duplicates
  const top100Fens = new Set(openings.map(o => o.fen));
  
  // Filter out the ECO root openings that are already in the top 100
  const remainingRootOpeningsScore10 = allRootOpeningsScore10.filter(o => 
    !top100Fens.has(o.fen)
  );
  
  // Create comprehensive dataset
  const comprehensiveData = {
    generated_at: new Date().toISOString(),
    total_openings_analyzed: Object.keys(popularityStats).length,
    ranking_method: "by_game_volume",
    summary: {
      top_100_openings: 100,
      eco_root_openings_in_top_100: rootOpenings.length,
      non_root_variations_in_top_100: 100 - rootOpenings.length,
      eco_root_percentage_in_top_100: Math.round(rootOpenings.length),
      total_eco_root_score_10: allRootOpeningsScore10.length,
      remaining_eco_root_score_10: remainingRootOpeningsScore10.length,
      total_comprehensive_openings: 100 + remainingRootOpeningsScore10.length
    },
    top_100_openings: openings.map((opening, index) => ({
      rank: index + 1,
      games_analyzed: opening.games_analyzed,
      name: opening.name,
      moves: opening.moves,
      eco: opening.eco,
      fen: opening.fen,
      isEcoRoot: opening.isEcoRoot,
      popularity_score: opening.popularity_score
    })),
    remaining_eco_root_score_10: remainingRootOpeningsScore10.map((opening, index) => ({
      rank: index + 101, // Continue ranking after top 100
      games_analyzed: opening.games_analyzed,
      name: opening.name,
      moves: opening.moves,
      eco: opening.eco,
      fen: opening.fen,
      isEcoRoot: opening.isEcoRoot,
      popularity_score: opening.popularity_score
    }))
  };
  
  const outputPath = path.join(__dirname, '../../data/comprehensive_openings.json');
  fs.writeFileSync(outputPath, JSON.stringify(comprehensiveData, null, 2));
  console.log(`\n💾 Comprehensive data exported to: ${outputPath}`);
  console.log(`\n📊 COMPREHENSIVE DATASET SUMMARY:`);
  console.log(`• Top 100 openings by game volume: 100`);
  console.log(`• Remaining ECO root openings (score 10, not in top 100): ${remainingRootOpeningsScore10.length}`);
  console.log(`• Total openings in comprehensive dataset: ${100 + remainingRootOpeningsScore10.length}`);
  console.log(`• Total ECO root openings with score 10: ${allRootOpeningsScore10.length}`);
  console.log(`• ECO root openings already in top 100: ${allRootOpeningsScore10.length - remainingRootOpeningsScore10.length}`);
  
  // Also update the original top_100_openings.json with popularity scores
  const simplifiedData = {
    generated_at: new Date().toISOString(),
    total_openings_analyzed: Object.keys(popularityStats).length,
    ranking_method: "by_game_volume",
    summary: {
      total_openings: 100,
      eco_root_openings: rootOpenings.length,
      non_root_variations: 100 - rootOpenings.length,
      eco_root_percentage: Math.round(rootOpenings.length)
    },
    top_100_openings: openings.map((opening, index) => ({
      rank: index + 1,
      games_analyzed: opening.games_analyzed,
      name: opening.name,
      moves: opening.moves,
      eco: opening.eco,
      fen: opening.fen,
      isEcoRoot: opening.isEcoRoot
    }))
  };
  
  const outputPathTop100 = path.join(__dirname, '../../data/top_100_openings.json');
  fs.writeFileSync(outputPathTop100, JSON.stringify(simplifiedData, null, 2));
  console.log(`Top 100 openings data updated: ${outputPathTop100}`);
  
  console.log('\n✅ Analysis complete!');
}

// Run the analysis
if (require.main === module) {
  analyzeTopOpenings();
}

module.exports = { analyzeTopOpenings, loadPopularityStats, loadECOData };
