import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Rocket, Heart, Play, Crosshair, ShieldAlert, CheckCircle2, Zap } from 'lucide-react'

export default function SpaceShooterGame({ gameData, onComplete }) {
  const [gameState, setGameState] = useState('intro') // intro, get_ready, playing, level_transition, game_over, victory
  const [countdown, setCountdown] = useState(3)
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0)
  const [hp, setHp] = useState(3)
  const [levelResult, setLevelResult] = useState(null) // 'success' or 'fail'
  const [renderTick, setRenderTick] = useState(0) // Used to force React render
  
  const playerXRef = useRef(50)
  const bulletsRef = useRef([])
  const asteroidsRef = useRef([])

  const gameLoopRef = useRef()
  const lastTimeRef = useRef()
  const keysRef = useRef({})
  const bulletIdRef = useRef(0)
  const lastFireTimeRef = useRef(0)
  const hpRef = useRef(3)

  // Level Data
  const levelData = gameData?.levels[currentLevelIdx]

  // Initialize Asteroids for the current level
  const spawnAsteroids = useCallback(() => {
    if (!levelData) return
    asteroidsRef.current = levelData.options.map((opt, i) => ({
      id: i,
      x: 12.5 + (i * 25), // 12.5, 37.5, 62.5, 87.5
      y: -20 - (Math.random() * 20), // Start slightly above screen
      text: opt,
      isCorrect: i === levelData.correctAnswerIndex,
      destroyed: false
    }))
    setRenderTick(prev => prev + 1)
  }, [levelData])

  useEffect(() => {
    if (gameState === 'get_ready') {
      setCountdown(3)
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer)
            setGameState('playing')
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [gameState])

  useEffect(() => {
    if (gameState === 'playing' && asteroidsRef.current.length === 0) {
      spawnAsteroids()
    }
  }, [gameState, currentLevelIdx, spawnAsteroids])

  // Key Listeners
  useEffect(() => {
    const handleKeyDown = (e) => { keysRef.current[e.code] = true }
    const handleKeyUp = (e) => { keysRef.current[e.code] = false }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  // Main Game Loop
  useEffect(() => {
    if (gameState !== 'playing') return

    const loop = (time) => {
      if (!lastTimeRef.current) lastTimeRef.current = time
      const dt = time - lastTimeRef.current
      lastTimeRef.current = time

      // Movement
      const moveSpeed = 0.05 * dt // % per ms
      if (keysRef.current['ArrowLeft'] || keysRef.current['KeyA']) {
        playerXRef.current = Math.max(5, playerXRef.current - moveSpeed)
      }
      if (keysRef.current['ArrowRight'] || keysRef.current['KeyD']) {
        playerXRef.current = Math.min(95, playerXRef.current + moveSpeed)
      }

      // Firing
      if (keysRef.current['Space']) {
        if (time - lastFireTimeRef.current > 300) { // 300ms cooldown
          bulletsRef.current.push({ id: bulletIdRef.current++, x: playerXRef.current, y: 90, hit: false })
          lastFireTimeRef.current = time
        }
      }

      // Update Bullets
      bulletsRef.current = bulletsRef.current
        .map(b => ({ ...b, y: b.y - (0.1 * dt) }))
        .filter(b => b.y > -10 && !b.hit)

      // Update Asteroids & Collision
      let levelCompleted = false
      let tookDamage = false
      let allPassedBottom = true

      asteroidsRef.current = asteroidsRef.current.map(a => {
        if (a.destroyed) return a
        const newY = a.y + (0.015 * dt)
        if (newY < 100) allPassedBottom = false
        if (newY > 100) {
           return { ...a, y: newY, destroyed: true }
        }
        return { ...a, y: newY }
      })

      // If all passed, trigger respawn
      if (allPassedBottom && asteroidsRef.current.length > 0) {
        asteroidsRef.current = [] // clear so useEffect spawns them
      }

      // Collision Detection (Bullets vs Asteroids)
      bulletsRef.current.forEach(b => {
        asteroidsRef.current.forEach(a => {
          if (a.destroyed || b.hit) return
          
          if (Math.abs(b.x - a.x) < 12 && Math.abs(b.y - a.y) < 8) {
            b.hit = true
            a.destroyed = true
            
            if (a.isCorrect) {
              levelCompleted = true
            } else {
              tookDamage = true
            }
          }
        })
      })
      
      // Cleanup hit bullets
      bulletsRef.current = bulletsRef.current.filter(b => !b.hit)

      if (levelCompleted || tookDamage) {
        setGameState('level_transition')
        
        if (levelCompleted) {
          setLevelResult('success')
        } else {
          setLevelResult('fail')
          hpRef.current -= 1
          setHp(hpRef.current)
        }

        setTimeout(() => {
          bulletsRef.current = []
          asteroidsRef.current = []
          
          if (hpRef.current <= 0) {
            setGameState('game_over')
          } else {
            setCurrentLevelIdx(prev => {
              const nextIdx = prev + 1
              if (nextIdx < gameData.levels.length) {
                setGameState('get_ready')
                return nextIdx
              } else {
                setGameState('victory')
                setTimeout(() => {
                  if (onComplete) onComplete()
                }, 3000)
                return prev
              }
            })
          }
        }, 3000) // Give them 3 seconds to read the correct answer
      }

      setRenderTick(prev => prev + 1)
      gameLoopRef.current = requestAnimationFrame(loop)
    }

    gameLoopRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(gameLoopRef.current)
  }, [gameState, gameData, currentLevelIdx, onComplete])

  // Mobile Controls
  const handleMobileFire = () => {
    const now = performance.now()
    if (now - lastFireTimeRef.current > 300) {
      bulletsRef.current.push({ id: bulletIdRef.current++, x: playerXRef.current, y: 90, hit: false })
      lastFireTimeRef.current = now
    }
  }

  const handleMobileMove = (dir) => {
    const loop = () => {
      playerXRef.current += (dir * 1.5)
      if (playerXRef.current < 5) playerXRef.current = 5
      if (playerXRef.current > 95) playerXRef.current = 95
      
      setRenderTick(prev => prev + 1)
      
      if (keysRef.current['mobileMove']) {
        requestAnimationFrame(loop)
      }
    }
    keysRef.current['mobileMove'] = true
    requestAnimationFrame(loop)
  }

  const stopMobileMove = () => {
    keysRef.current['mobileMove'] = false
  }

  const handleStart = () => {
    hpRef.current = 3
    setHp(3)
    setCurrentLevelIdx(0)
    playerXRef.current = 50
    bulletsRef.current = []
    asteroidsRef.current = []
    setGameState('get_ready')
  }

  if (!gameData || !gameData.levels) return null

  return (
    <div className="w-full h-full flex flex-col relative animate-fade-in overflow-hidden bg-[#0a001a] font-sans rounded-2xl border-4 border-indigo-900 shadow-[inset_0_0_150px_rgba(49,46,129,0.8)]">
      
      {/* Background Starfield */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 animate-[slide_20s_linear_infinite]" style={{ backgroundSize: '400px' }} />
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/50 via-transparent to-purple-900/50" />

      {/* HUD - Always visible */}
      <div className="relative z-30 px-6 py-4 flex justify-between items-start bg-black/40 backdrop-blur-md border-b border-indigo-500/30">
        <div className="flex gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-pink-400 drop-shadow-md">Shields</span>
            <div className="flex gap-1">
              {[1, 2, 3].map(i => (
                <Heart 
                  key={i} 
                  className={`w-5 h-5 transition-all duration-300 ${i <= hp ? 'text-pink-500 fill-pink-500 drop-shadow-[0_0_8px_rgba(236,72,153,0.8)]' : 'text-slate-800'}`} 
                />
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400 drop-shadow-md">Level</span>
            <span className="text-xl font-black text-white">{currentLevelIdx + 1} / {gameData.levels.length}</span>
          </div>
        </div>
        <div className="text-right">
          <h3 className="text-xl font-black font-display text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-indigo-400">{gameData.title}</h3>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="relative z-10 flex-1 w-full overflow-hidden">
        
        {/* Question Banner */}
        {(gameState === 'playing' || gameState === 'get_ready') && levelData && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-11/12 max-w-2xl bg-indigo-900/80 backdrop-blur-md border-2 border-indigo-400 rounded-2xl p-4 text-center shadow-[0_0_30px_rgba(99,102,241,0.4)] z-50">
            <h2 className="text-xl sm:text-2xl font-bold text-white">{levelData.question}</h2>
          </div>
        )}

        {/* Get Ready Overlay */}
        {gameState === 'get_ready' && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center z-40">
            <h3 className="text-3xl text-indigo-300 font-bold mb-4 uppercase tracking-widest drop-shadow-lg">Read the question!</h3>
            <div className="text-8xl font-black text-white animate-ping">
              {countdown}
            </div>
          </div>
        )}

        {/* Asteroids / Meteors */}
        {gameState === 'playing' && asteroidsRef.current.map(asteroid => !asteroid.destroyed && (
          <div 
            key={`asteroid-${asteroid.id}`}
            className="absolute flex flex-col items-center justify-center transition-transform duration-75 z-10"
            style={{
              width: '22%',
              left: `${asteroid.x}%`,
              top: `${asteroid.y}%`,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <div className="relative w-full aspect-square max-w-[100px] flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-b from-orange-500 to-red-600 rounded-full opacity-20 blur-md animate-pulse" />
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-slate-700 to-slate-900 border-2 border-orange-500 rounded-full flex items-center justify-center shadow-[inset_0_0_15px_rgba(0,0,0,0.8)] relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cracked-earth.png')] opacity-40 mix-blend-overlay" />
                <span className="relative z-10 text-white font-bold text-center text-xs sm:text-sm px-2 line-clamp-3 leading-tight drop-shadow-md">
                  {asteroid.text}
                </span>
              </div>
              <div className="absolute -top-4 w-1/2 h-10 bg-gradient-to-t from-orange-500/50 to-transparent blur-md -z-10" />
            </div>
          </div>
        ))}

        {/* Bullets */}
        {bulletsRef.current.map(bullet => (
          <div 
            key={`bullet-${bullet.id}`}
            className="absolute w-2 h-8 bg-cyan-400 rounded-full shadow-[0_0_15px_rgba(34,211,238,1)] z-10"
            style={{
              left: `${bullet.x}%`,
              top: `${bullet.y}%`,
              transform: 'translate(-50%, -50%)'
            }}
          />
        ))}

        {/* Player Ship */}
        {(gameState === 'playing' || gameState === 'level_transition' || gameState === 'get_ready') && (
          <div 
            className="absolute bottom-6 flex items-center justify-center transition-transform duration-75 z-20"
            style={{
              left: `${playerXRef.current}%`,
              transform: 'translate(-50%, 0)'
            }}
          >
            {/* Engine Glow */}
            <div className="absolute -bottom-4 w-6 h-12 bg-gradient-to-b from-cyan-400 to-transparent blur-md opacity-80 animate-pulse" />
            
            <div className="w-16 h-16 bg-slate-900 border-2 border-cyan-400 rounded-t-full flex items-center justify-center shadow-[0_0_20px_rgba(34,211,238,0.5)] relative overflow-hidden">
              <Rocket className="w-8 h-8 text-cyan-300 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]" />
              {/* Glass Canopy */}
              <div className="absolute top-1 w-6 h-6 bg-cyan-200/30 rounded-full blur-[2px]" />
            </div>
          </div>
        )}

        {/* Overlays */}
        {gameState === 'intro' && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center z-50 p-6 text-center border-8 border-indigo-900/50">
            <div className="w-28 h-28 bg-indigo-900/50 rounded-full flex items-center justify-center border-4 border-indigo-400 shadow-[0_0_50px_rgba(99,102,241,0.5)] mb-8">
              <Rocket className="w-14 h-14 text-indigo-300" />
            </div>
            <h2 className="text-5xl font-black mb-4 font-display text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-purple-400 uppercase tracking-widest">{gameData.title}</h2>
            <p className="text-slate-300 text-lg mb-8 max-w-xl bg-slate-900/80 p-4 rounded-xl border border-indigo-500/30">{gameData.backgroundStory}</p>
            
            <div className="text-sm text-indigo-200 mb-8 font-bold">
              <p>Controls: <kbd className="bg-slate-800 px-2 py-1 rounded">Left/Right Arrows</kbd> to move. <kbd className="bg-slate-800 px-2 py-1 rounded">Spacebar</kbd> to fire.</p>
              <p className="mt-2 text-pink-400">Shoot the meteor with the correct answer!</p>
            </div>

            <button 
              onClick={handleStart}
              className="px-12 py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xl rounded-2xl shadow-[0_0_40px_rgba(79,70,229,0.6)] transition-all hover:scale-105 uppercase tracking-widest"
            >
              Launch Ship
            </button>
          </div>
        )}

        {gameState === 'level_transition' && (
          <div className={`absolute inset-0 ${levelResult === 'success' ? 'bg-emerald-950/80' : 'bg-red-950/90'} backdrop-blur-md flex flex-col items-center justify-center z-50 p-6 text-center animate-fade-in`}>
            {levelResult === 'success' ? (
              <>
                <CheckCircle2 className="w-32 h-32 text-emerald-400 mb-6 drop-shadow-[0_0_30px_rgba(52,211,153,0.6)]" />
                <h2 className="text-5xl font-black text-emerald-400 mb-4 font-display uppercase tracking-wider">Direct Hit!</h2>
                <p className="text-emerald-200 text-xl max-w-md">{levelData.successText}</p>
              </>
            ) : (
              <>
                <ShieldAlert className="w-32 h-32 text-red-500 mb-6 drop-shadow-[0_0_30px_rgba(239,68,68,0.6)]" />
                <h2 className="text-5xl font-black text-red-500 mb-4 font-display uppercase tracking-wider">Incorrect!</h2>
                <p className="text-red-200 text-xl max-w-md mb-6">{levelData.failText}</p>
                <div className="bg-slate-900/80 p-4 border border-red-500/50 rounded-xl max-w-md w-full">
                  <p className="text-sm text-slate-400 uppercase font-bold tracking-widest mb-1">Correct Answer Was:</p>
                  <p className="text-emerald-400 font-black text-xl">{levelData.options[levelData.correctAnswerIndex]}</p>
                </div>
              </>
            )}
          </div>
        )}

        {gameState === 'game_over' && (
          <div className="absolute inset-0 bg-red-950/90 backdrop-blur-md flex flex-col items-center justify-center z-50 p-6 text-center animate-fade-in border-8 border-red-900">
            <ShieldAlert className="w-24 h-24 text-red-500 mb-6 animate-pulse" />
            <h2 className="text-5xl font-black text-red-500 mb-4 font-display uppercase">Ship Destroyed</h2>
            <p className="text-red-200 text-xl mb-10">You were hit by an incorrect meteor.</p>
            <button 
              onClick={handleStart}
              className="px-10 py-4 bg-red-600 hover:bg-red-500 text-white font-black text-lg rounded-xl shadow-lg transition-all uppercase tracking-widest"
            >
              Retry Mission
            </button>
          </div>
        )}

        {gameState === 'victory' && (
          <div className="absolute inset-0 bg-indigo-950/90 backdrop-blur-xl flex flex-col items-center justify-center z-50 p-6 text-center animate-slide-up border-8 border-indigo-500">
            <Zap className="w-32 h-32 text-cyan-400 mb-8 drop-shadow-[0_0_40px_rgba(34,211,238,0.8)]" />
            <h2 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-cyan-200 to-indigo-400 mb-6 font-display uppercase tracking-wider">Galaxy Saved!</h2>
            <p className="text-indigo-100 text-xl mb-8 max-w-lg">You correctly destroyed all the hostile meteors.</p>
            <div className="inline-flex items-center gap-2 bg-pink-500/20 border border-pink-500/50 px-8 py-4 rounded-full text-pink-400 font-black text-2xl uppercase tracking-widest">
              +50 XP
            </div>
          </div>
        )}

      </div>

      {/* Mobile Controls Overlay */}
      {gameState === 'playing' && (
        <div className="sm:hidden relative z-40 bg-black/60 backdrop-blur-md p-4 flex justify-between items-center border-t border-indigo-900/50">
          <div className="flex gap-2">
            <button 
              onPointerDown={() => handleMobileMove(-1)}
              onPointerUp={stopMobileMove}
              onPointerLeave={stopMobileMove}
              className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center border-2 border-slate-600 active:bg-indigo-600 active:border-indigo-400"
            >
              <div className="w-0 h-0 border-y-[10px] border-y-transparent border-r-[15px] border-r-white" />
            </button>
            <button 
              onPointerDown={() => handleMobileMove(1)}
              onPointerUp={stopMobileMove}
              onPointerLeave={stopMobileMove}
              className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center border-2 border-slate-600 active:bg-indigo-600 active:border-indigo-400"
            >
              <div className="w-0 h-0 border-y-[10px] border-y-transparent border-l-[15px] border-l-white" />
            </button>
          </div>
          <button 
            onPointerDown={handleMobileFire}
            className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center border-4 border-red-400 shadow-[0_0_20px_rgba(239,68,68,0.6)] active:scale-95 transition-transform"
          >
            <Crosshair className="w-8 h-8 text-white" />
          </button>
        </div>
      )}

    </div>
  )
}
