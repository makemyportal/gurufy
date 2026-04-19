import { useState, useEffect, useRef } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useNotifications } from '../contexts/NotificationContext'
import { useGamification } from '../contexts/GamificationContext'
import { getLevel } from '../contexts/GamificationContext'
import { useTheme } from '../contexts/ThemeContext'
import { useLanguage } from '../contexts/LanguageContext'
import {
  BookOpen, Home, User, Briefcase, FolderOpen, Users, Sparkles,
  LayoutDashboard, Bell, Search, Menu, X, LogOut, ChevronDown,
  Settings, Shield, HelpCircle, GraduationCap, MessageSquare, CalendarDays,
  Heart, MessageCircle, UserPlus, Zap, Trophy, Flame, LogIn, Megaphone, ShoppingCart, Radio,
  Moon, Sun, History
} from 'lucide-react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../utils/firebase'
import AIChatWidget from './AIChatWidget'
import ChatPanel from './ChatPanel'
import ProfileCompletion from './ProfileCompletion'

// Nav array builders — called inside component to get reactive translations
function getTeacherNav(t, settings) {
  return [
    { to: '/', icon: Home, label: 'Workspace', color: 'from-blue-500 to-indigo-600', shadow: 'rgba(99,102,241,0.4)' },
    { to: '/history', icon: History, label: 'Generation History', color: 'from-purple-500 to-violet-600', shadow: 'rgba(139,92,246,0.4)' },
    { to: '/resources', icon: FolderOpen, label: 'My Files & Vault', color: 'from-amber-500 to-orange-600', shadow: 'rgba(245,158,11,0.4)' },
    { to: '/profile', icon: Settings, label: 'Settings', color: 'from-slate-500 to-slate-700', shadow: 'rgba(100,116,139,0.4)' }
  ];
}
function getSchoolNav(t, settings) {
  return [
    { to: '/', icon: Home, label: 'Workspace', color: 'from-blue-500 to-indigo-600', shadow: 'rgba(99,102,241,0.4)' },
    { to: '/resources', icon: FolderOpen, label: 'Shared Vault', color: 'from-amber-500 to-orange-600', shadow: 'rgba(245,158,11,0.4)' },
    { to: '/profile', icon: Settings, label: 'Settings', color: 'from-slate-500 to-slate-700', shadow: 'rgba(100,116,139,0.4)' }
  ];
}
function getTeacherMobileNav(t) {
  return [
    { to: '/', icon: Home, label: 'Workspace', color: 'from-blue-500 to-indigo-600', shadow: 'rgba(99,102,241,0.4)' },
    { to: '/resources', icon: FolderOpen, label: 'Vault', color: 'from-amber-500 to-orange-600', shadow: 'rgba(245,158,11,0.4)' },
    { to: '/profile', icon: Settings, label: 'Settings', color: 'from-slate-500 to-slate-700', shadow: 'rgba(100,116,139,0.4)' }
  ];
}
function getSchoolMobileNav(t) {
  return [
    { to: '/', icon: Home, label: 'Workspace', color: 'from-blue-500 to-indigo-600', shadow: 'rgba(99,102,241,0.4)' },
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
  const { stats } = useGamification()
  const { theme, toggleTheme } = useTheme()
  const { t } = useLanguage()
  const currentLevel = getLevel(stats.xp || 0)
  
  const [platformSettings, setPlatformSettings] = useState({})

  useEffect(() => {
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
  const [showChat, setShowChat] = useState(false)
  const [showProfileCompletion, setShowProfileCompletion] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const dropdownRef = useRef(null)
  const notifRef = useRef(null)

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
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center overflow-hidden shadow-lg">
            <img src="/logo.png" alt="LDMS" className="w-[120%] h-[120%] object-contain mix-blend-multiply" />
          </div>
          <span className="text-[18px] sm:text-[20px] font-extrabold font-display tracking-tight text-surface-900 hidden sm:block">LDMS</span>
        </div>

        {/* Global Search (Desktop) */}
        <div className="hidden md:flex relative w-full max-w-[600px] group mx-6 flex-1">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-surface-400 group-focus-within:text-slate-900 transition-colors" />
          <input
            type="text"
            placeholder="Search tools, commands, or resources..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-14 pr-16 py-3.5 bg-surface-100 hover:bg-surface-200 border-2 border-transparent text-[15px] font-medium text-surface-900 rounded-[20px] focus:outline-none focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10 transition-all placeholder:text-surface-400"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 hidden lg:flex items-center gap-1">
            <kbd className="px-2.5 py-1.5 bg-white border border-surface-200 rounded-lg text-[10px] font-extrabold text-surface-500 tracking-wider shadow-sm uppercase">Cmd K</kbd>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
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

          
          {/* Notifications Dropdown */}
          {currentUser && (
            <div className="relative" ref={notifRef}>
              <button 
                onClick={() => { setShowNotifications(!showNotifications); setDropdownOpen(false); }}
                className={`relative p-2 rounded-full transition-all duration-200 ${showNotifications ? 'bg-primary-50 text-primary-600 shadow-sm' : 'text-surface-600 hover:bg-surface-100'}`}
              >
                <Bell className="w-[22px] h-[22px]" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 rounded-full text-[10px] font-bold text-white border-2 border-white animate-pulse px-1">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute top-full mt-3 w-80 sm:w-96 glass-modal overflow-hidden z-50 animate-slide-down right-0 origin-top-right shadow-2xl">
                  <div className="px-5 py-4 border-b border-surface-100 flex items-center justify-between">
                    <h3 className="font-bold text-surface-900">Notifications</h3>
                    {unreadCount > 0 && (
                      <button 
                        onClick={markAllAsRead}
                        className="text-xs font-bold text-primary-600 hover:text-primary-700 px-2 py-1 rounded-lg hover:bg-primary-50 transition-colors"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div className="max-h-[400px] overflow-y-auto no-scrollbar">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center">
                        <Bell className="w-10 h-10 text-surface-300 mx-auto mb-3" />
                        <p className="text-sm font-medium text-surface-500">No notifications yet</p>
                        <p className="text-xs text-surface-400 mt-1">We'll let you know when something happens!</p>
                      </div>
                    ) : (
                      notifications.map(notification => {
                        const NotifIcon = getNotificationIcon(notification.type)
                        return (
                          <div 
                            key={notification.id} 
                            className={`p-4 border-b border-surface-50 flex gap-3 hover:bg-surface-50/80 transition-colors cursor-pointer ${notification.read ? '' : 'bg-primary-50/30'}`}
                            onClick={() => {
                              if (!notification.read) markAsRead(notification.id)
                              if (notification.type === 'message') {
                                navigate('/messaging')
                                setShowNotifications(false)
                              }
                            }}
                          >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${!notification.read ? 'bg-primary-100 text-primary-700' : 'bg-surface-100 text-surface-500'}`}>
                              <NotifIcon className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm leading-snug ${!notification.read ? 'font-bold text-surface-900' : 'font-medium text-surface-700'}`}>{notification.title}</p>
                              {notification.body && <p className="text-xs text-surface-500 mt-0.5 truncate">{notification.body}</p>}
                              <p className="text-xs font-semibold text-surface-400 mt-1">{timeAgo(notification.createdAt)}</p>
                            </div>
                            {!notification.read && <div className="w-2 h-2 rounded-full bg-primary-600 mt-1 shrink-0" />}
                          </div>
                        )
                      })
                    )}
                  </div>
                  {notifications.length > 0 && (
                    <div className="p-3 border-t border-surface-100 text-center">
                      <button className="text-sm font-bold text-surface-600 hover:text-surface-900 transition-colors">View All Notifications</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

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
                    <p className="font-bold text-surface-900 truncate">{userProfile?.name || currentUser?.email?.split('@')[0]}</p>
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
        <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm md:hidden animate-fade-in" onClick={() => setShowMobileSearch(false)}>
          <div className="bg-white p-4 shadow-2xl animate-slide-down" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 pt-2">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Search resources, jobs, teachers..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-surface-100 border border-surface-200 rounded-2xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-400 focus:bg-white transition-all"
                />
              </div>
              <button onClick={() => setShowMobileSearch(false)} className="p-2 hover:bg-surface-100 rounded-xl">
                <X className="w-5 h-5 text-surface-600" />
              </button>
            </div>
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
                    <p className="text-[12px] font-bold text-surface-800 truncate">{userProfile?.name || (['admin', 'superadmin'].includes(userProfile?.role) ? 'Super Admin' : 'User')}</p>
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
                    <p className="text-[12.5px] font-bold text-surface-800 truncate">{userProfile?.name || (['admin', 'superadmin'].includes(userProfile?.role) ? 'Super Admin' : 'User')}</p>
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
            <Outlet />
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
    </div>
  )
}
