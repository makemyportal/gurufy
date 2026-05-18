import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

const COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#06b6d4','#3b82f6','#8b5cf6','#ec4899','#ffffff']
const BRUSH_SIZES = [4, 8, 14, 22]
const SHAPES = ['circle', 'square', 'star', 'heart']

const HAND_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[0,9],[9,10],[10,11],[11,12],
  [0,13],[13,14],[14,15],[15,16],[0,17],[17,18],[18,19],[19,20],[5,9],[9,13],[13,17]
]

function isFingerExtended(lm, tip, pip) { return lm[tip].y < lm[pip].y }

function detectGesture(lm) {
  if (!lm || lm.length < 21) return 'none'
  
  const pinchDist = Math.hypot(lm[4].x - lm[8].x, lm[4].y - lm[8].y)
  if (pinchDist < 0.05) return 'pinch'
  
  const idx = isFingerExtended(lm, 8, 6)
  const mid = isFingerExtended(lm, 12, 10)
  const rng = isFingerExtended(lm, 16, 14)
  const pnk = isFingerExtended(lm, 20, 18)
  const thb = Math.abs(lm[4].x - lm[3].x) > 0.04
  
  if (idx && mid && rng && pnk && thb) return 'open_palm'
  if (!idx && !mid && !rng && !pnk && !thb) return 'fist'
  if (idx && mid && !rng && !pnk) return 'peace'
  if (idx && !mid && !rng && !pnk) return 'point'
  if (idx && !mid && !rng && pnk) return 'rock' 
  return 'none'
}

function dist(a, b) { return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2) }

function drawShape(ctx, shape, x, y, r) {
  ctx.beginPath()
  if (shape === 'circle') {
    ctx.arc(x, y, r, 0, Math.PI * 2)
  } else if (shape === 'square') {
    ctx.rect(x - r, y - r, r * 2, r * 2)
  } else if (shape === 'star') {
    const spikes = 5
    const step = Math.PI / spikes
    let rot = Math.PI / 2 * 3
    ctx.moveTo(x, y - r)
    for (let i = 0; i < spikes; i++) {
      ctx.lineTo(x + Math.cos(rot) * r, y + Math.sin(rot) * r)
      rot += step
      ctx.lineTo(x + Math.cos(rot) * (r * 0.4), y + Math.sin(rot) * (r * 0.4))
      rot += step
    }
    ctx.closePath()
  } else if (shape === 'heart') {
    ctx.moveTo(x, y - r * 0.3)
    ctx.bezierCurveTo(x + r*0.5, y - r, x + r*1.5, y - r*0.3, x, y + r)
    ctx.bezierCurveTo(x - r*1.5, y - r*0.3, x - r*0.5, y - r, x, y - r * 0.3)
    ctx.closePath()
  }
  ctx.stroke()
}

