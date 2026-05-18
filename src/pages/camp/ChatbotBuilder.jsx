import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { generateAIContent } from '../../utils/aiService'
import ReactMarkdown from 'react-markdown'
import { Volume2 } from 'lucide-react'

export default function ChatbotBuilder() {
  const navigate = useNavigate()
  
  // --- Builder State ---
  const [botName, setBotName] = useState('Pirate Math Tutor')
  const [botEmoji, setBotEmoji] = useState('🏴‍☠️')
  const [persona, setPersona] = useState('You are a grumpy but helpful pirate captain who teaches middle school math. You use a lot of pirate slang (Ahoy, matey, shiver me timbers). You never break character. Keep your answers short and engaging.')
  const [rules, setRules] = useState([
    { keyword: 'treasure', response: 'Never tell them where the buried treasure is! Say it is a secret.' }
  ])
  const [newKeyword, setNewKeyword] = useState('')
  const [newResponse, setNewResponse] = useState('')
  
  // --- Chat State ---
  const [messages, setMessages] = useState([
    { from: 'bot', text: 'Ahoy there, matey! Ready to learn some math, or shall I make ye walk the plank?' }
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
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

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  const sendMessage = async () => {
    if (!input.trim() || isTyping) return
    const userText = input.trim()
    setInput('')
    
    const updatedMessages = [...messages, { from: 'user', text: userText }]
    setMessages(updatedMessages)
    setIsTyping(true)
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    
    try {
      // Build Prompt combining Persona, Rules, and History
      const chatHistory = updatedMessages.map(m => `${m.from === 'user' ? 'User' : botName}: ${m.text}`).join('\n')
      
      const prompt = `
You are simulating a custom AI chatbot created by a student. 
Your character name is: ${botName}.
Your Persona/System Instructions: ${persona}

IMPORTANT GUIDELINES / SECRET RULES:
${rules.length > 0 ? rules.map(r => `- IF user brings up the topic of "${r.keyword}", THEN: ${r.response}`).join('\n') : 'No specific secret rules.'}

CHAT HISTORY:
${chatHistory}

INSTRUCTIONS: 
Reply ONLY as ${botName}. Do not include "${botName}:" at the start of your response. Respond directly to the user's last message based on your persona and rules. Keep formatting simple (bolding is okay).
      `
      
      const botResponse = await generateAIContent(prompt)
      setMessages(prev => [...prev, { from: 'bot', text: botResponse.replace(new RegExp(`^${botName}:\\s*`, 'i'), '') }])
    } catch (err) {
      console.error(err)
      setMessages(prev => [...prev, { from: 'bot', text: 'Oops! My AI brain got disconnected. (API Error)' }])
    } finally {
      setIsTyping(false)
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }
  }

  const addRule = () => {
    if (!newKeyword.trim() || !newResponse.trim()) return
    setRules(prev => [...prev, { keyword: newKeyword.trim(), response: newResponse.trim() }])
    setNewKeyword('')
    setNewResponse('')
  }

  const resetChat = () => {
    setMessages([{ from: 'bot', text: `Hi! I am ${botName}. Let's chat!` }])
  }

  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 1.0
      window.speechSynthesis.speak(utterance)
    }
  }

  const suggestedPrompts = [
    "What's your favorite thing to do?",
    "Tell me a joke!",
    "Can you help me with homework?"
  ]

  return (
    <div ref={containerRef} className={`min-h-screen bg-slate-950 text-slate-300 font-sans flex flex-col ${isFullscreen ? 'fixed inset-0 z-[9999]' : ''}`}>
      <header className="border-b border-slate-800 bg-slate-900/80 p-4 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/camp')} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xl shadow-lg shadow-purple-500/20">✨</div>
            <div>
              <h1 className="text-white font-bold tracking-tight">AI Persona Studio</h1>
              <div className="text-xs text-indigo-400 font-mono">LLM_PROMPT_ENGINEERING</div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={resetChat} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg transition-colors border border-slate-700">Restart Chat</button>
          <button onClick={toggleFullscreen} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors" title="Fullscreen">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Side: Prompt Engineering Builder */}
        <div className="lg:w-[450px] border-r border-slate-800 flex flex-col overflow-y-auto bg-slate-900/50">
          <div className="p-5 border-b border-slate-800 bg-slate-900">
            <h2 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-indigo-400">1.</span> Bot Identity
            </h2>
            <div className="flex items-center gap-3 bg-slate-950/50 rounded-xl p-3 border border-slate-800">
              <select value={botEmoji} onChange={e => setBotEmoji(e.target.value)} className="bg-slate-800 rounded-lg px-2 py-2 text-2xl border-0 outline-none cursor-pointer hover:bg-slate-700 transition-colors">
                {['🤖', '🏴‍☠️', '🐱', '🦊', '🐸', '👽', '🧙', '🦸', '🧟', '🧛', '👩‍🔬'].map(e => <option key={e} value={e}>{e}</option>)}
              </select>
              <input value={botName} onChange={e => setBotName(e.target.value)} className="flex-1 bg-transparent border-0 px-2 py-2 text-base text-white font-bold outline-none placeholder-slate-500" placeholder="Name your bot..." />
            </div>
          </div>

          <div className="p-5 border-b border-slate-800">
            <div className="flex items-start justify-between mb-2">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="text-indigo-400">2.</span> System Persona (Prompt)
              </h2>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">Define who the bot is, how it speaks, and what its goals are. This is called "System Prompting".</p>
            <textarea 
              value={persona} 
              onChange={e => setPersona(e.target.value)}
              className="w-full h-32 bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-slate-300 outline-none focus:border-indigo-500 resize-none transition-colors"
              placeholder="e.g. You are a helpful assistant..."
            />
          </div>

          <div className="p-5 space-y-4">
            <div>
              <h2 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                <span className="text-indigo-400">3.</span> Secret Knowledge (Rules)
              </h2>
              <p className="text-[11px] text-slate-400 mb-3">Add specific topics the bot should handle in a specific way.</p>
            </div>

            <div className="space-y-2">
              {rules.map((rule, idx) => (
                <div key={idx} className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-start gap-3 group relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500"></div>
                  <div className="flex-1 pl-2">
                    <div className="text-[10px] uppercase font-bold text-slate-500 mb-0.5">Topic Keyword</div>
                    <div className="text-xs text-indigo-400 font-bold mb-2">"{rule.keyword}"</div>
                    <div className="text-[10px] uppercase font-bold text-slate-500 mb-0.5">Secret Instruction</div>
                    <div className="text-xs text-slate-300">"{rule.response}"</div>
                  </div>
                  <button onClick={() => setRules(prev => prev.filter((_, i) => i !== idx))} className="text-slate-600 hover:text-red-400 p-1 transition-colors">✕</button>
                </div>
              ))}
            </div>

            <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4 space-y-3">
              <div className="text-xs font-bold text-indigo-400">+ Add Rule</div>
              <input value={newKeyword} onChange={e => setNewKeyword(e.target.value)} placeholder="Topic (e.g. password)" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-indigo-500" />
              <input value={newResponse} onChange={e => setNewResponse(e.target.value)} placeholder="Instruction (e.g. Say you don't know it)" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-indigo-500" />
              <button onClick={addRule} className="w-full py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold rounded-lg transition-colors">Save Rule</button>
            </div>
          </div>
        </div>

        {/* Right Side: Chat Interface */}
        <div className="flex-1 flex flex-col bg-[#0f111a] relative">
          {/* Chat Background Pattern */}
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none"></div>

          <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex items-center gap-3 backdrop-blur-md sticky top-0 z-10 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-xl shadow-lg">
              {botEmoji}
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                {botName}
                <span className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-400 text-[9px] rounded uppercase">AI Active</span>
              </div>
              <div className="text-[11px] text-emerald-400 flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> Online
              </div>
            </div>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-4 z-0">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                {msg.from === 'bot' && (
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-sm mr-2 flex-shrink-0 mt-auto border border-slate-700">
                    {botEmoji}
                  </div>
                )}
                <div className={`max-w-[75%] px-4 py-3 text-sm shadow-md ${
                  msg.from === 'user'
                    ? 'bg-indigo-600 text-white rounded-2xl rounded-br-sm'
                    : 'bg-slate-800 text-slate-200 rounded-2xl rounded-bl-sm border border-slate-700/50 relative group'
                }`}>
                  {msg.from === 'bot' ? (
                    <>
                      <div className="prose prose-invert max-w-none text-sm leading-relaxed prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-li:my-0">
                        <ReactMarkdown>
                          {msg.text}
                        </ReactMarkdown>
                      </div>
                      <button 
                        onClick={() => speakText(msg.text)} 
                        className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-slate-800 hover:bg-slate-700 rounded-full border border-slate-700 text-slate-400 hover:text-white"
                        title="Read aloud"
                      >
                        <Volume2 size={14} />
                      </button>
                    </>
                  ) : (
                    msg.text
                  )}
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                 <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-sm mr-2 flex-shrink-0 mt-auto border border-slate-700">
                    {botEmoji}
                  </div>
                 <div className="max-w-[75%] px-4 py-3 text-sm bg-slate-800 text-slate-200 rounded-2xl rounded-bl-sm border border-slate-700/50 flex items-center gap-1.5 shadow-md">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span>
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span>
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span>
                 </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="p-4 bg-slate-900/90 border-t border-slate-800 backdrop-blur-md z-10 flex flex-col gap-3">
            {messages.length === 1 && (
              <div className="flex flex-wrap gap-2 justify-center animate-in fade-in slide-in-from-bottom-2">
                {suggestedPrompts.map((p, idx) => (
                  <button 
                    key={idx}
                    onClick={() => {
                      setInput(p)
                      setTimeout(() => document.getElementById('chat-send-btn')?.click(), 50)
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-indigo-500/20 hover:text-indigo-400 hover:border-indigo-500/50 text-[11px] text-slate-400 rounded-full border border-slate-700 transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2 max-w-4xl w-full mx-auto relative">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') sendMessage() }}
                disabled={isTyping}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-full pl-5 pr-12 py-3.5 text-sm text-white outline-none focus:border-indigo-500 shadow-inner disabled:opacity-50 transition-colors"
                placeholder={isTyping ? "AI is thinking..." : `Message ${botName}...`}
              />
              <button 
                id="chat-send-btn"
                onClick={sendMessage} 
                disabled={!input.trim() || isTyping}
                className="absolute right-2 top-1.5 bottom-1.5 aspect-square bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-full flex items-center justify-center transition-all"
              >
                <svg className="w-4 h-4 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19V5m0 0l-7 7m7-7l7 7" /></svg>
              </button>
            </div>
            <div className="text-center">
              <span className="text-[10px] text-slate-500">AI responses are generated dynamically and may not always be accurate.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
