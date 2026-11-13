import * as Tone from 'tone'
import type { SeriesResult } from '../../data/airQuality/types.ts'
import {
  curveValue,
  defaultInstrumentMap,
  earthJukeboxConfig,
  instrumentConfig,
  instrumentSwitchPlan,
  normalizedToGain,
  valueToFrequency,
  type EarthLayerId,
  type InstrumentMap,
  type InstrumentId,
  type VoiceConfig,
} from './config'

/**
 * Audio reads SeriesResult.values only. A null immediately rests the voice;
 * parameter glides may join valid neighbours in the engine, but data remain
 * unfilled. Tone is imported only after a user play gesture creates this engine.
 *
 * Every voice owns one node per instrument and crossfades between them. That
 * keeps instrument changes click-free and guarantees the old node is released.
 */
export type StateListener = (states: Record<EarthLayerId, number | null>) => void

interface InstrumentNode {
  set(value: number): void
  rest(): void
  dispose(): void
}

function rateFor(value: number, voice: VoiceConfig): number {
  if (voice.pulseRate) return curveValue(value, voice.pulseRate)
  if (voice.pluckRate) return curveValue(value, voice.pluckRate)
  return 1.2
}

function envelopeFor(instrumentId: InstrumentId): { attack: number; decay: number; sustain: number; release: number } {
  if (instrumentId === 'violin') return { attack: 0.12, decay: 0.2, sustain: 0.9, release: 0.5 }
  if (instrumentId === 'cello') return { attack: 0.18, decay: 0.25, sustain: 0.9, release: 0.7 }
  if (instrumentId === 'flute') return { attack: 0.07, decay: 0.12, sustain: 0.8, release: 0.4 }
  return { attack: 0.03, decay: 0.15, sustain: 0.7, release: 0.35 }
}

function createInstrumentNode(voice: VoiceConfig, instrumentId: InstrumentId, output: Tone.Gain): InstrumentNode {
  const instrument = instrumentConfig(instrumentId)
  const gain = new Tone.Gain(0).connect(output)
  const filter = instrument.kind === 'sustained'
    ? new Tone.Filter({ type: 'lowpass', frequency: 1800, rolloff: -12 }).connect(gain)
    : null
  let mono: Tone.Synth | undefined
  let fm: Tone.FMSynth | undefined
  let pluck: Tone.PluckSynth | undefined
  let held = false
  let active = false
  let currentValue = 0
  let timer: ReturnType<typeof setTimeout> | undefined

  if (instrumentId === 'guitar') {
    pluck = new Tone.PluckSynth({ attackNoise: 1, dampening: 3600, resonance: 0.72, release: 0.9 }).connect(gain)
  } else if (instrumentId === 'piano') {
    fm = new Tone.FMSynth({
      harmonicity: 3,
      modulationIndex: 9,
      oscillator: { type: 'sine' },
      modulation: { type: 'sine' },
      envelope: { attack: 0.006, decay: 1.3, sustain: 0, release: 1.4 },
      modulationEnvelope: { attack: 0.006, decay: 0.35, sustain: 0, release: 0.35 },
    }).connect(gain)
    fm.volume.value = -9
  } else {
    mono = new Tone.Synth({ oscillator: { type: instrument.waveform }, envelope: envelopeFor(instrumentId) }).connect(filter ?? gain)
    mono.volume.value = instrumentId === 'cello' ? -8 : -10
  }

  const velocity = () => Math.min(0.95, normalizedToGain(currentValue, voice.gain) * instrument.level * 3)
  const frequency = () => valueToFrequency(currentValue, voice, instrumentId)

  function triggerOnce() {
    if (!active) return
    const note = frequency()
    const level = velocity()
    if (pluck) {
      gain.gain.rampTo(Math.min(1, level * 1.4), 0.02)
      pluck.triggerAttack(note, Tone.now())
    } else if (fm) {
      gain.gain.rampTo(1, 0.02)
      fm.triggerAttackRelease(note, instrumentId === 'piano' ? 1.2 : 0.18, Tone.now(), level)
    } else if (mono) {
      gain.gain.rampTo(1, 0.02)
      mono.triggerAttackRelease(note, voice.pulseLength ?? 0.14, Tone.now(), level)
    }
  }

  function loop() {
    if (!active) return
    triggerOnce()
    timer = setTimeout(loop, 1000 / Math.max(0.05, rateFor(currentValue, voice)))
  }

  function startLoop() {
    if (timer) return
    loop()
  }

  return {
    set(value) {
      currentValue = value
      active = true
      const level = velocity()
      if (instrument.kind === 'plucked' || voice.voice === 'pulse') {
        if (instrument.kind === 'plucked') gain.gain.rampTo(Math.min(1, level * 1.4), voice.fade)
        else gain.gain.rampTo(1, voice.fade)
        startLoop()
        return
      }
      const note = frequency()
      if (mono) {
        if (!held) {
          mono.triggerAttack(note, Tone.now(), level)
          held = true
        } else {
          mono.frequency.rampTo(note, 0.08)
        }
        if (filter && voice.brightness) filter.frequency.rampTo(curveValue(value, voice.brightness), 0.15)
      }
      gain.gain.rampTo(Math.min(1, level * 1.6), 0.08)
    },
    rest() {
      active = false
      if (timer) { clearTimeout(timer); timer = undefined }
      if (held && mono) { mono.triggerRelease(); held = false }
      if (fm) fm.triggerRelease()
      if (pluck) pluck.triggerRelease()
      gain.gain.rampTo(0, voice.fade)
    },
    dispose() {
      active = false
      if (timer) clearTimeout(timer)
      mono?.dispose()
      fm?.dispose()
      pluck?.dispose()
      filter?.dispose()
      gain.dispose()
    },
  }
}

