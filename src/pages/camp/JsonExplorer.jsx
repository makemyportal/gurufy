import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

const SAMPLE_DATA = {
  "Student Data": {
    students: [
      { name: "Alex", age: 15, grades: { math: 92, science: 88 }, hobbies: ["coding", "chess"] },
      { name: "Sam", age: 14, grades: { math: 85, science: 91 }, hobbies: ["gaming", "art"] }
    ],
    school: "Tech Academy",
    year: 2025
  },
  "API Response": {
    status: 200,
    data: {
      user: { id: 1, username: "dev_ninja", email: "ninja@techlab.com", verified: true },
      posts: [
        { id: 101, title: "Learning React", likes: 42 },
        { id: 102, title: "CSS Tricks", likes: 28 }
      ]
    },
    timestamp: "2025-05-16T12:00:00Z"
  },
  "Config File": {
    app: {
      name: "Gurufy Tech Lab",
      version: "2.0.0",
      features: { darkMode: true, analytics: false, maxUsers: 1000 },
      database: { host: "localhost", port: 5432, name: "techlab_db" }
    }
  }
}

function JsonTreeNode({ keyName, value, depth = 0 }) {
  const [expanded, setExpanded] = useState(depth < 2)
  const isObject = value !== null && typeof value === 'object'
  const isArray = Array.isArray(value)

  const getValueColor = (val) => {
    if (typeof val === 'string') return 'text-emerald-400'
    if (typeof val === 'number') return 'text-blue-400'
    if (typeof val === 'boolean') return 'text-orange-400'
    if (val === null) return 'text-red-400'
    return 'text-slate-300'
  }

  if (!isObject) {
    return (
      <div className="flex items-center gap-1 py-0.5" style={{ paddingLeft: depth * 20 }}>
        {keyName !== null && <span className="text-purple-400 font-bold">"{keyName}"</span>}
        {keyName !== null && <span className="text-slate-500">:</span>}
        <span className={getValueColor(value)}>
          {typeof value === 'string' ? `"${value}"` : String(value)}
        </span>
      </div>
    )
  }

  const entries = isArray ? value.map((v, i) => [i, v]) : Object.entries(value)
  const bracket = isArray ? ['[', ']'] : ['{', '}']

  return (
    <div style={{ paddingLeft: depth * 20 }}>
      <div className="flex items-center gap-1 py-0.5 cursor-pointer hover:bg-slate-800/50 rounded" onClick={() => setExpanded(!expanded)}>
        <span className="text-slate-500 w-4 text-center text-xs">{expanded ? '▼' : '▶'}</span>
        {keyName !== null && <span className="text-purple-400 font-bold">"{keyName}"</span>}
        {keyName !== null && <span className="text-slate-500">:</span>}
        <span className="text-slate-400">{bracket[0]}</span>
        {!expanded && <span className="text-slate-600 text-xs">{entries.length} items</span>}
        {!expanded && <span className="text-slate-400">{bracket[1]}</span>}
      </div>
      {expanded && (
        <>
          {entries.map(([key, val]) => (
            <JsonTreeNode key={key} keyName={isArray ? null : key} value={val} depth={depth + 1} />
          ))}
          <div style={{ paddingLeft: 4 }} className="text-slate-400">{bracket[1]}</div>
        </>
      )}
    </div>
  )
}

export default function JsonExplorer() {
  const navigate = useNavigate()
  const [selectedSample, setSelectedSample] = useState('Student Data')
  const [customJson, setCustomJson] = useState('')
  const [parsedData, setParsedData] = useState(SAMPLE_DATA['Student Data'])
  const [error, setError] = useState('')
  const [view, setView] = useState('tree')
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

  const loadSample = (name) => {
    setSelectedSample(name)
    setParsedData(SAMPLE_DATA[name])
    setCustomJson(JSON.stringify(SAMPLE_DATA[name], null, 2))
    setError('')
  }

  const parseCustom = () => {
    try {
      const parsed = JSON.parse(customJson)
      setParsedData(parsed)
      setError('')
    } catch (e) {
      setError(e.message)
    }
  }

  const stats = (() => {
    const str = JSON.stringify(parsedData)
    const keys = (str.match(/"/g) || []).length / 2
    return { size: str.length + ' bytes', depth: JSON.stringify(parsedData, null, 2).split('\n').length + ' lines' }
  })()

  return (
    <div ref={containerRef} className={`min-h-screen bg-slate-950 text-slate-300 font-mono flex flex-col ${isFullscreen ? 'fixed inset-0 z-[9999]' : ''}`}>
      <header className="border-b border-slate-800 bg-slate-900/80 p-4 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/camp')} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div className="flex items-center gap-3">
            <span className="text-2xl">🗄️</span>
            <div>
              <h1 className="text-white font-bold tracking-tight font-sans">JSON Explorer</h1>
              <div className="text-xs text-amber-400">DATA_FORMAT_LAB</div>
            </div>
          </div>
        </div>
        <button onClick={toggleFullscreen} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors" title="Fullscreen">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
        </button>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Editor */}
        <div className="lg:w-1/2 flex flex-col border-r border-slate-800">
          <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
            <div className="flex gap-2">
              {Object.keys(SAMPLE_DATA).map(name => (
                <button key={name} onClick={() => loadSample(name)} className={`px-2 py-1 text-[10px] font-bold rounded transition-colors ${selectedSample === name ? 'bg-amber-500 text-white' : 'bg-slate-800 text-slate-400'}`}>{name}</button>
              ))}
            </div>
          </div>
          <div className="px-4 py-2 bg-amber-500/10 border-b border-slate-800 text-xs text-amber-300">
            <strong>Teacher Tip:</strong> JSON (JavaScript Object Notation) is how apps send data to each other. Every API, database, and config file uses JSON!
          </div>
          <textarea
            value={customJson}
            onChange={e => setCustomJson(e.target.value)}
            onBlur={parseCustom}
            className="flex-1 bg-[#0d1117] p-4 text-sm text-emerald-400 resize-none outline-none leading-relaxed"
            spellCheck={false}
            style={{ minHeight: 300 }}
          />
          {error && <div className="p-3 bg-red-500/10 text-red-400 text-xs border-t border-red-500/20">{error}</div>}
        </div>

        {/* Tree View */}
        <div className="lg:w-1/2 flex flex-col overflow-auto">
          <div className="p-3 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
            <div className="flex gap-2">
              {['tree', 'raw'].map(v => (
                <button key={v} onClick={() => setView(v)} className={`px-3 py-1 text-xs font-bold rounded capitalize ${view === v ? 'bg-amber-500 text-white' : 'bg-slate-800 text-slate-400'}`}>{v} View</button>
              ))}
            </div>
            <div className="text-xs text-slate-500">{stats.size} | {stats.depth}</div>
          </div>
          <div className="flex-1 p-4 overflow-auto text-xs">
            {view === 'tree' ? (
              <JsonTreeNode keyName={null} value={parsedData} depth={0} />
            ) : (
              <pre className="text-emerald-400 whitespace-pre-wrap">{JSON.stringify(parsedData, null, 2)}</pre>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
