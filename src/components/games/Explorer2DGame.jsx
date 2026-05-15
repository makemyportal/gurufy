import React, { useState, useEffect, useCallback } from 'react'
import { Trophy, Heart, Skull, Play, Map, ArrowUp, ArrowDown, ArrowLeft, ArrowRight as ArrowRightIcon, Sparkles } from 'lucide-react'

// Map layout: 0 = floor, 1 = wall, 2 = exit
const INITIAL_MAP = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,1,0,0,0,0,0,0,1,0,0,0,1],
  [1,0,1,0,1,0,1,1,1,1,0,1,0,1,0,1],
  [1,0,1,0,0,0,0,0,0,1,0,0,0,1,0,1],
  [1,0,1,1,1,1,1,1,0,1,1,1,0,1,0,1],
  [1,0,0,0,0,0,0,1,0,0,0,1,0,1,0,1],
  [1,1,1,1,1,1,0,1,1,1,0,1,0,1,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,1,1,1,1,1,1,1,1,1,1,0,1],
  [1,0,0,0,0,0,1,2,2,1,0,0,0,0,0,1],
  [1,1,1,1,1,0,1,2,2,1,0,1,1,1,1,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
]

const ROWS = 12
const COLS = 16

const PLAYER_START = { x: 1, y: 1 }

