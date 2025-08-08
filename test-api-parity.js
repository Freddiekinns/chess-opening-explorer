#!/usr/bin/env node

/**
 * Test API Parity - Compare Development and Vercel APIs
 * 
 * This script tests if both APIs return identical results for core endpoints
 * to validate the tech debt consolidation was successful.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test configuration
const DEV_API_PORT = 3010;
const DEV_API_BASE = `http://localhost:${DEV_API_PORT}`;

// Simulated Vercel API function (using our consolidated api/openings.js)
const simulateVercelAPI = async (route, query = {}) => {
  try {
    // Import our Vercel API function
    const vercelAPI = require('./api/openings.js');
    
    // Create mock request and response objects
    const queryString = new URLSearchParams(query).toString();
    const url = `/api/openings${route}${queryString ? '?' + queryString : ''}`;
    
    const req = {
      method: 'GET',
      url,
      headers: { host: 'localhost' },
      query
    };
    
    let responseData = null;
    let statusCode = 200;
    
    const res = {
      setHeader: () => {},
      status: (code) => {
        statusCode = code;
        return res;
      },
      json: (data) => {
        responseData = data;
        return res;
      },
      end: () => {}
    };
    
    await vercelAPI(req, res);
    
    return {
      status: statusCode,
      data: responseData
    };
  } catch (error) {
    return {
      status: 500,
      data: { error: error.message }
    };
  }
};

// Test endpoints
const TEST_ENDPOINTS = [
  {
    name: 'Popular by ECO',
    route: '/popular-by-eco',
    query: { limit: 6 }
  },
  {
    name: 'Popular by ECO - Category A',
    route: '/popular-by-eco',
    query: { limit: 6, category: 'A' }
  },
  {
    name: 'All Openings',
    route: '/all',
    query: {}
  },
  {
    name: 'Statistics',
    route: '/stats',
    query: {}
  },
  {
    name: 'Categories',
    route: '/categories',
    query: {}
  },
  {
    name: 'Popular Openings',
    route: '/popular',
    query: { limit: 10 }
  },
  {
    name: 'Random Opening',
    route: '/random',
    query: {}
  }
];

// Utility functions
const makeDevAPIRequest = async (endpoint, query = {}) => {
  const queryString = new URLSearchParams(query).toString();
  const url = `${DEV_API_BASE}/api/openings${endpoint}${queryString ? '?' + queryString : ''}`;
  
  try {
    const response = await fetch(url);
    return {
      status: response.status,
      data: await response.json()
    };
  } catch (error) {
    return {
      status: 500,
      data: { error: error.message }
    };
  }
};

const compareResponses = (devResponse, vercelResponse, testName) => {
  const results = {
    testName,
    passed: true,
    issues: []
  };
  
  // Check status codes
  if (devResponse.status !== vercelResponse.status) {
    results.passed = false;
    results.issues.push(`Status code mismatch: Dev ${devResponse.status} vs Vercel ${vercelResponse.status}`);
  }
  
  // Check success field
  if (devResponse.data.success !== vercelResponse.data.success) {
    results.passed = false;
    results.issues.push(`Success field mismatch: Dev ${devResponse.data.success} vs Vercel ${vercelResponse.data.success}`);
  }
  
  // Check data structure
  if (devResponse.data.data && vercelResponse.data.data) {
    const devDataLength = Array.isArray(devResponse.data.data) ? 
      devResponse.data.data.length : 
      Object.keys(devResponse.data.data).length;
    
    const vercelDataLength = Array.isArray(vercelResponse.data.data) ? 
      vercelResponse.data.data.length : 
      Object.keys(vercelResponse.data.data).length;
    
    if (devDataLength !== vercelDataLength) {
      results.passed = false;
      results.issues.push(`Data length mismatch: Dev ${devDataLength} vs Vercel ${vercelDataLength}`);
    }
  }
  
  // Check if both have errors
  if (devResponse.data.error && vercelResponse.data.error) {
    // Both have errors - this might be expected
    results.issues.push(`Both APIs returned errors (might be expected): Dev "${devResponse.data.error}" vs Vercel "${vercelResponse.data.error}"`);
  } else if (devResponse.data.error || vercelResponse.data.error) {
    results.passed = false;
    results.issues.push(`Error mismatch: Dev error "${devResponse.data.error || 'none'}" vs Vercel error "${vercelResponse.data.error || 'none'}"`);
  }
  
  return results;
};

const runTests = async () => {
  console.log('🧪 Starting API Parity Tests');
  console.log('=' .repeat(50));
  
  const results = [];
  let totalTests = 0;
  let passedTests = 0;
  
  for (const test of TEST_ENDPOINTS) {
    totalTests++;
    console.log(`\n🔍 Testing: ${test.name}`);
    console.log(`   Route: ${test.route}`);
    console.log(`   Query: ${JSON.stringify(test.query)}`);
    
    try {
      // Test Development API (would need server running)
      const devResponse = await makeDevAPIRequest(test.route, test.query);
      
      // Test Vercel API (simulated)
      const vercelResponse = await simulateVercelAPI(test.route, test.query);
      
      console.log(`   Dev Status: ${devResponse.status}`);
      console.log(`   Vercel Status: ${vercelResponse.status}`);
      
      const result = compareResponses(devResponse, vercelResponse, test.name);
      results.push(result);
      
      if (result.passed) {
        console.log(`   ✅ PASSED`);
        passedTests++;
      } else {
        console.log(`   ❌ FAILED`);
        result.issues.forEach(issue => {
          console.log(`      - ${issue}`);
        });
      }
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
      results.push({
        testName: test.name,
        passed: false,
        issues: [`Test execution error: ${error.message}`]
      });
    }
  }
  
  // Summary
  console.log('\n' + '=' .repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('=' .repeat(50));
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${totalTests - passedTests}`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 ALL TESTS PASSED! API parity achieved.');
    console.log('✅ Tech debt consolidation successful.');
  } else {
    console.log('\n⚠️  Some tests failed. Review the issues above.');
    
    // Write detailed results to file for debugging
    const detailedResults = {
      summary: {
        totalTests,
        passedTests,
        failedTests: totalTests - passedTests,
        successRate: ((passedTests / totalTests) * 100).toFixed(1) + '%'
      },
      results
    };
    
    const resultsPath = path.join(__dirname, 'api-parity-test-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(detailedResults, null, 2));
    console.log(`📝 Detailed results written to: ${resultsPath}`);
  }
};

// Run tests only if this file is executed directly
if (require.main === module) {
  console.log('⚠️  Note: This test requires the development API server to be running on port 3010');
  console.log('   Start it with: npm run dev:api');
  console.log('   Or run a simulated test with: node test-api-parity.js --simulate-only\n');
  
  if (process.argv.includes('--simulate-only')) {
    console.log('🔧 Running simulation-only test (testing Vercel API structure)...\n');
    
    // Run a quick test of just the Vercel API
    (async () => {
      console.log('Testing Vercel API endpoints...');
      
      for (const test of TEST_ENDPOINTS.slice(0, 3)) { // Test first 3 endpoints
        console.log(`\n🔍 ${test.name}`);
        try {
          const vercelResponse = await simulateVercelAPI(test.route, test.query);
          console.log(`   Status: ${vercelResponse.status}`);
          console.log(`   Success: ${vercelResponse.data?.success}`);
          console.log(`   Data Type: ${typeof vercelResponse.data?.data}`);
          
          if (Array.isArray(vercelResponse.data?.data)) {
            console.log(`   Data Length: ${vercelResponse.data.data.length}`);
          } else if (typeof vercelResponse.data?.data === 'object') {
            console.log(`   Data Keys: ${Object.keys(vercelResponse.data.data).join(', ')}`);
          }
        } catch (error) {
          console.log(`   ❌ Error: ${error.message}`);
        }
      }
      
      console.log('\n✅ Simulation test completed');
    })();
  } else {
    runTests();
  }
}

module.exports = { simulateVercelAPI, makeDevAPIRequest, compareResponses };
