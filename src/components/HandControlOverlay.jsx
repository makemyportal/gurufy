import { useState, useRef, useEffect, useCallback } from 'react'

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
  const [active, setActive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [gesture, setGesture] = useState('none')
  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 })
  const [minimized, setMinimized] = useState(false)
  const [clickFx, setClickFx] = useState(null)

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

  const getStableGesture = useCallback((raw) => {
    const c = gestureCountRef.current
    for (const g of ['point','pinch','scroll','fist','palm','none']) {
      c[g] = g === raw ? (c[g]||0)+1 : 0
    }
    if ((c[raw]||0) >= GESTURE_FRAMES) stableRef.current = raw
    return stableRef.current
  }, [])

  const startHandControl = useCallback(async () => {
    setLoading(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false
      })
      streamRef.current = stream
      const video = videoRef.current
      video.srcObject = stream
      await video.play()
      const cv = canvasRef.current
      cv.width = video.videoWidth
      cv.height = video.videoHeight

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

      let lastT = performance.now()

      function detect() {
        const now = performance.now()
        if (video.readyState >= 2 && now > lastT) {
          const res = lm.detectForVideo(video, now)
          lastT = now

          const ctx = cv.getContext('2d')
          ctx.clearRect(0, 0, cv.width, cv.height)

          if (res.landmarks && res.landmarks.length > 0) {
            const pts = res.landmarks[0]
            const cw = cv.width, ch = cv.height

            // Draw skeleton on mini canvas
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

            // Smooth fingertip
            const rawX = pts[8].x, rawY = pts[8].y
            const sm = smoothRef.current
            if (!sm.init) { sm.x = rawX; sm.y = rawY; sm.init = true }
            else { sm.x += EMA*(rawX-sm.x); sm.y += EMA*(rawY-sm.y) }

            // Map to screen — mirror X for front cam, and add margins
            const screenX = (1 - sm.x) * window.innerWidth
            const screenY = sm.y * window.innerHeight
            setCursorPos({ x: screenX, y: screenY })

            const raw = detectGesture(pts)
            const g = getStableGesture(raw)
            setGesture(g)

            // --- Actions ---
            if (g === 'pinch' && now > clickCooldownRef.current) {
              // Click
              clickCooldownRef.current = now + 600
              const el = document.elementFromPoint(screenX, screenY)
              if (el) {
                // Visual click effect
                setClickFx({ x: screenX, y: screenY, t: now })
                setTimeout(() => setClickFx(null), 400)
                // Find clickable parent
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
  }, [getStableGesture])

  const stopHandControl = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    if (landmarkerRef.current) landmarkerRef.current.close()
    landmarkerRef.current = null
    streamRef.current = null
    smoothRef.current = { x: 0.5, y: 0.5, init: false }
    setActive(false)
    setGesture('none')
    setCursorPos({ x: -100, y: -100 })
  }, [])

  useEffect(() => { return () => { stopHandControl() } }, [stopHandControl])

  const gInfo = {
    point: { emoji: '☝️', label: 'Moving', color: '#00ffaa' },
    pinch: { emoji: '👌', label: 'Click!', color: '#fbbf24' },
    scroll: { emoji: '✌️', label: 'Scroll', color: '#818cf8' },
    fist: { emoji: '✊', label: 'Paused', color: '#f97316' },
    palm: { emoji: '🖐️', label: 'Back', color: '#06b6d4' },
    none: { emoji: '👋', label: 'Ready', color: '#94a3b8' }
  }
  const gi = gInfo[gesture] || gInfo.none

  // Inactive state — just the toggle button
  if (!active && !loading) {
    return (
      <button
        onClick={startHandControl}
        className="fixed bottom-20 xl:bottom-6 left-4 z-[70] w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30 flex items-center justify-center hover:scale-110 transition-all group"
        title="Enable Hand Control"
      >
        <span className="text-xl">🤚</span>
        <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl">
          Hand Control Mode
        </div>
      </button>
    )
  }

  return (
    <>
      {/* Virtual Cursor */}
      {active && cursorPos.x > 0 && (
        <div
          className="fixed pointer-events-none z-[9998] transition-all duration-75"
          style={{ left: cursorPos.x - 16, top: cursorPos.y - 16 }}
        >
          {/* Outer ring */}
          <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center"
            style={{ borderColor: gi.color, boxShadow: `0 0 20px ${gi.color}40, 0 0 6px ${gi.color}60` }}>
            {/* Inner dot */}
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

      {/* PIP Window */}
      <div className={`fixed z-[9999] ${minimized ? 'bottom-20 xl:bottom-6 left-4' : 'bottom-20 xl:bottom-6 left-4'} transition-all duration-300`}>
        {minimized ? (
          /* Minimized: small circle */
          <button onClick={() => setMinimized(false)}
            className="w-12 h-12 rounded-full bg-slate-900 border-2 border-cyan-500/50 shadow-lg shadow-cyan-500/20 flex items-center justify-center relative overflow-hidden group hover:scale-110 transition-all">
            <span className="text-lg">{gi.emoji}</span>
            <div className="absolute inset-0 rounded-full border-2 border-cyan-400 animate-pulse opacity-30" />
          </button>
        ) : (
          /* Full PIP */
          <div className="w-[200px] bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden">
            {/* Camera feed */}
            <div className="relative w-full aspect-[4/3] bg-black overflow-hidden">
              <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} playsInline muted />
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover pointer-events-none" style={{ transform: 'scaleX(-1)' }} />

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

              {/* Minimize btn */}
              <button onClick={() => setMinimized(true)} className="absolute top-1.5 right-1.5 w-5 h-5 rounded-md bg-slate-800/80 text-slate-400 hover:text-white flex items-center justify-center text-[10px] transition-colors">
                −
              </button>
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

            {/* Gesture guide - compact */}
            <div className="px-2 pb-2 grid grid-cols-3 gap-1">
              {[
                { e: '☝️', d: 'Move' },
                { e: '👌', d: 'Click' },
                { e: '✌️', d: 'Scroll' },
              ].map(g => (
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
