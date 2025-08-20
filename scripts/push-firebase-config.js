const { spawnSync } = require('node:child_process')
const path = require('node:path')
const fs = require('node:fs')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })

function ensureValue(name, value) {
  if (!value || String(value).trim() === '') {
    console.error(`Missing required env var: ${name}`)
    process.exit(1)
  }
}

// Required for current functions usage
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER
ensureValue('TWILIO_ACCOUNT_SID', TWILIO_ACCOUNT_SID)
ensureValue('TWILIO_AUTH_TOKEN', TWILIO_AUTH_TOKEN)
ensureValue('TWILIO_PHONE_NUMBER', TWILIO_PHONE_NUMBER)

// Optional extras if present
const OPENAI_API_KEY = process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY
const GOOGLE_CLIENT_ID = process.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.VITE_GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET
const GOOGLE_API_KEY = process.env.VITE_GOOGLE_API_KEY || process.env.GOOGLE_API_KEY

// Resolve Firebase project from .firebaserc as default fallback
let firebaseProject = process.env.FIREBASE_PROJECT
try {
  const rcPath = path.resolve(__dirname, '../.firebaserc')
  if (fs.existsSync(rcPath)) {
    const rc = JSON.parse(fs.readFileSync(rcPath, 'utf8'))
    firebaseProject = firebaseProject || (rc.projects && rc.projects.default) || firebaseProject
  }
} catch {}

console.log('Pushing Firebase Functions config:')
console.log(`  twilio.accountsid = ${TWILIO_ACCOUNT_SID}`)
console.log(`  twilio.authtoken  = **** (hidden)`)
console.log(`  twilio.phonenumber = ${TWILIO_PHONE_NUMBER}`)
if (OPENAI_API_KEY) console.log('  openai.apikey     = **** (hidden)')
if (GOOGLE_CLIENT_ID) console.log('  google.clientid   = **** (hidden)')
if (GOOGLE_CLIENT_SECRET) console.log('  google.clientsecret = **** (hidden)')
if (GOOGLE_API_KEY) console.log('  google.apikey     = **** (hidden)')
if (firebaseProject) {
  console.log(`  --project ${firebaseProject}`)
}

const args = ['functions:config:set',
  `twilio.accountsid=${TWILIO_ACCOUNT_SID}`,
  `twilio.authtoken=${TWILIO_AUTH_TOKEN}`,
  `twilio.phonenumber=${TWILIO_PHONE_NUMBER}`
]

if (OPENAI_API_KEY) args.push(`openai.apikey=${OPENAI_API_KEY}`)
if (GOOGLE_CLIENT_ID) args.push(`google.clientid=${GOOGLE_CLIENT_ID}`)
if (GOOGLE_CLIENT_SECRET) args.push(`google.clientsecret=${GOOGLE_CLIENT_SECRET}`)
if (GOOGLE_API_KEY) args.push(`google.apikey=${GOOGLE_API_KEY}`)

if (firebaseProject) {
  args.push('--project', firebaseProject)
}

const result = spawnSync('npx', ['--yes', 'firebase', ...args], { stdio: 'inherit', cwd: path.resolve(__dirname, '..') })

if (result.error || result.status !== 0) {
  console.error('\nFailed to set Firebase Functions config. Ensure you are logged in (npx firebase login) and have access to the project.')
  process.exit(result.status || 1)
}

console.log('\nDone. Remember to deploy functions for changes to take effect:')
console.log('  npx firebase deploy --only functions') 