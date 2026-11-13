import { useEffect, useRef, useState } from 'react'
import { announce } from './a11y/liveRegion'
import { getSonification } from './audio/sonification'
import { AppIntro } from './components/AppIntro'
import { AmbientField } from './components/fx/AmbientField'
import { NavRail } from './components/NavRail'
import { elements } from './data/elements'
import { useTransport } from './hooks/useTransport'
import { flash, ripple } from './lib/fx'
import { prefersReducedMotion } from './lib/motion'
import { hashForScreen, screenFromLocation } from './lib/screens'
import type { Screen } from './lib/screens'
import { toggleSelection } from './lib/selection'
import { FunModeScreen } from './screens/FunModeScreen'
import { ObservatoryScreen } from './screens/ObservatoryScreen'
import './App.css'

const FUN_DURATION = 272

function App() {
  const [screen, setScreen] = useState<Screen>(() =>
    screenFromLocation(window.location.hash, window.location.search),
  )
  const [intro, setIntro] = useState(() => !prefersReducedMotion())
  const [volume, setVolume] = useState(0.6)
  const [selectedIds, setSelectedIds] = useState<string[]>(['chlorophyll', 'aerosols', 'sst'])
  const [shake, setShake] = useState(0)
  const [announcement, setAnnouncement] = useState('')
  const [cairoPlaying, setCairoPlaying] = useState(false)

  const fun = useTransport(FUN_DURATION)
  const audio = getSonification()
  const selected = elements.filter((element) => selectedIds.includes(element.id))
  const activePlaying = screen === 'fun' ? fun.playing : cairoPlaying

  const pauseFun = fun.pause

  useEffect(() => {
    document.title = 'Earth Jukebox — Hear the planet differently'
    const onAnnounce = (event: Event) =>
      setAnnouncement((event as CustomEvent<string>).detail)
    const onPlaying = (event: Event) => setCairoPlaying(Boolean((event as CustomEvent<boolean>).detail))
    window.addEventListener('earth-jukebox:announce', onAnnounce)
    window.addEventListener('earth-jukebox:cairo-playing', onPlaying)
    return () => {
      window.removeEventListener('earth-jukebox:announce', onAnnounce)
      window.removeEventListener('earth-jukebox:cairo-playing', onPlaying)
    }
  }, [])

  useEffect(() => {
    const route = () => setScreen(screenFromLocation(window.location.hash, window.location.search))
    window.addEventListener('hashchange', route)
    return () => window.removeEventListener('hashchange', route)
  }, [])

  // Leaving a screen always silences playback so audio never follows the user.
  useEffect(() => {
    pauseFun()
    audio.stop()
    if (screen !== 'observatory') window.dispatchEvent(new Event('earth-jukebox:cairo-stop'))
  }, [screen, pauseFun, audio])

  useEffect(() => {
    audio.setVolume(volume)
  }, [volume, audio])

  function navigate(next: Screen) {
    if (next === screen) return
    const hash = hashForScreen(next)
    pauseFun()
    audio.stop()
    window.dispatchEvent(new Event('earth-jukebox:cairo-stop'))
    setScreen(next)
    if (window.location.hash !== hash) window.location.hash = hash
    flash()
    ripple(window.innerWidth / 2, window.innerHeight / 2, '#78B9BC')
    announce(
      next === 'fun'
        ? 'Discovery Mode. Explore the components around Earth.'
        : 'Earth Signals. Observation workspace restored.',
    )
  }

  function playObservation() {
    window.dispatchEvent(new Event('earth-jukebox:cairo-toggle'))
  }

  function restartObservation() {
    window.dispatchEvent(new Event('earth-jukebox:cairo-restart'))
  }

  function playFun() {
    if (selected.length === 0) {
      announce('Select at least one element to listen.')
      return
    }
    if (fun.playing) {
      fun.pause()
      audio.stop()
      announce('Combined sonification paused.')
      return
    }
    audio.start(selected.map((element) => element.voice))
    fun.toggle()
    announce(
      `Combined sonification started with ${selected.length} element${
        selected.length === 1 ? '' : 's'
      }. Prototype generated tone.`,
    )
  }

  function toggleElement(id: string) {
    const element = elements.find((item) => item.id === id)
    if (!element) return
    const wasSelected = selectedIds.includes(id)
    const result = toggleSelection(selectedIds, id)
    if (result.rejected) {
      setShake((current) => current + 1)
      announce('Three elements selected. Remove one to add another.')
      return
    }
    setSelectedIds(result.selected)

    const next = elements.filter((item) => result.selected.includes(item.id))
    if (fun.playing) {
      if (next.length > 0) audio.start(next.map((item) => item.voice))
      else {
        fun.pause()
        audio.stop()
      }
    }

    announce(
      `${element.name} ${wasSelected ? 'removed' : 'selected'}. ${result.selected.length} of 3 elements selected.`,
    )
  }

  function clearElements() {
    fun.pause()
    audio.stop()
    setSelectedIds([])
    announce('All elements cleared. Combined sonification stopped.')
  }

  function changeVolume(value: number) {
    setVolume(value)
  }

  function enterObservatory() {
    setIntro(false)
    flash()
    ripple(window.innerWidth / 2, window.innerHeight / 2, '#78B9BC')
  }

  const keyHandler = useRef<(event: KeyboardEvent) => void>(() => undefined)

  useEffect(() => {
    keyHandler.current = (event) => {
      if (intro) return
      const target = event.target
      if (target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        return
      }
      if (event.key === '1') navigate('observatory')
      if (event.key === '2') navigate('fun')
      if (event.key === ' ' && target === document.body) {
        event.preventDefault()
        if (screen === 'fun') playFun()
        else playObservation()
      }
    }
  })

  useEffect(() => {
    const handler = (event: KeyboardEvent) => keyHandler.current(event)
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <>
      <div className="app-shell">
        <NavRail
          screen={screen}
          playing={activePlaying}
          canListen={screen === 'observatory' || selected.length > 0}
          onNavigate={navigate}
          onListen={screen === 'fun' ? playFun : playObservation}
        />

        <main className="app-main">
          {screen === 'observatory' ? (
            <ObservatoryScreen
              volume={volume}
              onVolume={changeVolume}
              onProbe={announce}
              onRestart={restartObservation}
            />
          ) : (
            <FunModeScreen
              elements={elements}
              selected={selected}
              playing={fun.playing}
              progress={fun.progress}
              duration={FUN_DURATION}
              volume={volume}
              shake={shake}
              onToggleElement={toggleElement}
              onClear={clearElements}
              onVolume={changeVolume}
              onPlayToggle={playFun}
            />
          )}
        </main>
      </div>

      <div className="live-region" role="status" aria-live="polite">
        {announcement}
      </div>

      <AmbientField />
      {intro ? <AppIntro onDone={enterObservatory} /> : null}
    </>
  )
}

export default App
