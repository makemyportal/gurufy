import React, { useState } from 'react'
import { 
  Gamepad2, Sparkles, BookOpen, User,
  Globe, FlaskConical, Play, Trophy, Shield, Ghost, Beaker,
  History, ArrowRight, X, Loader2
} from 'lucide-react'
import { generateAIContent } from '../utils/aiService'
import { useGamification } from '../contexts/GamificationContext'
import RPGQuestGame from '../components/games/RPGQuestGame'
import EscapeRoomGame from '../components/games/EscapeRoomGame'
import LabSimulatorGame from '../components/games/LabSimulatorGame'

const GAME_TEMPLATES = [
  {
    id: 'rpg_quest',
    name: 'RPG Quest',
    description: 'Students answer questions to defeat monsters and progress through a heroic story.',
    icon: Shield,
    color: 'from-orange-500 to-red-600',
    tags: ['Math', 'History']
  },
  {
    id: 'escape_room',
    name: 'Escape Room',
    description: 'A visual puzzle room where answering contextual questions unlocks clues to escape.',
    icon: Ghost,
    color: 'from-purple-500 to-indigo-600',
    tags: ['Literature', 'Logic']
  },
  {
    id: 'lab_simulator',
    name: 'Lab Simulator',
    description: 'Drag and drop virtual elements to build structures or observe reactions.',
    icon: Beaker,
    color: 'from-emerald-500 to-teal-600',
    tags: ['Science', 'Biology']
  }
]

const SUBJECT_TOPICS = {
  "Science": ["Physics", "Chemistry", "Biology", "Astronomy", "Earth Science"],
  "Mathematics": ["Algebra", "Geometry", "Calculus", "Fractions", "Trigonometry"],
  "History": ["World War II", "Ancient Egypt", "Roman Empire", "French Revolution", "Cold War"],
  "English & Literature": ["Grammar", "Poetry", "Shakespeare", "Creative Writing", "Vocabulary"],
  "Computer Science": ["Programming Basics", "Networking", "Cybersecurity", "Data Structures", "AI & Machine Learning"],
  "Geography": ["Continents & Oceans", "Climate Zones", "Countries & Capitals", "Map Reading", "Physical Features"]
}

