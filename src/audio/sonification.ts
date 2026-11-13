export interface VoiceSpec {
  frequency: number
  type: OscillatorType
  lfo: number
  depth: number
  gain?: number
}

export interface Sonification {
  start: (specs: VoiceSpec[]) => void
  stop: () => void
  setVolume: (value: number) => void
  level: () => number
  spectrum: () => Uint8Array
}

const MAX_VOLUME = 0.8
const BIN_COUNT = 32

// One generated pad stands in for data sonification. Voice specs are design
// placeholders, so every screen labels the output as prototype audio.
function createSonification(): Sonification {
  let context: AudioContext | undefined
  let analyser: AnalyserNode | undefined
  let master: GainNode | undefined
  let voices: OscillatorNode[] = []
  let volume = 0.6
  let bins = new Uint8Array(BIN_COUNT)

  function ensure(): boolean {
    if (context) return true
    try {
      context = new AudioContext()
      master = context.createGain()
      master.gain.value = 0
      analyser = context.createAnalyser()
      analyser.fftSize = 64
      master.connect(analyser)
      analyser.connect(context.destination)
      return true
    } catch {
      context = undefined
      return false
    }
  }

  function stopVoices(delay: number) {
    const stopping = voices
    voices = []
    window.setTimeout(() => {
      stopping.forEach((node) => {
        try {
          node.stop()
        } catch {
          // Already stopped.
        }
      })
    }, delay)
  }

  function start(specs: VoiceSpec[]) {
    if (!ensure() || !context || !master) return
    if (context.state === 'suspended') void context.resume()
    stopVoices(450)
    const now = context.currentTime
    master.gain.cancelScheduledValues(now)
    master.gain.setValueAtTime(0, now)
    master.gain.linearRampToValueAtTime(MAX_VOLUME * volume, now + 0.7)

    voices = specs.flatMap((spec) => {
      const oscillator = context!.createOscillator()
      const gain = context!.createGain()
      const lfo = context!.createOscillator()
      const depth = context!.createGain()
      const tremolo = context!.createOscillator()
      const tremoloDepth = context!.createGain()

      oscillator.type = spec.type
      oscillator.frequency.value = spec.frequency
      lfo.frequency.value = spec.lfo
      depth.gain.value = spec.depth
      gain.gain.value = spec.gain ?? 0.14
      tremolo.frequency.value = spec.lfo * 0.6
      tremoloDepth.gain.value = gain.gain.value * 0.5

      lfo.connect(depth)
      depth.connect(oscillator.frequency)
      tremolo.connect(tremoloDepth)
      tremoloDepth.connect(gain.gain)
      oscillator.connect(gain)
      gain.connect(master!)

      oscillator.start()
      lfo.start()
      tremolo.start()
      return [oscillator, lfo, tremolo]
    })
  }

  function stop() {
    if (!context || !master) return
    const now = context.currentTime
    master.gain.cancelScheduledValues(now)
    master.gain.setValueAtTime(master.gain.value, now)
    master.gain.linearRampToValueAtTime(0, now + 0.35)
    stopVoices(400)
  }

  function setVolume(value: number) {
    volume = Math.min(1, Math.max(0, value))
    if (!context || !master) return
    master.gain.setTargetAtTime(MAX_VOLUME * volume, context.currentTime, 0.08)
  }

  function level() {
    if (!analyser || voices.length === 0) return 0
    analyser.getByteFrequencyData(bins)
    let total = 0
    for (const value of bins) total += value
    return total / bins.length / 255
  }

  function spectrum() {
    if (!analyser || voices.length === 0) return bins
    analyser.getByteFrequencyData(bins)
    return bins
  }

  return { start, stop, setVolume, level, spectrum }
}

let instance: Sonification | undefined

export function getSonification(): Sonification {
  instance ??= createSonification()
  return instance
}
