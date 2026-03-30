import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useLanguage } from '../contexts/LanguageContext'
import { db } from '../utils/firebase'
import { doc, updateDoc, serverTimestamp, deleteDoc, setDoc } from 'firebase/firestore'
import { sendPasswordResetEmail, deleteUser } from 'firebase/auth'
import { auth } from '../utils/firebase'
import { uploadToCloudinary } from '../utils/cloudinary'
import {
  User, Bell, Shield, Palette,
  Save, Loader2, Camera, Check, Lock, Trash2,
  AlertTriangle, LogOut, Sun, Moon, Monitor,
  Globe, Volume2, Eye, EyeOff
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const TABS = [
  { id: 'account', label: 'Account', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'privacy', label: 'Privacy & Security', icon: Shield },
  { id: 'appearance', label: 'Appearance', icon: Palette },
]

const NOTIF_ITEMS = [
  { key: 'emailNotif', label: 'Email Notifications', desc: 'Receive important updates via email' },
  { key: 'pushNotif', label: 'Push Notifications', desc: 'Browser push notifications for real-time updates' },
  { key: 'jobAlerts', label: 'Job Alerts', desc: 'Get notified about new job postings' },
  { key: 'messageNotif', label: 'Message Notifications', desc: 'Alerts for new messages and chat activity' },
  { key: 'likeNotif', label: 'Like Notifications', desc: 'When someone likes your post' },
  { key: 'commentNotif', label: 'Comment Notifications', desc: 'When someone comments on your post' },
]

function Toggle({ on, onToggle }) {
  return (
    <button type="button" onClick={onToggle}
      className={`relative w-11 h-6 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-400 ${on ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}>
      <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 ${on ? 'translate-x-5' : ''}`} />
    </button>
  )
}

export default function Settings() {
  const { currentUser, userProfile, fetchUserProfile, logout } = useAuth()
  const { theme, setThemeMode } = useTheme()
  const { language, setLanguage, t } = useLanguage()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState('account')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' })
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const [form, setForm] = useState({
    name: '', phone: '', location: '', bio: '', subject: '', qualification: '', experience: ''
  })

  const [notifications, setNotifications] = useState({
    emailNotif: true, pushNotif: true, jobAlerts: true,
    messageNotif: true, likeNotif: true, commentNotif: false,
  })

  const [privacy, setPrivacy] = useState({
    profilePublic: true, showEmail: false, showPhone: false,
  })

  useEffect(() => {
    if (userProfile) {
      setForm({
        name: userProfile.name || '',
        phone: userProfile.phone || '',
        location: userProfile.location || '',
        bio: userProfile.bio || userProfile.about || '',
        subject: userProfile.subject || '',
        qualification: userProfile.qualification || '',
        experience: userProfile.experience || '',
      })
      if (userProfile.notifications) setNotifications(p => ({ ...p, ...userProfile.notifications }))
      if (userProfile.privacy) setPrivacy(p => ({ ...p, ...userProfile.privacy }))
    }
  }, [userProfile])

  function showToast(msg, type = 'success') {
    setToast({ show: true, msg, type })
    setTimeout(() => setToast({ show: false, msg: '', type: 'success' }), 3000)
  }

  async function handleSaveAccount(e) {
    e.preventDefault()
    if (!currentUser) return
    setSaving(true)
    try {
      const updates = {
        name: form.name,
        phone: form.phone,
        location: form.location,
        bio: form.bio,
        updatedAt: serverTimestamp(),
      }
      await updateDoc(doc(db, 'users', currentUser.uid), updates)
      // Also update teacher-specific fields
      if (userProfile?.role === 'teacher') {
        await updateDoc(doc(db, 'teachers', currentUser.uid), {
          subject: form.subject,
          qualification: form.qualification,
          experience: form.experience,
          bio: form.bio,
        }).catch(() => {})
      }
      await fetchUserProfile(currentUser.uid)
      showToast('Profile saved successfully!')
    } catch (err) {
      console.error(err)
      showToast('Failed to save. Please try again.', 'error')
    }
    setSaving(false)
  }

  async function handlePhotoChange(e) {
    const file = e.target.files[0]
    if (!file || !currentUser) return
    setUploadingPhoto(true)
    try {
      const result = await uploadToCloudinary(file)
      await updateDoc(doc(db, 'users', currentUser.uid), { profilePhoto: result.url })
      await fetchUserProfile(currentUser.uid)
      showToast('Profile photo updated!')
    } catch {
      showToast('Photo upload failed.', 'error')
    }
    setUploadingPhoto(false)
  }

  async function handleSaveNotifications() {
    if (!currentUser) return
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), { notifications })
      showToast('Notification preferences saved!')
    } catch {
      showToast('Failed to save preferences.', 'error')
    }
  }

  async function handleSavePrivacy() {
    if (!currentUser) return
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), { privacy })
      showToast('Privacy settings saved!')
    } catch {
      showToast('Failed to save settings.', 'error')
    }
  }

  async function handleResetPassword() {
    if (!currentUser?.email) return
    try {
      await sendPasswordResetEmail(auth, currentUser.email)
      showToast('Password reset email sent! Check your inbox.')
    } catch {
      showToast('Failed to send reset email.', 'error')
    }
  }

  async function handleDeleteAccount() {
    if (!currentUser) return
    setDeleteLoading(true)
    try {
      await deleteDoc(doc(db, 'users', currentUser.uid)).catch(() => {})
      await deleteDoc(doc(db, 'teachers', currentUser.uid)).catch(() => {})
      await deleteDoc(doc(db, 'schools', currentUser.uid)).catch(() => {})
      await deleteUser(currentUser)
      navigate('/login')
    } catch {
      showToast('Failed to delete. You may need to re-login first.', 'error')
    }
    setDeleteLoading(false)
    setShowDeleteConfirm(false)
  }

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  const initials = n => n ? n.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : 'U'

  const THEME_OPTIONS = [
    { id: 'light', icon: Sun, label: 'Light', desc: 'Clean & bright' },
    { id: 'dark', icon: Moon, label: 'Dark', desc: 'Easy on eyes' },
  ]

  return (
    <div className="max-w-4xl mx-auto animate-fade-in pb-16">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Settings</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage your account, privacy, and preferences</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">

        {/* ─── SIDEBAR TABS ─── */}
        <div className="flex md:flex-col gap-1 bg-white dark:bg-[#1a1a24] border border-slate-200 dark:border-white/[0.07] rounded-2xl p-2 h-fit overflow-x-auto no-scrollbar">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all whitespace-nowrap shrink-0 w-full text-left ${
                activeTab === tab.id
                  ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
              }`}>
              <tab.icon className={`w-4 h-4 shrink-0 ${activeTab === tab.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden text-xs">{tab.label.split(' ')[0]}</span>
            </button>
          ))}

          <div className="hidden md:block mt-auto pt-4 border-t border-slate-100 dark:border-white/5">
            <button onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold w-full text-left text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all">
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>

        {/* ─── CONTENT ─── */}
        <div className="space-y-5">

          {/* ── ACCOUNT TAB ── */}
          {activeTab === 'account' && (
            <div className="space-y-5 animate-fade-in">
              {/* Photo */}
              <div className="bg-white dark:bg-[#1a1a24] border border-slate-200 dark:border-white/[0.07] rounded-2xl p-6">
                <h3 className="font-extrabold text-slate-900 dark:text-white mb-5">Profile Photo</h3>
                <div className="flex items-center gap-5">
                  <div className="relative group shrink-0">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 overflow-hidden ring-4 ring-white dark:ring-slate-800 shadow-lg">
                      {userProfile?.profilePhoto
                        ? <img src={userProfile.profilePhoto} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-white text-2xl font-black">{initials(form.name)}</div>}
                    </div>
                    <label className="absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      {uploadingPhoto ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Camera className="w-5 h-5 text-white" />}
                      <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                    </label>
                  </div>
                  <div>
                    <p className="font-extrabold text-slate-900 dark:text-white">{form.name || 'Your Name'}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 capitalize mt-0.5">{userProfile?.role || 'Teacher'} · {userProfile?.location || 'Location not set'}</p>
                    <p className="text-xs text-slate-400 mt-1">{currentUser?.email}</p>
                  </div>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSaveAccount} className="bg-white dark:bg-[#1a1a24] border border-slate-200 dark:border-white/[0.07] rounded-2xl p-6">
                <h3 className="font-extrabold text-slate-900 dark:text-white mb-5">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                  <Field label="Full Name">
                    <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Your full name" className="input-field dark:text-white" />
                  </Field>
                  <Field label="Email">
                    <input value={currentUser?.email || ''} disabled className="input-field opacity-50 cursor-not-allowed dark:text-white" />
                  </Field>
                  <Field label="Phone">
                    <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+91 XXXXX XXXXX" className="input-field dark:text-white" />
                  </Field>
                  <Field label="Location">
                    <input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="City, State" className="input-field dark:text-white" />
                  </Field>
                  {userProfile?.role === 'teacher' && (
                    <>
                      <Field label="Subject">
                        <input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} placeholder="e.g. Mathematics, Science" className="input-field dark:text-white" />
                      </Field>
                      <Field label="Experience">
                        <input value={form.experience} onChange={e => setForm(p => ({ ...p, experience: e.target.value }))} placeholder="e.g. 5 years" className="input-field dark:text-white" />
                      </Field>
                      <div className="col-span-2">
                        <Field label="Qualification">
                          <input value={form.qualification} onChange={e => setForm(p => ({ ...p, qualification: e.target.value }))} placeholder="e.g. B.Ed, M.Sc" className="input-field dark:text-white" />
                        </Field>
                      </div>
                    </>
                  )}
                  <div className="md:col-span-2">
                    <Field label="Bio">
                      <textarea value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} placeholder="Tell the community about yourself..." className="input-field resize-none min-h-[90px] dark:text-white" />
                    </Field>
                  </div>
                </div>
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all disabled:opacity-50 shadow-sm shadow-indigo-200">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </div>
          )}

          {/* ── NOTIFICATIONS TAB ── */}
          {activeTab === 'notifications' && (
            <div className="bg-white dark:bg-[#1a1a24] border border-slate-200 dark:border-white/[0.07] rounded-2xl p-6 animate-fade-in">
              <h3 className="font-extrabold text-slate-900 dark:text-white mb-1">Notification Preferences</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Control how and when you receive notifications.</p>
              <div className="space-y-3">
                {NOTIF_ITEMS.map(item => (
                  <div key={item.key} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/[0.03] rounded-xl border border-slate-100 dark:border-white/[0.05]">
                    <div>
                      <p className="font-semibold text-sm text-slate-900 dark:text-white">{item.label}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.desc}</p>
                    </div>
                    <Toggle on={notifications[item.key]} onToggle={() => setNotifications(p => ({ ...p, [item.key]: !p[item.key] }))} />
                  </div>
                ))}
              </div>
              <button onClick={handleSaveNotifications}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all mt-5 shadow-sm shadow-indigo-200">
                <Save className="w-4 h-4" /> Save Preferences
              </button>
            </div>
          )}

          {/* ── PRIVACY TAB ── */}
          {activeTab === 'privacy' && (
            <div className="space-y-5 animate-fade-in">
              {/* Visibility */}
              <div className="bg-white dark:bg-[#1a1a24] border border-slate-200 dark:border-white/[0.07] rounded-2xl p-6">
                <h3 className="font-extrabold text-slate-900 dark:text-white mb-1">Profile Visibility</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">Choose what others can see about you.</p>
                <div className="space-y-3">
                  {[
                    { key: 'profilePublic', label: 'Public Profile', desc: 'Anyone can view your profile' },
                    { key: 'showEmail', label: 'Show Email', desc: 'Display email on your public profile' },
                    { key: 'showPhone', label: 'Show Phone', desc: 'Display phone number on your profile' },
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/[0.03] rounded-xl border border-slate-100 dark:border-white/[0.05]">
                      <div>
                        <p className="font-semibold text-sm text-slate-900 dark:text-white">{item.label}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.desc}</p>
                      </div>
                      <Toggle on={privacy[item.key]} onToggle={() => setPrivacy(p => ({ ...p, [item.key]: !p[item.key] }))} />
                    </div>
                  ))}
                </div>
                <button onClick={handleSavePrivacy}
                  className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all mt-5 shadow-sm shadow-indigo-200">
                  <Save className="w-4 h-4" /> Save Privacy Settings
                </button>
              </div>

              {/* Password */}
              <div className="bg-white dark:bg-[#1a1a24] border border-slate-200 dark:border-white/[0.07] rounded-2xl p-6">
                <h3 className="font-extrabold text-slate-900 dark:text-white mb-1">Password</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">Send a password reset link to your email.</p>
                <button onClick={handleResetPassword}
                  className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-200 dark:hover:bg-white/[0.08] text-slate-700 dark:text-white text-sm font-bold rounded-xl transition-all border border-slate-200 dark:border-white/[0.07]">
                  <Lock className="w-4 h-4" /> Send Password Reset Email
                </button>
              </div>

              {/* Danger Zone */}
              <div className="bg-white dark:bg-[#1a1a24] border border-red-200 dark:border-red-500/20 rounded-2xl p-6">
                <h3 className="font-extrabold text-red-600 mb-1 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Danger Zone
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">Permanently delete your account and all associated data. This action cannot be undone.</p>
                <button onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-all">
                  <Trash2 className="w-4 h-4" /> Delete Account
                </button>
              </div>
            </div>
          )}

          {/* ── APPEARANCE TAB ── */}
          {activeTab === 'appearance' && (
            <div className="space-y-5 animate-fade-in">
              {/* Theme */}
              <div className="bg-white dark:bg-[#1a1a24] border border-slate-200 dark:border-white/[0.07] rounded-2xl p-6">
                <h3 className="font-extrabold text-slate-900 dark:text-white mb-1">Theme</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">Choose your preferred color scheme. Changes apply instantly.</p>
                <div className="grid grid-cols-2 gap-3">
                  {THEME_OPTIONS.map(opt => (
                    <button key={opt.id} type="button" onClick={() => setThemeMode(opt.id)}
                      className={`relative flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200 active:scale-[0.98] ${
                        theme === opt.id
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10'
                          : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] hover:border-slate-300 dark:hover:border-white/20'
                      }`}>
                      {/* Preview miniature */}
                      <div className={`w-12 h-10 rounded-lg flex flex-col overflow-hidden border shrink-0 ${
                        opt.id === 'dark' ? 'bg-[#0f0f14] border-white/10' : 'bg-white border-slate-200'
                      }`}>
                        <div className={`h-3 ${opt.id === 'dark' ? 'bg-[#1a1a24]' : 'bg-slate-100'}`} />
                        <div className="flex-1 p-1 space-y-1">
                          <div className={`h-1.5 rounded-full ${opt.id === 'dark' ? 'bg-white/20' : 'bg-slate-200'}`} />
                          <div className={`h-1.5 rounded-full w-3/4 ${opt.id === 'dark' ? 'bg-white/10' : 'bg-slate-100'}`} />
                        </div>
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-2 mb-0.5">
                          <opt.icon className={`w-4 h-4 ${theme === opt.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                          <p className={`font-extrabold text-sm ${theme === opt.id ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}>{opt.label}</p>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{opt.desc}</p>
                      </div>
                      {theme === opt.id && (
                        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                {/* Live preview */}
                <div className={`mt-5 p-4 rounded-xl border flex items-center gap-3 transition-all ${
                  theme === 'dark' ? 'bg-[#0f0f14] border-white/10' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${theme === 'dark' ? 'bg-indigo-500/20' : 'bg-indigo-100'}`}>
                    {theme === 'dark' ? <Moon className="w-5 h-5 text-indigo-400" /> : <Sun className="w-5 h-5 text-indigo-600" />}
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      {theme === 'dark' ? 'Dark mode is active' : 'Light mode is active'}
                    </p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      Theme preference is saved automatically
                    </p>
                  </div>
                </div>
              </div>

              {/* Language */}
              <div className="bg-white dark:bg-[#1a1a24] border border-slate-200 dark:border-white/[0.07] rounded-2xl p-6">
                <h3 className="font-extrabold text-slate-900 dark:text-white mb-1">{t('languageTitle')}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{t('languageDesc')}</p>
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-slate-400 shrink-0" />
                  <select
                    value={language}
                    onChange={e => setLanguage(e.target.value)}
                    className="input-field w-auto py-2.5 font-semibold dark:text-white">
                    <option value="english">🇬🇧 English</option>
                    <option value="hindi">🇮🇳 हिन्दी</option>
                  </select>
                </div>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-3 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  {language === 'hindi' ? 'हिन्दी भाषा सक्रिय है' : 'English is active'}
                </p>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── DELETE MODAL ── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-white dark:bg-[#1a1a24] rounded-2xl p-7 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-white/10 animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-500/20 flex items-center justify-center mx-auto mb-5">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white text-center mb-2">Delete Account?</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-6">This will permanently delete your account and all associated data. This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white text-sm font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
                Cancel
              </button>
              <button onClick={handleDeleteAccount} disabled={deleteLoading}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOAST ── */}
      {toast.show && (
        <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-bold animate-slide-up ${
          toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
        }`}>
          <Check className="w-4 h-4 shrink-0" />
          {toast.msg}
        </div>
      )}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">{label}</label>
      {children}
    </div>
  )
}
