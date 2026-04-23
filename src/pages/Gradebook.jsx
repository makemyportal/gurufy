import React, { useState } from 'react'
import { Calculator, Plus, Trash2, Download, Table as TableIcon, FileText, X, Bot, Loader2, Printer } from 'lucide-react'
import { generateAIContent } from '../utils/aiService'

export default function Gradebook() {
  const [students, setStudents] = useState([
    { id: '1', name: 'Alex Johnson' },
    { id: '2', name: 'Maria Garcia' },
    { id: '3', name: 'James Smith' }
  ])
  
  const [assignments, setAssignments] = useState([
    { id: 'a1', name: 'Midterm Exam', maxScore: 100 },
    { id: 'a2', name: 'Science Project', maxScore: 50 }
  ])
  
  // grades map: "studentId-assignmentId" -> numeric score
  const [grades, setGrades] = useState({
    '1-a1': 85, '1-a2': 45,
    '2-a1': 92, '2-a2': 48,
    '3-a1': 76, '3-a2': 38
  })

  const [showReportModal, setShowReportModal] = useState(false)
  const [selectedStudentId, setSelectedStudentId] = useState(null)
  const [aiRemark, setAiRemark] = useState('')
  const [isGeneratingRemark, setIsGeneratingRemark] = useState(false)

  // Handlers
  function addStudent() {
    const name = prompt("Enter student name:")
    if (name) {
      setStudents([...students, { id: Date.now().toString(), name }])
    }
  }

  function addAssignment() {
    const name = prompt("Enter assignment name (e.g. Pop Quiz):")
    if (!name) return
    const maxScore = prompt("Enter max score value (e.g. 100):", "100")
    if (!maxScore || isNaN(maxScore)) return
    
    setAssignments([...assignments, { id: 'a' + Date.now().toString(), name, maxScore: Number(maxScore) }])
  }

  function handleGradeChange(studentId, assignmentId, val) {
    const key = `${studentId}-${assignmentId}`
    if (val === '') {
      const newGrades = { ...grades }
      delete newGrades[key]
      setGrades(newGrades)
    } else {
      setGrades({ ...grades, [key]: Number(val) })
    }
  }

  function deleteStudent(id) {
    if(confirm("Remove this student and their grades?")) {
      setStudents(students.filter(s => s.id !== id))
    }
  }

  function deleteAssignment(id) {
    if(confirm("Remove this assignment?")) {
      setAssignments(assignments.filter(a => a.id !== id))
    }
  }

  // Calculations
  function calculateStudentStats(studentId) {
    let totalScore = 0
    let totalMax = 0
    let gradesList = []
    assignments.forEach(a => {
      const g = grades[`${studentId}-${a.id}`]
      if (g !== undefined) {
        totalScore += g
        totalMax += a.maxScore
        gradesList.push({ name: a.name, score: g, max: a.maxScore })
      }
    })
    const percentage = totalMax === 0 ? 0 : (totalScore / totalMax) * 100
    
    let letterGrade = 'F'
    if (percentage >= 90) letterGrade = 'A+'
    else if (percentage >= 80) letterGrade = 'A'
    else if (percentage >= 70) letterGrade = 'B'
    else if (percentage >= 60) letterGrade = 'C'
    else if (percentage >= 50) letterGrade = 'D'

    return { totalScore, totalMax, percentage, letterGrade, gradesList }
  }

  function exportCSV() {
    let csvContent = "data:text/csv;charset=utf-8,"
    
    // Header
    let row = ["Student Name"]
    assignments.forEach(a => row.push(`${a.name} (/${a.maxScore})`))
    row.push("Final Average")
    csvContent += row.join(",") + "\r\n"
    
    // Data
    students.forEach(s => {
      let dataRow = [s.name]
      assignments.forEach(a => {
        dataRow.push(grades[`${s.id}-${a.id}`] || '')
      })
      const stats = calculateStudentStats(s.id)
      dataRow.push(stats.totalMax === 0 ? '-' : stats.percentage.toFixed(1) + '%')
      csvContent += dataRow.join(",") + "\r\n"
    })
    
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", "Gradebook_Export.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  async function handleGenerateRemark(studentId) {
    const student = students.find(s => s.id === studentId)
    const stats = calculateStudentStats(studentId)
    const performanceContext = stats.gradesList.map(g => `${g.name}: ${g.score}/${g.max}`).join(', ')
    
    setIsGeneratingRemark(true)
    setAiRemark('')
    try {
      const prompt = `You are a teacher writing a short, professional, and encouraging remark for a student's report card. 
Student Name: ${student.name}
Overall Grade: ${stats.letterGrade} (${stats.percentage.toFixed(1)}%)
Assignment Performance: ${performanceContext}

Write exactly 2 to 3 sentences. Be encouraging but realistic based on their grades. Do not include any greeting or signature, just the remark itself.`
      
      const reply = await generateAIContent(prompt)
      let cleanReply = reply.trim()
      if (cleanReply.startsWith('"') && cleanReply.endsWith('"')) cleanReply = cleanReply.slice(1, -1)
      setAiRemark(cleanReply)
    } catch (err) {
      setAiRemark("Unable to generate remark automatically. Please write one manually.")
    } finally {
      setIsGeneratingRemark(false)
    }
  }

  function handlePrintReport() {
    window.print()
  }

  // Active student for report card
  const selectedStudent = students.find(s => s.id === selectedStudentId) || students[0]
  const selectedStudentStats = selectedStudent ? calculateStudentStats(selectedStudent.id) : null

  return (
    <div className="max-w-7xl mx-auto py-8 px-2 sm:px-6 animate-fade-in-up">
      <div className="bg-white rounded-[32px] p-6 sm:p-10 shadow-sm border border-surface-200">
        
        {/* Hide header and controls when printing */}
        <div className="print:hidden flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold font-display text-surface-900 mb-2 flex items-center gap-3">
              <Calculator className="w-8 h-8 text-blue-500" /> Smart Gradebook
            </h1>
            <p className="text-surface-500 font-medium">Calculate grades, averages, and generate AI report cards.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={addAssignment} className="px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl font-bold flex items-center gap-2 transition-all shadow-sm">
              <Plus className="w-4 h-4" /> Add Assignment
            </button>
            <button onClick={() => { setShowReportModal(true); setSelectedStudentId(students[0]?.id); setAiRemark(''); }} disabled={students.length === 0} className="px-4 py-2 bg-gradient-to-r from-fuchsia-500 to-indigo-500 text-white hover:from-fuchsia-600 hover:to-indigo-600 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md disabled:opacity-50">
              <FileText className="w-4 h-4" /> Smart Report Cards
            </button>
            <button onClick={exportCSV} className="px-4 py-2 bg-surface-900 text-white hover:bg-black rounded-xl font-bold flex items-center gap-2 transition-all shadow-sm">
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>
        </div>

        <div className="print:hidden overflow-x-auto custom-scrollbar border border-surface-200 rounded-2xl shadow-sm">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-surface-100 border-b border-surface-200 text-sm">
                <th className="p-4 font-extrabold text-surface-900 w-64 uppercase tracking-widest">
                  Students
                </th>
                {assignments.map(a => (
                  <th key={a.id} className="p-4 font-semibold text-surface-700 border-l border-surface-200 min-w-[140px]">
                    <div className="flex items-center justify-between group">
                      <div>
                        <div className="text-sm font-bold text-surface-900">{a.name}</div>
                        <div className="text-xs text-surface-500">Max: {a.maxScore}</div>
                      </div>
                      <button onClick={() => deleteAssignment(a.id)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 text-red-500 rounded transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </th>
                ))}
                <th className="p-4 font-bold text-blue-700 bg-blue-50/50 border-l border-surface-200 w-32 border-b-2 border-b-blue-200">
                  Total %
                </th>
                <th className="p-4 font-bold text-fuchsia-700 bg-fuchsia-50/50 border-l border-surface-200 w-24 border-b-2 border-b-fuchsia-200">
                  Grade
                </th>
              </tr>
            </thead>
            <tbody>
              {students.map(student => {
                const stats = calculateStudentStats(student.id)
                return (
                  <tr key={student.id} className="border-b border-surface-100 hover:bg-surface-50 transition-colors group">
                    <td className="p-4 border-r border-surface-100 text-sm font-semibold text-surface-900">
                      <div className="flex items-center justify-between">
                        {student.name}
                        <button onClick={() => deleteStudent(student.id)} className="opacity-0 group-hover:opacity-100 text-surface-400 hover:text-red-500 transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    {assignments.map(a => (
                      <td key={a.id} className="p-2 border-r border-surface-100 relative group/cell">
                        <input
                          type="number"
                          min="0"
                          max={a.maxScore}
                          value={grades[`${student.id}-${a.id}`] ?? ''}
                          onChange={(e) => handleGradeChange(student.id, a.id, e.target.value)}
                          className="w-full bg-transparent text-center font-medium text-surface-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-lg p-2 transition-all hover:bg-surface-100"
                          placeholder="-"
                        />
                      </td>
                    ))}
                    <td className="p-4 text-center font-extrabold text-blue-700 bg-blue-50/30 border-l border-surface-100">
                      {stats.totalMax === 0 ? '-' : stats.percentage.toFixed(1) + '%'}
                    </td>
                    <td className="p-4 text-center font-extrabold text-fuchsia-700 bg-fuchsia-50/30 border-l border-surface-100">
                      {stats.totalMax === 0 ? '-' : stats.letterGrade}
                    </td>
                  </tr>
                )
              })}
              <tr>
                <td colSpan={assignments.length + 3} className="p-4 bg-surface-50">
                  <button onClick={addStudent} className="text-sm font-bold text-surface-600 hover:text-blue-600 flex items-center gap-2 transition-colors">
                    <Plus className="w-4 h-4" /> Add New Student Row
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Report Card Modal */}
      {showReportModal && selectedStudent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center print:static print:z-0 print:flex-none print:items-start print:justify-start print:block">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm print:hidden" onClick={() => setShowReportModal(false)} />
          
          <div className="relative bg-white w-full max-w-5xl max-h-[90vh] sm:rounded-[32px] shadow-2xl flex flex-col md:flex-row overflow-hidden print:w-full print:max-w-none print:max-h-none print:rounded-none print:shadow-none print:flex-col animate-scale-up">
            
            {/* Sidebar (Student Selector) - Hidden on print */}
            <div className="w-full md:w-64 bg-surface-50 border-r border-surface-200 shrink-0 flex flex-col print:hidden max-h-[40vh] md:max-h-full overflow-y-auto">
              <div className="p-5 border-b border-surface-200 bg-white sticky top-0 z-10">
                <h3 className="font-extrabold text-surface-900">Select Student</h3>
                <p className="text-xs font-semibold text-surface-500 mt-1">{students.length} Students</p>
              </div>
              <div className="p-2 space-y-1">
                {students.map(s => (
                  <button
                    key={s.id}
                    onClick={() => { setSelectedStudentId(s.id); setAiRemark(''); }}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all ${selectedStudentId === s.id ? 'bg-indigo-600 text-white shadow-md' : 'text-surface-700 hover:bg-surface-200'}`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Main Content (The Report Card) */}
            <div className="flex-1 flex flex-col bg-white overflow-hidden print:overflow-visible">
              
              {/* Toolbar - Hidden on print */}
              <div className="px-6 py-4 border-b border-surface-200 bg-white flex items-center justify-between shrink-0 print:hidden z-10 sticky top-0">
                <h2 className="text-xl font-extrabold font-display text-surface-900">Report Card Preview</h2>
                <div className="flex items-center gap-3">
                  <button onClick={handlePrintReport} className="px-5 py-2.5 bg-surface-900 hover:bg-black text-white text-sm font-bold rounded-xl transition-all shadow-md flex items-center gap-2">
                    <Printer className="w-4 h-4" /> Print Document
                  </button>
                  <button onClick={() => setShowReportModal(false)} className="p-2 text-surface-400 hover:text-surface-600 hover:bg-surface-100 rounded-full transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Printable Document Area */}
              <div className="flex-1 overflow-y-auto p-6 md:p-10 print:p-0 print:overflow-visible custom-scrollbar bg-surface-100 print:bg-white flex justify-center">
                
                {/* A4 Paper Container */}
                <div className="bg-white w-full max-w-[210mm] min-h-[297mm] shadow-xl print:shadow-none print:w-full print:max-w-none print:min-h-0 relative">
                  
                  {/* Decorative Header Banner */}
                  <div className="h-4 w-full bg-indigo-600 absolute top-0 left-0" />

                  <div className="p-10 md:p-16">
                    {/* Report Card Header */}
                    <div className="text-center mb-12 border-b-2 border-surface-200 pb-8">
                      <h1 className="text-4xl font-extrabold font-display text-surface-900 tracking-tight uppercase mb-2">Student Report Card</h1>
                      <p className="text-lg font-bold text-surface-500 uppercase tracking-widest">Academic Session 2026-2027</p>
                    </div>

                    {/* Student Info */}
                    <div className="flex justify-between items-end mb-10">
                      <div>
                        <p className="text-sm font-bold text-surface-400 uppercase tracking-widest mb-1">Student Name</p>
                        <h2 className="text-3xl font-extrabold text-surface-900">{selectedStudent.name}</h2>
                      </div>
                      <div className="text-right">
                        <div className="inline-block bg-surface-50 border border-surface-200 rounded-2xl px-6 py-4 text-center">
                          <p className="text-xs font-bold text-surface-500 uppercase tracking-widest mb-1">Final Grade</p>
                          <p className="text-4xl font-extrabold text-indigo-600">{selectedStudentStats.totalMax === 0 ? '-' : selectedStudentStats.letterGrade}</p>
                          <p className="text-sm font-bold text-surface-900 mt-1">{selectedStudentStats.totalMax === 0 ? '' : `${selectedStudentStats.percentage.toFixed(1)}%`}</p>
                        </div>
                      </div>
                    </div>

                    {/* Academic Performance Table */}
                    <div className="mb-12">
                      <h3 className="text-lg font-extrabold text-surface-900 mb-4 flex items-center gap-2">
                        <div className="w-2 h-6 bg-indigo-500 rounded-full" />
                        Academic Performance
                      </h3>
                      <table className="w-full text-left border-collapse border border-surface-200 rounded-xl overflow-hidden shadow-sm">
                        <thead>
                          <tr className="bg-surface-100 border-b border-surface-200 text-sm">
                            <th className="p-4 font-extrabold text-surface-900 uppercase tracking-wider">Assignment</th>
                            <th className="p-4 font-extrabold text-surface-900 uppercase tracking-wider text-right">Max Score</th>
                            <th className="p-4 font-extrabold text-surface-900 uppercase tracking-wider text-right">Achieved</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-200">
                          {selectedStudentStats.gradesList.map((g, idx) => (
                            <tr key={idx} className="hover:bg-surface-50 transition-colors">
                              <td className="p-4 font-semibold text-surface-800">{g.name}</td>
                              <td className="p-4 font-medium text-surface-500 text-right">{g.max}</td>
                              <td className="p-4 font-extrabold text-indigo-700 text-right">{g.score}</td>
                            </tr>
                          ))}
                          {selectedStudentStats.gradesList.length === 0 && (
                            <tr>
                              <td colSpan="3" className="p-6 text-center text-surface-400 font-medium">No grades recorded for this student.</td>
                            </tr>
                          )}
                          {selectedStudentStats.gradesList.length > 0 && (
                            <tr className="bg-indigo-50/50 border-t-2 border-surface-200">
                              <td className="p-4 font-extrabold text-surface-900">Total</td>
                              <td className="p-4 font-extrabold text-surface-900 text-right">{selectedStudentStats.totalMax}</td>
                              <td className="p-4 font-extrabold text-indigo-700 text-right">{selectedStudentStats.totalScore}</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Teacher Remarks Section */}
                    <div className="mb-16">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-extrabold text-surface-900 flex items-center gap-2">
                          <div className="w-2 h-6 bg-fuchsia-500 rounded-full" />
                          Teacher's Remarks
                        </h3>
                        {/* Generate AI Button - Hidden on print */}
                        <button 
                          onClick={() => handleGenerateRemark(selectedStudent.id)}
                          disabled={isGeneratingRemark || selectedStudentStats.gradesList.length === 0}
                          className="print:hidden px-4 py-2 bg-gradient-to-r from-fuchsia-100 to-indigo-100 text-indigo-700 hover:from-fuchsia-200 hover:to-indigo-200 rounded-lg text-xs font-extrabold transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {isGeneratingRemark ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bot className="w-3.5 h-3.5" />}
                          {isGeneratingRemark ? 'Generating...' : 'Auto-Generate with AI'}
                        </button>
                      </div>
                      
                      <div className="bg-surface-50 border border-surface-200 rounded-2xl p-6 min-h-[120px] relative group">
                        {isGeneratingRemark ? (
                          <div className="absolute inset-0 flex items-center justify-center text-indigo-500 font-bold gap-2 print:hidden">
                            <Loader2 className="w-5 h-5 animate-spin" /> Analyzing grades and writing remark...
                          </div>
                        ) : (
                          <textarea 
                            value={aiRemark}
                            onChange={(e) => setAiRemark(e.target.value)}
                            placeholder="Write your remarks here, or click 'Auto-Generate with AI' to have the LDMS AI Assistant analyze the student's grades and write an encouraging, personalized remark instantly."
                            className="w-full h-full min-h-[100px] bg-transparent resize-none outline-none text-surface-700 font-medium leading-relaxed placeholder:text-surface-400"
                          />
                        )}
                      </div>
                    </div>

                    {/* Signatures */}
                    <div className="mt-24 pt-8 grid grid-cols-2 gap-10">
                      <div className="text-center">
                        <div className="border-b-2 border-surface-300 w-full mb-3" />
                        <p className="font-bold text-surface-900">Class Teacher</p>
                      </div>
                      <div className="text-center">
                        <div className="border-b-2 border-surface-300 w-full mb-3" />
                        <p className="font-bold text-surface-900">Principal</p>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Print-specific CSS */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .fixed.inset-0, .fixed.inset-0 * {
            visibility: visible;
          }
          .fixed.inset-0 {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          @page {
            margin: 0;
            size: A4;
          }
        }
      `}</style>
    </div>
  )
}
