import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * Debug version - runs with only 1-2 users to see detailed error messages
 * Use this to diagnose why requests are failing
 */
export const options = {
  stages: [
    { duration: '10s', target: 1 },  // Start with 1 user
    { duration: '20s', target: 2 },  // Ramp to 2 users
    { duration: '10s', target: 0 },  // Ramp down
  ],
  // Increase timeout for debugging
  httpReq: {
    timeout: '30s',
  },
};

function rand() {
  return Math.random().toString(36).slice(2);
}

function generatePhoneNumber() {
  const digits = Math.floor(1000000000 + Math.random() * 9000000000);
  return `+1${digits}`;
}

export default function () {
  const randomId = rand();
  const parentEmail = `parent_${randomId}@test.local`;
  
  const payload = JSON.stringify({
    schoolYear: '2026-2027',
    grade: 'Grade 5',
    student: {
      firstName: 'Test',
      lastName: `Student_${randomId}`,
      gender: Math.random() > 0.5 ? 'male' : 'female',
      dateOfBirth: '2015-01-01',
      photoPermission: 'yes',
    },
    contact: {
      primaryEmail: parentEmail,
      primaryPhone: generatePhoneNumber(),
      emergencyPhone: generatePhoneNumber(),
      studentAddress: `${Math.floor(Math.random() * 9999)} Test Street`,
    },
    primaryGuardian: {
      firstName: 'Test',
      lastName: `Parent_${randomId}`,
      email: parentEmail,
      phone: generatePhoneNumber(),
      address: `${Math.floor(Math.random() * 9999)} Test Street`,
    },
  });

  console.log(`\n📤 Sending request ${__VU} (iteration ${__ITER})`);
  console.log(`Payload preview: ${payload.substring(0, 150)}...`);

  const res = http.post(
    'https://northamerica-northeast1-tarbiyah-sms-staging.cloudfunctions.net/registerStudent',
    payload,
    { 
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'registerStudent' },
    }
  );

  // Detailed logging
  console.log(`\n📥 Response received:`);
  console.log(`   Status: ${res.status}`);
  console.log(`   Status Text: ${res.status_text}`);
  console.log(`   Duration: ${res.timings.duration}ms`);
  console.log(`   Body length: ${res.body.length} bytes`);
  
  if (res.status !== 200 && res.status !== 201) {
    console.log(`\n❌ ERROR DETAILS:`);
    console.log(`   Status: ${res.status}`);
    console.log(`   Full Response Body:`);
    console.log(`   ${res.body}`);
    console.log(`\n   Request Headers:`);
    console.log(`   ${JSON.stringify(res.request.headers, null, 2)}`);
  } else {
    try {
      const body = JSON.parse(res.body);
      console.log(`\n✅ SUCCESS:`);
      console.log(`   Registration ID: ${body.registrationId}`);
      console.log(`   Staging mode: ${body.staging || false}`);
    } catch (e) {
      console.log(`\n⚠️  Could not parse response body: ${e.message}`);
      console.log(`   Body: ${res.body.substring(0, 500)}`);
    }
  }

  // Looser checks for debugging
  check(res, {
    'status is 2xx or 4xx (not 5xx)': (r) => {
      const status = r.status;
      if (status >= 500) {
        console.log(`   ⚠️  Server error (5xx): ${status}`);
        return false;
      }
      return true;
    },
    'status is not 500': (r) => r.status !== 500,
    'response has body': (r) => r.body && r.body.length > 0,
    'response time < 5s': (r) => r.timings.duration < 5000,
  });

  // Success-specific checks
  if (res.status === 200 || res.status === 201) {
    try {
      const body = JSON.parse(res.body);
      check(res, {
        'response has success=true': () => body.success === true,
        'response has registrationId': () => body.registrationId && body.registrationId.startsWith('TLR'),
      });
    } catch (e) {
      console.log(`   ⚠️  JSON parse error: ${e.message}`);
    }
  }

  sleep(2); // Longer sleep for debugging
}


