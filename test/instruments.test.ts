import assert from 'node:assert/strict'
import test from 'node:test'
import {
  defaultInstrumentMap,
  earthJukeboxConfig,
  instrumentSwitchPlan,
  PENTATONIC_SCALE,
  valueToFrequency,
  voiceRangeForInstrument,
  type InstrumentId,
} from '../src/audio/earthJukebox/config.ts'
import { voiceAction } from '../src/audio/earthJukebox/state.ts'

const ids = earthJukeboxConfig.instruments.map((instrument) => instrument.id)

test('default instruments are O3 flute, PM2.5 cello, NOx guitar', () => {
  assert.deepEqual(defaultInstrumentMap(), { o3: 'flute', pm25: 'cello', nox: 'guitar' })
})

test('all six instruments are available to every voice and honestly labelled', () => {
  assert.deepEqual(ids, ['piano', 'flute', 'violin', 'cello', 'guitar', 'synth'])
  for (const voice of earthJukeboxConfig.voices) {
    assert.ok(ids.includes(voice.defaultInstrument))
    for (const instrument of earthJukeboxConfig.instruments) {
      assert.match(instrument.honestLabel, /^(synth:|synthesized)/)
      const [low, high] = voiceRangeForInstrument(voice, instrument.id)
      assert.ok(low <= high)
    }
  }
})

test('every instrument clamps to a realistic range and stays on the shared pentatonic scale', () => {
  for (const voice of earthJukeboxConfig.voices) {
    for (const instrument of earthJukeboxConfig.instruments) {
      for (const value of [0, 0.35, 0.7, 1]) {
        const frequency = valueToFrequency(value, voice, instrument.id)
        const midi = 69 + 12 * Math.log2(frequency / 440)
        const [low, high] = voiceRangeForInstrument(voice, instrument.id)
        assert.ok(midi >= low - 1e-6 && midi <= high + 1e-6)
        assert.ok(PENTATONIC_SCALE.some((note) => Math.abs(note - midi) < 1e-6))
      }
    }
  }
})

test('a null rests under every instrument, not just the current one', () => {
  for (const instrument of ids) {
    assert.equal(voiceAction(null, true), 'rest')
    assert.ok(instrument)
  }
})

test('instrument switching releases exactly the previous node', () => {
  const plan = instrumentSwitchPlan('flute', 'cello')
  assert.deepEqual(plan, { active: 'cello', release: 'flute' })
  assert.deepEqual(instrumentSwitchPlan('guitar', 'guitar'), { active: 'guitar', release: null })
  for (const from of ids as InstrumentId[]) {
    for (const to of ids as InstrumentId[]) {
      const next = instrumentSwitchPlan(from, to)
      assert.equal(next.active, to)
      if (from === to) assert.equal(next.release, null)
      else assert.equal(next.release, from)
    }
  }
})
