import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { db } from '../utils/firebase'
import {
  collection, addDoc, onSnapshot, query, orderBy, where,
  serverTimestamp, doc, updateDoc, limit, getDocs, getDoc
} from 'firebase/firestore'
import {
  MessageSquare, Send, Search, Plus, Loader2, ArrowLeft,
  X, Edit3, Circle, Check, CheckCheck, Maximize2, Minimize2
} from 'lucide-react'

export default function ChatPanel({ isOpen, onClose }) {
  const { currentUser, userProfile } = useAuth()
  const navigate = useNavigate()
  const [conversations, setConversations] = useState([])
  const [activeConvo, setActiveConvo] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [showNewChat, setShowNewChat] = useState(false)
  const [searchUsers, setSearchUsers] = useState('')
  const [allUsers, setAllUsers] = useState([])
  const [followedUsers, setFollowedUsers] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchConvo, setSearchConvo] = useState('')
  const [expanded, setExpanded] = useState(false)
  const messagesEndRef = useRef(null)
  const panelRef = useRef(null)

  // Load conversations
  useEffect(() => {
    if (!currentUser || !isOpen) return
    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', currentUser.uid),
      orderBy('lastMessageAt', 'desc')
    )
    const unsub = onSnapshot(q, snap => {
      setConversations(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }, () => setLoading(false))
    return () => unsub()
  }, [currentUser, isOpen])

  // Load followed users (up to 30 for the horizontal quick-chat bar)
  useEffect(() => {
    if (!currentUser || !isOpen) return
    const qFollows = query(collection(db, 'follows'), where('followerId', '==', currentUser.uid))
    const unsub = onSnapshot(qFollows, async (snap) => {
      const followingIds = snap.docs.map(d => d.data().followingId)
      if (followingIds.length === 0) {
        setFollowedUsers([])
        return
      }
      try {
        const usersData = await Promise.all(
          followingIds.slice(0, 30).map(async (id) => {
            const uDoc = await getDoc(doc(db, 'users', id))
            return uDoc.exists() ? { uid: uDoc.id, ...uDoc.data() } : null
          })
        )
        setFollowedUsers(usersData.filter(u => u !== null))
      } catch (err) {
        // Suppress
      }
    })
    return () => unsub()
  }, [currentUser, isOpen])

  // Load messages for active conversation
  useEffect(() => {
    if (!activeConvo) { setMessages([]); return }
    const q = query(
      collection(db, 'conversations', activeConvo.id, 'messages'),
      orderBy('createdAt', 'asc')
    )
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    })
    return () => unsub()
  }, [activeConvo])

  // Search users for new chat
  async function searchForUsers() {
    if (!searchUsers.trim()) return
    setSearchLoading(true)
    try {
      const q = query(collection(db, 'users'), limit(30))
      const snap = await getDocs(q)
      const users = snap.docs
        .map(d => ({ uid: d.id, ...d.data() }))
        .filter(u => u.uid !== currentUser.uid && u.name?.toLowerCase().includes(searchUsers.toLowerCase()))
      setAllUsers(users)
    } catch (err) {
      console.error('Search error:', err)
    }
    setSearchLoading(false)
  }

  async function startConversation(otherUser) {
    const existing = conversations.find(c => c.participants.includes(otherUser.uid))
    if (existing) {
      setActiveConvo(existing)
      setShowNewChat(false)
      return
    }
    try {
      const convoRef = await addDoc(collection(db, 'conversations'), {
        participants: [currentUser.uid, otherUser.uid],
        participantNames: {
          [currentUser.uid]: userProfile?.name || currentUser.email,
          [otherUser.uid]: otherUser.name || otherUser.email,
        },
        participantPhotos: {
          [currentUser.uid]: userProfile?.profilePhoto || '',
          [otherUser.uid]: otherUser.profilePhoto || '',
        },
        lastMessage: '',
        lastMessageAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      })
      setActiveConvo({
        id: convoRef.id,
        participants: [currentUser.uid, otherUser.uid],
        participantNames: { [currentUser.uid]: userProfile?.name, [otherUser.uid]: otherUser.name },
        participantPhotos: { [currentUser.uid]: userProfile?.profilePhoto || '', [otherUser.uid]: otherUser.profilePhoto || '' }
      })
      setShowNewChat(false)
    } catch (err) {
      console.error('Create convo error:', err)
    }
  }

  async function handleSend(e) {
    e.preventDefault()
    if (!newMessage.trim() || !activeConvo || !currentUser) return
    setSending(true)
    const text = newMessage.trim()
    setNewMessage('')
    try {
      await addDoc(collection(db, 'conversations', activeConvo.id, 'messages'), {
        text,
        senderId: currentUser.uid,
        senderName: userProfile?.name || currentUser.email,
        createdAt: serverTimestamp(),
      })
      await updateDoc(doc(db, 'conversations', activeConvo.id), {
        lastMessage: text,
        lastMessageAt: serverTimestamp(),
      })
    } catch (err) {
      console.error('Send error:', err)
    }
    setSending(false)
  }

  const getOtherUserId = (convo) => convo.participants?.find(p => p !== currentUser?.uid)
  const getOtherUserName = (convo) => {
    const otherId = getOtherUserId(convo)
    return convo.participantNames?.[otherId] || 'User'
  }
  const getOtherUserPhoto = (convo) => {
    const otherId = getOtherUserId(convo)
    return convo.participantPhotos?.[otherId] || ''
  }
  const initials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U'

  const timeAgo = (ts) => {
    if (!ts) return ''
    try {
      const s = Math.floor((Date.now() - ts.toDate().getTime()) / 1000)
      if (s < 60) return 'now'
      if (s < 3600) return `${Math.floor(s / 60)}m`
      if (s < 86400) return `${Math.floor(s / 3600)}h`
      return `${Math.floor(s / 86400)}d`
    } catch { return '' }
  }

  // Filter conversations by search
  const filteredConversations = conversations.filter(c => {
    if (!searchConvo.trim()) return true
    const name = getOtherUserName(c)
    return name.toLowerCase().includes(searchConvo.toLowerCase())
  })

  if (!isOpen || !currentUser) return null

  return (
    <>
      {/* Backdrop for mobile */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[70] xl:hidden animate-fade-in"
        onClick={onClose}
      />

      {/* Chat Panel */}
      <div
        ref={panelRef}
        className={`fixed z-[75] bg-white shadow-2xl flex flex-col animate-slide-up overflow-hidden transition-all duration-300 ${
          expanded
            ? 'inset-0 rounded-none sm:inset-4 sm:rounded-2xl'
            : 'bottom-0 right-0 sm:bottom-4 sm:right-4 w-full sm:w-[380px] h-[100dvh] sm:h-[520px] sm:rounded-2xl rounded-none'
        }`}
        style={{
          boxShadow: '0 8px 60px -12px rgba(0,0,0,0.3), 0 0 0 1px rgba(0,0,0,0.05)',
        }}
      >
        {/* Panel Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            {activeConvo ? (
              <button onClick={() => setActiveConvo(null)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                <ArrowLeft className="w-4 h-4 text-slate-600" />
              </button>
            ) : null}
            {activeConvo ? (
              <div className="flex items-center gap-2.5">
                <div
                  onClick={() => { onClose(); navigate(`/user/${getOtherUserId(activeConvo)}`) }}
                  className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-xs overflow-hidden shrink-0 cursor-pointer hover:ring-2 hover:ring-indigo-300 transition-all"
                >
                  {getOtherUserPhoto(activeConvo)
                    ? <img src={getOtherUserPhoto(activeConvo)} alt="" className="w-full h-full object-cover" />
                    : initials(getOtherUserName(activeConvo))}
                </div>
                <div>
                  <p
                    onClick={() => { onClose(); navigate(`/user/${getOtherUserId(activeConvo)}`) }}
                    className="font-bold text-sm text-slate-900 leading-tight cursor-pointer hover:text-indigo-600 transition-colors"
                  >
                    {getOtherUserName(activeConvo)}
                  </p>
                  <p className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> Active now
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-base">Chats</h3>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            {!activeConvo && (
              <button
                onClick={() => setShowNewChat(true)}
                className="p-2 hover:bg-indigo-50 rounded-lg transition-colors text-indigo-600"
                title="New Chat"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hidden sm:flex"
              title={expanded ? "Minimize" : "Expand"}
            >
              {expanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {activeConvo ? (
            /* ─── CHAT VIEW ─── */
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5 no-scrollbar" style={{ background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)' }}>
                {messages.length === 0 && (
                  <div className="text-center py-8">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-3">
                      <MessageSquare className="w-7 h-7 text-indigo-300" />
                    </div>
                    <p className="text-sm text-slate-400 font-medium">Say hi! 👋</p>
                  </div>
                )}
                {messages.map(msg => {
                  const isMe = msg.senderId === currentUser?.uid
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                      <div className={`max-w-[80%] px-3.5 py-2 rounded-2xl text-[13px] leading-relaxed ${
                        isMe
                          ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-br-md shadow-sm'
                          : 'bg-white text-slate-800 rounded-bl-md shadow-sm border border-slate-100'
                      }`}>
                        {msg.text}
                        <div className={`text-[9px] mt-0.5 ${isMe ? 'text-indigo-200' : 'text-slate-400'} text-right flex items-center justify-end gap-1`}>
                          {timeAgo(msg.createdAt)}
                          {isMe && <CheckCheck className="w-3 h-3" />}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <form onSubmit={handleSend} className="p-3 border-t border-slate-100 bg-white flex items-center gap-2 shrink-0">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-full text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-full flex items-center justify-center hover:shadow-lg transition-all active:scale-95 disabled:opacity-40 shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            /* ─── CONVERSATIONS LIST ─── */
            <>
              {/* Search */}
              <div className="p-3 pb-0 shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    placeholder="Search chats..."
                    value={searchConvo}
                    onChange={e => setSearchConvo(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-xl text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all font-medium"
                  />
                </div>
              </div>

              {/* Followed Users (Quick Chat) */}
              {!searchConvo.trim() && followedUsers.length > 0 && (
                <div className="px-3 pt-4 pb-2 shrink-0 animate-fade-in border-b border-slate-100">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 pl-1">Your Network</p>
                  <div className="flex items-start gap-4 overflow-x-auto no-scrollbar pb-2">
                    {followedUsers.map(u => (
                      <button
                        key={u.uid}
                        onClick={() => startConversation(u)}
                        className="flex flex-col items-center gap-1.5 w-14 shrink-0 hover:opacity-80 transition-opacity group"
                      >
                        <div className="relative w-12 h-12 rounded-full overflow-hidden flex items-center justify-center text-white font-bold text-sm bg-gradient-to-br from-indigo-500 to-violet-600 ring-2 ring-transparent group-hover:ring-indigo-300 transition-all">
                          {u.profilePhoto ? (
                            <img src={u.profilePhoto} alt="" className="w-full h-full object-cover" />
                          ) : (
                            initials(u.name)
                          )}
                        </div>
                        <span className="text-[10px] font-semibold text-slate-600 truncate w-full text-center">
                          {u.name?.split(' ')[0] || 'User'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Conversations */}
              <div className="flex-1 overflow-y-auto no-scrollbar px-2 py-2">
                {!searchConvo.trim() && filteredConversations.length > 0 && (
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-2 mb-2 pl-2">Recent Chats</p>
                )}
                {loading && (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                  </div>
                )}

                {!loading && filteredConversations.length === 0 && (
                  <div className="p-6 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                      <MessageSquare className="w-7 h-7 text-slate-300" />
                    </div>
                    <p className="text-sm text-slate-500 font-semibold">
                      {conversations.length === 0 ? 'No chats yet' : 'No results found'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {conversations.length === 0 ? 'Start a new conversation!' : 'Try a different search'}
                    </p>
                    {conversations.length === 0 && (
                      <button
                        onClick={() => setShowNewChat(true)}
                        className="mt-3 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all inline-flex items-center gap-1.5"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> New Chat
                      </button>
                    )}
                  </div>
                )}

                {filteredConversations.map(convo => (
                  <button
                    key={convo.id}
                    onClick={() => setActiveConvo(convo)}
                    className={`w-full text-left px-3 py-3 flex items-center gap-3 hover:bg-slate-50 transition-all rounded-xl group ${
                      activeConvo?.id === convo.id ? 'bg-indigo-50' : ''
                    }`}
                  >
                    <div className="relative shrink-0">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm overflow-hidden">
                        {getOtherUserPhoto(convo)
                          ? <img src={getOtherUserPhoto(convo)} alt="" className="w-full h-full object-cover" />
                          : initials(getOtherUserName(convo))}
                      </div>
                      {/* Online indicator */}
                      <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-bold text-sm text-slate-900 truncate">{getOtherUserName(convo)}</p>
                        <span className="text-[10px] text-slate-400 font-semibold shrink-0">{timeAgo(convo.lastMessageAt)}</span>
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5 font-medium">{convo.lastMessage || 'Start chatting...'}</p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* New Chat Modal */}
        {showNewChat && (
          <div className="absolute inset-0 z-10 bg-white flex flex-col animate-fade-in">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
              <h3 className="font-extrabold text-slate-900 text-base">New Conversation</h3>
              <button onClick={() => { setShowNewChat(false); setAllUsers([]); setSearchUsers('') }} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div className="p-3 shrink-0">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    placeholder="Search by name..."
                    value={searchUsers}
                    onChange={e => setSearchUsers(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && searchForUsers()}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-xl text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all font-medium"
                    autoFocus
                  />
                </div>
                <button onClick={searchForUsers} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shrink-0">
                  {searchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar px-2">
              {allUsers.length === 0 && !searchLoading && (
                <div className="p-6 text-center">
                  <Search className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500 font-medium">Search for users to chat with</p>
                </div>
              )}
              {allUsers.map(user => (
                <button
                  key={user.uid}
                  onClick={() => startConversation(user)}
                  className="w-full flex items-center gap-3 px-3 py-3 hover:bg-slate-50 rounded-xl transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm overflow-hidden shrink-0">
                    {user.profilePhoto
                      ? <img src={user.profilePhoto} alt="" className="w-full h-full object-cover" />
                      : initials(user.name)}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-900">{user.name}</p>
                    <p className="text-xs text-slate-500 capitalize font-medium">{user.role || 'Teacher'}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
