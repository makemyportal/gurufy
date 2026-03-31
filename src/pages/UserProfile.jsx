import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../utils/firebase'
import {
  doc, getDoc, collection, query, where, getDocs, orderBy,
  addDoc, serverTimestamp, onSnapshot
} from 'firebase/firestore'
import { followUser, unfollowUser, isFollowing, getFollowStats } from '../utils/followHelpers'
import {
  MapPin, BookOpen, Award, Mail, GraduationCap, Clock, Download,
  Loader2, UserPlus, UserMinus, MessageSquare, Heart, ArrowLeft,
  FileText, Flame, Trophy, ExternalLink, CheckCircle
} from 'lucide-react'

export default function UserProfile() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const { currentUser, userProfile: myProfile } = useAuth()

  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('posts')
  const [userPosts, setUserPosts] = useState([])
  const [userResources, setUserResources] = useState([])
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [followStats, setFollowStats] = useState({ followers: 0, following: 0 })
  const [isFollowingUser, setIsFollowingUser] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [startingChat, setStartingChat] = useState(false)

  const isOwnProfile = currentUser?.uid === userId

  // Load user profile
  useEffect(() => {
    async function loadProfile() {
      if (!userId) return
      setLoading(true)
      try {
        const userDoc = await getDoc(doc(db, 'users', userId))
        if (userDoc.exists()) {
          let data = { uid: userId, ...userDoc.data() }
          // Merge teacher-specific data
          if (data.role === 'teacher') {
            const teacherDoc = await getDoc(doc(db, 'teachers', userId))
            if (teacherDoc.exists()) {
              data = { ...data, ...teacherDoc.data() }
            }
          } else if (data.role === 'school') {
            const schoolDoc = await getDoc(doc(db, 'schools', userId))
            if (schoolDoc.exists()) {
              data = { ...data, ...schoolDoc.data() }
            }
          }
          setProfile(data)
        }
      } catch (err) {
        console.error('Failed to load profile:', err)
      }
      setLoading(false)
    }
    loadProfile()
  }, [userId])

  // Load user posts
  useEffect(() => {
    if (!userId) return
    setLoadingPosts(true)
    // Try ordered query, fallback to unordered
    const q = query(
      collection(db, 'posts'),
      where('authorId', '==', userId),
      orderBy('createdAt', 'desc')
    )
    const unsub = onSnapshot(q, snap => {
      setUserPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoadingPosts(false)
    }, () => {
      // Fallback without orderBy
      const fallbackQ = query(collection(db, 'posts'), where('authorId', '==', userId))
      const unsub2 = onSnapshot(fallbackQ, snap => {
        const sorted = snap.docs.map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
        setUserPosts(sorted)
        setLoadingPosts(false)
      })
      return () => unsub2()
    })
    return () => unsub()
  }, [userId])

  // Load user resources
  useEffect(() => {
    if (!userId) return
    async function loadResources() {
      try {
        const q = query(collection(db, 'resources'), where('authorId', '==', userId))
        const snap = await getDocs(q)
        const sorted = snap.docs.map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
        setUserResources(sorted)
      } catch (err) {
        console.error('Resources load err:', err)
      }
    }
    loadResources()
  }, [userId])

  // Follow stats + following status
  useEffect(() => {
    if (!userId) return
    getFollowStats(userId).then(setFollowStats)
    if (currentUser) {
      isFollowing(currentUser.uid, userId).then(setIsFollowingUser)
    }
  }, [userId, currentUser])

  async function handleFollow() {
    if (!currentUser) return navigate('/login')
    setFollowLoading(true)
    try {
      if (isFollowingUser) {
        await unfollowUser(currentUser.uid, userId)
        setIsFollowingUser(false)
        setFollowStats(p => ({ ...p, followers: Math.max(0, (p.followers || 0) - 1) }))
      } else {
        await followUser(currentUser.uid, myProfile?.name || currentUser.email, userId)
        setIsFollowingUser(true)
        setFollowStats(p => ({ ...p, followers: (p.followers || 0) + 1 }))
      }
    } catch (err) {
      console.error('Follow error:', err)
    }
    setFollowLoading(false)
  }

  async function handleStartChat() {
    if (!currentUser) return navigate('/login')
    setStartingChat(true)
    try {
      // Check if conversation already exists
      const q = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', currentUser.uid)
      )
      const snap = await getDocs(q)
      const existing = snap.docs.find(d => d.data().participants.includes(userId))
      
      if (existing) {
        navigate('/messaging')
      } else {
        // Create new conversation
        await addDoc(collection(db, 'conversations'), {
          participants: [currentUser.uid, userId],
          participantNames: {
            [currentUser.uid]: myProfile?.name || currentUser.email,
            [userId]: profile?.name || 'User',
          },
          participantPhotos: {
            [currentUser.uid]: myProfile?.profilePhoto || '',
            [userId]: profile?.profilePhoto || '',
          },
          lastMessage: '',
          lastMessageAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        })
        navigate('/messaging')
      }
    } catch (err) {
      console.error('Chat error:', err)
      navigate('/messaging')
    }
    setStartingChat(false)
  }

  const initials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U'
  const timeAgo = (ts) => {
    if (!ts) return ''
    try {
      const s = Math.floor((Date.now() - ts.toDate().getTime()) / 1000)
      if (s < 3600) return `${Math.floor(s / 60)}m ago`
      if (s < 86400) return `${Math.floor(s / 3600)}h ago`
      return `${Math.floor(s / 86400)}d ago`
    } catch { return '' }
  }

  const BADGE_COLORS = { blue: 'bg-blue-500', gold: 'bg-yellow-500', emerald: 'bg-emerald-500', purple: 'bg-purple-500' }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto animate-fade-in flex justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto animate-fade-in">
        <div className="glass-card-solid p-12 text-center">
          <p className="text-surface-500 text-lg font-semibold">User not found</p>
          <button onClick={() => navigate(-1)} className="btn-primary mt-4 py-2 px-6 text-sm inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Go Back
          </button>
        </div>
      </div>
    )
  }

  const name = profile.name || 'User'
  const isVerified = profile.isVerified
  const badgeColor = BADGE_COLORS[profile.verificationColor] || 'bg-blue-500'

  const tabs = [
    { id: 'posts', label: `Posts (${userPosts.length})` },
    { id: 'resources', label: `Resources (${userResources.length})` },
    { id: 'about', label: 'About' },
  ]

  return (
    <div className="max-w-4xl mx-auto animate-fade-in pb-20">
      {/* Back Button */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-700 mb-4 transition-colors group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> Back
      </button>

      {/* Header Card */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-6 shadow-sm">
        {/* Cover */}
        <div className="h-40 sm:h-48 bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 relative">
          <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djZoLTJ2LTZoMnptMC0xMHY2aC0ydi02aDJ6bTAtMTB2NmgtMlY0aDJ6Ii8+PC9nPjwvZz48L3N2Zz4=')]" />
          {/* Decorative glows */}
          <div className="absolute top-[-30%] right-[10%] w-48 h-48 bg-cyan-400/20 rounded-full blur-[60px]" />
          <div className="absolute bottom-[-20%] left-[15%] w-56 h-56 bg-pink-400/20 rounded-full blur-[60px]" />
        </div>

        <div className="px-5 sm:px-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-14 relative z-10">
            {/* Avatar */}
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl ring-4 ring-white shadow-lg overflow-hidden bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-3xl sm:text-4xl font-bold shrink-0">
              {profile.profilePhoto
                ? <img src={profile.profilePhoto} alt="" className="w-full h-full object-cover" />
                : initials(name)
              }
            </div>

            <div className="flex-1 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 flex items-center gap-2 flex-wrap">
                    {name}
                    {isVerified && (
                      <span className={`w-5 h-5 text-white rounded-full flex items-center justify-center text-[10px] shadow-sm shrink-0 ${badgeColor}`}>✓</span>
                    )}
                  </h1>
                  <p className="text-slate-600 flex items-center gap-2 mt-0.5 text-sm flex-wrap">
                    <BookOpen className="w-4 h-4" />
                    {profile.subject ? `${profile.subject} Teacher` : profile.role === 'school' ? 'School' : 'Educator'}
                    {profile.location && (
                      <><span className="text-slate-300">·</span><MapPin className="w-4 h-4" /> {profile.location}</>
                    )}
                  </p>
                </div>

                {/* Action Buttons */}
                {!isOwnProfile && (
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={handleFollow}
                      disabled={followLoading}
                      className={`py-2 px-5 text-sm font-bold rounded-xl transition-all flex items-center gap-2 active:scale-[0.97] ${
                        isFollowingUser
                          ? 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
                          : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200'
                      }`}
                    >
                      {followLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : isFollowingUser ? (
                        <UserMinus className="w-4 h-4" />
                      ) : (
                        <UserPlus className="w-4 h-4" />
                      )}
                      {isFollowingUser ? 'Unfollow' : 'Follow'}
                    </button>
                    <button
                      onClick={handleStartChat}
                      disabled={startingChat}
                      className="py-2 px-4 text-sm font-bold rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all flex items-center gap-2 active:scale-[0.97]"
                    >
                      {startingChat ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                      Chat
                    </button>
                  </div>
                )}
                {isOwnProfile && (
                  <button onClick={() => navigate('/profile')} className="py-2 px-4 text-sm font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-200">
                    Edit Profile
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            {[
              { label: 'Posts', value: userPosts.length },
              { label: 'Resources', value: userResources.length },
              { label: 'Followers', value: followStats.followers || 0 },
              { label: 'Following', value: followStats.following || 0 },
            ].map(stat => (
              <div key={stat.label} className="text-center p-3 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-lg sm:text-xl font-extrabold text-slate-900">{stat.value}</p>
                <p className="text-xs font-semibold text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bio */}
      {profile.bio && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 shadow-sm">
          <p className="text-sm text-slate-700 leading-relaxed">{profile.bio}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            {profile.subject && <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold border border-indigo-100">{profile.subject}</span>}
            {profile.experience && <span className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-bold border border-amber-100">{profile.experience} Experience</span>}
            {profile.qualification && <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold border border-emerald-100">{profile.qualification}</span>}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 sm:gap-2 bg-white/60 backdrop-blur-xl p-1.5 rounded-full border border-white mb-8 shadow-sm max-w-md mx-auto relative z-10">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 px-3 sm:px-4 rounded-full text-xs sm:text-sm font-bold tracking-wide transition-all duration-300 ${
              activeTab === tab.id ? 'bg-white text-indigo-700 shadow-[0_4px_16px_rgba(0,0,0,0.06)]' : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Posts Tab */}
      {activeTab === 'posts' && (
        <div className="space-y-4 animate-fade-in">
          {loadingPosts && <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>}
          {!loadingPosts && userPosts.length === 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No posts yet</p>
            </div>
          )}
          {userPosts.map(post => (
            <div key={post.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-slate-300 transition-all">
              <p className="text-sm text-slate-800 whitespace-pre-line leading-relaxed">{post.content}</p>
              {post.attachmentType === 'image' && post.attachmentUrl && (
                <img src={post.attachmentUrl} alt="post" className="w-full rounded-xl mt-3 max-h-[400px] object-cover" />
              )}
              {post.attachmentType === 'youtube' && post.attachmentUrl && (
                <div className="relative w-full overflow-hidden rounded-xl mt-3" style={{ paddingTop: '56.25%' }}>
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
                <div className="flex items-center gap-3 p-3.5 bg-indigo-50 rounded-xl border border-indigo-100 mt-3">
                  <FileText className="w-5 h-5 text-indigo-600 shrink-0" />
                  <p className="text-sm font-bold text-slate-800 truncate flex-1">{post.attachmentName || 'Document'}</p>
                  <a href={post.attachmentUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors shrink-0">
                    <Download className="w-3.5 h-3.5" /> Download
                  </a>
                </div>
              )}
              <div className="flex items-center justify-between mt-3 text-xs text-slate-400 font-medium">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5 text-rose-400" /> {(post.likes || []).length} likes</span>
                  <span>{post.commentsCount || 0} comments</span>
                </div>
                <span>{timeAgo(post.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resources Tab */}
      {activeTab === 'resources' && (
        <div className="space-y-3 animate-fade-in">
          {userResources.length === 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No resources shared yet</p>
            </div>
          )}
          {userResources.map(res => (
            <div key={res.id} className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-sm hover:border-slate-300 transition-all">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-indigo-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
                  {res.format || 'FILE'}
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-900">{res.title}</p>
                  <p className="text-xs text-slate-500">{res.downloads || 0} downloads</p>
                </div>
              </div>
              <a href={res.fileUrl} target="_blank" rel="noreferrer" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <Download className="w-5 h-5 text-indigo-600" />
              </a>
            </div>
          ))}
        </div>
      )}

      {/* About Tab */}
      {activeTab === 'about' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-sm animate-fade-in">
          {profile.qualification && (
            <div>
              <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-indigo-600" /> Education
              </h3>
              <p className="text-sm text-slate-700">{profile.qualification}</p>
            </div>
          )}
          {profile.experience && (
            <div>
              <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-600" /> Experience
              </h3>
              <p className="text-sm text-slate-700">{profile.experience} teaching experience</p>
            </div>
          )}
          {profile.subject && (
            <div>
              <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" /> Subject
              </h3>
              <p className="text-sm text-slate-700">{profile.subject}</p>
            </div>
          )}
          {profile.location && (
            <div>
              <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-indigo-600" /> Location
              </h3>
              <p className="text-sm text-slate-700">{profile.location}</p>
            </div>
          )}
          <div>
            <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Mail className="w-5 h-5 text-indigo-600" /> Contact
            </h3>
            <p className="text-sm text-slate-700">{profile.email || 'Not available'}</p>
          </div>
        </div>
      )}
    </div>
  )
}
