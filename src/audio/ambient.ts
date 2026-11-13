// shortcut: one generated pad for every sonification, not data-driven audio.
// Replace with the real sonification engine once scientific mappings are approved.
export interface AmbientAudio {
  start: () => void
  stop: () => void
  setVolume: (value: number) => void
  dispose: () => void
}

const BASE_GAIN = 0.1

export function createAmbientAudio(): AmbientAudio {
  let context: AudioContext | undefined
  let master: GainNode | undefined
  let filter: BiquadFilterNode | undefined
  let voices: OscillatorNode[] = []
  let lfo: OscillatorNode | undefined
  let volume = 0.7
  let running = false

  function ensure() {
    if (context) return
    const AudioContextClass = window.AudioContext
    if (!AudioContextClass) return
    context = new AudioContextClass()
    master = context.createGain()
    master.gain.value = 0
    filter = context.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 820
    filter.Q.value = 0.7
    master.connect(filter)
    filter.connect(context.destination)
  }

  function start() {
    ensure()
    if (!context || !master || !filter) return
    if (context.state === 'suspended') void context.resume()
    if (running) return
    running = true

    const now = context.currentTime
    master.gain.cancelScheduledValues(now)
    master.gain.setValueAtTime(master.gain.value, now)
    master.gain.linearRampToValueAtTime(BASE_GAIN * volume, now + 1.6)

    const frequencies = [110, 164.81, 220, 329.63]
    voices = frequencies.map((frequency, index) => {
      const oscillator = context!.createOscillator()
      oscillator.type = index % 2 === 0 ? 'sine' : 'triangle'
      oscillator.frequency.value = frequency
      oscillator.detune.value = index * 5 - 7
      const gain = context!.createGain()
      gain.gain.value = 0.24 / (index + 1)
      oscillator.connect(gain)
      gain.connect(master!)
      oscillator.start()
      return oscillator
    })

    lfo = context.createOscillator()
    lfo.frequency.value = 0.06
    const lfoGain = context.createGain()
    lfoGain.gain.value = 260
    lfo.connect(lfoGain)
    lfoGain.connect(filter.frequency)
    lfo.start()
  }

  function stop() {
    if (!context || !master || !running) return
    running = false
    const now = context.currentTime
    master.gain.cancelScheduledValues(now)
    master.gain.setValueAtTime(master.gain.value, now)
    master.gain.linearRampToValueAtTime(0, now + 0.6)
    const stopping = voices
    voices = []
    lfo?.stop(now + 0.7)
    lfo = undefined
    window.setTimeout(() => stopping.forEach((voice) => voice.stop()), 700)
  }

  function setVolume(value: number) {
    volume = Math.min(1, Math.max(0, value))
    if (!context || !master || !running) return
    master.gain.setTargetAtTime(BASE_GAIN * volume, context.currentTime, 0.15)
  }

  function dispose() {
    stop()
    if (context && context.state !== 'closed') void context.close()
    context = undefined
    master = undefined
    filter = undefined
  }

  return { start, stop, setVolume, dispose }
}
