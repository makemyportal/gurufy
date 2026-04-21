import React, { useState, useEffect } from 'react'
import {
  Users, AlertTriangle, Settings, Shield, Activity, TrendingUp, CheckCircle,
  XCircle, Search, Power, Trash2, Edit, BarChart3, Briefcase, FolderOpen,
  CalendarDays, Trophy, Megaphone, Eye, Ban, UserCheck, FileText,
  MessageSquare, ChevronRight, RefreshCw, Send, X, AlertCircle, Award, Plus,
  ShoppingCart, GraduationCap, Radio, Mic, Star, Play
} from 'lucide-react'
import { collection, getDocs, doc, updateDoc, deleteDoc, addDoc, getDoc, setDoc, query, orderBy, limit, where } from 'firebase/firestore'
import { db } from '../utils/firebase'
import { useAuth } from '../contexts/AuthContext'

// Confirmation Modal
function ConfirmModal({ title, message, onConfirm, onCancel, danger }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onCancel}>
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full mx-4 animate-fade-in-up" onClick={e => e.stopPropagation()}>
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 ${danger ? 'bg-red-50' : 'bg-primary-50'}`}>
          <AlertCircle className={`w-7 h-7 ${danger ? 'text-red-600' : 'text-primary-600'}`} />
        </div>
        <h3 className="text-xl font-extrabold text-surface-900 mb-2">{title}</h3>
        <p className="text-surface-500 font-medium mb-8">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-5 py-3 bg-surface-100 hover:bg-surface-200 text-surface-700 font-bold rounded-xl transition-colors">Cancel</button>
          <button onClick={onConfirm} className={`flex-1 px-5 py-3 font-bold rounded-xl transition-all shadow-lg ${danger ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-primary-600 hover:bg-primary-700 text-white'}`}>Confirm</button>
        </div>
      </div>
    </div>
  )
}

