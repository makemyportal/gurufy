import { useState, useRef, useEffect } from 'react'
import { FileQuestion, Sparkles, Loader2, Download, Copy, Check, RotateCcw, FileText, UploadCloud, X, Share2, FileCode, Settings2, Target, History, Plus, Image as ImageIcon, Trash2, MessageCircle, BookOpen, BarChart3, Save, Printer, RefreshCw, FolderOpen } from 'lucide-react'
import { generateAIContent } from '../utils/aiService'
import { extractTextFromFile } from '../utils/fileExtractor'
import { useGamification } from '../contexts/GamificationContext'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../utils/firebase'
import TokenShopModal from '../components/TokenShopModal'
import { collection, addDoc, serverTimestamp, getDocs, doc, updateDoc, increment, deleteDoc } from 'firebase/firestore'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { saveAs } from 'file-saver'
import { asBlob } from 'html-docx-js-typescript'
import html2pdf from 'html2pdf.js'
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
      useBlooms: true, includePYQ: false, useAutoPattern: false, strictSource: true, leaveDiagramSpace: false
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
  const [uploadedFiles, setUploadedFiles] = useState([])
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

  // Blueprint Templates State
  const [savedTemplates, setSavedTemplates] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('examBlueprintTemplates') || '[]')
    } catch { return [] }
  })
  const [templateName, setTemplateName] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)

  // Regenerate Single Question State
  const [regeneratingQ, setRegeneratingQ] = useState(null)
  
  const [showShop, setShowShop] = useState(false)

  const GENERATION_COST = toolCosts?.['smart-exam'] ?? 5
  const TOTAL_COST = GENERATION_COST * form.paperSets

  const canGenerate = form.subject && form.grade && (inputMode === 'upload' ? uploadedFiles.length > 0 : topic.trim().length > 3)

  const handleFileChange = (e) => {
    try {
      const selectedFiles = Array.from(e.target.files)
      if (!selectedFiles.length) return
      
      let hasError = false
      selectedFiles.forEach(selectedFile => {
        const fileName = selectedFile.name || ''
        const isImage = selectedFile.type.startsWith('image/')
        const isPDF = selectedFile.type === 'application/pdf'
        const isDocx = fileName.toLowerCase().endsWith('.docx') || selectedFile.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

        if (!isImage && !isPDF && !isDocx) {
          setError('Please upload valid Image, PDF, or DOCX files.')
          hasError = true
          return
        }
        if (selectedFile.size > 5 * 1024 * 1024) {
          setError('File size must be less than 5MB per file.')
          hasError = true
          return
        }
        
        const reader = new FileReader()
        reader.onload = () => {
          setUploadedFiles(prev => [...prev, { file: selectedFile, preview: reader.result }])
        }
        reader.readAsDataURL(selectedFile)
      })
      if (!hasError) setError('')
      
      // Reset input value so same files can be selected again if needed
      if (e.target) e.target.value = ''
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
      const response = await generateAIContent(`List ALL official syllabus chapter names for ${form.board} ${form.grade} ${form.subject} as per the latest NCERT/official textbook. Include EVERY single chapter from Unit 1 to the last unit. Do NOT skip or abbreviate any chapter. Return ONLY a JSON array of strings with complete chapter names. Example format: ["Chapter 1: Chemical Reactions and Equations", "Chapter 2: Acids, Bases and Salts"]. Output ONLY the JSON array, nothing else.`, { preferGemini: true })
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

  // ===== BLUEPRINT TEMPLATE FUNCTIONS =====
  const saveTemplate = () => {
    if (!templateName.trim()) return setError('Please enter a template name.')
    const newTemplate = {
      id: Date.now(),
      name: templateName.trim(),
      board: form.board,
      subject: form.subject,
      grade: form.grade,
      sections: blueprint.map(b => ({ ...b }))
    }
    const updated = [...savedTemplates, newTemplate]
    setSavedTemplates(updated)
    localStorage.setItem('examBlueprintTemplates', JSON.stringify(updated))
    setTemplateName('')
    setError('')
  }
  const loadTemplate = (tpl) => {
    setBlueprint(tpl.sections.map((s, i) => ({ ...s, id: Date.now() + i })))
    setForm(f => ({ ...f, board: tpl.board || f.board, subject: tpl.subject || f.subject, grade: tpl.grade || f.grade, useAutoPattern: false }))
    setShowTemplates(false)
  }
  const deleteTemplate = (id) => {
    const updated = savedTemplates.filter(t => t.id !== id)
    setSavedTemplates(updated)
    localStorage.setItem('examBlueprintTemplates', JSON.stringify(updated))
  }

  // ===== REGENERATE SINGLE QUESTION =====
  const handleRegenerateQuestion = async (qNum) => {
    setRegeneratingQ(qNum)
    try {
      const paper = results[activeSetIndex]?.paper || ''
      const prompt = `You are a ${form.board} exam expert for ${form.subject} ${form.grade}.
I have a question paper. I need you to REPLACE question number ${qNum} with a NEW, DIFFERENT question of the SAME type, difficulty, and marks.

Here is the current question paper:
---
${paper}
---

IMPORTANT RULES:
- Output the ENTIRE question paper again with ONLY Q.${qNum} replaced by a brand new question.
- Keep ALL other questions EXACTLY the same, character for character.
- The new question must be of the same type (MCQ stays MCQ, Long Answer stays Long Answer, etc.).
- DO NOT change section headings, numbering, or any other question.
- DO NOT add answers or explanations.
- Use the same formatting style as the original paper.`
      const newContent = await generateAIContent(prompt, { preferGemini: true })
      if (newContent && newContent.length > 100) {
        const newResults = [...results]
        newResults[activeSetIndex] = { ...newResults[activeSetIndex], paper: newContent }
        setResults(newResults)
      } else {
        setError('Failed to regenerate question. Please try again.')
      }
    } catch (err) {
      setError('Regeneration failed: ' + (err.message || 'Unknown error'))
    } finally {
      setRegeneratingQ(null)
    }
  }

  // Firebase history saving has been disabled per new economic policy

  const handleGenerate = async () => {
    if ((stats?.coins || 0) < TOTAL_COST) {
      setShowShop(true)
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
        if (uploadedFiles.length === 0) throw new Error("No files uploaded.")
        
        let extractedText = ""
        for (let i = 0; i < uploadedFiles.length; i++) {
          const { file, preview } = uploadedFiles[i]
          if (!preview && !file.name.toLowerCase().endsWith('.docx')) continue
          const text = await extractTextFromFile(file, preview)
          extractedText += `\n--- Document ${i + 1}: ${file.name} ---\n${text}\n`
        }

        promptPrefix = form.strictSource 
          ? `CRITICAL INSTRUCTION: Your primary goal is to EXTRACT AND USE THE EXACT SAME QUESTIONS, EXACT SAME WORDING, and EXACT SAME OPTIONS as they appear in the provided document text. Do NOT rephrase or modify the questions. Do NOT generate new questions unless absolutely required to fulfill the blueprint count. If the text contains multiple-choice options, use those exact options verbatim.\n\nDocument Text:\n"${extractedText}"\n\n`
          : `Use the following extracted document text as your primary source, but you may use general curriculum knowledge to supplement if needed to fulfill the blueprint:\n"${extractedText}"\n\n`
        
        // Save to Firebase Vault directly
        if (currentUser) {
          try {
            const vaultDoc = {
              fileName: uploadedFiles.length > 1 ? `Multiple Documents (${uploadedFiles.length})` : uploadedFiles[0].file.name,
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
          ? `CRITICAL INSTRUCTION: Your primary goal is to EXTRACT AND USE THE EXACT SAME QUESTIONS, EXACT SAME WORDING, and EXACT SAME OPTIONS as they appear in the provided document text. Do NOT rephrase or modify the questions. Do NOT generate new questions unless absolutely required to fulfill the blueprint count. If the text contains multiple-choice options, use those exact options verbatim.\n\nDocument Text:\n"${selectedVaultItem.textData}"\n\n`
          : `Use the following extracted document text as your primary source, but you may use general curriculum knowledge to supplement if needed:\n"${selectedVaultItem.textData}"\n\n`
      } else {
        promptPrefix = `Based on the official syllabus for topic: "${topic}"\n\n`
      }

      let blueprintPrompt = ''
      if (form.useAutoPattern) {
        blueprintPrompt = `CRITICAL EXAM BLUEPRINT: You MUST strictly format the exam according to the official and latest ${form.board} exam pattern for ${form.subject} ${form.grade}. Include all standard sections (Section A, B, C, D, etc.) with the correct marks weightage and standard question types (e.g. MCQs, Assertion-Reason, Short Answer, Long Answer, Case-Based) as per the actual board exams. IMPORTANT: Do NOT generate a short or abbreviated paper. You MUST generate a FULL-LENGTH paper with the EXACT TOTAL MARKS (e.g. 80 Marks or 100 Marks) as mandated by the official curriculum. DO NOT summarize, DO NOT skip questions, and DO NOT stop until the entire paper is completely generated.`
      } else {
        const blueprintString = blueprint.map((item, idx) => 
          `Section ${String.fromCharCode(65 + idx)}: ${item.type} - Generate EXACTLY ${item.count} questions worth ${item.marksPerQuestion} mark(s) each.`
        ).join('\n')
        blueprintPrompt = `CRITICAL EXAM BLUEPRINT (YOU MUST STRICTLY FOLLOW THIS EXACT COUNT AND MARKS):\n${blueprintString}`
      }

      const prompt = `Act as an expert ${form.board} examiner. ${promptPrefix}, generate ${form.useAutoPattern ? 1 : form.paperSets} distinct set(s) of an exam paper.
      
CRITICAL NEP 2020 & CBSE COMPLIANCE:
- Integrate Competency-Based Education (CBE) principles.
- Use LaTeX formatting for all math equations, fractions, and symbols using $ inline and $$ block markers. Ensure proper spacing.
${form.useBlooms ? "- Follow Bloom's Taxonomy: Mix of Remembering (20%), Understanding (30%), Applying (30%), Analyzing/Evaluating (20%)." : ""}
${form.includePYQ ? "- STRICTLY prioritize and adapt ACTUAL Previous Year Board Questions (PYQs) from the past 10 years. If a question is a PYQ, append the year in brackets at the end of the question e.g. '(CBSE 2019)'." : ""}

CRITICAL FORMATTING & NO-ANSWER RULES:
- EXTREMELY IMPORTANT: DO NOT USE MARKDOWN TABLES FOR ANYTHING! The entire paper MUST be generated as plain text paragraphs. Never wrap questions or sections inside a table.
- DO NOT INCLUDE ANY ANSWERS, HINTS, OR BOLDED OPTIONS IN THE QUESTION PAPER SECTION.
${form.includeAnswerKey ? "- All answers MUST ONLY appear in the Answer Key block." : "- DO NOT GENERATE AN ANSWER KEY AT ALL. ONLY GENERATE THE QUESTION PAPER. THIS IS STRICT."}
- DO NOT BOLD THE ENTIRE QUESTION TEXT. Only bold the question number (e.g. "**Q.1** What is..."). The rest of the question MUST be normal unbolded text.
- NEVER use markdown headings (#, ##, ###, ####, etc.) for individual questions. Questions MUST be plain text.
- ALWAYS use proper Markdown headings (###) for Sections (e.g., "### SECTION A").
- For Section Headings, include the marks on the right side: e.g., "### SECTION A: Objective Type Questions [ 10 x 1 = 10 Marks ]"
- ALWAYS format Question Numbers clearly with a bold Q (e.g., "**Q.1**", "**Q.2**").
- For Internal Choices, leave a blank line, type EXACTLY '--- OR ---' on its own line, and leave another blank line before the alternative question.
- For Sub-questions within a section, always number them using lowercase roman numerals like (i), (ii), (iii), (iv).
- For MCQs, YOU MUST format the options in a 2-column layout using plain text. Use exactly this format:
(A) Option 1           (B) Option 2
(C) Option 3           (D) Option 4
- For Fill-in-the-blanks, use "----------" for the blank space.
- For True/False, state the question clearly and add "[True / False]" at the end.
${form.leaveDiagramSpace ? "- DIAGRAM RULE: If a question requires a diagram, circuit, or graph, DO NOT draw it with symbols. Instead, add EXACTLY this placeholder on a new line: '[ SPACE FOR DIAGRAM: Teacher please insert image here ]'." : ""}

Configuration:
- Board: ${form.board} | Subject: ${form.subject} | Grade: ${form.grade}
- Difficulty: ${form.difficulty}
- Language: ${form.language} (If Bilingual, output English immediately followed by Hindi translation for every question)
- Total Marks: ${form.useAutoPattern ? 'Official Board Maximum Marks (e.g. 80 or 100)' : calculatedTotalMarks}

${blueprintPrompt}

For EACH set (Set A, Set B, etc.), use the following exact structure:

SET_START: Set [A/B/C]

**General Instructions:**
*(i) This question paper comprises multiple sections. Read the instructions carefully.*
*(ii) All questions are compulsory. However, internal choices have been provided in some questions. A student has to attempt only one of the alternatives in such questions.*
*(iii) Marks are indicated against each question or section heading.*
*(iv) Please write down the serial number of the question before attempting it.*
*(v) 15 minutes time has been allotted to read this question paper.*
---

[Generate the Questions following the exact Blueprint Sections, maintaining CBSE formatting]

${form.includeAnswerKey ? `
ANSWER_KEY_SEPARATOR
# Answer Key - Set [A/B/C]
[Generate detailed Answer Key with marking scheme]
` : ''}
SET_END

IMPORTANT: 
- Generate exactly ${form.useAutoPattern ? 1 : form.paperSets} set(s).
- Separate sets using SET_START and SET_END.
- Format beautifully using Markdown.`

      let content = await generateAIContent(prompt, { preferGemini: true })

      const sets = []
      // Use split instead of strict match to handle missing SET_ENDs
      const rawSets = content.split(/SET_START:\s*Set\s*[A-Z]?/i).filter(s => s.trim().length > 50)
      
      if (rawSets.length > 0) {
        rawSets.forEach(block => {
          let cleanBlock = block.replace(/SET_END$/i, '').trim()
          let paper = cleanBlock
          let key = ''
          
          if (form.includeAnswerKey) {
            if (cleanBlock.includes('ANSWER_KEY_SEPARATOR')) {
              const parts = cleanBlock.split('ANSWER_KEY_SEPARATOR')
              paper = parts[0].trim()
              key = parts[1] ? parts[1].trim() : ''
            } else {
               // Fallback: AI forgot separator but might have printed 'Answer Key'
               const rogueKeyMatch = cleanBlock.match(/(#*\s*Answer Key|#*\s*Answers|#*\s*Solution)/i);
               if (rogueKeyMatch) {
                 paper = cleanBlock.substring(0, rogueKeyMatch.index).trim();
                 key = cleanBlock.substring(rogueKeyMatch.index).trim();
               } else {
                 key = "Answer key was not clearly separated by AI.";
               }
            }
          } else {
            // User did NOT request Answer Key. Strip if AI disobeyed.
            const rogueKeyMatch = paper.match(/(#*\s*Answer Key|#*\s*Answers|#*\s*Solution)/i);
            if (rogueKeyMatch) {
              paper = paper.substring(0, rogueKeyMatch.index).trim();
            }
          }
          sets.push({ paper, key })
        })
      } else {
        // Absolute Fallback if even SET_START was missing
        let paper = content.replace(/SET_END$/i, '').trim()
        let key = ''
        
        if (form.includeAnswerKey) {
          if (paper.includes('ANSWER_KEY_SEPARATOR')) {
            const parts = paper.split('ANSWER_KEY_SEPARATOR')
            paper = parts[0].trim()
            key = parts[1] ? parts[1].trim() : ''
          } else {
             const rogueKeyMatch = paper.match(/(#*\s*Answer Key|#*\s*Answers|#*\s*Solution)/i);
             if (rogueKeyMatch) {
               key = paper.substring(rogueKeyMatch.index).trim();
               paper = paper.substring(0, rogueKeyMatch.index).trim();
             } else {
               key = "Answer key was not clearly separated by AI.";
             }
          }
        } else {
          const rogueKeyMatch = paper.match(/(#*\s*Answer Key|#*\s*Answers|#*\s*Solution)/i);
          if (rogueKeyMatch) {
            paper = paper.substring(0, rogueKeyMatch.index).trim();
          }
        }
        sets.push({ paper, key })
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
    
    // Header logic
    let headerHTML = ''
    if (activeTab === 'questionPaper') {
      const currentSet = activeSetIndex === 0 ? 'A' : activeSetIndex === 1 ? 'B' : activeSetIndex === 2 ? 'C' : 'A'
      headerHTML = `
        <div style="margin-bottom: 12px; border: 1.5px solid #000; padding: 8px 10px;">
          <table style="width: 100%; border: none; border-collapse: collapse;">
            <tr>
              <td style="width: 55px; border: none; padding: 0; vertical-align: middle;">
                ${schoolLogo ? `<img src="${schoolLogo}" style="max-height: 50px; width: auto;" />` : ''}
              </td>
              <td style="border: none; text-align: center; vertical-align: middle; padding: 0;">
                <div style="font-size: 22px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">${form.institutionName || 'SCHOOL EXAM'}</div>
                <div style="font-size: 13px; font-weight: bold; text-transform: uppercase; margin-top: 3px;">${form.examName || 'Assessment'} ${form.session ? `(${form.session})` : ''}</div>
              </td>
              <td style="width: 55px; border: none; text-align: right; vertical-align: middle; padding: 0;">
                ${schoolLogo ? `<img src="${schoolLogo}" style="max-height: 50px; width: auto;" />` : ''}
              </td>
            </tr>
          </table>
          <table style="width: 100%; border: none; font-size: 11px; font-weight: bold; text-transform: uppercase; margin-top: 6px; border-collapse: collapse;">
            <tr>
              <td style="border: none; padding: 0;">NAME: _______________</td>
              <td style="border: none; padding: 0; text-align: center;">CLASS: ${form.grade.replace(/class\s*/i, '').trim()}</td>
              <td style="border: none; padding: 0; text-align: center;">SUB: ${form.subject}</td>
              <td style="border: none; padding: 0; text-align: center;">SET: ${currentSet}</td>
              <td style="border: none; padding: 0; text-align: center;">MM: ${form.useAutoPattern ? '__' : calculatedTotalMarks}</td>
              <td style="border: none; padding: 0; text-align: right;">TIME: ${form.duration}</td>
            </tr>
          </table>
        </div>
      `
    } else {
      headerHTML = `<h1 style="text-align:center; font-size: 18px; margin-bottom: 10px;">${form.subject} - Answer Key</h1><hr style="margin-bottom: 15px;" />`
    }

    // CRITICAL: Strip out the inner <style> tag from exam-output to avoid CSS conflicts
    let contentHTML = el.innerHTML
    contentHTML = contentHTML.replace(/<style[\s\S]*?<\/style>/gi, '')
    contentHTML = contentHTML.replace(/<div class="section-divider"><\/div>/gi, '')

    printWindow.document.write(`
      <html>
        <head>
          <title>SmartExam_${form.subject}_${docName}</title>
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css" crossorigin="anonymous">
          <style>
            * { box-sizing: border-box; }
            body {
              font-family: 'Times New Roman', Times, serif;
              color: #000;
              font-size: 13px;
              line-height: 1.6;
              padding: 5mm 8mm;
              margin: 0;
              word-wrap: break-word;
              overflow-wrap: break-word;
            }
            h1 { font-size: 18px; text-align: center; margin: 0 0 10px 0; }
            h2 { text-align: center; text-transform: uppercase; font-size: 12.5px; font-weight: 700; letter-spacing: 1px; border-bottom: 1px solid #000; padding-bottom: 2px; margin: 18px 0 8px 0; }
            h3 { text-align: center; text-transform: uppercase; font-size: 12px; font-weight: 700; letter-spacing: 1px; border-bottom: 1px solid #000; padding-bottom: 2px; margin: 16px 0 8px 0; }
            p { margin: 0 0 8px 0; line-height: 1.6; word-wrap: break-word; overflow-wrap: break-word; }
            strong { font-weight: 700; }
            table { border-collapse: collapse; width: 100%; margin: 6px 0; }
            td, th { padding: 3px 5px; text-align: left; word-wrap: break-word; font-size: 12.5px; vertical-align: top; }
            ul, ol { margin: 3px 0 8px 16px; padding: 0; }
            li { margin-bottom: 2px; line-height: 1.5; }
            blockquote { border-left: 2px solid #555; padding: 3px 8px; margin: 6px 0; font-style: italic; }
            code { font-family: 'Courier New', monospace; font-size: 12px; }
            pre { white-space: pre-wrap; word-wrap: break-word; font-size: 11px; margin: 4px 0; }
            h4, h5, h6 { font-size: 13px !important; font-weight: 400 !important; margin: 0 0 8px 0; line-height: 1.6; }
            h4 strong, h5 strong, h6 strong { font-weight: 700 !important; }
            hr { border: none; border-top: 1px solid #000; margin: 12px 0; }
            img { max-width: 100%; height: auto; }
            .or-divider { text-align: center; font-weight: 700; margin: 10px 0; font-size: 12px; }
            .general-instructions { border: 1px solid #000; padding: 6px 10px; margin-bottom: 14px; font-style: italic; font-size: 11.5px; line-height: 1.5; }
            .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 5rem; color: rgba(0,0,0,0.04); z-index: -1; font-weight: bold; pointer-events: none; white-space: nowrap; }
            @media print {
              @page { size: A4 portrait; margin: 8mm; }
              body { padding: 0; }
              p { page-break-inside: avoid; }
              h2, h3 { page-break-after: avoid; page-break-inside: avoid; }
              table { page-break-inside: avoid; }
              .general-instructions { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          ${form.watermarkText ? `<div class="watermark">${form.watermarkText}</div>` : ''}
          ${headerHTML}
          <div>${contentHTML}</div>
          <script>setTimeout(function(){ window.print(); window.close(); }, 800);<\/script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const handleMobilePDF = () => {
    const el = document.getElementById('exam-output')
    if (!el) return
    const docName = activeTab === 'questionPaper' ? 'Question_Paper' : 'Answer_Key'
    
    let headerHTML = ''
    if (activeTab === 'questionPaper') {
      const currentSet = activeSetIndex === 0 ? 'A' : activeSetIndex === 1 ? 'B' : activeSetIndex === 2 ? 'C' : 'A'
      headerHTML = `
        <div style="font-family: 'Times New Roman', Times, serif; color: #000; margin-bottom: 15px; border: 1px solid #000; padding: 10px;">
          <table style="width: 100%; border: none; margin-bottom: 5px; border-collapse: collapse;">
            <tr>
              <td style="width: 60px; border: none; text-align: left; vertical-align: middle; padding: 0;">
                ${schoolLogo ? `<img src="${schoolLogo}" style="max-height: 55px; width: auto;" />` : ''}
              </td>
              <td style="border: none; text-align: center; vertical-align: middle; padding: 0;">
                <div style="font-size: 26px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; line-height: 1.1;">${form.institutionName || 'SCHOOL EXAM'}</div>
                <div style="font-size: 15px; font-weight: bold; text-transform: uppercase; margin-top: 5px;">${form.examName || 'Assessment'} ${form.session ? `(${form.session})` : ''}</div>
              </td>
              <td style="width: 60px; border: none; text-align: right; vertical-align: middle; padding: 0;">
                ${schoolLogo ? `<img src="${schoolLogo}" style="max-height: 55px; width: auto;" />` : ''}
              </td>
            </tr>
          </table>

          <table style="width: 100%; border: none; font-size: 12px; font-weight: bold; text-transform: uppercase; margin-top: 8px; border-collapse: collapse;">
            <tr>
              <td style="border: none; padding: 0;">NAME: _______________</td>
              <td style="border: none; padding: 0; text-align: center;">CLASS: ${form.grade.replace(/class\s*/i, '').trim()}</td>
              <td style="border: none; padding: 0; text-align: center;">SUB: ${form.subject}</td>
              <td style="border: none; padding: 0; text-align: center;">SET: ${currentSet}</td>
              <td style="border: none; padding: 0; text-align: center;">MM: ${form.useAutoPattern ? '__' : calculatedTotalMarks}</td>
              <td style="border: none; padding: 0; text-align: right;">TIME: ${form.duration}</td>
            </tr>
          </table>
        </div>
      `
    } else {
      headerHTML = `<h1 style="text-align:center;">${form.subject} - Answer Key</h1><hr style="margin-bottom: 20px;" />`
    }

    const wrapper = document.createElement('div')
    wrapper.innerHTML = `
      <style>
        * { font-family: 'Times New Roman', Times, serif; color: #000; }
        p { margin: 0 0 14px 0; white-space: pre-wrap; line-height: 1.7; font-size: 15px; page-break-inside: avoid; }
        strong { font-weight: 700; }
        h2 { text-align: center; text-transform: uppercase; font-size: 15px; letter-spacing: 1.5px; border-bottom: 1.5px solid #333; padding-bottom: 4px; margin-top: 28px; page-break-after: avoid; }
        h3 { text-align: center; text-transform: uppercase; font-size: 14px; letter-spacing: 1px; border-bottom: 1.5px solid #333; padding-bottom: 4px; margin-top: 24px; page-break-after: avoid; }
        h4, h5, h6 { font-size: 15px !important; font-weight: 400 !important; margin: 0 0 14px 0; line-height: 1.7; }
        h4 strong, h5 strong, h6 strong { font-weight: 700 !important; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 15px; page-break-inside: avoid; }
        th, td { border: 1px solid #000; padding: 6px; text-align: left; }
        blockquote { border-left: 3px solid #555; padding: 8px 16px; margin: 12px 0; font-style: italic; page-break-inside: avoid; }
        code { font-family: 'Courier New', monospace; background: #f0f0f0; padding: 1px 4px; font-size: 14px; }
        pre { background: #f5f5f5; border: 1px solid #ddd; padding: 10px; font-size: 13px; page-break-inside: avoid; }
        .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 8rem; color: rgba(0,0,0,0.04); z-index: -1; font-weight: bold; pointer-events: none; white-space: nowrap;}
      </style>
      <div style="font-family: 'Times New Roman', Times, serif; color: #000; line-height: 1.7; padding: 10px;">
        ${form.watermarkText ? `<div class="watermark">${form.watermarkText}</div>` : ''}
        ${headerHTML}
        <div style="font-size: 15px;">${el.innerHTML}</div>
      </div>
    `
    
    const opt = {
      margin:       10,
      filename:     `SmartExam_${form.subject}_${docName}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }
    
    html2pdf().set(opt).from(wrapper).save()
  }

  const handleDOCX = async () => {
    const el = document.getElementById('exam-output')
    if (!el) return
    const docName = activeTab === 'questionPaper' ? 'Question_Paper' : 'Answer_Key'
    const fileName = prompt("Enter file name:", `SmartExam_${form.subject}_${docName}.docx`)
    if (!fileName) return

    let headerHTML = ''
    if (activeTab === 'questionPaper') {
      const currentSet = activeSetIndex === 0 ? 'A' : activeSetIndex === 1 ? 'B' : activeSetIndex === 2 ? 'C' : 'A'
      headerHTML = `
        <div style="font-family: 'Times New Roman', Times, serif; color: #000; margin-bottom: 15px; border: 1px solid #000; padding: 10px;">
          <table style="width: 100%; border: none; margin-bottom: 5px; border-collapse: collapse;">
            <tr>
              <td style="width: 60px; border: none; text-align: left; vertical-align: middle; padding: 0;">
                ${schoolLogo ? `<img src="${schoolLogo}" style="max-height: 55px; width: auto;" />` : ''}
              </td>
              <td style="border: none; text-align: center; vertical-align: middle; padding: 0;">
                <div style="font-size: 26px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; line-height: 1.1;">${form.institutionName || 'SCHOOL EXAM'}</div>
                <div style="font-size: 15px; font-weight: bold; text-transform: uppercase; margin-top: 5px;">${form.examName || 'Assessment'} ${form.session ? `(${form.session})` : ''}</div>
              </td>
              <td style="width: 60px; border: none; text-align: right; vertical-align: middle; padding: 0;">
                ${schoolLogo ? `<img src="${schoolLogo}" style="max-height: 55px; width: auto;" />` : ''}
              </td>
            </tr>
          </table>

          <table style="width: 100%; border: none; font-size: 12px; font-weight: bold; text-transform: uppercase; margin-top: 8px; border-collapse: collapse;">
            <tr>
              <td style="border: none; padding: 0;">NAME: _______________</td>
              <td style="border: none; padding: 0; text-align: center;">CLASS: ${form.grade.replace(/class\s*/i, '').trim()}</td>
              <td style="border: none; padding: 0; text-align: center;">SUB: ${form.subject}</td>
              <td style="border: none; padding: 0; text-align: center;">SET: ${currentSet}</td>
              <td style="border: none; padding: 0; text-align: center;">MM: ${form.useAutoPattern ? '__' : calculatedTotalMarks}</td>
              <td style="border: none; padding: 0; text-align: right;">TIME: ${form.duration}</td>
            </tr>
          </table>
        </div>
      `
    } else {
      headerHTML = `<h1 style="text-align:center; font-family: Arial, sans-serif;">${form.subject} - Answer Key</h1><hr style="margin-bottom: 20px;" />`
    }

    const htmlString = `<!DOCTYPE html><html><head><meta charset='utf-8'><title>Exam</title><style>body { font-family: Cambria, Georgia, 'Times New Roman', serif; line-height: 1.4; } p { white-space: pre-wrap; margin-top: 3px; margin-bottom: 3px; } h3 { margin-top: 12px; margin-bottom: 8px; }</style></head><body>${headerHTML}<div>${el.innerHTML}</div></body></html>`
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
      
      {showShop && <TokenShopModal onClose={() => setShowShop(false)} />}

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
                  <div onClick={() => fileInputRef.current?.click()} className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${uploadedFiles.length > 0 ? 'border-fuchsia-400 bg-fuchsia-50/50' : 'border-surface-300 bg-surface-50 hover:bg-surface-100 cursor-pointer'}`}>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".jpg,.jpeg,.png,.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" multiple className="hidden" />
                    {uploadedFiles.length > 0 ? (
                      <div>
                        <div className="flex flex-wrap justify-center gap-3 mb-3">
                          {uploadedFiles.map((f, i) => (
                            <div key={i} className="relative animate-fade-in w-24 h-32 bg-white border border-surface-200 rounded-xl shadow-sm flex flex-col items-center justify-center group">
                              <div className="absolute inset-0 overflow-hidden rounded-xl">
                                {/* Scanning Animation Overlay */}
                                <div className="absolute z-10 inset-0 pointer-events-none">
                                  <div className="animate-doc-scan left-0 right-0 h-[3px] bg-fuchsia-500 shadow-[0_0_12px_3px_rgba(217,70,239,0.9)]"></div>
                                  <div className="absolute inset-0 bg-fuchsia-500/10 mix-blend-overlay animate-pulse"></div>
                                </div>
                                
                                {f.file.type.startsWith('image/') ? (
                                  <img src={f.preview} alt="Preview" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                                ) : (f.file.name || '').toLowerCase().endsWith('.docx') ? (
                                  <div className="w-full h-full flex flex-col items-center justify-center bg-blue-50 text-blue-500"><FileText className="w-8 h-8 mb-1" /><span className="text-[10px] font-bold px-1 truncate w-full text-center">{f.file.name}</span></div>
                                ) : (
                                  <div className="w-full h-full flex flex-col items-center justify-center bg-red-50 text-red-500"><FileText className="w-8 h-8 mb-1" /><span className="text-[10px] font-bold px-1 truncate w-full text-center">{f.file.name}</span></div>
                                )}
                              </div>
                              <button onClick={(e) => { e.stopPropagation(); setUploadedFiles(prev => prev.filter((_, idx) => idx !== i)) }} className="absolute -top-2 -right-2 w-6 h-6 bg-white border border-surface-200 text-surface-500 rounded-full flex items-center justify-center shadow-md hover:text-red-500 z-20"><X className="w-3 h-3" /></button>
                            </div>
                          ))}
                          <div onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }} className="w-24 h-32 border border-dashed border-fuchsia-300 rounded-xl flex flex-col items-center justify-center text-fuchsia-500 hover:bg-fuchsia-100 cursor-pointer transition-colors bg-white/60">
                             <Plus className="w-6 h-6 mb-1" />
                             <span className="text-[10px] font-bold">Add File</span>
                          </div>
                        </div>
                        <p className="text-sm font-bold text-surface-800">{uploadedFiles.length} file(s) selected</p>
                      </div>
                    ) : (
                      <div className="py-8">
                        <div className="w-16 h-16 bg-white border border-surface-200 shadow-sm rounded-full flex items-center justify-center mx-auto mb-4"><UploadCloud className="w-8 h-8 text-fuchsia-500" /></div>
                        <p className="text-base font-bold text-surface-800">Click to Upload Documents</p>
                        <p className="text-xs font-medium text-surface-500 mt-1">Select multiple photos/files (Max 5MB each)</p>
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
                    <div className="flex items-center gap-2">
                      <button onClick={() => setShowTemplates(!showTemplates)} className="text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg flex items-center gap-1"><FolderOpen className="w-3 h-3" /> Templates</button>
                      <button onClick={addBlueprintItem} className="text-[11px] font-bold text-fuchsia-600 bg-fuchsia-50 hover:bg-fuchsia-100 px-2 py-1 rounded-lg flex items-center gap-1"><Plus className="w-3 h-3" /> Add Section</button>
                    </div>
                  </div>

                  {/* Save/Load Templates Panel */}
                  {showTemplates && (
                    <div className="mb-4 p-3 bg-white rounded-xl border border-indigo-200 animate-fade-in">
                      <p className="text-[11px] font-bold text-indigo-800 mb-2">💾 Saved Blueprint Templates</p>
                      {savedTemplates.length === 0 ? (
                        <p className="text-[10px] text-surface-400 text-center py-3">No saved templates yet. Create your blueprint below and save it.</p>
                      ) : (
                        <div className="space-y-1.5 max-h-40 overflow-y-auto mb-3">
                          {savedTemplates.map(tpl => (
                            <div key={tpl.id} className="flex items-center justify-between p-2 bg-indigo-50/50 rounded-lg border border-indigo-100 hover:border-indigo-300 transition-colors">
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-surface-800 truncate">{tpl.name}</p>
                                <p className="text-[10px] text-surface-400">{tpl.board} | {tpl.subject} | {tpl.grade} | {tpl.sections.length} Sections</p>
                              </div>
                              <div className="flex items-center gap-1.5 ml-2">
                                <button onClick={() => loadTemplate(tpl)} className="px-2 py-1 text-[10px] font-bold bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded-md">Load</button>
                                <button onClick={() => deleteTemplate(tpl.id)} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md"><Trash2 className="w-3 h-3" /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-2 pt-2 border-t border-indigo-100">
                        <input type="text" value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="Template name (e.g. 10th Science 80M)" className="flex-1 px-3 py-1.5 bg-surface-50 border border-surface-200 rounded-lg text-xs font-bold" />
                        <button onClick={saveTemplate} className="px-3 py-1.5 text-[11px] font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 whitespace-nowrap">Save Current</button>
                      </div>
                    </div>
                  )}

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
                          <select value={form.useAutoPattern ? 1 : form.paperSets} disabled={form.useAutoPattern} onChange={e=>setForm(f=>({...f,paperSets:parseInt(e.target.value)}))} className={`w-full px-3 py-2 bg-surface-50 border border-surface-200 rounded-lg text-xs font-bold focus:border-fuchsia-400 ${form.useAutoPattern ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            <option value={1}>1 Set (Set A)</option><option value={2}>2 Sets (A, B)</option><option value={3}>3 Sets (A, B, C)</option>
                          </select>
                          {form.useAutoPattern && <p className="text-[9px] text-fuchsia-600 mt-1">Full exams are locked to 1 set per generation.</p>}
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
                      <label className="flex items-center gap-2 cursor-pointer bg-blue-50 p-2 rounded-lg border border-blue-100 mt-2">
                        <input type="checkbox" checked={form.leaveDiagramSpace} onChange={e=>setForm(f=>({...f,leaveDiagramSpace:e.target.checked}))} className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500" />
                        <span className="text-[11px] font-bold text-surface-800">📝 Add Diagram Placeholders (For Teachers to insert images)</span>
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
                
                <button onClick={handleGenerate} disabled={generating || (inputMode==='upload'&&uploadedFiles.length===0) || (inputMode==='vault'&&!selectedVaultItem) || (inputMode==='topic'&&topic.trim().length<3)} className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white font-extrabold rounded-xl hover:from-fuchsia-500 hover:to-indigo-500 transition-all disabled:opacity-40 shadow-lg text-lg">
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
              <button onClick={handlePDF} className="hidden sm:flex items-center gap-2 px-4 py-2.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold rounded-xl" title="Print for Desktop"><Printer className="w-4 h-4" /> Print</button>
              <button onClick={handleMobilePDF} className="flex items-center gap-2 px-4 py-2.5 bg-fuchsia-50 text-fuchsia-700 hover:bg-fuchsia-100 font-bold rounded-xl" title="Download PDF"><Download className="w-4 h-4" /> PDF</button>
              <button onClick={handleDOCX} className="p-2.5 bg-surface-50 text-surface-600 hover:text-surface-900 rounded-xl" title="Download Word"><FileCode className="w-4 h-4" /></button>
              
              <button onClick={handleWhatsAppShare} className="p-2.5 bg-green-50 text-green-600 hover:bg-green-100 rounded-xl" title="Share on WhatsApp"><MessageCircle className="w-4 h-4" /></button>
              <button onClick={() => setShowAnalytics(!showAnalytics)} className={`p-2.5 rounded-xl ${showAnalytics ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'}`} title="Paper Analytics"><BarChart3 className="w-4 h-4" /></button>
              <button onClick={saveToQuestionBank} disabled={savingToBank} className="p-2.5 bg-violet-50 text-violet-600 hover:bg-violet-100 rounded-xl" title="Save to Question Bank">{savingToBank ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}</button>
              <button onClick={() => { setShowQuestionBank(!showQuestionBank); loadQuestionBank() }} className={`p-2.5 rounded-xl ${showQuestionBank ? 'bg-violet-500 text-white' : 'bg-violet-50 text-violet-600 hover:bg-violet-100'}`} title="Question Bank"><BookOpen className="w-4 h-4" /></button>
              
              <div className="hidden sm:block w-px h-6 bg-surface-200 mx-1"></div>
              <button onClick={() => setResults([])} className="flex items-center gap-2 px-4 py-2.5 bg-fuchsia-600 text-white rounded-xl text-sm font-bold hover:bg-fuchsia-700"><RotateCcw className="w-4 h-4"/> Edit/New</button>
            </div>

            {/* ===== REGENERATE SINGLE QUESTION ===== */}
            {activeTab === 'questionPaper' && !isEditing && (
              <div className="mt-3 flex flex-wrap items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                <RefreshCw className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="text-xs font-bold text-amber-800">Replace a question:</span>
                <input
                  type="number"
                  min="1"
                  placeholder="Q No."
                  className="w-20 px-2 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-bold text-center focus:outline-none focus:border-amber-500"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && e.target.value) handleRegenerateQuestion(parseInt(e.target.value))
                  }}
                  id="regen-q-input"
                />
                <button
                  disabled={!!regeneratingQ}
                  onClick={() => {
                    const val = document.getElementById('regen-q-input')?.value
                    if (val) handleRegenerateQuestion(parseInt(val))
                  }}
                  className="px-3 py-1.5 text-xs font-bold bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 flex items-center gap-1"
                >
                  {regeneratingQ ? <><Loader2 className="w-3 h-3 animate-spin" /> Replacing Q.{regeneratingQ}...</> : 'Replace Question'}
                </button>
              </div>
            )}
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
            
            <div id="exam-output" className="relative z-10 w-full max-w-4xl mx-auto">
              <style>{`
                .katex-display { margin: 0.8em 0; } 
                .katex { font-size: 1.1em; }

                /* ===== CBSE EXAM PAPER STYLESHEET ===== */
                #exam-output {
                  font-family: 'Times New Roman', Times, serif;
                  color: #1a1a1a;
                  font-size: 15px;
                  line-height: 1.7;
                }

                /* --- General Instructions Block --- */
                #exam-output .general-instructions {
                  border: 1.5px solid #333;
                  padding: 16px 20px;
                  margin-bottom: 28px;
                  background: #fafafa;
                }
                #exam-output .general-instructions p {
                  margin: 0 0 4px 0;
                  font-size: 13px;
                  font-style: italic;
                  color: #333;
                }
                #exam-output .general-instructions strong {
                  font-style: normal;
                  font-size: 14px;
                }

                /* --- Section Headings --- */
                #exam-output h2 {
                  text-align: center;
                  text-transform: uppercase;
                  font-size: 15px;
                  font-weight: 700;
                  letter-spacing: 1.5px;
                  margin: 36px 0 6px 0;
                  padding: 0;
                  font-family: 'Times New Roman', Times, serif;
                }
                #exam-output h3 {
                  text-align: center;
                  text-transform: uppercase;
                  font-size: 14px;
                  font-weight: 700;
                  letter-spacing: 1px;
                  margin: 32px 0 6px 0;
                  padding: 0;
                  font-family: 'Times New Roman', Times, serif;
                }
                #exam-output .section-divider {
                  width: 100%;
                  height: 1.5px;
                  background: #333;
                  margin: 4px 0 20px 0;
                }

                /* --- Questions --- */
                #exam-output p {
                  font-weight: 400 !important;
                  margin: 0 0 16px 0;
                  line-height: 1.7;
                  font-size: 15px;
                }
                #exam-output strong {
                  font-weight: 700 !important;
                }

                /* --- OR Divider --- */
                #exam-output .or-divider {
                  text-align: center;
                  font-weight: 700;
                  font-size: 14px;
                  letter-spacing: 2px;
                  margin: 20px 0;
                  padding: 6px 0;
                  color: #333;
                }

                /* --- Lists (sub-questions) --- */
                #exam-output ul, #exam-output ol {
                  margin: 4px 0 16px 24px;
                  padding: 0;
                }
                #exam-output li {
                  font-weight: 400 !important;
                  margin-bottom: 6px;
                  line-height: 1.6;
                  font-size: 15px;
                }

                /* --- Horizontal Rule (section breaks) --- */
                #exam-output hr {
                  border: none;
                  border-top: 1.5px solid #333;
                  margin: 28px 0;
                }

                /* --- Tables --- */
                #exam-output table {
                  border-collapse: collapse;
                  width: 100%;
                  margin: 12px 0;
                  font-size: 14px;
                }
                #exam-output th, #exam-output td {
                  border: 1px solid #555;
                  padding: 6px 10px;
                  text-align: left;
                }
                #exam-output th {
                  background: #eee;
                  font-weight: 700;
                }

                /* --- Blockquotes (for General Instructions, tips) --- */
                #exam-output blockquote {
                  border-left: 3px solid #555;
                  margin: 12px 0;
                  padding: 8px 16px;
                  background: #f9f9f9;
                  font-style: italic;
                  color: #444;
                }

                /* --- Fallback headings (h4, h5, h6) look like normal text --- */
                #exam-output h4, #exam-output h5, #exam-output h6 {
                  font-family: 'Times New Roman', Times, serif !important;
                  font-size: 15px !important;
                  font-weight: 400 !important;
                  margin: 0 0 16px 0;
                  line-height: 1.7;
                }
                #exam-output h4 strong, #exam-output h5 strong, #exam-output h6 strong {
                  font-weight: 700 !important;
                }

                /* --- Diagram Placeholder --- */
                #exam-output p:has(> em) {
                  font-style: italic;
                }

                /* --- Code blocks (inline code for keywords) --- */
                #exam-output code {
                  font-family: 'Courier New', monospace;
                  background: #f0f0f0;
                  padding: 1px 5px;
                  border-radius: 3px;
                  font-size: 14px;
                }
                #exam-output pre {
                  background: #f5f5f5;
                  border: 1px solid #ddd;
                  padding: 12px;
                  border-radius: 4px;
                  overflow-x: auto;
                  font-size: 13px;
                  margin: 12px 0;
                }
              `}</style>
              
              {isEditing ? (
                <textarea 
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full min-h-[600px] p-6 bg-surface-50 border-2 border-emerald-400 rounded-xl font-mono text-sm focus:outline-none focus:ring-4 focus:ring-emerald-100 resize-y"
                  placeholder="Edit your markdown here..."
                />
              ) : (
                <div style={{ color: '#1a1a1a' }}>
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm, remarkMath]} 
                    rehypePlugins={[rehypeKatex]}
                    components={{
                      p: ({node, children}) => {
                        const text = typeof children === 'string' ? children : (Array.isArray(children) ? children.map(c => typeof c === 'string' ? c : '').join('') : '');
                        if (text.includes('--- OR ---') || text.includes('---OR---') || text === 'OR') {
                          return <div className="or-divider">— OR —</div>
                        }
                        // General Instructions block
                        if (text.includes('General Instructions')) {
                          return <div className="general-instructions"><strong>{children}</strong></div>
                        }
                        return <p>{children}</p>
                      },
                      h2: ({children}) => (
                        <>
                          <h2>{children}</h2>
                          <div className="section-divider"></div>
                        </>
                      ),
                      h3: ({children}) => (
                        <>
                          <h3>{children}</h3>
                          <div className="section-divider"></div>
                        </>
                      ),
                      hr: () => <hr />,
                    }}
                  >
                    {activeTab === 'questionPaper' ? results[activeSetIndex]?.paper : results[activeSetIndex]?.key}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
