import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

const caesarEncrypt = (text, shift) => {
  return text.split('').map(char => {
    const upper = char.toUpperCase()
    const idx = ALPHABET.indexOf(upper)
    if (idx === -1) return char
    const newIdx = (idx + shift) % 26
    return char === upper ? ALPHABET[newIdx] : ALPHABET[newIdx].toLowerCase()
  }).join('')
}

const caesarDecrypt = (text, shift) => {
  return caesarEncrypt(text, 26 - (shift % 26))
}

const CHALLENGES = [
  {
    title: 'Crack the Code!',
    encrypted: 'KHOOR ZRUOG',
    shift: 3,
    answer: 'HELLO WORLD',
    hint: 'The shift is 3. So H becomes K, E becomes H...',
    difficulty: 'Easy'
  },
  {
    title: 'Secret Agent Message',
    encrypted: 'FRPSXWHU VFLHQFH LV IXQ',
    shift: 3,
    answer: 'COMPUTER SCIENCE IS FUN',
    hint: 'This also uses shift 3 (the classic Caesar Cipher).',
    difficulty: 'Easy'
  },
  {
    title: 'Military Encryption',
    encrypted: 'YNKBQ FX TMNEFNHJ',
    shift: 5,
    answer: 'TILVM AS OIMZAOHD',
    hint: 'The shift is 5 this time. Try using the decrypt tool!',
    difficulty: 'Medium'
  }
]

