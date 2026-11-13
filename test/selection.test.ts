import assert from 'node:assert/strict'
import test from 'node:test'
import { MAX_ELEMENTS, formatTime, ratio, toggleSelection } from '../src/lib/selection.ts'

test('toggleSelection adds, removes and caps at the maximum', () => {
  assert.deepEqual(toggleSelection([], 'a').selected, ['a'])
  assert.deepEqual(toggleSelection(['a'], 'a').selected, [])

  const full = ['a', 'b', 'c']
  const rejected = toggleSelection(full, 'd')
  assert.equal(rejected.rejected, true)
  assert.deepEqual(rejected.selected, full)

  assert.equal(full.length, MAX_ELEMENTS)
})

test('formatTime is mm:ss and never negative', () => {
  assert.equal(formatTime(84), '01:24')
  assert.equal(formatTime(-4), '00:00')
  assert.equal(formatTime(300), '05:00')
  assert.equal(formatTime(9.9), '00:09')
})

test('ratio clamps to the 0..1 range', () => {
  assert.equal(ratio(0.5, 0, 1), 0.5)
  assert.equal(ratio(4, 0, 2), 1)
  assert.equal(ratio(-4, 0, 2), 0)
  assert.equal(ratio(3, 3, 3), 0)
})
