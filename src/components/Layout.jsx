import { useState, useEffect, useRef, useMemo, useCallback, Suspense } from 'react'
import { NavLink, Outlet, useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useNotifications } from '../contexts/NotificationContext'
import { useGamification } from '../contexts/GamificationContext'
import { getLevel } from '../utils/gamificationUtils'
import { useTheme } from '../contexts/ThemeContext'
import { useLanguage } from '../contexts/LanguageContext'
import {
  BookOpen, Home, User, Briefcase, FolderOpen, Users, Sparkles,
  LayoutDashboard, Bell, Search, Menu, X, LogOut, ChevronDown,
  Settings, Shield, HelpCircle, GraduationCap, MessageSquare, CalendarDays,
  Heart, MessageCircle, UserPlus, Zap, Trophy, Flame, LogIn, Megaphone, ShoppingCart, Radio,
  Moon, Sun, History, ArrowRight, CheckSquare, Calculator, Lock, FileQuestion, Gamepad2, Award, Command
} from 'lucide-react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../utils/firebase'
import { tools as aiToolsList } from '../data/toolsList'
import AIChatWidget from './AIChatWidget'
import ProfileCompletion from './ProfileCompletion'
import TokenShopModal from './TokenShopModal'

// Nav array builders — called inside component to get reactive translations
function getTeacherNav(t, settings) {
  return [
    { to: '/', icon: Home, label: 'Workspace', color: 'from-blue-500 to-indigo-600', shadow: 'rgba(99,102,241,0.4)' },
    { to: '/timetable', icon: CalendarDays, label: 'Timetable', color: 'from-teal-500 to-teal-600', shadow: 'rgba(20,184,166,0.4)' },
    { to: '/ai-directory', icon: Sparkles, label: 'AI Platforms', color: 'from-pink-500 to-rose-600', shadow: 'rgba(236,72,153,0.4)' },
    { to: '/smart-exam', icon: FileQuestion, label: 'Smart Exam Maker', color: 'from-fuchsia-500 to-purple-600', shadow: 'rgba(192,38,211,0.4)' },
    { to: '/history', icon: History, label: 'Generation History', color: 'from-purple-500 to-violet-600', shadow: 'rgba(139,92,246,0.4)' },
    { to: '/resources', icon: FolderOpen, label: 'My Files & Vault', color: 'from-amber-500 to-orange-600', shadow: 'rgba(245,158,11,0.4)' },
    { to: '/profile', icon: Settings, label: 'Settings', color: 'from-slate-500 to-slate-700', shadow: 'rgba(100,116,139,0.4)' }
  ];
}
function getSchoolNav(t, settings) {
  return [
    { to: '/', icon: Home, label: 'Workspace', color: 'from-blue-500 to-indigo-600', shadow: 'rgba(99,102,241,0.4)' },
    { to: '/timetable', icon: CalendarDays, label: 'Timetable', color: 'from-teal-500 to-teal-600', shadow: 'rgba(20,184,166,0.4)' },
    { to: '/ai-directory', icon: Sparkles, label: 'AI Platforms', color: 'from-pink-500 to-rose-600', shadow: 'rgba(236,72,153,0.4)' },
    { to: '/smart-exam', icon: FileQuestion, label: 'Smart Exam Maker', color: 'from-fuchsia-500 to-purple-600', shadow: 'rgba(192,38,211,0.4)' },
    { to: '/history', icon: History, label: 'History', color: 'from-purple-500 to-violet-600', shadow: 'rgba(139,92,246,0.4)' },
    { to: '/resources', icon: FolderOpen, label: 'Shared Vault', color: 'from-amber-500 to-orange-600', shadow: 'rgba(245,158,11,0.4)' },
    { to: '/profile', icon: Settings, label: 'Settings', color: 'from-slate-500 to-slate-700', shadow: 'rgba(100,116,139,0.4)' }
  ];
}
function getTeacherMobileNav(t) {
  return [
    { to: '/', icon: Home, label: 'Workspace', color: 'from-blue-500 to-indigo-600', shadow: 'rgba(99,102,241,0.4)' },
    { to: '/timetable', icon: CalendarDays, label: 'Timetable', color: 'from-teal-500 to-teal-600', shadow: 'rgba(20,184,166,0.4)' },
    { to: '/ai-directory', icon: Sparkles, label: 'AI', color: 'from-pink-500 to-rose-600', shadow: 'rgba(236,72,153,0.4)' },
    { to: '/history', icon: History, label: 'History', color: 'from-purple-500 to-violet-600', shadow: 'rgba(139,92,246,0.4)' },
    { to: '/resources', icon: FolderOpen, label: 'Vault', color: 'from-amber-500 to-orange-600', shadow: 'rgba(245,158,11,0.4)' },
    { to: '/profile', icon: Settings, label: 'Settings', color: 'from-slate-500 to-slate-700', shadow: 'rgba(100,116,139,0.4)' }
  ];
}
function getSchoolMobileNav(t) {
  return [
    { to: '/', icon: Home, label: 'Workspace', color: 'from-blue-500 to-indigo-600', shadow: 'rgba(99,102,241,0.4)' },
    { to: '/timetable', icon: CalendarDays, label: 'Timetable', color: 'from-teal-500 to-teal-600', shadow: 'rgba(20,184,166,0.4)' },
    { to: '/ai-directory', icon: Sparkles, label: 'AI', color: 'from-pink-500 to-rose-600', shadow: 'rgba(236,72,153,0.4)' },
    { to: '/history', icon: History, label: 'History', color: 'from-purple-500 to-violet-600', shadow: 'rgba(139,92,246,0.4)' },
    { to: '/resources', icon: FolderOpen, label: 'Vault', color: 'from-amber-500 to-orange-600', shadow: 'rgba(245,158,11,0.4)' },
    { to: '/profile', icon: Settings, label: 'Settings', color: 'from-slate-500 to-slate-700', shadow: 'rgba(100,116,139,0.4)' }
  ];
}

