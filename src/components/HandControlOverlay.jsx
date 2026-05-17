import { useState, useRef, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'

const HAND_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[0,9],[9,10],[10,11],[11,12],
  [0,13],[13,14],[14,15],[15,16],[0,17],[17,18],[18,19],[19,20],[5,9],[9,13],[13,17]
]
const EMA = 0.3
const PINCH_DIST = 0.06
const SCROLL_SPEED = 18
const GESTURE_FRAMES = 5

function dist3d(a, b) { return Math.sqrt((a.x-b.x)**2 + (a.y-b.y)**2) }
function isUp(lm, tip, pip) { return lm[tip].y < lm[pip].y }

function detectGesture(lm) {
  if (!lm || lm.length < 21) return 'none'
  const pinch = dist3d(lm[4], lm[8]) < PINCH_DIST
  const idx = isUp(lm, 8, 6), mid = isUp(lm, 12, 10)
  const rng = isUp(lm, 16, 14), pnk = isUp(lm, 20, 18)
  const thb = Math.abs(lm[4].x - lm[3].x) > 0.04
  if (pinch) return 'pinch'
  if (idx && mid && rng && pnk && thb) return 'palm'
  if (!idx && !mid && !rng && !pnk && !thb) return 'fist'
  if (idx && mid && !rng && !pnk) return 'scroll'
  if (idx && !mid && !rng && !pnk) return 'point'
  return 'none'
}

