// All production Hosting releases must pass this guard, including direct CLI deploys.
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const { execFileSync } = require('node:child_process')
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex')
const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8'))
const digest = (file) => hash(fs.readFileSync(file))
const BASE = 'release/hosting-baseline.json'
const PLAN = 'release/hosting-plan.json'
const STAMP = 'release/hosting-prepared.json'

function tree(directory) {
  const files = {}
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = `${dir}/${entry.name}`
      if (entry.isSymbolicLink()) throw new Error(`Deployment input is a symlink: ${file}`)
      if (entry.isDirectory()) walk(file)
      else if (entry.isFile()) files[file] = digest(file)
    }
  }
  walk(directory)
  return files
}
function sources() {
  const files = { ...tree('src'), ...tree('public') }
  for (const file of fs.readdirSync('.')) {
    if (/^(index\.html|package(-lock)?\.json|yarn\.lock|vite\.config\..+|firebase\.json|\.firebaserc|\.env(?:\.(?:local|production|production\.local))?)$/.test(file)) {
      files[file] = digest(file)
    }
  }
  return files
}
function differences(before, after) {
  return [...new Set([...Object.keys(before), ...Object.keys(after)])].filter((f) => before[f] !== after[f]).sort()
}
function checkScope(before, after, allowedFiles) {
  if (!Array.isArray(allowedFiles) || allowedFiles.some((f) => typeof f !== 'string' || /[*?]/.test(f))) {
    throw new Error('Release plan must list exact file paths; wildcards are forbidden.')
  }
  const changed = differences(before, after)
  const unexpected = changed.filter((f) => !allowedFiles.includes(f))
  if (unexpected.length) throw new Error(`Out-of-scope changes block deployment:\n${unexpected.join('\n')}`)
  return changed
}
function assertSame(before, after, label) {
  const changed = differences(before, after)
  if (changed.length) throw new Error(`${label} changed; prepare the release again:\n${changed.join('\n')}`)
}
function mainAsset(html) {
  const asset = html.match(/\/assets\/index-[^"\s]+\.js/)?.[0]
  if (!asset) throw new Error('Could not identify the frontend release asset.')
  return asset
}
async function liveAsset() {
  const response = await fetch('https://tlasms.com/index.html', { cache: 'no-store', signal: AbortSignal.timeout(20000) })
  if (!response.ok) throw new Error(`Could not verify live baseline (${response.status}).`)
  return mainAsset(await response.text())
}
function configHashes() {
  return Object.fromEntries([BASE, PLAN, 'scripts/releaseHosting.cjs'].map((f) => [f, digest(f)]))
}
async function check() {
  const baseline = read(BASE), plan = read(PLAN), files = sources()
  if (plan.project !== 'tarbiyah-sms' || plan.target !== 'hosting:tlasms') throw new Error('Unexpected project or deployment target.')
  if (plan.baseAsset !== baseline.liveAsset) throw new Error('Release plan does not match the deployed baseline.')
  if (await liveAsset() !== baseline.liveAsset) throw new Error('Production changed since this baseline. Reconcile with the latest release before deploying.')
  const changed = checkScope(baseline.files, files, plan.allowedFiles)
  console.log(`Release: ${plan.name}\n${changed.length} scoped source changes:\n${changed.join('\n')}`)
  return { baseline, plan, files }
}
function run(command, args) { execFileSync(command, args, { stdio: 'inherit' }) }
async function prepare() {
  const before = await check()
  const config = configHashes()
  // Full frontend suite covers adjacent features; tests cannot be skipped by a plan.
  run('node', ['--test', 'scripts/releaseHosting.test.cjs'])
  run('npm', ['run', 'test:unit', '--', '--run'])
  run('npm', ['run', 'build'])
  assertSame(before.files, sources(), 'Source')
  assertSame(config, configHashes(), 'Release configuration')
  const stamp = { preparedAt: new Date().toISOString(), files: before.files, config,
    build: tree('build'), asset: mainAsset(fs.readFileSync('build/index.html', 'utf8')) }
  fs.writeFileSync(STAMP, JSON.stringify(stamp, null, 2) + '\n')
  console.log('Tests and build passed. Prepared artifact is tied to these exact sources.')
}
async function verify() {
  await check()
  const stamp = read(STAMP)
  assertSame(stamp.files, sources(), 'Source')
  assertSame(stamp.config, configHashes(), 'Release configuration')
  assertSame(stamp.build, tree('build'), 'Build artifact')
  console.log('Deployment guard passed: scope, tests, source, artifact and live baseline verified.')
}
async function main() {
  const action = process.argv[2]
  if (action === 'check') return check()
  if (action === 'prepare') return prepare()
  if (action === 'verify') return verify()
  if (action !== 'deploy') throw new Error('Usage: node scripts/releaseHosting.cjs check|prepare|verify|deploy')
  await prepare()
  run('firebase', ['deploy', '--only', 'hosting:tlasms', '--project', 'tarbiyah-sms', '--non-interactive'])
  const stamp = read(STAMP)
  const observed = await liveAsset()
  if (observed !== stamp.asset) throw new Error('Deploy finished but the custom domain has not confirmed the new asset. Baseline was not advanced; inspect before retrying.')
  fs.mkdirSync('release/history', { recursive: true })
  const receipt = { deployedAt: new Date().toISOString(), asset: observed, plan: read(PLAN), previousBaseline: read(BASE), files: stamp.files }
  fs.writeFileSync(path.join('release/history', `${Date.now()}.json`), JSON.stringify(receipt, null, 2) + '\n')
  fs.writeFileSync(BASE, JSON.stringify({ version: 1, liveAsset: observed, files: stamp.files }, null, 2) + '\n')
  console.log(`Verified production release ${observed}. Baseline advanced; receipt saved.`)
}
module.exports = { checkScope, assertSame, differences, mainAsset }
if (require.main === module) main().catch((error) => { console.error(error.message); process.exitCode = 1 })
