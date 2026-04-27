import { createContext, useContext, useState, useEffect } from 'react'
import { doc, getDoc, setDoc, updateDoc, increment, serverTimestamp, onSnapshot, addDoc, collection } from 'firebase/firestore'
import { db } from '../utils/firebase'
import { useAuth } from './AuthContext'
import { DEFAULT_XP_VALUES } from '../utils/gamificationUtils'

// Re-export XP_VALUES as a mutable reference (updated by provider at runtime)
export let XP_VALUES = { ...DEFAULT_XP_VALUES }

const GamificationContext = createContext()

export function useGamification() {
  return useContext(GamificationContext)
}

export function GamificationProvider({ children }) {
  const { currentUser } = useAuth()
  const [stats, setStats] = useState({
    xp: 0,
    coins: 0,
    streak: 0,
    longestStreak: 0,
    lastLoginDate: null,
    badges: [],
    totalPosts: 0,
    totalLikes: 0,
    totalComments: 0,
    totalResources: 0,
    aiUsages: 0,
  })
  const [loading, setLoading] = useState(true)
  const [xpPopup, setXpPopup] = useState(null)
  const [coinPopup, setCoinPopup] = useState(null)
  const [coinConfig, setCoinConfig] = useState(DEFAULT_XP_VALUES)
  const [toolCosts, setToolCosts] = useState({})

  // Load coin config from platformSettings (real-time)
  useEffect(() => {
    if (!db) return
    const unsub = onSnapshot(doc(db, 'platformSettings', 'global'), (snap) => {
      if (snap.exists()) {
        const data = snap.data()
        if (data.coinConfig) {
          const cfg = data.coinConfig
          const merged = { ...DEFAULT_XP_VALUES, ...cfg }
          setCoinConfig(merged)
          XP_VALUES = merged
        }
        if (data.toolCosts) {
          setToolCosts(data.toolCosts)
        }
      }
    }, (err) => console.error('platformSettings listener error:', err))
    return () => unsub()
  }, [])

  // Real-time listener for user gamification data
  useEffect(() => {
    if (!currentUser || !db) {
      setStats({ xp: 0, coins: 0, streak: 0, longestStreak: 0, lastLoginDate: null, badges: [], totalPosts: 0, totalLikes: 0, totalComments: 0, totalResources: 0, aiUsages: 0 })
      setLoading(false)
      return
    }

    let checkedStreak = false
    const ref = doc(db, 'gamification', currentUser.uid)

    const unsub = onSnapshot(ref, async (snap) => {
      if (snap.exists()) {
        const data = snap.data()
        setStats(data)
        if (!checkedStreak) {
          checkedStreak = true
          await checkDailyStreak(ref, data)
        }
      } else {
        // Initialize gamification doc
        const initial = {
          xp: 0, coins: coinConfig.daily_login, streak: 1, longestStreak: 1,
          lastLoginDate: new Date().toISOString().split('T')[0],
          badges: [], totalPosts: 0, totalLikes: 0, totalComments: 0,
          totalResources: 0, aiUsages: 0,
          createdAt: serverTimestamp(),
        }
        await setDoc(ref, initial)
      }
      setLoading(false)
    }, (err) => {
      console.error('Gamification load error:', err)
      setLoading(false)
    })

    return () => unsub()
  }, [currentUser])

  async function checkDailyStreak(ref, data) {
    const today = new Date().toISOString().split('T')[0]
    const lastLogin = data.lastLoginDate

    if (lastLogin === today) return // Already logged in today

    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    let newStreak = 1
    if (lastLogin === yesterday) {
      newStreak = (data.streak || 0) + 1
    }

    const longestStreak = Math.max(newStreak, data.longestStreak || 0)
    const updates = {
      lastLoginDate: today,
      streak: newStreak,
      longestStreak,
      xp: (data.xp || 0) + XP_VALUES.daily_login,
      coins: (data.coins || 0) + XP_VALUES.daily_login,
    }

    // Check streak badges
    const badges = [...(data.badges || [])]
    if (newStreak >= 7 && !badges.includes('streak_7')) badges.push('streak_7')
    if (newStreak >= 30 && !badges.includes('streak_30')) badges.push('streak_30')
    updates.badges = badges

    await updateDoc(ref, updates)
    setStats(prev => ({ ...prev, ...updates }))
    showXpPopup(XP_VALUES.daily_login, 'Daily Login')
    showCoinPopup(XP_VALUES.daily_login, 'Daily Login')
  }

  function showXpPopup(xp, reason) {
    setXpPopup({ xp, reason })
    setTimeout(() => setXpPopup(null), 2500)
  }

  function showCoinPopup(coins, reason) {
    setCoinPopup({ coins, reason })
    setTimeout(() => setCoinPopup(null), 2500)
  }

  async function awardXP(amount, reason, badgeCheck) {
    if (!currentUser) return
    try {
      const ref = doc(db, 'gamification', currentUser.uid)
      const updates = { 
        xp: increment(amount),
        coins: increment(amount) 
      }
      
      if (badgeCheck) {
        const snap = await getDoc(ref)
        const data = snap.exists() ? snap.data() : {}
        const badges = [...(data.badges || [])]
        
        // Run badge check function
        const newBadge = badgeCheck(data, badges)
        if (newBadge && !badges.includes(newBadge)) {
          badges.push(newBadge)
          updates.badges = badges
        }

        // Update counter fields
        if (reason === 'create_post') updates.totalPosts = increment(1)
        if (reason === 'receive_like') updates.totalLikes = increment(1)
        if (reason === 'leave_comment') updates.totalComments = increment(1)
        if (reason === 'share_resource') updates.totalResources = increment(1)
        if (reason === 'use_ai_tool') updates.aiUsages = increment(1)
      }

      await updateDoc(ref, updates)
      setStats(prev => ({ ...prev, xp: (prev.xp || 0) + amount, coins: (prev.coins || 0) + amount }))
      showXpPopup(amount, reason.replace(/_/g, ' '))
      showCoinPopup(amount, reason.replace(/_/g, ' '))
    } catch (err) {
      console.error('Award XP error:', err)
    }
  }

  async function spendCoins(amount, reason) {
    if (!currentUser) return false
    try {
      const ref = doc(db, 'gamification', currentUser.uid)
      const snap = await getDoc(ref)
      if (!snap.exists()) return false
      
      const currentCoins = snap.data().coins || 0
      if (currentCoins < amount) return false

      await updateDoc(ref, { coins: increment(-amount) })
      setStats(prev => ({ ...prev, coins: (prev.coins || 0) - amount }))

      // Log tool usage for admin analytics
      try {
        const userSnap = await getDoc(doc(db, 'users', currentUser.uid))
        const userName = userSnap.exists() ? (userSnap.data().name || currentUser.email) : currentUser.email
        await addDoc(collection(db, 'tool_usage'), {
          userId: currentUser.uid,
          userName: userName,
          toolName: reason.replace('Unlock ', ''),
          toolId: reason,
          coinsSpent: amount,
          count: 1,
          createdAt: new Date().toISOString()
        })
      } catch (logErr) {
        console.warn('Tool usage log failed:', logErr)
      }
      
      return true
    } catch (err) {
      console.error('Spend coins error:', err)
      return false
    }
  }

  const value = {
    stats,
    loading,
    xpPopup,
    coinPopup,
    awardXP,
    spendCoins,
    getLevel: () => getLevel(stats.xp),
    getNextLevel: () => getNextLevel(stats.xp),
    getLevelProgress: () => getLevelProgress(stats.xp),
    toolCosts,
    coinConfig,
  }

  return (
    <GamificationContext.Provider value={value}>
      {children}
      {/* XP Popup Toast */}
      {xpPopup && (
        <div className="fixed bottom-24 xl:bottom-8 left-1/2 -translate-x-1/2 z-[100] animate-bounce-in">
          <div className="bg-surface-900 text-white px-5 py-3 rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.3)] flex items-center gap-3 font-bold text-sm border border-white/10">
            <span className="text-xl">⚡</span>
            <span>+{xpPopup.xp} XP</span>
            <span className="text-surface-400 font-medium">•</span>
            <span className="text-surface-300 font-medium capitalize">{xpPopup.reason}</span>
          </div>
        </div>
      )}
      {/* Coin Popup Toast */}
      {coinPopup && (
        <div className="fixed bottom-36 xl:bottom-20 left-1/2 -translate-x-1/2 z-[100] animate-bounce-in" style={{ animationDelay: '150ms' }}>
          <div className="bg-amber-100/90 backdrop-blur-md text-amber-900 px-5 py-3 rounded-2xl shadow-[0_16px_48px_rgba(251,191,36,0.3)] flex items-center gap-3 font-bold text-sm border border-amber-300">
            <span className="text-xl">🪙</span>
            <span>+{coinPopup.coins} Coins</span>
            <span className="text-amber-500 font-medium">•</span>
            <span className="text-amber-800 font-medium capitalize">{coinPopup.reason}</span>
          </div>
        </div>
      )}
    </GamificationContext.Provider>
  )
}
