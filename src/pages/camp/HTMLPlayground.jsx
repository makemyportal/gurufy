import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const DEFAULT_HTML = `<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      background: linear-gradient(135deg, #667eea, #764ba2);
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      color: white;
    }
    .card {
      background: rgba(255,255,255,0.15);
      backdrop-filter: blur(10px);
      border-radius: 20px;
      padding: 40px;
      text-align: center;
      border: 1px solid rgba(255,255,255,0.3);
    }
    h1 { font-size: 2em; margin-bottom: 10px; }
    p { opacity: 0.8; }
    .btn {
      margin-top: 20px;
      padding: 12px 30px;
      background: white;
      color: #764ba2;
      border: none;
      border-radius: 30px;
      font-weight: bold;
      font-size: 16px;
      cursor: pointer;
    }
    .btn:hover { transform: scale(1.05); }
  </style>
</head>
<body>
  <div class="card">
    <h1>Hello World!</h1>
    <p>This is my first website!</p>
    <button class="btn">Click Me</button>
  </div>
</body>
</html>`

const PORTFOLIO_HTML = `<!DOCTYPE html>
<html><head><style>
  body { font-family: 'Segoe UI', sans-serif; margin: 0; background: #0f172a; color: white; }
  .hero { text-align: center; padding: 80px 20px; background: linear-gradient(135deg, #1e293b, #334155); }
  h1 { font-size: 3em; margin-bottom: 10px; }
  .subtitle { color: #94a3b8; font-size: 1.2em; }
  .skills { display: flex; gap: 15px; justify-content: center; margin-top: 30px; flex-wrap: wrap; }
  .skill { background: #1e293b; border: 1px solid #334155; padding: 10px 20px; border-radius: 10px; }
  .projects { padding: 40px; text-align: center; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-top: 20px; }
  .project-card { background: #1e293b; border-radius: 15px; padding: 25px; border: 1px solid #334155; }
  .project-card h3 { color: #60a5fa; }
</style></head><body>
  <div class="hero">
    <h1>Hi, I am [Your Name]</h1>
    <p class="subtitle">Student Developer and Creator</p>
    <div class="skills">
      <span class="skill">HTML</span>
      <span class="skill">CSS</span>
      <span class="skill">JavaScript</span>
    </div>
  </div>
  <div class="projects">
    <h2>My Projects</h2>
    <div class="grid">
      <div class="project-card"><h3>Project 1</h3><p>A cool calculator app</p></div>
      <div class="project-card"><h3>Project 2</h3><p>My personal blog</p></div>
    </div>
  </div>
</body></html>`

const BUTTON_HTML = `<!DOCTYPE html>
<html><head><style>
  body { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #0f172a; margin: 0; flex-direction: column; gap: 20px; }
  .btn { padding: 15px 40px; font-size: 18px; font-weight: bold; border: none; border-radius: 50px; cursor: pointer; transition: all 0.3s ease; }
  .btn-glow { background: linear-gradient(90deg, #f43f5e, #ec4899); color: white; box-shadow: 0 0 20px rgba(244,63,94,0.5); }
  .btn-glow:hover { box-shadow: 0 0 40px rgba(244,63,94,0.8); transform: translateY(-3px); }
  .btn-outline { background: transparent; color: #60a5fa; border: 2px solid #60a5fa; }
  .btn-outline:hover { background: #60a5fa; color: white; }
  .btn-3d { background: #10b981; color: white; box-shadow: 0 5px 0 #059669; }
  .btn-3d:active { box-shadow: 0 2px 0 #059669; transform: translateY(3px); }
  h2 { color: white; font-family: sans-serif; }
</style></head><body>
  <h2>Cool Button Styles</h2>
  <button class="btn btn-glow">Glow Effect</button>
  <button class="btn btn-outline">Outline Style</button>
  <button class="btn btn-3d">3D Press Effect</button>
</body></html>`

const TEMPLATES = [
  { name: 'My First Website', icon: '🌍', code: DEFAULT_HTML },
  { name: 'Portfolio Page', icon: '💼', code: PORTFOLIO_HTML },
  { name: 'Animated Button', icon: '🎨', code: BUTTON_HTML }
]

export default function HTMLPlayground() {
  const navigate = useNavigate()
  const [code, setCode] = useState(DEFAULT_HTML)

  const loadTemplate = (template) => {
    setCode(template.code)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-sans flex flex-col">
      <header className="border-b border-slate-800 bg-slate-900/80 p-4 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/camp')} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div className="flex items-center gap-3">
            <span className="text-2xl">🌐</span>
            <div>
              <h1 className="text-white font-bold tracking-tight">HTML/CSS Playground</h1>
              <div className="text-xs text-cyan-400 font-mono">WEB_DEV_STUDIO</div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {TEMPLATES.map((t, i) => (
            <button key={i} onClick={() => loadTemplate(t)} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-lg text-slate-300 transition-colors" title={t.name}>
              {t.icon} {t.name}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row" style={{ minHeight: 'calc(100vh - 70px)' }}>
        {/* Code Editor */}
        <div className="lg:w-1/2 flex flex-col border-r border-slate-800">
          <div className="p-3 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider font-mono">1. Code Editor (HTML + CSS)</span>
          </div>
          <div className="px-4 py-2 bg-cyan-500/10 border-b border-slate-800 text-xs text-cyan-300">
            <strong>Teacher Tip:</strong> HTML gives structure (headings, buttons, text). CSS gives style (colors, sizes, animations). Edit the code and see instant results on the right!
          </div>
          <textarea
            value={code}
            onChange={e => setCode(e.target.value)}
            className="flex-1 bg-[#1e1e1e] text-emerald-400 font-mono text-sm p-4 resize-none outline-none leading-relaxed"
            spellCheck={false}
            style={{ minHeight: '400px' }}
          />
        </div>

        {/* Live Preview */}
        <div className="lg:w-1/2 flex flex-col">
          <div className="p-3 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">2. Live Preview</span>
            <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">Auto-updating</span>
          </div>
          <div className="flex-1 bg-white">
            <iframe
              title="preview"
              srcDoc={code}
              className="w-full h-full border-0"
              sandbox="allow-scripts"
              style={{ minHeight: '500px' }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
