import assert from 'node:assert/strict'
import test from 'node:test'
import { earthJukeboxConfig, normalizedToGain, normalizedToMidi, valueToFrequency } from '../src/audio/earthJukebox/config.ts'
import { describeState, voiceAction } from '../src/audio/earthJukebox/state.ts'
import { cairoPresetsData } from '../src/data/airQuality/cairoPresets.ts'

test('null fades a voice out and never carries the prior value', () => {
  assert.equal(voiceAction(0.7, true), 'set')
  assert.equal(voiceAction(null, true), 'rest')
  assert.equal(voiceAction(null, false), 'rest')
})

test('Cairo preset contains genuine nulls rather than interpolated values', () => {
  for (const layer of ['o3', 'pm25', 'nox'] as const) {
    const preset = cairoPresetsData[layer]
    assert.ok(preset.flags.every((flag, index) => (flag !== 0) === (preset.values[index] === null)))
  }
  assert.equal(describeState({ o3: null, pm25: 0.2, nox: null }).includes('no reliable reading'), true)
})

test('mapping config is the only source of voice defaults', () => {
  assert.deepEqual(earthJukeboxConfig.voices.map((voice) => voice.voice), ['lead', 'pad', 'pulse'])
  assert.equal(earthJukeboxConfig.voices.every((voice) => voice.scale.length > 0), true)
  assert.equal(earthJukeboxConfig.preset.id, 'cairo')
})

test('normalization and pitch stay within the full-range bounds', () => {
  for (const value of [-1, 0, 0.5, 1, 2]) {
    const gain = normalizedToGain(value, [0.03, 0.2, 1])
    assert.ok(gain >= 0.03 && gain <= 0.2)
    for (const voice of earthJukeboxConfig.voices) {
      const midi = normalizedToMidi(value, voice.pitchRange)
      assert.ok(midi >= voice.pitchRange[0] && midi <= voice.pitchRange[1])
      assert.ok(Number.isFinite(valueToFrequency(value, voice)))
    }
  }
})
