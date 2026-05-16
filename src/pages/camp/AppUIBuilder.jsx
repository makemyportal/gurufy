import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

const PHONE_COMPONENTS = [
  { id: 'header', label: 'Header Bar', icon: '📱', defaultText: 'My App' },
  { id: 'text', label: 'Text Label', icon: '📝', defaultText: 'Hello World!' },
  { id: 'button', label: 'Button', icon: '🔘', defaultText: 'Click Me' },
  { id: 'image', label: 'Image Box', icon: '🖼️', defaultText: '' },
  { id: 'input', label: 'Text Input', icon: '⌨️', defaultText: 'Enter text...' },
  { id: 'card', label: 'Card', icon: '🃏', defaultText: 'Card Content' },
  { id: 'list', label: 'List Item', icon: '📋', defaultText: 'List Item' },
  { id: 'divider', label: 'Divider', icon: '➖', defaultText: '' },
  { id: 'icon-row', label: 'Icon Row', icon: '⭐', defaultText: '' },
  { id: 'bottom-nav', label: 'Bottom Nav', icon: '🔽', defaultText: '' }
]

export default function AppUIBuilder() {
  const navigate = useNavigate()
  const [screens, setScreens] = useState([
    { name: 'Home', elements: [
      { type: 'header', text: 'My First App', color: '#6366f1' },
      { type: 'text', text: 'Welcome to my app!', color: '#ffffff' },
      { type: 'button', text: 'Get Started', color: '#10b981' }
    ]}
  ])
  const [activeScreen, setActiveScreen] = useState(0)
  const [appName, setAppName] = useState('My Cool App')
  const [bgColor, setBgColor] = useState('#0f172a')
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

  const currentScreen = screens[activeScreen]

  const addElement = (comp) => {
    setScreens(prev => {
      const n = [...prev]
      n[activeScreen] = {
        ...n[activeScreen],
        elements: [...n[activeScreen].elements, { type: comp.id, text: comp.defaultText, color: '#6366f1' }]
      }
      return n
    })
  }

  const removeElement = (idx) => {
    setScreens(prev => {
      const n = [...prev]
      n[activeScreen] = {
        ...n[activeScreen],
        elements: n[activeScreen].elements.filter((_, i) => i !== idx)
      }
      return n
    })
  }

  const updateElement = (idx, key, value) => {
    setScreens(prev => {
      const n = [...prev]
      const els = [...n[activeScreen].elements]
      els[idx] = { ...els[idx], [key]: value }
      n[activeScreen] = { ...n[activeScreen], elements: els }
      return n
    })
  }

  const addScreen = () => {
    setScreens(prev => [...prev, { name: 'Screen ' + (prev.length + 1), elements: [] }])
    setActiveScreen(screens.length)
  }

  const renderElement = (el, idx) => {
    switch (el.type) {
      case 'header':
        return <div key={idx} className="py-3 px-4 text-center font-bold text-white text-sm" style={{ background: el.color }}>{el.text}</div>
      case 'text':
        return <div key={idx} className="px-4 py-2 text-sm" style={{ color: el.color }}>{el.text}</div>
      case 'button':
        return <div key={idx} className="px-4 py-2"><div className="py-2.5 text-center text-white text-sm font-bold rounded-xl" style={{ background: el.color }}>{el.text}</div></div>
      case 'image':
        return <div key={idx} className="px-4 py-2"><div className="h-32 rounded-xl flex items-center justify-center text-3xl" style={{ background: el.color + '20', border: `2px dashed ${el.color}` }}>🖼️</div></div>
      case 'input':
        return <div key={idx} className="px-4 py-2"><div className="py-2.5 px-3 rounded-xl border border-slate-600 text-slate-500 text-sm bg-slate-800/50">{el.text}</div></div>
      case 'card':
        return <div key={idx} className="px-4 py-2"><div className="p-4 rounded-xl border border-slate-700 bg-slate-800/50 text-sm text-slate-300">{el.text}</div></div>
      case 'list':
        return <div key={idx} className="px-4 py-1.5 flex items-center gap-3 border-b border-slate-800"><span className="w-2 h-2 rounded-full" style={{ background: el.color }}></span><span className="text-sm text-slate-300">{el.text}</span></div>
      case 'divider':
        return <div key={idx} className="px-4 py-2"><div className="h-px bg-slate-700"></div></div>
      case 'icon-row':
        return <div key={idx} className="px-4 py-2 flex justify-around text-xl">⭐ ❤️ 🔔 👤</div>
      case 'bottom-nav':
        return <div key={idx} className="flex justify-around py-2 border-t border-slate-700 text-xl mt-auto">🏠 🔍 ➕ 💬 👤</div>
      default:
        return null
    }
  }

  return (
    <div ref={containerRef} className={`min-h-screen bg-slate-950 text-slate-300 font-sans flex flex-col ${isFullscreen ? 'fixed inset-0 z-[9999]' : ''}`}>
      <header className="border-b border-slate-800 bg-slate-900/80 p-4 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/camp')} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div className="flex items-center gap-3">
            <span className="text-2xl">📱</span>
            <div>
              <h1 className="text-white font-bold tracking-tight">App UI Builder</h1>
              <div className="text-xs text-indigo-400 font-mono">UX_DESIGN_LAB</div>
            </div>
          </div>
        </div>
        <button onClick={toggleFullscreen} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors" title="Fullscreen">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
        </button>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-0">
        {/* Components Panel */}
        <div className="border-r border-slate-800 overflow-auto">
          <div className="p-4 bg-slate-900 border-b border-slate-800">
            <h2 className="text-sm font-bold text-white mb-2">1. Components</h2>
            <p className="text-[10px] text-indigo-300 bg-indigo-500/10 p-2 rounded border border-indigo-500/20">
              <strong>Tip:</strong> Click components to add them to your phone screen. This is how real app designers work!
            </p>
          </div>
          <div className="p-4 grid grid-cols-2 gap-2">
            {PHONE_COMPONENTS.map(comp => (
              <button key={comp.id} onClick={() => addElement(comp)} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-left transition-colors">
                <span className="text-lg">{comp.icon}</span>
                <div className="text-[10px] font-bold text-slate-300 mt-1">{comp.label}</div>
              </button>
            ))}
          </div>

          {/* Element Editor */}
          <div className="p-4 border-t border-slate-800">
            <h3 className="text-xs font-bold text-white mb-3">Edit Elements (click to remove)</h3>
            {currentScreen?.elements.map((el, idx) => (
              <div key={idx} className="flex items-center gap-2 mb-2 bg-slate-800/50 rounded-lg p-2">
                <input value={el.text} onChange={e => updateElement(idx, 'text', e.target.value)} className="flex-1 bg-transparent text-xs text-white outline-none" placeholder="Text..." />
                <input type="color" value={el.color} onChange={e => updateElement(idx, 'color', e.target.value)} className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent" />
                <button onClick={() => removeElement(idx)} className="text-red-400 text-xs hover:text-red-300">✕</button>
              </div>
            ))}
          </div>
        </div>

        {/* Phone Preview */}
        <div className="flex items-center justify-center p-8 bg-slate-900/30">
          <div className="w-[300px] rounded-[2.5rem] border-4 border-slate-700 overflow-hidden shadow-2xl shadow-indigo-500/10" style={{ background: bgColor }}>
            {/* Phone Notch */}
            <div className="h-8 flex items-center justify-center bg-black">
              <div className="w-20 h-4 bg-slate-900 rounded-full"></div>
            </div>
            {/* Screen */}
            <div className="min-h-[500px] flex flex-col">
              {currentScreen?.elements.map((el, idx) => renderElement(el, idx))}
            </div>
            {/* Home Indicator */}
            <div className="h-6 flex items-center justify-center bg-black">
              <div className="w-24 h-1 bg-slate-600 rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Screens */}
        <div className="border-l border-slate-800 flex flex-col overflow-auto">
          <div className="p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
            <h2 className="text-sm font-bold text-white">Screens</h2>
            <button onClick={addScreen} className="text-xs px-3 py-1 bg-indigo-500 text-white rounded-lg font-bold">+ Add Screen</button>
          </div>
          <div className="p-4 space-y-2">
            {screens.map((s, i) => (
              <button key={i} onClick={() => setActiveScreen(i)} className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-colors ${i === activeScreen ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'}`}>
                📱 {s.name} ({s.elements.length} elements)
              </button>
            ))}
          </div>
          <div className="p-4 border-t border-slate-800 mt-auto">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-slate-400">BG Color:</span>
              <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" />
            </div>
            <div className="text-xs text-indigo-300 bg-indigo-500/10 p-3 rounded-lg border border-indigo-500/20">
              <strong>Real Skill:</strong> UX/UI designers at companies like Apple, Google, and Spotify use tools like Figma to build app interfaces exactly like this!
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
