const { test } = require('node:test')
const assert = require('node:assert/strict')
const { checkScope, assertSame } = require('./releaseHosting.cjs')
test('blocks unrelated modifications, omissions, and extra files from an older checkout', () => {
  const baseline = { 'src/time.js': '1', 'src/courses.js': 'fixed', 'src/roster.js': 'fixed' }
  assert.throws(() => checkScope(baseline, { ...baseline, 'src/courses.js': 'old' }, ['src/time.js']), /courses/)
  assert.throws(() => checkScope(baseline, { 'src/time.js': '2' }, ['src/time.js']), /roster/)
  assert.throws(() => checkScope(baseline, { ...baseline, 'src/extra.js': 'new' }, ['src/time.js']), /extra/)
  assert.deepEqual(checkScope(baseline, { ...baseline, 'src/time.js': '2' }, ['src/time.js']), ['src/time.js'])
})
test('rejects broad scopes and stale source or build artifacts', () => {
  assert.throws(() => checkScope({}, {}, ['src/*']), /wildcards/)
  assert.throws(() => assertSame({ 'build/app.js': 'tested' }, { 'build/app.js': 'changed' }, 'Build'), /prepare/)
  assert.throws(() => assertSame({ 'src/app.js': 'tested' }, { 'src/app.js': 'changed' }, 'Source'), /prepare/)
})
