import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

const COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#06b6d4','#3b82f6','#8b5cf6','#ec4899','#ffffff']
const BRUSH_SIZES = [4, 8, 14, 22]

const HAND_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[0,9],[9,10],[10,11],[11,12],
  [0,13],[13,14],[14,15],[15,16],[0,17],[17,18],[18,19],[19,20],[5,9],[9,13],[13,17]
]

// --- Smoothing helpers ---
const EMA_ALPHA = 0.35 // lower = smoother but laggier, higher = responsive but jittery
const DEAD_ZONE = 2.5 // pixels - ignore movements smaller than this
const GESTURE_DEBOUNCE_FRAMES = 4 // frames a gesture must be stable before switching

function isFingerExtended(lm, tip, pip) { return lm[tip].y < lm[pip].y }

function detectGesture(lm) {
  if (!lm || lm.length < 21) return 'none'
  const idx = isFingerExtended(lm, 8, 6)
  const mid = isFingerExtended(lm, 12, 10)
  const rng = isFingerExtended(lm, 16, 14)
  const pnk = isFingerExtended(lm, 20, 18)
  const thb = Math.abs(lm[4].x - lm[3].x) > 0.04
  if (idx && mid && rng && pnk && thb) return 'open_palm'
  if (!idx && !mid && !rng && !pnk && !thb) return 'fist'
  if (idx && mid && !rng && !pnk) return 'peace'
  if (idx && !mid && !rng && !pnk) return 'point'
  return 'none'
}

function dist(a, b) { return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2) }

