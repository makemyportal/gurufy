import React, { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

const COLS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
const ROWS = 15

const QUICK_FORMULAS = [
  { label: '∑ SUM', formula: '=SUM(', desc: 'Add numbers', ex: '=SUM(B2:B5)' },
  { label: 'x̄ AVG', formula: '=AVERAGE(', desc: 'Average', ex: '=AVERAGE(B2:B5)' },
  { label: '↑ MAX', formula: '=MAX(', desc: 'Highest', ex: '=MAX(B2:B5)' },
  { label: '↓ MIN', formula: '=MIN(', desc: 'Lowest', ex: '=MIN(B2:B5)' },
  { label: '# COUNT', formula: '=COUNT(', desc: 'Count cells', ex: '=COUNT(B2:B5)' },
  { label: '× MULT', formula: '=MULT(', desc: 'Multiply all', ex: '=MULT(B2:B3)' },
  { label: '% PERC', formula: '=PERC(', desc: 'Percentage', ex: '=PERC(B2,E2)' },
  { label: '√ SQRT', formula: '=SQRT(', desc: 'Square root', ex: '=SQRT(B2)' },
]

function expandRange(rangeStr, allData) {
  const match = rangeStr.match(/^([A-H])(\d+):([A-H])(\d+)$/i)
  if (!match) {
    // Single cell like B2
    const single = rangeStr.trim().toUpperCase()
    return [single]
  }
  const [, sc, sr, ec, er] = match
  const startCol = COLS.indexOf(sc.toUpperCase())
  const endCol = COLS.indexOf(ec.toUpperCase())
  const startRow = parseInt(sr)
  const endRow = parseInt(er)
  const cells = []
  for (let c = startCol; c <= endCol; c++) {
    for (let r = startRow; r <= endRow; r++) {
      cells.push(COLS[c] + r)
    }
  }
  return cells
}

function evalFormula(formula, data) {
  if (!formula || typeof formula !== 'string' || !formula.startsWith('=')) return null
  const clean = formula.trim()

  // Simple arithmetic: =B2+C2+D2 or =B2*2 or =B2/C2
  const arithMatch = clean.match(/^=([A-H]\d+)\s*([+\-*/])\s*([A-H]\d+|\d+\.?\d*)$/i)
  if (arithMatch) {
    const a = parseFloat(data[arithMatch[1].toUpperCase()]) || 0
    const bRaw = arithMatch[3]
    const b = /^[A-H]/i.test(bRaw) ? (parseFloat(data[bRaw.toUpperCase()]) || 0) : parseFloat(bRaw)
    switch (arithMatch[2]) {
      case '+': return Math.round((a + b) * 100) / 100
      case '-': return Math.round((a - b) * 100) / 100
      case '*': return Math.round((a * b) * 100) / 100
      case '/': return b !== 0 ? Math.round((a / b) * 100) / 100 : 'ERR'
      default: return null
    }
  }

  // SQRT single cell: =SQRT(B2)
  const sqrtMatch = clean.match(/^=SQRT\(([A-H]\d+)\)$/i)
  if (sqrtMatch) {
    const v = parseFloat(data[sqrtMatch[1].toUpperCase()]) || 0
    return v >= 0 ? Math.round(Math.sqrt(v) * 100) / 100 : 'ERR'
  }

  // PERC: =PERC(B2,E2) => (B2/E2)*100
  const percMatch = clean.match(/^=PERC\(([A-H]\d+)\s*,\s*([A-H]\d+)\)$/i)
  if (percMatch) {
    const part = parseFloat(data[percMatch[1].toUpperCase()]) || 0
    const total = parseFloat(data[percMatch[2].toUpperCase()]) || 0
    return total !== 0 ? Math.round((part / total) * 10000) / 100 : 'ERR'
  }

  // Function calls: =SUM(B2:B5), =AVERAGE(B2:B5), etc
  const fnMatch = clean.match(/^=(\w+)\((.+)\)$/i)
  if (!fnMatch) return null
  const [, func, args] = fnMatch
  const fn = func.toUpperCase()
  const cells = expandRange(args.trim(), data)
  const vals = cells.map(c => parseFloat(data[c]) || 0)

  switch (fn) {
    case 'SUM': return Math.round(vals.reduce((s, v) => s + v, 0) * 100) / 100
    case 'AVERAGE': case 'AVG': return vals.length ? Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 100) / 100 : 0
    case 'MAX': return Math.max(...vals)
    case 'MIN': return Math.min(...vals)
    case 'COUNT': return cells.filter(c => data[c] && data[c].toString().trim() !== '').length
    case 'MULT': case 'PRODUCT': return Math.round(vals.reduce((s, v) => s * v, 1) * 100) / 100
    default: return 'ERR:FN'
  }
}