export default function VisualGames() {
  const [selectedTemplate, setSelectedTemplate] = useState('rpg_quest')
  const [formData, setFormData] = useState({
    subject: '',
    topic: '',
    grade: '',
    difficulty: 'Medium'
  })
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedGameData, setGeneratedGameData] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const gameContainerRef = React.useRef(null)
  const { awardXP } = useGamification()

  const availableTopics = formData.subject ? SUBJECT_TOPICS[formData.subject] : []

  const handleGenerate = async (e) => {
    e.preventDefault()
    if (!formData.subject || !formData.topic || !formData.grade) return

    setIsGenerating(true)
    setGeneratedGameData(null)
    setIsPlaying(false)
    
    try {
      const numLevels = formData.difficulty === 'Easy' ? 5 : formData.difficulty === 'Medium' ? 7 : 10
      const prompt = `You are an expert Game Designer and Educator.
Create a ${selectedTemplate.replace('_', ' ')} mini-game about:
Subject: ${formData.subject}
Topic: ${formData.topic}
Grade Level: ${formData.grade}
Difficulty: ${formData.difficulty}

Return ONLY a valid JSON object with this EXACT structure (do NOT wrap in markdown blocks like \`\`\`json, just pure JSON text):
{
  "title": "A catchy quest/game title",
  "backgroundStory": "A 2-sentence intro story setting up the scenario.",
  "levels": [
    {
      "levelNumber": 1,
      "monsterName": "Name of the enemy/obstacle/clue",
      "question": "A multiple choice question about the topic",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswerIndex": 0,
      "successText": "What happens when they get it right.",
      "failText": "What happens when they get it wrong."
    }
  ]
}
Generate exactly ${numLevels} levels. Ensure correctAnswerIndex is an integer from 0 to 3.`

      const response = await generateAIContent(prompt, { preferGemini: true })
      
      // Clean JSON string in case AI adds markdown
      const cleanJson = response.replace(/^```json/g, '').replace(/^```/g, '').replace(/```$/g, '').trim()
      const parsedData = JSON.parse(cleanJson)
      
      setGeneratedGameData(parsedData)
      awardXP(20, 'generate_resource')
    } catch (error) {
      console.error(error)
      alert('Failed to generate game. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      gameContainerRef.current?.requestFullscreen().catch(err => {
        console.error("Error attempting to enable fullscreen:", err)
      })
    } else {
      document.exitFullscreen()
    }
  }

  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  return (
    <div className="max-w-[1200px] mx-auto animate-fade-in-up pb-12">
      {/* Immersive Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-[#1a1c29] to-black rounded-[32px] p-8 sm:p-12 mb-8 shadow-2xl border border-slate-800">
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/3 w-[600px] h-[600px] bg-gradient-to-tr from-emerald-500/30 to-blue-500/30 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/4 w-[400px] h-[400px] bg-purple-500/20 rounded-full blur-[80px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-end justify-between gap-6">
          <div className="max-w-2xl text-center md:text-left">
            <div className="inline-flex items-center justify-center md:justify-start gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-black tracking-widest uppercase mb-6 shadow-glow-sm">
              <Gamepad2 className="w-4 h-4" /> Next-Gen Learning
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black font-display text-white tracking-tight leading-tight mb-4 drop-shadow-xl">
              Visual <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Game Engine</span>
            </h1>
            <p className="text-slate-300 font-medium text-base sm:text-lg">
              Transform any subject into an interactive, visually stunning mini-game. 
              Engage students with RPG quests, escape rooms, and 2D simulators built instantly by AI.
            </p>
          </div>
          <div className="hidden md:flex w-24 h-24 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 items-center justify-center text-white shadow-2xl shrink-0 rotate-12 hover:rotate-0 transition-all duration-500">
            <Gamepad2 className="w-12 h-12 text-emerald-400 drop-shadow-lg" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Form Setup */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-[24px] p-6 shadow-xl shadow-surface-200/50 border border-surface-200">
            <h2 className="text-xl font-bold font-display text-surface-900 mb-6 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-500" />
              Configure Game Level
            </h2>
            
            <form onSubmit={handleGenerate} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-surface-700 mb-2">Select Game Template</label>
                <div className="grid grid-cols-1 gap-3">
                  {GAME_TEMPLATES.map(template => (
                    <button
                      key={template.id}
                      type="button"
                      disabled={template.comingSoon}
                      onClick={() => setSelectedTemplate(template.id)}
                      className={`relative flex items-center gap-4 p-3 rounded-xl border-2 transition-all text-left ${
                        selectedTemplate === template.id 
                          ? 'border-emerald-500 bg-emerald-50 shadow-md' 
                          : 'border-surface-200 hover:border-emerald-300 bg-white'
                      } ${template.comingSoon ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                    >
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${template.color} flex items-center justify-center text-white shadow-sm shrink-0`}>
                        <template.icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-bold flex items-center gap-2 ${selectedTemplate === template.id ? 'text-emerald-900' : 'text-surface-900'}`}>
                          {template.name}
                          {template.comingSoon && <span className="text-[9px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Coming Soon</span>}
                        </p>
                        <p className="text-xs text-surface-500 line-clamp-1">{template.description}</p>
                      </div>
                      {selectedTemplate === template.id && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-emerald-500" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4 pt-2 border-t border-surface-100">
                <div>
                  <label className="block text-sm font-bold text-surface-700 mb-1.5 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-surface-400" /> Subject
                  </label>
                  <select
                    required
                    value={formData.subject}
                    onChange={e => {
                      setFormData({...formData, subject: e.target.value, topic: ''})
                    }}
                    className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold text-surface-900 transition-all"
                  >
                    <option value="">Select a Subject...</option>
                    {Object.keys(SUBJECT_TOPICS).map(subject => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-surface-700 mb-1.5 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-surface-400" /> Specific Topic
                  </label>
                  <select
                    required
                    disabled={!formData.subject}
                    value={formData.topic}
                    onChange={e => setFormData({...formData, topic: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold text-surface-900 transition-all disabled:opacity-50 disabled:bg-surface-50"
                  >
                    <option value="">{formData.subject ? 'Select a Topic...' : 'Choose Subject first'}</option>
                    {availableTopics.map(topic => (
                      <option key={topic} value={topic}>{topic}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-surface-700 mb-1.5 flex items-center gap-1.5">
                      <User className="w-4 h-4 text-surface-400" /> Grade Level
                    </label>
                    <select
                      required
                      value={formData.grade}
                      onChange={e => setFormData({...formData, grade: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold text-surface-900 transition-all"
                    >
                      <option value="">Select...</option>
                      {['Grade 1-3', 'Grade 4-6', 'Grade 7-9', 'High School'].map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-surface-700 mb-1.5 flex items-center gap-1.5">
                      <Trophy className="w-4 h-4 text-surface-400" /> Difficulty
                    </label>
                    <select
                      value={formData.difficulty}
                      onChange={e => setFormData({...formData, difficulty: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold text-surface-900 transition-all"
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isGenerating || !formData.subject || !formData.topic || !formData.grade}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold rounded-xl shadow-lg shadow-emerald-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:-translate-y-0.5"
              >
                {isGenerating ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Synthesizing Game Logic...</>
                ) : (
                  <><Gamepad2 className="w-5 h-5" /> Generate Interactive Game</>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Game Engine Canvas */}
        <div className="lg:col-span-7">
          <div ref={gameContainerRef} className={`bg-slate-900 flex flex-col relative overflow-hidden shadow-2xl ${isFullscreen ? 'w-screen h-screen z-[1000] fixed inset-0' : 'rounded-[28px] p-2 h-full min-h-[600px] border border-slate-800'}`}>
            {/* Top Bar inside Engine */}
            <div className={`flex items-center justify-between backdrop-blur-sm ${isFullscreen ? 'absolute top-4 left-4 right-4 z-50 bg-black/40 border border-white/20 p-4 rounded-2xl' : 'px-4 py-3 bg-white/5 rounded-2xl mb-2 border border-white/10'}`}>
              <div className="flex items-center gap-2">
                {!isFullscreen && (
                  <>
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </>
                )}
                {isFullscreen && <span className="text-emerald-400 font-bold font-mono tracking-widest text-sm ml-2">LDMS ENGINE ACTIVE</span>}
              </div>
              <div className="flex items-center gap-4">
                <div className="hidden sm:block px-4 py-1 bg-black/50 rounded-full text-xs font-mono text-emerald-400 border border-emerald-500/30">
                  LDMS Canvas Engine v1.0
                </div>
                <button 
                  onClick={toggleFullscreen}
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors text-slate-300 hover:text-white"
                  title="Toggle Full Screen"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path></svg>
                </button>
              </div>
            </div>

            {/* Game Canvas Area */}
            <div className={`flex-1 bg-black/40 flex flex-col items-center justify-center relative overflow-hidden ${isFullscreen ? '' : 'rounded-2xl border border-white/5'}`}>
              
              {!generatedGameData && !isGenerating && (
                <div className="text-center px-8 z-10">
                  <div className="w-20 h-20 bg-slate-800 rounded-3xl mx-auto flex items-center justify-center shadow-inner mb-6 border border-slate-700">
                    <Play className="w-8 h-8 text-slate-500 ml-1" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2 font-display">Waiting for Input...</h3>
                  <p className="text-slate-400 max-w-sm mx-auto text-sm leading-relaxed">
                    Configure the game settings on the left and hit generate. 
                    The AI will synthesize a complete playable level right here.
                  </p>
                </div>
              )}

              {isGenerating && (
                <div className="text-center z-10 flex flex-col items-center">
                  <div className="relative w-24 h-24 mb-6">
                    <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
                    <div className="absolute inset-2 rounded-full border-4 border-blue-500/20 border-b-blue-500 animate-pulse" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-emerald-400 animate-pulse" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2 animate-pulse">Building Game World</h3>
                  <p className="text-emerald-400 text-sm font-mono">Generating characters, dialogue, and logic...</p>
                </div>
              )}

              {generatedGameData && !isGenerating && !isPlaying && (
                <div className="w-full h-full flex flex-col relative z-10 animate-fade-in">
                  <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=2560&auto=format&fit=crop')] bg-cover bg-center opacity-40 mix-blend-luminosity" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent" />
                  
                  <div className="relative z-20 flex-1 flex flex-col items-center justify-center p-8 text-center">
                    <div className="inline-block px-4 py-1.5 bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 rounded-full text-xs font-black uppercase tracking-widest mb-6 backdrop-blur-md shadow-lg">
                      {formData.subject} - {formData.topic}
                    </div>
                    <h2 className="text-4xl sm:text-5xl font-black font-display text-white mb-6 drop-shadow-2xl">
                      {generatedGameData.title}
                    </h2>
                    
                    <button 
                      onClick={() => setIsPlaying(true)}
                      className="px-8 py-4 bg-white text-slate-900 hover:bg-emerald-50 hover:text-emerald-700 font-black text-lg rounded-2xl shadow-[0_0_40px_rgba(255,255,255,0.3)] transition-all hover:scale-105 flex items-center gap-3 group"
                    >
                      <Play className="w-6 h-6 fill-current group-hover:text-emerald-500" /> Start Playing
                    </button>
                  </div>
                </div>
              )}

              {generatedGameData && !isGenerating && isPlaying && selectedTemplate === 'rpg_quest' && (
                <RPGQuestGame 
                  gameData={generatedGameData} 
                  onComplete={() => console.log("RPG Game completed")} 
                />
              )}
              {generatedGameData && !isGenerating && isPlaying && selectedTemplate === 'escape_room' && (
                <EscapeRoomGame 
                  gameData={generatedGameData} 
                  onComplete={() => console.log("Escape Room completed")} 
                />
              )}
              {generatedGameData && !isGenerating && isPlaying && selectedTemplate === 'lab_simulator' && (
                <LabSimulatorGame 
                  gameData={generatedGameData} 
                  onComplete={() => console.log("Lab Simulator completed")} 
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
