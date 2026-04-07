import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Search, Calendar, Clock, Video, User, Star, CheckCircle, ChevronRight, GraduationCap, Loader2, Zap } from 'lucide-react'
import { db } from '../utils/firebase'
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore'

export default function Mentorship() {
  const { currentUser, userProfile, updateXP } = useAuth()
  const [mentors, setMentors] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMentor, setSelectedMentor] = useState(null)
  const [booking, setBooking] = useState(false)

  useEffect(() => {
    const q = query(collection(db, 'mentorship'), orderBy('price'))
    const unsub = onSnapshot(q, snap => {
      setMentors(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }, () => setLoading(false))
    return () => unsub()
  }, [])

  const filteredMentors = mentors.filter(m => 
    (m.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (m.subject || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.tags || []).some(t => t.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  function handleBook(mentor) {
    if (!currentUser || !userProfile) return alert('Please login to book a session.')
    if (mentor.price > 0 && (userProfile.xp || 0) < mentor.price) {
      return alert(`Not enough XP! You need ${mentor.price} XP but only have ${userProfile.xp || 0} XP.`)
    }
    setBooking(true)
    setTimeout(async () => {
      if (mentor.price > 0) {
        const success = await updateXP(-mentor.price)
        if (!success) {
          setBooking(false)
          return alert("Transaction failed. Not enough XP.")
        }
      }
      setBooking(false)
      setSelectedMentor(null)
      alert(`Session with ${mentor.name} successfully booked! Check your email for meeting link.`)
    }, 1500)
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-8 animate-fade-in pb-20 sm:pb-0">
      
      {/* Header */}
      <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-tr from-cyan-900 to-blue-900 border border-blue-800 p-8 sm:p-12 shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/20 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-white/90 text-xs font-bold tracking-widest uppercase mb-4">
            <GraduationCap className="w-4 h-4" /> 1:1 Mentorship
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold font-display text-white tracking-tight leading-tight mb-4">
            Learn from the <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-300">Masters</span>
          </h1>
          <p className="text-blue-100 font-medium">Book 1:1 sessions with highly experienced educators for career guidance, lesson plan reviews, or subject-specific doubts.</p>
        </div>
      </div>

      <div className="relative max-w-xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
        <input
          type="text"
          placeholder="Search by name, subject, or expertise..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white shadow-soft border border-surface-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-[3px] focus:ring-primary-100"
        />
      </div>

      {loading && (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-600" />
        </div>
      )}

      {/* Mentor List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredMentors.map(mentor => (
          <div key={mentor.id} className="bg-white rounded-[24px] p-6 shadow-sm border border-surface-200 hover:shadow-hover hover:border-cyan-200 transition-all duration-300 group">
            <div className="flex flex-col sm:flex-row gap-5">
              <img src={mentor.image} alt={mentor.name} className="w-24 h-24 rounded-2xl object-cover shrink-0 shadow-sm" />
              <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="text-xl font-bold font-display text-surface-900 group-hover:text-cyan-700 transition-colors">{mentor.name}</h3>
                  <div className="flex items-center gap-1 text-sm font-bold text-amber-500 bg-amber-50 px-2 py-0.5 rounded-md">
                    <Star className="w-3.5 h-3.5 fill-current" /> {mentor.rating}
                  </div>
                </div>
                <p className="text-surface-600 font-medium text-sm mb-3">{mentor.subject} · {mentor.experience}</p>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {(mentor.tags || []).map(t => (
                    <span key={t} className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-surface-100 text-surface-600 rounded-md">
                      {t}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-4 text-xs font-semibold text-surface-500 mb-5 pb-5 border-b border-surface-100">
                  <span className="flex items-center gap-1.5"><Video className="w-4 h-4 text-cyan-600" /> {mentor.sessionsCompleted} Sessions</span>
                  <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-cyan-600" /> {mentor.nextAvailable}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-surface-400">Session Fee</span>
                    <span className="text-lg font-black text-surface-900 flex items-center">
                      {mentor.price === 0 ? <span className="text-emerald-500">Free</span> : <><Zap className="w-4 h-4 text-cyan-500 mr-1"/> {mentor.price} XP</>}
                    </span>
                  </div>
                  <button onClick={() => setSelectedMentor(mentor)} className="px-5 py-2.5 bg-surface-900 text-white text-sm font-bold rounded-xl hover:bg-black transition-colors active:scale-95 shadow-md">
                    Book Session
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Booking Modal */}
      {selectedMentor && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => !booking && setSelectedMentor(null)}>
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md p-8 animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-6">
              <img src={selectedMentor.image} alt={selectedMentor.name} className="w-20 h-20 rounded-full mx-auto mb-4 border-4 border-cyan-50 shadow-sm" />
              <h2 className="text-2xl font-bold font-display text-surface-900 leading-tight">Book a session with<br/>{selectedMentor.name}</h2>
              <p className="text-surface-500 mt-2 text-sm">Select a date and time for your 1:1 video call.</p>
            </div>

            <div className="space-y-4 mb-8">
              <div className="p-4 border border-cyan-200 bg-cyan-50 rounded-2xl flex items-center justify-between cursor-pointer ring-2 ring-cyan-500">
                <div className="flex items-center gap-3 text-cyan-900">
                  <Calendar className="w-5 h-5 text-cyan-600" />
                  <div className="flex flex-col">
                    <span className="font-bold text-sm">Tomorrow</span>
                    <span className="text-xs text-cyan-700">2:30 PM - 3:00 PM</span>
                  </div>
                </div>
                <CheckCircle className="w-5 h-5 text-cyan-600" />
              </div>
              <div className="p-4 border border-surface-200 hover:bg-surface-50 rounded-2xl flex items-center justify-between cursor-pointer transition-colors">
                <div className="flex items-center gap-3 text-surface-700">
                  <Calendar className="w-5 h-5 text-surface-400" />
                  <div className="flex flex-col">
                    <span className="font-bold text-sm">Friday, 12th</span>
                    <span className="text-xs text-surface-500">10:00 AM - 10:30 AM</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mb-6 p-4 bg-surface-50 rounded-xl">
              <span className="font-semibold text-surface-600 text-sm">Total XP Cost:</span>
              <span className="font-black text-xl text-surface-900 flex items-center">
                {selectedMentor.price === 0 ? <span className="text-emerald-500">Free</span> : <><Zap className="w-5 h-5 text-cyan-600 mr-1"/> {selectedMentor.price}</>}
              </span>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => handleBook(selectedMentor)}
                disabled={booking}
                className="w-full py-4 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-[0.98] shadow-lg disabled:opacity-70"
              >
                {booking ? (
                  <>Processing...</>
                ) : (
                  <>Confirm Booking</>
                )}
              </button>
              <button onClick={() => !booking && setSelectedMentor(null)} disabled={booking} className="w-full py-3 text-sm font-bold text-surface-500 hover:text-surface-800 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
