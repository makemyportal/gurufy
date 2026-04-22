import { useState } from 'react'
import { FileQuestion, Sparkles, Loader2, Download, Copy, Check, RotateCcw, X, Plus } from 'lucide-react'
import { generateAIContent } from '../utils/aiService'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const boardList = ['CBSE', 'ICSE', 'State Board', 'IB', 'Cambridge', 'General']
const gradeList = ['Class 1-3', 'Class 4-5', 'Class 6-8', 'Class 9-10', 'Class 11-12']
const marksList = ['20 Marks (Unit Test)', '40 Marks (Mid-Term)', '80 Marks (Final Exam)', '100 Marks (Board Style)']
const timeList = ['30 Minutes', '1 Hour', '1.5 Hours', '2 Hours', '3 Hours']
const subjectList = ['Mathematics', 'Science', 'Physics', 'Chemistry', 'Biology', 'English', 'Hindi', 'Social Studies', 'History', 'Geography', 'Computer Science', 'Economics', 'Accountancy']

export default function ExamPaperGen() {
  const [form, setForm] = useState({ board:'CBSE', subject:'', grade:'', totalMarks:'80 Marks (Final Exam)', duration:'2 Hours', chapters:[], chapterInput:'', mcqPct:30, shortPct:40, longPct:30, includeHOTS:true, includeAnswerKey:true })
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const addChapter = () => {
    if (form.chapterInput.trim() && !form.chapters.includes(form.chapterInput.trim())) {
      setForm(f => ({ ...f, chapters: [...f.chapters, f.chapterInput.trim()], chapterInput: '' }))
    }
  }
  const removeChapter = (ch) => setForm(f => ({ ...f, chapters: f.chapters.filter(c => c !== ch) }))

  const canGenerate = form.subject && form.grade && form.chapters.length > 0

  const handleGenerate = async () => {
    setGenerating(true); setError('')
    try {
      const prompt = `Create a structured ${form.totalMarks} exam paper.\nBoard: ${form.board}\nSubject: ${form.subject}\nGrade: ${form.grade}\nChapters: ${form.chapters.join(', ')}\nDuration: ${form.duration}\nQuestion Distribution: MCQ ~${form.mcqPct}%, Short Answer ~${form.shortPct}%, Long Answer ~${form.longPct}%\n${form.includeHOTS ? 'Include HOTS/Application-based questions.' : ''}\n\nFormat:\n# ${form.subject} Examination\n**Board:** ${form.board} | **Grade:** ${form.grade} | **Total Marks:** ${form.totalMarks} | **Time:** ${form.duration}\n*Instructions: Attempt all questions. Marks indicated against each.*\n\n---\n\n### Section A: Objective Type (1 mark each)\n[MCQ/True-False/Fill-in-blank]\n\n### Section B: Short Answer (2-3 marks each)\n[Short answer questions]\n\n### Section C: Long Answer (5 marks each)\n[Detailed questions]\n\n${form.includeHOTS ? '### Section D: HOTS / Application\n[Case-study/application questions]' : ''}\n\n---\n${form.includeAnswerKey ? '> **Answer Key & Marking Scheme:** [Complete answers with marks]' : ''}`
      const content = await generateAIContent(prompt)
      setResult(content)
    } catch (err) { setError(err.message || 'Failed.') }
    finally { setGenerating(false) }
  }

  const handleCopy = () => { navigator.clipboard.writeText(result); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  const handlePDF = async () => {
    const el = document.getElementById('exam-output')
    if (!el) return
    const html2pdf = (await import('html2pdf.js')).default
    html2pdf().set({ margin:[10,10,10,10], filename:`Exam_${form.subject}.pdf`, image:{type:'jpeg',quality:0.98}, html2canvas:{scale:2}, jsPDF:{unit:'mm',format:'a4'} }).from(el).save()
  }
  const handleReset = () => { setResult(''); setError('') }

  return (
    <div className="max-w-[1000px] mx-auto animate-fade-in-up pb-24 lg:pb-8">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-rose-600 via-pink-600 to-fuchsia-700 rounded-[32px] p-8 sm:p-12 mb-8 shadow-2xl">
        <div className="absolute top-0 right-0 -translate-y-1/3 translate-x-1/4 w-[500px] h-[500px] bg-white/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 border border-white/30 text-white text-xs font-black tracking-widest uppercase mb-5">
            <FileQuestion className="w-4 h-4" /> AI-Powered
          </div>
          <h1 className="text-3xl sm:text-4xl font-black font-display text-white tracking-tight mb-3">
            Exam Paper <span className="text-pink-200">Generator</span>
          </h1>
          <p className="text-pink-100 font-medium text-sm sm:text-base max-w-xl">Generate structured exam papers with sections, marks distribution, and answer keys.</p>
        </div>
      </div>

      {!result ? (
        <div className="bg-white rounded-[28px] border border-surface-200 shadow-sm p-8 sm:p-10 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div><label className="block text-sm font-bold text-surface-700 mb-2">Board</label><select value={form.board} onChange={e=>setForm(f=>({...f,board:e.target.value}))} className="w-full px-4 py-3.5 bg-surface-50 border-2 border-surface-200 rounded-2xl text-sm font-semibold focus:outline-none focus:border-rose-400 transition-all">{boardList.map(b=><option key={b}>{b}</option>)}</select></div>
            <div><label className="block text-sm font-bold text-surface-700 mb-2">Subject *</label><select value={form.subject} onChange={e=>setForm(f=>({...f,subject:e.target.value}))} className="w-full px-4 py-3.5 bg-surface-50 border-2 border-surface-200 rounded-2xl text-sm font-semibold focus:outline-none focus:border-rose-400 transition-all"><option value="">Select...</option>{subjectList.map(s=><option key={s}>{s}</option>)}</select></div>
            <div><label className="block text-sm font-bold text-surface-700 mb-2">Grade *</label><select value={form.grade} onChange={e=>setForm(f=>({...f,grade:e.target.value}))} className="w-full px-4 py-3.5 bg-surface-50 border-2 border-surface-200 rounded-2xl text-sm font-semibold focus:outline-none focus:border-rose-400 transition-all"><option value="">Select...</option>{gradeList.map(g=><option key={g}>{g}</option>)}</select></div>
            <div><label className="block text-sm font-bold text-surface-700 mb-2">Total Marks</label><select value={form.totalMarks} onChange={e=>setForm(f=>({...f,totalMarks:e.target.value}))} className="w-full px-4 py-3.5 bg-surface-50 border-2 border-surface-200 rounded-2xl text-sm font-semibold focus:outline-none focus:border-rose-400 transition-all">{marksList.map(m=><option key={m}>{m}</option>)}</select></div>
            <div><label className="block text-sm font-bold text-surface-700 mb-2">Duration</label><select value={form.duration} onChange={e=>setForm(f=>({...f,duration:e.target.value}))} className="w-full px-4 py-3.5 bg-surface-50 border-2 border-surface-200 rounded-2xl text-sm font-semibold focus:outline-none focus:border-rose-400 transition-all">{timeList.map(t=><option key={t}>{t}</option>)}</select></div>
          </div>

          {/* Chapters */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-surface-700 mb-2">Chapters / Topics *</label>
            <div className="flex gap-2 mb-3">
              <input type="text" value={form.chapterInput} onChange={e=>setForm(f=>({...f,chapterInput:e.target.value}))} onKeyDown={e=>e.key==='Enter'&&(e.preventDefault(),addChapter())} placeholder="Type chapter name and press Enter" className="flex-1 px-4 py-3 bg-surface-50 border-2 border-surface-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-rose-400 transition-all" />
              <button onClick={addChapter} className="px-4 py-3 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-colors"><Plus className="w-4 h-4" /></button>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.chapters.map(ch => (
                <span key={ch} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-full">
                  {ch} <button onClick={() => removeChapter(ch)}><X className="w-3 h-3" /></button>
                </span>
              ))}
              {form.chapters.length === 0 && <p className="text-xs text-surface-400 font-medium">Add at least one chapter to generate the paper.</p>}
            </div>
          </div>

          {/* Blueprint */}
          <div className="mb-6 p-5 bg-surface-50 rounded-2xl border border-surface-100">
            <h3 className="text-sm font-extrabold text-surface-800 mb-4">📋 Question Blueprint</h3>
            <div className="grid grid-cols-3 gap-4">
              <div><label className="block text-xs font-bold text-surface-500 mb-1">MCQ %</label><input type="number" min={0} max={100} value={form.mcqPct} onChange={e=>setForm(f=>({...f,mcqPct:+e.target.value}))} className="w-full px-3 py-2 border border-surface-200 rounded-xl text-sm font-bold text-center focus:outline-none focus:border-rose-400" /></div>
              <div><label className="block text-xs font-bold text-surface-500 mb-1">Short Ans %</label><input type="number" min={0} max={100} value={form.shortPct} onChange={e=>setForm(f=>({...f,shortPct:+e.target.value}))} className="w-full px-3 py-2 border border-surface-200 rounded-xl text-sm font-bold text-center focus:outline-none focus:border-rose-400" /></div>
              <div><label className="block text-xs font-bold text-surface-500 mb-1">Long Ans %</label><input type="number" min={0} max={100} value={form.longPct} onChange={e=>setForm(f=>({...f,longPct:+e.target.value}))} className="w-full px-3 py-2 border border-surface-200 rounded-xl text-sm font-bold text-center focus:outline-none focus:border-rose-400" /></div>
            </div>
            {/* Visual bar */}
            <div className="mt-3 h-3 rounded-full overflow-hidden flex">
              <div className="bg-blue-500 transition-all" style={{width:`${form.mcqPct}%`}} />
              <div className="bg-amber-500 transition-all" style={{width:`${form.shortPct}%`}} />
              <div className="bg-emerald-500 transition-all" style={{width:`${form.longPct}%`}} />
            </div>
            <div className="flex justify-between mt-1 text-[10px] font-bold text-surface-400">
              <span>MCQ {form.mcqPct}%</span><span>Short {form.shortPct}%</span><span>Long {form.longPct}%</span>
            </div>
          </div>

          {/* Options */}
          <div className="flex flex-wrap gap-4 mb-8">
            <label className="flex items-center gap-2 text-sm font-bold text-surface-700 cursor-pointer">
              <input type="checkbox" checked={form.includeHOTS} onChange={e=>setForm(f=>({...f,includeHOTS:e.target.checked}))} className="w-4 h-4 rounded border-surface-300 text-rose-600 focus:ring-rose-500" /> Include HOTS Questions
            </label>
            <label className="flex items-center gap-2 text-sm font-bold text-surface-700 cursor-pointer">
              <input type="checkbox" checked={form.includeAnswerKey} onChange={e=>setForm(f=>({...f,includeAnswerKey:e.target.checked}))} className="w-4 h-4 rounded border-surface-300 text-rose-600 focus:ring-rose-500" /> Include Answer Key
            </label>
          </div>

          {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-sm text-red-700 font-bold">{error}</div>}

          <button onClick={handleGenerate} disabled={!canGenerate || generating}
            className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-rose-600 to-fuchsia-600 text-white font-extrabold rounded-2xl hover:from-rose-500 hover:to-fuchsia-500 transition-all disabled:opacity-40 shadow-lg text-lg">
            {generating ? <><Loader2 className="w-5 h-5 animate-spin"/> Generating...</> : <><Sparkles className="w-5 h-5"/> Generate Exam Paper</>}
          </button>
        </div>
      ) : (
        <div className="animate-fade-in">
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <button onClick={handleCopy} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${copied?'bg-emerald-100 text-emerald-700':'bg-white border border-surface-200 text-surface-700 hover:bg-surface-50'}`}>{copied?<><Check className="w-4 h-4"/> Copied!</>:<><Copy className="w-4 h-4"/> Copy</>}</button>
            <button onClick={handlePDF} className="flex items-center gap-2 px-5 py-2.5 bg-white border border-surface-200 text-surface-700 rounded-xl text-sm font-bold hover:bg-surface-50"><Download className="w-4 h-4"/> PDF</button>
            <button onClick={handleReset} className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-bold hover:bg-rose-700 shadow-md ml-auto"><RotateCcw className="w-4 h-4"/> New Paper</button>
          </div>
          <div id="exam-output" className="bg-white rounded-[28px] border border-surface-200 shadow-sm p-8 sm:p-10 prose prose-slate max-w-none prose-headings:font-display prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-table:text-sm">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  )
}