// AI Smart Shape Recognition logic
function recognizeAndDrawShape(ctx, points, color, size, isEraser, glow) {
  if (points.length < 8) return false
  
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  points.forEach(p => {
    if (p.x < minX) minX = p.x
    if (p.x > maxX) maxX = p.x
    if (p.y < minY) minY = p.y
    if (p.y > maxY) maxY = p.y
  })
  
  const w = maxX - minX
  const h = maxY - minY
  if (w < 20 && h < 20) return false
  
  const start = points[0]
  const end = points[points.length - 1]
  const maxDim = Math.max(w, h)
  const isClosed = dist(start, end) < Math.max(150, maxDim * 0.4)
  
  ctx.save()
  if (isEraser) {
    ctx.globalCompositeOperation = 'destination-out'
    ctx.strokeStyle = 'rgba(0,0,0,1)'
    ctx.lineWidth = size * 3
    ctx.shadowBlur = 0
  } else {
    ctx.globalCompositeOperation = 'source-over'
    ctx.strokeStyle = color
    ctx.lineWidth = size
    if (glow) {
      ctx.shadowColor = color
      ctx.shadowBlur = size * 2
    } else {
      ctx.shadowBlur = 0
    }
  }
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  let shapeName = false
  if (isClosed) {
    const cx = minX + w / 2
    const cy = minY + h / 2
    
    // Circle Check
    let rSum = 0
    points.forEach(p => rSum += dist({x: cx, y: cy}, p))
    const rAvg = rSum / points.length
    
    let rVar = 0
    points.forEach(p => rVar += Math.pow(dist({x: cx, y: cy}, p) - rAvg, 2))
    const rStdDev = Math.sqrt(rVar / points.length)
    
    if (rStdDev / rAvg < 0.25 && Math.abs(w-h) / Math.max(w,h) < 0.3) {
      ctx.beginPath()
      ctx.arc(cx, cy, rAvg, 0, Math.PI * 2)
      ctx.stroke()
      shapeName = 'circle'
    } else {
      ctx.beginPath()
      ctx.rect(minX, minY, w, h)
      ctx.stroke()
      shapeName = 'rectangle'
    }
  } else {
    // Line Check
    const d = dist(start, end)
    if (d > 50) {
      let maxDist = 0
      points.forEach(p => {
        const num = Math.abs((end.y - start.y)*p.x - (end.x - start.x)*p.y + end.x*start.y - end.y*start.x)
        const ptDist = num / d
        if (ptDist > maxDist) maxDist = ptDist
      })
      if (maxDist < d * 0.25) { // more forgiving line detection
        ctx.beginPath()
        ctx.moveTo(start.x, start.y)
        ctx.lineTo(end.x, end.y)
        ctx.stroke()
        shapeName = 'line'
      }
    }
  }
  ctx.restore()
  return shapeName
}

