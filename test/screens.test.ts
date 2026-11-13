import assert from 'node:assert/strict'
import test from 'node:test'
import { hashForScreen, screenFromLocation } from '../src/lib/screens.ts'

test('hash routes both screens', () => {
  assert.equal(screenFromLocation('#fun', ''), 'fun')
  assert.equal(screenFromLocation('#signals', ''), 'observatory')
  assert.equal(screenFromLocation('#observatory', ''), 'observatory')
})

test('unknown hashes fall back to the query string', () => {
  assert.equal(screenFromLocation('', ''), 'observatory')
  assert.equal(screenFromLocation('', '?screen=fun'), 'fun')
  assert.equal(screenFromLocation('#unknown', '?screen=fun'), 'fun')
  assert.equal(screenFromLocation('', '?screen=signals'), 'observatory')
})

test('every screen maps back to a route it can parse', () => {
  for (const screen of ['observatory', 'fun'] as const) {
    assert.equal(screenFromLocation(hashForScreen(screen), ''), screen)
  }
})
