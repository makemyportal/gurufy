import React, { useState, useRef, useEffect } from 'react'
import { MessageSquare, X, Send, Bot, Loader2, Minimize2, Maximize2 } from 'lucide-react'
import { generateAIContent } from '../utils/aiService'

const AIBotIcon = ({ className = "w-12 h-12", isPulsing = false }) => (
  <div className={`relative flex items-center justify-center ${className}`}>
    <div className={`absolute inset-0 bg-blue-500 rounded-full blur-[12px] opacity-40 mix-blend-screen ${isPulsing ? 'animate-pulse' : ''}`} />
    <svg viewBox="0 0 100 100" fill="none" className="relative z-10 w-full h-full drop-shadow-[0_4px_10px_rgba(79,70,229,0.5)]">
      <defs>
        <linearGradient id="botGrad" x1="10" y1="20" x2="90" y2="80" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366f1" />
          <stop offset="1" stopColor="#3b82f6" />
        </linearGradient>
        <linearGradient id="visorGrad" x1="20" y1="40" x2="80" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0f172a" />
          <stop offset="1" stopColor="#1e293b" />
        </linearGradient>
      </defs>
      
      {/* Main Casing */}
      <rect x="25" y="30" width="50" height="46" rx="14" fill="url(#botGrad)" stroke="white" strokeWidth="2.5" />
      
      {/* Screen/Visor */}
      <rect x="30" y="42" width="40" height="20" rx="8" fill="url(#visorGrad)" stroke="#1e1b4b" strokeWidth="1" />
      
      {/* Glowing Eyes */}
      <circle cx="40" cy="52" r="3.5" fill="#38bdf8" className={`${isPulsing ? 'animate-pulse' : ''}`} style={{ filter: 'drop-shadow(0 0 3px #38bdf8)' }} />
      <circle cx="60" cy="52" r="3.5" fill="#38bdf8" className={`${isPulsing ? 'animate-pulse' : ''}`} style={{ filter: 'drop-shadow(0 0 3px #38bdf8)' }} />
      
      {/* Side Earpieces */}
      <rect x="18" y="45" width="7" height="16" rx="3.5" fill="#818cf8" stroke="white" strokeWidth="2" />
      <rect x="75" y="45" width="7" height="16" rx="3.5" fill="#818cf8" stroke="white" strokeWidth="2" />
      
      {/* Antenna base & stem */}
      <path d="M48 30 V16" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <path d="M52 30 V16" stroke="white" strokeWidth="2" strokeLinecap="round" />
      
      {/* Antenna Glowing Orb */}
      <circle cx="50" cy="12" r="4.5" fill="#60a5fa" className="animate-ping" style={{ animationDuration: '3s' }} />
      <circle cx="50" cy="12" r="4.5" fill="#eff6ff" />
    </svg>
  </div>
)

