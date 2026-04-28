import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../contexts/AuthContext'
import { useGamification } from '../contexts/GamificationContext'
import { db } from '../utils/firebase'
import {
  collection, addDoc, onSnapshot, query, orderBy,
  serverTimestamp, updateDoc, doc, increment, deleteDoc
} from 'firebase/firestore'
import { uploadToCloudinary, formatFileSize, downloadFromCloudinary, validateMarketplaceFile } from '../utils/cloudinary'
import {
  Search, Download, Upload, Star, X, Loader2, FileText, CheckCircle2, Coins,
  FolderOpen, Store, Globe2, Cloud, FolderClosed, ArrowRight, ShieldCheck,
  AlertCircle, Clock, XCircle, HardDrive, Trash2
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

const ResourceCard = ({ resource, idx, fmtStyle, handleDownload, handleDelete, currentUser, stats, downloadingId, userProfile }) => {
  const style = fmtStyle(resource.format)
  const isOwner = currentUser?.uid === resource.authorId
  const isAdmin = userProfile?.role === 'superadmin' || userProfile?.role === 'admin'
  const canDelete = isOwner || isAdmin
  const isPending = resource.status === 'pending'
  const isRejected = resource.status === 'rejected'
  const isDownloading = downloadingId === resource.id

  return (
    <div className={`bg-white rounded-[24px] overflow-hidden group hover:-translate-y-1 transition-all duration-300 shadow-sm hover:shadow-xl border flex flex-col h-full ${isRejected ? 'border-red-200 bg-red-50/30' : isPending ? 'border-amber-200' : 'border-surface-200 hover:border-indigo-300'}`} style={{ animationDelay: `${idx * 0.05}s` }}>
      <div className="p-6 flex flex-col h-full">
        {/* Status Badge for owner */}
        {isOwner && (isPending || isRejected) && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl mb-4 text-xs font-bold ${isPending ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {isPending ? <Clock className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
            {isPending ? 'Pending Admin Review' : 'Rejected'}
            {isRejected && resource.rejectionReason && (
              <span className="font-normal ml-1">— {resource.rejectionReason}</span>
            )}
          </div>
        )}

        <div className="flex items-start gap-4 mb-4">
          <div className={`w-12 h-12 rounded-2xl ${style.bg} flex items-center justify-center text-white font-black text-sm shrink-0 shadow-md group-hover:scale-110 transition-transform`}>
            {resource.format}
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <h3 className="font-bold text-[15px] text-surface-900 leading-tight mb-1">{resource.title}</h3>
            <p className="text-xs font-semibold text-surface-400">by {resource.authorName}</p>
          </div>
          {canDelete && (
            <button
              onClick={() => handleDelete(resource)}
              className="p-2 text-surface-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100 shrink-0"
              title="Delete Resource"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {resource.description && (
          <p className="text-sm text-surface-600 leading-relaxed line-clamp-2 mb-4 flex-1">{resource.description}</p>
        )}

        <div className="flex flex-wrap gap-2 mb-5">
          {resource.subject && <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-black rounded-md uppercase tracking-wider">{resource.subject}</span>}
          {resource.classLevel && <span className="px-2.5 py-1 bg-surface-100 text-surface-600 text-[10px] font-black rounded-md uppercase tracking-wider">{resource.classLevel}</span>}
          {resource.type && <span className="px-2.5 py-1 bg-surface-100 text-surface-600 text-[10px] font-black rounded-md uppercase tracking-wider">{resource.type}</span>}
          {resource.fileSize && <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-md uppercase tracking-wider">{resource.fileSize}</span>}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-surface-100 mt-auto">
          <div className="flex items-center gap-3 text-xs font-bold text-surface-400">
            {resource.rating > 0 && (
              <span className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> {resource.rating}
              </span>
            )}
            <span className="flex items-center gap-1" title="Total Downloads">
              <Download className="w-3.5 h-3.5" /> {resource.downloads || 0}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`font-black text-sm flex items-center gap-1 ${resource.price === 'Free' || !resource.coinPrice ? 'text-emerald-600 tracking-wide uppercase' : 'text-amber-600'}`}>
              {resource.price === 'Free' || !resource.coinPrice ? 'Free' : <><span className="text-lg">🪙</span> {resource.coinPrice}</>}
            </span>
            <button
              onClick={() => handleDownload(resource)}
              disabled={isDownloading || isPending || isRejected}
              className={`p-2.5 text-white rounded-xl transition-all active:scale-95 shadow-md flex items-center gap-2 ${isPending || isRejected ? 'bg-surface-300 cursor-not-allowed' : resource.price === 'Free' || !resource.coinPrice ? 'bg-slate-900 hover:bg-black' : 'bg-amber-500 hover:bg-amber-600 shadow-[0_4px_12px_rgba(245,158,11,0.3)]'}`}
              title={isPending ? 'Pending review' : isRejected ? 'Rejected' : 'Download File'}
            >
              {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Resources() {
  const navigate = useNavigate()
  const { currentUser, userProfile } = useAuth()
  const { spendCoins, stats } = useGamification()
  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('All')
  const [selectedType, setSelectedType] = useState('All')
  const [showUpload, setShowUpload] = useState(false)
  const [activeTab, setActiveTab] = useState('my-drive') // 'my-drive' | 'marketplace' | 'global'
  const [apiResources, setApiResources] = useState([])

  // Upload Form state
  const [uploadFile, setUploadFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [uploadMode, setUploadMode] = useState('marketplace') // 'personal' | 'marketplace'
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [fileError, setFileError] = useState('')
  const [formErrors, setFormErrors] = useState({})
  const [downloadingId, setDownloadingId] = useState(null)
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

  // Marketplace only shows approved resources (not user's own pending/rejected)
  const filtered = resources.filter(r => {
    if (r.status && r.status !== 'approved') return false
    if (r.uploadMode === 'personal') return false
    const title = r.title || ''
    const author = r.authorName || ''
    const matchSearch = title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        author.toLowerCase().includes(searchTerm.toLowerCase())
    const matchSubject = selectedSubject === 'All' || r.subject === selectedSubject
    const matchType = selectedType === 'All' || r.type === selectedType
    return matchSearch && matchSubject && matchType
  })

  function validateUploadForm() {
    const errors = {}
    const isMarketplace = uploadMode === 'marketplace'

    if (!uploadForm.title || uploadForm.title.trim().length < 5) errors.title = 'Title must be at least 5 characters'
    if (uploadForm.title.length > 100) errors.title = 'Title must be under 100 characters'

    if (isMarketplace) {
      if (!uploadForm.description || uploadForm.description.trim().length < 20) errors.description = 'Description must be at least 20 characters for marketplace'
      if (!uploadForm.subject) errors.subject = 'Subject is required'
      if (!uploadForm.classLevel) errors.classLevel = 'Class level is required'
      if (!uploadForm.type) errors.type = 'Resource type is required'
      if (!termsAccepted) errors.terms = 'You must confirm this is your original work'
      if (uploadForm.price === 'Paid' && (!uploadForm.priceAmount || Number(uploadForm.priceAmount) < 1)) errors.price = 'Set a valid coin price (min 1)'
    }

    if (!uploadFile) errors.file = 'Please select a file to upload'
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  function handleFileSelect(file) {
    setFileError('')
    if (!file) return

    // For marketplace, validate file type strictly
    if (uploadMode === 'marketplace') {
      const validation = validateMarketplaceFile(file)
      if (!validation.valid) {
        setFileError(validation.error)
        setUploadFile(null)
        return
      }
    } else {
      // Personal drive — only check size
      const maxBytes = 25 * 1024 * 1024
      if (file.size > maxBytes) {
        setFileError(`File too large. Max 25MB. Your file: ${formatFileSize(file.size)}`)
        setUploadFile(null)
        return
      }
    }

    setUploadFile(file)
  }

  async function handleUpload(e) {
    e.preventDefault()
    if (!currentUser) return
    if (!validateUploadForm()) return
    setUploading(true)

    try {
      const result = await uploadToCloudinary(uploadFile)
      const coinPrice = uploadForm.price === 'Free' ? 0 : Number(uploadForm.priceAmount) || 0
      const isMarketplace = uploadMode === 'marketplace'
      
      await addDoc(collection(db, 'resources'), {
        title: uploadForm.title.trim(),
        description: uploadForm.description.trim(),
        subject: uploadForm.subject,
        classLevel: uploadForm.classLevel,
        type: uploadForm.type || 'Other',
        price: coinPrice === 0 ? 'Free' : `${coinPrice} Coins`,
        coinPrice: coinPrice,
        fileUrl: result.url,
        fileName: uploadFile.name,
        format: result.format?.toUpperCase() || 'FILE',
        fileSize: formatFileSize(result.bytes),
        fileSizeBytes: result.bytes || uploadFile.size,
        authorId: currentUser.uid,
        authorName: userProfile?.name || currentUser.email,
        downloads: 0,
        rating: 0,
        status: isMarketplace ? 'pending' : 'approved',
        uploadMode: isMarketplace ? 'marketplace' : 'personal',
        createdAt: serverTimestamp(),
      })
      setUploadSuccess(true)
      setTimeout(() => {
        setShowUpload(false)
        setUploadSuccess(false)
        setUploadFile(null)
        setFileError('')
        setFormErrors({})
        setTermsAccepted(false)
        setUploadForm({ title: '', description: '', subject: '', classLevel: '', type: '', price: 'Free', priceAmount: '' })
      }, 2000)
    } catch (err) {
      console.error('Upload error:', err)
      alert('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  async function handleDownload(resource) {
    if (!currentUser) return navigate('/login')
    
    // Check price and handle transaction
    const price = resource.coinPrice || 0
    if (price > 0 && currentUser.uid !== resource.authorId) {
      if (stats.coins < price) {
        alert(`You need ${price} Coins to download this premium resource. You currently have ${stats.coins} Coins.`)
        return
      }
      if (!window.confirm(`This premium resource costs ${price} Coins. Do you want to spend ${price} Coins to unlock and download it?`)) return
      
      const success = await spendCoins(price, 'purchase_resource')
      if (!success) {
        alert("Transaction failed.")
        return
      }
      
      // Credit coins to author
      try {
        await updateDoc(doc(db, 'gamification', resource.authorId), { coins: increment(price) })
      } catch (err) {
        console.error("Failed to credit author", err)
      }
    }

    setDownloadingId(resource.id)
    await updateDoc(doc(db, 'resources', resource.id), { downloads: increment(1) }).catch(() => {})
    
    // Build proper filename
    const fileName = resource.fileName || `${resource.title}.${(resource.format || 'pdf').toLowerCase()}`
    await downloadFromCloudinary(resource.fileUrl, fileName)
    setDownloadingId(null)
  }

  async function handleDeleteResource(resource) {
    const isOwner = currentUser?.uid === resource.authorId
    const isAdmin = userProfile?.role === 'superadmin' || userProfile?.role === 'admin'
    if (!isOwner && !isAdmin) return
    
    if (!window.confirm(`Are you sure you want to delete "${resource.title}"? This cannot be undone.`)) return
    
    try {
      await deleteDoc(doc(db, 'resources', resource.id))
    } catch (err) {
      console.error('Delete error:', err)
      alert('Failed to delete resource. Please try again.')
    }
  }

  const fmtStyle = (fmt) => FORMAT_STYLES[fmt?.toUpperCase()] || { bg: 'bg-surface-500' }

  return (
    <div className="max-w-6xl mx-auto animate-fade-in pb-12">
      
      {/* ── Premium Hero Section ── */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-[32px] p-8 sm:p-12 mb-8 relative overflow-hidden shadow-2xl border border-white/10">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-500/20 rounded-full blur-[120px] pointer-events-none -mr-40 -mt-40"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-amber-500/10 rounded-full blur-[100px] pointer-events-none -ml-40 -mb-40"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center justify-between">
          <div className="text-center md:text-left flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-indigo-300 text-xs font-bold uppercase tracking-widest mb-4">
              <Cloud className="w-4 h-4" /> Secure Cloud Storage
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-white font-display mb-4 leading-tight">My Files & Vault</h1>
            <p className="text-indigo-200 text-sm sm:text-base max-w-xl leading-relaxed mx-auto md:mx-0">
              Your centralized hub for digital teaching assets. Securely store your files, monetize your best lesson plans in the marketplace, and discover premium global resources.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 shrink-0 w-full md:w-auto">
             <button onClick={() => { if (!currentUser) return navigate('/login'); setShowUpload(true) }} className="px-6 py-3.5 bg-white hover:bg-indigo-50 text-indigo-900 font-extrabold rounded-xl shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-2">
               <Upload className="w-5 h-5"/> Upload New File
             </button>
          </div>
        </div>
      </div>

      {/* ── Tabs Navigation ── */}
      <div className="flex flex-wrap items-center gap-2 mb-8 p-1.5 bg-surface-100/50 backdrop-blur-sm border border-surface-200 rounded-2xl w-full sm:w-max mx-auto md:mx-0 shadow-sm">
        <button 
          onClick={() => setActiveTab('my-drive')}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl transition-all whitespace-nowrap flex-1 sm:flex-auto justify-center ${activeTab === 'my-drive' ? 'bg-white text-indigo-700 shadow-md ring-1 ring-black/5' : 'text-surface-500 hover:text-surface-900 hover:bg-surface-200/50'}`}
        >
          <FolderOpen className="w-4 h-4" /> My Cloud Drive
        </button>
        <button 
          onClick={() => setActiveTab('marketplace')}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl transition-all whitespace-nowrap flex-1 sm:flex-auto justify-center ${activeTab === 'marketplace' ? 'bg-white text-amber-600 shadow-md ring-1 ring-black/5' : 'text-surface-500 hover:text-surface-900 hover:bg-surface-200/50'}`}
        >
          <Store className="w-4 h-4" /> Marketplace
        </button>
        <button 
          onClick={() => setActiveTab('global')}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl transition-all whitespace-nowrap flex-1 sm:flex-auto justify-center ${activeTab === 'global' ? 'bg-white text-emerald-600 shadow-md ring-1 ring-black/5' : 'text-surface-500 hover:text-surface-900 hover:bg-surface-200/50'}`}
        >
          <Globe2 className="w-4 h-4" /> Global Library
        </button>
      </div>

      {/* ── Content Area ── */}
      
      {/* Loading State */}
      {loading && activeTab !== 'global' && <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-indigo-400" /></div>}

      {/* My Cloud Drive */}
      {!loading && activeTab === 'my-drive' && (
        <div className="animate-fade-in-up">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-surface-900">Your Uploaded Files</h2>
            <span className="text-sm font-medium text-surface-500">{resources.filter(r => r.authorId === currentUser?.uid).length} Files stored</span>
          </div>
          
          {resources.filter(r => r.authorId === currentUser?.uid).length === 0 ? (
            <div className="bg-white border border-surface-200 border-dashed rounded-[32px] p-12 text-center shadow-sm">
              <div className="w-20 h-20 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <FolderClosed className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-surface-900 mb-2">Your vault is empty</h3>
              <p className="text-surface-500 max-w-md mx-auto mb-6">Securely upload your lesson plans, worksheets, and resources to store them or sell them on the marketplace.</p>
              <button onClick={() => setShowUpload(true)} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-md inline-flex items-center gap-2">
                <Upload className="w-4 h-4" /> Upload First File
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {resources.filter(r => r.authorId === currentUser?.uid).map((resource, idx) => (
                <ResourceCard key={resource.id} resource={resource} idx={idx} fmtStyle={fmtStyle} handleDownload={handleDownload} handleDelete={handleDeleteResource} currentUser={currentUser} stats={stats} downloadingId={downloadingId} userProfile={userProfile} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Marketplace */}
      {!loading && activeTab === 'marketplace' && (
        <div className="animate-fade-in-up">
          {/* Filters */}
          <div className="bg-white p-4 rounded-[24px] mb-6 shadow-sm border border-surface-200">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                <input
                  type="text" placeholder="Search premium resources..."
                  value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                  className="input-field pl-12 bg-surface-50 border-transparent focus:bg-white"
                />
              </div>
              <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} className="input-field w-full sm:w-44 bg-surface-50 border-transparent focus:bg-white">
                {SUBJECTS.map(s => <option key={s} value={s}>{s === 'All' ? 'All Subjects' : s}</option>)}
              </select>
              <select value={selectedType} onChange={e => setSelectedType(e.target.value)} className="input-field w-full sm:w-44 bg-surface-50 border-transparent focus:bg-white">
                {TYPES.map(t => <option key={t} value={t}>{t === 'All' ? 'All Types' : t}</option>)}
              </select>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="bg-white rounded-[32px] p-12 text-center border border-surface-200 shadow-sm">
              <Store className="w-12 h-12 text-surface-300 mx-auto mb-3" />
              <h3 className="font-bold text-surface-700 mb-1">No resources found</h3>
              <p className="text-sm text-surface-500">Try adjusting your filters or search term.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((resource, idx) => (
                <ResourceCard key={resource.id} resource={resource} idx={idx} fmtStyle={fmtStyle} handleDownload={handleDownload} handleDelete={handleDeleteResource} currentUser={currentUser} stats={stats} downloadingId={downloadingId} userProfile={userProfile} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Global Library */}
      {activeTab === 'global' && (
        <div className="animate-fade-in-up">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...apiResources, ...GLOBAL_RESOURCES].map((resource, idx) => (
              <div key={resource.id} className="bg-white rounded-[24px] overflow-hidden group hover:-translate-y-1 transition-all duration-300 shadow-sm hover:shadow-xl border border-surface-200 hover:border-emerald-300 flex flex-col h-full" style={{ animationDelay: `${idx * 0.05}s` }}>
                <div className="p-6 flex flex-col h-full">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-black text-xl shrink-0 shadow-md group-hover:scale-110 transition-transform">
                      {resource.title ? resource.title[0] : '?'}
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                      <h3 className="font-bold text-[15px] text-surface-900 leading-tight mb-1.5">{resource.title || 'Untitled'}</h3>
                      <span className="inline-flex px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-black rounded-md uppercase tracking-wider">{resource.type}</span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-surface-600 leading-relaxed mb-6 flex-1">{resource.desc}</p>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-surface-100 mt-auto">
                    <span className="font-black text-sm text-emerald-600 tracking-wide uppercase">Free Access</span>
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-5 py-2.5 bg-surface-900 text-white text-xs font-bold rounded-xl hover:bg-black transition-colors shadow-md flex items-center gap-1.5 group/btn"
                    >
                      Open Link <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && createPortal(
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden" onClick={() => setShowUpload(false)}>
          <div className="bg-white w-full max-w-lg rounded-t-[32px] sm:rounded-[32px] shadow-2xl p-6 sm:p-8 animate-slide-up flex flex-col max-h-[90vh] sm:max-h-[85vh]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5 shrink-0">
              <h2 className="text-2xl font-bold font-display text-surface-900">Upload Resource</h2>
              <button onClick={() => setShowUpload(false)} className="p-2 hover:bg-surface-100 rounded-xl transition-colors">
                <X className="w-5 h-5 text-surface-500" />
              </button>
            </div>
            
            <div className="overflow-y-auto custom-scrollbar pr-2 -mr-2 pb-4">

            {uploadSuccess ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-3" />
                <p className="font-bold text-surface-900">{uploadMode === 'marketplace' ? 'Submitted for Review!' : 'File Uploaded!'}</p>
                <p className="text-sm text-surface-500 mt-1">
                  {uploadMode === 'marketplace' 
                    ? 'Your resource will be reviewed by admin before appearing on the marketplace.' 
                    : 'Your file has been saved to your personal drive.'}
                </p>
              </div>
            ) : (
              <form onSubmit={handleUpload} className="space-y-4">
                {/* Upload Mode Toggle */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-surface-100 rounded-xl">
                  <button type="button" onClick={() => { setUploadMode('personal'); setFileError(''); setFormErrors({}) }}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${uploadMode === 'personal' ? 'bg-white text-indigo-700 shadow-md' : 'text-surface-500 hover:text-surface-700'}`}>
                    <HardDrive className="w-4 h-4" /> My Drive
                  </button>
                  <button type="button" onClick={() => { setUploadMode('marketplace'); setFileError(''); setFormErrors({}) }}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${uploadMode === 'marketplace' ? 'bg-white text-amber-600 shadow-md' : 'text-surface-500 hover:text-surface-700'}`}>
                    <Store className="w-4 h-4" /> Marketplace
                  </button>
                </div>

                {uploadMode === 'marketplace' && (
                  <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <ShieldCheck className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-xs font-medium text-amber-800">Marketplace uploads are reviewed by admin before going live. Only educational documents (PDF, PPT, DOC) are allowed.</p>
                  </div>
                )}

                {/* Title */}
                <div>
                  <input type="text" placeholder="Resource Title *"
                    value={uploadForm.title} onChange={e => setUploadForm(p => ({ ...p, title: e.target.value }))}
                    className={`input-field ${formErrors.title ? 'border-red-400 ring-1 ring-red-400' : ''}`} />
                  {formErrors.title && <p className="text-xs text-red-500 font-bold mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{formErrors.title}</p>}
                </div>

                {/* Description */}
                <div>
                  <textarea placeholder={uploadMode === 'marketplace' ? "Describe your resource in detail (min 20 chars) *" : "Description (optional)"}
                    value={uploadForm.description} onChange={e => setUploadForm(p => ({ ...p, description: e.target.value }))}
                    className={`input-field min-h-[70px] resize-none ${formErrors.description ? 'border-red-400 ring-1 ring-red-400' : ''}`} />
                  {formErrors.description && <p className="text-xs text-red-500 font-bold mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{formErrors.description}</p>}
                </div>

                {/* Subject + Class */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <select value={uploadForm.subject} onChange={e => setUploadForm(p => ({ ...p, subject: e.target.value }))}
                      className={`input-field ${formErrors.subject ? 'border-red-400 ring-1 ring-red-400' : ''}`}>
                      <option value="">Select Subject{uploadMode === 'marketplace' ? ' *' : ''}</option>
                      {SUBJECTS.filter(s => s !== 'All').map(s => <option key={s}>{s}</option>)}
                    </select>
                    {formErrors.subject && <p className="text-xs text-red-500 font-bold mt-1"><AlertCircle className="w-3 h-3 inline" /> Required</p>}
                  </div>
                  <div>
                    <select value={uploadForm.classLevel} onChange={e => setUploadForm(p => ({ ...p, classLevel: e.target.value }))}
                      className={`input-field ${formErrors.classLevel ? 'border-red-400 ring-1 ring-red-400' : ''}`}>
                      <option value="">Select Class{uploadMode === 'marketplace' ? ' *' : ''}</option>
                      {CLASSES.filter(c => c !== 'All').map(c => <option key={c}>{c}</option>)}
                    </select>
                    {formErrors.classLevel && <p className="text-xs text-red-500 font-bold mt-1"><AlertCircle className="w-3 h-3 inline" /> Required</p>}
                  </div>
                </div>

                {/* Resource Type */}
                <div>
                  <select value={uploadForm.type} onChange={e => setUploadForm(p => ({ ...p, type: e.target.value }))}
                    className={`input-field ${formErrors.type ? 'border-red-400 ring-1 ring-red-400' : ''}`}>
                    <option value="">Resource Type{uploadMode === 'marketplace' ? ' *' : ''}</option>
                    {TYPES.filter(t => t !== 'All').map(t => <option key={t}>{t}</option>)}
                  </select>
                  {formErrors.type && <p className="text-xs text-red-500 font-bold mt-1"><AlertCircle className="w-3 h-3 inline" /> Required</p>}
                </div>

                {/* File Drop Zone */}
                <div>
                  <label className={`block border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${fileError ? 'border-red-400 bg-red-50' : uploadFile ? 'border-emerald-400 bg-emerald-50' : 'border-surface-300 bg-surface-50 hover:border-indigo-400'}`}>
                    {uploadFile ? (
                      <div className="flex items-center justify-center gap-3">
                        <FileText className="w-8 h-8 text-emerald-600" />
                        <div className="text-left">
                          <p className="text-sm font-semibold text-surface-800">{uploadFile.name}</p>
                          <p className="text-xs text-surface-500">{formatFileSize(uploadFile.size)}</p>
                        </div>
                        <button type="button" onClick={(e) => { e.preventDefault(); setUploadFile(null); setFileError('') }} className="ml-2 p-1 hover:bg-red-100 rounded-lg">
                          <X className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-surface-300 mx-auto mb-2" />
                        <p className="text-sm text-surface-600">Click or drag file to upload</p>
                        <p className="text-xs text-surface-400 mt-1">
                          {uploadMode === 'marketplace' ? 'PDF, PPT, PPTX, DOC, DOCX only (Max 25MB)' : 'Any file type (Max 25MB)'}
                        </p>
                      </>
                    )}
                    <input type="file" className="hidden"
                      accept={uploadMode === 'marketplace' ? '.pdf,.ppt,.pptx,.doc,.docx' : '*'}
                      onChange={e => handleFileSelect(e.target.files[0])} />
                  </label>
                  {fileError && <p className="text-xs text-red-500 font-bold mt-2 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5 shrink-0" />{fileError}</p>}
                  {formErrors.file && !fileError && <p className="text-xs text-red-500 font-bold mt-1"><AlertCircle className="w-3 h-3 inline" /> {formErrors.file}</p>}
                </div>

                {/* Price (marketplace only) */}
                {uploadMode === 'marketplace' && (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <select value={uploadForm.price} onChange={e => setUploadForm(p => ({ ...p, price: e.target.value }))} className="input-field w-full sm:w-1/3 font-bold text-amber-600 bg-amber-50">
                      <option value="Free">Free</option>
                      <option value="Paid">Premium (Coins)</option>
                    </select>
                    {uploadForm.price === 'Paid' && (
                      <div className="relative flex-1">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg">🪙</span>
                        <input type="number" min="1" placeholder="Set Price (e.g. 50)"
                          value={uploadForm.priceAmount} onChange={e => setUploadForm(p => ({ ...p, priceAmount: e.target.value }))}
                          className={`input-field pl-12 font-bold w-full ${formErrors.price ? 'border-red-400 ring-1 ring-red-400' : ''}`} />
                      </div>
                    )}
                  </div>
                )}

                {/* Terms Checkbox (marketplace only) */}
                {uploadMode === 'marketplace' && (
                  <div>
                    <label className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors ${termsAccepted ? 'bg-emerald-50 border border-emerald-200' : formErrors.terms ? 'bg-red-50 border border-red-200' : 'bg-surface-50 border border-surface-200'}`}>
                      <input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded border-surface-300 text-emerald-600 focus:ring-emerald-500" />
                      <span className="text-xs font-medium text-surface-700 leading-relaxed">
                        I confirm this is my <strong>original work</strong> and I have the right to distribute it. I understand it will be reviewed before being listed.
                      </span>
                    </label>
                    {formErrors.terms && <p className="text-xs text-red-500 font-bold mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{formErrors.terms}</p>}
                  </div>
                )}

                <button type="submit" disabled={uploading}
                  className={`w-full py-3.5 flex items-center justify-center gap-2 shadow-md border-0 text-[15px] font-extrabold rounded-xl transition-all ${uploadMode === 'marketplace' ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white' : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white'}`}>
                  {uploading 
                    ? <><Loader2 className="w-5 h-5 animate-spin" /> Uploading...</>
                    : uploadMode === 'marketplace' 
                      ? <><ShieldCheck className="w-5 h-5" /> Submit for Review</>
                      : <><HardDrive className="w-5 h-5" /> Save to My Drive</>}
                </button>
              </form>
            )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
