import { useState, useEffect } from 'react'
import { 
  Sparkles, MessageSquare, Brain, Search, GraduationCap, 
  Image as ImageIcon, LayoutDashboard, PenTool, ExternalLink,
  Bot, Mic, Music, Play, Smile, FileText, MonitorPlay, Zap,
  Bookmark, BookmarkCheck, Copy, Check, MessageSquareQuote, 
  Calculator, ShieldCheck, Star, Globe, Code, Activity
} from 'lucide-react'

const categories = ['All', 'Saved ⭐', 'Math & STEM', 'Science & Tech', 'Language & English', 'History & Geography', 'Education Specific', 'Agencies & Chatbots', 'Research & Search', 'Design & Visuals', 'Presentations', 'Audio & Video', 'Fun & Utilities']

const tools = [
  // Subject: Math & STEM
  { id: 'wolfram', name: 'Wolfram Alpha', provider: 'Wolfram', description: 'Computational knowledge engine. Instantly solves complex math, physics, and science equations with step-by-step logic.', url: 'https://www.wolframalpha.com', category: 'Math & STEM', color: 'from-orange-500 to-red-600', icon: Calculator },
  { id: 'photomath', name: 'Photomath', provider: 'Google', description: 'Scan and solve math problems. Extremely useful for checking homework workflows and teaching step-by-step solutions.', url: 'https://photomath.com', category: 'Math & STEM', color: 'from-blue-400 to-blue-600', icon: Calculator },
  { id: 'mathway', name: 'Mathway', provider: 'Chegg', description: 'AI math problem solver capable of solving advanced Algebra, Calculus, and Trigonometry with detailed steps.', url: 'https://www.mathway.com', category: 'Math & STEM', color: 'from-slate-700 to-slate-900', icon: Calculator },
  { id: 'symbolab', name: 'Symbolab', provider: 'Symbolab', description: 'Powerful step-by-step math solver for equations and graphing. Great for high school and college math.', url: 'https://www.symbolab.com', category: 'Math & STEM', color: 'from-rose-500 to-red-700', icon: Calculator },

  // Subject: Science & Tech
  { id: 'replit', name: 'Replit AI', provider: 'Replit', description: 'AI coding assistant built directly into the IDE. Helps students learn programming languages and debug code.', url: 'https://replit.com/ai', category: 'Science & Tech', color: 'from-gray-700 to-black', icon: Code },
  { id: 'biodigital', name: 'BioDigital Human', provider: 'BioDigital', description: 'Interactive 3D anatomy and disease platform. An incredible virtual body tool for biology and medical classes.', url: 'https://www.biodigital.com', category: 'Science & Tech', color: 'from-teal-500 to-emerald-600', icon: Activity },

  // Subject: Language & English
  { id: 'grammarly', name: 'GrammarlyGO', provider: 'Grammarly', description: 'AI writing assistant to help students perfect their essays, tone, and grammar. Excellent for English teachers.', url: 'https://www.grammarly.com', category: 'Language & English', color: 'from-green-400 to-emerald-600', icon: PenTool },
  { id: 'duolingo', name: 'Duolingo Max', provider: 'Duolingo', description: 'AI language tutor featuring immersive roleplay scenarios and detailed explanations of grammar rules.', url: 'https://www.duolingo.com/max', category: 'Language & English', color: 'from-lime-400 to-green-500', icon: Globe },
  
  // Subject: History & Geography
  { id: 'hellohistory', name: 'Hello History', provider: 'Hello History', description: 'AI Roleplay. Let your students have actual text conversations with historical figures like Albert Einstein or Cleopatra.', url: 'https://www.hellohistory.ai', category: 'History & Geography', color: 'from-amber-600 to-orange-700', icon: Bot },
  { id: 'googleearth', name: 'Google Earth VR', provider: 'Google', description: 'Explore the world using AI and 3D imagery. The ultimate tool for teaching geography and worldwide ecosystems.', url: 'https://earth.google.com', category: 'History & Geography', color: 'from-blue-500 to-cyan-600', icon: Globe },

  // Agencies & Chatbots
  { id: 'chatgpt', name: 'ChatGPT', provider: 'OpenAI', description: 'Advanced conversational AI for writing, generating ideas, grading rubrics, and brainstorming lesson plans.', url: 'https://chat.openai.com', category: 'Agencies & Chatbots', color: 'from-teal-500 to-emerald-600', icon: MessageSquare },
  { id: 'gemini', name: 'Gemini', provider: 'Google', description: 'Multimodal AI by Google. Great for academic research, summarization, and extracting information from images.', url: 'https://gemini.google.com', category: 'Agencies & Chatbots', color: 'from-blue-500 to-indigo-600', icon: Sparkles },
  { id: 'claude', name: 'Claude', provider: 'Anthropic', description: 'Highly nuanced and context-rich AI. Excellent for analyzing long documents, essays, or creating detailed study guides.', url: 'https://claude.ai', category: 'Agencies & Chatbots', color: 'from-amber-500 to-orange-600', icon: Brain },
  { id: 'copilot', name: 'Copilot', provider: 'Microsoft', description: 'AI assistant integrated with the web. Great for summarizing long web pages, generating images, and quick data lookup.', url: 'https://copilot.microsoft.com', category: 'Agencies & Chatbots', color: 'from-cyan-500 to-blue-600', icon: MessageSquare },
  
  // Research & Search
  { id: 'perplexity', name: 'Perplexity AI', provider: 'Perplexity', description: 'AI-powered search engine. Get highly accurate, up-to-date answers with real-time academic citations and web sources.', url: 'https://perplexity.ai', category: 'Research & Search', color: 'from-slate-700 to-slate-900', icon: Search },
  { id: 'notebooklm', name: 'NotebookLM', provider: 'Google', description: 'Your personalized AI research assistant. Upload your own notes and PDFs, and let it answer questions based on your sources.', url: 'https://notebooklm.google.com', category: 'Research & Search', color: 'from-blue-600 to-indigo-700', icon: FileText },
  { id: 'consensus', name: 'Consensus', provider: 'Consensus', description: 'AI search engine specialized for scientific and academic research. Finds answers directly from peer-reviewed papers.', url: 'https://consensus.app', category: 'Research & Search', color: 'from-violet-500 to-purple-600', icon: Search },
  { id: 'algored', name: 'Algor Education', provider: 'Algor', description: 'Paste a YouTube video link or long text, and the AI will instantly generate an interactive Mind-Map and flashcards.', url: 'https://algoreducation.com', category: 'Research & Search', color: 'from-teal-500 to-emerald-500', icon: Sparkles },

  // Education Specific
  { id: 'khanmigo', name: 'Khanmigo', provider: 'Khan Academy', description: 'AI guide for teachers and tutor for students. Tutors learners by asking guiding questions without giving direct answers.', url: 'https://www.khanacademy.org/khan-labs', category: 'Education Specific', color: 'from-emerald-400 to-green-600', icon: GraduationCap },
  { id: 'magicschool', name: 'MagicSchool AI', provider: 'MagicSchool', description: 'All-in-one AI platform specifically designed for educators to help with lesson planning, communication, and grading.', url: 'https://www.magicschool.ai', category: 'Education Specific', color: 'from-purple-500 to-fuchsia-600', icon: Bot },
  { id: 'eduaide', name: 'Eduaide.Ai', provider: 'Eduaide', description: 'Generate lesson plans, teaching resources, and instructional design materials instantly.', url: 'https://www.eduaide.ai', category: 'Education Specific', color: 'from-indigo-400 to-cyan-500', icon: Bot },
  { id: 'brisk', name: 'Brisk Teaching', provider: 'Brisk', description: 'Chrome extension that sits on top of Google Docs to help grade, provide feedback, and detect AI writing.', url: 'https://www.briskteaching.com', category: 'Education Specific', color: 'from-orange-400 to-red-500', icon: Zap },
  { id: 'gptzero', name: 'GPTZero', provider: 'GPTZero', description: 'The gold standard for AI detection. Teachers can upload essays to verify if they were written by humans or AI like ChatGPT.', url: 'https://gptzero.me', category: 'Education Specific', color: 'from-slate-800 to-black', icon: ShieldCheck },

  // Design & Visuals
  { id: 'canva', name: 'Canva Magic Studio', provider: 'Canva', description: 'AI-powered design tools to instantly generate worksheets, presentations, images, and visual materials for your class.', url: 'https://www.canva.com/magic', category: 'Design & Visuals', color: 'from-cyan-500 to-blue-600', icon: ImageIcon },
  { id: 'midjourney', name: 'Midjourney', provider: 'Midjourney', description: 'Industry-leading AI image generator. Create absolutely stunning visuals and art for classroom engagement.', url: 'https://www.midjourney.com', category: 'Design & Visuals', color: 'from-slate-800 to-black', icon: ImageIcon },
  { id: 'firefly', name: 'Adobe Firefly', provider: 'Adobe', description: 'Generative AI made for creators. Generate premium quality images and modify existing photos seamlessly.', url: 'https://firefly.adobe.com', category: 'Design & Visuals', color: 'from-red-500 to-rose-600', icon: Sparkles },
  { id: 'luma', name: 'Luma AI', provider: 'Luma', description: 'Generate high-quality 3D models and NeRFs from simple videos or text. Amazing for interactive science projects.', url: 'https://lumalabs.ai', category: 'Design & Visuals', color: 'from-indigo-500 to-purple-600', icon: ImageIcon },
  { id: 'blockade', name: 'Blockade Labs', provider: 'Blockade', description: 'Generate stunning 360-degree virtual reality environments from text prompts. Incredible immersive tool for the classroom.', url: 'https://blockadelabs.com', category: 'Design & Visuals', color: 'from-pink-500 to-rose-600', icon: ImageIcon },
  { id: 'scribble', name: 'Scribble Diffusion', provider: 'Replicate', description: 'Turn any rough doodle or sketch into a highly detailed, professional illustration using AI. Mind-blowing for creative classes.', url: 'https://scribblediffusion.com', category: 'Design & Visuals', color: 'from-pink-400 to-rose-600', icon: ImageIcon },

  // Presentations
  { id: 'gamma', name: 'Gamma', provider: 'Gamma App', description: 'Generate beautiful, engaging presentations, webpages, and documents in seconds using just a simple text prompt.', url: 'https://gamma.app', category: 'Presentations', color: 'from-rose-500 to-pink-600', icon: LayoutDashboard },
  { id: 'tome', name: 'Tome', provider: 'Tome', description: 'AI storytelling format. Type a prompt and get a fully generated, beautifully designed slide deck.', url: 'https://tome.app', category: 'Presentations', color: 'from-pink-500 to-purple-600', icon: LayoutDashboard },

  // Audio & Video
  { id: 'elevenlabs', name: 'ElevenLabs', provider: 'ElevenLabs', description: 'The most realistic AI text-to-speech voice generator. Great for creating audio for reading assignments.', url: 'https://elevenlabs.io', category: 'Audio & Video', color: 'from-zinc-700 to-zinc-900', icon: Mic },
  { id: 'suno', name: 'Suno', provider: 'Suno AI', description: 'Create full, incredibly realistic songs in seconds from any text prompt. Fun for creating educational jingles!', url: 'https://suno.com', category: 'Audio & Video', color: 'from-orange-500 to-amber-600', icon: Music },
  { id: 'runway', name: 'Runway ML', provider: 'Runway', description: 'Generate and edit videos seamlessly using AI. Create visual effects and entire video clips from text.', url: 'https://runwayml.com', category: 'Audio & Video', color: 'from-purple-500 to-indigo-600', icon: MonitorPlay },
  { id: 'synthesia', name: 'Synthesia', provider: 'Synthesia', description: 'Create professional videos using realistic AI avatars speaking script you write. Excellent for virtual lectures.', url: 'https://www.synthesia.io', category: 'Audio & Video', color: 'from-blue-600 to-cyan-600', icon: Play },
  { id: 'speechify', name: 'Speechify', provider: 'Speechify', description: 'AI Text-to-Speech reader. Perfect for creating audio versions of reading assignments to help dyslexic or slow readers.', url: 'https://speechify.com', category: 'Audio & Video', color: 'from-cyan-500 to-blue-500', icon: Mic },

  // Fun & Utilities
  { id: 'autodraw', name: 'AutoDraw', provider: 'Google', description: 'Machine-learning drawing tool that guesses your rough sketches and replaces them with professional icons.', url: 'https://www.autodraw.com', category: 'Fun & Utilities', color: 'from-yellow-400 to-orange-500', icon: PenTool },
  { id: 'teachable', name: 'Teachable Machine', provider: 'Google', description: 'Fast, easy way to create machine learning models for your sites, apps, and more without coding. Great for STEM.', url: 'https://teachablemachine.withgoogle.com', category: 'Fun & Utilities', color: 'from-emerald-500 to-teal-600', icon: Smile },
  { id: 'quillbot', name: 'QuillBot', provider: 'Course Hero', description: 'Paraphrasing and summarizing tool. Highly useful for simplifying complex texts for different student reading levels.', url: 'https://quillbot.com', category: 'Fun & Utilities', color: 'from-green-500 to-emerald-500', icon: PenTool }
]

