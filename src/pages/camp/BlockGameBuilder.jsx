import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

export default function BlockGameBuilder() {
  const navigate = useNavigate()
  
  // Game Logic Blocks
  const [blocks, setBlocks] = useState([
    { id: 1, event: 'Key_Up', action: 'Accelerate' },
    { id: 2, event: 'Key_Left', action: 'Steer_Left' }
  ])

  // New Block State
  const [newEvent, setNewEvent] = useState('Key_Right')
  const [newAction, setNewAction] = useState('Steer_Right')

  // Playing state (React state so button re-renders)
  const [isPlaying, setIsPlaying] = useState(false)

  // Refs for game loop
  const canvasRef = useRef(null)
  const requestRef = useRef(null)
  const keysRef = useRef({})
  const blocksRef = useRef(blocks)
  const isPlayingRef = useRef(false)
  const carRef = useRef({ x: 200, y: 350, angle: 0, speed: 0 })

  // Keep blocksRef in sync
  useEffect(() => {
    blocksRef.current = blocks
  }, [blocks])

  // Keep isPlayingRef in sync
  useEffect(() => {
    isPlayingRef.current = isPlaying
  }, [isPlaying])

  // Keyboard listeners
  useEffect(() => {
    const handleKeyDown = (e) => {
      keysRef.current[e.code] = true
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault()
      }
    }
    const handleKeyUp = (e) => {
      keysRef.current[e.code] = false
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  // Draw function
  const drawGame = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const car = carRef.current
    const playing = isPlayingRef.current

    // Background
    ctx.fillStyle = '#1e293b'
    ctx.fillRect(0, 0, 400, 400)

    // Grass edges
    ctx.fillStyle = '#064e3b'
    ctx.fillRect(0, 0, 100, 400)
    ctx.fillRect(300, 0, 100, 400)

    // Grass texture lines
    ctx.strokeStyle = '#065f46'
    ctx.lineWidth = 1
    for (let i = 0; i < 400; i += 15) {
      ctx.beginPath()
      ctx.moveTo(10 + (i % 30), i)
      ctx.lineTo(20 + (i % 20), i + 10)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(310 + (i % 30), i)
      ctx.lineTo(320 + (i % 20), i + 10)
      ctx.stroke()
    }

    // Road center dashes (animate when playing)
    ctx.strokeStyle = '#94a3b8'
    ctx.setLineDash([20, 20])
    ctx.lineWidth = 3
    const dashOffset = playing ? (Date.now() / 8) % 40 : 0
    ctx.lineDashOffset = -dashOffset
    ctx.beginPath()
    ctx.moveTo(200, 0)
    ctx.lineTo(200, 400)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.lineDashOffset = 0

    // Road edge lines
    ctx.strokeStyle = '#f59e0b'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(100, 0)
    ctx.lineTo(100, 400)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(300, 0)
    ctx.lineTo(300, 400)
    ctx.stroke()

    // Draw Car
    ctx.save()
    ctx.translate(car.x, car.y)
    ctx.rotate(car.angle)
    
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)'
    ctx.fillRect(-9, -18, 20, 40)

    // Car body
    ctx.fillStyle = '#ef4444'
    ctx.beginPath()
    ctx.roundRect(-12, -22, 24, 44, 4)
    ctx.fill()

    // Roof
    ctx.fillStyle = '#dc2626'
    ctx.fillRect(-8, -8, 16, 16)

    // Windshield
    ctx.fillStyle = '#7dd3fc'
    ctx.fillRect(-7, -14, 14, 8)

    // Rear window
    ctx.fillStyle = '#7dd3fc'
    ctx.fillRect(-7, 8, 14, 6)

    // Wheels
    ctx.fillStyle = '#1e293b'
    ctx.fillRect(-14, -18, 4, 10)
    ctx.fillRect(10, -18, 4, 10)
    ctx.fillRect(-14, 10, 4, 10)
    ctx.fillRect(10, 10, 4, 10)

    // Headlights
    ctx.fillStyle = '#fbbf24'
    ctx.fillRect(-8, -22, 5, 3)
    ctx.fillRect(3, -22, 5, 3)

    ctx.restore()

    // Speed indicator
    if (playing) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)'
      ctx.fillRect(10, 360, 80, 30)
      ctx.strokeStyle = '#334155'
      ctx.strokeRect(10, 360, 80, 30)
      ctx.fillStyle = '#94a3b8'
      ctx.font = '10px monospace'
      ctx.textAlign = 'left'
      ctx.fillText('SPEED', 16, 374)
      ctx.fillStyle = '#10b981'
      ctx.font = 'bold 12px monospace'
      ctx.fillText(Math.abs(car.speed * 20).toFixed(0) + ' km/h', 16, 386)

      // On grass warning
      if (car.x < 100 || car.x > 300) {
        ctx.fillStyle = 'rgba(239,68,68,0.15)'
        ctx.fillRect(0, 0, 400, 400)
        ctx.fillStyle = '#fca5a5'
        ctx.font = 'bold 16px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('⚠ ON GRASS!', 200, 30)
      }
    }

    // Overlay when not playing
    if (!playing) {
      ctx.fillStyle = 'rgba(0,0,0,0.65)'
      ctx.fillRect(0, 0, 400, 400)

      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 22px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('🏎️ Block Code Racing', 200, 170)

      ctx.fillStyle = '#94a3b8'
      ctx.font = '14px sans-serif'
      ctx.fillText('Click "Start Engine" to play!', 200, 210)
      ctx.fillText('Use Arrow Keys to drive.', 200, 235)
    }
  }, [])

  // Game loop
  useEffect(() => {
    const loop = () => {
      const car = carRef.current
      const keys = keysRef.current
      const currentBlocks = blocksRef.current

      if (isPlayingRef.current) {
        let wantsAccelerate = false
        let wantsBrake = false
        let turnDir = 0
        const onGrass = car.x < 100 || car.x > 300

        currentBlocks.forEach(block => {
          let met = false
          if (block.event === 'Key_Up' && keys['ArrowUp']) met = true
          if (block.event === 'Key_Down' && keys['ArrowDown']) met = true
          if (block.event === 'Key_Left' && keys['ArrowLeft']) met = true
          if (block.event === 'Key_Right' && keys['ArrowRight']) met = true
          if (block.event === 'Hit_Grass' && onGrass) met = true

          if (met) {
            if (block.action === 'Accelerate') wantsAccelerate = true
            if (block.action === 'Brake') wantsBrake = true
            if (block.action === 'Steer_Left') turnDir = -1
            if (block.action === 'Steer_Right') turnDir = 1
            if (block.action === 'Slow_Down') car.speed *= 0.92
            if (block.action === 'Spin_Out') {
              car.angle += 0.15
              car.speed *= 0.93
            }
          }
        })

        if (wantsAccelerate) {
          car.speed = Math.min(car.speed + 0.08, 4)
        } else if (wantsBrake) {
          car.speed = Math.max(car.speed - 0.15, -2)
        } else {
          car.speed *= 0.97
        }

        if (Math.abs(car.speed) > 0.15) {
          car.angle += turnDir * 0.04 * (car.speed > 0 ? 1 : -1)
        }

        car.x += Math.sin(car.angle) * car.speed
        car.y -= Math.cos(car.angle) * car.speed

        // Wrap vertically, clamp horizontally
        if (car.y < -30) car.y = 430
        if (car.y > 430) car.y = -30
        car.x = Math.max(0, Math.min(400, car.x))
      }

      drawGame()
      requestRef.current = requestAnimationFrame(loop)
    }

    requestRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(requestRef.current)
  }, [drawGame])

  const addBlock = () => {
    setBlocks(prev => [...prev, { id: Date.now(), event: newEvent, action: newAction }])
  }

  const removeBlock = (id) => {
    setBlocks(prev => prev.filter(b => b.id !== id))
  }

  const togglePlay = () => {
    setIsPlaying(prev => !prev)
  }

  const resetCar = () => {
    carRef.current.x = 200
    carRef.current.y = 350
    carRef.current.angle = 0
    carRef.current.speed = 0
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-sans flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 p-4 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/camp')} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏎️</span>
            <div>
              <h1 className="text-white font-bold tracking-tight">Block Code Studio: Racing</h1>
              <div className="text-xs text-yellow-500 font-mono">GAME_DEV_ENVIRONMENT</div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 p-6 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left: Logic Editor */}
        <div className="flex flex-col gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              1. Logic Blocks Editor
            </h2>
            <p className="text-xs text-yellow-300 mb-6 bg-yellow-500/10 p-3 rounded-lg border border-yellow-500/20">
              <strong>Teacher Tip:</strong> Games are just rules! Tell the computer what happens <em>(Action)</em> when something occurs <em>(When)</em>. If you don't add a rule to turn left, the car won't turn left!
            </p>

            {/* Active Blocks */}
            <div className="space-y-3 mb-6">
              {blocks.map((block) => (
                <div key={block.id} className="flex items-center gap-2 bg-slate-800/50 p-3 rounded-xl border border-slate-700">
                  <div className="flex-1 flex flex-wrap items-center gap-2 text-sm">
                    <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-md font-bold border border-blue-500/30">
                      When: {block.event.replace(/_/g, ' ')}
                    </span>
                    <span className="text-slate-500 font-black">➔</span>
                    <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-md font-bold border border-emerald-500/30">
                      Do: {block.action.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <button 
                    onClick={() => removeBlock(block.id)}
                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
                    title="Delete this rule"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              ))}
              {blocks.length === 0 && (
                <div className="text-center py-6 text-slate-500 border-2 border-dashed border-slate-700 rounded-xl">
                  ⚠️ No logic blocks! The car won't do anything! Add rules below.
                </div>
              )}
            </div>

            {/* Add Block Form */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <h3 className="text-sm font-bold text-slate-400 mb-3">➕ Add New Rule</h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <select 
                  value={newEvent}
                  onChange={e => setNewEvent(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-blue-400 focus:outline-none focus:border-blue-500"
                >
                  <option value="Key_Up">When [Up Arrow] pressed</option>
                  <option value="Key_Down">When [Down Arrow] pressed</option>
                  <option value="Key_Left">When [Left Arrow] pressed</option>
                  <option value="Key_Right">When [Right Arrow] pressed</option>
                  <option value="Hit_Grass">When [Car hits Grass]</option>
                </select>
                <select
                  value={newAction}
                  onChange={e => setNewAction(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-emerald-400 focus:outline-none focus:border-emerald-500"
                >
                  <option value="Accelerate">Drive Forward</option>
                  <option value="Brake">Brake / Reverse</option>
                  <option value="Steer_Left">Steer Left</option>
                  <option value="Steer_Right">Steer Right</option>
                  <option value="Slow_Down">Slow Down (Friction)</option>
                  <option value="Spin_Out">Spin Out of Control!</option>
                </select>
                <button 
                  onClick={addBlock}
                  className="bg-yellow-500 hover:bg-yellow-600 text-slate-900 font-bold px-5 py-2.5 rounded-lg transition-colors whitespace-nowrap"
                >
                  Add Block
                </button>
              </div>
            </div>
          </div>

          {/* Quick Challenge Cards */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white mb-3">🎯 Try These Challenges!</h3>
            <div className="space-y-2 text-xs text-slate-400">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <strong className="text-emerald-400">Easy:</strong> Add rules so you can drive forward and steer both left & right.
              </div>
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <strong className="text-yellow-400">Medium:</strong> Add a "Brake" rule for the Down arrow so you can stop.
              </div>
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <strong className="text-red-400">Hard:</strong> Add a rule: When [Car hits Grass] → [Spin Out]. Then try to stay on the road!
              </div>
            </div>
          </div>
        </div>

        {/* Right: Game Canvas */}
        <div className="flex flex-col gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex-1 flex flex-col items-center">
            <div className="w-full flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                2. Test Your Game
              </h2>
              <div className="flex gap-2">
                <button 
                  onClick={resetCar}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold rounded-lg transition-colors"
                >
                  Respawn
                </button>
                <button 
                  onClick={togglePlay}
                  className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-colors ${isPlaying ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30' : 'bg-emerald-500 hover:bg-emerald-600 text-white'}`}
                >
                  {isPlaying ? '⏹ Stop Engine' : '▶ Start Engine'}
                </button>
              </div>
            </div>

            <div className="p-2 bg-slate-950 rounded-2xl border border-slate-800 shadow-inner">
              <canvas 
                ref={canvasRef}
                width={400} 
                height={400} 
                className="bg-black rounded-xl border border-slate-800 block"
                style={{ width: '100%', maxWidth: '400px', aspectRatio: '1/1' }}
              />
            </div>
            
            <div className="mt-4 text-center space-y-2">
              <p className="text-xs text-slate-500">
                💡 <strong>Goal:</strong> Add rules on the left → Click "Start Engine" → Drive with Arrow Keys!
              </p>
              <div className="flex justify-center gap-1">
                <span className="w-8 h-8 bg-slate-800 border border-slate-700 rounded text-xs flex items-center justify-center text-slate-400">↑</span>
              </div>
              <div className="flex justify-center gap-1">
                <span className="w-8 h-8 bg-slate-800 border border-slate-700 rounded text-xs flex items-center justify-center text-slate-400">←</span>
                <span className="w-8 h-8 bg-slate-800 border border-slate-700 rounded text-xs flex items-center justify-center text-slate-400">↓</span>
                <span className="w-8 h-8 bg-slate-800 border border-slate-700 rounded text-xs flex items-center justify-center text-slate-400">→</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