export default function Explorer2DGame({ gameData, onComplete }) {
  const [gameState, setGameState] = useState('intro') 
  const [player, setPlayer] = useState({ x: PLAYER_START.x, y: PLAYER_START.y, hp: 3 })
  const [enemies, setEnemies] = useState([])
  const [activeEnemy, setActiveEnemy] = useState(null)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [questionResult, setQuestionResult] = useState(null)
  const [playerDirection, setPlayerDirection] = useState('down')

  useEffect(() => {
    if (!gameData || !gameData.levels || gameState !== 'intro') return

    const floorTiles = []
    for(let r = 0; r < ROWS; r++) {
      for(let c = 0; c < COLS; c++) {
        if (INITIAL_MAP[r][c] === 0 && !(r === PLAYER_START.y && c === PLAYER_START.x)) {
          floorTiles.push({ x: c, y: r })
        }
      }
    }

    floorTiles.sort(() => Math.random() - 0.5)

    const newEnemies = gameData.levels.map((level, i) => {
      const pos = floorTiles[i % floorTiles.length]
      return {
        id: i,
        x: pos.x,
        y: pos.y,
        data: level,
        defeated: false,
        monsterEmoji: ['👿', '👹', '👺', '👾', '👽', '👻', '🐉'][i % 7]
      }
    })
    setEnemies(newEnemies)
  }, [gameData, gameState])

  const handleMove = useCallback((dx, dy) => {
    if (gameState !== 'playing') return

    if (dx === 1) setPlayerDirection('right')
    if (dx === -1) setPlayerDirection('left')
    if (dy === 1) setPlayerDirection('down')
    if (dy === -1) setPlayerDirection('up')

    setPlayer(prev => {
      const nx = prev.x + dx
      const ny = prev.y + dy

      if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) return prev
      if (INITIAL_MAP[ny][nx] === 1) return prev

      if (INITIAL_MAP[ny][nx] === 2) {
        const allDefeated = enemies.every(e => e.defeated)
        if (allDefeated) {
          setGameState('victory')
          setTimeout(() => {
            if (onComplete) onComplete()
          }, 3000)
        }
        return prev
      }

      const enemy = enemies.find(e => !e.defeated && e.x === nx && e.y === ny)
      if (enemy) {
        setActiveEnemy(enemy)
        setGameState('question')
        return prev 
      }

      return { ...prev, x: nx, y: ny }
    })
  }, [gameState, enemies, onComplete])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowUp' || e.key === 'w') handleMove(0, -1)
      if (e.key === 'ArrowDown' || e.key === 's') handleMove(0, 1)
      if (e.key === 'ArrowLeft' || e.key === 'a') handleMove(-1, 0)
      if (e.key === 'ArrowRight' || e.key === 'd') handleMove(1, 0)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleMove])

  const handleStart = () => {
    setPlayer({ x: PLAYER_START.x, y: PLAYER_START.y, hp: 3 })
    setPlayerDirection('down')
    setGameState('playing')
  }

  const handleAnswer = (index) => {
    setSelectedAnswer(index)
    setTimeout(() => {
      if (index === activeEnemy.data.correctAnswerIndex) {
        setQuestionResult('success')
        setEnemies(prev => prev.map(e => e.id === activeEnemy.id ? { ...e, defeated: true } : e))
      } else {
        setQuestionResult('fail')
        setPlayer(prev => {
          const newHp = prev.hp - 1
          if (newHp <= 0) {
            setTimeout(() => setGameState('game_over'), 1500)
          }
          return { ...prev, hp: newHp }
        })
      }
    }, 1000)
  }

  const handleCloseQuestion = () => {
    setSelectedAnswer(null)
    setQuestionResult(null)
    setActiveEnemy(null)
    if (player.hp > 0) {
      setGameState('playing')
    }
  }

  if (!gameData || !gameData.levels) return null

  const cellWidth = `${100 / COLS}%`
  const cellHeight = `${100 / ROWS}%`

  const getRotation = () => {
    switch (playerDirection) {
      case 'left': return 'scaleX(-1)'
      case 'right': return 'scaleX(1)'
      case 'up': return 'translateY(-2px)'
      case 'down': return 'translateY(2px)'
      default: return 'none'
    }
  }

  return (
    <div className="w-full h-full flex flex-col relative animate-fade-in text-white overflow-hidden bg-gradient-to-br from-[#0f172a] to-[#020617] font-sans rounded-2xl shadow-[inset_0_0_100px_rgba(0,0,0,0.8)]">
      
      {/* HUD Panel with beautiful glassmorphism */}
      <div className="relative z-30 px-6 py-4 flex justify-between items-start bg-gradient-to-b from-black/60 to-transparent border-b border-white/5 backdrop-blur-md">
        <div className="flex gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400/80 drop-shadow-md">Health</span>
            <div className="flex gap-1.5 bg-black/40 border border-white/10 px-3 py-2 rounded-xl backdrop-blur-md shadow-inner">
              {[1, 2, 3].map(i => (
                <Heart 
                  key={i} 
                  className={`w-5 h-5 transition-all duration-300 ${i <= player.hp ? 'text-red-500 fill-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)] scale-110' : 'text-slate-700/50 scale-90'}`} 
                />
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-400/80 drop-shadow-md">Monsters</span>
            <div className="flex gap-2 items-center bg-black/40 border border-white/10 px-4 py-2 rounded-xl backdrop-blur-md shadow-inner">
              <Skull className="w-5 h-5 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
              <span className="text-xl font-black text-white leading-none">
                {enemies.filter(e => !e.defeated).length}
              </span>
            </div>
          </div>
        </div>
        <div className="text-right flex flex-col items-end justify-center">
          <h3 className="text-2xl font-black font-display text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-cyan-300 drop-shadow-lg">{gameData.title}</h3>
          <p className="text-xs text-emerald-500/70 font-bold uppercase tracking-widest flex items-center gap-1">
            <Map className="w-3 h-3" /> 2D Adventure Mode
          </p>
        </div>
      </div>

      {/* Main Rendering Area */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-2 sm:p-4 w-full h-full">
        
        {/* The Game Grid container */}
        <div className="relative w-full max-w-5xl aspect-[4/3] bg-[#2A3B32] border-[12px] border-[#1e293b] rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.7)] ring-4 ring-black/50">
          
          {/* Subtle grid lines background overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:6.25%_8.333%]" />

          {/* Map Tiles Rendering */}
          {INITIAL_MAP.map((row, rIndex) => (
            <div key={rIndex} className="flex h-[8.333%] w-full">
              {row.map((cell, cIndex) => {
                const isWall = cell === 1;
                const isExit = cell === 2;
                return (
                  <div 
                    key={`${rIndex}-${cIndex}`} 
                    className={`h-full w-[6.25%] relative ${
                      isWall ? 'bg-[#3E2723] z-20' : 
                      isExit ? 'bg-amber-900/40' : 
                      'bg-[#4CAF50] z-0'
                    }`}
                  >
                    {/* Visual styling for floors (Grass pattern) */}
                    {!isWall && !isExit && (
                      <div className={`absolute inset-0 opacity-40 ${((rIndex+cIndex)%2 === 0) ? 'bg-[#388E3C]' : 'bg-[#2E7D32]'}`} />
                    )}

                    {/* Visual styling for walls (Stone/Brick block) */}
                    {isWall && (
                      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-80 border-t-2 border-l-2 border-white/10 border-b-4 border-r-2 border-black/60 shadow-lg" />
                    )}

                    {/* Exit Portal */}
                    {isExit && (
                      <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                        <div className="w-full h-full bg-gradient-to-t from-amber-500 to-yellow-300 animate-pulse opacity-60" />
                        <Sparkles className="absolute w-1/2 h-1/2 text-white animate-spin-slow drop-shadow-[0_0_10px_white]" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}

          {/* Enemies Render */}
          {enemies.map((enemy, idx) => !enemy.defeated && (
            <div 
              key={`enemy-${enemy.id}`}
              className="absolute flex items-center justify-center transition-all duration-300 z-20 hover:scale-110"
              style={{
                width: cellWidth,
                height: cellHeight,
                left: `${enemy.x * (100/COLS)}%`,
                top: `${enemy.y * (100/ROWS)}%`
              }}
            >
              {/* Monster Drop Shadow */}
              <div className="absolute bottom-1 w-[60%] h-[20%] bg-black/50 rounded-full blur-[2px]" />
              
              {/* Monster Sprite */}
              <div className="relative text-3xl sm:text-4xl filter drop-shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-bounce" style={{ animationDuration: `${1 + Math.random()}s` }}>
                {enemy.monsterEmoji}
              </div>
            </div>
          ))}

          {/* Player Render */}
          <div 
            className="absolute flex items-center justify-center transition-all duration-200 z-30"
            style={{
              width: cellWidth,
              height: cellHeight,
              left: `${player.x * (100/COLS)}%`,
              top: `${player.y * (100/ROWS)}%`
            }}
          >
            {/* Player Drop Shadow */}
            <div className="absolute bottom-1 w-[60%] h-[20%] bg-black/60 rounded-full blur-[2px]" />
            
            {/* Player Sprite */}
            <div 
              className="relative text-3xl sm:text-4xl filter drop-shadow-[0_0_15px_rgba(16,185,129,0.8)] transition-transform duration-200"
              style={{ transform: getRotation() }}
            >
              🧙‍♂️
            </div>
          </div>

          {/* Intro Overlay */}
          {gameState === 'intro' && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center z-50 p-6 text-center animate-fade-in border-[12px] border-emerald-500/20">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-emerald-500 blur-[40px] opacity-40 rounded-full animate-pulse" />
                <div className="w-28 h-28 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-full flex items-center justify-center border-4 border-white shadow-2xl relative z-10">
                  <span className="text-6xl">🧙‍♂️</span>
                </div>
              </div>
              <h2 className="text-4xl sm:text-5xl font-black mb-4 font-display text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-cyan-300 drop-shadow-lg">{gameData.title}</h2>
              <p className="text-slate-300 text-lg sm:text-xl leading-relaxed mb-8 max-w-2xl">{gameData.backgroundStory}</p>
              
              <div className="bg-slate-900/80 p-5 rounded-2xl mb-8 flex flex-col items-center gap-3 border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                <p className="text-emerald-400 font-bold uppercase tracking-widest text-sm mb-2">Mission Objectives</p>
                <div className="text-left text-sm text-slate-300 space-y-2 font-medium">
                  <p className="flex items-center gap-2"><ArrowRightIcon className="w-4 h-4 text-emerald-500" /> Use <span className="bg-slate-800 px-2 py-0.5 rounded text-white">W A S D</span> or <span className="bg-slate-800 px-2 py-0.5 rounded text-white">Arrows</span> to move.</p>
                  <p className="flex items-center gap-2"><ArrowRightIcon className="w-4 h-4 text-red-400" /> Touch monsters to battle them in a quiz duel.</p>
                  <p className="flex items-center gap-2"><ArrowRightIcon className="w-4 h-4 text-amber-400" /> Defeat all monsters to unlock the Golden Portal.</p>
                </div>
              </div>

              <button 
                onClick={handleStart}
                className="px-10 py-5 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black font-black text-xl rounded-2xl shadow-[0_0_40px_rgba(16,185,129,0.6)] transition-all hover:scale-110 flex items-center gap-3"
              >
                <Play className="w-6 h-6 fill-current" /> Enter The Realm
              </button>
            </div>
          )}

          {/* Question Modal Overlay */}
          {gameState === 'question' && activeEnemy && (
            <div className="absolute inset-0 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center z-50 p-4 sm:p-8 animate-fade-in">
              <div className="w-full max-w-2xl bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-red-500/30 rounded-[32px] p-6 sm:p-10 shadow-[0_0_80px_rgba(239,68,68,0.3)] relative overflow-hidden">
                
                {/* Visual Flair */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-50" />
                
                {!questionResult ? (
                  <>
                    <div className="flex flex-col items-center mb-8">
                      <span className="text-6xl animate-bounce mb-4 filter drop-shadow-[0_0_20px_rgba(239,68,68,0.8)]">{activeEnemy.monsterEmoji}</span>
                      <div className="inline-block px-4 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-full text-xs font-black uppercase tracking-widest">
                        {activeEnemy.data.monsterName} approaches!
                      </div>
                    </div>
                    
                    <h3 className="text-2xl sm:text-3xl font-black mb-8 leading-relaxed text-center font-display">{activeEnemy.data.question}</h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {activeEnemy.data.options.map((opt, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleAnswer(idx)}
                          disabled={selectedAnswer !== null}
                          className={`relative p-5 rounded-2xl border-2 transition-all font-bold text-left overflow-hidden group ${
                            selectedAnswer === idx ? 'bg-slate-800 border-slate-500 scale-95' : 'bg-slate-800/50 border-slate-700 hover:border-red-400 hover:bg-slate-800'
                          }`}
                        >
                          {selectedAnswer === null && (
                            <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 via-red-500/10 to-red-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
                          )}
                          <span className="relative z-10">{opt}</span>
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center animate-bounce-in py-10">
                    {questionResult === 'success' ? (
                      <>
                        <div className="w-24 h-24 bg-emerald-500/20 rounded-full border-4 border-emerald-500 flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(16,185,129,0.5)]">
                          <Trophy className="w-12 h-12 text-emerald-400" />
                        </div>
                        <h2 className="text-4xl sm:text-5xl font-black text-emerald-400 mb-4 font-display">Defeated!</h2>
                        <p className="text-slate-300 text-lg sm:text-xl mb-10 max-w-lg mx-auto leading-relaxed">{activeEnemy.data.successText}</p>
                        <button 
                          onClick={handleCloseQuestion}
                          className="px-10 py-4 bg-emerald-500 text-black font-black text-xl rounded-2xl hover:bg-emerald-400 transition-all shadow-[0_0_30px_rgba(16,185,129,0.4)]"
                        >
                          Continue Journey
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="w-24 h-24 bg-red-500/20 rounded-full border-4 border-red-500 flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(239,68,68,0.5)]">
                          <Skull className="w-12 h-12 text-red-400" />
                        </div>
                        <h2 className="text-4xl sm:text-5xl font-black text-red-500 mb-4 font-display">Ouch! You took damage!</h2>
                        <p className="text-slate-300 text-lg sm:text-xl mb-10 max-w-lg mx-auto leading-relaxed">{activeEnemy.data.failText}</p>
                        <button 
                          onClick={handleCloseQuestion}
                          className="px-10 py-4 bg-red-500 text-white font-black text-xl rounded-2xl hover:bg-red-400 transition-all shadow-[0_0_30px_rgba(239,68,68,0.4)]"
                        >
                          Flee & Recover
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Game Over Overlay */}
          {gameState === 'game_over' && (
            <div className="absolute inset-0 bg-red-950/90 backdrop-blur-xl flex flex-col items-center justify-center z-50 p-6 text-center animate-fade-in border-[12px] border-red-900">
              <Skull className="w-32 h-32 text-red-500 mb-8 animate-pulse drop-shadow-[0_0_40px_rgba(239,68,68,0.6)]" />
              <h2 className="text-6xl font-black text-red-500 mb-4 font-display tracking-tight">GAME OVER</h2>
              <p className="text-red-200 text-2xl mb-12 font-medium">Your health reached zero.</p>
              <button 
                onClick={handleStart}
                className="px-10 py-5 bg-red-600 hover:bg-red-500 text-white font-black text-xl rounded-2xl shadow-[0_0_50px_rgba(239,68,68,0.5)] transition-all hover:scale-105"
              >
                Restart Adventure
              </button>
            </div>
          )}

          {/* Victory Overlay */}
          {gameState === 'victory' && (
            <div className="absolute inset-0 bg-emerald-950/90 backdrop-blur-xl flex flex-col items-center justify-center z-50 p-6 text-center animate-slide-up border-[12px] border-emerald-900">
              <div className="relative">
                <div className="absolute inset-0 bg-amber-400 blur-[60px] opacity-50 rounded-full animate-pulse" />
                <Trophy className="relative z-10 w-40 h-40 text-amber-400 mb-8 drop-shadow-[0_0_40px_rgba(251,191,36,0.8)]" />
              </div>
              <h2 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-amber-200 to-amber-500 mb-6 font-display drop-shadow-2xl">MAP CLEARED!</h2>
              <p className="text-emerald-100 text-2xl mb-12 max-w-xl leading-relaxed">You successfully navigated the realm and defeated all monsters.</p>
              
              <div className="inline-flex items-center justify-center gap-3 bg-amber-500/20 border-2 border-amber-500/50 px-8 py-4 rounded-3xl">
                <Sparkles className="w-6 h-6 text-amber-400 animate-spin-slow" />
                <span className="text-amber-400 font-black text-3xl">+50 XP Awarded</span>
              </div>
            </div>
          )}

        </div>

        {/* Mobile D-Pad Controls - Beautifully styled */}
        {gameState === 'playing' && (
          <div className="mt-8 sm:hidden grid grid-cols-3 gap-3 w-64 mx-auto pb-8 z-40 relative">
            <div className="absolute inset-0 bg-black/40 blur-2xl rounded-full" />
            <div />
            <button 
              onClick={() => handleMove(0, -1)} 
              className="bg-slate-800/80 backdrop-blur border border-white/10 p-5 rounded-2xl flex items-center justify-center active:bg-emerald-500 active:scale-95 transition-all shadow-[0_10px_20px_rgba(0,0,0,0.5)] relative z-10"
            >
              <ArrowUp className="w-8 h-8 text-white drop-shadow-md" />
            </button>
            <div />
            <button 
              onClick={() => handleMove(-1, 0)} 
              className="bg-slate-800/80 backdrop-blur border border-white/10 p-5 rounded-2xl flex items-center justify-center active:bg-emerald-500 active:scale-95 transition-all shadow-[0_10px_20px_rgba(0,0,0,0.5)] relative z-10"
            >
              <ArrowLeft className="w-8 h-8 text-white drop-shadow-md" />
            </button>
            <button 
              onClick={() => handleMove(0, 1)} 
              className="bg-slate-800/80 backdrop-blur border border-white/10 p-5 rounded-2xl flex items-center justify-center active:bg-emerald-500 active:scale-95 transition-all shadow-[0_10px_20px_rgba(0,0,0,0.5)] relative z-10"
            >
              <ArrowDown className="w-8 h-8 text-white drop-shadow-md" />
            </button>
            <button 
              onClick={() => handleMove(1, 0)} 
              className="bg-slate-800/80 backdrop-blur border border-white/10 p-5 rounded-2xl flex items-center justify-center active:bg-emerald-500 active:scale-95 transition-all shadow-[0_10px_20px_rgba(0,0,0,0.5)] relative z-10"
            >
              <ArrowRightIcon className="w-8 h-8 text-white drop-shadow-md" />
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
