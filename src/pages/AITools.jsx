import { useState, useRef } from 'react'
import { Sparkles, FileText, FileQuestion, BookOpen, Send, Loader2, Copy, CheckCircle2, RefreshCw, ListChecks, Mail, Smile, Download } from 'lucide-react'
import { generateAIContent } from '../utils/aiService'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

const tools = [
  {
    id: 'lesson-plan',
    title: 'Lesson Planner',
    description: 'Generate comprehensive lesson plans with objectives, activities, and assessments.',
    icon: BookOpen,
    color: 'from-blue-500 to-indigo-600',
    promptTemplate: (topic, grade) => `Create an extremely structured lesson plan for a ${grade} class about "${topic}". 
YOU MUST STRICTLY FOLLOW THIS MARKDOWN FORMAT:

# Lesson Plan: ${topic}

### 🎯 Learning Objectives
* Use a bulleted list for Bloom's Taxonomy objectives.

### 📦 Required Materials
* Bulleted list of materials

### ⏱️ Hook/Introduction (5-10 mins)
Provide detailed steps.

### 📖 Direct Instruction (15-20 mins)
Provide detailed steps.

### 🤝 Guided Practice (15 mins)
Provide detailed steps.

### ✍️ Independent Practice (15 mins)
Provide detailed steps.

### 🏁 Assessment/Closure (5 mins)
Provide detailed steps.

---
> **💡 Differentiation Strategies:** Provide a brief concluding paragraph inside a blockquote detailing accommodations.`
  },
  {
    id: 'worksheet',
    title: 'Worksheet Generator',
    description: 'Create customized worksheets with various questions based on any topic.',
    icon: FileText,
    color: 'from-emerald-500 to-teal-600',
    promptTemplate: (topic, grade) => `Create a student-facing worksheet for a ${grade} class about "${topic}".
YOU MUST STRICTLY FOLLOW THIS MARKDOWN FORMAT:

# Worksheet: ${topic}
*Name: _______________________ Date: ____________*

Provide a brief, engaging 2-sentence introduction.

### Section 1: Multiple Choice
Format as a numbered list with lettered options below each.
1. Question text
   A) Option A
   B) Option B
*(Provide 5 questions)*

### Section 2: Short Answer
Format as a numbered list with clear spacing instructions.
6. Question text...

### Section 3: Creative Application
Format as a final thought-provoking question.

---
> **🔑 Answer Key:**
> Provide all answers clearly inside this blockquote block at the very bottom.`
  },
  {
    id: 'quiz',
    title: 'Quiz Maker',
    description: 'Generate quick quizzes or assessments to check student understanding.',
    icon: FileQuestion,
    color: 'from-orange-500 to-red-600',
    promptTemplate: (topic, grade) => `Create a formal pop quiz for a ${grade} class about "${topic}".
YOU MUST STRICTLY FOLLOW THIS MARKDOWN FORMAT:

# Pop Quiz: ${topic}

Provide 10 total questions mixing True/False, Multiple Choice, and Fill-in-the-blank. Use a numbered list.
Use --- to separate sections.

### Grading Rubric
Create a highly structured Markdown Table detailing how to grade the quiz. 
| Question Type | Points | Criteria |
|---|---|---|

---
> **Answer Key:** Provide all correct answers inside this blockquote.`
  },
  {
    id: 'rubric',
    title: 'Rubric Creator',
    description: 'Generate detailed grading rubrics with distinct evaluation criteria.',
    icon: ListChecks,
    color: 'from-violet-500 to-purple-600',
    promptTemplate: (topic, grade) => `Create a comprehensive grading rubric for a ${grade} assignment about "${topic}".
YOU MUST STRICTLY FORMAT THE RESPONSE AS A SINGLE, DETAILED MARKDOWN TABLE.

Include 4-5 evaluation criteria (e.g., Content, Organization) as the rows.
The columns MUST BE: | Criteria | Exceeds Expectations (4) | Meets Expectations (3) | Approaching (2) | Below Expectations (1) |

Output ONLY the markdown table and a brief 1-sentence instruction on how to use it.`
  },
  {
    id: 'parent-email',
    title: 'Parent Communicator',
    description: 'Draft professional, empathetic emails regarding student progress.',
    icon: Mail,
    color: 'from-cyan-500 to-blue-600',
    promptTemplate: (topic, grade) => `Draft a professional, warm, and supportive email to parents of a ${grade} student regarding "${topic}".
YOU MUST STRICTLY USE THIS FORMAT:

**Subject:** [Insert engaging, clear subject line here]

Dear [Parent/Guardian Name],

[Insert 2-3 empathetic, beautifully written paragraphs here. Keep it constructive and clear.]

Warm regards,

[Teacher Name]
[School/Grade Level]`
  },
  {
    id: 'icebreaker',
    title: 'Icebreaker Ideas',
    description: 'Generate fun, engaging 5-minute activities to start the class.',
    icon: Smile,
    color: 'from-amber-400 to-orange-500',
    promptTemplate: (topic, grade) => `Generate 3 fun, age-appropriate icebreaker activities for a ${grade} class introducing "${topic}".
YOU MUST STRICTLY USE THIS FORMAT:

### 1. [Catchy Activity Name] *(⏳ 5 mins)*
**Materials:** [List materials]
**How to play:** [Brief paragraph of instructions]

### 2. [Catchy Activity Name] *(⏳ X mins)*
...`
  }
]