export default function EncryptionLab() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('encrypt') // encrypt, decrypt
  const [inputText, setInputText] = useState('')
  const [shift, setShift] = useState(3)
  const [output, setOutput] = useState('')

  // Challenge section
  const [currentChallenge, setCurrentChallenge] = useState(0)
  const [challengeAnswer, setChallengeAnswer] = useState('')
  const [challengeResult, setChallengeResult] = useState(null)

  const handleProcess = () => {
    if (mode === 'encrypt') {
      setOutput(caesarEncrypt(inputText, shift))
    } else {
      setOutput(caesarDecrypt(inputText, shift))
    }
  }

  const checkChallenge = () => {
    const challenge = CHALLENGES[currentChallenge]
    if (challengeAnswer.toUpperCase().trim() === challenge.answer) {
      setChallengeResult('correct')
    } else {
      setChallengeResult('wrong')
    }
  }

  const nextChallenge = () => {
    setCurrentChallenge((prev) => (prev + 1) % CHALLENGES.length)
    setChallengeAnswer('')
    setChallengeResult(null)
  }

  const challenge = CHALLENGES[currentChallenge]

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-sans flex flex-col">
      <header className="border-b border-slate-800 bg-slate-900/80 p-4 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/camp')} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔐</span>
            <div>
              <h1 className="text-white font-bold tracking-tight">Encryption Lab</h1>
              <div className="text-xs text-red-400 font-mono">CYBERSECURITY_101</div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 p-6 max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left: Encryption/Decryption Tool */}
        <div className="flex flex-col gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-2">1. Encryption Machine</h2>
            <p className="text-xs text-red-300 mb-4 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
              <strong>Teacher Tip:</strong> Encryption turns normal text into a secret code. Only someone with the "key" (shift number) can unlock it. This is how WhatsApp, banks, and passwords work!
            </p>

            {/* Mode Toggle */}
            <div className="flex rounded-xl bg-slate-950 p-1 mb-4 border border-slate-800">
              <button
                onClick={() => setMode('encrypt')}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${mode === 'encrypt' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                🔒 Encrypt
              </button>
              <button
                onClick={() => setMode('decrypt')}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${mode === 'decrypt' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                🔓 Decrypt
              </button>
            </div>

            {/* Input */}
            <textarea
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder={mode === 'encrypt' ? 'Type your secret message...' : 'Paste encrypted text...'}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm font-mono text-white resize-none h-24 outline-none focus:border-emerald-500"
            />

            {/* Shift Key */}
            <div className="flex items-center gap-4 mt-4 bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 font-bold whitespace-nowrap">🔑 Shift Key:</span>
              <input
                type="range" min="1" max="25" value={shift}
                onChange={e => setShift(parseInt(e.target.value))}
                className="flex-1 accent-emerald-500"
              />
              <span className="text-xl font-black text-white font-mono w-8 text-center">{shift}</span>
            </div>

            <button
              onClick={handleProcess}
              className="w-full mt-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold rounded-xl transition-all"
            >
              {mode === 'encrypt' ? '🔒 Encrypt Message' : '🔓 Decrypt Message'}
            </button>

            {/* Output */}
            {output && (
              <div className="mt-4 bg-slate-950 border border-slate-800 rounded-xl p-4">
                <div className="text-xs text-slate-500 mb-2 font-bold">Result:</div>
                <div className="text-lg font-mono font-bold text-emerald-400 break-all select-all">
                  {output}
                </div>
              </div>
            )}
          </div>

          {/* Alphabet Reference */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <h3 className="text-sm font-bold text-white mb-3">Caesar Cipher Wheel (Shift: {shift})</h3>
            <div className="flex flex-wrap gap-[3px]">
              {ALPHABET.split('').map((letter, i) => {
                const shifted = ALPHABET[(i + shift) % 26]
                return (
                  <div key={i} className="flex flex-col items-center bg-slate-950 rounded p-1.5 border border-slate-800" style={{ width: '36px' }}>
                    <span className="text-xs text-slate-400 font-mono">{letter}</span>
                    <span className="text-[8px] text-slate-600">↓</span>
                    <span className="text-xs text-emerald-400 font-mono font-bold">{shifted}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right: Challenges */}
        <div className="flex flex-col gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">2. Crack the Code Challenges</h2>

            <div className="bg-slate-950 rounded-xl border border-slate-800 p-6">
              <div className="flex justify-between items-center mb-4">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${challenge.difficulty === 'Easy' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-orange-500/20 text-orange-400'}`}>
                  {challenge.difficulty}
                </span>
                <span className="text-xs text-slate-500 font-mono">Challenge {currentChallenge + 1}/{CHALLENGES.length}</span>
              </div>

              <h3 className="text-lg font-bold text-white mb-2">{challenge.title}</h3>
              <p className="text-sm text-slate-400 mb-4">Decrypt this secret message:</p>

              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-4 text-center">
                <div className="text-xl font-mono font-bold text-red-400 tracking-wider select-all">
                  {challenge.encrypted}
                </div>
              </div>

              <input
                type="text"
                value={challengeAnswer}
                onChange={e => setChallengeAnswer(e.target.value)}
                placeholder="Type the decrypted message..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm font-mono text-white outline-none focus:border-emerald-500 mb-3"
              />

              <div className="flex gap-2">
                <button
                  onClick={checkChallenge}
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-colors"
                >
                  Check Answer
                </button>
                <button
                  onClick={nextChallenge}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-colors"
                >
                  Skip →
                </button>
              </div>

              {challengeResult === 'correct' && (
                <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center">
                  <span className="text-emerald-400 font-bold text-lg">🎉 Correct! You cracked the code!</span>
                  <button onClick={nextChallenge} className="block mx-auto mt-2 px-4 py-1.5 bg-emerald-500 text-white text-sm font-bold rounded-lg">Next Challenge →</button>
                </div>
              )}
              {challengeResult === 'wrong' && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-center">
                  <span className="text-red-400 font-bold">❌ Not quite! Try again.</span>
                </div>
              )}

              <details className="mt-4 text-xs">
                <summary className="text-slate-500 cursor-pointer hover:text-slate-300">💡 Need a hint?</summary>
                <p className="mt-2 text-amber-400 bg-amber-500/10 p-2 rounded border border-amber-500/20">{challenge.hint}</p>
              </details>
            </div>
          </div>

          <p className="text-xs text-slate-500 text-center">
            💡 <strong>Real Skill:</strong> Cybersecurity experts use encryption daily. WhatsApp, your bank app, and even WiFi passwords all use advanced versions of this concept!
          </p>
        </div>
      </div>
    </div>
  )
}
