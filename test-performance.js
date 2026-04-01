#!/usr/bin/env node

/**
 * Performance Testing Script
 * Run this to test all optimizations before and after deployment
 * 
 * Usage: node test-performance.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.TEST_URL || 'http://localhost:5002';
const API_BASE = `${BASE_URL}/api/v1`;
const PROVIDER_ID = process.env.PROVIDER_ID || 'test-provider-id';
const TOKEN = process.env.AUTH_TOKEN || 'test-token';

// Color outputs
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    http.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const duration = Date.now() - startTime;
        resolve({
          status: res.statusCode,
          duration,
          data: JSON.parse(data),
        });
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function testDashboardStats() {
  log('\n📊 TEST 1: Dashboard Stats (Should be <200ms)', 'cyan');
  try {
    const url = `${API_BASE}/provider-dashboard/dashboard-stats`;
    const result = await makeRequest(url);
    
    log(`  ✅ Status: ${result.status}`, 'green');
    log(`  ⏱️ Duration: ${result.duration}ms`);
    
    if (result.duration < 200) {
      log(`  ✅ PASS: Response time excellent (${result.duration}ms < 200ms)`, 'green');
    } else if (result.duration < 500) {
      log(`  ⚠️ WARN: Response time acceptable (${result.duration}ms < 500ms)`, 'yellow');
    } else {
      log(`  ❌ FAIL: Response time slow (${result.duration}ms > 500ms)`, 'red');
    }
  } catch (error) {
    log(`  ❌ ERROR: ${error.message}`, 'red');
  }
}

async function testRequests() {
  log('\n📋 TEST 2: Get Requests (Should be <150ms)', 'cyan');
  try {
    const url = `${API_BASE}/provider-dashboard/requests?page=1&limit=20`;
    const result = await makeRequest(url);
    
    log(`  ✅ Status: ${result.status}`, 'green');
    log(`  ⏱️ Duration: ${result.duration}ms`);
    log(`  📦 Items returned: ${result.data.data?.length || 0}`);
    
    if (result.duration < 150) {
      log(`  ✅ PASS: Request fast (${result.duration}ms < 150ms)`, 'green');
    } else if (result.duration < 300) {
      log(`  ⚠️ WARN: Request acceptable (${result.duration}ms < 300ms)`, 'yellow');
    } else {
      log(`  ❌ FAIL: Request slow (${result.duration}ms > 300ms)`, 'red');
    }
  } catch (error) {
    log(`  ❌ ERROR: ${error.message}`, 'red');
  }
}

async function testHelpers() {
  log('\n👥 TEST 3: Get Helpers (Should be <150ms)', 'cyan');
  try {
    const url = `${API_BASE}/provider-dashboard/helpers?page=1&limit=20`;
    const result = await makeRequest(url);
    
    log(`  ✅ Status: ${result.status}`, 'green');
    log(`  ⏱️ Duration: ${result.duration}ms`);
    log(`  👤 Helpers returned: ${result.data.data?.length || 0}`);
    
    if (result.duration < 150) {
      log(`  ✅ PASS: Helpers fast (${result.duration}ms < 150ms)`, 'green');
    } else if (result.duration < 300) {
      log(`  ⚠️ WARN: Helpers acceptable (${result.duration}ms < 300ms)`, 'yellow');
    } else {
      log(`  ❌ FAIL: Helpers slow (${result.duration}ms > 300ms)`, 'red');
    }
  } catch (error) {
    log(`  ❌ ERROR: ${error.message}`, 'red');
  }
}

async function testAnalytics() {
  log('\n📈 TEST 4: Analytics Data (Should be <500ms)', 'cyan');
  try {
    const url = `${API_BASE}/provider-dashboard/analytics-data?days=30`;
    const result = await makeRequest(url);
    
    log(`  ✅ Status: ${result.status}`, 'green');
    log(`  ⏱️ Duration: ${result.duration}ms`);
    log(`  📊 Data points: ${result.data.data?.length || 0}`);
    
    if (result.duration < 300) {
      log(`  ✅ PASS: Analytics excellent (${result.duration}ms < 300ms)`, 'green');
    } else if (result.duration < 500) {
      log(`  ✅ PASS: Analytics good (${result.duration}ms < 500ms)`, 'green');
    } else if (result.duration < 1000) {
      log(`  ⚠️ WARN: Analytics acceptable (${result.duration}ms < 1000ms)`, 'yellow');
    } else {
      log(`  ❌ FAIL: Analytics slow (${result.duration}ms > 1000ms)`, 'red');
    }
  } catch (error) {
    log(`  ❌ ERROR: ${error.message}`, 'red');
  }
}

async function testInventory() {
  log('\n📦 TEST 5: Get Inventory (Should be <100ms)', 'cyan');
  try {
    const url = `${API_BASE}/provider-dashboard/inventory`;
    const result = await makeRequest(url);
    
    log(`  ✅ Status: ${result.status}`, 'green');
    log(`  ⏱️ Duration: ${result.duration}ms`);
    log(`  📦 LPG Stock: ${result.data.data?.lpgStock || 0}`);
    log(`  📦 CNG Stock: ${result.data.data?.cngStock || 0}`);
    
    if (result.duration < 100) {
      log(`  ✅ PASS: Inventory very fast (${result.duration}ms < 100ms)`, 'green');
    } else if (result.duration < 200) {
      log(`  ✅ PASS: Inventory fast (${result.duration}ms < 200ms)`, 'green');
    } else {
      log(`  ⚠️ WARN: Inventory acceptable (${result.duration}ms)`, 'yellow');
    }
  } catch (error) {
    log(`  ❌ ERROR: ${error.message}`, 'red');
  }
}

async function testMultipleRequests() {
  log('\n🔄 TEST 6: Multiple Requests (Cache Performance)', 'cyan');
  try {
    log('  Making 3 identical requests...');
    
    const url = `${API_BASE}/provider-dashboard/requests?page=1&limit=20`;
    const times = [];
    
    for (let i = 1; i <= 3; i++) {
      const result = await makeRequest(url);
      times.push(result.duration);
      log(`  Request ${i}: ${result.duration}ms`);
    }
    
    const avgTime = times.reduce((a, b) => a + b) / times.length;
    const firstRequest = times[0];
    const subsequentAvg = (times[1] + times[2]) / 2;
    
    log(`  📊 First request: ${firstRequest}ms`);
    log(`  📊 Subsequent avg: ${subsequentAvg}ms`);
    
    if (subsequentAvg < firstRequest * 0.5) {
      log(`  ✅ PASS: Caching working! (${subsequentAvg}ms vs ${firstRequest}ms)`, 'green');
    } else {
      log(`  ⚠️ WARN: Caching may not be optimal`, 'yellow');
    }
  } catch (error) {
    log(`  ❌ ERROR: ${error.message}`, 'red');
  }
}

async function runAllTests() {
  log('\n' + '='.repeat(60), 'cyan');
  log('🧪 EMERGENCY GAS CONNECT - PERFORMANCE TEST SUITE', 'cyan');
  log('='.repeat(60), 'cyan');
  
  log(`\n📍 Testing against: ${BASE_URL}`, 'blue');
  log(`⏰ Started: ${new Date().toLocaleString()}\n`, 'blue');
  
  try {
    await testDashboardStats();
    await testRequests();
    await testHelpers();
    await testAnalytics();
    await testInventory();
    await testMultipleRequests();
    
    log('\n' + '='.repeat(60), 'cyan');
    log('✅ All tests completed!', 'green');
    log('='.repeat(60), 'cyan');
    
    log('\n📝 INTERPRETATION:', 'blue');
    log('  ✅ All tests PASS = Ready for production', 'green');
    log('  ⚠️ Some tests WARN = Good enough, monitor in production', 'yellow');
    log('  ❌ Any test FAIL = Needs optimization before deployment', 'red');
    
  } catch (error) {
    log(`\n❌ Test suite error: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Run tests
runAllTests().catch((error) => {
  log(`❌ Fatal error: ${error.message}`, 'red');
  process.exit(1);
});