interface LayerVoice {
  setValue(value: number | null): void
  setEnabled(enabled: boolean): void
  setInstrument(instrument: InstrumentId): void
  setPlaying(playing: boolean): void
  dispose(): void
}

function createLayerVoice(voice: VoiceConfig, instrument: InstrumentId): LayerVoice {
  const output = new Tone.Gain(0).toDestination()
  const nodes = new Map<InstrumentId, InstrumentNode>()
  for (const definition of earthJukeboxConfig.instruments) {
    nodes.set(definition.id, createInstrumentNode(voice, definition.id, output))
  }
  let activeInstrument = instrument
  let value: number | null = null
  let enabled = voice.enabledByDefault
  let playing = false

  // PM2.5 keeps a quiet texture bed so its particulate identity survives instrument swaps.
  let textureGain: Tone.Gain | undefined
  let texture: Tone.Noise | undefined
  if (voice.id === 'pm25') {
    const textureFilter = new Tone.Filter({ type: 'lowpass', frequency: 850 }).connect(output)
    textureGain = new Tone.Gain(0).connect(textureFilter)
    texture = new Tone.Noise('pink').connect(textureGain).start()
  }

  const apply = () => {
    const audible = playing && enabled && value !== null
    output.gain.rampTo(audible ? 1 : 0, voice.fade)
    nodes.forEach((node, id) => {
      if (audible && id === activeInstrument) node.set(value as number)
      else node.rest()
    })
    textureGain?.gain.rampTo(audible ? 0.012 + (value as number) * 0.035 : 0, 0.2)
  }

  return {
    setValue(next) { value = next; apply() },
    setEnabled(next) { enabled = next; apply() },
    setInstrument(next) {
      if (next === activeInstrument) return
      const plan = instrumentSwitchPlan(activeInstrument, next)
      if (plan.release) nodes.get(plan.release)?.rest()
      activeInstrument = plan.active
      apply()
    },
    setPlaying(next) { playing = next; apply() },
    dispose() {
      nodes.forEach((node) => node.dispose())
      texture?.stop().dispose()
      textureGain?.dispose()
      output.dispose()
    },
  }
}

export interface CairoAudio {
  play(): Promise<void>
  pause(): void
  seek(frame: number): void
  setEnabled(layer: EarthLayerId, enabled: boolean): void
  setInstrument(layer: EarthLayerId, instrument: InstrumentId): void
  instruments(): InstrumentMap
  setVolume(volume: number): void
  frame(): number
  states(): Record<EarthLayerId, number | null>
  subscribe(listener: StateListener): () => void
  dispose(): void
}

export async function createAudio(seriesByLayer: Partial<Record<EarthLayerId, SeriesResult>>): Promise<CairoAudio> {
  await Tone.start()
  const voices = earthJukeboxConfig.voices.filter((voice) => seriesByLayer[voice.id])
  if (voices.length === 0) throw new Error('No sonification series available')
  const total = seriesByLayer[voices[0].id]!.values.length
  const instruments = defaultInstrumentMap()
  const layers = new Map<EarthLayerId, LayerVoice>()
  for (const voice of voices) layers.set(voice.id, createLayerVoice(voice, instruments[voice.id]))
  const listeners = new Set<StateListener>()
  let frame = 0

  const states = (): Record<EarthLayerId, number | null> => Object.fromEntries(
    voices.map((voice) => [voice.id, seriesByLayer[voice.id]?.values[frame] ?? null]),
  ) as Record<EarthLayerId, number | null>

  const apply = () => {
    const current = states()
    voices.forEach((voice) => {
      layers.get(voice.id)!.setValue(current[voice.id] ?? null)
    })
    for (const listener of listeners) listener(current)
  }

  return {
    async play() {
      layers.forEach((layer) => layer.setPlaying(true))
      apply()
    },
    pause() { layers.forEach((layer) => layer.setPlaying(false)) },
    seek(nextFrame) { frame = Math.max(0, Math.min(total - 1, Math.floor(nextFrame))); apply() },
    setEnabled(layer, isEnabled) { layers.get(layer)?.setEnabled(isEnabled); apply() },
    setInstrument(layer, instrument) { instruments[layer] = instrument; layers.get(layer)?.setInstrument(instrument) },
    instruments() { return { ...instruments } },
    setVolume(volume) { Tone.getDestination().volume.rampTo(Tone.gainToDb(Math.max(0.0001, volume)), 0.1) },
    frame() { return frame },
    states,
    subscribe(listener) { listeners.add(listener); listener(states()); return () => { listeners.delete(listener) } },
    dispose() {
      listeners.clear()
      layers.forEach((layer) => layer.dispose())
    },
  }
}
