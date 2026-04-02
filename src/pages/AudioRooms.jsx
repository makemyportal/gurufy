import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Mic, MicOff, Users, Play, Square, Loader2, Signal, Radio, Headphones, Globe, Heart } from 'lucide-react'
import { db } from '../utils/firebase'
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore'

export default function AudioRooms() {
  const { currentUser, userProfile } = useAuth()
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeRoom, setActiveRoom] = useState(null)
  const [isMuted, setIsMuted] = useState(true)
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    const q = query(collection(db, 'audioRooms'), orderBy('listeners', 'desc'))
    const unsub = onSnapshot(q, snap => {
      setRooms(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }, () => setLoading(false))
    return () => unsub()
  }, [])

  // Auto-scroll to top when a room is joined
  useEffect(() => {
    if (activeRoom) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [activeRoom])

  function handleJoinRoom(room) {
    if (!currentUser) return alert('Please login to join audio rooms.')
    setJoining(true)
    setTimeout(() => {
      setJoining(false)
      setActiveRoom(room)
      setIsMuted(true) // Start muted
    }, 1200)
  }

  function handleLeaveRoom() {
    setActiveRoom(null)
  }

  // Simulated Participant Bubbles (just colorful circles for the UI)
  const renderParticipants = (speakerCount, listenerCount) => {
    const speakers = Array(speakerCount).fill(0)
    const listeners = Array(Math.min(listenerCount, 12)).fill(0) // Show max 12 listeners for UI
    return (
      <div className="mt-8">
        <h4 className="text-xs font-bold uppercase tracking-widest text-surface-400 mb-4">Speakers ({speakerCount})</h4>
        <div className="flex flex-wrap gap-4 mb-8">
          {speakers.map((_, i) => (
            <div key={`s-${i}`} className="relative flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-full bg-surface-200 border-2 border-primary-500 shadow-sm flex items-center justify-center overflow-hidden">
                <img src={`https://i.pravatar.cc/150?u=speaker${i}${activeRoom?.id}`} alt="Speaker" className="w-full h-full object-cover" />
              </div>
              <div className="absolute -bottom-1 w-6 h-6 rounded-full bg-surface-800 text-white flex items-center justify-center shadow-lg border-2 border-white">
                {i === 0 ? <Mic className="w-3 h-3 text-emerald-400" /> : <MicOff className="w-3 h-3 text-red-400" />}
              </div>
              <span className="text-[10px] font-bold text-surface-700">{i === 0 ? 'Host' : `Speaker ${i}`}</span>
            </div>
          ))}
        </div>

        <h4 className="text-xs font-bold uppercase tracking-widest text-surface-400 mb-4">Listening ({listenerCount})</h4>
        <div className="flex flex-wrap gap-3">
          {listeners.map((_, i) => (
            <div key={`l-${i}`} className="w-12 h-12 rounded-full bg-surface-100 flex items-center justify-center overflow-hidden">
              <img src={`https://i.pravatar.cc/150?u=listener${i}${activeRoom?.id}`} alt="Listener" className="w-full h-full object-cover opacity-80" />
            </div>
          ))}
          {listenerCount > 12 && (
            <div className="w-12 h-12 rounded-full bg-surface-100 flex items-center justify-center border border-surface-200 text-xs font-bold text-surface-500">
              +{listenerCount - 12}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 animate-fade-in pb-20 sm:pb-0">
      
      {/* Active Room View */}
      {activeRoom ? (
        <div className="bg-surface-900 rounded-[32px] overflow-hidden shadow-2xl animate-scale-in">
          <div className="p-8 sm:p-12 relative overflow-hidden">
            {/* Animated Background Rings */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-white/5 rounded-full animate-ping" style={{ animationDuration: '4s' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-white/5 rounded-full animate-ping" style={{ animationDuration: '4s', animationDelay: '1s' }} />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/20 text-red-400 text-xs font-bold tracking-widest uppercase border border-red-500/30">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Live Now
                </span>
                <button onClick={handleLeaveRoom} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-bold transition-colors">
                  Leave Quietly
                </button>
              </div>

              <h2 className="text-3xl sm:text-4xl font-extrabold font-display text-white mb-2 leading-tight">{activeRoom.title}</h2>
              <p className="text-surface-300 font-medium flex items-center gap-2">
                Hosted by <span className="text-white font-bold">{activeRoom.host}</span>
              </p>

              <div className="flex gap-2 mt-4">
                {activeRoom.tags.map(t => (
                  <span key={t} className="px-2.5 py-1 rounded-md bg-white/10 text-white/80 text-[10px] font-bold uppercase tracking-wider">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white p-8 sm:p-12 rounded-t-[32px] mt-4 min-h-[400px]">
            {renderParticipants(activeRoom.speakers, activeRoom.listeners)}
            
            {/* Bottom Controls */}
            <div className="fixed bottom-0 left-0 right-0 p-6 xl:left-[220px] pointer-events-none z-50">
              <div className="max-w-md mx-auto bg-surface-900/95 backdrop-blur-xl p-4 rounded-3xl shadow-2xl pointer-events-auto border border-white/10 flex items-center justify-between">
                <button className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
                  <Heart className="w-5 h-5" />
                </button>
                
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 ${
                    isMuted ? 'bg-surface-700 text-white hover:bg-surface-600' : 'bg-primary-500 text-white hover:bg-primary-600 ring-4 ring-primary-500/30'
                  }`}
                >
                  {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </button>

                <button onClick={handleLeaveRoom} className="px-6 py-3 bg-red-500/20 text-red-400 font-bold rounded-2xl hover:bg-red-500/30 transition-colors">
                  Leave
                </button>
              </div>
            </div>
          </div>
        </div>

      ) : (

        <>
          {/* Header */}
          <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-tr from-purple-900 to-indigo-900 border border-indigo-800 p-8 sm:p-12 shadow-2xl">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] opacity-50" />
            
            <div className="relative z-10 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-white/90 text-xs font-bold tracking-widest uppercase mb-4">
                <Radio className="w-4 h-4 text-rose-400" /> Educator Spaces
              </div>
              <h1 className="text-3xl sm:text-5xl font-extrabold font-display text-white tracking-tight leading-tight mb-4">
                Tune in to <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-rose-300">Live Discussions</span>
              </h1>
              <p className="text-indigo-100 font-medium">Join live audio rooms hosted by top educators. Listen, learn, and raise your hand to speak.</p>
              
              <button className="mt-6 px-6 py-3 bg-white text-surface-900 font-bold rounded-xl flex items-center gap-2 hover:bg-surface-50 transition-colors shadow-lg">
                <Mic className="w-5 h-5" /> Start a Space
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold font-display text-surface-900 flex items-center gap-2">
              <Signal className="w-5 h-5 text-rose-500" /> Live Right Now
            </h2>
          </div>

          {loading && (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
            </div>
          )}

          {/* Rooms Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {rooms.map(room => (
              <div key={room.id} className="bg-white rounded-[24px] p-6 shadow-sm border border-surface-200 hover:shadow-hover hover:border-purple-200 transition-all duration-300 group cursor-pointer" onClick={() => handleJoinRoom(room)}>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-2 flex-wrap flex-1">
                    {(room.tags || []).map(t => (
                      <span key={t} className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-surface-100 text-surface-600 rounded-md">
                        {t}
                      </span>
                    ))}
                  </div>
                  <span className="shrink-0 flex items-center gap-1.5 px-2 py-1 bg-red-50 text-red-600 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-red-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> Live
                  </span>
                </div>

                <h3 className="text-xl font-bold font-display text-surface-900 mb-2 leading-tight group-hover:text-purple-600 transition-colors">{room.title}</h3>
                
                <p className="text-sm font-medium text-surface-500 mb-6">Hosted by <span className="font-bold text-surface-900">{room.host}</span></p>

                <div className="flex items-center justify-between pt-4 border-t border-surface-100">
                  <div className="flex items-center gap-3">
                    {/* Avatars tiny overlap */}
                    <div className="flex -space-x-2">
                      <div className="w-6 h-6 rounded-full bg-purple-100 border border-white z-20 overflow-hidden"><img src={`https://i.pravatar.cc/150?u=a${room.id}`} alt=""/></div>
                      <div className="w-6 h-6 rounded-full bg-rose-100 border border-white z-10 overflow-hidden"><img src={`https://i.pravatar.cc/150?u=b${room.id}`} alt=""/></div>
                      <div className="w-6 h-6 rounded-full bg-surface-200 border border-white z-0 overflow-hidden"><img src={`https://i.pravatar.cc/150?u=c${room.id}`} alt=""/></div>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-bold text-surface-500">
                      <span className="flex items-center gap-1"><Headphones className="w-3.5 h-3.5" /> {room.listeners}</span>
                      <span className="flex items-center gap-1"><Mic className="w-3.5 h-3.5" /> {room.speakers}</span>
                    </div>
                  </div>

                  <button className="w-10 h-10 rounded-full bg-surface-50 text-surface-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
                    {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 ml-0.5 fill-current" />}
                  </button>
                </div>
              </div>
            ))}
          </div>

        </>
      )}
    </div>
  )
}
