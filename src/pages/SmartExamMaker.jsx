import { useState, useRef } from 'react'
import { FileQuestion, Sparkles, Loader2, Download, Copy, Check, RotateCcw, Image as ImageIcon, FileText, UploadCloud, X, Share2, FileCode } from 'lucide-react'
import { generateWithGeminiVision, generateAIContent } from '../utils/aiService'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { saveAs } from 'file-saver'
import { asBlob } from 'html-docx-js-typescript'

const boardList = ['CBSE', 'ICSE', 'State Board', 'IB', 'Cambridge', 'General']
const gradeList = ['Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12']
const marksList = ['20 Marks (Unit Test)', '40 Marks (Mid-Term)', '80 Marks (Final Exam)', '100 Marks (Board Style)']
const timeList = ['30 Minutes', '1 Hour', '1.5 Hours', '2 Hours', '3 Hours']
const subjectList = ['Mathematics', 'Science', 'Physics', 'Chemistry', 'Biology', 'English', 'Hindi', 'Social Studies', 'History', 'Geography', 'Computer Science', 'Economics', 'Accountancy']

export default function SmartExamMaker() {
  const [form, setForm] = useState({ 
    board: 'CBSE', 
    subject: '', 
    grade: '', 
    totalMarks: '80 Marks (Final Exam)', 
    duration: '2 Hours', 
    includeAnswerKey: true,
    institutionName: '',
    coachingName: '',
    session: '',
    unitType: ''
  })
  const [inputMode, setInputMode] = useState('upload') // 'upload' or 'topic'
  const [topic, setTopic] = useState('')
  const [file, setFile] = useState(null)
  const [filePreview, setFilePreview] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [questionPaper, setQuestionPaper] = useState('')
  const [answerKey, setAnswerKey] = useState('')
  const [activeTab, setActiveTab] = useState('questionPaper')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [suggestedChapters, setSuggestedChapters] = useState([])
  const [fetchingChapters, setFetchingChapters] = useState(false)
  const fileInputRef = useRef(null)

  const canGenerate = form.subject && form.grade && (inputMode === 'upload' ? file : topic.trim().length > 3)

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (!selectedFile) return
    
    // Check if it's an image or pdf
    if (!selectedFile.type.startsWith('image/') && selectedFile.type !== 'application/pdf') {
      setError('Please upload a valid Image (JPG, PNG) or PDF file.')
      return
    }
    
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB.')
      return
    }

    setFile(selectedFile)
    setError('')

    // Generate preview
    const reader = new FileReader()
    reader.onload = () => {
      setFilePreview(reader.result)
    }
    reader.readAsDataURL(selectedFile)
  }

  const handleFetchChapters = async () => {
    if (!form.board || !form.grade || !form.subject) {
      setError('Please select Board, Class, and Subject first to fetch chapters.');
      return;
    }
    setFetchingChapters(true);
    setError('');
    try {
      const prompt = `You are a curriculum expert. List the official syllabus chapter names for ${form.board} ${form.grade} ${form.subject}. 
Return EXACTLY a JSON array of strings, with NO markdown formatting, NO backticks, and NO extra text.
Example: ["Chapter 1: Real Numbers", "Chapter 2: Polynomials"]`;
      const response = await generateAIContent(prompt);
      const jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim();
      const chapters = JSON.parse(jsonStr);
      if (Array.isArray(chapters) && chapters.length > 0) {
        setSuggestedChapters(chapters);
      } else {
        throw new Error("Invalid chapters format");
      }
    } catch (err) {
      console.error("Fetch chapters error:", err);
      setError('Failed to auto-fetch chapters. Please type the topic manually.');
    } finally {
      setFetchingChapters(false);
    }
  }

  const toggleChapter = (ch) => {
    setTopic(prev => {
      let chapters = prev.split('\n').map(s => s.trim()).filter(Boolean);
      if (chapters.includes(ch)) {
        chapters = chapters.filter(c => c !== ch);
      } else {
        chapters.push(ch);
      }
      return chapters.join('\n');
    });
  }

  const handleGenerate = async () => {
    setGenerating(true)
    setError('')
    try {
      let base64Data = null;
      let mimeType = null;
      let promptPrefix = '';

      if (inputMode === 'upload') {
        if (!filePreview) throw new Error("File not loaded properly. Please re-upload.");
        base64Data = filePreview.split(',')[1];
        mimeType = file.type;
        promptPrefix = `I am providing you an image or PDF of a syllabus, textbook chapter, or notes. Based ONLY on the content provided in the file`;
      } else {
        promptPrefix = `Based on the official syllabus and topics for the following chapter/topic: "${topic}"`;
      }

      let headerBlock = '';
      if (form.institutionName || form.coachingName) {
        headerBlock += `# ${form.institutionName || form.coachingName}\n`;
      }
      if (form.session || form.unitType) {
        let subHeader = [];
        if (form.session) subHeader.push(`Session: ${form.session}`);
        if (form.unitType) subHeader.push(form.unitType);
        if (subHeader.length > 0) headerBlock += `### ${subHeader.join(' | ')}\n`;
      }
      headerBlock += `**Subject:** ${form.subject} | **Class:** ${form.grade}\n`;
      headerBlock += `**Time Allowed:** ${form.duration} | **Maximum Marks:** ${form.totalMarks}\n`;

      const prompt = `Act as an expert ${form.board} teacher. ${promptPrefix}, generate a highly structured ${form.totalMarks} exam paper.

Configuration:
- Institution Name: ${form.institutionName || 'Not specified'}
- Coaching Name: ${form.coachingName || 'Not specified'}
- Session: ${form.session || 'Not specified'}
- Unit/Exam Type: ${form.unitType || 'Not specified'}
- Board: ${form.board}
- Subject: ${form.subject}
- Grade: ${form.grade}
- Duration: ${form.duration}
${inputMode === 'topic' ? `- Topic: ${topic}` : ''}

Structure Requirements:
Create a professional header block EXACTLY as follows:
${headerBlock}

*General Instructions: Read all instructions carefully. Marks are indicated against each question.*

---
**Exam Pattern & Blueprint:**
You MUST strictly follow the LATEST official exam blueprint, section-wise weightage, and typography for the **${form.board}** Board, **${form.grade}**, **${form.subject}**.
- Include exactly the sections mandated by ${form.board} (For example, CBSE typically requires Section A (MCQs/Assertion-Reason), Section B (VSA), Section C (SA), Section D (LA), and Section E (Case-Based/Source-Based questions)).
- Clearly state the instructions and marks for each section and question just like the official ${form.board} board papers.
- Ensure the difficulty level and typology of questions (Competency-based, analytical, etc.) perfectly match the official ${form.board} standards.
- If this is a smaller unit test (e.g., 20 or 40 marks), adapt the official pattern proportionally while maintaining the core question types.

${form.includeAnswerKey ? `
IMPORTANT: You MUST separate the Question Paper and the Answer Key with exactly this delimiter on a new line:
--- ANSWER_KEY_SEPARATOR ---

Then, generate the Answer Key. The Answer Key MUST ALSO start with the exact same header block as the question paper, but append " - ANSWER KEY" to the title. Provide detailed marking scheme for each question.
` : ''}

Ensure all questions are directly derived from the specified material. Use professional markdown formatting.`

      const content = await generateWithGeminiVision(prompt, base64Data, mimeType)
      
      if (form.includeAnswerKey && content.includes('--- ANSWER_KEY_SEPARATOR ---')) {
        const parts = content.split('--- ANSWER_KEY_SEPARATOR ---');
        setQuestionPaper(parts[0].trim());
        setAnswerKey(parts[1].trim());
      } else if (form.includeAnswerKey && content.includes('ANSWER_KEY_SEPARATOR')) {
         const parts = content.split('ANSWER_KEY_SEPARATOR');
        setQuestionPaper(parts[0].replace(/---/g, '').trim());
        setAnswerKey(parts[1].replace(/---/g, '').trim());
      } else {
        setQuestionPaper(content);
        setAnswerKey('');
      }
      setActiveTab('questionPaper');
    } catch (err) { 
      console.error(err)
      setError(err.message || 'Failed to generate exam paper. Please try again.') 
    } finally { 
      setGenerating(false) 
    }
  }

  const handleCopy = () => { 
    const textToCopy = activeTab === 'questionPaper' ? questionPaper : answerKey;
    navigator.clipboard.writeText(textToCopy); 
    setCopied(true); 
    setTimeout(() => setCopied(false), 2000) 
  }
  
  const handlePDF = () => {
    const el = document.getElementById('exam-output')
    if (!el) return
    
    const docName = activeTab === 'questionPaper' ? 'Question_Paper' : 'Answer_Key';
    const printWindow = window.open('', '_blank');
    
    printWindow.document.write(`
      <html>
        <head>
          <title>SmartExam_${form.subject}_${docName}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              padding: 40px; 
              color: #000; 
              line-height: 1.6;
            }
            h1, h2, h3 { color: #000; text-align: center; margin-bottom: 15px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #000; padding: 10px; text-align: left; }
            hr { border: none; border-top: 1px solid #000; margin: 20px 0; }
            blockquote { border-left: 4px solid #ccc; padding-left: 15px; font-style: italic; }
            @media print {
              @page { margin: 20mm; }
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          ${el.innerHTML}
          <script>
            setTimeout(() => {
              window.print();
              window.close();
            }, 250);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  const handleDOCX = async () => {
    const el = document.getElementById('exam-output');
    if (!el) return;
    
    const docName = activeTab === 'questionPaper' ? 'Question_Paper' : 'Answer_Key';
    const safeSubject = (form.subject || 'Exam').replace(/[^a-zA-Z0-9]/g, '_');
    const defaultName = `SmartExam_${safeSubject}_${docName}`;
    
    let fileName = window.prompt("Enter file name for your Word Document:", defaultName);
    if (!fileName) return; // User cancelled
    
    // Ensure .docx extension
    if (!fileName.toLowerCase().endsWith('.docx')) {
      fileName = fileName.replace(/\.doc$/, '') + '.docx';
    }
    
    // Create a clean HTML wrapper
    const header = "<!DOCTYPE html><html><head><meta charset='utf-8'><title>Exam Document</title></head><body>";
    const footer = "</body></html>";
    const htmlString = header + el.innerHTML + footer;
    
    try {
      // Convert HTML to true DOCX blob
      const blob = await asBlob(htmlString, { orientation: 'portrait' });
      // Trigger download
      saveAs(blob, fileName);
    } catch (err) {
      console.error('DOCX Generation Error:', err);
      alert('Failed to generate DOCX file. Please try the Print / PDF option instead.');
    }
  }

  const handleShare = async () => {
    const textToShare = activeTab === 'questionPaper' ? questionPaper : answerKey;
    const title = activeTab === 'questionPaper' ? `${form.subject} Exam Paper` : `${form.subject} Answer Key`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: textToShare,
        })
      } catch (err) {
        console.log('Error sharing:', err)
      }
    } else {
      handleCopy();
      alert("Sharing not supported on this browser. Text copied to clipboard instead.");
    }
  }

  const handleReset = () => { 
    setQuestionPaper('')
    setAnswerKey('')
    setFile(null)
    setFilePreview(null)
    setError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="max-w-[1000px] mx-auto animate-fade-in-up pb-24 lg:pb-8">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-fuchsia-600 via-purple-600 to-indigo-700 rounded-[32px] p-8 sm:p-12 mb-8 shadow-2xl">
        <div className="absolute top-0 right-0 -translate-y-1/3 translate-x-1/4 w-[500px] h-[500px] bg-white/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 border border-white/30 text-white text-xs font-black tracking-widest uppercase mb-5">
            <Sparkles className="w-4 h-4" /> AI Vision Engine
          </div>
          <h1 className="text-3xl sm:text-4xl font-black font-display text-white tracking-tight mb-3">
            Smart Exam <span className="text-purple-200">Maker</span>
          </h1>
          <p className="text-purple-100 font-medium text-sm sm:text-base max-w-xl">
            Upload a photo of a textbook page or a PDF chapter, and our AI will instantly generate a professional, board-aligned exam paper.
          </p>
        </div>
      </div>

      {!questionPaper ? (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Column: Input Source */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-[28px] border border-surface-200 shadow-sm p-6 sm:p-8 h-full">
              <h2 className="text-lg font-black text-surface-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-fuchsia-600" />
                Source Material
              </h2>
              
              <div className="flex bg-surface-100 p-1 rounded-xl mb-6">
                <button 
                  onClick={() => setInputMode('upload')}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${inputMode === 'upload' ? 'bg-white text-fuchsia-600 shadow-sm' : 'text-surface-600 hover:text-surface-800'}`}
                >
                  Upload File
                </button>
                <button 
                  onClick={() => setInputMode('topic')}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${inputMode === 'topic' ? 'bg-white text-fuchsia-600 shadow-sm' : 'text-surface-600 hover:text-surface-800'}`}
                >
                  Select Topic
                </button>
              </div>

              {inputMode === 'upload' ? (
              <div 
                className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${file ? 'border-fuchsia-400 bg-fuchsia-50/50' : 'border-surface-300 bg-surface-50 hover:bg-surface-100 hover:border-fuchsia-300 cursor-pointer'}`}
                onClick={() => !file && fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/jpeg, image/png, application/pdf" 
                  className="hidden" 
                />
                
                {file ? (
                  <div className="relative animate-fade-in">
                    {file.type.startsWith('image/') ? (
                      <div className="aspect-[3/4] max-h-[250px] mx-auto rounded-xl overflow-hidden shadow-sm mb-3 border border-surface-200">
                        <img src={filePreview} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-20 h-20 bg-red-100 text-red-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-sm">
                        <FileText className="w-10 h-10" />
                      </div>
                    )}
                    <p className="text-sm font-bold text-surface-800 truncate px-4">{file.name}</p>
                    <p className="text-xs font-semibold text-surface-500 mt-0.5">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    
                    <button 
                      onClick={(e) => { e.stopPropagation(); setFile(null); setFilePreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                      className="absolute -top-3 -right-3 w-8 h-8 bg-white border border-surface-200 text-surface-500 rounded-full flex items-center justify-center shadow-md hover:text-red-500 hover:border-red-200 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="py-8">
                    <div className="w-16 h-16 bg-white border border-surface-200 shadow-sm rounded-full flex items-center justify-center mx-auto mb-4">
                      <UploadCloud className="w-8 h-8 text-fuchsia-500" />
                    </div>
                    <p className="text-base font-bold text-surface-800 mb-1">Click to Upload</p>
                    <p className="text-xs font-medium text-surface-500">Supports JPG, PNG, or PDF</p>
                    <p className="text-[10px] font-semibold text-surface-400 mt-4 px-4 bg-white py-1 rounded-full border border-surface-100 inline-block">Max Size: 5MB</p>
                  </div>
                )}
              </div>
              ) : (
                <div className="animate-fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <label className="block text-sm font-bold text-surface-700">Chapter or Topic Name *</label>
                    <button 
                      onClick={handleFetchChapters} 
                      disabled={fetchingChapters || !form.board || !form.grade || !form.subject}
                      className="text-xs font-extrabold text-fuchsia-600 bg-fuchsia-50 hover:bg-fuchsia-100 px-3 py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {fetchingChapters ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      {fetchingChapters ? 'Fetching...' : 'Auto-fetch Chapters'}
                    </button>
                  </div>
                  
                  {suggestedChapters.length > 0 && (
                    <div className="mb-3 animate-fade-in-up">
                      <p className="text-xs font-bold text-fuchsia-700 mb-2">Select one or more chapters:</p>
                      <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-3 bg-fuchsia-50/50 rounded-xl border border-fuchsia-100">
                        {suggestedChapters.map((ch, i) => {
                          const isSelected = topic.split('\n').map(s=>s.trim()).includes(ch);
                          return (
                            <button
                              key={i}
                              onClick={() => toggleChapter(ch)}
                              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all text-left ${isSelected ? 'bg-fuchsia-600 text-white border-fuchsia-600 shadow-sm' : 'bg-white text-surface-600 border-surface-200 hover:border-fuchsia-300 hover:text-fuchsia-600'}`}
                            >
                              {isSelected && <Check className="w-3 h-3 inline-block mr-1" />}
                              {ch}
                            </button>
                          )
                        })}
                      </div>
                      <div className="flex items-center gap-3 my-3">
                        <div className="flex-1 h-px bg-surface-200"></div>
                        <div className="text-[10px] font-black text-surface-400 uppercase tracking-widest">OR TYPE MANUALLY</div>
                        <div className="flex-1 h-px bg-surface-200"></div>
                      </div>
                    </div>
                  )}

                  <textarea 
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. NCERT Science Chapter 4: Carbon and its Compounds"
                    className="w-full px-4 py-3 bg-surface-50 border-2 border-surface-200 rounded-xl text-sm font-medium focus:outline-none focus:border-fuchsia-400 transition-all resize-none h-24 shadow-inner"
                  ></textarea>
                  <p className="text-xs text-surface-500 mt-2 font-medium">The AI will use the official syllabus to generate questions for this topic.</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Configuration */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-[28px] border border-surface-200 shadow-sm p-6 sm:p-8 h-full flex flex-col">
              <h2 className="text-lg font-black text-surface-900 mb-6 flex items-center gap-2">
                <FileQuestion className="w-5 h-5 text-indigo-600" />
                Exam Configuration
              </h2>

              {/* Institution Header Settings */}
              <div className="mb-6 p-4 bg-surface-50 rounded-xl border border-surface-200">
                <h3 className="text-sm font-bold text-surface-800 mb-4 border-b border-surface-200 pb-2">Header Details (Optional)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-surface-700 mb-1">School Name</label>
                    <input type="text" value={form.institutionName} onChange={e=>setForm(f=>({...f,institutionName:e.target.value}))} placeholder="e.g. Delhi Public School" className="w-full px-3 py-2 bg-white border border-surface-300 rounded-lg text-sm focus:outline-none focus:border-fuchsia-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-surface-700 mb-1">Coaching Name</label>
                    <input type="text" value={form.coachingName} onChange={e=>setForm(f=>({...f,coachingName:e.target.value}))} placeholder="e.g. Allen Career Institute" className="w-full px-3 py-2 bg-white border border-surface-300 rounded-lg text-sm focus:outline-none focus:border-fuchsia-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-surface-700 mb-1">Session</label>
                    <input type="text" value={form.session} onChange={e=>setForm(f=>({...f,session:e.target.value}))} placeholder="e.g. 2024-25" className="w-full px-3 py-2 bg-white border border-surface-300 rounded-lg text-sm focus:outline-none focus:border-fuchsia-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-surface-700 mb-1">Unit / Exam Type</label>
                    <input type="text" value={form.unitType} onChange={e=>setForm(f=>({...f,unitType:e.target.value}))} placeholder="e.g. Unit Test 1" className="w-full px-3 py-2 bg-white border border-surface-300 rounded-lg text-sm focus:outline-none focus:border-fuchsia-400" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                <div>
                  <label className="block text-sm font-bold text-surface-700 mb-1.5">Grade/Class *</label>
                  <select value={form.grade} onChange={e=>setForm(f=>({...f,grade:e.target.value}))} className="w-full px-4 py-3 bg-surface-50 border-2 border-surface-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-fuchsia-400 transition-all">
                    <option value="">Select Class...</option>
                    {gradeList.map(g=><option key={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-surface-700 mb-1.5">Subject *</label>
                  <select value={form.subject} onChange={e=>setForm(f=>({...f,subject:e.target.value}))} className="w-full px-4 py-3 bg-surface-50 border-2 border-surface-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-fuchsia-400 transition-all">
                    <option value="">Select Subject...</option>
                    {subjectList.map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-surface-700 mb-1.5">Board</label>
                  <select value={form.board} onChange={e=>setForm(f=>({...f,board:e.target.value}))} className="w-full px-4 py-3 bg-surface-50 border-2 border-surface-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-fuchsia-400 transition-all">
                    {boardList.map(b=><option key={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-surface-700 mb-1.5">Total Marks</label>
                  <select value={form.totalMarks} onChange={e=>setForm(f=>({...f,totalMarks:e.target.value}))} className="w-full px-4 py-3 bg-surface-50 border-2 border-surface-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-fuchsia-400 transition-all">
                    {marksList.map(m=><option key={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-surface-700 mb-1.5">Duration</label>
                  <select value={form.duration} onChange={e=>setForm(f=>({...f,duration:e.target.value}))} className="w-full px-4 py-3 bg-surface-50 border-2 border-surface-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-fuchsia-400 transition-all">
                    {timeList.map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div className="mb-8 p-4 bg-purple-50/50 border border-purple-100 rounded-xl">
                <label className="flex items-center gap-3 text-sm font-bold text-surface-800 cursor-pointer">
                  <input type="checkbox" checked={form.includeAnswerKey} onChange={e=>setForm(f=>({...f,includeAnswerKey:e.target.checked}))} className="w-5 h-5 rounded border-surface-300 text-fuchsia-600 focus:ring-fuchsia-500" /> 
                  Generate Answer Key Separately
                </label>
              </div>

              <div className="mt-auto">
                {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-sm text-red-700 font-bold">{error}</div>}
                <button 
                  onClick={handleGenerate} 
                  disabled={!canGenerate || generating || fetchingChapters}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white font-extrabold rounded-xl hover:from-fuchsia-500 hover:to-purple-500 transition-all disabled:opacity-40 shadow-lg text-lg"
                >
                  {generating ? <><Loader2 className="w-5 h-5 animate-spin"/> Processing Document...</> : <><Sparkles className="w-5 h-5"/> Generate Smart Exam</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="animate-fade-in">
          {/* Tabs */}
          {form.includeAnswerKey && answerKey && (
            <div className="flex bg-surface-100 p-1.5 rounded-2xl mb-6 max-w-md mx-auto">
              <button 
                onClick={() => setActiveTab('questionPaper')}
                className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${activeTab === 'questionPaper' ? 'bg-white text-fuchsia-600 shadow-md' : 'text-surface-600 hover:text-surface-800'}`}
              >
                Question Paper
              </button>
              <button 
                onClick={() => setActiveTab('answerKey')}
                className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${activeTab === 'answerKey' ? 'bg-white text-indigo-600 shadow-md' : 'text-surface-600 hover:text-surface-800'}`}
              >
                Answer Key
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 mb-6">
            <button onClick={handleCopy} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${copied?'bg-emerald-100 text-emerald-700':'bg-white border border-surface-200 text-surface-700 hover:bg-surface-50'}`}>
              {copied?<><Check className="w-4 h-4"/> Copied!</>:<><Copy className="w-4 h-4"/> Copy</>}
            </button>
            <button onClick={handlePDF} className="flex items-center gap-2 px-5 py-2.5 bg-white border border-surface-200 text-surface-700 rounded-xl text-sm font-bold hover:bg-surface-50 shadow-sm">
              <Download className="w-4 h-4"/> Print / PDF
            </button>
            <button onClick={handleDOCX} className="flex items-center gap-2 px-5 py-2.5 bg-white border border-surface-200 text-surface-700 rounded-xl text-sm font-bold hover:bg-surface-50 shadow-sm">
              <FileCode className="w-4 h-4"/> DOCX
            </button>
            <button onClick={handleShare} className="flex items-center gap-2 px-5 py-2.5 bg-white border border-surface-200 text-surface-700 rounded-xl text-sm font-bold hover:bg-surface-50 shadow-sm">
              <Share2 className="w-4 h-4"/> Share
            </button>
            <button onClick={handleReset} className="flex items-center gap-2 px-5 py-2.5 bg-fuchsia-600 text-white rounded-xl text-sm font-bold hover:bg-fuchsia-700 shadow-md ml-auto">
              <RotateCcw className="w-4 h-4"/> Create New
            </button>
          </div>
          
          <div id="exam-output" className="bg-white rounded-[28px] border border-surface-200 shadow-sm p-8 sm:p-12 md:p-16 prose prose-slate max-w-none prose-headings:font-display prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-table:text-sm min-h-[600px]">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {activeTab === 'questionPaper' ? questionPaper : answerKey}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  )
}
