import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

const WORDS = [
  'function', 'variable', 'algorithm', 'database', 'javascript', 'python',
  'network', 'server', 'framework', 'component', 'interface', 'compiler',
  'encryption', 'firewall', 'browser', 'protocol', 'debugging', 'syntax',
  'library', 'module', 'api', 'html', 'css', 'react', 'class',
  'object', 'array', 'string', 'boolean', 'integer', 'loop', 'condition',
  'import', 'export', 'return', 'promise', 'async', 'render', 'deploy',
  'commit', 'branch', 'merge', 'terminal', 'console', 'pixel', 'vector',
  'bandwidth', 'cloud', 'stack', 'queue', 'binary', 'kernel'
]

export default function TypingSpeedRacer() {
  const navigate = useNavigate()
  const [gameState, setGameState] = useState('idle') // idle, playing, finished
  const [wordList, setWordList] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [typed, setTyped] = useState('')
  const [startTime, setStartTime] = useState(null)
  const [wpm, setWpm] = useState(0)
  const [accuracy, setAccuracy] = useState(100)
  const [totalChars, setTotalChars] = useState(0)
  const [correctChars, setCorrectChars] = useState(0)
  const [timeLeft, setTimeLeft] = useState(60)
  const [completedWords, setCompletedWords] = useState(0)
  const inputRef = useRef(null)
  const timerRef = useRef(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef(null)
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen().catch(() => {})
    else document.exitFullscreen()
  }
  useEffect(() => {
    const h = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', h)
    return () => document.removeEventListener('fullscreenchange', h)
  }, [])

  // Car position based on WPM
  const carPosition = Math.min(90, (wpm / 80) * 90)

  const startGame = useCallback(() => {
    const shuffled = [...WORDS].sort(() => Math.random() - 0.5).slice(0, 30)
    setWordList(shuffled)
    setCurrentIndex(0)
    setTyped('')
    setStartTime(Date.now())
    setWpm(0)
    setAccuracy(100)
    setTotalChars(0)
    setCorrectChars(0)
    setTimeLeft(60)
    setCompletedWords(0)
    setGameState('playing')
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [])

  // Timer
  useEffect(() => {
    if (gameState === 'playing') {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current)
            setGameState('finished')
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(timerRef.current)
  }, [gameState])

  // Calculate WPM live
  useEffect(() => {
    if (gameState === 'playing' && startTime) {
      const elapsed = (Date.now() - startTime) / 1000 / 60
      if (elapsed > 0) {
        setWpm(Math.round(completedWords / elapsed))
      }
    }
  }, [completedWords, gameState, startTime])

  const handleInput = (e) => {
    const value = e.target.value
    const currentWord = wordList[currentIndex]

    if (!currentWord) return

    setTyped(value)
    setTotalChars(prev => prev + 1)

    // Check if word completed (space pressed)
    if (value.endsWith(' ')) {
      const typedWord = value.trim()
      if (typedWord === currentWord) {
        setCorrectChars(prev => prev + currentWord.length)
      }
      setCompletedWords(prev => prev + 1)
      setCurrentIndex(prev => prev + 1)
      setTyped('')

      if (currentIndex + 1 >= wordList.length) {
        setGameState('finished')
        clearInterval(timerRef.current)
      }
    }

    // Update accuracy
    if (totalChars > 0) {
      setAccuracy(Math.round((correctChars / Math.max(totalChars, 1)) * 100))
    }
  }

  const currentWord = wordList[currentIndex] || ''

  return (
    <div ref={containerRef} className={`min-h-screen bg-slate-950 text-slate-300 font-sans flex flex-col ${isFullscreen ? 'fixed inset-0 z-[9999]' : ''}`}>
      <header className="border-b border-slate-800 bg-slate-900/80 p-4 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/camp')} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div className="flex items-center gap-3">
            <span className="text-2xl">⌨️</span>
            <div>
              <h1 className="text-white font-bold tracking-tight">Typing Speed Racer</h1>
              <div className="text-xs text-green-400 font-mono">KEYBOARD_MASTERY</div>
            </div>
          </div>
        </div>
        <button onClick={toggleFullscreen} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors" title="Fullscreen">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
        </button>
      </header>

      <div className="flex-1 p-6 max-w-4xl mx-auto w-full flex flex-col gap-6">
        
        {/* Race Track */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <p className="text-xs text-green-300 mb-4 bg-green-500/10 p-3 rounded-lg border border-green-500/20">
            <strong>Teacher Tip:</strong> Fast and accurate typing is the #1 skill every programmer needs. The faster you type correctly, the faster your car goes!
          </p>

          <div className="relative h-20 bg-slate-800 rounded-xl overflow-hidden border border-slate-700 mb-2">
            {/* Road */}
            <div className="absolute inset-0 flex items-center">
              <div className="w-full h-[2px] bg-slate-600 absolute top-1/2"></div>
              {/* Car */}
              <div 
                className="absolute transition-all duration-300 text-3xl"
                style={{ left: `${carPosition}%`, top: '50%', transform: 'translateY(-50%)' }}
              >
                🏎️
              </div>
              {/* Finish Line */}
              <div className="absolute right-4 top-0 bottom-0 w-1 bg-yellow-500 flex items-center">
                <span className="text-sm ml-2">🏁</span>
              </div>
            </div>
          </div>
          <div className="flex justify-between text-xs text-slate-500">
            <span>START</span>
            <span>FINISH (80 WPM)</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'WPM', value: wpm, color: 'text-emerald-400' },
            { label: 'Accuracy', value: accuracy + '%', color: 'text-blue-400' },
            { label: 'Words', value: completedWords, color: 'text-purple-400' },
            { label: 'Time Left', value: timeLeft + 's', color: timeLeft <= 10 ? 'text-red-400' : 'text-yellow-400' }
          ].map(s => (
            <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
              <div className={`text-2xl font-black font-mono ${s.color}`}>{s.value}</div>
              <div className="text-[10px] text-slate-500 font-bold uppercase mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Game Area */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
          {gameState === 'idle' && (
            <div>
              <div className="text-6xl mb-4">⌨️</div>
              <h2 className="text-2xl font-bold text-white mb-2">Ready to Race?</h2>
              <p className="text-slate-400 mb-6">Type programming words as fast as you can in 60 seconds!</p>
              <button onClick={startGame} className="px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-lg rounded-xl transition-colors">
                Start Race!
              </button>
            </div>
          )}

          {gameState === 'playing' && (
            <div>
              {/* Words Display */}
              <div className="flex flex-wrap justify-center gap-2 mb-8 min-h-[80px]">
                {wordList.slice(currentIndex, currentIndex + 8).map((word, i) => (
                  <span
                    key={i}
                    className={`px-3 py-1.5 rounded-lg text-lg font-mono font-bold transition-all ${
                      i === 0 ? 'bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500/50 scale-110' : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {word}
                  </span>
                ))}
              </div>

              {/* Char-by-char feedback */}
              <div className="flex justify-center gap-[2px] mb-4 min-h-[40px]">
                {currentWord.split('').map((char, i) => {
                  let bg = 'bg-slate-800 text-slate-400'
                  if (i < typed.length) {
                    bg = typed[i] === char ? 'bg-emerald-500/30 text-emerald-400' : 'bg-red-500/30 text-red-400'
                  }
                  return (
                    <span key={i} className={`w-8 h-10 flex items-center justify-center rounded font-mono text-lg font-bold ${bg}`}>
                      {char}
                    </span>
                  )
                })}
              </div>

              <input
                ref={inputRef}
                type="text"
                value={typed}
                onChange={handleInput}
                className="w-full max-w-md mx-auto bg-slate-950 border-2 border-emerald-500/50 rounded-xl p-4 text-center text-xl font-mono text-white outline-none focus:border-emerald-500"
                placeholder="Start typing..."
                autoComplete="off"
                autoCapitalize="off"
              />
              <p className="text-xs text-slate-500 mt-3">Press SPACE after each word to submit</p>
            </div>
          )}

          {gameState === 'finished' && (
            <div>
              <div className="text-6xl mb-4">{wpm >= 40 ? '🏆' : '🎯'}</div>
              <h2 className="text-3xl font-bold text-white mb-2">Race Complete!</h2>
              <div className="grid grid-cols-3 gap-4 max-w-md mx-auto my-6">
                <div className="bg-slate-800 p-4 rounded-xl">
                  <div className="text-2xl font-black text-emerald-400 font-mono">{wpm}</div>
                  <div className="text-xs text-slate-400">WPM</div>
                </div>
                <div className="bg-slate-800 p-4 rounded-xl">
                  <div className="text-2xl font-black text-blue-400 font-mono">{accuracy}%</div>
                  <div className="text-xs text-slate-400">Accuracy</div>
                </div>
                <div className="bg-slate-800 p-4 rounded-xl">
                  <div className="text-2xl font-black text-purple-400 font-mono">{completedWords}</div>
                  <div className="text-xs text-slate-400">Words</div>
                </div>
              </div>
              <button onClick={startGame} className="px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-lg rounded-xl transition-colors">
                Race Again!
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
