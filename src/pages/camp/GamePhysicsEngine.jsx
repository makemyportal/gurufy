import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

const DEFAULT_CODE = `// Game Physics Configuration
// Tweak the values below to help the player clear ALL obstacles!

const config = {
  gravity: 0.8,        // How fast the player falls (Try: 0.5)
  jumpStrength: -12,   // Upward force when jumping (Negative = up, Try: -14)
  playerSpeed: 4,      // Forward speed (Try: 5)
  doubleJump: false    // Can the player jump twice? (Try: true)
};

return config;
`

export default function GamePhysicsEngine() {
  const navigate = useNavigate()
  const canvasRef = useRef(null)
  const [code, setCode] = useState(DEFAULT_CODE)
  const [error, setError] = useState("")
  const [score, setScore] = useState(0)
  const [gameLevel, setGameLevel] = useState(1)
  const [gameState, setGameState] = useState('idle')
  const requestRef = useRef()
  
  // Game state refs
  const stateRef = useRef({
    player: { x: 50, y: 300, vy: 0, width: 25, height: 25 },
    obstacles: [
      { x: 350, y: 280, width: 35, height: 50 },
      { x: 600, y: 290, width: 30, height: 40 }
    ],
    coins: [
      { x: 250, y: 260, collected: false },
      { x: 450, y: 240, collected: false },
      { x: 700, y: 260, collected: false }
    ],
    config: { gravity: 0.8, jumpStrength: -12, playerSpeed: 4, doubleJump: false },
    groundY: 330,
    hasJumped: false,
    jumpCount: 0,
    coinScore: 0
  })

  // Apply code to config
  const applyCode = () => {
    try {
      setError("")
      // Safely evaluate the config object
      // eslint-disable-next-line no-new-func
      const getConfig = new Function(code)
      const newConfig = getConfig()
      
      if (typeof newConfig !== 'object' || !('gravity' in newConfig)) {
        throw new Error("Code must return a valid config object.")
      }

      stateRef.current.config = newConfig
      resetGame()
      setGameState('playing')
    } catch (err) {
      setError(err.message)
    }
  }

  const resetGame = () => {
    stateRef.current.player = { x: 50, y: 300, vy: 0, width: 25, height: 25 }
    stateRef.current.obstacles = [
      { x: 350, y: 280, width: 35, height: 50 },
      { x: 600, y: 290, width: 30, height: 40 }
    ]
    stateRef.current.coins = [
      { x: 250, y: 260, collected: false },
      { x: 450, y: 240, collected: false },
      { x: 700, y: 260, collected: false }
    ]
    stateRef.current.hasJumped = false
    stateRef.current.jumpCount = 0
    stateRef.current.coinScore = 0
    setScore(0)
    setGameState('idle')
    drawFrame()
  }

  const jump = () => {
    if (gameState !== 'playing') return
    const s = stateRef.current
    const onGround = s.player.y + s.player.height >= s.groundY
    const canDoubleJump = s.config.doubleJump && s.jumpCount < 2
    if (onGround || canDoubleJump) {
      s.player.vy = s.config.jumpStrength
      s.hasJumped = true
      s.jumpCount++
    }
  }

  const updatePhysics = () => {
    const s = stateRef.current
    const p = s.player
    const o = s.obstacle
    const c = s.config

    // Apply gravity
    p.vy += c.gravity
    p.y += p.vy
    p.x += c.playerSpeed

    // Ground collision
    if (p.y + p.height > s.groundY) {
      p.y = s.groundY - p.height
      p.vy = 0
      s.jumpCount = 0
    }

    // Check all obstacles
    for (const o of s.obstacles) {
      const hitObstacle = (
        p.x < o.x + o.width &&
        p.x + p.width > o.x &&
        p.y < o.y + o.height &&
        p.y + p.height > o.y
      )
      if (hitObstacle) {
        setGameState('lost')
        return false
      }
    }

    // Collect coins
    s.coins.forEach(coin => {
      if (!coin.collected) {
        const dist = Math.hypot(p.x - coin.x, p.y - coin.y)
        if (dist < 25) {
          coin.collected = true
          s.coinScore++
          setScore(s.coinScore)
        }
      }
    })

    // Win condition (passed all obstacles)
    const lastObstacle = s.obstacles[s.obstacles.length - 1]
    if (p.x > lastObstacle.x + lastObstacle.width + 80) {
      setGameState('won')
      return false
    }

    return true
  }

  const drawFrame = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const s = stateRef.current

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw Sky
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
    gradient.addColorStop(0, '#1e293b') // slate-800
    gradient.addColorStop(1, '#0f172a') // slate-900
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw Ground
    ctx.fillStyle = '#334155' // slate-700
    ctx.fillRect(0, s.groundY, canvas.width, canvas.height - s.groundY)
    
    // Draw Grid (tech feel)
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'
    ctx.lineWidth = 1
    for(let i=0; i<canvas.width; i+=40) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
    }
    for(let i=0; i<canvas.height; i+=40) {
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke();
    }

    // Draw Obstacles (Neon Red)
    s.obstacles.forEach(o => {
      ctx.fillStyle = '#ef4444'
      ctx.shadowColor = '#ef4444'
      ctx.shadowBlur = 15
      ctx.fillRect(o.x, o.y, o.width, o.height)
    })

    // Draw Coins
    s.coins.forEach(coin => {
      if (!coin.collected) {
        ctx.fillStyle = '#fbbf24'
        ctx.shadowColor = '#fbbf24'
        ctx.shadowBlur = 12
        ctx.beginPath()
        ctx.arc(coin.x, coin.y, 8, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#92400e'
        ctx.shadowBlur = 0
        ctx.font = 'bold 10px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('$', coin.x, coin.y + 4)
      }
    })

    // Draw Player (Neon Green)
    ctx.fillStyle = '#10b981'
    ctx.shadowColor = '#10b981'
    ctx.shadowBlur = s.hasJumped ? 20 : 10
    ctx.fillRect(s.player.x, s.player.y, s.player.width, s.player.height)
    
    // Score display
    ctx.shadowBlur = 0
    ctx.fillStyle = '#fbbf24'
    ctx.font = 'bold 16px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('Coins: ' + s.coinScore + '/3', 15, 30)
    
    // Reset shadow
    ctx.shadowBlur = 0
  }

  const gameLoop = () => {
    if (gameState === 'playing') {
      const continueGame = updatePhysics()
      drawFrame()
      if (continueGame) {
        requestRef.current = requestAnimationFrame(gameLoop)
      }
    }
  }

  useEffect(() => {
    if (gameState === 'playing') {
      requestRef.current = requestAnimationFrame(gameLoop)
    }
    return () => cancelAnimationFrame(requestRef.current)
  }, [gameState])

  // Initial draw
  useEffect(() => {
    drawFrame()
    
    // Setup spacebar for jump
    const handleKeyDown = (e) => {
      if (e.code === 'Space') {
        e.preventDefault()
        jump()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [gameState])


  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-sans flex flex-col selection:bg-indigo-500/30">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 p-4 flex items-center justify-between backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/camp')} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div className="flex items-center gap-3">
            <span className="text-2xl">👾</span>
            <div>
              <h1 className="text-white font-bold tracking-tight">Game Physics Engine</h1>
              <div className="flex items-center gap-2 text-xs text-indigo-400 font-mono">
                ENGINE_VERSION: 1.0.4
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Panel: Code Editor */}
        <div className="w-1/3 flex flex-col border-r border-slate-800 bg-[#1e1e1e]">
          <div className="p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider font-mono">1. Code Editor</span>
            <button 
              onClick={applyCode}
              className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold px-4 py-1.5 rounded-md text-sm transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Run Code
            </button>
          </div>
          
          <div className="px-4 py-3 bg-slate-800/50 border-b border-slate-800 text-xs text-slate-400">
            <strong>Teacher Tip:</strong> Just like the real world, video games use numbers for physics. Change the numbers below to see what happens!
          </div>

          <div className="flex-1 relative">
            <textarea 
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full h-full bg-[#1e1e1e] text-[#d4d4d4] font-mono text-sm p-6 focus:outline-none resize-none leading-relaxed"
              spellCheck="false"
            />
          </div>
          
          {error && (
            <div className="p-4 bg-red-950/50 border-t border-red-900/50 text-red-400 text-sm font-mono">
              ❌ {error}
            </div>
          )}
        </div>

        {/* Right Panel: Game Canvas */}
        <div className="w-2/3 flex flex-col bg-slate-950 relative">
          
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 flex gap-4">
             {gameState === 'idle' && (
              <div className="px-6 py-2 rounded-full bg-slate-800/80 border border-slate-700 text-white font-bold backdrop-blur-sm animate-pulse">
                Click 'Run Code' to start the engine
              </div>
            )}
            {gameState === 'playing' && (
              <div className="px-6 py-2 rounded-full bg-indigo-500/20 border border-indigo-500/50 text-indigo-300 font-bold backdrop-blur-sm">
                Press [SPACE] to Jump!
              </div>
            )}
            {gameState === 'won' && (
              <div className="px-6 py-2 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 font-bold backdrop-blur-sm flex items-center gap-2">
                🎉 Level Cleared! Perfect Physics.
                <button onClick={resetGame} className="ml-2 underline text-xs">Reset</button>
              </div>
            )}
            {gameState === 'lost' && (
              <div className="px-6 py-2 rounded-full bg-red-500/20 border border-red-500/50 text-red-400 font-bold backdrop-blur-sm flex items-center gap-2">
                💥 Collision Detected! Tweak the variables.
                <button onClick={resetGame} className="ml-2 underline text-xs">Try Again</button>
              </div>
            )}
          </div>

          <div className="flex-1 flex items-center justify-center p-8">
            <div className="relative rounded-2xl overflow-hidden border border-slate-700 shadow-2xl shadow-indigo-500/10">
              <canvas 
                ref={canvasRef} 
                width={800} 
                height={500} 
                className="bg-slate-900 block"
              />
              
              {/* Overlay controls for touch/mouse users */}
              {gameState === 'playing' && (
                <button 
                  onPointerDown={(e) => { e.preventDefault(); jump(); }}
                  className="absolute bottom-6 right-6 w-20 h-20 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white/50 font-bold active:scale-95 backdrop-blur-sm transition-all"
                >
                  JUMP
                </button>
              )}
            </div>
          </div>

          <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex flex-col gap-2 text-sm text-slate-400">
            <div>
              <strong className="text-slate-300">Mission:</strong> Change the code on the left so the green player clears ALL red obstacles and collects coins!
            </div>
            <div>
              <strong className="text-slate-300">Coins Collected:</strong> <span className="text-yellow-400 font-bold">{score}/3</span> | <strong className="text-slate-300">Tip:</strong> Try setting <code className="text-indigo-400">doubleJump: true</code> to jump in mid-air!
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
