import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../utils/firebase'
import { doc, updateDoc, serverTimestamp, deleteDoc } from 'firebase/firestore'
import { sendPasswordResetEmail, deleteUser } from 'firebase/auth'
import { auth } from '../utils/firebase'
import { uploadToCloudinary } from '../utils/cloudinary'
import {
  Settings as SettingsIcon, User, Bell, Shield, Palette,
  Save, Loader2, Camera, Check, Lock, Trash2, Mail,
  Globe, AlertTriangle, X, LogOut
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function Settings() {
  const { currentUser, userProfile, fetchUserProfile, logout } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('account')
  const [saving, setSaving] = useState(false)
  const [toastMsg, setToastMsg] = useState('')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const [form, setForm] = useState({
    name: '', email: '', phone: '', location: '', bio: '',
  })
  const [notifications, setNotifications] = useState({
    emailNotif: true, pushNotif: true, jobAlerts: true, messageNotif: true,
  })

  useEffect(() => {
    if (userProfile) {
      setForm({
        name: userProfile.name || '',
        email: userProfile.email || currentUser?.email || '',
        phone: userProfile.phone || '',
        location: userProfile.location || '',
        bio: userProfile.bio || userProfile.about || '',
      })
    }
  }, [userProfile, currentUser])

  function showToast(msg) {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 3000)
  }

  async function handleSaveAccount(e) {
    e.preventDefault()
    if (!currentUser) return
    setSaving(true)
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        name: form.name,
        phone: form.phone,
        location: form.location,
        bio: form.bio,
        updatedAt: serverTimestamp(),
      })
      await fetchUserProfile(currentUser.uid)
      showToast('Profile saved successfully!')
    } catch (err) {
      console.error('Save error:', err)
      showToast('Failed to save. Please try again.')
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
      showToast('Photo updated!')
    } catch (err) {
      console.error('Photo upload error:', err)
      showToast('Photo upload failed.')
    }
    setUploadingPhoto(false)
  }

  async function handleResetPassword() {
    if (!currentUser?.email) return
    try {
      await sendPasswordResetEmail(auth, currentUser.email)
      showToast('Password reset email sent!')
    } catch (err) {
      console.error('Reset error:', err)
      showToast('Failed to send reset email.')
    }
  }

  async function handleDeleteAccount() {
    if (!currentUser) return
    setDeleteLoading(true)
    try {
      // Delete user document
      await deleteDoc(doc(db, 'users', currentUser.uid)).catch(() => {})
      await deleteDoc(doc(db, 'teachers', currentUser.uid)).catch(() => {})
      await deleteDoc(doc(db, 'schools', currentUser.uid)).catch(() => {})
      await deleteUser(currentUser)
      navigate('/login')
    } catch (err) {
      console.error('Delete account error:', err)
      showToast('Failed to delete account. You may need to re-login first.')
    }
    setDeleteLoading(false)
    setShowDeleteConfirm(false)
  }

  const tabs = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy & Security', icon: Shield },
    { id: 'appearance', label: 'Appearance', icon: Palette },
  ]

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="section-title">Settings</h1>
        <p className="text-surface-500 text-sm mt-1">Manage your account preferences</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar Tabs */}
        <div className="glass-card-solid p-2 sm:p-3 h-fit">
          <div className="flex md:flex-col gap-1 overflow-x-auto no-scrollbar">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-sm font-semibold transition-all whitespace-nowrap shrink-0 ${
                  activeTab === tab.id ? 'bg-primary-50 text-primary-700' : 'text-surface-600 hover:bg-surface-50'
                }`}
              >
                <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-primary-600' : 'text-surface-400'}`} />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden text-xs">{tab.label.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="md:col-span-3">
          {/* Account Tab */}
          {activeTab === 'account' && (
            <div className="space-y-6 animate-fade-in">
              {/* Profile Photo */}
              <div className="glass-card-solid p-6">
                <h3 className="font-bold text-surface-900 mb-4">Profile Photo</h3>
                <div className="flex items-center gap-4">
                  <div className="relative group">
                    <div className="w-20 h-20 rounded-2xl bg-surface-200 overflow-hidden ring-2 ring-white shadow-lg">
                      {userProfile?.profilePhoto
                        ? <img src={userProfile.profilePhoto} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full gradient-bg flex items-center justify-center text-white text-2xl font-bold">{(form.name || 'U')[0].toUpperCase()}</div>
                      }
                    </div>
                    <label className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      {uploadingPhoto
                        ? <Loader2 className="w-5 h-5 text-white animate-spin" />
                        : <Camera className="w-5 h-5 text-white" />}
                      <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                    </label>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-surface-900">{form.name || 'Your Name'}</p>
                    <p className="text-xs text-surface-500 capitalize">{userProfile?.role || 'Teacher'}</p>
                  </div>
                </div>
              </div>

              {/* Account Form */}
              <form onSubmit={handleSaveAccount} className="glass-card-solid p-6">
                <h3 className="font-bold text-surface-900 mb-4">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-widest text-surface-400">Full Name</label>
                    <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="input-field" placeholder="Your name" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-widest text-surface-400">Email</label>
                    <input value={form.email} disabled className="input-field opacity-50 cursor-not-allowed" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-widest text-surface-400">Phone</label>
                    <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className="input-field" placeholder="+91 XXXXX XXXXX" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-widest text-surface-400">Location</label>
                    <input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} className="input-field" placeholder="City, State" />
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-xs font-bold uppercase tracking-widest text-surface-400">Bio</label>
                    <textarea value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} className="input-field resize-none min-h-[80px]" placeholder="Tell others about yourself..." />
                  </div>
                </div>
                <button type="submit" disabled={saving} className="btn-primary py-2.5 px-6 text-sm flex items-center gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="glass-card-solid p-6 animate-fade-in">
              <h3 className="font-bold text-surface-900 mb-6">Notification Preferences</h3>
              <div className="space-y-4">
                {[
                  { key: 'emailNotif', label: 'Email Notifications', desc: 'Receive important updates via email' },
                  { key: 'pushNotif', label: 'Push Notifications', desc: 'Browser push notifications for real-time updates' },
                  { key: 'jobAlerts', label: 'Job Alerts', desc: 'Get notified about new job postings matching your profile' },
                  { key: 'messageNotif', label: 'Message Notifications', desc: 'Alerts for new messages and chat activity' },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between p-4 bg-surface-50 rounded-2xl border border-surface-200/50">
                    <div>
                      <p className="font-semibold text-sm text-surface-900">{item.label}</p>
                      <p className="text-xs text-surface-500">{item.desc}</p>
                    </div>
                    <button
                      onClick={() => setNotifications(p => ({ ...p, [item.key]: !p[item.key] }))}
                      className={`w-12 h-7 rounded-full transition-all duration-300 relative ${notifications[item.key] ? 'bg-primary-600' : 'bg-surface-300'}`}
                    >
                      <div className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-sm transition-transform duration-300 ${notifications[item.key] ? 'translate-x-5' : ''}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Privacy Tab */}
          {activeTab === 'privacy' && (
            <div className="space-y-6 animate-fade-in">
              <div className="glass-card-solid p-6">
                <h3 className="font-bold text-surface-900 mb-4">Password</h3>
                <p className="text-sm text-surface-600 mb-4">Click below to receive a password reset link via email.</p>
                <button onClick={handleResetPassword} className="btn-secondary py-2.5 px-5 text-sm flex items-center gap-2">
                  <Lock className="w-4 h-4" /> Send Password Reset Email
                </button>
              </div>

              <div className="glass-card-solid p-6 border-red-200/50">
                <h3 className="font-bold text-red-700 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" /> Danger Zone
                </h3>
                <p className="text-sm text-surface-600 mb-4">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
                <button onClick={() => setShowDeleteConfirm(true)} className="py-2.5 px-5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-colors flex items-center gap-2">
                  <Trash2 className="w-4 h-4" /> Delete Account
                </button>
              </div>
            </div>
          )}

          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <div className="glass-card-solid p-6 animate-fade-in">
              <h3 className="font-bold text-surface-900 mb-4">Appearance</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-surface-50 rounded-2xl border border-surface-200/50">
                  <div>
                    <p className="font-semibold text-sm text-surface-900">Theme</p>
                    <p className="text-xs text-surface-500">Choose your preferred color scheme</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-4 py-2 bg-white border-2 border-primary-500 rounded-xl text-sm font-bold text-primary-700">Light</button>
                    <button className="px-4 py-2 bg-surface-200 border border-surface-300 rounded-xl text-sm font-bold text-surface-500 opacity-50 cursor-not-allowed">Dark</button>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-surface-50 rounded-2xl border border-surface-200/50">
                  <div>
                    <p className="font-semibold text-sm text-surface-900">Language</p>
                    <p className="text-xs text-surface-500">Select your preferred language</p>
                  </div>
                  <select className="input-field w-auto py-2">
                    <option>English</option>
                    <option>हिन्दी</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowDeleteConfirm(false)}>
          <div className="glass-modal w-full max-w-sm p-6 text-center animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-surface-900 mb-2">Delete Account?</h2>
            <p className="text-sm text-surface-600 mb-6">This will permanently delete your account and all data. This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 btn-secondary py-2.5 text-sm">Cancel</button>
              <button onClick={handleDeleteAccount} disabled={deleteLoading} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-colors flex items-center justify-center gap-2">
                {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMsg && (
        <div className="toast-success">
          <Check className="w-5 h-5" />
          {toastMsg}
        </div>
      )}
    </div>
  )
}
