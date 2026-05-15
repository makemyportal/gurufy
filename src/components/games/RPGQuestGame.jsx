import React, { useState } from 'react'
import { Shield, Sword, Heart, Skull, Play, ArrowRight, Trophy } from 'lucide-react'

export default function RPGQuestGame({ gameData, onComplete }) {
  const [currentLevel, setCurrentLevel] = useState(0)
  const [playerHp, setPlayerHp] = useState(3)
  const [gameState, setGameState] = useState('intro') // intro, playing, success, fail, game_over, victory
  const [selectedAnswer, setSelectedAnswer] = useState(null)

  if (!gameData || !gameData.levels) return null

  const level = gameData.levels[currentLevel]

  const handleStart = () => {
    setGameState('playing')
  }

  const handleAnswer = (index) => {
    setSelectedAnswer(index)
    setTimeout(() => {
      if (index === level.correctAnswerIndex) {
        setGameState('success')
      } else {
        setPlayerHp(prev => prev - 1)
        if (playerHp - 1 <= 0) {
          setGameState('game_over')
        } else {
          setGameState('fail')
        }
      }
    }, 1000)
  }

  const handleNextLevel = () => {
    setSelectedAnswer(null)
    if (currentLevel + 1 < gameData.levels.length) {
      setCurrentLevel(prev => prev + 1)
      setGameState('playing')
    } else {
      setGameState('victory')
      setTimeout(() => {
        if (onComplete) onComplete(playerHp)
      }, 2000)
    }
  }

  const handleRetry = () => {
    setSelectedAnswer(null)
    setGameState('playing')
  }

  return (
    <div className="w-full h-full flex flex-col relative animate-fade-in text-white">
      {/* Background Layer */}
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=2560&auto=format&fit=crop')] bg-cover bg-center opacity-30 mix-blend-luminosity" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-slate-900/40" />

      {/* HUD (Heads Up Display) */}
      <div className="relative z-20 p-6 flex justify-between items-start">
        <div className="flex flex-col gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 border border-white/10 rounded-full backdrop-blur-md">
            <span className="text-xs font-black uppercase tracking-widest text-emerald-400">Level {currentLevel + 1}/{gameData.levels.length}</span>
          </div>
          <div className="flex gap-1.5 bg-slate-800/80 border border-white/10 p-2 rounded-xl backdrop-blur-md">
            {[1, 2, 3].map(i => (
              <Heart 
                key={i} 
                className={`w-5 h-5 ${i <= playerHp ? 'text-red-500 fill-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'text-slate-600'}`} 
              />
            ))}
          </div>
        </div>
        <div className="text-right">
          <h3 className="text-xl font-black font-display drop-shadow-lg">{gameData.title}</h3>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">RPG Quest Module</p>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="relative z-20 flex-1 flex flex-col items-center justify-center p-6 sm:p-10 w-full max-w-3xl mx-auto">
        
        {gameState === 'intro' && (
          <div className="text-center animate-slide-up bg-slate-900/60 p-8 rounded-3xl backdrop-blur-md border border-white/10 shadow-2xl">
            <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(239,68,68,0.3)]">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-black mb-4 font-display">{gameData.title}</h2>
            <p className="text-slate-300 text-lg leading-relaxed mb-8">{gameData.backgroundStory}</p>
            <button 
              onClick={handleStart}
              className="px-8 py-4 bg-white text-slate-900 hover:bg-emerald-400 font-black text-lg rounded-2xl shadow-[0_0_40px_rgba(255,255,255,0.2)] transition-all hover:scale-105 flex items-center gap-3 mx-auto"
            >
              <Play className="w-6 h-6 fill-current" /> Begin Quest
            </button>
          </div>
        )}

        {gameState === 'playing' && level && (
          <div className="w-full animate-fade-in flex flex-col items-center">
            <div className="mb-8 text-center">
              <div className="inline-block px-4 py-1.5 bg-red-500/20 border border-red-500/50 text-red-400 rounded-full text-xs font-black uppercase tracking-widest mb-4">
                Enemy Approaching: {level.monsterName}
              </div>
              <div className="bg-slate-900/80 p-6 rounded-2xl border border-white/10 shadow-xl backdrop-blur-sm relative">
                {/* Decorative corner accents */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-emerald-500 rounded-tl-xl" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-emerald-500 rounded-br-xl" />
                
                <h3 className="text-2xl font-bold leading-relaxed">{level.question}</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              {level.options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAnswer(idx)}
                  disabled={selectedAnswer !== null}
                  className={`relative p-5 rounded-2xl border-2 transition-all font-bold text-left overflow-hidden group ${
                    selectedAnswer === idx 
                      ? idx === level.correctAnswerIndex 
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-100' 
                        : 'bg-red-500/20 border-red-500 text-red-100'
                      : 'bg-slate-800/60 border-white/10 hover:border-emerald-400 hover:bg-slate-800 text-slate-200'
                  }`}
                >
                  {selectedAnswer === null && (
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/10 to-emerald-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  )}
                  <div className="flex items-center gap-3 relative z-10">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-black ${
                       selectedAnswer === idx 
                        ? idx === level.correctAnswerIndex ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                        : 'bg-slate-700 text-slate-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors'
                    }`}>
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <span>{option}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {(gameState === 'success' || gameState === 'fail') && (
          <div className="text-center animate-bounce-in bg-slate-900/90 p-8 rounded-3xl backdrop-blur-xl border border-white/10 shadow-2xl w-full max-w-lg">
            {gameState === 'success' ? (
              <>
                <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-emerald-500">
                  <Sword className="w-10 h-10 text-emerald-400" />
                </div>
                <h2 className="text-3xl font-black text-emerald-400 mb-2">Critical Hit!</h2>
                <p className="text-slate-300 text-lg mb-8">{level.successText}</p>
                <button 
                  onClick={handleNextLevel}
                  className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-lg rounded-xl shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-2"
                >
                  Continue Journey <ArrowRight className="w-5 h-5" />
                </button>
              </>
            ) : (
              <>
                <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-red-500">
                  <Skull className="w-10 h-10 text-red-400" />
                </div>
                <h2 className="text-3xl font-black text-red-400 mb-2">You took damage!</h2>
                <p className="text-slate-300 text-lg mb-8">{level.failText}</p>
                <button 
                  onClick={handleRetry}
                  className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white font-black text-lg rounded-xl border border-white/10 transition-all flex items-center justify-center gap-2"
                >
                  Try Again
                </button>
              </>
            )}
          </div>
        )}

        {gameState === 'game_over' && (
          <div className="text-center animate-slide-up bg-red-950/80 p-10 rounded-3xl backdrop-blur-xl border border-red-500/50 shadow-[0_0_100px_rgba(239,68,68,0.2)]">
            <Skull className="w-24 h-24 text-red-500 mx-auto mb-6" />
            <h2 className="text-4xl font-black text-red-500 mb-4 font-display">Game Over</h2>
            <p className="text-red-200 text-lg mb-8">You ran out of health. The quest has ended.</p>
            <button 
              onClick={() => {
                setCurrentLevel(0)
                setPlayerHp(3)
                setGameState('intro')
                setSelectedAnswer(null)
              }}
              className="px-8 py-4 bg-red-600 hover:bg-red-500 text-white font-black text-lg rounded-xl shadow-lg transition-all"
            >
              Restart Quest
            </button>
          </div>
        )}

        {gameState === 'victory' && (
          <div className="text-center animate-slide-up bg-emerald-950/80 p-10 rounded-3xl backdrop-blur-xl border border-emerald-500/50 shadow-[0_0_100px_rgba(16,185,129,0.2)]">
            <Trophy className="w-24 h-24 text-amber-400 mx-auto mb-6 drop-shadow-[0_0_30px_rgba(251,191,36,0.6)]" />
            <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-amber-400 mb-4 font-display">Victory!</h2>
            <p className="text-emerald-100 text-xl mb-8">You have defeated all enemies and mastered the topic.</p>
            <div className="flex items-center justify-center gap-2 text-amber-400 font-black text-2xl">
              +50 XP
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