export default function AITools() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [activeTool, setActiveTool] = useState(tools[0])
  const [topic, setTopic] = useState('')
  const [grade, setGrade] = useState('8th Grade')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  async function handleGenerate(e) {
    e.preventDefault()
    if (!currentUser) return navigate('/login')
    if (!topic.trim()) return

    setIsGenerating(true)
    setError('')
    setGeneratedContent('')
    setCopied(false)

    try {
      const prompt = activeTool.promptTemplate(topic, grade)
      const result = await generateAIContent(prompt)
      setGeneratedContent(result)
    } catch (err) {
      setError(err.message || 'Failed to generate content. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  function handleCopy() {
    if (generatedContent) {
      navigator.clipboard.writeText(generatedContent)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  async function handleDownloadPDF() {
    const printContent = document.getElementById('printable-area')
    if (!printContent || isDownloading) return

    setIsDownloading(true)

    try {
      // Dynamically import jsPDF and html2canvas (already installed as html2pdf.js deps)
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas')
      ])

      // Create off-screen container with all styles
      const container = document.createElement('div')
      container.style.position = 'fixed'
      container.style.left = '-9999px'
      container.style.top = '0'
      container.style.width = '794px'
      container.style.background = '#ffffff'
      container.style.padding = '40px'
      container.style.zIndex = '-9999'

      container.innerHTML = `
        <style>
          .pdf-wrapper { font-family: 'Segoe UI', 'Inter', system-ui, -apple-system, sans-serif; color: #0f172a; line-height: 1.7; }
          
          .pdf-header { 
            background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); 
            color: white; padding: 24px 28px; border-radius: 10px; 
            margin-bottom: 28px;
          }
          .pdf-header-brand { font-size: 12px; letter-spacing: 2px; text-transform: uppercase; color: #a5b4fc; margin-bottom: 6px; font-weight: 600; }
          .pdf-header-title { font-size: 22px; font-weight: 800; margin-bottom: 4px; }
          .pdf-header-meta { font-size: 11px; color: #94a3b8; }
          
          .pdf-content h1 { font-size: 24px; font-weight: 800; color: #0f172a; margin: 24px 0 14px 0; padding-bottom: 8px; border-bottom: 3px solid #e2e8f0; }
          .pdf-content h2 { font-size: 18px; font-weight: 700; color: #1e293b; margin: 20px 0 10px 0; padding-bottom: 5px; border-bottom: 2px solid #f1f5f9; }
          .pdf-content h3 { font-size: 15px; font-weight: 700; color: #334155; margin: 16px 0 8px 0; }
          .pdf-content p { font-size: 13px; color: #475569; margin-bottom: 12px; line-height: 1.7; }
          .pdf-content strong { color: #0f172a; font-weight: 700; }
          .pdf-content em { font-style: italic; color: #64748b; }
          
          .pdf-content ul, .pdf-content ol { margin: 10px 0 14px 0; padding-left: 24px; }
          .pdf-content li { font-size: 13px; color: #475569; margin-bottom: 6px; line-height: 1.6; }
          
          .pdf-content table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 12px; border: 1px solid #e2e8f0; }
          .pdf-content th { background: #f1f5f9; font-weight: 700; color: #1e293b; padding: 10px 12px; text-align: left; border: 1px solid #e2e8f0; }
          .pdf-content td { padding: 8px 12px; color: #475569; border: 1px solid #e2e8f0; }
          .pdf-content tr:nth-child(even) { background-color: #fafbfc; }
          
          .pdf-content blockquote { 
            border-left: 4px solid #6366f1; background: #eef2ff; 
            padding: 14px 18px; margin: 16px 0; border-radius: 0 8px 8px 0; 
          }
          .pdf-content blockquote p { color: #4338ca; margin-bottom: 4px; }
          .pdf-content blockquote strong { color: #312e81; }
          
          .pdf-content hr { border: none; border-top: 2px solid #e2e8f0; margin: 24px 0; }
          
          .pdf-footer { margin-top: 32px; padding-top: 14px; border-top: 1px dashed #cbd5e1; text-align: center; font-size: 10px; color: #94a3b8; }
        </style>
        <div class="pdf-wrapper">
          <div class="pdf-header">
            <div class="pdf-header-brand">✨ Gurufy AI Tools</div>
            <div class="pdf-header-title">${activeTool.title}</div>
            <div class="pdf-header-meta">Topic: ${topic} &nbsp;|&nbsp; Grade: ${grade} &nbsp;|&nbsp; Generated: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
          </div>
          <div class="pdf-content">
            ${printContent.innerHTML}
          </div>
          <div class="pdf-footer">
            Generated by Gurufy AI — For educational use only
          </div>
        </div>
      `

      document.body.appendChild(container)

      // Wait for rendering
      await new Promise(r => setTimeout(r, 300))

      // Capture as canvas
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        width: 794,
        windowWidth: 794
      })

      document.body.removeChild(container)

      // Create PDF from canvas
      const imgData = canvas.toDataURL('image/jpeg', 0.95)
      const pdf = new jsPDF('p', 'mm', 'a4')
      
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = pdfWidth - 20
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      
      let heightLeft = imgHeight
      let position = 10

      // First page
      pdf.addImage(imgData, 'JPEG', 10, position, imgWidth, imgHeight)
      heightLeft -= (pdfHeight - 20)

      // Additional pages if content is long
      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 10
        pdf.addPage()
        pdf.addImage(imgData, 'JPEG', 10, position, imgWidth, imgHeight)
        heightLeft -= (pdfHeight - 20)
      }

      // Save as proper PDF blob with correct mime type
      const pdfBlob = pdf.output('blob')
      const safeTopic = topic.replace(/\s+/g, '_').substring(0, 30)
      const safeTitle = activeTool.title.replace(/\s+/g, '_')
      const fileName = `${safeTitle}_${safeTopic}.pdf`
      
      const link = document.createElement('a')
      link.href = URL.createObjectURL(new Blob([pdfBlob], { type: 'application/pdf' }))
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(link.href)
      
    } catch (err) {
      console.error('PDF generation failed:', err)
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in-up">
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-[24px] sm:rounded-[32px] bg-surface-900 border border-surface-800 p-5 sm:p-8 lg:p-12 shadow-2xl">
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/3 w-[400px] sm:w-[800px] h-[400px] sm:h-[800px] bg-gradient-to-tr from-accent-600/30 to-primary-600/30 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3 w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] bg-gradient-to-tr from-emerald-600/20 to-teal-600/20 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-white/90 text-sm font-semibold tracking-wide backdrop-blur-md mb-4 sm:mb-6 shadow-glow-accent">
            <Sparkles className="w-4 h-4 text-accent-400" /> AI Educator Magic
          </div>
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold font-display text-white tracking-tight leading-tight mb-3 sm:mb-4">
            Supercharge your <br className="hidden sm:block"/><span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-400 to-primary-400 leading-tight">Teaching Workflow</span>
          </h1>
          <p className="text-sm sm:text-lg text-surface-300 font-medium leading-relaxed">
            Generate pixel-perfect lesson plans, differentiated worksheets, and challenging quizzes in seconds.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Left Column - Controls */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-card-solid p-6 border-none shadow-[0_8px_30px_rgba(0,0,0,0.04)] ring-1 ring-surface-200">
            <h2 className="text-sm font-bold tracking-widest uppercase text-surface-400 mb-4 px-1">Select Tool</h2>
            <div className="space-y-3 lg:max-h-[600px] overflow-y-auto custom-scrollbar pr-2 pb-2">
              {tools.map(tool => (
                <button
                  key={tool.id}
                  onClick={() => {
                    setActiveTool(tool)
                    setGeneratedContent('')
                    setError('')
                  }}
                  className={`w-full text-left p-4 rounded-2xl transition-all duration-300 border active:scale-[0.98] group relative overflow-hidden ${
                    activeTool.id === tool.id
                      ? 'bg-white border-primary-200 shadow-[0_8px_16px_-4px_rgba(37,99,235,0.1)] ring-1 ring-primary-500/10'
                      : 'bg-surface-50 border-surface-200/50 hover:bg-white hover:border-surface-300 hover:shadow-soft'
                  }`}
                >
                  {activeTool.id === tool.id && (
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary-100 rounded-full blur-[40px] -mr-16 -mt-16 opacity-50" />
                  )}
                  <div className="relative flex items-start gap-4">
                    <div className={`p-3 rounded-xl shadow-sm transition-transform duration-300 group-hover:scale-110 ${
                      activeTool.id === tool.id 
                        ? `bg-gradient-to-br ${tool.color} text-white shadow-glow` 
                        : 'bg-white text-surface-500 ring-1 ring-surface-200'
                    }`}>
                      <tool.icon className="w-5 h-5 flex-shrink-0" />
                    </div>
                    <div>
                      <h3 className={`font-bold tracking-tight mb-1 transition-colors ${
                        activeTool.id === tool.id ? 'text-surface-900' : 'text-surface-700'
                      }`}>
                        {tool.title}
                      </h3>
                      <p className="text-xs text-surface-500 leading-relaxed font-medium">
                        {tool.description}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Generator */}
        <div className="lg:col-span-8 flex flex-col">
          <div className="bg-white rounded-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] ring-1 ring-surface-200 border-none flex-1 overflow-hidden flex flex-col">
            
            <div className="p-6 md:p-8 border-b border-surface-100/80 bg-surface-50/50">
              <div className="flex items-center gap-3 mb-6">
                <div className={`p-2.5 rounded-xl bg-gradient-to-br ${activeTool.color} text-white shadow-md`}>
                  <activeTool.icon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold font-display tracking-tight text-surface-900">{activeTool.title}</h2>
                  <p className="text-sm font-medium text-surface-500">Configure parameters below</p>
                </div>
              </div>

              <form onSubmit={handleGenerate} className="space-y-5">
                <div className="grid md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-surface-500 px-1">Topic / Subject</label>
                    <input
                      type="text"
                      placeholder="e.g. Photosynthesis, the Cold War, Fractions"
                      value={topic}
                      onChange={e => setTopic(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-surface-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-[3px] focus:ring-primary-100 focus:border-primary-400 transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-surface-500 px-1">Grade Level</label>
                    <select
                      value={grade}
                      onChange={e => setGrade(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-surface-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-[3px] focus:ring-primary-100 focus:border-primary-400 transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] appearance-none"
                    >
                      <option>Kindergarten</option>
                      <option>1st-5th Grade</option>
                      <option>6th-8th Grade</option>
                      <option>High School</option>
                      <option>College / Higher Ed</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isGenerating || !topic.trim()}
                    className="w-full relative overflow-hidden px-6 py-3.5 bg-gradient-to-b from-surface-900 to-black text-white font-semibold text-sm tracking-wide rounded-xl
                    hover:scale-[1.01] transition-all duration-300 shadow-[0_4px_12px_rgba(0,0,0,0.1),inset_0_1px_1px_rgba(255,255,255,0.1)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.15),inset_0_1px_1px_rgba(255,255,255,0.15)]
                    active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group flex justify-center items-center gap-2"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Generating Masterpiece...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 group-hover:text-accent-400 transition-colors" />
                        <span>Generate Content</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {error && (
                <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 text-sm font-medium flex items-start gap-3 animate-fade-in">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                  {error}
                </div>
              )}
            </div>

            {/* Output Area */}
            {generatedContent && (
              <div className="flex-1 flex flex-col overflow-hidden bg-white animate-fade-in-up">
                <div className="flex items-center justify-between p-4 border-b border-surface-100 bg-surface-50/50">
                  <span className="text-xs font-bold uppercase tracking-widest text-surface-500 ml-2">Generated Output</span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleGenerate({ preventDefault: () => {} })}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-surface-600 hover:text-surface-900 hover:bg-surface-200/50 rounded-lg transition-colors active:scale-95 border border-transparent"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                    </button>
                    <button
                      onClick={handleCopy}
                      className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all active:scale-95 ${
                        copied 
                          ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500/20' 
                          : 'bg-primary-50 text-primary-700 hover:bg-primary-100 ring-1 ring-primary-500/20'
                      }`}
                    >
                      {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                    <button
                      onClick={handleDownloadPDF}
                      disabled={isDownloading}
                      className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all active:scale-95 shadow-sm ${
                        isDownloading 
                          ? 'bg-surface-400 text-white cursor-wait' 
                          : 'bg-surface-900 text-white hover:bg-black'
                      }`}
                    >
                      {isDownloading ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating PDF...</>
                      ) : (
                        <><Download className="w-3.5 h-3.5" /> Export PDF</>
                      )}
                    </button>
                  </div>
                </div>
                
                <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1 max-h-[600px] bg-white">
                  <article id="printable-area" className="prose prose-slate prose-sm md:prose-base max-w-none 
                    prose-headings:font-display prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-surface-900
                    prose-p:text-surface-600 prose-p:leading-relaxed prose-li:text-surface-600 
                    prose-strong:text-surface-900 prose-strong:font-bold
                    prose-a:text-primary-600 hover:prose-a:text-primary-700
                    prose-hr:border-surface-200
                    prose-table:w-full prose-table:border-collapse prose-table:my-6
                    prose-th:bg-surface-100 prose-th:px-4 prose-th:py-3 prose-th:text-left prose-th:font-bold prose-th:text-surface-900 prose-th:border prose-th:border-surface-200
                    prose-td:px-4 prose-td:py-3 prose-td:border prose-td:border-surface-200 prose-td:text-surface-700
                    prose-blockquote:border-l-4 prose-blockquote:border-primary-500 prose-blockquote:bg-primary-50 prose-blockquote:px-5 prose-blockquote:py-4 prose-blockquote:rounded-r-xl prose-blockquote:not-italic prose-blockquote:shadow-sm">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {generatedContent}
                    </ReactMarkdown>
                  </article>
                </div>
              </div>
            )}
            
            {!generatedContent && !isGenerating && (
              <div className="flex-1 p-12 flex flex-col items-center justify-center text-center bg-surface-50 border-t border-surface-100 text-surface-400 min-h-[300px]">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4 ring-1 ring-surface-200 rotate-3">
                  <Send className="w-6 h-6 text-surface-300" />
                </div>
                <h3 className="text-lg font-bold text-surface-700 tracking-tight font-display mb-1">Ready to generate</h3>
                <p className="text-sm font-medium max-w-[280px]">Fill out the parameters above to create your custom teaching content.</p>
              </div>
            )}
            
            {isGenerating && (
              <div className="flex-1 p-12 flex flex-col items-center justify-center text-center bg-surface-50 border-t border-surface-100 min-h-[300px]">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-accent-400 rounded-full blur-[20px] opacity-30 animate-pulse" />
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm relative ring-1 ring-surface-200">
                    <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-surface-800 tracking-tight font-display mb-1 animate-pulse">Orchestrating AI Magic...</h3>
                <p className="text-sm text-surface-500 font-medium">Drafting the perfect content for your classroom.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
