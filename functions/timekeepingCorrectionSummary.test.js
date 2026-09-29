const { test } = require('node:test')
const assert = require('node:assert/strict')
const { summarizeCorrections } = require('./timekeepingCorrectionSummary')

test('summarizes only supplied revisions without exposing API output beyond known IDs', async () => {
  const oldFetch = global.fetch
  let body
  global.fetch = async (_url, options) => {
    body = JSON.parse(options.body)
    return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify({
      entries: [{ id: 'c1', summary: 'Hours and prep comment changed.' }],
    }) } }] }) }
  }
  try {
    const entries = await summarizeCorrections([{ id: 'c1', approved: { rows: [{ date: '2026-09-25', hours: 7 }] },
      rows: [{ date: '2026-09-25', hours: 7.5, note: 'Prep at home', reason: 'Correction' }] }], 'test-key')
    assert.deepEqual(entries, [{ id: 'c1', summary: 'Hours and prep comment changed.' }])
    assert.match(body.messages[0].content, /Never calculate pay/)
    assert.match(body.messages[1].content, /7\.5/)
  } finally { global.fetch = oldFetch }
})

test('rejects fabricated summary IDs', async () => {
  const oldFetch = global.fetch
  global.fetch = async () => ({ ok: true, json: async () => ({ choices: [{ message: { content:
    '{"entries":[{"id":"not-the-submission","summary":"Approved"}]}' } }] }) })
  try {
    await assert.rejects(summarizeCorrections([{ id: 'c1', rows: [] }], 'test-key'), /invalid summary/)
  } finally { global.fetch = oldFetch }
})
