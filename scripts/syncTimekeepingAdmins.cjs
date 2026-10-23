// Sync the current admin staff emails into the server-only timesheet reviewer
// registry. Dry run by default; pass --apply only after checking the count.
const crypto = require('node:crypto')
const path = require('node:path')
const root = process.env.FIREBASE_TOOLS_ROOT
if (!root) throw new Error('Set FIREBASE_TOOLS_ROOT to the installed Firebase CLI root.')
const auth = require(path.join(root, 'lib/auth'))
const { requireAuth } = require(path.join(root, 'lib/requireAuth'))
const { Client } = require(path.join(root, 'lib/apiv2'))
const project = 'tarbiyah-sms'
const prefix = `/projects/${project}/databases/(default)/documents`
const client = new Client({ urlPrefix: 'https://firestore.googleapis.com', apiVersion: 'v1' })
const fieldsAt = (doc) => doc.fields || {}
const stringAt = (fields, key) => fields[key]?.stringValue || ''
const emailFor = (doc) => {
  const fields = fieldsAt(doc)
  const email = stringAt(fields.contact?.mapValue?.fields || {}, 'email') ||
    stringAt(fields.personalInfo?.mapValue?.fields || {}, 'email') || stringAt(fields, 'email')
  return email.trim().toLowerCase()
}
const list = async (collectionId) => {
  const documents = []
  let nextPageToken
  do {
    const response = await client.get(`${prefix}/${collectionId}`, { queryParams: { pageSize: 300, ...(nextPageToken && { pageToken: nextPageToken }) } })
    documents.push(...(response.body.documents || []))
    nextPageToken = response.body.nextPageToken
  } while (nextPageToken)
  return documents
}
;(async () => {
  await requireAuth({ project, nonInteractive: true, ...auth.getGlobalDefaultAccount() })
  const admins = await list('admins')
  const activeAdmins = admins.filter((doc) => fieldsAt(doc).active?.booleanValue !== false &&
    fieldsAt(doc).isTestAccount?.booleanValue !== true)
  const emails = [...new Set(activeAdmins.map(emailFor).filter((email) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))].sort()
  const access = await list('timekeepingAdminAccess')
  const desired = new Set(emails.map((email) => crypto.createHash('sha256').update(email).digest('hex')))
  const stale = access.filter((doc) => !desired.has(doc.name.split('/').at(-1)))
  console.log(JSON.stringify({ adminRecords: admins.length, activeAdminRecords: activeAdmins.length, adminEmails: emails.length,
    schoolDomainEmails: emails.filter((email) => email.endsWith('@tarbiyahlearning.ca')).length,
    missingEmailRecords: admins.filter((doc) => !emailFor(doc)).length,
    existingAccessRecords: access.length, staleAccessRecords: stale.length, dryRun: !process.argv.includes('--apply') }))
  if (!process.argv.includes('--apply')) return
  if (!emails.length) throw new Error('No valid admin staff emails found; refusing to clear or publish reviewer access.')
  for (const email of emails) {
    const id = crypto.createHash('sha256').update(email).digest('hex')
    await client.patch(`${prefix}/timekeepingAdminAccess/${id}`, { fields: {
      email: { stringValue: email }, source: { stringValue: 'admins roster sync' },
      syncedAt: { timestampValue: new Date().toISOString() },
    } })
  }
  for (const doc of stale) await client.delete(`/${doc.name}`)
  console.log(JSON.stringify({ synced: emails.length, removedStale: stale.length }))
})().catch((error) => { console.error(error.message); process.exitCode = 1 })
