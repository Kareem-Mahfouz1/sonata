export type AudioMode = 'scientific' | 'fun'

export interface Preset {
  id: string
  mode: AudioMode
  voiceStyles: Record<string, string>
}
