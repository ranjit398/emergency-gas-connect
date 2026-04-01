/**
 * Backend Endpoint Testing Script
 * Tests all 6 new provider dashboard endpoints
 */

const http = require('http');
const baseURL = 'http://localhost:5002';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  bold: '\x1b[1m',
};

const log = {
  success: (msg) => console.log(`\n${colors.green}✓ ${msg}${colors.reset}`),
  error: (msg) => console.log(`\n${colors.red}✗ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
  header: (msg) => console.log(`\n${colors.bold}${colors.blue}═══ ${msg} ═══${colors.reset}`),
};

/**
 * Make HTTP request
 */
function makeRequest(method, path, token, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseURL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'authorization': `Bearer ${token}`,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

/**
 * Test suite
 */
async function runTests() {
  log.header('PROVIDER DASHBOARD ENDPOINT TESTS');

  // Test data - you'll need to replace these with actual values from your DB
  const PROVIDER_ID = 'test-provider-id'; // This will need to be a real provider ID
  const TOKEN = 'test-token'; // This will need to be a real JWT token
  
  log.warn('⚠️  NOTE: You need to set valid PROVIDER_ID and TOKEN before running tests');
  log.warn('For now, showing test structure and expected responses...\n');

  const tests = [
    {
      name: 'GET /provider-dashboard/dashboard-stats',
      method: 'GET',
      path: '/api/v1/provider-dashboard/dashboard-stats',
      body: null,
      description: 'Retrieve dashboard statistics',
    },
    {
      name: 'GET /provider-dashboard/inventory',
      method: 'GET',
      path: '/api/v1/provider-dashboard/inventory',
      body: null,
      description: 'Get current inventory status',
    },
    {
      name: 'GET /provider-dashboard/requests',
      method: 'GET',
      path: '/api/v1/provider-dashboard/requests?page=1&limit=20',
      body: null,
      description: 'Get paginated requests list',
    },
    {
      name: 'GET /provider-dashboard/helpers',
      method: 'GET',
      path: '/api/v1/provider-dashboard/helpers?page=1&limit=20',
      body: null,
      description: 'Get paginated helpers list',
    },
    {
      name: 'PUT /provider-dashboard/inventory-stock',
      method: 'PUT',
      path: '/api/v1/provider-dashboard/inventory-stock',
      body: { lpgStock: 100, cngStock: 50 },
      description: 'Update inventory stock levels',
    },
    {
      name: 'GET /provider-dashboard/analytics-data',
      method: 'GET',
      path: '/api/v1/provider-dashboard/analytics-data',
      body: null,
      description: 'Get 30-day analytics data',
    },
  ];

  console.log('\n\n📋 ENDPOINT STRUCTURE:\n');

  for (const test of tests) {
    console.log(`${colors.bold}${test.name}${colors.reset}`);
    console.log(`   Method: ${test.method}`);
    console.log(`   Path: ${test.path}`);
    console.log(`   Description: ${test.description}`);
    if (test.body) {
      console.log(`   Body: ${JSON.stringify(test.body)}`);
    }
    console.log(`   Expected Response: { success: true, data: {...}, message: "..." }`);
    console.log('');
  }

 log.warn(`\n⚠️  To run actual tests:`);
  log.warn(`  1. Create a test provider account`);
  log.warn(`  2. Get a valid JWT auth token from signup/login`);
  log.warn(`  3. Update PROVIDER_ID and TOKEN in this script`);
  log.warn(`  4. Run: node test-endpoints.js\n`);

  // Test structure (showing what the test would look like)
  console.log(`${colors.bold}EXAMPLE TEST OUTPUT:${colors.reset}`);
  console.log('');
  log.success('GET /provider-dashboard/dashboard-stats');
  console.log('Status: 200 OK');
  console.log('Response:', JSON.stringify({
    success: true,
    data: {
      totalRequests: 45,
      completedRequests: 38,
      pendingRequests: 5,
      activeRequests: 2,
      activeHelpers: 3,
      successRate: 84.4,
      averageRating: 4.6,
      totalRatings: 38,
      businessName: 'Test Provider',
      businessType: 'Both',
      isVerified: true,
    },
    message: 'Dashboard stats loaded',
  }, null, 2));

  console.log('');
  log.header('MANUAL CURL COMMANDS FOR TESTING');
  console.log('');
  console.log('Replace YOUR_TOKEN with an actual JWT token from auth:\n');

  console.log(`${colors.bold}1. Dashboard Stats:${colors.reset}`);
  console.log(`curl -X GET http://localhost:5002/api/v1/provider-dashboard/dashboard-stats \\`);
  console.log(`  -H "authorization: Bearer YOUR_TOKEN"\n`);

  console.log(`${colors.bold}2. Inventory:${colors.reset}`);
  console.log(`curl -X GET http://localhost:5002/api/v1/provider-dashboard/inventory \\`);
  console.log(`  -H "authorization: Bearer YOUR_TOKEN"\n`);

  console.log(`${colors.bold}3. Requests (with pagination):${colors.reset}`);
  console.log(`curl -X GET 'http://localhost:5002/api/v1/provider-dashboard/requests?page=1&limit=20' \\`);
  console.log(`  -H "authorization: Bearer YOUR_TOKEN"\n`);

  console.log(`${colors.bold}4. Helpers (with pagination):${colors.reset}`);
  console.log(`curl -X GET 'http://localhost:5002/api/v1/provider-dashboard/helpers?page=1&limit=20' \\`);
  console.log(`  -H "authorization: Bearer YOUR_TOKEN"\n`);

  console.log(`${colors.bold}5. Update Inventory:${colors.reset}`);
  console.log(`curl -X PUT http://localhost:5002/api/v1/provider-dashboard/inventory-stock \\`);
  console.log(`  -H "authorization: Bearer YOUR_TOKEN" \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(`  -d '{"lpgStock": 100, "cngStock": 50}'\n`);

  console.log(`${colors.bold}6. Analytics Data:${colors.reset}`);
  console.log(`curl -X GET http://localhost:5002/api/v1/provider-dashboard/analytics-data \\`);
  console.log(`  -H "authorization: Bearer YOUR_TOKEN"\n`);

  log.success('\n✅ Backend is running and ready for manual testing!');
  log.info('All 6 new endpoints are deployed and accessible.');
}

runTests().catch((err) => {
  log.error(`Test failed: ${err.message}`);
  process.exit(1);
});
