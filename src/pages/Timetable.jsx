import { useState, useEffect, useRef } from 'react'
import { CalendarDays, Printer, RotateCcw, X, Save, UserX, UserCheck, Coffee, AlertTriangle, Users, Plus, BookOpen, Tag, Cloud, FolderOpen, AlertCircle, User, ChevronDown, MessageCircle, Share2, Copy, Settings, Sparkles, Send, Mail, Link as LinkIcon, Edit2, Upload, Download, Trash2, Database, Clock, ArrowRight, Lock, Unlock } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../utils/firebase'
import { collection, addDoc, getDocs, query, where, serverTimestamp, updateDoc, doc, deleteDoc, writeBatch } from 'firebase/firestore'
import { generateAIContent } from '../utils/aiService'
import { extractTextFromFile } from '../utils/fileExtractor'
import { useGamification } from '../contexts/GamificationContext'

const ALL_DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const PERIODS = ['Period 1','Period 2','Period 3','Period 4','Lunch','Period 5','Period 6','Period 7','Period 8']
const DEFAULT_SUBJECTS = ['Mathematics','Science','English','Hindi','Social Studies','Physics','Chemistry','Biology','Computer Science','Physical Education','Art','Music','Library','Lunch','Free Period']
const DEFAULT_TEACHERS = ['Mr. Sharma','Ms. Gupta','Mr. Patel','Ms. Singh','Mr. Kumar','Ms. Joshi','Mr. Verma','Ms. Rao','Mr. Khan','Ms. Mehta','Mr. Reddy','Ms. Nair']

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
  const { spendCoins, toolCosts, stats } = useGamification()
  
  const GENERATION_COST = toolCosts?.['timetable'] ?? 10
  const VISION_TAX = toolCosts?.['vision_pdf'] ?? 5
  const visionUses = stats?.aiUsages || 0
  
  // grid[day][period] = { subject, teacher, substitute, room, isLocked }
  const [gridHistory, setGridHistory] = useState(() => {
    const s = localStorage.getItem('ldms_timetable_v2')
    return [s ? s : JSON.stringify({})]
  })
  const [historyIndex, setHistoryIndex] = useState(0)

  const [grid, _setGrid] = useState(() => {
    const s = localStorage.getItem('ldms_timetable_v2')
    if (s) {
      const parsed = JSON.parse(s);
      ALL_DAYS.forEach(d => {
        if(parsed[d]) {
          PERIODS.forEach(p => {
            if(parsed[d][p]) {
              if (parsed[d][p].room === undefined) parsed[d][p].room = '';
              if (parsed[d][p].isLocked === undefined) parsed[d][p].isLocked = false;
            }
          })
        }
      })
      return parsed;
    }
    const g = {}
    ALL_DAYS.forEach(d => { g[d] = {}; PERIODS.forEach(p => { g[d][p] = { subject: p === 'Lunch' ? 'Lunch' : '', teacher: '', substitute: '', room: '', isLocked: false } }) })
    return g
  })

  const setGrid = (action) => {
    _setGrid(prev => {
      const nextGrid = typeof action === 'function' ? action(prev) : action;
      const gridStr = JSON.stringify(nextGrid);
      const prevStr = JSON.stringify(prev);
      
      if (gridStr !== prevStr) {
        setGridHistory(curr => {
          const newHist = [...curr.slice(0, historyIndex + 1), gridStr];
          if (newHist.length > 20) newHist.shift(); // keep last 20 actions
          return newHist;
        });
        setHistoryIndex(curr => Math.min(curr + 1, 19));
      }
      return nextGrid;
    });
  }

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevStr = gridHistory[historyIndex - 1];
      _setGrid(JSON.parse(prevStr));
      setHistoryIndex(i => i - 1);
    }
  }

  const handleRedo = () => {
    if (historyIndex < gridHistory.length - 1) {
      const nextStr = gridHistory[historyIndex + 1];
      _setGrid(JSON.parse(nextStr));
      setHistoryIndex(i => i + 1);
    }
  }

  // Keyboard shortcuts for Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, gridHistory]);

  const [isUploadingPDF, setIsUploadingPDF] = useState(false)
  const fileInputRef = useRef(null)

  const handleUploadTeacherPDF = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setIsUploadingPDF(true)
    try {
      const extractedText = await extractTextFromFile(file)
      const prompt = `Extract the list of teachers, their associated subjects, and designations from this document. Return ONLY a valid JSON array of objects, where each object has 'name' (string), 'subjects' (array of strings, try to map to standard school subjects like Mathematics, Science, English, etc.), and 'designation' (string). If no subjects or designations are found, leave them empty. DO NOT wrap in markdown block. Just raw JSON array starting with [ and ending with ].\n\nDocument Text:\n"${extractedText}"`
      
      const responseText = await generateAIContent(prompt, { preferGemini: true })
          
          let parsed = []
          try {
            const cleanJson = responseText.replace(/```json\\n?/g, '').replace(/```/g, '').trim()
            parsed = JSON.parse(cleanJson)
          } catch(err) {
            console.error("Failed to parse JSON:", responseText)
            throw new Error("AI returned invalid data format.")
          }
          
          if (!Array.isArray(parsed) || parsed.length === 0) {
            throw new Error("No teachers found in the document.")
          }
          
          const newTeachers = []
          const newSubjects = []
          const newTeacherSubjects = { ...teacherSubjects }
          const newTeacherConstraints = { ...teacherConstraints }
          
          parsed.forEach(t => {
            if (t.name && t.name.trim()) {
              const tName = t.name.trim()
              if (!teachers.includes(tName) && !newTeachers.includes(tName)) {
                newTeachers.push(tName)
              }
              if (t.designation && t.designation.trim()) {
                newTeacherConstraints[tName] = {
                  ...(newTeacherConstraints[tName] || {}),
                  notes: t.designation.trim()
                }
              }
              if (Array.isArray(t.subjects) && t.subjects.length > 0) {
                newTeacherSubjects[tName] = Array.from(new Set([...(newTeacherSubjects[tName] || []), ...t.subjects]))
                t.subjects.forEach(s => {
                  const sName = s.trim()
                  if (sName && !subjects.includes(sName) && !newSubjects.includes(sName)) {
                    newSubjects.push(sName)
                  }
                })
              }
            }
          })
          
          if (newTeachers.length > 0) {
            setTeachers(prev => [...prev, ...newTeachers])
            setTeacherSubjects(newTeacherSubjects)
            if (newSubjects.length > 0) {
              setSubjects(prev => [...prev, ...newSubjects])
            }
            alert(`Successfully added ${newTeachers.length} teachers from the document!`)
          } else {
            alert("Teachers were found but they are already in your list.")
          }
    } catch (err) {
      alert("Error processing document: " + err.message)
    } finally {
      setIsUploadingPDF(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const [rooms, setRooms] = useState(() => {
    const s = localStorage.getItem('ldms_rooms')
    return s ? JSON.parse(s) : ['Chemistry Lab', 'Computer Lab', 'Library', 'AV Room']
  })
  const [subjectColors, setSubjectColors] = useState(() => {
    const s = localStorage.getItem('ldms_subject_colors')
    return s ? JSON.parse(s) : {}
  })
  const [teachers, setTeachers] = useState(() => {
    const s = localStorage.getItem('ldms_teachers')
    return s ? JSON.parse(s) : DEFAULT_TEACHERS
  })
  const [absentTeachers, setAbsentTeachers] = useState(() => {
    const s = localStorage.getItem('ldms_absent')
    if (s) {
      const parsed = JSON.parse(s)
      if (Array.isArray(parsed)) {
        const obj = {}
        parsed.forEach(t => { obj[t] = [...ALL_DAYS] })
        return obj
      }
      return parsed
    }
    return {}
  })

  // Day-specific absent helpers
  const isAbsentOnDay = (teacher, day) => Array.isArray(absentTeachers[teacher]) && absentTeachers[teacher].includes(day)
  const isAbsentAnyDay = (teacher) => (absentTeachers[teacher] || []).length > 0
  const getAbsentTeacherNames = () => Object.keys(absentTeachers).filter(t => (absentTeachers[t] || []).length > 0)
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
  const [isSubReportModalOpen, setIsSubReportModalOpen] = useState(false)
  const [subReportDay, setSubReportDay] = useState(ALL_DAYS[0])
  const [subAssignDay, setSubAssignDay] = useState('Today')
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [reportSelectedDays, setReportSelectedDays] = useState([])
  const [isSaving, setIsSaving] = useState(false)
  const [session, setSession] = useState(() => localStorage.getItem('ldms_timetable_session') || '')
  const [classTeacher, setClassTeacher] = useState(() => localStorage.getItem('ldms_timetable_teacher') || '')
  const [principalName, setPrincipalName] = useState(() => localStorage.getItem('ldms_timetable_principal') || '')
  
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false)
  const [selectedTeacherForView, setSelectedTeacherForView] = useState('')
  const [teacherViewGrid, setTeacherViewGrid] = useState({})
  const [allTeachersList, setAllTeachersList] = useState([])
  const [isWorkloadModalOpen, setIsWorkloadModalOpen] = useState(false)

  const [editingClass, setEditingClass] = useState(false)
  const [showPanel, setShowPanel] = useState(false)
  const [newTeacher, setNewTeacher] = useState('')
  const [newSubject, setNewSubject] = useState('')
  const [newRoom, setNewRoom] = useState('')
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false)
  const [templates, setTemplates] = useState(() => {
    const s = localStorage.getItem('ldms_timetable_templates')
    return s ? JSON.parse(s) : []
  })
  const [teacherContacts, setTeacherContacts] = useState(() => {
    const s = localStorage.getItem('ldms_teacher_contacts')
    return s ? JSON.parse(s) : {}
  })
  const [subModal, setSubModal] = useState(null)
  const [isSubPanelOpen, setIsSubPanelOpen] = useState(false)
  const [showAllTeachers, setShowAllTeachers] = useState(false)
  const [showFreeOnly, setShowFreeOnly] = useState(false)
  const [editingTeacherName, setEditingTeacherName] = useState(null)
  const [editingTeacherNewName, setEditingTeacherNewName] = useState('')
  const [teacherSubjects, setTeacherSubjects] = useState(() => {
    const s = localStorage.getItem('ldms_teacher_subjects')
    return s ? JSON.parse(s) : {}
  }) // { 'Mr. Sharma': ['Mathematics', 'Physics'], ... }
  const [teacherConstraints, setTeacherConstraints] = useState(() => {
    const s = localStorage.getItem('ldms_teacher_constraints')
    return s ? JSON.parse(s) : {}
  }) // { 'Mr. Sharma': { allowedClasses: '1,2,3', maxWorkload: 30 }, ... }
  const [assigningSubjectsFor, setAssigningSubjectsFor] = useState(null)
  const [configuringConstraintsFor, setConfiguringConstraintsFor] = useState(null)
  const [isAIModalOpen, setIsAIModalOpen] = useState(false)
  const [aiRequirements, setAiRequirements] = useState({})
  const [expandedDay, setExpandedDay] = useState(ALL_DAYS[0])
  const [teacherExpandedDay, setTeacherExpandedDay] = useState(ALL_DAYS[0])
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [bellTimings, setBellTimings] = useState(() => {
    const s = localStorage.getItem('ldms_bell_timings')
    return s ? JSON.parse(s) : {
      'Period 1': { start: '8:00', end: '8:45' },
      'Period 2': { start: '8:45', end: '9:30' },
      'Period 3': { start: '9:30', end: '10:15' },
      'Period 4': { start: '10:15', end: '11:00' },
      'Lunch': { start: '11:00', end: '11:30' },
      'Period 5': { start: '11:30', end: '12:15' },
      'Period 6': { start: '12:15', end: '1:00' },
      'Period 7': { start: '1:00', end: '1:45' },
      'Period 8': { start: '1:45', end: '2:30' }
    }
  })
  const [showBellTimings, setShowBellTimings] = useState(false)
  const tableRef = useRef(null)

  useEffect(() => { localStorage.setItem('ldms_timetable_v2', JSON.stringify(grid)) }, [grid])
  useEffect(() => { localStorage.setItem('ldms_timetable_class', className) }, [className])
  useEffect(() => { localStorage.setItem('ldms_timetable_school', schoolName) }, [schoolName])
  useEffect(() => { localStorage.setItem('ldms_timetable_session', session) }, [session])
  useEffect(() => { localStorage.setItem('ldms_timetable_teacher', classTeacher) }, [classTeacher])
  useEffect(() => { localStorage.setItem('ldms_timetable_principal', principalName) }, [principalName])
  useEffect(() => { localStorage.setItem('ldms_timetable_details', details) }, [details])
  useEffect(() => { if (currentTimetableId) localStorage.setItem('ldms_timetable_id', currentTimetableId); else localStorage.removeItem('ldms_timetable_id') }, [currentTimetableId])
  useEffect(() => { localStorage.setItem('ldms_teachers', JSON.stringify(teachers)) }, [teachers])
  useEffect(() => { localStorage.setItem('ldms_absent', JSON.stringify(absentTeachers)) }, [absentTeachers])
  useEffect(() => { localStorage.setItem('ldms_break', JSON.stringify(onBreak)) }, [onBreak])
  useEffect(() => { localStorage.setItem('ldms_subjects', JSON.stringify(subjects)) }, [subjects])
  useEffect(() => { localStorage.setItem('ldms_active_days', JSON.stringify(activeDays)) }, [activeDays])
  useEffect(() => { localStorage.setItem('ldms_rooms', JSON.stringify(rooms)) }, [rooms])
  useEffect(() => { localStorage.setItem('ldms_subject_colors', JSON.stringify(subjectColors)) }, [subjectColors])
  useEffect(() => { localStorage.setItem('ldms_teacher_subjects', JSON.stringify(teacherSubjects)) }, [teacherSubjects])
  useEffect(() => { localStorage.setItem('ldms_teacher_constraints', JSON.stringify(teacherConstraints)) }, [teacherConstraints])
  useEffect(() => { localStorage.setItem('ldms_bell_timings', JSON.stringify(bellTimings)) }, [bellTimings])
  useEffect(() => { localStorage.setItem('ldms_timetable_templates', JSON.stringify(templates)) }, [templates])
  useEffect(() => { localStorage.setItem('ldms_teacher_contacts', JSON.stringify(teacherContacts)) }, [teacherContacts])

  const handleDragStart = (e, type, item) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ type, item }))
    e.dataTransfer.effectAllowed = 'all'
  }

  const handleDropOnCell = (e, day, period) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'))
      if (data.type === 'subject') {
        setCell(day, period, data.item)
      } else if (data.type === 'teacher') {
        setCellTeacher(day, period, data.item)
      } else if (data.type === 'room') {
        setGrid(prev => ({ ...prev, [day]: { ...prev[day], [period]: { ...prev[day][period], room: data.item } } }))
      }
    } catch (err) {
      // Ignore drop error
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'copy'
  }

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
        rooms,
        subjectColors,
        activeDays,
        teacherSubjects,
        teacherConstraints,
        bellTimings,
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
      
      // Automatic Teacher Syncing across the entire school
      if (schoolName && schoolName.trim() !== '') {
        try {
          const q = query(collection(db, 'timetables'), where('userId', '==', currentUser.uid), where('schoolName', '==', schoolName));
          const snap = await getDocs(q);
          const batch = writeBatch(db);
          snap.docs.forEach(d => {
            if (d.id !== currentTimetableId) { // Skip the one we just saved
              batch.update(d.ref, {
                teachers: timetableData.teachers,
                teacherSubjects: timetableData.teacherSubjects,
                teacherConstraints: timetableData.teacherConstraints,
                absentTeachers: timetableData.absentTeachers,
                onBreak: timetableData.onBreak,
                subjects: timetableData.subjects
              });
            }
          });
          await batch.commit();
        } catch (syncErr) {
          console.error("Failed to sync teachers across school:", syncErr);
        }
      }
    } catch (error) {
      console.error('Error saving timetable:', error)
      alert('Failed to save to cloud.')
    } finally {
      setIsSaving(false)
    }
  }

  useEffect(() => {
    const tSet = new Set(teachers)
    cloudTimetables.forEach(tb => {
      if (tb.teachers) tb.teachers.forEach(t => tSet.add(t))
    })
    setAllTeachersList(Array.from(tSet).sort())
  }, [teachers, cloudTimetables])

  const loadTimetables = async () => {
    if (!currentUser) return []
    try {
      const q = query(collection(db, 'timetables'), where('userId', '==', currentUser.uid))
      const snapshot = await getDocs(q)
      const tbs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      tbs.sort((a,b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0))
      setCloudTimetables(tbs)
      return tbs
    } catch (error) {
      console.error('Error loading timetables:', error)
      return []
    }
  }

  useEffect(() => {
    if (currentUser) loadTimetables()
  }, [currentUser])

  const getMasterSubReport = (day) => {
    const absentees = getAbsentTeacherNames().filter(t => isAbsentOnDay(t, day));
    const sName = schoolName || 'Unassigned School';
    const schoolTimetables = cloudTimetables.filter(tb => (tb.schoolName || 'Unassigned School') === sName).map(tb => {
      if (tb.id === currentTimetableId) return { ...tb, grid, className };
      return tb;
    });
    if (!schoolTimetables.find(tb => tb.id === currentTimetableId)) {
      schoolTimetables.push({ id: currentTimetableId || 'current', className, grid, schoolName: sName });
    }
    const report = [];
    schoolTimetables.forEach(tb => {
      const g = tb.grid || {};
      PERIODS.forEach(p => {
        if (p === 'Lunch') return;
        const cell = g[day]?.[p];
        if (!cell) return;
        if (cell.isSplit && cell.groups) {
          cell.groups.forEach(group => {
            if (group.teacher && absentees.includes(group.teacher)) {
              report.push({ className: tb.className, period: p, originalTeacher: group.teacher, subject: group.subject, substitute: group.substitute || '' });
            }
          });
        } else {
          if (cell.teacher && absentees.includes(cell.teacher)) {
            report.push({ className: tb.className, period: p, originalTeacher: cell.teacher, subject: cell.subject, substitute: cell.substitute || '' });
          }
        }
      });
    });
    return report.reduce((acc, curr) => {
      if (!acc[curr.originalTeacher]) acc[curr.originalTeacher] = [];
      acc[curr.originalTeacher].push(curr);
      return acc;
    }, {});
  }

  const printMasterSubReport = () => {
    const reportData = getMasterSubReport(subReportDay);
    if (Object.keys(reportData).length === 0) return alert('No absent teachers found for ' + subReportDay);
    
    let totalAffected = 0, totalAssigned = 0, totalPending = 0;
    Object.values(reportData).forEach(assignments => {
      assignments.forEach(a => {
        totalAffected++;
        if (a.substitute) totalAssigned++;
        else totalPending++;
      });
    });

    const dateStr = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const w = window.open('', '_blank');
    w.document.write(`<html><head><title>Substitute Duty Report - ${subReportDay}</title><style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
      body{font-family:'Inter',sans-serif;padding:30px 40px;max-width:900px;margin:0 auto;color:#0f172a;line-height:1.5}
      .header{text-align:center;border-bottom:3px double #1e293b;padding-bottom:18px;margin-bottom:10px}
      .header h1{margin:0 0 4px;font-size:22px;text-transform:uppercase;letter-spacing:2px;font-weight:800}
      .header h2{margin:0 0 6px;font-size:16px;font-weight:600;color:#334155}
      .header .meta{font-size:12px;color:#64748b;margin-top:6px}
      .summary{display:flex;justify-content:center;gap:30px;margin:16px 0;padding:12px 0;border-bottom:1px solid #e2e8f0}
      .summary-item{text-align:center}
      .summary-item .num{font-size:24px;font-weight:800;color:#0f172a}
      .summary-item .label{font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:1px;font-weight:600}
      .summary-item.pending .num{color:#dc2626}
      .summary-item.done .num{color:#16a34a}
      .t-box{margin-bottom:20px;border:1.5px solid #cbd5e1;border-radius:8px;overflow:hidden;page-break-inside:avoid}
      .t-head{background:#1e293b;padding:10px 16px;font-size:15px;font-weight:700;color:white;display:flex;justify-content:space-between;align-items:center}
      .t-head .badge{background:rgba(255,255,255,0.2);padding:2px 10px;border-radius:99px;font-size:11px;font-weight:600}
      table{width:100%;border-collapse:collapse}
      th,td{padding:9px 14px;text-align:left;border-bottom:1px solid #e2e8f0;font-size:13px}
      th{background:#f1f5f9;color:#475569;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:1px}
      tr:last-child td{border-bottom:none}
      .sub-name{color:#1d4ed8;font-weight:700}
      .pending-cell{color:#dc2626;font-weight:700;font-style:italic}
      .footer{display:flex;justify-content:space-between;margin-top:50px;padding-top:20px}
      .sign-box{text-align:center;width:200px}
      .sign-line{border-top:1.5px solid #1e293b;margin-bottom:6px;padding-top:8px;font-weight:700;font-size:13px}
      .sign-name{font-size:12px;color:#64748b}
      .watermark{text-align:center;font-size:10px;color:#94a3b8;margin-top:20px}
      @media print{body{padding:15px 20px}}
    </style></head><body>`);
    
    w.document.write(`<div class="header">`);
    w.document.write(`<h1>${schoolName || 'School'}</h1>`);
    w.document.write(`<h2>Daily Substitute Duty Report</h2>`);
    w.document.write(`<div class="meta"><strong>Day:</strong> ${subReportDay} &nbsp;|&nbsp; <strong>Date:</strong> ${dateStr}${session ? ` &nbsp;|&nbsp; <strong>Session:</strong> ${session}` : ''}</div>`);
    w.document.write(`</div>`);

    w.document.write(`<div class="summary">`);
    w.document.write(`<div class="summary-item"><div class="num">${Object.keys(reportData).length}</div><div class="label">Absent Teachers</div></div>`);
    w.document.write(`<div class="summary-item"><div class="num">${totalAffected}</div><div class="label">Affected Periods</div></div>`);
    w.document.write(`<div class="summary-item done"><div class="num">${totalAssigned}</div><div class="label">Substitutes Assigned</div></div>`);
    w.document.write(`<div class="summary-item pending"><div class="num">${totalPending}</div><div class="label">Pending</div></div>`);
    w.document.write(`</div>`);

    Object.entries(reportData).forEach(([teacher, assignments]) => {
      const assignedCount = assignments.filter(a => a.substitute).length;
      w.document.write(`<div class="t-box">`);
      w.document.write(`<div class="t-head"><span>⚠ ${teacher}</span><span class="badge">${assignedCount}/${assignments.length} covered</span></div>`);
      w.document.write(`<table><thead><tr><th>Class</th><th>Period</th><th>Subject</th><th>Substitute Teacher</th><th>Status</th></tr></thead><tbody>`);
      assignments.forEach(a => {
        const status = a.substitute ? '✅ Covered' : '⚠ Pending';
        const statusClass = a.substitute ? '' : 'pending-cell';
        w.document.write(`<tr><td>${a.className}</td><td>${a.period}</td><td>${a.subject || '-'}</td><td class="${a.substitute ? 'sub-name' : 'pending-cell'}">${a.substitute || 'Not Assigned'}</td><td class="${statusClass}">${status}</td></tr>`);
      });
      w.document.write(`</tbody></table></div>`);
    });

    w.document.write(`<div class="footer">`);
    w.document.write(`<div class="sign-box"><div class="sign-line">Prepared By</div><div class="sign-name">${classTeacher || 'Coordinator'}</div></div>`);
    w.document.write(`<div class="sign-box"><div class="sign-line">Verified By</div><div class="sign-name">Vice Principal</div></div>`);
    w.document.write(`<div class="sign-box"><div class="sign-line">Approved By</div><div class="sign-name">${principalName || 'Principal'}</div></div>`);
    w.document.write(`</div>`);
    w.document.write(`<div class="watermark">Generated via LDMS Teacher Productivity Hub</div>`);
    w.document.write('</body></html>');
    w.document.close();
    setTimeout(() => { w.print() }, 500);
  }

  const printMultiDayReport = (days) => {
    if (!days || days.length === 0) return alert('Please select at least one day.');
    const sName = schoolName || 'Unassigned School';
    const schoolTbs = cloudTimetables.filter(tb => (tb.schoolName || 'Unassigned School') === sName).map(tb => {
      if (tb.id === currentTimetableId) return { ...tb, grid, className };
      return tb;
    });
    if (!schoolTbs.find(tb => tb.id === currentTimetableId)) {
      schoolTbs.push({ id: currentTimetableId || 'current', className, grid, schoolName: sName });
    }

    const allData = {};
    days.forEach(day => {
      const absentees = getAbsentTeacherNames().filter(t => isAbsentOnDay(t, day));
      schoolTbs.forEach(tb => {
        const g = tb.grid || {};
        PERIODS.forEach(p => {
          if (p === 'Lunch') return;
          const cell = g[day]?.[p];
          if (!cell) return;
          const checkItem = (teacher, subject, substitute) => {
            if (teacher && absentees.includes(teacher)) {
              if (!allData[day]) allData[day] = {};
              if (!allData[day][teacher]) allData[day][teacher] = [];
              allData[day][teacher].push({ className: tb.className, period: p, subject, substitute: substitute || '' });
            }
          };
          if (cell.isSplit && cell.groups) {
            cell.groups.forEach(gr => checkItem(gr.teacher, gr.subject, gr.substitute));
          } else {
            checkItem(cell.teacher, cell.subject, cell.substitute);
          }
        });
      });
    });

    if (Object.keys(allData).length === 0) return alert('No absent teacher data found for selected days.');

    const dateStr = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
    const w = window.open('', '_blank');
    w.document.write(`<html><head><title>Multi-Day Substitute Report</title><style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
      body{font-family:'Inter',sans-serif;padding:30px 40px;max-width:950px;margin:0 auto;color:#0f172a;line-height:1.5}
      .header{text-align:center;border-bottom:3px double #1e293b;padding-bottom:18px;margin-bottom:15px}
      .header h1{margin:0 0 4px;font-size:22px;text-transform:uppercase;letter-spacing:2px;font-weight:800}
      .header h2{margin:0;font-size:15px;font-weight:600;color:#334155}
      .header .meta{font-size:12px;color:#64748b;margin-top:6px}
      .day-section{margin-bottom:25px;page-break-inside:avoid}
      .day-title{font-size:16px;font-weight:800;color:#1e293b;border-bottom:2px solid #e2e8f0;padding-bottom:6px;margin-bottom:10px}
      .t-box{margin-bottom:12px;border:1.5px solid #cbd5e1;border-radius:8px;overflow:hidden}
      .t-head{background:#334155;padding:8px 14px;font-size:14px;font-weight:700;color:white;display:flex;justify-content:space-between}
      .t-head .badge{background:rgba(255,255,255,0.2);padding:1px 8px;border-radius:99px;font-size:10px}
      table{width:100%;border-collapse:collapse}
      th,td{padding:7px 12px;text-align:left;border-bottom:1px solid #e2e8f0;font-size:12px}
      th{background:#f1f5f9;color:#475569;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:1px}
      tr:last-child td{border-bottom:none}
      .sub-name{color:#1d4ed8;font-weight:700}
      .pending{color:#dc2626;font-weight:700;font-style:italic}
      .footer{display:flex;justify-content:space-between;margin-top:40px;padding-top:15px}
      .sign-box{text-align:center;width:180px}.sign-line{border-top:1.5px solid #1e293b;margin-bottom:5px;padding-top:6px;font-weight:700;font-size:12px}.sign-name{font-size:11px;color:#64748b}
      .watermark{text-align:center;font-size:9px;color:#94a3b8;margin-top:15px}
      @media print{body{padding:15px 20px}.day-section{page-break-inside:avoid}}
    </style></head><body>`);

    w.document.write(`<div class="header"><h1>${sName}</h1><h2>Substitute Duty Report — ${days.length > 1 ? days.map(d => d.slice(0,3)).join(', ') : days[0]}</h2><div class="meta">Generated: ${dateStr}${session ? ` | Session: ${session}` : ''}</div></div>`);

    days.forEach(day => {
      if (!allData[day]) return;
      w.document.write(`<div class="day-section"><div class="day-title">${day}</div>`);
      Object.entries(allData[day]).forEach(([teacher, items]) => {
        const cov = items.filter(i => i.substitute).length;
        w.document.write(`<div class="t-box"><div class="t-head"><span>⚠ ${teacher}</span><span class="badge">${cov}/${items.length} covered</span></div>`);
        w.document.write(`<table><thead><tr><th>Class</th><th>Period</th><th>Subject</th><th>Substitute</th><th>Status</th></tr></thead><tbody>`);
        items.forEach(a => {
          w.document.write(`<tr><td>${a.className}</td><td>${a.period}</td><td>${a.subject || '-'}</td><td class="${a.substitute ? 'sub-name' : 'pending'}">${a.substitute || 'Not Assigned'}</td><td class="${a.substitute ? '' : 'pending'}">${a.substitute ? '✅' : '⚠ Pending'}</td></tr>`);
        });
        w.document.write(`</tbody></table></div>`);
      });
      w.document.write(`</div>`);
    });

    w.document.write(`<div class="footer"><div class="sign-box"><div class="sign-line">Prepared By</div><div class="sign-name">${classTeacher || 'Coordinator'}</div></div><div class="sign-box"><div class="sign-line">Verified By</div><div class="sign-name">Vice Principal</div></div><div class="sign-box"><div class="sign-line">Approved By</div><div class="sign-name">${principalName || 'Principal'}</div></div></div>`);
    w.document.write(`<div class="watermark">Generated via LDMS Teacher Productivity Hub</div></body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 500);
  }

  const printMonthlySummary = () => {
    const sName = schoolName || 'Unassigned School';
    const schoolTbs = cloudTimetables.filter(tb => (tb.schoolName || 'Unassigned School') === sName).map(tb => {
      if (tb.id === currentTimetableId) return { ...tb, grid, className };
      return tb;
    });
    if (!schoolTbs.find(tb => tb.id === currentTimetableId)) {
      schoolTbs.push({ id: currentTimetableId || 'current', className, grid, schoolName: sName });
    }

    // Gather stats per teacher
    const stats = {};
    teachers.forEach(t => { stats[t] = { leaveDays: 0, leaveDaysList: [], subDuties: 0, subDutiesList: [], totalPeriods: 0, classes: new Set() }; });

    // Count leave days
    getAbsentTeacherNames().forEach(t => {
      if (stats[t]) {
        stats[t].leaveDays = (absentTeachers[t] || []).length;
        stats[t].leaveDaysList = absentTeachers[t] || [];
      }
    });

    // Count sub duties + total periods across all classes
    schoolTbs.forEach(tb => {
      const g = tb.grid || {};
      activeDays.forEach(d => {
        PERIODS.forEach(p => {
          if (p === 'Lunch') return;
          const cell = g[d]?.[p];
          if (!cell) return;
          const processItem = (teacher, substitute) => {
            if (teacher && stats[teacher]) { stats[teacher].totalPeriods++; stats[teacher].classes.add(tb.className); }
            if (substitute && stats[substitute]) { stats[substitute].subDuties++; stats[substitute].subDutiesList.push(`${d.slice(0,3)}-${p} (${tb.className})`); }
          };
          if (cell.isSplit && cell.groups) {
            cell.groups.forEach(gr => processItem(gr.teacher, gr.substitute));
          } else {
            processItem(cell.teacher, cell.substitute);
          }
        });
      });
    });

    const dateStr = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
    const sortedTeachers = Object.entries(stats).sort((a, b) => b[1].leaveDays - a[1].leaveDays || b[1].subDuties - a[1].subDuties);

    const w = window.open('', '_blank');
    w.document.write(`<html><head><title>Monthly Summary Report</title><style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
      body{font-family:'Inter',sans-serif;padding:30px 40px;max-width:950px;margin:0 auto;color:#0f172a}
      .header{text-align:center;border-bottom:3px double #1e293b;padding-bottom:18px;margin-bottom:15px}
      .header h1{margin:0 0 4px;font-size:22px;text-transform:uppercase;letter-spacing:2px;font-weight:800}
      .header h2{margin:0;font-size:15px;font-weight:600;color:#334155}
      .header .meta{font-size:12px;color:#64748b;margin-top:6px}
      .summary-cards{display:flex;justify-content:center;gap:25px;margin:20px 0;padding:15px 0;border-bottom:1px solid #e2e8f0}
      .card{text-align:center;padding:10px 20px;border:1.5px solid #e2e8f0;border-radius:12px}
      .card .num{font-size:28px;font-weight:800}.card .lbl{font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:1px;font-weight:600}
      .card.red .num{color:#dc2626}.card.green .num{color:#16a34a}.card.blue .num{color:#2563eb}
      h3{font-size:16px;font-weight:800;margin:25px 0 10px;border-bottom:2px solid #e2e8f0;padding-bottom:6px}
      table{width:100%;border-collapse:collapse;margin-bottom:20px}
      th,td{padding:9px 14px;text-align:left;border-bottom:1px solid #e2e8f0;font-size:12px}
      th{background:#1e293b;color:white;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:1px}
      tr:nth-child(even){background:#f8fafc}
      .leave{color:#dc2626;font-weight:700}.sub{color:#2563eb;font-weight:700}
      .tag{display:inline-block;padding:1px 6px;border-radius:4px;font-size:9px;font-weight:600;margin:1px}
      .tag-red{background:#fee2e2;color:#991b1b}.tag-blue{background:#dbeafe;color:#1e40af}.tag-green{background:#dcfce7;color:#166534}
      .footer{display:flex;justify-content:space-between;margin-top:40px;padding-top:15px}
      .sign-box{text-align:center;width:180px}.sign-line{border-top:1.5px solid #1e293b;margin-bottom:5px;padding-top:6px;font-weight:700;font-size:12px}.sign-name{font-size:11px;color:#64748b}
      .watermark{text-align:center;font-size:9px;color:#94a3b8;margin-top:15px}
      @media print{body{padding:15px 20px}}
    </style></head><body>`);

    const totalLeaves = sortedTeachers.reduce((s, [,v]) => s + v.leaveDays, 0);
    const totalSubDuties = sortedTeachers.reduce((s, [,v]) => s + v.subDuties, 0);
    const teachersOnLeave = sortedTeachers.filter(([,v]) => v.leaveDays > 0).length;

    w.document.write(`<div class="header"><h1>${sName}</h1><h2>Monthly Staff Summary Report</h2><div class="meta">Generated: ${dateStr}${session ? ` | Session: ${session}` : ''} | Active Days: ${activeDays.map(d => d.slice(0,3)).join(', ')}</div></div>`);

    w.document.write(`<div class="summary-cards">`);
    w.document.write(`<div class="card"><div class="num">${teachers.length}</div><div class="lbl">Total Staff</div></div>`);
    w.document.write(`<div class="card red"><div class="num">${teachersOnLeave}</div><div class="lbl">On Leave</div></div>`);
    w.document.write(`<div class="card"><div class="num">${totalLeaves}</div><div class="lbl">Total Leave Days</div></div>`);
    w.document.write(`<div class="card blue"><div class="num">${totalSubDuties}</div><div class="lbl">Sub Duties Assigned</div></div>`);
    w.document.write(`</div>`);

    // Leave Summary Table
    w.document.write(`<h3>📋 Leave Summary</h3>`);
    w.document.write(`<table><thead><tr><th>#</th><th>Teacher Name</th><th>Leave Days</th><th>Days</th><th>Affected Periods</th></tr></thead><tbody>`);
    sortedTeachers.filter(([,v]) => v.leaveDays > 0).forEach(([name, v], idx) => {
      w.document.write(`<tr><td>${idx + 1}</td><td style="font-weight:700">${name}</td><td class="leave">${v.leaveDays}</td><td>${v.leaveDaysList.map(d => `<span class="tag tag-red">${d.slice(0,3)}</span>`).join(' ')}</td><td>${v.totalPeriods}</td></tr>`);
    });
    if (sortedTeachers.filter(([,v]) => v.leaveDays > 0).length === 0) {
      w.document.write(`<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:20px">No teachers on leave</td></tr>`);
    }
    w.document.write(`</tbody></table>`);

    // Substitute Duty Table
    w.document.write(`<h3>🔄 Substitute Duty Summary</h3>`);
    w.document.write(`<table><thead><tr><th>#</th><th>Teacher Name</th><th>Sub Duties</th><th>Regular Periods</th><th>Total Load</th><th>Details</th></tr></thead><tbody>`);
    sortedTeachers.filter(([,v]) => v.subDuties > 0).sort((a, b) => b[1].subDuties - a[1].subDuties).forEach(([name, v], idx) => {
      const total = v.totalPeriods + v.subDuties;
      w.document.write(`<tr><td>${idx + 1}</td><td style="font-weight:700">${name}</td><td class="sub">${v.subDuties}</td><td>${v.totalPeriods}</td><td style="font-weight:800">${total}</td><td>${v.subDutiesList.slice(0, 5).map(d => `<span class="tag tag-blue">${d}</span>`).join(' ')}${v.subDutiesList.length > 5 ? `<span class="tag tag-blue">+${v.subDutiesList.length - 5} more</span>` : ''}</td></tr>`);
    });
    if (sortedTeachers.filter(([,v]) => v.subDuties > 0).length === 0) {
      w.document.write(`<tr><td colspan="6" style="text-align:center;color:#94a3b8;padding:20px">No substitutes assigned yet</td></tr>`);
    }
    w.document.write(`</tbody></table>`);

    // Full Staff Workload Overview
    w.document.write(`<h3>📊 Full Staff Overview</h3>`);
    w.document.write(`<table><thead><tr><th>#</th><th>Teacher Name</th><th>Classes</th><th>Regular Periods</th><th>Sub Duties</th><th>Leave Days</th><th>Status</th></tr></thead><tbody>`);
    sortedTeachers.forEach(([name, v], idx) => {
      const status = v.leaveDays > 0 ? '<span class="tag tag-red">On Leave</span>' : onBreak.includes(name) ? '<span class="tag" style="background:#fef3c7;color:#92400e">On Break</span>' : '<span class="tag tag-green">Active</span>';
      w.document.write(`<tr><td>${idx + 1}</td><td style="font-weight:700">${name}</td><td>${[...v.classes].join(', ') || '-'}</td><td>${v.totalPeriods}</td><td class="sub">${v.subDuties}</td><td class="leave">${v.leaveDays}</td><td>${status}</td></tr>`);
    });
    w.document.write(`</tbody></table>`);

    w.document.write(`<div class="footer"><div class="sign-box"><div class="sign-line">Prepared By</div><div class="sign-name">${classTeacher || 'Coordinator'}</div></div><div class="sign-box"><div class="sign-line">Verified By</div><div class="sign-name">Vice Principal</div></div><div class="sign-box"><div class="sign-line">Approved By</div><div class="sign-name">${principalName || 'Principal'}</div></div></div>`);
    w.document.write(`<div class="watermark">Generated via LDMS Teacher Productivity Hub</div></body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 500);
  }

  const handleOpenTeacherView = async () => {
    if (!currentUser) return alert('Please login to use Teacher View.')
    await loadTimetables()
    setIsTeacherModalOpen(true)
    setSelectedTeacherForView('')
    setTeacherViewGrid({})
  }

  const generateTeacherGrid = (teacherName) => {
    if (!teacherName) return
    const g = {}
    ALL_DAYS.forEach(d => { g[d] = {}; PERIODS.forEach(p => { g[d][p] = [] }) })
    
    const allTbs = [...cloudTimetables]
    const localTbIndex = allTbs.findIndex(t => t.id === currentTimetableId)
    const localTb = {
      id: currentTimetableId || 'local_unsaved',
      className: className || 'Unnamed Class',
      schoolName,
      grid,
      activeDays
    }
    if (localTbIndex >= 0) {
      allTbs[localTbIndex] = localTb
    } else {
      allTbs.push(localTb)
    }

    allTbs.forEach(tb => {
      const activeDs = tb.activeDays || ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
      activeDs.forEach(d => {
        PERIODS.forEach(p => {
          const cell = tb.grid?.[d]?.[p]
          if (cell && cell.teacher && cell.teacher.trim() === teacherName.trim()) {
            g[d][p].push({
              className: tb.className || 'Unnamed Class',
              subject: cell.subject,
              schoolName: tb.schoolName
            })
          }
        })
      })
    })
    setTeacherViewGrid(g)
  }

  useEffect(() => {
    if (selectedTeacherForView) generateTeacherGrid(selectedTeacherForView)
  }, [selectedTeacherForView, cloudTimetables, grid])

  const handleShareWhatsApp = () => {
    if (!selectedTeacherForView) return
    let text = `📅 *Timetable for ${selectedTeacherForView}*\n\n`
    ALL_DAYS.forEach(d => {
      let dayHasPeriods = false
      let dayText = `*${d}*\n`
      PERIODS.forEach(p => {
        const assignments = teacherViewGrid[d]?.[p] || []
        if (assignments.length > 0) {
          dayHasPeriods = true
          assignments.forEach(a => {
            dayText += `- ${p}: ${a.className} (${a.subject})\n`
          })
        }
      })
      if (dayHasPeriods) text += dayText + '\n'
    })
    text += `\n_Shared via LDMS Productivity Hub_`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  const executeTeacherPrint = () => {
    if (!selectedTeacherForView) return
    const w = window.open('', '_blank')
    w.document.write(`<html><head><title>Teacher Timetable - ${selectedTeacherForView}</title><style>body{font-family:Inter,sans-serif;padding:30px;max-width:1000px;margin:0 auto}table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:40px}th,td{border:1px solid #cbd5e1;padding:10px;text-align:center}th{background:#1e293b;color:white;font-weight:bold}.clash{background:#fee2e2;color:#991b1b;border:2px solid #ef4444}.header{text-align:center;margin-bottom:30px;border-bottom:2px solid #e2e8f0;padding-bottom:20px}.header h1{margin:0 0 10px 0;font-size:28px;color:#0f172a}.header p{margin:0 0 5px 0;color:#475569;font-size:16px}.footer{display:flex;justify-content:space-between;margin-top:60px;padding-top:20px}.sign-box{text-align:center;width:200px}.sign-line{border-top:1px solid #475569;margin-bottom:8px;padding-top:6px;font-weight:bold;font-size:14px;color:#0f172a}.sign-name{font-size:14px;color:#475569}</style></head><body>`)
    
    w.document.write(`<div class="header">`)
    w.document.write(`<h1>${schoolName ? schoolName : 'School Timetable'}</h1>`)
    w.document.write(`<p><strong>Teacher:</strong> ${selectedTeacherForView} ${session ? `&nbsp;|&nbsp; <strong>Session:</strong> ${session}` : ''}</p>`)
    w.document.write(`</div>`)
    
    w.document.write(`<table><thead><tr><th>Period</th>`)
    ALL_DAYS.forEach(d => w.document.write(`<th>${d}</th>`))
    w.document.write(`</tr></thead><tbody>`)
    PERIODS.forEach(p => {
      const timing = bellTimings[p] ? `<br><span style="font-size:10px;font-weight:normal;color:#475569">${bellTimings[p].start} - ${bellTimings[p].end}</span>` : ''
      w.document.write(`<tr><td><strong>${p}</strong>${timing}</td>`)
      ALL_DAYS.forEach(d => {
        const assignments = teacherViewGrid[d]?.[p] || []
        if (assignments.length === 0) {
          w.document.write(`<td>-</td>`)
        } else {
          const isClash = assignments.length > 1
          w.document.write(`<td class="${isClash ? 'clash' : ''}">`)
          assignments.forEach((a, i) => {
            if (i > 0) w.document.write(`<hr style="margin:4px 0; border:0; border-top:1px solid ${isClash ? '#fca5a5' : '#cbd5e1'}">`)
            w.document.write(`<strong>${a.className}</strong><br><small>${a.subject || 'No Subject'}</small>`)
          })
          w.document.write(`</td>`)
        }
      })
      w.document.write(`</tr>`)
    })
    w.document.write(`</tbody></table>`)
    
    w.document.write(`<div class="footer">`)
    w.document.write(`<div class="sign-box"><div class="sign-line">Teacher's Signature</div><div class="sign-name">${selectedTeacherForView}</div></div>`)
    w.document.write(`<div class="sign-box"><div class="sign-line">Principal</div><div class="sign-name">${principalName || '_________________'}</div></div>`)
    w.document.write(`</div>`)
    
    w.document.write(`</body></html>`)
    w.document.close()
    setTimeout(() => w.print(), 500)
  }

  const handleLoadTimetable = (tb) => {
    setSchoolName(tb.schoolName || '')
    setClassName(tb.className || '')
    setDetails(tb.details || '')
    setGrid(tb.grid || {})
    setTeachers(tb.teachers || DEFAULT_TEACHERS)
    setAbsentTeachers(Array.isArray(tb.absentTeachers) ? {} : (tb.absentTeachers || {}))
    setOnBreak(tb.onBreak || [])
    setSubjects(tb.subjects || DEFAULT_SUBJECTS)
    setRooms(tb.rooms || ['Chemistry Lab', 'Computer Lab', 'Library', 'AV Room'])
    setSubjectColors(tb.subjectColors || {})
    setActiveDays(tb.activeDays || ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'])
    setTeacherSubjects(tb.teacherSubjects || {})
    setTeacherConstraints(tb.teacherConstraints || {})
    if (tb.bellTimings) setBellTimings(tb.bellTimings)
    setCurrentTimetableId(tb.id)
    setIsCloudModalOpen(false)
  }

  const handleDuplicateTimetable = (tb) => {
    const newName = prompt('Enter a new Class Name for the duplicate timetable:', tb.className ? `${tb.className} (Copy)` : 'Copy of Timetable')
    if (!newName) return
    
    setSchoolName(tb.schoolName || '')
    setClassName(newName)
    setDetails(tb.details || '')
    setSession(tb.session || '')
    setClassTeacher(tb.classTeacher || '')
    setPrincipalName(tb.principalName || '')
    if (tb.grid) setGrid(JSON.parse(JSON.stringify(tb.grid)))
    if (tb.teachers) setTeachers([...tb.teachers])
    if (tb.absentTeachers) setAbsentTeachers(Array.isArray(tb.absentTeachers) ? {} : JSON.parse(JSON.stringify(tb.absentTeachers)))
    if (tb.onBreak) setOnBreak([...tb.onBreak])
    if (tb.subjects) setSubjects([...tb.subjects])
    if (tb.activeDays) setActiveDays([...tb.activeDays])
    if (tb.teacherConstraints) setTeacherConstraints(JSON.parse(JSON.stringify(tb.teacherConstraints)))
    setCurrentTimetableId(null) // force create new on save
    setIsCloudModalOpen(false)
    alert(`Timetable duplicated as "${newName}". You are now editing the unsaved duplicate.`)
  }

  const handleLoadDemoSchool = async () => {
    if (!currentUser) return alert('Please login to load demo data.');
    if (!confirm('This will add pre-filled demo classes from Nursery to Class 12 to your My Timetables. Continue?')) return;
    
    setIsSaving(true);
    try {
      const demoClasses = ['Nursery', 'LKG', 'UKG', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'];
      
      const teacherNames = [
        'Mr. Sharma', 'Ms. Gupta', 'Mr. Patel', 'Ms. Singh', 'Mr. Kumar',
        'Ms. Joshi', 'Mr. Verma', 'Ms. Rao', 'Mr. Khan', 'Ms. Mehta',
        'Mr. Reddy', 'Ms. Nair', 'Mr. Das', 'Ms. Bose', 'Mr. Iyer',
        'Ms. Menon', 'Mr. Kapoor', 'Ms. Sen', 'Mr. Chawla', 'Ms. Dixit',
        'Mr. Yadav', 'Ms. Jain', 'Mr. Ahuja', 'Ms. Bhatia', 'Mr. Chopra',
        'Mr. Bansal', 'Ms. Agarwal', 'Mr. Kadam', 'Ms. Desai', 'Mr. Ghosh'
      ];

      const teachersByLevel = {
        'Nursery': teacherNames.slice(0, 6),
        'Primary': teacherNames.slice(6, 16),
        'Middle': teacherNames.slice(16, 24),
        'Senior': teacherNames.slice(24, 30)
      };

      const coreSubjectsByLevel = {
        'Nursery': ['Rhymes', 'Play', 'Story Time', 'Number Work'],
        'Primary': ['Mathematics', 'English', 'Hindi', 'EVS', 'Moral Science'],
        'Middle':  ['Mathematics', 'Science', 'English', 'Hindi', 'Social Studies', 'Computer'],
        'Senior':  ['Mathematics', 'Physics', 'Chemistry', 'English', 'Biology']
      };

      const minorSubjectsByLevel = {
        'Nursery': [{s1: 'Art & Craft', s2: 'Games'}],
        'Primary': [{s1: 'Computer', s2: 'Art'}, {s1: 'Games', s2: 'Library'}],
        'Middle':  [{s1: 'Sanskrit', s2: 'Art'}, {s1: 'P.E.', s2: 'Library'}],
        'Senior':  [{s1: 'Computer Science', s2: 'P.E.'}, {s1: 'Library', s2: 'Revision'}]
      };

      const teacherSchedule = {};
      ALL_DAYS.forEach(d => {
        teacherSchedule[d] = {};
        PERIODS.forEach(p => {
          teacherSchedule[d][p] = new Set();
        });
      });

      let teacherCursor = { 'Nursery': 0, 'Primary': 0, 'Middle': 0, 'Senior': 0 };

      for (const cls of demoClasses) {
        let level = 'Primary';
        if (['Nursery', 'LKG', 'UKG'].includes(cls)) level = 'Nursery';
        else if (['Class 6', 'Class 7', 'Class 8'].includes(cls)) level = 'Middle';
        else if (['Class 9', 'Class 10', 'Class 11', 'Class 12'].includes(cls)) level = 'Senior';

        const cores = [...coreSubjectsByLevel[level]];
        const minors = [...minorSubjectsByLevel[level]];
        const levelTeachers = teachersByLevel[level];
        
        const classTemplate = []; 
        let availablePeriods = [0, 1, 2, 3, 5, 6, 7, 8]; 
        if (level === 'Nursery') availablePeriods = [0, 1, 2, 3, 5]; 

        cores.forEach(subj => {
           if(availablePeriods.length > 0) {
             classTemplate[availablePeriods.shift()] = { type: 'core', subj };
           }
        });

        minors.forEach(pair => {
           if(availablePeriods.length > 0) {
             classTemplate[availablePeriods.shift()] = { type: 'split', s1: pair.s1, s2: pair.s2 };
           }
        });

        availablePeriods.forEach(pIdx => {
           classTemplate[pIdx] = { type: 'core', subj: 'Library' };
        });

        const demoGrid = {};
        ALL_DAYS.forEach(d => { demoGrid[d] = {}; });
        
        PERIODS.forEach((p, pIdx) => {
          if (p === 'Lunch') {
             ALL_DAYS.forEach(d => { demoGrid[d][p] = { subject: 'Lunch', teacher: '', substitute: '', room: '' }; });
             return;
          }
          
          if (!classTemplate[pIdx]) {
             ALL_DAYS.forEach(d => { demoGrid[d][p] = { subject: 'Free Period', teacher: '', substitute: '', room: '' }; });
             return;
          }
          
          const slot = classTemplate[pIdx];
          const roomName = 'Room ' + (101 + demoClasses.indexOf(cls));

          if (slot.type === 'core') {
             let assignedT = '';
             for(let i=0; i<levelTeachers.length; i++) {
                const t = levelTeachers[(teacherCursor[level] + i) % levelTeachers.length];
                if (ALL_DAYS.every(d => !teacherSchedule[d][p].has(t))) {
                   assignedT = t;
                   ALL_DAYS.forEach(d => teacherSchedule[d][p].add(t));
                   teacherCursor[level] = (teacherCursor[level] + i + 1) % levelTeachers.length;
                   break;
                }
             }
             ALL_DAYS.forEach(d => {
               demoGrid[d][p] = { subject: slot.subj, teacher: assignedT || levelTeachers[0], substitute: '', room: roomName };
             });
             
          } else if (slot.type === 'split') {
             const days1 = ALL_DAYS.slice(0, 3);
             const days2 = ALL_DAYS.slice(3, 6);
             let t1 = '', t2 = '';
             
             for(let i=0; i<levelTeachers.length; i++) {
                const t = levelTeachers[(teacherCursor[level] + i) % levelTeachers.length];
                if (!t1 && days1.every(d => !teacherSchedule[d][p].has(t))) {
                   t1 = t; days1.forEach(d => teacherSchedule[d][p].add(t));
                } else if (t1 && !t2 && days2.every(d => !teacherSchedule[d][p].has(t))) {
                   t2 = t; days2.forEach(d => teacherSchedule[d][p].add(t));
                }
                if(t1 && t2) {
                   teacherCursor[level] = (teacherCursor[level] + i + 1) % levelTeachers.length;
                   break;
                }
             }

             days1.forEach(d => { demoGrid[d][p] = { subject: slot.s1, teacher: t1 || levelTeachers[0], substitute: '', room: roomName }; });
             days2.forEach(d => { demoGrid[d][p] = { subject: slot.s2, teacher: t2 || levelTeachers[1] || levelTeachers[0], substitute: '', room: roomName }; });
          }
        });
        
        const timetableData = {
          userId: currentUser.uid,
          schoolName: 'Demo High School',
          className: cls,
          details: 'Demo timetable generated automatically',
          grid: demoGrid,
          teachers: teacherNames,
          absentTeachers: {},
          onBreak: [],
          subjects: Array.from(new Set([...DEFAULT_SUBJECTS, 'Rhymes', 'Play', 'Art & Craft', 'Story Time', 'Number Work', 'Moral Science', 'Revision'])),
          rooms: ['Chemistry Lab', 'Computer Lab', 'Library', 'AV Room', ...demoClasses.map((_, i) => 'Room ' + (101 + i))],
          subjectColors: {},
          activeDays: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
          teacherSubjects: {},
          teacherConstraints: {},
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        await addDoc(collection(db, 'timetables'), timetableData);
      }
      alert('Demo school generated successfully! You can now load these classes.');
      await loadTimetables();
    } catch (err) {
      console.error('Error generating demo data:', err);
      alert('Failed to generate demo data.');
    } finally {
      setIsSaving(false);
    }
  }

  const executeSchoolPrint = (sName) => {
    const schoolTimetables = cloudTimetables.filter(tb => (tb.schoolName || 'Unassigned School') === sName);
    if (schoolTimetables.length === 0) return;
    
    const w = window.open('', '_blank')
    w.document.write(`<html><head><title>Full School Timetable - ${sName}</title><style>
      body{font-family:Inter,sans-serif;padding:30px;max-width:1000px;margin:0 auto}
      table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:40px}
      th,td{border:1px solid #cbd5e1;padding:10px;text-align:center}
      th{background:#1e293b;color:white;font-weight:bold}
      .sub{color:#dc2626;font-style:italic;display:block;margin-top:4px}
      .absent{text-decoration:line-through;color:#94a3b8}
      .header{text-align:center;margin-bottom:30px;border-bottom:2px solid #e2e8f0;padding-bottom:20px}
      .header h1{margin:0 0 10px 0;font-size:28px;color:#0f172a}
      .header p{margin:0 0 5px 0;color:#475569;font-size:16px}
      .page-break { page-break-after: always; margin-bottom: 50px; }
    </style></head><body>`)
    
    schoolTimetables.forEach((tb, index) => {
      w.document.write(`<div class="${index < schoolTimetables.length - 1 ? 'page-break' : ''}">`);
      w.document.write(`<div class="header">`)
      w.document.write(`<h1>${tb.schoolName ? tb.schoolName : 'School Timetable'}</h1>`)
      w.document.write(`<p><strong>Class:</strong> ${tb.className || 'Unnamed Class'}</p>`)
      if (tb.details) w.document.write(`<p style="font-style:italic;font-size:14px;margin-top:10px">${tb.details}</p>`)
      w.document.write(`</div>`)
      
      w.document.write(`<table><thead><tr><th>Period</th>`)
      const tDays = tb.activeDays || ALL_DAYS
      tDays.forEach(d => w.document.write(`<th>${d}</th>`))
      w.document.write(`</tr></thead><tbody>`)
      
      PERIODS.forEach(p => {
        w.document.write(`<tr><td><strong>${p}</strong></td>`)
        tDays.forEach(d => {
          const c = tb.grid?.[d]?.[p] || {}
          let html = '';
          if (c.isSplit && c.groups) {
            html += `<div style="display:flex; flex-direction:column; gap:4px;">`
            c.groups.forEach((g, idx) => {
              if (idx > 0) html += `<hr style="margin:2px 0; border:0; border-top:1px dashed #cbd5e1">`
              const isAbsent = g.teacher && isAbsentOnDay(g.teacher, d)
              html += `<div>`
              html += `<div style="font-size:10px; color:#64748b; font-weight:bold; text-transform:uppercase;">${g.groupName || ''}</div>`
              html += g.subject ? `<div style="font-size:12px; font-weight:bold; margin-bottom:2px;">${g.subject}</div>` : '-'
              if (g.teacher) html += `<div class="${isAbsent ? 'absent' : ''}" style="font-size:11px; font-weight:600; color:#334155;">${g.teacher}</div>`
              if (g.substitute) html += `<div class="sub">Sub: ${g.substitute}</div>`
              if (g.room) html += `<div style="font-size:10px; color:#64748b; margin-top:2px;">${g.room}</div>`
              html += `</div>`
            })
            html += `</div>`
          } else {
            const isAbsent = c.teacher && isAbsentOnDay(c.teacher, d)
            html = c.subject ? `<div style="font-size:14px; font-weight:bold; margin-bottom:2px;">${c.subject}</div>` : '-'
            if (c.teacher) html += `<div class="${isAbsent ? 'absent' : ''}" style="font-size:12px; font-weight:600; color:#334155;">${c.teacher}</div>`
            if (c.substitute) html += `<div class="sub">Sub: ${c.substitute}</div>`
            if (c.room) html += `<div style="font-size:11px; color:#64748b; margin-top:3px;">${c.room}</div>`
          }
          w.document.write(`<td>${html}</td>`)
        })
        w.document.write(`</tr>`)
      })
      w.document.write(`</tbody></table></div>`)
    })
    
    w.document.write('</body></html>')
    w.document.close()
    setTimeout(() => { w.print() }, 500)
  }

  const handleDeleteSchool = async (sName) => {
    if (!window.confirm(`Are you sure you want to permanently delete the ENTIRE school "${sName}" and all its classes? This cannot be undone.`)) return;
    try {
      const schoolTimetables = cloudTimetables.filter(tb => (tb.schoolName || 'Unassigned School') === sName);
      const batch = writeBatch(db);
      schoolTimetables.forEach(tb => {
        batch.delete(doc(db, 'timetables', tb.id));
      });
      await batch.commit();
      
      setCloudTimetables(prev => prev.filter(t => (t.schoolName || 'Unassigned School') !== sName));
      
      // If current timetable was part of this school, reset it
      if (schoolTimetables.some(tb => tb.id === currentTimetableId)) {
        setCurrentTimetableId(null)
        const g = {}
        ALL_DAYS.forEach(d => { g[d] = {}; PERIODS.forEach(p => { g[d][p] = { subject: p === 'Lunch' ? 'Lunch' : '', teacher: '', substitute: '', room: '' } }) })
        setGrid(g)
        setClassName('New Class')
      }
      alert('Entire school deleted successfully.');
    } catch (err) {
      console.error('Delete school error:', err);
      alert('Failed to delete school.');
    }
  }

  const handleDeleteTimetable = async (tb) => {
    if (!window.confirm(`Delete timetable "${tb.className || 'Unnamed'}" permanently? This cannot be undone.`)) return
    try {
      await deleteDoc(doc(db, 'timetables', tb.id))
      setCloudTimetables(prev => prev.filter(t => t.id !== tb.id))
      if (currentTimetableId === tb.id) {
        setCurrentTimetableId(null)
        const g = {}
        ALL_DAYS.forEach(d => { g[d] = {}; PERIODS.forEach(p => { g[d][p] = { subject: p === 'Lunch' ? 'Lunch' : '', teacher: '', substitute: '', room: '' } }) })
        setGrid(g)
        setClassName('New Class')
      }
    } catch (err) {
      console.error('Delete timetable error:', err)
      alert('Failed to delete timetable.')
    }
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

  const getCellAssignments = (cell) => {
    if (!cell) return []
    if (cell.isSplit && cell.groups && cell.groups.length > 0) return cell.groups
    if (cell.subject || cell.teacher || cell.room) return [cell]
    return []
  }

  const checkClash = (teacher, day, period, skipGroupId = null) => {
    if (!teacher) return false
    const clashes = []
    cloudTimetables.forEach(tb => {
      if (tb.id === currentTimetableId) return // skip current
      const cell = tb.grid?.[day]?.[period]
      const assignments = getCellAssignments(cell)
      assignments.forEach(a => {
        if (a.teacher === teacher) {
          clashes.push((tb.className || 'Unnamed Class') + (a.groupName ? ` (${a.groupName})` : ''))
        }
      })
    })
    // Check current timetable too
    const currentCell = grid[day]?.[period]
    const currentAssignments = getCellAssignments(currentCell)
    currentAssignments.forEach(a => {
      if (a.id === skipGroupId) return
      if (a.teacher === teacher) {
        clashes.push(`Current Class (${a.groupName || 'Primary'})`)
      }
    })
    return clashes.length > 0 ? clashes : false
  }

  const setCell = (day, period, subject, groupId = null) => {
    const matchingTeachers = teachers.filter(t => (teacherSubjects[t] || []).includes(subject))
    let autoTeacher = ''
    if (matchingTeachers.length === 1 && subject !== '') {
      autoTeacher = matchingTeachers[0]
      const clashes = checkClash(autoTeacher, day, period, groupId)
      if (clashes) {
        if (!confirm(`⚠️ CLASH DETECTED:\n${autoTeacher} (auto-assigned for ${subject}) is already teaching ${clashes.join(', ')} during ${day} - ${period}.\n\nDo you still want to assign them?`)) {
          autoTeacher = ''
        }
      }
    }
    
    setGrid(p => {
      const next = JSON.parse(JSON.stringify(p))
      const cell = next[day][period]
      if (groupId && cell.isSplit) {
        const group = cell.groups.find(g => g.id === groupId)
        if (group) { group.subject = subject; group.teacher = autoTeacher; }
      } else {
        cell.subject = subject; cell.teacher = autoTeacher;
      }
      return next
    })

    if (autoTeacher) {
      if (!groupId) { setEditing(null); setShowAllTeachers(false); }
    } else {
      if (subject === '') {
        if (!groupId) { setEditing(null); setShowAllTeachers(false); }
      } else {
        if (!groupId) setEditing(`${day}-${period}`)
        setShowAllTeachers(false)
      }
    }
  }

  const setCellTeacher = (day, period, teacher, groupId = null) => {
    const clashes = checkClash(teacher, day, period, groupId)
    if (clashes) {
      if (!confirm(`⚠️ CLASH DETECTED:\n${teacher} is already teaching ${clashes.join(', ')} during ${day} - ${period}.\n\nDo you still want to assign them?`)) {
        return
      }
    }
    setGrid(p => {
      const next = JSON.parse(JSON.stringify(p))
      const cell = next[day][period]
      if (groupId && cell.isSplit) {
        const group = cell.groups.find(g => g.id === groupId)
        if (group) group.teacher = teacher
      } else {
        cell.teacher = teacher
      }
      return next
    })
    if (!groupId) setEditing(null)
  }
  const setSubstitute = (day, period, sub, groupId = null) => {
    setGrid(p => {
      const next = JSON.parse(JSON.stringify(p))
      const cell = next[day][period]
      if (groupId && cell.isSplit) {
        const group = cell.groups.find(g => g.id === groupId)
        if (group) group.substitute = sub
      } else {
        cell.substitute = sub
      }
      return next
    })
    setSubModal(null)
  }

  const setRoom = (day, period, room, groupId = null) => {
    setGrid(p => {
      const next = JSON.parse(JSON.stringify(p))
      const cell = next[day][period]
      if (groupId && cell.isSplit) {
        const group = cell.groups.find(g => g.id === groupId)
        if (group) group.room = room
      } else {
        cell.room = room
      }
      return next
    })
  }

  const getFreeTeachers = (day, period) => {
    const busy = new Set()
    
    // 1. Current grid busy
    ALL_DAYS.forEach(d => {
      PERIODS.forEach(p => {
        if (d !== day || p !== period) return; // wait, if we are checking day and period, we only care about that specific slot
        const c = grid[d]?.[p]
        if (!c) return
        if (c.isSplit && c.groups) c.groups.forEach(g => g.teacher && busy.add(g.teacher))
        else if (c.teacher) busy.add(c.teacher)
      })
    })

    // 2. Other classes busy
    cloudTimetables.forEach(tb => {
      if (tb.id === currentTimetableId || tb.className === className) return
      const oc = tb.grid?.[day]?.[period]
      if (oc) {
        if (oc.isSplit && oc.groups) oc.groups.forEach(g => g.teacher && busy.add(g.teacher))
        else if (oc.teacher) busy.add(oc.teacher)
      }
    })

    return [...teachers].filter(t => !busy.has(t) && !isAbsentOnDay(t, day) && !onBreak.includes(t))
  }

  const toggleLock = (e, day, period) => {
    e.stopPropagation()
    setGrid(p => {
      const next = JSON.parse(JSON.stringify(p))
      next[day][period].isLocked = !next[day][period].isLocked
      return next
    })
  }

  const splitCell = (day, period) => {
    setGrid(p => {
      const next = JSON.parse(JSON.stringify(p))
      const cell = next[day][period]
      cell.isSplit = true
      cell.groups = [
        { id: Date.now().toString(), groupName: 'Boys', subject: cell.subject, teacher: cell.teacher, substitute: cell.substitute, room: cell.room },
        { id: (Date.now()+1).toString(), groupName: 'Girls', subject: '', teacher: '', substitute: '', room: '' }
      ]
      cell.subject = ''; cell.teacher = ''; cell.room = ''; cell.substitute = '';
      return next
    })
  }

  const mergeCell = (day, period) => {
    if (!confirm('Merge this split period? All group data will be lost except for the first group.')) return
    setGrid(p => {
      const next = JSON.parse(JSON.stringify(p))
      const cell = next[day][period]
      cell.isSplit = false
      if (cell.groups && cell.groups.length > 0) {
        cell.subject = cell.groups[0].subject
        cell.teacher = cell.groups[0].teacher
        cell.substitute = cell.groups[0].substitute
        cell.room = cell.groups[0].room
      }
      cell.groups = []
      return next
    })
  }

  const addGroup = (day, period) => {
    setGrid(p => {
      const next = JSON.parse(JSON.stringify(p))
      next[day][period].groups.push({ id: Date.now().toString(), groupName: 'New Group', subject: '', teacher: '', substitute: '', room: '' })
      return next
    })
  }

  const removeGroup = (day, period, groupId) => {
    setGrid(p => {
      const next = JSON.parse(JSON.stringify(p))
      next[day][period].groups = next[day][period].groups.filter(g => g.id !== groupId)
      if (next[day][period].groups.length === 1) {
        // auto merge if only 1 left
        const last = next[day][period].groups[0]
        next[day][period].isSplit = false
        next[day][period].subject = last.subject
        next[day][period].teacher = last.teacher
        next[day][period].substitute = last.substitute
        next[day][period].room = last.room
        next[day][period].groups = []
      }
      return next
    })
  }

  const updateGroupName = (day, period, groupId, name) => {
    setGrid(p => {
      const next = JSON.parse(JSON.stringify(p))
      const g = next[day][period].groups.find(x => x.id === groupId)
      if (g) g.groupName = name
      return next
    })
  }

  const notifySub = (subName, day, period, subject, absentTeacher) => {
    const text = `Hi ${subName}, you have been assigned as a substitute teacher for *${className}* on *${day}* for *${period}*.\n\n*Subject:* ${subject || 'Not specified'}\n*In place of:* ${absentTeacher}\n\nPlease check your schedule.`
    const phone = teacherContacts[subName] ? teacherContacts[subName].replace(/[^0-9]/g, '') : ''
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank')
  }

  const toggleAbsentDay = (teacher, day) => {
    setAbsentTeachers(prev => {
      const next = { ...prev }
      const days = next[teacher] || []
      if (days.includes(day)) {
        const newDays = days.filter(d => d !== day)
        if (newDays.length === 0) delete next[teacher]
        else next[teacher] = newDays
        // Clear subs for this teacher on this day only
        setGrid(prevGrid => {
          const nextGrid = JSON.parse(JSON.stringify(prevGrid))
          PERIODS.forEach(p => {
            const cell = nextGrid[day]?.[p]
            if (!cell) return
            if (cell.isSplit && cell.groups) {
              cell.groups.forEach(g => { if (g.teacher === teacher && g.substitute) g.substitute = '' })
            } else {
              if (cell.teacher === teacher && cell.substitute) cell.substitute = ''
            }
          })
          return nextGrid
        })
      } else {
        next[teacher] = [...days, day]
      }
      return next
    })
  }

  const toggleAbsent = (t) => {
    if (isAbsentAnyDay(t)) {
      // Remove from all days, clear all subs
      setGrid(prev => {
        const next = JSON.parse(JSON.stringify(prev));
        ALL_DAYS.forEach(d => {
          PERIODS.forEach(p => {
            const cell = next[d]?.[p];
            if (!cell) return;
            if (cell.isSplit && cell.groups) {
              cell.groups.forEach(g => { if (g.teacher === t && g.substitute) g.substitute = ''; });
            } else {
              if (cell.teacher === t && cell.substitute) cell.substitute = '';
            }
          });
        });
        return next;
      });
      setAbsentTeachers(prev => { const next = { ...prev }; delete next[t]; return next });
    } else {
      // Mark absent for today only
      const todayName = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date().getDay()];
      const absentDay = activeDays.includes(todayName) ? todayName : activeDays[0];
      setAbsentTeachers(prev => ({ ...prev, [t]: [absentDay] }))
    }
  }
  const toggleBreak = (t) => setOnBreak(b => b.includes(t) ? b.filter(x => x !== t) : [...b, t])
  const addTeacher = () => { if (newTeacher.trim() && !teachers.includes(newTeacher.trim())) { setTeachers(t => [...t, newTeacher.trim()]); setNewTeacher('') } }
  const handleRenameTeacher = (oldName, newName) => {
    if (!newName.trim() || newName.trim() === oldName || teachers.includes(newName.trim())) {
      setEditingTeacherName(null);
      return;
    }
    const finalName = newName.trim();
    setTeachers(ts => ts.map(t => t === oldName ? finalName : t));
    setAbsentTeachers(prev => { const next = { ...prev }; if (next[oldName]) { next[finalName] = next[oldName]; delete next[oldName]; } return next });
    setOnBreak(b => b.map(t => t === oldName ? finalName : t));
    setTeacherSubjects(ts => {
      const n = {...ts};
      if (n[oldName]) {
        n[finalName] = n[oldName];
        delete n[oldName];
      }
      return n;
    });
    setTeacherConstraints(tc => {
      const n = {...tc};
      if (n[oldName]) {
        n[finalName] = n[oldName];
        delete n[oldName];
      }
      return n;
    });
    if (classTeacher === oldName) setClassTeacher(finalName);
    setGrid(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      Object.keys(next).forEach(day => {
        Object.keys(next[day]).forEach(period => {
          if (next[day][period].teacher === oldName) next[day][period].teacher = finalName;
          if (next[day][period].substitute === oldName) next[day][period].substitute = finalName;
        });
      });
      return next;
    });
    setEditingTeacherName(null);
  }

  const removeTeacher = (t) => {
    if (!confirm(`Remove ${t} entirely? This clears them from the timetable.`)) return;
    setTeachers(ts => ts.filter(x => x !== t));
    setAbsentTeachers(prev => { const next = { ...prev }; delete next[t]; return next });
    setOnBreak(b => b.filter(x => x !== t));
    setTeacherSubjects(ts => { const n = {...ts}; delete n[t]; return n });
    setGrid(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      Object.keys(next).forEach(day => {
        Object.keys(next[day]).forEach(period => {
          if (next[day][period].teacher === t) next[day][period].teacher = '';
          if (next[day][period].substitute === t) next[day][period].substitute = '';
        });
      });
      return next;
    });
  }
  const addSubject = () => { if (newSubject.trim() && !subjects.includes(newSubject.trim())) { setSubjects(s => [...s, newSubject.trim()]); setNewSubject('') } }
  const removeSubject = (s) => setSubjects(ss => ss.filter(x => x !== s))
  const addRoom = () => { if (newRoom.trim() && !rooms.includes(newRoom.trim())) { setRooms(r => [...r, newRoom.trim()]); setNewRoom('') } }
  const removeRoom = (r) => setRooms(rs => rs.filter(x => x !== r))
  const toggleDay = (d) => { if (activeDays.includes(d)) { if (activeDays.length > 1) setActiveDays(a => a.filter(x => x !== d)) } else { setActiveDays(a => [...ALL_DAYS.filter(x => a.includes(x) || x === d)]) } }
  const toggleTeacherSubject = (teacher, subj) => {
    setTeacherSubjects(ts => {
      const current = ts[teacher] || []
      return { ...ts, [teacher]: current.includes(subj) ? current.filter(x => x !== subj) : [...current, subj] }
    })
  }

  // Find available teachers (not absent on given day, not on break)
  const getAvailable = (day) => teachers.filter(t => {
    if (day) return !isAbsentOnDay(t, day) && !onBreak.includes(t)
    return !isAbsentAnyDay(t) && !onBreak.includes(t)
  })

  // Smart auto-assign: day-specific, strict grouping, split-group aware
  const autoAssignSubs = () => {
    try {
      const todayName = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date().getDay()];
      const daysToProcess = subAssignDay === 'Today' ? (activeDays.includes(todayName) ? [todayName] : [activeDays[0]]) : subAssignDay === 'All' ? activeDays : [subAssignDay];

      const teacherGroups = {};
      (allTeachersList || []).forEach(t => teacherGroups[t] = new Set());
      const processGrid = (g, cName) => {
        const grp = getGroupForClass(cName);
        if (grp === 0 || !g) return;
        ALL_DAYS.forEach(d => {
          PERIODS.forEach(p => {
            const cell = g[d]?.[p];
            if (!cell) return;
            if (cell.isSplit && cell.groups) {
              cell.groups.forEach(splitG => { if (splitG.teacher && teacherGroups[splitG.teacher]) teacherGroups[splitG.teacher].add(grp); })
            } else {
              if (cell.teacher && teacherGroups[cell.teacher]) teacherGroups[cell.teacher].add(grp);
            }
          });
        });
      };
      (cloudTimetables || []).forEach(tb => { if (tb.id !== currentTimetableId) processGrid(tb.grid, tb.className); });
      processGrid(grid, className);
      const currentClassGroup = getGroupForClass(className);

      const teachersInCurrentClass = new Set();
      ALL_DAYS.forEach(d => {
        PERIODS.forEach(p => {
          const cell = grid[d]?.[p];
          if (!cell) return;
          if (cell.isSplit && cell.groups) {
            cell.groups.forEach(splitG => { if (splitG.teacher) teachersInCurrentClass.add(splitG.teacher); });
          } else {
            if (cell.teacher) teachersInCurrentClass.add(cell.teacher);
          }
        });
      });

      const available = getAvailable() || [];
      const newGrid = JSON.parse(JSON.stringify(grid));
      const subCount = {};
      available.forEach(t => { subCount[t] = 0; });

      const getBusySchoolWide = (day, period) => {
        const busy = new Set();
        const checkG = (g) => {
          if (!g) return;
          const cell = g[day]?.[period];
          if (!cell) return;
          if (cell.isSplit && cell.groups) {
            cell.groups.forEach(gr => { if (gr.teacher) busy.add(gr.teacher); if (gr.substitute) busy.add(gr.substitute); });
          } else {
            if (cell.teacher) busy.add(cell.teacher);
            if (cell.substitute) busy.add(cell.substitute);
          }
        };
        (cloudTimetables || []).forEach(tb => { if (tb.id !== currentTimetableId) checkG(tb.grid); });
        checkG(newGrid);
        return Array.from(busy);
      };

      daysToProcess.forEach(day => {
        PERIODS.forEach(period => {
          const c = newGrid[day]?.[period];
          if (!c) return;
          if (c.isSplit && c.groups) {
            c.groups.forEach(gr => { if (gr.substitute && subCount[gr.substitute] !== undefined) subCount[gr.substitute]++; });
          } else {
            if (c.substitute && subCount[c.substitute] !== undefined) subCount[c.substitute]++;
          }
        });
      });

      let assignedCount = 0;
      const assignToItem = (item, day, period) => {
        if (item.teacher && isAbsentOnDay(item.teacher, day) && !item.substitute) {
          const busyThisPeriod = getBusySchoolWide(day, period);
          const free = available.filter(t => {
            if (busyThisPeriod.includes(t) || t === item.teacher) return false;
            const allowed = teacherConstraints?.[t]?.allowedClasses;
            if (allowed && className) {
              const allowedArray = allowed.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
              const classStr = className.toLowerCase();
              if (allowedArray.length > 0) {
                const matches = allowedArray.some(val => new RegExp(`\\b${val}\\b`, 'i').test(classStr));
                if (!matches) return false;
              }
            }
            if (currentClassGroup !== 0) {
              const tGroups = teacherGroups[t];
              if (tGroups && tGroups.size > 0 && !tGroups.has(currentClassGroup)) return false;
            }
            return true;
          });
          if (free.length > 0) {
            free.sort((a, b) => {
              const aTeaches = (teacherSubjects?.[a] || []).includes(item.subject) ? 0 : 1;
              const bTeaches = (teacherSubjects?.[b] || []).includes(item.subject) ? 0 : 1;
              if (aTeaches !== bTeaches) return aTeaches - bTeaches;
              const aInClass = teachersInCurrentClass.has(a) ? 0 : 1;
              const bInClass = teachersInCurrentClass.has(b) ? 0 : 1;
              if (aInClass !== bInClass) return aInClass - bInClass;
              return (subCount[a] || 0) - (subCount[b] || 0);
            });
            item.substitute = free[0];
            subCount[free[0]] = (subCount[free[0]] || 0) + 1;
            assignedCount++;
          }
        }
      };

      daysToProcess.forEach(day => {
        PERIODS.forEach(period => {
          const cell = newGrid[day]?.[period];
          if (!cell) return;
          if (cell.isSplit && cell.groups) {
            cell.groups.forEach(gr => assignToItem(gr, day, period));
          } else {
            assignToItem(cell, day, period);
          }
        });
      });
      setGrid(newGrid);

      if (assignedCount === 0 && getAbsentTeacherNames().length > 0) {
        alert(`No free teachers found for ${daysToProcess.join(', ')}. All matching teachers are busy.`);
      }
    } catch (err) {
      console.error('Auto Assign Subs Error:', err);
      alert('Error assigning subs: ' + err.message);
    }
  }

  // Count affected periods
  const affectedCount = activeDays.reduce((sum, day) => sum + PERIODS.reduce((s2, p) => {
    const c = grid[day]?.[p]
    if (!c) return s2
    if (c.isSplit && c.groups) {
      return s2 + c.groups.reduce((gSum, g) => gSum + (g.teacher && isAbsentOnDay(g.teacher, day) && !g.substitute ? 1 : 0), 0)
    }
    return s2 + (c.teacher && isAbsentOnDay(c.teacher, day) && !c.substitute ? 1 : 0)
  }, 0), 0)

  const assignedSubsCount = activeDays.reduce((sum, day) => sum + PERIODS.reduce((s2, p) => {
    const c = grid[day]?.[p]
    if (!c) return s2
    if (c.isSplit && c.groups) {
      return s2 + c.groups.reduce((gSum, g) => gSum + (g.substitute ? 1 : 0), 0)
    }
    return s2 + (c.substitute ? 1 : 0)
  }, 0), 0)

  const notifyAllSubs = () => {
    let text = `🚨 *Substitute Duties for ${className}* 🚨\n\n`
    let hasSubs = false
    activeDays.forEach(day => {
      let dayText = `*${day}*\n`
      let dayHasSubs = false
      PERIODS.forEach(period => {
        const cell = grid[day]?.[period]
        if (!cell) return
        if (cell.isSplit && cell.groups) {
          cell.groups.forEach(g => {
            if (g.substitute) {
              dayHasSubs = true
              hasSubs = true
              dayText += `- ${period} (${g.groupName}): ${g.substitute} (Sub for ${g.teacher} - ${g.subject || 'N/A'})\n`
            }
          })
        } else if (cell.substitute) {
          dayHasSubs = true
          hasSubs = true
          dayText += `- ${period}: ${cell.substitute} (Sub for ${cell.teacher} - ${cell.subject || 'N/A'})\n`
        }
      })
      if (dayHasSubs) text += dayText + '\n'
    })
    
    if (!hasSubs) return alert('No substitute duties assigned.')
    
    text += `\n_Please check your schedules._`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  const getTimetableShareText = () => {
    let text = `*Timetable: ${className}*\n`
    if (schoolName) text += `${schoolName}\n`
    text += `\n`
    activeDays.forEach(day => {
      text += `*${day}*\n`
      PERIODS.forEach(period => {
        const cell = grid[day]?.[period]
        if (!cell) return
        if (cell.isSplit && cell.groups) {
          let hasSubjects = false
          let pText = `- ${period}: `
          cell.groups.forEach(g => {
            if (g.subject) {
              hasSubjects = true
              pText += `[${g.groupName}] ${g.subject} (${g.teacher || 'Unassigned'})`
              if (g.substitute) pText += ` {Sub: ${g.substitute}}`
              pText += ` | `
            }
          })
          if (hasSubjects) text += pText.slice(0, -3) + `\n`
        } else if (cell.subject) {
          text += `- ${period}: ${cell.subject} (${cell.teacher || 'Unassigned'})`
          if (cell.substitute) text += ` [Sub: ${cell.substitute}]`
          text += `\n`
        }
      })
      text += `\n`
    })
    text += `_Generated via LDMS Teacher Hub_`
    return text
  }

  const handleTimetableShareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(getTimetableShareText())}`, '_blank')
    setShowShareMenu(false)
  }

  const handleTimetableShareTelegram = () => {
    const text = getTimetableShareText().replace(/\\*/g, '')
    window.open(`https://t.me/share/url?text=${encodeURIComponent(text)}`, '_blank')
    setShowShareMenu(false)
  }

  const handleTimetableShareEmail = () => {
    const text = getTimetableShareText().replace(/\\*/g, '')
    const subject = encodeURIComponent(`Timetable: ${className}`)
    const body = encodeURIComponent(text)
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank')
    setShowShareMenu(false)
  }

  const handleTimetableNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Timetable: ${className}`,
          text: getTimetableShareText().replace(/\\*/g, '')
        })
      } catch (err) { /* user cancelled */ }
    }
    setShowShareMenu(false)
  }

  const executePrint = () => {
    setIsPrintModalOpen(false)
    const w = window.open('', '_blank')
    w.document.write(`<html><head><title>Timetable - ${className}</title><style>body{font-family:Inter,sans-serif;padding:30px;max-width:1000px;margin:0 auto}table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:40px}th,td{border:1px solid #cbd5e1;padding:10px;text-align:center}th{background:#1e293b;color:white;font-weight:bold}.sub{color:#dc2626;font-style:italic;display:block;margin-top:4px}.absent{text-decoration:line-through;color:#94a3b8}.header{text-align:center;margin-bottom:30px;border-bottom:2px solid #e2e8f0;padding-bottom:20px}.header h1{margin:0 0 10px 0;font-size:28px;color:#0f172a}.header p{margin:0 0 5px 0;color:#475569;font-size:16px}.footer{display:flex;justify-content:space-between;margin-top:60px;padding-top:20px}.sign-box{text-align:center;width:200px}.sign-line{border-top:1px solid #475569;margin-bottom:8px;padding-top:6px;font-weight:bold;font-size:14px;color:#0f172a}.sign-name{font-size:14px;color:#475569}</style></head><body>`)
    
    w.document.write(`<div class="header">`)
    w.document.write(`<h1>${schoolName ? schoolName : 'School Timetable'}</h1>`)
    w.document.write(`<p><strong>Class:</strong> ${className} ${session ? `&nbsp;|&nbsp; <strong>Session:</strong> ${session}` : ''}</p>`)
    if (details) w.document.write(`<p style="font-style:italic;font-size:14px;margin-top:10px">${details}</p>`)
    w.document.write(`</div>`)
    
    w.document.write(`<table><thead><tr><th>Period</th>`)
    activeDays.forEach(d => w.document.write(`<th>${d}</th>`))
    w.document.write(`</tr></thead><tbody>`)
    PERIODS.forEach(p => {
      const timing = bellTimings[p] ? `<br><span style="font-size:10px;font-weight:normal;color:#475569">${bellTimings[p].start} - ${bellTimings[p].end}</span>` : ''
      w.document.write(`<tr><td><strong>${p}</strong>${timing}</td>`)
      activeDays.forEach(d => {
        const c = grid[d]?.[p] || {}
        let html = '';
        if (c.isSplit && c.groups) {
          html += `<div style="display:flex; flex-direction:column; gap:4px;">`
          c.groups.forEach((g, idx) => {
            if (idx > 0) html += `<hr style="margin:2px 0; border:0; border-top:1px dashed #cbd5e1">`
            const isAbsent = g.teacher && isAbsentOnDay(g.teacher, d)
            html += `<div>`
            html += `<div style="font-size:10px; color:#64748b; font-weight:bold; text-transform:uppercase;">${g.groupName || ''}</div>`
            html += g.subject ? `<div style="font-size:13px; font-weight:bold; margin-bottom:2px;">${g.subject}</div>` : '-'
            if (g.teacher) html += `<div class="${isAbsent ? 'absent' : ''}" style="font-size:11px; font-weight:600; color:#334155;">${g.teacher}</div>`
            if (g.substitute) html += `<div class="sub" style="font-size:10px; font-weight:bold; background:#fee2e2; color:#b91c1c; padding:2px; border-radius:4px; display:inline-block; margin-top:2px;">Sub: ${g.substitute}</div>`
            html += `</div>`
          })
          html += `</div>`
        } else {
          const isAbsent = c.teacher && isAbsentOnDay(c.teacher, d)
          html = c.subject ? `<div style="font-size:14px; font-weight:bold; margin-bottom:2px;">${c.subject}</div>` : '-'
          if (c.teacher) html += `<div class="${isAbsent ? 'absent' : ''}" style="font-size:12px; font-weight:600; color:#334155;">${c.teacher}</div>`
          if (c.substitute) html += `<div class="sub" style="font-size:11px; font-weight:bold; background:#fee2e2; color:#b91c1c; padding:2px; border-radius:4px; display:inline-block; margin-top:4px;">Sub: ${c.substitute}</div>`
        }
        w.document.write(`<td>${html}</td>`)
      })
      w.document.write(`</tr>`)
    })
    w.document.write(`</tbody></table>`)
    
    w.document.write(`<div class="footer">`)
    w.document.write(`<div class="sign-box"><div class="sign-line">Class Teacher Signature</div><div class="sign-name">${classTeacher || ''}</div></div>`)
    w.document.write(`<div class="sign-box"><div class="sign-line">Principal Signature</div><div class="sign-name">${principalName || ''}</div></div>`)
    w.document.write(`</div>`)
    
    w.document.write(`</body></html>`)
    w.document.close()
    setTimeout(() => w.print(), 500)
  }

  const generateClashReport = () => {
    // Gather all timetables
    const allTbs = [...cloudTimetables.filter(t => t.id !== currentTimetableId)]
    if (className) {
      allTbs.push({ id: 'current', className, grid })
    }

    const clashes = []
    
    ALL_DAYS.forEach(d => {
      PERIODS.forEach(p => {
        const teacherClassMap = {}
        
        allTbs.forEach(tb => {
          const c = tb.grid?.[d]?.[p]
          if (!c) return
          if (c.isSplit && c.groups) {
            c.groups.forEach(g => {
              if (g.teacher) {
                if (!teacherClassMap[g.teacher]) teacherClassMap[g.teacher] = []
                teacherClassMap[g.teacher].push(tb.className)
              }
            })
          } else if (c.teacher) {
            if (!teacherClassMap[c.teacher]) teacherClassMap[c.teacher] = []
            teacherClassMap[c.teacher].push(tb.className)
          }
        })

        // Check for duplicates
        Object.entries(teacherClassMap).forEach(([teacher, classNames]) => {
          if (classNames.length > 1) {
            clashes.push({ teacher, day: d, period: p, classes: classNames })
          }
        })
      })
    })

    const w = window.open('', '_blank')
    w.document.write(`<html><head><title>Clash Report - ${schoolName || 'School'}</title><style>body{font-family:Inter,sans-serif;padding:30px;max-width:800px;margin:0 auto}table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px}th,td{border:1px solid #cbd5e1;padding:10px;text-align:left}th{background:#fef2f2;color:#b91c1c;font-weight:bold}.header{text-align:center;margin-bottom:30px;border-bottom:2px solid #e2e8f0;padding-bottom:20px}.header h1{margin:0 0 10px 0;font-size:24px;color:#b91c1c}.header p{margin:0;color:#475569;font-size:14px}</style></head><body>`)
    
    w.document.write(`<div class="header">`)
    w.document.write(`<h1>🚨 Scheduling Clash Report</h1>`)
    w.document.write(`<p>Generated on ${new Date().toLocaleDateString()}</p>`)
    w.document.write(`</div>`)
    
    if (clashes.length === 0) {
      w.document.write(`<div style="text-align:center; padding: 40px; background: #ecfdf5; color: #047857; border-radius: 8px; font-size: 16px; font-weight: bold;">✅ No scheduling conflicts detected across all classes!</div>`)
    } else {
      w.document.write(`<table><thead><tr><th>Teacher</th><th>Day</th><th>Period</th><th>Conflicting Classes</th></tr></thead><tbody>`)
      clashes.sort((a,b) => a.teacher.localeCompare(b.teacher)).forEach(c => {
        w.document.write(`<tr>
          <td><strong>${c.teacher}</strong></td>
          <td>${c.day}</td>
          <td>${c.period}</td>
          <td style="color:#b91c1c; font-weight:bold;">${c.classes.join(' &amp; ')}</td>
        </tr>`)
      })
      w.document.write(`</tbody></table>`)
      w.document.write(`<p style="color:#64748b; font-size:12px;">Total Clashes Found: <strong>${clashes.length}</strong></p>`)
    }
    w.document.write(`</body></html>`)
    w.document.close()
    setTimeout(() => w.print(), 500)
  }

  const handlePrintClick = () => {
    setIsPrintModalOpen(true)
  }

  const exportClassCSV = () => {
    let csv = 'Period,' + activeDays.join(',') + '\n';
    PERIODS.forEach(p => {
      let row = [p];
      activeDays.forEach(d => {
        const c = grid[d]?.[p] || {};
        if (c.isSplit && c.groups) {
          const groupTexts = c.groups.map(g => {
            if (!g.subject) return `${g.groupName}: -`;
            let txt = `${g.groupName}: ${g.subject} (${g.teacher || 'Unassigned'})`;
            if (g.substitute) txt += ` [Sub: ${g.substitute}]`;
            return txt;
          });
          row.push(`"${groupTexts.join(' | ')}"`);
        } else {
          if (!c.subject) {
            row.push('-');
          } else {
            let txt = `${c.subject} (${c.teacher || 'Unassigned'})`;
            if (c.substitute) txt += ` [Sub: ${c.substitute}]`;
            row.push(`"${txt}"`);
          }
        }
      });
      csv += row.join(',') + '\n';
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${className}_Timetable.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveTemplate = () => {
    const name = prompt('Enter a name for this template (e.g., "Standard Middle School")')
    if (!name) return
    const templateGrid = {}
    ALL_DAYS.forEach(d => {
      templateGrid[d] = {}
      PERIODS.forEach(p => {
        if (grid[d]?.[p]) {
          const c = grid[d][p]
          if (c.isSplit) {
            templateGrid[d][p] = {
              isSplit: true,
              groups: c.groups.map(g => ({ ...g, teacher: '', substitute: '' }))
            }
          } else {
            templateGrid[d][p] = { subject: c.subject, room: c.room, teacher: '', substitute: '', isLocked: false }
          }
        }
      })
    })
    const newTemplate = { id: Date.now().toString(), name, grid: templateGrid, createdAt: new Date().toISOString() }
    setTemplates(prev => [...prev, newTemplate])
    alert('Template saved successfully!')
  }

  const handleApplyTemplate = (template) => {
    if (!confirm(`Apply template "${template.name}"? This will overwrite the current structure but clear all teachers.`)) return
    setGrid(template.grid)
    setIsTemplatesModalOpen(false)
  }

  const handleDeleteTemplate = (id) => {
    if (!confirm('Delete this template?')) return
    setTemplates(prev => prev.filter(t => t.id !== id))
  }

  // Bulk Actions
  const handleBulkClearGrid = () => {
    if (!confirm('Are you sure you want to completely clear the grid? This cannot be undone.')) return
    const g = {}
    ALL_DAYS.forEach(d => { g[d] = {}; PERIODS.forEach(p => { g[d][p] = { subject: p === 'Lunch' ? 'Lunch' : '', teacher: '', substitute: '', room: '', isLocked: false } }) })
    setGrid(g)
    setShowBulkActions(false)
  }

  const handleBulkClearTeachers = () => {
    if (!confirm('Remove all teachers but keep subjects?')) return
    const newGrid = JSON.parse(JSON.stringify(grid))
    ALL_DAYS.forEach(d => {
      PERIODS.forEach(p => {
        if (newGrid[d]?.[p] && !newGrid[d][p].isLocked) {
          if (newGrid[d][p].isSplit && newGrid[d][p].groups) {
            newGrid[d][p].groups.forEach(g => { g.teacher = ''; g.substitute = ''; })
          } else {
            newGrid[d][p].teacher = '';
            newGrid[d][p].substitute = '';
          }
        }
      })
    })
    setGrid(newGrid)
    setShowBulkActions(false)
  }

  const handleBulkClearSubs = () => {
    if (!confirm('Remove all substitute assignments?')) return
    const newGrid = JSON.parse(JSON.stringify(grid))
    ALL_DAYS.forEach(d => {
      PERIODS.forEach(p => {
        if (newGrid[d]?.[p] && !newGrid[d][p].isLocked) {
          if (newGrid[d][p].isSplit && newGrid[d][p].groups) {
            newGrid[d][p].groups.forEach(g => g.substitute = '')
          } else {
            newGrid[d][p].substitute = ''
          }
        }
      })
    })
    setGrid(newGrid)
    setShowBulkActions(false)
  }

  const handleBulkResetAbsences = () => {
    if (!confirm('Mark all teachers as present?')) return
    setAbsentTeachers({})
    setShowBulkActions(false)
  }

  const generateAITimetable = async () => {
    let totalReq = 0
    Object.values(aiRequirements).forEach(v => totalReq += (parseInt(v) || 0))
    const teachingPeriods = PERIODS.filter(p => p !== 'Lunch')
    const maxPeriods = activeDays.length * teachingPeriods.length
    if (totalReq > maxPeriods) {
      return alert(`Too many periods required! You requested ${totalReq}, but there are only ${maxPeriods} slots available.`)
    }

    if ((stats?.coins || 0) < GENERATION_COST) {
      return alert(`Not enough coins! You need ${GENERATION_COST} 🪙 to use AI Timetable Generation.`)
    }
    const success = await spendCoins(GENERATION_COST, 'AI Timetable Generation')
    if (!success) return alert('Failed to deduct coins.')

    const newGrid = JSON.parse(JSON.stringify(grid))

    // Calculate already filled slots
    let filledCount = 0
    activeDays.forEach(day => {
      teachingPeriods.forEach(period => {
        const c = newGrid[day]?.[period] || {}
        if (c.isSplit || c.subject) filledCount++
      })
    })
    if (totalReq > (maxPeriods - filledCount)) {
      alert(`You requested ${totalReq} periods, but only ${maxPeriods - filledCount} empty slots remain. Filling as much as possible.`)
    }

    // Get workload counts across all other classes
    const workload = {}
    allTeachersList.forEach(t => workload[t] = 0)
    const countGrid = (g) => {
      if (!g) return
      ALL_DAYS.forEach(d => {
        PERIODS.forEach(p => {
          const c = g[d]?.[p]
          if (!c) return
          if (c.isSplit && Array.isArray(c.groups)) {
            c.groups.forEach(group => {
              if (group.teacher && workload[group.teacher] !== undefined) workload[group.teacher]++
            })
          } else {
            if (c.teacher && workload[c.teacher] !== undefined) workload[c.teacher]++
          }
        })
      })
    }
    cloudTimetables.forEach(tb => { if (tb.id !== currentTimetableId) countGrid(tb.grid) })

    // Build a live busy-map that tracks which teachers are busy in each slot
    // (across school + the newGrid being built)
    const busyMap = {}
    const getBusyKey = (d, p) => `${d}|||${p}`
    activeDays.forEach(d => {
      PERIODS.forEach(p => {
        const key = getBusyKey(d, p)
        const busy = new Set()
        // From other cloud timetables
        cloudTimetables.forEach(tb => {
          if (tb.id === currentTimetableId) return
          const cell = tb.grid?.[d]?.[p]
          if (!cell) return
          if (cell.isSplit && cell.groups) {
            cell.groups.forEach(g => { if (g.teacher) busy.add(g.teacher) })
          } else {
            if (cell.teacher) busy.add(cell.teacher)
          }
        })
        // From already-filled cells in newGrid
        const cell = newGrid[d]?.[p]
        if (cell) {
          if (cell.isSplit && cell.groups) {
            cell.groups.forEach(g => { if (g.teacher) busy.add(g.teacher) })
          } else {
            if (cell.teacher) busy.add(cell.teacher)
          }
        }
        busyMap[key] = busy
      })
    })

    const isEligible = (t, day, period) => {
      const allowed = teacherConstraints[t]?.allowedClasses
      if (allowed && className) {
        const allowedArray = allowed.split(',').map(s => s.trim().toLowerCase()).filter(s => s)
        const classStr = className.toLowerCase()
        if (allowedArray.length > 0) {
          const matches = allowedArray.some(val => new RegExp(`\\b${val}\\b`, 'i').test(classStr))
          if (!matches) return false
        }
      }
      const maxW = teacherConstraints[t]?.maxWorkload !== undefined ? teacherConstraints[t].maxWorkload : 36
      if ((workload[t] || 0) >= maxW) return false
      // Use live busyMap instead of stale checkClash
      const key = getBusyKey(day, period)
      if (busyMap[key]?.has(t)) return false
      return true
    }

    // Build subject requirements sorted by count descending
    const subjectReqs = []
    Object.entries(aiRequirements).forEach(([sub, count]) => {
      const c = parseInt(count) || 0
      if (c > 0) subjectReqs.push({ subject: sub, remaining: c })
    })

    // STRATEGY: Period-first (row-wise) filling
    // For each period row, fill ALL active days with the same subject
    // This ensures Period 1 = Math across Mon-Sat, Period 2 = Science across Mon-Sat, etc.
    // If a subject needs fewer periods than active days, the remaining days in that row
    // get filled by the next subject in queue.

    const emptyPeriods = teachingPeriods.filter(period => {
      return activeDays.some(day => {
        const c = newGrid[day]?.[period] || {}
        return !c.isSplit && !c.subject
      })
    })

    emptyPeriods.forEach(period => {
      // Fill each day within this period row
      activeDays.forEach(day => {
        const c = newGrid[day]?.[period] || {}
        if (c.isSplit || c.subject || c.isLocked) return // skip already filled or locked

        // Re-sort by remaining count so highest-need subject fills this period row
        subjectReqs.sort((a, b) => b.remaining - a.remaining)
        const bestSubject = subjectReqs.find(s => s.remaining > 0)
        if (!bestSubject) return

        // Find a teacher: prefer subject experts first, then any eligible
        let candidates = teachers.filter(t =>
          (teacherSubjects[t] || []).includes(bestSubject.subject) && isEligible(t, day, period)
        )
        if (candidates.length === 0) {
          candidates = teachers.filter(t => isEligible(t, day, period))
        }

        if (candidates.length > 0) {
          candidates.sort((a, b) => (workload[a] || 0) - (workload[b] || 0))
          const assignedTeacher = candidates[0]
          newGrid[day][period] = { subject: bestSubject.subject, teacher: assignedTeacher, substitute: '', room: '' }
          workload[assignedTeacher] = (workload[assignedTeacher] || 0) + 1
          busyMap[getBusyKey(day, period)].add(assignedTeacher)
          bestSubject.remaining--
        }
      })
    })

    setGrid(newGrid)
    setIsAIModalOpen(false)
    alert('✨ AI Auto-Generation Complete!\nNote: Some periods may be blank if no teachers were available or constraints were too strict.')
  }

  const getWorkload = () => {
    const workload = {}
    allTeachersList.forEach(t => workload[t] = 0)
    
    const countGrid = (g) => {
      if (!g) return
      ALL_DAYS.forEach(d => {
        PERIODS.forEach(p => {
          const c = g[d]?.[p]
          if (!c) return
          if (c.isSplit && c.groups) {
            c.groups.forEach(group => {
              if (group.teacher && workload[group.teacher] !== undefined) workload[group.teacher]++
              if (group.substitute && workload[group.substitute] !== undefined) workload[group.substitute]++
            })
          } else {
            if (c.teacher && workload[c.teacher] !== undefined) workload[c.teacher]++
            if (c.substitute && workload[c.substitute] !== undefined) workload[c.substitute]++
          }
        })
      })
    }

    cloudTimetables.forEach(tb => {
      if (tb.id !== currentTimetableId) countGrid(tb.grid)
    })
    countGrid(grid)
    
    return Object.entries(workload).map(([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count)
  }

  const exportTeacherCSV = () => {
    if (!selectedTeacherForView) return;
    let csv = 'Period,' + ALL_DAYS.join(',') + '\n';
    PERIODS.forEach(p => {
      let row = [p];
      ALL_DAYS.forEach(d => {
        const assignments = teacherViewGrid[d]?.[p] || [];
        if (assignments.length === 0) {
          row.push('Free');
        } else {
          const txts = assignments.map(a => `${a.className} - ${a.subject || 'N/A'}`);
          row.push(`"${txts.join(' | ')}"`);
        }
      });
      csv += row.join(',') + '\n';
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${selectedTeacherForView}_Timetable.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportTeacherICS = () => {
    if (!selectedTeacherForView) return
    let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//LDMS//Teacher Timetable//EN\n"
    
    const dayMap = { 'Monday': 'MO', 'Tuesday': 'TU', 'Wednesday': 'WE', 'Thursday': 'TH', 'Friday': 'FR', 'Saturday': 'SA' }
    const timeMap = {
      'Period 1': { start: '080000', end: '084000' },
      'Period 2': { start: '084000', end: '092000' },
      'Period 3': { start: '092000', end: '100000' },
      'Period 4': { start: '100000', end: '104000' },
      'Lunch': { start: '104000', end: '110000' },
      'Period 5': { start: '110000', end: '114000' },
      'Period 6': { start: '114000', end: '122000' },
      'Period 7': { start: '122000', end: '130000' },
      'Period 8': { start: '130000', end: '134000' }
    }

    const getNextDate = (dayName) => {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      const today = new Date()
      const targetDay = days.indexOf(dayName)
      let d = new Date()
      d.setDate(today.getDate() + (targetDay + 7 - today.getDay()) % 7)
      return d.toISOString().split('T')[0].replace(/-/g, '')
    }

    ALL_DAYS.forEach(day => {
      const dateStr = getNextDate(day)
      PERIODS.forEach(period => {
        const assignments = teacherViewGrid[day]?.[period] || []
        if (assignments.length > 0) {
          assignments.forEach(a => {
            const t = timeMap[period]
            if (!t) return
            icsContent += "BEGIN:VEVENT\n"
            icsContent += `DTSTART:${dateStr}T${t.start}\n`
            icsContent += `DTEND:${dateStr}T${t.end}\n`
            icsContent += `RRULE:FREQ=WEEKLY;BYDAY=${dayMap[day]}\n`
            icsContent += `SUMMARY:${a.className} - ${a.subject || 'Class'}\n`
            icsContent += `DESCRIPTION:Class: ${a.className}, Subject: ${a.subject || 'N/A'}\n`
            icsContent += "END:VEVENT\n"
          })
        }
      })
    })

    icsContent += "END:VCALENDAR"
    
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `${selectedTeacherForView}_Timetable.ics`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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
          <Users className="w-4 h-4" /> Teachers {getAbsentTeacherNames().length > 0 && <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">{getAbsentTeacherNames().length}</span>}
        </button>
        <button onClick={() => setIsWorkloadModalOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl text-sm font-bold hover:bg-indigo-100 shadow-sm transition-all">
          <BookOpen className="w-4 h-4" /> Workload
        </button>
        <button onClick={handlePrintClick} className="flex items-center gap-2 px-5 py-2.5 bg-white border border-surface-200 text-surface-700 rounded-xl text-sm font-bold hover:bg-surface-50 shadow-sm"><Printer className="w-4 h-4" /> Print</button>
        <button onClick={exportClassCSV} className="flex items-center gap-2 px-5 py-2.5 bg-white border border-surface-200 text-surface-700 rounded-xl text-sm font-bold hover:bg-surface-50 shadow-sm"><Download className="w-4 h-4" /> CSV</button>
        
        <div className="relative">
          <button onClick={() => setShowShareMenu(!showShareMenu)} className="flex items-center gap-2 px-5 py-2.5 bg-white border border-surface-200 text-surface-700 rounded-xl text-sm font-bold hover:bg-surface-50 transition-all shadow-sm">
            <Share2 className="w-4 h-4" /> Share
          </button>
          {showShareMenu && (
            <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-surface-200 rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in">
              <button onClick={handleTimetableShareWhatsApp} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-surface-700 hover:bg-[#25D366]/10 hover:text-[#25D366] transition-colors"><MessageCircle className="w-4 h-4" /> WhatsApp</button>
              <button onClick={handleTimetableShareTelegram} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-surface-700 hover:bg-[#0088cc]/10 hover:text-[#0088cc] transition-colors border-t border-surface-100"><Send className="w-4 h-4" /> Telegram</button>
              <button onClick={handleTimetableShareEmail} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-surface-700 hover:bg-surface-100 transition-colors border-t border-surface-100"><Mail className="w-4 h-4" /> Email</button>
              {navigator.share && (
                <button onClick={handleTimetableNativeShare} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-surface-700 hover:bg-surface-100 transition-colors border-t border-surface-100"><LinkIcon className="w-4 h-4" /> Share via...</button>
              )}
            </div>
          )}
        </div>

        <button onClick={() => setIsAIModalOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl text-sm font-bold hover:shadow-lg shadow-sm transition-all animate-pulse-soft">
          <Sparkles className="w-4 h-4" /> AI Auto-Fill
        </button>
        
        {assignedSubsCount > 0 && (
          <button onClick={notifyAllSubs} className="flex items-center gap-2 px-5 py-2.5 bg-[#25D366] text-white rounded-xl text-sm font-bold hover:bg-[#128C7E] shadow-sm transition-all animate-fade-in">
            <MessageCircle className="w-4 h-4" /> Share Subs
          </button>
        )}
        
        <div className="flex items-center gap-2 ml-auto w-full sm:w-auto justify-end flex-wrap">
          <button onClick={handleOpenTeacherView} className="flex items-center gap-2 px-4 py-2.5 bg-fuchsia-50 border border-fuchsia-200 text-fuchsia-700 rounded-xl text-sm font-bold hover:bg-fuchsia-100 shadow-sm">
            <User className="w-4 h-4" /> <span>Teacher View</span>
          </button>

          {currentUser && (
            <>
              <button onClick={() => { setIsCloudModalOpen(true); loadTimetables() }} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl text-sm font-bold hover:bg-indigo-100 shadow-sm">
                <FolderOpen className="w-4 h-4" /> <span>My Timetables</span>
              </button>
              <button onClick={saveToCloud} disabled={isSaving} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 border border-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 shadow-sm">
                <Cloud className="w-4 h-4" /> <span>{isSaving ? 'Saving...' : 'Save Cloud'}</span>
              </button>
            </>
          )}

          <button onClick={handleNewTimetable} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-surface-200 text-surface-700 rounded-xl text-sm font-bold hover:bg-surface-50 shadow-sm">
            <Plus className="w-4 h-4 text-emerald-600" /> <span>New Class</span>
          </button>

          {currentUser && currentTimetableId && (
            <button onClick={() => handleDeleteTimetable({ id: currentTimetableId, className })} className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-bold hover:bg-red-100 shadow-sm">
              <Trash2 className="w-4 h-4" /> <span>Delete Saved</span>
            </button>
          )}

          <div className="flex items-center gap-2 border-l border-surface-200 pl-2">
            <button onClick={handleUndo} disabled={historyIndex <= 0} className="p-2.5 bg-white border border-surface-200 text-surface-700 rounded-xl hover:bg-surface-50 shadow-sm disabled:opacity-50 transition-all" title="Undo (Ctrl+Z)">
              <RotateCcw className="w-4 h-4" />
            </button>
            <button onClick={handleRedo} disabled={historyIndex >= gridHistory.length - 1} className="p-2.5 bg-white border border-surface-200 text-surface-700 rounded-xl hover:bg-surface-50 shadow-sm disabled:opacity-50 transition-all" title="Redo (Ctrl+Y)">
              <RotateCcw className="w-4 h-4 transform scale-x-[-1]" />
            </button>
          </div>

          <button onClick={() => setIsTemplatesModalOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl text-sm font-bold hover:bg-amber-100 shadow-sm transition-all">
            <Copy className="w-4 h-4" /> <span>Templates</span>
          </button>

          <div className="relative">
            <button onClick={() => setShowBulkActions(!showBulkActions)} className="flex items-center gap-2 px-4 py-2.5 bg-orange-50 border border-orange-200 text-orange-600 rounded-xl text-sm font-bold hover:bg-orange-100 shadow-sm transition-all">
              <Sparkles className="w-4 h-4" /> <span>Bulk Actions</span> <ChevronDown className="w-3 h-3 ml-1" />
            </button>
            {showBulkActions && (
              <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-surface-200 rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in">
                <button onClick={handleBulkClearTeachers} className="w-full text-left px-4 py-3 text-sm font-bold text-surface-700 hover:bg-surface-50 border-b border-surface-100 flex items-center gap-2"><UserX className="w-4 h-4 text-surface-400" /> Clear Teachers</button>
                <button onClick={handleBulkClearSubs} className="w-full text-left px-4 py-3 text-sm font-bold text-surface-700 hover:bg-surface-50 border-b border-surface-100 flex items-center gap-2"><UserX className="w-4 h-4 text-red-400" /> Clear Substitutes</button>
                <button onClick={handleBulkResetAbsences} className="w-full text-left px-4 py-3 text-sm font-bold text-surface-700 hover:bg-surface-50 border-b border-surface-100 flex items-center gap-2"><UserCheck className="w-4 h-4 text-emerald-400" /> Reset All Absences</button>
                <button onClick={handleBulkClearGrid} className="w-full text-left px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"><Trash2 className="w-4 h-4" /> Clear Entire Grid</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Absent Alert */}
      {getAbsentTeacherNames().length > 0 && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4 animate-fade-in">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
              <div>
                <p className="text-sm font-bold text-red-800">{affectedCount} period{affectedCount > 1 ? 's' : ''} need substitute teachers</p>
                <p className="text-xs text-red-600">Absent: {getAbsentTeacherNames().map(t => `${t} (${(absentTeachers[t] || []).map(d => d.slice(0,3)).join(', ')})`).join(' • ')}</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-red-700">Auto-assign for:</label>
              <select value={subAssignDay} onChange={e => setSubAssignDay(e.target.value)} className="px-3 py-2 bg-white border border-red-200 rounded-lg text-sm text-red-700 font-bold focus:ring-2 focus:ring-red-400 outline-none">
                <option value="Today">Today Only</option>
                <option value="All">All Absent Days</option>
                {activeDays.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <button onClick={autoAssignSubs} className="px-5 py-2.5 bg-red-600 text-white font-bold rounded-xl text-sm hover:bg-red-700 transition-colors shadow-md">
              ⚡ Auto-Assign (This Class)
            </button>
            {currentUser && cloudTimetables.length > 0 && (
              <button onClick={() => { loadTimetables(); setIsSubPanelOpen(true) }} className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl text-sm hover:bg-indigo-700 transition-colors shadow-md">
                🏫 School-Wide Subs
              </button>
            )}
          </div>
        </div>
      )}

      {/* Teacher Management Panel */}
      {showPanel && (
        <div className="mb-6 bg-white rounded-[24px] border border-surface-200 shadow-sm p-6 animate-fade-in">
          <h3 className="text-sm font-extrabold text-surface-900 mb-4 flex items-center gap-2"><Users className="w-4 h-4 text-indigo-500" /> Teacher Management</h3>
          {/* Add teacher */}
          <div className="flex gap-2 mb-4">
            <input type="text" value={newTeacher} onChange={e => setNewTeacher(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTeacher()} placeholder="Add teacher name..." className="flex-1 px-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-indigo-400" />
            <button onClick={addTeacher} className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors">Add</button>
            <input 
              type="file" 
              accept=".pdf,image/*" 
              ref={fileInputRef} 
              onChange={handleUploadTeacherPDF} 
              className="hidden" 
            />
            <button 
              onClick={() => fileInputRef.current?.click()} 
              disabled={isUploadingPDF}
              className="px-4 py-2.5 bg-violet-100 text-violet-700 border border-violet-200 rounded-xl text-sm font-bold hover:bg-violet-200 transition-colors flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              {isUploadingPDF ? 'Scanning...' : `Import from PDF ${visionUses >= 2 ? `(${VISION_TAX} 🪙)` : '(Free)'}`}
            </button>
          </div>
          {/* Teacher list */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {teachers.map(t => {
              const isAbsent = isAbsentAnyDay(t)
              const absentDays = absentTeachers[t] || []
              const isBrk = onBreak.includes(t)
              const tSubjs = teacherSubjects[t] || []
              return (
                <div 
                  key={t} 
                  draggable
                  onDragStart={(e) => handleDragStart(e, 'teacher', t)}
                  className={`flex flex-col gap-1.5 p-3 rounded-xl border transition-all cursor-grab active:cursor-grabbing ${isAbsent ? 'bg-red-50 border-red-200' : isBrk ? 'bg-amber-50 border-amber-200' : 'bg-surface-50 border-surface-200'}`}
                >
                  <div className="flex items-center gap-2">
                    {editingTeacherName === t ? (
                      <input 
                        type="text" 
                        value={editingTeacherNewName} 
                        onChange={e => setEditingTeacherNewName(e.target.value)} 
                        onKeyDown={e => e.key === 'Enter' && handleRenameTeacher(t, editingTeacherNewName)}
                        onBlur={() => handleRenameTeacher(t, editingTeacherNewName)}
                        autoFocus
                        className="flex-1 text-sm font-bold px-2 py-1 rounded border border-indigo-400 focus:outline-none"
                      />
                    ) : (
                      <span onDoubleClick={() => { setEditingTeacherName(t); setEditingTeacherNewName(t); }} className={`flex-1 text-sm font-bold truncate ${isAbsent ? 'text-red-700 line-through' : isBrk ? 'text-amber-700' : 'text-surface-800'}`}>
                        {t} {classTeacher === t && <Sparkles className="inline w-3 h-3 text-purple-500 mb-1" />}
                      </span>
                    )}
                    <button onClick={() => classTeacher === t ? setClassTeacher('') : setClassTeacher(t)} title={classTeacher === t ? 'Remove Class Teacher' : 'Set as Class Teacher'} className={`p-1.5 rounded-lg transition-colors ${classTeacher === t ? 'bg-purple-200 text-purple-700' : 'hover:bg-purple-100 text-surface-400'}`}>
                      <Sparkles className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => { setEditingTeacherName(t); setEditingTeacherNewName(t); }} title="Rename Teacher" className={`p-1.5 rounded-lg transition-colors ${editingTeacherName === t ? 'bg-indigo-200 text-indigo-700' : 'hover:bg-indigo-100 text-surface-400'}`}>
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setAssigningSubjectsFor(assigningSubjectsFor === t ? null : t)} title="Assign subjects" className={`p-1.5 rounded-lg transition-colors ${assigningSubjectsFor === t ? 'bg-emerald-200 text-emerald-700' : 'hover:bg-emerald-100 text-surface-400'}`}>
                      <Tag className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setConfiguringConstraintsFor(configuringConstraintsFor === t ? null : t)} title="Configure Constraints" className={`p-1.5 rounded-lg transition-colors ${configuringConstraintsFor === t ? 'bg-blue-200 text-blue-700' : 'hover:bg-blue-100 text-surface-400'}`}>
                      <Settings className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => toggleAbsent(t)} title={isAbsent ? 'Mark Present' : 'Mark Absent'} className={`p-1.5 rounded-lg transition-colors ${isAbsent ? 'bg-red-200 text-red-700' : 'hover:bg-red-100 text-surface-400'}`}>
                      <UserX className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => toggleBreak(t)} title={isBrk ? 'Back from break' : 'On break/lunch'} className={`p-1.5 rounded-lg transition-colors ${isBrk ? 'bg-amber-200 text-amber-700' : 'hover:bg-amber-100 text-surface-400'}`}>
                      <Coffee className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => removeTeacher(t)} className="p-1.5 rounded-lg hover:bg-red-100 text-surface-300 hover:text-red-500 transition-colors"><X className="w-3.5 h-3.5" /></button>
                  </div>
                  <div className="flex items-center gap-2 mt-2 px-1">
                    <MessageCircle className="w-3 h-3 text-surface-400" />
                    <input 
                      type="text" 
                      placeholder="WhatsApp No. (e.g. +91...)" 
                      value={teacherContacts[t] || ''} 
                      onChange={e => setTeacherContacts(prev => ({ ...prev, [t]: e.target.value }))}
                      className="text-[10px] font-bold bg-white border border-surface-200 rounded px-2 py-1 w-full focus:outline-none focus:border-[#25D366] transition-colors"
                    />
                  </div>
                  {/* Day-specific absent chips */}
                  {isAbsent && (
                    <div className="flex flex-wrap gap-1 pt-1 border-t border-red-100">
                      <span className="text-[9px] font-bold text-red-500 uppercase tracking-wider mr-1 self-center">Leave:</span>
                      {activeDays.map(d => (
                        <button key={d} onClick={() => toggleAbsentDay(t, d)} className={`text-[9px] font-bold px-1.5 py-0.5 rounded transition-all ${absentDays.includes(d) ? 'bg-red-500 text-white' : 'bg-white text-surface-400 border border-surface-200 hover:border-red-300'}`}>
                          {d.slice(0, 3)}
                        </button>
                      ))}
                    </div>
                  )}
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
                  {configuringConstraintsFor === t && (
                    <div className="pt-2 border-t border-surface-100 mt-2 space-y-3">
                      <div>
                        <label className="text-[10px] font-bold text-surface-500 uppercase tracking-wider mb-1 block">Allowed Classes (e.g. 8, 9, 10)</label>
                        <input 
                          type="text" 
                          placeholder="Leave blank for all classes" 
                          className="w-full text-xs p-2 border border-surface-200 rounded-lg focus:border-blue-400 focus:outline-none"
                          value={teacherConstraints[t]?.allowedClasses || ''}
                          onChange={e => setTeacherConstraints(prev => ({ ...prev, [t]: { ...prev[t], allowedClasses: e.target.value } }))}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-surface-500 uppercase tracking-wider mb-1 block">Max Periods / Week</label>
                        <input 
                          type="number" 
                          placeholder="e.g. 36" 
                          className="w-full text-xs p-2 border border-surface-200 rounded-lg focus:border-blue-400 focus:outline-none"
                          value={teacherConstraints[t]?.maxWorkload !== undefined ? teacherConstraints[t].maxWorkload : 36}
                          onChange={e => setTeacherConstraints(prev => ({ ...prev, [t]: { ...prev[t], maxWorkload: parseInt(e.target.value) || 0 } }))}
                        />
                      </div>
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
                <span 
                  key={s} 
                  draggable
                  onDragStart={(e) => handleDragStart(e, 'subject', s)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border cursor-grab active:cursor-grabbing ${gc(s)}`}
                >
                  {s}
                  {!DEFAULT_SUBJECTS.includes(s) && <button onClick={() => removeSubject(s)} className="hover:text-red-500"><X className="w-3 h-3" /></button>}
                </span>
              ))}
            </div>
          </div>

          {/* Room Management */}
          <div className="mt-5 pt-5 border-t border-surface-100">
            <h3 className="text-sm font-extrabold text-surface-900 mb-3 flex items-center gap-2"><BookOpen className="w-4 h-4 text-orange-500" /> Rooms & Labs</h3>
            <div className="flex gap-2 mb-3">
              <input type="text" value={newRoom} onChange={e => setNewRoom(e.target.value)} onKeyDown={e => e.key === 'Enter' && addRoom()} placeholder="Add custom room..." className="flex-1 px-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-orange-400" />
              <button onClick={addRoom} className="px-4 py-2.5 bg-orange-600 text-white rounded-xl text-sm font-bold hover:bg-orange-700">Add</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {rooms.map(r => (
                <span 
                  key={r} 
                  draggable 
                  onDragStart={(e) => handleDragStart(e, 'room', r)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border bg-orange-50 text-orange-700 border-orange-200 cursor-grab active:cursor-grabbing"
                >
                  {r}
                  <button onClick={() => removeRoom(r)} className="hover:text-red-500"><X className="w-3 h-3" /></button>
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

      {/* Advanced Timetable Controls */}
      <div className="mb-6 animate-fade-in">
        {/* Bell Timings Editor */}
        <div className="bg-white rounded-[24px] border border-surface-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-extrabold text-surface-900 flex items-center gap-2"><Clock className="w-4 h-4 text-violet-500" /> Bell Timings</h3>
              <p className="text-xs text-surface-500 mt-1">Set period start and end times for printing.</p>
            </div>
            <button onClick={() => setShowBellTimings(!showBellTimings)} className={`text-xs font-bold px-4 py-2 rounded-xl transition-all ${showBellTimings ? 'bg-violet-100 text-violet-700' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'}`}>
              {showBellTimings ? 'Hide Editor' : 'Edit Timings'}
            </button>
          </div>
          {showBellTimings && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-4 border-t border-surface-100">
              {PERIODS.map(p => (
                <div key={p} className="flex items-center gap-2 bg-surface-50 rounded-xl px-3 py-2.5 border border-surface-100">
                  <span className="text-xs font-bold text-surface-600 w-16 truncate">{p}</span>
                  <input type="time" value={bellTimings[p]?.start || ''} onChange={e => setBellTimings(prev => ({ ...prev, [p]: { ...prev[p], start: e.target.value } }))} className="text-xs font-bold bg-white border border-surface-200 rounded-lg px-2 py-1.5 w-[85px] focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all" />
                  <span className="text-[10px] font-bold text-surface-400">to</span>
                  <input type="time" value={bellTimings[p]?.end || ''} onChange={e => setBellTimings(prev => ({ ...prev, [p]: { ...prev[p], end: e.target.value } }))} className="text-xs font-bold bg-white border border-surface-200 rounded-lg px-2 py-1.5 w-[85px] focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all" />
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Timetable Grid */}
      <div ref={tableRef} className="bg-white rounded-[28px] border border-surface-200 shadow-sm overflow-hidden">
        
        {/* Desktop View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr>
                <th className="p-4 text-left text-xs font-black uppercase tracking-widest text-surface-400 bg-surface-50 w-[100px]">Period</th>
                {activeDays.map((d, i) => {
                  // Clash detection for this day
                  const dayClashes = [];
                  PERIODS.forEach(p => {
                    const cell = grid[d]?.[p];
                    if (!cell) return;
                    const teachers_in_period = [];
                    if (cell.isSplit && cell.groups) cell.groups.forEach(g => { if (g.teacher) teachers_in_period.push(g.teacher); });
                    else if (cell.teacher) teachers_in_period.push(cell.teacher);
                    
                    teachers_in_period.forEach(t => {
                      (cloudTimetables || []).forEach(tb => {
                        if (tb.id === currentTimetableId) return;
                        const otherCell = tb.grid?.[d]?.[p];
                        if (!otherCell) return;
                        const otherTeachers = [];
                        if (otherCell.isSplit && otherCell.groups) otherCell.groups.forEach(g => { if (g.teacher) otherTeachers.push(g.teacher); });
                        else if (otherCell.teacher) otherTeachers.push(otherCell.teacher);
                        if (otherTeachers.includes(t)) dayClashes.push({ period: p, teacher: t, otherClass: tb.className });
                      });
                    });
                  });
                  return (
                    <th key={d} className="p-4 text-center text-xs font-black uppercase tracking-widest text-surface-500 bg-surface-50 relative">
                      {d}
                      {dayClashes.length > 0 && (
                        <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[8px] font-black flex items-center justify-center animate-pulse" title={`${dayClashes.length} clash(es): ${dayClashes.map(c => `${c.teacher} (${c.period} - ${c.otherClass})`).join(', ')}`}>
                          {dayClashes.length}
                        </span>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {PERIODS.map((period, pi) => (
                <tr key={period} className={`${pi % 2 === 0 ? '' : 'bg-surface-50/30'} border-t border-surface-100`}>
                  <td className="p-3 text-xs font-bold text-surface-500 whitespace-nowrap">
                    <div>{period}</div>
                    {bellTimings[period] && (
                      <div className="text-[9px] text-surface-400 font-medium mt-0.5">{bellTimings[period].start} - {bellTimings[period].end}</div>
                    )}
                  </td>
                  {activeDays.map(day => {
                    const cell = grid[day]?.[period] || {}
                    const isEd = editing === `${day}-${period}`
                    const isAbsent = cell.teacher && isAbsentOnDay(cell.teacher, day)
                    return (
                      <td 
                        key={`${day}-${period}`} 
                        className={`p-1.5 text-center relative group ${cell.isLocked ? 'bg-surface-100 opacity-80' : ''}`} 
                        onClick={() => { if (!isEd && !cell.isLocked) { setEditing(`${day}-${period}`); setShowAllTeachers(false); } }}
                        onDragOver={(e) => { if (!cell.isLocked) handleDragOver(e); }}
                        onDrop={(e) => { if (!cell.isLocked) handleDropOnCell(e, day, period); }}
                      >
                        {isEd && (
                          <div className="absolute inset-0 z-20 bg-white border-2 border-indigo-400 rounded-xl shadow-xl p-2 flex flex-col gap-1 max-h-[320px] overflow-y-auto" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-2 px-1">
                              <span className="text-[10px] font-black text-surface-400 uppercase">{day} - {period}</span>
                              <div className="flex items-center gap-2">
                                {!cell.isSplit && <button onClick={() => splitCell(day, period)} className="text-[9px] font-bold text-indigo-500 bg-indigo-50 px-2 py-1 rounded">Split</button>}
                                {cell.isSplit && <button onClick={() => mergeCell(day, period)} className="text-[9px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded">Merge</button>}
                                <button onClick={() => setEditing(null)}><X className="w-3.5 h-3.5 text-surface-400" /></button>
                              </div>
                            </div>
                            
                            {(!cell.isSplit ? [{id: null, subject: cell.subject, teacher: cell.teacher}] : cell.groups).map((group, gIdx) => {
                              const gId = group.id;
                              return (
                                <div key={gId || 'main'} className="mb-3 border-b border-surface-100 pb-3 last:border-0 last:pb-0">
                                  {cell.isSplit && (
                                    <div className="flex items-center gap-2 mb-2">
                                      <input value={group.groupName} onChange={e => updateGroupName(day, period, gId, e.target.value)} className="text-[10px] font-bold bg-surface-50 border rounded px-1.5 py-0.5 w-full max-w-[100px] outline-none focus:border-indigo-400" />
                                      <button onClick={() => removeGroup(day, period, gId)} className="text-red-500 p-0.5 bg-red-50 rounded hover:bg-red-100"><X className="w-3 h-3" /></button>
                                    </div>
                                  )}
                                  <span className="text-[9px] font-bold text-surface-400 px-1 mt-1 flex">SUBJECT</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {subjects.map(s => (
                                      <button key={s} onClick={() => setCell(day, period, s, gId)} className={`px-2 py-1 rounded text-[10px] font-bold text-left border ${group.subject === s ? 'ring-2 ring-indigo-400' : ''} ${gc(s)} hover:opacity-80`}>{s}</button>
                                    ))}
                                  </div>
                                  
                                  <div className="flex items-center justify-between px-1 mt-2 mb-1">
                                    <span className="text-[9px] font-bold text-surface-400">TEACHER</span>
                                    <div className="flex items-center gap-2">
                                      <button onClick={() => setShowFreeOnly(!showFreeOnly)} className={`text-[9px] font-bold px-1.5 py-0.5 rounded transition-all ${showFreeOnly ? 'bg-emerald-100 text-emerald-700' : 'text-emerald-600 hover:bg-emerald-50'}`}>
                                        {showFreeOnly ? 'Showing Free' : 'Find Free'}
                                      </button>
                                      {group.subject && (
                                        <button onClick={() => setShowAllTeachers(!showAllTeachers)} className="text-[9px] text-indigo-500 font-bold hover:underline">
                                          {showAllTeachers ? 'Hide Unrelated' : 'Show All'}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {[...teachers].filter(t => {
                                      if (showFreeOnly && !getFreeTeachers(day, period).includes(t)) return false;
                                      if (!group.subject || showAllTeachers || (teacherSubjects[t] || []).includes(group.subject)) return true;
                                      return false;
                                    }).sort((a,b) => {
                                      const aMatch = group.subject && (teacherSubjects[a] || []).includes(group.subject) ? -1 : 1
                                      const bMatch = group.subject && (teacherSubjects[b] || []).includes(group.subject) ? -1 : 1
                                      return aMatch - bMatch
                                    }).map(t => {
                                      const isMatch = group.subject && (teacherSubjects[t] || []).includes(group.subject)
                                      return (
                                        <button key={t} onClick={() => setCellTeacher(day, period, t, gId)} className={`px-2 py-1 rounded text-[10px] font-bold text-left border ${group.teacher === t ? 'ring-2 ring-indigo-400' : ''} ${isAbsentOnDay(t, day) ? 'bg-red-50 text-red-400 border-red-200 line-through' : onBreak.includes(t) ? 'bg-amber-50 text-amber-600 border-amber-200' : isMatch ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-sm' : 'bg-white text-surface-700 border-surface-200 hover:bg-indigo-50'}`}>{t} {isMatch && '✨'}</button>
                                      )
                                    })}
                                  </div>
                                  <div className="flex items-center justify-between px-1 mt-2 mb-1">
                                    <span className="text-[9px] font-bold text-surface-400">ROOM</span>
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {rooms.map(r => (
                                      <button key={r} onClick={() => setRoom(day, period, group.room === r ? '' : r, gId)} className={`px-2 py-1 rounded text-[10px] font-bold border ${group.room === r ? 'bg-orange-100 text-orange-700 border-orange-300 ring-1 ring-orange-400' : 'bg-white text-surface-600 border-surface-200 hover:bg-orange-50'}`}>{r}</button>
                                    ))}
                                  </div>
                                  <div className="mt-2 flex justify-end">
                                    <button onClick={() => { setCell(day, period, '', gId); setCellTeacher(day, period, '', gId); setRoom(day, period, '', gId); }} className="px-2 py-1 rounded text-[9px] font-bold text-red-500 border border-red-200 bg-red-50 hover:bg-red-100">Clear</button>
                                  </div>
                                </div>
                              )
                            })}
                            {cell.isSplit && <button onClick={() => addGroup(day, period)} className="text-[9px] font-bold text-surface-600 bg-surface-100 hover:bg-surface-200 w-full py-1.5 rounded-lg mt-1">+ Add Group</button>}
                          </div>
                        )}
                        {cell.isSplit && cell.groups && cell.groups.length > 0 ? (
                          <div className={`px-1 py-1 rounded-xl cursor-pointer transition-all border min-h-[52px] flex flex-col gap-1 border-surface-200 bg-surface-50 hover:border-surface-300`}>
                            {cell.groups.map(g => (
                              <div key={g.id} className={`px-1.5 py-1 rounded-lg text-[9px] flex flex-col items-center justify-center border ${g.subject ? gc(g.subject) : 'border-dashed border-surface-300 bg-white text-surface-400'}`}>
                                <div className="font-black text-surface-500 mb-0.5 opacity-80 uppercase tracking-wider text-[8px]">{g.groupName}</div>
                                {g.subject ? (
                                  <>
                                    <span className="font-bold">{g.subject}</span>
                                    {g.teacher && <span className={`text-[8px] font-bold mt-0.5 ${g.teacher && isAbsentOnDay(g.teacher, day) ? 'line-through text-red-400' : 'text-surface-700'}`}>{g.teacher}</span>}
                                    {g.substitute && (
                                      <button onClick={e => { e.stopPropagation(); setSubModal({ day, period, groupId: g.id }) }} className="text-[8px] font-bold text-red-600 bg-red-100 px-1 py-0.5 mt-0.5 rounded hover:bg-red-200 cursor-pointer transition-colors" title="Click to change substitute">
                                        Sub: {g.substitute} ✎
                                      </button>
                                    )}
                                    {g.teacher && isAbsentOnDay(g.teacher, day) && !g.substitute && (
                                      <button onClick={e => { e.stopPropagation(); setSubModal({ day, period, groupId: g.id }) }} className="text-[8px] font-bold text-white bg-red-500 px-1.5 py-0.5 rounded-full mt-0.5 animate-pulse">Assign Sub</button>
                                    )}
                                  </>
                                ) : '+'}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className={`px-2 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all border min-h-[52px] flex flex-col items-center justify-center gap-0.5 relative ${cell.subject ? gc(cell.subject) : 'border-dashed border-surface-200 text-surface-300 hover:border-surface-400'}`}>
                            <button onClick={(e) => toggleLock(e, day, period)} className={`absolute top-1 right-1 p-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity ${cell.isLocked ? 'opacity-100 text-red-500 bg-red-100' : 'text-surface-400 hover:bg-surface-100'}`} title={cell.isLocked ? 'Unlock Cell' : 'Lock Cell'}>
                              {cell.isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                            </button>
                            {cell.subject ? (
                              <>
                                <span>{cell.subject}</span>
                                {cell.teacher && (
                                  <span className={`text-xs mt-0.5 font-bold ${isAbsent ? 'line-through text-red-400' : 'text-surface-700'}`}>{cell.teacher}</span>
                                )}
                                {cell.substitute && (
                                  <div className="flex items-center justify-center gap-1 mt-0.5">
                                    <button onClick={e => { e.stopPropagation(); setSubModal({ day, period }) }} className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded hover:bg-red-200 cursor-pointer transition-colors" title="Click to change substitute">
                                      Sub: {cell.substitute} ✎
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); notifySub(cell.substitute, day, period, cell.subject, cell.teacher) }} className="p-0.5 bg-green-100 text-green-700 hover:bg-green-200 rounded" title="Notify via WhatsApp">
                                      <MessageCircle className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                                {cell.room && (
                                  <div className="mt-0.5 flex justify-center">
                                    <span className="text-[9px] font-bold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded border border-orange-200 truncate max-w-[80px]" title={cell.room}>
                                      {cell.room}
                                    </span>
                                    {isEd && <button onClick={(e) => { e.stopPropagation(); setGrid(p => ({ ...p, [day]: { ...p[day], [period]: { ...p[day][period], room: '' } } })) }} className="ml-1 text-orange-400 hover:text-red-500"><X className="w-3 h-3" /></button>}
                                  </div>
                                )}
                                {isAbsent && !cell.substitute && (
                                  <button onClick={e => { e.stopPropagation(); setSubModal({ day, period }) }} className="text-[9px] font-bold text-white bg-red-500 px-2 py-0.5 rounded-full mt-0.5 hover:bg-red-600 animate-pulse">
                                    Assign Sub
                                  </button>
                                )}
                              </>
                            ) : '+'}
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="lg:hidden flex flex-col divide-y divide-surface-100">
          {activeDays.map(day => (
            <div key={day} className="bg-white">
              <button 
                onClick={() => setExpandedDay(expandedDay === day ? null : day)}
                className="w-full p-4 flex items-center justify-between font-black text-surface-900 bg-surface-50 hover:bg-surface-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <CalendarDays className="w-5 h-5 text-emerald-500" />
                  <span className="text-base uppercase tracking-widest">{day}</span>
                </div>
                <ChevronDown className={`w-5 h-5 text-surface-400 transition-transform ${expandedDay === day ? 'rotate-180' : ''}`} />
              </button>
              
              {expandedDay === day && (
                <div className="divide-y divide-surface-100">
                  {PERIODS.map(period => {
                    const cell = grid[day]?.[period] || {}
                    const isAbsent = cell.teacher && isAbsentOnDay(cell.teacher, day)
                    const isEd = editing === `${day}-${period}`
                    
                    return (
                      <div key={period} className="relative p-4 flex flex-col">
                        <div 
                          className="flex items-center justify-between cursor-pointer group"
                          onClick={() => { if (!isEd) { setEditing(`${day}-${period}`); setShowAllTeachers(false); } }}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDropOnCell(e, day, period)}
                        >
                          <div className="w-[80px] shrink-0 font-bold text-surface-500 text-xs uppercase tracking-wider">{period}</div>
                          <div className="flex-1 flex justify-end">
                            {cell.isSplit && cell.groups && cell.groups.length > 0 ? (
                              <div className="flex flex-col gap-1 w-full max-w-[200px]">
                                {cell.groups.map(g => (
                                  <div key={g.id} className="inline-flex flex-col items-end text-right border-b border-surface-100 pb-1 last:border-0 last:pb-0">
                                    <span className="text-[10px] font-black text-surface-400 uppercase tracking-widest">{g.groupName}</span>
                                    {g.subject ? (
                                      <>
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-lg border mt-0.5 ${gc(g.subject)}`}>{g.subject}</span>
                                        {g.teacher && <span className={`text-[10px] mt-0.5 font-black ${g.teacher && isAbsentOnDay(g.teacher, day) ? 'line-through text-red-400' : 'text-surface-700'}`}>{g.teacher}</span>}
                                        {g.substitute && (
                                          <button onClick={e => { e.stopPropagation(); setSubModal({ day, period, groupId: g.id }) }} className="text-[9px] font-bold text-red-600 bg-red-100 px-1 py-0.5 rounded mt-0.5 hover:bg-red-200 cursor-pointer" title="Click to change">
                                            Sub: {g.substitute} ✎
                                          </button>
                                        )}
                                        {g.teacher && isAbsentOnDay(g.teacher, day) && !g.substitute && (
                                          <button onClick={e => { e.stopPropagation(); setSubModal({ day, period, groupId: g.id }) }} className="text-[9px] font-bold text-white bg-red-500 px-2 py-0.5 rounded-full mt-0.5 animate-pulse">Assign Sub</button>
                                        )}
                                      </>
                                    ) : <span className="text-xs font-bold text-surface-400">+ Assign</span>}
                                  </div>
                                ))}
                              </div>
                            ) : cell.subject ? (
                              <div className="inline-flex flex-col items-end text-right">
                                <span className={`text-sm font-bold px-3 py-1 rounded-lg border ${gc(cell.subject)}`}>{cell.subject}</span>
                                {cell.teacher && <span className={`text-sm mt-1.5 font-black ${isAbsent ? 'line-through text-red-400' : 'text-surface-700'}`}>{cell.teacher}</span>}
                                {cell.substitute && (
                                  <div className="flex items-center justify-end gap-1.5 mt-1">
                                    <button onClick={e => { e.stopPropagation(); setSubModal({ day, period }) }} className="text-[11px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded hover:bg-red-200 cursor-pointer" title="Click to change substitute">
                                      Sub: {cell.substitute} ✎
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); notifySub(cell.substitute, day, period, cell.subject, cell.teacher) }} className="p-1 bg-green-100 text-green-700 hover:bg-green-200 rounded-md shadow-sm" title="Notify via WhatsApp">
                                      <MessageCircle className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                                {cell.room && (
                                  <div className="flex items-center justify-end mt-1">
                                    <span className="text-[10px] font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded border border-orange-200">
                                      {cell.room}
                                    </span>
                                  </div>
                                )}
                                {isAbsent && !cell.substitute && (
                                  <button onClick={e => { e.stopPropagation(); setSubModal({ day, period }) }} className="text-[10px] font-bold text-white bg-red-500 px-2 py-1 rounded-full mt-1.5 animate-pulse">Assign Sub</button>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs font-bold text-surface-400 group-hover:text-surface-600 border border-dashed border-surface-300 px-4 py-2 rounded-xl transition-colors">+ Assign</span>
                            )}
                          </div>
                        </div>
                        
                        {/* Edit Dropdown for Mobile */}
                        {isEd && (
                          <div className="mt-4 bg-surface-50 border-2 border-indigo-400 rounded-2xl p-3 shadow-inner flex flex-col gap-2 max-h-[400px] overflow-y-auto">
                            <div className="flex items-center justify-between mb-2 px-1">
                              <span className="text-[11px] font-black text-surface-500 uppercase">Edit {period}</span>
                              <div className="flex items-center gap-2">
                                {!cell.isSplit && <button onClick={() => splitCell(day, period)} className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-1 rounded">Split</button>}
                                {cell.isSplit && <button onClick={() => mergeCell(day, period)} className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded">Merge</button>}
                                <button onClick={() => setEditing(null)} className="p-1 bg-surface-200 rounded-full"><X className="w-4 h-4 text-surface-600" /></button>
                              </div>
                            </div>

                            {(!cell.isSplit ? [{id: null, subject: cell.subject, teacher: cell.teacher}] : cell.groups).map((group, gIdx) => {
                              const gId = group.id;
                              return (
                                <div key={gId || 'main'} className="mb-4 border-b border-surface-200 pb-4 last:border-0 last:pb-0">
                                  {cell.isSplit && (
                                    <div className="flex items-center gap-2 mb-3">
                                      <input value={group.groupName} onChange={e => updateGroupName(day, period, gId, e.target.value)} className="text-[11px] font-bold bg-white border rounded-lg px-2 py-1.5 w-full outline-none focus:border-indigo-400" />
                                      <button onClick={() => removeGroup(day, period, gId)} className="text-red-500 p-1.5 bg-red-50 rounded-lg hover:bg-red-100"><X className="w-4 h-4" /></button>
                                    </div>
                                  )}
                                  <span className="text-[10px] font-bold text-surface-400 px-1 mt-1">SUBJECT</span>
                                  <div className="grid grid-cols-2 gap-2 mt-1">
                                    {subjects.map(s => (
                                      <button key={s} onClick={() => setCell(day, period, s, gId)} className={`px-3 py-2 rounded-xl text-xs font-bold text-left border ${group.subject === s ? 'ring-2 ring-indigo-400' : ''} ${gc(s)}`}>{s}</button>
                                    ))}
                                  </div>
                                  <div className="flex items-center justify-between px-1 mt-4 mb-1">
                                    <span className="text-[10px] font-bold text-surface-400">TEACHER</span>
                                    {group.subject && (
                                      <button onClick={() => setShowAllTeachers(!showAllTeachers)} className="text-[10px] text-indigo-500 font-bold hover:underline">
                                        {showAllTeachers ? 'Hide Unrelated' : 'Show All'}
                                      </button>
                                    )}
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    {[...teachers].filter(t => !group.subject || showAllTeachers || (teacherSubjects[t] || []).includes(group.subject)).sort((a,b) => {
                                      const aMatch = group.subject && (teacherSubjects[a] || []).includes(group.subject) ? -1 : 1
                                      const bMatch = group.subject && (teacherSubjects[b] || []).includes(group.subject) ? -1 : 1
                                      return aMatch - bMatch
                                    }).map(t => {
                                      const isMatch = group.subject && (teacherSubjects[t] || []).includes(group.subject)
                                      return (
                                        <button key={t} onClick={() => setCellTeacher(day, period, t, gId)} className={`px-3 py-2 rounded-xl text-xs font-bold text-left border ${group.teacher === t ? 'ring-2 ring-indigo-400' : ''} ${isAbsentOnDay(t, day) ? 'bg-red-50 text-red-400 border-red-200 line-through' : onBreak.includes(t) ? 'bg-amber-50 text-amber-600 border-amber-200' : isMatch ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-sm' : 'bg-white text-surface-700 border-surface-200 hover:bg-indigo-50'}`}>{t} {isMatch && '✨'}</button>
                                      )
                                    })}
                                  </div>
                                  <div className="flex items-center justify-between px-1 mt-4 mb-1">
                                    <span className="text-[10px] font-bold text-surface-400">ROOM</span>
                                  </div>
                                  <div className="grid grid-cols-3 gap-2 mt-1">
                                    {rooms.map(r => (
                                      <button key={r} onClick={() => setRoom(day, period, group.room === r ? '' : r, gId)} className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border ${group.room === r ? 'bg-orange-100 text-orange-700 border-orange-300 ring-1 ring-orange-400' : 'bg-white text-surface-600 border-surface-200 hover:bg-orange-50'}`}>{r}</button>
                                    ))}
                                  </div>
                                  <button onClick={() => { setCell(day, period, '', gId); setCellTeacher(day, period, '', gId); setRoom(day, period, '', gId); }} className="w-full mt-3 px-3 py-2 rounded-xl text-xs font-bold text-red-600 border border-red-200 bg-red-50 hover:bg-red-100">Clear Assignment</button>
                                </div>
                              )
                            })}
                            {cell.isSplit && <button onClick={() => addGroup(day, period)} className="text-[10px] font-bold text-surface-600 bg-surface-200 hover:bg-surface-300 w-full py-2.5 rounded-xl mt-2">+ Add Group</button>}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
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
                const subj = grid[subModal.day]?.[subModal.period]?.subject || (grid[subModal.day]?.[subModal.period]?.groups?.find(g => g.id === subModal.groupId)?.subject)
                const teachersInCurrentClass = new Set();
                ALL_DAYS.forEach(d => PERIODS.forEach(p => {
                  const c = grid[d]?.[p];
                  if (c?.isSplit && c.groups) c.groups.forEach(g => { if (g.teacher) teachersInCurrentClass.add(g.teacher) });
                  else if (c?.teacher) teachersInCurrentClass.add(c.teacher);
                }));

                const avail = getAvailable(subModal.day).sort((a, b) => {
                  const aMatch = (teacherSubjects[a] || []).includes(subj) ? 0 : 1
                  const bMatch = (teacherSubjects[b] || []).includes(subj) ? 0 : 1
                  if (aMatch !== bMatch) return aMatch - bMatch
                  const aInClass = teachersInCurrentClass.has(a) ? 0 : 1;
                  const bInClass = teachersInCurrentClass.has(b) ? 0 : 1;
                  return aInClass - bInClass
                })
                return avail.length > 0 ? avail.map(t => {
                  const teachesSubj = (teacherSubjects[t] || []).includes(subj)
                  const isInClass = teachersInCurrentClass.has(t)
                  return (
                    <button key={t} onClick={() => setSubstitute(subModal.day, subModal.period, t, subModal.groupId)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${teachesSubj ? 'border-emerald-300 bg-emerald-50 hover:bg-emerald-100' : isInClass ? 'border-blue-200 bg-blue-50/50 hover:bg-blue-100' : 'border-surface-200 hover:border-surface-300 hover:bg-surface-50'}`}>
                      <UserCheck className={`w-4 h-4 shrink-0 ${teachesSubj ? 'text-emerald-600' : isInClass ? 'text-blue-600' : 'text-surface-400'}`} />
                      <div className="flex-1">
                        <span className="text-sm font-bold text-surface-800">{t}</span>
                        {teachesSubj && <span className="ml-2 text-[10px] font-bold bg-emerald-200 text-emerald-700 px-1.5 py-0.5 rounded">Teaches {subj}</span>}
                        {isInClass && !teachesSubj && <span className="ml-2 text-[10px] font-bold bg-blue-200 text-blue-700 px-1.5 py-0.5 rounded">Same Class</span>}
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
              <button onClick={() => setSubstitute(subModal.day, subModal.period, '', subModal.groupId)} className="w-full mt-3 py-2.5 bg-red-50 text-red-600 font-bold rounded-xl text-sm border border-red-200 hover:bg-red-100">
                Remove Current Substitute
              </button>
            )}
          </div>
        </div>
      )}

      {/* School-Wide Substitute Panel */}
      {isSubPanelOpen && (() => {
        // Always show ALL days where ANY teacher is absent - not filtered by subAssignDay
        const allAbsentDays = new Set();
        getAbsentTeacherNames().forEach(t => { (absentTeachers[t] || []).forEach(d => allAbsentDays.add(d)); });
        const daysToShow = activeDays.filter(d => allAbsentDays.has(d));
        if (daysToShow.length === 0) { return <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setIsSubPanelOpen(false)}><div className="bg-white rounded-[28px] shadow-2xl p-12 text-center" onClick={e => e.stopPropagation()}><UserX className="w-16 h-16 mx-auto mb-4 text-surface-300" /><p className="text-lg font-bold text-surface-700">No absent teachers found</p><button onClick={() => setIsSubPanelOpen(false)} className="mt-4 px-6 py-2 bg-surface-100 rounded-xl font-bold text-sm hover:bg-surface-200">Close</button></div></div>; }
        const sName = schoolName || 'Unassigned School';
        const schoolTbs = cloudTimetables.filter(tb => (tb.schoolName || 'Unassigned School') === sName).map(tb => {
          if (tb.id === currentTimetableId) return { ...tb, grid, className };
          return tb;
        });
        if (!schoolTbs.find(tb => tb.id === currentTimetableId)) {
          schoolTbs.push({ id: currentTimetableId || 'current', className, grid, schoolName: sName });
        }

        const allAffected = [];
        daysToShow.forEach(day => {
          const absentees = getAbsentTeacherNames().filter(t => isAbsentOnDay(t, day));
          schoolTbs.forEach(tb => {
            const g = tb.grid || {};
            PERIODS.forEach(p => {
              if (p === 'Lunch') return;
              const cell = g[day]?.[p];
              if (!cell) return;
              if (cell.isSplit && cell.groups) {
                cell.groups.forEach(group => {
                  if (group.teacher && absentees.includes(group.teacher)) {
                    allAffected.push({ day, tbId: tb.id, className: tb.className, period: p, teacher: group.teacher, subject: group.subject, substitute: group.substitute || '', isCurrent: tb.id === currentTimetableId });
                  }
                });
              } else {
                if (cell.teacher && absentees.includes(cell.teacher)) {
                  allAffected.push({ day, tbId: tb.id, className: tb.className, period: p, teacher: cell.teacher, subject: cell.subject, substitute: cell.substitute || '', isCurrent: tb.id === currentTimetableId });
                }
              }
            });
          });
        });

        const byTeacher = allAffected.reduce((acc, item) => {
          if (!acc[item.teacher]) acc[item.teacher] = [];
          acc[item.teacher].push(item);
          return acc;
        }, {});

        const totalAffected = allAffected.length;
        const totalAssigned = allAffected.filter(a => a.substitute).length;

        const handleSchoolWideAutoAssign = async () => {
          try {
            const modifiedTbs = {};
            const busyMap = {};
            const getBKey = (d, p) => `${d}|||${p}`;

            // Build initial busy map from ALL timetables
            schoolTbs.forEach(tb => {
              const g = tb.grid || {};
              ALL_DAYS.forEach(d => {
                PERIODS.forEach(p => {
                  const key = getBKey(d, p);
                  if (!busyMap[key]) busyMap[key] = new Set();
                  const cell = g[d]?.[p];
                  if (!cell) return;
                  if (cell.isSplit && cell.groups) {
                    cell.groups.forEach(gr => { if (gr.teacher) busyMap[key].add(gr.teacher); if (gr.substitute) busyMap[key].add(gr.substitute); });
                  } else {
                    if (cell.teacher) busyMap[key].add(cell.teacher);
                    if (cell.substitute) busyMap[key].add(cell.substitute);
                  }
                });
              });
            });

            const subCount = {};
            let assignedCount = 0;

            allAffected.filter(a => !a.substitute).forEach(item => {
              const busy = busyMap[getBKey(item.day, item.period)] || new Set();
              const free = teachers.filter(t => {
                if (busy.has(t) || t === item.teacher) return false;
                if (!isAbsentOnDay(t, item.day) === false && isAbsentAnyDay(t)) return false;
                if (isAbsentOnDay(t, item.day)) return false;
                if (onBreak.includes(t)) return false;
                return true;
              });

              if (free.length > 0) {
                free.sort((a, b) => {
                  const aMatch = (teacherSubjects[a] || []).includes(item.subject) ? 0 : 1;
                  const bMatch = (teacherSubjects[b] || []).includes(item.subject) ? 0 : 1;
                  if (aMatch !== bMatch) return aMatch - bMatch;
                  return (subCount[a] || 0) - (subCount[b] || 0);
                });
                const chosen = free[0];
                subCount[chosen] = (subCount[chosen] || 0) + 1;
                busyMap[getBKey(item.day, item.period)].add(chosen);

                // Apply to the right timetable
                const tb = schoolTbs.find(t => t.id === item.tbId);
                if (tb) {
                  if (!modifiedTbs[item.tbId]) modifiedTbs[item.tbId] = JSON.parse(JSON.stringify(tb.grid));
                  const cell = modifiedTbs[item.tbId][item.day]?.[item.period];
                  if (cell) {
                    if (cell.isSplit && cell.groups) {
                      const g = cell.groups.find(gr => gr.teacher === item.teacher);
                      if (g) g.substitute = chosen;
                    } else {
                      cell.substitute = chosen;
                    }
                  }
                  assignedCount++;
                }
              }
            });

            // Save modified timetables
            for (const [tbId, modGrid] of Object.entries(modifiedTbs)) {
              if (tbId === currentTimetableId || tbId === 'current') {
                setGrid(modGrid);
              } else if (currentUser) {
                try { await updateDoc(doc(db, 'timetables', tbId), { grid: modGrid }); } catch (e) { console.error('Save error:', e); }
              }
            }

            if (assignedCount > 0) {
              await loadTimetables();
              alert(`✅ ${assignedCount} substitutes assigned across all classes!`);
            } else {
              alert('No free teachers available for the remaining periods.');
            }
          } catch (err) {
            console.error(err);
            alert('Error: ' + err.message);
          }
        };

        return (
          <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setIsSubPanelOpen(false)}>
            <div className="bg-white rounded-[28px] shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-surface-100">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xl font-extrabold text-surface-900 flex items-center gap-2">{'\ud83c\udfeb'} School-Wide Substitute Panel</h3>
                  <button onClick={() => setIsSubPanelOpen(false)} className="p-2 hover:bg-surface-100 rounded-xl"><X className="w-5 h-5 text-surface-500" /></button>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="font-bold text-surface-500">{totalAffected} periods affected</span>
                  <span className="font-bold text-emerald-600">{totalAssigned} covered</span>
                  <span className="font-bold text-red-600">{totalAffected - totalAssigned} pending</span>
                  <div className="ml-auto flex items-center gap-2">
                    <button onClick={handleSchoolWideAutoAssign} className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl text-sm hover:bg-indigo-700 transition-colors">
                      {'\u26a1'} Auto-Assign All Classes
                    </button>
                    <button onClick={() => { setReportSelectedDays([...activeDays]); setIsReportModalOpen(true) }} className="px-4 py-2 bg-surface-100 text-surface-700 font-bold rounded-xl text-sm hover:bg-surface-200 transition-colors flex items-center gap-1">
                      <Printer className="w-4 h-4" /> Reports & Download
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {Object.keys(byTeacher).length === 0 ? (
                  <div className="text-center py-12 text-surface-400">
                    <UserX className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="font-bold">No absent teachers for the selected day</p>
                  </div>
                ) : Object.entries(byTeacher).map(([teacher, items]) => {
                  const covered = items.filter(i => i.substitute).length;
                  return (
                    <div key={teacher} className="border border-surface-200 rounded-2xl overflow-hidden">
                      <div className="bg-surface-900 text-white px-5 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <UserX className="w-5 h-5 text-red-400" />
                          <span className="font-bold text-lg">{teacher}</span>
                          <span className="text-xs opacity-70 bg-white/10 px-2 py-0.5 rounded-full">{(absentTeachers[teacher] || []).map(d => d.slice(0,3)).join(', ')}</span>
                        </div>
                        <span className={`text-sm font-bold px-3 py-1 rounded-full ${covered === items.length ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                          {covered}/{items.length} covered
                        </span>
                      </div>
                      <div className="divide-y divide-surface-100">
                        {items.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-4 px-5 py-3 hover:bg-surface-50 transition-colors">
                            <div className="w-20 text-xs font-bold text-surface-400">{item.day.slice(0,3)}</div>
                            <div className="w-28 text-sm font-bold text-surface-800">{item.className}</div>
                            <div className="w-20 text-sm text-surface-500">{item.period}</div>
                            <div className="flex-1 text-sm font-medium text-surface-600">{item.subject || '-'}</div>
                            <div className="w-40 text-right">
                              {item.substitute ? (
                                <span className="text-sm font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-lg border border-blue-200">{item.substitute}</span>
                              ) : (
                                <span className="text-sm font-bold text-red-500 italic">Pending</span>
                              )}
                            </div>
                            <div className="w-24 text-right">
                              {item.isCurrent ? (
                                <button onClick={() => { setIsSubPanelOpen(false); setSubModal({ day: item.day, period: item.period }); }} className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-200 transition-colors">
                                  {item.substitute ? 'Change' : 'Assign'}
                                </button>
                              ) : (
                                <button onClick={() => { const tb = cloudTimetables.find(t => t.id === item.tbId); if (tb) { handleLoadTimetable(tb); setIsSubPanelOpen(false); } }} className="text-xs font-bold text-surface-500 bg-surface-100 hover:bg-surface-200 px-3 py-1.5 rounded-lg border border-surface-200 transition-colors">
                                  Load Class
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Report Options Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setIsReportModalOpen(false)}>
          <div className="bg-white rounded-[28px] shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-surface-100">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-extrabold text-surface-900 flex items-center gap-2">{'\ud83d\udcca'} Download Reports</h3>
                <button onClick={() => setIsReportModalOpen(false)} className="p-2 hover:bg-surface-100 rounded-xl"><X className="w-5 h-5 text-surface-500" /></button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Day Selection */}
              <div>
                <label className="text-xs font-black text-surface-500 uppercase tracking-widest mb-2 block">Select Days for Report</label>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setReportSelectedDays(reportSelectedDays.length === activeDays.length ? [] : [...activeDays])} className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${reportSelectedDays.length === activeDays.length ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-surface-500 border-surface-200 hover:border-indigo-300'}`}>
                    {reportSelectedDays.length === activeDays.length ? '✓ All Days' : 'All Days'}
                  </button>
                  {activeDays.map(d => (
                    <button key={d} onClick={() => setReportSelectedDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])} className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${reportSelectedDays.includes(d) ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-white text-surface-500 border-surface-200 hover:border-indigo-300'}`}>
                      {d.slice(0, 3)}
                    </button>
                  ))}
                </div>
                {reportSelectedDays.length > 0 && <p className="text-[10px] text-surface-400 mt-1.5 font-medium">{reportSelectedDays.length} day{reportSelectedDays.length > 1 ? 's' : ''} selected</p>}
              </div>

              {/* Report Options */}
              <div className="space-y-3">
                <button onClick={() => { if (reportSelectedDays.length === 0) return alert('Select at least one day'); printMultiDayReport(reportSelectedDays); setIsReportModalOpen(false); }} className="w-full flex items-center gap-4 p-4 rounded-2xl border border-surface-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all group text-left">
                  <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center text-xl shrink-0 group-hover:bg-indigo-200 transition-colors">{'\ud83d\udcc4'}</div>
                  <div>
                    <p className="text-sm font-extrabold text-surface-900">Daily Substitute Report</p>
                    <p className="text-xs text-surface-500 mt-0.5">Day-wise absent teacher details, substitute assignments & status for selected days</p>
                  </div>
                </button>

                <button onClick={() => { printMonthlySummary(); setIsReportModalOpen(false); }} className="w-full flex items-center gap-4 p-4 rounded-2xl border border-surface-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all group text-left">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-xl shrink-0 group-hover:bg-emerald-200 transition-colors">{'\ud83d\udcca'}</div>
                  <div>
                    <p className="text-sm font-extrabold text-surface-900">Monthly Staff Summary</p>
                    <p className="text-xs text-surface-500 mt-0.5">Leave count, substitute duty count, regular workload & full staff overview across all classes</p>
                  </div>
                </button>

                <button onClick={() => { if (reportSelectedDays.length === 1) { setSubReportDay(reportSelectedDays[0]); printMasterSubReport(); } else { setSubReportDay(reportSelectedDays[0] || activeDays[0]); printMasterSubReport(); } setIsReportModalOpen(false); }} className="w-full flex items-center gap-4 p-4 rounded-2xl border border-surface-200 hover:border-amber-300 hover:bg-amber-50/50 transition-all group text-left">
                  <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-xl shrink-0 group-hover:bg-amber-200 transition-colors">{'\ud83d\udce8'}</div>
                  <div>
                    <p className="text-sm font-extrabold text-surface-900">Formal Duty Report (Single Day)</p>
                    <p className="text-xs text-surface-500 mt-0.5">Professional duty report with school header, signature blocks & summary cards for {reportSelectedDays[0] || 'selected day'}</p>
                  </div>
                </button>
              </div>
            </div>
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
              <div className="flex items-center gap-2">
                <button onClick={handleLoadDemoSchool} disabled={isSaving} className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors border border-indigo-200">
                  <Database className="w-4 h-4" /> Load Demo School
                </button>
                <button onClick={() => setIsCloudModalOpen(false)} className="p-2 hover:bg-surface-100 rounded-xl transition-colors"><X className="w-5 h-5 text-surface-500" /></button>
              </div>
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
                (() => {
                  const grouped = cloudTimetables.reduce((acc, tb) => {
                    const sn = tb.schoolName || 'Unassigned School';
                    if (!acc[sn]) acc[sn] = [];
                    acc[sn].push(tb);
                    return acc;
                  }, {});
                  
                  return Object.entries(grouped).map(([sName, tbs]) => (
                    <div key={sName} className="mb-6 bg-surface-50 p-4 rounded-[24px] border border-surface-200">
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 px-2">
                        <h4 className="text-lg font-black text-surface-900 flex items-center gap-2">
                          <BookOpen className="w-5 h-5 text-indigo-500" /> {sName} <span className="text-xs font-bold bg-white px-2 py-0.5 rounded-full text-indigo-600 border border-indigo-100">{tbs.length} Classes</span>
                        </h4>
                        <div className="flex flex-wrap items-center gap-2">
                          <button onClick={() => setIsSubReportModalOpen(true)} className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 border border-blue-200">
                            <Users className="w-3.5 h-3.5" /> Daily Subs Report
                          </button>
                          <button onClick={() => executeSchoolPrint(sName)} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 border border-emerald-200">
                            <Printer className="w-3.5 h-3.5" /> Download Full School
                          </button>
                          <button onClick={() => handleDeleteSchool(sName)} className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 border border-red-200">
                            <Trash2 className="w-3.5 h-3.5" /> Delete Full School
                          </button>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {tbs.map(tb => (
                          <div key={tb.id} className="p-4 rounded-[20px] border border-surface-200 hover:border-indigo-300 hover:shadow-soft hover:-translate-y-0.5 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-extrabold text-surface-900 text-lg truncate">{tb.className || 'Unnamed Class'}</h4>
                                {tb.updatedAt && <span className="text-[10px] font-bold text-surface-400 bg-surface-100 px-2 py-0.5 rounded-full whitespace-nowrap">{new Date(tb.updatedAt.toDate()).toLocaleDateString()}</span>}
                              </div>
                              {tb.details && <p className="text-xs text-surface-500 line-clamp-1">{tb.details}</p>}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                              <button onClick={() => handleDeleteTimetable(tb)} className="flex-1 sm:flex-none px-3 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 whitespace-nowrap transition-all flex items-center justify-center gap-1.5">
                                <Trash2 className="w-3.5 h-3.5" /> Delete
                              </button>
                              <button onClick={() => handleDuplicateTimetable(tb)} className="flex-1 sm:flex-none px-3 py-2 bg-surface-100 text-surface-700 rounded-xl text-xs font-bold hover:bg-surface-200 whitespace-nowrap transition-all flex items-center justify-center gap-1.5">
                                <Copy className="w-3.5 h-3.5" /> Duplicate
                              </button>
                              <button onClick={() => handleLoadTimetable(tb)} className="flex-1 sm:flex-none px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 whitespace-nowrap shadow-sm active:scale-[0.98] transition-all">
                                Load Schedule
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                })()
              )}
            </div>
          </div>
        </div>
      )}

      {/* Print Configuration Modal */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setIsPrintModalOpen(false)}>
          <div className="bg-white rounded-[28px] shadow-2xl p-6 sm:p-8 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-extrabold text-surface-900 flex items-center gap-2"><Printer className="w-6 h-6 text-emerald-500" /> Print Configuration</h3>
              <button onClick={() => setIsPrintModalOpen(false)} className="p-2 hover:bg-surface-100 rounded-xl transition-colors"><X className="w-5 h-5 text-surface-500" /></button>
            </div>
            
            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-xs font-bold text-surface-500 uppercase tracking-wider mb-1.5">School Name</label>
                <input type="text" value={schoolName} onChange={e => setSchoolName(e.target.value)} placeholder="e.g. Springfield High School" className="w-full px-4 py-3 bg-surface-50 border border-surface-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-emerald-400 focus:bg-white transition-colors" />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-surface-500 uppercase tracking-wider mb-1.5">Class</label>
                  <input type="text" value={className} onChange={e => setClassName(e.target.value)} className="w-full px-4 py-3 bg-surface-50 border border-surface-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-emerald-400 focus:bg-white transition-colors" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-surface-500 uppercase tracking-wider mb-1.5">Session</label>
                  <input type="text" value={session} onChange={e => setSession(e.target.value)} placeholder="e.g. 2026-2027" className="w-full px-4 py-3 bg-surface-50 border border-surface-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-emerald-400 focus:bg-white transition-colors" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-surface-500 uppercase tracking-wider mb-1.5">Class Teacher Name</label>
                <input type="text" value={classTeacher} onChange={e => setClassTeacher(e.target.value)} placeholder="e.g. Mr. Sharma" className="w-full px-4 py-3 bg-surface-50 border border-surface-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-emerald-400 focus:bg-white transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-bold text-surface-500 uppercase tracking-wider mb-1.5">Principal Name</label>
                <input type="text" value={principalName} onChange={e => setPrincipalName(e.target.value)} placeholder="e.g. Dr. A. Gupta" className="w-full px-4 py-3 bg-surface-50 border border-surface-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-emerald-400 focus:bg-white transition-colors" />
              </div>
            </div>
            
            <button onClick={executePrint} className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2">
              <Printer className="w-4 h-4" /> Generate Print
            </button>
          </div>
        </div>
      )}

      {/* Teacher View Modal */}
      {isTeacherModalOpen && (
        <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setIsTeacherModalOpen(false)}>
          <div className="bg-white rounded-[28px] shadow-2xl p-6 sm:p-8 w-full max-w-6xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 bg-surface-50 p-4 rounded-2xl border border-surface-200 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-fuchsia-100 text-fuchsia-600 rounded-full flex items-center justify-center shrink-0 shadow-inner">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-surface-900 font-display leading-tight">
                    Teacher Schedule
                  </h3>
                  <p className="text-sm text-surface-500 font-medium mb-1.5">Select a teacher to view and share their combined timetable</p>
                  <div className="flex items-start gap-2 text-amber-700 bg-amber-50 p-2 rounded-xl border border-amber-200 mt-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p className="text-xs font-semibold">Ensure you have created timetables for <strong>ALL classes</strong> so the teacher's schedule is fully complete!</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button onClick={() => setIsTeacherModalOpen(false)} className="p-2.5 hover:bg-surface-200 bg-white rounded-xl transition-colors border border-surface-200 shadow-sm"><X className="w-5 h-5 text-surface-500" /></button>
              </div>
            </div>
            
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3 bg-white p-2 rounded-2xl border border-surface-200 shadow-sm">
              <div className="flex-1 flex items-center gap-3 px-3">
                <div className="hidden sm:block text-surface-400"><Users className="w-5 h-5" /></div>
                <select 
                  value={selectedTeacherForView} 
                  onChange={(e) => setSelectedTeacherForView(e.target.value)}
                  className="flex-1 w-full py-3 bg-transparent border-none text-surface-900 text-base font-bold focus:outline-none focus:ring-0 cursor-pointer"
                >
                  <option value="" disabled>-- Select a Teacher --</option>
                  {allTeachersList.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              
              {selectedTeacherForView && (
                <div className="flex items-center gap-2 px-2 pb-2 sm:pb-0 sm:px-0">
                  <button onClick={exportTeacherICS} className="flex-1 sm:flex-none px-5 py-3 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-sm font-bold shadow-sm flex items-center justify-center gap-2 transition-all active:scale-95 border border-blue-200">
                    <CalendarDays className="w-4 h-4" /> <span className="sm:hidden lg:inline">Export .ics</span>
                  </button>
                  <button onClick={handleShareWhatsApp} className="flex-1 sm:flex-none px-5 py-3 bg-[#25D366] text-white hover:bg-[#128C7E] rounded-xl text-sm font-bold shadow-md flex items-center justify-center gap-2 transition-all active:scale-95">
                    <MessageCircle className="w-4 h-4" /> <span className="sm:hidden lg:inline">WhatsApp</span>
                  </button>
                  <button onClick={executeTeacherPrint} className="flex-1 sm:flex-none px-5 py-3 bg-surface-100 hover:bg-surface-200 text-surface-700 rounded-xl text-sm font-bold shadow-sm flex items-center justify-center gap-2 transition-all active:scale-95 border border-surface-200">
                    <Printer className="w-4 h-4" /> <span className="sm:hidden lg:inline">Print</span>
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar border border-surface-200 rounded-2xl bg-white relative">
              {!selectedTeacherForView ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-surface-400 p-8 text-center">
                  <User className="w-12 h-12 mb-3 text-surface-300" />
                  <p className="text-lg font-bold text-surface-600">Select a teacher above</p>
                  <p className="text-sm">Their combined schedule across all your saved classes will appear here.</p>
                </div>
              ) : (
                <div className="w-full">
                  {/* Desktop View */}
                  <div className="hidden lg:block min-w-[800px]">
                    {/* Grid Header */}
                    <div className="grid grid-cols-[80px_repeat(6,1fr)] bg-slate-900 text-white sticky top-0 z-10 text-xs sm:text-sm shadow-md">
                      <div className="p-3 sm:p-4 font-bold border-b border-r border-slate-800 text-center uppercase tracking-wider">Period</div>
                      {ALL_DAYS.map(day => (
                        <div key={day} className="p-3 sm:p-4 font-bold border-b border-r border-slate-800 text-center uppercase tracking-wider">
                          {day}
                        </div>
                      ))}
                    </div>

                    {/* Grid Body */}
                    <div className="divide-y divide-surface-200">
                      {PERIODS.map((period) => (
                        <div key={period} className="grid grid-cols-[80px_repeat(6,1fr)]">
                          {/* Period Column */}
                          <div className="p-3 sm:p-4 bg-surface-50 border-r border-surface-200 font-bold text-surface-700 text-xs sm:text-sm text-center flex items-center justify-center">
                            {period}
                          </div>
                          
                          {/* Days Columns */}
                          {ALL_DAYS.map(day => {
                            const assignments = teacherViewGrid[day]?.[period] || []
                            const isClash = assignments.length > 1
                            
                            return (
                              <div 
                                key={`${day}-${period}`} 
                                className={`p-3 border-r border-surface-200 relative min-h-[80px] transition-colors
                                  ${assignments.length === 0 ? 'bg-white hover:bg-surface-50/50' : isClash ? 'bg-red-50 hover:bg-red-100' : 'bg-fuchsia-50/30 hover:bg-fuchsia-50/60'}`}
                              >
                                {assignments.length > 0 ? (
                                  <div className="space-y-2">
                                    {assignments.map((a, i) => (
                                      <div key={i} className={`p-2 rounded-lg text-center ${isClash ? 'bg-red-100/80 border border-red-200 shadow-sm' : 'bg-white border border-fuchsia-100 shadow-sm'}`}>
                                        <div className={`text-xs sm:text-sm font-black ${isClash ? 'text-red-700' : 'text-fuchsia-700'}`}>
                                          {a.className}
                                        </div>
                                        <div className={`text-[10px] sm:text-xs font-semibold mt-0.5 ${isClash ? 'text-red-600' : 'text-fuchsia-600/80'}`}>
                                          {a.subject || 'No Subject'}
                                        </div>
                                      </div>
                                    ))}
                                    {isClash && (
                                      <div className="absolute top-1 right-1">
                                        <span className="flex h-3 w-3 relative">
                                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center text-surface-300 font-medium text-xs">
                                    -
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Mobile View Accordion */}
                  <div className="lg:hidden flex flex-col divide-y divide-surface-100">
                    {ALL_DAYS.map(day => (
                      <div key={day} className="bg-white">
                        <button 
                          onClick={() => setTeacherExpandedDay(teacherExpandedDay === day ? null : day)}
                          className="w-full p-4 flex items-center justify-between font-black text-surface-900 bg-surface-50 hover:bg-surface-100 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <CalendarDays className="w-5 h-5 text-fuchsia-500" />
                            <span className="text-base uppercase tracking-widest">{day}</span>
                          </div>
                          <ChevronDown className={`w-5 h-5 text-surface-400 transition-transform ${teacherExpandedDay === day ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {teacherExpandedDay === day && (
                          <div className="divide-y divide-surface-100">
                            {PERIODS.map(period => {
                              const assignments = teacherViewGrid[day]?.[period] || []
                              const isClash = assignments.length > 1
                              return (
                                <div key={period} className="flex p-4 gap-4 items-center">
                                  <div className="w-[80px] shrink-0 font-bold text-surface-500 text-xs uppercase tracking-wider">{period}</div>
                                  <div className="flex-1">
                                    {assignments.length > 0 ? (
                                      <div className="space-y-2">
                                        {assignments.map((a, i) => (
                                          <div key={i} className={`p-3 rounded-xl border ${isClash ? 'bg-red-50 border-red-200 shadow-sm' : 'bg-fuchsia-50/50 border-fuchsia-200'}`}>
                                            <div className={`text-sm font-black ${isClash ? 'text-red-700' : 'text-fuchsia-800'}`}>
                                              {a.className}
                                            </div>
                                            <div className={`text-xs font-semibold mt-1 ${isClash ? 'text-red-600' : 'text-fuchsia-600'}`}>
                                              {a.subject || 'No Subject'}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="text-sm font-medium text-surface-300">Free</div>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Workload Modal */}
      {isWorkloadModalOpen && (
        <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setIsWorkloadModalOpen(false)}>
          <div className="bg-white rounded-[28px] shadow-2xl p-6 sm:p-8 w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl sm:text-2xl font-extrabold text-surface-900 flex items-center gap-2 font-display">
                <BookOpen className="w-6 h-6 text-indigo-500" /> Teacher Workload Analytics
              </h3>
              <button onClick={() => setIsWorkloadModalOpen(false)} className="p-2 hover:bg-surface-100 rounded-xl transition-colors"><X className="w-5 h-5 text-surface-500" /></button>
            </div>
            <p className="text-sm text-surface-500 mb-6">Overview of periods assigned per week across all your saved classes.</p>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
              {getWorkload().map(w => (
                <div key={w.name} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-4 rounded-2xl border border-surface-200 bg-surface-50 hover:bg-white transition-colors">
                  <div className="w-40 font-bold text-surface-900 truncate shrink-0">{w.name}</div>
                  <div className="flex-1 w-full bg-surface-200 rounded-full h-3 relative overflow-hidden">
                    <div 
                      className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ${w.count > 30 ? 'bg-red-500' : w.count > 15 ? 'bg-emerald-500' : 'bg-indigo-400'}`}
                      style={{ width: `${Math.min((w.count / 48) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="w-24 text-right shrink-0">
                    <span className="text-sm font-black text-surface-700">{w.count}</span>
                    <span className="text-xs font-semibold text-surface-400 ml-1">periods</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Substitute Report Modal — Professional Report Center */}
      {isSubReportModalOpen && (() => {
        // Live preview stats
        const selectedDays = reportSelectedDays.length > 0 ? reportSelectedDays : [subReportDay];
        const sName = schoolName || 'Unassigned School';
        const previewTbs = cloudTimetables.filter(tb => (tb.schoolName || 'Unassigned School') === sName).map(tb => {
          if (tb.id === currentTimetableId) return { ...tb, grid, className };
          return tb;
        });
        if (!previewTbs.find(tb => tb.id === currentTimetableId)) {
          previewTbs.push({ id: currentTimetableId || 'current', className, grid, schoolName: sName });
        }
        let previewAffected = 0, previewCovered = 0;
        const previewTeachers = new Set();
        selectedDays.forEach(day => {
          const absentees = getAbsentTeacherNames().filter(t => isAbsentOnDay(t, day));
          absentees.forEach(t => previewTeachers.add(t));
          previewTbs.forEach(tb => {
            const g = tb.grid || {};
            PERIODS.forEach(p => {
              if (p === 'Lunch') return;
              const cell = g[day]?.[p];
              if (!cell) return;
              const check = (teacher, substitute) => {
                if (teacher && absentees.includes(teacher)) { previewAffected++; if (substitute) previewCovered++; }
              };
              if (cell.isSplit && cell.groups) cell.groups.forEach(gr => check(gr.teacher, gr.substitute));
              else check(cell.teacher, cell.substitute);
            });
          });
        });

        return (
          <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setIsSubReportModalOpen(false)}>
            <div className="bg-white rounded-[28px] shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-surface-100 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-[28px]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-extrabold text-surface-900 flex items-center gap-2"><BookOpen className="w-6 h-6 text-blue-500" /> Report Center</h3>
                  <button onClick={() => setIsSubReportModalOpen(false)} className="p-2 hover:bg-white/60 rounded-xl transition-colors"><X className="w-5 h-5 text-surface-500" /></button>
                </div>
                <p className="text-sm text-surface-600">Generate professional reports for <strong>{sName}</strong></p>
              </div>

              <div className="p-6 space-y-5">
                {/* Day Selection */}
                <div>
                  <label className="text-xs font-black text-surface-500 uppercase tracking-widest mb-2 block">Select Days</label>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setReportSelectedDays(prev => prev.length === activeDays.length ? [] : [...activeDays])} className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${reportSelectedDays.length === activeDays.length ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-surface-500 border-surface-200 hover:border-blue-300'}`}>
                      {reportSelectedDays.length === activeDays.length ? '✓ All' : 'All'}
                    </button>
                    {activeDays.map(d => {
                      const hasAbsent = getAbsentTeacherNames().some(t => isAbsentOnDay(t, d));
                      return (
                        <button key={d} onClick={() => { setSubReportDay(d); setReportSelectedDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]); }} className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all relative ${reportSelectedDays.includes(d) ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-surface-500 border-surface-200 hover:border-blue-300'}`}>
                          {d.slice(0, 3)}
                          {hasAbsent && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500"></span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Live Preview */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                    <div className="text-2xl font-black text-red-600">{previewTeachers.size}</div>
                    <div className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Absent</div>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                    <div className="text-2xl font-black text-amber-600">{previewAffected}</div>
                    <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Periods</div>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                    <div className="text-2xl font-black text-emerald-600">{previewCovered}</div>
                    <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Covered</div>
                  </div>
                </div>

                {/* Absent Teachers Preview */}
                {previewTeachers.size > 0 && (
                  <div className="bg-surface-50 rounded-xl p-3 border border-surface-200">
                    <div className="text-[10px] font-black text-surface-400 uppercase tracking-widest mb-2">Absent Teachers</div>
                    <div className="flex flex-wrap gap-1.5">
                      {[...previewTeachers].map(t => (
                        <span key={t} className="text-xs font-bold bg-red-100 text-red-700 px-2 py-1 rounded-lg border border-red-200">
                          {t} <span className="text-red-400 font-medium">({(absentTeachers[t] || []).map(d => d.slice(0,3)).join(', ')})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Report Options */}
                <div className="space-y-2.5">
                  <div className="text-[10px] font-black text-surface-400 uppercase tracking-widest">Download Options</div>

                  <button onClick={() => { if (reportSelectedDays.length === 0) return alert('Select at least one day'); printMultiDayReport(reportSelectedDays); setIsSubReportModalOpen(false); }} className="w-full flex items-center gap-4 p-4 rounded-2xl border border-surface-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all group text-left">
                    <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center text-lg shrink-0 group-hover:bg-blue-200 transition-colors">{'\ud83d\udcc4'}</div>
                    <div className="flex-1">
                      <p className="text-sm font-extrabold text-surface-900">Daily Substitute Report</p>
                      <p className="text-[11px] text-surface-500">Day-wise details with substitute status for {reportSelectedDays.length || 0} day(s)</p>
                    </div>
                    <Download className="w-4 h-4 text-surface-300 group-hover:text-blue-500 transition-colors" />
                  </button>

                  <button onClick={() => { printMonthlySummary(); setIsSubReportModalOpen(false); }} className="w-full flex items-center gap-4 p-4 rounded-2xl border border-surface-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all group text-left">
                    <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center text-lg shrink-0 group-hover:bg-emerald-200 transition-colors">{'\ud83d\udcca'}</div>
                    <div className="flex-1">
                      <p className="text-sm font-extrabold text-surface-900">Monthly Staff Summary</p>
                      <p className="text-[11px] text-surface-500">Leave count, sub duties, workload & full staff overview</p>
                    </div>
                    <Download className="w-4 h-4 text-surface-300 group-hover:text-emerald-500 transition-colors" />
                  </button>

                  <button onClick={() => { setSubReportDay(reportSelectedDays[0] || activeDays[0]); printMasterSubReport(); setIsSubReportModalOpen(false); }} className="w-full flex items-center gap-4 p-4 rounded-2xl border border-surface-200 hover:border-amber-300 hover:bg-amber-50/50 transition-all group text-left">
                    <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center text-lg shrink-0 group-hover:bg-amber-200 transition-colors">{'\ud83d\udce8'}</div>
                    <div className="flex-1">
                      <p className="text-sm font-extrabold text-surface-900">Formal Duty Report</p>
                      <p className="text-[11px] text-surface-500">Professional single-day report with signatures for {reportSelectedDays[0] || activeDays[0]}</p>
                    </div>
                    <Download className="w-4 h-4 text-surface-300 group-hover:text-amber-500 transition-colors" />
                  </button>

                  <button onClick={() => { generateClashReport(); setIsSubReportModalOpen(false); }} className="w-full flex items-center gap-4 p-4 rounded-2xl border border-surface-200 hover:border-red-300 hover:bg-red-50/50 transition-all group text-left">
                    <div className="w-11 h-11 rounded-xl bg-red-100 flex items-center justify-center text-lg shrink-0 group-hover:bg-red-200 transition-colors">{'\ud83d\udea8'}</div>
                    <div className="flex-1">
                      <p className="text-sm font-extrabold text-surface-900">Scheduling Clash Report</p>
                      <p className="text-[11px] text-surface-500">Scan all classes to detect double-booked teachers</p>
                    </div>
                    <Download className="w-4 h-4 text-surface-300 group-hover:text-red-500 transition-colors" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* AI Auto-Generate Modal */}
      {isAIModalOpen && (
        <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setIsAIModalOpen(false)}>
          <div className="bg-white rounded-[28px] shadow-2xl p-6 sm:p-8 w-full max-w-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl sm:text-2xl font-extrabold text-surface-900 flex items-center gap-2 font-display">
                <Sparkles className="w-6 h-6 text-violet-500" /> AI Auto-Generate
              </h3>
              <button onClick={() => setIsAIModalOpen(false)} className="p-2 hover:bg-surface-100 rounded-xl transition-colors"><X className="w-5 h-5 text-surface-500" /></button>
            </div>
            
            <div className="mb-4 p-4 bg-violet-50 rounded-2xl border border-violet-100">
              <p className="text-sm font-medium text-violet-800">
                Define how many periods per week each subject should have for <strong>{className || 'this class'}</strong>.
                Total capacity: <strong>{activeDays.length * (PERIODS.length - 1)}</strong> periods.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3 mb-6">
              {subjects.filter(s => s !== 'Lunch' && s !== 'Free Period').map(s => (
                <div key={s} className="flex items-center justify-between p-3 rounded-xl border border-surface-200 bg-surface-50">
                  <span className="font-bold text-surface-800 text-sm">{s}</span>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      min="0"
                      className="w-16 px-3 py-1.5 border border-surface-300 rounded-lg text-center font-bold focus:outline-none focus:border-violet-500"
                      value={aiRequirements[s] || ''}
                      onChange={e => setAiRequirements(prev => ({ ...prev, [s]: e.target.value }))}
                      placeholder="0"
                    />
                    <span className="text-xs text-surface-400 font-semibold uppercase">periods</span>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={generateAITimetable} className="w-full py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg hover:shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5" /> Run AI Generator ({GENERATION_COST} 🪙)
            </button>
          </div>
        </div>
      )}

      {/* Templates Modal */}
      {isTemplatesModalOpen && (
        <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setIsTemplatesModalOpen(false)}>
          <div className="bg-white rounded-[28px] shadow-2xl flex flex-col w-full max-w-2xl max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 sm:p-8 flex items-center justify-between border-b border-surface-100">
              <div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-surface-900 flex items-center gap-2 font-display">
                  <Copy className="w-6 h-6 text-amber-500" /> Templates
                </h3>
                <p className="text-sm text-surface-500 mt-1">Save grid structures (subjects & rooms) to reuse later.</p>
              </div>
              <button onClick={() => setIsTemplatesModalOpen(false)} className="p-2 hover:bg-surface-100 rounded-xl transition-colors"><X className="w-5 h-5 text-surface-500" /></button>
            </div>
            
            <div className="p-6 sm:p-8 flex-1 overflow-y-auto bg-surface-50">
              <button onClick={handleSaveTemplate} className="w-full py-4 mb-6 bg-white border-2 border-dashed border-amber-300 text-amber-700 rounded-xl text-sm font-bold shadow-sm hover:bg-amber-50 transition-all flex items-center justify-center gap-2">
                <Plus className="w-5 h-5" /> Save Current Grid as Template
              </button>

              {templates.length === 0 ? (
                <div className="text-center py-10 text-surface-400 font-medium">No templates saved yet.</div>
              ) : (
                <div className="grid gap-4">
                  {templates.map(t => (
                    <div key={t.id} className="bg-white p-4 rounded-xl border border-surface-200 shadow-sm flex items-center justify-between">
                      <div>
                        <div className="font-bold text-surface-800">{t.name}</div>
                        <div className="text-xs text-surface-400 mt-1">Saved {new Date(t.createdAt).toLocaleDateString()}</div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleApplyTemplate(t)} className="px-4 py-2 bg-amber-100 text-amber-700 font-bold rounded-lg hover:bg-amber-200 text-xs transition-colors">Apply</button>
                        <button onClick={() => handleDeleteTemplate(t.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
