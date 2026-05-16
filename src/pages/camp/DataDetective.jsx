import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

const INITIAL_SUSPECTS = [
  { id: 1, name: "Alex", hair_color: "Brown", glasses: "Yes", favorite_snack: "Chips", location: "Library" },
  { id: 2, name: "Sam", hair_color: "Black", glasses: "No", favorite_snack: "Cookies", location: "Cafeteria" },
  { id: 3, name: "Jordan", hair_color: "Blonde", glasses: "Yes", favorite_snack: "Apple", location: "Gym" },
  { id: 4, name: "Taylor", hair_color: "Red", glasses: "No", favorite_snack: "Chips", location: "Library" },
  { id: 5, name: "Casey", hair_color: "Black", glasses: "Yes", favorite_snack: "Cookies", location: "Gym" },
  { id: 6, name: "Riley", hair_color: "Blonde", glasses: "No", favorite_snack: "Pizza", location: "Cafeteria" },
  { id: 7, name: "Morgan", hair_color: "Brown", glasses: "Yes", favorite_snack: "Pizza", location: "Library" },
  { id: 8, name: "Drew", hair_color: "Black", glasses: "Yes", favorite_snack: "Apple", location: "Gym" }
]

const STORY_LEVELS = [
  {
    level: 1,
    title: "The Missing Trophy",
    briefing: "Detective, the school's championship trophy has been stolen! We have a database of students who were in the building. Our first clue: The security guard saw someone running away with **Black** hair.",
    hint: "Try querying: SELECT * FROM suspects WHERE hair_color = 'Black'",
    targetCount: 3, // Sam, Casey, Drew
    successMsg: "Great job! You've narrowed down the list."
  },
  {
    level: 2,
    title: "A Closer Look",
    briefing: "We found a dropped contact lens case at the scene. This means the suspect likely wears **glasses**.",
    hint: "Update your query and add AND: SELECT * FROM suspects WHERE hair_color = 'Black' AND glasses = 'Yes'",
    targetCount: 2, // Casey, Drew
    successMsg: "Excellent deduction. Only two suspects left."
  },
  {
    level: 3,
    title: "The Final Clue",
    briefing: "We found cookie crumbs near the empty trophy case. The suspect's favorite snack must be **Cookies**.",
    hint: "Add another AND: ... AND favorite_snack = 'Cookies'",
    targetCount: 1, // Casey
    successMsg: "You found the culprit! It was Casey!"
  }
]

