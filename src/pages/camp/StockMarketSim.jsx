import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

const STOCKS = [
  { symbol: 'AAPL', name: 'Apple Inc.', basePrice: 178, sector: 'Tech' },
  { symbol: 'GOOGL', name: 'Alphabet', basePrice: 141, sector: 'Tech' },
  { symbol: 'TSLA', name: 'Tesla Inc.', basePrice: 245, sector: 'Auto' },
  { symbol: 'AMZN', name: 'Amazon', basePrice: 185, sector: 'Retail' },
  { symbol: 'MSFT', name: 'Microsoft', basePrice: 415, sector: 'Tech' },
  { symbol: 'NFLX', name: 'Netflix', basePrice: 620, sector: 'Media' },
  { symbol: 'META', name: 'Meta Platforms', basePrice: 510, sector: 'Tech' },
  { symbol: 'NVDA', name: 'NVIDIA', basePrice: 135, sector: 'Tech' }
]

export default function StockMarketSim() {
  const navigate = useNavigate()
  const [balance, setBalance] = useState(10000)
  const [portfolio, setPortfolio] = useState({})
  const [prices, setPrices] = useState(() => {
    const p = {}
    STOCKS.forEach(s => { p[s.symbol] = s.basePrice })
    return p
  })
  const [priceHistory, setPriceHistory] = useState(() => {
    const h = {}
    STOCKS.forEach(s => { h[s.symbol] = [s.basePrice] })
    return h
  })
  const [day, setDay] = useState(1)
  const [news, setNews] = useState('Market is open. Start trading!')
  const [selectedStock, setSelectedStock] = useState(null)
  const [qty, setQty] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
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

  const NEWS_EVENTS = [
    { text: 'Tech stocks surge on AI breakthrough!', sector: 'Tech', impact: 1.08 },
    { text: 'Electric vehicle sales hit record high!', sector: 'Auto', impact: 1.12 },
    { text: 'Streaming wars heat up — subscribers growing!', sector: 'Media', impact: 1.06 },
    { text: 'Retail giant reports strong quarterly earnings!', sector: 'Retail', impact: 1.09 },
    { text: 'Market dips on inflation fears.', sector: 'all', impact: 0.95 },
    { text: 'Tech regulation concerns spook investors.', sector: 'Tech', impact: 0.92 },
    { text: 'Holiday season boosts retail spending!', sector: 'Retail', impact: 1.07 },
    { text: 'Chip shortage drives GPU prices up!', sector: 'Tech', impact: 1.1 },
    { text: 'Oil prices spike — market uncertainty grows.', sector: 'all', impact: 0.97 },
    { text: 'Major tech company announces stock split!', sector: 'Tech', impact: 1.05 }
  ]

  const advanceDay = () => {
    const event = NEWS_EVENTS[Math.floor(Math.random() * NEWS_EVENTS.length)]
    setNews(event.text)

    const newPrices = { ...prices }
    const newHistory = { ...priceHistory }
    STOCKS.forEach(stock => {
      let change = 0.97 + Math.random() * 0.06
      if (event.sector === 'all' || event.sector === stock.sector) {
        change *= event.impact
      }
      newPrices[stock.symbol] = Math.round(newPrices[stock.symbol] * change * 100) / 100
      newHistory[stock.symbol] = [...(newHistory[stock.symbol] || []), newPrices[stock.symbol]].slice(-20)
    })
    setPrices(newPrices)
    setPriceHistory(newHistory)
    setDay(d => d + 1)
  }

  const buyStock = (symbol) => {
    const cost = prices[symbol] * qty
    if (cost > balance) return
    setBalance(b => Math.round((b - cost) * 100) / 100)
    setPortfolio(p => ({ ...p, [symbol]: (p[symbol] || 0) + qty }))
  }

  const sellStock = (symbol) => {
    if (!portfolio[symbol] || portfolio[symbol] < qty) return
    const revenue = prices[symbol] * qty
    setBalance(b => Math.round((b + revenue) * 100) / 100)
    setPortfolio(p => {
      const n = { ...p }
      n[symbol] -= qty
      if (n[symbol] <= 0) delete n[symbol]
      return n
    })
  }

  const portfolioValue = Object.entries(portfolio).reduce((sum, [sym, q]) => sum + prices[sym] * q, 0)
  const totalValue = balance + portfolioValue
  const profit = totalValue - 10000

  return (
    <div ref={containerRef} className={`min-h-screen bg-slate-950 text-slate-300 font-sans flex flex-col ${isFullscreen ? 'fixed inset-0 z-[9999]' : ''}`}>
      <header className="border-b border-slate-800 bg-slate-900/80 p-4 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/camp')} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div className="flex items-center gap-3">
            <span className="text-2xl">💰</span>
            <div>
              <h1 className="text-white font-bold tracking-tight">Stock Market Simulator</h1>
              <div className="text-xs text-green-400 font-mono">FINANCIAL_LITERACY</div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-slate-500">Day {day}</div>
            <button onClick={advanceDay} className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-lg transition-colors">Next Day →</button>
          </div>
          <button onClick={toggleFullscreen} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors" title="Fullscreen">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
          </button>
        </div>
      </header>

      <div className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {/* News Ticker */}
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 mb-4 flex items-center gap-3">
          <span className="text-yellow-500 font-bold text-sm">📰 NEWS:</span>
          <span className="text-yellow-300 text-sm">{news}</span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Cash Balance', value: '$' + balance.toLocaleString(), color: 'text-white' },
            { label: 'Portfolio Value', value: '$' + portfolioValue.toLocaleString(), color: 'text-blue-400' },
            { label: 'Total Value', value: '$' + totalValue.toLocaleString(), color: 'text-emerald-400' },
            { label: 'Profit/Loss', value: (profit >= 0 ? '+' : '') + '$' + profit.toLocaleString(), color: profit >= 0 ? 'text-emerald-400' : 'text-red-400' }
          ].map(s => (
            <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-[10px] text-slate-500 font-bold uppercase">{s.label}</div>
              <div className={`text-xl font-black font-mono ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stock List */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <span className="text-sm font-bold text-white">Market Stocks</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Qty:</span>
                <input type="number" min="1" max="100" value={qty} onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))} className="w-16 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white text-center" />
              </div>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-950 text-xs text-slate-500">
                <tr>
                  <th className="p-3 text-left">Symbol</th>
                  <th className="p-3 text-left">Company</th>
                  <th className="p-3 text-right">Price</th>
                  <th className="p-3 text-right">Change</th>
                  <th className="p-3 text-right">Owned</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {STOCKS.map(stock => {
                  const history = priceHistory[stock.symbol] || []
                  const prev = history.length >= 2 ? history[history.length - 2] : stock.basePrice
                  const curr = prices[stock.symbol]
                  const changePct = ((curr - prev) / prev * 100).toFixed(2)
                  const isUp = curr >= prev
                  return (
                    <tr key={stock.symbol} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3 font-bold text-white">{stock.symbol}</td>
                      <td className="p-3 text-slate-400">{stock.name}</td>
                      <td className="p-3 text-right font-mono text-white">${curr.toFixed(2)}</td>
                      <td className={`p-3 text-right font-mono font-bold ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                        {isUp ? '▲' : '▼'} {changePct}%
                      </td>
                      <td className="p-3 text-right font-mono text-blue-400">{portfolio[stock.symbol] || 0}</td>
                      <td className="p-3 text-center">
                        <div className="flex gap-1 justify-center">
                          <button onClick={() => buyStock(stock.symbol)} className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded hover:bg-emerald-500/30 transition-colors">Buy</button>
                          <button onClick={() => sellStock(stock.symbol)} disabled={!portfolio[stock.symbol]} className="px-3 py-1 bg-red-500/20 text-red-400 text-xs font-bold rounded hover:bg-red-500/30 transition-colors disabled:opacity-30">Sell</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Tips Panel */}
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-white mb-3">📚 Learn Finance</h3>
              <div className="space-y-3 text-xs text-slate-400">
                <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20 text-green-300">
                  <strong>Buy Low, Sell High:</strong> The golden rule! Buy when prices drop and sell when they rise.
                </div>
                <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20 text-blue-300">
                  <strong>Diversify:</strong> Don't put all your money in one stock. Spread the risk!
                </div>
                <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20 text-purple-300">
                  <strong>Read the News:</strong> News events affect stock prices. Pay attention to the ticker above!
                </div>
                <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20 text-yellow-300">
                  <strong>Portfolio Value:</strong> Total money = Cash + (Shares x Current Price). Track your profit!
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
