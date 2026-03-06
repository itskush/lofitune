import { useState, useEffect, useRef, useCallback } from 'react'
import './App.css'

const STATIONS = [
  { id: 1,  name: 'LOFI GIRL',    freq: '88.3',  videoId: 'jfKfPfyJRdk', genre: 'Study Beats',    color: '#FF8C42' },
  { id: 2,  name: 'CHILLHOP',     freq: '91.5',  videoId: '5ygDXp9j-0I', genre: 'Chill Hop',      color: '#4ECDC4' },
  { id: 3,  name: 'SYNTHWAVE',    freq: '94.7',  videoId: '4xDzrJKXOOY', genre: 'Retrowave',      color: '#C77DFF' },
  { id: 4,  name: 'JAZZ CAFE',    freq: '98.1',  videoId: 'Dx5qFachd3A', genre: 'Jazz Hop',       color: '#06D6A0' },
  { id: 5,  name: 'MIDNIGHT FM',  freq: '102.4', videoId: 'n61ULEU7CO0', genre: 'Dark Lofi',      color: '#EF476F' },
  { id: 6,  name: 'COFFEE SHOP',  freq: '105.9', videoId: 'lTRiuFIWV54', genre: 'Acoustic',       color: '#FFD166' },
  { id: 7,  name: 'TOKYO NIGHTS', freq: '107.1', videoId: 'sViEbUJGEe0', genre: 'Japanese Lofi',  color: '#FF6B9D' },
  { id: 8,  name: 'RAINY DAY',    freq: '89.7',  videoId: 'yIQd2Ya0Ziw', genre: 'Ambient Rain',   color: '#74B9FF' },
  { id: 9,  name: 'PIANO BAR',    freq: '93.3',  videoId: 'q76bMs-NwRk', genre: 'Slow Piano',     color: '#FDCB6E' },
  { id: 10, name: 'SPACE LOFI',   freq: '96.9',  videoId: 'F9L4q-0Pi4E', genre: 'Dreamy',         color: '#A29BFE' },
  { id: 11, name: 'SOUL & R&B',   freq: '99.5',  videoId: 'UedTcufyrHc', genre: 'Neo Soul',       color: '#E17055' },
  { id: 12, name: 'NATURE FM',    freq: '101.3', videoId: 'eKFTSSKCzWA', genre: 'Forest Ambient', color: '#55EFC4' },
]

const NUM_BARS = 52

// ── Starfield — warp cockpit view ────────────────────────────────────────────
function StarField() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let W = window.innerWidth
    let H = window.innerHeight
    canvas.width  = W
    canvas.height = H

    const resize = () => {
      W = window.innerWidth
      H = window.innerHeight
      canvas.width  = W
      canvas.height = H
      // reset star positions to new bounds
      stars.forEach(s => resetStar(s, true))
    }
    window.addEventListener('resize', resize)

    const ctx = canvas.getContext('2d')
    const NUM_STARS = 320

    const resetStar = (s, spread = false) => {
      // Stars originate near centre and fly outward (parallax warp)
      s.x  = (Math.random() - 0.5) * (spread ? W : W * 0.1)
      s.y  = (Math.random() - 0.5) * (spread ? H : H * 0.1)
      s.z  = spread ? Math.random() * W : W              // depth
      s.pz = s.z
      // colour: mostly white, some cyan/purple
      const r = Math.random()
      s.hue = r < 0.10 ? 195 : r < 0.18 ? 270 : null
    }

    const stars = Array.from({ length: NUM_STARS }, () => {
      const s = {}
      resetStar(s, true)
      return s
    })

    // Slow warp speed (feels like gentle glide through space)
    const SPEED = 2.5
    let animId

    const draw = () => {
      // Fade trail (shorter = longer streaks)
      ctx.fillStyle = 'rgba(2,1,12,0.30)'
      ctx.fillRect(0, 0, W, H)

      const cx = W / 2
      const cy = H / 2

      stars.forEach(s => {
        // Project 3-D → 2-D
        const sx = (s.x / s.z) * W + cx
        const sy = (s.y / s.z) * H + cy
        const px = (s.x / s.pz) * W + cx
        const py = (s.y / s.pz) * H + cy

        s.pz = s.z
        s.z -= SPEED

        if (s.z <= 0 || sx < 0 || sx > W || sy < 0 || sy > H) {
          resetStar(s, false)
          return
        }

        // Size grows as star approaches
        const size = Math.max(0.3, (1 - s.z / W) * 3.5)
        const brightness = 1 - s.z / W

        const color = s.hue != null
          ? `hsla(${s.hue},90%,80%,${brightness})`
          : `rgba(255,255,255,${brightness})`

        // Streak line from previous position
        ctx.strokeStyle = color
        ctx.lineWidth   = size
        ctx.beginPath()
        ctx.moveTo(px, py)
        ctx.lineTo(sx, sy)
        ctx.stroke()

        // Bright dot at tip
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(sx, sy, size * 0.6, 0, Math.PI * 2)
        ctx.fill()
      })

      // Subtle cockpit glow rim at edges
      const rim = ctx.createRadialGradient(cx, cy, H * 0.3, cx, cy, H * 0.9)
      rim.addColorStop(0, 'transparent')
      rim.addColorStop(1, 'rgba(0,30,80,0.18)')
      ctx.fillStyle = rim
      ctx.fillRect(0, 0, W, H)

      animId = requestAnimationFrame(draw)
    }

    draw()
    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={canvasRef} className="starfield" />
}

