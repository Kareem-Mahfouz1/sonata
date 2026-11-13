import type { Preset } from './presets/types'
import type { Voice } from './voices/types'

export interface Engine {
  play(): Promise<void>
  pause(): void
  seek(time: number): void
  registerVoice(voice: Voice): void
  setPreset(preset: Preset): void
  renderOffline(): Promise<Blob>
}

export function createEngine(): Engine {
  let preset: Preset | undefined
  const voices: Voice[] = []

  return {
    async play() {
      // Audio context creation belongs behind the user's play gesture.
    },
    pause() {},
    seek(_time) {},
    registerVoice(voice) {
      voices.push(voice)
    },
    setPreset(nextPreset) {
      preset = nextPreset
      void preset
    },
    async renderOffline() {
      // Offline Tone.js rendering will be added when mappings are specified.
      void voices
      return new Blob([], { type: 'audio/wav' })
    },
  }
}
