import { useEffect, useRef, useState } from 'react'
import { announce } from './a11y/liveRegion'
import { createAmbientAudio } from './audio/ambient'
import type { AmbientAudio } from './audio/ambient'
import { elements } from './data/elements'
import { findObservation, observations } from './data/observations'
import type { ExplorationMode } from './data/observations'
import { useTransport } from './hooks/useTransport'
import { toggleSelection } from './lib/selection'
import type { Screen } from './lib/screens'
import { NavRail } from './components/NavRail'
import { ObservatoryScreen } from './screens/ObservatoryScreen'
import { FunModeScreen } from './screens/FunModeScreen'
import './App.css'

function initialScreen(): Screen {
  return new URLSearchParams(window.location.search).get('screen') === 'fun' ? 'fun' : 'observatory'
}

function App() {
  const [screen, setScreen] = useState<Screen>(initialScreen)
  const [datasetId, setDatasetId] = useState(observations[0].id)
  const [mode, setMode] = useState<ExplorationMode>('scan')
  const [velocity, setVelocity] = useState(1.2)
  const [volume, setVolume] = useState(0.7)
  const [selectedIds, setSelectedIds] = useState<string[]>(['chlorophyll', 'aerosols', 'sst'])
  const [announcement, setAnnouncement] = useState('')

  const dataset = findObservation(datasetId)
  const observatory = useTransport(dataset.duration, 84)
  const fun = useTransport(180, 84)
  const active = screen === 'observatory' ? observatory : fun
  const selectedElements = selectedIds
    .map((id) => elements.find((element) => element.id === id))
    .filter((element) => element !== undefined)

  const audio = useRef<AmbientAudio | null>(null)
  const getAudio = () => {
    audio.current ??= createAmbientAudio()
    return audio.current
  }

  useEffect(() => {
    document.title = 'Earth Jukebox — Hear the planet differently'
    const handleAnnouncement = (event: Event) =>
      setAnnouncement((event as CustomEvent<string>).detail)
    window.addEventListener('earth-jukebox:announce', handleAnnouncement)
    return () => window.removeEventListener('earth-jukebox:announce', handleAnnouncement)
  }, [])

  useEffect(() => {
    const ambient = getAudio()
    if (active.playing) ambient.start()
    else ambient.stop()
  }, [active.playing, screen])

  useEffect(() => {
    getAudio().setVolume(volume)
  }, [volume])

  useEffect(() => {
    return () => audio.current?.dispose()
  }, [])

  function navigate(next: Screen) {
    if (next === screen) return
    observatory.pause()
    fun.pause()
    setScreen(next)
    announce(
      next === 'fun'
        ? 'Discovery Mode. Explore the components around Earth.'
        : 'Earth Signals. Observation workspace restored.',
    )
  }

  function changeDataset(id: string) {
    const next = findObservation(id)
    observatory.pause()
    observatory.seek(0)
    setDatasetId(id)
    announce(`${next.name} loaded. Placeholder observation for the design prototype.`)
  }

  function toggleObservatory() {
    const next = !observatory.playing
    observatory.toggle()
    announce(
      next ? 'Playback started. Prototype audio, not data sonification.' : 'Playback paused.',
    )
  }

  function toggleFun() {
    if (selectedIds.length === 0) {
      announce('Select at least one element to listen.')
      return
    }
    const next = !fun.playing
    fun.toggle()
    announce(
      next
        ? `Combined sonification started with ${selectedIds.length} elements. Prototype generated tone.`
        : 'Combined sonification paused.',
    )
  }

  function toggleElement(id: string) {
    const element = elements.find((item) => item.id === id)
    if (!element) return
    const wasSelected = selectedIds.includes(id)
    const result = toggleSelection(selectedIds, id)
    if (result.rejected) {
      announce('Three elements selected. Remove one to add another.')
      return
    }
    setSelectedIds(result.selected)
    if (wasSelected && result.selected.length === 0) fun.pause()
    announce(
      `${element.name} ${wasSelected ? 'removed' : 'selected'}. ${result.selected.length} of 3 elements selected.`,
    )
  }

  function clearElements() {
    fun.pause()
    setSelectedIds([])
    announce('All elements cleared. Combined sonification stopped.')
  }

  function changeVolume(value: number) {
    setVolume(value)
    announce(value === 0 ? 'Muted.' : `Volume ${Math.round(value * 100)} percent.`)
  }

  return (
    <div className="app">
      <NavRail
        screen={screen}
        playing={active.playing}
        canListen={screen === 'observatory' || selectedIds.length > 0}
        onNavigate={navigate}
        onListen={screen === 'fun' ? toggleFun : toggleObservatory}
      />

      {screen === 'observatory' ? (
        <ObservatoryScreen
          datasets={observations}
          dataset={dataset}
          mode={mode}
          velocity={velocity}
          transport={observatory}
          volume={volume}
          onDataset={changeDataset}
          onMode={(next) => {
            setMode(next)
            announce(`${next} mode selected.`)
          }}
          onVelocity={setVelocity}
          onVolume={changeVolume}
          onPlayToggle={toggleObservatory}
          onRestart={() => {
            observatory.restart()
            announce('Playback restarted. Prototype audio.')
          }}
        />
      ) : (
        <FunModeScreen
          elements={elements}
          selected={selectedElements}
          transport={fun}
          duration={180}
          volume={volume}
          onToggleElement={toggleElement}
          onClear={clearElements}
          onVolume={changeVolume}
          onPlayToggle={toggleFun}
          onRestart={() => {
            fun.restart()
            announce('Combined sonification restarted.')
          }}
        />
      )}

      <div className="live-region" role="status" aria-live="polite">
        {announcement}
      </div>
    </div>
  )
}

export default App
