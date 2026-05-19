import React from 'react'
import { useNavigate } from 'react-router-dom'

export default function SummerCampHub() {
  const navigate = useNavigate()

  const modules = [
    {
      id: 'data-detective',
      title: 'The Data Detective Agency',
      description: 'Solve a digital mystery using real SQL queries and data analysis.',
      icon: '🕵️‍♂️',
      skills: ['SQL', 'Logic', 'Databases'],
      color: 'from-blue-500 to-indigo-600',
      status: 'ready',
      path: '/camp/data-detective'
    },
    {
      id: 'game-physics',
      title: 'Game Physics Engine',
      description: 'Code the rules of the game! Edit gravity, speed, and jump power to win.',
      icon: '👾',
      skills: ['JavaScript', 'Physics', 'Game Dev'],
      color: 'from-green-500 to-emerald-600',
      status: 'ready',
      path: '/camp/game-physics'
    },
    {
      id: 'ai-creator',
      title: 'AI Creator Lab',
      description: 'Train your own AI model using your webcam and test it live.',
      icon: '🧠',
      skills: ['Machine Learning', 'Data Training'],
      color: 'from-purple-500 to-pink-600',
      status: 'ready',
      path: '/camp/ai-creator'
    },
    {
      id: 'api-ninja',
      title: 'API Ninja: World Tracker',
      description: 'Connect real-world APIs to build a live tracking dashboard.',
      icon: '🌍',
      skills: ['APIs', 'Web Dev', 'JSON'],
      color: 'from-orange-500 to-red-600',
      status: 'ready',
      path: '/camp/api-ninja'
    },
    {
      id: 'block-builder',
      title: 'Block Code Studio: Racing',
      description: 'Build your own racing game! Connect visual logic blocks to make your car drive, steer, and win.',
      icon: '🏎️',
      skills: ['Game Logic', 'Visual Coding', 'Creativity'],
      color: 'from-yellow-500 to-orange-600',
      status: 'ready',
      path: '/camp/block-builder'
    },
    {
      id: 'html-playground',
      title: 'HTML/CSS Playground',
      description: 'Write real HTML & CSS code and see your website come alive instantly!',
      icon: '🌐',
      skills: ['HTML', 'CSS', 'Web Design'],
      color: 'from-cyan-500 to-blue-600',
      status: 'ready',
      path: '/camp/html-playground'
    },
    {
      id: 'pixel-art',
      title: 'Pixel Art Studio',
      description: 'Create pixel art characters, items, and icons with a professional drawing tool.',
      icon: '🎨',
      skills: ['Digital Art', 'Grid Logic', 'Design'],
      color: 'from-pink-500 to-rose-600',
      status: 'ready',
      path: '/camp/pixel-art'
    },
    {
      id: 'music-dj',
      title: 'Music Code DJ',
      description: 'Create beats and music using a step sequencer — just like professional music producers!',
      icon: '🎵',
      skills: ['Patterns', 'Loops', 'Audio'],
      color: 'from-fuchsia-500 to-purple-600',
      status: 'ready',
      path: '/camp/music-dj'
    },
    {
      id: 'robot-maze',
      title: 'Robot Maze Solver',
      description: 'Program a robot step-by-step to navigate through a maze. Learn algorithms!',
      icon: '🤖',
      skills: ['Algorithms', 'Logic', 'Problem Solving'],
      color: 'from-amber-500 to-yellow-600',
      status: 'ready',
      path: '/camp/robot-maze'
    },
    {
      id: 'typing-racer',
      title: 'Typing Speed Racer',
      description: 'Race your car by typing programming words fast! Build the #1 developer skill.',
      icon: '⌨️',
      skills: ['Typing Speed', 'Accuracy', 'Focus'],
      color: 'from-green-500 to-teal-600',
      status: 'ready',
      path: '/camp/typing-racer'
    },
    {
      id: 'encryption-lab',
      title: 'Encryption Lab',
      description: 'Learn cybersecurity! Encrypt and decrypt secret messages using the Caesar Cipher.',
      icon: '🔐',
      skills: ['Cybersecurity', 'Cryptography', 'Logic'],
      color: 'from-red-500 to-rose-600',
      status: 'ready',
      path: '/camp/encryption-lab'
    },
    {
      id: 'stock-market',
      title: 'Stock Market Simulator',
      description: 'Learn finance! Buy and sell stocks, track profits, and react to market news.',
      icon: '💰',
      skills: ['Finance', 'Strategy', 'Math'],
      color: 'from-green-500 to-emerald-600',
      status: 'ready',
      path: '/camp/stock-market'
    },
    {
      id: 'spreadsheet',
      title: 'Spreadsheet Simulator',
      description: 'Master Excel formulas! SUM, AVERAGE, MAX — the skills every job needs.',
      icon: '📊',
      skills: ['Data Analysis', 'Formulas', 'Excel'],
      color: 'from-teal-500 to-cyan-600',
      status: 'ready',
      path: '/camp/spreadsheet'
    },
    {
      id: 'terminal',
      title: 'Terminal Simulator',
      description: 'Learn Linux commands! Navigate files, read code, and think like a real developer.',
      icon: '🖥️',
      skills: ['CLI', 'Linux', 'DevOps'],
      color: 'from-lime-500 to-green-600',
      status: 'ready',
      path: '/camp/terminal'
    },
    {
      id: 'logo-designer',
      title: 'Logo & Brand Designer',
      description: 'Design professional logos with shapes, colors, fonts, and icons. Download as PNG!',
      icon: '🎯',
      skills: ['Design', 'Branding', 'Creativity'],
      color: 'from-violet-500 to-indigo-600',
      status: 'ready',
      path: '/camp/logo-designer'
    },
    {
      id: 'git-sim',
      title: 'Git Version Control',
      description: 'Learn Git! Stage files, make commits, create branches, and merge code.',
      icon: '🌐',
      skills: ['Git', 'Collaboration', 'DevOps'],
      color: 'from-orange-500 to-amber-600',
      status: 'ready',
      path: '/camp/git-sim'
    },
    {
      id: 'app-builder',
      title: 'App UI Builder',
      description: 'Design mobile app interfaces! Add buttons, cards, inputs to a phone preview.',
      icon: '📱',
      skills: ['UX/UI', 'App Design', 'Prototyping'],
      color: 'from-indigo-500 to-blue-600',
      status: 'ready',
      path: '/camp/app-builder'
    },
    {
      id: 'binary-calc',
      title: 'Binary Calculator',
      description: 'Learn how computers think! Convert numbers and explore logic gates.',
      icon: '🧮',
      skills: ['Binary', 'Logic Gates', 'CS Fundamentals'],
      color: 'from-cyan-500 to-sky-600',
      status: 'ready',
      path: '/camp/binary-calc'
    },
    {
      id: 'json-explorer',
      title: 'JSON Explorer',
      description: 'Explore JSON data with a tree view. The format every API and database uses!',
      icon: '🗄️',
      skills: ['JSON', 'APIs', 'Data Formats'],
      color: 'from-amber-500 to-yellow-600',
      status: 'ready',
      path: '/camp/json-explorer'
    },
    {
      id: 'chatbot-builder',
      title: 'AI Persona Studio',
      description: 'Build your own AI chatbot! Create personas, rules, and chat with your generative AI creation.',
      icon: '🤖',
      skills: ['Prompt Engineering', 'Generative AI', 'NLP'],
      color: 'from-sky-500 to-blue-600',
      status: 'ready',
      path: '/camp/chatbot-builder'
    },
    {
      id: 'image-gen',
      title: 'AI Image Generator',
      description: 'Generate high-quality AI art from text prompts! Master visual prompt engineering and diffusion models.',
      icon: '🎨',
      skills: ['Visual Prompting', 'AI Art', 'Creativity'],
      color: 'from-fuchsia-500 to-pink-600',
      status: 'ready',
      path: '/camp/image-gen'
    },
    {
      id: 'face-analyzer',
      title: 'Emotion Face Analyzer',
      description: 'Use your webcam to detect real-time 3D facial landmarks and analyze micro-expressions with AI!',
      icon: '😲',
      skills: ['Computer Vision', 'Emotion AI', 'MediaPipe'],
      color: 'from-cyan-500 to-blue-500',
      status: 'ready',
      path: '/camp/face-analyzer'
    },
    {
      id: 'hand-gesture',
      title: 'AI Hand Gesture Canvas',
      description: 'Use your camera to track hand movements in real-time! Draw in the air with AI-powered gesture recognition.',
      icon: '🤚',
      skills: ['Computer Vision', 'AI/ML', 'MediaPipe'],
      color: 'from-cyan-500 to-teal-600',
      status: 'ready',
      path: '/camp/hand-gesture'
    },
    {
      id: 'app-inventor-pro',
      title: 'App Inventor Pro',
      description: 'Build real functional mobile apps using HTML, CSS, and JavaScript! Export as WebApp or APK.',
      icon: '🚀',
      skills: ['App Development', 'Coding', 'JavaScript'],
      color: 'from-emerald-500 to-teal-600',
      status: 'ready',
      path: '/camp/app-inventor-pro'
    }
  ]

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8 font-sans selection:bg-indigo-500/30">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="mb-12 text-center">
          <div 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700/50 text-indigo-400 font-medium mb-6 backdrop-blur-sm animate-fade-in"
          >
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
            </span>
            Gurufy Tech Lab
          </div>
          
          <h1 
            className="text-4xl md:text-6xl font-bold mb-4 tracking-tight animate-slide-up"
          >
            Real Skills. <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Real Fun.</span>
          </h1>
          <p 
            className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto animate-fade-in"
          >
            Dive into advanced, interactive tech modules designed to teach real-world programming, data science, AI, and game development skills.
          </p>
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((mod, index) => (
            <div
              key={mod.id}
              className={`relative overflow-hidden rounded-3xl border ${mod.status === 'ready' ? 'border-slate-700 hover:border-slate-500 bg-slate-800/40 cursor-pointer hover:-translate-y-1' : 'border-slate-800 bg-slate-800/20 cursor-not-allowed'} p-8 transition-all duration-300 group`}
              onClick={() => {
                if (mod.status === 'ready') {
                  navigate(mod.path)
                }
              }}
            >
              {/* Background Gradient Glow */}
              <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br ${mod.color} rounded-full blur-[80px] opacity-10 group-hover:opacity-20 transition-opacity duration-500 pointer-events-none`} />

              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${mod.color} flex items-center justify-center text-3xl shadow-lg`}>
                    {mod.icon}
                  </div>
                  {mod.status === 'ready' ? (
                    <div className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-sm font-semibold border border-emerald-500/20">
                      Available Now
                    </div>
                  ) : (
                    <div className="px-3 py-1 rounded-full bg-slate-500/10 text-slate-400 text-sm font-semibold border border-slate-500/20">
                      Coming Soon
                    </div>
                  )}
                </div>

                <h3 className="text-2xl font-bold mb-3 text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-slate-300 transition-colors">
                  {mod.title}
                </h3>
                
                <p className="text-slate-400 mb-6 leading-relaxed">
                  {mod.description}
                </p>

                <div className="flex flex-wrap gap-2 mb-8">
                  {mod.skills.map(skill => (
                    <span key={skill} className="px-3 py-1 rounded-md bg-slate-900/50 text-slate-300 text-sm border border-slate-700/50">
                      {skill}
                    </span>
                  ))}
                </div>

                {mod.status === 'ready' && (
                  <button className="flex items-center gap-2 text-white font-medium group-hover:gap-4 transition-all">
                    Start Mission
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
