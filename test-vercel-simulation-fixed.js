#!/usr/bin/env node

/**
 * Test Vercel environment simulation
 * This script tests the PathResolver and ECOService in simulated Vercel environment
 */

// Simulate Vercel environment
process.env.VERCEL = '1';
process.env.NODE_ENV = 'production';

console.log('🧪 Testing Vercel Environment Simulation');
console.log('==========================================');

const pathResolver = require('./packages/api/src/utils/path-resolver');

console.log('\n📱 Environment Information:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('VERCEL:', process.env.VERCEL);
console.log('Current Working Directory:', process.cwd());

console.log('\n🛠️ PathResolver Test (Vercel Mode):');
console.log('ECO Data Path:', pathResolver.getECODataPath());
console.log('Videos Data Path:', pathResolver.getVideosDataPath());
console.log('Popularity Stats Path:', pathResolver.getPopularityStatsPath());

console.log('\n🔍 Path Existence Checks:');
console.log('ECO Path exists:', pathResolver.exists(pathResolver.getECODataPath()));
console.log('Videos Path exists:', pathResolver.exists(pathResolver.getVideosDataPath()));
console.log('Popularity Stats exists:', pathResolver.exists(pathResolver.getPopularityStatsPath()));

// Test ECO service
console.log('\n🔧 ECOService Test (Vercel Mode):');
try {
  const ECOService = require('./packages/api/src/services/eco-service');
  const ecoService = new ECOService();
  
  console.log('ECOService methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(ecoService)));
  console.log('Has getPopularOpeningsByECO:', typeof ecoService.getPopularOpeningsByECO);
  
  const openings = ecoService.getAllOpenings();
  console.log('Total openings loaded:', openings.length);
  
  if (openings.length > 0) {
    console.log('Sample opening:', openings[0].name, `(${openings[0].eco})`);
    
    // Test popular openings by ECO
    const popularA = ecoService.getPopularOpeningsByECO('A', 6);
    console.log('Popular A category structure:', Object.keys(popularA));
    if (popularA.A && popularA.A.length > 0) {
      console.log('Top A opening:', popularA.A[0].name, 'Games:', popularA.A[0].games_analyzed);
    }
  }
} catch (error) {
  console.log('❌ ECOService error:', error.message);
  console.log('Stack:', error.stack);
}

console.log('\n==========================================');
console.log('🏁 Vercel Simulation Test Complete');
