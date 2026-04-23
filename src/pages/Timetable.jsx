import { useState, useEffect, useRef } from 'react'
import { CalendarDays, Printer, RotateCcw, X, Save, UserX, UserCheck, Coffee, AlertTriangle, Users, Plus, BookOpen, Tag, Cloud, FolderOpen, AlertCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../utils/firebase'
import { collection, addDoc, getDocs, query, where, serverTimestamp, updateDoc, doc } from 'firebase/firestore'

const ALL_DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const PERIODS = ['Period 1','Period 2','Period 3','Period 4','Lunch','Period 5','Period 6','Period 7','Period 8']
const DEFAULT_SUBJECTS = ['Mathematics','Science','English','Hindi','Social Studies','Physics','Chemistry','Biology','Computer Science','Physical Education','Art','Music','Library','Lunch','Free Period']
const DEFAULT_TEACHERS = ['Mr. Sharma','Ms. Gupta','Mr. Patel','Ms. Singh','Mr. Kumar','Ms. Joshi','Mr. Verma','Ms. Rao','Mr. Khan','Ms. Mehta','Mr. Reddy','Ms. Nair']

const SC = {
  'Mathematics':'bg-blue-100 text-blue-800 border-blue-200',
  'Science':'bg-emerald-100 text-emerald-800 border-emerald-200',
  'English':'bg-purple-100 text-purple-800 border-purple-200',
  'Hindi':'bg-orange-100 text-orange-800 border-orange-200',
  'Social Studies':'bg-amber-100 text-amber-800 border-amber-200',
  'Physics':'bg-cyan-100 text-cyan-800 border-cyan-200',
  'Chemistry':'bg-pink-100 text-pink-800 border-pink-200',
  'Biology':'bg-lime-100 text-lime-800 border-lime-200',
  'Computer Science':'bg-slate-100 text-slate-800 border-slate-200',
  'Physical Education':'bg-red-100 text-red-800 border-red-200',
  'Art':'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200',
  'Music':'bg-violet-100 text-violet-800 border-violet-200',
  'Library':'bg-yellow-100 text-yellow-800 border-yellow-200',
  'Lunch':'bg-gray-200 text-gray-600 border-gray-300',
  'Free Period':'bg-gray-100 text-gray-500 border-gray-200',
}
const gc = s => SC[s] || 'bg-indigo-100 text-indigo-800 border-indigo-200'

export default function Timetable() {
  const { currentUser } = useAuth()
  
  // grid[day][period] = { subject, teacher, substitute }
  const [grid, setGrid] = useState(() => {
    const s = localStorage.getItem('ldms_timetable_v2')
    if (s) return JSON.parse(s)
    const g = {}
    ALL_DAYS.forEach(d => { g[d] = {}; PERIODS.forEach(p => { g[d][p] = { subject: p === 'Lunch' ? 'Lunch' : '', teacher: '', substitute: '' } }) })
    return g
  })
  const [teachers, setTeachers] = useState(() => {
    const s = localStorage.getItem('ldms_teachers')
    return s ? JSON.parse(s) : DEFAULT_TEACHERS
  })
  const [absentTeachers, setAbsentTeachers] = useState(() => {
    const s = localStorage.getItem('ldms_absent')
    return s ? JSON.parse(s) : []
  })
  const [onBreak, setOnBreak] = useState(() => {
    const s = localStorage.getItem('ldms_break')
    return s ? JSON.parse(s) : []
  })
  const [subjects, setSubjects] = useState(() => {
    const s = localStorage.getItem('ldms_subjects')
    return s ? JSON.parse(s) : DEFAULT_SUBJECTS
  })
  const [activeDays, setActiveDays] = useState(() => {
    const s = localStorage.getItem('ldms_active_days')
    return s ? JSON.parse(s) : ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
  })
  const [editing, setEditing] = useState(null)
  const [className, setClassName] = useState(() => localStorage.getItem('ldms_timetable_class') || 'Class 8-A')
  const [schoolName, setSchoolName] = useState(() => localStorage.getItem('ldms_timetable_school') || '')
  const [details, setDetails] = useState(() => localStorage.getItem('ldms_timetable_details') || '')
  const [currentTimetableId, setCurrentTimetableId] = useState(() => localStorage.getItem('ldms_timetable_id') || null)
  const [cloudTimetables, setCloudTimetables] = useState([])
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  const [editingClass, setEditingClass] = useState(false)
  const [showPanel, setShowPanel] = useState(false)
  const [newTeacher, setNewTeacher] = useState('')
  const [newSubject, setNewSubject] = useState('')
  const [subModal, setSubModal] = useState(null)
  const [teacherSubjects, setTeacherSubjects] = useState(() => {
    const s = localStorage.getItem('ldms_teacher_subjects')
    return s ? JSON.parse(s) : {}
  }) // { 'Mr. Sharma': ['Mathematics', 'Physics'], ... }
  const [assigningSubjectsFor, setAssigningSubjectsFor] = useState(null)
  const tableRef = useRef(null)

  useEffect(() => { localStorage.setItem('ldms_timetable_v2', JSON.stringify(grid)) }, [grid])
  useEffect(() => { localStorage.setItem('ldms_timetable_class', className) }, [className])
  useEffect(() => { localStorage.setItem('ldms_timetable_school', schoolName) }, [schoolName])
  useEffect(() => { localStorage.setItem('ldms_timetable_details', details) }, [details])
  useEffect(() => { if (currentTimetableId) localStorage.setItem('ldms_timetable_id', currentTimetableId); else localStorage.removeItem('ldms_timetable_id') }, [currentTimetableId])
  useEffect(() => { localStorage.setItem('ldms_teachers', JSON.stringify(teachers)) }, [teachers])
  useEffect(() => { localStorage.setItem('ldms_absent', JSON.stringify(absentTeachers)) }, [absentTeachers])
  useEffect(() => { localStorage.setItem('ldms_break', JSON.stringify(onBreak)) }, [onBreak])
  useEffect(() => { localStorage.setItem('ldms_subjects', JSON.stringify(subjects)) }, [subjects])
  useEffect(() => { localStorage.setItem('ldms_active_days', JSON.stringify(activeDays)) }, [activeDays])
  useEffect(() => { localStorage.setItem('ldms_teacher_subjects', JSON.stringify(teacherSubjects)) }, [teacherSubjects])

  const saveToCloud = async () => {
    if (!currentUser) return alert('Please login to save to the cloud.')
    if (!className.trim()) return alert('Please enter a class name.')
    
    setIsSaving(true)
    try {
      const timetableData = {
        userId: currentUser.uid,
        schoolName,
        className,
        details,
        grid,
        teachers,
        absentTeachers,
        onBreak,
        subjects,
        activeDays,
        teacherSubjects,
        updatedAt: serverTimestamp()
      }

      if (currentTimetableId) {
        await updateDoc(doc(db, 'timetables', currentTimetableId), timetableData)
        alert('Timetable updated in cloud successfully!')
      } else {
        timetableData.createdAt = serverTimestamp()
        const docRef = await addDoc(collection(db, 'timetables'), timetableData)
        setCurrentTimetableId(docRef.id)
        alert('Timetable saved to cloud successfully!')
      }
    } catch (error) {
      console.error('Error saving timetable:', error)
      alert('Failed to save to cloud.')
    } finally {
      setIsSaving(false)
    }
  }

  const loadTimetables = async () => {
    if (!currentUser) return
    try {
      const q = query(collection(db, 'timetables'), where('userId', '==', currentUser.uid))
      const snapshot = await getDocs(q)
      const tbs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      tbs.sort((a,b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0))
      setCloudTimetables(tbs)
    } catch (error) {
      console.error('Error loading timetables:', error)
    }
  }

  const handleLoadTimetable = (tb) => {
    setSchoolName(tb.schoolName || '')
    setClassName(tb.className || '')
    setDetails(tb.details || '')
    setGrid(tb.grid || {})
    setTeachers(tb.teachers || DEFAULT_TEACHERS)
    setAbsentTeachers(tb.absentTeachers || [])
    setOnBreak(tb.onBreak || [])
    setSubjects(tb.subjects || DEFAULT_SUBJECTS)
    setActiveDays(tb.activeDays || ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'])
    setTeacherSubjects(tb.teacherSubjects || {})
    setCurrentTimetableId(tb.id)
    setIsCloudModalOpen(false)
  }

  const handleNewTimetable = () => {
    if (!confirm('Start a new timetable? Current local unsaved changes will be cleared.')) return
    setCurrentTimetableId(null)
    setSchoolName('')
    setClassName('New Class')
    setDetails('')
    const g = {}
    ALL_DAYS.forEach(d => { g[d] = {}; PERIODS.forEach(p => { g[d][p] = { subject: p === 'Lunch' ? 'Lunch' : '', teacher: '', substitute: '' } }) })
    setGrid(g)
  }

  const setCell = (day, period, subject) => {
    setGrid(p => ({ ...p, [day]: { ...p[day], [period]: { ...p[day][period], subject } } }))
    setEditing(null)
  }
  const setCellTeacher = (day, period, teacher) => {
    setGrid(p => ({ ...p, [day]: { ...p[day], [period]: { ...p[day][period], teacher } } }))
    setEditing(null)
  }
  const setSubstitute = (day, period, sub) => {
    setGrid(p => ({ ...p, [day]: { ...p[day], [period]: { ...p[day][period], substitute: sub } } }))
    setSubModal(null)
  }

  const toggleAbsent = (t) => setAbsentTeachers(a => a.includes(t) ? a.filter(x => x !== t) : [...a, t])
  const toggleBreak = (t) => setOnBreak(b => b.includes(t) ? b.filter(x => x !== t) : [...b, t])
  const addTeacher = () => { if (newTeacher.trim() && !teachers.includes(newTeacher.trim())) { setTeachers(t => [...t, newTeacher.trim()]); setNewTeacher('') } }
  const removeTeacher = (t) => { setTeachers(ts => ts.filter(x => x !== t)); setAbsentTeachers(a => a.filter(x => x !== t)); setOnBreak(b => b.filter(x => x !== t)); setTeacherSubjects(ts => { const n = {...ts}; delete n[t]; return n }) }
  const addSubject = () => { if (newSubject.trim() && !subjects.includes(newSubject.trim())) { setSubjects(s => [...s, newSubject.trim()]); setNewSubject('') } }
  const removeSubject = (s) => setSubjects(ss => ss.filter(x => x !== s))
  const toggleDay = (d) => { if (activeDays.includes(d)) { if (activeDays.length > 1) setActiveDays(a => a.filter(x => x !== d)) } else { setActiveDays(a => [...ALL_DAYS.filter(x => a.includes(x) || x === d)]) } }
  const toggleTeacherSubject = (teacher, subj) => {
    setTeacherSubjects(ts => {
      const current = ts[teacher] || []
      return { ...ts, [teacher]: current.includes(subj) ? current.filter(x => x !== subj) : [...current, subj] }
    })
  }

  // Find available teachers (not absent, not on break)
  const getAvailable = () => teachers.filter(t => !absentTeachers.includes(t) && !onBreak.includes(t))

  // Smart auto-assign: prioritize same-subject teachers, balance load
  const autoAssignSubs = () => {
    const available = getAvailable()
    const newGrid = JSON.parse(JSON.stringify(grid))
    const subCount = {} // track how many subs each teacher gets
    available.forEach(t => { subCount[t] = 0 })
    // Count existing subs
    activeDays.forEach(day => { PERIODS.forEach(period => { const c = newGrid[day]?.[period]; if (c?.substitute && subCount[c.substitute] !== undefined) subCount[c.substitute]++ }) })
    activeDays.forEach(day => {
      PERIODS.forEach(period => {
        const cell = newGrid[day]?.[period]
        if (cell?.teacher && absentTeachers.includes(cell.teacher) && !cell.substitute) {
          const busyThisPeriod = activeDays.map(d => newGrid[d]?.[period]?.teacher).concat(activeDays.map(d => newGrid[d]?.[period]?.substitute)).filter(Boolean)
          const free = available.filter(t => !busyThisPeriod.includes(t) && t !== cell.teacher)
          if (free.length > 0) {
            // Sort: same-subject first, then least loaded
            free.sort((a, b) => {
              const aTeaches = (teacherSubjects[a] || []).includes(cell.subject) ? 0 : 1
              const bTeaches = (teacherSubjects[b] || []).includes(cell.subject) ? 0 : 1
              if (aTeaches !== bTeaches) return aTeaches - bTeaches
              return (subCount[a] || 0) - (subCount[b] || 0)
            })
            cell.substitute = free[0]
            subCount[free[0]] = (subCount[free[0]] || 0) + 1
          }
        }
      })
    })
    setGrid(newGrid)
  }

  // Count affected periods
  const affectedCount = activeDays.reduce((sum, day) => sum + PERIODS.reduce((s2, p) => {
    const c = grid[day]?.[p]
    return s2 + (c?.teacher && absentTeachers.includes(c.teacher) && !c.substitute ? 1 : 0)
  }, 0), 0)

  const handlePrint = () => {
    const w = window.open('', '_blank')
    w.document.write(`<html><head><title>Timetable - ${className}</title><style>body{font-family:Inter,sans-serif;padding:20px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #ccc;padding:8px;text-align:center}th{background:#1e293b;color:white}.sub{color:#dc2626;font-style:italic}.absent{text-decoration:line-through;color:#999}h1{text-align:center;margin-bottom:4px}p{text-align:center;color:#666;margin-bottom:16px}</style></head><body>`)
    w.document.write(`<h1>${schoolName ? schoolName + ' - ' : ''}${className} Timetable</h1><p>${details ? details + '<br>' : ''}Generated by LDMS</p><table><thead><tr><th>Period</th>`)
    activeDays.forEach(d => w.document.write(`<th>${d}</th>`))
    w.document.write(`</tr></thead><tbody>`)
    PERIODS.forEach(p => {
      w.document.write(`<tr><td><strong>${p}</strong></td>`)
      activeDays.forEach(d => {
        const c = grid[d]?.[p] || {}
        const isAbsent = c.teacher && absentTeachers.includes(c.teacher)
        let html = c.subject || '-'
        if (c.teacher) html += `<br><small class="${isAbsent ? 'absent' : ''}">${c.teacher}</small>`
        if (c.substitute) html += `<br><small class="sub">Sub: ${c.substitute}</small>`
        w.document.write(`<td>${html}</td>`)
      })
      w.document.write(`</tr>`)
    })
    w.document.write(`</tbody></table></body></html>`)
    w.document.close(); w.print()
  }

  const handleReset = () => {
    if (!confirm('Reset entire timetable?')) return
    const g = {}
    ALL_DAYS.forEach(d => { g[d] = {}; PERIODS.forEach(p => { g[d][p] = { subject: p === 'Lunch' ? 'Lunch' : '', teacher: '', substitute: '' } }) })
    setGrid(g)
  }

  return (
    <div className="max-w-[1200px] mx-auto animate-fade-in-up pb-24 lg:pb-8">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-teal-600 via-emerald-600 to-green-700 rounded-[32px] p-8 sm:p-12 mb-8 shadow-2xl">
        <div className="absolute top-0 right-0 -translate-y-1/3 translate-x-1/4 w-[500px] h-[500px] bg-white/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 border border-white/30 text-white text-xs font-black tracking-widest uppercase mb-5">
            <CalendarDays className="w-4 h-4" /> Schedule
          </div>
          <h1 className="text-3xl sm:text-4xl font-black font-display text-white tracking-tight mb-3">
            Timetable <span className="text-emerald-200">Builder</span>
          </h1>
          <p className="text-emerald-100 font-medium text-sm sm:text-base max-w-xl">Click cells to assign subjects & teachers. Manage absent teachers and substitutes.</p>
        </div>
      </div>

      {/* Controls */}
      {!currentUser && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 text-sm text-amber-800 shadow-sm animate-fade-in">
          <AlertCircle className="w-6 h-6 text-amber-500 shrink-0" />
          <p><strong>You are using Timetable as a Guest.</strong> Your data is only saved locally on this browser. Login to save to the cloud securely and access it anywhere.</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-6">
        {editingClass ? (
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <input type="text" value={className} onChange={e => setClassName(e.target.value)} autoFocus placeholder="Class (e.g. 8-A)" className="px-4 py-2.5 border-2 border-emerald-400 rounded-xl text-sm font-bold focus:outline-none w-full sm:w-auto" />
            <input type="text" value={schoolName} onChange={e => setSchoolName(e.target.value)} placeholder="School Name (optional)" className="px-4 py-2.5 border-2 border-surface-200 rounded-xl text-sm font-medium focus:outline-none focus:border-emerald-400 w-full sm:w-auto" />
            <input type="text" value={details} onChange={e => setDetails(e.target.value)} placeholder="Details (optional)" className="hidden md:block px-4 py-2.5 border-2 border-surface-200 rounded-xl text-sm font-medium focus:outline-none focus:border-emerald-400 min-w-[200px]" />
            <button onClick={() => setEditingClass(false)} className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-sm hover:bg-emerald-700 transition-colors"><Save className="w-5 h-5" /></button>
          </div>
        ) : (
          <button onClick={() => setEditingClass(true)} className="px-5 py-2.5 bg-white border border-surface-200 rounded-xl text-sm font-extrabold text-surface-900 hover:bg-surface-50 text-left flex items-center gap-2 shadow-sm transition-all">
            <span>📚 {className}</span>
            {schoolName && <span className="text-surface-400 font-medium text-xs border-l border-surface-200 pl-2 ml-1">{schoolName}</span>}
          </button>
        )}
        <button onClick={() => setShowPanel(!showPanel)} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm ${showPanel ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border border-surface-200 text-surface-700 hover:bg-surface-50'}`}>
          <Users className="w-4 h-4" /> Teachers {absentTeachers.length > 0 && <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">{absentTeachers.length}</span>}
        </button>
        <button onClick={handlePrint} className="flex items-center gap-2 px-5 py-2.5 bg-white border border-surface-200 text-surface-700 rounded-xl text-sm font-bold hover:bg-surface-50 shadow-sm"><Printer className="w-4 h-4" /> Print</button>
        
        <div className="flex items-center gap-2 ml-auto w-full sm:w-auto justify-end">
          {currentUser && (
            <>
              <button onClick={() => { setIsCloudModalOpen(true); loadTimetables() }} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl text-sm font-bold hover:bg-indigo-100 shadow-sm">
                <FolderOpen className="w-4 h-4" /> <span className="hidden sm:inline">My Timetables</span>
              </button>
              <button onClick={saveToCloud} disabled={isSaving} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 border border-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 shadow-sm">
                <Cloud className="w-4 h-4" /> <span className="hidden sm:inline">{isSaving ? 'Saving...' : 'Save Cloud'}</span>
              </button>
              <button onClick={handleNewTimetable} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-surface-200 text-surface-700 rounded-xl text-sm font-bold hover:bg-surface-50 shadow-sm"><Plus className="w-4 h-4" /></button>
            </>
          )}
          {!currentUser && (
            <button onClick={handleReset} className="flex items-center gap-2 px-5 py-2.5 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-bold hover:bg-red-100 shadow-sm"><RotateCcw className="w-4 h-4" /> Reset</button>
          )}
        </div>
      </div>

      {/* Absent Alert */}
      {affectedCount > 0 && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
            <div>
              <p className="text-sm font-bold text-red-800">{affectedCount} period{affectedCount > 1 ? 's' : ''} need substitute teachers</p>
              <p className="text-xs text-red-600">Absent: {absentTeachers.join(', ')}</p>
            </div>
          </div>
          <button onClick={autoAssignSubs} className="px-5 py-2.5 bg-red-600 text-white font-bold rounded-xl text-sm hover:bg-red-700 transition-colors shadow-md">
            ⚡ Auto-Assign Substitutes
          </button>
        </div>
      )}

      {/* Teacher Management Panel */}
      {showPanel && (
        <div className="mb-6 bg-white rounded-[24px] border border-surface-200 shadow-sm p-6 animate-fade-in">
          <h3 className="text-sm font-extrabold text-surface-900 mb-4 flex items-center gap-2"><Users className="w-4 h-4 text-indigo-500" /> Teacher Management</h3>
          {/* Add teacher */}
          <div className="flex gap-2 mb-4">
            <input type="text" value={newTeacher} onChange={e => setNewTeacher(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTeacher()} placeholder="Add teacher name..." className="flex-1 px-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-indigo-400" />
            <button onClick={addTeacher} className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700">Add</button>
          </div>
          {/* Teacher list */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {teachers.map(t => {
              const isAbsent = absentTeachers.includes(t)
              const isBrk = onBreak.includes(t)
              const tSubjs = teacherSubjects[t] || []
              return (
                <div key={t} className={`flex flex-col gap-1.5 p-3 rounded-xl border transition-all ${isAbsent ? 'bg-red-50 border-red-200' : isBrk ? 'bg-amber-50 border-amber-200' : 'bg-surface-50 border-surface-200'}`}>
                  <div className="flex items-center gap-2">
                    <span className={`flex-1 text-sm font-bold truncate ${isAbsent ? 'text-red-700 line-through' : isBrk ? 'text-amber-700' : 'text-surface-800'}`}>{t}</span>
                    <button onClick={() => setAssigningSubjectsFor(assigningSubjectsFor === t ? null : t)} title="Assign subjects" className={`p-1.5 rounded-lg transition-colors ${assigningSubjectsFor === t ? 'bg-emerald-200 text-emerald-700' : 'hover:bg-emerald-100 text-surface-400'}`}>
                      <Tag className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => toggleAbsent(t)} title={isAbsent ? 'Mark Present' : 'Mark Absent'} className={`p-1.5 rounded-lg transition-colors ${isAbsent ? 'bg-red-200 text-red-700' : 'hover:bg-red-100 text-surface-400'}`}>
                      <UserX className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => toggleBreak(t)} title={isBrk ? 'Back from break' : 'On break/lunch'} className={`p-1.5 rounded-lg transition-colors ${isBrk ? 'bg-amber-200 text-amber-700' : 'hover:bg-amber-100 text-surface-400'}`}>
                      <Coffee className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => removeTeacher(t)} className="p-1.5 rounded-lg hover:bg-red-100 text-surface-300 hover:text-red-500 transition-colors"><X className="w-3.5 h-3.5" /></button>
                  </div>
                  {tSubjs.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {tSubjs.map(s => <span key={s} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-600">{s}</span>)}
                    </div>
                  )}
                  {assigningSubjectsFor === t && (
                    <div className="flex flex-wrap gap-1 pt-1 border-t border-surface-100 mt-1">
                      {subjects.filter(s => s !== 'Lunch' && s !== 'Free Period').map(s => (
                        <button key={s} onClick={() => toggleTeacherSubject(t, s)} className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all ${tSubjs.includes(s) ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-white text-surface-400 border-surface-200 hover:border-surface-300'}`}>{s}</button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <div className="flex gap-4 mt-3 text-[10px] font-bold uppercase tracking-widest text-surface-400">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-400" /> Absent</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> On Break</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Available</span>
          </div>

          {/* Subject Management */}
          <div className="mt-5 pt-5 border-t border-surface-100">
            <h3 className="text-sm font-extrabold text-surface-900 mb-3 flex items-center gap-2"><BookOpen className="w-4 h-4 text-emerald-500" /> Subjects</h3>
            <div className="flex gap-2 mb-3">
              <input type="text" value={newSubject} onChange={e => setNewSubject(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSubject()} placeholder="Add custom subject..." className="flex-1 px-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-emerald-400" />
              <button onClick={addSubject} className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700">Add</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {subjects.map(s => (
                <span key={s} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border ${gc(s)}`}>
                  {s}
                  {!DEFAULT_SUBJECTS.includes(s) && <button onClick={() => removeSubject(s)} className="hover:text-red-500"><X className="w-3 h-3" /></button>}
                </span>
              ))}
            </div>
          </div>

          {/* Day Selector */}
          <div className="mt-5 pt-5 border-t border-surface-100">
            <h3 className="text-sm font-extrabold text-surface-900 mb-3 flex items-center gap-2"><CalendarDays className="w-4 h-4 text-teal-500" /> Active Days <span className="text-xs font-medium text-surface-400">({activeDays.length}-day week)</span></h3>
            <div className="flex flex-wrap gap-2">
              {ALL_DAYS.map(d => (
                <button key={d} onClick={() => toggleDay(d)} className={`px-4 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${activeDays.includes(d) ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-surface-200 text-surface-400 hover:border-surface-300'}`}>
                  {d.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Timetable Grid */}
      <div ref={tableRef} className="bg-white rounded-[28px] border border-surface-200 shadow-sm overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr>
              <th className="p-4 text-left text-xs font-black uppercase tracking-widest text-surface-400 bg-surface-50 rounded-tl-[28px] w-[100px]">Period</th>
              {activeDays.map((d, i) => (
                <th key={d} className={`p-4 text-center text-xs font-black uppercase tracking-widest text-surface-500 bg-surface-50 ${i === activeDays.length - 1 ? 'rounded-tr-[28px]' : ''}`}>{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERIODS.map((period, pi) => (
              <tr key={period} className={`${pi % 2 === 0 ? '' : 'bg-surface-50/30'} border-t border-surface-100`}>
                <td className="p-3 text-xs font-bold text-surface-500 whitespace-nowrap">{period}</td>
                {activeDays.map(day => {
                  const cell = grid[day]?.[period] || {}
                  const isEd = editing === `${day}-${period}`
                  const isAbsent = cell.teacher && absentTeachers.includes(cell.teacher)
                  return (
                    <td key={`${day}-${period}`} className="p-1.5 text-center relative" onClick={() => !isEd && setEditing(`${day}-${period}`)}>
                      {isEd && (
                        <div className="absolute inset-0 z-20 bg-white border-2 border-indigo-400 rounded-xl shadow-xl p-2 flex flex-col gap-1 max-h-[320px] overflow-y-auto" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-between mb-1 px-1">
                            <span className="text-[10px] font-black text-surface-400 uppercase">{day} - {period}</span>
                            <button onClick={() => setEditing(null)}><X className="w-3.5 h-3.5 text-surface-400" /></button>
                          </div>
                          <span className="text-[9px] font-bold text-surface-400 px-1 mt-1">SUBJECT</span>
                          {subjects.map(s => (
                            <button key={s} onClick={() => setCell(day, period, s)} className={`px-3 py-1.5 rounded-lg text-xs font-bold text-left border ${gc(s)} hover:opacity-80`}>{s}</button>
                          ))}
                          <span className="text-[9px] font-bold text-surface-400 px-1 mt-2">TEACHER</span>
                          {teachers.map(t => (
                            <button key={t} onClick={() => setCellTeacher(day, period, t)} className={`px-3 py-1.5 rounded-lg text-xs font-bold text-left border ${absentTeachers.includes(t) ? 'bg-red-50 text-red-400 border-red-200 line-through' : onBreak.includes(t) ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-white text-surface-700 border-surface-200 hover:bg-indigo-50'}`}>{t}</button>
                          ))}
                          <button onClick={() => { setCell(day, period, ''); setCellTeacher(day, period, '') }} className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-500 border border-red-200 bg-red-50 hover:bg-red-100">Clear</button>
                        </div>
                      )}
                      <div className={`px-2 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all border min-h-[52px] flex flex-col items-center justify-center gap-0.5 ${cell.subject ? gc(cell.subject) : 'border-dashed border-surface-200 text-surface-300 hover:border-surface-400'}`}>
                        {cell.subject ? (
                          <>
                            <span>{cell.subject}</span>
                            {cell.teacher && (
                              <span className={`text-[10px] font-semibold ${isAbsent ? 'line-through text-red-400' : 'opacity-60'}`}>{cell.teacher}</span>
                            )}
                            {cell.substitute && (
                              <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 rounded">Sub: {cell.substitute}</span>
                            )}
                            {isAbsent && !cell.substitute && (
                              <button onClick={e => { e.stopPropagation(); setSubModal({ day, period }) }} className="text-[9px] font-bold text-white bg-red-500 px-2 py-0.5 rounded-full mt-0.5 hover:bg-red-600 animate-pulse">
                                Assign Sub
                              </button>
                            )}
                          </>
                        ) : '+'}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Substitute Assignment Modal */}
      {subModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setSubModal(null)}>
          <div className="bg-white rounded-[24px] shadow-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-extrabold text-surface-900">Assign Substitute</h3>
              <button onClick={() => setSubModal(null)} className="p-1.5 hover:bg-surface-100 rounded-lg"><X className="w-5 h-5 text-surface-400" /></button>
            </div>
            <p className="text-sm text-surface-500 font-medium mb-1">
              <strong>{subModal.day}, {subModal.period}</strong> — {grid[subModal.day]?.[subModal.period]?.subject}
            </p>
            <p className="text-xs text-red-500 font-bold mb-4">
              <UserX className="w-3.5 h-3.5 inline mr-1" />{grid[subModal.day]?.[subModal.period]?.teacher} is absent
            </p>
            <p className="text-xs font-bold text-surface-400 uppercase tracking-widest mb-2">Available Teachers</p>
            <div className="space-y-2 max-h-[250px] overflow-y-auto">
              {(() => {
                const subj = grid[subModal.day]?.[subModal.period]?.subject
                const avail = getAvailable().sort((a, b) => {
                  const aMatch = (teacherSubjects[a] || []).includes(subj) ? 0 : 1
                  const bMatch = (teacherSubjects[b] || []).includes(subj) ? 0 : 1
                  return aMatch - bMatch
                })
                return avail.length > 0 ? avail.map(t => {
                  const teachesSubj = (teacherSubjects[t] || []).includes(subj)
                  return (
                    <button key={t} onClick={() => setSubstitute(subModal.day, subModal.period, t)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${teachesSubj ? 'border-emerald-300 bg-emerald-50 hover:bg-emerald-100' : 'border-surface-200 hover:border-surface-300 hover:bg-surface-50'}`}>
                      <UserCheck className={`w-4 h-4 shrink-0 ${teachesSubj ? 'text-emerald-600' : 'text-surface-400'}`} />
                      <div className="flex-1">
                        <span className="text-sm font-bold text-surface-800">{t}</span>
                        {teachesSubj && <span className="ml-2 text-[10px] font-bold bg-emerald-200 text-emerald-700 px-1.5 py-0.5 rounded">Teaches {subj}</span>}
                        {(teacherSubjects[t] || []).length > 0 && !teachesSubj && (
                          <span className="ml-2 text-[10px] text-surface-400">{(teacherSubjects[t] || []).join(', ')}</span>
                        )}
                      </div>
                    </button>
                  )
                }) : <p className="text-sm text-surface-400 font-medium text-center py-4">No available teachers</p>
              })()}
            </div>
            {grid[subModal.day]?.[subModal.period]?.substitute && (
              <button onClick={() => setSubstitute(subModal.day, subModal.period, '')} className="w-full mt-3 py-2.5 bg-red-50 text-red-600 font-bold rounded-xl text-sm border border-red-200 hover:bg-red-100">
                Remove Current Substitute
              </button>
            )}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-6 bg-white rounded-[20px] border border-surface-200 p-5">
        <h3 className="text-xs font-black uppercase tracking-widest text-surface-400 mb-3">Color Legend</h3>
        <div className="flex flex-wrap gap-2">
          {subjects.filter(s => s !== 'Free Period').map(s => (
            <span key={s} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border ${gc(s)}`}>{s}</span>
          ))}
        </div>
      </div>

      {/* Cloud Modal */}
      {isCloudModalOpen && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setIsCloudModalOpen(false)}>
          <div className="bg-white rounded-[28px] shadow-2xl p-6 w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-extrabold text-surface-900 flex items-center gap-2"><Cloud className="w-6 h-6 text-indigo-500" /> My Saved Timetables</h3>
              <button onClick={() => setIsCloudModalOpen(false)} className="p-2 hover:bg-surface-100 rounded-xl transition-colors"><X className="w-5 h-5 text-surface-500" /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
              {cloudTimetables.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-surface-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Cloud className="w-8 h-8 text-surface-300" />
                  </div>
                  <h4 className="text-lg font-bold text-surface-900 mb-1">No Timetables Found</h4>
                  <p className="text-surface-500 text-sm">Save your first timetable to the cloud to access it from anywhere.</p>
                </div>
              ) : (
                cloudTimetables.map(tb => (
                  <div key={tb.id} className="p-5 rounded-[20px] border border-surface-200 hover:border-indigo-300 hover:shadow-soft hover:-translate-y-0.5 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-extrabold text-surface-900 text-lg truncate">{tb.className || 'Unnamed Class'}</h4>
                        {tb.updatedAt && <span className="text-[10px] font-bold text-surface-400 bg-surface-100 px-2 py-0.5 rounded-full whitespace-nowrap">{new Date(tb.updatedAt.toDate()).toLocaleDateString()}</span>}
                      </div>
                      <p className="text-sm font-semibold text-surface-600 truncate flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5" /> {tb.schoolName || 'No school specified'}
                      </p>
                      {tb.details && <p className="text-xs text-surface-500 mt-2 line-clamp-2 leading-relaxed bg-surface-50 p-2 rounded-lg">{tb.details}</p>}
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                      <button onClick={() => handleLoadTimetable(tb)} className="flex-1 sm:flex-none px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 whitespace-nowrap shadow-sm active:scale-[0.98] transition-all">
                        Load Schedule
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
