import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../utils/firebase'
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore'
import { useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, FileText, Download, Heart, Briefcase,
  Sparkles, BookOpen, Users, TrendingUp, ArrowUpRight, Loader2
} from 'lucide-react'

export default function TeacherDashboard() {
  const { currentUser, userProfile } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState({ posts: 0, resources: 0, downloads: 0, applications: 0, likes: 0 })
  const [recentPosts, setRecentPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentUser) return
    async function fetchStats() {
      try {
        // My posts
        const postsSnap = await getDocs(query(
          collection(db, 'posts'),
          where('authorId', '==', currentUser.uid),
          orderBy('createdAt', 'desc'),
          limit(5)
        ))
        const myPosts = postsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        const totalLikes = myPosts.reduce((a, p) => a + (p.likes?.length || 0), 0)

        // My resources
        const resSnap = await getDocs(query(
          collection(db, 'resources'),
          where('authorId', '==', currentUser.uid)
        ))
        const totalDownloads = resSnap.docs.reduce((a, d) => a + (d.data().downloads || 0), 0)

        // My applications
        const appsSnap = await getDocs(query(
          collection(db, 'applications'),
          where('teacherId', '==', currentUser.uid)
        )).catch(() => ({ docs: [] }))

        setStats({
          posts: postsSnap.size,
          resources: resSnap.size,
          downloads: totalDownloads,
          applications: appsSnap.docs?.length || 0,
          likes: totalLikes,
        })
        setRecentPosts(myPosts)
      } catch (err) {
        console.error('Dashboard stats error:', err)
      }
      setLoading(false)
    }
    fetchStats()
  }, [currentUser])

  const QUOTES = [
    "A good teacher can inspire hope, ignite the imagination, and instill a love of learning.",
    "Education is the most powerful weapon which you can use to change the world.",
    "Teaching is the one profession that creates all other professions.",
    "The best teachers teach from the heart, not from the book.",
    "Every child deserves a champion — an adult who never gives up on them.",
  ]
  const dailyQuote = QUOTES[new Date().getDay() % QUOTES.length]

  const statCards = [
    { label: 'Posts', value: stats.posts, icon: FileText, color: 'from-blue-500 to-indigo-600', lightBg: 'bg-blue-50', textColor: 'text-blue-600' },
    { label: 'Resources', value: stats.resources, icon: BookOpen, color: 'from-emerald-500 to-teal-600', lightBg: 'bg-emerald-50', textColor: 'text-emerald-600' },
    { label: 'Downloads', value: stats.downloads, icon: Download, color: 'from-amber-500 to-orange-600', lightBg: 'bg-amber-50', textColor: 'text-amber-600' },
    { label: 'Applications', value: stats.applications, icon: Briefcase, color: 'from-violet-500 to-purple-600', lightBg: 'bg-violet-50', textColor: 'text-violet-600' },
  ]

  const quickActions = [
    { label: 'Create Post', icon: FileText, path: '/', color: 'bg-blue-500' },
    { label: 'AI Tools', icon: Sparkles, path: '/ai-tools', color: 'bg-violet-500' },
    { label: 'Browse Jobs', icon: Briefcase, path: '/jobs', color: 'bg-emerald-500' },
    { label: 'My Groups', icon: Users, path: '/groups', color: 'bg-amber-500' },
  ]

  const timeAgo = (ts) => {
    if (!ts) return ''
    try {
      const s = Math.floor((Date.now() - ts.toDate().getTime()) / 1000)
      if (s < 3600) return `${Math.floor(s / 60)}m ago`
      if (s < 86400) return `${Math.floor(s / 3600)}h ago`
      return `${Math.floor(s / 86400)}d ago`
    } catch { return '' }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="section-title">Dashboard</h1>
        <p className="text-surface-500 text-sm mt-1">Your teaching activity at a glance</p>
      </div>

      {/* Motivational Quote */}
      <div className="glass-card-solid p-5 mb-6 bg-gradient-to-r from-primary-50 to-accent-50 border-primary-100/50">
        <p className="text-sm text-surface-700 italic font-medium leading-relaxed">"{dailyQuote}"</p>
        <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest mt-2">Quote of the Day</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((stat, idx) => (
          <div key={stat.label} className="glass-card-solid p-5 relative overflow-hidden group animate-slide-up" style={{ animationDelay: `${idx * 0.06}s` }}>
            <div className={`w-10 h-10 rounded-[16px] ${stat.lightBg} flex items-center justify-center mb-3`}>
              <stat.icon className={`w-5 h-5 ${stat.textColor}`} />
            </div>
            <p className="text-3xl font-extrabold text-surface-900">{stat.value}</p>
            <p className="text-xs font-bold text-surface-500 uppercase tracking-wider mt-1">{stat.label}</p>
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${stat.color} opacity-5 rounded-full blur-2xl -mr-8 -mt-8 group-hover:opacity-10 transition-opacity`} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="glass-card-solid p-5">
          <h3 className="text-[13px] font-bold tracking-widest uppercase text-surface-400 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map(action => (
              <button
                key={action.label}
                onClick={() => navigate(action.path)}
                className="flex flex-col items-center gap-2 p-4 bg-surface-50 hover:bg-surface-100 rounded-2xl transition-all border border-surface-200/50 group hover:-translate-y-0.5"
              >
                <div className={`w-10 h-10 ${action.color} rounded-xl flex items-center justify-center text-white group-hover:scale-110 transition-transform`}>
                  <action.icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-surface-700">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2 glass-card-solid p-5">
          <h3 className="text-[13px] font-bold tracking-widest uppercase text-surface-400 mb-4">Recent Posts</h3>
          {recentPosts.length === 0 ? (
            <p className="text-sm text-surface-500 text-center py-6">No posts yet. Share something with the community!</p>
          ) : (
            <div className="space-y-3">
              {recentPosts.map(post => (
                <div key={post.id} className="flex items-start gap-3 p-3 bg-surface-50 rounded-xl hover:bg-surface-100 transition-colors">
                  <div className="w-2 h-2 rounded-full bg-primary-500 mt-2 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-surface-800 line-clamp-2">{post.content}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-surface-400">
                      <span>❤️ {(post.likes || []).length}</span>
                      <span>💬 {post.commentsCount || 0}</span>
                      <span>{timeAgo(post.createdAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
