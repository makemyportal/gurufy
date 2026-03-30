import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../utils/firebase'
import {
  collection, addDoc, onSnapshot, query, orderBy, where,
  serverTimestamp, doc, updateDoc, limit, getDocs
} from 'firebase/firestore'
import {
  MessageSquare, Send, Search, Plus, Loader2, ArrowLeft,
  User, Phone, Video, MoreVertical, Smile, Image, Check, CheckCheck
} from 'lucide-react'

export default function Messaging() {
  const { currentUser, userProfile } = useAuth()
  const [conversations, setConversations] = useState([])
  const [activeConvo, setActiveConvo] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [showNewChat, setShowNewChat] = useState(false)
  const [searchUsers, setSearchUsers] = useState('')
  const [allUsers, setAllUsers] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const messagesEndRef = useRef(null)

  // Load conversations
  useEffect(() => {
    if (!currentUser) return
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
  }, [currentUser])

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
      const q = query(collection(db, 'users'), limit(20))
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
    // Check if conversation already exists
    const existing = conversations.find(c =>
      c.participants.includes(otherUser.uid)
    )
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
      setActiveConvo({ id: convoRef.id, participants: [currentUser.uid, otherUser.uid], participantNames: { [currentUser.uid]: userProfile?.name, [otherUser.uid]: otherUser.name }, participantPhotos: { [currentUser.uid]: userProfile?.profilePhoto || '', [otherUser.uid]: otherUser.profilePhoto || '' } })
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

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="section-title">Messages</h1>
        <button onClick={() => setShowNewChat(true)} className="btn-primary py-2.5 px-5 text-sm flex items-center gap-2 shrink-0 self-start sm:self-auto">
          <Plus className="w-4 h-4" /> New Chat
        </button>
      </div>

      <div className="glass-card-solid overflow-hidden" style={{ minHeight: '65vh' }}>
        <div className="flex h-[65vh]">
          {/* Conversation List */}
          <div className={`w-full md:w-[340px] border-r border-surface-100 flex flex-col ${activeConvo ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-4 border-b border-surface-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input placeholder="Search conversations..." className="w-full pl-10 pr-4 py-2.5 bg-surface-50 rounded-xl text-sm border border-surface-200 focus:outline-none focus:ring-2 focus:ring-primary-200 transition-all" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar">
              {loading && (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
                </div>
              )}

              {!loading && conversations.length === 0 && (
                <div className="p-8 text-center">
                  <MessageSquare className="w-12 h-12 text-surface-300 mx-auto mb-3" />
                  <p className="text-sm text-surface-500 font-medium">No conversations yet</p>
                  <p className="text-xs text-surface-400 mt-1">Start a new chat to connect with others</p>
                </div>
              )}

              {conversations.map(convo => (
                <button
                  key={convo.id}
                  onClick={() => setActiveConvo(convo)}
                  className={`w-full text-left p-4 flex items-center gap-3 hover:bg-surface-50 transition-colors border-b border-surface-50 ${activeConvo?.id === convo.id ? 'bg-primary-50/50' : ''}`}
                >
                  <div className="w-12 h-12 rounded-full gradient-bg flex items-center justify-center text-white font-bold text-sm shrink-0 overflow-hidden">
                    {getOtherUserPhoto(convo)
                      ? <img src={getOtherUserPhoto(convo)} alt="" className="w-full h-full object-cover" />
                      : initials(getOtherUserName(convo))}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-sm text-surface-900 truncate">{getOtherUserName(convo)}</p>
                      <span className="text-[10px] text-surface-400 font-semibold shrink-0">{timeAgo(convo.lastMessageAt)}</span>
                    </div>
                    <p className="text-xs text-surface-500 truncate mt-0.5">{convo.lastMessage || 'Start chatting...'}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Chat Area */}
          <div className={`flex-1 flex flex-col ${!activeConvo ? 'hidden md:flex' : 'flex'}`}>
            {activeConvo ? (
              <>
                {/* Chat Header */}
                <div className="px-5 py-4 border-b border-surface-100 flex items-center justify-between bg-white/80">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setActiveConvo(null)} className="md:hidden p-1.5 hover:bg-surface-100 rounded-lg mr-1">
                      <ArrowLeft className="w-5 h-5 text-surface-600" />
                    </button>
                    <div className="w-10 h-10 rounded-full gradient-bg flex items-center justify-center text-white font-bold text-sm overflow-hidden">
                      {getOtherUserPhoto(activeConvo)
                        ? <img src={getOtherUserPhoto(activeConvo)} alt="" className="w-full h-full object-cover" />
                        : initials(getOtherUserName(activeConvo))}
                    </div>
                    <div>
                      <p className="font-bold text-surface-900">{getOtherUserName(activeConvo)}</p>
                      <p className="text-xs text-emerald-500 font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> Online
                      </p>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-surface-50/50 no-scrollbar">
                  {messages.length === 0 && (
                    <div className="text-center py-12">
                      <p className="text-sm text-surface-400">Send a message to start the conversation</p>
                    </div>
                  )}
                  {messages.map(msg => {
                    const isMe = msg.senderId === currentUser?.uid
                    return (
                      <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                        <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          isMe
                            ? 'bg-primary-600 text-white rounded-br-md shadow-[0_4px_12px_rgba(37,99,235,0.2)]'
                            : 'bg-white text-surface-800 rounded-bl-md shadow-sm border border-surface-100'
                        }`}>
                          {msg.text}
                          <div className={`text-[10px] mt-1 ${isMe ? 'text-primary-200' : 'text-surface-400'} text-right`}>
                            {timeAgo(msg.createdAt)}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <form onSubmit={handleSend} className="p-4 border-t border-surface-100 bg-white flex items-center gap-3">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    className="flex-1 px-5 py-3 bg-surface-50 border border-surface-200 rounded-full text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-200 focus:bg-white transition-all"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sending}
                    className="w-11 h-11 bg-primary-600 text-white rounded-full flex items-center justify-center hover:bg-primary-700 transition-colors active:scale-95 disabled:opacity-50 shadow-[0_4px_12px_rgba(37,99,235,0.3)]"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="w-20 h-20 rounded-[28px] bg-surface-100 flex items-center justify-center mb-4">
                  <MessageSquare className="w-10 h-10 text-surface-300" />
                </div>
                <h3 className="text-lg font-bold text-surface-700 font-display">Select a Conversation</h3>
                <p className="text-sm text-surface-500 mt-1 max-w-[280px]">Choose from your existing conversations or start a new chat</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Chat Modal */}
      {showNewChat && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowNewChat(false)}>
          <div className="glass-modal w-full max-w-md p-6 animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold font-display">New Conversation</h2>
              <button onClick={() => setShowNewChat(false)} className="p-1.5 hover:bg-surface-100 rounded-lg">
                <Plus className="w-5 h-5 text-surface-500 rotate-45" />
              </button>
            </div>

            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input
                  placeholder="Search by name..."
                  value={searchUsers}
                  onChange={e => setSearchUsers(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchForUsers()}
                  className="w-full pl-10 pr-4 py-2.5 bg-surface-50 rounded-xl text-sm border border-surface-200 focus:outline-none focus:ring-2 focus:ring-primary-200"
                />
              </div>
              <button onClick={searchForUsers} className="btn-primary py-2 px-4 text-sm">
                {searchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
              </button>
            </div>

            <div className="max-h-[300px] overflow-y-auto no-scrollbar space-y-1">
              {allUsers.length === 0 && !searchLoading && (
                <p className="text-sm text-surface-500 text-center py-6">Search for users to start chatting</p>
              )}
              {allUsers.map(user => (
                <button
                  key={user.uid}
                  onClick={() => startConversation(user)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-surface-50 rounded-xl transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full gradient-bg flex items-center justify-center text-white font-bold text-sm overflow-hidden shrink-0">
                    {user.profilePhoto
                      ? <img src={user.profilePhoto} alt="" className="w-full h-full object-cover" />
                      : initials(user.name)}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-surface-900">{user.name}</p>
                    <p className="text-xs text-surface-500 capitalize">{user.role || 'Teacher'}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
