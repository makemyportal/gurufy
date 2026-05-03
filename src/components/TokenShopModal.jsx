import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { db } from '../utils/firebase'
import { collection, addDoc, serverTimestamp, doc, onSnapshot } from 'firebase/firestore'
import { useAuth } from '../contexts/AuthContext'
import { X, CheckCircle, ShieldAlert, Zap, Loader2, MessageCircle, Copy, Check } from 'lucide-react'

const DEFAULT_PACKAGES = [
  { id: 'starter', coins: 100, price: 99, tag: 'Starter' },
  { id: 'pro', coins: 500, price: 399, tag: 'Most Popular', popular: true },
  { id: 'enterprise', coins: 1000, price: 699, tag: 'Best Value' },
]

export default function TokenShopModal({ onClose }) {
  const { currentUser, userProfile } = useAuth()
  const [packages, setPackages] = useState(DEFAULT_PACKAGES)
  const [selectedPack, setSelectedPack] = useState(DEFAULT_PACKAGES[1])
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [upiId, setUpiId] = useState('teacherhub@upi')
  const [upiImageUrl, setUpiImageUrl] = useState(`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=upi://pay?pa=teacherhub@upi%26pn=LDMS%20Workspace`)
  const [adminWhatsapp, setAdminWhatsapp] = useState('')
  const [copiedUpi, setCopiedUpi] = useState(false)

  const userName = userProfile?.name || currentUser?.displayName || 'User'
  const userEmail = currentUser?.email || ''
  const userId = currentUser?.uid || ''

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'platformSettings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data()
        if (data.upiId) {
          setUpiId(data.upiId)
          setUpiImageUrl(`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=upi://pay?pa=${data.upiId}%26pn=LDMS%20Workspace%26am=${selectedPack.price}`)
        }
        if (data.tokenPlans && data.tokenPlans.length > 0) {
          setPackages(data.tokenPlans)
          setSelectedPack(data.tokenPlans.find(p => p.popular) || data.tokenPlans[0])
        }
        if (data.adminWhatsapp) setAdminWhatsapp(data.adminWhatsapp)
      }
    }, (err) => console.error('Token shop listener error:', err))
    return () => unsub()
  }, [])

  // Update QR when pack changes
  useEffect(() => {
    setUpiImageUrl(`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=upi://pay?pa=${upiId}%26pn=LDMS%20Workspace%26am=${selectedPack.price}`)
  }, [selectedPack, upiId])

  const copyUpi = () => {
    navigator.clipboard.writeText(upiId)
    setCopiedUpi(true)
    setTimeout(() => setCopiedUpi(false), 2000)
  }

  const handleWhatsAppSend = async () => {
    setLoading(true)
    setError('')
    try {
      // 1. Save payment request to Firebase
      await addDoc(collection(db, 'paymentRequests'), {
        userId: userId,
        userName: userName,
        userEmail: userEmail,
        amount: selectedPack.price,
        coins: selectedPack.coins,
        packageId: selectedPack.id,
        status: 'pending',
        method: 'whatsapp-screenshot',
        createdAt: serverTimestamp()
      })

      // 2. Save admin notification (non-blocking)
      try {
        await addDoc(collection(db, 'adminNotifications'), {
          type: 'coin_purchase',
          title: `💰 New Coin Purchase Request`,
          message: `${userName} (${userEmail}) requested ${selectedPack.coins} coins — ₹${selectedPack.price}. Awaiting screenshot verification.`,
          userId: userId,
          userName: userName,
          userEmail: userEmail,
          coins: selectedPack.coins,
          amount: selectedPack.price,
          read: false,
          createdAt: serverTimestamp()
        })
      } catch (notifErr) { console.warn('Admin notification failed (non-critical):', notifErr) }

      // 3. Open WhatsApp with pre-filled message
      if (adminWhatsapp) {
        const msg = `🪙 *Coin Purchase Request*

👤 *Name:* ${userName}
📧 *Email:* ${userEmail}
🆔 *User ID:* ${userId.substring(0, 8)}...
💰 *Package:* ${selectedPack.coins} Coins — ₹${selectedPack.price}

📎 *Payment screenshot attached below* ⬇️

_Please verify and add coins to my account. Thank you!_`
        window.open(`https://wa.me/${adminWhatsapp}?text=${encodeURIComponent(msg)}`, '_blank')
      }

      setStep(3)
    } catch (err) {
      console.error(err)
      setError('Failed to submit request. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/40 text-white rounded-full transition-colors z-20"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="h-32 bg-gradient-to-r from-indigo-900 to-purple-900 relative flex items-center justify-center overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-amber-500/20 rounded-full blur-xl"></div>
          <div className="relative z-10 text-center">
            <h2 className="text-2xl font-extrabold text-white flex items-center justify-center gap-2">
              <Zap className="w-6 h-6 text-amber-400" /> Token Store
            </h2>
            <p className="text-indigo-200 font-medium text-sm mt-1">Supercharge your workspace AI tools</p>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 md:p-8 overflow-y-auto">
          {step === 1 && (
            <div className="animate-fade-in-up">
              {/* User Info Card */}
              <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-xl mb-5 border border-indigo-100">
                <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black text-sm shrink-0">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-surface-900 truncate">{userName}</p>
                  <p className="text-[11px] text-surface-500 truncate">{userEmail}</p>
                </div>
              </div>

              <h3 className="text-lg font-bold text-surface-900 mb-4 text-center">Select a Coin Package</h3>
              <div className="space-y-3">
                {packages.map(pack => (
                  <button
                    key={pack.id}
                    onClick={() => setSelectedPack(pack)}
                    className={`w-full relative flex items-center justify-between p-4 rounded-2xl border-2 transition-all text-left ${selectedPack.id === pack.id ? 'border-indigo-600 bg-indigo-50 shadow-md transform scale-[1.01]' : 'border-surface-200 bg-white hover:border-indigo-300'}`}
                  >
                    {pack.popular && <span className="absolute -top-3 left-4 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shadow-sm">Popular</span>}
                    <div>
                      <p className="font-extrabold text-surface-900 text-lg flex items-center gap-2">
                        {pack.coins} <span className="text-amber-500">🪙</span>
                      </p>
                      <p className="text-xs font-semibold text-surface-500">{pack.tag}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-indigo-700 text-xl">₹{pack.price}</p>
                    </div>
                  </button>
                ))}
              </div>
              <button 
                onClick={() => setStep(2)}
                className="w-full mt-6 py-4 bg-slate-900 hover:bg-black text-white font-extrabold rounded-xl transition-all shadow-lg flex justify-center items-center gap-2"
              >
                Proceed to Payment (₹{selectedPack.price})
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="animate-fade-in">
              <button onClick={() => setStep(1)} className="text-indigo-600 text-sm font-bold mb-4 hover:underline">&larr; Change Package</button>
              
              {/* Order Summary */}
              <div className="bg-surface-50 rounded-xl p-4 mb-5 border border-surface-200">
                <p className="text-xs font-bold text-surface-500 mb-2">ORDER SUMMARY</p>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-bold text-surface-900">{userName}</p>
                    <p className="text-[11px] text-surface-400">{userEmail}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-indigo-700">{selectedPack.coins} 🪙</p>
                    <p className="text-sm font-bold text-surface-600">₹{selectedPack.price}</p>
                  </div>
                </div>
              </div>

              {/* QR Code */}
              <div className="text-center mb-5">
                <div className="inline-block p-4 bg-white border-2 border-dashed border-indigo-200 rounded-2xl shadow-sm mb-3">
                  <img src={upiImageUrl} alt="UPI QR Code" className="w-44 h-44 object-cover" />
                </div>
                <h3 className="text-xl font-extrabold text-surface-900 mb-1">Scan to Pay ₹{selectedPack.price}</h3>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <p className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg">{upiId}</p>
                  <button onClick={copyUpi} className="p-1.5 bg-indigo-100 hover:bg-indigo-200 rounded-lg transition-colors">
                    {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-indigo-600" />}
                  </button>
                </div>
              </div>

              {/* Steps Guide */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
                <p className="text-xs font-bold text-amber-800 mb-2">📋 Quick Steps:</p>
                <ol className="text-[11px] text-amber-700 font-medium space-y-1 list-decimal list-inside">
                  <li>Scan QR or copy UPI ID and pay <b>₹{selectedPack.price}</b></li>
                  <li>Take a <b>screenshot</b> of the payment confirmation</li>
                  <li>Click the <b>green WhatsApp button</b> below</li>
                  <li>Attach your screenshot in the WhatsApp chat & send</li>
                  <li>Your <b>{selectedPack.coins} coins</b> will be added within minutes! ✅</li>
                </ol>
              </div>

              {error && <p className="text-sm font-bold text-red-600 mb-3">{error}</p>}
              
              {/* WhatsApp Send Button */}
              <button 
                onClick={handleWhatsAppSend}
                disabled={loading}
                className="w-full py-4 bg-[#25D366] hover:bg-[#128C7E] text-white font-extrabold rounded-xl transition-all shadow-lg flex justify-center items-center gap-3 disabled:opacity-50 text-lg"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <>
                    <MessageCircle className="w-6 h-6" />
                    Send Screenshot via WhatsApp
                  </>
                )}
              </button>
              <p className="text-[10px] text-center text-surface-400 mt-2">Your details are auto-filled. Just attach the payment screenshot!</p>
            </div>
          )}

          {step === 3 && (
            <div className="animate-fade-in-up text-center py-8">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-emerald-600" />
              </div>
              <h3 className="text-2xl font-extrabold text-surface-900 mb-2">Request Sent! 🎉</h3>
              <p className="text-surface-600 mb-4 max-w-sm mx-auto">
                Your purchase request for <strong className="text-indigo-700">{selectedPack.coins} 🪙 Coins</strong> has been submitted successfully.
              </p>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6 max-w-sm mx-auto text-left">
                <p className="text-xs font-bold text-emerald-800 mb-2">✅ What happens next:</p>
                <ul className="text-[11px] text-emerald-700 font-medium space-y-1 list-disc list-inside">
                  <li>Admin will verify your payment screenshot</li>
                  <li>Coins will be credited within <b>5-15 minutes</b></li>
                  <li>You'll see updated balance in your profile</li>
                </ul>
              </div>
              
              {adminWhatsapp && (
                <button 
                  onClick={() => {
                    const msg = `Hi! I just made a payment for ${selectedPack.coins} coins (₹${selectedPack.price}). My email: ${userEmail}. Please verify. Thank you! 🙏`
                    window.open(`https://wa.me/${adminWhatsapp}?text=${encodeURIComponent(msg)}`, '_blank')
                  }}
                  className="px-6 py-3 bg-[#25D366] hover:bg-[#128C7E] text-white font-bold rounded-xl transition-all mb-4 inline-flex items-center gap-2 shadow-lg"
                >
                  <MessageCircle className="w-5 h-5" /> Send Reminder on WhatsApp
                </button>
              )}
              <br/>
              <button 
                onClick={onClose}
                className="px-6 py-3 bg-surface-900 hover:bg-black text-white font-bold rounded-xl transition-all mt-2"
              >
                Return to Workspace
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  // Use createPortal to attach the modal to the document body
  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body)
  }
  return null
}
