import { useState } from 'react'
import { BookOpen, ChevronRight, ChevronLeft, Sparkles, Loader2, Download, Copy, Check, RotateCcw, GraduationCap } from 'lucide-react'
import { generateAIContent } from '../utils/aiService'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const boards = ['CBSE', 'ICSE', 'State Board', 'IB', 'Cambridge (IGCSE)', 'Common Core (US)', 'General']
const subjects = ['Mathematics', 'Science', 'Physics', 'Chemistry', 'Biology', 'English', 'Hindi', 'Social Studies', 'History', 'Geography', 'Computer Science', 'Economics', 'Art & Craft', 'Other']
const grades = ['Kindergarten', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12']
const durations = ['30 Minutes', '35 Minutes', '40 Minutes', '45 Minutes', '1 Hour', '1.5 Hours', '2 Hours']
const stepLabels = ['Board', 'Subject', 'Grade', 'Topic & Details']

export default function LessonPlanner() {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({ board: '', subject: '', grade: '', topic: '', duration: '45 Minutes', objectives: '', notes: '' })
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const canProceed = () => {
    if (step === 0) return !!form.board
    if (step === 1) return !!form.subject
    if (step === 2) return !!form.grade
    if (step === 3) return !!form.topic.trim()
    return true
  }

  const handleGenerate = async () => {
    setGenerating(true)
    setError('')
    try {
      const prompt = `Create an extremely detailed lesson plan.\nBoard: ${form.board}\nSubject: ${form.subject}\nGrade: ${form.grade}\nTopic: ${form.topic}\nDuration: ${form.duration}\n${form.objectives ? `Objectives: ${form.objectives}` : ''}\n${form.notes ? `Notes: ${form.notes}` : ''}\n\nFormat:\n# Lesson Plan: ${form.topic}\n**Board:** ${form.board} | **Subject:** ${form.subject} | **Grade:** ${form.grade} | **Duration:** ${form.duration}\n\n## Learning Objectives (Bloom's Taxonomy)\n* list\n\n## Materials Required\n* list\n\n## Lesson Timeline\n### Phase 1: Hook (5 mins)\n### Phase 2: Direct Instruction (15 mins)\n### Phase 3: Guided Practice (10 mins)\n### Phase 4: Independent Practice (10 mins)\n### Phase 5: Assessment & Closure (5 mins)\n\n## Differentiation\n| Level | Strategy |\n|---|---|\n\n## Homework\n> Teacher Tips`
      const content = await generateAIContent(prompt)
      setResult(content)
      setStep(4)
    } catch (err) {
      setError(err.message || 'Generation failed.')
    } finally {
      setGenerating(false)
    }
  }

  const handleCopy = () => { navigator.clipboard.writeText(result); setCopied(true); setTimeout(() => setCopied(false), 2000) }

  const handleDownloadPDF = async () => {
    const el = document.getElementById('lesson-plan-output')
    if (!el) return
    const html2pdf = (await import('html2pdf.js')).default
    html2pdf().set({ margin: [10,10,10,10], filename: `Lesson_${form.topic.replace(/\s+/g,'_')}.pdf`, image:{type:'jpeg',quality:0.98}, html2canvas:{scale:2}, jsPDF:{unit:'mm',format:'a4',orientation:'portrait'} }).from(el).save()
  }

  const handleReset = () => { setStep(0); setForm({ board:'', subject:'', grade:'', topic:'', duration:'45 Minutes', objectives:'', notes:'' }); setResult(''); setError('') }

  return (
    <div className="max-w-[900px] mx-auto animate-fade-in-up pb-24 lg:pb-8">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 rounded-[32px] p-8 sm:p-12 mb-8 shadow-2xl">
        <div className="absolute top-0 right-0 -translate-y-1/3 translate-x-1/4 w-[500px] h-[500px] bg-white/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 border border-white/30 text-white text-xs font-black tracking-widest uppercase mb-5">
            <BookOpen className="w-4 h-4" /> AI-Powered
          </div>
          <h1 className="text-3xl sm:text-4xl font-black font-display text-white tracking-tight mb-3">
            Lesson Plan <span className="text-blue-200">Generator</span>
          </h1>
          <p className="text-blue-100 font-medium text-sm sm:text-base max-w-xl">Create comprehensive, curriculum-aligned lesson plans in seconds.</p>
        </div>
      </div>

      {/* Progress */}
      {step < 4 && (
        <div className="flex items-center justify-between mb-8 px-2">
          {stepLabels.map((label, i) => (
            <div key={i} className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black transition-all ${i < step ? 'bg-emerald-500 text-white' : i === step ? 'bg-indigo-600 text-white scale-110' : 'bg-surface-200 text-surface-400'}`}>
                {i < step ? '✓' : i + 1}
              </div>
              <span className={`ml-2 text-xs font-bold hidden sm:block ${i === step ? 'text-indigo-600' : 'text-surface-400'}`}>{label}</span>
              {i < 3 && <div className={`w-8 sm:w-16 h-0.5 mx-2 ${i < step ? 'bg-emerald-400' : 'bg-surface-200'}`} />}
            </div>
          ))}
        </div>
      )}

      {/* Steps */}
      {step < 4 && !generating && (
        <div className="bg-white rounded-[28px] border border-surface-200 shadow-sm p-8 sm:p-10 mb-6 animate-fade-in">
          {step === 0 && (<div><h2 className="text-2xl font-extrabold text-surface-900 mb-2">Select Board</h2><p className="text-surface-500 font-medium mb-6">Choose your curriculum.</p><div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{boards.map(b=>(<button key={b} onClick={()=>setForm(f=>({...f,board:b}))} className={`p-4 rounded-2xl text-sm font-bold border-2 transition-all ${form.board===b?'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md':'border-surface-200 text-surface-600 hover:border-surface-300 hover:bg-surface-50'}`}>{b}</button>))}</div></div>)}
          {step === 1 && (<div><h2 className="text-2xl font-extrabold text-surface-900 mb-2">Select Subject</h2><p className="text-surface-500 font-medium mb-6">Which subject?</p><div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{subjects.map(s=>(<button key={s} onClick={()=>setForm(f=>({...f,subject:s}))} className={`p-4 rounded-2xl text-sm font-bold border-2 transition-all ${form.subject===s?'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md':'border-surface-200 text-surface-600 hover:border-surface-300 hover:bg-surface-50'}`}>{s}</button>))}</div></div>)}
          {step === 2 && (<div><h2 className="text-2xl font-extrabold text-surface-900 mb-2">Select Grade</h2><p className="text-surface-500 font-medium mb-6">Which class?</p><div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">{grades.map(g=>(<button key={g} onClick={()=>setForm(f=>({...f,grade:g}))} className={`p-4 rounded-2xl text-sm font-bold border-2 transition-all ${form.grade===g?'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md':'border-surface-200 text-surface-600 hover:border-surface-300 hover:bg-surface-50'}`}><GraduationCap className="w-5 h-5 mx-auto mb-1 text-surface-400"/>{g}</button>))}</div></div>)}
          {step === 3 && (<div><h2 className="text-2xl font-extrabold text-surface-900 mb-2">Topic & Details</h2><p className="text-surface-500 font-medium mb-6">What will you teach?</p><div className="space-y-4"><div><label className="block text-sm font-bold text-surface-700 mb-2">Topic *</label><input type="text" value={form.topic} onChange={e=>setForm(f=>({...f,topic:e.target.value}))} placeholder="e.g. Photosynthesis, Quadratic Equations" className="w-full px-5 py-4 bg-surface-50 border-2 border-surface-200 rounded-2xl text-sm font-semibold focus:outline-none focus:border-indigo-400 transition-all"/></div><div><label className="block text-sm font-bold text-surface-700 mb-2">Duration</label><select value={form.duration} onChange={e=>setForm(f=>({...f,duration:e.target.value}))} className="w-full px-5 py-4 bg-surface-50 border-2 border-surface-200 rounded-2xl text-sm font-semibold focus:outline-none focus:border-indigo-400 transition-all">{durations.map(d=><option key={d}>{d}</option>)}</select></div><div><label className="block text-sm font-bold text-surface-700 mb-2">Notes (Optional)</label><textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} rows={2} placeholder="Any special instructions..." className="w-full px-5 py-4 bg-surface-50 border-2 border-surface-200 rounded-2xl text-sm font-semibold focus:outline-none focus:border-indigo-400 transition-all resize-none"/></div></div></div>)}

          <div className="flex justify-between mt-8 pt-6 border-t border-surface-100">
            <button onClick={()=>setStep(s=>s-1)} disabled={step===0} className="flex items-center gap-2 px-6 py-3 bg-surface-100 text-surface-600 font-bold rounded-xl hover:bg-surface-200 transition-colors disabled:opacity-30"><ChevronLeft className="w-4 h-4"/> Back</button>
            {step < 3 ? (
              <button onClick={()=>setStep(s=>s+1)} disabled={!canProceed()} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-40 shadow-md">Next <ChevronRight className="w-4 h-4"/></button>
            ) : (
              <button onClick={handleGenerate} disabled={!canProceed()} className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-extrabold rounded-xl hover:from-indigo-500 hover:to-violet-500 transition-all disabled:opacity-40 shadow-lg"><Sparkles className="w-5 h-5"/> Generate</button>
            )}
          </div>
        </div>
      )}

      {generating && (
        <div className="bg-white rounded-[28px] border border-surface-200 p-12 text-center animate-fade-in">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
          <h3 className="text-xl font-extrabold text-surface-900 mb-2">Creating Your Lesson Plan...</h3>
          <p className="text-surface-500">Generating for <strong>{form.topic}</strong></p>
        </div>
      )}

      {error && <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-6 text-center"><p className="text-red-700 font-bold mb-3">{error}</p><button onClick={handleGenerate} className="px-6 py-2.5 bg-red-600 text-white font-bold rounded-xl">Try Again</button></div>}

      {step === 4 && result && (
        <div className="animate-fade-in">
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <button onClick={handleCopy} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${copied?'bg-emerald-100 text-emerald-700':'bg-white border border-surface-200 text-surface-700 hover:bg-surface-50'}`}>{copied?<><Check className="w-4 h-4"/> Copied!</>:<><Copy className="w-4 h-4"/> Copy</>}</button>
            <button onClick={handleDownloadPDF} className="flex items-center gap-2 px-5 py-2.5 bg-white border border-surface-200 text-surface-700 rounded-xl text-sm font-bold hover:bg-surface-50"><Download className="w-4 h-4"/> PDF</button>
            <button onClick={handleReset} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-md ml-auto"><RotateCcw className="w-4 h-4"/> New Plan</button>
          </div>
          <div id="lesson-plan-output" className="bg-white rounded-[28px] border border-surface-200 shadow-sm p-8 sm:p-10 prose prose-slate max-w-none prose-headings:font-display prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-table:text-sm">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  )
}
