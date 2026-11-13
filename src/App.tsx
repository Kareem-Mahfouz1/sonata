import { useEffect, useRef, useState } from 'react'
import * as Tone from 'tone'
import i18next from 'i18next'
import { announce } from './a11y/liveRegion'
import { useTranslations } from './app/AppShell'
import { Legend } from './components/Legend'
import { MapCanvas } from './components/MapCanvas'
import { ModeSwitch } from './components/ModeSwitch'
import { Player } from './components/Player'
import { VoiceToggles } from './components/VoiceToggles'
import type { AudioMode } from './audio/presets/types'
import './App.css'

function App() {
  const [language, setLanguage] = useState<'en' | 'ar'>('en')
  const [mode, setMode] = useState<AudioMode>('scientific')
  const [isPlaying, setIsPlaying] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const { ready, version } = useTranslations(language)
  const synth = useRef<Tone.Synth | null>(null)
  const t = (key: string) => i18next.t(key)

  useEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
  }, [language])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space' && event.target instanceof HTMLElement && event.target.tagName !== 'BUTTON') {
        event.preventDefault()
        void togglePlayback()
      }
      if (event.key.toLowerCase() === 'm' && event.target === document.body) {
        setMode((current) => current === 'scientific' ? 'fun' : 'scientific')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  })

  useEffect(() => {
    const handleAnnouncement = (event: Event) => setAnnouncement((event as CustomEvent<string>).detail)
    window.addEventListener('earth-jukebox:announce', handleAnnouncement)
    return () => window.removeEventListener('earth-jukebox:announce', handleAnnouncement)
  }, [])

  void version

  async function togglePlayback() {
    if (isPlaying) {
      synth.current?.triggerRelease()
      setIsPlaying(false)
      announce(t('paused'))
      return
    }

    await Tone.start()
    synth.current ??= new Tone.Synth().toDestination()
    synth.current.triggerAttackRelease('C4', '8n')
    setIsPlaying(true)
    announce(t('playing'))
    window.setTimeout(() => setIsPlaying(false), 500)
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label={t('appName')}><span className="brand-dot" aria-hidden="true" />{t('appName')}</a>
        <div className="topbar-controls">
          <div className="language-switch" aria-label="Language">
            <button type="button" className={language === 'en' ? 'is-selected' : ''} aria-pressed={language === 'en'} onClick={() => setLanguage('en')}>EN</button>
            <button type="button" className={language === 'ar' ? 'is-selected' : ''} aria-pressed={language === 'ar'} onClick={() => setLanguage('ar')}>ع</button>
          </div>
          <span className="status"><span className="status-dot" aria-hidden="true" />{ready ? t('ready') : '...'}</span>
        </div>
      </header>

      <section className="hero" aria-labelledby="page-title">
        <div className="hero-copy">
          <p className="eyebrow">{t('eyebrow')}</p>
          <h1 id="page-title">{t('title')}</h1>
          <p className="description">{t('description')}</p>
          <div className="hero-actions"><ModeSwitch mode={mode} onChange={(nextMode) => { setMode(nextMode); announce(nextMode === 'fun' ? t('artisticInterpretation') : t('scientific')) }} labels={{ scientific: t('scientific'), fun: t('fun') }} /><Player isPlaying={isPlaying} onToggle={() => void togglePlayback()} label={isPlaying ? t('pause') : t('play')} /></div>
        </div>
        <div className="hero-index" aria-hidden="true"><span>01</span><span className="index-line" /><span>EARTH / SOUND</span></div>
      </section>

      <section className="workspace" aria-label="Sonification workspace">
        <MapCanvas />
        <aside className="sidebar"><Legend title={t('legend')} emptyLabel={t('legendEmpty')} /><VoiceToggles emptyLabel={t('voicesEmpty')} /></aside>
      </section>
      <div className="live-region" role="status" aria-live="polite">{announcement}</div>
    </main>
  )
}

export default App
