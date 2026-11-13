export interface VoiceFeatures {
  value: number
  normalizedValue: number
  metric: string
}

export interface Voice {
  id: string
  layerId: string
  label: string
  start(ctx: BaseAudioContext): void
  update(features: VoiceFeatures, time: number): void
  setMuted(muted: boolean): void
  setSolo(solo: boolean): void
  setVolume(volume: number): void
  dispose(): void
}
