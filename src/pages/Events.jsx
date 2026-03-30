import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../utils/firebase'
import {
  collection, addDoc, onSnapshot, query, orderBy,
  serverTimestamp, updateDoc, doc, arrayUnion, arrayRemove, where
} from 'firebase/firestore'
import {
  CalendarDays, Plus, MapPin, Clock, Users, Loader2, X,
  CheckCircle2, ExternalLink, Calendar, Video, BookOpen, Award
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const EVENT_TYPES = ['Workshop', 'Webinar', 'Conference', 'PTM', 'Training', 'Competition', 'Meetup']
const EVENT_COLORS = {
  Workshop: 'from-violet-500 to-purple-600',
  Webinar: 'from-blue-500 to-indigo-600',
  Conference: 'from-emerald-500 to-teal-600',
  PTM: 'from-amber-500 to-orange-600',
  Training: 'from-rose-500 to-pink-600',
  Competition: 'from-cyan-500 to-blue-600',
  Meetup: 'from-fuchsia-500 to-purple-600',
}
const EVENT_ICONS = {
  Workshop: BookOpen,
  Webinar: Video,
  Conference: Users,
  PTM: CalendarDays,
  Training: Award,
  Competition: Award,
  Meetup: Users,
}

export default function Events() {
  const navigate = useNavigate()
  const { currentUser, userProfile } = useAuth()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [activeTab, setActiveTab] = useState('upcoming')
  const [form, setForm] = useState({
    title: '', description: '', type: 'Workshop', date: '', time: '',
    location: '', link: '', maxAttendees: ''
  })

  useEffect(() => {
    const q = query(collection(db, 'events'), orderBy('date', 'asc'))
    const unsub = onSnapshot(q, snap => {
      setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }, () => setLoading(false))
    return () => unsub()
  }, [])

  const now = new Date().toISOString().split('T')[0]
  const upcoming = events.filter(e => e.date >= now)
  const past = events.filter(e => e.date < now)
  const displayEvents = activeTab === 'upcoming' ? upcoming : past

  async function handleCreate(e) {
    e.preventDefault()
    if (!currentUser) return
    setCreating(true)
    try {
      await addDoc(collection(db, 'events'), {
        ...form,
        maxAttendees: form.maxAttendees ? parseInt(form.maxAttendees) : null,
        organizerId: currentUser.uid,
        organizerName: userProfile?.name || currentUser.email,
        organizerPhoto: userProfile?.profilePhoto || '',
        attendees: [currentUser.uid],
        attendeesCount: 1,
        createdAt: serverTimestamp(),
      })
      setShowCreate(false)
      setForm({ title: '', description: '', type: 'Workshop', date: '', time: '', location: '', link: '', maxAttendees: '' })
    } catch (err) {
      console.error('Create event error:', err)
      alert('Failed to create event.')
    }
    setCreating(false)
  }

  async function toggleRSVP(event) {
    if (!currentUser) return navigate('/login')
    const ref = doc(db, 'events', event.id)
    const isAttending = (event.attendees || []).includes(currentUser.uid)
    try {
      if (isAttending) {
        await updateDoc(ref, {
          attendees: arrayRemove(currentUser.uid),
          attendeesCount: (event.attendeesCount || 1) - 1
        })
      } else {
        await updateDoc(ref, {
          attendees: arrayUnion(currentUser.uid),
          attendeesCount: (event.attendeesCount || 0) + 1
        })
      }
    } catch (err) {
      console.error('RSVP error:', err)
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="section-title">Events</h1>
          <p className="text-surface-500 text-sm mt-1">Workshops, webinars, and meetups for educators</p>
        </div>
        <button onClick={() => { if (!currentUser) return navigate('/login'); setShowCreate(true) }} className="btn-primary py-2.5 px-5 text-sm flex items-center gap-2 shrink-0 self-start sm:self-auto">
          <Plus className="w-4 h-4" /> Create Event
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-white/60 backdrop-blur-xl p-1.5 rounded-full border border-white mb-6 shadow-glass max-w-xs">
        {[
          { id: 'upcoming', label: `Upcoming (${upcoming.length})` },
          { id: 'past', label: `Past (${past.length})` },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 px-4 rounded-full text-sm font-bold tracking-wide transition-all duration-300 ${
              activeTab === tab.id ? 'bg-white text-primary-700 shadow-[0_4px_16px_rgba(0,0,0,0.06)]' : 'text-surface-500 hover:text-surface-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
        </div>
      )}

      {!loading && displayEvents.length === 0 && (
        <div className="glass-card-solid p-12 text-center">
          <CalendarDays className="w-12 h-12 text-surface-300 mx-auto mb-3" />
          <h3 className="font-semibold text-surface-700 mb-1">
            {activeTab === 'upcoming' ? 'No upcoming events' : 'No past events'}
          </h3>
          <p className="text-sm text-surface-500">
            {activeTab === 'upcoming' ? 'Create an event to bring educators together!' : 'Events you\'ve attended will appear here.'}
          </p>
        </div>
      )}

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {displayEvents.map((event, idx) => {
          const isAttending = currentUser && (event.attendees || []).includes(currentUser.uid)
          const isOrganizer = currentUser && event.organizerId === currentUser.uid
          const colorClass = EVENT_COLORS[event.type] || EVENT_COLORS.Workshop
          const IconComponent = EVENT_ICONS[event.type] || CalendarDays

          return (
            <div key={event.id} className="glass-card-solid overflow-hidden card-hover animate-slide-up" style={{ animationDelay: `${idx * 0.05}s` }}>
              {/* Color Header */}
              <div className={`h-3 bg-gradient-to-r ${colorClass}`} />
              
              <div className="p-5">
                <div className="flex items-start gap-4 mb-3">
                  {/* Date Badge */}
                  <div className="bg-surface-50 rounded-2xl p-3 text-center shrink-0 border border-surface-200/50 min-w-[60px]">
                    <p className="text-[10px] font-bold text-primary-600 uppercase tracking-wider">
                      {event.date ? new Date(event.date + 'T00:00:00').toLocaleDateString('en', { month: 'short' }) : ''}
                    </p>
                    <p className="text-2xl font-extrabold text-surface-900 leading-none">
                      {event.date ? new Date(event.date + 'T00:00:00').getDate() : ''}
                    </p>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`badge text-[10px] bg-gradient-to-r ${colorClass} text-white border-none`}>
                        {event.type}
                      </span>
                      {isOrganizer && (
                        <span className="badge text-[10px] bg-amber-100 text-amber-700">Organizer</span>
                      )}
                    </div>
                    <h3 className="font-bold text-surface-900 text-[15px] leading-snug">{event.title}</h3>
                    <p className="text-xs text-surface-500 mt-0.5">by {event.organizerName}</p>
                  </div>
                </div>

                {event.description && (
                  <p className="text-xs text-surface-600 line-clamp-2 mb-3">{event.description}</p>
                )}

                <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-surface-500 mb-4">
                  {event.time && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {event.time}
                    </span>
                  )}
                  {event.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> {event.location}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" /> {event.attendeesCount || 0} attending
                    {event.maxAttendees && ` / ${event.maxAttendees}`}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleRSVP(event)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.97] ${
                      isAttending
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm'
                    }`}
                  >
                    {isAttending ? <><CheckCircle2 className="w-4 h-4" /> Registered</> : 'Register / RSVP'}
                  </button>
                  {event.link && (
                    <a href={event.link} target="_blank" rel="noreferrer" className="p-2.5 bg-surface-100 hover:bg-surface-200 rounded-xl transition-colors">
                      <ExternalLink className="w-4 h-4 text-surface-600" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Create Event Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowCreate(false)}>
          <div className="glass-modal w-full max-w-lg p-6 animate-scale-in max-h-[90vh] overflow-y-auto no-scrollbar" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold font-display">Create Event</h2>
              <button onClick={() => setShowCreate(false)} className="p-1.5 hover:bg-surface-100 rounded-lg">
                <X className="w-5 h-5 text-surface-500" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <input required placeholder="Event Title *" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="input-field" />
              
              <div className="grid grid-cols-2 gap-3">
                <select required value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} className="input-field">
                  {EVENT_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
                <input required type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} className="input-field" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input type="time" placeholder="Time" value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))} className="input-field" />
                <input placeholder="Max Attendees" type="number" value={form.maxAttendees} onChange={e => setForm(p => ({ ...p, maxAttendees: e.target.value }))} className="input-field" />
              </div>

              <input placeholder="Location (City or Venue)" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} className="input-field" />
              <input placeholder="Meeting Link (Zoom/Meet URL)" value={form.link} onChange={e => setForm(p => ({ ...p, link: e.target.value }))} className="input-field" />
              <textarea placeholder="Description" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="input-field min-h-[80px] resize-none" />

              <button type="submit" disabled={creating} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
                {creating ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : <><Plus className="w-4 h-4" /> Create Event</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
