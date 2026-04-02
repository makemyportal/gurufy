import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../utils/firebase'
import {
  collection, addDoc, onSnapshot, query, orderBy,
  updateDoc, doc, arrayUnion, arrayRemove, serverTimestamp, where
} from 'firebase/firestore'
import {
  Users, MessageSquare, Plus, Search, Loader2, X,
  Globe, Lock, Hash, TrendingUp, BookOpen, Send
} from 'lucide-react'

export default function Groups() {
  const { currentUser, userProfile } = useAuth()
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [discussions, setDiscussions] = useState([])
  const [newDiscussion, setNewDiscussion] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [form, setForm] = useState({ name: '', description: '', category: 'General' })

  const CATEGORIES = ['General', 'CBSE / State Boards', 'NEET / JEE Prep', 'UPSC / Civil Services', 'Primary Education', 'Languages', 'EdTech Innovators', 'Special Education']

  useEffect(() => {
    const q = query(collection(db, 'groups'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, snap => {
      setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }, () => setLoading(false))
    return () => unsub()
  }, [])

  // Load discussions when a group is selected
  useEffect(() => {
    if (!selectedGroup) { setDiscussions([]); return }
    const q = query(
      collection(db, 'groups', selectedGroup.id, 'discussions'),
      orderBy('createdAt', 'desc')
    )
    const unsub = onSnapshot(q, snap => {
      setDiscussions(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return () => unsub()
  }, [selectedGroup])

  async function handleCreate(e) {
    e.preventDefault()
    if (!currentUser) return
    setCreating(true)
    try {
      await addDoc(collection(db, 'groups'), {
        name: form.name,
        description: form.description,
        category: form.category,
        creatorId: currentUser.uid,
        creatorName: userProfile?.name || currentUser.email,
        members: [currentUser.uid],
        membersCount: 1,
        createdAt: serverTimestamp(),
      })
      setShowCreate(false)
      setForm({ name: '', description: '', category: 'General' })
    } catch (err) {
      console.error('Create group error:', err)
      alert('Failed to create group.')
    }
    setCreating(false)
  }

  async function toggleJoin(group) {
    if (!currentUser) return
    const ref = doc(db, 'groups', group.id)
    const isMember = (group.members || []).includes(currentUser.uid)
    try {
      if (isMember) {
        await updateDoc(ref, {
          members: arrayRemove(currentUser.uid),
          membersCount: Math.max(0, (group.membersCount || 1) - 1)
        })
      } else {
        await updateDoc(ref, {
          members: arrayUnion(currentUser.uid),
          membersCount: (group.membersCount || 0) + 1
        })
      }
    } catch (err) {
      console.error('Join error:', err)
    }
  }

  async function postDiscussion(e) {
    e.preventDefault()
    if (!newDiscussion.trim() || !selectedGroup || !currentUser) return
    try {
      await addDoc(collection(db, 'groups', selectedGroup.id, 'discussions'), {
        text: newDiscussion.trim(),
        authorId: currentUser.uid,
        authorName: userProfile?.name || currentUser.email,
        authorPhoto: userProfile?.profilePhoto || '',
        createdAt: serverTimestamp(),
      })
      setNewDiscussion('')
    } catch (err) {
      console.error('Discussion post error:', err)
    }
  }

  const filteredGroups = groups.filter(g =>
    g.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.category?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const initials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'G'
  const timeAgo = (ts) => {
    if (!ts) return ''
    try {
      const s = Math.floor((Date.now() - ts.toDate().getTime()) / 1000)
      if (s < 3600) return `${Math.floor(s / 60)}m ago`
      if (s < 86400) return `${Math.floor(s / 3600)}h ago`
      return `${Math.floor(s / 86400)}d ago`
    } catch { return '' }
  }

  const CATEGORY_COLORS = {
    General: 'from-blue-500 to-indigo-600',
    'CBSE / State Boards': 'from-emerald-500 to-teal-600',
    'NEET / JEE Prep': 'from-red-500 to-pink-600',
    'UPSC / Civil Services': 'from-amber-500 to-orange-600',
    'Primary Education': 'from-pink-500 to-rose-600',
    Languages: 'from-amber-500 to-orange-600',
    'EdTech Innovators': 'from-violet-500 to-purple-600',
    'Special Education': 'from-cyan-500 to-blue-600',
  }

  // Group Detail View
  if (selectedGroup) {
    const isMember = currentUser && (selectedGroup.members || []).includes(currentUser.uid)
    return (
      <div className="max-w-4xl mx-auto animate-fade-in">
        <button onClick={() => setSelectedGroup(null)} className="flex items-center gap-2 text-surface-500 hover:text-surface-800 text-sm font-semibold mb-4 transition-colors">
          ← Back to Groups
        </button>

        <div className="glass-card-solid overflow-hidden mb-6">
          <div className={`h-28 bg-gradient-to-r ${CATEGORY_COLORS[selectedGroup.category] || CATEGORY_COLORS.General} relative`}>
            <div className="absolute inset-0 bg-black/10" />
            <div className="absolute bottom-4 left-6 text-white">
              <h1 className="text-2xl font-bold font-display">{selectedGroup.name}</h1>
              <p className="text-white/80 text-sm">{selectedGroup.category} · {selectedGroup.membersCount || 0} members</p>
            </div>
          </div>
          <div className="p-5 flex items-center justify-between">
            <p className="text-sm text-surface-600">{selectedGroup.description}</p>
            <button
              onClick={() => toggleJoin(selectedGroup)}
              className={`py-2 px-5 rounded-xl text-sm font-bold transition-all ${
                isMember ? 'bg-surface-100 text-surface-700 hover:bg-red-50 hover:text-red-600' : 'btn-primary'
              }`}
            >
              {isMember ? 'Leave Group' : 'Join Group'}
            </button>
          </div>
        </div>

        {/* Discussion Posting */}
        {isMember && (
          <form onSubmit={postDiscussion} className="glass-card-solid p-5 mb-6">
            <textarea
              value={newDiscussion}
              onChange={e => setNewDiscussion(e.target.value)}
              placeholder="Start a discussion..."
              className="w-full resize-none bg-surface-50 rounded-xl p-3 text-sm border border-surface-200 focus:outline-none focus:ring-2 focus:ring-primary-300 min-h-[80px] transition-all"
            />
            <div className="flex justify-end mt-3">
              <button type="submit" disabled={!newDiscussion.trim()} className="btn-primary py-2 px-5 text-sm flex items-center gap-2">
                <Send className="w-4 h-4" /> Post
              </button>
            </div>
          </form>
        )}

        {/* Discussions */}
        <div className="space-y-4">
          {discussions.length === 0 && (
            <div className="glass-card-solid p-8 text-center">
              <MessageSquare className="w-10 h-10 text-surface-300 mx-auto mb-2" />
              <p className="text-sm text-surface-500">No discussions yet. Be the first to post!</p>
            </div>
          )}
          {discussions.map(d => (
            <div key={d.id} className="glass-card-solid p-5 animate-fade-in">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-full gradient-bg flex items-center justify-center text-white font-bold text-xs overflow-hidden">
                  {d.authorPhoto
                    ? <img src={d.authorPhoto} alt="" className="w-full h-full object-cover" />
                    : initials(d.authorName)}
                </div>
                <div>
                  <p className="text-sm font-bold text-surface-900">{d.authorName}</p>
                  <p className="text-xs text-surface-400">{timeAgo(d.createdAt)}</p>
                </div>
              </div>
              <p className="text-sm text-surface-700 leading-relaxed">{d.text}</p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="section-title">Subject Communities</h1>
          <p className="text-surface-500 text-sm mt-1">Join specific subject groups to discuss notes, syllabus, and strategies</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary py-2.5 px-5 text-sm flex items-center gap-2">
          <Plus className="w-4 h-4" /> Create Group
        </button>
      </div>

      {/* Search */}
      <div className="glass-card-solid p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
          <input
            type="text"
            placeholder="Search groups by name or category..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="input-field pl-12"
          />
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
        </div>
      )}

      {!loading && filteredGroups.length === 0 && (
        <div className="glass-card-solid p-12 text-center">
          <Users className="w-12 h-12 text-surface-300 mx-auto mb-3" />
          <h3 className="font-semibold text-surface-700 mb-1">No groups found</h3>
          <p className="text-sm text-surface-500">Create a group to start building your community!</p>
        </div>
      )}

      {/* Groups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredGroups.map((group, idx) => {
          const isMember = currentUser && (group.members || []).includes(currentUser.uid)
          const colorClass = CATEGORY_COLORS[group.category] || CATEGORY_COLORS.General
          return (
            <div key={group.id} className="glass-card-solid overflow-hidden card-hover animate-slide-up cursor-pointer" style={{ animationDelay: `${idx * 0.04}s` }}>
              <div className={`h-2 bg-gradient-to-r ${colorClass}`} />
              <div className="p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${colorClass} flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-sm`}>
                    {group.name?.[0] || 'G'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-surface-900 truncate">{group.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-surface-500 mt-0.5">
                      <span className="badge bg-surface-100 text-surface-600 text-[10px]">{group.category}</span>
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />{group.membersCount || 0}</span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-surface-600 line-clamp-2 mb-4">{group.description || 'A community for educators.'}</p>

                <div className="flex gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleJoin(group) }}
                    className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
                      isMember ? 'bg-primary-50 text-primary-700 border border-primary-200' : 'bg-primary-600 text-white hover:bg-primary-700'
                    }`}
                  >
                    {isMember ? 'Joined ✓' : 'Join'}
                  </button>
                  <button
                    onClick={() => setSelectedGroup(group)}
                    className="px-4 py-2 bg-surface-100 hover:bg-surface-200 rounded-xl text-sm font-bold text-surface-700 transition-colors"
                  >
                    View
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Create Group Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowCreate(false)}>
          <div className="glass-modal w-full max-w-md p-6 animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold font-display">Create Group</h2>
              <button onClick={() => setShowCreate(false)} className="p-1.5 hover:bg-surface-100 rounded-lg">
                <X className="w-5 h-5 text-surface-500" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <input required placeholder="Group Name *" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="input-field" />
              <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="input-field">
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
              <textarea placeholder="Describe your group..." value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="input-field min-h-[80px] resize-none" />
              <button type="submit" disabled={creating} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
                {creating ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : <><Plus className="w-4 h-4" /> Create Group</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
