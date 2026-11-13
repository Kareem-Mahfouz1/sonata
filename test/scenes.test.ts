import assert from 'node:assert/strict'
import test from 'node:test'
import { sceneForSelection, sceneTable, selectionKey, motionPolicy, type LayerSelection } from '../src/visuals/scenes.ts'
import type { EarthLayerId } from '../src/audio/earthJukebox/config.ts'

const layers: EarthLayerId[] = ['o3', 'pm25', 'nox']
const states: LayerSelection[] = []
for (let mask = 0; mask < 8; mask += 1) {
  states.push({ o3: Boolean(mask & 1), pm25: Boolean(mask & 2), nox: Boolean(mask & 4) })
}

test('scene table covers every one of the eight selection states', () => {
  assert.equal(sceneTable.length, 8)
  assert.equal(new Set(sceneTable.map((scene) => scene.key)).size, 8)
  assert.equal(new Set(sceneTable.map((scene) => scene.name)).size, 8)
  for (const selection of states) {
    const scene = sceneForSelection(selection)
    assert.equal(scene.key, selectionKey(selection))
    assert.deepEqual([...scene.layers], layers.filter((layer) => selection[layer]))
    assert.equal(scene.experimental, selection.nox)
    assert.equal(scene.combination, scene.layers.length > 1)
  }
})

test('each combination has its own deliberate scene identity', () => {
  const singles = sceneTable.filter((scene) => scene.layers.length === 1)
  assert.equal(new Set(singles.map((scene) => scene.motion)).size, 3)
  assert.equal(new Set(singles.map((scene) => scene.palette[1])).size, 3)
  const composites = sceneTable.filter((scene) => scene.layers.length > 1)
  assert.equal(new Set(composites.map((scene) => scene.motion)).size, 4)
  for (const scene of composites) assert.match(scene.description, /artistic|chemistry|blend|storm|vortex|hot lattice/i)
})

test('reduced motion chooses the static path and empty selection is safe', () => {
  assert.equal(motionPolicy(true), 'static')
  assert.equal(motionPolicy(false), 'live')
  assert.equal(sceneForSelection({ o3: false, pm25: false, nox: false }).key, 'empty')
})
