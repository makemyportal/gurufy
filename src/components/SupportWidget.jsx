import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../utils/firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import {
  MessageCircleQuestion, X, Send, Loader2, CheckCircle2,
  AlertCircle, ChevronDown
} from 'lucide-react'

const CATEGORIES = [
  'General Query',
  'Bug / Technical Issue',
  'Coin / Payment Issue',
  'Feature Request',
  'Account Problem',
  'Other'
]

export default function SupportWidget() {
  const { currentUser, userProfile } = useAuth()
  const [open, setOpen] = useState(false)
  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  if (!currentUser) return null

  async function handleSend(e) {
    e.preventDefault()
    setError('')

    if (!subject.trim() || subject.trim().length < 3) {
      setError('Please enter a subject (at least 3 characters).')
      return
    }
    if (!message.trim() || message.trim().length < 10) {
      setError('Please describe your issue in detail (at least 10 characters).')
      return
    }

    setSending(true)
    try {
      await addDoc(collection(db, 'supportMessages'), {
        userId: currentUser.uid,
        userName: userProfile?.name || currentUser.email?.split('@')[0] || 'User',
        userEmail: currentUser.email || '',
        userRole: userProfile?.role || 'teacher',
        profilePhoto: userProfile?.profilePhoto || '',
        subject: subject.trim(),
        category: category || 'General Query',
        message: message.trim(),
        status: 'open',
        createdAt: serverTimestamp()
      })
      setSent(true)
      setTimeout(() => {
        setSent(false)
        setOpen(false)
        setSubject('')
        setCategory('')
        setMessage('')
      }, 2500)
    } catch (err) {
      console.error('Support message error:', err)
      setError('Failed to send. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-[90px] xl:bottom-6 left-4 xl:left-[240px] z-40 group"
        title="Need Help? Contact Support"
      >
        <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm rounded-2xl shadow-[0_8px_30px_rgba(99,102,241,0.4)] hover:shadow-[0_12px_40px_rgba(99,102,241,0.5)] transition-all duration-300 hover:-translate-y-0.5">
          <MessageCircleQuestion className="w-5 h-5" />
          <span className="hidden sm:inline">Need Help?</span>
        </div>
      </button>

      {/* Modal */}
      {open && createPortal(
        <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in" onClick={() => setOpen(false)}>
          <div className="bg-white w-full max-w-lg rounded-t-[32px] sm:rounded-[32px] shadow-2xl animate-slide-up flex flex-col max-h-[90vh] sm:max-h-[85vh]" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center justify-between p-6 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg">
                  <MessageCircleQuestion className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-surface-900 font-display">Contact Support</h2>
                  <p className="text-xs font-medium text-surface-400">We usually respond within 24 hours</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="p-2 hover:bg-surface-100 rounded-xl transition-colors">
                <X className="w-5 h-5 text-surface-500" />
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto px-6 pb-6 flex-1">
              {sent ? (
                <div className="text-center py-10 animate-fade-in-up">
                  <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                  </div>
                  <h3 className="text-xl font-extrabold text-surface-900 mb-2">Message Sent!</h3>
                  <p className="text-sm text-surface-500 font-medium">Our team will review your message and get back to you soon.</p>
                </div>
              ) : (
                <form onSubmit={handleSend} className="space-y-4">
                  {/* User Info Preview */}
                  <div className="flex items-center gap-3 p-3 bg-surface-50 rounded-2xl border border-surface-100">
                    <div className="w-9 h-9 rounded-full bg-surface-200 flex items-center justify-center text-surface-600 font-bold text-sm overflow-hidden shrink-0">
                      {userProfile?.profilePhoto
                        ? <img src={userProfile.profilePhoto} alt="" className="w-full h-full object-cover" />
                        : (userProfile?.name || 'U')[0].toUpperCase()
                      }
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-surface-800 truncate">{userProfile?.name || 'User'}</p>
                      <p className="text-[11px] text-surface-400 font-medium truncate">{currentUser.email} • {userProfile?.role || 'teacher'}</p>
                    </div>
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-xs font-bold text-surface-500 uppercase tracking-widest mb-1.5">Category</label>
                    <select
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                      className="w-full px-4 py-3 bg-surface-50 border border-surface-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all"
                    >
                      <option value="">Select a category</option>
                      {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="block text-xs font-bold text-surface-500 uppercase tracking-widest mb-1.5">Subject *</label>
                    <input
                      type="text"
                      value={subject}
                      onChange={e => setSubject(e.target.value)}
                      placeholder="Brief summary of your issue..."
                      maxLength={120}
                      className="w-full px-4 py-3 bg-surface-50 border border-surface-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all"
                    />
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-xs font-bold text-surface-500 uppercase tracking-widest mb-1.5">Message *</label>
                    <textarea
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      placeholder="Describe your issue or question in detail..."
                      rows={5}
                      maxLength={2000}
                      className="w-full px-4 py-3 bg-surface-50 border border-surface-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all resize-none"
                    />
                    <p className="text-[11px] text-surface-400 font-medium mt-1 text-right">{message.length}/2000</p>
                  </div>

                  {/* Error */}
                  {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                      <p className="text-xs font-bold text-red-700">{error}</p>
                    </div>
                  )}

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-extrabold text-[15px] rounded-xl shadow-lg transition-all disabled:opacity-60"
                  >
                    {sending ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> Sending...</>
                    ) : (
                      <><Send className="w-5 h-5" /> Send Message</>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
