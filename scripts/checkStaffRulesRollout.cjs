const fs = require('node:fs')
const path = require('node:path')
const root = process.env.FIREBASE_TOOLS_ROOT
const auth = require(path.join(root, 'lib/auth'))
const { requireAuth } = require(path.join(root, 'lib/requireAuth'))
const rules = require(path.join(root, 'lib/gcp/rules'))
;(async () => {
  await requireAuth({ project: 'tarbiyah-sms', nonInteractive: true, ...auth.getGlobalDefaultAccount() })
  const name = await rules.getLatestRulesetName('tarbiyah-sms', 'cloud.firestore')
  const files = await rules.getRulesetContent(name)
  const live = files[0].content
  const proposed = fs.readFileSync('firestore.rules', 'utf8')
  const baseline = proposed.replace('match /{collectionId}/{document=**}', 'match /{document=**}')
    .replace(/isAuthenticated\(\) &&\s*collectionId != 'staffTimesheetCorrections' && collectionId != 'timekeepingAdminAccess'/,
      'isAuthenticated()')
  const normalize = (value) => value.replace(/\/\/[^\n]*/g, '').replace(/\s+/g, '')
  console.log(JSON.stringify({ liveMatchesUnchangedBaseline: normalize(live) === normalize(baseline),
    liveAlreadyProtectsCorrections: live.includes('staffTimesheetCorrections'), sourceFileCount: files.length }))
})().catch((error) => { console.error(error.message); process.exitCode = 1 })
