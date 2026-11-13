export async function renderWav(): Promise<Blob> {
  // TODO: delegate to Tone.Offline and encode the rendered buffer as WAV.
  return new Blob([], { type: 'audio/wav' })
}
