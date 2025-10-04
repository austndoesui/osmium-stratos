// Performance Test Suite for Parallel Processing
// This file demonstrates the performance improvements

const axios = require('axios');

async function testParallelProcessing() {
  const baseURL = 'http://localhost:3000/api';
  
  console.log('🧪 Testing Parallel Processing Performance...\n');
  
  // Test 1: Multiple VM requests in parallel vs sequential
  console.log('📊 Test 1: Multiple VM List Requests');
  
  // Sequential requests (old way)
  const startSequential = Date.now();
  for (let i = 0; i < 5; i++) {
    try {
      await axios.get(`${baseURL}/vms`);
    } catch (err) {
      // Expected if no authentication
    }
  }
  const sequentialTime = Date.now() - startSequential;
  
  // Parallel requests (new way)
  const startParallel = Date.now();
  const parallelRequests = Array(5).fill().map(() => 
    axios.get(`${baseURL}/vms`).catch(() => {})
  );
  await Promise.all(parallelRequests);
  const parallelTime = Date.now() - startParallel;
  
  console.log(`Sequential: ${sequentialTime}ms`);
  console.log(`Parallel: ${parallelTime}ms`);
  console.log(`Improvement: ${Math.round((sequentialTime - parallelTime) / sequentialTime * 100)}%\n`);
  
  // Test 2: Cache effectiveness
  console.log('📊 Test 2: Cache Effectiveness');
  
  const startFirstRequest = Date.now();
  try {
    await axios.get(`${baseURL}/hosts`);
  } catch (err) {}
  const firstRequestTime = Date.now() - startFirstRequest;
  
  const startCachedRequest = Date.now();
  try {
    await axios.get(`${baseURL}/hosts`);
  } catch (err) {}
  const cachedRequestTime = Date.now() - startCachedRequest;
  
  console.log(`First request: ${firstRequestTime}ms`);
  console.log(`Cached request: ${cachedRequestTime}ms`);
  console.log(`Cache speedup: ${Math.round(firstRequestTime / cachedRequestTime)}x faster\n`);
  
  console.log('✅ Performance tests completed!');
}

if (require.main === module) {
  testParallelProcessing().catch(console.error);
}

module.exports = { testParallelProcessing };