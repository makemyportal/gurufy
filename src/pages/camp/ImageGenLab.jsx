import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, Sparkles, Image as ImageIcon, Maximize2, Loader2, ArrowLeft } from 'lucide-react'

const MODIFIERS = [
  { id: 'cyberpunk', label: 'Cyberpunk', keyword: 'cyberpunk, neon lights, futuristic city, highly detailed, 8k resolution' },
  { id: 'anime', label: 'Anime Style', keyword: 'anime style, studio ghibli, vibrant colors, detailed background' },
  { id: 'watercolor', label: 'Watercolor', keyword: 'watercolor painting, soft edges, pastel colors, artistic' },
  { id: 'photoreal', label: 'Photorealistic', keyword: 'photorealistic, 85mm lens, sharp focus, hyper-realistic, 8k, unreal engine 5' },
  { id: '3d', label: '3D Render', keyword: '3d render, octane render, cinematic lighting, clay material, smooth' },
  { id: 'sketch', label: 'Pencil Sketch', keyword: 'pencil sketch, black and white, detailed shading, hand-drawn' }
]

const INSPIRATIONS = [
  "A tiny astronaut riding a giant golden retriever through space",
  "A futuristic city built entirely inside a giant glowing mushroom",
  "A robotic cat reading a glowing magical book in a library",
  "A majestic castle floating on clouds at sunset",
  "A cute baby dragon sleeping on a pile of gold coins"
]

export default function ImageGenLab() {
  const navigate = useNavigate()
  const [prompt, setPrompt] = useState('')
  const [activeModifiers, setActiveModifiers] = useState([])
  const [imageUrl, setImageUrl] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [seed, setSeed] = useState(Math.floor(Math.random() * 1000000))
  const containerRef = useRef(null)

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen()
    }
  }

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  const toggleModifier = (mod) => {
    setActiveModifiers(prev => 
      prev.find(m => m.id === mod.id)
        ? prev.filter(m => m.id !== mod.id)
        : [...prev, mod]
    )
  }

  const inspireMe = () => {
    const randomPrompt = INSPIRATIONS[Math.floor(Math.random() * INSPIRATIONS.length)]
    setPrompt(randomPrompt)
  }

  const generateImage = () => {
    if (!prompt.trim()) return
    setIsLoading(true)
    const newSeed = Math.floor(Math.random() * 1000000)
    setSeed(newSeed)
    
    // Construct final prompt
    let finalPrompt = prompt.trim()
    if (activeModifiers.length > 0) {
      const modifierString = activeModifiers.map(m => m.keyword).join(', ')
      finalPrompt += `, ${modifierString}`
    }

    const encodedPrompt = encodeURIComponent(finalPrompt)
    const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&seed=${newSeed}&nologo=true`
    
    // Preload image
    const img = new Image()
    img.onload = () => {
      setImageUrl(url)
      setIsLoading(false)
    }
    img.onerror = () => {
      setIsLoading(false)
      alert('Failed to generate image. Try a different prompt.')
    }
    img.src = url
  }

  const downloadImage = async () => {
    if (!imageUrl) return
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `ai-art-${seed}.jpg`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(blobUrl)
    } catch (err) {
      console.error('Download failed', err)
      alert('Failed to download image.')
    }
  }

  return (
    <div ref={containerRef} className={`min-h-screen bg-slate-950 text-slate-300 font-sans flex flex-col ${isFullscreen ? 'fixed inset-0 z-[9999]' : ''}`}>
      <header className="border-b border-slate-800 bg-slate-900/80 p-4 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/camp')} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-600 flex items-center justify-center text-white shadow-lg shadow-pink-500/20">
              <Sparkles size={20} />
            </div>
            <div>
              <h1 className="text-white font-bold tracking-tight">AI Image Generator</h1>
              <div className="text-xs text-fuchsia-400 font-mono">VISUAL_PROMPT_ENGINEERING</div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={toggleFullscreen} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors" title="Fullscreen">
            <Maximize2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Side: Prompt Editor */}
        <div className="lg:w-[450px] border-r border-slate-800 flex flex-col overflow-y-auto bg-slate-900/50">
          <div className="p-6 border-b border-slate-800">
            <div className="flex items-start justify-between mb-2">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="text-fuchsia-400">1.</span> Describe Your Image
              </h2>
              <button onClick={inspireMe} className="text-xs text-fuchsia-400 hover:text-fuchsia-300 flex items-center gap-1 font-medium transition-colors">
                <Sparkles size={12} /> Inspire Me
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">Be descriptive! Tell the AI what you want to see. This is called "Prompting".</p>
            <textarea 
              value={prompt} 
              onChange={e => setPrompt(e.target.value)}
              className="w-full h-32 bg-slate-950 border border-slate-700 rounded-xl p-4 text-sm text-slate-200 outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 resize-none transition-all shadow-inner"
              placeholder="A futuristic city in the clouds..."
            />
          </div>

          <div className="p-6 border-b border-slate-800">
            <div className="flex items-start justify-between mb-2">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="text-fuchsia-400">2.</span> Add Art Styles
              </h2>
            </div>
            <p className="text-[11px] text-slate-400 mb-4">Click to append professional style keywords to your prompt.</p>
            
            <div className="flex flex-wrap gap-2">
              {MODIFIERS.map(mod => {
                const isActive = activeModifiers.some(m => m.id === mod.id)
                return (
                  <button
                    key={mod.id}
                    onClick={() => toggleModifier(mod)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                      isActive 
                        ? 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/50' 
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-300'
                    }`}
                  >
                    {isActive && <span className="mr-1">✓</span>}
                    {mod.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="p-6 mt-auto">
            <button 
              onClick={generateImage}
              disabled={isLoading || !prompt.trim()}
              className="w-full py-3.5 bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 disabled:opacity-50 disabled:grayscale text-white font-bold rounded-xl shadow-lg shadow-pink-500/20 transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate AI Art
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Side: Image Canvas */}
        <div className="flex-1 bg-[#0a0a0f] relative flex items-center justify-center p-8">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] pointer-events-none"></div>

          {imageUrl ? (
            <div className="relative group max-w-2xl w-full aspect-square rounded-2xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-900 animate-in zoom-in-95 duration-500">
              {isLoading && (
                <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                  <Loader2 className="w-12 h-12 text-fuchsia-500 animate-spin mb-4" />
                  <div className="text-fuchsia-400 font-mono text-sm animate-pulse">Running Diffusion Model...</div>
                </div>
              )}
              <img src={imageUrl} alt={prompt} className="w-full h-full object-cover" />
              
              {/* Overlay Controls */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                <div className="flex items-end justify-between">
                  <div className="flex-1 pr-4">
                    <p className="text-white text-sm font-medium line-clamp-2">{prompt}</p>
                    <div className="flex gap-2 mt-2">
                      {activeModifiers.map(m => (
                        <span key={m.id} className="text-[10px] uppercase font-bold text-fuchsia-400 bg-fuchsia-400/20 px-2 py-0.5 rounded">
                          {m.label}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button 
                    onClick={downloadImage}
                    className="p-3 bg-white text-black hover:bg-slate-200 rounded-full font-bold shadow-xl transition-transform hover:scale-105 flex-shrink-0"
                    title="Download High-Res Image"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-md w-full text-center space-y-6">
              <div className="w-24 h-24 rounded-full bg-slate-900 border-2 border-dashed border-slate-800 flex items-center justify-center mx-auto shadow-inner">
                <ImageIcon className="w-10 h-10 text-slate-700" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Ready to Create</h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Enter a prompt on the left and select your art styles to generate a high-resolution AI masterpiece.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
