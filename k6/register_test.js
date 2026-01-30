import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '20s', target: 5 },
    { duration: '40s', target: 20 },
    { duration: '20s', target: 0 },
  ],
};

function rand() {
  return Math.random().toString(36).slice(2);
}

function generatePhoneNumber() {
  // Generate a random 10-digit phone number
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

  const res = http.post(
    'https://northamerica-northeast1-tarbiyah-sms-staging.cloudfunctions.net/registerStudent',
    payload,
    { headers: { 'Content-Type': 'application/json' } }
  );

  // Debug logging for failed requests
  if (res.status !== 200 && res.status !== 201) {
    console.log(`❌ Status: ${res.status}`);
    console.log(`Response body: ${res.body}`);
    console.log(`Request payload: ${payload.substring(0, 200)}...`);
  }

  check(res, {
    'status is 200 or 201': (r) => r.status === 200 || r.status === 201,
    'status is not 500': (r) => r.status !== 500,
    'response has body': (r) => r.body && r.body.length > 0,
    'p95 under 1.5s (per request)': (r) => r.timings.duration < 1500,
  });

  // Additional check for successful response structure
  if (res.status === 200 || res.status === 201) {
    try {
      const body = JSON.parse(res.body);
      check(res, {
        'response has success field': () => body.hasOwnProperty('success'),
        'response has registrationId': () => body.registrationId && body.registrationId.startsWith('TLR'),
      });
    } catch (e) {
      console.log(`Failed to parse response: ${e.message}`);
    }
  }

  sleep(1);
}

