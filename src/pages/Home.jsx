import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useGamification } from '../contexts/GamificationContext'
import { getLevel, getLevelProgress } from '../utils/gamificationUtils'
import { tools as aiTools } from '../data/toolsList'
import { db } from '../utils/firebase'
import { collection, query, onSnapshot, orderBy, doc } from 'firebase/firestore'
import { 
  Sparkles, Briefcase, FolderOpen, Award, CheckSquare, 
  Calculator, Lock, ArrowRight, CalendarDays, TrendingUp, Zap, BarChart3, ShoppingCart, Coins, Megaphone, X,
  BookOpen, FileQuestion, Gamepad2, Share2
} from 'lucide-react'
import TokenShopModal from '../components/TokenShopModal'

// App configs for the grid
const utilityApps = [
  {
    id: 'todo',
    title: 'Tasks & Reminders',
    description: 'Manage your daily teaching to-do list.',
    icon: CheckSquare,
    path: '/todo',
    bg: 'bg-emerald-500',
    hover: 'group-hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]'
  },
  {
    id: 'gradebook',
    title: 'Smart Gradebook',
    description: 'Calculate marks and track student progress.',
    icon: Calculator,
    path: '/gradebook',
    bg: 'bg-blue-500',
    hover: 'group-hover:shadow-[0_0_20px_rgba(59,130,246,0.4)]'
  },
  {
    id: 'certificates',
    title: 'Certificate Generator',
    description: 'Create & print beautiful student awards.',
    icon: Award,
    path: '/certificates',
    bg: 'bg-amber-500',
    hover: 'group-hover:shadow-[0_0_20px_rgba(245,158,11,0.4)]'
  },
  {
    id: 'locker',
    title: 'Private Locker',
    description: 'Securely store personal notes and files.',
    icon: Lock,
    path: '/locker',
    bg: 'bg-slate-700',
    hover: 'group-hover:shadow-[0_0_20px_rgba(51,65,85,0.4)]'
  },
  {
    id: 'lesson-planner',
    title: 'Lesson Planner',
    description: 'AI-powered step-by-step lesson plan generator.',
    icon: BookOpen,
    path: '/lesson-planner',
    bg: 'bg-indigo-600',
    hover: 'group-hover:shadow-[0_0_20px_rgba(79,70,229,0.4)]'
  },

  {
    id: 'exam-generator',
    title: 'Exam Paper Generator',
    description: 'AI-generated exam papers with answer keys.',
    icon: FileQuestion,
    path: '/exam-generator',
    bg: 'bg-rose-600',
    hover: 'group-hover:shadow-[0_0_20px_rgba(225,29,72,0.4)]'
  },
  {
    id: 'smart-exam',
    title: 'Smart Exam Maker',
    description: 'Generate exams directly from chapter photos and PDFs.',
    icon: FileQuestion,
    path: '/smart-exam',
    bg: 'bg-fuchsia-600',
    hover: 'group-hover:shadow-[0_0_20px_rgba(192,38,211,0.4)]'
  },
  {
    id: 'classroom-quiz',
    title: 'Classroom Quiz',
    description: 'Create & present live quizzes Kahoot-style.',
    icon: Gamepad2,
    path: '/classroom-quiz',
    bg: 'bg-violet-600',
    hover: 'group-hover:shadow-[0_0_20px_rgba(124,58,237,0.4)]'
  },

]