export default function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [messages, setMessages] = useState([
    { id: '1', role: 'assistant', text: "Welcome. I am the LDMS AI Assistant.\n\nI am equipped to provide advanced pedagogical support, generate comprehensive lesson plans, and deliver precise educational insights. How may I assist you today?" }
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isOpen) scrollToBottom()
  }, [messages, isOpen])

  const handleSend = async (e, directMsg = null) => {
    e?.preventDefault()
    const userMsg = directMsg || input.trim()
    if (!userMsg || isTyping) return

    setInput('')
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text: userMsg }])
    setIsTyping(true)

    try {
      // Build conversation context for prompt
      const contextBlocks = messages.slice(-5).map(m => `${m.role === 'assistant' ? 'LDMS AI' : 'User'}: ${m.text}`).join('\n')
      const prompt = `You are the highly advanced, professional, and intelligent LDMS AI Assistant for educators. Your tone MUST be extremely clean, direct, academic, and highly sophisticated. Do not use overly enthusiastic emojis or informal language. Be precise, highly informed, and provide elite-level educational insights.
Below is the recent chat history:
${contextBlocks}
User: ${userMsg}

Respond to the user in a highly professional and clean manner.`

      const reply = await generateAIContent(prompt)
      let cleanReply = reply.trim()
      if (cleanReply.startsWith('"') && cleanReply.endsWith('"')) cleanReply = cleanReply.slice(1, -1)
      
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', text: cleanReply }])
    } catch (err) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', text: "I'm having a little trouble connecting right now. Please try again soon! 🔌" }])
    } finally {
      setIsTyping(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className={`fixed z-[90] transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${isOpen ? 'bottom-4 right-4 sm:bottom-6 sm:right-6' : 'bottom-6 right-6'}`}>
      
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="relative group flex items-center justify-center w-[64px] h-[64px] hover:-translate-y-1 transition-all duration-300 animate-fade-in-up"
        >
          <AIBotIcon className="w-full h-full" isPulsing={true} />
          {/* Notification Dot indicator */}
          <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full animate-pulse shadow-sm" />
        </button>
      )}

      {/* Chat Window Container */}
      {isOpen && (
        <div 
          className={`flex flex-col bg-white/95 backdrop-blur-2xl shadow-[0_16px_64px_rgba(0,0,0,0.15)] rounded-[24px] border border-white/60 overflow-hidden transform-gpu origin-bottom-right transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${
            isExpanded 
              ? 'w-[calc(100vw-32px)] h-[calc(100vh-32px)] sm:w-[500px] sm:h-[800px] max-h-[90vh]' 
              : 'w-[calc(100vw-32px)] h-[550px] sm:w-[380px] sm:h-[600px] max-h-[85vh]'
          }`}
        >
          {/* Header */}
          <div className="px-5 py-4 bg-gradient-to-r from-indigo-600 via-primary-600 to-violet-600 flex items-center justify-between shrink-0 shadow-sm z-10 relative overflow-hidden">
            {/* Subtle background pattern in header */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
            
            <div className="flex items-center gap-3 relative z-10">
               <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
                  <AIBotIcon className="w-full h-full" isPulsing={isTyping} />
               </div>
               <div>
                  <h3 className="font-extrabold text-white text-[15px] leading-tight flex items-center gap-1.5">
                    LDMS AI
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full shadow-[0_0_8px_rgba(74,222,128,0.8)] inline-block relative -top-0.5" />
                  </h3>
                  <p className="text-indigo-100 text-[11px] font-medium tracking-wide uppercase mt-0.5">Educational Assistant</p>
               </div>
            </div>

            <div className="flex items-center gap-1.5 relative z-10">
               <button onClick={() => setIsExpanded(!isExpanded)} className="p-1.5 text-indigo-100 hover:text-white hover:bg-white/10 rounded-full transition-colors hidden sm:block">
                  {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
               </button>
               <button onClick={() => setIsOpen(false)} className="p-1.5 text-indigo-100 hover:text-white hover:bg-white/20 rounded-full transition-colors bg-white/5">
                  <X className="w-5 h-5" />
               </button>
            </div>
          </div>

          {/* Chat Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-gradient-to-b from-slate-50/50 to-white relative z-0 hide-scrollbar" style={{ scrollBehavior: 'smooth' }}>
            {messages.map((msg) => {
              const isAi = msg.role === 'assistant';
              return (
                <div key={msg.id} className="flex flex-col w-full">
                  <div className={`flex items-end gap-2.5 ${isAi ? 'justify-start' : 'justify-end'} animate-fade-in-up`}>
                    
                    {isAi && (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-50 border border-indigo-200 flex items-center justify-center shrink-0 shadow-sm overflow-hidden mb-1">
                        <Bot className="w-4 h-4 text-primary-600" />
                      </div>
                    )}

                    <div className={`relative px-4 py-3 min-w-[60px] max-w-[85%] text-[13.5px] leading-relaxed shadow-sm ${
                      isAi 
                        ? 'bg-white border border-slate-200 text-slate-700 rounded-2xl rounded-bl-sm font-medium' 
                        : 'bg-gradient-to-br from-indigo-500 to-primary-600 text-white rounded-2xl rounded-br-sm font-medium'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                      <span className={`text-[9px] absolute -bottom-5 right-1 font-bold ${isAi ? 'text-slate-400' : 'text-slate-400'}`}>Now</span>
                    </div>

                  </div>

                  {/* AI Suggestions Block */}
                  {msg.id === '1' && messages.length === 1 && !isTyping && (
                    <div className="mt-4 flex flex-col gap-2.5 animate-fade-in-up pl-[38px] w-full max-w-[90%]" style={{ animationDelay: '0.2s' }}>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">Suggested Actions</p>
                      <div className="flex flex-wrap gap-2">
                        {[
                          "📝 Draft a 40-minute Science lesson plan.",
                          "⚖️ Strategies for effective classroom management.",
                          "🤓 Summarize quantum physics for 8th graders.",
                          "🎲 Generate a 5-question pop-quiz on History."
                        ].map((suggestion, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSend(null, suggestion)}
                            className="text-left px-3.5 py-2.5 bg-white border border-indigo-100 hover:border-indigo-300 hover:bg-indigo-50 hover:shadow-md text-indigo-700 text-[12.5px] font-semibold rounded-xl transition-all shadow-sm w-full"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
            
            {/* Typing Indicator */}
            {isTyping && (
               <div className="flex items-end gap-2.5 justify-start animate-fade-in">
                 <div className="w-7 h-7 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 mb-1">
                    <Bot className="w-4 h-4 text-primary-400" />
                 </div>
                 <div className="bg-white border border-slate-200 px-4 py-3.5 rounded-2xl rounded-bl-sm shadow-sm flex items-center gap-1.5">
                   <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                   <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                   <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                 </div>
               </div>
            )}
            <div ref={messagesEndRef} className="h-1" />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-white border-t border-slate-100 shrink-0 relative z-10 shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
             <form onSubmit={handleSend} className="relative flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-[20px] focus-within:border-primary-300 focus-within:ring-4 focus-within:ring-primary-50 transition-all p-1.5">
               <textarea
                 value={input}
                 onChange={(e) => setInput(e.target.value)}
                 onKeyDown={handleKeyDown}
                 placeholder="Type your question..."
                 className="flex-1 max-h-[120px] min-h-[44px] bg-transparent resize-none outline-none text-[14px] text-slate-800 placeholder:text-slate-400 px-3 py-2.5 hide-scrollbar"
                 rows={input.split('\n').length > 1 ? Math.min(input.split('\n').length, 4) : 1}
               />
               <button 
                 type="submit" 
                 disabled={!input.trim() || isTyping}
                 className="w-[44px] h-[44px] flex items-center justify-center bg-primary-600 hover:bg-primary-700 disabled:bg-slate-300 disabled:shadow-none text-white rounded-full transition-all shrink-0 shadow-md font-bold mb-[1px] mr-[1px] active:scale-95"
               >
                 {isTyping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 -ml-0.5" />}
               </button>
             </form>
             <div className="text-center mt-2.5">
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Powered by LDMS AI</span>
             </div>
          </div>
        </div>
      )}

    </div>
  )
}
