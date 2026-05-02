import { useState, useRef, useEffect } from 'react'
import { Calendar, Sparkles, Loader2, Download, Copy, Check, UploadCloud, X, FileText, Settings2, Image as ImageIcon, Briefcase } from 'lucide-react'
import { generateAIContent } from '../utils/aiService'
import { extractTextFromFile } from '../utils/fileExtractor'
import { useGamification } from '../contexts/GamificationContext'
import { useAuth } from '../contexts/AuthContext'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { saveAs } from 'file-saver'
import { asBlob } from 'html-docx-js-typescript'
import html2pdf from 'html2pdf.js'

const boardList = ['CBSE', 'ICSE', 'IB Diploma', 'Cambridge IGCSE', 'State Board', 'General']
const gradeList = ['All Classes', 'Kindergarten', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12']
const durationList = ['Full Academic Year (April - March)', 'Full Academic Year (July - June)', 'Half Yearly / Term 1', 'Half Yearly / Term 2', '3 Months Crash Course', 'Custom Timeline']
const granularityList = ['Month-by-Month', 'Week-by-Week']

export default function SyllabusBifurcator() {
  const { spendCoins, toolCosts, stats } = useGamification()
  const { currentUser } = useAuth()
  
  const GENERATION_COST = toolCosts?.['syllabus-bifurcator'] ?? 5
  
  const [form, setForm] = useState(() => {
    const saved = localStorage.getItem('syllabus_pro_form')
    if (saved) {
      try { return JSON.parse(saved) } catch (e) { console.error(e) }
    }
    return { 
      board: 'CBSE', subject: '', grade: '', duration: 'Full Academic Year (April - March)', granularity: 'Month-by-Month',
      institutionName: '', session: '', includeRevision: true, includeExams: true, customDuration: '',
      includeVacation: false, vacationDetails: '', examScheduleDetails: ''
    }
  })
  
  const [inputMode, setInputMode] = useState('manual') // manual or upload
  const [manualTopics, setManualTopics] = useState('')
  const [file, setFile] = useState(null)
  const [filePreview, setFilePreview] = useState(null)
  const [schoolLogo, setSchoolLogo] = useState(() => {
    return localStorage.getItem('syllabus_pro_logo') || null
  })
  const fileInputRef = useRef(null)
  const logoInputRef = useRef(null)

  useEffect(() => {
    localStorage.setItem('syllabus_pro_form', JSON.stringify(form))
  }, [form])

  useEffect(() => {
    if (schoolLogo) {
      try {
        localStorage.setItem('syllabus_pro_logo', schoolLogo)
      } catch (e) {
        console.warn("Logo too large to save in localStorage")
      }
    } else {
      localStorage.removeItem('syllabus_pro_logo')
    }
  }, [schoolLogo])

  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  
  const TOTAL_COST = GENERATION_COST

  const canGenerate = form.subject && form.grade && (inputMode === 'upload' ? file : manualTopics.trim().length > 3)

  const handleFileChange = (e, type) => {
    const selectedFile = e.target.files[0]
    if (!selectedFile) return
    if (!selectedFile.type.startsWith('image/') && selectedFile.type !== 'application/pdf') {
      return setError('Please upload a valid Image or PDF.')
    }
    if (selectedFile.size > 5 * 1024 * 1024) return setError('File size must be less than 5MB.')
    
    const reader = new FileReader()
    reader.onloadend = () => {
      if (type === 'logo') setSchoolLogo(reader.result)
      else { setFile(selectedFile); setFilePreview(reader.result) }
    }
    reader.readAsDataURL(selectedFile)
    setError('')
  }

  const handleGenerate = async () => {
    if ((stats?.coins || 0) < TOTAL_COST) {
      return setError(`Not enough coins! You need ${TOTAL_COST} 🪙. Current: ${stats?.coins || 0}`)
    }
    
    setGenerating(true); setError(''); setResult(null)
    
    const success = await spendCoins(TOTAL_COST, 'Syllabus Bifurcation')
    if (!success) {
      setGenerating(false)
      return setError('Failed to deduct coins.')
    }
    
    try {
      let extractedIndex = manualTopics

      // Process Vision Upload first if active
      if (inputMode === 'upload' && filePreview) {
        extractedIndex = await extractTextFromFile(file, filePreview)
      }

      // Generate the Bifurcation
      const actualDuration = form.duration === 'Custom Timeline' ? form.customDuration : form.duration
      let gradeInstruction = ''
      let formattingInstruction = ''
      
      if (form.grade === 'All Classes') {
        gradeInstruction = `TARGET CLASS: ALL CLASSES found in the document.
(Please extract and organize the syllabus for EACH class separately. Create distinct sections for each class).`
        formattingInstruction = `- Output ONLY the Markdown syllabus plan tables (start with a beautiful Markdown heading like "# 📘 ${form.subject} Syllabus Plan - Class X" for each class).`
      } else {
        gradeInstruction = `TARGET CLASS: ${form.grade}
(Ignore all content related to other classes or subjects).`
        formattingInstruction = `- Output ONLY the Markdown syllabus plan table (start with a beautiful Markdown heading like "# 📘 ${form.subject} Syllabus Plan - ${form.grade}").`
      }

      let subjectSpecificPacing = ''
      const lowerSub = form.subject.toLowerCase()
      if (lowerSub.includes('computer') || lowerSub.includes('it ') || lowerSub.includes('information tech') || lowerSub.includes('artificial intel')) {
        subjectSpecificPacing = `\n   *SPECIAL RULE FOR COMPUTER/IT*: This subject has fewer chapters and heavy practicals. If the timeline includes these months, strictly allocate ONLY 2 chapters total across March, April, and May. Allocate ONLY 3 chapters total across July and August. Distribute any remaining chapters across the rest of the available time.`
      }

      const prompt = `Act as an expert International Curriculum Planner and Principal for ${form.board}.
You have been given a raw syllabus/index document. This document might contain syllabus data for MULTIPLE classes or subjects mixed together.

Your FIRST task is to carefully analyze the raw document and **EXTRACT ONLY** the chapters and topics that belong exactly to:
${gradeInstruction}
TARGET SUBJECT: ${form.subject}

Your SECOND task is to bifurcate (divide) the extracted syllabus into a highly professional ${form.granularity} plan for ${actualDuration}. Group the chapters logically into 'Units' or 'Modules'.

Raw Syllabus/Index Document:
"""
${extractedIndex}
"""

CRITICAL REQUIREMENTS FOR THE PLAN:
1. Progressive Pacing (Start Slow): DO NOT distribute chapters evenly. Start with a lighter load (e.g., 1 chapter in the first 1-2 months) to allow students to settle in and school management to see proper structured progress. Gradually increase the pace in the middle months, and leave ample time for revision at the end.${subjectSpecificPacing}
2. Structure: Use a highly professional and beautifully formatted Markdown Table. The columns MUST BE: | ${form.granularity === 'Week-by-Week' ? 'Week/Date' : 'Month'} | Unit & Chapters | Key Learning Outcomes | ${form.includeRevision ? 'Assessments/Activities' : 'Notes'} |
3. ${form.includeRevision ? 'Automatically reserve the last 15% of the timeline purely for "Revision & Remedial" and add Mid-Term/Final exam periods where logical.' : ''}
4. ${form.includeExams ? (form.examScheduleDetails ? `Explicitly add exams in these specific months/weeks: ${form.examScheduleDetails}` : 'Explicitly insert "Formative Assessment" or "Term Exam" rows in the table at logical checkpoints.') : ''}
5. ${form.includeVacation && form.vacationDetails ? `CRITICAL: You MUST explicitly add a dedicated row in the table for "${form.vacationDetails}" at the logical timeline position and DO NOT schedule any teaching during this period.` : ''}

AESTHETICS & FORMATTING (CRITICAL):
- Make it visually stunning. Use appropriate emojis for different topics or months.
- Use bold text (**Text**) for Unit/Chapter names and bullet points (- item) for sub-topics and outcomes.
${formattingInstruction}
- DO NOT write any introductory or concluding text outside the core output.
- CRITICAL CONSTRAINT: DO NOT use any HTML tags (like <br>, <b>, <i>, etc.). Use pure Markdown syntax exclusively.`

      let content = await generateAIContent(prompt)
      
      // Permanently remove any <br> tags (including escaped &lt;br&gt; variants)
      content = content.replace(/(?:<|&lt;)br\s*\/?(?:>|&gt;)/gi, ', ')
      
      setResult(content)
      setCopied(false)
    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to generate syllabus. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const handleCopy = () => {
    if (!result) return
    navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleWordExport = async (orientation = 'portrait', isMobile = false) => {
    if (!result) return
    try {
      const htmlString = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Calibri', 'Arial', sans-serif; padding: 20px; color: #1a1a1a; }
            .header-block { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
            .school-name { font-size: 26pt; font-weight: bold; margin: 0; color: #1e3a8a; text-transform: uppercase; page-break-before: auto; }
            .session-info { font-size: 14pt; margin: 5px 0; color: #4b5563; font-style: italic; }
            .meta-info { display: flex; justify-content: space-between; font-size: 12pt; margin-top: 15px; font-weight: bold; }
            h1 { color: #1e3a8a; font-size: 22pt; margin-top: 30pt; margin-bottom: 15pt; page-break-before: always; }
            h2 { color: #1e3a8a; font-size: 16pt; margin-top: 20pt; }
            h3 { color: #1e3a8a; font-size: 14pt; margin-top: 15pt; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 20px; border: 1px solid #4b5563; }
            th, td { border: 1px solid #4b5563; padding: 10px; text-align: left; vertical-align: top; }
            th { background-color: #f3f4f6; font-weight: bold; color: #1f2937; }
            ul, ol { margin-top: 5px; margin-bottom: 5px; padding-left: 20px; }
            li { margin-bottom: 5px; }
          </style>
        </head>
        <body>
          ${form.institutionName ? `
            <div class="header-block">
              <h1 class="school-name">${form.institutionName}</h1>
              <p class="session-info">Academic Session: ${form.session || '2023-2024'} | ${form.board} Curriculum</p>
              <div class="meta-info">
                <span>Class: ${form.grade}</span>
                <span>Subject: ${form.subject}</span>
              </div>
            </div>
          ` : `
            <div class="header-block">
              <h1 class="school-name">SYLLABUS BIFURCATION</h1>
              <p class="session-info">${form.subject} | ${form.grade} | ${form.board}</p>
            </div>
          `}
          <div class="content-body">
          </div>
        </body>
        </html>
      `
      
      const proseElement = document.querySelector('#syllabus-print-area .prose')
      if (!proseElement) throw new Error("Could not find syllabus content.")
      
      let parsedContent = proseElement.innerHTML
      
      // Prevent the very first H1 from breaking to a new page immediately
      parsedContent = parsedContent.replace(/<h1/, '<h1 style="page-break-before: auto;"')
      const finalHtml = htmlString.replace('<div class="content-body">', `<div class="content-body">${parsedContent}`)
      
      const converted = await asBlob(finalHtml, { orientation: orientation })
      const ext = isMobile ? 'doc' : 'docx'
      saveAs(converted, `${form.subject}_${form.grade}_Syllabus_${orientation}.${ext}`)
    } catch (err) {
      console.error(err)
      setError('Export failed.')
    }
  }

  const handleDownloadPDF = (orientation = 'portrait') => {
    const element = document.getElementById('syllabus-print-area')
    if (!element) return

    // Explicitly mark headings for page breaks to prevent orphan titles
    const headings = element.querySelectorAll('.prose h1')
    headings.forEach((h, i) => {
      if (i > 0) h.classList.add('pdf-page-break-before')
    })

    // Hide any UI elements that shouldn't be in the PDF
    const opt = {
      margin:       10,
      filename:     `${form.subject}_${form.grade}_Syllabus_${orientation}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: orientation },
      pagebreak:    { mode: 'css', before: '.pdf-page-break-before', avoid: 'tr' }
    }
    
    // Temporarily make print styles visible for the PDF generation
    const printHeaders = element.querySelectorAll('.print\\:block, .print\\:flex')
    printHeaders.forEach(el => el.classList.remove('hidden'))
    
    const printFooters = element.querySelectorAll('.print-footer-flex')
    printFooters.forEach(el => {
      el.classList.remove('hidden')
      el.classList.add('flex')
    })
    
    html2pdf().set(opt).from(element).save().then(() => {
      // Revert visibility after generation
      printHeaders.forEach(el => el.classList.add('hidden'))
      printFooters.forEach(el => {
        el.classList.add('hidden')
        el.classList.remove('flex')
      })
      headings.forEach(h => h.classList.remove('pdf-page-break-before'))
    })
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-fade-in-up pb-20 sm:pb-0">
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-[24px] sm:rounded-[32px] bg-slate-900 border border-slate-800 p-5 sm:p-8 lg:p-12 shadow-2xl hide-on-print">
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/3 w-[400px] sm:w-[800px] h-[400px] sm:h-[800px] bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-full blur-[120px] pointer-events-none opacity-20" />
        
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-white/90 text-sm font-semibold tracking-wide backdrop-blur-md mb-4 sm:mb-6">
            <Calendar className="w-4 h-4" /> Curriculum Planner
          </div>
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold font-display text-white tracking-tight leading-tight mb-3 sm:mb-4">
            Syllabus Bifurcation <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">Pro</span>
          </h1>
          <p className="text-sm sm:text-lg text-surface-300 font-medium leading-relaxed">
            Upload your textbook's index photo or enter topics, and our AI will automatically structure a professional term-wise or monthly syllabus breakdown.
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        
        {/* LEFT COLUMN - CONFIGURATION */}
        <div className="w-full lg:w-[400px] flex-shrink-0 space-y-6 hide-on-print">
          
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-surface-200">
            <h2 className="text-lg font-extrabold text-surface-800 flex items-center gap-2 mb-5">
              <Briefcase className="w-5 h-5 text-blue-600" /> School Branding
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-surface-500 uppercase tracking-wider mb-2">School / Institution Name</label>
                <input type="text" value={form.institutionName} onChange={(e) => setForm({...form, institutionName: e.target.value})} placeholder="e.g. Delhi Public School" className="w-full px-4 py-3 bg-surface-50 border border-surface-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-surface-500 uppercase tracking-wider mb-2">Session</label>
                  <input type="text" value={form.session} onChange={(e) => setForm({...form, session: e.target.value})} placeholder="2023-24" className="w-full px-4 py-3 bg-surface-50 border border-surface-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-surface-500 uppercase tracking-wider mb-2">School Logo</label>
                  <input type="file" ref={logoInputRef} onChange={(e) => handleFileChange(e, 'logo')} accept="image/*" className="hidden" />
                  <button onClick={() => logoInputRef.current?.click()} className="w-full px-4 py-3 bg-surface-50 border border-surface-200 hover:bg-surface-100 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
                    <ImageIcon className="w-4 h-4 text-surface-500" /> {schoolLogo ? 'Change' : 'Upload'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-surface-200">
            <h2 className="text-lg font-extrabold text-surface-800 flex items-center gap-2 mb-5">
              <Settings2 className="w-5 h-5 text-blue-600" /> Configuration
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-surface-500 uppercase tracking-wider mb-2">Board</label>
                  <select value={form.board} onChange={(e) => setForm({...form, board: e.target.value})} className="w-full px-4 py-3 bg-surface-50 border border-surface-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500">
                    {boardList.map(b => <option key={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-surface-500 uppercase tracking-wider mb-2">Class</label>
                  <select value={form.grade} onChange={(e) => setForm({...form, grade: e.target.value})} className="w-full px-4 py-3 bg-surface-50 border border-surface-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500">
                    <option value="">Select...</option>
                    {gradeList.map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-surface-500 uppercase tracking-wider mb-2">Subject</label>
                <input type="text" value={form.subject} onChange={(e) => setForm({...form, subject: e.target.value})} placeholder="e.g. Science, Mathematics" className="w-full px-4 py-3 bg-surface-50 border border-surface-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500" />
              </div>

              <div>
                <label className="block text-xs font-bold text-surface-500 uppercase tracking-wider mb-2">Timeline Duration</label>
                <select value={form.duration} onChange={(e) => setForm({...form, duration: e.target.value})} className="w-full px-4 py-3 bg-surface-50 border border-surface-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500">
                  {durationList.map(d => <option key={d}>{d}</option>)}
                </select>
                {form.duration === 'Custom Timeline' && (
                  <input type="text" value={form.customDuration} onChange={(e) => setForm({...form, customDuration: e.target.value})} placeholder="e.g. 45 Days Summer Camp, Oct to Dec..." className="w-full mt-3 px-4 py-3 bg-surface-100 border border-blue-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 animate-fade-in" />
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-surface-500 uppercase tracking-wider mb-2">Granularity (Detail Level)</label>
                <select value={form.granularity} onChange={(e) => setForm({...form, granularity: e.target.value})} className="w-full px-4 py-3 bg-surface-50 border border-surface-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500">
                  {granularityList.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>

              <div className="space-y-2 pt-2 border-t border-surface-100">
                <label className="flex items-center gap-3 p-3 bg-surface-50 rounded-xl cursor-pointer hover:bg-surface-100 transition-colors">
                  <input type="checkbox" checked={form.includeRevision} onChange={e => setForm({...form, includeRevision: e.target.checked})} className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
                  <span className="text-sm font-semibold text-surface-700">Include Revision/Remedial weeks</span>
                </label>
                <label className="flex items-center gap-3 p-3 bg-surface-50 rounded-xl cursor-pointer hover:bg-surface-100 transition-colors">
                  <input type="checkbox" checked={form.includeExams} onChange={e => setForm({...form, includeExams: e.target.checked})} className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
                  <span className="text-sm font-semibold text-surface-700">Include Exam slots</span>
                </label>
                {form.includeExams && (
                  <div className="pl-7 animate-fade-in pb-2 border-b border-surface-100">
                    <label className="block text-[10px] font-bold text-surface-500 uppercase mb-1">Custom Exam Schedule (Optional)</label>
                    <textarea 
                      value={form.examScheduleDetails} 
                      onChange={e => setForm({...form, examScheduleDetails: e.target.value})} 
                      placeholder="e.g. Unit 1 in July, Half Yearly in Sept, Unit 3 in Jan, Annual in March..." 
                      className="w-full px-3 py-2 text-xs bg-white border border-surface-200 rounded-lg focus:ring-1 focus:ring-blue-500 min-h-[60px]"
                    />
                  </div>
                )}
                <div className="bg-surface-50 rounded-xl p-3 hover:bg-surface-100 transition-colors">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={form.includeVacation} onChange={e => setForm({...form, includeVacation: e.target.checked})} className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
                    <span className="text-sm font-semibold text-surface-700">Include Vacation/Breaks</span>
                  </label>
                  {form.includeVacation && (
                    <input type="text" value={form.vacationDetails} onChange={e => setForm({...form, vacationDetails: e.target.value})} placeholder="e.g. Summer Vacation (May-June), Winter Break..." className="w-full mt-2 ml-7 max-w-[calc(100%-1.75rem)] px-3 py-2 bg-white border border-surface-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 animate-fade-in" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN - INPUT & RESULTS */}
        <div className="flex-1 space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-surface-200 hide-on-print">
            <h2 className="text-lg font-extrabold text-surface-800 flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-blue-600" /> Curriculum Source
            </h2>
            
            <div className="flex bg-surface-100 p-1 rounded-xl mb-4">
              <button onClick={() => setInputMode('upload')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${inputMode === 'upload' ? 'bg-white text-blue-600 shadow-sm' : 'text-surface-600 hover:text-surface-800'}`}>Upload Index Photo</button>
              <button onClick={() => setInputMode('manual')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${inputMode === 'manual' ? 'bg-white text-blue-600 shadow-sm' : 'text-surface-600 hover:text-surface-800'}`}>Manual Topics</button>
            </div>

            {inputMode === 'upload' ? (
              <div>
                <div onClick={() => !file && fileInputRef.current?.click()} className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${file ? 'border-blue-400 bg-blue-50/50' : 'border-surface-300 bg-surface-50 hover:bg-surface-100 cursor-pointer'}`}>
                  <input type="file" ref={fileInputRef} onChange={(e) => handleFileChange(e, 'index')} accept="image/jpeg, image/png, application/pdf" className="hidden" />
                  {file ? (
                    <div className="relative animate-fade-in">
                      {file.type.startsWith('image/') ? (
                        <div className="aspect-video max-h-[250px] mx-auto rounded-xl overflow-hidden shadow-sm mb-3 border border-surface-200">
                          <img src={filePreview} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-xl flex items-center justify-center mx-auto mb-3"><FileText className="w-8 h-8" /></div>
                      )}
                      <p className="text-sm font-bold text-surface-800 truncate px-4">{file.name}</p>
                      <button onClick={(e) => { e.stopPropagation(); setFile(null); setFilePreview(null); }} className="absolute -top-3 -right-3 w-8 h-8 bg-white border border-surface-200 text-surface-500 rounded-full flex items-center justify-center shadow-md hover:text-red-500"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <div className="py-8">
                      <div className="w-16 h-16 bg-white border border-surface-200 shadow-sm rounded-full flex items-center justify-center mx-auto mb-4"><UploadCloud className="w-8 h-8 text-blue-500" /></div>
                      <p className="text-base font-bold text-surface-800">Upload Textbook Index</p>
                      <p className="text-xs font-medium text-surface-500 mt-1">Take a photo or upload a PDF of the syllabus</p>
                    </div>
                  )}
                </div>
                <div className="mt-3 bg-surface-50 p-3 rounded-xl border border-surface-200 flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold text-surface-800">Local Free OCR Processing</p>
                    <p className="text-[10px] text-surface-500 font-medium">Extracts text from images securely on your device.</p>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <textarea 
                  value={manualTopics} 
                  onChange={(e) => setManualTopics(e.target.value)}
                  placeholder="Paste your chapters or topics here (e.g. 1. Rational Numbers, 2. Linear Equations...)" 
                  className="w-full px-4 py-4 bg-surface-50 border border-surface-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-500 min-h-[200px]"
                />
              </div>
            )}

            {error && <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 font-bold">{error}</div>}
            
            <button 
              onClick={handleGenerate} 
              disabled={generating || !canGenerate} 
              className="w-full mt-6 flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-extrabold rounded-xl hover:from-blue-500 hover:to-cyan-500 transition-all disabled:opacity-40 shadow-lg text-lg"
            >
              {generating ? <><Loader2 className="w-5 h-5 animate-spin"/> Processing Syllabus...</> : <><Sparkles className="w-5 h-5"/> Generate Bifurcation <span className="ml-1 text-sm bg-white/20 px-2 py-1 rounded-md">Cost: {TOTAL_COST} 🪙</span></>}
            </button>
          </div>

          {/* RESULTS AREA */}
          {result && (
            <div className="bg-white rounded-3xl shadow-sm border border-surface-200 overflow-hidden printable-wrapper">
              
              <div className="flex items-center justify-between p-4 border-b border-surface-100 bg-surface-50 hide-on-print">
                <span className="text-sm font-extrabold text-surface-800">Generated Syllabus</span>
                <div className="flex gap-2">
                  <button onClick={handleCopy} className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${copied ? 'bg-emerald-100 text-emerald-700' : 'bg-white border border-surface-200 text-surface-700 hover:bg-surface-100'}`}>
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? 'Copied' : 'Copy'}
                  </button>
                  <div className="flex bg-blue-600 rounded-lg overflow-hidden shadow-sm">
                    <button onClick={() => handleWordExport('portrait')} className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-all border-r border-blue-500">
                      <FileText className="w-4 h-4" /> DOCX (P)
                    </button>
                    <button onClick={() => handleWordExport('landscape')} className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-all border-r border-blue-500">
                      DOCX (L)
                    </button>
                    <button onClick={() => handleWordExport('portrait', true)} className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-all">
                      Mobile DOC
                    </button>
                  </div>
                  <div className="flex bg-surface-900 rounded-lg overflow-hidden shadow-sm">
                    <button onClick={() => handleDownloadPDF('portrait')} className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white hover:bg-black transition-all border-r border-surface-700">
                      <Download className="w-4 h-4" /> PDF (P)
                    </button>
                    <button onClick={() => handleDownloadPDF('landscape')} className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white hover:bg-black transition-all">
                      PDF (L)
                    </button>
                  </div>
                </div>
              </div>

              {/* PRINTABLE CONTENT */}
              <div id="syllabus-print-area" className="p-8 print:p-0 print:m-0 bg-white min-h-[500px]">
                
                {/* Print Headers (Only visible on print or PDF) */}
                <div className="hidden print:block mb-8 pb-4 border-b-2 border-surface-800 text-center relative">
                  {schoolLogo && (
                    <img src={schoolLogo} alt="Logo" className="absolute top-0 left-0 w-24 h-24 object-contain" />
                  )}
                  <h1 className="text-3xl font-black text-surface-900 uppercase tracking-wide">{form.institutionName || 'SYLLABUS BIFURCATION'}</h1>
                  <p className="text-lg font-bold text-surface-600 mt-2">Academic Session: {form.session || new Date().getFullYear()}</p>
                  
                  <div className="flex justify-between items-end mt-8 pt-4 border-t border-surface-200">
                    <div className="text-left">
                      <p className="text-base font-bold text-surface-800">Class: {form.grade}</p>
                      <p className="text-base font-bold text-surface-800">Subject: {form.subject}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold text-surface-800">Board: {form.board}</p>
                      <p className="text-base font-bold text-surface-800">Duration: {form.duration === 'Custom Timeline' ? form.customDuration || 'Custom' : form.duration}</p>
                    </div>
                  </div>
                </div>

                {/* Markdown rendering of the Table */}
                <article className="prose prose-sm md:prose-base max-w-none 
                  prose-headings:font-display prose-headings:font-bold prose-headings:text-surface-900
                  prose-table:w-full prose-table:border-collapse prose-table:border prose-table:border-surface-300
                  prose-th:bg-surface-100 prose-th:px-4 prose-th:py-3 prose-th:text-left prose-th:font-bold prose-th:border prose-th:border-surface-300 prose-th:text-surface-900
                  prose-td:px-4 prose-td:py-3 prose-td:border prose-td:border-surface-300 prose-td:text-surface-800 prose-td:align-top
                  prose-p:text-surface-600 prose-p:leading-relaxed">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {result}
                  </ReactMarkdown>
                </article>

                {/* Print Footer */}
                <div className="hidden print-footer-flex w-full justify-between items-end mt-16 pt-8">
                  <div className="text-center w-[28%]">
                    <p className="border-t-2 border-surface-600 pt-2 text-sm font-bold uppercase">Coordinator</p>
                  </div>
                  <div className="text-center w-[28%]">
                    <p className="border-t-2 border-surface-600 pt-2 text-sm font-bold uppercase">Vice Principal</p>
                  </div>
                  <div className="text-center w-[28%]">
                    <p className="border-t-2 border-surface-600 pt-2 text-sm font-bold uppercase">Principal</p>
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Print Styles Injection */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body, html { background: white !important; height: auto !important; overflow: visible !important; }
          body * { visibility: hidden; }
          .printable-wrapper, .printable-wrapper * { visibility: visible; }
          .printable-wrapper { position: absolute; left: 0; top: 0; width: 100%; border: none !important; box-shadow: none !important; padding: 0 !important; margin: 0 !important; }
          .hide-on-print { display: none !important; }
          @page { margin: 15mm; }
          .prose h1 { page-break-before: always; break-before: page; margin-top: 40px !important; }
          .prose h1:first-child { page-break-before: avoid; break-before: auto; margin-top: 0 !important; }
          .prose h1, .prose h2, .prose h3 { page-break-after: avoid; break-after: avoid; }
          .prose table { page-break-inside: auto; break-inside: auto; }
          .prose tr { page-break-inside: avoid; page-break-after: auto; }
        }
      `}} />
    </div>
  )
}
