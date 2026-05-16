import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function APINinja() {
  const navigate = useNavigate()
  
  const [apiUrl, setApiUrl] = useState('https://api.wheretheiss.at/v1/satellites/25544')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Widget Bindings
  const [widgetBindings, setWidgetBindings] = useState([
    { id: 1, label: 'Latitude', jsonKey: 'latitude', type: 'number', color: 'from-blue-500 to-cyan-500' },
    { id: 2, label: 'Longitude', jsonKey: 'longitude', type: 'number', color: 'from-indigo-500 to-purple-500' },
    { id: 3, label: 'Velocity (km/h)', jsonKey: 'velocity', type: 'number', color: 'from-orange-500 to-red-500' }
  ])

  const [newKey, setNewKey] = useState('')
  const [newLabel, setNewLabel] = useState('')

  const fetchAPI = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(apiUrl)
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
      const json = await res.json()
      setData(json)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const addWidget = () => {
    if (!newKey || !newLabel) return
    setWidgetBindings([...widgetBindings, {
      id: Date.now(),
      label: newLabel,
      jsonKey: newKey,
      type: 'text',
      color: 'from-emerald-500 to-teal-500'
    }])
    setNewKey('')
    setNewLabel('')
  }

  const removeWidget = (id) => {
    setWidgetBindings(widgetBindings.filter(w => w.id !== id))
  }

  // Safe getter for nested objects if needed (simple flat support for now)
  const getValue = (key) => {
    if (!data) return '--'
    return data[key] !== undefined ? data[key] : 'Not Found'
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-sans flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 p-4 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/camp')} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div className="flex items-center gap-3">
            <span className="text-2xl">🌍</span>
            <div>
              <h1 className="text-white font-bold tracking-tight">API Ninja: World Tracker</h1>
              <div className="flex items-center gap-2 text-xs text-orange-400 font-mono">
                DATA_STREAM_ACTIVE
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 p-6 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Panel: API Connection & JSON Viewer */}
        <div className="col-span-1 lg:col-span-5 flex flex-col gap-6">
          
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              1. API Link (The Website's Telephone Number)
            </h2>
            <p className="text-xs text-orange-300 mb-4 bg-orange-500/10 p-3 rounded-lg border border-orange-500/20">
              <strong>Teacher Tip:</strong> An API is like a telephone number. We call it, and the other computer answers with data (like the live location of the Space Station)!
            </p>
            
            <div className="flex gap-2">
              <input 
                type="text" 
                value={apiUrl}
                onChange={e => setApiUrl(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-emerald-400 font-mono focus:ring-2 focus:ring-orange-500 outline-none"
                placeholder="https://api.example.com/data"
              />
              <button 
                onClick={fetchAPI}
                disabled={loading}
                className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-all disabled:opacity-50"
              >
                {loading ? 'Fetching...' : 'Fetch'}
              </button>
            </div>
            {error && <p className="text-red-400 text-xs mt-2 bg-red-400/10 p-2 rounded">{error}</p>}
            
            <div className="mt-4 text-xs text-slate-500 flex gap-2">
              Try: 
              <button onClick={() => setApiUrl('https://api.wheretheiss.at/v1/satellites/25544')} className="hover:text-orange-400 underline">ISS Tracker</button> | 
              <button onClick={() => setApiUrl('https://api.coindesk.com/v1/bpi/currentprice.json')} className="hover:text-orange-400 underline">Bitcoin Price</button>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex-1 flex flex-col min-h-[300px]">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">2. The Data Dictionary (Raw JSON)</h2>
            <p className="text-xs text-slate-500 mb-4">
              👉 JSON is just a list of labels (keys) and their values. Look for the keys you want to use!
            </p>
            <div className="flex-1 bg-[#0b1120] border border-slate-800 rounded-xl p-4 overflow-auto">
              {data ? (
                <pre className="text-xs text-emerald-400 font-mono leading-relaxed">
                  {JSON.stringify(data, null, 2)}
                </pre>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-600 text-sm font-mono">
                  No data fetched yet.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel: Widget Dashboard */}
        <div className="col-span-1 lg:col-span-7 flex flex-col gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex-1">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">3. Live Dashboard Widgets</h2>
              <div className="text-xs px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 animate-pulse">
                Auto-updating UI
              </div>
            </div>
            <p className="text-xs text-slate-400 mb-6">Connect the JSON keys from the left panel to these beautiful widgets.</p>

            {/* Widgets Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {widgetBindings.map(widget => (
                <div key={widget.id} className="relative group bg-slate-950 border border-slate-800 rounded-2xl p-5 overflow-hidden">
                  <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${widget.color}`}></div>
                  
                  <button 
                    onClick={() => removeWidget(widget.id)}
                    className="absolute top-3 right-3 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>

                  <div className="text-sm text-slate-500 font-semibold mb-1">{widget.label}</div>
                  <div className="text-2xl font-black text-white truncate font-mono">
                    {getValue(widget.jsonKey)}
                  </div>
                  <div className="text-[10px] text-slate-600 mt-2 font-mono bg-slate-900 px-2 py-0.5 rounded w-fit">
                    Key: {widget.jsonKey}
                  </div>
                </div>
              ))}

              {widgetBindings.length === 0 && (
                <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-800 rounded-2xl">
                  <p className="text-slate-500">No widgets bound. Create one below.</p>
                </div>
              )}
            </div>

            {/* Add Widget Form */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
              <h3 className="text-sm font-bold text-slate-400 mb-4 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                4. Build a New Widget
              </h3>
              <div className="flex gap-3">
                <div className="flex-1">
                  <input 
                    type="text" 
                    value={newKey}
                    onChange={e => setNewKey(e.target.value)}
                    placeholder="e.g., altitude"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-orange-500 font-mono"
                  />
                </div>
                <div className="flex-1">
                  <input 
                    type="text" 
                    value={newLabel}
                    onChange={e => setNewLabel(e.target.value)}
                    placeholder="Widget Title"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
                <button 
                  onClick={addWidget}
                  className="px-5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg transition-colors border border-slate-600"
                >
                  Add
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-3">
                Look at the Raw JSON Response to find keys you want to track (like <code className="text-emerald-400 bg-slate-900 px-1 rounded">latitude</code>).
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