export default function HandControlOverlay() {
  const { currentUser, userProfile } = useAuth()
  // Show for all logged-in users (admin gets full access, others can use too)
  const canAccess = !!currentUser

  const [active, setActive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [gesture, setGesture] = useState('none')
  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 })
  const [minimized, setMinimized] = useState(false)
  const [clickFx, setClickFx] = useState(null)
  const [facingMode, setFacingMode] = useState('user')

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const landmarkerRef = useRef(null)
  const rafRef = useRef(null)
  const streamRef = useRef(null)
  const smoothRef = useRef({ x: 0.5, y: 0.5, init: false })
  const gestureCountRef = useRef({})
  const stableRef = useRef('none')
  const lastScrollYRef = useRef(null)
  const clickCooldownRef = useRef(0)
  const backCooldownRef = useRef(0)
  const activeRef = useRef(false)

  const getStableGesture = useCallback((raw) => {
    const c = gestureCountRef.current
    for (const g of ['point','pinch','scroll','fist','palm','none']) {
      c[g] = g === raw ? (c[g]||0)+1 : 0
    }
    if ((c[raw]||0) >= GESTURE_FRAMES) stableRef.current = raw
    return stableRef.current
  }, [])

  const cleanup = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    if (landmarkerRef.current) { try { landmarkerRef.current.close() } catch(e){} }
    landmarkerRef.current = null
    streamRef.current = null
    rafRef.current = null
  }, [])

  const startHandControl = useCallback(async (camFacing) => {
    cleanup()
    setLoading(true)
    setGesture('none')
    smoothRef.current = { x: 0.5, y: 0.5, init: false }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: camFacing || 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false
      })
      streamRef.current = stream
      const video = videoRef.current
      if (!video) { stream.getTracks().forEach(t => t.stop()); return }
      video.srcObject = stream
      await video.play()
      const cv = canvasRef.current
      if (cv) { cv.width = video.videoWidth; cv.height = video.videoHeight }

      const vision = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/vision_bundle.mjs')
      const { FilesetResolver, HandLandmarker } = vision
      const fs = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm')
      const lm = await HandLandmarker.createFromOptions(fs, {
        baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task', delegate: 'GPU' },
        runningMode: 'VIDEO', numHands: 1
      })
      landmarkerRef.current = lm
      setLoading(false)
      setActive(true)
      activeRef.current = true

      let lastT = performance.now()
      const isFront = (camFacing || 'user') === 'user'

      function detect() {
        if (!activeRef.current) return
        const now = performance.now()
        if (video.readyState >= 2 && now > lastT) {
          const res = lm.detectForVideo(video, now)
          lastT = now
          const cvEl = canvasRef.current
          if (!cvEl) return
          const ctx = cvEl.getContext('2d')
          ctx.clearRect(0, 0, cvEl.width, cvEl.height)

          if (res.landmarks && res.landmarks.length > 0) {
            const pts = res.landmarks[0]
            const cw = cvEl.width, ch = cvEl.height

            ctx.strokeStyle = 'rgba(0,255,170,0.6)'
            ctx.lineWidth = 1.5
            HAND_CONNECTIONS.forEach(([a,b]) => {
              ctx.beginPath()
              ctx.moveTo(pts[a].x*cw, pts[a].y*ch)
              ctx.lineTo(pts[b].x*cw, pts[b].y*ch)
              ctx.stroke()
            })
            pts.forEach((p,i) => {
              ctx.beginPath()
              ctx.arc(p.x*cw, p.y*ch, i===8?4:2, 0, Math.PI*2)
              ctx.fillStyle = i===8?'#00ffaa':'rgba(255,255,255,0.7)'
              ctx.fill()
            })

            const rawX = pts[8].x, rawY = pts[8].y
            const sm = smoothRef.current
            if (!sm.init) { sm.x = rawX; sm.y = rawY; sm.init = true }
            else { sm.x += EMA*(rawX-sm.x); sm.y += EMA*(rawY-sm.y) }

            // Mirror X only for front camera
            const screenX = isFront ? (1 - sm.x) * window.innerWidth : sm.x * window.innerWidth
            const screenY = sm.y * window.innerHeight
            setCursorPos({ x: screenX, y: screenY })

            const raw = detectGesture(pts)
            const g = getStableGesture(raw)
            setGesture(g)

            if (g === 'pinch' && now > clickCooldownRef.current) {
              clickCooldownRef.current = now + 600
              const el = document.elementFromPoint(screenX, screenY)
              if (el) {
                setClickFx({ x: screenX, y: screenY, t: now })
                setTimeout(() => setClickFx(null), 400)
                const clickable = el.closest('a, button, [role="button"], input, select, textarea, [onclick]') || el
                clickable.click()
                if (clickable.tagName === 'INPUT' || clickable.tagName === 'TEXTAREA') clickable.focus()
              }
            } else if (g === 'scroll') {
              const scrollY = pts[8].y
              if (lastScrollYRef.current !== null) {
                const delta = (scrollY - lastScrollYRef.current) * SCROLL_SPEED * 100
                window.scrollBy({ top: delta, behavior: 'auto' })
              }
              lastScrollYRef.current = scrollY
            } else if (g === 'palm' && now > backCooldownRef.current) {
              backCooldownRef.current = now + 2000
              window.history.back()
            } else {
              lastScrollYRef.current = null
            }
          } else {
            smoothRef.current.init = false
            setCursorPos({ x: -100, y: -100 })
            setGesture('none')
          }
        }
        rafRef.current = requestAnimationFrame(detect)
      }
      detect()
    } catch (err) {
      console.error('HandControl init error:', err)
      setLoading(false)
    }
  }, [cleanup, getStableGesture])

  const stopHandControl = useCallback(() => {
    activeRef.current = false
    cleanup()
    setActive(false)
    setGesture('none')
    setCursorPos({ x: -100, y: -100 })
    setMinimized(false)
  }, [cleanup])

  const switchCamera = useCallback(() => {
    const newFacing = facingMode === 'user' ? 'environment' : 'user'
    setFacingMode(newFacing)
    startHandControl(newFacing)
  }, [facingMode, startHandControl])

  useEffect(() => { return () => { activeRef.current = false; cleanup() } }, [cleanup])

  const gInfo = {
    point: { emoji: '☝️', label: 'Moving', color: '#00ffaa' },
    pinch: { emoji: '👌', label: 'Click!', color: '#fbbf24' },
    scroll: { emoji: '✌️', label: 'Scroll', color: '#818cf8' },
    fist: { emoji: '✊', label: 'Paused', color: '#f97316' },
    palm: { emoji: '🖐️', label: 'Back', color: '#06b6d4' },
    none: { emoji: '👋', label: 'Ready', color: '#94a3b8' }
  }
  const gi = gInfo[gesture] || gInfo.none

  // Listen for sidebar trigger event (desktop)
  useEffect(() => {
    const handler = () => {
      if (!active && !loading) startHandControl(facingMode)
    }
    window.addEventListener('toggle-hand-control', handler)
    return () => window.removeEventListener('toggle-hand-control', handler)
  }, [active, loading, facingMode, startHandControl])

  if (!canAccess) return null

  // Floating toggle — mobile only (desktop trigger is in sidebar profile card)
  if (!active && !loading) {
    return (
      <button
        onClick={() => startHandControl(facingMode)}
        className="xl:hidden fixed bottom-[160px] right-4 z-[90] w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
        title="Hand Control"
      >
        <span className="text-lg">🤚</span>
      </button>
    )
  }

  return (
    <>
      {/* Virtual Cursor */}
      {active && cursorPos.x > 0 && (
        <div className="fixed pointer-events-none z-[9998] transition-all duration-75"
          style={{ left: cursorPos.x - 16, top: cursorPos.y - 16 }}>
          <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center"
            style={{ borderColor: gi.color, boxShadow: `0 0 20px ${gi.color}40, 0 0 6px ${gi.color}60` }}>
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: gi.color, boxShadow: `0 0 8px ${gi.color}` }} />
          </div>
        </div>
      )}

      {/* Click Effect */}
      {clickFx && (
        <div className="fixed pointer-events-none z-[9997]" style={{ left: clickFx.x - 24, top: clickFx.y - 24 }}>
          <div className="w-12 h-12 rounded-full border-2 border-yellow-400 animate-ping opacity-75" />
        </div>
      )}

      {/* PIP Window — desktop: sidebar area, mobile: right side */}
      <div className="fixed z-[9999] transition-all duration-300 bottom-[160px] xl:bottom-[80px] right-4 xl:right-auto xl:left-4">
        {minimized ? (
          <button onClick={() => setMinimized(false)}
            className="w-12 h-12 rounded-full bg-slate-900 border-2 border-cyan-500/50 shadow-lg shadow-cyan-500/20 flex items-center justify-center relative overflow-hidden hover:scale-110 transition-all">
            <span className="text-lg">{gi.emoji}</span>
            <div className="absolute inset-0 rounded-full border-2 border-cyan-400 animate-pulse opacity-30" />
          </button>
        ) : (
          <div className="w-[200px] bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden">
            {/* Camera feed */}
            <div className="relative w-full aspect-[4/3] bg-black overflow-hidden">
              <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }} playsInline muted />
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover pointer-events-none" style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }} />

              {loading && (
                <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center">
                  <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mb-2" />
                  <p className="text-[10px] text-slate-400 font-medium">Loading AI...</p>
                </div>
              )}

              {/* Gesture badge */}
              <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1"
                style={{ backgroundColor: `${gi.color}20`, color: gi.color, border: `1px solid ${gi.color}30` }}>
                <span className="text-xs">{gi.emoji}</span> {gi.label}
              </div>

              {/* Top right buttons */}
              <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
                {/* Camera switch */}
                <button onClick={switchCamera} className="w-5 h-5 rounded-md bg-slate-800/80 text-slate-400 hover:text-white flex items-center justify-center transition-colors" title="Switch Camera">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                </button>
                {/* Minimize */}
                <button onClick={() => setMinimized(true)} className="w-5 h-5 rounded-md bg-slate-800/80 text-slate-400 hover:text-white flex items-center justify-center text-[10px] transition-colors">−</button>
              </div>
            </div>

            {/* Controls bar */}
            <div className="p-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-bold text-slate-400">Hand Control</span>
              </div>
              <button onClick={stopHandControl}
                className="px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-[10px] font-bold rounded-md transition-colors border border-red-500/20">
                Stop
              </button>
            </div>

            {/* Gesture guide */}
            <div className="px-2 pb-2 grid grid-cols-3 gap-1">
              {[{e:'☝️',d:'Move'},{e:'👌',d:'Click'},{e:'✌️',d:'Scroll'}].map(g => (
                <div key={g.d} className="text-center py-1 bg-slate-800/50 rounded-md">
                  <div className="text-xs">{g.e}</div>
                  <div className="text-[8px] text-slate-500 font-bold">{g.d}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
