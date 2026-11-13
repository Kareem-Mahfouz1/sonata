import * as Tone from 'tone'
import type { SeriesResult } from '../../data/airQuality/types.ts'
import {
  curveValue,
  earthJukeboxConfig,
  normalizedToGain,
  valueToFrequency,
  type EarthLayerId,
  type VoiceConfig,
} from './config'

/**
 * Audio reads SeriesResult.values only. A null immediately rests the voice;
 * parameter glides may join valid neighbours in the engine, but data remain
 * unfilled. Tone is imported only after a user play gesture creates this engine.
 */
export type StateListener = (states: Record<EarthLayerId, number | null>) => void

interface VoiceNode {
  config: VoiceConfig
  gain: Tone.Gain
  active: boolean
  set(value: number): void
  rest(): void
  dispose(): void
}

function createLead(config: VoiceConfig): VoiceNode {
  const gain = new Tone.Gain(0).toDestination()
  const synth = new Tone.Oscillator({ type: config.instrument, frequency: 220 }).connect(gain).start()
  let active = false
  return {
    config, gain,
    get active() { return active },
    set(value) {
      synth.frequency.rampTo(valueToFrequency(value, config), 0.08)
      gain.gain.rampTo(normalizedToGain(value, config.gain), 0.08)
      active = true
    },
    rest() { gain.gain.rampTo(0, config.fade); active = false },
    dispose() { synth.stop().dispose(); gain.dispose() },
  } as VoiceNode
}

function createPad(config: VoiceConfig): VoiceNode {
  const gain = new Tone.Gain(0).toDestination()
  const filter = new Tone.Filter({ type: 'lowpass', frequency: 300, rolloff: -24 }).connect(gain)
  const synth = new Tone.Oscillator({ type: config.instrument, frequency: 110 }).connect(filter).start()
  const noise = new Tone.Noise('pink').connect(filter).start()
  const mix = new Tone.Gain(0.1).connect(filter)
  synth.disconnect(); synth.connect(mix)
  let active = false
  return {
    config, gain,
    get active() { return active },
    set(value) {
      synth.frequency.rampTo(valueToFrequency(value, config), 0.2)
      filter.frequency.rampTo(curveValue(value, config.brightness ?? [240, 3800, 1.4]), 0.2)
      mix.gain.rampTo(curveValue(value, config.noiseMix ?? [0.08, 0.72, 1]), 0.2)
      gain.gain.rampTo(normalizedToGain(value, config.gain), 0.2)
      active = true
    },
    rest() { gain.gain.rampTo(0, config.fade); active = false },
    dispose() { synth.stop().dispose(); noise.stop().dispose(); mix.dispose(); filter.dispose(); gain.dispose() },
  } as VoiceNode
}

function createPulse(config: VoiceConfig): VoiceNode {
  const gain = new Tone.Gain(1).toDestination()
  const synth = new Tone.Synth({ oscillator: { type: config.instrument }, envelope: { attack: 0.004, decay: config.pulseLength ?? 0.08, sustain: 0, release: 0.04 } }).connect(gain)
  let rate = 1
  let timer: ReturnType<typeof setInterval> | undefined
  let value = 0
  let active = false
  const schedule = () => {
    if (timer) clearInterval(timer)
    timer = setInterval(() => {
      if (!active) return
      synth.triggerAttackRelease(valueToFrequency(value, config), config.pulseLength ?? 0.08, Tone.now(), normalizedToGain(value, config.gain) * 2)
    }, 1000 / Math.max(0.05, rate))
  }
  schedule()
  return {
    config, gain,
    get active() { return active },
    set(next) {
      value = next
      rate = curveValue(next, config.pulseRate ?? [0.45, 3.6, 1])
      if (!active) { active = true; schedule() }
      schedule()
    },
    rest() { active = false; if (timer) clearInterval(timer); timer = undefined },
    dispose() { if (timer) clearInterval(timer); synth.dispose(); gain.dispose() },
  } as VoiceNode
}

export interface CairoAudio {
  play(): Promise<void>
  pause(): void
  seek(frame: number): void
  setEnabled(layer: EarthLayerId, enabled: boolean): void
  setVolume(volume: number): void
  frame(): number
  states(): Record<EarthLayerId, number | null>
  subscribe(listener: StateListener): () => void
  dispose(): void
}

export async function createAudio(seriesByLayer: Partial<Record<EarthLayerId, SeriesResult>>): Promise<CairoAudio> {
  await Tone.start()
  const config = earthJukeboxConfig
  const voices = config.voices.filter((voice) => seriesByLayer[voice.id])
  if (voices.length === 0) throw new Error('No sonification series available')
  const total = seriesByLayer[voices[0].id]!.values.length
  const nodes = new Map<EarthLayerId, VoiceNode>()
  for (const voice of voices) {
    nodes.set(voice.id, voice.voice === 'lead' ? createLead(voice) : voice.voice === 'pad' ? createPad(voice) : createPulse(voice))
  }
  const enabled = new Map<EarthLayerId, boolean>(voices.map((voice) => [voice.id, voice.enabledByDefault]))
  const listeners = new Set<StateListener>()
  let frame = 0
  const states = (): Record<EarthLayerId, number | null> => Object.fromEntries(
    voices.map((voice) => [voice.id, seriesByLayer[voice.id]?.values[frame] ?? null]),
  ) as Record<EarthLayerId, number | null>

  const apply = () => {
    const current = states()
    voices.forEach((voice) => {
      const node = nodes.get(voice.id)!
      const value = seriesByLayer[voice.id]?.values[frame] ?? null
      if (!enabled.get(voice.id) || value === null) node.rest()
      else node.set(value)
    })
    for (const listener of listeners) listener(current)
  }

  return {
    async play() { apply() },
    pause() { nodes.forEach((node) => node.rest()) },
    seek(nextFrame) { frame = Math.max(0, Math.min(total - 1, Math.floor(nextFrame))); apply() },
    setEnabled(layer, isEnabled) { enabled.set(layer, isEnabled); apply() },
    setVolume(volume) { Tone.getDestination().volume.rampTo(Tone.gainToDb(Math.max(0.0001, volume)), 0.1) },
    frame() { return frame },
    states,
    subscribe(listener) { listeners.add(listener); listener(states()); return () => { listeners.delete(listener) } },
    dispose() {
      listeners.clear(); nodes.forEach((node) => node.dispose())
    },
  }
}
