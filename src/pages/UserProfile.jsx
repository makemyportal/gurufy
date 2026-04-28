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

      {/* ── Premium Header Card ── */}
      <div className="bg-white border border-slate-200/80 rounded-[28px] overflow-hidden mb-8 shadow-xl shadow-slate-200/50">
        {/* Cinematic Cover */}
        <div className="h-44 sm:h-56 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-80" />
          <div className="absolute top-[-40%] right-[-5%] w-[500px] h-[500px] bg-indigo-500/25 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-30%] left-[-5%] w-[400px] h-[400px] bg-violet-500/20 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-20%] right-[30%] w-[300px] h-[300px] bg-cyan-400/10 rounded-full blur-[80px]" />
          
          {/* Role badge on cover */}
          <div className="absolute top-5 right-5 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl px-4 py-2 flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-indigo-300" />
            <span className="text-sm font-bold text-white/90 capitalize">{profile.role === 'school' ? 'School' : 'Educator'}</span>
          </div>
        </div>

        <div className="px-6 sm:px-8 pb-7">
          <div className="flex flex-col sm:flex-row sm:items-end gap-5 -mt-16 sm:-mt-20 relative z-10">
            {/* Avatar with glow ring */}
            <div className="relative shrink-0">
              <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-[28px] ring-[5px] ring-white shadow-2xl overflow-hidden bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-4xl sm:text-5xl font-black shrink-0">
                {profile.profilePhoto
                  ? <img src={profile.profilePhoto} alt="" className="w-full h-full object-cover" />
                  : initials(name)
                }
              </div>
              {isVerified && (
                <div className={`absolute -bottom-1 -right-1 w-9 h-9 rounded-xl flex items-center justify-center border-[3px] border-white shadow-lg ${badgeColor}`}>
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
              )}
            </div>

            <div className="flex-1 pt-1 sm:pt-3">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5 flex-wrap">
                    {name}
                    {isVerified && (
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Verified
                      </span>
                    )}
                  </h1>
                  <div className="flex items-center gap-3 mt-1.5 text-sm text-slate-500 font-medium flex-wrap">
                    {profile.subject && (
                      <span className="flex items-center gap-1.5"><BookOpen className="w-4 h-4 text-indigo-500" /> {profile.subject}</span>
                    )}
                    {profile.experience && (
                      <><span className="text-slate-300">•</span><span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-amber-500" /> {profile.experience}</span></>
                    )}
                    {profile.location && (
                      <><span className="text-slate-300">•</span><span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-emerald-500" /> {profile.location}</span></>
                    )}
                  </div>
                  {profile.qualification && (
                    <div className="mt-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-violet-50 text-violet-700 text-xs font-bold rounded-lg border border-violet-100">
                        <GraduationCap className="w-3.5 h-3.5" /> {profile.qualification}
                      </span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                {!isOwnProfile && (
                  <div className="flex gap-2 flex-wrap shrink-0">
                    <button
                      onClick={handleFollow}
                      disabled={followLoading}
                      className={`py-2.5 px-6 text-sm font-bold rounded-xl transition-all flex items-center gap-2 active:scale-[0.97] ${
                        isFollowingUser
                          ? 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
                          : 'bg-slate-900 text-white hover:bg-black shadow-lg'
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
                      className="py-2.5 px-5 text-sm font-bold rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all flex items-center gap-2 active:scale-[0.97] shadow-sm"
                    >
                      {startingChat ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                      Message
                    </button>
                  </div>
                )}
                {isOwnProfile && (
                  <button onClick={() => navigate('/profile')} className="py-2.5 px-5 text-sm font-bold rounded-xl bg-slate-900 text-white hover:bg-black transition-all flex items-center gap-2 shadow-lg shrink-0">
                    Edit Profile
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Bio Section (inline now) */}
          {profile.bio && (
            <div className="mt-5 p-4 bg-slate-50/80 border border-slate-100 rounded-2xl">
              <p className="text-sm text-slate-600 leading-relaxed">{profile.bio}</p>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-3 mt-6">
            {[
              { label: 'Posts', value: userPosts.length, color: 'from-blue-500 to-indigo-500', bg: 'bg-blue-50', text: 'text-blue-700' },
              { label: 'Resources', value: userResources.length, color: 'from-violet-500 to-purple-500', bg: 'bg-violet-50', text: 'text-violet-700' },
              { label: 'Followers', value: followStats.followers || 0, color: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-50', text: 'text-emerald-700' },
              { label: 'Following', value: followStats.following || 0, color: 'from-amber-500 to-orange-500', bg: 'bg-amber-50', text: 'text-amber-700' },
            ].map(stat => (
              <div key={stat.label} className={`text-center p-3.5 rounded-2xl ${stat.bg} border border-slate-100/50 group hover:scale-[1.03] transition-transform`}>
                <p className={`text-xl sm:text-2xl font-black ${stat.text}`}>{stat.value}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tabs Navigation ── */}
      <div className="flex gap-1 bg-white p-1.5 rounded-2xl border border-slate-200/80 mb-8 shadow-sm max-w-lg">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold tracking-wide transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-slate-900 text-white shadow-lg'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Posts Tab ── */}
      {activeTab === 'posts' && (
        <div className="space-y-5 animate-fade-in">
          {loadingPosts && <div className="flex justify-center py-12"><Loader2 className="w-7 h-7 animate-spin text-indigo-400" /></div>}
          {!loadingPosts && userPosts.length === 0 && (
            <div className="bg-white border border-slate-200/80 rounded-[24px] p-16 text-center shadow-sm">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-lg font-bold text-slate-700">No posts yet</p>
              <p className="text-sm text-slate-400 mt-1">This user hasn't published any posts.</p>
            </div>
          )}
          {userPosts.map(post => (
            <div key={post.id} className="bg-white border border-slate-200/80 rounded-[24px] overflow-hidden shadow-sm hover:shadow-md hover:border-slate-300 transition-all">
              {/* Post Header */}
              <div className="flex items-center gap-3 p-5 pb-0">
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {profile.profilePhoto
                    ? <img src={profile.profilePhoto} alt="" className="w-full h-full object-cover" />
                    : initials(name)
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-slate-900">{name}</p>
                  <p className="text-xs text-slate-400 font-medium">{timeAgo(post.createdAt)}</p>
                </div>
              </div>

              {/* Post Content */}
              <div className="p-5 pt-3">
                <p className="text-[15px] text-slate-800 whitespace-pre-line leading-relaxed">{post.content}</p>
              </div>

              {/* Attachments */}
              {post.attachmentType === 'image' && post.attachmentUrl && (
                <img src={post.attachmentUrl} alt="post" className="w-full max-h-[450px] object-cover" />
              )}
              {post.attachmentType === 'youtube' && post.attachmentUrl && (
                <div className="relative w-full overflow-hidden mx-5 mb-5 rounded-2xl" style={{ paddingTop: '50%', width: 'calc(100% - 40px)' }}>
                  <iframe
                    className="absolute top-0 left-0 w-full h-full rounded-2xl"
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
                <div className="flex items-center gap-3 p-4 mx-5 mb-5 bg-indigo-50 rounded-2xl border border-indigo-100">
                  <FileText className="w-5 h-5 text-indigo-600 shrink-0" />
                  <p className="text-sm font-bold text-slate-800 truncate flex-1">{post.attachmentName || 'Document'}</p>
                  <a href={post.attachmentUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-colors shrink-0">
                    <Download className="w-3.5 h-3.5" /> Download
                  </a>
                </div>
              )}

              {/* Engagement Footer */}
              <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
                  <span className="flex items-center gap-1.5"><Heart className="w-4 h-4 text-rose-400" /> {(post.likes || []).length}</span>
                  <span className="flex items-center gap-1.5"><MessageSquare className="w-4 h-4 text-blue-400" /> {post.commentsCount || 0}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Resources Tab ── */}
      {activeTab === 'resources' && (
        <div className="animate-fade-in">
          {userResources.length === 0 ? (
            <div className="bg-white border border-slate-200/80 rounded-[24px] p-16 text-center shadow-sm">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-lg font-bold text-slate-700">No resources shared</p>
              <p className="text-sm text-slate-400 mt-1">This user hasn't uploaded any resources yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {userResources.map(res => (
                <div key={res.id} className="bg-white border border-slate-200/80 rounded-[20px] p-5 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-black text-xs shrink-0 shadow-md group-hover:scale-110 transition-transform">
                      {res.format || 'FILE'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[15px] text-slate-900 mb-1 truncate">{res.title}</p>
                      {res.description && <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-2">{res.description}</p>}
                      <div className="flex flex-wrap gap-1.5">
                        {res.subject && <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-md uppercase">{res.subject}</span>}
                        {res.type && <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-black rounded-md uppercase">{res.type}</span>}
                        {res.fileSize && <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-md uppercase">{res.fileSize}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                      <Download className="w-3.5 h-3.5" /> {res.downloads || 0} downloads
                    </div>
                    <span className={`text-xs font-black px-2.5 py-1 rounded-lg ${res.coinPrice > 0 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                      {res.coinPrice > 0 ? `🪙 ${res.coinPrice}` : 'Free'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── About Tab ── */}
      {activeTab === 'about' && (
        <div className="animate-fade-in grid sm:grid-cols-2 gap-5">
          {/* Professional Details Card */}
          <div className="bg-white border border-slate-200/80 rounded-[24px] p-6 shadow-sm sm:col-span-2">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-5">Professional Details</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { icon: GraduationCap, label: 'Education', value: profile.qualification, color: 'bg-violet-50 text-violet-600' },
                { icon: Clock, label: 'Experience', value: profile.experience ? `${profile.experience} teaching` : null, color: 'bg-amber-50 text-amber-600' },
                { icon: BookOpen, label: 'Subject Expertise', value: profile.subject, color: 'bg-indigo-50 text-indigo-600' },
                { icon: MapPin, label: 'Location', value: profile.location, color: 'bg-emerald-50 text-emerald-600' },
              ].filter(item => item.value).map(item => (
                <div key={item.label} className="flex items-center gap-4 p-4 bg-slate-50/80 rounded-2xl border border-slate-100">
                  <div className={`p-3 rounded-xl ${item.color} shrink-0`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{item.label}</p>
                    <p className="text-sm font-bold text-slate-900 mt-0.5">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Contact Card */}
          <div className="bg-white border border-slate-200/80 rounded-[24px] p-6 shadow-sm sm:col-span-2">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">Contact Information</h3>
            <div className="flex items-center gap-4 p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50">
              <div className="p-3 bg-blue-100 text-blue-600 rounded-xl shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{profile.email || 'Not available'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
