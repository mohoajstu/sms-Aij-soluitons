// Read-only Firebase Rules test API. Does not deploy rules or write documents.
const fs = require('node:fs')
const path = require('node:path')
const root = process.env.FIREBASE_TOOLS_ROOT
if (!root) throw new Error('Set FIREBASE_TOOLS_ROOT to the installed Firebase CLI root.')
const auth = require(path.join(root, 'lib/auth'))
const { requireAuth } = require(path.join(root, 'lib/requireAuth'))
const { Client } = require(path.join(root, 'lib/apiv2'))
const { rulesOrigin } = require(path.join(root, 'lib/api'))
;(async () => {
  const account = auth.getGlobalDefaultAccount()
  await requireAuth({ project: 'tarbiyah-sms', nonInteractive: true, ...account })
  const client = new Client({ urlPrefix: rulesOrigin(), apiVersion: 'v1' })
  const cases = []
  for (const uid of [null, 'synthetic-owner', 'synthetic-other', 'synthetic-admin']) {
    for (const method of ['get', 'list', 'create', 'update', 'delete']) {
      for (const target of ['staffTimesheetCorrections/synthetic', 'staffTimesheetCorrections/synthetic/history/event',
        'timekeepingAdminAccess/synthetic']) {
        cases.push({ expectation: 'DENY', request: { path: `/databases/(default)/documents/${target}`, method,
          auth: uid ? { uid, token: { email: `${uid}@example.test` } } : null,
          resource: { data: { uid: 'synthetic-owner', email: 'synthetic-owner@example.test' } } },
          resource: { data: { uid: 'synthetic-owner', email: 'synthetic-owner@example.test' } } })
      }
    }
  }
  cases.push({ expectation: 'ALLOW', request: { path: '/databases/(default)/documents/unchangedLegacyScope/synthetic',
    method: 'get', auth: { uid: 'synthetic-owner', token: {} } }, resource: { data: {} } })
  const response = await client.post('/projects/tarbiyah-sms:test', {
    source: { files: [{ name: 'firestore.rules', content: fs.readFileSync('firestore.rules', 'utf8') }] },
    testSuite: { testCases: cases },
  }, { skipLog: { body: true, resBody: true } })
  const results = response.body.testResults || []
  const failures = results.filter((result) => result.state !== 'SUCCESS')
  console.log(JSON.stringify({ cases: cases.length, returned: results.length, failures: failures.length,
    states: [...new Set(results.map((result) => result.state))], issues: response.body.issues || [] }))
  if (failures.length || results.length !== cases.length) process.exitCode = 1
})().catch((error) => { console.error(error.message); process.exitCode = 1 })
