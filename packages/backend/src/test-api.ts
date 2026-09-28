// packages/backend/src/test-api.ts
import axios from 'axios';

const BASE_URL = 'http://localhost:3001';

async function testAPI() {
  try {
    console.log('🧪 Testing API endpoints...\n');

    // 1. Test health check
    console.log('1. Testing health check...');
    const health = await axios.get(`${BASE_URL}/health`);
    console.log(`✅ Health check: ${health.data.status}\n`);

    // 2. Test login
    console.log('2. Testing login...');
    const login = await axios.post(`${BASE_URL}/api/v1/auth/login`, {
      email: 'admin@pharmacy.com',
      password: 'Admin@2024',
    });
    const token = login.data.token;
    console.log(`✅ Login successful: ${login.data.user.email}`);
    console.log(`   Role: ${login.data.user.role}\n`);

    // 3. Test getting products (authenticated)
    console.log('3. Testing get products...');
    const products = await axios.get(`${BASE_URL}/api/v1/products`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(`✅ Found ${products.data.data.length} products`);
    if (products.data.data.length > 0) {
      console.log(`   First product: ${products.data.data[0].name}`);
    }
    // Check if pagination exists before accessing
    if (products.data.pagination) {
      console.log(`   Pagination: Page ${products.data.pagination.page} of ${products.data.pagination.totalPages}`);
    } else {
      console.log(`   Pagination: Not available (no pagination in response)`);
    }
    console.log();

    // 4. Test getting suppliers
    console.log('4. Testing get suppliers...');
    const suppliers = await axios.get(`${BASE_URL}/api/v1/suppliers`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(`✅ Found ${suppliers.data.data.length} suppliers`);
    if (suppliers.data.data.length > 0) {
      console.log(`   First supplier: ${suppliers.data.data[0].name}`);
    }
    if (suppliers.data.pagination) {
      console.log(`   Pagination: Page ${suppliers.data.pagination.page} of ${suppliers.data.pagination.totalPages}`);
    }
    console.log();

    // 5. Test getting batches
    console.log('5. Testing get batches...');
    const batches = await axios.get(`${BASE_URL}/api/v1/batches`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(`✅ Found ${batches.data.data.length} batches`);
    if (batches.data.data.length > 0) {
      console.log(`   First batch: ${batches.data.data[0].batchNumber}`);
      console.log(`   Product: ${batches.data.data[0].product?.name || 'N/A'}`);
    }
    console.log();

    // 6. Test getting current user
    console.log('6. Testing get current user...');
    const user = await axios.get(`${BASE_URL}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(`✅ Current user: ${user.data.email}`);
    console.log(`   Full name: ${user.data.firstName} ${user.data.lastName}`);
    console.log(`   Role: ${user.data.role}\n`);

    // 7. Test seed status
    console.log('7. Testing seed status...');
    const seed = await axios.get(`${BASE_URL}/api/v1/seed/status`);
    console.log(`✅ Database status: ${seed.data.status}`);
    console.log(`   Stats:`, seed.data.stats);
    console.log();

    console.log('🎉 All API tests passed!');
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('❌ API test failed:', error.response?.data || error.message);
      if (error.response?.status === 401) {
        console.log('💡 Tip: Check if the token is valid or if the user exists.');
      }
      if (error.response?.status === 404) {
        console.log('💡 Tip: The endpoint might not exist. Check the URL.');
      }
    } else {
      console.error('❌ API test failed:', error);
    }
  }
}

testAPI();