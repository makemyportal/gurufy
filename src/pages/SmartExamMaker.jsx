import { useState, useRef, useEffect } from 'react'
import { FileQuestion, Sparkles, Loader2, Download, Copy, Check, RotateCcw, FileText, UploadCloud, X, Share2, FileCode, Settings2, Target, History, Plus, Image as ImageIcon, Trash2 } from 'lucide-react'
import { generateWithGeminiVision, generateAIContent } from '../utils/aiService'
import { useGamification } from '../contexts/GamificationContext'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../utils/firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { saveAs } from 'file-saver'
import { asBlob } from 'html-docx-js-typescript'
import { useNavigate } from 'react-router-dom'

const boardList = ['CBSE', 'ICSE', 'State Board', 'IB', 'Cambridge', 'General']
const gradeList = ['Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12']
const timeList = ['30 Minutes', '1 Hour', '1.5 Hours', '2 Hours', '3 Hours']
const subjectList = ['Mathematics', 'Science', 'Physics', 'Chemistry', 'Biology', 'English', 'Hindi', 'Social Studies', 'History', 'Geography', 'Computer Science', 'Economics', 'Accountancy']

export default function SmartExamMaker() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ 
    board: 'CBSE', subject: '', grade: '', duration: '3 Hours', 
    includeAnswerKey: true, institutionName: '', examName: '', session: '',
    difficulty: 'Medium', language: 'English', paperSets: 1, watermarkText: '', useBlooms: true, includePYQ: false, useAutoPattern: false
  })
  
  // Custom Blueprint State
  const [blueprint, setBlueprint] = useState([
    { id: 1, type: 'Multiple Choice Questions (MCQ)', count: 5, marksPerQuestion: 1 },
    { id: 2, type: 'Very Short Answer (VSA)', count: 3, marksPerQuestion: 2 },
    { id: 3, type: 'Short Answer (SA)', count: 3, marksPerQuestion: 3 },
    { id: 4, type: 'Long Answer (LA)', count: 2, marksPerQuestion: 5 },
    { id: 5, type: 'Case-Based / Source-Based', count: 1, marksPerQuestion: 4 }
  ])
  
  const [schoolLogo, setSchoolLogo] = useState(null)
  const logoInputRef = useRef(null)

  const calculatedTotalMarks = blueprint.reduce((acc, curr) => acc + (curr.count * curr.marksPerQuestion), 0)
  const totalMarksDisplay = form.useAutoPattern ? 'Auto (Official)' : calculatedTotalMarks

  const [inputMode, setInputMode] = useState('upload') 
  const [topic, setTopic] = useState('')
  const [file, setFile] = useState(null)
  const [filePreview, setFilePreview] = useState(null)
  const [generating, setGenerating] = useState(false)
  
  const [results, setResults] = useState([])
  const [activeSetIndex, setActiveSetIndex] = useState(0)
  const [activeTab, setActiveTab] = useState('questionPaper')
  
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [suggestedChapters, setSuggestedChapters] = useState([])
  const [fetchingChapters, setFetchingChapters] = useState(false)
  const [generationCount, setGenerationCount] = useState(0)
  const fileInputRef = useRef(null)
  const { spendCoins, toolCosts, stats } = useGamification()

  const GENERATION_COST = toolCosts?.['smart-exam'] ?? 5
  const canGenerate = form.subject && form.grade && (inputMode === 'upload' ? file : topic.trim().length > 3)

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (!selectedFile) return
    if (!selectedFile.type.startsWith('image/') && selectedFile.type !== 'application/pdf') {
      setError('Please upload a valid Image (JPG, PNG) or PDF file.')
      return
    }
    if (selectedFile.size > 5 * 1024 * 1024) return setError('File size must be less than 5MB.')
    setFile(selectedFile)
    setError('')
    const reader = new FileReader()
    reader.onload = () => setFilePreview(reader.result)
    reader.readAsDataURL(selectedFile)
  }

  const handleLogoUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 1 * 1024 * 1024) return alert('Logo size must be under 1MB')
      const reader = new FileReader()
      reader.onload = () => setSchoolLogo(reader.result)
      reader.readAsDataURL(file)
    }
  }

  const handleFetchChapters = async () => {
    if (!form.board || !form.grade || !form.subject) return setError('Please select Board, Class, and Subject first.')
    setFetchingChapters(true); setError('')
    try {
      const response = await generateAIContent(`List official syllabus chapter names for ${form.board} ${form.grade} ${form.subject}. Return ONLY a JSON array of strings. Example: ["Chapter 1", "Chapter 2"]`)
      const chapters = JSON.parse(response.replace(/```json/g, '').replace(/```/g, '').trim())
      if (Array.isArray(chapters)) setSuggestedChapters(chapters)
    } catch (err) { setError('Failed to auto-fetch chapters.') } 
    finally { setFetchingChapters(false) }
  }

  const toggleChapter = (ch) => {
    setTopic(prev => {
      let chapters = prev.split('\n').map(s => s.trim()).filter(Boolean)
      if (chapters.includes(ch)) chapters = chapters.filter(c => c !== ch)
      else chapters.push(ch)
      return chapters.join('\n')
    })
  }

  const updateBlueprint = (id, field, value) => {
    setBlueprint(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item))
  }
  const removeBlueprintItem = (id) => setBlueprint(prev => prev.filter(item => item.id !== id))
  const addBlueprintItem = () => setBlueprint(prev => [...prev, { id: Date.now(), type: 'New Section', count: 1, marksPerQuestion: 1 }])

  // Firebase history saving has been disabled per new economic policy

  const handleGenerate = async () => {
    const TOTAL_COST = GENERATION_COST * form.paperSets

    if ((stats?.coins || 0) < TOTAL_COST) {
      return setError(`Not enough coins! You need ${TOTAL_COST} 🪙. Current: ${stats?.coins || 0}`)
    }
    
    const success = await spendCoins(TOTAL_COST, 'Smart Exam Maker')
    if (!success) return setError('Failed to deduct coins.')
    
    setGenerating(true); setError(''); setResults([])
    
    try {
      let base64Data = null, mimeType = null, promptPrefix = ''

      if (inputMode === 'upload') {
        if (!filePreview) throw new Error("File not loaded properly.")
        base64Data = filePreview.split(',')[1]
        mimeType = file.type
        promptPrefix = `Based ONLY on the content provided in the image/PDF material`
      } else {
        promptPrefix = `Based on the official syllabus for topic: "${topic}"`
      }

      let blueprintPrompt = ''
      if (form.useAutoPattern) {
        blueprintPrompt = `CRITICAL EXAM BLUEPRINT: You MUST strictly format the exam according to the official and latest ${form.board} exam pattern for ${form.subject} ${form.grade}. Include all standard sections (Section A, B, C, D, etc.) with the correct marks weightage and standard question types (e.g. MCQs, Assertion-Reason, Short Answer, Long Answer, Case-Based) as per the actual board exams. IMPORTANT: Do NOT generate a short or abbreviated paper. You MUST generate a FULL-LENGTH paper with the EXACT TOTAL MARKS (e.g. 80 Marks or 100 Marks) as mandated by the official curriculum.`
      } else {
        const blueprintString = blueprint.map((item, idx) => 
          `Section ${String.fromCharCode(65 + idx)}: ${item.type} - Generate EXACTLY ${item.count} questions worth ${item.marksPerQuestion} mark(s) each.`
        ).join('\n')
        blueprintPrompt = `CRITICAL EXAM BLUEPRINT (YOU MUST STRICTLY FOLLOW THIS EXACT COUNT AND MARKS):\n${blueprintString}`
      }

      const prompt = `Act as an expert ${form.board} examiner. ${promptPrefix}, generate ${form.paperSets} distinct set(s) of an exam paper.
      
CRITICAL NEP 2020 & CBSE COMPLIANCE:
- Integrate Competency-Based Education (CBE) principles.
- Use LaTeX formatting for all math equations, fractions, and symbols using $ inline and $$ block markers. Ensure proper spacing.
${form.useBlooms ? "- Follow Bloom's Taxonomy: Mix of Remembering (20%), Understanding (30%), Applying (30%), Analyzing/Evaluating (20%)." : ""}
${form.includePYQ ? "- STRICTLY prioritize and adapt ACTUAL Previous Year Board Questions (PYQs) from the past 10 years. If a question is a PYQ, append the year in brackets at the end of the question e.g. '(CBSE 2019)'." : ""}

Configuration:
- Board: ${form.board} | Subject: ${form.subject} | Grade: ${form.grade}
- Difficulty: ${form.difficulty}
- Language: ${form.language} (If Bilingual, output English immediately followed by Hindi translation for every question)
- Total Marks: ${form.useAutoPattern ? 'Official Board Maximum Marks (e.g. 80 or 100)' : calculatedTotalMarks}

${blueprintPrompt}

For EACH set (Set A, Set B, etc.), use the following exact structure:

SET_START: Set [A/B/C]
*General Instructions:*
*- All questions are compulsory.*
*- Marks are indicated against each question.*
---
[Generate the Questions following the exact Blueprint Sections]

${form.includeAnswerKey ? `
ANSWER_KEY_SEPARATOR
# Answer Key - Set [A/B/C]
[Generate detailed Answer Key with marking scheme]
` : ''}
SET_END

IMPORTANT: 
- Generate exactly ${form.paperSets} set(s).
- Separate sets using SET_START and SET_END.
- Format beautifully using Markdown.`

      const content = await generateWithGeminiVision(prompt, base64Data, mimeType)
      
      const sets = []
      // Use strict regex to find blocks between SET_START and SET_END
      const setMatches = content.match(/SET_START: Set [A-Z][\s\S]*?SET_END/g)
      
      if (setMatches && setMatches.length > 0) {
        setMatches.forEach(block => {
          let cleanBlock = block.replace(/SET_START:\s*Set [A-Z]/, '').replace(/SET_END$/, '').trim()
          let paper = cleanBlock
          let key = ''
          if (form.includeAnswerKey && cleanBlock.includes('ANSWER_KEY_SEPARATOR')) {
            const parts = cleanBlock.split('ANSWER_KEY_SEPARATOR')
            paper = parts[0].trim()
            key = parts[1] ? parts[1].trim() : ''
          }
          sets.push({ paper, key })
        })
      } else {
        // Fallback
        if (form.includeAnswerKey && content.includes('ANSWER_KEY_SEPARATOR')) {
          const parts = content.split('ANSWER_KEY_SEPARATOR')
          sets.push({ paper: parts[0].trim(), key: parts[1] ? parts[1].replace(/SET_END$/, '').trim() : '' })
        } else sets.push({ paper: content.replace(/SET_END$/, '').trim(), key: '' })
      }

      setResults(sets)
      setActiveSetIndex(0)
      setActiveTab('questionPaper')
      // History saving disabled: saveToFirebase(sets)
      
    } catch (err) { setError(err.message || 'Failed to generate exam. Please try again.') } 
    finally { setGenerating(false) }
  }

  const handleCopy = () => { 
    if(!results[activeSetIndex]) return
    navigator.clipboard.writeText(activeTab === 'questionPaper' ? results[activeSetIndex].paper : results[activeSetIndex].key)
    setCopied(true); setTimeout(() => setCopied(false), 2000) 
  }
  
  const handlePDF = () => {
    const el = document.getElementById('exam-output')
    if (!el) return
    const docName = activeTab === 'questionPaper' ? 'Question_Paper' : 'Answer_Key'
    const printWindow = window.open('', '_blank')
    
    // Header logic for proper printable document
    let headerHTML = ''
    if (activeTab === 'questionPaper') {
      headerHTML = `
        <div style="text-align: center; margin-bottom: 20px; position: relative;">
          ${schoolLogo ? `<img src="${schoolLogo}" style="position: absolute; left: 0; top: 0; max-height: 80px; max-width: 80px; object-fit: contain;" />` : ''}
          <h1 style="margin: 0; font-size: 26px; text-transform: uppercase;">${form.institutionName || 'EXAMINATION'}</h1>
          <h2 style="margin: 5px 0; font-size: 18px;">${form.examName || ''}</h2>
          ${form.session ? `<p style="margin: 0; font-size: 14px; font-weight: bold;">Session: ${form.session}</p>` : ''}
        </div>
        <table style="width: 100%; border: 2px solid #000; border-collapse: collapse; margin-bottom: 15px; font-weight: bold; font-size: 14px;">
          <tr>
            <td style="border: 1px solid #000; padding: 8px; width: 50%;">Subject: ${form.subject}</td>
            <td style="border: 1px solid #000; padding: 8px; width: 50%;">Class: ${form.grade}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #000; padding: 8px;">Time Allowed: ${form.duration}</td>
            <td style="border: 1px solid #000; padding: 8px;">Maximum Marks: ${form.useAutoPattern ? '........' : calculatedTotalMarks}</td>
          </tr>
        </table>
        <table style="width: 100%; border: none; margin-bottom: 20px; font-size: 14px;">
          <tr>
            <td style="padding: 5px 0;"><strong>Student Name:</strong> ..............................................................</td>
            <td style="padding: 5px 0;"><strong>Roll No:</strong> ..........................</td>
            <td style="padding: 5px 0; text-align: right;"><strong>Date:</strong> ....../....../20....</td>
          </tr>
        </table>
        <hr style="border-top: 2px solid #000; margin-bottom: 20px;" />
      `
    } else {
      headerHTML = `<h1 style="text-align:center;">${form.subject} - Answer Key</h1><hr style="margin-bottom: 20px;" />`
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>SmartExam_${form.subject}_${docName}</title>
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css" integrity="sha384-GvrOXuhMATgEsSwCs4smul74iXGOixntILdUW9XmUC6+HX0sLNAK3q71bZl5Oym" crossorigin="anonymous">
          <style>
            body { font-family: 'Times New Roman', Times, serif; padding: 40px; color: #000; line-height: 1.6; position: relative; max-width: 900px; margin: 0 auto; }
            h1, h2, h3 { color: #000; margin-bottom: 15px; }
            h3 { font-size: 18px; margin-top: 20px; text-decoration: underline; }
            p { margin: 5px 0; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #000; padding: 8px; text-align: left; }
            .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 8rem; color: rgba(0,0,0,0.04); z-index: -1; font-weight: bold; pointer-events: none; white-space: nowrap;}
            @media print { @page { margin: 15mm; } body { padding: 0; } }
          </style>
        </head>
        <body>
          ${form.watermarkText ? `<div class="watermark">${form.watermarkText}</div>` : ''}
          ${headerHTML}
          <div style="font-size: 15px;">${el.innerHTML}</div>
          <script>setTimeout(() => { window.print(); window.close(); }, 800);</script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const handleDOCX = async () => {
    const el = document.getElementById('exam-output')
    if (!el) return
    const docName = activeTab === 'questionPaper' ? 'Question_Paper' : 'Answer_Key'
    const fileName = prompt("Enter file name:", `SmartExam_${form.subject}_${docName}.docx`)
    if (!fileName) return

    let headerHTML = ''
    if (activeTab === 'questionPaper') {
      headerHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
          ${schoolLogo ? `<img src="${schoolLogo}" style="max-height: 80px; max-width: 80px; margin-bottom: 10px;" />` : ''}
          <h1 style="margin: 0; font-size: 22px; text-transform: uppercase; font-family: Arial, sans-serif;">${form.institutionName || 'EXAMINATION'}</h1>
          <h2 style="margin: 5px 0; font-size: 16px; font-family: Arial, sans-serif;">${form.examName || ''}</h2>
          ${form.session ? `<p style="margin: 0; font-size: 12px; font-weight: bold; font-family: Arial, sans-serif;">Session: ${form.session}</p>` : ''}
        </div>
        <table style="width: 100%; border: 1px solid #000; border-collapse: collapse; margin-bottom: 15px; font-weight: bold; font-size: 12px; font-family: Arial, sans-serif;">
          <tr>
            <td style="border: 1px solid #000; padding: 6px; width: 50%;">Subject: ${form.subject}</td>
            <td style="border: 1px solid #000; padding: 6px; width: 50%;">Class: ${form.grade}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #000; padding: 6px;">Time Allowed: ${form.duration}</td>
            <td style="border: 1px solid #000; padding: 6px;">Maximum Marks: ${form.useAutoPattern ? '........' : calculatedTotalMarks}</td>
          </tr>
        </table>
        <table style="width: 100%; border: none; margin-bottom: 20px; font-size: 12px; font-family: Arial, sans-serif;">
          <tr>
            <td style="padding: 5px 0;"><strong>Student Name:</strong> ........................................................</td>
            <td style="padding: 5px 0;"><strong>Roll No:</strong> .....................</td>
            <td style="padding: 5px 0; text-align: right;"><strong>Date:</strong> ....../....../20....</td>
          </tr>
        </table>
        <hr style="border-top: 2px solid #000; margin-bottom: 20px;" />
      `
    } else {
      headerHTML = `<h1 style="text-align:center; font-family: Arial, sans-serif;">${form.subject} - Answer Key</h1><hr style="margin-bottom: 20px;" />`
    }

    const htmlString = `<!DOCTYPE html><html><head><meta charset='utf-8'><title>Exam</title></head><body>${headerHTML}<div>${el.innerHTML}</div></body></html>`
    try {
      const blob = await asBlob(htmlString, { orientation: 'portrait', margins: { top: 1440, right: 1440, bottom: 1440, left: 1440 } })
      saveAs(blob, fileName)
    } catch (err) { alert('Failed to generate DOCX.') }
  }

  return (
    <div className="max-w-[1200px] mx-auto animate-fade-in-up pb-24 lg:pb-8">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-fuchsia-600 via-purple-600 to-indigo-700 rounded-[32px] p-8 sm:p-12 mb-8 shadow-2xl">
        <div className="absolute top-0 right-0 -translate-y-1/3 translate-x-1/4 w-[500px] h-[500px] bg-white/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="relative z-10 flex justify-between items-start">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 border border-white/30 text-white text-xs font-black tracking-widest uppercase mb-5">
              <Sparkles className="w-4 h-4" /> CBSE NEP 2020 Edition
            </div>
            <h1 className="text-3xl sm:text-4xl font-black font-display text-white tracking-tight mb-3">
              Smart Exam <span className="text-purple-200">Maker</span>
            </h1>
            <p className="text-purple-100 font-medium text-sm sm:text-base max-w-xl">
              Create professional board-level exam papers with proper math rendering, custom blueprints, and branded headers.
            </p>
          </div>
          <button onClick={() => navigate('/history')} className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl transition-all font-bold backdrop-blur-sm border border-white/20">
            <History className="w-4 h-4" /> View Saved Exams
          </button>
        </div>
      </div>

      {results.length === 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Input Source */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-[28px] border border-surface-200 shadow-sm p-6 h-full">
              <h2 className="text-lg font-black text-surface-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-fuchsia-600" /> Syllabus Source
              </h2>
              
              <div className="flex bg-surface-100 p-1 rounded-xl mb-6">
                <button onClick={() => setInputMode('upload')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${inputMode === 'upload' ? 'bg-white text-fuchsia-600 shadow-sm' : 'text-surface-600 hover:text-surface-800'}`}>Upload File</button>
                <button onClick={() => setInputMode('topic')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${inputMode === 'topic' ? 'bg-white text-fuchsia-600 shadow-sm' : 'text-surface-600 hover:text-surface-800'}`}>Select Topic</button>
              </div>

              {inputMode === 'upload' ? (
                <div onClick={() => !file && fileInputRef.current?.click()} className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${file ? 'border-fuchsia-400 bg-fuchsia-50/50' : 'border-surface-300 bg-surface-50 hover:bg-surface-100 cursor-pointer'}`}>
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/jpeg, image/png, application/pdf" className="hidden" />
                  {file ? (
                    <div className="relative animate-fade-in">
                      {file.type.startsWith('image/') ? (
                        <div className="aspect-[3/4] max-h-[200px] mx-auto rounded-xl overflow-hidden shadow-sm mb-3 border border-surface-200"><img src={filePreview} alt="Preview" className="w-full h-full object-cover" /></div>
                      ) : (
                        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-xl flex items-center justify-center mx-auto mb-3"><FileText className="w-8 h-8" /></div>
                      )}
                      <p className="text-sm font-bold text-surface-800 truncate px-4">{file.name}</p>
                      <button onClick={(e) => { e.stopPropagation(); setFile(null); setFilePreview(null); }} className="absolute -top-3 -right-3 w-8 h-8 bg-white border border-surface-200 text-surface-500 rounded-full flex items-center justify-center shadow-md hover:text-red-500"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <div className="py-8">
                      <div className="w-16 h-16 bg-white border border-surface-200 shadow-sm rounded-full flex items-center justify-center mx-auto mb-4"><UploadCloud className="w-8 h-8 text-fuchsia-500" /></div>
                      <p className="text-base font-bold text-surface-800">Click to Upload</p>
                      <p className="text-xs font-medium text-surface-500 mt-1">Supports JPG, PNG, or PDF (Max 5MB)</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="animate-fade-in">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-bold text-surface-700">Topic Name *</label>
                    <button onClick={handleFetchChapters} disabled={fetchingChapters || !form.board || !form.grade || !form.subject} className="text-xs font-bold text-fuchsia-600 bg-fuchsia-50 hover:bg-fuchsia-100 px-2 py-1 rounded-lg flex items-center gap-1">
                      {fetchingChapters ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} Auto-fetch
                    </button>
                  </div>
                  {suggestedChapters.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2 max-h-40 overflow-y-auto p-3 bg-surface-50 rounded-xl border border-surface-200">
                      {suggestedChapters.map((ch, i) => {
                        const isSelected = topic.includes(ch)
                        return <button key={i} onClick={() => toggleChapter(ch)} className={`px-2 py-1 text-xs font-bold rounded-lg border transition-all ${isSelected ? 'bg-fuchsia-600 text-white border-fuchsia-600' : 'bg-white text-surface-600 hover:border-fuchsia-300'}`}>{ch}</button>
                      })}
                    </div>
                  )}
                  <textarea value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Kinematics, Laws of Motion" className="w-full px-4 py-3 bg-surface-50 border-2 border-surface-200 rounded-xl text-sm font-medium focus:outline-none focus:border-fuchsia-400 h-32 resize-none"></textarea>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Configuration & Blueprint */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-[28px] border border-surface-200 shadow-sm p-6 flex flex-col h-full">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-black text-surface-900 flex items-center gap-2">
                  <Target className="w-5 h-5 text-indigo-600" /> Exam Configuration
                </h2>
                <div className="px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-700 font-bold text-sm">
                  Total Marks: {totalMarksDisplay}
                </div>
              </div>

              {/* Basic Config */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div><label className="block text-[11px] font-bold text-surface-500 mb-1">Board</label><select value={form.board} onChange={e=>setForm(f=>({...f,board:e.target.value}))} className="w-full px-3 py-2 bg-surface-50 border border-surface-200 rounded-lg text-sm font-bold focus:border-fuchsia-400 focus:outline-none">{boardList.map(b=><option key={b}>{b}</option>)}</select></div>
                <div><label className="block text-[11px] font-bold text-surface-500 mb-1">Class *</label><select value={form.grade} onChange={e=>setForm(f=>({...f,grade:e.target.value}))} className="w-full px-3 py-2 bg-surface-50 border border-surface-200 rounded-lg text-sm font-bold focus:border-fuchsia-400 focus:outline-none"><option value="">Select...</option>{gradeList.map(g=><option key={g}>{g}</option>)}</select></div>
                <div><label className="block text-[11px] font-bold text-surface-500 mb-1">Subject *</label><select value={form.subject} onChange={e=>setForm(f=>({...f,subject:e.target.value}))} className="w-full px-3 py-2 bg-surface-50 border border-surface-200 rounded-lg text-sm font-bold focus:border-fuchsia-400 focus:outline-none"><option value="">Select...</option>{subjectList.map(s=><option key={s}>{s}</option>)}</select></div>
                <div><label className="block text-[11px] font-bold text-surface-500 mb-1">Duration</label><select value={form.duration} onChange={e=>setForm(f=>({...f,duration:e.target.value}))} className="w-full px-3 py-2 bg-surface-50 border border-surface-200 rounded-lg text-sm font-bold focus:border-fuchsia-400 focus:outline-none">{timeList.map(t=><option key={t}>{t}</option>)}</select></div>
              </div>

              <div className="flex items-center justify-between mb-4 mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.useAutoPattern} onChange={e=>setForm(f=>({...f,useAutoPattern:e.target.checked}))} className="w-5 h-5 rounded border-surface-300 text-fuchsia-600 focus:ring-fuchsia-500" />
                  <span className="text-sm font-bold text-surface-800">Auto-Generate Official Board Pattern</span>
                </label>
                {form.useAutoPattern && <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">AI will use real exam blueprint</span>}
              </div>

              {/* Blueprint Builder */}
              {!form.useAutoPattern && (
                <div className="mb-6 p-4 bg-surface-50 rounded-2xl border border-surface-200">
                  <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-extrabold text-surface-800">📋 Exact Paper Blueprint</h3>
                  <button onClick={addBlueprintItem} className="text-[11px] font-bold text-fuchsia-600 bg-fuchsia-50 hover:bg-fuchsia-100 px-2 py-1 rounded-lg flex items-center gap-1"><Plus className="w-3 h-3" /> Add Section</button>
                </div>
                <div className="space-y-2">
                  {blueprint.map((item, idx) => (
                    <div key={item.id} className="flex flex-col md:flex-row items-center gap-2 bg-white p-2 border border-surface-200 rounded-xl">
                      <span className="text-xs font-bold text-surface-400 w-6">Sec {String.fromCharCode(65+idx)}</span>
                      <input type="text" value={item.type} onChange={e=>updateBlueprint(item.id, 'type', e.target.value)} className="flex-1 px-3 py-1.5 bg-surface-50 border border-surface-200 rounded-lg text-xs font-bold w-full" placeholder="Type (e.g. MCQ)" />
                      <div className="flex items-center gap-2 w-full md:w-auto">
                        <input type="number" min="1" value={item.count} onChange={e=>updateBlueprint(item.id, 'count', parseInt(e.target.value))} className="w-16 px-2 py-1.5 bg-surface-50 border border-surface-200 rounded-lg text-xs font-bold text-center" />
                        <span className="text-[10px] font-bold text-surface-500">Qs ×</span>
                        <input type="number" min="1" value={item.marksPerQuestion} onChange={e=>updateBlueprint(item.id, 'marksPerQuestion', parseInt(e.target.value))} className="w-16 px-2 py-1.5 bg-surface-50 border border-surface-200 rounded-lg text-xs font-bold text-center" />
                        <span className="text-[10px] font-bold text-surface-500">Marks</span>
                        <button onClick={()=>removeBlueprintItem(item.id)} className="p-1.5 text-surface-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-auto"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              )}

              {/* Advanced Controls Toggle */}
              <button onClick={() => setShowAdvanced(!showAdvanced)} className="w-full py-2 bg-white border border-surface-200 hover:bg-surface-50 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-surface-600 transition-colors mb-4">
                <Settings2 className="w-4 h-4" /> {showAdvanced ? 'Hide Branding & Advanced Settings' : 'Show Branding & Advanced Settings'}
              </button>

              {/* Advanced Settings Drawer */}
              {showAdvanced && (
                <div className="animate-slide-down border-t border-b border-surface-100 py-4 mb-4 space-y-5">
                  {/* Branding / Header Setup */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-surface-50 border border-surface-200 rounded-2xl">
                      <p className="text-xs font-bold text-surface-800 mb-3 border-b border-surface-200 pb-1">Header Configuration</p>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <button onClick={() => logoInputRef.current?.click()} className="shrink-0 w-12 h-12 bg-white border border-surface-300 rounded-xl flex items-center justify-center text-surface-400 hover:text-indigo-500 hover:border-indigo-300 transition-colors relative overflow-hidden">
                            <input type="file" ref={logoInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />
                            {schoolLogo ? <img src={schoolLogo} className="w-full h-full object-contain p-1" /> : <ImageIcon className="w-5 h-5" />}
                          </button>
                          <input type="text" placeholder="School/Coaching Name" value={form.institutionName} onChange={e=>setForm(f=>({...f,institutionName:e.target.value}))} className="w-full px-3 py-2 bg-white border border-surface-300 rounded-lg text-xs font-bold" />
                        </div>
                        <input type="text" placeholder="Exam Name (e.g. Term 1 Examination)" value={form.examName} onChange={e=>setForm(f=>({...f,examName:e.target.value}))} className="w-full px-3 py-2 bg-white border border-surface-300 rounded-lg text-xs font-bold" />
                        <div className="flex gap-2">
                          <input type="text" placeholder="Session (2025-26)" value={form.session} onChange={e=>setForm(f=>({...f,session:e.target.value}))} className="w-full px-3 py-2 bg-white border border-surface-300 rounded-lg text-xs font-bold" />
                          <input type="text" placeholder="Watermark Text" value={form.watermarkText} onChange={e=>setForm(f=>({...f,watermarkText:e.target.value}))} className="w-full px-3 py-2 bg-white border border-surface-300 rounded-lg text-xs font-bold" />
                        </div>
                      </div>
                    </div>
                    
                    {/* Settings */}
                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label className="block text-[11px] font-bold text-surface-500 mb-1">Language</label>
                          <select value={form.language} onChange={e=>setForm(f=>({...f,language:e.target.value}))} className="w-full px-3 py-2 bg-surface-50 border border-surface-200 rounded-lg text-xs font-bold focus:border-fuchsia-400">
                            <option>English</option><option>Hindi</option><option>Bilingual (Both)</option>
                          </select>
                        </div>
                        <div className="flex-1">
                          <label className="block text-[11px] font-bold text-surface-500 mb-1">Paper Sets</label>
                          <select value={form.paperSets} onChange={e=>setForm(f=>({...f,paperSets:parseInt(e.target.value)}))} className="w-full px-3 py-2 bg-surface-50 border border-surface-200 rounded-lg text-xs font-bold focus:border-fuchsia-400">
                            <option value={1}>1 Set (Set A)</option><option value={2}>2 Sets (A, B)</option><option value={3}>3 Sets (A, B, C)</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-surface-500 mb-1">Difficulty Base</label>
                        <div className="flex bg-surface-100 rounded-lg p-1">
                          {['Easy', 'Medium', 'Hard'].map(d => (
                            <button key={d} onClick={() => setForm(f => ({...f, difficulty: d}))} className={`flex-1 py-1.5 text-xs font-bold rounded-md ${form.difficulty === d ? (d==='Easy'?'bg-emerald-500 text-white':d==='Medium'?'bg-amber-500 text-white':'bg-red-500 text-white') : 'text-surface-600'}`}>{d}</button>
                          ))}
                        </div>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer bg-fuchsia-50 p-2 rounded-lg border border-fuchsia-100">
                        <input type="checkbox" checked={form.useBlooms} onChange={e=>setForm(f=>({...f,useBlooms:e.target.checked}))} className="w-4 h-4 rounded text-fuchsia-600 focus:ring-fuchsia-500" />
                        <span className="text-[11px] font-bold text-surface-800">Enforce Bloom's Cognitive Load Balance</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer bg-amber-50 p-2 rounded-lg border border-amber-100">
                        <input type="checkbox" checked={form.includePYQ} onChange={e=>setForm(f=>({...f,includePYQ:e.target.checked}))} className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500" />
                        <span className="text-[11px] font-bold text-surface-800">🎯 Prioritize Previous Year Questions (PYQs)</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-auto pt-4 border-t border-surface-200">
                <div className="flex items-center justify-between mb-4">
                  <label className="flex items-center gap-2 text-sm font-bold text-surface-800 cursor-pointer">
                    <input type="checkbox" checked={form.includeAnswerKey} onChange={e=>setForm(f=>({...f,includeAnswerKey:e.target.checked}))} className="w-5 h-5 rounded border-surface-300 text-fuchsia-600" /> 
                    Generate Answer Key
                  </label>
                </div>
                
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                  <p className="text-xs font-bold text-amber-800 flex items-center gap-2 mb-1">
                    <span className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px]">!</span>
                    Important Notice
                  </p>
                  <p className="text-xs font-medium text-amber-700">Exam papers are <strong>NOT saved</strong> in your generation history. Please download or copy your paper immediately after generation.</p>
                </div>

                {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-sm text-red-700 font-bold">{error}</div>}
                
                <button onClick={handleGenerate} disabled={!canGenerate || generating} className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white font-extrabold rounded-xl hover:from-fuchsia-500 hover:to-indigo-500 transition-all disabled:opacity-40 shadow-lg text-lg">
                  {generating ? <><Loader2 className="w-5 h-5 animate-spin"/> Crafting CBSE Pattern Exam...</> : <><Sparkles className="w-5 h-5"/> Generate Board Pattern Exam <span className="ml-1 text-sm bg-white/20 px-2 py-1 rounded-md">Cost: {GENERATION_COST * form.paperSets} 🪙</span></>}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="animate-fade-in">
          {/* Output Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 bg-white p-4 rounded-[20px] shadow-sm border border-surface-200">
            {/* Sets Selector */}
            {results.length > 1 && (
              <div className="flex bg-surface-100 p-1 rounded-xl">
                {results.map((_, i) => (
                  <button key={i} onClick={() => setActiveSetIndex(i)} className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeSetIndex === i ? 'bg-white text-indigo-600 shadow-sm' : 'text-surface-600'}`}>
                    Set {String.fromCharCode(65 + i)}
                  </button>
                ))}
              </div>
            )}
            
            {/* Tab Selector */}
            {form.includeAnswerKey && results[activeSetIndex]?.key && (
              <div className="flex gap-2">
                <button onClick={() => setActiveTab('questionPaper')} className={`px-5 py-2 text-sm font-bold rounded-xl transition-all ${activeTab === 'questionPaper' ? 'bg-fuchsia-100 text-fuchsia-700' : 'bg-surface-50 text-surface-600 hover:bg-surface-100'}`}>Question Paper</button>
                <button onClick={() => setActiveTab('answerKey')} className={`px-5 py-2 text-sm font-bold rounded-xl transition-all ${activeTab === 'answerKey' ? 'bg-indigo-100 text-indigo-700' : 'bg-surface-50 text-surface-600 hover:bg-surface-100'}`}>Answer Key</button>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 sm:ml-auto">
              <button onClick={handleCopy} className="p-2.5 bg-surface-50 text-surface-600 hover:text-surface-900 rounded-xl" title="Copy"><Copy className="w-4 h-4" /></button>
              <button onClick={handlePDF} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold rounded-xl" title="Print as PDF"><Download className="w-4 h-4" /> Print / PDF</button>
              <button onClick={handleDOCX} className="p-2.5 bg-surface-50 text-surface-600 hover:text-surface-900 rounded-xl" title="Download Word"><FileCode className="w-4 h-4" /></button>
              <div className="w-px h-6 bg-surface-200 mx-1"></div>
              <button onClick={() => setResults([])} className="flex items-center gap-2 px-4 py-2.5 bg-fuchsia-600 text-white rounded-xl text-sm font-bold hover:bg-fuchsia-700"><RotateCcw className="w-4 h-4"/> Edit/New</button>
            </div>
          </div>
          
          <div className="bg-white rounded-[28px] border border-surface-200 shadow-sm p-8 sm:p-12 md:p-16 relative overflow-hidden min-h-[800px]">
             {form.watermarkText && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-45 text-[6rem] sm:text-[8rem] font-black text-surface-900/5 pointer-events-none whitespace-nowrap z-0 select-none">
                {form.watermarkText}
              </div>
            )}
            
            <div id="exam-output" className="relative z-10 w-full max-w-4xl mx-auto prose prose-slate max-w-none prose-headings:font-display">
              {/* This inline style ensures ReactMarkdown renders math properly within prose */}
              <style>{`.katex-display { margin: 1em 0; } .katex { font-size: 1.1em; }`}</style>
              
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                {activeTab === 'questionPaper' ? results[activeSetIndex]?.paper : results[activeSetIndex]?.key}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
