import { useState } from 'react'
import { AirQualityMap, type MapPoint } from '../components/observatory/AirQualityMap'
import { CairoSonification } from '../components/observatory/CairoSonification'

interface ObservatoryScreenProps {
  volume: number
  onVolume: (value: number) => void
  onProbe: (message: string) => void
  onRestart: () => void
}

export function ObservatoryScreen({ volume, onVolume, onProbe, onRestart }: ObservatoryScreenProps) {
  const [point, setPoint] = useState<MapPoint>({ lat: 30.04, lon: 31.24, label: 'Cairo' })
  const [frame, setFrame] = useState(0)
  const [playRequest, setPlayRequest] = useState(0)
  function choosePoint(next: MapPoint) {
    setPoint(next)
    setPlayRequest((value) => value + 1)
  }
  return (
    <section className="screen observatory map-screen" aria-label="Air quality map and sonification">
      <div className="map-workspace">
        <AirQualityMap frame={frame} point={point} onPoint={choosePoint} onAnnounce={onProbe} />
        <CairoSonification point={point} onPoint={choosePoint} onFrame={setFrame} playRequest={playRequest} onAnnounce={onProbe}
          volume={volume} onVolume={onVolume} onRestart={onRestart} />
      </div>
    </section>
  )
}
