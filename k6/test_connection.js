import http from 'k6/http';
import { check } from 'k6';

/**
 * Simple connectivity test - just checks if the endpoint is reachable
 * Run this first to verify the endpoint URL is correct
 */
export const options = {
  vus: 1,
  iterations: 1,
};

export default function () {
  console.log('🔍 Testing endpoint connectivity...');
  
  const url = 'https://northamerica-northeast1-tarbiyah-sms-staging.cloudfunctions.net/registerStudent';
  
  // Test OPTIONS request (CORS preflight)
  console.log('\n1️⃣ Testing OPTIONS (CORS preflight)...');
  const optionsRes = http.request('OPTIONS', url, null, {
    headers: { 'Origin': 'https://test.local' },
  });
  
  console.log(`   Status: ${optionsRes.status}`);
  console.log(`   Expected: 204`);
  
  // Test POST with minimal payload
  console.log('\n2️⃣ Testing POST with minimal payload...');
  const minimalPayload = JSON.stringify({
    student: {
      firstName: 'Test',
      lastName: 'User',
    },
    contact: {
      primaryEmail: 'test@example.com',
    },
  });
  
  const postRes = http.post(
    url,
    minimalPayload,
    { headers: { 'Content-Type': 'application/json' } }
  );
  
  console.log(`   Status: ${postRes.status}`);
  console.log(`   Status Text: ${postRes.status_text}`);
  console.log(`   Response Body:`);
  console.log(`   ${postRes.body}`);
  
  check(optionsRes, {
    'OPTIONS returns 204': (r) => r.status === 204,
  });
  
  check(postRes, {
    'POST returns some status': (r) => r.status > 0,
    'POST has response body': (r) => r.body && r.body.length > 0,
  });
  
  console.log('\n✅ Connectivity test complete');
  console.log('If you see errors above, check:');
  console.log('  - Is the function deployed?');
  console.log('  - Is the URL correct?');
  console.log('  - Are you using the staging project?');
}


