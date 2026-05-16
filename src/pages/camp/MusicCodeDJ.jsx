import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const SOUNDS = {
  kick:    { freq: 60,  type: 'sine',     decay: 0.3 },
  snare:   { freq: 200, type: 'triangle', decay: 0.15 },
  hihat:   { freq: 800, type: 'square',   decay: 0.05 },
  clap:    { freq: 400, type: 'sawtooth', decay: 0.12 },
  bass:    { freq: 80,  type: 'sine',     decay: 0.4 },
  tom:     { freq: 150, type: 'sine',     decay: 0.2 },
}

const SOUND_KEYS = Object.keys(SOUNDS)
const STEPS = 16
const COLORS = {
  kick:  'bg-red-500',
  snare: 'bg-orange-500',
  hihat: 'bg-yellow-500',
  clap:  'bg-emerald-500',
  bass:  'bg-blue-500',
  tom:   'bg-purple-500'
}

export default function MusicCodeDJ() {
  const navigate = useNavigate()
  const [grid, setGrid] = useState(() => {
    const g = {}
    SOUND_KEYS.forEach(k => { g[k] = Array(STEPS).fill(false) })
    return g
  })
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentStep, setCurrentStep] = useState(-1)
  const [bpm, setBpm] = useState(120)
  const audioCtxRef = useRef(null)
  const intervalRef = useRef(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef(null)
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen().catch(() => {})
    else document.exitFullscreen()
  }
  useEffect(() => {
    const h = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', h)
    return () => document.removeEventListener('fullscreenchange', h)
  }, [])

  const getAudioCtx = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)()
    }
    return audioCtxRef.current
  }

  const playSound = useCallback((soundKey) => {
    const ctx = getAudioCtx()
    const s = SOUNDS[soundKey]
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = s.type
    osc.frequency.value = s.freq
    gain.gain.setValueAtTime(0.5, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + s.decay)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + s.decay)
  }, [])

  const toggleCell = (sound, step) => {
    setGrid(prev => ({
      ...prev,
      [sound]: prev[sound].map((v, i) => i === step ? !v : v)
    }))
  }

  const startPlaying = () => {
    setIsPlaying(true)
    let step = 0
    const interval = (60 / bpm / 4) * 1000

    intervalRef.current = setInterval(() => {
      setCurrentStep(step)
      SOUND_KEYS.forEach(sound => {
        setGrid(prev => {
          if (prev[sound][step]) {
            playSound(sound)
          }
          return prev
        })
      })
      step = (step + 1) % STEPS
    }, interval)
  }

  const stopPlaying = () => {
    setIsPlaying(false)
    setCurrentStep(-1)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }

  const clearAll = () => {
    const g = {}
    SOUND_KEYS.forEach(k => { g[k] = Array(STEPS).fill(false) })
    setGrid(g)
  }

  const loadPreset = (name) => {
    const g = {}
    SOUND_KEYS.forEach(k => { g[k] = Array(STEPS).fill(false) })
    
    if (name === 'basic') {
      g.kick = [true,false,false,false, true,false,false,false, true,false,false,false, true,false,false,false]
      g.snare = [false,false,false,false, true,false,false,false, false,false,false,false, true,false,false,false]
      g.hihat = [true,false,true,false, true,false,true,false, true,false,true,false, true,false,true,false]
    } else if (name === 'hiphop') {
      g.kick = [true,false,false,true, false,false,true,false, true,false,false,true, false,false,false,false]
      g.snare = [false,false,false,false, true,false,false,false, false,false,false,false, true,false,false,true]
      g.hihat = [true,true,true,true, true,true,true,true, true,true,true,true, true,true,true,true]
      g.clap = [false,false,false,false, true,false,false,false, false,false,false,false, true,false,false,false]
    } else if (name === 'edm') {
      g.kick = [true,false,false,false, true,false,false,false, true,false,false,false, true,false,false,false]
      g.clap = [false,false,false,false, true,false,false,false, false,false,false,false, true,false,false,false]
      g.hihat = [false,false,true,false, false,false,true,false, false,false,true,false, false,false,true,false]
      g.bass = [true,false,false,true, false,false,true,false, true,false,false,true, false,false,true,false]
    }
    setGrid(g)
  }

  return (
    <div ref={containerRef} className={`min-h-screen bg-slate-950 text-slate-300 font-sans flex flex-col ${isFullscreen ? 'fixed inset-0 z-[9999]' : ''}`}>
      <header className="border-b border-slate-800 bg-slate-900/80 p-4 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/camp')} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎵</span>
            <div>
              <h1 className="text-white font-bold tracking-tight">Music Code DJ</h1>
              <div className="text-xs text-fuchsia-400 font-mono">BEAT_SEQUENCER_V1</div>
            </div>
          </div>
        </div>
        <button onClick={toggleFullscreen} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors" title="Fullscreen">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
        </button>
      </header>

      <div className="flex-1 p-6 max-w-5xl mx-auto w-full">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <p className="text-xs text-fuchsia-300 mb-6 bg-fuchsia-500/10 p-3 rounded-lg border border-fuchsia-500/20">
            <strong>Teacher Tip:</strong> Music is made of patterns and loops — just like code! Each row is a different sound. Click cells to create a beat pattern, then press Play to hear your creation.
          </p>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <button
              onClick={isPlaying ? stopPlaying : startPlaying}
              className={`px-6 py-2.5 font-bold rounded-xl text-sm transition-colors ${isPlaying ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500 hover:bg-emerald-600 text-white'}`}
            >
              {isPlaying ? '⏹ Stop' : '▶ Play'}
            </button>

            <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-lg border border-slate-800">
              <span className="text-xs text-slate-400 font-bold">BPM:</span>
              <input type="range" min="60" max="200" value={bpm} onChange={e => setBpm(parseInt(e.target.value))} className="w-24 accent-fuchsia-500" />
              <span className="text-sm text-white font-mono w-8">{bpm}</span>
            </div>

            <div className="flex gap-2">
              <button onClick={() => loadPreset('basic')} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-lg transition-colors">Basic Beat</button>
              <button onClick={() => loadPreset('hiphop')} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-lg transition-colors">Hip Hop</button>
              <button onClick={() => loadPreset('edm')} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-lg transition-colors">EDM</button>
            </div>

            <button onClick={clearAll} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-lg transition-colors">Clear All</button>
          </div>

          {/* Step Numbers */}
          <div className="flex mb-1 pl-20">
            {Array(STEPS).fill(0).map((_, i) => (
              <div key={i} className={`flex-1 text-center text-[10px] font-mono ${i % 4 === 0 ? 'text-slate-400 font-bold' : 'text-slate-600'}`}>
                {i + 1}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="space-y-1">
            {SOUND_KEYS.map(sound => (
              <div key={sound} className="flex items-center gap-2">
                <div className="w-16 text-right text-xs font-bold text-slate-400 uppercase shrink-0">{sound}</div>
                <div className="flex-1 flex gap-[2px]">
                  {grid[sound].map((active, step) => (
                    <button
                      key={step}
                      onClick={() => toggleCell(sound, step)}
                      className={`flex-1 h-9 rounded transition-all ${
                        active
                          ? `${COLORS[sound]} shadow-lg opacity-90`
                          : currentStep === step
                            ? 'bg-slate-700'
                            : step % 4 === 0 ? 'bg-slate-800/80' : 'bg-slate-800/40'
                      } ${currentStep === step && active ? 'ring-2 ring-white scale-105' : ''} hover:opacity-70`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-slate-500 mt-6 text-center">
            💡 <strong>Real Skill:</strong> Music producers use this exact pattern-based workflow (called a Step Sequencer) in tools like FL Studio and Ableton Live!
          </p>
        </div>
      </div>
    </div>
  )
}
