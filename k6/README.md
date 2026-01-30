# k6 Load Testing

This directory contains k6 load testing scripts for the staging environment.

## Prerequisites

Install k6:
```bash
# macOS
brew install k6

# Linux
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D9
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Windows
choco install k6
```

## Registration Load Test

Test the registration endpoint with realistic load patterns.

### Step 1: Test Connectivity First

Before running load tests, verify the endpoint is reachable:

```bash
k6 run test_connection.js
```

This will:
- Test CORS preflight (OPTIONS request)
- Test a minimal POST request
- Show you the actual error messages

### Step 2: Debug Mode (If Tests Fail)

If you're seeing 100% failure rate, run the debug version:

```bash
k6 run register_test_debug.js
```

This will:
- Run with only 1-2 users
- Log detailed error messages
- Show request/response bodies
- Help identify the exact failure reason

### Step 3: Full Load Test

Once connectivity is confirmed:

```bash
k6 run register_test.js
```

### Custom Load Pattern

Edit `register_test.js` to modify the load pattern:

```javascript
export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users over 30s
    { duration: '1m', target: 50 },   // Stay at 50 users for 1 minute
    { duration: '30s', target: 0 },   // Ramp down to 0 users over 30s
  ],
};
```

### Test Scenarios

#### Light Load (Development)
```javascript
stages: [
  { duration: '10s', target: 2 },
  { duration: '20s', target: 5 },
  { duration: '10s', target: 0 },
]
```

#### Medium Load (Staging)
```javascript
stages: [
  { duration: '20s', target: 5 },
  { duration: '40s', target: 20 },
  { duration: '20s', target: 0 },
]
```

#### Heavy Load (Stress Test)
```javascript
stages: [
  { duration: '1m', target: 10 },
  { duration: '2m', target: 50 },
  { duration: '1m', target: 100 },
  { duration: '2m', target: 100 },
  { duration: '1m', target: 0 },
]
```

### Output

k6 will display:
- Request statistics (min, max, avg, p95, p99)
- Success/failure rates
- Response time percentiles
- Data transfer statistics

Example output:
```
✓ status is 200
✓ response has success
✓ response has registrationId
✓ p95 under 1.5s (per request)

checks.........................: 100% ✓ 80      0 ✗
data_received..................: 12 kB 600 B/s
data_sent......................: 45 kB 2.2 kB/s
http_req_duration..............: avg=234.5ms min=120ms med=200ms max=800ms p(95)=450ms
http_req_failed................: 0.00% ✓ 0        ✗ 80
http_reqs......................: 80    4.0/s
iteration_duration.............: avg=1.23s min=1.01s med=1.20s max=1.80s
iterations.....................: 80    4.0/s
vus............................: 1     min=1      max=20
vus_max........................: 20    min=20     max=20
```

### Monitoring

While the test runs, you can:
1. Check Firebase Functions logs:
   ```bash
   firebase functions:log --only registerStudent
   ```

2. Monitor Firestore:
   - Check the `registrations` collection
   - Verify test tags (`isTest: true`, `env: "staging"`)

3. Check for errors:
   - Failed requests in k6 output
   - Error logs in Firebase Console

### Cleanup After Testing

After load testing, clean up test data:

```javascript
// Run in Firebase Console or Cloud Function
const stagingRegistrations = await db.collection('registrations')
  .where('isTest', '==', true)
  .where('env', '==', 'staging')
  .get()

const batch = db.batch()
stagingRegistrations.docs.forEach(doc => batch.delete(doc.ref))
await batch.commit()
```

Or use a script:
```bash
node scripts/cleanup-staging-data.js
```

## Safety Features

✅ **Staging-only**: Endpoint automatically adds test tags  
✅ **No real emails/SMS**: Staging mode disables side effects  
✅ **Unique data**: Each request generates unique emails/IDs  
✅ **Safe testing**: All data marked with `isTest: true`  

## Troubleshooting

### Connection Errors
- Verify the endpoint URL is correct
- Check that functions are deployed: `firebase deploy --only functions`
- Ensure you're using the staging project

### High Failure Rate
- Check Firebase Functions logs for errors
- Verify Firestore quotas aren't exceeded
- Check network connectivity

### Slow Response Times
- Review Firebase Functions logs for bottlenecks
- Check Firestore read/write performance
- Consider increasing function memory/timeout if needed

