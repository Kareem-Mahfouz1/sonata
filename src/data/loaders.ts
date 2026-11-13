import type { LayerData } from './types'

export async function loadLayerData(path: string): Promise<LayerData> {
  // Placeholder for loading bundled static JSON from /public/data.
  const response = await fetch(path)
  return (await response.json()) as LayerData
}
