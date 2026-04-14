import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../utils/firebase'
import {
  collection, addDoc, onSnapshot, query, orderBy,
  serverTimestamp, updateDoc, doc, increment, arrayUnion, where
} from 'firebase/firestore'
import {
  Search, MapPin, DollarSign, Clock, Briefcase, Building2,
  Send, BookmarkPlus, Eye, Loader2, Plus, X, CheckCircle2, ExternalLink
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const SUBJECTS = ['All Subjects', 'Mathematics', 'English', 'Science', 'Computer Science', 'Hindi', 'Social Studies', 'Music', 'Art', 'Physics', 'Chemistry', 'Biology']
const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Freelance / Gig']

export default function Jobs() {
  const navigate = useNavigate()
  const { currentUser, userProfile } = useAuth()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('All Subjects')
  const [jobCategory, setJobCategory] = useState('Jobs')
  const [selectedJob, setSelectedJob] = useState(null)
  const [applyingId, setApplyingId] = useState(null)
  const [showPostJob, setShowPostJob] = useState(false)
  const [posting, setPosting] = useState(false)
  const [apiJobs, setApiJobs] = useState([])
  const [loadingApi, setLoadingApi] = useState(true)

  const isSchool = userProfile?.role === 'school'

  const [jobForm, setJobForm] = useState({
    title: '', description: '', salary: '', experience: '',
    subject: '', type: 'Full-time', location: '', requirements: ''
  })

  useEffect(() => {
    const q = query(collection(db, 'jobs'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, snap => {
      setJobs(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    import('../utils/liveFeedService').then(({ fetchLiveFeed, filterLiveByCategory }) => {
      fetchLiveFeed().then(feed => {
        if (feed) {
          const rawJobs = filterLiveByCategory(feed, 'job')
          const mappedJobs = rawJobs.map(item => ({
            id: `api_${item.url}`,
            title: item.title,
            description: item.summary,
            school: item.source || 'Premium Employer',
            location: 'India Location',
            salary: 'As per Norms',
            experience: '0-5+ Years',
            type: 'Full-time',
            subject: 'All Subjects',
            isApi: true,
            url: item.url,
            createdAt: { toDate: () => new Date(item.pubDate || Date.now()) },
            applicantsCount: parseInt(item.likes?.toString().replace('K', '000')) || (Math.floor(Math.random() * 50) + 10),
          }))
          setApiJobs(mappedJobs)
        }
        setLoadingApi(false)
      }).catch(err => {
        console.error('API Job fetch error:', err)
        setLoadingApi(false)
      })
    })
  }, [])

  const allJobs = [...jobs, ...apiJobs].sort((a, b) => {
    const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0
    const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0
    return timeB - timeA
  })

  const filteredJobs = allJobs.filter(job => {
    const isGigType = job.type === 'Freelance / Gig'
    const matchCategory = jobCategory === 'Gigs' ? isGigType : !isGigType
    
    const matchSearch = job.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        job.school?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        job.location?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchSubject = selectedSubject === 'All Subjects' || job.subject === selectedSubject
    return matchCategory && matchSearch && matchSubject
  })

  async function handleApply(job) {
    if (!currentUser) {
      navigate('/login')
      return
    }
    if ((job.applicants || []).includes(currentUser.uid)) return
    setApplyingId(job.id)
    try {
      await updateDoc(doc(db, 'jobs', job.id), {
        applicants: arrayUnion(currentUser.uid),
        applicantsCount: increment(1)
      })
      await addDoc(collection(db, 'applications'), {
        jobId: job.id,
        jobTitle: job.title,
        schoolId: job.schoolId,
        schoolName: job.school,
        applicantId: currentUser.uid,
        applicantName: userProfile?.name || currentUser.email,
        applicantEmail: currentUser.email,
        subject: userProfile?.subject || '',
        experience: userProfile?.experience || '',
        status: 'pending',
        appliedAt: serverTimestamp(),
      })
    } catch (err) {
      console.error('Apply error:', err)
      alert('Failed to apply. Please try again.')
    } finally {
      setApplyingId(null)
    }
  }

  async function handlePostJob(e) {
    e.preventDefault()
    if (!currentUser || !isSchool) return
    setPosting(true)
    try {
      await addDoc(collection(db, 'jobs'), {
        title: jobForm.title,
        description: jobForm.description,
        salary: jobForm.salary,
        experience: jobForm.experience,
        subject: jobForm.subject,
        type: jobForm.type,
        location: jobForm.location || userProfile?.location || '',
        requirements: jobForm.requirements,
        school: userProfile?.schoolName || userProfile?.name || 'School',
        schoolId: currentUser.uid,
        schoolPhoto: userProfile?.profilePhoto || '',
        applicants: [],
        applicantsCount: 0,
        status: 'active',
        createdAt: serverTimestamp(),
      })
      setShowPostJob(false)
      setJobForm({ title: '', description: '', salary: '', experience: '', subject: '', type: 'Full-time', location: '', requirements: '' })
    } catch (err) {
      console.error('Post job error:', err)
      alert('Failed to post job.')
    } finally {
      setPosting(false)
    }
  }

  const timeAgo = (ts) => {
    if (!ts) return ''
    try {
      const s = Math.floor((Date.now() - ts.toDate().getTime()) / 1000)
      if (s < 86400) return `${Math.floor(s / 3600)}h ago`
      if (s < 604800) return `${Math.floor(s / 86400)} days ago`
      return `${Math.floor(s / 604800)} weeks ago`
    } catch { return '' }
  }

  const hasApplied = (job) => currentUser && (job.applicants || []).includes(currentUser.uid)

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="section-title">Job Portal</h1>
          {!loading && <p className="text-sm text-surface-500 mt-1">{filteredJobs.length} positions available</p>}
        </div>
        {isSchool && (
          <button onClick={() => setShowPostJob(true)} className="btn-primary py-2.5 px-5 text-sm flex items-center gap-2 shrink-0 self-start sm:self-auto">
            <Plus className="w-4 h-4" /> Post a Job
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap sm:flex-nowrap gap-2 bg-surface-100 p-1.5 rounded-xl mb-6">
        {['Jobs', 'Gigs'].map(cat => (
          <button
            key={cat}
            onClick={() => { setJobCategory(cat); setSelectedJob(null); }}
            className={`flex-1 min-w-[140px] py-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${
              jobCategory === cat ? 'bg-white text-primary-600 shadow-sm' : 'text-surface-500 hover:text-surface-800'
            }`}
          >
            {cat === 'Jobs' ? 'Full-time & Contract' : 'Freelance & Gigs'}
          </button>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="glass-card-solid p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
            <input
              type="text" placeholder="Search by title, school, or location..."
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="input-field pl-12"
            />
          </div>
          <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} className="input-field w-full sm:w-48">
            {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {loading && <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary-400" /></div>}

      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Job List */}
          <div className={`lg:col-span-2 space-y-3 ${selectedJob ? 'hidden lg:block' : 'block'}`}>
            {filteredJobs.map(job => (
              <button
                key={job.id}
                onClick={() => setSelectedJob(job)}
                className={`w-full text-left glass-card-solid p-4 card-hover transition-all ${selectedJob?.id === job.id ? 'ring-2 ring-primary-400 bg-primary-50/50' : ''}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-surface-900 text-sm">{job.title}</h3>
                  <span className={`badge text-[10px] shrink-0 ml-2 ${job.type === 'Full-time' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {job.type}
                  </span>
                </div>
                <p className="text-sm text-primary-600 font-medium flex items-center gap-1.5 mb-1.5">
                  <Building2 className="w-3.5 h-3.5" /> {job.school}
                </p>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-surface-500">
                  {job.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {job.location}</span>}
                  {job.salary && <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> {job.salary}</span>}
                </div>
                <div className="flex items-center justify-between mt-3 text-xs text-surface-400">
                  <span>{timeAgo(job.createdAt)}</span>
                  <span>{job.applicantsCount || 0} applicants</span>
                </div>
              </button>
            ))}

            {filteredJobs.length === 0 && !loading && (
              <div className="text-center py-12">
                <Briefcase className="w-12 h-12 text-surface-300 mx-auto mb-3" />
                <p className="text-surface-500">No jobs match your search.</p>
                {isSchool && (
                  <button onClick={() => setShowPostJob(true)} className="btn-primary mt-4 py-2 px-4 text-sm">
                    Post the First Job
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Job Detail */}
          <div className={`lg:col-span-3 ${selectedJob ? 'block' : 'hidden lg:block'}`}>
            {selectedJob ? (
              <div className="glass-card-solid p-5 sm:p-6 sticky top-20 animate-fade-in">
                {/* Mobile Back Button */}
                <button onClick={() => setSelectedJob(null)} className="lg:hidden flex items-center gap-2 text-surface-500 hover:text-surface-800 text-sm font-semibold mb-4 transition-colors">
                  ← Back to Jobs
                </button>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold font-display text-surface-900">{selectedJob.title}</h2>
                    <p className="text-primary-600 font-semibold mt-1">{selectedJob.school}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-5">
                  {selectedJob.location && (
                    <span className="badge bg-surface-100 text-surface-700 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" /> {selectedJob.location}
                    </span>
                  )}
                  {selectedJob.salary && (
                    <span className="badge bg-surface-100 text-surface-700 flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5" /> {selectedJob.salary}
                    </span>
                  )}
                  {selectedJob.experience && (
                    <span className="badge bg-surface-100 text-surface-700 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> {selectedJob.experience}
                    </span>
                  )}
                  {selectedJob.type && (
                    <span className="badge bg-surface-100 text-surface-700 flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5" /> {selectedJob.type}
                    </span>
                  )}
                </div>

                {selectedJob.description && (
                  <div className="mb-5">
                    <h3 className="font-semibold text-surface-900 mb-2">Job Description</h3>
                    <p className="text-sm text-surface-700 leading-relaxed whitespace-pre-line">{selectedJob.description}</p>
                  </div>
                )}

                {selectedJob.requirements && (
                  <div className="mb-6 p-4 bg-surface-50 rounded-xl">
                    <h3 className="font-semibold text-surface-900 mb-2">Requirements</h3>
                    <p className="text-sm text-surface-700 whitespace-pre-line">{selectedJob.requirements}</p>
                  </div>
                )}

                {!isSchool && (
                  <div className="flex gap-3 mt-4">
                    {hasApplied(selectedJob) ? (
                      <button disabled className="btn-secondary flex-1 py-3 text-emerald-600 border-emerald-300 bg-emerald-50 cursor-default flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-5 h-5" /> Applied Successfully
                      </button>
                    ) : selectedJob.isApi ? (
                      <button
                        onClick={() => window.open(selectedJob.url, '_blank', 'noopener,noreferrer')}
                        className="btn-primary flex-1 py-3 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-xl"
                      >
                        <ExternalLink className="w-5 h-5" /> View / Apply on Main Portal
                      </button>
                    ) : (
                      <button
                        onClick={() => handleApply(selectedJob)}
                        disabled={applyingId === selectedJob.id}
                        className="btn-primary flex-1 py-3 flex items-center justify-center gap-2"
                      >
                        {applyingId === selectedJob.id
                          ? <><Loader2 className="w-5 h-5 animate-spin" /> Applying...</>
                          : <><Send className="w-5 h-5" /> Apply Now</>}
                      </button>
                    )}
                  </div>
                )}

                <p className="text-xs text-surface-400 text-center mt-3">
                  {selectedJob.applicantsCount || 0} people have applied · Posted {timeAgo(selectedJob.createdAt)}
                </p>
              </div>
            ) : (
              <div className="glass-card-solid p-12 flex flex-col items-center justify-center text-center sticky top-20">
                <Eye className="w-16 h-16 text-surface-200 mb-4" />
                <h3 className="text-lg font-semibold text-surface-700">Select a job to view details</h3>
                <p className="text-sm text-surface-500 mt-1">Click on any job listing to see the full description</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Post Job Modal (School Only) */}
      {showPostJob && isSchool && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-glass w-full max-w-lg p-6 my-4 animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold font-display">Post a Job</h2>
              <button onClick={() => setShowPostJob(false)} className="p-1.5 hover:bg-surface-100 rounded-lg">
                <X className="w-5 h-5 text-surface-500" />
              </button>
            </div>

            <form onSubmit={handlePostJob} className="space-y-4">
              <input required placeholder="Job Title *" value={jobForm.title} onChange={e => setJobForm(p => ({ ...p, title: e.target.value }))} className="input-field" />
              <div className="grid grid-cols-2 gap-3">
                <select required value={jobForm.subject} onChange={e => setJobForm(p => ({ ...p, subject: e.target.value }))} className="input-field">
                  <option value="">Subject *</option>
                  {SUBJECTS.filter(s => s !== 'All Subjects').map(s => <option key={s}>{s}</option>)}
                </select>
                <select value={jobForm.type} onChange={e => setJobForm(p => ({ ...p, type: e.target.value }))} className="input-field">
                  {JOB_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Salary (e.g. ₹6-10 LPA)" value={jobForm.salary} onChange={e => setJobForm(p => ({ ...p, salary: e.target.value }))} className="input-field" />
                <input placeholder="Experience (e.g. 2-4 years)" value={jobForm.experience} onChange={e => setJobForm(p => ({ ...p, experience: e.target.value }))} className="input-field" />
              </div>
              <input placeholder="Location (City, State)" value={jobForm.location} onChange={e => setJobForm(p => ({ ...p, location: e.target.value }))} className="input-field" />
              <textarea required placeholder="Job Description *" value={jobForm.description} onChange={e => setJobForm(p => ({ ...p, description: e.target.value }))} className="input-field resize-none min-h-[100px]" />
              <textarea placeholder="Requirements (one per line)" value={jobForm.requirements} onChange={e => setJobForm(p => ({ ...p, requirements: e.target.value }))} className="input-field resize-none min-h-[80px]" />

              <button type="submit" disabled={posting} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
                {posting ? <><Loader2 className="w-4 h-4 animate-spin" /> Posting...</> : <><Plus className="w-4 h-4" /> Post Job</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