export default function HandGestureCanvas() {
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const overlayRef = useRef(null)
  const drawRef = useRef(null)
  const containerRef = useRef(null)
  const landmarkerRef = useRef(null)
  const rafRef = useRef(null)
  const streamRef = useRef(null)

  // Smoothing state refs (not React state to avoid re-renders in the loop)
  const smoothRef = useRef({ x: 0, y: 0, init: false })
  const pointsRef = useRef([]) // collected points for bezier
  const lastDrawnRef = useRef(null)
  const gestureCountRef = useRef({})
  const stableGestureRef = useRef('none')
  const palmHoldRef = useRef({ active: false, start: 0 })
  const colorRef = useRef('#ef4444')
  const sizeRef = useRef(8)

  const [isLoading, setIsLoading] = useState(true)
  const [loadingMsg, setLoadingMsg] = useState('Initializing camera...')
  const [error, setError] = useState(null)
  const [selectedColor, setSelectedColor] = useState('#ef4444')
  const [brushSize, setBrushSize] = useState(8)
  const [currentGesture, setCurrentGesture] = useState('none')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [facingMode, setFacingMode] = useState('user')
  const [showGuide, setShowGuide] = useState(true)
  const [fps, setFps] = useState(0)

  // Keep refs in sync with state
  useEffect(() => { colorRef.current = selectedColor }, [selectedColor])
  useEffect(() => { sizeRef.current = brushSize }, [brushSize])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen().catch(() => {})
    else document.exitFullscreen()
  }
  useEffect(() => {
    const h = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', h)
    return () => document.removeEventListener('fullscreenchange', h)
  }, [])

  const clearDrawing = useCallback(() => {
    const c = drawRef.current
    if (!c) return
    c.getContext('2d').clearRect(0, 0, c.width, c.height)
  }, [])

  const exportDrawing = useCallback(() => {
    const c = drawRef.current
    if (!c) return
    const link = document.createElement('a')
    link.download = 'hand-gesture-art.png'
    link.href = c.toDataURL()
    link.click()
  }, [])

  // --- Smooth bezier drawing function ---
  function drawSmoothStroke(ctx, points, color, size, isEraser) {
    if (points.length < 2) return
    ctx.save()
    if (isEraser) {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.strokeStyle = 'rgba(0,0,0,1)'
      ctx.lineWidth = size * 3
    } else {
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = color
      ctx.lineWidth = size
    }
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)

    if (points.length === 2) {
      ctx.lineTo(points[1].x, points[1].y)
    } else {
      // Quadratic bezier through midpoints for ultra-smooth curves
      for (let i = 1; i < points.length - 1; i++) {
        const midX = (points[i].x + points[i + 1].x) / 2
        const midY = (points[i].y + points[i + 1].y) / 2
        ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY)
      }
      const last = points[points.length - 1]
      ctx.lineTo(last.x, last.y)
    }
    ctx.stroke()
    ctx.restore()
  }

  // --- Stabilized gesture detection ---
  function getStableGesture(rawGesture) {
    const counts = gestureCountRef.current
    // Increment count for this gesture, reset others
    for (const g of ['point', 'peace', 'fist', 'open_palm', 'none']) {
      if (g === rawGesture) counts[g] = (counts[g] || 0) + 1
      else counts[g] = 0
    }
    // Only switch if gesture held for GESTURE_DEBOUNCE_FRAMES
    if ((counts[rawGesture] || 0) >= GESTURE_DEBOUNCE_FRAMES) {
      stableGestureRef.current = rawGesture
    }
    return stableGestureRef.current
  }

  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        setLoadingMsg('Requesting camera access...')
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false
        })
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        const video = videoRef.current
        video.srcObject = stream
        await video.play()

        const w = video.videoWidth, h = video.videoHeight
        overlayRef.current.width = w; overlayRef.current.height = h
        drawRef.current.width = w; drawRef.current.height = h

        setLoadingMsg('Loading AI hand detection model...')
        const vision = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/vision_bundle.mjs')
        if (cancelled) return
        const { FilesetResolver, HandLandmarker } = vision
        const fs = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm')
        if (cancelled) return

        setLoadingMsg('Warming up hand tracker...')
        const lm = await HandLandmarker.createFromOptions(fs, {
          baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task', delegate: 'GPU' },
          runningMode: 'VIDEO', numHands: 1
        })
        if (cancelled) return
        landmarkerRef.current = lm
        setIsLoading(false)

        let lastT = performance.now(), fc = 0, ft = performance.now()

        function detect() {
          if (cancelled) return
          const now = performance.now()
          fc++
          if (now - ft > 1000) { setFps(fc); fc = 0; ft = now }

          if (video.readyState >= 2 && now > lastT) {
            const res = lm.detectForVideo(video, now)
            lastT = now

            const oCtx = overlayRef.current.getContext('2d')
            const cw = overlayRef.current.width, ch = overlayRef.current.height
            oCtx.clearRect(0, 0, cw, ch)

            if (res.landmarks && res.landmarks.length > 0) {
              const pts = res.landmarks[0]

              // Draw hand skeleton
              oCtx.strokeStyle = 'rgba(0,255,170,0.5)'
              oCtx.lineWidth = 2
              HAND_CONNECTIONS.forEach(([a, b]) => {
                oCtx.beginPath()
                oCtx.moveTo(pts[a].x * cw, pts[a].y * ch)
                oCtx.lineTo(pts[b].x * cw, pts[b].y * ch)
                oCtx.stroke()
              })
              pts.forEach((p, i) => {
                oCtx.beginPath()
                oCtx.arc(p.x * cw, p.y * ch, i === 8 ? 7 : 3, 0, Math.PI * 2)
                oCtx.fillStyle = i === 8 ? '#00ffaa' : 'rgba(255,255,255,0.6)'
                oCtx.fill()
              })

              // Raw fingertip position
              const rawX = pts[8].x * cw, rawY = pts[8].y * ch
              const sm = smoothRef.current

              // EMA smoothing
              if (!sm.init) { sm.x = rawX; sm.y = rawY; sm.init = true }
              else { sm.x += EMA_ALPHA * (rawX - sm.x); sm.y += EMA_ALPHA * (rawY - sm.y) }

              const tipX = sm.x, tipY = sm.y
              const rawGesture = detectGesture(pts)
              const gesture = getStableGesture(rawGesture)
              setCurrentGesture(gesture)

              // Cursor ring on overlay
              const cursorColor = gesture === 'point' ? '#00ffaa' : gesture === 'peace' ? '#ff6b6b' : 'rgba(255,255,255,0.25)'
              oCtx.beginPath()
              oCtx.arc(tipX, tipY, gesture === 'peace' ? sizeRef.current * 1.5 : 10, 0, Math.PI * 2)
              oCtx.strokeStyle = cursorColor
              oCtx.lineWidth = 2.5
              oCtx.stroke()
              // Inner dot
              oCtx.beginPath()
              oCtx.arc(tipX, tipY, 3, 0, Math.PI * 2)
              oCtx.fillStyle = cursorColor
              oCtx.fill()

              const dCtx = drawRef.current.getContext('2d')

              if (gesture === 'point' || gesture === 'peace') {
                const isEraser = gesture === 'peace'
                const lastPt = lastDrawnRef.current

                if (lastPt && dist(lastPt, { x: tipX, y: tipY }) < DEAD_ZONE) {
                  // Within dead zone, skip
                } else {
                  pointsRef.current.push({ x: tipX, y: tipY })

                  // Keep a rolling window of points for smooth bezier
                  if (pointsRef.current.length > 5) {
                    pointsRef.current = pointsRef.current.slice(-5)
                  }

                  if (pointsRef.current.length >= 2) {
                    drawSmoothStroke(dCtx, pointsRef.current, colorRef.current, sizeRef.current, isEraser)
                  }
                  lastDrawnRef.current = { x: tipX, y: tipY }
                }
              } else if (gesture === 'open_palm') {
                if (!palmHoldRef.current.active) {
                  palmHoldRef.current = { active: true, start: now }
                } else if (now - palmHoldRef.current.start > 1500) {
                  dCtx.clearRect(0, 0, drawRef.current.width, drawRef.current.height)
                  palmHoldRef.current = { active: true, start: now + 99999 }
                }
                // Draw progress ring
                const prog = Math.min((now - palmHoldRef.current.start) / 1500, 1)
                if (prog > 0 && prog < 1) {
                  oCtx.beginPath()
                  oCtx.arc(tipX, tipY, 30, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2)
                  oCtx.strokeStyle = '#06b6d4'
                  oCtx.lineWidth = 4
                  oCtx.lineCap = 'round'
                  oCtx.stroke()
                }
                pointsRef.current = []
                lastDrawnRef.current = null
              } else {
                // fist / none = lift pen
                pointsRef.current = []
                lastDrawnRef.current = null
                palmHoldRef.current = { active: false, start: 0 }
              }
            } else {
              smoothRef.current.init = false
              pointsRef.current = []
              lastDrawnRef.current = null
              setCurrentGesture('none')
            }
          }
          rafRef.current = requestAnimationFrame(detect)
        }
        detect()
      } catch (err) {
        if (!cancelled) {
          console.error(err)
          setError(err.message || 'Failed to initialize.')
          setIsLoading(false)
        }
      }
    }
    init()
    return () => {
      cancelled = true
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
      if (landmarkerRef.current) landmarkerRef.current.close()
    }
  }, [facingMode])

  const switchCamera = useCallback(() => {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (landmarkerRef.current) { landmarkerRef.current.close(); landmarkerRef.current = null }
    smoothRef.current = { x: 0, y: 0, init: false }
    pointsRef.current = []
    lastDrawnRef.current = null
    setIsLoading(true)
    setFacingMode(f => f === 'user' ? 'environment' : 'user')
  }, [])

  const gi = {
    point: { emoji: '☝️', label: 'Drawing', color: 'text-emerald-400', bg: 'bg-emerald-500/20 border-emerald-500/30' },
    peace: { emoji: '✌️', label: 'Erasing', color: 'text-rose-400', bg: 'bg-rose-500/20 border-rose-500/30' },
    fist: { emoji: '✊', label: 'Paused', color: 'text-amber-400', bg: 'bg-amber-500/20 border-amber-500/30' },
    open_palm: { emoji: '🖐️', label: 'Hold to Clear', color: 'text-cyan-400', bg: 'bg-cyan-500/20 border-cyan-500/30' },
    none: { emoji: '👋', label: 'Show hand', color: 'text-slate-400', bg: 'bg-slate-500/20 border-slate-500/30' }
  }
  const g = gi[currentGesture] || gi.none

  return (
    <div ref={containerRef} className={`min-h-screen bg-slate-950 text-slate-300 font-sans flex flex-col ${isFullscreen ? 'fixed inset-0 z-[9999]' : ''}`}>
      <header className="border-b border-slate-800 bg-slate-900/80 px-4 py-3 flex items-center justify-between sticky top-0 z-20 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/camp')} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🤚</span>
            <div>
              <h1 className="text-white font-bold tracking-tight text-sm sm:text-base">AI Hand Gesture Canvas</h1>
              <div className="text-[10px] text-cyan-400 font-mono">VISION_AI_LAB</div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isLoading && <span className="text-[10px] font-mono text-slate-500 hidden sm:block">{fps} FPS</span>}
          <button onClick={switchCamera} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors" title="Switch Camera">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </button>
          <button onClick={toggleFullscreen} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors" title="Fullscreen">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
          <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }} playsInline muted />
          <canvas ref={drawRef} className="absolute inset-0 w-full h-full object-cover pointer-events-none" style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }} />
          <canvas ref={overlayRef} className="absolute inset-0 w-full h-full object-cover pointer-events-none" style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }} />

          {isLoading && (
            <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center z-10">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-4xl mb-6 animate-pulse shadow-lg shadow-cyan-500/30">🤚</div>
              <div className="w-48 h-1.5 bg-slate-800 rounded-full overflow-hidden mb-4">
                <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full" style={{ animation: 'ld 2s ease-in-out infinite' }} />
              </div>
              <p className="text-slate-400 text-sm font-medium">{loadingMsg}</p>
              <style>{`@keyframes ld{0%{width:0}50%{width:80%}100%{width:100%}}`}</style>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center z-10 p-8 text-center">
              <div className="text-5xl mb-4">⚠️</div>
              <h2 className="text-white text-xl font-bold mb-2">Camera Access Required</h2>
              <p className="text-slate-400 text-sm max-w-sm mb-6">{error}</p>
              <button onClick={() => window.location.reload()} className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-white font-bold rounded-xl transition-colors">Try Again</button>
            </div>
          )}

          {!isLoading && !error && (
            <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-10 px-4 py-2 rounded-full border backdrop-blur-md ${g.bg} flex items-center gap-2 transition-all duration-300`}>
              <span className="text-xl">{g.emoji}</span>
              <span className={`text-sm font-bold ${g.color}`}>{g.label}</span>
            </div>
          )}
          {!isLoading && <span className="absolute top-4 right-4 text-[10px] font-mono text-slate-500 sm:hidden z-10">{fps} FPS</span>}
        </div>

        <div className="lg:w-72 xl:w-80 bg-slate-900/95 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col overflow-y-auto">
          {showGuide && (
            <div className="p-4 border-b border-slate-800 bg-gradient-to-r from-cyan-500/5 to-blue-500/5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Gesture Guide</h3>
                <button onClick={() => setShowGuide(false)} className="text-slate-500 hover:text-white text-xs">Hide</button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                {[{e:'☝️',t:'Point',d:'Draw'},{e:'✌️',t:'Peace',d:'Erase'},{e:'✊',t:'Fist',d:'Pause'},{e:'🖐️',t:'Palm',d:'Clear (hold)'}].map(i=>(
                  <div key={i.t} className="bg-slate-800/60 rounded-lg p-2 border border-slate-700/50 text-center">
                    <div className="text-lg mb-0.5">{i.e}</div>
                    <div className="font-bold text-slate-300">{i.t}</div>
                    <div className="text-slate-500">{i.d}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-4 border-b border-slate-800">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Brush Color</h3>
            <div className="flex flex-wrap gap-2">
              {COLORS.map(c=>(
                <button key={c} onClick={()=>setSelectedColor(c)}
                  className={`w-8 h-8 rounded-xl border-2 transition-all ${selectedColor===c?'border-white scale-110 shadow-lg shadow-white/10':'border-slate-700 hover:border-slate-500'}`}
                  style={{background:c}} />
              ))}
              <div className="relative">
                <input type="color" value={selectedColor} onChange={e=>setSelectedColor(e.target.value)} className="absolute inset-0 w-8 h-8 opacity-0 cursor-pointer" />
                <div className="w-8 h-8 rounded-xl border-2 border-dashed border-slate-600 flex items-center justify-center text-slate-500 text-xs">+</div>
              </div>
            </div>
          </div>

          <div className="p-4 border-b border-slate-800">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Brush Size</h3>
            <div className="flex items-center gap-3">
              {BRUSH_SIZES.map(s=>(
                <button key={s} onClick={()=>setBrushSize(s)}
                  className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all ${brushSize===s?'bg-cyan-500/20 border border-cyan-500/40':'bg-slate-800 border border-slate-700 hover:border-slate-500'}`}>
                  <div className="rounded-full bg-white" style={{width:s+2,height:s+2}} />
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 space-y-2 mt-auto">
            {!showGuide && <button onClick={()=>setShowGuide(true)} className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-sm font-bold rounded-xl text-slate-300 transition-colors border border-slate-700">📖 Show Guide</button>}
            <button onClick={clearDrawing} className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-sm font-bold rounded-xl text-slate-300 transition-colors border border-slate-700">🗑️ Clear Canvas</button>
            <button onClick={exportDrawing} className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-sm font-bold rounded-xl text-white transition-all shadow-lg shadow-cyan-500/20">📥 Download Art</button>
          </div>
        </div>
      </div>
    </div>
  )
}
