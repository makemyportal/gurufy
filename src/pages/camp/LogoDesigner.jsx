import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

const SHAPES = ['circle', 'square', 'triangle', 'star', 'hexagon']
const FONTS = ['Arial', 'Georgia', 'Courier New', 'Impact', 'Comic Sans MS']

export default function LogoDesigner() {
  const navigate = useNavigate()
  const [brandName, setBrandName] = useState('My Brand')
  const [shape, setShape] = useState('circle')
  const [bgColor, setBgColor] = useState('#6366f1')
  const [textColor, setTextColor] = useState('#ffffff')
  const [font, setFont] = useState('Arial')
  const [fontSize, setFontSize] = useState(28)
  const [icon, setIcon] = useState('⚡')
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

  const ICONS = ['⚡', '🚀', '💎', '🎯', '🌟', '🔥', '💡', '🎨', '🏆', '❤️', '🌊', '🎵', '👁️', '🦁', '🌍']

  const renderShape = () => {
    const size = 200
    const common = { width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', background: bgColor }
    switch (shape) {
      case 'circle': return { ...common, borderRadius: '50%' }
      case 'square': return { ...common, borderRadius: '20px' }
      case 'triangle': return { ...common, clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)', paddingTop: '30px' }
      case 'star': return { ...common, clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' }
      case 'hexagon': return { ...common, clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' }
      default: return common
    }
  }

  const exportLogo = () => {
    const canvas = document.createElement('canvas')
    canvas.width = 400; canvas.height = 400
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = bgColor
    if (shape === 'circle') {
      ctx.beginPath(); ctx.arc(200, 200, 200, 0, Math.PI * 2); ctx.fill()
    } else {
      ctx.fillRect(0, 0, 400, 400)
    }
    ctx.fillStyle = textColor
    ctx.font = `${fontSize * 2}px ${font}`
    ctx.textAlign = 'center'
    ctx.fillText(icon, 200, 180)
    ctx.font = `bold ${Math.min(fontSize, 24) * 2}px ${font}`
    ctx.fillText(brandName, 200, 260)
    const link = document.createElement('a')
    link.download = 'logo.png'
    link.href = canvas.toDataURL()
    link.click()
  }

  return (
    <div ref={containerRef} className={`min-h-screen bg-slate-950 text-slate-300 font-sans flex flex-col ${isFullscreen ? 'fixed inset-0 z-[9999]' : ''}`}>
      <header className="border-b border-slate-800 bg-slate-900/80 p-4 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/camp')} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎯</span>
            <div>
              <h1 className="text-white font-bold tracking-tight">Logo & Brand Designer</h1>
              <div className="text-xs text-violet-400 font-mono">DESIGN_STUDIO</div>
            </div>
          </div>
        </div>
        <button onClick={toggleFullscreen} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors" title="Fullscreen">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
        </button>
      </header>

      <div className="flex-1 p-6 max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Controls */}
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h2 className="text-sm font-bold text-white mb-4">1. Design Your Logo</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 font-bold block mb-1">Brand Name</label>
                <input value={brandName} onChange={e => setBrandName(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-violet-500" />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-bold block mb-2">Shape</label>
                <div className="flex gap-2">
                  {SHAPES.map(s => (
                    <button key={s} onClick={() => setShape(s)} className={`px-3 py-1.5 text-xs font-bold rounded-lg capitalize transition-colors ${shape === s ? 'bg-violet-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>{s}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 font-bold block mb-2">Icon</label>
                <div className="flex flex-wrap gap-2">
                  {ICONS.map(i => (
                    <button key={i} onClick={() => setIcon(i)} className={`w-10 h-10 text-lg flex items-center justify-center rounded-lg transition-all ${icon === i ? 'bg-violet-500 scale-110' : 'bg-slate-800 hover:bg-slate-700'}`}>{i}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 font-bold block mb-1">Background</label>
                  <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} className="w-full h-10 rounded-lg cursor-pointer border-0" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-bold block mb-1">Text Color</label>
                  <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} className="w-full h-10 rounded-lg cursor-pointer border-0" />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 font-bold block mb-1">Font</label>
                <select value={font} onChange={e => setFont(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none">
                  {FONTS.map(f => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 font-bold block mb-1">Font Size: {fontSize}px</label>
                <input type="range" min="14" max="48" value={fontSize} onChange={e => setFontSize(parseInt(e.target.value))} className="w-full accent-violet-500" />
              </div>
            </div>
          </div>
          <button onClick={exportLogo} className="w-full py-3 bg-violet-500 hover:bg-violet-600 text-white font-bold rounded-xl transition-colors">Download Logo PNG</button>
        </div>

        {/* Preview */}
        <div className="flex flex-col items-center gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 flex flex-col items-center w-full">
            <h2 className="text-sm font-bold text-white mb-6">2. Live Preview</h2>
            <div className="bg-[repeating-conic-gradient(#1e293b_0_25%,#0f172a_0_50%)] bg-[length:20px_20px] p-10 rounded-xl">
              <div style={renderShape()}>
                <span style={{ fontSize: fontSize * 1.5 }}>{icon}</span>
                <span style={{ color: textColor, fontFamily: font, fontSize, fontWeight: 'bold', marginTop: 8 }}>{brandName}</span>
              </div>
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 w-full">
            <div className="text-xs text-violet-300 bg-violet-500/10 p-3 rounded-lg border border-violet-500/20">
              <strong>Real Skill:</strong> Logo design is the foundation of branding. Companies like Nike, Apple, and Google invest millions in their logos. You're learning design thinking!
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
