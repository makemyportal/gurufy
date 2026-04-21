import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../utils/firebase'
import {
  collection, query, where, onSnapshot, orderBy,
  doc, updateDoc, serverTimestamp
} from 'firebase/firestore'
import { uploadToCloudinary } from '../utils/cloudinary'
import {
  MapPin, Phone, Globe, Mail, Users, Briefcase,
  Edit3, Building2, Camera, Loader2, Save, X,
  Trophy, Sparkles, Star, Zap, Info
} from 'lucide-react'
import { useGamification, getLevelProgress, BADGE_DEFS, getLevel } from '../contexts/GamificationContext'
import TokenShopModal from '../components/TokenShopModal'

export default function SchoolProfile() {
  const { currentUser, userProfile, fetchUserProfile } = useAuth()
  const { stats } = useGamification()
  const level = getLevel(stats?.xp || 0)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [showShop, setShowShop] = useState(false)

  const [form, setForm] = useState({
    schoolName: '',
    contactPerson: '',
    address: '',
    phone: '',
    website: '',
    about: '',
    location: '',
  })

  useEffect(() => {
    if (userProfile) {
      setForm({
        schoolName: userProfile.schoolName || userProfile.name || '',
        contactPerson: userProfile.contactPerson || '',
        address: userProfile.address || '',
        phone: userProfile.phone || '',
        website: userProfile.website || '',
        about: userProfile.about || '',
        location: userProfile.location || '',
      })
    }
  }, [userProfile])


  async function handleLogoUpload(e) {
    const file = e.target.files[0]
    if (!file || !currentUser) return
    setUploadingLogo(true)
    try {
      const result = await uploadToCloudinary(file)
      await updateDoc(doc(db, 'users', currentUser.uid), { profilePhoto: result.url })
      await fetchUserProfile(currentUser.uid)
    } catch (err) {
      console.error('Logo upload error:', err)
      alert('Failed to upload logo.')
    } finally {
      setUploadingLogo(false)
    }
  }

  async function handleSave() {
    if (!currentUser) return
    setSaving(true)
    try {
      const updateData = {
        name: form.schoolName,
        schoolName: form.schoolName,
        contactPerson: form.contactPerson,
        address: form.address,
        phone: form.phone,
        website: form.website,
        about: form.about,
        location: form.location,
        updatedAt: serverTimestamp()
      }
      await updateDoc(doc(db, 'users', currentUser.uid), updateData)
      await updateDoc(doc(db, 'schools', currentUser.uid), {
        schoolName: form.schoolName,
        contactPerson: form.contactPerson,
        address: form.address,
        phone: form.phone,
        website: form.website,
        about: form.about,
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

  const schoolName = userProfile?.schoolName || userProfile?.name || 'School'
  const initials = schoolName.slice(0, 2).toUpperCase()
  const BADGE_COLORS = { blue: 'bg-blue-500', gold: 'bg-yellow-500', emerald: 'bg-emerald-500', purple: 'bg-purple-500' }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="glass-card-solid overflow-hidden mb-6">
        <div className="h-40 bg-gradient-to-r from-primary-800 via-primary-700 to-primary-900 relative">
          <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djZoLTJ2LTZoMnptMC0xMHY2aC0ydi02aDJ6bTAtMTB2NmgtMlY0aDJ6Ii8+PC9nPjwvZz48L3N2Zz4=')]" />
        </div>

        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-10">
            <div className="relative group">
              <div className="w-24 h-24 rounded-2xl bg-white flex items-center justify-center ring-4 ring-white shadow-lg overflow-hidden">
                {userProfile?.profilePhoto
                  ? <img src={userProfile.profilePhoto} alt="" className="w-full h-full object-cover" />
                  : <Building2 className="w-12 h-12 text-primary-600" />
                }
              </div>
              <label className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                {uploadingLogo
                  ? <Loader2 className="w-5 h-5 text-white animate-spin" />
                  : <Camera className="w-5 h-5 text-white" />}
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              </label>
            </div>

            <div className="flex-1 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-bold font-display text-surface-900 flex items-center gap-2 flex-wrap">
                    {schoolName}
                    {userProfile?.isVerified && (
                      <span className={`w-4 h-4 text-white rounded-full flex items-center justify-center text-[10px] shadow-sm shrink-0 ${BADGE_COLORS[userProfile.verificationColor] || 'bg-blue-500'}`}>✓</span>
                    )}
                  </h1>
                  <p className="text-surface-600 flex items-center gap-1.5 text-sm">
                    <MapPin className="w-4 h-4" />
                    {userProfile?.location || userProfile?.address || 'Location not set'}
                  </p>
                </div>
                <div className="flex gap-2">
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
                    <button onClick={() => setEditing(true)} className="btn-secondary py-2 px-4 text-sm flex items-center gap-2">
                      <Edit3 className="w-4 h-4" /> Edit Profile
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* GAMIFICATION & ECONOMY DASHBOARD */}
          <div className="mt-8 bg-gradient-to-br from-indigo-900 via-slate-900 to-black rounded-[24px] p-6 sm:p-8 shadow-xl relative overflow-hidden text-white border border-indigo-500/20">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -mr-20 -mt-20"></div>
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-purple-500/20 rounded-full blur-2xl -ml-10 -mb-10"></div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-extrabold flex items-center gap-2"><Building2 className="w-5 h-5 text-amber-400" /> Enterprise Workspace Stats</h3>
                  <p className="text-indigo-200 text-sm mt-1">Level {level.name} • {stats.xp} Total XP</p>
                </div>
                <div className="text-center bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-5 py-3">
                  <p className="text-xs font-bold text-indigo-200 uppercase tracking-widest mb-0.5">Tokens</p>
                  <p className="text-2xl font-black flex justify-center items-center gap-1.5 mb-2"><span className="text-amber-400">🪙</span> {stats.coins}</p>
                  <button onClick={() => setShowShop(true)} className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-amber-950 text-[10px] uppercase tracking-wider font-black rounded-lg transition-colors w-full">Buy / Fund</button>
                </div>
              </div>

              {/* Earn Coins Guide */}
              <div className="bg-indigo-500/10 rounded-2xl p-5 border border-indigo-400/20">
                <h4 className="text-sm font-bold text-white flex items-center gap-2 mb-3"><Info className="w-4 h-4 text-indigo-300" /> Organization Funding</h4>
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-start gap-2 text-indigo-200">
                    <span className="text-emerald-400 font-black">+5</span>
                    <span><strong className="text-white">Daily Login:</strong> Administrative login points.</span>
                  </div>
                  <div className="flex items-start gap-2 text-indigo-200">
                    <span className="text-emerald-400 font-black">+15</span>
                    <span><strong className="text-white">Vault Uploads:</strong> Share internal resources.</span>
                  </div>
                </div>
                <p className="text-xs text-indigo-300 mt-4 border-t border-indigo-400/20 pt-3 flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> Tokens power premium AI tasks, scheduling logic, and institutional automated reports.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      {editing && (
        <div className="glass-card-solid p-6 mb-6 animate-fade-in">
          <h2 className="font-bold text-surface-900 mb-4">Edit School Profile</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-widest text-surface-400">School Name</label>
              <input value={form.schoolName} onChange={e => setForm(p => ({ ...p, schoolName: e.target.value }))} className="input-field" placeholder="School name" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-widest text-surface-400">Contact Person</label>
              <input value={form.contactPerson} onChange={e => setForm(p => ({ ...p, contactPerson: e.target.value }))} className="input-field" placeholder="HR contact name" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-widest text-surface-400">Phone</label>
              <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className="input-field" placeholder="+91 XXXXX XXXXX" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-widest text-surface-400">Website</label>
              <input value={form.website} onChange={e => setForm(p => ({ ...p, website: e.target.value }))} className="input-field" placeholder="www.yourschool.edu.in" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-widest text-surface-400">Location</label>
              <input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} className="input-field" placeholder="City, State" />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-bold uppercase tracking-widest text-surface-400">About the School</label>
              <textarea value={form.about} onChange={e => setForm(p => ({ ...p, about: e.target.value }))} className="input-field resize-none min-h-[80px]" placeholder="Tell teachers about your school..." />
            </div>
          </div>
        </div>
      )}

      {/* About & Contact */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="md:col-span-2 glass-card-solid p-5">
          <h3 className="font-semibold text-surface-900 mb-3">About</h3>
          <p className="text-sm text-surface-700 leading-relaxed">
            {userProfile?.about || 'No description added yet. Click Edit Profile to add information about your school.'}
          </p>
        </div>
        <div className="glass-card-solid p-5 space-y-3">
          <h3 className="font-semibold text-surface-900 mb-3">Contact</h3>
          {userProfile?.phone && (
            <p className="text-sm text-surface-600 flex items-center gap-2"><Phone className="w-4 h-4 text-primary-600" /> {userProfile.phone}</p>
          )}
          <p className="text-sm text-surface-600 flex items-center gap-2"><Mail className="w-4 h-4 text-primary-600" /> {userProfile?.email || currentUser?.email}</p>
          {userProfile?.website && (
            <p className="text-sm text-surface-600 flex items-center gap-2"><Globe className="w-4 h-4 text-primary-600" /> {userProfile.website}</p>
          )}
          {userProfile?.contactPerson && (
            <p className="text-sm text-surface-600 flex items-center gap-2"><Users className="w-4 h-4 text-primary-600" /> {userProfile.contactPerson}</p>
          )}
        </div>
      </div>

      {showShop && <TokenShopModal onClose={() => setShowShop(false)} />}
    </div>
  )
}
