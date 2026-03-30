import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useGamification } from '../contexts/GamificationContext'
import { getLevel, XP_VALUES } from '../contexts/GamificationContext'
import { db } from '../utils/firebase'
import {
  collection, query, where, onSnapshot, orderBy,
  doc, updateDoc, serverTimestamp, addDoc, getDocs
} from 'firebase/firestore'
import { uploadToCloudinary } from '../utils/cloudinary'
import { followUser, unfollowUser, isFollowing, getFollowStats } from '../utils/followHelpers'
import { useNavigate } from 'react-router-dom'
import {
  MapPin, BookOpen, Award, Camera, Mail, Edit3,
  GraduationCap, Clock, Download, Loader2, Save, X, FileText,
  UserPlus, UserMinus, MessageSquare, Trophy, Flame
} from 'lucide-react'

export default function TeacherProfile() {
  const { currentUser, userProfile, fetchUserProfile } = useAuth()
  const { stats, awardXP } = useGamification()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('posts')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [myPosts, setMyPosts] = useState([])
  const [myResources, setMyResources] = useState([])
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [followStats, setFollowStats] = useState({ followers: 0, following: 0 })
  const [isFollowingUser, setIsFollowingUser] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)

  const [form, setForm] = useState({
    name: '',
    subject: '',
    qualification: '',
    experience: '',
    location: '',
    bio: '',
  })

  useEffect(() => {
    if (userProfile) {
      setForm({
        name: userProfile.name || '',
        subject: userProfile.subject || '',
        qualification: userProfile.qualification || '',
        experience: userProfile.experience || '',
        location: userProfile.location || '',
        bio: userProfile.bio || '',
      })
    }
  }, [userProfile])

  // Load my posts from Firestore
  useEffect(() => {
    if (!currentUser) return
    const postsQ = query(
      collection(db, 'posts'),
      where('authorId', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    )
    const unsubPosts = onSnapshot(postsQ, snap => {
      setMyPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoadingPosts(false)
    })

    const resQ = query(
      collection(db, 'resources'),
      where('authorId', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    )
    const unsubRes = onSnapshot(resQ, snap => {
      setMyResources(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })

    return () => { unsubPosts(); unsubRes() }
  }, [currentUser])

  // Load follow stats
  useEffect(() => {
    if (!currentUser) return
    getFollowStats(currentUser.uid).then(setFollowStats)
  }, [currentUser])

  async function handlePhotoUpload(e) {
    const file = e.target.files[0]
    if (!file || !currentUser) return
    setUploadingPhoto(true)
    try {
      const result = await uploadToCloudinary(file)
      await updateDoc(doc(db, 'users', currentUser.uid), { profilePhoto: result.url })
      await fetchUserProfile(currentUser.uid)
    } catch (err) {
      console.error('Photo upload error:', err)
      alert('Failed to upload photo.')
    } finally {
      setUploadingPhoto(false)
    }
  }

  async function handleSave() {
    if (!currentUser) return
    setSaving(true)
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        name: form.name,
        subject: form.subject,
        qualification: form.qualification,
        experience: form.experience,
        location: form.location,
        bio: form.bio,
        updatedAt: serverTimestamp()
      })
      await updateDoc(doc(db, 'teachers', currentUser.uid), {
        subject: form.subject,
        qualification: form.qualification,
        experience: form.experience,
        bio: form.bio
      }).catch(() => {})
      await fetchUserProfile(currentUser.uid)
      setEditing(false)
    } catch (err) {
      console.error('Save error:', err)
      alert('Failed to save profile.')
    } finally {
      setSaving(false)
    }
  }

  async function handleStartChat() {
    // Start a direct conversation, redirecting to messaging
    navigate('/messaging')
  }

  const timeAgo = (ts) => {
    if (!ts) return ''
    try {
      const s = Math.floor((Date.now() - ts.toDate().getTime()) / 1000)
      if (s < 3600) return `${Math.floor(s / 60)}m ago`
      if (s < 86400) return `${Math.floor(s / 3600)}h ago`
      return `${Math.floor(s / 86400)}d ago`
    } catch { return '' }
  }

  const name = userProfile?.name || currentUser?.email?.split('@')[0] || 'Teacher'
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const level = getLevel(stats.xp || 0)

  const tabs = [
    { id: 'posts', label: `Posts (${myPosts.length})` },
    { id: 'resources', label: `Resources (${myResources.length})` },
    { id: 'about', label: 'About' },
  ]

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* Header Card */}
      <div className="glass-card-solid overflow-hidden mb-6">
        <div className="h-48 gradient-bg relative flex-shrink-0">
          <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djZoLTJ2LTZoMnptMC0xMHY2aC0ydi02aDJ6bTAtMTB2NmgtMlY0aDJ6Ii8+PC9nPjwvZz48L3N2Zz4=')]" />
        </div>

        <div className="px-4 sm:px-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12 relative z-10">
            <div className="relative group">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl ring-4 ring-white shadow-lg overflow-hidden">
                {userProfile?.profilePhoto
                  ? <img src={userProfile.profilePhoto} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full gradient-bg flex items-center justify-center text-white text-3xl sm:text-4xl font-bold">{initials}</div>
                }
              </div>
              <label className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                {uploadingPhoto
                  ? <Loader2 className="w-6 h-6 text-white animate-spin" />
                  : <Camera className="w-6 h-6 text-white" />}
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </label>
              {/* Level Badge */}
              <div className="absolute -bottom-1 -right-1 bg-white rounded-full px-2 py-0.5 shadow-md border border-surface-200 flex items-center gap-1">
                <span className="text-sm">{level.emoji}</span>
                <span className="text-[10px] font-extrabold text-surface-700">{level.name}</span>
              </div>
            </div>

            <div className="flex-1 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold font-display text-surface-900 flex items-center gap-2">
                    {name}
                    <span className="text-sm">{level.emoji}</span>
                  </h1>
                  <p className="text-surface-600 flex items-center gap-2 mt-0.5 text-sm flex-wrap">
                    <BookOpen className="w-4 h-4" />
                    {userProfile?.subject ? `${userProfile.subject} Teacher` : 'Teacher'}
                    {userProfile?.location && (
                      <><span className="text-surface-300">·</span><MapPin className="w-4 h-4" /> {userProfile.location}</>
                    )}
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {editing ? (
                    <>
                      <button onClick={() => setEditing(false)} className="btn-secondary py-2 px-4 text-sm flex items-center gap-2">
                        <X className="w-4 h-4" /> Cancel
                      </button>
                      <button onClick={handleSave} disabled={saving} className="btn-primary py-2 px-4 text-sm flex items-center gap-2">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => setEditing(true)} className="btn-secondary py-2 px-4 text-sm flex items-center gap-2">
                        <Edit3 className="w-4 h-4" /> Edit Profile
                      </button>
                      <button onClick={handleStartChat} className="btn-primary py-2 px-3 text-sm flex items-center gap-1.5">
                        <MessageSquare className="w-4 h-4" /> Chat
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6">
            {[
              { label: 'Posts', value: myPosts.length },
              { label: 'Resources', value: myResources.length },
              { label: 'Followers', value: followStats.followers || 0 },
              { label: 'Following', value: followStats.following || 0 },
              { label: 'Total XP', value: stats.xp || 0, highlight: true },
            ].map(stat => (
              <div key={stat.label} className={`text-center p-3 rounded-xl ${stat.highlight ? 'bg-amber-50 border border-amber-200/50' : 'bg-surface-50'}`}>
                <p className={`text-lg sm:text-xl font-bold ${stat.highlight ? 'text-amber-700' : 'text-surface-900'}`}>{stat.value}</p>
                <p className={`text-xs ${stat.highlight ? 'text-amber-600' : 'text-surface-500'}`}>{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Streak & Badges Row */}
          {(stats.streak > 0 || (stats.badges || []).length > 0) && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {stats.streak > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 rounded-full border border-orange-200/50">
                  <Flame className="w-4 h-4 text-orange-500" />
                  <span className="text-xs font-bold text-orange-700">{stats.streak} day streak</span>
                </div>
              )}
              {(stats.badges || []).slice(0, 5).map(badge => (
                <div key={badge} className="flex items-center gap-1 px-2 py-1 bg-surface-50 rounded-full border border-surface-200/50">
                  <span className="text-sm">{({
                    first_post: '📝', ten_posts: '✍️', first_like: '❤️', hundred_likes: '💯',
                    first_resource: '📚', ai_user: '🤖', streak_7: '🔥', streak_30: '💪',
                    social_butterfly: '🦋', connector: '🤝', commenter: '💬'
                  })[badge] || '🏅'}</span>
                </div>
              ))}
              <button onClick={() => navigate('/leaderboard')} className="text-xs font-bold text-primary-600 hover:text-primary-700 px-2 py-1 rounded-lg hover:bg-primary-50 transition-colors">
                View All →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Edit Form */}
      {editing && (
        <div className="glass-card-solid p-6 mb-6 animate-fade-in">
          <h2 className="font-bold text-surface-900 mb-4">Edit Profile</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-widest text-surface-400">Full Name</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="input-field" placeholder="Your name" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-widest text-surface-400">Subject</label>
              <input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} className="input-field" placeholder="e.g. Mathematics" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-widest text-surface-400">Qualification</label>
              <input value={form.qualification} onChange={e => setForm(p => ({ ...p, qualification: e.target.value }))} className="input-field" placeholder="e.g. M.Sc., B.Ed." />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-widest text-surface-400">Experience</label>
              <input value={form.experience} onChange={e => setForm(p => ({ ...p, experience: e.target.value }))} className="input-field" placeholder="e.g. 5 Years" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-widest text-surface-400">Location</label>
              <input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} className="input-field" placeholder="e.g. New Delhi" />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-bold uppercase tracking-widest text-surface-400">Bio</label>
              <textarea value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} className="input-field resize-none min-h-[80px]" placeholder="Tell others about yourself..." />
            </div>
          </div>
        </div>
      )}

      {/* Bio Area */}
      {!editing && userProfile?.bio && (
        <div className="glass-card-solid p-5 mb-6">
          <p className="text-sm text-surface-700 leading-relaxed">{userProfile.bio}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            {userProfile?.subject && <span className="badge-primary">{userProfile.subject}</span>}
            {userProfile?.experience && <span className="badge bg-amber-100 text-amber-700">{userProfile.experience} Experience</span>}
            <span className="badge-success">Available</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 sm:gap-2 bg-white/60 backdrop-blur-xl p-1.5 rounded-full border border-white mb-8 shadow-glass max-w-md mx-auto relative z-10">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 px-3 sm:px-4 rounded-full text-xs sm:text-sm font-bold tracking-wide transition-all duration-300 ${
              activeTab === tab.id ? 'bg-white text-primary-700 shadow-[0_4px_16px_rgba(0,0,0,0.06)]' : 'text-surface-500 hover:text-surface-800 hover:bg-white/40'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Posts Tab */}
      {activeTab === 'posts' && (
        <div className="space-y-4 animate-fade-in">
          {loadingPosts && <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary-400" /></div>}
          {!loadingPosts && myPosts.length === 0 && (
            <div className="glass-card-solid p-12 text-center">
              <p className="text-surface-500">No posts yet. Share something from the Feed!</p>
            </div>
          )}
          {myPosts.map(post => (
            <div key={post.id} className="glass-card-solid p-5">
              <p className="text-sm text-surface-800 whitespace-pre-line">{post.content}</p>
              {post.attachmentType === 'image' && post.attachmentUrl && (
                <img src={post.attachmentUrl} alt="post" className="w-full rounded-xl mt-3 max-h-[400px] object-cover" />
              )}
              <div className="flex items-center justify-between mt-3 text-xs text-surface-500">
                <span>❤️ {(post.likes || []).length} likes</span>
                <span>{timeAgo(post.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resources Tab */}
      {activeTab === 'resources' && (
        <div className="space-y-3 animate-fade-in">
          {myResources.length === 0 && (
            <div className="glass-card-solid p-12 text-center">
              <p className="text-surface-500">No resources uploaded yet. Go to the Resource Library to upload!</p>
            </div>
          )}
          {myResources.map(res => (
            <div key={res.id} className="glass-card-solid p-4 flex items-center justify-between card-hover">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-primary-500 flex items-center justify-center text-white font-bold text-xs">
                  {res.format || 'FILE'}
                </div>
                <div>
                  <p className="font-semibold text-sm text-surface-900">{res.title}</p>
                  <p className="text-xs text-surface-500">{res.downloads || 0} downloads</p>
                </div>
              </div>
              <a href={res.fileUrl} target="_blank" rel="noreferrer" className="p-2 hover:bg-surface-100 rounded-lg transition-colors">
                <Download className="w-5 h-5 text-primary-600" />
              </a>
            </div>
          ))}
        </div>
      )}

      {/* About Tab */}
      {activeTab === 'about' && (
        <div className="glass-card-solid p-6 space-y-6 animate-fade-in">
          {userProfile?.qualification && (
            <div>
              <h3 className="font-semibold text-surface-900 mb-2 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-primary-600" /> Education
              </h3>
              <p className="text-sm text-surface-700">{userProfile.qualification}</p>
            </div>
          )}
          {userProfile?.experience && (
            <div>
              <h3 className="font-semibold text-surface-900 mb-2 flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary-600" /> Experience
              </h3>
              <p className="text-sm text-surface-700">{userProfile.experience} teaching experience</p>
            </div>
          )}
          <div>
            <h3 className="font-semibold text-surface-900 mb-2 flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary-600" /> Contact
            </h3>
            <p className="text-sm text-surface-700">{userProfile?.email || currentUser?.email}</p>
          </div>
        </div>
      )}
    </div>
  )
}