// ── Retro Visualizer ────────────────────────────────────────────────────────
function RetroVisualizer({ active, color, stationName }) {
  const canvasRef = useRef(null)
  const animRef   = useRef(null)
  const colorRef  = useRef(color)
  const nameRef   = useRef(stationName)

  useEffect(() => { colorRef.current = color },       [color])
  useEffect(() => { nameRef.current  = stationName }, [stationName])

  // All animation state in one ref — zero re-renders
  const sim = useRef({
    bars:          new Float32Array(NUM_BARS).fill(0.02),
    targets:       new Float32Array(NUM_BARS).fill(0.02),
    // Timing
    bpm:           88 + Math.random() * 10,   // 88–98 BPM (lofi range)
    beatCount:     -1,
    halfBeatCount: -1,
    // Per-bar peak holds (those little marker lines that hang briefly)
    peaks:         new Float32Array(NUM_BARS).fill(0),
    peakTimers:    new Float32Array(NUM_BARS).fill(0),
  })

  const draw = useCallback((timestamp) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const W = canvas.width
    const H = canvas.height
    const s   = sim.current
    const col = colorRef.current

    // ── Beat-driven target update ─────────────────────────────────────────
    const beatInterval  = 60000 / s.bpm
    const halfInterval  = beatInterval / 2

    const beat     = Math.floor(timestamp / beatInterval)
    const halfBeat = Math.floor(timestamp / halfInterval)
    const beatFrac = (timestamp % beatInterval) / beatInterval  // 0→1 within beat

    // Full beat (kick on every beat of lofi, bass-heavy)
    if (beat !== s.beatCount) {
      s.beatCount = beat
      const beatInBar = beat % 4   // position in 4/4 bar (0,1,2,3)

      // Sub-bass & kick — always on every beat
      for (let i = 0; i < 6;  i++) s.targets[i] = 0.82 + Math.random() * 0.18
      for (let i = 6; i < 12; i++) s.targets[i] = 0.50 + Math.random() * 0.32

      if (beatInBar === 1 || beatInBar === 3) {
        // Snare on beats 2 & 4 — spikes mid range
        for (let i = 12; i < 28; i++) s.targets[i] = 0.38 + Math.random() * 0.42
        // Snare also slightly lifts highs
        for (let i = 40; i < NUM_BARS; i++) s.targets[i] = 0.18 + Math.random() * 0.22
      }

      // Chord/melody stab — random mid bars get a bump each beat
      const numNotes = 2 + Math.floor(Math.random() * 3)
      for (let n = 0; n < numNotes; n++) {
        const barIdx = 18 + Math.floor(Math.random() * 18)
        s.targets[barIdx] = 0.45 + Math.random() * 0.38
      }
    }

    // Hi-hat on every half-beat (off-beats feel natural in lofi)
    if (halfBeat !== s.halfBeatCount) {
      s.halfBeatCount = halfBeat
      for (let i = 42; i < NUM_BARS; i++) {
        s.targets[i] = Math.max(s.targets[i], 0.12 + Math.random() * 0.20)
      }
    }

    // Continuous melodic shimmer in mids (fills gaps between hits)
    const t = timestamp * 0.001
    for (let i = 14; i < 38; i++) {
      const shimmer = Math.abs(Math.sin(i * 0.29 + t * 0.9)) * 0.16
                    + Math.abs(Math.sin(i * 0.61 + t * 1.7)) * 0.10
      s.targets[i] = Math.max(s.targets[i], shimmer)
    }

    // ── Smooth interpolation ─────────────────────────────────────────────
    for (let i = 0; i < NUM_BARS; i++) {
      const rising = s.targets[i] > s.bars[i]
      // Attack: very fast (bars snap up on hit); Release: slow bass, faster treble
      const rate = rising
        ? (i < 10 ? 0.55 : i < 24 ? 0.42 : 0.32)
        : (i < 10 ? 0.04 : i < 24 ? 0.07 : 0.13)
      s.bars[i] += (s.targets[i] - s.bars[i]) * rate
      s.targets[i] *= (i < 10 ? 0.84 : i < 24 ? 0.78 : 0.72)
      s.bars[i] = Math.max(0.01, Math.min(1, s.bars[i]))

      // Peak markers — hold for ~800ms then fall
      if (s.bars[i] >= s.peaks[i]) {
        s.peaks[i]      = s.bars[i]
        s.peakTimers[i] = timestamp
      } else if (timestamp - s.peakTimers[i] > 800) {
        s.peaks[i] = Math.max(s.bars[i], s.peaks[i] - 0.008)
      }
    }

    // ── Draw ─────────────────────────────────────────────────────────────
    ctx.fillStyle = '#020608'
    ctx.fillRect(0, 0, W, H)

    // Oscilloscope grid
    ctx.strokeStyle = `${col}16`
    ctx.lineWidth   = 1
    for (let x = 0; x <= W; x += 35) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
    for (let y = 0; y <= H; y += 35) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }

    // Frequency bars + peak markers
    const barW = W / NUM_BARS
    for (let i = 0; i < NUM_BARS; i++) {
      const bH = s.bars[i] * H * 0.80

      const grad = ctx.createLinearGradient(0, H - bH, 0, H)
      grad.addColorStop(0,   col + 'f0')
      grad.addColorStop(0.4, col + '99')
      grad.addColorStop(1,   col + '1a')
      ctx.fillStyle = grad
      ctx.fillRect(i * barW + 1, H - bH, barW - 2, bH)

      // Peak hold marker
      const pH = s.peaks[i] * H * 0.80
      ctx.fillStyle = col + 'cc'
      ctx.fillRect(i * barW + 1, H - pH - 2, barW - 2, 2)
    }

    // Oscilloscope waveform — amplitude driven by live bass level
    const bass = (s.bars[0] + s.bars[1] + s.bars[2] + s.bars[3]) / 4
    ctx.strokeStyle  = col + 'dd'
    ctx.lineWidth    = 2
    ctx.shadowColor  = col
    ctx.shadowBlur   = 4 + bass * 14
    ctx.beginPath()
    for (let x = 0; x < W; x++) {
      const y = H * 0.20
        + Math.sin(x * 0.036 + t * 2.0) * (10 + bass * 24)
        + Math.sin(x * 0.079 + t * 3.5) * (6  + bass * 8)
        + Math.sin(x * 0.017 + t * 0.9) * (14 + bass * 18)
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    }
    ctx.stroke()
    ctx.shadowBlur = 0

    // Station name watermark
    ctx.save()
    ctx.globalAlpha  = 0.05
    ctx.fillStyle    = '#ffffff'
    ctx.font         = `bold ${Math.floor(W * 0.09)}px 'Courier New', monospace`
    ctx.textAlign    = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(nameRef.current || '', W / 2, H / 2)
    ctx.restore()

    // Live clock
    const now = new Date()
    const ts  = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`
    ctx.fillStyle    = col + '66'
    ctx.font         = '11px "Courier New", monospace'
    ctx.textAlign    = 'right'
    ctx.textBaseline = 'top'
    ctx.fillText(ts, W - 8, 8)

    animRef.current = requestAnimationFrame(draw)
  }, [])

  useEffect(() => {
    if (active) animRef.current = requestAnimationFrame(draw)
    else        cancelAnimationFrame(animRef.current)
    return ()  => cancelAnimationFrame(animRef.current)
  }, [active, draw])

  return (
    <canvas
      ref={canvasRef}
      width={560}
      height={315}
      className="visualizer-canvas"
    />
  )
}

// ── Main App ────────────────────────────────────────────────────────────────
export default function App() {
  const [activeStation, setActiveStation] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isPowered, setIsPowered] = useState(false)
  const [screenMode, setScreenMode] = useState('visual')
  const [volume, setVolume] = useState(75)
  const [isDraggingVol,  setIsDraggingVol]  = useState(false)
  const [isDraggingTune, setIsDraggingTune] = useState(false)
  const [dragStartY,   setDragStartY]   = useState(0)
  const [dragStartVal, setDragStartVal] = useState(0)
  const [iframeKey, setIframeKey] = useState(0)

  const staticCanvasRef = useRef(null)
  const staticAnimRef   = useRef(null)
  const iframeRef       = useRef(null)

  const station = STATIONS[activeStation]

  // ── postMessage volume to YouTube iframe ──────────────────────────────────
  const sendYTCommand = useCallback((func, args) => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func, args }), '*'
    )
  }, [])

  useEffect(() => {
    if (isPowered) sendYTCommand('setVolume', [volume])
  }, [volume, isPowered, sendYTCommand])

  // ── TV static canvas ──────────────────────────────────────────────────────
  const drawStatic = useCallback(() => {
    const canvas = staticCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const w = canvas.width, h = canvas.height
    const img = ctx.createImageData(w, h)
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255
      img.data[i]   = v * (0.8 + Math.random() * 0.2)
      img.data[i+1] = v * (0.65 + Math.random() * 0.15)
      img.data[i+2] = v * (0.45 + Math.random() * 0.1)
      img.data[i+3] = 255
    }
    ctx.putImageData(img, 0, 0)
    for (let b = 0; b < Math.floor(Math.random() * 5); b++) {
      ctx.fillStyle = `rgba(255,200,100,${0.08 + Math.random() * 0.18})`
      ctx.fillRect(0, Math.random() * h, w, 3 + Math.random() * 22)
    }
    ctx.fillStyle = 'rgba(0,0,0,0.22)'
    for (let y = 0; y < h; y += 2) ctx.fillRect(0, y, w, 1)
    staticAnimRef.current = requestAnimationFrame(drawStatic)
  }, [])

  useEffect(() => {
    if (isTransitioning || !isPowered) drawStatic()
    else {
      cancelAnimationFrame(staticAnimRef.current)
      staticAnimRef.current = null
    }
    return () => cancelAnimationFrame(staticAnimRef.current)
  }, [isTransitioning, isPowered, drawStatic])

  // ── Change station ────────────────────────────────────────────────────────
  const changeStation = useCallback((index) => {
    if (isTransitioning || !isPowered || index === activeStation) return
    setIsTransitioning(true)
    setTimeout(() => {
      setActiveStation(index)
      setIframeKey(k => k + 1)
      setTimeout(() => setIsTransitioning(false), 500)
    }, 900)
  }, [isTransitioning, isPowered, activeStation])

  // ── Power ─────────────────────────────────────────────────────────────────
  const handlePower = () => {
    if (!isPowered) {
      setIsTransitioning(true)
      setTimeout(() => {
        setIsPowered(true)
        setIframeKey(k => k + 1)
        setTimeout(() => setIsTransitioning(false), 700)
      }, 1100)
    } else {
      setIsPowered(false)
      setIsTransitioning(false)
      sendYTCommand('pauseVideo', [])
    }
  }

  // ── Volume drag ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isDraggingVol) return
    const onMove = (e) => {
      const y = e.touches ? e.touches[0].clientY : e.clientY
      setVolume(Math.max(0, Math.min(100, dragStartVal + (dragStartY - y))))
    }
    const onUp = () => setIsDraggingVol(false)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',  onUp)
    window.addEventListener('touchmove', onMove)
    window.addEventListener('touchend',  onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup',  onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend',  onUp)
    }
  }, [isDraggingVol, dragStartY, dragStartVal])

  // ── Tune drag ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isDraggingTune) return
    const onMove = (e) => {
      const y = e.touches ? e.touches[0].clientY : e.clientY
      const newIdx = Math.max(0, Math.min(
        STATIONS.length - 1,
        dragStartVal + Math.round((dragStartY - y) / 40)
      ))
      if (newIdx !== activeStation) changeStation(newIdx)
    }
    const onUp = () => setIsDraggingTune(false)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',  onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup',  onUp)
    }
  }, [isDraggingTune, dragStartY, dragStartVal, activeStation, changeStation])

  const volAngle  = -135 + (volume / 100) * 270
  const tuneAngle = -135 + (activeStation / (STATIONS.length - 1)) * 270
  const iframeSrc = `https://www.youtube.com/embed/${station.videoId}?autoplay=1&enablejsapi=1&controls=1&rel=0&modestbranding=1`

  return (
    <div className="app">
      <StarField />
      <div className="crt-overlay" />
      <div className="bg-dust" />
      {isPowered && <div className="ambient-glow" style={{ '--gc': station.color }} />}

      <div className="radio-wrapper">
        <div className="top-bar">
          <div className="logo-area">
            <span className="logo-text">LofiTune</span>
            <span className="logo-sub">deep space &bull; infinite frequencies</span>
          </div>
          <div className="antenna"><div className="antenna-rod" /><div className="antenna-base" /></div>
          <div className="model-badge"><span>FM/AM</span><span className="model-num">SX-76</span></div>
        </div>

        <div className="radio-body">
          {/* Speaker + VU */}
          <div className="speaker-panel">
            <div className="speaker-cloth">
              <div className="speaker-grille">
                {Array.from({ length: 88 }).map((_, i) => (
                  <div key={i} className={`dot ${isPowered ? 'lit' : ''}`} style={{ '--dc': station.color }} />
                ))}
              </div>
            </div>
            <div className="vu-meter">
              <div className="vu-scale"><span>-20</span><span>-10</span><span>0</span><span>+3</span></div>
              <div className="vu-glass">
                <div className={`vu-needle ${isPowered && !isTransitioning ? 'playing' : ''}`} />
              </div>
              <div className="vu-label">VU</div>
            </div>
          </div>

          {/* Center */}
          <div className="center-panel">
            <div className="info-bar">
              <div className="freq-display">
                <span className="freq-num">{isPowered ? station.freq : '--.-'}</span>
                <span className="freq-unit">FM</span>
              </div>
              <div className="station-meta">
                <span className="station-name">{isPowered ? station.name : 'OFF AIR'}</span>
                <span className="station-genre">{isPowered ? station.genre : '---'}</span>
              </div>
              {isPowered && !isTransitioning && (
                <button
                  className="mode-toggle"
                  onClick={() => setScreenMode(m => m === 'visual' ? 'video' : 'visual')}
                >
                  {screenMode === 'visual' ? '▶ VIDEO' : '≋ VISUAL'}
                </button>
              )}
              <div className={`on-air-badge ${isPowered && !isTransitioning ? 'live' : ''}`}>ON AIR</div>
            </div>

            <div className="screen-bezel">
              <div className={`screen ${isPowered ? 'powered' : ''}`}>
                <RetroVisualizer
                  active={isPowered && !isTransitioning && screenMode === 'visual'}
                  color={station.color}
                  stationName={station.name}
                />
                {isPowered && (
                  <iframe
                    key={iframeKey}
                    ref={iframeRef}
                    src={iframeSrc}
                    allow="autoplay; encrypted-media; fullscreen"
                    allowFullScreen
                    title={station.name}
                    className={`yt-frame ${screenMode === 'video' && !isTransitioning ? 'yt-visible' : 'yt-audio-only'}`}
                  />
                )}
                <canvas
                  ref={staticCanvasRef}
                  width={560}
                  height={315}
                  className="static-canvas"
                  style={{ display: (isTransitioning || !isPowered) ? 'block' : 'none' }}
                />
                {!isPowered && !isTransitioning && (
                  <div className="screen-off"><div className="off-line" /></div>
                )}
                <div className="screen-scanlines" />
                <div className="screen-vignette" />
                <div className="screen-glare" />
              </div>
            </div>

            <div className="tuning-band">
              <span className="band-edge">88</span>
              <div className="band-track">
                {STATIONS.map((s, i) => (
                  <button
                    key={s.id}
                    className={`band-mark ${i === activeStation && isPowered ? 'active' : ''}`}
                    style={{ left: `${(i / (STATIONS.length - 1)) * 100}%`, '--mc': s.color }}
                    onClick={() => changeStation(i)}
                    title={`${s.name} — ${s.freq} FM`}
                  >
                    <span className="mark-freq">{s.freq}</span>
                  </button>
                ))}
                <div className="band-needle" style={{ left: `${(activeStation / (STATIONS.length - 1)) * 100}%` }} />
              </div>
              <span className="band-edge">108</span>
            </div>
          </div>

          {/* Controls */}
          <div className="controls-panel">
            <button className={`power-btn ${isPowered ? 'on' : ''}`} onClick={handlePower}>
              <svg viewBox="0 0 24 24" className="power-icon">
                <path d="M12 2v8M6.3 5.3a9 9 0 1 0 11.4 0" />
              </svg>
              <span className="power-label">{isPowered ? 'ON' : 'OFF'}</span>
            </button>

            <div className="knob-group">
              <span className="knob-label">TUNE</span>
              <div className="knob-ring">
                <div className="knob-arc" />
                <div className="knob" style={{ transform: `rotate(${tuneAngle}deg)` }}
                  onMouseDown={(e) => { setIsDraggingTune(true); setDragStartY(e.clientY); setDragStartVal(activeStation) }}>
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="knob-ridge" style={{ transform: `rotate(${i * 30}deg) translateY(-22px)` }} />
                  ))}
                  <div className="knob-marker" /><div className="knob-center" />
                </div>
              </div>
            </div>

            <div className="knob-group">
              <span className="knob-label">VOL</span>
              <div className="knob-ring">
                <div className="knob-arc" />
                <div className="knob" style={{ transform: `rotate(${volAngle}deg)` }}
                  onMouseDown={(e) => { setIsDraggingVol(true); setDragStartY(e.clientY); setDragStartVal(volume) }}>
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="knob-ridge" style={{ transform: `rotate(${i * 30}deg) translateY(-22px)` }} />
                  ))}
                  <div className="knob-marker" /><div className="knob-center" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="preset-bar">
          {STATIONS.map((s, i) => (
            <button
              key={s.id}
              className={`preset-btn ${i === activeStation && isPowered ? 'active' : ''}`}
              style={{ '--pc': s.color }}
              onClick={() => changeStation(i)}
              disabled={!isPowered}
            >
              <span className="preset-num">{i + 1}</span>
              <span className="preset-name">{s.name}</span>
              <span className="preset-freq">{s.freq}</span>
            </button>
          ))}
        </div>

        <div className="bottom-strip">
          <span>STEREO</span><span className="dot-sep">&bull;</span>
          <span>FM / AM</span><span className="dot-sep">&bull;</span>
          <span>HI-FI</span><span className="dot-sep">&bull;</span>
          <span>LOFITUNE SPACE RADIO</span><span className="dot-sep">&bull;</span>
          <span>SECTOR 7G</span>
        </div>
      </div>

    </div>
  )
}
