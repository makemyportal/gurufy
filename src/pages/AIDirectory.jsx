import { useState, useEffect } from 'react'
import { 
  Sparkles, MessageSquare, Brain, Search, GraduationCap, 
  Image as ImageIcon, LayoutDashboard, PenTool, ExternalLink,
  Bot, Mic, Music, Play, Smile, FileText, MonitorPlay, Zap,
  Bookmark, BookmarkCheck, Copy, Check, MessageSquareQuote, X,
  Calculator, ShieldCheck, Star, Globe, Code, Activity,
  FlaskConical, Atom, Dna, Microscope, TestTubes, Orbit, MapPin, Cpu, Lightbulb, Beaker
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

const labCategories = ['All', 'Saved ⭐', 'Biology & Anatomy', 'Chemistry', 'Physics', 'Math & Logic', 'Geography & Earth', 'Coding & CS', 'Multi-Subject']

const interactiveLabs = [
  // Biology & Anatomy
  { id: 'biodigital', name: 'BioDigital Human', provider: 'BioDigital', description: 'Explore the human body in stunning 3D. Interactive anatomy, diseases, and treatments visualized with medical-grade accuracy.', url: 'https://human.biodigital.com/explore', category: 'Biology & Anatomy', color: 'from-teal-500 to-emerald-600', icon: Dna },
  { id: 'zperiod', name: 'Z Period', provider: 'ZPeriod', description: 'Interactive periodic table and element explorer with detailed properties, electron configurations, and visual data.', url: 'https://zperiod.app/', category: 'Chemistry', color: 'from-violet-500 to-purple-700', icon: Atom },
  { id: 'nobook-chem', name: 'NoBook Chemistry', provider: 'NoBook', description: 'Virtual chemistry lab with realistic experiment simulations. Mix chemicals, observe reactions, and learn lab safety — all risk-free.', url: 'https://chemistry-en.nobook.com/console/templates/resource', category: 'Chemistry', color: 'from-cyan-500 to-blue-600', icon: FlaskConical },
  { id: 'phet', name: 'PhET Simulations', provider: 'University of Colorado', description: 'World-famous free interactive math and science simulations. Physics, chemistry, biology, earth science, and more.', url: 'https://phet.colorado.edu/', category: 'Multi-Subject', color: 'from-green-500 to-teal-600', icon: Atom, embeddable: false },
  { id: 'visible-body', name: 'Visible Body', provider: 'Visible Body', description: '3D anatomy and physiology app with stunning models of the skeletal, muscular, circulatory, and nervous systems.', url: 'https://www.visiblebody.com/', category: 'Biology & Anatomy', color: 'from-red-500 to-rose-700', icon: Dna },
  { id: 'anatomylearning', name: 'Anatomy Learning', provider: 'AnatomyLearning', description: 'Free 3D atlas of human anatomy. Rotate, zoom, and explore every bone, muscle, organ, and system in full detail.', url: 'https://anatomylearning.com/', category: 'Biology & Anatomy', color: 'from-blue-500 to-indigo-700', icon: Microscope },
  { id: 'cellcraft', name: 'CellCraft', provider: 'Carolina Biological', description: 'Build and manage a living cell in this interactive game. Learn about organelles, cell division, and immune responses.', url: 'https://www.cellcraft.net/', category: 'Biology & Anatomy', color: 'from-lime-500 to-green-600', icon: Microscope },

  // Chemistry
  { id: 'molview', name: 'MolView', provider: 'MolView', description: 'Visualize and build 3D molecular structures in your browser. Supports structural formula editor and 3D model viewer.', url: 'https://molview.org/', category: 'Chemistry', color: 'from-blue-400 to-cyan-600', icon: Atom, embeddable: true },
  { id: 'chemcollective', name: 'ChemCollective', provider: 'Carnegie Mellon', description: 'Virtual chemistry labs and scenario-based learning activities. Practice titrations, acid-base reactions, and more.', url: 'https://chemcollective.org/vlabs', category: 'Chemistry', color: 'from-amber-500 to-orange-600', icon: TestTubes },
  { id: 'ptable', name: 'Ptable', provider: 'Ptable', description: 'The most advanced interactive periodic table on the web. Dynamic layouts, orbital diagrams, isotope data, and compound info.', url: 'https://ptable.com/', category: 'Chemistry', color: 'from-indigo-500 to-blue-700', icon: Atom, embeddable: true },

  // Physics
  { id: 'myphysicslab', name: 'MyPhysicsLab', provider: 'MyPhysicsLab', description: 'Interactive physics simulations covering pendulums, springs, collisions, roller coasters, and more with real-time graphs.', url: 'https://www.myphysicslab.com/', category: 'Physics', color: 'from-orange-500 to-red-600', icon: Orbit },
  { id: 'physicsclassroom', name: 'The Physics Classroom', provider: 'Physics Classroom', description: 'Interactive physics tutorials, simulations, and practice problems covering mechanics, waves, sound, light, and electricity.', url: 'https://www.physicsclassroom.com/Physics-Interactives', category: 'Physics', color: 'from-blue-600 to-indigo-700', icon: Lightbulb },
  { id: 'falstad', name: 'Falstad Circuit Simulator', provider: 'Falstad', description: 'Build and simulate electronic circuits in real-time. Visualize current flow, voltage, and component behavior interactively.', url: 'https://www.falstad.com/circuit/', category: 'Physics', color: 'from-yellow-500 to-amber-600', icon: Zap },
  { id: 'algodoo', name: 'Algodoo', provider: 'Algoryx', description: 'Physics sandbox for creating interactive simulations. Draw objects and watch them interact with realistic 2D physics.', url: 'https://www.algodoo.com/', category: 'Physics', color: 'from-sky-400 to-blue-600', icon: Orbit },

  // Math & Logic
  { id: 'desmos', name: 'Desmos Graphing', provider: 'Desmos', description: 'Beautiful, free online graphing calculator. Plot functions, create tables, add sliders, animate graphs, and explore geometry.', url: 'https://www.desmos.com/calculator', category: 'Math & Logic', color: 'from-green-500 to-emerald-600', icon: Calculator, embeddable: true },
  { id: 'geogebra', name: 'GeoGebra', provider: 'GeoGebra', description: 'Dynamic mathematics for everyone. Covers geometry, algebra, statistics, calculus, and 3D math with interactive tools.', url: 'https://www.geogebra.org/', category: 'Math & Logic', color: 'from-blue-500 to-purple-600', icon: Calculator, embeddable: true },
  { id: 'mathigon', name: 'Mathigon', provider: 'Mathigon', description: 'The textbook of the future. Interactive courses, virtual manipulatives, and Polypad — a powerful mathematical canvas.', url: 'https://mathigon.org/', category: 'Math & Logic', color: 'from-rose-500 to-pink-600', icon: Calculator },

  // Geography & Earth
  { id: 'earthquakeusgs', name: 'USGS Earthquake Map', provider: 'USGS', description: 'Real-time interactive earthquake map showing seismic activity worldwide. Filter by magnitude, time, and region.', url: 'https://earthquake.usgs.gov/earthquakes/map/', category: 'Geography & Earth', color: 'from-red-600 to-orange-600', icon: MapPin },
  { id: 'nasa-eyes', name: 'NASA Eyes', provider: 'NASA/JPL', description: 'Explore the solar system, exoplanets, and Earth from space using stunning 3D real-time visualization tools by NASA.', url: 'https://eyes.nasa.gov/', category: 'Geography & Earth', color: 'from-slate-700 to-blue-900', icon: Globe },
  { id: 'worldwind', name: 'NASA WorldWind', provider: 'NASA', description: 'Open-source virtual globe with satellite imagery, terrain data, and geographic information for immersive Earth exploration.', url: 'https://worldwind.arc.nasa.gov/', category: 'Geography & Earth', color: 'from-cyan-600 to-blue-700', icon: Globe },

  // Coding & CS
  { id: 'scratch', name: 'Scratch', provider: 'MIT Media Lab', description: 'Block-based visual programming language. Students create interactive stories, games, and animations while learning code logic.', url: 'https://scratch.mit.edu/', category: 'Coding & CS', color: 'from-orange-400 to-yellow-500', icon: Code, embeddable: true },
  { id: 'codecombat', name: 'CodeCombat', provider: 'CodeCombat', description: 'Learn Python, JavaScript, and more by playing a real game. Students write actual code to control characters and defeat challenges.', url: 'https://codecombat.com/', category: 'Coding & CS', color: 'from-slate-800 to-gray-900', icon: Cpu },
  { id: 'tinkercad', name: 'Tinkercad', provider: 'Autodesk', description: 'Free 3D modeling, electronics, and coding tool. Perfect for STEM education with drag-and-drop circuit and design simulations.', url: 'https://www.tinkercad.com/', category: 'Coding & CS', color: 'from-blue-400 to-cyan-500', icon: Cpu, embeddable: true },

  // Multi-Subject
  { id: 'labster', name: 'Labster', provider: 'Labster', description: 'Virtual science lab simulations covering biology, chemistry, physics, and engineering. Lab experiences without physical equipment.', url: 'https://www.labster.com/', category: 'Multi-Subject', color: 'from-purple-500 to-indigo-600', icon: FlaskConical },
  { id: 'explorelearning', name: 'ExploreLearning Gizmos', provider: 'ExploreLearning', description: 'Interactive math and science simulations (Gizmos) aligned to standards. Over 500 virtual labs for grades 3–12.', url: 'https://www.explorelearning.com/', category: 'Multi-Subject', color: 'from-emerald-500 to-green-600', icon: Lightbulb },
  { id: 'ck12', name: 'CK-12 Simulations', provider: 'CK-12 Foundation', description: 'Free interactive simulations, flexbooks, and adaptive practice covering science, math, and more — all standards-aligned.', url: 'https://www.ck12.org/simulations/', category: 'Multi-Subject', color: 'from-blue-500 to-indigo-600', icon: GraduationCap }
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
  const [activeTab, setActiveTab] = useState('platforms') // 'platforms' | 'prompts' | 'labs'
  const [activeCategory, setActiveCategory] = useState('All')
  const [activeLabCategory, setActiveLabCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [savedTools, setSavedTools] = useState(() => {
    const saved = localStorage.getItem('ldms_saved_tools')
    return saved ? JSON.parse(saved) : []
  })
  const [copiedPrompt, setCopiedPrompt] = useState(null)
  const [embedLab, setEmbedLab] = useState(null)

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

  const filteredLabs = interactiveLabs.filter(lab => {
    if (activeLabCategory === 'Saved ⭐' && !savedTools.includes(lab.id)) return false
    const matchesCategory = activeLabCategory === 'All' || activeLabCategory === 'Saved ⭐' || lab.category === activeLabCategory
    const matchesSearch = lab.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          lab.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
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
      <div className="flex bg-white/50 backdrop-blur-md p-1.5 rounded-2xl border border-surface-200 w-full max-w-2xl mx-auto mb-10 shadow-sm">
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
          onClick={() => setActiveTab('labs')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${
            activeTab === 'labs' 
              ? 'bg-white text-emerald-600 shadow-md ring-1 ring-surface-200' 
              : 'text-surface-500 hover:text-surface-800 hover:bg-surface-50/50'
          }`}
        >
          <FlaskConical className="w-4 h-4" /> Interactive Labs
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

      {activeTab === 'labs' && (
        <div className="animate-fade-in">
          {/* Labs Intro Banner */}
          <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 rounded-[28px] p-6 sm:p-8 mb-8 shadow-xl">
            <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-[400px] h-[400px] bg-white/10 rounded-full blur-[80px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/4 w-[300px] h-[300px] bg-emerald-300/20 rounded-full blur-[60px] pointer-events-none" />
            <div className="relative z-10 flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-lg border border-white/20">
                <FlaskConical className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-black font-display text-white tracking-tight">Interactive Labs & Simulations</h2>
                <p className="text-emerald-100 font-medium text-sm sm:text-base mt-1">Virtual labs, 3D models, and simulations — no physical equipment needed.</p>
              </div>
            </div>
          </div>

          {/* Filters and Search for Labs */}
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-center mb-8">
            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              {labCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveLabCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 ${
                    activeLabCategory === cat 
                      ? cat === 'Saved ⭐' 
                        ? 'bg-amber-400 text-amber-950 shadow-md scale-105' 
                        : 'bg-emerald-600 text-white shadow-md scale-105' 
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
                placeholder="Search labs & simulations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white border border-surface-200 rounded-2xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 transition-all shadow-sm"
              />
            </div>
          </div>

          {/* Grid of Labs */}
          {filteredLabs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredLabs.map((lab, idx) => (
                <div
                  key={lab.id}
                  className="group relative bg-white border border-surface-200 rounded-[28px] overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-1.5 flex flex-col h-full"
                  style={{ animationDelay: `${idx * 0.05}s` }}
                >
                  {/* Dynamic Header */}
                  <div className={`h-24 bg-gradient-to-br ${lab.color} p-6 flex justify-between items-start relative overflow-hidden`}>
                    <div className="absolute top-0 right-0 p-4 opacity-20 transform scale-150 group-hover:scale-[2] group-hover:rotate-12 transition-transform duration-700">
                      <lab.icon className="w-24 h-24 text-white" />
                    </div>
                    
                    <div className="relative z-10 w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-lg border border-white/20">
                      <lab.icon className="w-6 h-6" />
                    </div>

                    <button 
                      onClick={() => toggleSaveTool(lab.id)}
                      className="relative z-10 p-2 rounded-xl bg-white/20 backdrop-blur-md text-white hover:bg-white/40 transition-colors border border-white/20"
                      title={savedTools.includes(lab.id) ? "Remove from bookmarks" : "Bookmark this lab"}
                    >
                      {savedTools.includes(lab.id) ? (
                        <BookmarkCheck className="w-5 h-5 text-amber-300 fill-amber-300/30" />
                      ) : (
                        <Bookmark className="w-5 h-5" />
                      )}
                    </button>
                  </div>

                  {/* Content */}
                  <div className="p-6 flex flex-col flex-1">
                    <div className="mb-1 flex justify-between items-center">
                      <span className="text-[11px] font-black tracking-widest uppercase text-surface-400">{lab.provider}</span>
                      <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full font-bold">{lab.category}</span>
                    </div>
                    <h3 className="text-xl font-extrabold text-surface-900 mb-3 group-hover:text-emerald-600 transition-colors font-display">
                      {lab.name}
                    </h3>
                    <p className="text-sm text-surface-500 font-medium leading-relaxed mb-6 flex-1">
                      {lab.description}
                    </p>

                    <div className="flex gap-2">
                      <a 
                        href={lab.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl transition-colors border border-emerald-200 hover:border-emerald-300 text-sm"
                      >
                        Open <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      {lab.embeddable && (
                        <button
                          onClick={() => setEmbedLab(lab)}
                          className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl transition-colors border border-indigo-200 hover:border-indigo-300 text-sm"
                        >
                          Embed ▶
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-[32px] border border-surface-200 border-dashed">
              <FlaskConical className="w-12 h-12 text-surface-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-surface-900 mb-2">No labs found</h3>
              <p className="text-surface-500 font-medium">Try adjusting your search or check your saved items.</p>
              <button 
                onClick={() => {setSearchQuery(''); setActiveLabCategory('All')}}
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

      {/* Embedded Lab Iframe Modal */}
      {embedLab && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex flex-col animate-fade-in">
          <div className="flex items-center justify-between p-4 bg-slate-900/90 backdrop-blur-md border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${embedLab.color} flex items-center justify-center text-white`}>
                <embedLab.icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-white font-extrabold text-sm">{embedLab.name}</h3>
                <p className="text-slate-400 text-xs font-medium">{embedLab.provider}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a href={embedLab.url} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-lg transition-colors">
                Open Full Site ↗
              </a>
              <button onClick={() => setEmbedLab(null)} className="p-2 bg-white/10 hover:bg-red-500/80 text-white rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="flex-1">
            <iframe src={embedLab.url} className="w-full h-full border-0" allow="fullscreen; autoplay; clipboard-write" sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals" title={embedLab.name} />
          </div>
        </div>
      )}
    </div>
  )
}