const promptsLib = [
  {
    id: 'p1',
    title: 'Generate a Complete Lesson Plan',
    description: 'Creates a highly structured, 45-minute lesson plan based on Bloom\'s Taxonomy.',
    category: 'Lesson Planning',
    content: 'Act as an expert educator. Create a comprehensive 45-minute lesson plan for grade [GRADE] on the topic of "[TOPIC]". Include: \n1. Learning objectives (Bloom\'s Taxonomy)\n2. Hook/Introduction (5 mins)\n3. Direct Instruction (15 mins)\n4. Guided Practice (10 mins)\n5. Independent Practice (10 mins)\n6. Exit Ticket Assessment (5 mins). \n\nProvide specific examples and engaging activities.'
  },
  {
    id: 'p2',
    title: 'Simplifying Complex Topics for Weak Students',
    description: 'Explains complex topics using real-world analogies and simple language.',
    category: 'Instruction',
    content: 'Explain the concept of "[TOPIC]" to a [GRADE] level student who is currently struggling to understand it. Use an engaging, simple, real-world analogy. Avoid complex jargon. Break it down into 3 easy-to-digest steps and provide a mini-quiz question at the end to check their understanding.'
  },
  {
    id: 'p3',
    title: 'Draft a Professional Parent Email',
    description: 'Drafts a polite, constructive email to a parent regarding student behavior or academic progress.',
    category: 'Communication',
    content: 'Write a professional, warm, and constructive email to the parents of [STUDENT NAME]. The purpose of the email is to discuss [BEHAVIOR OR ACADEMIC ISSUE]. Suggest a collaborative action plan and ask for a convenient time to schedule a phone call. The tone must be empathetic and supportive, not accusatory.'
  },
  {
    id: 'p4',
    title: 'Design a Creative Rubric',
    description: 'Creates a detailed grading rubric for any project or essay.',
    category: 'Grading & Assessment',
    content: 'Create a 4-point grading rubric for a [GRADE LEVEL] assignment where students have to [PROJECT DESCRIPTION]. The criteria should evaluate Content, Creativity, Formatting/Grammar, and Critical Thinking. Format the response strictly as a Markdown table.'
  },
  {
    id: 'p5',
    title: 'Multiple Choice Question Generator',
    description: 'Generates exam-level MCQs highlighting common misconceptions.',
    category: 'Grading & Assessment',
    content: 'Generate 10 multiple-choice questions for a [GRADE LEVEL] exam about "[TOPIC]". For each question, provide 4 options (A, B, C, D) where 1 is the correct answer and the other 3 are plausible distractors specifically designed to test common student misconceptions. Include an answer key at the bottom with a brief explanation for each correct answer.'
  },
  {
    id: 'p6',
    title: 'Generate an Engaging Icebreaker',
    description: 'Generates fun, 5-minute activities to start a class and build community.',
    category: 'Classroom Management',
    content: 'Provide 3 high-energy, 5-minute icebreaker activities for my [GRADE LEVEL] class. The activities should require no materials, encourage students to interact with peers they don\'t usually talk to, and be loosely related to our current unit: "[TOPIC]".'
  }
]