// Map notification type to icon
function getNotificationIcon(type) {
  switch (type) {
    case 'like': return Heart
    case 'comment': return MessageCircle
    case 'message': return MessageSquare
    case 'job': return Briefcase
    case 'connection': return UserPlus
    case 'system': return Zap
    default: return Bell
  }
}

function timeAgo(ts) {
  if (!ts) return 'Just now'
  try {
    const date = ts.toDate ? ts.toDate() : new Date(ts)
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
    if (seconds < 60) return 'Just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  } catch { return 'Just now' }
}

export default function Layout() {
  const { currentUser, userProfile, logout } = useAuth()
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()
  const { stats, coinConfig } = useGamification()
  const { theme, toggleTheme } = useTheme()
  const { t } = useLanguage()
  const currentLevel = getLevel(stats.xp || 0)
  
  const [platformSettings, setPlatformSettings] = useState({})

  useEffect(() => {
    if (!db) return
    const unsub = onSnapshot(doc(db, 'platformSettings', 'global'), (snap) => {
      if (snap.exists()) {
        setPlatformSettings(snap.data())
      }
    })
    return () => unsub()
  }, [])

  // Build translated nav arrays
  const teacherNav = getTeacherNav(t, platformSettings)
  const schoolNav = getSchoolNav(t, platformSettings)
  const teacherMobileNav = getTeacherMobileNav(t)
  const schoolMobileNav = getSchoolMobileNav(t)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showMobileSearch, setShowMobileSearch] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)
  const [selectedSearchIdx, setSelectedSearchIdx] = useState(0)
  const [showChat, setShowChat] = useState(false)
  const [showProfileCompletion, setShowProfileCompletion] = useState(false)
  const [showTokenShop, setShowTokenShop] = useState(false)
  const [walletOpen, setWalletOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const searchInputRef = useRef(null)
  const mobileSearchInputRef = useRef(null)
  const searchDropdownRef = useRef(null)

  const dropdownRef = useRef(null)
  const notifRef = useRef(null)
  const walletRef = useRef(null)

  // Build searchable items list
  const allSearchItems = useMemo(() => {
    const items = []
    // AI Tools
    aiToolsList.forEach(tool => {
      items.push({
        id: `ai-${tool.id}`,
        title: tool.title,
        description: tool.description,
        icon: tool.icon,
        path: `/ai-tools?tool=${tool.id}`,
        category: 'AI Tool',
        color: tool.color
      })
    })
    // Workspace utilities
    const utilityItems = [
      { id: 'todo', title: 'Tasks & Reminders', description: 'Manage your daily teaching to-do list.', icon: CheckSquare, path: '/todo', category: 'Utility', color: 'from-emerald-500 to-emerald-600' },
      { id: 'gradebook', title: 'Smart Gradebook', description: 'Calculate marks and track student progress.', icon: Calculator, path: '/gradebook', category: 'Utility', color: 'from-blue-500 to-blue-600' },
      { id: 'certificates', title: 'Certificate Generator', description: 'Create & print beautiful student awards.', icon: Award, path: '/certificates', category: 'Utility', color: 'from-amber-500 to-amber-600' },
      { id: 'locker', title: 'Private Locker', description: 'Securely store personal notes and files.', icon: Lock, path: '/locker', category: 'Utility', color: 'from-slate-600 to-slate-700' },
      { id: 'lesson-planner-page', title: 'Lesson Planner', description: 'AI-powered step-by-step lesson plan generator.', icon: BookOpen, path: '/lesson-planner', category: 'Utility', color: 'from-indigo-500 to-indigo-600' },
      { id: 'timetable', title: 'Timetable Builder', description: 'Create weekly class schedules visually.', icon: CalendarDays, path: '/timetable', category: 'Utility', color: 'from-teal-500 to-teal-600' },
      { id: 'exam-generator-page', title: 'Exam Paper Generator', description: 'AI-generated exam papers with answer keys.', icon: FileQuestion, path: '/exam-generator', category: 'Utility', color: 'from-rose-500 to-rose-600' },
      { id: 'classroom-quiz', title: 'Classroom Quiz', description: 'Create & present live quizzes Kahoot-style.', icon: Gamepad2, path: '/classroom-quiz', category: 'Utility', color: 'from-violet-500 to-violet-600' },
    ]
    utilityItems.forEach(u => items.push(u))
    // Navigation pages
    const navPages = [
      { id: 'nav-home', title: 'Workspace Home', description: 'Go to your main workspace dashboard.', icon: Home, path: '/', category: 'Navigation', color: 'from-blue-500 to-indigo-600' },
      { id: 'nav-ai-directory', title: 'AI Platforms & Directory', description: 'Browse external AI tools and prompt library.', icon: Sparkles, path: '/ai-directory', category: 'Navigation', color: 'from-pink-500 to-rose-600' },
      { id: 'nav-resources', title: 'My Files & Vault', description: 'Access your uploaded files and resources.', icon: FolderOpen, path: '/resources', category: 'Navigation', color: 'from-amber-500 to-orange-600' },
      { id: 'nav-history', title: 'Generation History', description: 'View your past AI generations.', icon: History, path: '/history', category: 'Navigation', color: 'from-purple-500 to-violet-600' },
      { id: 'nav-settings', title: 'Settings & Profile', description: 'Manage your account and preferences.', icon: Settings, path: '/settings', category: 'Navigation', color: 'from-slate-500 to-slate-700' },
    ]
    navPages.forEach(p => items.push(p))
    return items
  }, [])

  // Filtered search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []
    const q = searchQuery.toLowerCase()
    return allSearchItems.filter(item =>
      item.title.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    ).slice(0, 8)
  }, [searchQuery, allSearchItems])

  // Reset selected index when results change
  useEffect(() => {
    setSelectedSearchIdx(0)
  }, [searchResults])

  // Handle search item selection
  const handleSearchSelect = useCallback((item) => {
    setSearchQuery('')
    setSearchFocused(false)
    setShowMobileSearch(false)
    navigate(item.path)
  }, [navigate])

  // Keyboard shortcut: Cmd+K / Ctrl+K to focus search
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
        setSearchFocused(true)
      }
      if (e.key === 'Escape') {
        setSearchFocused(false)
        setShowMobileSearch(false)
        searchInputRef.current?.blur()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Keyboard navigation within search results
  const handleSearchKeyDown = useCallback((e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedSearchIdx(prev => Math.min(prev + 1, searchResults.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedSearchIdx(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && searchResults.length > 0) {
      e.preventDefault()
      handleSearchSelect(searchResults[selectedSearchIdx])
    }
  }, [searchResults, selectedSearchIdx, handleSearchSelect])

  // Close search dropdown on click outside
  useEffect(() => {
    function handleClickOutsideSearch(e) {
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(e.target) && searchInputRef.current && !searchInputRef.current.contains(e.target)) {
        setSearchFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutsideSearch)
    return () => document.removeEventListener('mousedown', handleClickOutsideSearch)
  }, [])

  // Detect incomplete profile (Google login with no name or email-as-name)
  useEffect(() => {
    if (!currentUser || !userProfile) return
    const name = userProfile.name || ''
    const isEmailName = name.includes('@') || !name.trim()
    const notCompleted = !userProfile.profileCompleted
    if (isEmailName && notCompleted) {
      setShowProfileCompletion(true)
    }
  }, [currentUser, userProfile])

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false)
      }
      if (walletRef.current && !walletRef.current.contains(e.target)) {
        setWalletOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close mobile sidebar on route change
  useEffect(() => {
    setSidebarOpen(false)
    setShowMobileSearch(false)
  }, [location.pathname])

  const navItems = userProfile?.role === 'school' ? schoolNav : teacherNav
  const mobileNavItems = userProfile?.role === 'school' ? schoolMobileNav : teacherMobileNav

  async function handleLogout() {
    try {
      await logout()
      navigate('/login')
    } catch (err) {
      console.error('Logout failed:', err)
    }
  }

  const currentPath = location.pathname
  const currentPage = navItems.find(item => item.to === currentPath || (item.to !== '/' && currentPath.startsWith(item.to)))
  const pageTitle = currentPage ? currentPage.label : 'LDMS'

  return (
    <div className={`min-h-screen text-surface-900 selection:bg-primary-100 selection:text-primary-800 font-sans overflow-x-hidden ${theme === 'dark' ? 'dark bg-[#0f0f14]' : 'bg-surface-50'}`}>
      
      {/* Immersive Animated Background */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        {theme === 'dark'
          ? <div className="absolute inset-0 bg-[#0f0f14]" />
          : <>
              <div className="absolute inset-0 bg-surface-50" />
              <div className="absolute inset-0 bg-mesh-gradient opacity-40 animate-pulse-soft" />
              <div className="absolute inset-0 bg-white/20 backdrop-blur-[100px]" />
            </>
        }
      </div>

      {/* Fixed Top Navbar */}
      <header className="fixed top-0 left-0 right-0 h-[70px] bg-white/95 backdrop-blur-xl border-b border-surface-200/80 z-50 px-3 sm:px-6 flex items-center justify-between transition-all">
        {/* Logo & Brand + Hamburger */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)} 
            className="xl:hidden p-2 -ml-1 hover:bg-surface-100 rounded-xl transition-colors"
          >
            <Menu className="w-5 h-5 text-surface-700" />
          </button>
          <Link to="/" className="flex items-center gap-2 sm:gap-3 hover:opacity-90 transition-opacity">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center overflow-hidden shadow-lg">
              <img src="/logo.png" alt="LDMS" className="w-[120%] h-[120%] object-contain mix-blend-multiply" />
            </div>
            <span className="text-[18px] sm:text-[20px] font-extrabold font-display tracking-tight text-surface-900 hidden sm:block">LDMS</span>
          </Link>
        </div>

        {/* Global Search (Desktop) */}
        <div className="hidden md:flex relative w-full max-w-[600px] group mx-6 flex-1">
          <Search className={`absolute left-6 top-1/2 -translate-y-1/2 w-[18px] h-[18px] transition-colors ${searchFocused ? 'text-slate-900' : 'text-surface-400'}`} />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search tools, commands, or resources..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onKeyDown={handleSearchKeyDown}
            className="w-full pl-14 pr-16 py-3.5 bg-surface-100 hover:bg-surface-200 border-2 border-transparent text-[15px] font-medium text-surface-900 rounded-[20px] focus:outline-none focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10 transition-all placeholder:text-surface-400"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 hidden lg:flex items-center gap-1">
            <kbd className="px-2.5 py-1.5 bg-white border border-surface-200 rounded-lg text-[10px] font-extrabold text-surface-500 tracking-wider shadow-sm uppercase">⌘ K</kbd>
          </div>

          {/* Search Results Dropdown */}
          {searchFocused && searchQuery.trim() && (
            <div ref={searchDropdownRef} className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-surface-200 overflow-hidden z-[60] animate-slide-down">
              {searchResults.length > 0 ? (
                <div className="py-2 max-h-[400px] overflow-y-auto">
                  <p className="px-5 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-surface-400">Results</p>
                  {searchResults.map((item, idx) => (
                    <button
                      key={item.id}
                      onClick={() => handleSearchSelect(item)}
                      onMouseEnter={() => setSelectedSearchIdx(idx)}
                      className={`w-full flex items-center gap-4 px-5 py-3 text-left transition-all duration-150 ${
                        idx === selectedSearchIdx ? 'bg-indigo-50' : 'hover:bg-surface-50'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center text-white shrink-0 shadow-sm`}>
                        <item.icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-surface-900 truncate">{item.title}</p>
                        <p className="text-xs text-surface-500 font-medium truncate">{item.description}</p>
                      </div>
                      <span className={`shrink-0 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${
                        item.category === 'AI Tool' ? 'bg-indigo-100 text-indigo-700' :
                        item.category === 'Utility' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-surface-100 text-surface-600'
                      }`}>{item.category}</span>
                      <ArrowRight className={`w-4 h-4 shrink-0 transition-all ${idx === selectedSearchIdx ? 'text-indigo-500 translate-x-0.5' : 'text-surface-300'}`} />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center">
                  <Search className="w-8 h-8 text-surface-300 mx-auto mb-3" />
                  <p className="text-sm font-bold text-surface-500">No results for "{searchQuery}"</p>
                  <p className="text-xs text-surface-400 mt-1">Try searching for a tool name or keyword</p>
                </div>
              )}
              <div className="px-5 py-2.5 border-t border-surface-100 bg-surface-50/50 flex items-center gap-4 text-[10px] text-surface-400 font-bold">
                <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-white border border-surface-200 rounded text-[9px] font-extrabold">↑↓</kbd> Navigate</span>
                <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-white border border-surface-200 rounded text-[9px] font-extrabold">↵</kbd> Select</span>
                <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-white border border-surface-200 rounded text-[9px] font-extrabold">Esc</kbd> Close</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Platform Economy: Premium Wallet */}
          {currentUser && (
            <div className="relative" ref={walletRef}>
              <button 
                onClick={() => { setWalletOpen(!walletOpen); setDropdownOpen(false); setShowNotifications(false); }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-full hover:bg-amber-100 transition-colors"
              >
                <span className="text-base" title="EduCoins">🪙</span>
                <span className="font-extrabold text-amber-700 dark:text-amber-400 text-sm mr-1">
                  {stats?.coins || 0}
                </span>
                <div className="px-2 py-0.5 bg-amber-500 hover:bg-amber-400 text-amber-950 text-[10px] uppercase font-black tracking-wider rounded-md shadow-sm transition-colors">
                  Wallet
                </div>
              </button>

              {walletOpen && (
                <div className="absolute top-full right-0 mt-3 w-80 bg-gradient-to-br from-indigo-900 via-slate-900 to-black rounded-[24px] shadow-2xl z-50 overflow-hidden border border-indigo-500/20 animate-slide-down">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/20 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                  <div className="relative z-10 p-5">
                    <div className="flex items-center gap-4 mb-5">
                      <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg text-2xl">🪙</div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-0.5">Token Balance</p>
                        <p className="text-2xl font-black text-white leading-none mb-1">{stats?.coins || 0} <span className="text-amber-400 text-sm">Coins</span></p>
                        <p className="text-[11px] font-semibold text-indigo-200">{currentLevel.emoji} Level {currentLevel.name} • {stats?.xp || 0} XP</p>
                      </div>
                    </div>
                    
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 mb-4">
                      <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest mb-2 border-b border-white/10 pb-1">Earn Free Tokens</p>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-white/80 font-medium">Daily Login</span>
                        <span className="text-xs text-emerald-400 font-bold">+{coinConfig?.daily_login ?? 50} 🪙</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-white/80 font-medium">Share Resource</span>
                        <span className="text-xs text-emerald-400 font-bold">+{coinConfig?.share_resource ?? 25} 🪙</span>
                      </div>
                    </div>

                    <button
                      onClick={() => { setShowTokenShop(true); setWalletOpen(false); }}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-extrabold rounded-xl shadow-lg transition-all hover:scale-[1.02]"
                    >
                      <ShoppingCart className="w-4 h-4" /> Buy Coins
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mobile Search */}
          <button onClick={() => setShowMobileSearch(!showMobileSearch)} className="md:hidden p-2 text-surface-600 hover:bg-surface-100 rounded-full transition-colors">
            <Search className="w-5 h-5" />
          </button>
          {/* Dark Mode Toggle */}
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-full transition-all duration-300 text-surface-500 hover:bg-surface-100 hover:text-surface-800"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
          </button>



          {/* User Profile Trigger or Login Button */}
          {currentUser ? (
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => { setDropdownOpen(!dropdownOpen); setShowNotifications(false); }}
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 transition-all focus:outline-none overflow-hidden ${dropdownOpen ? 'border-primary-400 ring-4 ring-primary-50' : 'border-surface-200 hover:border-primary-300'}`}
              >
                {userProfile?.profilePhoto ? (
                  <img src={userProfile.profilePhoto} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-surface-800 flex items-center justify-center text-white font-bold text-sm">
                    {(userProfile?.name || currentUser?.email || 'U')[0].toUpperCase()}
                  </div>
                )}
              </button>

              {dropdownOpen && (
                <div className="absolute top-full right-0 mt-3 w-72 glass-modal py-2 z-50 animate-slide-down">
                  <div className="px-5 py-3 border-b border-surface-100">
                    <p className="font-bold text-surface-900 truncate flex items-center gap-1.5">
                      {userProfile?.name || currentUser?.email?.split('@')[0]}
                      {userProfile?.isVerified && (
                        <span className={`w-4 h-4 text-white rounded-full flex items-center justify-center text-[9px] shadow-sm shrink-0 ${{'blue':'bg-blue-500','gold':'bg-yellow-500','emerald':'bg-emerald-500','purple':'bg-purple-500'}[userProfile.verificationColor] || 'bg-blue-500'}`}>✓</span>
                      )}
                    </p>
                    <p className="text-xs font-semibold text-surface-500 capitalize">{userProfile?.role || 'Teacher'}</p>
                  </div>
                  <div className="p-2">
                    <button onClick={() => { navigate('/profile'); setDropdownOpen(false) }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold text-surface-700 hover:bg-surface-50 rounded-xl transition-colors">
                      <User className="w-4 h-4 text-surface-400" /> My Profile
                    </button>
                    <button onClick={() => { navigate('/settings'); setDropdownOpen(false) }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold text-surface-700 hover:bg-surface-50 rounded-xl transition-colors">
                      <Settings className="w-4 h-4 text-surface-400" /> Settings
                    </button>
                    {(userProfile?.role === 'admin' || userProfile?.role === 'superadmin') && (
                      <button onClick={() => { navigate('/admin'); setDropdownOpen(false) }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-extrabold text-rose-700 hover:bg-rose-50 rounded-xl transition-colors mt-1 border border-rose-100 bg-rose-50/50">
                        <Shield className="w-4 h-4 text-rose-600" /> {userProfile?.role === 'superadmin' ? '⚡ Super Admin Panel' : 'Admin Command Center'}
                      </button>
                    )}
                  </div>
                  <div className="h-px bg-surface-100 my-1" />
                  <div className="p-2">
                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                      <LogOut className="w-4 h-4 text-red-500" /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button 
              onClick={() => navigate('/login')}
              className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm sm:text-base font-extrabold rounded-full transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
            >
              <LogIn className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Login</span>
            </button>
          )}
        </div>
      </header>

      {/* Mobile Search Overlay */}
      {showMobileSearch && (
        <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm md:hidden animate-fade-in" onClick={() => { setShowMobileSearch(false); setSearchQuery('') }}>
          <div className="bg-white p-4 shadow-2xl animate-slide-down rounded-b-3xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 pt-2">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input
                  ref={mobileSearchInputRef}
                  autoFocus
                  type="text"
                  placeholder="Search tools, commands..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchResults.length > 0) {
                      handleSearchSelect(searchResults[0])
                    }
                  }}
                  className="w-full pl-11 pr-4 py-3 bg-surface-100 border border-surface-200 rounded-2xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-400 focus:bg-white transition-all"
                />
              </div>
              <button onClick={() => { setShowMobileSearch(false); setSearchQuery('') }} className="p-2 hover:bg-surface-100 rounded-xl">
                <X className="w-5 h-5 text-surface-600" />
              </button>
            </div>
            {/* Mobile Search Results */}
            {searchQuery.trim() && (
              <div className="mt-3 max-h-[60vh] overflow-y-auto">
                {searchResults.length > 0 ? (
                  <div className="space-y-1">
                    {searchResults.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleSearchSelect(item)}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-surface-50 transition-colors text-left"
                      >
                        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center text-white shrink-0`}>
                          <item.icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-surface-900 truncate">{item.title}</p>
                          <p className="text-[11px] text-surface-500 font-medium truncate">{item.description}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-surface-300 shrink-0" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <Search className="w-7 h-7 text-surface-300 mx-auto mb-2" />
                    <p className="text-sm font-bold text-surface-500">No results found</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-[55] xl:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute top-0 left-0 bottom-0 w-[236px] bg-white shadow-2xl z-10 animate-slide-in-right overflow-y-auto no-scrollbar flex flex-col">
            <div className="px-4 py-3.5 border-b border-surface-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center overflow-hidden shadow-md">
                  <img src="/logo.png" alt="LDMS" className="w-[120%] h-[120%] object-contain mix-blend-multiply" />
                </div>
                <span className="text-base font-extrabold font-display tracking-tight text-surface-900">LDMS</span>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="p-1.5 hover:bg-surface-100 rounded-lg transition-colors">
                <X className="w-4 h-4 text-surface-400" />
              </button>
            </div>
            <nav className="flex-1 px-3 pt-4 pb-3">
              <p className="px-3 mb-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Menu</p>
              {navItems.map(item => {
                const isActive = currentPath === item.to || (item.to !== '/' && currentPath.startsWith(item.to))
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    className={`relative group flex items-center gap-3.5 px-4 mb-1.5 py-3 rounded-[14px] text-[13.5px] font-bold transition-all duration-300 ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-[0_8px_20px_rgba(0,0,0,0.12)] translate-x-1'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 hover:translate-x-1'
                    }`}
                  >
                    {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-500 rounded-r-full" />}
                    <item.icon className={`w-[18px] h-[18px] transition-all duration-300 ${
                      isActive ? 'text-indigo-400 scale-110 drop-shadow-sm' : 'text-slate-400 group-hover:text-indigo-500 group-hover:scale-110'
                    }`} strokeWidth={isActive ? 2.5 : 2} />
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                )
              })}
            </nav>
            {currentUser && (
              <div className="px-3 pb-5 pt-3 border-t border-surface-100">
                <button
                  onClick={() => { navigate('/profile'); setSidebarOpen(false) }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-surface-100 transition-colors group"
                >
                  <div className={`w-8 h-8 rounded-lg shrink-0 overflow-hidden border border-surface-200 flex items-center justify-center text-white text-xs font-black ${userProfile?.profilePhoto ? '' : 'bg-surface-700'}`}>
                    {userProfile?.profilePhoto
                      ? <img src={userProfile.profilePhoto} alt="" className="w-full h-full object-cover" />
                      : (userProfile?.name || currentUser?.email || 'U')[0].toUpperCase()
                    }
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-[12px] font-bold text-surface-800 truncate flex items-center gap-1">
                      {userProfile?.name || (['admin', 'superadmin'].includes(userProfile?.role) ? 'Super Admin' : 'User')}
                      {userProfile?.isVerified && (
                        <span className={`w-3.5 h-3.5 text-white rounded-full flex items-center justify-center text-[7px] shadow-sm shrink-0 ${{'blue':'bg-blue-500','gold':'bg-yellow-500','emerald':'bg-emerald-500','purple':'bg-purple-500'}[userProfile.verificationColor] || 'bg-blue-500'}`}>✓</span>
                      )}
                    </p>
                    <p className="text-[10px] font-semibold text-surface-400 capitalize">{userProfile?.role || 'Teacher'}</p>
                  </div>
                </button>
              </div>
            )}
          </aside>
        </div>
      )}

      <div className="flex max-w-[1800px] mx-auto pt-[70px]">
        {/* Fixed Desktop Sidebar — compact premium */}
        <aside className="hidden xl:flex flex-col w-[220px] shrink-0 fixed bottom-0 left-0 z-40 overflow-hidden top-[70px]"
          style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)', borderRight: '1px solid rgba(0,0,0,0.06)' }}
        >
          {/* Nav links */}
          <nav className="flex-1 overflow-y-auto no-scrollbar px-3 pt-4 pb-3">
            <p className="px-3 mb-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Menu</p>
            {navItems.map(item => {
              const isActive = currentPath === item.to || (item.to !== '/' && currentPath.startsWith(item.to))
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={`relative group flex items-center gap-3.5 px-4 mb-1.5 py-3 rounded-[14px] text-[13.5px] font-bold transition-all duration-300 ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-[0_8px_20px_rgba(0,0,0,0.12)] translate-x-1'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 hover:translate-x-1'
                  }`}
                >
                  {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-500 rounded-r-full" />}
                  <item.icon className={`w-[18px] h-[18px] transition-all duration-300 ${
                    isActive ? 'text-indigo-400 scale-110 drop-shadow-sm' : 'text-slate-400 group-hover:text-indigo-500 group-hover:scale-110'
                  }`} strokeWidth={isActive ? 2.5 : 2} />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              )
            })}
          </nav>

          {/* Bottom user card */}
          {currentUser && (
            <div className="px-3 pb-5 pt-3 border-t border-surface-100">
              <button
                onClick={() => navigate('/profile')}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-surface-100 transition-colors group"
              >
                <div className={`w-8 h-8 rounded-lg shrink-0 overflow-hidden border border-surface-200 flex items-center justify-center text-white text-xs font-black ${
                  userProfile?.profilePhoto ? '' : 'bg-surface-700'
                }`}>
                  {userProfile?.profilePhoto
                    ? <img src={userProfile.profilePhoto} alt="" className="w-full h-full object-cover" />
                    : (userProfile?.name || 'U')[0].toUpperCase()
                  }
                </div>
                <div className="flex-1 min-w-0 text-left">
                    <p className="text-[12.5px] font-bold text-surface-800 truncate flex items-center gap-1">
                      {userProfile?.name || (['admin', 'superadmin'].includes(userProfile?.role) ? 'Super Admin' : 'User')}
                      {userProfile?.isVerified && (
                        <span className={`w-3.5 h-3.5 text-white rounded-full flex items-center justify-center text-[7px] shadow-sm shrink-0 ${{'blue':'bg-blue-500','gold':'bg-yellow-500','emerald':'bg-emerald-500','purple':'bg-purple-500'}[userProfile.verificationColor] || 'bg-blue-500'}`}>✓</span>
                      )}
                    </p>
                  <p className="text-[10px] font-semibold text-surface-400 capitalize truncate">{userProfile?.role || 'Teacher'}</p>
                </div>
                <Settings className="w-3.5 h-3.5 text-surface-300 group-hover:text-surface-500 shrink-0 transition-colors" />
              </button>
            </div>
          )}
        </aside>

        {/* Main Content Workspace */}
        <main className="flex-1 min-h-screen xl:ml-[220px] pb-[90px] xl:pb-12 pt-6 px-4 sm:px-6 md:px-8 w-full max-w-[100vw] overflow-x-hidden sm:max-w-none">
          <div className="max-w-6xl mx-auto w-full">
            <Suspense fallback={
              <div className="min-h-[60vh] flex flex-col items-center justify-center animate-fade-in">
                <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                <p className="text-sm font-bold text-surface-400">Loading module...</p>
              </div>
            }>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>

      {/* Fixed Full-Width Mobile Bottom Navigation */}
      <div className="xl:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-surface-200/80 z-50" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <nav className="flex justify-between items-center h-[64px] px-1 sm:px-4 relative max-w-[600px] mx-auto w-full">
          {mobileNavItems.map(item => {
            const isActive = currentPath === item.to || (item.to !== '/' && currentPath.startsWith(item.to))
            return (
              <NavLink 
                key={item.to} 
                to={item.to} 
                end={item.to === '/'} 
                className={`relative flex-1 flex flex-col items-center justify-center h-full ${isActive ? 'text-primary-600' : 'text-surface-500 hover:text-surface-800'} transition-colors duration-200`}
              >
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-1 bg-primary-600 rounded-b-full shadow-[0_0_8px_rgba(37,99,235,0.6)]" />
                )}
                <div className={`p-1 sm:p-1.5 rounded-xl transition-all duration-300 ${isActive ? 'bg-primary-50' : 'bg-transparent'}`}>
                  <item.icon className={`w-[20px] h-[20px] sm:w-[22px] sm:h-[22px] transition-transform duration-300 ${isActive ? 'scale-110 stroke-[2.5px]' : ''}`} />
                </div>
                <span className={`text-[9.5px] sm:text-[11px] font-bold mt-0.5 ${isActive ? 'text-primary-700' : 'text-surface-500'} tracking-tight whitespace-nowrap overflow-hidden text-ellipsis max-w-full px-0.5`}>
                  {item.label}
                </span>
              </NavLink>
            )
          })}
        </nav>
      </div>


      {showProfileCompletion && (
        <ProfileCompletion onComplete={() => setShowProfileCompletion(false)} />
      )}

      {showTokenShop && <TokenShopModal onClose={() => setShowTokenShop(false)} />}

      <AIChatWidget pageContext={pageTitle} />
    </div>
  )
}
