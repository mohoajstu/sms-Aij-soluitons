const { test } = require('node:test')
const assert = require('node:assert/strict')
const { validateInterpretation, interpretComments } = require('./timekeepingCommentInterpretation')

test('rejects fabricated source IDs and invalid pay hours', () => {
  assert.throws(() => validateInterpretation({ entries: [
    { sourceId: 'unknown', category: 'secondary', hours: 2 },
  ] }, ['known']))
  assert.throws(() => validateInterpretation({ entries: [
    { sourceId: 'known', category: 'secondary', hours: 24 },
  ] }, ['known']))
})

test('supply claims without stated hours are flagged for review', () => {
  const [entry] = validateInterpretation({ entries: [
    { sourceId: 'known', category: 'secondary', hours: null },
  ] }, ['known'])
  assert.equal(entry.hours, null)
  assert.match(entry.reviewReason, /not stated/)
})

test('prep needs no stated duration, but genuine conflicts still require review', () => {
  const entries = validateInterpretation({ entries: [
    { sourceId: 'clear', category: 'prepAtHome', hours: null, reviewReason: 'No hours specified.' },
    { sourceId: 'conflict', category: 'prepAtHome', hours: null, reviewReason: 'Medical absence mixed with prep.' },
  ] }, ['clear', 'conflict'])
  assert.equal(entries[0].reviewReason, '')
  assert.equal(entries[1].reviewReason, 'Medical absence mixed with prep.')
  const [mixed] = validateInterpretation({ entries: [
    { sourceId: 'mixed', category: 'prepAtHome', hours: null, reviewReason: '' },
  ] }, ['mixed'], [{ id: 'mixed', note: 'Medical appt. Prep at home' }])
  assert.match(mixed.reviewReason, /paid\/unpaid decision/)
})

test('sends comments to OpenAI and returns validated supply and prep suggestions', async () => {
  const originalFetch = global.fetch
  let payload
  global.fetch = async (_url, options) => {
    payload = JSON.parse(options.body)
    return {
      ok: true,
      json: async () => ({ choices: [{ message: { content: JSON.stringify({ entries: [
        { sourceId: 'tap-1', category: 'secondary', hours: 3, coveringFor: 'Nadia' },
        { sourceId: 'tap-2', category: 'prepAtHome', hours: null },
      ] }) } }] }),
    }
  }
  try {
    const result = await interpretComments([
      { id: 'tap-1', note: 'Supplied for Nadia for 3 hours' },
      { id: 'tap-2', note: 'Doing my scheduled prep at home' },
    ], 'test-key')
    assert.equal(payload.model, 'gpt-4o-mini')
    assert.equal(result[0].hours, 3)
    assert.equal(result[0].coveringFor, 'Nadia')
    assert.equal(result[1].category, 'prepAtHome')
  } finally {
    global.fetch = originalFetch
  }
})
