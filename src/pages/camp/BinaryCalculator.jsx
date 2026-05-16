import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

export default function BinaryCalculator() {
  const navigate = useNavigate()
  const [decimal, setDecimal] = useState(42)
  const [customDec, setCustomDec] = useState('')
  const [logicA, setLogicA] = useState(1)
  const [logicB, setLogicB] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef(null)

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen()
    }
  }

  React.useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  const toBinary = (n) => (n >>> 0).toString(2).padStart(8, '0')
  const toHex = (n) => n.toString(16).toUpperCase().padStart(2, '0')
  const toOctal = (n) => n.toString(8)

  const PRESETS = [0, 1, 7, 8, 10, 42, 100, 127, 128, 255]

  return (
    <div ref={containerRef} className={`min-h-screen bg-slate-950 text-slate-300 font-sans flex flex-col ${isFullscreen ? 'fixed inset-0 z-[9999]' : ''}`}>
      <header className="border-b border-slate-800 bg-slate-900/80 p-4 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/camp')} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div className="flex items-center gap-3">
            <span className="text-2xl">🧮</span>
            <div>
              <h1 className="text-white font-bold tracking-tight">Binary Calculator</h1>
              <div className="text-xs text-cyan-400 font-mono">COMPUTER_SCIENCE_101</div>
            </div>
          </div>
        </div>
        <button onClick={toggleFullscreen} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors" title="Fullscreen">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
        </button>
      </header>

      <div className="flex-1 p-6 max-w-5xl mx-auto w-full space-y-6">
        <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-3 text-xs text-cyan-300">
          <strong>Teacher Tip:</strong> Computers only understand 0s and 1s (Binary). Every number, letter, image, and video is stored as binary! Learn how humans and machines speak different number languages.
        </div>

        {/* Number Converter */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">1. Number System Converter</h2>
          <div className="flex flex-wrap gap-2 mb-4">
            {PRESETS.map(n => (
              <button key={n} onClick={() => setDecimal(n)} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${decimal === n ? 'bg-cyan-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>{n}</button>
            ))}
            <input
              type="number" min="0" max="255" placeholder="Custom"
              value={customDec} onChange={e => { setCustomDec(e.target.value); if (e.target.value) setDecimal(parseInt(e.target.value) || 0) }}
              className="w-20 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white text-center outline-none"
            />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Decimal (Base 10)', value: decimal.toString(), color: 'text-white', desc: 'Human numbers' },
              { label: 'Binary (Base 2)', value: toBinary(decimal), color: 'text-cyan-400', desc: 'Computer language' },
              { label: 'Hexadecimal (Base 16)', value: '0x' + toHex(decimal), color: 'text-purple-400', desc: 'Used in colors (#FF0000)' },
              { label: 'Octal (Base 8)', value: toOctal(decimal), color: 'text-orange-400', desc: 'Used in file permissions' }
            ].map(s => (
              <div key={s.label} className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">{s.label}</div>
                <div className={`text-2xl font-black font-mono ${s.color}`}>{s.value}</div>
                <div className="text-[10px] text-slate-600 mt-1">{s.desc}</div>
              </div>
            ))}
          </div>

          {/* Visual Binary */}
          <div className="mt-6">
            <h3 className="text-sm font-bold text-white mb-3">Visual: How {decimal} becomes {toBinary(decimal)}</h3>
            <div className="flex gap-2 items-end">
              {toBinary(decimal).split('').map((bit, i) => {
                const power = 7 - i
                const value = parseInt(bit) * Math.pow(2, power)
                return (
                  <div key={i} className="flex-1 text-center">
                    <div className="text-[10px] text-slate-500 mb-1">2^{power} = {Math.pow(2, power)}</div>
                    <div className={`h-12 flex items-center justify-center rounded-lg text-xl font-black font-mono ${bit === '1' ? 'bg-cyan-500 text-white' : 'bg-slate-800 text-slate-600'}`}>
                      {bit}
                    </div>
                    <div className="text-[10px] text-cyan-400 mt-1 font-mono">{value > 0 ? '+' + value : ''}</div>
                  </div>
                )
              })}
            </div>
            <div className="text-center mt-3 text-sm text-white font-bold">
              = {toBinary(decimal).split('').map((bit, i) => parseInt(bit) * Math.pow(2, 7 - i)).filter(v => v > 0).join(' + ')} = <span className="text-cyan-400">{decimal}</span>
            </div>
          </div>
        </div>

        {/* Logic Gates */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">2. Logic Gates (How Computers Think)</h2>
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-400">Input A:</span>
              <button onClick={() => setLogicA(a => a ? 0 : 1)} className={`w-14 h-10 rounded-lg font-black text-lg ${logicA ? 'bg-cyan-500 text-white' : 'bg-slate-800 text-slate-500'}`}>{logicA}</button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-400">Input B:</span>
              <button onClick={() => setLogicB(b => b ? 0 : 1)} className={`w-14 h-10 rounded-lg font-black text-lg ${logicB ? 'bg-cyan-500 text-white' : 'bg-slate-800 text-slate-500'}`}>{logicB}</button>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { gate: 'AND', result: logicA & logicB, desc: 'Both must be 1' },
              { gate: 'OR', result: logicA | logicB, desc: 'At least one is 1' },
              { gate: 'XOR', result: logicA ^ logicB, desc: 'Only one is 1' },
              { gate: 'NAND', result: (logicA & logicB) ? 0 : 1, desc: 'NOT AND' },
              { gate: 'NOT A', result: logicA ? 0 : 1, desc: 'Flips the bit' }
            ].map(g => (
              <div key={g.gate} className={`p-4 rounded-xl border text-center ${g.result ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-slate-800/50 border-slate-700'}`}>
                <div className="text-xs text-slate-400 font-bold mb-1">{g.gate}</div>
                <div className={`text-2xl font-black font-mono ${g.result ? 'text-cyan-400' : 'text-slate-500'}`}>{g.result}</div>
                <div className="text-[10px] text-slate-500 mt-1">{g.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
