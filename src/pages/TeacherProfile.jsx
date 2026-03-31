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
  UserPlus, UserMinus, MessageSquare, Trophy, Flame, FileDown
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
    let unsubPosts, unsubRes

    // Posts query - with fallback if composite index not ready
    try {
      const postsQ = query(
        collection(db, 'posts'),
        where('authorId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      )
      unsubPosts = onSnapshot(postsQ, snap => {
        setMyPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        setLoadingPosts(false)
      }, (err) => {
        console.warn('Posts query fallback (no index):', err.message)
        // Fallback: query without orderBy
        const fallbackQ = query(
          collection(db, 'posts'),
          where('authorId', '==', currentUser.uid)
        )
        unsubPosts = onSnapshot(fallbackQ, snap => {
          const sorted = snap.docs.map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
          setMyPosts(sorted)
          setLoadingPosts(false)
        })
      })
    } catch (e) { setLoadingPosts(false) }

    // Resources query - with fallback
    try {
      const resQ = query(
        collection(db, 'resources'),
        where('authorId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      )
      unsubRes = onSnapshot(resQ, snap => {
        setMyResources(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      }, (err) => {
        console.warn('Resources query fallback:', err.message)
        const fallbackQ = query(
          collection(db, 'resources'),
          where('authorId', '==', currentUser.uid)
        )
        unsubRes = onSnapshot(fallbackQ, snap => {
          const sorted = snap.docs.map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
          setMyResources(sorted)
        })
      })
    } catch (e) { /* silent */ }

    return () => { unsubPosts?.(); unsubRes?.() }
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
  const BADGE_COLORS = { blue: 'bg-blue-500', gold: 'bg-yellow-500', emerald: 'bg-emerald-500', purple: 'bg-purple-500' }

  const tabs = [
    { id: 'posts', label: `Posts (${myPosts.length})` },
    { id: 'resources', label: `Resources (${myResources.length})` },
    { id: 'about', label: 'About' },
  ]

  function generateResume() {
    const p = userProfile || {}
    const email = currentUser?.email || ''
    const photoUrl = p.profilePhoto || ''
    const badgeList = (stats.badges || []).map(b => {
      const labels = { first_post: '🏅 First Post', ten_posts: '🌟 10 Posts', commenter: '💬 Active Commenter', streak_7: '🔥 7-Day Streak', resource_sharer: '📚 Resource Sharer', helpful: '🤝 Helpful', explorer: '🧭 Explorer' }
      return labels[b] || b
    })

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${p.name || 'Teacher'} - Resume</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', sans-serif; background: #f8fafc; color: #1e293b; }
  .page { max-width: 800px; margin: 0 auto; background: white; min-height: 100vh; }
  .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #ec4899 100%); color: white; padding: 48px 48px 36px; position: relative; overflow: hidden; }
  .header::after { content: ''; position: absolute; top: 0; right: 0; bottom: 0; left: 0; background: url("data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='20' cy='20' r='1.5' fill='white' fill-opacity='0.08'/%3E%3C/svg%3E"); }
  .header-content { position: relative; z-index: 1; display: flex; gap: 28px; align-items: center; }
  .avatar { width: 110px; height: 110px; border-radius: 20px; border: 4px solid rgba(255,255,255,0.3); object-fit: cover; flex-shrink: 0; }
  .avatar-placeholder { width: 110px; height: 110px; border-radius: 20px; border: 4px solid rgba(255,255,255,0.3); background: rgba(255,255,255,0.15); display: flex; align-items: center; justify-content: center; font-size: 40px; font-weight: 800; color: white; flex-shrink: 0; }
  .name { font-size: 32px; font-weight: 900; letter-spacing: -0.5px; margin-bottom: 4px; }
  .tagline { font-size: 16px; font-weight: 500; opacity: 0.9; }
  .contact-row { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 12px; font-size: 13px; opacity: 0.85; }
  .contact-item { display: flex; align-items: center; gap: 6px; }
  .body { padding: 36px 48px 48px; }
  .section { margin-bottom: 28px; }
  .section-title { font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #6366f1; margin-bottom: 14px; padding-bottom: 8px; border-bottom: 2px solid #e0e7ff; display: flex; align-items: center; gap: 8px; }
  .section-title::before { content: ''; width: 4px; height: 18px; background: linear-gradient(to bottom, #6366f1, #ec4899); border-radius: 2px; }
  .summary { font-size: 15px; line-height: 1.7; color: #475569; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .info-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; }
  .info-label { font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
  .info-value { font-size: 15px; font-weight: 700; color: #1e293b; }
  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
  .stat-card { background: linear-gradient(135deg, #eef2ff, #fdf2f8); border: 1px solid #e0e7ff; border-radius: 12px; padding: 16px; text-align: center; }
  .stat-value { font-size: 24px; font-weight: 900; color: #4f46e5; }
  .stat-label { font-size: 11px; font-weight: 600; color: #6b7280; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.5px; }
  .badge-grid { display: flex; flex-wrap: wrap; gap: 8px; }
  .badge { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 20px; padding: 6px 14px; font-size: 13px; font-weight: 600; color: #166534; }
  .footer { text-align: center; padding: 20px; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
  .print-btn { position: fixed; bottom: 24px; right: 24px; background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white; border: none; padding: 14px 28px; border-radius: 14px; font-size: 15px; font-weight: 700; cursor: pointer; box-shadow: 0 8px 24px rgba(79,70,229,0.4); display: flex; align-items: center; gap: 8px; z-index: 100; }
  .print-btn:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(79,70,229,0.5); }
  @media print {
    body { background: white; }
    .print-btn { display: none !important; }
    .page { box-shadow: none; }
    .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .stat-card, .info-card, .badge { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="header-content">
      ${photoUrl ? `<img src="${photoUrl}" class="avatar" alt="">` : `<div class="avatar-placeholder">${(p.name || 'T').split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2)}</div>`}
      <div>
        <div class="name">${p.name || 'Teacher'}</div>
        <div class="tagline">${p.subject ? p.subject + ' Teacher' : 'Educator'} ${p.qualification ? '• ' + p.qualification : ''}</div>
        <div class="contact-row">
          ${email ? '<div class="contact-item">📧 ' + email + '</div>' : ''}
          ${p.phone ? '<div class="contact-item">📱 ' + p.phone + '</div>' : ''}
          ${p.location ? '<div class="contact-item">📍 ' + p.location + '</div>' : ''}
        </div>
      </div>
    </div>
  </div>
  <div class="body">
    ${p.bio ? `<div class="section"><div class="section-title">Professional Summary</div><p class="summary">${p.bio}</p></div>` : ''}

    <div class="section">
      <div class="section-title">Professional Details</div>
      <div class="grid-2">
        ${p.qualification ? '<div class="info-card"><div class="info-label">Qualification</div><div class="info-value">' + p.qualification + '</div></div>' : ''}
        ${p.experience ? '<div class="info-card"><div class="info-label">Experience</div><div class="info-value">' + p.experience + '</div></div>' : ''}
        ${p.subject ? '<div class="info-card"><div class="info-label">Subject Expertise</div><div class="info-value">' + p.subject + '</div></div>' : ''}
        ${p.location ? '<div class="info-card"><div class="info-label">Location</div><div class="info-value">' + p.location + '</div></div>' : ''}
      </div>
    </div>

    <div class="section">
      <div class="section-title">Platform Statistics</div>
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-value">${myPosts.length}</div><div class="stat-label">Posts</div></div>
        <div class="stat-card"><div class="stat-value">${myResources.length}</div><div class="stat-label">Resources</div></div>
        <div class="stat-card"><div class="stat-value">${followStats.followers || 0}</div><div class="stat-label">Followers</div></div>
        <div class="stat-card"><div class="stat-value">${stats.xp || 0}</div><div class="stat-label">Total XP</div></div>
      </div>
    </div>

    ${badgeList.length > 0 ? `<div class="section"><div class="section-title">Achievements & Badges</div><div class="badge-grid">${badgeList.map(b => '<div class="badge">' + b + '</div>').join('')}</div></div>` : ''}

    ${stats.streak > 0 ? `<div class="section"><div class="section-title">Consistency</div><p class="summary">🔥 Maintained a <strong>${stats.streak}-day</strong> active streak on the platform, demonstrating dedication and consistent engagement with the teaching community.</p></div>` : ''}
  </div>
  <div class="footer">Generated from LDMS – Learning & Development Management System • ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
</div>
<button class="print-btn" onclick="window.print()">🖨️ Print / Save PDF</button>
</body>
</html>`

    const win = window.open('', '_blank')
    win.document.write(html)
    win.document.close()
  }

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
                  <h1 className="text-xl sm:text-2xl font-bold font-display text-surface-900 flex items-center gap-2 flex-wrap">
                    {name}
                    {userProfile?.isVerified && (
                      <span className={`w-4 h-4 text-white rounded-full flex items-center justify-center text-[10px] shadow-sm shrink-0 ${BADGE_COLORS[userProfile.verificationColor] || 'bg-blue-500'}`}>✓</span>
                    )}
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
                      <button onClick={generateResume} className="py-2 px-4 text-sm flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl transition-all shadow-lg" title="Generate Resume">
                        <FileDown className="w-4 h-4" /> Resume
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
