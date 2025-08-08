#!/usr/bin/env node

/**
 * Debug script to test Vercel deployment issues
 * Tests the popular-by-eco endpoint and compares with local
 */

const https = require('https');
const http = require('http');

async function makeRequest(url, label) {
  console.log(`\n🔍 Testing ${label}: ${url}`);
  
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https:') ? https : http;
    const startTime = Date.now();
    
    const req = protocol.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        console.log(`📊 Status: ${res.statusCode} | Time: ${responseTime}ms`);
        
        try {
          const parsed = JSON.parse(data);
          console.log(`✅ Success: ${parsed.success}`);
          
          if (parsed.success && parsed.data) {
            const categories = Object.keys(parsed.data);
            console.log(`📂 Categories: [${categories.join(', ')}]`);
            
            // Count results per category
            categories.forEach(cat => {
              const count = parsed.data[cat]?.length || 0;
              console.log(`   ${cat}: ${count} openings`);
              
              // Show first opening in each category
              if (count > 0) {
                const first = parsed.data[cat][0];
                console.log(`      First: ${first.name} (${first.games_analyzed || 'no games'} games)`);
              }
            });
            
            if (parsed.metadata) {
              console.log(`🎯 Source: ${parsed.metadata.source}`);
              console.log(`📈 Total analyzed: ${parsed.metadata.total_openings_analyzed}`);
            }
          } else if (parsed.error) {
            console.log(`❌ Error: ${parsed.error}`);
          }
        } catch (e) {
          console.log(`💥 Parse error: ${e.message}`);
          console.log(`📄 Raw response: ${data.substring(0, 200)}...`);
        }
        
        resolve({ status: res.statusCode, data: data });
      });
    });
    
    req.on('error', (err) => {
      console.log(`🚨 Request failed: ${err.message}`);
      reject(err);
    });
    
    req.setTimeout(10000, () => {
      console.log(`⏰ Request timeout`);
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

async function debugDeployment() {
  console.log('🔬 Vercel Deployment Debug Script');
  console.log('===================================');
  
  const tests = [
    // Test local development server
    {
      url: 'http://localhost:3010/api/openings/popular-by-eco',
      label: 'Local Development'
    },
    {
      url: 'http://localhost:3010/api/openings/popular-by-eco?limit=3',
      label: 'Local Dev (limit=3)'
    },
    // Test Vercel deployment (replace with actual URL)
    // {
    //   url: 'https://your-vercel-app.vercel.app/api/openings/popular-by-eco',
    //   label: 'Vercel Production'
    // }
  ];
  
  for (const test of tests) {
    try {
      await makeRequest(test.url, test.label);
    } catch (error) {
      console.log(`❌ Failed: ${error.message}`);
    }
  }
  
  console.log('\n📋 Summary');
  console.log('==========');
  console.log('1. Check if local server returns consistent data');
  console.log('2. Compare with Vercel production responses');
  console.log('3. Look for differences in data source, games_analyzed, etc.');
  console.log('4. Verify that "Zukertort Opening" popularity is accurate');
}

// Run if called directly
if (require.main === module) {
  debugDeployment().catch(console.error);
}

module.exports = { makeRequest, debugDeployment };
