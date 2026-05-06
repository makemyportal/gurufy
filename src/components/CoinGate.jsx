import { useState } from 'react'
import { useGamification } from '../contexts/GamificationContext'
import { useAuth } from '../contexts/AuthContext'
import { Lock, Zap, ShoppingCart, Ban } from 'lucide-react'
import TokenShopModal from './TokenShopModal'

export default function CoinGate({ children, toolName, toolId }) {
  const { stats, spendCoins, toolCosts } = useGamification()
  const { userProfile } = useAuth()
  const [unlocked, setUnlocked] = useState(false)
  const [showShop, setShowShop] = useState(false)
  const [spending, setSpending] = useState(false)
  const [error, setError] = useState('')

  const TOOL_COST = toolCosts?.[toolId || toolName] ?? 5

  const isSuperAdmin = userProfile?.role === 'superadmin'
  const isSuspended = userProfile?.status === 'suspended'

  // Suspended users cannot use any tool
  if (isSuspended) {
    return (
      <div className="max-w-lg mx-auto py-20 px-6 animate-fade-in-up text-center">
        <div className="bg-white rounded-[32px] p-10 shadow-xl border border-red-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-red-100/50 rounded-full blur-3xl -mr-20 -mt-20"></div>
          <div className="relative z-10">
            <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-rose-100 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-red-200">
              <Ban className="w-9 h-9 text-red-600" />
            </div>
            <h2 className="text-2xl font-extrabold text-surface-900 mb-2">Account Suspended</h2>
            <p className="text-surface-500 font-medium mb-4 max-w-sm mx-auto">
              Your account has been suspended by the administrator. You cannot access any tools or features at this time.
            </p>
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700 font-bold">
              Please contact your administrator to resolve this issue.
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Super admins bypass the gate
  if (isSuperAdmin || unlocked) {
    return children
  }

  const hasEnough = (stats?.coins || 0) >= TOOL_COST

  async function handleUnlock() {
    setSpending(true)
    setError('')
    const success = await spendCoins(TOOL_COST, `Unlock ${toolName}`)
    if (success) {
      setUnlocked(true)
    } else {
      setShowShop(true)
      setError('Not enough coins! Buy more coins to continue.')
    }
    setSpending(false)
  }

  return (
    <div className="max-w-lg mx-auto py-20 px-6 animate-fade-in-up text-center">
      <div className="bg-white rounded-[32px] p-10 shadow-xl border border-surface-200 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-100/50 rounded-full blur-3xl -mr-20 -mt-20"></div>
        
        <div className="relative z-10">
          <div className="w-20 h-20 bg-gradient-to-br from-amber-100 to-orange-100 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-amber-200">
            <Lock className="w-9 h-9 text-amber-600" />
          </div>

          <h2 className="text-2xl font-extrabold text-surface-900 mb-2">{toolName}</h2>
          <p className="text-surface-500 font-medium mb-8 max-w-sm mx-auto">
            This premium workspace tool costs <strong className="text-amber-700">{TOOL_COST} 🪙</strong> per session to use. Earn coins by using AI Tools or buy more from the store!
          </p>

          <div className="bg-surface-50 border border-surface-200 rounded-2xl p-4 mb-6 flex items-center justify-center gap-3">
            <span className="text-2xl">🪙</span>
            <span className="text-xl font-black text-surface-900">{stats?.coins || 0}</span>
            <span className="text-sm font-bold text-surface-500">coins available</span>
          </div>

          {error && <p className="text-sm font-bold text-red-600 mb-4">{error}</p>}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleUnlock}
              disabled={!hasEnough || spending}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-surface-900 hover:bg-black text-white font-extrabold rounded-2xl transition-all shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Zap className="w-5 h-5" />
              {spending ? 'Unlocking...' : `Spend ${TOOL_COST} 🪙 to Use`}
            </button>
            <button
              onClick={() => setShowShop(true)}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-extrabold rounded-2xl transition-all shadow-lg"
            >
              <ShoppingCart className="w-5 h-5" /> Buy Coins
            </button>
          </div>

          <p className="text-xs text-surface-400 font-semibold mt-6">Tip: Use AI Tools to earn +5 🪙 per generation</p>
        </div>
      </div>

      {showShop && <TokenShopModal onClose={() => setShowShop(false)} />}
    </div>
  )
}
