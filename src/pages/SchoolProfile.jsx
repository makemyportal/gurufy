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
  Edit3, Building2, Camera, Loader2, Save, X
} from 'lucide-react'

export default function SchoolProfile() {
  const { currentUser, userProfile, fetchUserProfile } = useAuth()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [myJobs, setMyJobs] = useState([])

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

  // Load school's own job listings
  useEffect(() => {
    if (!currentUser) return
    const q = query(
      collection(db, 'jobs'),
      where('schoolId', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    )
    const unsub = onSnapshot(q, snap => {
      setMyJobs(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return () => unsub()
  }, [currentUser])

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

          <div className="grid grid-cols-3 gap-4 mt-6">
            {[
              { label: 'Jobs Posted', value: myJobs.length },
              { label: 'Active Jobs', value: myJobs.filter(j => j.status === 'active').length },
              { label: 'Total Applicants', value: myJobs.reduce((a, j) => a + (j.applicantsCount || 0), 0) },
            ].map(stat => (
              <div key={stat.label} className="text-center p-3 bg-surface-50 rounded-xl">
                <p className="text-xl font-bold text-surface-900">{stat.value}</p>
                <p className="text-xs text-surface-500">{stat.label}</p>
              </div>
            ))}
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

      {/* Jobs Section */}
      <div className="glass-card-solid p-5">
        <h3 className="font-semibold text-surface-900 mb-4">Job Listings</h3>
        {myJobs.length === 0 ? (
          <p className="text-sm text-surface-500 text-center py-6">
            No jobs posted yet. Go to the <strong>Job Portal</strong> to post a job opening!
          </p>
        ) : (
          <div className="space-y-3">
            {myJobs.map(job => (
              <div key={job.id} className="flex items-center justify-between p-4 bg-surface-50 rounded-xl hover:bg-surface-100 transition-colors">
                <div>
                  <p className="font-semibold text-sm text-surface-900">{job.title}</p>
                  <p className="text-xs text-surface-500">{job.salary} · {job.applicantsCount || 0} applicants</p>
                </div>
                <span className={`badge text-xs ${job.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-surface-200 text-surface-600'}`}>
                  {job.status === 'active' ? 'Active' : 'Closed'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
