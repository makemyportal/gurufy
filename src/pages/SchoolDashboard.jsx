import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../utils/firebase'
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore'
import { useNavigate } from 'react-router-dom'
import {
  Briefcase, Users, FileText, MessageSquare, TrendingUp,
  Search, Plus, Loader2, ArrowUpRight, Building2, Eye
} from 'lucide-react'

export default function SchoolDashboard() {
  const { currentUser, userProfile } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState({ jobs: 0, activeJobs: 0, applicants: 0, messages: 0 })
  const [recentJobs, setRecentJobs] = useState([])
  const [recentApplicants, setRecentApplicants] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentUser) return
    async function fetchStats() {
      try {
        // My jobs
        const jobsSnap = await getDocs(query(
          collection(db, 'jobs'),
          where('schoolId', '==', currentUser.uid),
          orderBy('createdAt', 'desc'),
          limit(5)
        ))
        const jobs = jobsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        const activeJobs = jobs.filter(j => j.status === 'active')
        const totalApplicants = jobs.reduce((a, j) => a + (j.applicantsCount || 0), 0)

        // Recent applicants
        const appsSnap = await getDocs(query(
          collection(db, 'applications'),
          where('schoolId', '==', currentUser.uid),
          orderBy('appliedAt', 'desc'),
          limit(5)
        )).catch(() => ({ docs: [] }))

        setStats({
          jobs: jobs.length,
          activeJobs: activeJobs.length,
          applicants: totalApplicants,
          messages: 0,
        })
        setRecentJobs(jobs.slice(0, 5))
        setRecentApplicants(appsSnap.docs?.map(d => ({ id: d.id, ...d.data() })) || [])
      } catch (err) {
        console.error('Dashboard stats error:', err)
      }
      setLoading(false)
    }
    fetchStats()
  }, [currentUser])

  const statCards = [
    { label: 'Total Jobs', value: stats.jobs, icon: Briefcase, color: 'from-blue-500 to-indigo-600', lightBg: 'bg-blue-50', textColor: 'text-blue-600' },
    { label: 'Active Jobs', value: stats.activeJobs, icon: TrendingUp, color: 'from-emerald-500 to-teal-600', lightBg: 'bg-emerald-50', textColor: 'text-emerald-600' },
    { label: 'Applicants', value: stats.applicants, icon: Users, color: 'from-amber-500 to-orange-600', lightBg: 'bg-amber-50', textColor: 'text-amber-600' },
    { label: 'Messages', value: stats.messages, icon: MessageSquare, color: 'from-violet-500 to-purple-600', lightBg: 'bg-violet-50', textColor: 'text-violet-600' },
  ]

  const quickActions = [
    { label: 'Post a Job', icon: Plus, path: '/jobs', color: 'bg-blue-500' },
    { label: 'Find Teachers', icon: Search, path: '/teacher-search', color: 'bg-emerald-500' },
    { label: 'Messages', icon: MessageSquare, path: '/messaging', color: 'bg-violet-500' },
    { label: 'School Profile', icon: Building2, path: '/profile', color: 'bg-amber-500' },
  ]

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
        <h1 className="section-title">School Dashboard</h1>
        <p className="text-surface-500 text-sm mt-1">Manage your school's hiring and engagement</p>
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

        {/* Active Jobs */}
        <div className="lg:col-span-2 glass-card-solid p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[13px] font-bold tracking-widest uppercase text-surface-400">Job Listings</h3>
            <button onClick={() => navigate('/jobs')} className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1">
              View All <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {recentJobs.length === 0 ? (
            <p className="text-sm text-surface-500 text-center py-6">No jobs posted yet. Click "Post a Job" to get started!</p>
          ) : (
            <div className="space-y-3">
              {recentJobs.map(job => (
                <div key={job.id} className="flex items-center justify-between p-3.5 bg-surface-50 rounded-xl hover:bg-surface-100 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-surface-900 truncate">{job.title}</p>
                    <p className="text-xs text-surface-500">{job.salary} · {job.applicantsCount || 0} applicants</p>
                  </div>
                  <span className={`badge text-[10px] ${job.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-surface-200 text-surface-600'}`}>
                    {job.status === 'active' ? 'Active' : 'Closed'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Applicants */}
      {recentApplicants.length > 0 && (
        <div className="glass-card-solid p-5 mt-6">
          <h3 className="text-[13px] font-bold tracking-widest uppercase text-surface-400 mb-4">Recent Applicants</h3>
          <div className="space-y-3">
            {recentApplicants.map(app => (
              <div key={app.id} className="flex items-center justify-between p-3.5 bg-surface-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full gradient-bg flex items-center justify-center text-white font-bold text-sm">
                    {(app.teacherName || 'T')[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-surface-900">{app.teacherName || 'Teacher'}</p>
                    <p className="text-xs text-surface-500">Applied for: {app.jobTitle || 'Position'}</p>
                  </div>
                </div>
                <button className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" /> View
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
