import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const GRID_SIZE = 24
const COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#14b8a6',
  '#ffffff', '#000000', '#6b7280', '#fbbf24', '#a78bfa',
  '#34d399'
]

export default function PixelArtStudio() {
  const navigate = useNavigate()
  const [selectedColor, setSelectedColor] = useState('#ef4444')
  const [grid, setGrid] = useState(() => Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill('#1e293b')))
  const [isDrawing, setIsDrawing] = useState(false)
  const [tool, setTool] = useState('paint')
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

  const paintCell = useCallback((r, c) => {
    setGrid(prev => {
      const newGrid = prev.map(row => [...row])
      newGrid[r][c] = tool === 'eraser' ? '#1e293b' : selectedColor
      return newGrid
    })
  }, [selectedColor, tool])

  const handleMouseDown = (r, c) => {
    setIsDrawing(true)
    if (tool === 'fill') {
      floodFill(r, c, grid[r][c], selectedColor)
    } else {
      paintCell(r, c)
    }
  }

  const handleMouseEnter = (r, c) => {
    if (isDrawing && tool !== 'fill') {
      paintCell(r, c)
    }
  }

  const floodFill = (r, c, targetColor, fillColor) => {
    if (targetColor === fillColor) return
    setGrid(prev => {
      const newGrid = prev.map(row => [...row])
      const stack = [[r, c]]
      while (stack.length > 0) {
        const [cr, cc] = stack.pop()
        if (cr < 0 || cr >= GRID_SIZE || cc < 0 || cc >= GRID_SIZE) continue
        if (newGrid[cr][cc] !== targetColor) continue
        newGrid[cr][cc] = fillColor
        stack.push([cr - 1, cc], [cr + 1, cc], [cr, cc - 1], [cr, cc + 1])
      }
      return newGrid
    })
  }

  const clearCanvas = () => {
    setGrid(Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill('#1e293b')))
  }

  const exportArt = () => {
    const canvas = document.createElement('canvas')
    const px = 16
    canvas.width = GRID_SIZE * px
    canvas.height = GRID_SIZE * px
    const ctx = canvas.getContext('2d')
    grid.forEach((row, r) => {
      row.forEach((color, c) => {
        ctx.fillStyle = color
        ctx.fillRect(c * px, r * px, px, px)
      })
    })
    const link = document.createElement('a')
    link.download = 'pixel-art.png'
    link.href = canvas.toDataURL()
    link.click()
  }

  return (
    <div ref={containerRef} className={`min-h-screen bg-slate-950 text-slate-300 font-sans flex flex-col ${isFullscreen ? 'fixed inset-0 z-[9999]' : ''}`}
      onMouseUp={() => setIsDrawing(false)}
      onMouseLeave={() => setIsDrawing(false)}
    >
      <header className="border-b border-slate-800 bg-slate-900/80 p-4 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/camp')} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎨</span>
            <div>
              <h1 className="text-white font-bold tracking-tight">Pixel Art Studio</h1>
              <div className="text-xs text-pink-400 font-mono">CREATIVE_DESIGN_LAB</div>
            </div>
          </div>
        </div>
        <button onClick={toggleFullscreen} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors" title="Fullscreen">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
        </button>
      </header>

      <div className="flex-1 p-6 max-w-5xl mx-auto w-full flex flex-col lg:flex-row gap-6">
        {/* Left: Tools */}
        <div className="lg:w-64 flex flex-col gap-4 shrink-0">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h2 className="text-sm font-bold text-white mb-2">1. Pick a Color</h2>
            <p className="text-xs text-pink-300 mb-4 bg-pink-500/10 p-2 rounded border border-pink-500/20">
              <strong>Tip:</strong> Every image on a screen is made of tiny colored squares called Pixels!
            </p>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setSelectedColor(c)}
                  className={`w-10 h-10 rounded-lg border-2 transition-all ${selectedColor === c ? 'border-white scale-110 shadow-lg' : 'border-slate-700 hover:border-slate-500'}`}
                  style={{ background: c }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Custom:</span>
              <input type="color" value={selectedColor} onChange={e => setSelectedColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h2 className="text-sm font-bold text-white mb-3">2. Tools</h2>
            <div className="space-y-2">
              {[
                { id: 'paint', label: '🖌️ Paint Brush', desc: 'Draw pixels' },
                { id: 'eraser', label: '🧹 Eraser', desc: 'Remove pixels' },
                { id: 'fill', label: '🪣 Fill Bucket', desc: 'Fill an area' }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setTool(t.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-semibold transition-all ${tool === t.id ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'}`}
                >
                  {t.label}
                  <div className="text-[10px] font-normal opacity-60">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={clearCanvas} className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-sm font-bold rounded-lg text-slate-300 transition-colors">Clear All</button>
            <button onClick={exportArt} className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-sm font-bold rounded-lg text-white transition-colors">Download PNG</button>
          </div>
        </div>

        {/* Right: Canvas Grid */}
        <div className="flex-1 flex flex-col items-center">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
            <div
              className="inline-grid select-none"
              style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`, gap: '1px', background: '#0f172a', padding: '1px', borderRadius: '8px' }}
            >
              {grid.map((row, r) =>
                row.map((color, c) => (
                  <div
                    key={`${r}-${c}`}
                    onMouseDown={() => handleMouseDown(r, c)}
                    onMouseEnter={() => handleMouseEnter(r, c)}
                    className="cursor-crosshair hover:opacity-75 transition-opacity"
                    style={{ width: '18px', height: '18px', background: color }}
                  />
                ))
              )}
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-4 text-center">
            💡 <strong>Real Skill:</strong> Game artists use pixel art to create characters, items, and worlds. Try making a game character!
          </p>
        </div>
      </div>
    </div>
  )
}