export default function DataDetective() {
  const navigate = useNavigate()
  const [query, setQuery] = useState("SELECT * FROM suspects")
  const [results, setResults] = useState(INITIAL_SUSPECTS)
  const [error, setError] = useState("")
  const [level, setLevel] = useState(0)
  const [terminalHistory, setTerminalHistory] = useState([
    { type: 'system', text: 'SYSTEM: Connection established to School_Mainframe_DB.' },
    { type: 'system', text: 'SYSTEM: Loading suspects table... [OK]' }
  ])
  const endOfTerminalRef = useRef(null)

  useEffect(() => {
    endOfTerminalRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [terminalHistory])

  const parseAndExecuteSQL = (sql) => {
    setError("")
    let cleanSQL = sql.trim().replace(/\s+/g, ' ')
    
    // Very basic SQL parser for our specific use case
    const selectRegex = /^SELECT \* FROM suspects\s*(WHERE (.+))?$/i
    const match = cleanSQL.match(selectRegex)

    if (!match) {
      return { error: "Syntax Error: Ensure you start with 'SELECT * FROM suspects' and use proper WHERE clauses." }
    }

    const whereClause = match[2]
    if (!whereClause) {
      return { data: INITIAL_SUSPECTS }
    }

    try {
      // Split by AND
      const conditions = whereClause.split(/ AND /i).map(c => c.trim())
      
      const filtered = INITIAL_SUSPECTS.filter(suspect => {
        return conditions.every(cond => {
          // match: column = 'value'
          const condMatch = cond.match(/^(\w+)\s*=\s*'([^']+)'$/)
          if (!condMatch) throw new Error(`Invalid condition format: ${cond}. Use column = 'value'`)
          
          const [, column, value] = condMatch
          if (!(column in suspect)) throw new Error(`Column not found: ${column}`)
          
          return suspect[column].toString().toLowerCase() === value.toLowerCase()
        })
      })

      return { data: filtered }

    } catch (err) {
      return { error: err.message }
    }
  }

  const handleRunQuery = () => {
    const newHistory = [...terminalHistory, { type: 'user', text: `> ${query}` }]
    
    const result = parseAndExecuteSQL(query)
    
    if (result.error) {
      setError(result.error)
      setTerminalHistory([...newHistory, { type: 'error', text: `ERROR: ${result.error}` }])
      return
    }

    setResults(result.data)
    setTerminalHistory([...newHistory, { type: 'system', text: `Query returned ${result.data.length} rows.` }])

    // Check level progression
    const currentLevelData = STORY_LEVELS[level]
    if (currentLevelData && result.data.length === currentLevelData.targetCount) {
      setTimeout(() => {
        setTerminalHistory(prev => [...prev, { type: 'success', text: `MISSION UPDATE: ${currentLevelData.successMsg}` }])
        if (level < STORY_LEVELS.length - 1) {
          setLevel(level + 1)
        } else {
          setTerminalHistory(prev => [...prev, { type: 'success', text: `🏆 MISSION ACCOMPLISHED! THE CASE IS CLOSED.` }])
        }
      }, 1000)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-mono flex flex-col selection:bg-emerald-500/30">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 p-4 flex items-center justify-between backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/camp')} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div className="flex items-center gap-3">
            <span className="text-2xl">🕵️‍♂️</span>
            <div>
              <h1 className="text-white font-bold tracking-tight font-sans">The Data Detective Agency</h1>
              <div className="flex items-center gap-2 text-xs text-emerald-400">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                DB_CONNECTION_SECURE
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="px-4 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-sm">
            Level: <span className="text-white font-bold">{level + 1} / {STORY_LEVELS.length}</span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Panel: Terminal & Editor */}
        <div className="w-1/2 flex flex-col border-r border-slate-800 bg-slate-900/20">
          
          {/* Terminal History */}
          <div className="flex-1 p-6 overflow-y-auto space-y-2">
            {terminalHistory.map((log, i) => (
              <div key={i} className={`text-sm ${
                log.type === 'system' ? 'text-slate-500' : 
                log.type === 'user' ? 'text-emerald-400' :
                log.type === 'success' ? 'text-yellow-400 font-bold' :
                'text-red-400'
              }`}>
                {log.text}
              </div>
            ))}
            <div ref={endOfTerminalRef} />
          </div>

          {/* Editor */}
          <div className="p-6 bg-slate-900 border-t border-slate-800">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">1. Code Editor (Write your SQL Query)</span>
              {error && <span className="text-xs text-red-400 bg-red-400/10 px-2 py-1 rounded">{error}</span>}
            </div>
            <p className="text-xs text-emerald-300/80 mb-3 bg-emerald-500/10 p-2 rounded border border-emerald-500/20">
              <strong>Teacher Tip:</strong> SQL is a special language used to talk to databases. It helps us find exactly what we are looking for!
            </p>
            <div className="relative">
              <textarea 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full h-32 bg-slate-950 border border-slate-800 rounded-xl p-4 text-emerald-400 font-mono text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 resize-none"
                spellCheck="false"
              />
              <button 
                onClick={handleRunQuery}
                className="absolute bottom-4 right-4 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-4 py-2 rounded-lg text-sm transition-all shadow-lg shadow-emerald-500/20"
              >
                Execute Query (F5)
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel: Story & Data Viewer */}
        <div className="w-1/2 flex flex-col bg-slate-950">
          
          {/* Briefing Card */}
          <div className="p-6 border-b border-slate-800">
            <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
              <h2 className="text-xl text-white font-bold mb-2 font-sans flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {STORY_LEVELS[level]?.title || "Case Closed"}
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">
                {STORY_LEVELS[level]?.briefing || "You have successfully solved the mystery."}
              </p>
              {STORY_LEVELS[level] && (
                <div className="bg-slate-950 rounded-lg p-3 text-xs text-slate-500 border border-slate-800/50 flex items-start gap-2">
                  <span className="text-yellow-500 font-bold mt-0.5">HINT:</span>
                  <code className="text-slate-400">{STORY_LEVELS[level].hint}</code>
                </div>
              )}
            </div>
          </div>

          {/* Database Viewer */}
          <div className="flex-1 p-6 overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">2. Database Results</h3>
              <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400">{results.length} rows found</span>
            </div>
            
            <div className="flex-1 overflow-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-900 sticky top-0 text-slate-400 text-xs">
                  <tr>
                    {Object.keys(INITIAL_SUSPECTS[0]).map(key => (
                      <th key={key} className="px-4 py-3 border-b border-slate-800 font-semibold">{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                    {results.map((row) => (
                      <tr 
                        key={row.id}
                        className="hover:bg-slate-900/50 transition-colors"
                      >
                        {Object.values(row).map((val, i) => (
                          <td key={i} className={`px-4 py-3 ${i === 0 ? 'text-slate-500' : 'text-slate-300'}`}>
                            {val}
                          </td>
                        ))}
                      </tr>
                    ))}
                  {results.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-slate-600">
                        No matches found for this query.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
