import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { db } from '../utils/firebase'
import {
  collection, addDoc, onSnapshot, query, orderBy,
  updateDoc, doc, arrayUnion, arrayRemove, serverTimestamp,
  deleteDoc, getDocs
} from 'firebase/firestore'
import { uploadToCloudinary } from '../utils/cloudinary'
import {
  Heart, MessageCircle, Share2, Download,
  FileText, Send, MoreHorizontal, Loader2, X,
  ImagePlus, Sparkles, BookOpen, Trash2, PenLine,
  TrendingUp, Users, Zap, ChevronRight, Award
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { createNotification } from '../utils/notificationHelpers'
import { useGamification } from '../contexts/GamificationContext'
import { XP_VALUES } from '../contexts/GamificationContext'

const TAGS = ['#STEM', '#EdTech', '#NEP2020', '#ClassroomManagement', '#LessonIdeas', '#AIinEd']
const QUICK_ACTIONS = [
  { icon: Sparkles, label: 'AI Tools', sub: 'Generate content', route: '/ai-tools', from: 'from-violet-500', to: 'to-fuchsia-600' },
  { icon: BookOpen, label: 'Library', sub: 'Browse resources', route: '/resources', from: 'from-sky-500', to: 'to-blue-600' },
  { icon: Award, label: 'Leaderboard', sub: 'Top educators', route: '/leaderboard', from: 'from-amber-400', to: 'to-orange-500' },
]

// ─── Outside component for stable ref ───
function CommentInput({ postId, value, onChange, onSubmit }) {
  return (
    <input
      type="text"
      placeholder="Add a comment..."
      value={value}
      onChange={onChange}
      onKeyDown={e => e.key === 'Enter' && onSubmit(postId)}
      className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all"
    />
  )
}

export default function Feed() {
  const navigate = useNavigate()
  const { currentUser, userProfile } = useAuth()
  const { awardXP } = useGamification()
  const { t } = useLanguage()

  const [posts, setPosts] = useState([])
  const [newPost, setNewPost] = useState('')
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [showComments, setShowComments] = useState({})
  const [commentText, setCommentText] = useState({})
  const [comments, setComments] = useState({})
  const [loadingComments, setLoadingComments] = useState({})
  const [selectedFile, setSelectedFile] = useState(null)
  const [filePreview, setFilePreview] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)
  const [composerFocused, setComposerFocused] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, snap => {
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }, () => setLoading(false))
    return () => unsub()
  }, [])

  function loadComments(postId) {
    if (comments[postId]) return
    setLoadingComments(p => ({ ...p, [postId]: true }))
    const q = query(collection(db, 'posts', postId, 'comments'), orderBy('createdAt', 'asc'))
    onSnapshot(q, snap => {
      setComments(p => ({ ...p, [postId]: snap.docs.map(d => ({ id: d.id, ...d.data() })) }))
      setLoadingComments(p => ({ ...p, [postId]: false }))
    })
  }

  function handleFileSelect(e) {
    const file = e.target.files[0]
    if (!file) return
    setSelectedFile(file)
    if (file.type.startsWith('image/')) {
      setFilePreview({ type: 'image', url: URL.createObjectURL(file), name: file.name })
    } else {
      setFilePreview({ type: 'file', name: file.name, ext: file.name.split('.').pop().toUpperCase() })
    }
  }

  function clearFile() {
    setSelectedFile(null); setFilePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleCreatePost(e) {
    e.preventDefault()
    if (!newPost.trim() && !selectedFile) return
    setPosting(true)
    try {
      let attachmentUrl = null, attachmentType = null, attachmentName = null
      if (selectedFile) {
        const r = await uploadToCloudinary(selectedFile)
        attachmentUrl = r.url
        attachmentName = r.originalFilename || selectedFile.name
        attachmentType = selectedFile.type.startsWith('image/') ? 'image' : r.format || 'FILE'
      }
      await addDoc(collection(db, 'posts'), {
        content: newPost.trim(),
        authorId: currentUser.uid,
        authorName: userProfile?.name || currentUser.email,
        authorRole: userProfile?.subject ? `${userProfile.subject} Teacher` : userProfile?.role === 'school' ? 'School' : 'Teacher',
        authorPhoto: userProfile?.profilePhoto || '',
        attachmentUrl, attachmentType, attachmentName,
        likes: [], commentsCount: 0,
        createdAt: serverTimestamp(),
      })
      setNewPost(''); clearFile(); setComposerFocused(false)
      awardXP(XP_VALUES.create_post, 'create_post', (data, badges) => {
        if (!badges.includes('first_post')) return 'first_post'
        if ((data.totalPosts || 0) >= 9 && !badges.includes('ten_posts')) return 'ten_posts'
        return null
      })
    } catch { alert('Failed to create post.') } finally { setPosting(false) }
  }

  async function toggleLike(post) {
    if (!currentUser) return navigate('/login')
    const ref = doc(db, 'posts', post.id)
    const liked = (post.likes || []).includes(currentUser.uid)
    await updateDoc(ref, { likes: liked ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid) })
    if (!liked && post.authorId !== currentUser.uid) {
      createNotification(post.authorId, { type: 'like', title: `${userProfile?.name || 'Someone'} liked your post`, fromUserId: currentUser.uid, fromUserName: userProfile?.name || '', relatedId: post.id })
    }
  }

  async function handleComment(postId) {
    if (!currentUser) return navigate('/login')
    const text = commentText[postId]?.trim()
    if (!text) return
    try {
      await addDoc(collection(db, 'posts', postId, 'comments'), {
        text, authorId: currentUser.uid,
        authorName: userProfile?.name || currentUser.email,
        authorPhoto: userProfile?.profilePhoto || '',
        createdAt: serverTimestamp(),
      })
      const post = posts.find(p => p.id === postId)
      await updateDoc(doc(db, 'posts', postId), { commentsCount: (post?.commentsCount || 0) + 1 })
      if (post && post.authorId !== currentUser.uid) {
        createNotification(post.authorId, { type: 'comment', title: `${userProfile?.name || 'Someone'} commented`, fromUserId: currentUser.uid, fromUserName: userProfile?.name || '', relatedId: postId })
      }
      setCommentText(p => ({ ...p, [postId]: '' }))
      awardXP(XP_VALUES.leave_comment, 'leave_comment', (data, badges) => {
        if ((data.totalComments || 0) >= 19 && !badges.includes('commenter')) return 'commenter'
        return null
      })
    } catch (err) { console.error(err) }
  }

  async function handleDeletePost(postId) {
    setDeletingId(postId)
    try {
      const snap = await getDocs(collection(db, 'posts', postId, 'comments'))
      await Promise.all(snap.docs.map(d => deleteDoc(d.ref)))
      await deleteDoc(doc(db, 'posts', postId))
    } catch { alert('Failed to delete.') } finally { setDeletingId(null); setShowDeleteConfirm(null) }
  }

  function toggleComments(postId) {
    setShowComments(p => ({ ...p, [postId]: !p[postId] }))
    if (!showComments[postId]) loadComments(postId)
  }

  const initials = n => n ? n.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : 'U'
  const timeAgo = ts => {
    if (!ts) return 'Just now'
    try {
      const s = Math.floor((Date.now() - ts.toDate().getTime()) / 1000)
      if (s < 60) return 'Just now'
      if (s < 3600) return `${Math.floor(s / 60)}m ago`
      if (s < 86400) return `${Math.floor(s / 3600)}h ago`
      return `${Math.floor(s / 86400)}d ago`
    } catch { return 'Just now' }
  }

  const totalLikes = posts.reduce((a, p) => a + (p.likes?.length || 0), 0)

  return (
    <div className="max-w-[1200px] mx-auto px-0 animate-fade-in pb-16">

      {/* ─── HERO BANNER ─── */}
      <div className="relative overflow-hidden rounded-[28px] mb-8 mt-1 bg-[#0f0f14] min-h-[180px] flex items-center px-8 sm:px-12">
        {/* Grid */}
        <div className="absolute inset-0 opacity-[0.05]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)', backgroundSize: '32px 32px' }} />
        {/* Glows */}
        <div className="absolute top-[-40%] left-[-5%] w-64 h-64 bg-indigo-600/30 rounded-full blur-[80px]" />
        <div className="absolute bottom-[-40%] right-[10%] w-80 h-80 bg-violet-600/20 rounded-full blur-[80px]" />
        <div className="absolute top-[-20%] right-[30%] w-48 h-48 bg-cyan-500/15 rounded-full blur-[60px]" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between w-full gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-300 text-[11px] font-bold uppercase tracking-widest">{t('communityFeed')}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight mb-1">
              {currentUser
                ? <>{t('welcomeBack')}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">{userProfile?.name?.split(' ')[0] || 'Teacher'}</span> 👋</>
                : <>{t('welcomeTo')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">Gurufy</span> 👋</>
              }
            </h1>
            <p className="text-slate-400 text-sm font-medium">India's professional knowledge network for educators.</p>
          </div>

          {/* Mini Stats */}
          <div className="flex gap-3 shrink-0">
            <div className="text-center px-5 py-3 bg-white/5 border border-white/10 rounded-2xl">
              <p className="text-xl font-extrabold text-white">{posts.length}</p>
              <p className="text-slate-500 text-[11px] font-bold uppercase tracking-wider mt-0.5">Posts</p>
            </div>
            <div className="text-center px-5 py-3 bg-white/5 border border-white/10 rounded-2xl">
              <p className="text-xl font-extrabold text-white">{totalLikes}</p>
              <p className="text-slate-500 text-[11px] font-bold uppercase tracking-wider mt-0.5">Likes</p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── QUICK ACTION TILES ─── */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {QUICK_ACTIONS.map(({ icon: Icon, label, sub, route, from, to }) => (
          <button key={route} onClick={() => navigate(route)}
            className={`relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-gradient-to-br ${from} ${to} rounded-2xl text-white hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-300 group`}>
            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-5 transition-opacity" />
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Icon className="w-4 h-4" />
            </div>
            <div className="text-left">
              <p className="font-extrabold text-sm leading-tight">{label}</p>
              <p className="text-white/70 text-[11px] font-medium hidden sm:block">{sub}</p>
            </div>
          </button>
        ))}
      </div>

      {/* ─── MAIN LAYOUT ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">

        {/* ─── LEFT: FEED ─── */}
        <div className="space-y-5 min-w-0">

          {/* COMPOSER */}
          {currentUser ? (
            <div className={`bg-white border rounded-2xl shadow-sm transition-all duration-300 ${composerFocused ? 'border-indigo-300 shadow-[0_0_0_4px_rgba(99,102,241,0.08)]' : 'border-slate-200'}`}>
              <form onSubmit={handleCreatePost}>
                <div className="flex gap-3 p-4 pb-0">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm shrink-0 overflow-hidden">
                    {userProfile?.profilePhoto
                      ? <img src={userProfile.profilePhoto} alt="" className="w-full h-full object-cover" />
                      : initials(userProfile?.name || currentUser?.email)}
                  </div>
                  <textarea
                    value={newPost}
                    onChange={e => setNewPost(e.target.value)}
                    onFocus={() => setComposerFocused(true)}
                    onBlur={() => setComposerFocused(false)}
                    placeholder={t('sharePlaceholder')}
                    rows={composerFocused || newPost ? 3 : 1}
                    className="flex-1 resize-none text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none leading-relaxed pt-2 transition-all duration-300"
                  />
                </div>

                {filePreview && (
                  <div className="mx-4 mt-3 bg-slate-50 rounded-xl p-3 flex items-center gap-3 border border-slate-200">
                    {filePreview.type === 'image'
                      ? <img src={filePreview.url} alt="" className="w-14 h-14 rounded-lg object-cover" />
                      : <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-700 font-bold text-xs">{filePreview.ext}</div>}
                    <p className="text-sm text-slate-700 font-medium flex-1 truncate">{filePreview.name}</p>
                    <button type="button" onClick={clearFile} className="p-1 hover:bg-slate-200 rounded-lg"><X className="w-4 h-4 text-slate-400" /></button>
                  </div>
                )}

                <div className="flex items-center justify-between px-4 py-3 mt-2 border-t border-slate-100">
                  <div>
                    <input ref={fileInputRef} type="file" accept="image/*,application/pdf,.doc,.docx,.ppt,.pptx" onChange={handleFileSelect} className="hidden" id="feed-file" />
                    <label htmlFor="feed-file" className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer transition-colors">
                      <ImagePlus className="w-4 h-4" /> {t('attach')}
                    </label>
                  </div>
                  <button type="submit" disabled={posting || (!newPost.trim() && !selectedFile)}
                    className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-bold rounded-xl transition-all active:scale-[0.97] shadow-sm shadow-indigo-200">
                    {posting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PenLine className="w-3.5 h-3.5" />}
                    {posting ? t('publishing') : t('publish')}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* Guest CTA */
            <div className="relative overflow-hidden bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
              <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-50 rounded-full -mr-16 -mt-16 opacity-60" />
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center mx-auto mb-4">
                  <PenLine className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-lg mb-1">{t('joinNetwork')}</h3>
                <p className="text-slate-500 text-sm font-medium mb-5 max-w-xs mx-auto">{t('joinDesc')}</p>
                <button onClick={() => navigate('/login')}
                  className="inline-flex items-center gap-2 px-7 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-indigo-100 hover:shadow-indigo-200 hover:-translate-y-0.5">
                  {t('signInContribute')} <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ─── POSTS SECTION HEADER ─── */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-500" />
              <span className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">{t('latestCommunity')}</span>
            </div>
            <span className="text-xs font-bold text-slate-400">{posts.length} {t('insights')}</span>
          </div>

          {/* Skeleton */}
          {loading && (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white border border-slate-100 rounded-2xl p-5 animate-pulse">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-slate-100" />
                    <div className="space-y-2 flex-1"><div className="h-3.5 bg-slate-100 rounded-full w-32" /><div className="h-3 bg-slate-100 rounded-full w-24" /></div>
                  </div>
                  <div className="space-y-2"><div className="h-3 bg-slate-100 rounded-full w-full" /><div className="h-3 bg-slate-100 rounded-full w-5/6" /></div>
                </div>
              ))}
            </div>
          )}

          {/* Empty */}
          {!loading && posts.length === 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-7 h-7 text-slate-300" />
              </div>
              <h3 className="font-extrabold text-slate-700 mb-1">{t('noPosts')}</h3>
              <p className="text-sm text-slate-400 font-medium">{t('beFirst')}</p>
            </div>
          )}

          {/* ─── POST CARDS ─── */}
          {posts.map((post, idx) => {
            const liked = currentUser && (post.likes || []).includes(currentUser.uid)
            const isOwner = currentUser && post.authorId === currentUser.uid
            const postComments = comments[post.id] || []
            return (
              <article key={post.id}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-slate-300 hover:shadow-md transition-all duration-300 animate-fade-in"
                style={{ animationDelay: `${idx * 0.04}s` }}>

                {/* Header */}
                <div className="flex items-start justify-between p-5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm overflow-hidden shrink-0">
                      {post.authorPhoto ? <img src={post.authorPhoto} alt="" className="w-full h-full object-cover" /> : initials(post.authorName)}
                    </div>
                    <div>
                      <p className="font-extrabold text-slate-900 text-sm leading-tight">{post.authorName}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{post.authorRole || 'Educator'}</span>
                        <span className="text-slate-300">·</span>
                        <span className="text-xs text-slate-400 font-medium">{timeAgo(post.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  {isOwner && (
                    <div className="relative">
                      <button onClick={() => setShowDeleteConfirm(showDeleteConfirm === post.id ? null : post.id)}
                        className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                        <MoreHorizontal className="w-4 h-4 text-slate-400" />
                      </button>
                      {showDeleteConfirm === post.id && (
                        <div className="absolute top-full right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-20 w-40">
                          <button onClick={() => handleDeletePost(post.id)} disabled={deletingId === post.id}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors">
                            {deletingId === post.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="px-5 pb-4">
                  {post.content && (
                    <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-line mb-4 font-medium">{post.content}</p>
                  )}

                  {post.attachmentType === 'image' && post.attachmentUrl && (
                    <img src={post.attachmentUrl} alt="post" className="w-full rounded-xl max-h-[420px] object-cover mb-4" />
                  )}

                  {post.attachmentType && post.attachmentType !== 'image' && post.attachmentUrl && (
                    <div className="flex items-center gap-3 p-3.5 bg-indigo-50 rounded-xl border border-indigo-100 mb-4">
                      <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{post.attachmentName || 'Document'}</p>
                        <p className="text-xs text-indigo-500 font-semibold">{post.attachmentType} file</p>
                      </div>
                      <a href={post.attachmentUrl} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors shrink-0">
                        <Download className="w-3.5 h-3.5" /> Download
                      </a>
                    </div>
                  )}

                  {/* Meta row */}
                  <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-3">
                    <span>{(post.likes || []).length} likes</span>
                    <span>{post.commentsCount || 0} comments</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-0 border-t border-slate-100 px-2">
                  <button onClick={() => toggleLike(post)}
                    className={`flex items-center gap-2 flex-1 justify-center py-3 text-sm font-semibold transition-all rounded-b-none rounded-t-none hover:bg-slate-50 ${liked ? 'text-rose-500' : 'text-slate-500 hover:text-rose-400'}`}>
                    <Heart className={`w-4 h-4 transition-transform ${liked ? 'fill-rose-500 scale-110' : ''}`} />
                    {liked ? t('liked') : t('like')}
                  </button>
                  <div className="w-px h-6 bg-slate-100" />
                  <button onClick={() => toggleComments(post.id)}
                    className={`flex items-center gap-2 flex-1 justify-center py-3 text-sm font-semibold hover:bg-slate-50 transition-colors ${showComments[post.id] ? 'text-indigo-600' : 'text-slate-500 hover:text-indigo-500'}`}>
                    <MessageCircle className="w-4 h-4" /> {t('discuss')}
                  </button>
                  <div className="w-px h-6 bg-slate-100" />
                  <button onClick={() => navigator.share?.({ text: post.content, url: window.location.href })}
                    className="flex items-center gap-2 flex-1 justify-center py-3 text-sm font-semibold text-slate-500 hover:text-indigo-500 hover:bg-slate-50 transition-colors">
                    <Share2 className="w-4 h-4" /> {t('share')}
                  </button>
                </div>

                {/* Comments */}
                {showComments[post.id] && (
                  <div className="border-t border-slate-100 p-4 space-y-3 animate-fade-in bg-slate-50/50">
                    {loadingComments[post.id] && <div className="flex justify-center py-2"><Loader2 className="w-4 h-4 animate-spin text-indigo-400" /></div>}
                    {postComments.map(c => (
                      <div key={c.id} className="flex gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-[10px] shrink-0 overflow-hidden">
                          {c.authorPhoto ? <img src={c.authorPhoto} alt="" className="w-full h-full object-cover" /> : initials(c.authorName || '')}
                        </div>
                        <div className="flex-1 bg-white rounded-xl px-3.5 py-2.5 border border-slate-200">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-xs font-extrabold text-slate-800">{c.authorName}</span>
                            <span className="text-[10px] text-slate-400">{timeAgo(c.createdAt)}</span>
                          </div>
                          <p className="text-sm text-slate-600 font-medium">{c.text}</p>
                        </div>
                      </div>
                    ))}
                    <div className="flex gap-2 pt-1">
                      <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-[10px] shrink-0 overflow-hidden">
                        {userProfile?.profilePhoto ? <img src={userProfile.profilePhoto} alt="" className="w-full h-full object-cover" /> : initials(userProfile?.name || '')}
                      </div>
                      <CommentInput
                        postId={post.id}
                        value={commentText[post.id] || ''}
                        onChange={e => setCommentText(p => ({ ...p, [post.id]: e.target.value }))}
                        onSubmit={handleComment}
                      />
                      <button onClick={() => handleComment(post.id)} disabled={!commentText[post.id]?.trim()}
                        className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors disabled:opacity-40 shrink-0">
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </article>
            )
          })}
        </div>

        {/* ─── RIGHT SIDEBAR ─── */}
        <div className="hidden lg:block space-y-5">
          <div className="sticky top-[90px] space-y-5">

            {/* Stats Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mb-4">Platform Activity</p>
              <div className="space-y-3">
                {[
                  { icon: FileText, label: 'Knowledge Posts', val: posts.length, color: 'text-indigo-500 bg-indigo-50' },
                  { icon: Heart, label: 'Total Likes', val: totalLikes, color: 'text-rose-500 bg-rose-50' },
                  { icon: Users, label: 'Contributors', val: [...new Set(posts.map(p => p.authorId))].length, color: 'text-emerald-500 bg-emerald-50' },
                ].map(({ icon: Icon, label, val, color }) => (
                  <div key={label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${color}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-sm font-semibold text-slate-600">{label}</span>
                    </div>
                    <span className="text-sm font-extrabold text-slate-900">{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mb-4">Trending Topics</p>
              <div className="flex flex-wrap gap-2">
                {TAGS.map(tag => (
                  <span key={tag} className="px-3 py-1.5 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 cursor-pointer rounded-xl text-xs font-bold text-slate-600 transition-colors border border-slate-200">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Explore CTA */}
            <div className="relative overflow-hidden bg-[#0f0f14] rounded-2xl p-5">
              <div className="absolute top-[-30%] right-[-20%] w-32 h-32 bg-indigo-600/30 rounded-full blur-[50px]" />
              <div className="relative z-10">
                <Zap className="w-6 h-6 text-indigo-400 mb-3" />
                <p className="text-white font-extrabold text-sm mb-1">Supercharge your teaching</p>
                <p className="text-slate-400 text-xs font-medium mb-4 leading-relaxed">Use AI tools to generate lesson plans, worksheets & quizzes in seconds.</p>
                <button onClick={() => navigate('/ai-tools')}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2">
                  <Sparkles className="w-3.5 h-3.5" /> Try AI Tools
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
