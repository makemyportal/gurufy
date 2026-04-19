import React, { useState } from 'react'
import { Calculator, Plus, Trash2, Download, Table as TableIcon } from 'lucide-react'

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
  function calculateStudentPercentage(studentId) {
    let totalScore = 0
    let totalMax = 0
    assignments.forEach(a => {
      const g = grades[`${studentId}-${a.id}`]
      if (g !== undefined) {
        totalScore += g
        totalMax += a.maxScore
      }
    })
    if (totalMax === 0) return '-'
    return ((totalScore / totalMax) * 100).toFixed(1) + '%'
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
      dataRow.push(calculateStudentPercentage(s.id))
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

  return (
    <div className="max-w-7xl mx-auto py-8 px-2 sm:px-6 animate-fade-in-up">
      <div className="bg-white rounded-[32px] p-6 sm:p-10 shadow-sm border border-surface-200">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold font-display text-surface-900 mb-2 flex items-center gap-3">
              <Calculator className="w-8 h-8 text-blue-500" /> Smart Gradebook
            </h1>
            <p className="text-surface-500 font-medium">Quickly calculate grades, averages, and track student progress.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={addAssignment} className="px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl font-bold flex items-center gap-2 transition-all">
              <Plus className="w-5 h-5" /> Add Assignment
            </button>
            <button onClick={exportCSV} className="px-4 py-2 bg-surface-900 text-white hover:bg-black rounded-xl font-bold flex items-center gap-2 transition-all">
              <Download className="w-5 h-5" /> Export CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar border border-surface-200 rounded-2xl shadow-sm">
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
                  Total Grade %
                </th>
              </tr>
            </thead>
            <tbody>
              {students.map(student => (
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
                  <td className="p-4 text-center font-extrabold text-blue-700 bg-blue-50/30">
                    {calculateStudentPercentage(student.id)}
                  </td>
                </tr>
              ))}
              <tr>
                <td colSpan={assignments.length + 2} className="p-4 bg-surface-50">
                  <button onClick={addStudent} className="text-sm font-bold text-surface-600 hover:text-blue-600 flex items-center gap-2 transition-colors">
                    <Plus className="w-4 h-4" /> Add New Student Row
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>
    </div>
  )
}
