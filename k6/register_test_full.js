import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * Full registration test with all fields
 * Use this for comprehensive testing
 */
export const options = {
  stages: [
    { duration: '20s', target: 5 },
    { duration: '40s', target: 20 },
    { duration: '20s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<1500'], // 95% of requests should be below 1.5s
    http_req_failed: ['rate<0.01'], // Less than 1% of requests should fail
  },
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
  const studentEmail = `student_${randomId}@test.local`;
  
  const payload = JSON.stringify({
    schoolYear: '2026-2027',
    grade: 'Grade 5',
    student: {
      firstName: 'Test',
      lastName: `Student_${randomId}`,
      gender: Math.random() > 0.5 ? 'male' : 'female',
      dateOfBirth: '2015-01-01',
      oen: '',
      previousSchool: '',
      allergies: '',
      photoPermission: 'yes',
    },
    contact: {
      primaryEmail: studentEmail,
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
    secondaryGuardian: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: '',
    },
    payment: {
      method: 'cash',
      status: 'pending',
      amount: 0,
    },
    uploadedFiles: {},
  });

  const res = http.post(
    'https://northamerica-northeast1-tarbiyah-sms-staging.cloudfunctions.net/registerStudent',
    payload,
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response has success': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true;
      } catch (e) {
        return false;
      }
    },
    'response has registrationId': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.registrationId && body.registrationId.startsWith('TLR');
      } catch (e) {
        return false;
      }
    },
    'p95 under 1.5s (per request)': (r) => r.timings.duration < 1500,
  });

  sleep(1);
}


