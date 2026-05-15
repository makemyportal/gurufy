import React, { useState, useEffect } from 'react'
import { Target, Skull, Crosshair, Anchor, ShieldAlert, CheckCircle2, Play, Activity } from 'lucide-react'

const GRID_SIZE = 10; // 10x10 radar grid

export default function BattleshipGame({ gameData, onComplete }) {
  const [gameState, setGameState] = useState('intro') // intro, playing, question, game_over, victory
  const [grid, setGrid] = useState([]) // Array of { x, y, state: 'hidden' | 'miss' | 'hit', levelData: null | obj }
  const [ammo, setAmmo] = useState(25)
  const [activeCell, setActiveCell] = useState(null)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [questionResult, setQuestionResult] = useState(null)

  // Initialize Board
  useEffect(() => {
    if (!gameData || !gameData.levels || gameState !== 'intro') return

    const numShips = gameData.levels.length
    setAmmo(numShips + 15) // Give them enough ammo

    // Create 10x10 empty grid
    let newGrid = []
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        newGrid.push({ x, y, state: 'hidden', levelData: null })
      }
    }

    // Place ships randomly
    const availableIndices = [...Array(GRID_SIZE * GRID_SIZE).keys()]
    // Shuffle
    for (let i = availableIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [availableIndices[i], availableIndices[j]] = [availableIndices[j], availableIndices[i]]
    }

    // Assign level data to random grid cells
    gameData.levels.forEach((level, index) => {
      const gridIndex = availableIndices[index]
      newGrid[gridIndex].levelData = level
    })

    setGrid(newGrid)
  }, [gameData, gameState])

  const handleFire = (cellIndex) => {
    if (gameState !== 'playing') return
    const cell = grid[cellIndex]
    
    // Can't click already hit or missed cells
    if (cell.state !== 'hidden') return

    if (cell.levelData) {
      // Hit a ship! Trigger question
      setActiveCell({ ...cell, index: cellIndex })
      setGameState('question')
    } else {
      // Missed
      const newGrid = [...grid]
      newGrid[cellIndex].state = 'miss'
      setGrid(newGrid)
      
      const newAmmo = ammo - 1
      setAmmo(newAmmo)
      if (newAmmo <= 0) {
        setTimeout(() => setGameState('game_over'), 1000)
      }
    }
  }

  const handleAnswer = (optionIndex) => {
    setSelectedAnswer(optionIndex)
    
    setTimeout(() => {
      if (optionIndex === activeCell.levelData.correctAnswerIndex) {
        setQuestionResult('success')
        
        // Update grid state to hit
        const newGrid = [...grid]
        newGrid[activeCell.index].state = 'hit'
        setGrid(newGrid)

      } else {
        setQuestionResult('fail')
        
        // Penalize ammo but keep cell hidden so they have to try again or remember
        const newAmmo = ammo - 1
        setAmmo(newAmmo)
        if (newAmmo <= 0) {
          setTimeout(() => setGameState('game_over'), 1500)
        }
      }
    }, 1000)
  }

  const handleCloseQuestion = () => {
    setSelectedAnswer(null)
    setQuestionResult(null)
    setActiveCell(null)
    
    // Check win condition
    const hitShips = grid.filter(c => c.state === 'hit').length
    if (hitShips === gameData.levels.length) {
      setGameState('victory')
      setTimeout(() => {
        if (onComplete) onComplete()
      }, 3000)
    } else if (ammo > 0) {
      setGameState('playing')
    }
  }

  const handleStart = () => {
    setGameState('playing')
  }

  if (!gameData || !gameData.levels) return null

  const totalShips = gameData.levels.length
  const hitShips = grid.filter(c => c.state === 'hit').length

  return (
    <div className="w-full h-full flex flex-col relative animate-fade-in text-cyan-50 overflow-hidden bg-slate-950 font-mono rounded-2xl shadow-[inset_0_0_100px_rgba(8,145,178,0.2)] border border-cyan-900/50">
      
      {/* HUD Panel - Radar UI */}
      <div className="relative z-30 px-6 py-4 flex justify-between items-start bg-slate-900/80 border-b border-cyan-500/30 backdrop-blur-xl">
        <div className="flex gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-red-400 drop-shadow-md">Missiles Left</span>
            <div className="flex items-center gap-2 bg-slate-950/80 border border-red-500/30 px-4 py-2 rounded-xl backdrop-blur-md shadow-[inset_0_0_10px_rgba(239,68,68,0.2)]">
              <Crosshair className="w-5 h-5 text-red-500" />
              <span className={`text-2xl font-black ${ammo <= 5 ? 'text-red-500 animate-pulse' : 'text-white'}`}>{ammo}</span>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400 drop-shadow-md">Enemy Ships</span>
            <div className="flex items-center gap-2 bg-slate-950/80 border border-cyan-500/30 px-4 py-2 rounded-xl backdrop-blur-md shadow-[inset_0_0_10px_rgba(6,182,212,0.2)]">
              <Anchor className="w-5 h-5 text-cyan-400" />
              <span className="text-xl font-black text-white">{hitShips} / {totalShips}</span>
            </div>
          </div>
        </div>
        <div className="text-right flex flex-col items-end justify-center">
          <h3 className="text-xl font-black font-display text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-400 drop-shadow-lg max-w-xs truncate">{gameData.title}</h3>
          <p className="text-xs text-cyan-500/70 font-bold uppercase tracking-widest flex items-center gap-1">
            <Activity className="w-3 h-3" /> Naval Combat Radar
          </p>
        </div>
      </div>

      {/* Main Rendering Area */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-4 w-full h-full bg-[radial-gradient(circle_at_center,#083344_0%,#020617_100%)]">
        
        {/* Radar Sweeper Animation (Background) */}
        {gameState === 'playing' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30 mix-blend-screen overflow-hidden">
            <div className="w-[800px] h-[800px] border border-cyan-500/20 rounded-full" />
            <div className="absolute w-[600px] h-[600px] border border-cyan-500/30 rounded-full" />
            <div className="absolute w-[400px] h-[400px] border border-cyan-500/40 rounded-full" />
            <div className="absolute w-full h-1 bg-cyan-500/20" />
            <div className="absolute w-1 h-full bg-cyan-500/20" />
            
            {/* Sweeping line */}
            <div className="absolute w-[400px] h-[400px] rounded-full border-t border-cyan-400 animate-[spin_4s_linear_infinite] origin-bottom-right translate-x-[-50%] translate-y-[-50%]" style={{ background: 'conic-gradient(from 0deg, transparent 75%, rgba(34, 211, 238, 0.4) 100%)' }} />
          </div>
        )}

        {/* The Grid */}
        <div className="relative z-20 w-full max-w-xl aspect-square grid grid-cols-10 grid-rows-10 gap-1 sm:gap-2 p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm border-2 border-cyan-800 rounded-xl shadow-[0_0_50px_rgba(8,145,178,0.2)]">
          {grid.map((cell, idx) => (
            <button
              key={idx}
              onClick={() => handleFire(idx)}
              disabled={gameState !== 'playing' || cell.state !== 'hidden'}
              className={`relative w-full h-full rounded-md sm:rounded-lg border transition-all duration-300 flex items-center justify-center overflow-hidden
                ${cell.state === 'hidden' ? 'bg-cyan-950/40 border-cyan-800/50 hover:bg-cyan-800 hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(34,211,238,0.5)] cursor-crosshair' : ''}
                ${cell.state === 'miss' ? 'bg-slate-800/50 border-slate-700/50 cursor-not-allowed' : ''}
                ${cell.state === 'hit' ? 'bg-red-900/40 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)] cursor-not-allowed' : ''}
              `}
            >
              {/* Miss Visual */}
              {cell.state === 'miss' && (
                <div className="w-1/2 h-1/2 rounded-full border-2 border-slate-500 opacity-30 animate-[ping_1s_ease-out_forwards]" />
              )}
              {/* Hit Visual */}
              {cell.state === 'hit' && (
                <Skull className="w-[60%] h-[60%] text-red-500 filter drop-shadow-[0_0_5px_red] animate-pulse" />
              )}
              
              {/* Optional Grid Coordinates Text (very faint) */}
              {cell.state === 'hidden' && (
                <span className="text-[8px] text-cyan-500/20 font-sans opacity-0 hover:opacity-100">{String.fromCharCode(65 + cell.y)}{cell.x + 1}</span>
              )}
            </button>
          ))}
        </div>

        {/* Intro Overlay */}
        {gameState === 'intro' && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl flex flex-col items-center justify-center z-50 p-6 text-center border-[8px] border-cyan-900">
            <div className="w-28 h-28 bg-cyan-950 rounded-full flex items-center justify-center border-4 border-cyan-500 shadow-[0_0_50px_rgba(34,211,238,0.4)] mb-8 relative">
              <div className="absolute inset-0 rounded-full border-2 border-cyan-300 animate-ping opacity-20" />
              <Target className="w-12 h-12 text-cyan-400" />
            </div>
            <h2 className="text-4xl sm:text-5xl font-black mb-4 font-display text-cyan-300 drop-shadow-lg uppercase tracking-wider">Naval Command</h2>
            <h3 className="text-xl sm:text-2xl text-cyan-100 mb-6 max-w-2xl font-bold">{gameData.title}</h3>
            <p className="text-cyan-600/80 text-sm leading-relaxed mb-8 max-w-xl font-sans bg-slate-900 p-4 rounded-xl border border-cyan-900/50">
              {gameData.backgroundStory}
            </p>
            
            <button 
              onClick={handleStart}
              className="px-10 py-5 bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xl rounded-xl shadow-[0_0_40px_rgba(8,145,178,0.6)] transition-all hover:scale-105 flex items-center gap-3 uppercase tracking-widest border border-cyan-400"
            >
              <Play className="w-6 h-6 fill-current" /> Launch Sonar
            </button>
          </div>
        )}

        {/* Question Modal Overlay */}
        {gameState === 'question' && activeCell && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl flex flex-col items-center justify-center z-50 p-4 sm:p-8 animate-fade-in font-sans">
            <div className="w-full max-w-2xl bg-slate-900 border-2 border-red-500/50 rounded-2xl p-6 sm:p-10 shadow-[0_0_100px_rgba(239,68,68,0.2)]">
              
              {!questionResult ? (
                <>
                  <div className="flex flex-col items-center mb-6">
                    <ShieldAlert className="w-16 h-16 text-red-500 mb-4 animate-pulse drop-shadow-[0_0_15px_red]" />
                    <div className="inline-block px-4 py-1.5 bg-red-950 border border-red-500/50 text-red-400 rounded-sm text-xs font-mono uppercase tracking-widest">
                      Enemy Detected! Enter Override Code
                    </div>
                  </div>
                  
                  <h3 className="text-2xl font-bold mb-8 leading-relaxed text-center text-white">{activeCell.levelData.question}</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {activeCell.levelData.options.map((opt, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleAnswer(idx)}
                        disabled={selectedAnswer !== null}
                        className={`p-5 rounded-xl border-2 transition-all font-bold text-left ${
                          selectedAnswer === idx ? 'bg-slate-800 border-slate-500 scale-95' : 'bg-slate-800/80 border-slate-700 hover:border-cyan-400 hover:bg-slate-800'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center animate-bounce-in py-8">
                  {questionResult === 'success' ? (
                    <>
                      <CheckCircle2 className="w-20 h-20 text-emerald-500 mx-auto mb-6 drop-shadow-[0_0_20px_rgba(16,185,129,0.5)]" />
                      <h2 className="text-3xl font-black text-emerald-400 mb-4 uppercase tracking-wider">Target Destroyed!</h2>
                      <p className="text-slate-300 text-lg mb-8 max-w-md mx-auto">{activeCell.levelData.successText}</p>
                    </>
                  ) : (
                    <>
                      <Skull className="w-20 h-20 text-red-500 mx-auto mb-6 drop-shadow-[0_0_20px_rgba(239,68,68,0.5)]" />
                      <h2 className="text-3xl font-black text-red-500 mb-4 uppercase tracking-wider">Evasive Maneuvers Failed!</h2>
                      <p className="text-slate-300 text-lg mb-8 max-w-md mx-auto">{activeCell.levelData.failText}</p>
                      <p className="text-red-400 text-sm font-bold uppercase tracking-widest">Ammo Lost. Target Escaped.</p>
                    </>
                  )}
                  <button 
                    onClick={handleCloseQuestion}
                    className="mt-4 px-10 py-4 bg-cyan-600 text-white font-black text-lg rounded-xl hover:bg-cyan-500 transition-all uppercase tracking-widest border border-cyan-400"
                  >
                    Resume Radar
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Game Over Overlay */}
        {gameState === 'game_over' && (
          <div className="absolute inset-0 bg-red-950/90 backdrop-blur-xl flex flex-col items-center justify-center z-50 p-6 text-center animate-fade-in border-8 border-red-900">
            <Crosshair className="w-24 h-24 text-red-500 mb-6 animate-pulse" />
            <h2 className="text-5xl font-black text-red-500 mb-4 font-display uppercase">Out of Ammo</h2>
            <p className="text-red-200 text-xl mb-10">The enemy fleet survived.</p>
            <button 
              onClick={handleStart}
              className="px-10 py-4 bg-red-600 hover:bg-red-500 text-white font-black text-lg rounded-xl shadow-lg transition-all border border-red-400 uppercase tracking-widest"
            >
              Restart Mission
            </button>
          </div>
        )}

        {/* Victory Overlay */}
        {gameState === 'victory' && (
          <div className="absolute inset-0 bg-cyan-950/90 backdrop-blur-xl flex flex-col items-center justify-center z-50 p-6 text-center animate-slide-up border-8 border-cyan-900">
            <Anchor className="w-32 h-32 text-cyan-400 mb-8 drop-shadow-[0_0_30px_rgba(34,211,238,0.6)]" />
            <h2 className="text-5xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-400 mb-4 font-display uppercase tracking-wider">Fleet Destroyed!</h2>
            <p className="text-cyan-100 text-xl mb-8 max-w-lg leading-relaxed">Commander, you have successfully eliminated all enemy targets in this sector.</p>
            <div className="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/50 px-6 py-3 rounded-2xl text-emerald-400 font-black text-2xl uppercase tracking-widest">
              +50 XP Earned
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
