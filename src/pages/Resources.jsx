import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../utils/firebase'
import {
  collection, addDoc, onSnapshot, query, orderBy,
  serverTimestamp, updateDoc, doc, increment
} from 'firebase/firestore'
import { uploadToCloudinary, formatFileSize } from '../utils/cloudinary'
import {
  Search, Download, Upload, Star, X, Loader2, FileText, CheckCircle2
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const SUBJECTS = ['All', 'Mathematics', 'Science', 'English', 'Computer Science', 'Hindi', 'Social Studies', 'Physics', 'Chemistry', 'Biology']
const TYPES = ['All', 'Worksheet', 'Lesson Plan', 'PPT', 'Question Paper', 'Activity', 'Notes']
const CLASSES = ['All', 'Class 1-5', 'Class 6-8', 'Class 9-10', 'Class 11-12']

const GLOBAL_RESOURCES = [
  { id: 'ncert1', title: 'NCERT Free Textbooks PDF', desc: 'The official portal to download 100% free PDF versions of all NCERT textbooks for classes I to XII.', url: 'https://ncert.nic.in/textbook.php', format: 'PDF', type: 'Govt Portal' },
  { id: 'ncert2', title: 'DIKSHA Portal', desc: 'National Digital Infrastructure for Teachers offering free study materials, lesson plans, and textbook QR resources.', url: 'https://diksha.gov.in/', format: 'LINK', type: 'Govt Portal' },
  { id: 'ncert3', title: 'ePathshala Digital', desc: 'Access free digital textbooks, audio resources, and videos developed by NCERT & MoE, India.', url: 'https://epathshala.nic.in/', format: 'LINK', type: 'Digital Library' },
  { id: 'g1', title: 'Khan Academy', desc: 'Free world-class education for anyone, anywhere. Great for math and science lesson references.', url: 'https://www.khanacademy.org/', format: 'LINK', type: 'Platform' },
  { id: 'g2', title: 'MIT OpenCourseWare', desc: 'Free lecture notes, exams, and videos from MIT. Excellent for advanced high school educators.', url: 'https://ocw.mit.edu/', format: 'LINK', type: 'Courseware' },
  { id: 'g3', title: 'PhET Interactive Simulations', desc: 'Free interactive math and science simulations founded by Nobel Laureate Carl Wieman.', url: 'https://phet.colorado.edu/', format: 'LINK', type: 'Simulations' },
  { id: 'g4', title: 'OER Commons', desc: 'A public digital library of open educational resources. Explore, create, and collaborate.', url: 'https://www.oercommons.org/', format: 'LINK', type: 'Digital Library' },
  { id: 'g5', title: 'Coursera for Teachers', desc: 'Free professional development resources and courses for K-12 educators worldwide.', url: 'https://www.coursera.org/business/k12', format: 'LINK', type: 'Training' },
  { id: 'g6', title: 'Project Gutenberg', desc: 'Library of over 70,000 free eBooks. Ideal for English literature and history teachers.', url: 'https://www.gutenberg.org/', format: 'LINK', type: 'eBooks' },
]

const FORMAT_STYLES = {
  PDF: { bg: 'bg-red-500' },
  PPT: { bg: 'bg-orange-500' },
  DOC: { bg: 'bg-blue-500' },
  DOCX: { bg: 'bg-blue-500' },
  PPTX: { bg: 'bg-orange-500' },
}

export default function Resources() {
  const navigate = useNavigate()
  const { currentUser, userProfile } = useAuth()
  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('All')
  const [selectedType, setSelectedType] = useState('All')
  const [showUpload, setShowUpload] = useState(false)
  const [activeTab, setActiveTab] = useState('community') // 'community' | 'global'
  const [apiResources, setApiResources] = useState([])

  // Upload Form state
  const [uploadFile, setUploadFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [uploadForm, setUploadForm] = useState({
    title: '', description: '', subject: '', classLevel: '', type: '', price: 'Free', priceAmount: ''
  })

  useEffect(() => {
    const q = query(collection(db, 'resources'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, snap => {
      setResources(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }, (error) => {
      console.error('Firebase resources error:', error)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    import('../utils/liveFeedService').then(({ fetchLiveFeed }) => {
      fetchLiveFeed().then(feed => {
        if (feed) {
          const raw = feed.filter(f => f.category === 'scheme' || f.category === 'exam')
          const mapped = raw.map((item, idx) => ({
            id: `api_res_${idx}`,
            title: item.title,
            desc: item.summary || 'Click here to read the full update and access the related educational resources.',
            url: item.url,
            format: 'WEB',
            type: item.tag || 'Live Update'
          }))
          setApiResources(mapped)
        }
      }).catch(err => console.error('Error fetching live resources:', err))
    })
  }, [])

  const filtered = resources.filter(r => {
    const matchSearch = r.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        r.authorName?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchSubject = selectedSubject === 'All' || r.subject === selectedSubject
    const matchType = selectedType === 'All' || r.type === selectedType
    return matchSearch && matchSubject && matchType
  })

  async function handleUpload(e) {
    e.preventDefault()
    if (!uploadFile || !uploadForm.title || !uploadForm.subject || !currentUser) return
    setUploading(true)

    try {
      const result = await uploadToCloudinary(uploadFile)
      await addDoc(collection(db, 'resources'), {
        title: uploadForm.title,
        description: uploadForm.description,
        subject: uploadForm.subject,
        classLevel: uploadForm.classLevel,
        type: uploadForm.type || 'Other',
        price: uploadForm.price === 'Free' ? 'Free' : uploadForm.priceAmount || 'Paid',
        fileUrl: result.url,
        format: result.format?.toUpperCase() || 'FILE',
        fileSize: formatFileSize(result.bytes),
        authorId: currentUser.uid,
        authorName: userProfile?.name || currentUser.email,
        downloads: 0,
        rating: 0,
        createdAt: serverTimestamp(),
      })
      setUploadSuccess(true)
      setTimeout(() => {
        setShowUpload(false)
        setUploadSuccess(false)
        setUploadFile(null)
        setUploadForm({ title: '', description: '', subject: '', classLevel: '', type: '', price: 'Free', priceAmount: '' })
      }, 1500)
    } catch (err) {
      console.error('Upload error:', err)
      alert('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  async function handleDownload(resource) {
    if (!currentUser) return navigate('/login')
    await updateDoc(doc(db, 'resources', resource.id), { downloads: increment(1) }).catch(() => {})
    window.open(resource.fileUrl, '_blank')
  }

  const fmtStyle = (fmt) => FORMAT_STYLES[fmt?.toUpperCase()] || { bg: 'bg-surface-500' }

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="section-title">Resource Library</h1>
          <p className="text-sm text-surface-500 mt-1 font-medium">Discover, share, and download premium teaching resources.</p>
        </div>
        <button onClick={() => { if (!currentUser) return navigate('/login'); setShowUpload(true) }} className="btn-primary py-2.5 px-5 text-sm flex items-center gap-2 shrink-0 self-start sm:self-auto">
          <Upload className="w-4 h-4" /> Upload Resource
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6 bg-surface-100 p-1.5 rounded-xl w-max">
        <button 
          onClick={() => setActiveTab('community')}
          className={`px-5 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'community' ? 'bg-white text-primary-700 shadow-sm' : 'text-surface-600 hover:text-surface-900'}`}
        >
          Community Uploads
        </button>
        <button 
          onClick={() => setActiveTab('global')}
          className={`px-5 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'global' ? 'bg-white text-primary-700 shadow-sm' : 'text-surface-600 hover:text-surface-900'}`}
        >
          Global Free Resources
        </button>
      </div>

      {/* Filters (Only for Community) */}
      {activeTab === 'community' && (
        <div className="glass-card-solid p-4 mb-6 animate-fade-in-up">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
              <input
                type="text" placeholder="Search resources..."
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="input-field pl-12"
              />
            </div>
            <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} className="input-field w-full sm:w-44">
              {SUBJECTS.map(s => <option key={s} value={s}>{s === 'All' ? 'All Subjects' : s}</option>)}
            </select>
            <select value={selectedType} onChange={e => setSelectedType(e.target.value)} className="input-field w-full sm:w-44">
              {TYPES.map(t => <option key={t} value={t}>{t === 'All' ? 'All Types' : t}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && activeTab === 'community' && <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary-400" /></div>}

      {/* Empty State */}
      {!loading && filtered.length === 0 && activeTab === 'community' && (
        <div className="glass-card-solid p-12 text-center animate-fade-in-up">
          <FileText className="w-12 h-12 text-surface-300 mx-auto mb-3" />
          <h3 className="font-semibold text-surface-700 mb-1">No resources found</h3>
          <p className="text-sm text-surface-500">Be the first to upload a resource for the community!</p>
        </div>
      )}

      {/* Resource Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {activeTab === 'global' ? (
          [...apiResources, ...GLOBAL_RESOURCES].map((resource, idx) => (
            <div key={resource.id} className="glass-card-solid overflow-hidden card-hover animate-slide-up hover:border-primary-300 border border-transparent shadow-[0_4px_20px_rgba(0,0,0,0.04)]" style={{ animationDelay: `${idx * 0.05}s` }}>
              <div className="p-5 flex flex-col h-full">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-primary-600 flex items-center justify-center text-white font-bold shrink-0 shadow-sm">
                    {resource.title[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-extrabold text-sm text-surface-900 leading-tight">{resource.title}</h3>
                    <span className="inline-block px-2 py-0.5 mt-1.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-md uppercase tracking-wide">{resource.type}</span>
                  </div>
                </div>
                
                <p className="text-xs text-surface-600 leading-relaxed mb-6 flex-1">{resource.desc}</p>
                
                <div className="flex items-center justify-between pt-4 border-t border-surface-100 mt-auto">
                  <span className="font-bold text-sm text-emerald-600">Free</span>
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-5 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors shadow-sm flex items-center gap-1.5"
                  >
                    Open Link <CheckCircle2 className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          ))
        ) : (
          filtered.map((resource, idx) => {
          const style = fmtStyle(resource.format)
          return (
            <div key={resource.id} className="glass-card-solid overflow-hidden card-hover animate-slide-up" style={{ animationDelay: `${idx * 0.05}s` }}>
              <div className="p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-12 h-12 rounded-xl ${style.bg} flex items-center justify-center text-white font-bold text-xs shrink-0`}>
                    {resource.format}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-surface-900 line-clamp-2">{resource.title}</h3>
                    <p className="text-xs text-surface-500 mt-0.5">by {resource.authorName}</p>
                  </div>
                </div>

                {resource.description && (
                  <p className="text-xs text-surface-600 line-clamp-2 mb-3">{resource.description}</p>
                )}

                <div className="flex flex-wrap gap-1.5 mb-3">
                  {resource.subject && <span className="badge-primary text-[10px]">{resource.subject}</span>}
                  {resource.classLevel && <span className="badge bg-surface-100 text-surface-600 text-[10px]">{resource.classLevel}</span>}
                  {resource.type && <span className="badge bg-surface-100 text-surface-600 text-[10px]">{resource.type}</span>}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-surface-100">
                  <div className="flex items-center gap-3 text-xs text-surface-500">
                    {resource.rating > 0 && (
                      <span className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> {resource.rating}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Download className="w-3.5 h-3.5" /> {resource.downloads || 0}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold text-sm ${resource.price === 'Free' ? 'text-emerald-600' : 'text-primary-700'}`}>
                      {resource.price}
                    </span>
                    <button
                      onClick={() => handleDownload(resource)}
                      className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors active:scale-95"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })
        )}
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowUpload(false)}>
          <div className="bg-white rounded-2xl shadow-glass w-full max-w-lg p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold font-display">Upload Resource</h2>
              <button onClick={() => setShowUpload(false)} className="p-1.5 hover:bg-surface-100 rounded-lg">
                <X className="w-5 h-5 text-surface-500" />
              </button>
            </div>

            {uploadSuccess ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-3" />
                <p className="font-bold text-surface-900">Resource Uploaded!</p>
                <p className="text-sm text-surface-500">It will appear in the library shortly.</p>
              </div>
            ) : (
              <form onSubmit={handleUpload} className="space-y-4">
                <input
                  type="text" placeholder="Resource Title *" required
                  value={uploadForm.title} onChange={e => setUploadForm(p => ({ ...p, title: e.target.value }))}
                  className="input-field"
                />
                <textarea
                  placeholder="Description"
                  value={uploadForm.description} onChange={e => setUploadForm(p => ({ ...p, description: e.target.value }))}
                  className="input-field min-h-[70px] resize-none"
                />
                <div className="grid grid-cols-2 gap-3">
                  <select required value={uploadForm.subject} onChange={e => setUploadForm(p => ({ ...p, subject: e.target.value }))} className="input-field">
                    <option value="">Select Subject *</option>
                    {SUBJECTS.filter(s => s !== 'All').map(s => <option key={s}>{s}</option>)}
                  </select>
                  <select value={uploadForm.classLevel} onChange={e => setUploadForm(p => ({ ...p, classLevel: e.target.value }))} className="input-field">
                    <option value="">Select Class</option>
                    {CLASSES.filter(c => c !== 'All').map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <select value={uploadForm.type} onChange={e => setUploadForm(p => ({ ...p, type: e.target.value }))} className="input-field">
                  <option value="">Resource Type</option>
                  {TYPES.filter(t => t !== 'All').map(t => <option key={t}>{t}</option>)}
                </select>

                {/* File Drop Zone */}
                <label className="block border-2 border-dashed border-surface-300 rounded-xl p-6 text-center hover:border-primary-400 transition-colors cursor-pointer">
                  {uploadFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <FileText className="w-8 h-8 text-primary-500" />
                      <div className="text-left">
                        <p className="text-sm font-semibold text-surface-800">{uploadFile.name}</p>
                        <p className="text-xs text-surface-500">{formatFileSize(uploadFile.size)}</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-surface-300 mx-auto mb-2" />
                      <p className="text-sm text-surface-600">Click or drag file to upload</p>
                      <p className="text-xs text-surface-400 mt-1">PDF, PPT, DOC, Images (Max 25MB)</p>
                    </>
                  )}
                  <input type="file" className="hidden" accept=".pdf,.ppt,.pptx,.doc,.docx,.jpg,.jpeg,.png" onChange={e => setUploadFile(e.target.files[0])} />
                </label>

                <div className="flex gap-3">
                  <select value={uploadForm.price} onChange={e => setUploadForm(p => ({ ...p, price: e.target.value }))} className="input-field w-1/3">
                    <option>Free</option>
                    <option>Paid</option>
                  </select>
                  {uploadForm.price === 'Paid' && (
                    <input
                      type="text" placeholder="Price (e.g. ₹49)"
                      value={uploadForm.priceAmount} onChange={e => setUploadForm(p => ({ ...p, priceAmount: e.target.value }))}
                      className="input-field flex-1"
                    />
                  )}
                </div>

                <button
                  type="submit"
                  disabled={uploading || !uploadFile || !uploadForm.title}
                  className="btn-primary w-full py-3 flex items-center justify-center gap-2"
                >
                  {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</> : <><Upload className="w-4 h-4" /> Upload Resource</>}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