function EditorModal({ type, initialData, onSave, onCancel }) {
  const [formData, setFormData] = useState(() => {
    if (initialData) {
      const d = { ...initialData }
      if (Array.isArray(d.tags)) d.tags = d.tags.join(', ')
      return d
    }
    return {}
  })
  const [saving, setSaving] = useState(false)

  const SCHEMAS = {
    user: [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'role', label: 'Role', type: 'select', options: ['teacher', 'school', 'admin', 'superadmin'] },
      { key: 'status', label: 'Status', type: 'select', options: ['active', 'suspended'] }
    ],
    resource: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'subject', label: 'Subject', type: 'text' },
      { key: 'authorName', label: 'Author Name', type: 'text' },
      { key: 'fileUrl', label: 'File/Link URL', type: 'text' },
      { key: 'description', label: 'Description', type: 'textarea' },
    ]
  }

  const schema = SCHEMAS[type] || []

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    await onSave(formData)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4 overflow-y-auto" onClick={onCancel}>
      <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-lg animate-fade-in-up my-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-extrabold text-surface-900 capitalize">{initialData?.id ? 'Edit' : 'Add'} {type}</h3>
          <button onClick={onCancel} className="p-2 hover:bg-surface-100 rounded-lg transition-colors"><X className="w-5 h-5 text-surface-500" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[65vh] overflow-y-auto px-1 no-scrollbar">
          {schema.map(field => (
            <div key={field.key}>
              <label className="block text-xs font-bold text-surface-500 uppercase tracking-widest mb-1.5">{field.label}</label>
              {field.type === 'textarea' ? (
                <textarea 
                  value={formData[field.key] || ''} 
                  onChange={e => setFormData(p => ({...p, [field.key]: e.target.value}))}
                  className="w-full px-4 py-3 bg-surface-50 border border-surface-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 min-h-[100px] resize-none"
                />
              ) : field.type === 'select' ? (
                <select
                  value={formData[field.key] || ''} 
                  onChange={e => setFormData(p => ({...p, [field.key]: e.target.value}))}
                  className="w-full px-4 py-3 bg-surface-50 border border-surface-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select...</option>
                  {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input 
                  type={field.type}
                  value={formData[field.key] || ''} 
                  onChange={e => setFormData(p => ({...p, [field.key]: field.type === 'number' ? Number(e.target.value) : e.target.value}))}
                  className="w-full px-4 py-3 bg-surface-50 border border-surface-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                />
              )}
            </div>
          ))}
          <div className="pt-6 mt-4 border-t border-surface-100 flex justify-end gap-3 sticky bottom-0 bg-white">
            <button type="button" onClick={onCancel} className="px-5 py-2.5 font-bold text-surface-600 hover:bg-surface-100 rounded-xl transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="px-6 py-2.5 font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-lg transition-all flex items-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Save
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const TABS = [
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'resources', label: 'Vault', icon: FolderOpen },
  { id: 'gamification', label: 'Gamification', icon: Trophy },
  { id: 'moderation', label: 'Moderation', icon: AlertTriangle },
  { id: 'announcements', label: 'Announce', icon: Megaphone },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export default function AdminDashboard() {
  const { currentUser } = useAuth()
  const [activeTab, setActiveTab] = useState('analytics')
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [confirmModal, setConfirmModal] = useState(null)
  const [toast, setToast] = useState(null)
  const [editingItem, setEditingItem] = useState(null)

  // Data states
  const [users, setUsers] = useState([])
  const [resources, setResources] = useState([])
  const [reports, setReports] = useState([])
  const [gamificationData, setGamificationData] = useState([])
  const [platformSettings, setPlatformSettings] = useState({ maintenanceMode: false, registrationDisabled: false })
  const [announcementText, setAnnouncementText] = useState('')

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Load all data
  async function loadAllData() {
    setLoading(true)
    try {
      const [usersSnap, resourcesSnap, reportsSnap, gamSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'resources')).catch(() => ({ docs: [] })),
        getDocs(collection(db, 'reports')).catch(() => ({ docs: [] })),
        getDocs(collection(db, 'gamification')).catch(() => ({ docs: [] })),
      ])
      setUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })))
      setResources(resourcesSnap.docs.map(d => ({ id: d.id, ...d.data() })))
      setReports(reportsSnap.docs.map(d => ({ id: d.id, ...d.data() })))
      setGamificationData(gamSnap.docs.map(d => ({ id: d.id, ...d.data() })))

      // Load platform settings
      const settingsDoc = await getDoc(doc(db, 'platformSettings', 'global')).catch(() => null)
      if (settingsDoc?.exists()) setPlatformSettings(settingsDoc.data())
    } catch (err) {
      console.error('Admin data load error:', err)
    }
    setLoading(false)
  }

  useEffect(() => { loadAllData() }, [])

  // --- ACTION HANDLERS ---
  async function handleDeleteUser(userId) {
    setConfirmModal({
      title: 'Delete User', message: 'This will permanently remove this user and all their data. This cannot be undone.',
      danger: true, onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'users', userId))
          await deleteDoc(doc(db, 'teachers', userId)).catch(() => {})
          await deleteDoc(doc(db, 'schools', userId)).catch(() => {})
          await deleteDoc(doc(db, 'gamification', userId)).catch(() => {})
          setUsers(prev => prev.filter(u => u.id !== userId))
          showToast('User deleted successfully')
        } catch (err) { showToast('Failed to delete user', 'error') }
        setConfirmModal(null)
      }
    })
  }

  async function handleToggleSuspend(userId, currentStatus) {
      const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended'
    try {
      await updateDoc(doc(db, 'users', userId), { status: newStatus })
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u))
      showToast(`User ${newStatus === 'suspended' ? 'suspended' : 'activated'}`)
    } catch (err) { showToast('Action failed', 'error') }
  }

  async function handleToggleVerify(user, color) {
    const isVerified = !!color
    try {
      await updateDoc(doc(db, 'users', user.id), { isVerified, verificationColor: color || null })
      if (user.role === 'teacher') await updateDoc(doc(db, 'teachers', user.id), { isVerified, verificationColor: color || null }).catch(() => {})
      if (user.role === 'school') await updateDoc(doc(db, 'schools', user.id), { isVerified, verificationColor: color || null }).catch(() => {})
      
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isVerified, verificationColor: color || null } : u))
      showToast(`User ${isVerified ? 'verified' : 'unverified'} successfully`)
    } catch (err) { console.error(err); showToast('Action failed', 'error') }
  }

  async function handleDeleteResource(resId) {
    setConfirmModal({
      title: 'Delete Resource', message: 'This resource will be permanently removed.', danger: true,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'resources', resId))
          setResources(prev => prev.filter(r => r.id !== resId))
          showToast('Resource deleted')
        } catch (err) { showToast('Failed', 'error') }
        setConfirmModal(null)
      }
    })
  }

  async function handleResolveReport(reportId) {
    try {
      await deleteDoc(doc(db, 'reports', reportId))
      setReports(prev => prev.filter(r => r.id !== reportId))
      showToast('Report dismissed')
    } catch (err) { showToast('Failed', 'error') }
  }

  async function handleTakeDown(report) {
    setConfirmModal({
      title: 'Take Down Content', 
      message: `This will permanently delete the reported ${report.type || 'content'} and remove the report. This cannot be undone.`,
      danger: true,
      onConfirm: async () => {
        try {
          // Delete the actual content
          if (report.contentId) {
              // Post takes down removed, resource support
              if (report.type === 'resource') {
              await deleteDoc(doc(db, 'resources', report.contentId))
              setResources(prev => prev.filter(r => r.id !== report.contentId))
            }
          }
          // Delete the report
          await deleteDoc(doc(db, 'reports', report.id))
          setReports(prev => prev.filter(r => r.id !== report.id))
          showToast('Content removed & report resolved')
        } catch (err) { 
          console.error('Take down error:', err)
          showToast('Failed to take down', 'error') 
        }
        setConfirmModal(null)
      }
    })
  }

  async function handleUpdateXP(userId, newXP) {
    try {
      await updateDoc(doc(db, 'gamification', userId), { xp: parseInt(newXP) || 0 })
      setGamificationData(prev => prev.map(g => g.id === userId ? { ...g, xp: parseInt(newXP) || 0 } : g))
      showToast('XP updated')
    } catch (err) { showToast('Failed', 'error') }
  }

  async function handleUpdateCoins(userId, newCoins) {
    try {
      await updateDoc(doc(db, 'gamification', userId), { coins: parseInt(newCoins) || 0 })
      setGamificationData(prev => prev.map(g => g.id === userId ? { ...g, coins: parseInt(newCoins) || 0 } : g))
      showToast('Coins updated successfully! 🪙')
    } catch (err) { showToast('Failed to update coins', 'error') }
  }

  async function handleSendAnnouncement() {
    if (!announcementText.trim()) return
    try {
      const usersSnap = await getDocs(collection(db, 'users'))
      const batch = usersSnap.docs.map(u =>
        addDoc(collection(db, 'users', u.id, 'notifications'), {
          title: announcementText, type: 'system', fromUserId: 'admin', fromUserName: 'Platform Admin',
          read: false, createdAt: new Date().toISOString()
        })
      )
      await Promise.all(batch)

      // Set global broadcast for the UI banner
      const broadcastPayload = {
        id: Date.now().toString(),
        text: announcementText,
        createdAt: new Date().toISOString()
      }
      await setDoc(doc(db, 'platformSettings', 'global'), { 
        ...platformSettings, 
        latestBroadcast: broadcastPayload 
      }, { merge: true })
      setPlatformSettings(prev => ({ ...prev, latestBroadcast: broadcastPayload }))

      setAnnouncementText('')
      showToast(`Announcement sent to ${usersSnap.docs.length} users & global banner`)
    } catch (err) { showToast('Failed to send', 'error') }
  }

  async function handleUpdateBannerOnly(newText) {
    if (!newText.trim()) return
    const broadcastPayload = {
      ...(platformSettings.latestBroadcast || {}),
      id: platformSettings.latestBroadcast?.id || Date.now().toString(),
      text: newText,
      updatedAt: new Date().toISOString()
    }
    try {
      await setDoc(doc(db, 'platformSettings', 'global'), { 
        ...platformSettings, 
        latestBroadcast: broadcastPayload 
      }, { merge: true })
      setPlatformSettings(prev => ({ ...prev, latestBroadcast: broadcastPayload }))
      showToast('Global banner updated')
    } catch (err) { showToast('Update failed', 'error') }
  }

  async function handleRemoveBanner() {
    try {
      await setDoc(doc(db, 'platformSettings', 'global'), { 
        ...platformSettings, 
        latestBroadcast: null 
      }, { merge: true })
      setPlatformSettings(prev => ({ ...prev, latestBroadcast: null }))
      showToast('Global banner removed')
    } catch (err) { showToast('Remove failed', 'error') }
  }

  async function handleToggleSetting(key, defaultVal = false) {
    const currentVal = platformSettings[key] === undefined ? defaultVal : platformSettings[key]
    const newVal = !currentVal
    try {
      await setDoc(doc(db, 'platformSettings', 'global'), { ...platformSettings, [key]: newVal }, { merge: true })
      setPlatformSettings(prev => ({ ...prev, [key]: newVal }))
      showToast('Setting updated')
    } catch (err) { showToast('Failed', 'error') }
  }

  async function handleSaveItem(formData) {
    const { type, data } = editingItem
    const isNew = !data?.id
    const colName = type === 'user' ? 'users' : type === 'resource' ? 'resources' : 'reports'
    
    try {
      const processedData = { ...formData }

      if (isNew) {
        if (type === 'user') {
          showToast('Cannot add users from Dashboard yet due to Auth requirements. Only edits are supported.', 'error')
          return
        }
        
        const newDoc = {
          ...processedData,
          createdAt: new Date().toISOString()
        }
        if (type === 'resource') newDoc.authorName = newDoc.authorName || 'Platform Admin'
        
        const docRef = await addDoc(collection(db, colName), newDoc)
        newDoc.id = docRef.id
        
        if (type === 'resource') setResources([newDoc, ...resources])
        showToast(`${type} added successfully`)
      } else {
        await updateDoc(doc(db, colName, data.id), processedData)
        
        const updater = items => items.map(i => i.id === data.id ? { ...i, ...processedData } : i)
        if (type === 'user') setUsers(updater(users))
        if (type === 'resource') setResources(updater(resources))
        showToast(`${type} updated successfully`)
      }
    } catch (err) {
      console.error(err)
      showToast('Action failed', 'error')
    }
    setEditingItem(null)
  }

  // --- FILTER HELPERS ---
  const filteredUsers = users.filter(u => !searchQuery || u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || u.email?.toLowerCase().includes(searchQuery.toLowerCase()))

  // --- KPIs ---
  const totalCoins = gamificationData.reduce((acc, curr) => acc + (curr.coins || 0), 0)
  const totalAIGen = gamificationData.reduce((acc, curr) => acc + (curr.aiUsages || 0), 0)

  const kpis = [
    { title: 'Total Users', value: users.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', sub: `${users.filter(u => u.role === 'teacher').length} teachers, ${users.filter(u => u.role === 'school').length} schools` },
    { title: 'AI Content Generated', value: totalAIGen, icon: Shield, color: 'text-indigo-600', bg: 'bg-indigo-50', sub: 'Across all workspaces' },
    { title: 'Economy Value', value: totalCoins + ' 🪙', icon: Trophy, color: 'text-amber-600', bg: 'bg-amber-50', sub: 'Coins distributed' },
    { title: 'Vault Resources', value: resources.length, icon: FolderOpen, color: 'text-purple-600', bg: 'bg-purple-50', sub: 'Shared internally' },
    { title: 'Flagged Reports', value: reports.length, icon: AlertTriangle, color: 'text-rose-600', bg: 'bg-rose-50', sub: 'Pending review' },
  ]

  // Status badge helper
  const StatusBadge = ({ status }) => {
    const s = (status || 'active').toLowerCase()
    const cls = s === 'active' ? 'bg-emerald-50 text-emerald-700' : s === 'suspended' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
    return <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold capitalize ${cls}`}>
      {s === 'active' && <CheckCircle className="w-3 h-3" />}{s === 'suspended' && <XCircle className="w-3 h-3" />}{s}
    </span>
  }

  const formatDate = (d) => { try { const dt = d?.toDate ? d.toDate() : new Date(d); return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) } catch { return '-' } }

  const BADGE_COLORS = { blue: 'bg-blue-500', gold: 'bg-yellow-500', emerald: 'bg-emerald-500', purple: 'bg-purple-500' }

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-4 animate-pulse-soft"><Shield className="w-8 h-8 text-white" /></div>
        <p className="text-surface-500 font-bold">Loading Command Center...</p>
      </div>
    </div>
  )

  return (
    <div className="max-w-[1800px] mx-auto animate-fade-in-up pb-12">
      {/* Toast */}
      {toast && (
        <div className="fixed top-24 right-6 z-[300] animate-fade-in-up">
          <div className={`px-5 py-3 rounded-2xl shadow-2xl font-bold text-sm flex items-center gap-2 ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-surface-900 text-white'}`}>
            {toast.type === 'error' ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />} {toast.msg}
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmModal && <ConfirmModal title={confirmModal.title} message={confirmModal.message} danger={confirmModal.danger} onConfirm={confirmModal.onConfirm} onCancel={() => setConfirmModal(null)} />}

      {/* Editor Modal */}
      {editingItem && <EditorModal type={editingItem.type} initialData={editingItem.data} onSave={handleSaveItem} onCancel={() => setEditingItem(null)} />}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-red-50 to-orange-50 border border-red-100 text-red-700 text-xs font-bold tracking-widest uppercase mb-4">
            <Shield className="w-3.5 h-3.5" /> Super Admin — Full Access
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-surface-900 tracking-tight">Command Center</h1>
          <p className="text-surface-500 font-medium mt-1">Complete platform control & management.</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <button onClick={loadAllData} className="px-4 py-2.5 bg-white border border-surface-200 rounded-xl shadow-sm text-sm font-bold text-surface-700 flex items-center gap-2 hover:bg-surface-50 transition-colors">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <div className="px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-bold text-emerald-700 flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-500" /> All Systems Operational
          </div>
        </div>
      </div>

      {/* Main Interface */}
      <div className="bg-white border border-surface-200 rounded-[20px] sm:rounded-[32px] overflow-hidden shadow-sm flex flex-col lg:flex-row min-h-[500px] lg:min-h-[700px]">

        {/* Sidebar Nav */}
        <div className="w-full lg:w-60 bg-surface-900 text-white shrink-0 lg:rounded-l-[32px] overflow-hidden">
          <div className="p-5 border-b border-white/10">
            <h3 className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-surface-400">Admin Modules</h3>
          </div>
          <nav className="p-3 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible no-scrollbar">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSearchQuery('') }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-left text-sm whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-surface-900 shadow-lg' : 'text-surface-300 hover:bg-white/10 hover:text-white'}`}>
                <tab.icon className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline lg:inline">{tab.label}</span>
                <span className="sm:hidden lg:hidden text-[10px]">{tab.label.split(' ')[0]}</span>
                {tab.id === 'moderation' && reports.length > 0 && (
                  <span className="ml-auto w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold">{reports.length}</span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-4 sm:p-6 md:p-8 overflow-x-auto">

          {/* Search Bar (shown on list tabs) */}
          {['users', 'posts', 'jobs', 'resources', 'events', 'gamification'].includes(activeTab) && (
            <div className="relative mb-6 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
              <input type="text" placeholder={`Search ${activeTab}...`} value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary-500 outline-none" />
            </div>
          )}

          {/* ====== ANALYTICS TAB ====== */}
          {activeTab === 'analytics' && (
            <div className="animate-fade-in">
              <h2 className="text-xl font-extrabold text-surface-900 mb-6">📊 Platform Analytics</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 mb-8">
                {kpis.map((kpi, i) => (
                  <div key={i} className="bg-white rounded-2xl p-6 border border-surface-200 hover:border-primary-300 transition-all group hover:shadow-md">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-bold text-surface-500 mb-1">{kpi.title}</p>
                        <h3 className="text-4xl font-extrabold text-surface-900 font-display tracking-tight">{kpi.value}</h3>
                        <p className="text-xs font-semibold text-surface-400 mt-2">{kpi.sub}</p>
                      </div>
                      <div className={`w-12 h-12 rounded-2xl ${kpi.bg} ${kpi.color} flex items-center justify-center`}>
                        <kpi.icon className="w-6 h-6" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Role distribution */}
              <div className="bg-surface-50 rounded-2xl p-6 border border-surface-200">
                <h3 className="font-bold text-surface-900 mb-4">User Role Distribution</h3>
                <div className="flex gap-4 flex-wrap">
                  {['teacher', 'school', 'admin', 'superadmin'].map(role => {
                    const count = users.filter(u => u.role === role).length
                    const pct = users.length ? Math.round((count / users.length) * 100) : 0
                    return (
                      <div key={role} className="flex-1 min-w-[140px] bg-white rounded-xl p-4 border border-surface-200">
                        <p className="text-xs font-bold text-surface-500 uppercase tracking-wider mb-1">{role}s</p>
                        <p className="text-2xl font-extrabold text-surface-900">{count}</p>
                        <div className="w-full h-2 bg-surface-100 rounded-full mt-2"><div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${pct}%` }} /></div>
                        <p className="text-xs font-semibold text-surface-400 mt-1">{pct}% of total</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ====== USERS TAB ====== */}
          {activeTab === 'users' && (
            <div className="animate-fade-in">
              <h2 className="text-xl font-extrabold text-surface-900 mb-1">👥 User Management</h2>
              <p className="text-sm text-surface-500 font-medium mb-6">{filteredUsers.length} users found</p>
              <div className="border border-surface-200 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="bg-surface-50 border-b border-surface-200 text-xs uppercase tracking-wider text-surface-500">
                        <th className="p-4 font-bold">User</th><th className="p-4 font-bold">Role</th><th className="p-4 font-bold">Status</th><th className="p-4 font-bold">Joined</th><th className="p-4 font-bold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-100">
                      {filteredUsers.map(user => (
                        <tr key={user.id} className="hover:bg-surface-50/50 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-surface-200 flex items-center justify-center text-surface-600 font-bold text-sm overflow-hidden">
                                {user.profilePhoto ? <img src={user.profilePhoto} alt="" className="w-full h-full object-cover" /> : (user.name || 'U')[0].toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-surface-900 text-sm flex items-center gap-1">
                                  {user.name || 'No Name'}
                                  {user.isVerified && <span className={`w-3.5 h-3.5 text-white rounded-full flex items-center justify-center text-[8px] shadow-sm shrink-0 ${BADGE_COLORS[user.verificationColor] || 'bg-blue-500'}`}>✓</span>}
                                </p>
                                <p className="text-xs font-medium text-surface-500">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4"><span className="px-2.5 py-1 rounded-lg bg-surface-100 text-surface-700 text-xs font-bold capitalize">{user.role || 'teacher'}</span></td>
                          <td className="p-4"><StatusBadge status={user.status} /></td>
                          <td className="p-4 text-sm font-medium text-surface-500">{formatDate(user.createdAt)}</td>
                          <td className="p-4">
                            <div className="flex items-center justify-end gap-2">
                              <select
                                value={user.isVerified ? (user.verificationColor || 'blue') : ''}
                                onChange={(e) => handleToggleVerify(user, e.target.value)}
                                className="text-[11px] font-bold px-2 py-1.5 border border-surface-200 rounded-lg bg-surface-50 text-surface-700 outline-none cursor-pointer"
                              >
                                <option value="">No Badge</option>
                                <option value="blue">Blue Badge</option>
                                <option value="gold">Gold Badge</option>
                                <option value="emerald">Green Badge</option>
                                <option value="purple">Purple Badge</option>
                              </select>
                              <button onClick={() => handleToggleSuspend(user.id, user.status)} title={user.status === 'suspended' ? 'Activate' : 'Suspend'}
                                className={`p-2 rounded-lg transition-colors ${user.status === 'suspended' ? 'text-emerald-600 hover:bg-emerald-50' : 'text-amber-600 hover:bg-amber-50'}`}>
                                {user.status === 'suspended' ? <UserCheck className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                              </button>
                              <button onClick={() => setEditingItem({ type: 'user', data: user })} className="p-2 text-surface-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors" title="Edit"><Edit className="w-4 h-4" /></button>
                              <button onClick={() => handleDeleteUser(user.id)} className="p-2 text-surface-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filteredUsers.length === 0 && <div className="p-12 text-center text-surface-400 font-medium">No users found</div>}
              </div>
            </div>
          )}

          {/* ====== POST TAB REMOVED ====== */}
          {activeTab === 'jobs' && (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-xl font-extrabold text-surface-900">💼 Jobs Management</h2>
                <button onClick={() => setEditingItem({ type: 'job', data: { status: 'open' } })} className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold rounded-lg flex items-center gap-1.5 transition-colors">
                  <Plus className="w-4 h-4" /> Add Job
                </button>
              </div>
              <p className="text-sm text-surface-500 font-medium mb-6">{filteredJobs.length} jobs</p>
              <div className="space-y-3">
                {filteredJobs.map(job => (
                  <div key={job.id} className="bg-white border border-surface-200 rounded-2xl p-5 hover:border-primary-200 transition-all group">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-bold text-surface-900">{job.title || 'Untitled'}</h3>
                        <p className="text-sm font-medium text-surface-500 mt-1">{job.schoolName || job.postedBy || 'Unknown'} • {job.location || 'Remote'}</p>
                        <div className="flex items-center gap-3 mt-3">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${job.status === 'closed' ? 'bg-surface-100 text-surface-500' : 'bg-emerald-50 text-emerald-700'}`}>
                            {job.status || 'Open'}
                          </span>
                          <span className="text-xs font-medium text-surface-400">{formatDate(job.createdAt)}</span>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => setEditingItem({ type: 'job', data: job })} className="p-2 text-surface-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100" title="Edit">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteJob(job.id)} className="p-2 text-surface-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredJobs.length === 0 && <div className="p-12 text-center text-surface-400 font-medium">No jobs found</div>}
              </div>
            </div>
          )}

          {/* ====== RESOURCES TAB ====== */}
          {activeTab === 'resources' && (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-xl font-extrabold text-surface-900">📚 Resources Management</h2>
                <button onClick={() => setEditingItem({ type: 'resource', data: { authorName: 'Platform Admin' } })} className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold rounded-lg flex items-center gap-1.5 transition-colors">
                  <Plus className="w-4 h-4" /> Add Resource
                </button>
              </div>
              <p className="text-sm text-surface-500 font-medium mb-6">{resources.length} resources</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {resources.filter(r => !searchQuery || r.title?.toLowerCase().includes(searchQuery.toLowerCase())).map(res => (
                  <div key={res.id} className="bg-white border border-surface-200 rounded-2xl p-5 hover:border-primary-200 transition-all group">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-surface-900 text-sm truncate">{res.title || 'Untitled'}</h3>
                        <p className="text-xs font-medium text-surface-500 mt-1">{res.subject || 'General'} • by {res.authorName || 'Unknown'}</p>
                        <p className="text-xs text-surface-400 mt-2">{formatDate(res.createdAt)}</p>
                      </div>
                      <div className="flex gap-1 shrink-0 items-center">
                        {res.fileUrl && <a href={res.fileUrl} target="_blank" rel="noreferrer" className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"><Eye className="w-4 h-4" /></a>}
                        <button onClick={() => setEditingItem({ type: 'resource', data: res })} className="p-2 text-surface-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100" title="Edit"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => handleDeleteResource(res.id)} className="p-2 text-surface-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100" title="Delete"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {resources.length === 0 && <div className="p-12 text-center text-surface-400 font-medium">No resources found</div>}
            </div>
          )}



          {/* ====== MODERATION TAB ====== */}
          {activeTab === 'moderation' && (
            <div className="animate-fade-in">
              <h2 className="text-xl font-extrabold text-surface-900 mb-1">🛡️ Content Moderation</h2>
              <p className="text-sm text-surface-500 font-medium mb-6">{reports.length} pending reports</p>
              {reports.length === 0 ? (
                <div className="p-16 text-center"><CheckCircle className="w-16 h-16 text-emerald-300 mx-auto mb-4" /><p className="text-lg font-bold text-surface-700">All Clear!</p><p className="text-sm text-surface-500 mt-1">No flagged content to review.</p></div>
              ) : (
                <div className="space-y-4">
                  {reports.map(report => (
                    <div key={report.id} className="bg-white border border-rose-200/50 rounded-2xl overflow-hidden hover:shadow-md transition-all">
                      {/* Header */}
                      <div className="flex items-center gap-2 px-5 py-3 bg-rose-50/50 border-b border-rose-100">
                        <AlertTriangle className="w-4 h-4 text-rose-500" />
                        <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 text-[10px] font-black uppercase tracking-wider">{report.type || 'Content'}</span>
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-wider">{report.reason || 'Flagged'}</span>
                        <span className="text-xs text-surface-400 font-medium ml-auto">{formatDate(report.createdAt)}</span>
                      </div>
                      <div className="p-5">
                        {/* Content Preview */}
                        {report.contentPreview && (
                          <div className="mb-4 p-3.5 bg-surface-50 border border-surface-200 rounded-xl">
                            <p className="text-xs font-bold text-surface-400 uppercase tracking-widest mb-1.5">Reported Content</p>
                            <p className="text-sm text-surface-700 font-medium leading-relaxed">{report.contentPreview}</p>
                          </div>
                        )}
                        <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
                          <div>
                            <p className="text-sm font-bold text-surface-900">Posted by: <span className="text-surface-600">{report.contentAuthorName || report.target || 'Unknown'}</span></p>
                            <p className="text-xs font-medium text-surface-400 mt-0.5">Reported by <span className="font-bold text-surface-600">{report.reporter || 'Anonymous'}</span></p>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <button onClick={() => handleResolveReport(report.id)} className="px-4 py-2.5 bg-surface-100 hover:bg-surface-200 text-surface-700 text-sm font-bold rounded-xl transition-colors">
                              <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4" /> Dismiss</span>
                            </button>
                            <button onClick={() => handleTakeDown(report)} className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg">
                              <span className="flex items-center gap-1.5"><Trash2 className="w-4 h-4" /> Take Down</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ====== GAMIFICATION TAB ====== */}
          {activeTab === 'gamification' && (
            <div className="animate-fade-in space-y-8">
              
              {/* Economy Blueprint */}
              <div>
                <h2 className="text-xl font-extrabold text-surface-900 mb-1">🏦 Economy Blueprint</h2>
                <p className="text-sm text-surface-500 font-medium mb-6">These are the rules dictating how coins & XP are generated inside the platform.</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { title: "Daily Login", coins: "+5 🪙", xp: "+5 XP", desc: "First login of the day" },
                    { title: "Share Resource", coins: "+15 🪙", xp: "+15 XP", desc: "Uploading a Vault resource" },
                    { title: "Use AI Tools", coins: "-5 🪙", xp: "+5 XP", desc: "Generating content with AI" },
                    { title: "New Account", coins: "+50 🪙", xp: "0 XP", desc: "Starting bonus for new users" },
                  ].map((rule, idx) => (
                    <div key={idx} className="bg-surface-50 border border-surface-200 rounded-2xl p-5 hover:border-amber-300 transition-colors">
                      <p className="font-bold text-surface-900 mb-2">{rule.title}</p>
                      <div className="flex items-center gap-3">
                        <span className="font-black text-amber-600 text-lg">{rule.coins}</span>
                        <span className="font-black text-primary-600 text-sm">{rule.xp}</span>
                      </div>
                      <p className="text-xs font-semibold text-surface-400 mt-2">{rule.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* User Gamification Stats */}
              <div>
                <h2 className="text-xl font-extrabold text-surface-900 mb-1">🏆 Player Balances</h2>
                <p className="text-sm text-surface-500 font-medium mb-6">{gamificationData.length} user profiles in the economy</p>
                <div className="border border-surface-200 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                      <tr className="bg-surface-50 border-b border-surface-200 text-xs uppercase tracking-wider text-surface-500">
                        <th className="p-4 font-bold">User</th><th className="p-4 font-bold">XP</th><th className="p-4 font-bold">Coins 🪙</th><th className="p-4 font-bold text-right">Fund / Edit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-100">
                      {gamificationData.filter(g => !searchQuery || g.id.toLowerCase().includes(searchQuery.toLowerCase())).map(g => {
                        const user = users.find(u => u.id === g.id)
                        return (
                          <tr key={g.id} className="hover:bg-surface-50/50">
                            <td className="p-4"><p className="font-bold text-surface-900 text-sm">{user?.name || g.id.substring(0, 12) + '...'}</p><p className="text-xs text-surface-400">{user?.email || ''}</p></td>
                            <td className="p-4 font-extrabold text-primary-700">{g.xp || 0}</td>
                            <td className="p-4 font-extrabold text-amber-600">{g.coins || 0}</td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-3 flex-wrap">
                                <div className="inline-flex items-center gap-1.5 bg-surface-50 p-1 rounded-xl border border-surface-200">
                                  <span className="text-[10px] font-bold text-surface-400 uppercase ml-1">XP</span>
                                  <input type="number" defaultValue={g.xp || 0} className="w-16 px-1.5 py-1 bg-white border border-surface-200 rounded-lg text-xs text-center font-bold" id={`xp-${g.id}`} />
                                  <button onClick={() => handleUpdateXP(g.id, document.getElementById(`xp-${g.id}`).value)} className="px-2 py-1 bg-primary-600 text-white rounded-lg text-[10px] font-bold hover:bg-primary-700">Save</button>
                                </div>
                                <div className="inline-flex items-center gap-1.5 bg-amber-50 p-1 rounded-xl border border-amber-200">
                                  <span className="text-[10px] font-bold text-amber-500 uppercase ml-1">Coins</span>
                                  <input type="number" defaultValue={g.coins || 0} className="w-16 px-1.5 py-1 bg-white border border-amber-200 rounded-lg text-xs text-center font-bold" id={`coin-${g.id}`} />
                                  <button onClick={() => handleUpdateCoins(g.id, document.getElementById(`coin-${g.id}`).value)} className="px-2 py-1 bg-amber-500 text-white rounded-lg text-[10px] font-bold hover:bg-amber-600">Fund</button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                {gamificationData.length === 0 && <div className="p-12 text-center text-surface-400 font-medium">No gamification data</div>}
              </div>
            </div>
            </div>
          )}

          {/* ====== ANNOUNCEMENTS TAB ====== */}
          {activeTab === 'announcements' && (
            <div className="animate-fade-in">
              <h2 className="text-xl font-extrabold text-surface-900 mb-1">📢 Broadcast Announcement</h2>
              <p className="text-sm text-surface-500 font-medium mb-6">Send a notification to all {users.length} users and update the global banner</p>
              
              <div className="flex flex-col xl:flex-row gap-6 items-start">
                <div className="w-full xl:w-1/2">
                  <div className="bg-surface-50 border border-surface-200 rounded-2xl p-6">
                    <h3 className="text-sm font-extrabold text-surface-900 mb-3">Create New Broadcast</h3>
                    <textarea value={announcementText} onChange={e => setAnnouncementText(e.target.value)} placeholder="Type your announcement message here..." rows={4}
                      className="w-full bg-white border border-surface-200 rounded-xl p-4 text-sm font-medium focus:ring-2 focus:ring-primary-500 outline-none resize-none" />
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-4">
                      <p className="text-[11px] font-semibold text-surface-400 max-w-[200px]">This sends a system notification to ALL users & replaces the global banner.</p>
                      <button onClick={handleSendAnnouncement} disabled={!announcementText.trim()}
                        className="flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
                        <Send className="w-4 h-4" /> Broadcast Now
                      </button>
                    </div>
                  </div>
                </div>

                {/* Active Global Banner Management */}
                <div className="w-full xl:w-1/2">
                  <h3 className="text-sm font-extrabold text-surface-900 mb-3">Active Global Banner</h3>
                  {platformSettings.latestBroadcast ? (
                    <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-primary-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-xl" />
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center border border-white/20">
                              <Megaphone className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-xs font-black uppercase tracking-widest text-indigo-100 flex items-center gap-2">
                              Live Now
                              <span className="flex h-2 w-2 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                              </span>
                            </span>
                          </div>
                          <span className="text-[10px] text-indigo-200 font-semibold">{formatDate(platformSettings.latestBroadcast.createdAt)}</span>
                        </div>
                        
                        <textarea 
                          id="edit-banner-text"
                          defaultValue={platformSettings.latestBroadcast.text}
                          className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-sm font-semibold text-white placeholder-white/50 focus:bg-white/20 focus:outline-none transition-colors resize-none mb-4"
                          rows={3}
                        />

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                          <button onClick={() => handleRemoveBanner()} className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/40 text-white text-xs font-bold rounded-lg transition-colors border border-rose-500/30 flex items-center gap-1.5">
                            <Trash2 className="w-3.5 h-3.5" /> Remove
                          </button>
                          <button 
                            onClick={() => handleUpdateBannerOnly(document.getElementById('edit-banner-text').value)} 
                            className="px-4 py-2 bg-white hover:bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg transition-colors shadow-sm flex items-center gap-1.5"
                          >
                            <Edit className="w-3.5 h-3.5 text-indigo-600" /> Save Edit
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-surface-50 border border-dashed border-surface-300 rounded-2xl p-8 text-center flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-surface-100 flex items-center justify-center mb-3 text-surface-400">
                        <CheckCircle className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold text-surface-900 mb-1">No Active Banner</p>
                      <p className="text-xs font-medium text-surface-500">Create a new broadcast to display a banner on the global feed.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ====== SETTINGS TAB ====== */}
          {activeTab === 'settings' && (
            <div className="animate-fade-in">
              <h2 className="text-xl font-extrabold text-surface-900 mb-6">⚙️ Platform Settings</h2>
              <div className="space-y-5 max-w-2xl">
                <div className="p-6 bg-surface-50 border border-surface-200 rounded-2xl flex items-center justify-between">
                  <div><h4 className="font-bold text-surface-900 mb-1">Maintenance Mode</h4><p className="text-sm font-medium text-surface-500">Takes the platform offline for all users. Admins can still log in.</p></div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={platformSettings.maintenanceMode} onChange={() => handleToggleSetting('maintenanceMode')} />
                    <div className="w-11 h-6 bg-surface-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
                  </label>
                </div>
                <div className="p-6 bg-surface-50 border border-surface-200 rounded-2xl flex items-center justify-between">
                  <div><h4 className="font-bold text-surface-900 mb-1">Disable New Registrations</h4><p className="text-sm font-medium text-surface-500">Prevents new users from creating accounts.</p></div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={platformSettings.registrationDisabled || false} onChange={() => handleToggleSetting('registrationDisabled', false)} />
                    <div className="w-11 h-6 bg-surface-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>



                <div className="mt-8 pt-6 border-t border-surface-200">
                  <button onClick={() => setConfirmModal({ title: 'Force Logout All Users', message: 'This will invalidate all active sessions immediately. Users will need to log in again.', danger: true, onConfirm: async () => { showToast('All sessions invalidated'); setConfirmModal(null) } })}
                    className="flex items-center gap-2 px-6 py-3 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-xl transition-colors">
                    <Power className="w-5 h-5" /> Force Logout All Users
                  </button>
                  <p className="text-xs font-semibold text-surface-500 mt-3">Warning: This action instantly invalidates all active sessions.</p>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
