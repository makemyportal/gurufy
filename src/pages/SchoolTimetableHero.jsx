import { useState, useEffect, useMemo } from 'react'
import { CalendarDays, Users, LayoutDashboard, Sparkles, Database, Save, CheckCircle2, ChevronRight, ChevronLeft, Plus, X, AlertCircle, Loader2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../utils/firebase'
import { collection, query, where, getDocs, writeBatch, doc, serverTimestamp } from 'firebase/firestore'
import { useGamification } from '../contexts/GamificationContext'
import TokenShopModal from '../components/TokenShopModal'
import { useNavigate } from 'react-router-dom'

const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DEFAULT_PERIODS = ['Period 1', 'Period 2', 'Period 3', 'Period 4', 'Lunch', 'Period 5', 'Period 6', 'Period 7', 'Period 8']

const SUBJECTS = ['Mathematics', 'Science', 'English', 'Hindi', 'Social Studies', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Physical Education', 'Art', 'Music', 'Library', 'EVS']

export default function SchoolTimetableHero({ onClose, onSaved, activeSchoolId }) {
  const { currentUser } = useAuth()
  const { spendCoins, stats, toolCosts } = useGamification()
  const GENERATION_COST = toolCosts?.['timetable'] ?? 10
  const navigate = useNavigate()
  const [createdSchoolId, setCreatedSchoolId] = useState(null)

  const [step, setStep] = useState(1)
  const [activeSchool, setActiveSchool] = useState(null)
  
  // Step 1 State
  const [schoolName, setSchoolName] = useState('')
  const [activeDays, setActiveDays] = useState(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'])
  const [periods, setPeriods] = useState(DEFAULT_PERIODS)

  // Step 2 State
  const [teachers, setTeachers] = useState([])
  const [newTeacherName, setNewTeacherName] = useState('')
  const [newTeacherSubjects, setNewTeacherSubjects] = useState([])
  const [newTeacherClasses, setNewTeacherClasses] = useState('')

  // Step 3 State
  const [classes, setClasses] = useState([])
  const [newClassName, setNewClassName] = useState('')
  const [newClassTeacher, setNewClassTeacher] = useState('')

  // Step 4 State
  const [generatedData, setGeneratedData] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showShop, setShowShop] = useState(false)

  // No longer locking to activeSchool from localStorage so anyone can use it

  const handleAddTeacher = () => {
    if (!newTeacherName.trim() || newTeacherSubjects.length === 0) return alert('Enter name and at least one subject.')
    setTeachers(prev => [...prev, {
      id: Date.now().toString(),
      name: newTeacherName.trim(),
      subjects: newTeacherSubjects,
      allowedClasses: newTeacherClasses.trim()
    }])
    setNewTeacherName('')
    setNewTeacherSubjects([])
    setNewTeacherClasses('')
  }

  const handleRemoveTeacher = (id) => {
    setTeachers(prev => prev.filter(t => t.id !== id))
    // Also remove them from any class where they are class teacher
    setClasses(prev => prev.map(c => c.classTeacher === id ? { ...c, classTeacher: '' } : c))
  }

  const handleAddClass = () => {
    if (!newClassName.trim()) return alert('Enter class name.')
    setClasses(prev => [...prev, {
      id: Date.now().toString(),
      name: newClassName.trim(),
      classTeacher: newClassTeacher // stores teacher name directly for simplicity in algorithm
    }])
    setNewClassName('')
    setNewClassTeacher('')
  }

  const handleRemoveClass = (id) => {
    setClasses(prev => prev.filter(c => c.id !== id))
  }

  const getGroupForClass = (cName) => {
    const name = (cName || '').toLowerCase();
    if (name.includes('nursery') || name.includes('lkg') || name.includes('ukg') || name.includes('kg')) return 1;
    const classMatch = name.match(/(?:class|grade)\s*(\d+)/);
    if (classMatch) {
      const num = parseInt(classMatch[1]);
      if (num >= 1 && num <= 5) return 2;
      if (num >= 6 && num <= 8) return 3;
      if (num >= 9 && num <= 12) return 4;
    }
    return 0;
  }

  const handleGenerate = () => {
    if (!schoolName.trim()) return alert('Please enter your School / Institution name in Step 1.')
    if (classes.length === 0) return alert('Add at least one class.')
    if (teachers.length === 0) return alert('Add at least one teacher.')

    setIsGenerating(true)
    
    // Simulate generation delay for visual effect
    setTimeout(() => {
      runAlgorithm()
    }, 1500)
  }

  const runAlgorithm = () => {
    const workload = {}
    const dailyWorkload = {}
    teachers.forEach(t => {
      workload[t.name] = 0
      dailyWorkload[t.name] = {}
      ALL_DAYS.forEach(d => dailyWorkload[t.name][d] = 0)
    })
    const busyMap = {}
    const getBusyKey = (d, p) => `${d}|||${p}`

    const teachingPeriods = periods.filter(p => p !== 'Lunch')
    
    let genData = classes.map(c => ({
      ...c,
      grid: {},
      aiReqs: {}
    }))

    genData.forEach(c => {
      ALL_DAYS.forEach(d => {
        c.grid[d] = {}
        periods.forEach(p => {
          c.grid[d][p] = { subject: p === 'Lunch' ? 'Lunch' : '', teacher: '', isLocked: false }
        })
      })

      // Generate default requirements based on class level
      const group = getGroupForClass(c.name)
      if (group === 1) c.aiReqs = { 'English': 8, 'Mathematics': 8, 'Art': 6, 'Music': 4, 'Physical Education': 4 }
      else if (group === 2) c.aiReqs = { 'English': 7, 'Mathematics': 7, 'Hindi': 6, 'Science': 6, 'Social Studies': 5, 'Computer Science': 2, 'Physical Education': 3, 'Art': 2, 'Library': 2 }
      else if (group === 3) c.aiReqs = { 'English': 6, 'Mathematics': 7, 'Hindi': 5, 'Science': 7, 'Social Studies': 6, 'Computer Science': 3, 'Physical Education': 3, 'Library': 2 }
      else c.aiReqs = { 'English': 6, 'Physics': 6, 'Chemistry': 6, 'Mathematics': 6, 'Biology': 6, 'Physical Education': 3, 'Computer Science': 3 }
    })

    const isEligible = (tName, day, period, className, strictDaily = true) => {
      const teacherObj = teachers.find(t => t.name === tName)
      if (!teacherObj) return false

      const allowed = teacherObj.allowedClasses
      if (allowed && className) {
        const allowedArray = allowed.split(',').map(s => s.trim().toLowerCase()).filter(s => s)
        const classStr = className.toLowerCase()
        if (allowedArray.length > 0) {
          const matches = allowedArray.some(val => {
            try {
              if (new RegExp(`\\b${val}\\b`, 'i').test(classStr)) return true;
            } catch(e) {}
            return classStr.includes(val) || val.includes(classStr);
          })
          if (!matches) return false
        }
      }
      
      const maxW = activeDays.length * teachingPeriods.length // allow fully booked if needed
      if ((workload[tName] || 0) >= maxW) return false
      
      if (strictDaily) {
        const idealMaxDaily = Math.max(1, teachingPeriods.length > 6 ? teachingPeriods.length - 2 : teachingPeriods.length - 1)
        if ((dailyWorkload[tName]?.[day] || 0) >= idealMaxDaily) return false
      }
      
      const key = getBusyKey(day, period)
      if (busyMap[key]?.has(tName)) return false
      
      return true
    }

    // PASS 1: Assign Class Teacher to Period 1
    const period1 = teachingPeriods[0]
    if (period1) {
      activeDays.forEach(day => {
        genData.forEach(c => {
          const ctName = c.classTeacher
          if (!ctName) return
          const teacherObj = teachers.find(t => t.name === ctName)
          if (!teacherObj) return

          let subjectToAssign = 'Class Teacher Period'
          let usedReq = false

          for (const sub of teacherObj.subjects) {
            if (c.aiReqs[sub] > 0) {
              subjectToAssign = sub
              c.aiReqs[sub]--
              usedReq = true
              break
            }
          }

          if (!usedReq && teacherObj.subjects.length > 0) {
            subjectToAssign = teacherObj.subjects[0]
          }

          c.grid[day][period1] = { subject: subjectToAssign, teacher: ctName, isLocked: true }
          workload[ctName] = (workload[ctName] || 0) + 1
          dailyWorkload[ctName][day] = (dailyWorkload[ctName][day] || 0) + 1
          const key = getBusyKey(day, period1)
          if (!busyMap[key]) busyMap[key] = new Set()
          busyMap[key].add(ctName)
        })
      })
    }

    // PASS 2: Assign rest with horizontal consistency
    const remainingPeriods = teachingPeriods.slice(1)
    
    remainingPeriods.forEach(period => {
      const currentTracker = {}
      
      activeDays.forEach(day => {
        genData.forEach(c => {
          const cell = c.grid[day]?.[period]
          if (cell && cell.subject) return

          const tracker = currentTracker[c.id]
          if (tracker && tracker.subject && c.aiReqs[tracker.subject] > 0) {
            if (isEligible(tracker.teacherName, day, period, c.name, true) || isEligible(tracker.teacherName, day, period, c.name, false)) {
              c.grid[day][period] = { subject: tracker.subject, teacher: tracker.teacherName, isLocked: false }
              c.aiReqs[tracker.subject]--
              workload[tracker.teacherName] = (workload[tracker.teacherName] || 0) + 1
              dailyWorkload[tracker.teacherName][day] = (dailyWorkload[tracker.teacherName][day] || 0) + 1
              const key = getBusyKey(day, period)
              if (!busyMap[key]) busyMap[key] = new Set()
              busyMap[key].add(tracker.teacherName)
              return
            }
          }

          const subjectReqs = Object.entries(c.aiReqs)
            .map(([sub, count]) => ({ subject: sub, remaining: count }))
            .filter(s => s.remaining > 0)
            .sort((a, b) => b.remaining - a.remaining)

          if (subjectReqs.length === 0) return

          for (const req of subjectReqs) {
            let candidates = teachers.filter(t => t.subjects.includes(req.subject) && isEligible(t.name, day, period, c.name, true))
            
            if (candidates.length === 0) {
              candidates = teachers.filter(t => t.subjects.includes(req.subject) && isEligible(t.name, day, period, c.name, false))
            }
            if (candidates.length === 0) {
              candidates = teachers.filter(t => isEligible(t.name, day, period, c.name, true))
            }
            if (candidates.length === 0) {
              candidates = teachers.filter(t => isEligible(t.name, day, period, c.name, false))
            }

            if (candidates.length > 0) {
              candidates.sort((a, b) => (workload[a.name] || 0) - (workload[b.name] || 0))
              const assignedTeacher = candidates[0]
              
              c.grid[day][period] = { subject: req.subject, teacher: assignedTeacher.name, isLocked: false }
              c.aiReqs[req.subject]--
              workload[assignedTeacher.name] = (workload[assignedTeacher.name] || 0) + 1
              dailyWorkload[assignedTeacher.name][day] = (dailyWorkload[assignedTeacher.name][day] || 0) + 1
              const key = getBusyKey(day, period)
              if (!busyMap[key]) busyMap[key] = new Set()
              busyMap[key].add(assignedTeacher.name)
              
              currentTracker[c.id] = { subject: req.subject, teacherName: assignedTeacher.name }
              break
            }
          }
        })
      })
    })

    // PASS 3: Fallback - Fill remaining empty slots with any eligible teacher
    remainingPeriods.forEach(period => {
      activeDays.forEach(day => {
        genData.forEach(c => {
          const cell = c.grid[day]?.[period]
          if (cell && cell.subject) return

          let candidates = teachers.filter(t => isEligible(t.name, day, period, c.name, true))
          if (candidates.length === 0) {
            candidates = teachers.filter(t => isEligible(t.name, day, period, c.name, false))
          }

          if (candidates.length > 0) {
            candidates.sort((a, b) => (workload[a.name] || 0) - (workload[b.name] || 0))
            const assignedTeacher = candidates[0]
            const subj = assignedTeacher.subjects[0] || 'General'
            
            c.grid[day][period] = { subject: subj, teacher: assignedTeacher.name, isLocked: false }
            workload[assignedTeacher.name] = (workload[assignedTeacher.name] || 0) + 1
            dailyWorkload[assignedTeacher.name][day] = (dailyWorkload[assignedTeacher.name][day] || 0) + 1
            const key = getBusyKey(day, period)
            if (!busyMap[key]) busyMap[key] = new Set()
            busyMap[key].add(assignedTeacher.name)
          } else {
            c.grid[day][period] = { subject: 'Free Period', teacher: '', isLocked: false }
          }
        })
      })
    })

    setGeneratedData(genData)
    setIsGenerating(false)
    setStep(5)
  }

  const handleSaveToCloud = async () => {
    if (!currentUser) return
    
    if ((stats?.coins || 0) < GENERATION_COST) {
      setShowShop(true)
      return alert(`Not enough coins! You need ${GENERATION_COST} 🪙 to save.`)
    }

    setIsSaving(true)
    try {
      const success = await spendCoins(GENERATION_COST, 'Save Full School Timetables')
      if (!success) {
        setIsSaving(false)
        return alert('Failed to deduct coins.')
      }

      const batch = writeBatch(db)
      
      let finalSchoolId = activeSchoolId || createdSchoolId
      if (!finalSchoolId) {
        const newSchoolRef = doc(collection(db, 'schools'))
        finalSchoolId = newSchoolRef.id
        setCreatedSchoolId(finalSchoolId)
        batch.set(newSchoolRef, {
          userId: currentUser.uid,
          name: schoolName.trim() || 'My School',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        })
      }

      generatedData.forEach(c => {
        const docRef = doc(collection(db, 'timetables'))
        batch.set(docRef, {
          userId: currentUser.uid,
          schoolId: finalSchoolId,
          schoolName: schoolName.trim(),
          className: c.name,
          classTeacher: c.classTeacher,
          grid: c.grid,
          aiRequirements: c.aiReqs,
          activeDays,
          teachers: teachers.map(t => t.name),
          teacherSubjects: teachers.reduce((acc, t) => { acc[t.name] = t.subjects; return acc; }, {}),
          teacherConstraints: teachers.reduce((acc, t) => { acc[t.name] = { allowedClasses: t.allowedClasses }; return acc; }, {}),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        })
      })

      await batch.commit()
      alert('School Timetables saved successfully! You can view and edit them individually in the Timetable Builder.')
      if (onSaved) onSaved(finalSchoolId)
      if (onClose) {
        onClose()
      } else {
        navigate('/timetable')
      }
    } catch (err) {
      console.error(err)
      alert('Failed to save timetables.')
    } finally {
      setIsSaving(false)
    }
  }

  const renderStepIcon = (num, icon) => {
    const Icon = icon
    const isActive = step === num
    const isPast = step > num
    return (
      <div className={`flex flex-col items-center z-10 transition-all ${isActive ? 'scale-110' : ''}`}>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg shadow-lg mb-2 transition-colors ${
          isActive ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-indigo-500/30' :
          isPast ? 'bg-indigo-100 text-indigo-600' : 'bg-surface-100 text-surface-400'
        }`}>
          {isPast ? <CheckCircle2 className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
        </div>
        <span className={`text-xs font-bold uppercase tracking-wider ${isActive ? 'text-indigo-700' : 'text-surface-400'}`}>Step {num}</span>
      </div>
    )
  }

  const content = (
    <div className={`${onClose ? 'w-full bg-surface-50 rounded-[32px] overflow-hidden' : 'min-h-screen bg-surface-50 pb-20'}`}>
      {onClose && (
        <button onClick={onClose} className="absolute top-6 right-6 z-50 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors">
          <X className="w-5 h-5" />
        </button>
      )}
      {/* Premium Hero Header */}
      <div className="bg-gradient-to-br from-indigo-900 via-purple-900 to-violet-900 pt-24 pb-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-pink-500/30 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/30 rounded-full blur-[100px]"></div>
        
        <div className="max-w-5xl mx-auto relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-md text-white/90 text-sm font-bold tracking-widest uppercase mb-6">
            <Sparkles className="w-4 h-4 text-pink-400" />
            Hero Tool
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white font-display mb-6 leading-tight">
            Complete School <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400">Timetable Generator</span>
          </h1>
          <p className="text-lg text-white/70 max-w-2xl mx-auto font-medium">
            Configure your teachers, define your classes, and let our advanced algorithm build collision-free schedules for your entire school in one click.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto -mt-20 relative z-20 px-4">
        {/* Stepper */}
        <div className="bg-white/80 backdrop-blur-xl rounded-[32px] shadow-xl p-8 mb-8 border border-white">
          <div className="flex items-center justify-between relative px-4 md:px-12">
            <div className="absolute top-6 left-12 right-12 h-0.5 bg-surface-100 -z-10">
              <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${(step - 1) * 25}%` }}></div>
            </div>
            {renderStepIcon(1, CalendarDays)}
            {renderStepIcon(2, Users)}
            {renderStepIcon(3, LayoutDashboard)}
            {renderStepIcon(4, Sparkles)}
            {renderStepIcon(5, Database)}
          </div>
        </div>

        {/* Wizard Content */}
        <div className="bg-white/80 backdrop-blur-xl rounded-[32px] shadow-xl border border-white overflow-hidden min-h-[500px] flex flex-col">
          <div className="p-8 flex-1">
            
            {step === 1 && (
              <div className="animate-fade-in max-w-2xl mx-auto py-8">
                <div className="text-center mb-10">
                  <h2 className="text-3xl font-black text-surface-900 font-display">School Schedule</h2>
                  <p className="text-surface-500 mt-2">Define your school's operating days and periods.</p>
                </div>
                
                <div className="space-y-8">
                  <div>
                    <label className="text-sm font-bold text-surface-700 block mb-3 uppercase tracking-widest">School / Institution Name</label>
                    <input 
                      type="text" 
                      value={schoolName} 
                      onChange={e => setSchoolName(e.target.value)} 
                      placeholder="e.g. Delhi Public School" 
                      className="w-full px-4 py-3.5 bg-white border border-surface-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-surface-900" 
                    />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-surface-700 block mb-3 uppercase tracking-widest">Active Working Days</label>
                    <div className="flex flex-wrap gap-2">
                      {ALL_DAYS.map(d => (
                        <button 
                          key={d} 
                          onClick={() => setActiveDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])}
                          className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${activeDays.includes(d) ? 'bg-indigo-500 text-white shadow-md' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'}`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex gap-3 text-amber-800">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <p className="text-sm font-medium">Currently using a standard 8-period structure including Lunch. You can edit specific bell timings later in the individual Timetable Builder.</p>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="animate-fade-in max-w-4xl mx-auto">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8">
                  <div>
                    <h2 className="text-3xl font-black text-surface-900 font-display">Teachers Setup</h2>
                    <p className="text-surface-500 mt-1">Add your teaching staff and their expertise.</p>
                  </div>
                  <div className="px-4 py-2 bg-indigo-50 text-indigo-700 font-bold rounded-xl mt-4 md:mt-0 border border-indigo-100">
                    {teachers.length} Teachers Added
                  </div>
                </div>

                <div className="bg-surface-50 p-6 rounded-[24px] border border-surface-200 mb-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    <div className="lg:col-span-1">
                      <label className="text-xs font-bold text-surface-500 uppercase tracking-widest mb-2 block">Teacher Name</label>
                      <input type="text" value={newTeacherName} onChange={e => setNewTeacherName(e.target.value)} placeholder="e.g. Mr. Sharma" className="w-full px-4 py-3 bg-white border border-surface-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-surface-900" />
                    </div>
                    <div className="lg:col-span-1">
                      <label className="text-xs font-bold text-surface-500 uppercase tracking-widest mb-2 block">Subjects Taught</label>
                      <select onChange={e => { if (e.target.value && !newTeacherSubjects.includes(e.target.value)) setNewTeacherSubjects([...newTeacherSubjects, e.target.value]) }} className="w-full px-4 py-3 bg-white border border-surface-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-surface-900 appearance-none">
                        <option value="">+ Add Subject</option>
                        {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="lg:col-span-1">
                      <label className="text-xs font-bold text-surface-500 uppercase tracking-widest mb-2 block">Allowed Classes</label>
                      <input type="text" value={newTeacherClasses} onChange={e => setNewTeacherClasses(e.target.value)} placeholder="e.g. Class 1, Class 2" className="w-full px-4 py-3 bg-white border border-surface-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-surface-900" />
                    </div>
                    <div className="lg:col-span-1">
                      <button onClick={handleAddTeacher} className="w-full h-[46px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-md">
                        <Plus className="w-5 h-5" /> Add
                      </button>
                    </div>
                  </div>
                  {newTeacherSubjects.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {newTeacherSubjects.map(s => (
                        <span key={s} className="px-3 py-1 bg-white border border-surface-200 rounded-lg text-xs font-bold text-surface-700 flex items-center gap-1 shadow-sm">
                          {s} <button onClick={() => setNewTeacherSubjects(prev => prev.filter(x => x !== s))} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {teachers.map(t => (
                    <div key={t.id} className="bg-white border border-surface-200 rounded-2xl p-5 shadow-sm relative group hover:border-indigo-300 transition-all">
                      <button onClick={() => handleRemoveTeacher(t.id)} className="absolute top-4 right-4 p-1.5 text-surface-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"><X className="w-4 h-4" /></button>
                      <h3 className="font-bold text-lg text-surface-900">{t.name}</h3>
                      <p className="text-xs text-surface-500 font-medium mt-1 mb-3">Allowed: {t.allowedClasses || 'All Classes'}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {t.subjects.map(s => <span key={s} className="px-2.5 py-1 bg-surface-100 text-surface-700 rounded-md text-[10px] font-bold uppercase tracking-wider">{s}</span>)}
                      </div>
                    </div>
                  ))}
                </div>
                {teachers.length === 0 && <div className="text-center py-12 text-surface-400 font-medium border-2 border-dashed border-surface-200 rounded-2xl">No teachers added yet. Start building your staff roster above.</div>}
              </div>
            )}

            {step === 3 && (
              <div className="animate-fade-in max-w-4xl mx-auto">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8">
                  <div>
                    <h2 className="text-3xl font-black text-surface-900 font-display">Classes & Sections</h2>
                    <p className="text-surface-500 mt-1">Define your classes and assign Class Teachers.</p>
                  </div>
                  <div className="px-4 py-2 bg-indigo-50 text-indigo-700 font-bold rounded-xl mt-4 md:mt-0 border border-indigo-100">
                    {classes.length} Classes Added
                  </div>
                </div>

                <div className="bg-surface-50 p-6 rounded-[24px] border border-surface-200 mb-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div>
                      <label className="text-xs font-bold text-surface-500 uppercase tracking-widest mb-2 block">Class Name</label>
                      <input type="text" value={newClassName} onChange={e => setNewClassName(e.target.value)} placeholder="e.g. Class 1-A" className="w-full px-4 py-3 bg-white border border-surface-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-surface-900" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-surface-500 uppercase tracking-widest mb-2 block">Class Teacher (Optional)</label>
                      <select value={newClassTeacher} onChange={e => setNewClassTeacher(e.target.value)} className="w-full px-4 py-3 bg-white border border-surface-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-surface-900 appearance-none">
                        <option value="">None</option>
                        {teachers.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <button onClick={handleAddClass} className="w-full h-[46px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-md">
                        <Plus className="w-5 h-5" /> Add Class
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {classes.map(c => (
                    <div key={c.id} className="bg-white border border-surface-200 rounded-2xl p-5 shadow-sm relative group hover:border-indigo-300 transition-all">
                      <button onClick={() => handleRemoveClass(c.id)} className="absolute top-4 right-4 p-1.5 text-surface-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"><X className="w-4 h-4" /></button>
                      <h3 className="font-bold text-lg text-surface-900 flex items-center gap-2">
                        <LayoutDashboard className="w-5 h-5 text-indigo-500" /> {c.name}
                      </h3>
                      {c.classTeacher ? (
                        <p className="text-sm text-surface-600 font-medium mt-2 flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-surface-400" /> Class Teacher: <span className="font-bold text-indigo-700">{c.classTeacher}</span>
                        </p>
                      ) : (
                        <p className="text-sm text-surface-400 font-medium mt-2 italic">No Class Teacher assigned</p>
                      )}
                    </div>
                  ))}
                </div>
                {classes.length === 0 && <div className="text-center py-12 text-surface-400 font-medium border-2 border-dashed border-surface-200 rounded-2xl">No classes added yet. Start building your school layout above.</div>}
              </div>
            )}

            {step === 4 && (
              <div className="animate-fade-in max-w-lg mx-auto text-center py-12">
                <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner relative">
                  {isGenerating && <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>}
                  <Sparkles className={`w-10 h-10 ${isGenerating ? 'text-indigo-500 animate-pulse' : 'text-indigo-400'}`} />
                </div>
                <h2 className="text-3xl font-black text-surface-900 font-display mb-4">Ready to Generate?</h2>
                <p className="text-surface-500 mb-8 leading-relaxed">
                  Our algorithm will process <strong>{teachers.length} teachers</strong> and <strong>{classes.length} classes</strong>. It will ensure Class Teachers get Period 1, prevent all clashes, and distribute workloads evenly.
                </p>
                <button 
                  onClick={handleGenerate} 
                  disabled={isGenerating}
                  className="w-full py-5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-2xl text-lg font-bold shadow-xl hover:shadow-2xl transition-all active:scale-[0.98] disabled:opacity-70 disabled:scale-100 flex items-center justify-center gap-3"
                >
                  {isGenerating ? (
                    <><Sparkles className="w-6 h-6 animate-spin" /> Generating Timetables...</>
                  ) : (
                    <><Sparkles className="w-6 h-6" /> Generate Complete School (Free Preview)</>
                  )}
                </button>
              </div>
            )}

            {step === 5 && generatedData && (
              <div className="animate-fade-in max-w-5xl mx-auto">
                <div className="text-center mb-10">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full mb-4">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h2 className="text-3xl font-black text-surface-900 font-display">Generation Complete!</h2>
                  <p className="text-surface-500 mt-2">Successfully created {generatedData.length} timetables with zero clashes.</p>
                </div>

                <div className="bg-surface-50 p-6 rounded-2xl border border-surface-200 mb-8 max-h-[400px] overflow-y-auto custom-scrollbar">
                  {generatedData.map(c => (
                    <div key={c.id} className="mb-6 last:mb-0">
                      <h3 className="font-bold text-lg text-surface-900 mb-3 border-b border-surface-200 pb-2">{c.name} {c.classTeacher && <span className="text-sm font-medium text-surface-500 ml-2">(CT: {c.classTeacher})</span>}</h3>
                      <div className="overflow-x-auto border border-surface-200 rounded-xl bg-white shadow-sm custom-scrollbar">
                        <table className="w-full text-left border-collapse min-w-max">
                          <thead>
                            <tr className="bg-surface-50 text-surface-500 text-[10px] uppercase tracking-wider font-bold">
                              <th className="p-3 border-b border-r border-surface-200 sticky left-0 bg-surface-50 z-10 w-28 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">Day \ Period</th>
                              {periods.map(p => (
                                <th key={p} className="p-3 border-b border-surface-200 text-center whitespace-nowrap">{p}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {activeDays.map(d => (
                              <tr key={d} className="border-b border-surface-100 last:border-0 hover:bg-surface-50 transition-colors">
                                <td className="p-3 border-r border-surface-200 font-bold text-surface-700 text-xs sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">{d}</td>
                                {periods.map(p => {
                                  const cell = c.grid[d]?.[p]
                                  const isLunch = p.toLowerCase() === 'lunch'
                                  return (
                                    <td key={p} className={`p-2 text-center border-r border-surface-100 last:border-0 min-w-[120px] ${isLunch ? 'bg-amber-50/50' : ''}`}>
                                      {isLunch ? (
                                        <span className="text-xs font-bold text-amber-700 tracking-widest">LUNCH</span>
                                      ) : cell?.subject ? (
                                        <div className="flex flex-col gap-0.5 items-center justify-center">
                                          <span className="text-[11px] font-bold text-indigo-700 truncate w-full max-w-[110px]" title={cell.subject}>{cell.subject}</span>
                                          <span className="text-[9px] text-surface-500 truncate w-full max-w-[110px]" title={cell.teacher}>{cell.teacher}</span>
                                        </div>
                                      ) : (
                                        <span className="text-[11px] text-surface-300 font-medium">- Free -</span>
                                      )}
                                    </td>
                                  )
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-center">
                  <button 
                    onClick={handleSaveToCloud}
                    disabled={isSaving}
                    className="py-4 px-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg hover:shadow-xl transition-all active:scale-[0.98] disabled:opacity-70 flex items-center gap-2"
                  >
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    {isSaving ? 'Saving to Database...' : `Save All Timetables to Cloud (${GENERATION_COST} 🪙)`}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Wizard Footer Controls */}
          <div className="p-6 bg-surface-50 border-t border-surface-100 flex items-center justify-between">
            <button 
              onClick={() => setStep(prev => prev - 1)} 
              disabled={step === 1 || isGenerating || step === 5}
              className="px-6 py-3 font-bold text-surface-600 hover:bg-surface-200 rounded-xl transition-colors disabled:opacity-0 flex items-center gap-2"
            >
              <ChevronLeft className="w-5 h-5" /> Back
            </button>
            
            {step < 4 && (
              <button 
                onClick={() => setStep(prev => prev + 1)}
                className="px-8 py-3 bg-surface-900 hover:bg-black text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center gap-2"
              >
                Next Step <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>
      
      {showShop && <TokenShopModal onClose={() => setShowShop(false)} />}
    </div>
  )

  if (onClose) {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm overflow-y-auto custom-scrollbar flex items-start justify-center p-4 pt-10">
        <div className="w-full max-w-5xl shadow-2xl relative my-10 animate-fade-in-up">
          {content}
        </div>
      </div>
    )
  }

  return content;
}
