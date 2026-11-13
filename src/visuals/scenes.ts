import type { EarthLayerId } from '../audio/earthJukebox/config'

export type LayerSelection = Record<EarthLayerId, boolean>
export type SceneMotion = 'orbit' | 'drift' | 'pulse' | 'interference' | 'lightning' | 'lattice' | 'vortex' | 'still'
export type SceneShape = 'ring' | 'grain' | 'spike' | 'ribbon' | 'arc' | 'ember' | 'triad' | 'none'

export interface SceneConfig {
  key: string
  name: string
  layers: readonly EarthLayerId[]
  palette: readonly [string, string, string]
  accent: string
  motion: SceneMotion
  shape: SceneShape
  description: string
  /** Any scene containing NOx is labelled experimental in the UI. */
  experimental: boolean
  combination: boolean
}

const EMPTY: SceneConfig = {
  key: 'empty', name: 'Quiet field', layers: [], palette: ['#08111d', '#101d2d', '#1b2d42'], accent: '#8394ab',
  motion: 'still', shape: 'none', description: 'No layers selected. Turn on a voice to begin.', experimental: false, combination: false,
}
const O3: SceneConfig = {
  key: 'o3', name: 'Ozone Halo', layers: ['o3'], palette: ['#06161d', '#0b2f38', '#124b54'], accent: '#8ff5ff',
  motion: 'orbit', shape: 'ring', description: 'Concentric ozone rings turn with the ozone pitch. Null frames rest the rings into a grey hatch.', experimental: false, combination: false,
}
const PM25: SceneConfig = {
  key: 'pm25', name: 'Particulate Drift', layers: ['pm25'], palette: ['#1b1308', '#35240f', '#4a3015'], accent: '#ffc46b',
  motion: 'drift', shape: 'grain', description: 'A drifting grain field follows particulate level and brightness. Null frames become a hatched cloud.', experimental: false, combination: false,
}
const NOX: SceneConfig = {
  key: 'nox', name: 'Nitrogen Pulse', layers: ['nox'], palette: ['#170b1e', '#2d1338', '#401b4b'], accent: '#ff8ad8',
  motion: 'pulse', shape: 'spike', description: 'Sharp nitrogen pulses fire with the pulse rate. Experimental: night readings are unreliable. Null frames become a grey dashed ring.', experimental: true, combination: false,
}
const O3_PM25: SceneConfig = {
  key: 'o3+pm25', name: 'Halo in Haze', layers: ['o3', 'pm25'], palette: ['#0a1b1c', '#242b1c', '#37341c'], accent: '#a7e3c8',
  motion: 'interference', shape: 'ribbon', description: 'Ozone rings pass through a particulate haze; the crossing bands are an artistic interference pattern, not chemistry.', experimental: false, combination: true,
}
const O3_NOX: SceneConfig = {
  key: 'o3+nox', name: 'Ozone Lightning', layers: ['o3', 'nox'], palette: ['#0a1322', '#241531', '#331c3d'], accent: '#9fe6ff',
  motion: 'lightning', shape: 'arc', description: 'Ozone arcs and nitrogen spikes share a violet-cyan storm field. Experimental: includes nitrogen oxides; artistic rendering only.', experimental: true, combination: true,
}
const PM25_NOX: SceneConfig = {
  key: 'pm25+nox', name: 'Ember Grid', layers: ['pm25', 'nox'], palette: ['#1b0f15', '#341b1a', '#45221e'], accent: '#ffb070',
  motion: 'lattice', shape: 'ember', description: 'Particulate grains settle into a hot lattice while nitrogen pulses travel the grid. Experimental: includes nitrogen oxides; artistic rendering only.', experimental: true, combination: true,
}
const ALL: SceneConfig = {
  key: 'o3+pm25+nox', name: 'Triad Vortex', layers: ['o3', 'pm25', 'nox'], palette: ['#091421', '#251a2e', '#332238'], accent: '#f6d08a',
  motion: 'vortex', shape: 'triad', description: 'All three voices share a slow vortex: rings, grains and pulses braid together. Experimental: includes nitrogen oxides; artistic rendering only.', experimental: true, combination: true,
}

export const sceneTable: readonly SceneConfig[] = [EMPTY, O3, PM25, NOX, O3_PM25, O3_NOX, PM25_NOX, ALL]
const sceneByKey = new Map(sceneTable.map((scene) => [scene.key, scene]))

export function selectionKey(selection: LayerSelection): string {
  const layers = (['o3', 'pm25', 'nox'] as const).filter((layer) => selection[layer])
  return layers.length === 0 ? 'empty' : layers.join('+')
}

export function sceneForSelection(selection: LayerSelection): SceneConfig {
  return sceneByKey.get(selectionKey(selection)) ?? EMPTY
}

/** Reduced motion switches the stage to a static frame; otherwise motion follows the playhead. */
export function motionPolicy(reducedMotion: boolean): 'static' | 'live' {
  return reducedMotion ? 'static' : 'live'
}
