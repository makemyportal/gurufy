import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { db } from '../utils/firebase'
import {
  collection, addDoc, onSnapshot, query, orderBy,
  updateDoc, doc, arrayUnion, arrayRemove, serverTimestamp,
  deleteDoc, getDocs, getDoc, increment
} from 'firebase/firestore'
import { uploadToCloudinary } from '../utils/cloudinary'
import {
  Heart, MessageCircle, Share2, Download,
  FileText, Send, MoreHorizontal, Loader2, X,
  ImagePlus, Sparkles, BookOpen, Trash2, PenLine,
  TrendingUp, Users, Zap, ChevronRight, Award, Bot,
  BarChart2, CheckCircle, Plus, Minus, Youtube, Flag, AlertTriangle, ThumbsDown,
  Link2, HelpCircle, Camera, Megaphone, UserPlus, UserMinus, Flame
} from 'lucide-react'
import { generateAIContent } from '../utils/aiService'
import { useNavigate } from 'react-router-dom'
import { createNotification } from '../utils/notificationHelpers'
import { useGamification } from '../contexts/GamificationContext'
import { XP_VALUES } from '../contexts/GamificationContext'
import { followUser, unfollowUser, isFollowing } from '../utils/followHelpers'

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
  const { awardXP, stats, getLevel, getLevelProgress } = useGamification()
  const { t } = useLanguage()

  const [posts, setPosts] = useState([])
  const [newPost, setNewPost] = useState('')
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [showComments, setShowComments] = useState({})
  const [commentText, setCommentText] = useState({})
  const [comments, setComments] = useState({})
  const [loadingComments, setLoadingComments] = useState({})
  const [globalAnnouncement, setGlobalAnnouncement] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [filePreview, setFilePreview] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)
  const [composerFocused, setComposerFocused] = useState(false)
  const [generatingAI, setGeneratingAI] = useState(false)
  const [postType, setPostType] = useState('text')
  const [pollOptions, setPollOptions] = useState([{ id: 1, text: '' }, { id: 2, text: '' }])
  const [youtubeLink, setYoutubeLink] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [reportingPost, setReportingPost] = useState(null)
  const [reportReason, setReportReason] = useState('')
  const [followStatus, setFollowStatus] = useState({})
  const [followLoading, setFollowLoading] = useState({})
  const fileInputRef = useRef(null)
  const photoInputRef = useRef(null)

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, async (snap) => {
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return () => unsub()
  }, [])

  // Listen to Platform Settings for Global Announcements
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'platformSettings', 'global'), (docSnap) => {
      if (docSnap.exists() && docSnap.data().latestBroadcast) {
        setGlobalAnnouncement(docSnap.data().latestBroadcast)
      } else {
        setGlobalAnnouncement(null)
      }
    })
    return () => unsub()
  }, [])

  // Track follow status for all unique post authors
  useEffect(() => {
    if (!currentUser || posts.length === 0) return
    const authorIds = [...new Set(posts.map(p => p.authorId).filter(id => id && id !== currentUser.uid && id !== 'ldms_ai_bot'))]
    authorIds.forEach(async (authorId) => {
      if (followStatus[authorId] !== undefined) return // already checked
      try {
        const following = await isFollowing(currentUser.uid, authorId)
        setFollowStatus(prev => ({ ...prev, [authorId]: following }))
      } catch {}
    })
  }, [currentUser, posts])

  async function handleFollowToggle(authorId, authorName) {
    if (!currentUser) return
    setFollowLoading(prev => ({ ...prev, [authorId]: true }))
    try {
      if (followStatus[authorId]) {
        await unfollowUser(currentUser.uid, authorId)
        setFollowStatus(prev => ({ ...prev, [authorId]: false }))
      } else {
        await followUser(currentUser.uid, userProfile?.name || currentUser.email, authorId)
        setFollowStatus(prev => ({ ...prev, [authorId]: true }))
      }
    } catch (err) { console.error('Follow toggle error:', err) }
    setFollowLoading(prev => ({ ...prev, [authorId]: false }))
  }

  // AI Auto-Bot Routine
  useEffect(() => {
    if (!currentUser || loading || posts.length === 0) return
    const aiPosts = posts.filter(p => p.authorName === 'LDMS AI')
    const latestAIPost = aiPosts.length > 0 ? aiPosts[0] : null
    
    const now = new Date()
    const lastAITime = latestAIPost?.createdAt?.toDate ? latestAIPost.createdAt.toDate() : new Date(0)
    const hoursSinceLastAI = (now.getTime() - lastAITime.getTime()) / (1000 * 60 * 60)
    
    const trigLock = localStorage.getItem('ai_bot_timer')
    
    // Trigger if > 4 hours and no recent lock (< 10 mins)
    if (hoursSinceLastAI > 4 && (!trigLock || (now.getTime() - parseInt(trigLock)) > 1000 * 60 * 10)) {
      localStorage.setItem('ai_bot_timer', now.getTime().toString())
      triggerAIBot()
    }
  }, [posts, currentUser, loading])

  async function triggerAIBot() {
    try {
      const SUBJECTS = ['Space Physics', 'Ancient History', 'Modern Ed-Tech', 'Psychology of Learning', 'Mathematical Tricks', 'English Literature', 'Technology Innovations', 'Mindfulness in classroom', 'General Knowledge Facts']
      const isPoll = Math.random() > 0.7; // 30% chance for a poll
      const subject = SUBJECTS[Math.floor(Math.random() * SUBJECTS.length)]
      
      let postDoc = {
        authorId: 'ldms_ai_bot',
        authorName: 'LDMS AI',
        authorRole: 'Platform Admin',
        authorPhoto: '',
        likes: [], commentsCount: 0,
        createdAt: serverTimestamp(),
      }

      if (isPoll) {
         const prompt = `Generate an engaging multiple-choice poll (with exactly 3 options) about ${subject}. Format EXACTLY as:
Question?
Option 1
Option 2
Option 3
NO markdown. NO extra text.`
         const text = await generateAIContent(prompt)
         const lines = text.split('\n').map(l => l.trim()).filter(l => l)
         if (lines.length >= 4) {
           postDoc.content = lines[0]
           postDoc.postType = 'poll'
           postDoc.pollOptions = [
             { id: 1, text: lines[1].replace(/^[-\d.)]\s*/, '').replace(/^[A-Za-z]\)\s*/, '') },
             { id: 2, text: lines[2].replace(/^[-\d.)]\s*/, '').replace(/^[A-Za-z]\)\s*/, '') },
             { id: 3, text: lines[3].replace(/^[-\d.)]\s*/, '').replace(/^[A-Za-z]\)\s*/, '') },
           ].filter(o => o.text)
           postDoc.pollVotes = {}
         } else { postDoc.postType = 'text'; postDoc.content = text; } 
      } else {
         const isQuestion = Math.random() > 0.5;
         const prompt = isQuestion 
            ? `Ask a short, engaging open-ended question (under 30 words) about ${subject} to inspire a discussion among educators. Use 1 emoji. EXCLUDE MARKDOWN.`
            : `Share a fascinating, mind-blowing educational fact (under 40 words) about ${subject}. Include 1 or 2 emojis. EXCLUDE MARKDOWN.`
         
         const text = await generateAIContent(prompt)
         let cleanText = text.trim()
         if (cleanText.startsWith('"') && cleanText.endsWith('"')) cleanText = cleanText.slice(1, -1)
         postDoc.content = cleanText;
         postDoc.postType = 'text';
      }

      await addDoc(collection(db, 'posts'), postDoc)
    } catch (e) {
      console.warn('AI Bot silent failure:', e)
    }
  }

  async function triggerAIPostReaction(postId, textContent, pType, aType) {
    try {
      let prompt = ''
      if (textContent) {
         prompt = `An educator just posted on our social platform: "${textContent}". As a super-smart, highly intelligent AI teaching assistant named 'LDMS AI', write a brilliant and highly insightful reply. KEEP IT EXTREMELY SHORT (Maximum 10-15 words). No markdown. No quotes.`
      } else if (pType === 'youtube' || aType === 'youtube') {
         prompt = `An educator just shared a YouTube video. As a super-smart AI, write a brilliant, insightful 1-sentence comment. KEEP IT EXTREMELY SHORT (Maximum 10-15 words). No markdown. No quotes.`
      } else if (aType === 'image') {
         prompt = `An educator just shared a photo. As a super-smart AI, write a brilliant 1-sentence comment. KEEP IT EXTREMELY SHORT (Maximum 10 words). No markdown. No quotes.`
      } else {
         prompt = `An educator just shared a document. As a super-smart AI, write a brilliant 1-sentence comment thanking them. KEEP IT EXTREMELY SHORT (Maximum 10 words). No markdown. No quotes.`
      }
      const aiResponse = await generateAIContent(prompt)
      let cleanRes = aiResponse.trim().replace(/^["']|["']$/g, '')
      if (cleanRes.startsWith('"')) cleanRes = cleanRes.substring(1)
      if (cleanRes.endsWith('"')) cleanRes = cleanRes.slice(0,-1)

      setTimeout(async () => {
        try {
          await addDoc(collection(db, 'posts', postId, 'comments'), {
            text: cleanRes,
            authorId: 'ldms_ai_bot',
            authorName: 'LDMS AI',
            authorPhoto: '',
            createdAt: serverTimestamp(),
          })
          await updateDoc(doc(db, 'posts', postId), { commentsCount: increment(1) })
        } catch (err) { console.warn('AI comment error', err) }
      }, 4000)
    } catch (e) {
      console.warn('AI reaction failed', e)
    }
  }

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
    if (!newPost.trim() && !selectedFile && postType === 'text') return
    if (postType === 'poll') {
      const validOptions = pollOptions.filter(o => o.text.trim())
      if (!newPost.trim() || validOptions.length < 2) {
        alert('Please add a question and at least 2 options for the poll.')
        return
      }
    }
    if (postType === 'youtube' && !youtubeLink.trim()) {
      alert('Please enter a valid YouTube link.')
      return
    }
    setPosting(true)
    try {
      let attachmentUrl = null, attachmentType = null, attachmentName = null
      if (postType === 'youtube') {
        attachmentUrl = youtubeLink.trim()
        attachmentType = 'youtube'
      } else if (postType === 'link') {
        attachmentUrl = linkUrl.trim()
        attachmentType = 'link'
      } else if (selectedFile) {
        const r = await uploadToCloudinary(selectedFile)
        attachmentUrl = r.url
        attachmentName = r.originalFilename || selectedFile.name
        attachmentType = selectedFile.type.startsWith('image/') ? 'image' : r.format || 'FILE'
      }
      const docRef = await addDoc(collection(db, 'posts'), {
        content: newPost.trim(),
        postType,
        pollOptions: postType === 'poll' ? pollOptions.filter(o => o.text.trim()).map((o,i) => ({ id: i+1, text: o.text.trim() })) : null,
        pollVotes: postType === 'poll' ? {} : null,
        authorId: currentUser.uid,
        authorName: userProfile?.name || currentUser.email,
        authorRole: ['admin', 'superadmin'].includes(userProfile?.role) ? 'Platform Admin' : userProfile?.subject ? `${userProfile.subject} Teacher` : userProfile?.role === 'school' ? 'School' : 'Teacher',
        authorPhoto: userProfile?.profilePhoto || '',
        authorVerified: userProfile?.isVerified || false,
        authorVerificationColor: userProfile?.verificationColor || null,
        attachmentUrl, attachmentType, attachmentName,
        likes: [], commentsCount: 0,
        createdAt: serverTimestamp(),
      })
      
      const capturedText = newPost.trim()
      const capturedPostType = postType
      const capturedAttachmentType = attachmentType

      setNewPost(''); clearFile(); setComposerFocused(false); setPostType('text'); setPollOptions([{ id: 1, text: '' }, { id: 2, text: '' }]); setYoutubeLink(''); setLinkUrl('');
      awardXP(XP_VALUES.create_post, 'create_post', (data, badges) => {
        if (!badges.includes('first_post')) return 'first_post'
        if ((data.totalPosts || 0) >= 9 && !badges.includes('ten_posts')) return 'ten_posts'
        return null
      })

      triggerAIPostReaction(docRef.id, capturedText, capturedPostType, capturedAttachmentType)

    } catch { alert('Failed to create post.') } finally { setPosting(false) }
  }

  async function toggleLike(post) {
    if (!currentUser) return navigate('/login')
    const ref = doc(db, 'posts', post.id)
    const liked = (post.likes || []).includes(currentUser.uid)
    // If user had disliked, remove dislike first
    const disliked = (post.dislikes || []).includes(currentUser.uid)
    if (!liked && disliked) {
      await updateDoc(ref, { likes: arrayUnion(currentUser.uid), dislikes: arrayRemove(currentUser.uid) })
    } else {
      await updateDoc(ref, { likes: liked ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid) })
    }
    if (!liked && post.authorId !== currentUser.uid) {
      createNotification(post.authorId, { type: 'like', title: `${userProfile?.name || 'Someone'} liked your post`, fromUserId: currentUser.uid, fromUserName: userProfile?.name || '', relatedId: post.id })
    }
  }

  async function toggleDislike(post) {
    if (!currentUser) return navigate('/login')
    const ref = doc(db, 'posts', post.id)
    const disliked = (post.dislikes || []).includes(currentUser.uid)
    // If user had liked, remove like first
    const liked = (post.likes || []).includes(currentUser.uid)
    if (!disliked && liked) {
      await updateDoc(ref, { dislikes: arrayUnion(currentUser.uid), likes: arrayRemove(currentUser.uid) })
    } else {
      await updateDoc(ref, { dislikes: disliked ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid) })
    }
  }

  async function handleVotePoll(postId, optionId) {
    if (!currentUser) return navigate('/login')
    const ref = doc(db, 'posts', postId)
    await updateDoc(ref, { [`pollVotes.${currentUser.uid}`]: optionId })
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

  async function handleReportPost(postId) {
    if (!currentUser || !reportReason) return
    const post = posts.find(p => p.id === postId)
    try {
      await addDoc(collection(db, 'reports'), {
        type: 'post',
        contentId: postId,
        contentPreview: (post?.content || '').substring(0, 200),
        contentAuthorId: post?.authorId || '',
        contentAuthorName: post?.authorName || 'Unknown',
        reason: reportReason,
        reporter: userProfile?.name || currentUser.email,
        reporterId: currentUser.uid,
        status: 'pending',
        createdAt: serverTimestamp(),
      })
      setReportingPost(null)
      setReportReason('')
      setShowDeleteConfirm(null)
      alert('✅ Report submitted. Our team will review this content.')
    } catch (err) {
      console.error('Report error:', err)
      alert('Failed to submit report.')
    }
  }

  function toggleComments(postId) {
    setShowComments(p => ({ ...p, [postId]: !p[postId] }))
    if (!showComments[postId]) loadComments(postId)
  }

  async function handleGenerateAIPost() {
    setGeneratingAI(true)
    try {
      await triggerAIBot() // Manually firing the smarter triggerAIBot routine
      setNewPost('')
      setComposerFocused(false)
    } catch (err) {
      alert('Failed to generate AI post. Please try again.')
    } finally {
      setGeneratingAI(false)
    }
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
    <div className="max-w-[1200px] mx-auto px-0 animate-fade-in pb-20 sm:pb-16">

      {/* ─── HERO BANNER ─── */}
      <div className="relative overflow-hidden rounded-[20px] sm:rounded-[32px] mb-6 sm:mb-8 mt-1 bg-white dark:bg-surface-900/40 min-h-[160px] sm:min-h-[200px] flex items-center px-6 sm:px-12 border border-surface-200/60 dark:border-white/5 shadow-[0_2px_20px_rgba(0,0,0,0.04)] dark:shadow-none">
        
        {/* Subtle Background Pattern */}
        <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-50/50 via-transparent to-transparent dark:from-indigo-500/5" />
        
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between w-full gap-8 py-8 lg:py-0">
          
          <div className="max-w-xl">
            {/* Clean Premium Welcome Text */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-surface-900 dark:text-white tracking-tight leading-[1.1] mb-2.5">
              {currentUser
                ? <>{t('welcomeBack')}, <span className="text-indigo-600 dark:text-indigo-400">{userProfile?.name?.split(' ')[0] || 'Teacher'}</span> 👋</>
                : <>{t('welcomeTo')} <span className="text-indigo-600 dark:text-indigo-400">LDMS</span> 👋</>
              }
            </h1>
            <p className="text-surface-500 dark:text-surface-400 text-sm sm:text-base font-medium tracking-wide max-w-[480px]">
              {t('heroDesc', "Connect with educators across the nation. Share resources, discover new opportunities, and elevate your teaching journey together.")}
            </p>
          </div>

          {/* Clean Soft Gamification Stats */}
          {currentUser && stats && (
            <div className="flex items-center gap-3 shrink-0 self-stretch lg:self-auto overflow-x-auto pb-2 lg:pb-0 scrollbar-hide">
              
              {/* Level Card */}
              <div className="bg-surface-50 dark:bg-white/5 border border-surface-200/60 dark:border-white/10 rounded-[24px] p-4 sm:p-5 min-w-[120px] flex flex-col items-center justify-center relative overflow-hidden group/card hover:bg-white dark:hover:bg-white/10 hover:shadow-lg hover:border-indigo-100 dark:hover:border-white/20 transition-all duration-300">
                <div className="absolute bottom-0 left-0 h-1.5 bg-indigo-100 dark:bg-indigo-500/30 w-full">
                  <div className="h-full bg-indigo-500 dark:bg-indigo-400 transition-all duration-1000 ease-out" style={{ width: `${getLevelProgress()}%` }}></div>
                </div>
                <div className="text-3xl sm:text-4xl mb-1.5 group-hover/card:scale-110 group-hover/card:-translate-y-1 transition-transform duration-500 drop-shadow-sm">{getLevel()?.emoji || '🌱'}</div>
                <div className="text-xs sm:text-sm font-extrabold text-surface-900 dark:text-white tracking-wide">{getLevel()?.name || 'Beginner'}</div>
                <div className="text-[10px] font-bold text-surface-400 uppercase tracking-widest mt-1">LvL {getLevelProgress()}%</div>
              </div>

              {/* Streak Card */}
              <div className="bg-surface-50 dark:bg-white/5 border border-surface-200/60 dark:border-white/10 rounded-[24px] p-4 sm:p-5 min-w-[100px] flex flex-col items-center justify-center group/card hover:bg-white dark:hover:bg-white/10 hover:shadow-lg hover:border-orange-100 dark:hover:border-white/20 transition-all duration-300">
                <Flame className="w-7 h-7 sm:w-8 sm:h-8 text-orange-500 mb-2 group-hover/card:scale-110 group-hover/card:-rotate-6 transition-transform duration-300" strokeWidth={2.5} />
                <div className="text-xl sm:text-2xl font-black text-surface-900 dark:text-white leading-none">{stats?.streak || 0}</div>
                <div className="text-[10px] font-bold text-surface-400 uppercase tracking-widest mt-1.5">Day Streak</div>
              </div>

              {/* XP Card */}
              <div className="bg-surface-50 dark:bg-white/5 border border-surface-200/60 dark:border-white/10 rounded-[24px] p-4 sm:p-5 min-w-[100px] flex flex-col items-center justify-center group/card hover:bg-white dark:hover:bg-white/10 hover:shadow-lg hover:border-yellow-100 dark:hover:border-white/20 transition-all duration-300">
                <Zap className="w-7 h-7 sm:w-8 sm:h-8 text-yellow-500 mb-2 group-hover/card:scale-110 group-hover/card:rotate-6 transition-transform duration-300" strokeWidth={2.5} />
                <div className="text-xl sm:text-2xl font-black text-surface-900 dark:text-white leading-none">{(stats?.xp || 0).toLocaleString()}</div>
                <div className="text-[10px] font-bold text-surface-400 uppercase tracking-widest mt-1.5">Total XP</div>
              </div>

            </div>
          )}
          
        </div>
      </div>

      {/* ─── QUICK ACTION TILES ─── */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-6 sm:mb-8">
        {QUICK_ACTIONS.map(({ icon: Icon, label, sub, route, from, to }) => (
          <button key={route} onClick={() => navigate(route)}
            className={`relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-gradient-to-br ${from} ${to} rounded-xl sm:rounded-2xl text-white hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-300 group`}>
            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-5 transition-opacity" />
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-white/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="text-left">
              <p className="font-extrabold text-xs sm:text-sm leading-tight">{label}</p>
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
                    placeholder={postType === 'poll' ? "Ask a question for your poll..." : postType === 'question' ? "Ask your question to the community... ❓" : postType === 'announcement' ? "Write your announcement..." : t('sharePlaceholder')}
                    rows={composerFocused || newPost ? 3 : 1}
                    className="flex-1 resize-none text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none leading-relaxed pt-2 transition-all duration-300 bg-transparent"
                  />
                </div>

                {postType === 'poll' && (
                  <div className="mx-4 mt-3 pl-12 pr-4 space-y-2 animate-fade-in-up">
                    {pollOptions.map((opt, idx) => (
                      <div key={opt.id} className="flex items-center gap-2">
                         <div className="w-2 h-2 rounded-full bg-slate-300 shrink-0" />
                         <input 
                           type="text" 
                           placeholder={`Option ${idx + 1}`} 
                           value={opt.text}
                           onChange={(e) => {
                             const newOpts = [...pollOptions]
                             newOpts[idx].text = e.target.value
                             setPollOptions(newOpts)
                           }}
                           className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all placeholder:text-slate-400"
                         />
                         {pollOptions.length > 2 && (
                           <button type="button" onClick={() => setPollOptions(p => p.filter(o => o.id !== opt.id))} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 transition-colors"><X className="w-4 h-4" /></button>
                         )}
                      </div>
                    ))}
                    {pollOptions.length < 4 && (
                      <button type="button" onClick={() => setPollOptions(p => [...p, { id: Date.now(), text: '' }])} className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 pt-1 ml-4 transition-colors">
                        <Plus className="w-3.5 h-3.5" /> Add Option
                      </button>
                    )}
                  </div>
                )}

                {postType === 'youtube' && (
                  <div className="mx-4 mt-3 animate-fade-in-up">
                    <input type="url" placeholder="Paste YouTube Link (e.g. https://youtube.com/watch?v=...)" value={youtubeLink} onChange={e => setYoutubeLink(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:bg-white focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none transition-all placeholder:text-slate-400" />
                  </div>
                )}

                {postType === 'link' && (
                  <div className="mx-4 mt-3 animate-fade-in-up">
                    <input type="url" placeholder="Paste any URL (e.g. https://example.com/article)" value={linkUrl} onChange={e => setLinkUrl(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all placeholder:text-slate-400" />
                  </div>
                )}

                {filePreview && (
                  <div className="mx-4 mt-3 bg-slate-50 rounded-xl p-3 flex items-center gap-3 border border-slate-200">
                    {filePreview.type === 'image'
                      ? <img src={filePreview.url} alt="" className="w-14 h-14 rounded-lg object-cover" />
                      : <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-700 font-bold text-xs">{filePreview.ext}</div>}
                    <p className="text-sm text-slate-700 font-medium flex-1 truncate">{filePreview.name}</p>
                    <button type="button" onClick={clearFile} className="p-1 hover:bg-slate-200 rounded-lg"><X className="w-4 h-4 text-slate-400" /></button>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-3 mt-2 border-t border-slate-100 relative">
                  <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                    <button type="button" onClick={() => setPostType(p => p === 'poll' ? 'text' : 'poll')} 
                      className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-colors ${postType === 'poll' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50'}`}>
                      <BarChart2 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Poll</span>
                    </button>
                    <button type="button" onClick={() => setPostType(p => p === 'question' ? 'text' : 'question')} 
                      className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-colors ${postType === 'question' ? 'bg-amber-100 text-amber-700' : 'text-slate-500 hover:text-amber-600 hover:bg-amber-50'}`}>
                      <HelpCircle className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Question</span>
                    </button>
                    <button type="button" onClick={() => setPostType(p => p === 'youtube' ? 'text' : 'youtube')} 
                      className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-colors ${postType === 'youtube' ? 'bg-red-100 text-red-700' : 'text-slate-500 hover:text-red-600 hover:bg-red-50'}`}>
                      <Youtube className="w-3.5 h-3.5" /> <span className="hidden sm:inline">YouTube</span>
                    </button>
                    <button type="button" onClick={() => setPostType(p => p === 'link' ? 'text' : 'link')} 
                      className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-colors ${postType === 'link' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:text-blue-600 hover:bg-blue-50'}`}>
                      <Link2 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Link</span>
                    </button>
                    <input ref={photoInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" id="feed-photo" />
                    <label htmlFor="feed-photo" className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 text-xs sm:text-sm font-semibold text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg cursor-pointer transition-colors">
                      <Camera className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Photo</span>
                    </label>
                    <input ref={fileInputRef} type="file" accept="image/*,application/pdf,.doc,.docx,.ppt,.pptx" onChange={handleFileSelect} className="hidden" id="feed-file" />
                    <label htmlFor="feed-file" className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 text-xs sm:text-sm font-semibold text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer transition-colors">
                      <ImagePlus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">File</span>
                    </label>

                    {/* Admin-only */}
                    {['admin', 'superadmin'].includes(userProfile?.role) && (
                      <>
                        <button type="button" onClick={() => setPostType(p => p === 'announcement' ? 'text' : 'announcement')} 
                          className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-colors ${postType === 'announcement' ? 'bg-rose-100 text-rose-700' : 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'}`}>
                          <Megaphone className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Announce</span>
                        </button>
                        <button type="button" onClick={handleGenerateAIPost} disabled={generatingAI}
                          className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 text-xs sm:text-sm font-bold text-fuchsia-600 bg-fuchsia-50 hover:bg-fuchsia-100 rounded-lg transition-colors border border-fuchsia-100 disabled:opacity-50">
                          {generatingAI ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bot className="w-3.5 h-3.5" />}
                          <span className="hidden sm:inline">AI Post</span>
                        </button>
                      </>
                    )}
                  </div>
                  <button type="submit" disabled={posting || (!newPost.trim() && !selectedFile && postType === 'text' && !youtubeLink.trim() && !linkUrl.trim())}
                    className="flex items-center gap-2 px-4 sm:px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-all active:scale-[0.97] shadow-sm shadow-indigo-200 shrink-0">
                    {posting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PenLine className="w-3.5 h-3.5" />}
                    {posting ? 'Posting...' : t('publish')}
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

          {/* Empty State - Engaging Starter Content */}
          {!loading && posts.length === 0 && (
            <div className="space-y-5">
              {/* Starter Post 1 */}
              <article className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-slate-300 hover:shadow-md transition-all duration-300">
                <div className="flex items-start justify-between p-5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm overflow-hidden shrink-0 shadow-inner">
                      GT
                    </div>
                    <div>
                      <p className="font-extrabold text-slate-900 text-sm leading-tight flex items-center gap-1.5">
                        LDMS Team <span className="w-3.5 h-3.5 bg-blue-500 text-white rounded-full flex items-center justify-center text-[8px]">✓</span>
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">Platform Admin</span>
                        <span className="text-slate-300">·</span>
                        <span className="text-xs text-slate-400 font-medium">pinned post</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="px-5 pb-4">
                  <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-line mb-4 font-medium">
                    Welcome to India's fastest-growing professional network for educators! 🚀
                    <br/><br/>
                    We built LDMS to give teachers a dedicated space to thrive. Here's what you can do:
                    <br/>✨ <b>Connect</b> with passionate educators across the country
                    <br/>📚 <b>Share</b> and discover high-quality teaching resources
                    <br/>💼 <b>Find</b> your next dream teaching job in top schools
                    <br/>🤖 <b>Supercharge</b> your lesson planning with our AI Tools
                    <br/><br/>
                    Why not start by introducing yourself? Create your first post above and say hello to the community! 👇
                  </p>
                  <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-3">
                    <span>142 likes</span>
                    <span>12 comments</span>
                  </div>
                </div>
                <div className="flex items-center gap-0 border-t border-slate-100 px-2 opacity-70 pointer-events-none">
                  <button className="flex items-center gap-2 flex-1 justify-center py-3 text-sm font-semibold text-rose-500 transition-all rounded-b-none rounded-t-none">
                    <Heart className="w-4 h-4 fill-rose-500" /> Liked
                  </button>
                  <div className="w-px h-6 bg-slate-100" />
                  <button className="flex items-center gap-2 flex-1 justify-center py-3 text-sm font-semibold text-slate-500 transition-colors">
                    <MessageCircle className="w-4 h-4" /> Discuss
                  </button>
                  <div className="w-px h-6 bg-slate-100" />
                  <button className="flex items-center gap-2 flex-1 justify-center py-3 text-sm font-semibold text-slate-500 transition-colors">
                    <Share2 className="w-4 h-4" /> Share
                  </button>
                </div>
              </article>

              {/* Starter Post 2 */}
              <article className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-slate-300 hover:shadow-md transition-all duration-300">
                <div className="flex items-start justify-between p-5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white font-bold text-sm overflow-hidden shrink-0 shadow-inner">
                      SP
                    </div>
                    <div>
                      <p className="font-extrabold text-slate-900 text-sm leading-tight">Sarah from LDMS</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[11px] font-bold text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full">Community Lead</span>
                        <span className="text-slate-300">·</span>
                        <span className="text-xs text-slate-400 font-medium">just now</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="px-5 pb-4">
                  <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-line mb-4 font-medium">
                    <b>Pro Tip:</b> Did you know you can generate complete lesson plans in seconds using our AI Tools? 🪄✨
                    <br/><br/>
                    Head over to the <span className="text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded">AI Magic</span> section in the sidebar, choose "Lesson Planner", type in your topic and grade level, and let LDMS do the heavy lifting! It even generates worksheets and quiz questions based on the lesson.
                    <br/><br/>
                    What topic are you teaching next week? 📝 Let us know!
                  </p>
                  <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-3">
                    <span>89 likes</span>
                    <span>4 comments</span>
                  </div>
                </div>
                <div className="flex items-center gap-0 border-t border-slate-100 px-2 opacity-70 pointer-events-none">
                  <button className="flex items-center gap-2 flex-1 justify-center py-3 text-sm font-semibold text-slate-500 transition-all rounded-b-none rounded-t-none">
                    <Heart className="w-4 h-4" /> Like
                  </button>
                  <div className="w-px h-6 bg-slate-100" />
                  <button className="flex items-center gap-2 flex-1 justify-center py-3 text-sm font-semibold text-slate-500 transition-colors">
                    <MessageCircle className="w-4 h-4" /> Discuss
                  </button>
                  <div className="w-px h-6 bg-slate-100" />
                  <button className="flex items-center gap-2 flex-1 justify-center py-3 text-sm font-semibold text-slate-500 transition-colors">
                    <Share2 className="w-4 h-4" /> Share
                  </button>
                </div>
              </article>
            </div>
          )}

          {/* ─── POST CARDS ─── */}
          {posts.map((post, idx) => {
            const liked = currentUser && (post.likes || []).includes(currentUser.uid)
            const disliked = currentUser && (post.dislikes || []).includes(currentUser.uid)
            const isOwner = currentUser && post.authorId === currentUser.uid
            const postComments = comments[post.id] || []
            const isAdminPost = post.authorRole === 'Platform Admin' || post.authorRole?.toLowerCase().includes('admin') || post.authorRole === 'LDMS Team' || post.authorId === 'ldms_ai_bot' || post.authorName === 'LDMS AI'
            const isVerified = isAdminPost || post.authorVerified
            const badgeColorStr = { blue: 'bg-blue-500', gold: 'bg-yellow-500', emerald: 'bg-emerald-500', purple: 'bg-purple-500' }[post.authorVerificationColor] || 'bg-blue-500'

            return (
              <article key={post.id}
                className={`bg-white border rounded-2xl overflow-hidden transition-all duration-300 animate-fade-in ${
                  isAdminPost 
                    ? 'border-indigo-200 hover:border-indigo-300 shadow-[0_4px_20px_-4px_rgba(99,102,241,0.1)]' 
                    : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
                }`}
                style={{ animationDelay: `${idx * 0.04}s` }}>

                {/* Header */}
                <div className={`flex items-start justify-between p-5 pb-4 ${isAdminPost ? 'bg-gradient-to-r from-indigo-50/40 to-violet-50/40' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div
                      onClick={() => post.authorId !== 'ldms_ai_bot' && navigate(`/user/${post.authorId}`)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm overflow-hidden shrink-0 ${post.authorId !== 'ldms_ai_bot' ? 'cursor-pointer hover:ring-2 hover:ring-indigo-300 transition-all' : ''} ${
                      post.authorId === 'ldms_ai_bot' ? 'bg-gradient-to-br from-amber-400 via-pink-500 to-purple-600 ring-2 ring-pink-300/40' : isAdminPost ? 'bg-gradient-to-br from-indigo-500 to-violet-600 shadow-inner' : 'bg-gradient-to-br from-slate-400 to-slate-500'
                    }`}>
                      {post.authorId === 'ldms_ai_bot' ? <span className="text-lg">🤖</span> : post.authorPhoto ? <img src={post.authorPhoto} alt="" className="w-full h-full object-cover" /> : initials(post.authorName)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-extrabold text-slate-900 text-sm leading-tight flex items-center gap-1.5">
                          <span
                            onClick={() => post.authorId !== 'ldms_ai_bot' && navigate(`/user/${post.authorId}`)}
                            className={post.authorId !== 'ldms_ai_bot' ? 'cursor-pointer hover:text-indigo-600 transition-colors' : ''}
                          >
                            {post.authorName?.includes('@') ? post.authorName.split('@')[0] : post.authorName}
                          </span>
                          {isVerified && <span className={`w-3.5 h-3.5 text-white rounded-full flex items-center justify-center text-[8px] mx-0.5 shadow-sm shrink-0 ${badgeColorStr}`}>✓</span>}
                        </p>
                        {/* Follow/Unfollow Button */}
                        {currentUser && post.authorId !== currentUser.uid && post.authorId !== 'ldms_ai_bot' && (
                          <button
                            onClick={() => handleFollowToggle(post.authorId, post.authorName)}
                            disabled={followLoading[post.authorId]}
                            className={`text-[11px] font-extrabold py-0.5 px-2.5 rounded-full transition-all active:scale-95 flex items-center gap-1 shrink-0 ${
                              followStatus[post.authorId]
                                ? 'bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600 border border-slate-200'
                                : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200'
                            }`}
                          >
                            {followLoading[post.authorId] ? (
                              <Loader2 className="w-2.5 h-2.5 animate-spin" />
                            ) : followStatus[post.authorId] ? (
                              <><UserMinus className="w-2.5 h-2.5" /> Following</>
                            ) : (
                              <><UserPlus className="w-2.5 h-2.5" /> Follow</>
                            )}
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${isAdminPost ? 'text-indigo-600 bg-indigo-100' : 'text-indigo-600 bg-indigo-50'}`}>
                          {post.authorRole || 'Educator'}
                        </span>
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
                        <div className="absolute top-full right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-20 w-44">
                          <button onClick={() => handleDeletePost(post.id)} disabled={deletingId === post.id}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors">
                            {deletingId === post.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            Delete Post
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  {!isOwner && (
                    <div className="relative">
                      <button onClick={() => { setShowDeleteConfirm(showDeleteConfirm === post.id ? null : post.id); setReportingPost(null) }}
                        className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                        <MoreHorizontal className="w-4 h-4 text-slate-400" />
                      </button>
                      {showDeleteConfirm === post.id && (
                        <div className="absolute top-full right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-20 w-56">
                          {reportingPost === post.id ? (
                            <div className="p-3 space-y-2">
                              <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Why are you reporting?</p>
                              {['Inappropriate Language', 'Spam / Misleading', 'Harassment', 'Misinformation', 'Other'].map(reason => (
                                <button key={reason} onClick={() => { setReportReason(reason); }}
                                  className={`w-full text-left px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${reportReason === reason ? 'bg-red-100 text-red-700' : 'text-slate-600 hover:bg-slate-100'}`}>
                                  {reason}
                                </button>
                              ))}
                              <button disabled={!reportReason} onClick={() => handleReportPost(post.id)}
                                className="w-full mt-1 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-all disabled:opacity-40">
                                Submit Report
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => setReportingPost(post.id)}
                              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-semibold text-amber-700 hover:bg-amber-50 transition-colors">
                              <Flag className="w-4 h-4" /> Report Post
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="px-5 pb-4">
                  {post.postType === 'question' && post.content && (
                    <div className="mb-4 p-4 bg-amber-50 border border-amber-200/60 rounded-xl">
                      <div className="flex items-start gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-amber-200 flex items-center justify-center shrink-0 mt-0.5">
                          <HelpCircle className="w-4 h-4 text-amber-700" />
                        </div>
                        <p className="text-slate-800 text-sm leading-relaxed font-semibold whitespace-pre-line">{post.content}</p>
                      </div>
                    </div>
                  )}

                  {post.postType === 'announcement' && post.content && (
                    <div className="mb-4 p-4 bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-200/60 rounded-xl">
                      <div className="flex items-start gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-rose-200 flex items-center justify-center shrink-0 mt-0.5">
                          <Megaphone className="w-4 h-4 text-rose-700" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">Announcement</p>
                          <p className="text-slate-800 text-sm leading-relaxed font-semibold whitespace-pre-line">{post.content}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {post.postType !== 'question' && post.postType !== 'announcement' && post.content && (
                    <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-line mb-4 font-medium">{post.content}</p>
                  )}

                  {post.attachmentType === 'link' && post.attachmentUrl && (
                    <a href={post.attachmentUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3.5 bg-blue-50 rounded-xl border border-blue-200/60 mb-4 group hover:bg-blue-100/50 transition-colors">
                      <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 group-hover:bg-blue-200 transition-colors">
                        <Link2 className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-blue-800 truncate">{post.attachmentUrl.replace(/^https?:\/\//, '').split('/')[0]}</p>
                        <p className="text-xs text-blue-500 font-medium truncate">{post.attachmentUrl}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-blue-400 shrink-0" />
                    </a>
                  )}
                  {post.postType === 'poll' && post.pollOptions && (
                    <div className="mb-4 space-y-2.5 bg-slate-50 p-4 rounded-xl border border-slate-100 animate-fade-in-up">
                      {post.pollOptions.map((opt) => {
                         const currentVotes = post.pollVotes ? Object.values(post.pollVotes).filter(v => v === opt.id).length : 0
                         const totalVotes = post.pollVotes ? Object.keys(post.pollVotes).length : 0
                         const percent = totalVotes === 0 ? 0 : Math.round((currentVotes / totalVotes) * 100)
                         const hasVoted = currentUser && post.pollVotes && post.pollVotes[currentUser.uid] === opt.id
                         return (
                           <button 
                             key={opt.id}
                             onClick={() => handleVotePoll(post.id, opt.id)}
                             disabled={!currentUser}
                             className={`group relative w-full overflow-hidden text-left border rounded-xl px-4 py-3 min-h-[48px] flex items-center justify-between transition-all outline-none ${hasVoted ? 'border-primary-400 bg-primary-50/50 hover:bg-primary-50' : 'border-slate-200 hover:border-primary-300 bg-white shadow-sm hover:shadow'}`}
                           >
                             <div className={`absolute top-0 left-0 bottom-0 transition-all duration-1000 ease-out ${hasVoted ? 'bg-primary-100/60' : 'bg-slate-100/60'}`} style={{ width: `${percent}%` }} />
                             <span className={`relative z-10 flex items-center gap-2.5 text-sm font-bold ${hasVoted ? 'text-primary-800' : 'text-slate-700'}`}>
                               {hasVoted ? <CheckCircle className="w-4 h-4 text-primary-600 shrink-0 shadow-sm rounded-full" /> : <div className="w-4 h-4 rounded-full border-2 border-slate-200 shrink-0 group-hover:border-primary-400 transition-colors bg-white" />}
                               {opt.text}
                             </span>
                             {totalVotes > 0 && <span className={`relative z-10 text-xs font-extrabold ${hasVoted ? 'text-primary-600' : 'text-slate-400'}`}>{percent}%</span>}
                           </button>
                         )
                      })}
                      <p className="text-[11px] font-bold text-slate-400 pt-1.5 text-right tracking-wide uppercase">{post.pollVotes ? Object.keys(post.pollVotes).length : 0} votes</p>
                    </div>
                  )}

                  {post.attachmentType === 'image' && post.attachmentUrl && (
                    <img src={post.attachmentUrl} alt="post" className="w-full rounded-xl max-h-[420px] object-cover mb-4" />
                  )}

                  {post.attachmentType === 'youtube' && post.attachmentUrl && (
                    <div className="relative w-full overflow-hidden rounded-xl mb-4" style={{ paddingTop: '56.25%' }}>
                      <iframe
                        className="absolute top-0 left-0 w-full h-full"
                        src={
                          post.attachmentUrl.includes('youtube.com/watch?v=') ? post.attachmentUrl.replace('watch?v=', 'embed/').split('&')[0] : 
                          post.attachmentUrl.includes('youtu.be/') ? post.attachmentUrl.replace('youtu.be/', 'www.youtube.com/embed/').split('?')[0] :
                          post.attachmentUrl
                        }
                        title="YouTube video player"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      ></iframe>
                    </div>
                  )}

                  {post.attachmentType && post.attachmentType !== 'image' && post.attachmentType !== 'youtube' && post.attachmentUrl && (
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
                    <div className="flex items-center gap-3">
                      <span>{(post.likes || []).length} likes</span>
                      {(post.dislikes || []).length > 0 && <span>{(post.dislikes || []).length} dislikes</span>}
                    </div>
                    <button 
                      onClick={() => toggleComments(post.id)} 
                      className="hover:text-indigo-600 hover:underline transition-colors font-semibold"
                    >
                      {post.commentsCount || 0} comments
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-0 border-t border-slate-100 px-2">
                  <button onClick={() => toggleLike(post)}
                    className={`flex items-center gap-1.5 flex-1 justify-center py-3 text-sm font-semibold transition-all hover:bg-slate-50 ${liked ? 'text-rose-500' : 'text-slate-500 hover:text-rose-400'}`}>
                    <Heart className={`w-4 h-4 transition-transform ${liked ? 'fill-rose-500 scale-110' : ''}`} />
                    <span className="hidden sm:inline">{liked ? t('liked') : t('like')}</span>
                  </button>
                  <div className="w-px h-6 bg-slate-100" />
                  <button onClick={() => toggleDislike(post)}
                    className={`flex items-center gap-1.5 flex-1 justify-center py-3 text-sm font-semibold transition-all hover:bg-slate-50 ${disliked ? 'text-blue-600' : 'text-slate-500 hover:text-blue-500'}`}>
                    <ThumbsDown className={`w-4 h-4 transition-transform ${disliked ? 'fill-blue-500 scale-110' : ''}`} />
                    <span className="hidden sm:inline">{disliked ? 'Disliked' : 'Dislike'}</span>
                  </button>
                  <div className="w-px h-6 bg-slate-100" />
                  <button onClick={() => toggleComments(post.id)}
                    className={`flex items-center gap-1.5 flex-1 justify-center py-3 text-sm font-semibold hover:bg-slate-50 transition-colors ${showComments[post.id] ? 'text-indigo-600' : 'text-slate-500 hover:text-indigo-500'}`}>
                    <MessageCircle className="w-4 h-4" /> <span className="hidden sm:inline">{t('discuss')}</span>
                  </button>
                  <div className="w-px h-6 bg-slate-100" />
                  <button onClick={() => navigator.share?.({ text: post.content, url: window.location.href })}
                    className="flex items-center gap-1.5 flex-1 justify-center py-3 text-sm font-semibold text-slate-500 hover:text-indigo-500 hover:bg-slate-50 transition-colors">
                    <Share2 className="w-4 h-4" /> <span className="hidden sm:inline">{t('share')}</span>
                  </button>
                </div>

                {/* Comments */}
                {showComments[post.id] && (
                  <div className="border-t border-slate-100 p-4 space-y-3 animate-fade-in bg-slate-50/50">
                    {loadingComments[post.id] && <div className="flex justify-center py-2"><Loader2 className="w-4 h-4 animate-spin text-indigo-400" /></div>}
                    {!loadingComments[post.id] && postComments.length === 0 && (
                      <div className="text-center py-5 bg-white rounded-xl border border-slate-100 mb-2 shadow-sm">
                        <MessageCircle className="w-7 h-7 text-indigo-200 mx-auto mb-2" />
                        <p className="text-sm font-bold text-slate-600">No comments yet</p>
                        <p className="text-xs font-medium text-slate-400 mt-0.5">Start the conversation by sharing your thoughts!</p>
                      </div>
                    )}
                    {postComments.map(c => (
                        <div key={c.id} className="flex gap-2.5">
                         <div
                           onClick={() => c.authorId !== 'ldms_ai_bot' && navigate(`/user/${c.authorId}`)}
                           className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 overflow-hidden ${c.authorId !== 'ldms_ai_bot' ? 'cursor-pointer hover:ring-2 hover:ring-indigo-300 transition-all' : ''} ${c.authorId === 'ldms_ai_bot' ? 'ring-2 ring-pink-400/50 bg-gradient-to-br from-amber-400 via-pink-500 to-purple-600' : 'bg-indigo-100 text-indigo-700'}`}>
                           {c.authorId === 'ldms_ai_bot' ? <span className="text-sm">🤖</span> : c.authorPhoto ? <img src={c.authorPhoto} alt="" className="w-full h-full object-cover" /> : initials(c.authorName || '')}
                         </div>
                         <div className={`flex-1 rounded-xl px-3.5 py-2.5 border ${c.authorId === 'ldms_ai_bot' ? 'bg-gradient-to-r from-indigo-50 to-pink-50 border-pink-200/50' : 'bg-white border-slate-200'}`}>
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span
                              onClick={() => c.authorId !== 'ldms_ai_bot' && navigate(`/user/${c.authorId}`)}
                              className={`text-xs font-extrabold ${c.authorId !== 'ldms_ai_bot' ? 'cursor-pointer hover:text-indigo-600 transition-colors' : ''} ${c.authorId === 'ldms_ai_bot' ? 'bg-gradient-to-r from-pink-600 to-indigo-600 bg-clip-text text-transparent' : 'text-slate-800'}`}
                            >
                              {c.authorName}
                            </span>
                            {c.authorId === 'ldms_ai_bot' && <span className="text-[8px] font-black bg-gradient-to-r from-pink-500 to-indigo-500 text-white px-1.5 py-0.5 rounded-full uppercase tracking-wider">AI</span>}
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

            {/* Super Admin Announcement */}
            {globalAnnouncement && (
              <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-primary-600 rounded-2xl p-5 text-white shadow-[0_8px_30px_rgba(99,102,241,0.3)] relative overflow-hidden animate-fade-in-up">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-10 -mt-10 blur-xl" />
                <div className="flex items-start gap-3 relative z-10">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0 border border-white/20 shadow-inner">
                    <Megaphone className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-[13px] tracking-wide mb-1 flex items-center gap-1.5 uppercase">
                      Admin Update
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                      </span>
                    </h3>
                    <p className="text-sm font-semibold text-indigo-50 leading-relaxed">
                      {globalAnnouncement.text}
                    </p>
                  </div>
                </div>
              </div>
            )}

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