export default function Home() {
  const { currentUser, userProfile } = useAuth()
  const { stats, toolCosts } = useGamification()
  const level = getLevel(stats?.xp || 0)
  const [time, setTime] = useState(new Date())
  const [showTokenShop, setShowTokenShop] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const [showAnnouncement, setShowAnnouncement] = useState(true)

  const handleShare = (e, path, title, description) => {
    e.preventDefault()
    e.stopPropagation()
    const url = `${window.location.origin}${path}`
    if (navigator.share) {
      navigator.share({
        title: title,
        text: description,
        url: url
      }).catch(console.error)
    } else {
      navigator.clipboard.writeText(url)
      alert('Tool link copied to clipboard!')
    }
  }

  // Clock tick
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Fetch live announcement
  useEffect(() => {
    if (!db) return
    const unsub = onSnapshot(doc(db, 'platformSettings', 'global'), (snap) => {
      if (snap.exists() && snap.data().announcement) {
        setAnnouncement(snap.data().announcement)
        setShowAnnouncement(true)
      } else {
        setAnnouncement('')
      }
    })
    return () => unsub()
  }, [])

  const formattedTime = time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  const formattedDate = time.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const greeting = time.getHours() < 12 ? 'Good morning' : time.getHours() < 18 ? 'Good afternoon' : 'Good evening'

  const displayName = userProfile?.name 
    ? userProfile.name.split(' ')[0] 
    : currentUser?.email ? currentUser.email.split('@')[0] : 'Educator'

  // Dashboard Analytics
  const [totalGens, setTotalGens] = useState(0)
  const [monthGens, setMonthGens] = useState(0)
  const [favTool, setFavTool] = useState('—')

  useEffect(() => {
    if (!currentUser || !db) return
    const q = query(collection(db, 'users', currentUser.uid, 'generations'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, snap => {
      const docs = snap.docs.map(d => d.data())
      setTotalGens(docs.length)
      // This month
      const now = new Date()
      const thisMonth = docs.filter(d => {
        if (!d.createdAt) return false
        const date = d.createdAt.toDate ? d.createdAt.toDate() : new Date(d.createdAt)
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
      })
      setMonthGens(thisMonth.length)
      // Most used tool
      const toolCount = {}
      docs.forEach(d => { toolCount[d.toolTitle] = (toolCount[d.toolTitle] || 0) + 1 })
      const top = Object.entries(toolCount).sort((a, b) => b[1] - a[1])[0]
      setFavTool(top ? top[0] : '—')
    }, (err) => {
      console.warn('Analytics query error (deploy Firestore rules):', err.message)
    })
    return () => unsub()
  }, [currentUser])

  return (
    <div className="max-w-[1200px] mx-auto animate-fade-in-up pb-24 lg:pb-8">

      {/* Live Announcement Banner */}
      {announcement && showAnnouncement && (
        <div className="mb-6 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-4 px-6 flex items-center gap-4 shadow-lg animate-fade-in">
          <Megaphone className="w-6 h-6 text-white shrink-0" />
          <p className="text-sm sm:text-base font-bold text-white flex-1">{announcement}</p>
          <button onClick={() => setShowAnnouncement(false)} className="p-1 hover:bg-white/20 rounded-lg transition-colors shrink-0">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      )}

      {/* Top Hero / Welcome Panel */}
      <div className="relative overflow-hidden bg-slate-900 rounded-[32px] p-8 sm:p-10 mb-8 shadow-2xl border border-slate-800">
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/3 w-[600px] h-[600px] bg-gradient-to-tr from-indigo-500/20 to-emerald-500/20 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-slate-400 font-bold tracking-wide uppercase text-xs mb-3">
              <CalendarDays className="w-4 h-4" /> {formattedDate}
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold font-display text-white tracking-tight leading-tight">
              {greeting}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-emerald-400">{displayName}</span>
            </h1>
            <p className="mt-3 text-slate-300 font-medium max-w-xl text-sm md:text-base">
              Welcome to your Teacher Desktop. Access your AI assistants, class utilities, and workflow tools instantly.
            </p>
          </div>
          
          <div className="flex flex-col items-end">
            <div className="text-3xl sm:text-5xl font-black font-display tracking-tighter text-white tabular-nums drop-shadow-lg">
              {formattedTime}
            </div>
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold shadow-glow-sm">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Workspace Active
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Cards */}
      {currentUser && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <div className="bg-white rounded-[24px] p-6 border border-surface-200 shadow-sm flex items-center gap-5">
            <div className="p-3 bg-purple-100 text-purple-600 rounded-2xl"><Zap className="w-6 h-6" /></div>
            <div>
              <p className="text-3xl font-extrabold font-display text-surface-900">{totalGens}</p>
              <p className="text-xs font-bold uppercase tracking-widest text-surface-400">Total Generations</p>
            </div>
          </div>
          <div className="bg-white rounded-[24px] p-6 border border-surface-200 shadow-sm flex items-center gap-5">
            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl"><TrendingUp className="w-6 h-6" /></div>
            <div>
              <p className="text-3xl font-extrabold font-display text-surface-900">{monthGens}</p>
              <p className="text-xs font-bold uppercase tracking-widest text-surface-400">This Month</p>
            </div>
          </div>
          <div className="bg-white rounded-[24px] p-6 border border-surface-200 shadow-sm flex items-center gap-5">
            <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl"><BarChart3 className="w-6 h-6" /></div>
            <div>
              <p className="text-lg font-extrabold font-display text-surface-900 truncate">{favTool}</p>
              <p className="text-xs font-bold uppercase tracking-widest text-surface-400">Most Used Tool</p>
            </div>
          </div>
        </div>
      )}


      {/* AI Magic Tools Section */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-6 px-1">
          <Sparkles className="w-6 h-6 text-indigo-500" />
          <h2 className="text-xl sm:text-2xl font-extrabold text-surface-900 font-display tracking-tight">AI Teaching Assistants</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {aiTools.map((tool, idx) => (
            <Link
              key={tool.id}
              to={`/ai-tools?tool=${tool.id}`}
              className="group relative overflow-hidden bg-white border border-surface-200 rounded-[28px] p-6 hover:-translate-y-1 transition-all duration-300 hover:shadow-xl hover:border-indigo-300 animate-fade-in-up flex flex-col h-full"
              style={{ animationDelay: `${idx * 0.05}s` }}
            >
              {/* Cost badge */}
              <div className="absolute top-4 right-4 flex items-center gap-1 px-2 py-1 bg-amber-50 border border-amber-200 rounded-lg">
                <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider">⚡ Costs {toolCosts?.[tool.id] ?? 5} 🪙</span>
              </div>

              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${tool.color} flex items-center justify-center text-white mb-5 transition-transform duration-300 group-hover:scale-110 shadow-md`}>
                <tool.icon className="w-7 h-7" />
              </div>
              
              <h3 className="text-[17px] font-bold text-surface-900 mb-2 group-hover:text-indigo-600 transition-colors">
                {tool.title}
              </h3>
              
              <p className="text-xs sm:text-sm text-surface-500 font-medium leading-relaxed mb-6 flex-1">
                {tool.description}
              </p>
              
              <div className="flex items-center justify-between mt-auto border-t border-surface-100 pt-3">
                <div className="flex items-center text-xs font-black text-surface-400 group-hover:text-indigo-600 transition-colors uppercase tracking-widest">
                  Launch AI <ArrowRight className="w-3.5 h-3.5 ml-1.5 group-hover:translate-x-1 transition-transform" />
                </div>
                <button 
                  onClick={(e) => handleShare(e, `/ai-tools?tool=${tool.id}`, tool.title, tool.description)}
                  className="p-1.5 -mr-1.5 text-surface-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all z-10"
                  title="Share Tool"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Utilities Section */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-6 px-1">
          <h2 className="text-xl sm:text-2xl font-extrabold text-surface-900 font-display tracking-tight">Core Utilities</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {utilityApps.map((app, idx) => (
            <Link
              key={app.id}
              to={app.path}
              className={`group relative overflow-hidden bg-white border border-surface-200 rounded-[28px] p-6 hover:-translate-y-1 transition-all duration-300 hover:shadow-xl hover:border-surface-300 animate-fade-in-up flex flex-col h-full`}
              style={{ animationDelay: `${idx * 0.05}s` }}
            >
              {/* Cost badge */}
              <div className="absolute top-4 right-4 flex items-center gap-1 px-2 py-1 bg-amber-50 border border-amber-200 rounded-lg">
                <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider">⚡ Costs {toolCosts?.[app.id] ?? 5} 🪙</span>
              </div>

              <div className={`w-14 h-14 rounded-2xl ${app.bg} flex items-center justify-center text-white mb-5 transition-all duration-300 ${app.hover}`}>
                <app.icon className="w-7 h-7" />
              </div>
              
              <h3 className="text-[17px] font-bold text-surface-900 mb-2 group-hover:text-primary-600 transition-colors">
                {app.title}
              </h3>
              
              <p className="text-xs sm:text-sm text-surface-500 font-medium leading-relaxed mb-6 flex-1">
                {app.description}
              </p>
              
              <div className="flex items-center justify-between mt-auto border-t border-surface-100 pt-3">
                <div className="flex items-center text-xs font-black text-surface-400 group-hover:text-primary-600 transition-colors uppercase tracking-widest">
                  Launch App <ArrowRight className="w-3.5 h-3.5 ml-1.5 group-hover:translate-x-1 transition-transform" />
                </div>
                <button 
                  onClick={(e) => handleShare(e, app.path, app.title, app.description)}
                  className="p-1.5 -mr-1.5 text-surface-300 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all z-10"
                  title="Share App"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </Link>
          ))}
        </div>
      </div>
      
      {/* Footer hint */}
      <div className="mt-12 text-center text-surface-300 text-xs font-bold uppercase tracking-[0.2em]">
        End of Workspace
      </div>

      {showTokenShop && <TokenShopModal onClose={() => setShowTokenShop(false)} />}
    </div>
  )
}
