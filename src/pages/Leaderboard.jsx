import { useState, useEffect } from 'react'
import { db } from '../utils/firebase'
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore'
import { useAuth } from '../contexts/AuthContext'
import { useGamification } from '../contexts/GamificationContext'
import { getLevel, getLevelProgress, getNextLevel, BADGE_DEFS } from '../contexts/GamificationContext'
import { Trophy, Flame, Star, Crown, Medal, TrendingUp, Zap, Target, ChevronRight } from 'lucide-react'

export default function Leaderboard() {
  const { currentUser, userProfile } = useAuth()
  const { stats } = useGamification()
  const [leaders, setLeaders] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('xp')

  useEffect(() => {
    async function loadLeaderboard() {
      try {
        const q = query(
          collection(db, 'gamification'),
          orderBy('xp', 'desc'),
          limit(20)
        )
        const snap = await getDocs(q)
        const ids = snap.docs.map(d => d.id)

        // Fetch user names
        const userPromises = ids.map(async (uid) => {
          const userSnap = await getDocs(query(collection(db, 'users')))
          const userData = userSnap.docs.find(d => d.id === uid)
          return {
            uid,
            ...snap.docs.find(d => d.id === uid).data(),
            name: userData?.data()?.name || 'Unknown',
            profilePhoto: userData?.data()?.profilePhoto || '',
            role: userData?.data()?.role || 'teacher',
          }
        })

        // Simpler approach: load all gamification and users separately
        const gamSnap = await getDocs(query(collection(db, 'gamification'), orderBy('xp', 'desc'), limit(20)))
        const usersSnap = await getDocs(collection(db, 'users'))
        const usersMap = {}
        usersSnap.docs.forEach(d => { usersMap[d.id] = d.data() })

        const leaderData = gamSnap.docs.map(d => ({
          uid: d.id,
          ...d.data(),
          name: usersMap[d.id]?.name || 'Unknown',
          profilePhoto: usersMap[d.id]?.profilePhoto || '',
          role: usersMap[d.id]?.role || 'teacher',
        }))

        setLeaders(leaderData)
      } catch (err) {
        console.error('Leaderboard error:', err)
      }
      setLoading(false)
    }

    loadLeaderboard()
  }, [])

  const currentLevel = getLevel(stats.xp)
  const nextLevel = getNextLevel(stats.xp)
  const progress = getLevelProgress(stats.xp)
  const myBadges = (stats.badges || []).map(b => BADGE_DEFS[b]).filter(Boolean)

  const initials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U'

  const getRankIcon = (index) => {
    if (index === 0) return <Crown className="w-6 h-6 text-amber-500" />
    if (index === 1) return <Medal className="w-6 h-6 text-surface-400" />
    if (index === 2) return <Medal className="w-6 h-6 text-amber-700" />
    return <span className="text-sm font-bold text-surface-400 w-6 text-center">{index + 1}</span>
  }

  const getRankBg = (index) => {
    if (index === 0) return 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200/50'
    if (index === 1) return 'bg-gradient-to-r from-surface-50 to-surface-100/50 border-surface-200/50'
    if (index === 2) return 'bg-gradient-to-r from-amber-50/50 to-orange-50/30 border-amber-200/30'
    return 'bg-white border-surface-100'
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 animate-fade-in space-y-6">

      {/* Hero Stats */}
      <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-surface-900 via-surface-800 to-surface-900 p-6 sm:p-8 shadow-2xl border border-surface-700/50">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-tr from-amber-500/20 to-orange-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-gradient-to-tr from-primary-500/20 to-accent-500/10 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/3 pointer-events-none" />

        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-white tracking-tight flex items-center gap-3">
                <Trophy className="w-7 h-7 sm:w-8 sm:h-8 text-amber-400" /> Leaderboard
              </h1>
              <p className="text-surface-400 font-medium mt-1 text-sm sm:text-base">Compete, contribute, and climb the ranks!</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-center px-4 py-2 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10">
                <p className="text-2xl font-extrabold text-amber-400">{stats.xp || 0}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-surface-400">Total XP</p>
              </div>
              <div className="text-center px-4 py-2 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10">
                <p className="text-2xl font-extrabold text-orange-400 flex items-center justify-center gap-1"><Flame className="w-5 h-5" />{stats.streak || 0}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-surface-400">Streak</p>
              </div>
            </div>
          </div>

          {/* Level Progress */}
          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl">{currentLevel.emoji}</span>
                <span className="font-bold text-white text-sm sm:text-base">{currentLevel.name}</span>
              </div>
              {nextLevel && (
                <div className="flex flex-wrap items-center justify-end gap-1.5 text-surface-400 text-[10px] sm:text-xs font-medium">
                  <span>{nextLevel.min - stats.xp} XP to</span>
                  <span className="text-sm sm:text-base">{nextLevel.emoji}</span>
                  <span className="font-bold text-white">{nextLevel.name}</span>
                </div>
              )}
            </div>
            <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(245,158,11,0.4)]"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* My Badges */}
      {myBadges.length > 0 && (
        <div className="glass-card-solid p-5 sm:p-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-surface-400 mb-4 px-1">My Badges</h2>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {myBadges.map(badge => (
              <div key={badge.name} className="flex items-center gap-2 px-3 py-2 bg-surface-50 rounded-xl border border-surface-200/50 hover:shadow-soft transition-all">
                <span className="text-lg sm:text-xl">{badge.emoji}</span>
                <div>
                  <p className="text-xs font-bold text-surface-900">{badge.name}</p>
                  <p className="text-[10px] text-surface-500">{badge.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Available Badges */}
      <div className="glass-card-solid p-5 sm:p-6">
        <h2 className="text-xs font-bold uppercase tracking-widest text-surface-400 mb-4 px-1">All Badges</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
          {Object.entries(BADGE_DEFS).map(([key, badge]) => {
            const unlocked = (stats.badges || []).includes(key)
            return (
              <div key={key} className={`flex items-center gap-2 sm:gap-3 p-3 rounded-xl border transition-all ${unlocked ? 'bg-white border-primary-200/50 shadow-soft' : 'bg-surface-50 border-surface-200/30 opacity-50 grayscale'}`}>
                <span className="text-xl sm:text-2xl">{badge.emoji}</span>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-surface-900 truncate">{badge.name}</p>
                  <p className="text-[10px] text-surface-500 truncate">{badge.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="glass-card-solid overflow-hidden">
        <div className="px-5 sm:px-6 py-4 border-b border-surface-100 flex items-center justify-between">
          <h2 className="font-bold text-surface-900 font-display flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary-600" /> Top Educators
          </h2>
        </div>

        <div className="divide-y divide-surface-50">
          {loading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin mx-auto mb-3" />
              <p className="text-sm text-surface-500">Loading leaderboard...</p>
            </div>
          ) : leaders.length === 0 ? (
            <div className="p-12 text-center">
              <Trophy className="w-12 h-12 text-surface-300 mx-auto mb-3" />
              <p className="font-semibold text-surface-700">No data yet</p>
              <p className="text-sm text-surface-500 mt-1">Start using LDMS to appear on the leaderboard!</p>
            </div>
          ) : (
            leaders.map((user, i) => {
              const level = getLevel(user.xp || 0)
              const isMe = user.uid === currentUser?.uid
              return (
                <div key={user.uid} className={`flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3 sm:py-4 ${getRankBg(i)} ${isMe ? 'ring-2 ring-primary-200 ring-inset' : ''} transition-colors hover:bg-surface-50/80`}>
                  <div className="w-8 flex justify-center shrink-0">
                    {getRankIcon(i)}
                  </div>
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full gradient-bg flex items-center justify-center text-white font-bold text-sm overflow-hidden shrink-0">
                    {user.profilePhoto
                      ? <img src={user.profilePhoto} alt="" className="w-full h-full object-cover" />
                      : initials(user.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-surface-900 text-sm truncate flex items-center gap-1.5">
                      {user.name}
                      {isMe && <span className="text-[10px] bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded-full font-extrabold">YOU</span>}
                    </p>
                    <p className="text-xs text-surface-500 flex items-center gap-1">
                      <span>{level.emoji}</span> {level.name}
                      <span className="text-surface-300 mx-0.5">·</span>
                      <Flame className="w-3 h-3 text-orange-500" /> {user.streak || 0} day streak
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-extrabold text-surface-900 text-sm sm:text-base">{user.xp || 0}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-surface-400">XP</p>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* How to Earn XP */}
      <div className="glass-card-solid p-5 sm:p-6">
        <h2 className="text-xs font-bold uppercase tracking-widest text-surface-400 mb-4 px-1 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" /> How to Earn XP
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
          {[
            { action: 'Daily Login', xp: 5, icon: '📅' },
            { action: 'Create a Post', xp: 10, icon: '📝' },
            { action: 'Share a Resource', xp: 15, icon: '📚' },
            { action: 'Use AI Tools', xp: 5, icon: '🤖' },
            { action: 'Leave a Comment', xp: 3, icon: '💬' },
            { action: 'Receive a Like', xp: 2, icon: '❤️' },
            { action: 'Follow Someone', xp: 2, icon: '👤' },
            { action: 'Get Followed', xp: 3, icon: '🌟' },
          ].map(item => (
            <div key={item.action} className="flex items-center justify-between p-3 bg-surface-50 rounded-xl border border-surface-200/50">
              <div className="flex items-center gap-3">
                <span className="text-lg">{item.icon}</span>
                <span className="text-sm font-semibold text-surface-700">{item.action}</span>
              </div>
              <span className="text-sm font-extrabold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg">+{item.xp} XP</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