export default function AIDirectory() {
  const [activeTab, setActiveTab] = useState('platforms') // 'platforms' | 'prompts'
  const [activeCategory, setActiveCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [savedTools, setSavedTools] = useState(() => {
    const saved = localStorage.getItem('ldms_saved_tools')
    return saved ? JSON.parse(saved) : []
  })
  const [copiedPrompt, setCopiedPrompt] = useState(null)

  useEffect(() => {
    localStorage.setItem('ldms_saved_tools', JSON.stringify(savedTools))
  }, [savedTools])

  const toggleSaveTool = (id) => {
    setSavedTools(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id])
  }

  const handleCopy = (id, content) => {
    navigator.clipboard.writeText(content)
    setCopiedPrompt(id)
    setTimeout(() => setCopiedPrompt(null), 2000)
  }

  const filteredTools = tools.filter(tool => {
    if (activeCategory === 'Saved ⭐' && !savedTools.includes(tool.id)) return false
    const matchesCategory = activeCategory === 'All' || activeCategory === 'Saved ⭐' || tool.category === activeCategory
    const matchesSearch = tool.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          tool.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const filteredPrompts = promptsLib.filter(prompt => {
    return prompt.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
           prompt.description.toLowerCase().includes(searchQuery.toLowerCase())
  })

  return (
    <div className="max-w-[1200px] mx-auto animate-fade-in-up pb-12">
      {/* Header Panel */}
      <div className="relative overflow-hidden bg-slate-900 rounded-[32px] p-8 sm:p-12 mb-8 shadow-2xl border border-slate-800">
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/3 w-[600px] h-[600px] bg-gradient-to-tr from-indigo-500/30 to-fuchsia-500/30 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-black tracking-widest uppercase mb-6 shadow-glow-sm">
              <Sparkles className="w-4 h-4" /> The Intelligent Hub
            </div>
            <h1 className="text-4xl sm:text-5xl font-black font-display text-white tracking-tight leading-tight mb-4">
              AI Platforms & <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-fuchsia-400">Prompt Library</span>
            </h1>
            <p className="text-slate-300 font-medium text-base sm:text-lg">
              Discover the best external AI tools, bookmark your favorites, and copy expert-crafted prompts to supercharge your teaching workflow.
            </p>
          </div>
        </div>
      </div>

      {/* Primary Tab Navigation */}
      <div className="flex bg-white/50 backdrop-blur-md p-1.5 rounded-2xl border border-surface-200 w-full max-w-md mx-auto mb-10 shadow-sm">
        <button
          onClick={() => setActiveTab('platforms')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${
            activeTab === 'platforms' 
              ? 'bg-white text-indigo-600 shadow-md ring-1 ring-surface-200' 
              : 'text-surface-500 hover:text-surface-800 hover:bg-surface-50/50'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" /> AI Directories
        </button>
        <button
          onClick={() => setActiveTab('prompts')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${
            activeTab === 'prompts' 
              ? 'bg-white text-fuchsia-600 shadow-md ring-1 ring-surface-200' 
              : 'text-surface-500 hover:text-surface-800 hover:bg-surface-50/50'
          }`}
        >
          <MessageSquareQuote className="w-4 h-4" /> Prompt Library
        </button>
      </div>

      {activeTab === 'platforms' && (
        <div className="animate-fade-in">
          {/* Filters and Search for Platforms */}
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-center mb-8">
            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 ${
                    activeCategory === cat 
                      ? cat === 'Saved ⭐' 
                        ? 'bg-amber-400 text-amber-950 shadow-md scale-105' 
                        : 'bg-slate-900 text-white shadow-md scale-105' 
                      : 'bg-white text-surface-600 hover:bg-surface-100 border border-surface-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            
            <div className="relative w-full lg:w-[300px] shrink-0">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
              <input
                type="text"
                placeholder="Search platforms..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white border border-surface-200 rounded-2xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all shadow-sm"
              />
            </div>
          </div>

          {/* Grid of Tools */}
          {filteredTools.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTools.map((tool, idx) => (
                <div
                  key={tool.id}
                  className="group relative bg-white border border-surface-200 rounded-[28px] overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-1.5 flex flex-col h-full"
                  style={{ animationDelay: `${idx * 0.05}s` }}
                >
                  {/* Dynamic Header */}
                  <div className={`h-24 bg-gradient-to-br ${tool.color} p-6 flex justify-between items-start relative overflow-hidden`}>
                    <div className="absolute top-0 right-0 p-4 opacity-20 transform scale-150 group-hover:scale-[2] group-hover:rotate-12 transition-transform duration-700">
                      <tool.icon className="w-24 h-24 text-white" />
                    </div>
                    
                    <div className="relative z-10 w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-lg border border-white/20">
                      <tool.icon className="w-6 h-6" />
                    </div>

                    <button 
                      onClick={() => toggleSaveTool(tool.id)}
                      className="relative z-10 p-2 rounded-xl bg-white/20 backdrop-blur-md text-white hover:bg-white/40 transition-colors border border-white/20"
                      title={savedTools.includes(tool.id) ? "Remove from bookmarks" : "Bookmark this tool"}
                    >
                      {savedTools.includes(tool.id) ? (
                        <BookmarkCheck className="w-5 h-5 text-amber-300 fill-amber-300/30" />
                      ) : (
                        <Bookmark className="w-5 h-5" />
                      )}
                    </button>
                  </div>

                  {/* Content */}
                  <div className="p-6 flex flex-col flex-1">
                    <div className="mb-1 flex justify-between items-center">
                      <span className="text-[11px] font-black tracking-widest uppercase text-surface-400">{tool.provider}</span>
                      <span className="text-[10px] bg-surface-100 text-surface-500 px-2.5 py-1 rounded-full font-bold">{tool.category}</span>
                    </div>
                    <h3 className="text-xl font-extrabold text-surface-900 mb-3 group-hover:text-indigo-600 transition-colors font-display">
                      {tool.name}
                    </h3>
                    <p className="text-sm text-surface-500 font-medium leading-relaxed mb-6 flex-1">
                      {tool.description}
                    </p>

                    <a 
                      href={tool.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 py-3.5 bg-surface-50 hover:bg-indigo-50 text-indigo-600 font-bold rounded-xl transition-colors border border-surface-200 hover:border-indigo-200"
                    >
                      Launch Platform <ExternalLink className="w-4 h-4 ml-1" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-[32px] border border-surface-200 border-dashed">
              <Search className="w-12 h-12 text-surface-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-surface-900 mb-2">No tools found</h3>
              <p className="text-surface-500 font-medium">Try adjusting your search or check your saved items.</p>
              <button 
                onClick={() => {setSearchQuery(''); setActiveCategory('All')}}
                className="mt-6 px-6 py-2.5 bg-surface-100 hover:bg-surface-200 text-surface-700 font-bold rounded-xl transition-colors"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'prompts' && (
        <div className="animate-fade-in">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-8">
            <h2 className="text-2xl font-bold font-display text-surface-900 flex items-center gap-2">
              <MessageSquareQuote className="text-fuchsia-500 mt-1" /> Expert Prompt Library
            </h2>
            <div className="relative w-full md:w-[300px] shrink-0">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
              <input
                type="text"
                placeholder="Search prompts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white border border-surface-200 rounded-2xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-fuchsia-100 focus:border-fuchsia-400 transition-all shadow-sm"
              />
            </div>
          </div>

          {filteredPrompts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredPrompts.map((prompt) => (
                <div key={prompt.id} className="bg-white border border-surface-200 rounded-[24px] p-6 shadow-sm hover:shadow-xl transition-all duration-300">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-fuchsia-600 bg-fuchsia-50 px-2.5 py-1 rounded-lg">
                      {prompt.category}
                    </span>
                    <button
                      onClick={() => handleCopy(prompt.id, prompt.content)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        copiedPrompt === prompt.id 
                          ? 'bg-emerald-50 text-emerald-600' 
                          : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
                      }`}
                    >
                      {copiedPrompt === prompt.id ? (
                        <><Check className="w-3.5 h-3.5" /> Copied!</>
                      ) : (
                        <><Copy className="w-3.5 h-3.5" /> Copy Prompt</>
                      )}
                    </button>
                  </div>
                  <h3 className="text-lg font-bold text-surface-900 mb-2">{prompt.title}</h3>
                  <p className="text-sm text-surface-500 mb-5">{prompt.description}</p>
                  <div className="bg-surface-50 rounded-xl p-4 border border-surface-100/50">
                    <p className="text-[13px] text-slate-700 font-medium leading-relaxed font-mono whitespace-pre-wrap">
                      {prompt.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
             <div className="text-center py-20 bg-white rounded-[32px] border border-surface-200 border-dashed">
              <MessageSquareQuote className="w-12 h-12 text-surface-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-surface-900 mb-2">No prompts found</h3>
              <p className="text-surface-500 font-medium">Try a different search term.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
