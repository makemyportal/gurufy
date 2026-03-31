import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../utils/firebase'
import { doc, updateDoc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import {
  User, BookOpen, MapPin, GraduationCap, Clock, FileText,
  Loader2, CheckCircle, Sparkles, ChevronRight
} from 'lucide-react'

export default function ProfileCompletion({ onComplete }) {
  const { currentUser, userProfile, fetchUserProfile } = useAuth()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: userProfile?.name || currentUser?.displayName || '',
    subject: userProfile?.subject || '',
    qualification: '',
    experience: '',
    location: '',
    bio: '',
  })

  async function handleComplete() {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      // Update user doc
      await updateDoc(doc(db, 'users', currentUser.uid), {
        name: form.name.trim(),
        profileCompleted: true,
        updatedAt: serverTimestamp(),
      })

      // Update/create teacher doc
      const teacherRef = doc(db, 'teachers', currentUser.uid)
      const teacherSnap = await getDoc(teacherRef)
      const teacherData = {
        subject: form.subject.trim(),
        qualification: form.qualification.trim(),
        experience: form.experience.trim(),
        bio: form.bio.trim(),
      }
      if (teacherSnap.exists()) {
        await updateDoc(teacherRef, teacherData)
      } else {
        await setDoc(teacherRef, {
          ...teacherData,
          resume: '',
          certifications: [],
          availability: 'available',
          aiCredits: { remaining: 5, lastRefillDate: new Date().toISOString().split('T')[0] }
        })
      }

      // Also update location in user doc
      if (form.location.trim()) {
        await updateDoc(doc(db, 'users', currentUser.uid), { location: form.location.trim() })
      }

      await fetchUserProfile(currentUser.uid)
      onComplete()
    } catch (err) {
      console.error('Profile completion error:', err)
      alert('Failed to save. Please try again.')
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="relative overflow-hidden px-6 pt-8 pb-6 bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 text-white">
          <div className="absolute top-[-30%] right-[-10%] w-48 h-48 bg-white/10 rounded-full blur-[40px]" />
          <div className="absolute bottom-[-20%] left-[-5%] w-36 h-36 bg-cyan-400/15 rounded-full blur-[30px]" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center border border-white/20">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-white/70">Complete Your Profile</span>
            </div>
            <h2 className="text-2xl font-extrabold leading-tight">
              Welcome to LDMS! 🎉
            </h2>
            <p className="text-white/80 text-sm font-medium mt-1">
              Tell us a bit about yourself to get started.
            </p>
          </div>
          {/* Progress */}
          <div className="relative z-10 flex gap-2 mt-5">
            {[1, 2].map(s => (
              <div key={s} className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${step >= s ? 'bg-white' : 'bg-white/20'}`} />
            ))}
          </div>
        </div>

        <div className="px-6 py-6">
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Basic Info</p>
              
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600">Full Name <span className="text-red-500">*</span></label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Enter your full name"
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 focus:bg-white transition-all"
                    autoFocus
                  />
                </div>
              </div>

              {/* Subject */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600">Subject / Expertise</label>
                <div className="relative">
                  <BookOpen className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="e.g. Mathematics, Science, English"
                    value={form.subject}
                    onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Location */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600">Location</label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="e.g. New Delhi, Mumbai"
                    value={form.location}
                    onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <button
                onClick={() => { if (form.name.trim()) setStep(2) }}
                disabled={!form.name.trim()}
                className="w-full py-3.5 mt-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-sm rounded-xl hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Professional Details (Optional)</p>

              {/* Qualification */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600">Qualification</label>
                <div className="relative">
                  <GraduationCap className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="e.g. M.Sc., B.Ed., Ph.D."
                    value={form.qualification}
                    onChange={e => setForm(p => ({ ...p, qualification: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 focus:bg-white transition-all"
                    autoFocus
                  />
                </div>
              </div>

              {/* Experience */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600">Teaching Experience</label>
                <div className="relative">
                  <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="e.g. 5 Years, Fresher"
                    value={form.experience}
                    onChange={e => setForm(p => ({ ...p, experience: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Bio */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600">Short Bio</label>
                <div className="relative">
                  <FileText className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <textarea
                    placeholder="Tell the community about yourself..."
                    value={form.bio}
                    onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
                    rows={3}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 focus:bg-white transition-all resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-all"
                >
                  Back
                </button>
                <button
                  onClick={handleComplete}
                  disabled={saving || !form.name.trim()}
                  className="flex-[2] py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-sm rounded-xl hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                  ) : (
                    <><CheckCircle className="w-4 h-4" /> Complete Profile</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Skip button */}
          <button
            onClick={() => {
              // Even on skip, save the name if filled
              if (form.name.trim()) handleComplete()
              else onComplete()
            }}
            className="w-full mt-3 py-2 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
          >
            Skip for now →
          </button>
        </div>
      </div>
    </div>
  )
}
