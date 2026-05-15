import React, { useState } from 'react'
import { Ghost, Key, Lock, Unlock, ArrowRight, Play, CheckCircle } from 'lucide-react'

export default function EscapeRoomGame({ gameData, onComplete }) {
  const [currentLevel, setCurrentLevel] = useState(0)
  const [gameState, setGameState] = useState('intro') // intro, playing, success, fail, victory
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')

  if (!gameData || !gameData.levels) return null

  const level = gameData.levels[currentLevel]

  const handleStart = () => {
    setGameState('playing')
  }

  const handleAnswer = (index) => {
    setSelectedAnswer(index)
    setErrorMessage('')
    setTimeout(() => {
      if (index === level.correctAnswerIndex) {
        setGameState('success')
      } else {
        setErrorMessage(level.failText || 'Incorrect! The lock remains shut.')
        setGameState('fail')
      }
    }, 800)
  }

  const handleNextLevel = () => {
    setSelectedAnswer(null)
    setErrorMessage('')
    if (currentLevel + 1 < gameData.levels.length) {
      setCurrentLevel(prev => prev + 1)
      setGameState('playing')
    } else {
      setGameState('victory')
      setTimeout(() => {
        if (onComplete) onComplete()
      }, 2000)
    }
  }

  const handleRetry = () => {
    setSelectedAnswer(null)
    setErrorMessage('')
    setGameState('playing')
  }

  return (
    <div className="w-full h-full flex flex-col relative animate-fade-in text-white overflow-hidden">
      {/* Immersive Escape Room BG */}
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1505506874110-6a7a48e4b8d5?q=80&w=2560&auto=format&fit=crop')] bg-cover bg-center opacity-30 mix-blend-luminosity" />
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-900/90 to-purple-950/80" />

      {/* HUD */}
      <div className="relative z-20 p-6 flex justify-between items-start">
        <div className="flex flex-col gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 border border-white/10 rounded-full backdrop-blur-md">
            <Key className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-black uppercase tracking-widest text-amber-400">
              Locks Opened: {currentLevel}/{gameData.levels.length}
            </span>
          </div>
        </div>
        <div className="text-right">
          <h3 className="text-xl font-black font-display drop-shadow-lg text-indigo-200">{gameData.title}</h3>
          <p className="text-xs text-indigo-400 font-bold uppercase tracking-widest">Escape Room</p>
        </div>
      </div>

      {/* Main Area */}
      <div className="relative z-20 flex-1 flex flex-col items-center justify-center p-6 sm:p-10 w-full max-w-3xl mx-auto">
        
        {gameState === 'intro' && (
          <div className="text-center animate-slide-up bg-slate-900/60 p-8 rounded-3xl backdrop-blur-md border border-white/10 shadow-2xl">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(99,102,241,0.3)]">
              <Ghost className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-black mb-4 font-display text-indigo-100">{gameData.title}</h2>
            <p className="text-indigo-200/80 text-lg leading-relaxed mb-8">{gameData.backgroundStory}</p>
            <button 
              onClick={handleStart}
              className="px-8 py-4 bg-indigo-500 hover:bg-indigo-400 text-white font-black text-lg rounded-2xl shadow-[0_0_40px_rgba(99,102,241,0.3)] transition-all hover:scale-105 flex items-center gap-3 mx-auto"
            >
              <Lock className="w-6 h-6" /> Enter Room
            </button>
          </div>
        )}

        {gameState === 'playing' && level && (
          <div className="w-full animate-fade-in flex flex-col items-center">
            <div className="mb-8 w-full max-w-2xl">
              <div className="bg-slate-900/80 p-8 rounded-3xl border border-indigo-500/30 shadow-2xl backdrop-blur-md relative overflow-hidden">
                {/* Vault door aesthetic */}
                <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b from-slate-600 to-slate-800" />
                <div className="absolute right-0 top-0 bottom-0 w-2 bg-gradient-to-b from-slate-600 to-slate-800" />
                
                <div className="flex justify-center mb-6">
                  <div className="w-16 h-16 bg-slate-800 rounded-full border-4 border-slate-600 flex items-center justify-center shadow-inner">
                    <Lock className="w-8 h-8 text-amber-500/50" />
                  </div>
                </div>
                
                <p className="text-indigo-200 text-sm font-mono mb-2 text-center uppercase tracking-widest">Decipher Clue #{currentLevel + 1}</p>
                <h3 className="text-2xl font-bold leading-relaxed text-center">{level.question}</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
              {level.options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAnswer(idx)}
                  disabled={selectedAnswer !== null}
                  className={`relative p-5 rounded-2xl border transition-all font-bold text-left overflow-hidden group ${
                    selectedAnswer === idx 
                      ? idx === level.correctAnswerIndex 
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-100' 
                        : 'bg-red-500/20 border-red-500 text-red-100'
                      : 'bg-slate-800/80 border-indigo-500/30 hover:border-indigo-400 hover:bg-slate-800 text-indigo-100 shadow-lg'
                  }`}
                >
                  <div className="flex items-center gap-4 relative z-10">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                       selectedAnswer === idx 
                        ? idx === level.correctAnswerIndex ? 'border-emerald-500 bg-emerald-500' : 'border-red-500 bg-red-500'
                        : 'border-indigo-500/50 group-hover:border-indigo-400'
                    }`}>
                      {selectedAnswer === idx && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                    <span>{option}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {gameState === 'success' && (
          <div className="text-center animate-bounce-in bg-slate-900/90 p-8 rounded-3xl backdrop-blur-xl border border-emerald-500/50 shadow-[0_0_50px_rgba(16,185,129,0.2)] w-full max-w-lg">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-emerald-500">
              <Unlock className="w-10 h-10 text-emerald-400" />
            </div>
            <h2 className="text-3xl font-black text-emerald-400 mb-2">Lock Opened!</h2>
            <p className="text-emerald-100 text-lg mb-8">{level.successText}</p>
            <button 
              onClick={handleNextLevel}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-lg rounded-xl shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-2"
            >
              Proceed <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {gameState === 'fail' && (
          <div className="text-center animate-bounce-in bg-slate-900/90 p-8 rounded-3xl backdrop-blur-xl border border-red-500/50 shadow-[0_0_50px_rgba(239,68,68,0.2)] w-full max-w-lg">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-red-500">
              <Lock className="w-10 h-10 text-red-400" />
            </div>
            <h2 className="text-3xl font-black text-red-400 mb-2">Access Denied</h2>
            <p className="text-red-200 text-lg mb-8">{errorMessage}</p>
            <button 
              onClick={handleRetry}
              className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white font-black text-lg rounded-xl border border-white/10 transition-all flex items-center justify-center gap-2"
            >
              Examine Clue Again
            </button>
          </div>
        )}

        {gameState === 'victory' && (
          <div className="text-center animate-slide-up bg-indigo-950/90 p-10 rounded-3xl backdrop-blur-xl border border-indigo-500/50 shadow-[0_0_100px_rgba(99,102,241,0.3)]">
            <CheckCircle className="w-24 h-24 text-emerald-400 mx-auto mb-6 drop-shadow-[0_0_30px_rgba(52,211,153,0.6)]" />
            <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 mb-4 font-display">Escaped!</h2>
            <p className="text-indigo-100 text-xl mb-8">You successfully decrypted all clues and escaped the room.</p>
            <div className="flex items-center justify-center gap-2 text-amber-400 font-black text-2xl">
              +50 XP
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
