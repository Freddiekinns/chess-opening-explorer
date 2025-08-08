#!/usr/bin/env node

/**
 * Quick API Feature Comparison Test
 * Verify that both APIs support the same endpoints
 */

const fs = require('fs');

// Read the development API routes to extract endpoints
const devAPIContent = fs.readFileSync('./packages/api/src/routes/openings.js', 'utf8');
const vercelAPIContent = fs.readFileSync('./api/openings.js', 'utf8');

// Extract route patterns from development API
const devRoutes = [];
const devMatches = devAPIContent.match(/router\.(get|post)\('([^']+)/g);
if (devMatches) {
  devMatches.forEach(match => {
    const route = match.replace(/router\.(get|post)\('/, '').replace("'", '');
    devRoutes.push(route);
  });
}

// Extract route patterns from Vercel API  
const vercelRoutes = [];
const vercelMatches = vercelAPIContent.match(/if \(route === '([^']+)'|if \(route\.startsWith\('([^']+)'/g);
if (vercelMatches) {
  vercelMatches.forEach(match => {
    let route = match.replace(/if \(route === '/, '').replace(/if \(route\.startsWith\('/, '').replace("')", '').replace("'", '');
    if (route.includes('/')) {
      route = route.split("')")[0]; // Clean up any remaining artifacts
    }
    vercelRoutes.push(route);
  });
}

console.log('🔍 API ENDPOINT COMPARISON\n');

console.log('📋 Development API Endpoints:');
devRoutes.sort().forEach(route => {
  console.log(`   ${route}`);
});

console.log('\n📋 Vercel API Endpoints:');
vercelRoutes.sort().forEach(route => {
  console.log(`   ${route}`);
});

console.log('\n📊 COMPARISON RESULTS:');
console.log(`Development API: ${devRoutes.length} endpoints`);
console.log(`Vercel API: ${vercelRoutes.length} endpoints`);

const missingInVercel = devRoutes.filter(route => !vercelRoutes.includes(route));
const extraInVercel = vercelRoutes.filter(route => !devRoutes.includes(route));

if (missingInVercel.length === 0 && extraInVercel.length === 0) {
  console.log('✅ PERFECT PARITY - All endpoints match!');
} else {
  if (missingInVercel.length > 0) {
    console.log('\n⚠️  Missing in Vercel API:');
    missingInVercel.forEach(route => console.log(`   - ${route}`));
  }
  
  if (extraInVercel.length > 0) {
    console.log('\n➕ Extra in Vercel API:');
    extraInVercel.forEach(route => console.log(`   + ${route}`));
  }
}

console.log('\n🎯 API CONSOLIDATION STATUS:');
const coverage = ((vercelRoutes.length - missingInVercel.length) / devRoutes.length * 100).toFixed(1);
console.log(`Feature Coverage: ${coverage}%`);

if (coverage >= 95) {
  console.log('✅ EXCELLENT - Ready for production deployment');
} else if (coverage >= 80) {
  console.log('⚠️  GOOD - Minor gaps remaining');
} else {
  console.log('❌ NEEDS WORK - Significant gaps in coverage');
}
