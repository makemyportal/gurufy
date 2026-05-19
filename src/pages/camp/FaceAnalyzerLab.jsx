import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Maximize2, Loader2, Brain, Activity, ScanFace, CheckCircle2 } from 'lucide-react'

export default function FaceAnalyzerLab() {
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  
  const [isLoading, setIsLoading] = useState(true)
  const [loadingMsg, setLoadingMsg] = useState('Loading AI Vision Models...')
  const [emotion, setEmotion] = useState('Neutral')
  const [blendshapes, setBlendshapes] = useState([])
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [faceDetected, setFaceDetected] = useState(false)

  const landmarkerRef = useRef(null)
  const streamRef = useRef(null)
  const rafRef = useRef(null)

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen()
    }
  }

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  useEffect(() => {
    let cancelled = false
    async function init() {
      try {
        setLoadingMsg('Downloading AI Vision Models...')
        const vision = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/vision_bundle.mjs')
        if (cancelled) return
        const { FilesetResolver, FaceLandmarker } = vision
        
        const fs = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm"
        )
        if (cancelled) return
        setLoadingMsg('Configuring Face Landmarker...')
        
        const faceLandmarker = await FaceLandmarker.createFromOptions(fs, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
            delegate: "GPU"
          },
          outputFaceBlendshapes: true,
          runningMode: "VIDEO",
          numFaces: 1
        })
        if (cancelled) return
        landmarkerRef.current = faceLandmarker
        
        setLoadingMsg('Requesting Camera Access...')
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 1280, height: 720, facingMode: 'user' } 
        })
        if (cancelled) return
        streamRef.current = stream
        
        const video = videoRef.current
        if (video) {
          video.srcObject = stream
          await new Promise(resolve => {
            if (video.readyState >= 1) resolve()
            else video.onloadedmetadata = () => resolve()
          })
          if (cancelled) return
          await video.play()
          setIsLoading(false)
          startDetection()
        }
      } catch (err) {
        console.error(err)
        if (!cancelled) {
          setLoadingMsg(`Error: ${err.message}. Please allow camera access.`)
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
  }, [])

  const startDetection = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    const lm = landmarkerRef.current
    if (!video || !canvas || !lm) return

    const ctx = canvas.getContext('2d')
    let lastVideoTime = -1

    const detect = () => {
      if (video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime
        
        // Ensure canvas matches video size exactly
        if (canvas.width !== video.videoWidth) {
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
        }

        const results = lm.detectForVideo(video, performance.now())
        
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        
        if (results.faceLandmarks && results.faceLandmarks.length > 0) {
          setFaceDetected(true)
          const marks = results.faceLandmarks[0]
          
          // Draw Mesh
          ctx.save()
          ctx.fillStyle = '#06b6d4'
          for (let i = 0; i < marks.length; i++) {
            const x = marks[i].x * canvas.width
            const y = marks[i].y * canvas.height
            // Only draw a subset of points to look cool but not cluttered
            if (i % 3 === 0) {
              ctx.beginPath()
              ctx.arc(x, y, 1.5, 0, 2 * Math.PI)
              ctx.fill()
            }
          }
          ctx.restore()

          // Process Emotions via Blendshapes
          if (results.faceBlendshapes && results.faceBlendshapes.length > 0) {
            const shapes = results.faceBlendshapes[0].categories
            
            // Map useful shapes for UI display
            const topShapes = shapes
              .filter(s => s.score > 0.1)
              .sort((a,b) => b.score - a.score)
              .slice(0, 10)
            
            setBlendshapes(topShapes)

            // Emotion Heuristic
            const getScore = (name) => shapes.find(s => s.categoryName === name)?.score || 0
            
            const smileL = getScore('mouthSmileLeft')
            const smileR = getScore('mouthSmileRight')
            const jawOpen = getScore('jawOpen')
            const browUp = getScore('browInnerUp')
            const browDown = getScore('browDownLeft') + getScore('browDownRight')

            if (smileL > 0.4 && smileR > 0.4) {
              setEmotion('Happy 😊')
            } else if (jawOpen > 0.25 && browUp > 0.4) {
              setEmotion('Surprised 😲')
            } else if (browDown > 0.8) {
              setEmotion('Angry 😠')
            } else {
              setEmotion('Neutral 😐')
            }
          }
        } else {
          setFaceDetected(false)
          setBlendshapes([])
          setEmotion('No Face Detected')
        }
      }
      rafRef.current = requestAnimationFrame(detect)
    }
    detect()
  }

  return (
    <div ref={containerRef} className={`min-h-screen bg-slate-950 text-slate-300 font-sans flex flex-col ${isFullscreen ? 'fixed inset-0 z-[9999]' : ''}`}>
      <header className="border-b border-slate-800 bg-slate-900/80 p-4 flex items-center justify-between sticky top-0 z-20 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/camp')} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
              <ScanFace size={20} />
            </div>
            <div>
              <h1 className="text-white font-bold tracking-tight">Emotion Face Analyzer</h1>
              <div className="text-xs text-cyan-400 font-mono">COMPUTER_VISION_LAB</div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={toggleFullscreen} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors" title="Fullscreen">
            <Maximize2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden p-6 gap-6 bg-[#0a0a0f]">
        
        {/* Left Side: Camera View */}
        <div className="flex-[2] relative rounded-3xl overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl flex items-center justify-center">
          {isLoading ? (
            <div className="flex flex-col items-center text-center p-8">
              <Loader2 className="w-12 h-12 text-cyan-500 animate-spin mb-4" />
              <div className="text-white font-bold text-lg mb-2">{loadingMsg}</div>
              <p className="text-slate-400 text-sm max-w-sm">Downloading MediaPipe Vision models and accessing webcam.</p>
            </div>
          ) : (
            <>
              {/* The video element is visually hidden, but needs to be mounted for processing */}
              <video 
                ref={videoRef} 
                className="absolute inset-0 w-full h-full object-cover -scale-x-100" 
                playsInline 
                muted
              />
              {/* The canvas displays both the flipped video frame (via CSS filter or just transparent overlay over the video) 
                  Wait, if video is visible and canvas is on top, we get better performance than drawing video to canvas. */}
              <canvas 
                ref={canvasRef} 
                className="absolute inset-0 w-full h-full object-cover -scale-x-100 z-10" 
              />
              
              {!faceDetected && (
                <div className="absolute inset-0 z-20 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center border-2 border-dashed border-red-500/50 m-8 rounded-3xl">
                  <ScanFace className="w-16 h-16 text-red-500 mb-4 animate-pulse" />
                  <div className="text-red-400 font-bold text-xl uppercase tracking-widest">Searching for Target</div>
                  <div className="text-slate-400 text-sm mt-2">Please look directly into the camera</div>
                </div>
              )}
            </>
          )}

          {/* HUD Overlay */}
          {!isLoading && (
            <div className="absolute top-6 left-6 z-20">
              <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-xl p-3 flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${faceDetected ? 'bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]' : 'bg-red-500'}`}></div>
                <div className="font-mono text-sm font-bold text-white uppercase tracking-wider">
                  {faceDetected ? 'Face Lock: Active' : 'Scan: Offline'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: AI Brain Data Stream */}
        <div className="flex-1 max-w-[400px] flex flex-col gap-6">
          {/* Detected Emotion Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-[40px] group-hover:bg-cyan-500/20 transition-colors pointer-events-none"></div>
            
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-widest mb-4">
              <Brain size={16} />
              Primary Emotion
            </div>
            
            <div className="text-4xl font-black text-white tracking-tight">
              {emotion}
            </div>
            
            <p className="text-xs text-slate-500 mt-4 leading-relaxed">
              The AI calculates your primary emotion by analyzing specific micro-expressions in real-time.
            </p>
          </div>

          {/* Micro-Expressions Data Stream */}
          <div className="flex-1 bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-widest">
                <Activity size={16} />
                Live Blendshapes
              </div>
              <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping"></span>
                STREAMING
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
              {blendshapes.length > 0 ? (
                blendshapes.map((shape, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                      <span>{shape.categoryName.replace(/_/g, ' ')}</span>
                      <span className="text-indigo-400">{(shape.score * 100).toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-500 rounded-full transition-all duration-75"
                        style={{ width: `${shape.score * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-3">
                  <Activity className="w-8 h-8 opacity-50" />
                  <div className="text-xs uppercase font-bold tracking-wider">Awaiting Data</div>
                </div>
              )}
            </div>
          </div>
          
          <style dangerouslySetInnerHTML={{__html: `
            .custom-scrollbar::-webkit-scrollbar { width: 4px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
          `}} />
        </div>

      </div>
    </div>
  )
}
