import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../utils/firebase'
import {
  collection, addDoc, onSnapshot, query, orderBy,
  updateDoc, doc, arrayUnion, arrayRemove, serverTimestamp,
  deleteDoc, getDocs, limit
} from 'firebase/firestore'
import { uploadToCloudinary } from '../utils/cloudinary'
import {
  Heart, MessageCircle, Share2, Bookmark, Download, Image,
  FileText, Send, MoreHorizontal, ThumbsUp, Loader2, X, ImagePlus, Sparkles, BookOpen, Trash2
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { createNotification } from '../utils/notificationHelpers'
import { useGamification } from '../contexts/GamificationContext'
import { XP_VALUES } from '../contexts/GamificationContext'

export default function Feed() {
  const navigate = useNavigate()
  const { currentUser, userProfile } = useAuth()
  const { awardXP } = useGamification()
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
  const fileInputRef = useRef(null)

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setPosts(data)
      setLoading(false)
    }, (err) => {
      console.error('Feed load error:', err)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  // Load comments for a post when expanded
  function loadComments(postId) {
    if (comments[postId]) return
    setLoadingComments(prev => ({ ...prev, [postId]: true }))
    const q = query(collection(db, 'posts', postId, 'comments'), orderBy('createdAt', 'asc'))
    const unsub = onSnapshot(q, snap => {
      setComments(prev => ({ ...prev, [postId]: snap.docs.map(d => ({ id: d.id, ...d.data() })) }))
      setLoadingComments(prev => ({ ...prev, [postId]: false }))
    })
    return unsub
  }

  function handleFileSelect(e) {
    const file = e.target.files[0]
    if (!file) return
    setSelectedFile(file)
    if (file.type.startsWith('image/')) {
      setFilePreview({ type: 'image', url: URL.createObjectURL(file), name: file.name })
    } else {
      const ext = file.name.split('.').pop().toUpperCase()
      setFilePreview({ type: 'file', name: file.name, ext })
    }
  }

  function clearFile() {
    setSelectedFile(null)
    setFilePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleCreatePost(e) {
    e.preventDefault()
    if (!newPost.trim() && !selectedFile) return
    setPosting(true)

    try {
      let attachmentUrl = null
      let attachmentType = null
      let attachmentName = null

      if (selectedFile) {
        const result = await uploadToCloudinary(selectedFile)
        attachmentUrl = result.url
        attachmentName = result.originalFilename || selectedFile.name
        attachmentType = selectedFile.type.startsWith('image/') ? 'image' : result.format || 'FILE'
      }

      await addDoc(collection(db, 'posts'), {
        content: newPost.trim(),
        authorId: currentUser.uid,
        authorName: userProfile?.name || currentUser.email,
        authorRole: userProfile?.subject
          ? `${userProfile.subject} Teacher`
          : userProfile?.role === 'school' ? 'School' : 'Teacher',
        authorPhoto: userProfile?.profilePhoto || '',
        attachmentUrl,
        attachmentType,
        attachmentName,
        likes: [],
        commentsCount: 0,
        createdAt: serverTimestamp(),
      })

      setNewPost('')
      clearFile()
      // Award XP for creating a post
      awardXP(XP_VALUES.create_post, 'create_post', (data, badges) => {
        if (!badges.includes('first_post')) return 'first_post'
        if ((data.totalPosts || 0) >= 9 && !badges.includes('ten_posts')) return 'ten_posts'
        return null
      })
    } catch (err) {
      console.error('Post error:', err)
      alert('Failed to create post. Please try again.')
    } finally {
      setPosting(false)
    }
  }

  async function toggleLike(post) {
    if (!currentUser) return navigate('/login')
    const postRef = doc(db, 'posts', post.id)
    const likes = post.likes || []
    if (likes.includes(currentUser.uid)) {
      await updateDoc(postRef, { likes: arrayRemove(currentUser.uid) })
    } else {
      await updateDoc(postRef, { likes: arrayUnion(currentUser.uid) })
      // Send notification to post author
      if (post.authorId !== currentUser.uid) {
        createNotification(post.authorId, {
          type: 'like',
          title: `${userProfile?.name || 'Someone'} liked your post`,
          fromUserId: currentUser.uid,
          fromUserName: userProfile?.name || '',
          relatedId: post.id,
        })
      }
    }
  }

  async function handleComment(postId) {
    if (!currentUser) return navigate('/login')
    const text = commentText[postId]?.trim()
    if (!text) return

    try {
      await addDoc(collection(db, 'posts', postId, 'comments'), {
        text,
        authorId: currentUser.uid,
        authorName: userProfile?.name || currentUser.email,
        authorPhoto: userProfile?.profilePhoto || '',
        createdAt: serverTimestamp(),
      })
      const post = posts.find(p => p.id === postId)
      await updateDoc(doc(db, 'posts', postId), {
        commentsCount: (post?.commentsCount || 0) + 1
      })
      // Send notification to post author
      if (post && post.authorId !== currentUser.uid) {
        createNotification(post.authorId, {
          type: 'comment',
          title: `${userProfile?.name || 'Someone'} commented on your post`,
          fromUserId: currentUser.uid,
          fromUserName: userProfile?.name || '',
          relatedId: postId,
        })
      }
      setCommentText(prev => ({ ...prev, [postId]: '' }))
      // Award XP for commenting
      awardXP(XP_VALUES.leave_comment, 'leave_comment', (data, badges) => {
        if ((data.totalComments || 0) >= 19 && !badges.includes('commenter')) return 'commenter'
        return null
      })
    } catch (err) {
      console.error('Comment error:', err)
    }
  }

  async function handleDeletePost(postId) {
    setDeletingId(postId)
    try {
      // Delete comments subcollection
      const commentsSnap = await getDocs(collection(db, 'posts', postId, 'comments'))
      const deletePromises = commentsSnap.docs.map(d => deleteDoc(d.ref))
      await Promise.all(deletePromises)
      await deleteDoc(doc(db, 'posts', postId))
    } catch (err) {
      console.error('Delete error:', err)
      alert('Failed to delete post.')
    } finally {
      setDeletingId(null)
      setShowDeleteConfirm(null)
    }
  }

  function toggleComments(postId) {
    const newState = !showComments[postId]
    setShowComments(prev => ({ ...prev, [postId]: newState }))
    if (newState) loadComments(postId)
  }

  const initials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U'
  const timeAgo = (ts) => {
    if (!ts) return 'Just now'
    try {
      const seconds = Math.floor((Date.now() - ts.toDate().getTime()) / 1000)
      if (seconds < 60) return 'Just now'
      if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
      if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
      return `${Math.floor(seconds / 86400)}d ago`
    } catch { return 'Just now' }
  }

  return (
    <div className="max-w-6xl mx-auto animate-fade-in pb-10">

      {/* Bento Grid Header Space */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6 mt-4 lg:mt-0">
        
        {/* Welcome Box (Span 2) */}
        <div className="glass-card-solid p-6 md:col-span-2 lg:col-span-2 flex flex-col justify-between bg-gradient-to-br from-primary-500/10 to-accent-500/5 relative overflow-hidden group border-white/60">
          <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-primary-400/20 rounded-full blur-3xl group-hover:bg-primary-400/30 transition-all duration-700" />
          <div className="relative z-10">
            <h2 className="text-[26px] font-extrabold font-display tracking-tight text-surface-900 mb-1 leading-tight">
              {currentUser ? `Welcome back, ${userProfile?.name?.split(' ')[0] || 'Teacher'}` : 'Welcome to Gurufy'} <span className="inline-block hover:animate-bounce cursor-default">👋</span>
            </h2>
            <p className="text-surface-600 font-medium">Ready to inspire your students today?</p>
          </div>
          <div className="mt-8 flex gap-3 relative z-10">
            <div className="bg-white/80 backdrop-blur-md px-4 py-2.5 rounded-[20px] border border-white shadow-soft flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-sm font-bold tracking-wide text-surface-800">{posts.length} Community Posts</span>
            </div>
          </div>
        </div>

        {/* Fast Action: AI Tools */}
        <div onClick={() => navigate('/ai-tools')} className="glass-card-solid p-6 bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white cursor-pointer hover:shadow-[0_12px_40px_rgba(139,92,246,0.35)] hover:-translate-y-1 transition-all duration-500 relative overflow-hidden group border-none">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIi8+PC9zdmc+')] opacity-40 group-hover:opacity-60 transition-opacity" />
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all duration-500" />
          <div className="relative z-10 h-full flex flex-col justify-between">
            <div className="w-12 h-12 rounded-[20px] bg-white/20 backdrop-blur-xl flex items-center justify-center border border-white/20 mb-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] group-hover:scale-110 transition-transform duration-500">
               <Sparkles className="w-6 h-6 text-white drop-shadow-sm" />
            </div>
            <div>
              <h3 className="font-extrabold text-[19px] leading-tight mb-1 tracking-tight">AI Tools</h3>
              <p className="text-white/80 text-[13px] font-semibold tracking-wide">Generate Lesson Plans</p>
            </div>
          </div>
        </div>

        {/* Fast Action: Library */}
        <div onClick={() => navigate('/resources')} className="glass-card-solid p-6 bg-gradient-to-br from-emerald-400 to-teal-500 text-white cursor-pointer hover:shadow-[0_12px_40px_rgba(16,185,129,0.35)] hover:-translate-y-1 transition-all duration-500 relative overflow-hidden group border-none">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIi8+PC9zdmc+')] opacity-40 group-hover:opacity-60 transition-opacity" />
          <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all duration-500" />
          <div className="relative z-10 h-full flex flex-col justify-between">
            <div className="w-12 h-12 rounded-[20px] bg-white/20 backdrop-blur-xl flex items-center justify-center border border-white/20 mb-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] group-hover:scale-110 transition-transform duration-500">
               <BookOpen className="w-6 h-6 text-white drop-shadow-sm" />
            </div>
            <div>
              <h3 className="font-extrabold text-[19px] leading-tight mb-1 tracking-tight">Library</h3>
              <p className="text-white/80 text-[13px] font-semibold tracking-wide">Browse Resources</p>
            </div>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Main Feed Column */}
        <div className="lg:col-span-8 space-y-6">

          {/* Create Post */}
          {currentUser ? (
            <div className="glass-card-solid p-5">
              <form onSubmit={handleCreatePost}>
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full gradient-bg flex items-center justify-center text-white font-bold text-sm shrink-0 ring-2 ring-white shadow-sm overflow-hidden">
                    {userProfile?.profilePhoto
                      ? <img src={userProfile.profilePhoto} alt="" className="w-full h-full rounded-full object-cover" />
                      : initials(userProfile?.name || currentUser?.email)}
                  </div>
                  <textarea
                    value={newPost}
                    onChange={e => setNewPost(e.target.value)}
                    placeholder="Share a teaching tip, resource, or experience..."
                    className="flex-1 resize-none bg-surface-50 rounded-xl p-3 text-sm border border-surface-200 focus:outline-none focus:ring-2 focus:ring-primary-300 min-h-[80px] transition-all"
                  />
                </div>

                {filePreview && (
                  <div className="mt-3 relative bg-surface-50 rounded-xl p-3 flex items-center gap-3 border border-surface-200">
                    {filePreview.type === 'image'
                      ? <img src={filePreview.url} alt="preview" className="w-16 h-16 rounded-lg object-cover" />
                      : <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center text-primary-700 font-bold text-xs">{filePreview.ext}</div>
                    }
                    <p className="text-sm text-surface-700 font-medium flex-1 truncate">{filePreview.name}</p>
                    <button type="button" onClick={clearFile} className="p-1 hover:bg-surface-200 rounded-lg">
                      <X className="w-4 h-4 text-surface-500" />
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-surface-100">
                  <div className="flex gap-1">
                    <input ref={fileInputRef} type="file" accept="image/*,application/pdf,.doc,.docx,.ppt,.pptx" onChange={handleFileSelect} className="hidden" id="post-file" />
                    <label htmlFor="post-file" className="flex items-center gap-1.5 px-3 py-2 text-sm text-surface-600 hover:bg-surface-100 rounded-lg transition-colors cursor-pointer">
                      <ImagePlus className="w-4 h-4 text-emerald-500" /> Photo/File
                    </label>
                  </div>
                  <button
                    type="submit"
                    disabled={posting || (!newPost.trim() && !selectedFile)}
                    className="btn-primary py-2 px-5 text-sm flex items-center gap-2"
                  >
                    {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {posting ? 'Posting...' : 'Post'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="glass-card-solid p-8 text-center border-primary-100 bg-primary-50/40 mt-4 mb-6">
              <h3 className="font-extrabold text-xl font-display text-primary-900 mb-2">Join the Conversation!</h3>
              <p className="text-primary-700 text-sm font-medium mb-5 max-w-sm mx-auto leading-relaxed">Log in to create posts, share resources, interact with content, and connect with other top educators.</p>
              <button onClick={() => navigate('/login')} className="btn-primary py-3 px-8 rounded-full font-bold shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5 text-sm uppercase tracking-wide">
                Sign In to Participate
              </button>
            </div>
          )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-6">
          {[1,2,3].map(i => (
            <div key={i} className="glass-card-solid p-5 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-full skeleton-circle" />
                <div className="space-y-2 flex-1">
                  <div className="skeleton-text w-32" />
                  <div className="skeleton-text w-24 h-3" />
                </div>
              </div>
              <div className="space-y-2 mb-4">
                <div className="skeleton-text w-full" />
                <div className="skeleton-text w-3/4" />
              </div>
              <div className="skeleton h-8 w-full" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && posts.length === 0 && (
        <div className="glass-card-solid p-12 text-center">
          <MessageCircle className="w-12 h-12 text-surface-300 mx-auto mb-3" />
          <h3 className="font-semibold text-surface-700">No posts yet</h3>
          <p className="text-sm text-surface-500 mt-1">Be the first to share something with the community!</p>
        </div>
      )}

      {/* Posts */}
      {posts.map((post, idx) => {
        const liked = currentUser && (post.likes || []).includes(currentUser.uid)
        const isOwner = currentUser && post.authorId === currentUser.uid
        const postComments = comments[post.id] || []
        return (
          <div key={post.id} className="glass-card-solid overflow-hidden card-hover animate-slide-up" style={{ animationDelay: `${idx * 0.03}s` }}>
            <div className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full gradient-bg flex items-center justify-center text-white font-bold text-sm ring-2 ring-white shadow-sm overflow-hidden shrink-0">
                    {post.authorPhoto
                      ? <img src={post.authorPhoto} alt="" className="w-full h-full object-cover" />
                      : initials(post.authorName)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-surface-900 text-sm">{post.authorName}</h3>
                    <p className="text-xs text-surface-500">{post.authorRole} · {timeAgo(post.createdAt)}</p>
                  </div>
                </div>
                <div className="relative">
                  {isOwner && (
                    <button onClick={() => setShowDeleteConfirm(showDeleteConfirm === post.id ? null : post.id)} className="p-1.5 hover:bg-surface-100 rounded-lg transition-colors">
                      <MoreHorizontal className="w-5 h-5 text-surface-400" />
                    </button>
                  )}
                  {showDeleteConfirm === post.id && (
                    <div className="absolute top-full right-0 mt-1 bg-white rounded-xl shadow-xl border border-surface-200 py-1 z-20 animate-slide-down w-40">
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        disabled={deletingId === post.id}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
                      >
                        {deletingId === post.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        Delete Post
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {post.content && (
                <p className="text-sm text-surface-800 leading-relaxed whitespace-pre-line mb-3">{post.content}</p>
              )}

              {post.attachmentType === 'image' && post.attachmentUrl && (
                <img src={post.attachmentUrl} alt="post" className="w-full rounded-xl mb-3 max-h-[500px] object-cover cursor-pointer hover:opacity-95 transition-opacity" />
              )}

              {post.attachmentType && post.attachmentType !== 'image' && post.attachmentUrl && (
                <div className="flex items-center gap-3 p-3 bg-primary-50 rounded-xl mb-3 border border-primary-100">
                  <FileText className="w-9 h-9 text-primary-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-primary-900 truncate">{post.attachmentName || 'Document'}</p>
                    <p className="text-xs text-primary-600">{post.attachmentType} Document</p>
                  </div>
                  <a href={post.attachmentUrl} target="_blank" rel="noreferrer" className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1">
                    <Download className="w-3.5 h-3.5" /> Download
                  </a>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-surface-500 mb-3 px-1">
                <span>{(post.likes || []).length} likes</span>
                <span>{post.commentsCount || 0} comments</span>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-surface-100">
                <button
                  onClick={() => toggleLike(post)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${liked ? 'text-primary-600 bg-primary-50' : 'text-surface-600 hover:bg-surface-100'}`}
                >
                  <ThumbsUp className={`w-4 h-4 ${liked ? 'fill-primary-600' : ''}`} /> Like
                </button>
                <button
                  onClick={() => toggleComments(post.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${showComments[post.id] ? 'text-primary-600 bg-primary-50' : 'text-surface-600 hover:bg-surface-100'}`}
                >
                  <MessageCircle className="w-4 h-4" /> Comment
                </button>
                <button
                  onClick={() => navigator.share?.({ text: post.content, url: window.location.href })}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-surface-600 hover:bg-surface-100 transition-colors"
                >
                  <Share2 className="w-4 h-4" /> Share
                </button>
              </div>

              {showComments[post.id] && (
                <div className="mt-3 pt-3 border-t border-surface-100 animate-fade-in space-y-3">
                  {/* Existing Comments */}
                  {loadingComments[post.id] && (
                    <div className="flex justify-center py-3">
                      <Loader2 className="w-5 h-5 animate-spin text-primary-400" />
                    </div>
                  )}
                  {postComments.map(comment => (
                    <div key={comment.id} className="flex gap-2.5 animate-fade-in">
                      <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-xs shrink-0 overflow-hidden">
                        {comment.authorPhoto
                          ? <img src={comment.authorPhoto} alt="" className="w-full h-full object-cover" />
                          : initials(comment.authorName || '')}
                      </div>
                      <div className="flex-1 bg-surface-50 rounded-2xl px-4 py-2.5 border border-surface-100">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-xs font-bold text-surface-900">{comment.authorName}</p>
                          <span className="text-[10px] text-surface-400">{timeAgo(comment.createdAt)}</span>
                        </div>
                        <p className="text-sm text-surface-700">{comment.text}</p>
                      </div>
                    </div>
                  ))}

                  {/* Write Comment */}
                  <div className="flex gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-xs shrink-0 overflow-hidden">
                      {userProfile?.profilePhoto
                        ? <img src={userProfile.profilePhoto} alt="" className="w-full h-full object-cover" />
                        : initials(userProfile?.name || '')}
                    </div>
                    <input
                      type="text"
                      placeholder="Write a comment..."
                      value={commentText[post.id] || ''}
                      onChange={e => setCommentText(prev => ({ ...prev, [post.id]: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && handleComment(post.id)}
                      className="flex-1 bg-surface-50 rounded-full px-4 py-2 text-sm border border-surface-200 focus:outline-none focus:ring-2 focus:ring-primary-300 transition-all"
                    />
                    <button
                      onClick={() => handleComment(post.id)}
                      disabled={!commentText[post.id]?.trim()}
                      className="p-2 bg-primary-600 text-white rounded-full hover:bg-primary-700 transition-colors active:scale-95 disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })}
        </div>

        {/* Right Side Sticky Widget Column */}
        <div className="hidden lg:block lg:col-span-4 space-y-6">
          <div className="sticky top-[120px] space-y-6">
            
            {/* Quick Stats Bento Box */}
            <div className="glass-card-solid p-6 border-white/60">
              <h3 className="text-[13px] font-bold tracking-widest uppercase text-surface-400 mb-5 px-1">Community Stats</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface-50/80 rounded-[20px] p-4 border border-surface-200/50">
                  <div className="text-2xl font-extrabold text-surface-900 mb-1">{posts.length}</div>
                  <div className="text-xs font-semibold text-surface-500">Total Posts</div>
                </div>
                <div className="bg-surface-50/80 rounded-[20px] p-4 border border-surface-200/50">
                  <div className="text-2xl font-extrabold text-surface-900 mb-1">{posts.reduce((a, p) => a + (p.likes?.length || 0), 0)}</div>
                  <div className="text-xs font-semibold text-surface-500">Engagements</div>
                </div>
              </div>
            </div>

            {/* Trending Topics Widget */}
            <div className="glass-card-solid p-6 border-white/60">
              <h3 className="text-[13px] font-bold tracking-widest uppercase text-surface-400 mb-4 px-1">Trending Tags</h3>
              <div className="flex flex-wrap gap-2">
                {['#STEM', '#EdTech', '#ClassroomManagement', '#LessonIdeas', '#AIinEd', '#NEP2020'].map(tag => (
                  <span key={tag} className="px-3 py-1.5 bg-surface-100 hover:bg-primary-50 hover:text-primary-700 cursor-pointer rounded-xl text-[13px] font-bold text-surface-600 transition-colors border border-surface-200/50">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}
