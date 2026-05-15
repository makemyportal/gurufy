import React, { useState } from 'react'
import { Beaker, FlaskConical, Play, ArrowRight, Activity, CheckCircle, RefreshCw } from 'lucide-react'

export default function LabSimulatorGame({ gameData, onComplete }) {
  const [currentLevel, setCurrentLevel] = useState(0)
  const [gameState, setGameState] = useState('intro') // intro, playing, mixing, success, fail, victory
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  
  if (!gameData || !gameData.levels) return null

  const level = gameData.levels[currentLevel]

  const handleStart = () => {
    setGameState('playing')
  }

  const handleAnswer = (index) => {
    setSelectedAnswer(index)
    setGameState('mixing')
    
    setTimeout(() => {
      if (index === level.correctAnswerIndex) {
        setGameState('success')
      } else {
        setGameState('fail')
      }
    }, 2000)
  }

  const handleNextLevel = () => {
    setSelectedAnswer(null)
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
    setGameState('playing')
  }

  return (
    <div className="w-full h-full flex flex-col relative animate-fade-in text-white overflow-hidden">
      {/* Lab BG */}
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?q=80&w=2560&auto=format&fit=crop')] bg-cover bg-center opacity-20 mix-blend-luminosity" />
      <div className="absolute inset-0 bg-gradient-to-br from-teal-950 via-slate-900/90 to-emerald-950/80" />

      {/* HUD */}
      <div className="relative z-20 p-6 flex justify-between items-start">
        <div className="flex flex-col gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 border border-white/10 rounded-full backdrop-blur-md">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-black uppercase tracking-widest text-emerald-400">
              Experiment Phase: {currentLevel + 1}/{gameData.levels.length}
            </span>
          </div>
        </div>
        <div className="text-right">
          <h3 className="text-xl font-black font-display drop-shadow-lg text-teal-200">{gameData.title}</h3>
          <p className="text-xs text-teal-400 font-bold uppercase tracking-widest">Lab Simulator</p>
        </div>
      </div>

      {/* Main Area */}
      <div className="relative z-20 flex-1 flex flex-col items-center justify-center p-6 sm:p-10 w-full max-w-3xl mx-auto">
        
        {gameState === 'intro' && (
          <div className="text-center animate-slide-up bg-slate-900/60 p-8 rounded-3xl backdrop-blur-md border border-white/10 shadow-2xl">
            <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
              <FlaskConical className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-black mb-4 font-display text-teal-100">{gameData.title}</h2>
            <p className="text-teal-200/80 text-lg leading-relaxed mb-8">{gameData.backgroundStory}</p>
            <button 
              onClick={handleStart}
              className="px-8 py-4 bg-teal-500 hover:bg-teal-400 text-slate-900 font-black text-lg rounded-2xl shadow-[0_0_40px_rgba(20,184,166,0.3)] transition-all hover:scale-105 flex items-center gap-3 mx-auto"
            >
              <Play className="w-6 h-6 fill-current" /> Initialize Equipment
            </button>
          </div>
        )}

        {gameState === 'playing' && level && (
          <div className="w-full animate-fade-in flex flex-col items-center">
            <div className="mb-8 w-full max-w-2xl">
              <div className="bg-slate-900/80 p-8 rounded-3xl border border-teal-500/30 shadow-2xl backdrop-blur-md">
                <div className="flex justify-center mb-6">
                  <div className="w-16 h-16 bg-teal-500/10 rounded-full border border-teal-500/30 flex items-center justify-center">
                    <Beaker className="w-8 h-8 text-teal-400" />
                  </div>
                </div>
                
                <p className="text-teal-300/80 text-sm font-mono mb-2 text-center uppercase tracking-widest">Observation Required</p>
                <h3 className="text-2xl font-bold leading-relaxed text-center">{level.question}</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
              {level.options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAnswer(idx)}
                  className="p-5 rounded-2xl border border-teal-500/20 bg-slate-800/80 hover:bg-teal-900/40 hover:border-teal-400 text-teal-50 font-bold transition-all shadow-lg flex items-center gap-4 group"
                >
                  <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center border border-teal-500/30 group-hover:bg-teal-500 group-hover:text-slate-900 transition-colors">
                    <span className="font-mono">{idx + 1}</span>
                  </div>
                  <span className="text-left">{option}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {gameState === 'mixing' && (
          <div className="text-center flex flex-col items-center justify-center">
            <div className="relative w-32 h-32 mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-teal-500/20 border-t-teal-500 animate-spin" />
              <div className="absolute inset-4 rounded-full border-4 border-emerald-500/20 border-b-emerald-500 animate-spin" style={{ animationDirection: 'reverse' }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <FlaskConical className="w-12 h-12 text-teal-400 animate-pulse" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-teal-200 animate-pulse">Running Simulation...</h3>
          </div>
        )}

        {gameState === 'success' && (
          <div className="text-center animate-bounce-in bg-slate-900/90 p-8 rounded-3xl backdrop-blur-xl border border-emerald-500/50 shadow-[0_0_50px_rgba(16,185,129,0.2)] w-full max-w-lg">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-emerald-500">
              <CheckCircle className="w-10 h-10 text-emerald-400" />
            </div>
            <h2 className="text-3xl font-black text-emerald-400 mb-2">Stable Reaction!</h2>
            <p className="text-emerald-100 text-lg mb-8">{level.successText}</p>
            <button 
              onClick={handleNextLevel}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-black text-lg rounded-xl shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-2"
            >
              Next Phase <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {gameState === 'fail' && (
          <div className="text-center animate-bounce-in bg-slate-900/90 p-8 rounded-3xl backdrop-blur-xl border border-red-500/50 shadow-[0_0_50px_rgba(239,68,68,0.2)] w-full max-w-lg">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-red-500">
              <RefreshCw className="w-10 h-10 text-red-400" />
            </div>
            <h2 className="text-3xl font-black text-red-400 mb-2">Unstable Reaction</h2>
            <p className="text-red-200 text-lg mb-8">{level.failText || 'The sequence failed. Please recalibrate your observation.'}</p>
            <button 
              onClick={handleRetry}
              className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white font-black text-lg rounded-xl border border-white/10 transition-all flex items-center justify-center gap-2"
            >
              Reset Equipment
            </button>
          </div>
        )}

        {gameState === 'victory' && (
          <div className="text-center animate-slide-up bg-teal-950/90 p-10 rounded-3xl backdrop-blur-xl border border-teal-500/50 shadow-[0_0_100px_rgba(20,184,166,0.3)]">
            <Activity className="w-24 h-24 text-emerald-400 mx-auto mb-6 drop-shadow-[0_0_30px_rgba(52,211,153,0.6)]" />
            <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400 mb-4 font-display">Experiment Complete!</h2>
            <p className="text-teal-100 text-xl mb-8">You successfully synthesized all concepts in the lab.</p>
            <div className="flex items-center justify-center gap-2 text-amber-400 font-black text-2xl">
              +50 XP
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
