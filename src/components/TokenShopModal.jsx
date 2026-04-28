import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { db } from '../utils/firebase'
import { collection, addDoc, serverTimestamp, getDoc, doc, onSnapshot } from 'firebase/firestore'
import { useAuth } from '../contexts/AuthContext'
import { X, CheckCircle, ShieldAlert, Zap, Loader2 } from 'lucide-react'

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
  const [utrNumber, setUtrNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [upiId, setUpiId] = useState('teacherhub@upi')
  const [upiImageUrl, setUpiImageUrl] = useState(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=teacherhub@upi%26pn=LDMS%20Workspace`)
  const [adminWhatsapp, setAdminWhatsapp] = useState('')

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'platformSettings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data()
        if (data.upiId) {
          setUpiId(data.upiId)
          setUpiImageUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=${data.upiId}%26pn=LDMS%20Workspace`)
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (utrNumber.trim().length < 12) {
      setError('Please enter a valid 12-digit UTR numeric transaction ID.')
      return
    }
    
    setLoading(true)
    setError('')
    try {
      await addDoc(collection(db, 'paymentRequests'), {
        userId: currentUser.uid,
        userName: userProfile?.name || currentUser.email,
        userEmail: currentUser.email,
        amount: selectedPack.price,
        coins: selectedPack.coins,
        packageId: selectedPack.id,
        utr: utrNumber.trim(),
        status: 'pending',
        createdAt: serverTimestamp()
      })
      // Auto-open WhatsApp notification to admin
      if (adminWhatsapp) {
        const userName = userProfile?.name || currentUser.email
        const msg = `🪙 *New Coin Purchase Request*%0A%0A👤 *User:* ${encodeURIComponent(userName)}%0A📧 *Email:* ${encodeURIComponent(currentUser.email)}%0A💰 *Package:* ${selectedPack.coins} Coins — ₹${selectedPack.price}%0A🔢 *UTR:* ${utrNumber.trim()}%0A%0APlease verify and approve from Admin Dashboard.`
        window.open(`https://wa.me/${adminWhatsapp}?text=${msg}`, '_blank')
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
          className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-colors z-20"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="h-32 bg-gradient-to-r from-indigo-900 to-purple-900 relative flex items-center justify-center overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          <div className="relative z-10 text-center">
            <h2 className="text-2xl font-extrabold text-white flex items-center justify-center gap-2">
              <Zap className="w-6 h-6 text-amber-400" /> Token Store
            </h2>
            <p className="text-indigo-200 font-medium text-sm mt-1">Supercharge your workspace AI usage</p>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 md:p-8 overflow-y-auto">
          {step === 1 && (
            <div className="animate-fade-in-up">
              <h3 className="text-lg font-bold text-surface-900 mb-4 text-center">Select a Funding Package</h3>
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
              <div className="text-center mb-6 border-b border-surface-200 pb-6">
                <button onClick={() => setStep(1)} className="text-indigo-600 text-sm font-bold mb-4 hover:underline">&larr; Change Package</button>
                <div className="inline-block p-4 bg-white border-2 border-dashed border-indigo-200 rounded-2xl shadow-sm mb-4">
                  <img src={upiImageUrl} alt="UPI QR Code" className="w-40 h-40 object-cover" />
                </div>
                <h3 className="text-xl font-extrabold text-surface-900 mb-1">Scan to Pay ₹{selectedPack.price}</h3>
                <p className="text-sm font-bold text-indigo-600 bg-indigo-50 inline-block px-3 py-1 rounded-lg">UPI ID: {upiId}</p>
                <p className="text-xs text-surface-500 font-medium mt-2 max-w-sm mx-auto">Open any UPI app (GPay, PhonePe, Paytm), scan the QR code, and complete the exact payment.</p>
              </div>

              <form onSubmit={handleSubmit}>
                <label className="block text-sm font-bold text-surface-900 mb-2">Enter 12-Digit UTR / Reference No.</label>
                <input 
                  type="text" 
                  required
                  value={utrNumber}
                  onChange={e => setUtrNumber(e.target.value)}
                  placeholder="e.g. 312345678901"
                  className="w-full px-4 py-3 bg-surface-50 border border-surface-200 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500 outline-none text-surface-900"
                />
                <div className="flex items-center gap-2 mt-3 text-[11px] font-bold text-amber-600 bg-amber-50 p-2 rounded-lg">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  Please ensure the exact amount (₹{selectedPack.price}) is paid. Incorrect UTR will cause delays.
                </div>
                {error && <p className="text-sm font-bold text-red-600 mt-3">{error}</p>}
                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full mt-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl transition-all shadow-lg flex justify-center items-center gap-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Payment Validation'}
                </button>
              </form>
            </div>
          )}

          {step === 3 && (
            <div className="animate-fade-in-up text-center py-8">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-emerald-600" />
              </div>
              <h3 className="text-2xl font-extrabold text-surface-900 mb-2">Request Submitted!</h3>
              <p className="text-surface-600 mb-8 max-w-sm mx-auto">
                We've received your UTR number <strong className="text-surface-900">{utrNumber}</strong>. Your {selectedPack.coins} 🪙 Coins will be credited to your account once our team manually verifies the payment (usually within 1-2 hours).
              </p>
              {adminWhatsapp && (
                <button 
                  onClick={() => {
                    const userName = userProfile?.name || currentUser.email
                    const msg = `🪙 *New Coin Purchase Request*%0A%0A👤 *User:* ${encodeURIComponent(userName)}%0A📧 *Email:* ${encodeURIComponent(currentUser.email)}%0A💰 *Package:* ${selectedPack.coins} Coins — ₹${selectedPack.price}%0A🔢 *UTR:* ${utrNumber.trim()}%0A%0APlease verify and approve from Admin Dashboard.`
                    window.open(`https://wa.me/${adminWhatsapp}?text=${msg}`, '_blank')
                  }}
                  className="px-6 py-3 bg-[#25D366] hover:bg-[#128C7E] text-white font-bold rounded-xl transition-all mb-4 inline-flex items-center gap-2 shadow-lg"
                >
                  📱 Notify Admin on WhatsApp
                </button>
              )}
              <br/>
              <button 
                onClick={onClose}
                className="px-6 py-3 bg-surface-900 hover:bg-black text-white font-bold rounded-xl transition-all"
              >
                Return to Workspace
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  // Use createPortal to attach the modal to the document body, avoiding stacking context / transform issues
  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body)
  }
  return null
}
