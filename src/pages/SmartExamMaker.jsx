import { useState, useRef, useEffect } from 'react'
import { FileQuestion, Sparkles, Loader2, Download, Copy, Check, RotateCcw, FileText, UploadCloud, X, Share2, FileCode, Settings2, Target, History, Plus, Image as ImageIcon, Trash2, MessageCircle, BookOpen, BarChart3, Save } from 'lucide-react'
import { generateAIContent } from '../utils/aiService'
import { extractTextFromFile } from '../utils/fileExtractor'
import { useGamification } from '../contexts/GamificationContext'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../utils/firebase'
import { collection, addDoc, serverTimestamp, getDocs, doc, updateDoc, increment, deleteDoc } from 'firebase/firestore'
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
  const [form, setForm] = useState(() => {
    const saved = localStorage.getItem('smartExamSchoolInfo')
    const parsed = saved ? JSON.parse(saved) : {}
    return {
      board: 'CBSE', subject: '', grade: '', duration: '3 Hours', 
      includeAnswerKey: true, 
      institutionName: parsed.institutionName || '', 
      examName: parsed.examName || '', 
      session: parsed.session || '',
      difficulty: 'Medium', language: 'English', paperSets: 1, 
      watermarkText: parsed.watermarkText || '', 
      useBlooms: true, includePYQ: false, useAutoPattern: false, strictSource: true
    }
  })
  
  const [vaultItems, setVaultItems] = useState([])
  const [selectedVaultItem, setSelectedVaultItem] = useState(null)
  
  // Load Vault items on mount
  useEffect(() => {
    if (!currentUser) return
    const fetchVault = async () => {
      try {
        const snap = await getDocs(collection(db, 'users', currentUser.uid, 'vault'))
        const now = Date.now()
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(d => d.expiresAt > now)
        setVaultItems(items)
      } catch (err) { console.error('Failed to load vault', err) }
    }
    fetchVault()
  }, [currentUser])
  
  // Custom Blueprint State
  const [blueprint, setBlueprint] = useState([
    { id: 1, type: 'Multiple Choice Questions (MCQ)', count: 5, marksPerQuestion: 1 },
    { id: 2, type: 'Very Short Answer (VSA)', count: 3, marksPerQuestion: 2 },
    { id: 3, type: 'Short Answer (SA)', count: 3, marksPerQuestion: 3 },
    { id: 4, type: 'Long Answer (LA)', count: 2, marksPerQuestion: 5 },
    { id: 5, type: 'Case-Based / Source-Based', count: 1, marksPerQuestion: 4 }
  ])
  
  const [schoolLogo, setSchoolLogo] = useState(() => {
    return localStorage.getItem('smartExamSchoolLogo') || null
  })
  const logoInputRef = useRef(null)

  const calculatedTotalMarks = blueprint.reduce((acc, curr) => acc + (curr.count * curr.marksPerQuestion), 0)
  const totalMarksDisplay = form.useAutoPattern ? 'Auto (Official)' : calculatedTotalMarks

  // Save school info to localStorage
  useEffect(() => {
    const schoolInfo = {
      institutionName: form.institutionName,
      examName: form.examName,
      session: form.session,
      watermarkText: form.watermarkText
    }
    localStorage.setItem('smartExamSchoolInfo', JSON.stringify(schoolInfo))
  }, [form.institutionName, form.examName, form.session, form.watermarkText])


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
  
  // Live Editor State
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState('')
  
  const [suggestedChapters, setSuggestedChapters] = useState([])
  const [fetchingChapters, setFetchingChapters] = useState(false)
  const [generationCount, setGenerationCount] = useState(0)
  const fileInputRef = useRef(null)
  const { spendCoins, toolCosts, stats } = useGamification()

  // Analytics & Question Bank State
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [showQuestionBank, setShowQuestionBank] = useState(false)
  const [questionBank, setQuestionBank] = useState([])
  const [savingToBank, setSavingToBank] = useState(false)
  const [bankLoaded, setBankLoaded] = useState(false)

  const GENERATION_COST = toolCosts?.['smart-exam'] ?? 5
  const TOTAL_COST = GENERATION_COST * form.paperSets

  const canGenerate = form.subject && form.grade && (inputMode === 'upload' ? file : topic.trim().length > 3)

  const handleFileChange = (e) => {
    try {
      const selectedFile = e.target.files[0]
      if (!selectedFile) return
      
      const fileName = selectedFile.name || ''
      const isImage = selectedFile.type.startsWith('image/')
      const isPDF = selectedFile.type === 'application/pdf'
      const isDocx = fileName.toLowerCase().endsWith('.docx') || selectedFile.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

      if (!isImage && !isPDF && !isDocx) {
        setError('Please upload a valid Image, PDF, or DOCX file. Selected type: ' + (selectedFile.type || 'unknown'))
        return
      }
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB.')
        return
      }
      setFile(selectedFile)
      setError('')
      const reader = new FileReader()
      reader.onload = () => setFilePreview(reader.result)
      reader.readAsDataURL(selectedFile)
    } catch (err) {
      setError('Failed to select file: ' + err.message)
    }
  }

  const handleLogoUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 1 * 1024 * 1024) return alert('Logo size must be under 1MB')
      const reader = new FileReader()
      reader.onload = () => {
        setSchoolLogo(reader.result)
        localStorage.setItem('smartExamSchoolLogo', reader.result)
      }
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
    if ((stats?.coins || 0) < TOTAL_COST) {
      return setError(`Not enough coins! You need ${TOTAL_COST} 🪙. Current: ${stats?.coins || 0}`)
    }
    
    setGenerating(true); setError(''); setResults([]); setIsEditing(false)
    
    const success = await spendCoins(TOTAL_COST, 'Smart Exam Maker')
    if (!success) {
      setGenerating(false)
      return setError('Failed to deduct coins.')
    }
    
    try {
      let base64Data = null, mimeType = null, promptPrefix = ''

      if (inputMode === 'upload') {
        if (!filePreview && !file.name.toLowerCase().endsWith('.docx')) throw new Error("File not loaded properly.")
        const extractedText = await extractTextFromFile(file, filePreview)
        promptPrefix = form.strictSource 
          ? `CRITICAL INSTRUCTION: You MUST base all questions ABSOLUTELY ONLY on the following extracted document text. Do NOT use outside knowledge. If the document doesn't have enough content, state 'Insufficient content in document'.\n\nDocument Text:\n"${extractedText}"\n\n`
          : `Use the following extracted document text as your primary source, but you may use general curriculum knowledge to supplement if needed to fulfill the blueprint:\n"${extractedText}"\n\n`
        
        // Save to Firebase Vault directly
        if (currentUser) {
          try {
            const vaultDoc = {
              fileName: file?.name || 'Extracted Document',
              textData: extractedText,
              expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
              createdAt: Date.now()
            }
            const docRef = await addDoc(collection(db, 'users', currentUser.uid, 'vault'), vaultDoc)
            setVaultItems(prev => [{ id: docRef.id, ...vaultDoc }, ...prev])
          } catch (err) { console.error("Failed to save to vault", err) }
        }
      } else if (inputMode === 'vault') {
        if (!selectedVaultItem) throw new Error("Please select a document from the vault.")
        promptPrefix = form.strictSource 
          ? `CRITICAL INSTRUCTION: You MUST base all questions ABSOLUTELY ONLY on the following extracted document text. Do NOT use outside knowledge. If the document doesn't have enough content, state 'Insufficient content in document'.\n\nDocument Text:\n"${selectedVaultItem.textData}"\n\n`
          : `Use the following extracted document text as your primary source, but you may use general curriculum knowledge to supplement if needed:\n"${selectedVaultItem.textData}"\n\n`
      } else {
        promptPrefix = `Based on the official syllabus for topic: "${topic}"\n\n`
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

CRITICAL FORMATTING & NO-ANSWER RULES:
- DO NOT INCLUDE ANY ANSWERS, HINTS, OR BOLDED OPTIONS IN THE QUESTION PAPER SECTION.
- All answers MUST ONLY appear in the Answer Key block.
- For MCQs, format options strictly on separate lines like this:
(A) Option 1
(B) Option 2
(C) Option 3
(D) Option 4
- For Fill-in-the-blanks, use "__________" for the blank space.
- For True/False, state the question clearly and add "[True/False]" at the end.

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

      let content = await generateAIContent(prompt)

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

  // ===== ANALYTICS: Parse paper for difficulty & Bloom's breakdown =====
  const getAnalytics = () => {
    const paper = results[activeSetIndex]?.paper || ''
    const lines = paper.split('\n')
    let mcq = 0, shortAns = 0, longAns = 0, caseStudy = 0, totalQ = 0
    lines.forEach(line => {
      const l = line.toLowerCase()
      if (/^\s*\d+[.)\s]/.test(line) || /^\s*q\s*\d/i.test(line)) totalQ++
      if (l.includes('(a)') && l.includes('(b)')) mcq++
      if (l.includes('case') || l.includes('passage') || l.includes('source')) caseStudy++
    })
    // Estimate from difficulty setting
    const diffMap = { Easy: { easy: 60, medium: 30, hard: 10 }, Medium: { easy: 25, medium: 50, hard: 25 }, Hard: { easy: 10, medium: 30, hard: 60 } }
    const diff = diffMap[form.difficulty] || diffMap.Medium
    // Bloom's estimate from useBlooms
    const blooms = form.useBlooms 
      ? { remember: 20, understand: 30, apply: 30, analyze: 20 }
      : { remember: 35, understand: 35, apply: 20, analyze: 10 }
    return { totalQ: totalQ || 'N/A', mcq, caseStudy, diff, blooms, subject: form.subject, grade: form.grade }
  }

  // ===== WHATSAPP SHARE =====
  const handleWhatsAppShare = () => {
    const paper = results[activeSetIndex]?.paper || ''
    const preview = paper.substring(0, 500).replace(/[#*_`]/g, '')
    const msg = `📝 *${form.institutionName || 'Exam Paper'}*\n${form.examName || 'Assessment'} | ${form.subject} | ${form.grade}\n\n${preview}...\n\n_Generated via Gurufy Smart Exam Maker_`
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
  }

  // ===== QUESTION BANK: Save & Load =====
  const loadQuestionBank = async () => {
    if (!currentUser || bankLoaded) return
    try {
      const snap = await getDocs(collection(db, 'users', currentUser.uid, 'questionBank'))
      setQuestionBank(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)))
      setBankLoaded(true)
    } catch (err) { console.error('Failed to load question bank', err) }
  }

  const saveToQuestionBank = async () => {
    if (!currentUser || !results[activeSetIndex]) return
    setSavingToBank(true)
    try {
      const entry = {
        subject: form.subject,
        grade: form.grade,
        board: form.board,
        paper: results[activeSetIndex].paper,
        answerKey: results[activeSetIndex].key || '',
        difficulty: form.difficulty,
        createdAt: serverTimestamp()
      }
      const docRef = await addDoc(collection(db, 'users', currentUser.uid, 'questionBank'), entry)
      setQuestionBank(prev => [{ id: docRef.id, ...entry, createdAt: { seconds: Date.now() / 1000 } }, ...prev])
      setBankLoaded(true)
    } catch (err) { setError('Failed to save to Question Bank.') }
    finally { setSavingToBank(false) }
  }

  const deleteFromBank = async (id) => {
    if (!currentUser) return
    try {
      await deleteDoc(doc(db, 'users', currentUser.uid, 'questionBank', id))
      setQuestionBank(prev => prev.filter(q => q.id !== id))
    } catch (err) { console.error('Failed to delete', err) }
  }

  const loadFromBank = (item) => {
    setResults([{ paper: item.paper, key: item.answerKey || '' }])
    setActiveSetIndex(0)
    setActiveTab('questionPaper')
    setForm(f => ({ ...f, subject: item.subject, grade: item.grade, board: item.board, difficulty: item.difficulty }))
    setShowQuestionBank(false)
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
        <div style="font-family: 'Times New Roman', Times, serif; color: #1a2a40; margin-bottom: 18px; border: 2.5px solid #1a2a40; padding: 3px;">
          <div style="border: 1px solid #1a2a40; padding: 14px 18px;">
            
            <div style="display: flex; align-items: center; margin-bottom: 8px;">
              ${schoolLogo ? `<img src="${schoolLogo}" style="height: 58px; width: auto; margin-right: 14px;" />` : ''}
              <div style="flex: 1; text-align: center;">
                <div style="font-size: 24px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; line-height: 1.2;">${form.institutionName || 'SCHOOL EXAM'}</div>
                <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-top: 2px;">${form.examName || 'Assessment'}${form.session ? ` | Session: ${form.session}` : ''}</div>
              </div>
            </div>
            
            <div style="border-top: 1.5px solid #1a2a40; margin: 6px 0;"></div>

            <div style="display: flex; font-size: 13px; line-height: 2;">
              <div style="flex: 1;"><b>Name :</b> ______________________________</div>
              <div style="flex: 1; text-align: right;"><b>Subject :</b> <u>${form.subject}</u></div>
            </div>
            <div style="display: flex; font-size: 13px; line-height: 2;">
              <div style="flex: 1;"><b>Class :</b> <u>${form.grade}</u></div>
              <div style="flex: 1; text-align: right;"><b>Date :</b> ____/____/20____</div>
            </div>
            <div style="display: flex; font-size: 13px; line-height: 2;">
              <div style="flex: 1;"><b>Roll No. :</b> ___________________</div>
              <div style="flex: 1; text-align: right;"><b>Time :</b> <u>${form.duration}</u> &nbsp; | &nbsp; <b>Max Marks :</b> <u>${form.useAutoPattern ? '______' : calculatedTotalMarks}</u></div>
            </div>

            <div style="border-top: 1.5px solid #1a2a40; margin: 6px 0;"></div>

          </div>
        </div>
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
        <div style="font-family: 'Times New Roman', Times, serif; color: #1a2a40; margin-bottom: 18px; border: 2.5px solid #1a2a40; padding: 3px;">
          <div style="border: 1px solid #1a2a40; padding: 14px 18px;">
            
            <table style="width: 100%; border: none; border-collapse: collapse; margin-bottom: 8px;">
              <tr>
                <td style="width: 15%; vertical-align: middle; border: none; padding: 0;">
                  ${schoolLogo ? `<img src="${schoolLogo}" style="height: 58px; width: auto;" />` : ''}
                </td>
                <td style="text-align: center; vertical-align: middle; border: none; padding: 0;">
                  <div style="font-size: 24px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; line-height: 1.2;">${form.institutionName || 'SCHOOL EXAM'}</div>
                  <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-top: 2px;">${form.examName || 'Assessment'}${form.session ? ` | Session: ${form.session}` : ''}</div>
                </td>
                <td style="width: 15%; border: none; padding: 0;"></td>
              </tr>
            </table>

            <div style="border-top: 1.5px solid #1a2a40; margin: 6px 0;"></div>

            <table style="width: 100%; border: none; border-collapse: collapse; font-size: 13px;">
              <tr>
                <td style="border: none; padding: 3px 0;"><b>Name :</b> ______________________________</td>
                <td style="border: none; padding: 3px 0; text-align: right;"><b>Subject :</b> <u>${form.subject}</u></td>
              </tr>
              <tr>
                <td style="border: none; padding: 3px 0;"><b>Class :</b> <u>${form.grade}</u></td>
                <td style="border: none; padding: 3px 0; text-align: right;"><b>Date :</b> ____/____/20____</td>
              </tr>
              <tr>
                <td style="border: none; padding: 3px 0;"><b>Roll No. :</b> ___________________</td>
                <td style="border: none; padding: 3px 0; text-align: right;"><b>Time :</b> <u>${form.duration}</u> &nbsp;|&nbsp; <b>Max Marks :</b> <u>${form.useAutoPattern ? '______' : calculatedTotalMarks}</u></td>
              </tr>
            </table>

            <div style="border-top: 1.5px solid #1a2a40; margin: 6px 0;"></div>

          </div>
        </div>
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
              
              <div className="flex bg-surface-100 p-1 rounded-xl mb-4">
                <button onClick={() => setInputMode('upload')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${inputMode === 'upload' ? 'bg-white text-fuchsia-600 shadow-sm' : 'text-surface-600 hover:text-surface-800'}`}>Upload File</button>
                <button onClick={() => setInputMode('topic')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${inputMode === 'topic' ? 'bg-white text-fuchsia-600 shadow-sm' : 'text-surface-600 hover:text-surface-800'}`}>Select Topic</button>
                <button onClick={() => setInputMode('vault')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${inputMode === 'vault' ? 'bg-white text-fuchsia-600 shadow-sm' : 'text-surface-600 hover:text-surface-800'}`}>Recent Uploads</button>
              </div>

              {inputMode === 'upload' ? (
                <div>
                  <div onClick={() => !file && fileInputRef.current?.click()} className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${file ? 'border-fuchsia-400 bg-fuchsia-50/50' : 'border-surface-300 bg-surface-50 hover:bg-surface-100 cursor-pointer'}`}>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".jpg,.jpeg,.png,.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" />
                    {file ? (
                      <div className="relative animate-fade-in">
                        {file.type.startsWith('image/') ? (
                          <div className="aspect-[3/4] max-h-[200px] mx-auto rounded-xl overflow-hidden shadow-sm mb-3 border border-surface-200"><img src={filePreview} alt="Preview" className="w-full h-full object-cover" /></div>
                        ) : (file?.name || '').toLowerCase().endsWith('.docx') ? (
                          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3"><FileText className="w-8 h-8" /></div>
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
                        <p className="text-xs font-medium text-surface-500 mt-1">Supports JPG, PNG, PDF, or DOCX (Max 5MB)</p>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 bg-surface-50 p-3 rounded-xl border border-surface-200 flex justify-between items-center">
                    <div>
                      <p className="text-xs font-bold text-surface-800">Local Text Extraction</p>
                      <p className="text-[10px] text-surface-500 font-medium">Text will be extracted securely on your device.</p>
                    </div>
                  </div>
                  <div className="mt-2 bg-fuchsia-50 p-3 rounded-xl border border-fuchsia-200 flex justify-between items-center cursor-pointer" onClick={() => setForm(f => ({...f, strictSource: !f.strictSource}))}>
                    <div>
                      <p className="text-xs font-bold text-fuchsia-800">Strict Document Source</p>
                      <p className="text-[10px] text-fuchsia-600 font-medium max-w-[200px] leading-tight">
                        {form.strictSource ? "AI will ONLY use this document to create questions." : "AI can mix document content with general syllabus knowledge."}
                      </p>
                    </div>
                    <div className={`w-10 h-5 rounded-full flex items-center px-0.5 transition-colors ${form.strictSource ? 'bg-fuchsia-600' : 'bg-surface-300'}`}>
                      <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${form.strictSource ? 'translate-x-5' : 'translate-x-0'}`}></div>
                    </div>
                  </div>
                </div>
              ) : inputMode === 'vault' ? (
                <div className="animate-fade-in">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-bold text-surface-700">Select Extracted Document (Valid for 24h)</label>
                  </div>
                  {vaultItems.length === 0 ? (
                    <div className="text-center py-10 bg-surface-50 rounded-xl border border-surface-200">
                      <p className="text-sm font-bold text-surface-500">Your vault is empty.</p>
                      <p className="text-xs text-surface-400 mt-1">Upload a PDF/Image first to extract text here.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {vaultItems.map(item => {
                        const isSelected = selectedVaultItem?.id === item.id;
                        const hoursLeft = Math.max(0, Math.floor((item.expiresAt - Date.now()) / (1000 * 60 * 60)));
                        return (
                          <div key={item.id} onClick={() => setSelectedVaultItem(item)} className={`p-3 rounded-xl border cursor-pointer transition-all ${isSelected ? 'bg-fuchsia-50 border-fuchsia-400' : 'bg-white border-surface-200 hover:border-fuchsia-200'}`}>
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-sm font-bold text-surface-800">{item.fileName}</p>
                                <p className="text-xs text-surface-500 line-clamp-1 mt-1">{item.textData.substring(0, 100)}...</p>
                              </div>
                              <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-md">{hoursLeft}h left</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {selectedVaultItem && (
                    <div className="mt-2 bg-fuchsia-50 p-3 rounded-xl border border-fuchsia-200 flex justify-between items-center cursor-pointer animate-fade-in" onClick={() => setForm(f => ({...f, strictSource: !f.strictSource}))}>
                      <div>
                        <p className="text-xs font-bold text-fuchsia-800">Strict Document Source</p>
                        <p className="text-[10px] text-fuchsia-600 font-medium max-w-[200px] leading-tight">
                          {form.strictSource ? "AI will ONLY use this document to create questions." : "AI can mix document content with general syllabus knowledge."}
                        </p>
                      </div>
                      <div className={`w-10 h-5 rounded-full flex items-center px-0.5 transition-colors ${form.strictSource ? 'bg-fuchsia-600' : 'bg-surface-300'}`}>
                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${form.strictSource ? 'translate-x-5' : 'translate-x-0'}`}></div>
                      </div>
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
                
                <button onClick={handleGenerate} disabled={generating || (inputMode==='upload'&&!file) || (inputMode==='vault'&&!selectedVaultItem) || (inputMode==='topic'&&topic.trim().length<3)} className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white font-extrabold rounded-xl hover:from-fuchsia-500 hover:to-indigo-500 transition-all disabled:opacity-40 shadow-lg text-lg">
                  {generating ? <><Loader2 className="w-5 h-5 animate-spin"/> Crafting CBSE Pattern Exam...</> : <><Sparkles className="w-5 h-5"/> Generate Board Pattern Exam <span className="ml-1 text-sm bg-white/20 px-2 py-1 rounded-md">Cost: {TOTAL_COST} 🪙</span></>}
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
                <button onClick={() => { setActiveTab('questionPaper'); setIsEditing(false); }} className={`px-5 py-2 text-sm font-bold rounded-xl transition-all ${activeTab === 'questionPaper' ? 'bg-fuchsia-100 text-fuchsia-700' : 'bg-surface-50 text-surface-600 hover:bg-surface-100'}`}>Question Paper</button>
                <button onClick={() => { setActiveTab('answerKey'); setIsEditing(false); }} className={`px-5 py-2 text-sm font-bold rounded-xl transition-all ${activeTab === 'answerKey' ? 'bg-indigo-100 text-indigo-700' : 'bg-surface-50 text-surface-600 hover:bg-surface-100'}`}>Answer Key</button>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
              <button onClick={() => {
                if (!isEditing) {
                  setEditText(activeTab === 'questionPaper' ? results[activeSetIndex]?.paper : results[activeSetIndex]?.key)
                  setIsEditing(true)
                } else {
                  const newResults = [...results]
                  if (activeTab === 'questionPaper') newResults[activeSetIndex].paper = editText
                  else newResults[activeSetIndex].key = editText
                  setResults(newResults)
                  setIsEditing(false)
                }
              }} className={`px-4 py-2.5 text-sm font-bold rounded-xl transition-colors ${isEditing ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
                {isEditing ? 'Save Edits' : 'Edit Live'}
              </button>
              
              <button onClick={handleCopy} className="p-2.5 bg-surface-50 text-surface-600 hover:text-surface-900 rounded-xl" title="Copy"><Copy className="w-4 h-4" /></button>
              <button onClick={handlePDF} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold rounded-xl" title="Print as PDF"><Download className="w-4 h-4" /> Print / PDF</button>
              <button onClick={handleDOCX} className="p-2.5 bg-surface-50 text-surface-600 hover:text-surface-900 rounded-xl" title="Download Word"><FileCode className="w-4 h-4" /></button>
              
              <button onClick={handleWhatsAppShare} className="p-2.5 bg-green-50 text-green-600 hover:bg-green-100 rounded-xl" title="Share on WhatsApp"><MessageCircle className="w-4 h-4" /></button>
              <button onClick={() => setShowAnalytics(!showAnalytics)} className={`p-2.5 rounded-xl ${showAnalytics ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'}`} title="Paper Analytics"><BarChart3 className="w-4 h-4" /></button>
              <button onClick={saveToQuestionBank} disabled={savingToBank} className="p-2.5 bg-violet-50 text-violet-600 hover:bg-violet-100 rounded-xl" title="Save to Question Bank">{savingToBank ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}</button>
              <button onClick={() => { setShowQuestionBank(!showQuestionBank); loadQuestionBank() }} className={`p-2.5 rounded-xl ${showQuestionBank ? 'bg-violet-500 text-white' : 'bg-violet-50 text-violet-600 hover:bg-violet-100'}`} title="Question Bank"><BookOpen className="w-4 h-4" /></button>
              
              <div className="hidden sm:block w-px h-6 bg-surface-200 mx-1"></div>
              <button onClick={() => setResults([])} className="flex items-center gap-2 px-4 py-2.5 bg-fuchsia-600 text-white rounded-xl text-sm font-bold hover:bg-fuchsia-700"><RotateCcw className="w-4 h-4"/> Edit/New</button>
            </div>
          </div>

          {/* ===== ANALYTICS DASHBOARD ===== */}
          {showAnalytics && (() => {
            const a = getAnalytics()
            return (
              <div className="mb-6 bg-white p-5 rounded-[20px] shadow-sm border border-surface-200 animate-fade-in">
                <h3 className="text-sm font-black text-surface-900 flex items-center gap-2 mb-4"><BarChart3 className="w-4 h-4 text-amber-500" /> Paper Analytics — {a.subject} | {a.grade}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Difficulty Distribution */}
                  <div>
                    <p className="text-xs font-bold text-surface-500 mb-2">Difficulty Distribution</p>
                    <div className="space-y-2">
                      {[{label: 'Easy', val: a.diff.easy, color: 'bg-emerald-500'}, {label: 'Medium', val: a.diff.medium, color: 'bg-amber-500'}, {label: 'Hard', val: a.diff.hard, color: 'bg-red-500'}].map(d => (
                        <div key={d.label} className="flex items-center gap-3">
                          <span className="text-xs font-bold text-surface-600 w-14">{d.label}</span>
                          <div className="flex-1 bg-surface-100 rounded-full h-5 overflow-hidden">
                            <div className={`${d.color} h-full rounded-full flex items-center justify-end pr-2 text-[10px] font-bold text-white transition-all duration-700`} style={{width: `${d.val}%`}}>{d.val}%</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Bloom's Taxonomy */}
                  <div>
                    <p className="text-xs font-bold text-surface-500 mb-2">Bloom's Taxonomy Balance</p>
                    <div className="space-y-2">
                      {[{label: 'Remember', val: a.blooms.remember, color: 'bg-sky-500'}, {label: 'Understand', val: a.blooms.understand, color: 'bg-indigo-500'}, {label: 'Apply', val: a.blooms.apply, color: 'bg-violet-500'}, {label: 'Analyze', val: a.blooms.analyze, color: 'bg-fuchsia-500'}].map(d => (
                        <div key={d.label} className="flex items-center gap-3">
                          <span className="text-xs font-bold text-surface-600 w-20">{d.label}</span>
                          <div className="flex-1 bg-surface-100 rounded-full h-5 overflow-hidden">
                            <div className={`${d.color} h-full rounded-full flex items-center justify-end pr-2 text-[10px] font-bold text-white transition-all duration-700`} style={{width: `${d.val}%`}}>{d.val}%</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* ===== QUESTION BANK PANEL ===== */}
          {showQuestionBank && (
            <div className="mb-6 bg-white p-5 rounded-[20px] shadow-sm border border-surface-200 animate-fade-in">
              <h3 className="text-sm font-black text-surface-900 flex items-center gap-2 mb-4"><BookOpen className="w-4 h-4 text-violet-500" /> Question Bank ({questionBank.length} saved)</h3>
              {questionBank.length === 0 ? (
                <p className="text-xs text-surface-400 text-center py-6">No saved papers yet. Generate and save papers to build your Question Bank!</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {questionBank.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-surface-50 rounded-xl border border-surface-200 hover:border-violet-300 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-surface-800 truncate">{item.subject} — {item.grade}</p>
                        <p className="text-[11px] text-surface-400">{item.board} | {item.difficulty} | {item.createdAt?.seconds ? new Date(item.createdAt.seconds * 1000).toLocaleDateString() : 'Recent'}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-3">
                        <button onClick={() => loadFromBank(item)} className="px-3 py-1.5 text-xs font-bold bg-violet-100 text-violet-700 hover:bg-violet-200 rounded-lg">Load</button>
                        <button onClick={() => deleteFromBank(item.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          <div className="bg-white rounded-[28px] border border-surface-200 shadow-sm p-8 sm:p-12 md:p-16 relative overflow-hidden min-h-[800px]">
             {form.watermarkText && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-45 text-[6rem] sm:text-[8rem] font-black text-surface-900/5 pointer-events-none whitespace-nowrap z-0 select-none">
                {form.watermarkText}
              </div>
            )}
            
            <div id="exam-output" className="relative z-10 w-full max-w-4xl mx-auto prose prose-slate max-w-none prose-headings:font-display">
              {/* This inline style ensures ReactMarkdown renders math properly within prose */}
              <style>{`.katex-display { margin: 1em 0; } .katex { font-size: 1.1em; }`}</style>
              
              {isEditing ? (
                <textarea 
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full min-h-[600px] p-6 bg-surface-50 border-2 border-emerald-400 rounded-xl font-mono text-sm focus:outline-none focus:ring-4 focus:ring-emerald-100 resize-y"
                  placeholder="Edit your markdown here..."
                />
              ) : (
                <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                  {activeTab === 'questionPaper' ? results[activeSetIndex]?.paper : results[activeSetIndex]?.key}
                </ReactMarkdown>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
