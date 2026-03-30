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
  Heart, MessageCircle, UserPlus, Zap, Trophy, Flame, LogIn, Megaphone
} from 'lucide-react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../utils/firebase'

// Nav array builders — called inside component to get reactive translations
function getTeacherNav(t) {
  return [
    { to: '/', icon: Home, label: t('feed') },
    { to: '/groups', icon: Users, label: t('groups') },
    { to: '/jobs', icon: Briefcase, label: t('careers') },
    { to: '/resources', icon: FolderOpen, label: t('resources') },
    { to: '/ai-tools', icon: Sparkles, label: t('aiMagic') },
    { to: '/messaging', icon: MessageSquare, label: t('messages') },
    { to: '/events', icon: CalendarDays, label: t('events') },
    { to: '/leaderboard', icon: Trophy, label: t('leaderboard') },
    { to: '/dashboard', icon: LayoutDashboard, label: t('dashboard') },
    { to: '/profile', icon: User, label: t('myProfile') },
  ]
}
function getSchoolNav(t) {
  return [
    { to: '/', icon: Home, label: t('feed') },
    { to: '/jobs', icon: Briefcase, label: t('jobs') },
    { to: '/teacher-search', icon: Search, label: t('findTalent') },
    { to: '/resources', icon: FolderOpen, label: t('resources') },
    { to: '/messaging', icon: MessageSquare, label: t('messages') },
    { to: '/events', icon: CalendarDays, label: t('events') },
    { to: '/leaderboard', icon: Trophy, label: t('leaderboard') },
    { to: '/dashboard', icon: LayoutDashboard, label: t('dashboard') },
    { to: '/profile', icon: User, label: t('schoolProfile') },
  ]
}
function getTeacherMobileNav(t) {
  return [
    { to: '/', icon: Home, label: t('feed') },
    { to: '/jobs', icon: Briefcase, label: t('careers') },
    { to: '/ai-tools', icon: Sparkles, label: 'AI' },
    { to: '/messaging', icon: MessageSquare, label: t('messages') },
    { to: '/dashboard', icon: LayoutDashboard, label: t('dashboard') },
  ]
}
function getSchoolMobileNav(t) {
  return [
    { to: '/', icon: Home, label: t('feed') },
    { to: '/jobs', icon: Briefcase, label: t('jobs') },
    { to: '/teacher-search', icon: Search, label: t('findTalent') },
    { to: '/messaging', icon: MessageSquare, label: t('messages') },
    { to: '/dashboard', icon: LayoutDashboard, label: t('dashboard') },
  ]
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
  const { theme } = useTheme()
  const { t } = useLanguage()
  const currentLevel = getLevel(stats.xp || 0)

  // Build translated nav arrays
  const teacherNav = getTeacherNav(t)
  const schoolNav = getSchoolNav(t)
  const teacherMobileNav = getTeacherMobileNav(t)
  const schoolMobileNav = getSchoolMobileNav(t)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showMobileSearch, setShowMobileSearch] = useState(false)
  const [globalAnnouncement, setGlobalAnnouncement] = useState(null)
  const [dismissedAnnouncement, setDismissedAnnouncement] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const dropdownRef = useRef(null)
  const notifRef = useRef(null)

  // Listen to Platform Settings for Global Announcements
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'platformSettings', 'global'), (docSnap) => {
      if (docSnap.exists() && docSnap.data().latestBroadcast) {
        const broadcast = docSnap.data().latestBroadcast
        setGlobalAnnouncement(broadcast)
        // Reset dismiss state if a new broadcast comes in
        const lastDismissedId = localStorage.getItem('dismissedBroadcastId')
        if (lastDismissedId !== broadcast.id) {
          setDismissedAnnouncement(false)
        } else {
          setDismissedAnnouncement(true)
        }
      } else {
        setGlobalAnnouncement(null)
      }
    })
    return () => unsub()
  }, [])

  function handleDismissAnnouncement() {
    setDismissedAnnouncement(true)
    if (globalAnnouncement?.id) {
      localStorage.setItem('dismissedBroadcastId', globalAnnouncement.id)
    }
  }

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
  const pageTitle = currentPage ? currentPage.label : 'Gurufy'

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

      {/* Global Announcement Banner */}
      {globalAnnouncement && !dismissedAnnouncement && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-gradient-to-r from-primary-600 to-indigo-600 shadow-lg text-white animate-slide-down">
          <div className="max-w-[1800px] mx-auto px-4 py-2.5 sm:py-3 flex items-center justify-center relative">
            <div className="flex items-center gap-3 w-full pr-8 max-w-4xl mx-auto sm:justify-center">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0 border border-white/20">
                <Megaphone className="w-4 h-4 text-white" />
              </div>
              <p className="text-[13px] sm:text-sm font-bold text-white leading-tight">
                {globalAnnouncement.text}
              </p>
            </div>
            <button 
              onClick={handleDismissAnnouncement}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-white/20 rounded-full transition-colors shrink-0"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* Fixed Top Navbar */}
      <header className={`fixed left-0 right-0 h-[70px] bg-white/95 backdrop-blur-xl border-b border-surface-200/80 z-50 px-3 sm:px-6 flex items-center justify-between transition-all ${globalAnnouncement && !dismissedAnnouncement ? 'top-[48px] sm:top-[52px]' : 'top-0'}`}>
        {/* Logo & Brand + Hamburger */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)} 
            className="xl:hidden p-2 -ml-1 hover:bg-surface-100 rounded-xl transition-colors"
          >
            <Menu className="w-5 h-5 text-surface-700" />
          </button>
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-tr from-primary-600 to-accent-500 rounded-xl flex items-center justify-center shadow-lg">
            <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <span className="text-[18px] sm:text-[20px] font-extrabold font-display tracking-tight text-surface-900 hidden sm:block">Gurufy</span>
        </div>

        {/* Global Search (Desktop) */}
        <div className="hidden md:flex relative w-[400px] group mx-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 group-focus-within:text-primary-500 transition-colors" />
          <input
            type="text"
            placeholder="Search resources, jobs, teachers..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-14 py-2.5 bg-surface-100 border border-surface-200 rounded-full text-sm font-semibold text-surface-900 focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-400 focus:bg-white transition-all placeholder:text-surface-400"
          />
          <kbd className="absolute right-4 top-1/2 -translate-y-1/2 hidden lg:inline-flex items-center px-2 py-0.5 bg-surface-200/80 rounded-md text-[10px] font-bold text-surface-500 tracking-wider">⌘K</kbd>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Mobile Search */}
          <button onClick={() => setShowMobileSearch(!showMobileSearch)} className="md:hidden p-2 text-surface-600 hover:bg-surface-100 rounded-full transition-colors">
            <Search className="w-5 h-5" />
          </button>

          {/* XP / Streak Badge (Desktop) */}
          {currentUser && (
            <button
              onClick={() => navigate('/leaderboard')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200/50 rounded-full transition-all cursor-pointer group"
            >
              <span className="text-sm">{currentLevel.emoji}</span>
              <span className="text-xs font-extrabold text-amber-700">{stats.xp || 0} XP</span>
              {(stats.streak || 0) > 0 && (
                <>
                  <span className="text-amber-300">·</span>
                  <Flame className="w-3.5 h-3.5 text-orange-500" />
                  <span className="text-xs font-bold text-orange-600">{stats.streak}</span>
                </>
              )}
            </button>
          )}
          
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
                <div className="absolute top-full mt-3 w-[calc(100vw-24px)] sm:w-96 glass-modal overflow-hidden z-50 animate-slide-down right-0 sm:right-0 max-w-[400px]" style={{ right: 'min(0px, calc(-50vw + 50% + 12px))' }}>
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
                            onClick={() => { if (!notification.read) markAsRead(notification.id) }}
                          >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${!notification.read ? 'bg-primary-100 text-primary-700' : 'bg-surface-100 text-surface-500'}`}>
                              <NotifIcon className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm leading-snug ${!notification.read ? 'font-bold text-surface-900' : 'font-medium text-surface-700'}`}>{notification.title}</p>
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
          <aside className="absolute top-0 left-0 bottom-0 w-[280px] bg-white shadow-2xl z-10 animate-slide-in-right overflow-y-auto no-scrollbar">
            <div className="p-4 border-b border-surface-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gradient-to-tr from-primary-600 to-accent-500 rounded-xl flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-extrabold font-display tracking-tight text-surface-900">Gurufy</span>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-surface-100 rounded-xl">
                <X className="w-5 h-5 text-surface-600" />
              </button>
            </div>
            <div className="p-4 space-y-1">
              {navItems.map(item => {
                const isActive = currentPath === item.to || (item.to !== '/' && currentPath.startsWith(item.to))
                return (
                  <NavLink 
                    key={item.to} 
                    to={item.to} 
                    end={item.to === '/'} 
                    className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl font-bold transition-all duration-200 ${
                      isActive 
                        ? 'bg-primary-50 text-primary-700 shadow-sm border border-primary-100/50' 
                        : 'text-surface-600 hover:bg-surface-100/60 hover:text-surface-900 border border-transparent'
                    }`}
                  >
                    <item.icon className={`w-5 h-5 ${isActive ? 'text-primary-600' : 'text-surface-400'}`} />
                    {item.label}
                    {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-600 shadow-[0_0_8px_rgba(37,99,235,0.6)]" />}
                  </NavLink>
                )
              })}
            </div>
          </aside>
        </div>
      )}

      <div className={`flex max-w-[1800px] mx-auto pt-[70px] ${globalAnnouncement && !dismissedAnnouncement ? 'mt-[48px] sm:mt-[52px]' : ''}`}>
        {/* Fixed Desktop Sidebar */}
        <aside className={`hidden xl:block w-[280px] shrink-0 fixed bottom-0 left-0 bg-white/90 backdrop-blur-md border-r border-surface-200/80 z-40 overflow-y-auto no-scrollbar transition-all ${globalAnnouncement && !dismissedAnnouncement ? 'top-[118px] sm:top-[122px]' : 'top-[70px]'}`}>
          <div className="p-4 space-y-2">
            <h3 className="px-4 text-xs font-extrabold text-surface-400 uppercase tracking-wider mb-3 mt-4 text-left">Navigation</h3>
            {navItems.map(item => {
              const isActive = currentPath === item.to || (item.to !== '/' && currentPath.startsWith(item.to))
              return (
                <NavLink 
                  key={item.to} 
                  to={item.to} 
                  end={item.to === '/'} 
                  className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl font-bold transition-all duration-200 ${
                    isActive 
                      ? 'bg-primary-50 text-primary-700 shadow-sm border border-primary-100/50' 
                      : 'text-surface-600 hover:bg-surface-100/60 hover:text-surface-900 border border-transparent'
                  }`}
                >
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-primary-600' : 'text-surface-400'}`} />
                  {item.label}
                  {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-600 shadow-[0_0_8px_rgba(37,99,235,0.6)]" />}
                </NavLink>
              )
            })}
          </div>
        </aside>

        {/* Main Content Workspace */}
        <main className="flex-1 min-h-screen xl:ml-[280px] pb-[90px] xl:pb-12 pt-6 px-3 sm:px-4 md:px-8">
          <div className="max-w-6xl mx-auto">
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

    </div>
  )
}
