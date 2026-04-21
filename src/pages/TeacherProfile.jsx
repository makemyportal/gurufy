import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../utils/firebase'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { uploadToCloudinary } from '../utils/cloudinary'
import { 
  MapPin, BookOpen, Camera, Mail, 
  GraduationCap, Clock, Loader2, Save, FileDown, User, Settings, CheckCircle2,
  Trophy, Sparkles, Star, Zap, Info, Coins
} from 'lucide-react'
import { useGamification, getLevelProgress, BADGE_DEFS, getLevel } from '../contexts/GamificationContext'
import TokenShopModal from '../components/TokenShopModal'

export default function TeacherProfile() {
  const { currentUser, userProfile, fetchUserProfile } = useAuth()
  const { stats } = useGamification()
  const level = getLevel(stats?.xp || 0)
  const [activeTab, setActiveTab] = useState('overview')
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [showShop, setShowShop] = useState(false)

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

  async function handleSave(e) {
    e.preventDefault()
    if (!currentUser) return
    setSaving(true)
    setSavedSuccess(false)
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        ...form,
        updatedAt: serverTimestamp()
      })
      await updateDoc(doc(db, 'teachers', currentUser.uid), {
        subject: form.subject,
        qualification: form.qualification,
        experience: form.experience,
        bio: form.bio
      }).catch(() => {})
      await fetchUserProfile(currentUser.uid)
      setSavedSuccess(true)
      setTimeout(() => setSavedSuccess(false), 3000)
    } catch (err) {
      console.error('Save error:', err)
      alert('Failed to update account preferences.')
    } finally {
      setSaving(false)
    }
  }

  const name = userProfile?.name || currentUser?.email?.split('@')[0] || 'Teacher'
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  function generateResume() {
    const p = userProfile || {}
    const email = currentUser?.email || ''
    const photoUrl = p.profilePhoto || ''

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
  .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: white; padding: 48px 48px 36px; position: relative; overflow: hidden; }
  .header-content { position: relative; z-index: 1; display: flex; gap: 28px; align-items: center; }
  .avatar { width: 110px; height: 110px; border-radius: 20px; border: 4px solid rgba(255,255,255,0.3); object-fit: cover; flex-shrink: 0; }
  .avatar-placeholder { width: 110px; height: 110px; border-radius: 20px; border: 4px solid rgba(255,255,255,0.3); background: rgba(255,255,255,0.15); display: flex; align-items: center; justify-content: center; font-size: 40px; font-weight: 800; color: white; flex-shrink: 0; }
  .name { font-size: 32px; font-weight: 900; letter-spacing: -0.5px; margin-bottom: 4px; }
  .tagline { font-size: 16px; font-weight: 500; opacity: 0.9; }
  .contact-row { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 12px; font-size: 13px; opacity: 0.85; }
  .contact-item { display: flex; align-items: center; gap: 6px; }
  .body { padding: 36px 48px 48px; }
  .section { margin-bottom: 28px; }
  .section-title { font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #3b82f6; margin-bottom: 14px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; }
  .summary { font-size: 15px; line-height: 1.7; color: #475569; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .info-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; }
  .info-label { font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
  .info-value { font-size: 15px; font-weight: 700; color: #1e293b; }
  .footer { text-align: center; padding: 20px; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
  .print-btn { position: fixed; bottom: 24px; right: 24px; background: #0f172a; color: white; border: none; padding: 14px 28px; border-radius: 14px; font-size: 15px; font-weight: 700; cursor: pointer; box-shadow: 0 8px 24px rgba(0,0,0,0.2); }
  @media print {
    body { background: white; }
    .print-btn { display: none !important; }
    .page { box-shadow: none; }
    .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .info-card { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
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
  </div>
  <div class="footer">Generated via LDMS Professional Hub • ${new Date().toLocaleDateString()}</div>
</div>
<button class="print-btn" onclick="window.print()">Export Resume as PDF</button>
</body>
</html>`

    const win = window.open('', '_blank')
    win.document.write(html)
    win.document.close()
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up py-4 sm:py-8">
      
      {/* Premium Profile Header */}
      <div className="bg-white rounded-[32px] border border-surface-200 overflow-hidden shadow-lg mb-8">
        {/* Gradient Banner */}
        <div className="h-40 sm:h-48 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-700" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-60" />
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl -mr-40 -mt-40" />
          <div className="absolute bottom-0 left-0 w-60 h-60 bg-purple-400/20 rounded-full blur-3xl -ml-20 -mb-20" />
          
          {/* Level badge on banner */}
          <div className="absolute top-4 right-4 bg-white/15 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-2 text-white">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Level</p>
            <p className="text-lg font-black">{level.emoji} {level.name}</p>
          </div>
        </div>

        <div className="px-6 sm:px-8 pb-6">
          {/* Avatar + Name Row */}
          <div className="flex flex-col sm:flex-row sm:items-end gap-5 -mt-16 relative z-10">
            <div className="relative group shrink-0">
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl ring-4 ring-white shadow-xl overflow-hidden bg-white">
                {userProfile?.profilePhoto
                  ? <img src={userProfile.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-500 text-4xl font-black font-display">{initials}</div>
                }
              </div>
              <label className="absolute inset-0 rounded-3xl bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                {uploadingPhoto
                  ? <Loader2 className="w-7 h-7 text-white animate-spin" />
                  : <Camera className="w-7 h-7 text-white" />}
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </label>
              {userProfile?.isVerified && (
                <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-blue-500 rounded-xl flex items-center justify-center border-2 border-white shadow-md">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
            
            <div className="flex-1 pb-1">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-surface-900 tracking-tight">{name}</h1>
                  <p className="text-surface-500 font-medium text-sm flex flex-wrap items-center gap-2 mt-1">
                    <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> {userProfile?.subject || 'Educator'}</span>
                    <span className="text-surface-300">•</span>
                    <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {currentUser?.email}</span>
                    {userProfile?.location && <>
                      <span className="text-surface-300">•</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {userProfile.location}</span>
                    </>}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={generateResume} className="px-4 py-2.5 bg-surface-100 hover:bg-surface-200 text-surface-700 text-sm font-bold rounded-xl transition-all flex items-center gap-2">
                    <FileDown className="w-4 h-4" /> Resume
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Strip */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/50 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-amber-700">{stats?.coins || 0}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mt-1">🪙 Coins</p>
            </div>
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200/50 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-indigo-700">{stats?.xp || 0}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mt-1">⚡ XP</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200/50 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-emerald-700">{stats?.badges?.length || 0}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mt-1">🏅 Badges</p>
            </div>
            <button onClick={() => setShowShop(true)} className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-4 text-center text-white hover:from-purple-400 hover:to-indigo-500 transition-all shadow-md hover:shadow-lg group">
              <p className="text-lg font-black group-hover:scale-110 transition-transform">🛒</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/80 mt-1">Buy Coins</p>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-surface-200 mb-8 px-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-4 text-sm font-bold transition-all relative ${
            activeTab === 'overview' ? 'text-blue-600' : 'text-surface-400 hover:text-surface-600'
          }`}
        >
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" /> Overview
          </div>
          {activeTab === 'overview' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />}
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`pb-4 text-sm font-bold transition-all relative ${
            activeTab === 'settings' ? 'text-blue-600' : 'text-surface-400 hover:text-surface-600'
          }`}
        >
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4" /> Profile Settings
          </div>
          {activeTab === 'settings' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />}
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid md:grid-cols-3 gap-6 animate-fade-in">
          <div className="md:col-span-2 space-y-6">
            {/* Bio Card */}
            <div className="bg-white rounded-[24px] p-6 shadow-sm border border-surface-200">
              <h3 className="text-lg font-bold text-surface-900 mb-4">Professional Bio</h3>
              <p className="text-surface-600 leading-relaxed min-h-[80px]">
                {userProfile?.bio || "You haven't written a professional bio yet. Click over to Profile Settings to update your information."}
              </p>
            </div>

            {/* Level Progress Card */}
            <div className="bg-white rounded-[24px] p-6 shadow-sm border border-surface-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-surface-900 flex items-center gap-2"><Star className="w-5 h-5 text-indigo-500" /> Level Progress</h3>
                <span className="text-sm font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg">{level.emoji} {level.name}</span>
              </div>
              <div className="w-full bg-surface-100 rounded-full h-4 overflow-hidden mb-2">
                <div className="bg-gradient-to-r from-indigo-500 to-violet-500 h-full rounded-full transition-all duration-500" style={{ width: `${getLevelProgress(stats.xp)}%` }} />
              </div>
              <p className="text-xs font-semibold text-surface-400 text-right">{getLevelProgress(stats.xp)}% to next rank</p>
            </div>

            {/* Earn & Spend Guide */}
            <div className="bg-white rounded-[24px] p-6 shadow-sm border border-surface-200">
              <h3 className="text-lg font-bold text-surface-900 flex items-center gap-2 mb-5"><Info className="w-5 h-5 text-amber-500" /> Coin Economy</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-emerald-50 border border-emerald-200/50 rounded-2xl p-4">
                  <p className="text-xs font-black uppercase tracking-widest text-emerald-600 mb-3">How to Earn</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between"><span className="font-medium text-surface-700">Daily Login</span><span className="font-black text-emerald-600">+5 🪙</span></div>
                    <div className="flex items-center justify-between"><span className="font-medium text-surface-700">Upload Resource</span><span className="font-black text-emerald-600">+15 🪙</span></div>
                    <div className="flex items-center justify-between"><span className="font-medium text-surface-700">Buy from Store</span><span className="font-black text-emerald-600">💰</span></div>
                  </div>
                </div>
                <div className="bg-amber-50 border border-amber-200/50 rounded-2xl p-4">
                  <p className="text-xs font-black uppercase tracking-widest text-amber-600 mb-3">Where Coins Are Spent</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between"><span className="font-medium text-surface-700">AI Tools</span><span className="font-black text-amber-600">-5 🪙</span></div>
                    <div className="flex items-center justify-between"><span className="font-medium text-surface-700">Workspace Tools</span><span className="font-black text-amber-600">-5 🪙</span></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Badges */}
            {stats.badges?.length > 0 && (
              <div className="bg-white rounded-[24px] p-6 shadow-sm border border-surface-200">
                <h3 className="text-lg font-bold text-surface-900 flex items-center gap-2 mb-4"><Sparkles className="w-5 h-5 text-amber-400" /> Earned Badges</h3>
                <div className="flex flex-wrap gap-3">
                  {stats.badges.map(bId => {
                    const b = BADGE_DEFS[bId]
                    if (!b) return null
                    return (
                      <div key={bId} className="flex items-center gap-2 bg-surface-50 hover:bg-surface-100 border border-surface-200 rounded-2xl px-4 py-2.5 transition-colors" title={b.desc}>
                        <span className="text-xl">{b.emoji}</span>
                        <span className="text-sm font-bold text-surface-800">{b.name}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
          
          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-[24px] p-6 shadow-sm border border-surface-200">
              <h3 className="text-sm font-black uppercase tracking-widest text-surface-400 mb-5">Professional Details</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl"><GraduationCap className="w-5 h-5" /></div>
                  <div><p className="text-xs font-bold uppercase text-surface-400">Education</p><p className="text-sm font-semibold text-surface-900">{userProfile?.qualification || 'Not specified'}</p></div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl"><BookOpen className="w-5 h-5" /></div>
                  <div><p className="text-xs font-bold uppercase text-surface-400">Subject</p><p className="text-sm font-semibold text-surface-900">{userProfile?.subject || 'Not specified'}</p></div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl"><Clock className="w-5 h-5" /></div>
                  <div><p className="text-xs font-bold uppercase text-surface-400">Experience</p><p className="text-sm font-semibold text-surface-900">{userProfile?.experience || 'Not specified'}</p></div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl"><MapPin className="w-5 h-5" /></div>
                  <div><p className="text-xs font-bold uppercase text-surface-400">Location</p><p className="text-sm font-semibold text-surface-900">{userProfile?.location || 'Not specified'}</p></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSave} className="bg-white rounded-[24px] p-6 sm:p-10 shadow-sm border border-surface-200 animate-fade-in max-w-3xl">
          <div className="mb-8">
            <h2 className="text-xl font-extrabold font-display text-surface-900 mb-2">Edit Account Information</h2>
            <p className="text-surface-500 font-medium text-sm">Update your public credentials and professional details.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-surface-500 px-1">Full Name</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="w-full px-4 py-3 bg-surface-50 border border-surface-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all" placeholder="Your name" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-surface-500 px-1">Location</label>
              <input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} className="w-full px-4 py-3 bg-surface-50 border border-surface-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all" placeholder="e.g. New York, NY" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-surface-500 px-1">Subject Expertise</label>
              <input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} className="w-full px-4 py-3 bg-surface-50 border border-surface-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all" placeholder="e.g. Mathematics" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-surface-500 px-1">Qualification</label>
              <input value={form.qualification} onChange={e => setForm(p => ({ ...p, qualification: e.target.value }))} className="w-full px-4 py-3 bg-surface-50 border border-surface-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all" placeholder="e.g. M.Sc., B.Ed." />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold uppercase tracking-widest text-surface-500 px-1">Years of Experience</label>
              <input value={form.experience} onChange={e => setForm(p => ({ ...p, experience: e.target.value }))} className="w-full px-4 py-3 bg-surface-50 border border-surface-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all" placeholder="e.g. 5 Years" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold uppercase tracking-widest text-surface-500 px-1">Professional Bio</label>
              <textarea value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} className="w-full px-4 py-3 bg-surface-50 border border-surface-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all resize-y min-h-[120px]" placeholder="Tell us about your teaching philosophy..." />
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-surface-100 flex items-center justify-between">
            <div>
              {savedSuccess && <div className="flex items-center gap-2 text-emerald-600 text-sm font-bold bg-emerald-50 px-3 py-1.5 rounded-lg"><CheckCircle2 className="w-4 h-4" /> Saved Successfully</div>}
            </div>
            <button type="submit" disabled={saving} className="px-6 py-3 bg-slate-900 hover:bg-black text-white text-sm font-bold rounded-xl transition-all shadow-md flex items-center gap-2 disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Preferences
            </button>
          </div>
        </form>
      )}

      {showShop && <TokenShopModal onClose={() => setShowShop(false)} />}
    </div>
  )
}