function recomputeAll(rawData) {
  const computed = {}
  Object.entries(rawData).forEach(([id, val]) => {
    if (typeof val === 'string' && val.startsWith('=')) {
      const result = evalFormula(val, rawData)
      if (result !== null) computed[id] = result
    }
  })
  return computed
}

export default function SpreadsheetSim() {
  const navigate = useNavigate()
  const [data, setData] = useState(() => {
    const d = {}
    d['A1'] = 'Student'; d['B1'] = 'Math'; d['C1'] = 'Science'; d['D1'] = 'English'; d['E1'] = 'Total'; d['F1'] = 'Average'; d['G1'] = 'Grade'
    d['A2'] = 'Alex';   d['B2'] = '85'; d['C2'] = '92'; d['D2'] = '78'
    d['A3'] = 'Sam';    d['B3'] = '90'; d['C3'] = '88'; d['D3'] = '95'
    d['A4'] = 'Jordan'; d['B4'] = '76'; d['C4'] = '81'; d['D4'] = '89'
    d['A5'] = 'Taylor'; d['B5'] = '92'; d['C5'] = '75'; d['D5'] = '84'
    d['A6'] = 'Priya';  d['B6'] = '88'; d['C6'] = '94'; d['D6'] = '91'
    d['A8'] = 'Class Average'; d['A9'] = 'Highest'; d['A10'] = 'Lowest'
    return d
  })
  const [selectedCell, setSelectedCell] = useState(null)
  const [formulaBar, setFormulaBar] = useState('')
  const [computedCells, setComputedCells] = useState({})
  const [boldCells, setBoldCells] = useState({ A1: true, B1: true, C1: true, D1: true, E1: true, F1: true, G1: true, A8: true, A9: true, A10: true })
  const [history, setHistory] = useState([])
  const [editingCell, setEditingCell] = useState(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef(null)

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen().catch(() => {})
    else document.exitFullscreen()
  }
  React.useEffect(() => {
    const h = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', h)
    return () => document.removeEventListener('fullscreenchange', h)
  }, [])

  const applyChange = useCallback((cellId, value) => {
    const newData = { ...data, [cellId]: value }
    setData(newData)
    setComputedCells(recomputeAll(newData))
    setHistory(prev => [...prev.slice(-19), { cell: cellId, value, time: Date.now() }])
  }, [data])

  const handleCellClick = (cellId) => {
    setSelectedCell(cellId)
    setFormulaBar(data[cellId] || '')
    setEditingCell(null)
  }

  const handleFormulaSubmit = () => {
    if (selectedCell) {
      applyChange(selectedCell, formulaBar)
      setEditingCell(null)
    }
  }

  const insertQuickFormula = (f) => {
    if (!selectedCell) return
    setFormulaBar(f.formula)
  }

  const toggleBold = () => {
    if (!selectedCell) return
    setBoldCells(prev => ({ ...prev, [selectedCell]: !prev[selectedCell] }))
  }

  const clearAll = () => {
    setData({})
    setComputedCells({})
    setHistory([])
  }

  const displayValue = (cellId) => {
    if (computedCells[cellId] !== undefined) return computedCells[cellId]
    return data[cellId] || ''
  }

  return (
    <div ref={containerRef} className={`min-h-screen bg-slate-950 text-slate-300 font-sans flex flex-col ${isFullscreen ? 'fixed inset-0 z-[9999]' : ''}`}>
      <header className="border-b border-slate-800 bg-slate-900/80 p-4 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/camp')} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div className="flex items-center gap-3">
            <span className="text-2xl">📊</span>
            <div>
              <h1 className="text-white font-bold tracking-tight">Spreadsheet Simulator</h1>
              <div className="text-xs text-teal-400 font-mono">DATA_ANALYTICS_PRO</div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={clearAll} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-lg text-slate-300">Clear All</button>
          <button onClick={toggleFullscreen} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors" title="Fullscreen">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Formula Bar */}
        <div className="flex items-center gap-2 p-2 border-b border-slate-800 bg-slate-900 shrink-0">
          <span className="text-xs font-black text-teal-400 bg-slate-800 px-2.5 py-1.5 rounded w-14 text-center font-mono">{selectedCell || '—'}</span>
          <span className="text-slate-600 text-sm font-bold">fx</span>
          <input
            value={formulaBar}
            onChange={e => setFormulaBar(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { handleFormulaSubmit(); e.target.blur() } }}
            onBlur={handleFormulaSubmit}
            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-sm font-mono text-white outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30"
            placeholder="Type value or formula: =SUM(B2:B5)"
          />
          <button onClick={handleFormulaSubmit} className="px-3 py-1.5 bg-teal-500 hover:bg-teal-600 text-white text-xs font-bold rounded-lg transition-colors">Run ▶</button>
        </div>

        {/* Quick Formula Toolbar */}
        <div className="flex items-center gap-1 p-2 border-b border-slate-800 bg-slate-900/50 overflow-x-auto shrink-0">
          <button onClick={toggleBold} className={`px-2.5 py-1.5 text-xs font-black rounded-lg transition-colors ${selectedCell && boldCells[selectedCell] ? 'bg-teal-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>B</button>
          <div className="w-px h-5 bg-slate-700 mx-1"></div>
          {QUICK_FORMULAS.map(f => (
            <button key={f.label} onClick={() => insertQuickFormula(f)} className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-[10px] font-bold rounded-lg text-slate-300 whitespace-nowrap transition-colors" title={`${f.desc}: ${f.ex}`}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Tip */}
        <div className="px-3 py-1.5 bg-teal-500/10 border-b border-slate-800 text-[11px] text-teal-300 shrink-0">
          <strong>Formulas:</strong> <code className="bg-slate-800 px-1 rounded">=SUM(B2:B5)</code> <code className="bg-slate-800 px-1 rounded">=B2+C2+D2</code> <code className="bg-slate-800 px-1 rounded">=B2*2</code> <code className="bg-slate-800 px-1 rounded">=PERC(B2,E2)</code> — Click a formula button above, then type the range & press <kbd className="bg-slate-800 px-1 rounded">Enter</kbd> or <kbd className="bg-slate-800 px-1 rounded">Run ▶</kbd>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse" style={{ minWidth: COLS.length * 120 + 50 }}>
            <thead className="sticky top-0 z-[5]">
              <tr>
                <th className="bg-slate-800 text-slate-500 text-[10px] p-1.5 w-10 border border-slate-700 sticky left-0 z-[6]"></th>
                {COLS.map(col => (
                  <th key={col} className="bg-slate-800 text-slate-400 text-xs font-bold p-1.5 min-w-[110px] border border-slate-700">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: ROWS }, (_, r) => r + 1).map(row => (
                <tr key={row}>
                  <td className="bg-slate-800 text-slate-500 text-[10px] font-bold p-1.5 text-center border border-slate-700 sticky left-0 z-[4]">{row}</td>
                  {COLS.map(col => {
                    const cellId = col + row
                    const isSelected = selectedCell === cellId
                    const val = displayValue(cellId)
                    const rawVal = data[cellId]
                    const isFormula = typeof rawVal === 'string' && rawVal?.startsWith('=')
                    const isBold = boldCells[cellId]
                    const isHeader = row === 1
                    const isError = val === 'ERR' || val === 'ERR:FN'
                    return (
                      <td
                        key={cellId}
                        onClick={() => handleCellClick(cellId)}
                        className={`border border-slate-800/60 p-0 transition-all ${isSelected ? 'ring-2 ring-teal-500 z-10 relative bg-teal-500/5' : ''}`}
                      >
                        <input
                          value={editingCell === cellId ? formulaBar : val}
                          onChange={e => { setFormulaBar(e.target.value); setEditingCell(cellId) }}
                          onFocus={() => { handleCellClick(cellId); setEditingCell(cellId) }}
                          onBlur={handleFormulaSubmit}
                          onKeyDown={e => { if (e.key === 'Enter') { handleFormulaSubmit(); e.target.blur() } }}
                          className={`w-full h-full bg-transparent px-2 py-2 text-sm font-mono outline-none ${
                            isError ? 'text-red-400 font-bold' :
                            isHeader ? 'font-bold text-white bg-slate-900/50' :
                            isFormula ? 'text-teal-400' :
                            typeof val === 'number' || (!isNaN(val) && val !== '') ? 'text-blue-300' :
                            'text-slate-300'
                          } ${isBold ? 'font-bold' : ''}`}
                        />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bottom Panel: History + Tips */}
        <div className="border-t border-slate-800 bg-slate-900 p-3 shrink-0">
          <div className="flex items-start gap-4 max-w-6xl mx-auto">
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Recent Actions</div>
              <div className="flex gap-1.5 overflow-x-auto">
                {history.length === 0 ? (
                  <span className="text-[10px] text-slate-600">No actions yet. Click a cell and type a value or formula.</span>
                ) : (
                  history.slice(-6).reverse().map((h, i) => (
                    <span key={i} className="text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded font-mono whitespace-nowrap shrink-0">
                      {h.cell}={typeof h.value === 'string' && h.value.length > 15 ? h.value.slice(0, 15) + '…' : h.value}
                    </span>
                  ))
                )}
              </div>
            </div>
            <div className="text-[10px] text-teal-300 bg-teal-500/10 px-3 py-2 rounded-lg border border-teal-500/20 shrink-0 max-w-[280px]">
              <strong>💡 Real Skill:</strong> Excel & Google Sheets use the exact same formulas. Mastering this opens doors in Finance, Business & Data Science!
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
