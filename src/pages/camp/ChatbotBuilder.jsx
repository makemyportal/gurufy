import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

const BOT_RULES = [
  { keyword: 'hello', response: 'Hi there! How can I help you today?' },
  { keyword: 'name', response: 'My name is TechBot! I was built by a student just like you.' },
  { keyword: 'help', response: 'I can answer questions based on the rules you create! Try adding more rules below.' },
  { keyword: 'time', response: 'I cannot tell time yet, but you could add that feature with JavaScript!' },
  { keyword: 'bye', response: 'Goodbye! Have a great day learning!' }
]

export default function ChatbotBuilder() {
  const navigate = useNavigate()
  const [rules, setRules] = useState(BOT_RULES)
  const [messages, setMessages] = useState([
    { from: 'bot', text: 'Hi! I am TechBot. Ask me anything! (I respond based on the rules you create.)' }
  ])
  const [input, setInput] = useState('')
  const [newKeyword, setNewKeyword] = useState('')
  const [newResponse, setNewResponse] = useState('')
  const [botName, setBotName] = useState('TechBot')
  const [botEmoji, setBotEmoji] = useState('🤖')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef(null)
  const chatEndRef = useRef(null)

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

  const sendMessage = () => {
    if (!input.trim()) return
    const userMsg = { from: 'user', text: input }
    const lowerInput = input.toLowerCase()

    // Find matching rule
    let botResponse = "I don't understand that yet. Try adding a rule for it!"
    for (const rule of rules) {
      if (lowerInput.includes(rule.keyword.toLowerCase())) {
        botResponse = rule.response
        break
      }
    }

    setMessages(prev => [...prev, userMsg, { from: 'bot', text: botResponse }])
    setInput('')
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  const addRule = () => {
    if (!newKeyword.trim() || !newResponse.trim()) return
    setRules(prev => [...prev, { keyword: newKeyword.trim(), response: newResponse.trim() }])
    setNewKeyword('')
    setNewResponse('')
  }

  const removeRule = (idx) => {
    setRules(prev => prev.filter((_, i) => i !== idx))
  }

  return (
    <div ref={containerRef} className={`min-h-screen bg-slate-950 text-slate-300 font-sans flex flex-col ${isFullscreen ? 'fixed inset-0 z-[9999]' : ''}`}>
      <header className="border-b border-slate-800 bg-slate-900/80 p-4 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/camp')} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div className="flex items-center gap-3">
            <span className="text-2xl">🤖</span>
            <div>
              <h1 className="text-white font-bold tracking-tight">Chatbot Builder</h1>
              <div className="text-xs text-sky-400 font-mono">AI_BASICS_LAB</div>
            </div>
          </div>
        </div>
        <button onClick={toggleFullscreen} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors" title="Fullscreen">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
        </button>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-0">
        {/* Rules Editor */}
        <div className="border-r border-slate-800 flex flex-col overflow-auto">
          <div className="p-4 bg-slate-900 border-b border-slate-800">
            <h2 className="text-sm font-bold text-white mb-2">1. Bot Brain (Rules)</h2>
            <p className="text-[10px] text-sky-300 bg-sky-500/10 p-2 rounded border border-sky-500/20">
              <strong>Teacher Tip:</strong> Every chatbot follows rules: IF user says [keyword] THEN reply [response]. This is the foundation of AI — pattern matching!
            </p>
          </div>

          <div className="p-4 space-y-4">
            {/* Bot Settings */}
            <div className="flex items-center gap-3 bg-slate-900 rounded-xl p-3 border border-slate-800">
              <select value={botEmoji} onChange={e => setBotEmoji(e.target.value)} className="bg-slate-800 rounded px-2 py-1 text-lg border-0 outline-none">
                {['🤖', '🐱', '🦊', '🐸', '🤡', '👾', '🧙', '🦸'].map(e => <option key={e} value={e}>{e}</option>)}
              </select>
              <input value={botName} onChange={e => setBotName(e.target.value)} className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white outline-none" placeholder="Bot name" />
            </div>

            {/* Rules List */}
            <div className="space-y-2">
              {rules.map((rule, idx) => (
                <div key={idx} className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-start gap-3">
                  <div className="flex-1">
                    <div className="text-xs text-slate-400 mb-1">IF user says: <span className="text-sky-400 font-bold">"{rule.keyword}"</span></div>
                    <div className="text-xs text-slate-400">THEN reply: <span className="text-emerald-400 font-bold">"{rule.response}"</span></div>
                  </div>
                  <button onClick={() => removeRule(idx)} className="text-red-400 text-xs hover:text-red-300 mt-1">✕</button>
                </div>
              ))}
            </div>

            {/* Add Rule */}
            <div className="bg-slate-900 border border-sky-500/20 rounded-xl p-4 space-y-2">
              <div className="text-xs font-bold text-sky-400 mb-2">+ Add New Rule</div>
              <input value={newKeyword} onChange={e => setNewKeyword(e.target.value)} placeholder="Keyword (e.g. weather)" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white outline-none" />
              <input value={newResponse} onChange={e => setNewResponse(e.target.value)} placeholder="Bot response (e.g. I can't check weather yet!)" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white outline-none" />
              <button onClick={addRule} className="w-full py-2 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold rounded-lg">Add Rule</button>
            </div>
          </div>
        </div>

        {/* Chat Preview */}
        <div className="flex flex-col bg-[#0d1117]">
          <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center gap-3">
            <span className="text-2xl">{botEmoji}</span>
            <div>
              <div className="text-sm font-bold text-white">{botName}</div>
              <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Online
              </div>
            </div>
          </div>

          <div className="flex-1 p-4 overflow-auto space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                  msg.from === 'user'
                    ? 'bg-sky-500 text-white rounded-br-sm'
                    : 'bg-slate-800 text-slate-300 rounded-bl-sm'
                }`}>
                  {msg.from === 'bot' && <span className="mr-1">{botEmoji}</span>}
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <div className="p-4 border-t border-slate-800 bg-slate-900">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') sendMessage() }}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-sky-500"
                placeholder="Type a message..."
              />
              <button onClick={sendMessage} className="px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl transition-colors">Send</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