export default function HandGestureCanvas() {
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const overlayRef = useRef(null)
  const drawRef = useRef(null)
  const containerRef = useRef(null)
  const landmarkerRef = useRef(null)
  
  const streamRef = useRef(null)
  const aiRafRef = useRef(null)
  const renderRafRef = useRef(null)

  // State refs
  const smoothRef = useRef({ x: 0, y: 0, init: false })
  const pointsRef = useRef([]) 
  const lastDrawnRef = useRef(null)
  const gestureCountRef = useRef({})
  const stableGestureRef = useRef('none')
  const palmHoldRef = useRef({ active: false, start: 0 })
  const colorRef = useRef('#ef4444')
  const sizeRef = useRef(8)
  const shapeRef = useRef('circle')
  
  // Ultra-advanced state refs
  const stickyDrawRef = useRef(false)
  const rainbowRef = useRef(false)
  const hueRef = useRef(0)
  const particlesRef = useRef([])
  const lastRockTimeRef = useRef(0)
  const latestLandmarksRef = useRef(null)
  const pinchStartRef = useRef(null)
  
  // New refs for AI Smart Shape and Writing Mode
  const drawModeRef = useRef('art') // 'art' or 'write'
  const smartShapeRef = useRef(true)
  const fullStrokePointsRef = useRef([])
  const canvasBackupRef = useRef(null)
  const activeDrawColorRef = useRef('#ef4444') // To remember color at start of stroke for AI snapping
  const handLostFramesRef = useRef(0)

  const [isLoading, setIsLoading] = useState(true)
  const [loadingMsg, setLoadingMsg] = useState('Initializing camera...')
  const [error, setError] = useState(null)
  const [selectedColor, setSelectedColor] = useState('#ef4444')
  const [brushSize, setBrushSize] = useState(8)
  const [selectedShape, setSelectedShape] = useState('circle')
  const [currentGesture, setCurrentGesture] = useState('none')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [facingMode, setFacingMode] = useState('user')
  const [showGuide, setShowGuide] = useState(true)
  const [fps, setFps] = useState(0)
  const [drawMode, setDrawMode] = useState('art')
  const [smartShape, setSmartShape] = useState(true)

  useEffect(() => { colorRef.current = selectedColor }, [selectedColor])
  useEffect(() => { sizeRef.current = brushSize }, [brushSize])
  useEffect(() => { shapeRef.current = selectedShape }, [selectedShape])
  useEffect(() => { drawModeRef.current = drawMode }, [drawMode])
  useEffect(() => { smartShapeRef.current = smartShape }, [smartShape])

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
    for(let i=0; i<50; i++) {
      particlesRef.current.push({
        x: c.width/2 + (Math.random()-0.5)*c.width,
        y: c.height/2 + (Math.random()-0.5)*c.height,
        vx: (Math.random()-0.5)*20,
        vy: (Math.random()-0.5)*20,
        life: 1,
        color: '#06b6d4',
        size: Math.random()*5+2
      })
    }
  }, [])

  const exportDrawing = useCallback(() => {
    const c = drawRef.current
    if (!c) return
    const link = document.createElement('a')
    link.download = 'hand-gesture-art.png'
    link.href = c.toDataURL()
    link.click()
  }, [])

  function drawSmoothStroke(ctx, points, color, baseSize, isEraser, mode) {
    if (points.length < 2) return
    
    let dynamicSize = baseSize
    if (mode === 'write' && !isEraser && points.length >= 2) {
      const p1 = points[points.length - 2]
      const p2 = points[points.length - 1]
      const d = dist(p1, p2)
      // Calligraphy effect: faster = thinner
      const ratio = Math.min(d / 40, 1) 
      dynamicSize = baseSize * (1 - ratio * 0.5)
    }

    ctx.save()
    if (isEraser) {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.strokeStyle = 'rgba(0,0,0,1)'
      ctx.lineWidth = baseSize * 3
      ctx.shadowBlur = 0
    } else {
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = color
      ctx.lineWidth = dynamicSize
      if (mode === 'art') {
        ctx.shadowColor = color
        ctx.shadowBlur = baseSize * 2
      } else {
        ctx.shadowBlur = 0
      }
    }
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)
    if (points.length === 2) {
      ctx.lineTo(points[1].x, points[1].y)
    } else {
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

  function getStableGesture(rawGesture) {
    const counts = gestureCountRef.current
    for (const g of ['point', 'peace', 'fist', 'open_palm', 'rock', 'pinch', 'none']) {
      if (g === rawGesture) counts[g] = (counts[g] || 0) + 1
      else counts[g] = 0
    }
    if ((counts[rawGesture] || 0) >= 3) {
      stableGestureRef.current = rawGesture
    }
    return stableGestureRef.current
  }

  // --- Render Loop (60 FPS) ---
  const renderLoop = useCallback(() => {
    const oCtx = overlayRef.current?.getContext('2d')
    const cw = overlayRef.current?.width
    const ch = overlayRef.current?.height
    if (!oCtx || !cw || !ch) return

    oCtx.clearRect(0, 0, cw, ch)

    // Glowing Particles
    const parts = particlesRef.current
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]
      p.x += p.vx
      p.y += p.vy
      p.life -= 0.02
      p.vy += 0.1
      if (p.life <= 0) {
        parts.splice(i, 1)
        continue
      }
      oCtx.save()
      oCtx.beginPath()
      oCtx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2)
      oCtx.fillStyle = p.color
      oCtx.shadowColor = p.color
      oCtx.shadowBlur = 10
      oCtx.globalAlpha = p.life
      oCtx.fill()
      oCtx.restore()
    }

    // Draw Skeleton
    const pts = latestLandmarksRef.current
    if (pts && pts.length > 0) {
      oCtx.strokeStyle = 'rgba(0, 255, 170, 0.4)'
      oCtx.lineWidth = 2
      HAND_CONNECTIONS.forEach(([a, b]) => {
        oCtx.beginPath()
        oCtx.moveTo(pts[a].x * cw, pts[a].y * ch)
        oCtx.lineTo(pts[b].x * cw, pts[b].y * ch)
        oCtx.stroke()
      })
      pts.forEach((p, i) => {
        oCtx.beginPath()
        oCtx.arc(p.x * cw, p.y * ch, (i===4||i===8)?5:2.5, 0, Math.PI * 2) 
        oCtx.fillStyle = (i===4||i===8) ? '#00ffaa' : 'rgba(255,255,255,0.7)'
        oCtx.fill()
      })

      const tipX = smoothRef.current.x
      const tipY = smoothRef.current.y
      const g = stableGestureRef.current
      const isDrawing = stickyDrawRef.current
      const isWriteMode = drawModeRef.current === 'write'

      // Shape preview during pinch
      if (g === 'pinch' && pinchStartRef.current) {
        const start = pinchStartRef.current
        const r = dist(start, {x: tipX, y: tipY})
        oCtx.save()
        oCtx.strokeStyle = colorRef.current
        oCtx.shadowColor = colorRef.current
        oCtx.shadowBlur = 15
        oCtx.lineWidth = sizeRef.current
        drawShape(oCtx, shapeRef.current, start.x, start.y, r)
        oCtx.restore()
        
        oCtx.beginPath()
        oCtx.moveTo(start.x, start.y)
        oCtx.lineTo(tipX, tipY)
        oCtx.setLineDash([5, 5])
        oCtx.strokeStyle = 'rgba(255,255,255,0.5)'
        oCtx.lineWidth = 2
        oCtx.stroke()
        oCtx.setLineDash([])
      }

      // Cursor Ring
      let cursorColor = 'rgba(255,255,255,0.3)'
      if (isDrawing || g === 'point') cursorColor = rainbowRef.current ? `hsl(${hueRef.current}, 100%, 50%)` : colorRef.current
      else if (g === 'peace') cursorColor = '#ff6b6b'
      else if (g === 'rock') cursorColor = '#a855f7'
      else if (g === 'pinch') cursorColor = '#facc15'
      
      oCtx.save()
      oCtx.beginPath()
      oCtx.arc(tipX, tipY, g === 'peace' ? sizeRef.current * 1.5 : (isWriteMode ? 6 : 12), 0, Math.PI * 2)
      oCtx.strokeStyle = cursorColor
      oCtx.shadowColor = cursorColor
      oCtx.shadowBlur = isWriteMode ? 0 : 10
      oCtx.lineWidth = isWriteMode ? 2 : 3
      oCtx.stroke()
      oCtx.beginPath()
      oCtx.arc(tipX, tipY, isWriteMode ? 2 : 4, 0, Math.PI * 2)
      oCtx.fillStyle = cursorColor
      oCtx.fill()
      oCtx.restore()
    }

    renderRafRef.current = requestAnimationFrame(renderLoop)
  }, [])

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
        
        await new Promise(resolve => {
          video.onloadedmetadata = () => resolve()
        })
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

        renderRafRef.current = requestAnimationFrame(renderLoop)

        let lastT = performance.now(), fc = 0, ft = performance.now()

        function detect() {
          if (cancelled) return
          const now = performance.now()
          fc++
          if (now - ft > 1000) { setFps(fc); fc = 0; ft = now }

          if (video.readyState >= 2 && now > lastT) {
            const res = lm.detectForVideo(video, now)
            lastT = now
            
            if (res.landmarks && res.landmarks.length > 0) {
              handLostFramesRef.current = 0
              const pts = res.landmarks[0]
              latestLandmarksRef.current = pts
              const cw = overlayRef.current.width, ch = overlayRef.current.height
              
              const rawX = pts[8].x * cw, rawY = pts[8].y * ch
              const sm = smoothRef.current

              const mode = drawModeRef.current
              const alpha = mode === 'write' ? 0.8 : 0.4 // Higher = more responsive/jittery, Lower = smooth/laggy
              const deadZone = mode === 'write' ? 0 : 2.0

              if (!sm.init) { sm.x = rawX; sm.y = rawY; sm.init = true }
              else { sm.x += alpha * (rawX - sm.x); sm.y += alpha * (rawY - sm.y) }

              const tipX = sm.x, tipY = sm.y
              const rawGesture = detectGesture(pts)
              const gesture = getStableGesture(rawGesture)
              setCurrentGesture(gesture)

              const dCtx = drawRef.current.getContext('2d')
              const isEraser = gesture === 'peace'

              // 1. Pinch Shape Drawing
              if (gesture === 'pinch') {
                if (!pinchStartRef.current) pinchStartRef.current = {x: tipX, y: tipY}
                stickyDrawRef.current = false // pause drawing while pinching
              } else {
                if (pinchStartRef.current) {
                  // Release pinch: draw final shape
                  const start = pinchStartRef.current
                  const r = dist(start, {x: tipX, y: tipY})
                  if (r > 5) {
                    dCtx.save()
                    dCtx.strokeStyle = colorRef.current
                    dCtx.shadowColor = colorRef.current
                    dCtx.shadowBlur = mode === 'art' ? 15 : 0
                    dCtx.lineWidth = sizeRef.current
                    drawShape(dCtx, shapeRef.current, start.x, start.y, r)
                    dCtx.restore()
                    
                    if (mode === 'art') {
                      for(let i=0; i<30; i++) {
                        particlesRef.current.push({
                          x: start.x, y: start.y,
                          vx: (Math.random()-0.5)*r*0.3, vy: (Math.random()-0.5)*r*0.3,
                          life: 1, size: Math.random()*5+2, color: colorRef.current
                        })
                      }
                    }
                  }
                  pinchStartRef.current = null
                }
              }

              // 2. Sticky Draw Toggle
              if (gesture === 'point') {
                stickyDrawRef.current = true
              } else if (gesture === 'fist' || gesture === 'open_palm') {
                stickyDrawRef.current = false
              }

              // 3. Rainbow Toggle
              if (gesture === 'rock') {
                if (now - lastRockTimeRef.current > 1000) {
                  rainbowRef.current = !rainbowRef.current
                  lastRockTimeRef.current = now
                  for(let i=0;i<20;i++) {
                     particlesRef.current.push({
                        x: tipX, y: tipY,
                        vx: (Math.random()-0.5)*15, vy: (Math.random()-0.5)*15,
                        life: 1, size: Math.random()*4+2,
                        color: rainbowRef.current ? `hsl(${Math.random()*360}, 100%, 50%)` : colorRef.current
                     })
                  }
                }
              }

              // 4. Drawing Logic
              if (stickyDrawRef.current || isEraser) {
                // First point in new stroke
                if (fullStrokePointsRef.current.length === 0) {
                   canvasBackupRef.current = dCtx.getImageData(0, 0, cw, ch)
                   activeDrawColorRef.current = rainbowRef.current && !isEraser ? `hsl(${hueRef.current}, 100%, 50%)` : colorRef.current
                }

                const lastPt = lastDrawnRef.current
                if (lastPt && dist(lastPt, { x: tipX, y: tipY }) < deadZone) {
                  // Wait
                } else {
                  pointsRef.current.push({ x: tipX, y: tipY })
                  fullStrokePointsRef.current.push({ x: tipX, y: tipY })
                  if (pointsRef.current.length > 5) pointsRef.current = pointsRef.current.slice(-5)

                  if (pointsRef.current.length >= 2) {
                    if (rainbowRef.current && !isEraser) {
                      hueRef.current = (hueRef.current + 2) % 360
                      activeDrawColorRef.current = `hsl(${hueRef.current}, 100%, 50%)`
                    }
                    drawSmoothStroke(dCtx, pointsRef.current, activeDrawColorRef.current, sizeRef.current, isEraser, mode)
                    
                    if (!isEraser && mode === 'art' && Math.random() > 0.4) {
                      particlesRef.current.push({
                        x: tipX, y: tipY,
                        vx: (Math.random()-0.5)*4, vy: (Math.random()-0.5)*4,
                        life: 1, size: Math.random()*2+1, color: activeDrawColorRef.current
                      })
                    }
                  }
                  lastDrawnRef.current = { x: tipX, y: tipY }
                }
              } else {
                 // Stroke ended
                 if (fullStrokePointsRef.current.length > 0) {
                    if (smartShapeRef.current && !isEraser) {
                       // Try recognizing shape
                       if (canvasBackupRef.current) {
                         dCtx.putImageData(canvasBackupRef.current, 0, 0)
                         const recognized = recognizeAndDrawShape(
                           dCtx, 
                           fullStrokePointsRef.current, 
                           activeDrawColorRef.current, 
                           sizeRef.current, 
                           false, 
                           mode === 'art'
                         )
                         if (recognized) {
                            // spawn particles for shape recognize success
                            const p = fullStrokePointsRef.current[0]
                            for(let i=0; i<20; i++) {
                              particlesRef.current.push({
                                x: p.x, y: p.y,
                                vx: (Math.random()-0.5)*20, vy: (Math.random()-0.5)*20,
                                life: 1.5, size: Math.random()*6+2, color: '#facc15'
                              })
                            }
                         } else {
                            // Restore the drawn rough stroke
                            drawSmoothStroke(dCtx, fullStrokePointsRef.current, activeDrawColorRef.current, sizeRef.current, false, mode)
                         }
                       }
                    }
                    fullStrokePointsRef.current = []
                    canvasBackupRef.current = null
                 }
                 pointsRef.current = []
                 lastDrawnRef.current = null
              }

              // 5. Palm Clear
              if (gesture === 'open_palm') {
                if (!palmHoldRef.current.active) {
                  palmHoldRef.current = { active: true, start: now }
                } else if (now - palmHoldRef.current.start > 1200) {
                  clearDrawing()
                  palmHoldRef.current = { active: true, start: now + 99999 }
                }
                const prog = Math.min((now - palmHoldRef.current.start) / 1200, 1)
                if (prog > 0 && prog < 1) {
                  const oCtx = overlayRef.current.getContext('2d')
                  oCtx.beginPath()
                  oCtx.arc(tipX, tipY, 35, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2)
                  oCtx.strokeStyle = '#06b6d4'
                  oCtx.lineWidth = 5
                  oCtx.lineCap = 'round'
                  oCtx.stroke()
                }
              } else {
                palmHoldRef.current = { active: false, start: 0 }
              }

            } else {
              handLostFramesRef.current++
              if (handLostFramesRef.current > 15) {
                latestLandmarksRef.current = null
                smoothRef.current.init = false
                pointsRef.current = []
                lastDrawnRef.current = null
                pinchStartRef.current = null
                fullStrokePointsRef.current = []
                canvasBackupRef.current = null
                setCurrentGesture('none')
              }
            }
          }
          aiRafRef.current = requestAnimationFrame(detect)
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
      if (aiRafRef.current) cancelAnimationFrame(aiRafRef.current)
      if (renderRafRef.current) cancelAnimationFrame(renderRafRef.current)
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
      if (landmarkerRef.current) landmarkerRef.current.close()
    }
  }, [facingMode, clearDrawing, renderLoop])

  const switchCamera = useCallback(() => {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    if (aiRafRef.current) cancelAnimationFrame(aiRafRef.current)
    if (renderRafRef.current) cancelAnimationFrame(renderRafRef.current)
    if (landmarkerRef.current) { landmarkerRef.current.close(); landmarkerRef.current = null }
    smoothRef.current = { x: 0, y: 0, init: false }
    pointsRef.current = []
    lastDrawnRef.current = null
    latestLandmarksRef.current = null
    pinchStartRef.current = null
    fullStrokePointsRef.current = []
    canvasBackupRef.current = null
    setIsLoading(true)
    setFacingMode(f => f === 'user' ? 'environment' : 'user')
  }, [])

  const gi = {
    point: { emoji: '☝️', label: 'Start Draw', color: 'text-emerald-400', bg: 'bg-emerald-500/20 border-emerald-500/30' },
    peace: { emoji: '✌️', label: 'Eraser', color: 'text-rose-400', bg: 'bg-rose-500/20 border-rose-500/30' },
    fist: { emoji: '✊', label: 'Stop Draw', color: 'text-amber-400', bg: 'bg-amber-500/20 border-amber-500/30' },
    open_palm: { emoji: '🖐️', label: 'Clear Canvas', color: 'text-cyan-400', bg: 'bg-cyan-500/20 border-cyan-500/30' },
    rock: { emoji: '🤘', label: 'Rainbow Mode', color: 'text-purple-400', bg: 'bg-purple-500/20 border-purple-500/30' },
    pinch: { emoji: '🤏', label: 'Shape Tool', color: 'text-yellow-400', bg: 'bg-yellow-500/20 border-yellow-500/30' },
    none: { emoji: '👋', label: 'Show hand', color: 'text-slate-400', bg: 'bg-slate-500/20 border-slate-500/30' }
  }
  
  const displayState = currentGesture === 'none' && stickyDrawRef.current ? 
    { emoji: '✨', label: 'Drawing...', color: 'text-emerald-400', bg: 'bg-emerald-500/20 border-emerald-500/30' } : 
    (gi[currentGesture] || gi.none)

  return (
    <div ref={containerRef} className={`min-h-screen bg-slate-950 text-slate-300 font-sans flex flex-col ${isFullscreen ? 'fixed inset-0 z-[9999]' : ''}`}>
      <header className="border-b border-slate-800 bg-slate-900/80 px-4 py-3 flex items-center justify-between sticky top-0 z-20 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/camp')} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🌌</span>
            <div>
              <h1 className="text-white font-bold tracking-tight text-sm sm:text-base">Space Glow Canvas</h1>
              <div className="text-[10px] text-cyan-400 font-mono">VISION_AI_LAB_V4</div>
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
        <div className="flex-1 relative bg-slate-950 flex items-center justify-center overflow-hidden">
          {/* Subtle star background */}
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 mix-blend-screen pointer-events-none z-0"></div>
          
          <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover opacity-60" style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }} playsInline muted />
          <canvas ref={drawRef} className="absolute inset-0 w-full h-full object-cover pointer-events-none z-10" style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }} />
          <canvas ref={overlayRef} className="absolute inset-0 w-full h-full object-cover pointer-events-none z-20" style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }} />

          {isLoading && (
            <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center z-30">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-4xl mb-6 animate-pulse shadow-lg shadow-cyan-500/50">🌌</div>
              <div className="w-48 h-1.5 bg-slate-800 rounded-full overflow-hidden mb-4">
                <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full" style={{ animation: 'ld 2s ease-in-out infinite' }} />
              </div>
              <p className="text-slate-400 text-sm font-medium">{loadingMsg}</p>
              <style>{`@keyframes ld{0%{width:0}50%{width:80%}100%{width:100%}}`}</style>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center z-30 p-8 text-center">
              <div className="text-5xl mb-4">⚠️</div>
              <h2 className="text-white text-xl font-bold mb-2">Camera Access Required</h2>
              <p className="text-slate-400 text-sm max-w-sm mb-6">{error}</p>
              <button onClick={() => window.location.reload()} className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-white font-bold rounded-xl transition-colors">Try Again</button>
            </div>
          )}

          {!isLoading && !error && (
            <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-30 px-5 py-2.5 rounded-full border backdrop-blur-md shadow-xl ${displayState.bg} flex items-center gap-3 transition-all duration-300`}>
              <span className="text-2xl drop-shadow-lg">{displayState.emoji}</span>
              <span className={`text-base font-extrabold ${displayState.color} drop-shadow-md`}>{displayState.label}</span>
            </div>
          )}
        </div>

        <div className="lg:w-72 xl:w-80 bg-slate-900/95 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col overflow-y-auto z-30">
          <div className="p-4 border-b border-slate-800 flex flex-col gap-3 bg-gradient-to-br from-slate-800/50 to-slate-900/50">
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Drawing Mode</h3>
            <div className="flex bg-slate-950 rounded-xl p-1 border border-slate-800">
              <button 
                onClick={() => setDrawMode('art')} 
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${drawMode === 'art' ? 'bg-cyan-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                ✨ Art Brush
              </button>
              <button 
                onClick={() => setDrawMode('write')} 
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${drawMode === 'write' ? 'bg-rose-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                ✍️ Writing Pen
              </button>
            </div>
            <label className="flex items-center gap-2 cursor-pointer mt-1">
              <input type="checkbox" checked={smartShape} onChange={(e) => setSmartShape(e.target.checked)} className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500" />
              <span className="text-xs font-medium text-slate-300">🤖 AI Smart Shape Snap</span>
            </label>
          </div>

          {showGuide && (
            <div className="p-4 border-b border-slate-800 bg-gradient-to-r from-cyan-500/10 to-purple-500/10">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Advanced Controls</h3>
                <button onClick={() => setShowGuide(false)} className="text-slate-500 hover:text-white text-xs">Hide</button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                {[{e:'☝️',t:'Point',d:'Start Draw'},{e:'🤏',t:'Pinch',d:'Shape Drag'},{e:'🤘',t:'Rock',d:'Rainbow Glow'},{e:'🖐️',t:'Palm',d:'Clear (hold)'}].map(i=>(
                  <div key={i.t} className="bg-slate-950/60 rounded-xl p-2 border border-slate-700/50 text-center shadow-inner">
                    <div className="text-xl mb-1">{i.e}</div>
                    <div className="font-bold text-slate-200">{i.t}</div>
                    <div className="text-slate-400">{i.d}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-4 border-b border-slate-800">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Pinch Shape (Drag Tool)</h3>
            <div className="grid grid-cols-4 gap-2">
              {SHAPES.map(s => (
                <button key={s} onClick={() => setSelectedShape(s)}
                  className={`flex items-center justify-center p-2 rounded-xl transition-all ${selectedShape===s?'bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]':'bg-slate-800 border border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                  {s === 'circle' && '⭕'}
                  {s === 'square' && '⬜'}
                  {s === 'star' && '⭐'}
                  {s === 'heart' && '💖'}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 border-b border-slate-800">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Glow Color</h3>
            <div className="flex flex-wrap gap-2">
              {COLORS.map(c=>(
                <button key={c} onClick={()=>setSelectedColor(c)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${selectedColor===c?'border-white scale-110':'border-slate-700 hover:border-slate-500'}`}
                  style={{background:c, boxShadow: selectedColor===c && drawMode==='art' ? `0 0 15px ${c}` : 'none'}} />
              ))}
            </div>
          </div>

          <div className="p-4 border-b border-slate-800">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Brush Size</h3>
            <div className="flex items-center gap-3">
              {BRUSH_SIZES.map(s=>(
                <button key={s} onClick={()=>setBrushSize(s)}
                  className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all ${brushSize===s?'bg-cyan-500/20 border border-cyan-500/40':'bg-slate-800 border border-slate-700 hover:border-slate-500'}`}>
                  <div className="rounded-full bg-white shadow-[0_0_10px_white]" style={{width:s+2,height:s+2}} />
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 space-y-2 mt-auto">
            {!showGuide && <button onClick={()=>setShowGuide(true)} className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-sm font-bold rounded-xl text-slate-300 transition-colors border border-slate-700">📖 Show Guide</button>}
            <button onClick={clearDrawing} className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-sm font-bold rounded-xl text-slate-300 transition-colors border border-slate-700">🗑️ Clear Canvas</button>
            <button onClick={exportDrawing} className="w-full py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-sm font-bold rounded-xl text-white transition-all shadow-lg shadow-purple-500/30">📥 Download Art</button>
          </div>
        </div>
      </div>
    </div>
  )
}
