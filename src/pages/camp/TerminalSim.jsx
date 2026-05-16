import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

const FILESYSTEM = {
  '/': { type: 'dir', children: ['home', 'etc', 'var'] },
  '/home': { type: 'dir', children: ['student'] },
  '/home/student': { type: 'dir', children: ['projects', 'notes.txt', 'hello.py'] },
  '/home/student/projects': { type: 'dir', children: ['website', 'game.js'] },
  '/home/student/projects/website': { type: 'dir', children: ['index.html', 'style.css'] },
  '/home/student/projects/website/index.html': { type: 'file', content: '<html>\n  <head><title>My Site</title></head>\n  <body>\n    <h1>Hello World!</h1>\n  </body>\n</html>' },
  '/home/student/projects/website/style.css': { type: 'file', content: 'body {\n  background: #1a1a2e;\n  color: white;\n  font-family: Arial;\n}' },
  '/home/student/projects/game.js': { type: 'file', content: 'const score = 0;\nconst player = { x: 0, y: 0 };\nconsole.log("Game started!");' },
  '/home/student/notes.txt': { type: 'file', content: 'My Programming Notes:\n1. Variables store data\n2. Functions are reusable code blocks\n3. Loops repeat actions' },
  '/home/student/hello.py': { type: 'file', content: 'print("Hello, World!")\nname = input("What is your name? ")\nprint(f"Nice to meet you, {name}!")' },
  '/etc': { type: 'dir', children: ['config.txt'] },
  '/etc/config.txt': { type: 'file', content: 'SYSTEM_VERSION=1.0\nHOSTNAME=techlab-server\nOS=GuruLinux' },
  '/var': { type: 'dir', children: ['log'] },
  '/var/log': { type: 'dir', children: ['system.log'] },
  '/var/log/system.log': { type: 'file', content: '[INFO] System booted successfully\n[INFO] All services running\n[WARN] Low disk space on /dev/sda1' }
}

const CHALLENGES = [
  { task: 'Navigate to the student folder', hint: 'cd /home/student', check: (cwd) => cwd === '/home/student' },
  { task: 'List the files in the current directory', hint: 'ls', check: null },
  { task: 'Read the notes.txt file', hint: 'cat notes.txt', check: null },
  { task: 'Create a new folder called "homework"', hint: 'mkdir homework', check: null },
  { task: 'Navigate to the projects folder', hint: 'cd projects', check: (cwd) => cwd === '/home/student/projects' }
]

export default function TerminalSim() {
  const navigate = useNavigate()
  const [cwd, setCwd] = useState('/home/student')
  const [history, setHistory] = useState([
    { type: 'system', text: 'Welcome to GuruLinux Terminal v1.0' },
    { type: 'system', text: 'Type "help" to see available commands.' },
    { type: 'system', text: '' }
  ])
  const [input, setInput] = useState('')
  const [fs, setFs] = useState(FILESYSTEM)
  const [challengeIdx, setChallengeIdx] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef(null)
  const inputRef = useRef(null)
  const endRef = useRef(null)

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen()
    }
  }

  React.useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  const resolvePath = (path) => {
    if (path.startsWith('/')) return path
    if (path === '..') {
      const parts = cwd.split('/').filter(Boolean)
      parts.pop()
      return '/' + parts.join('/')
    }
    if (path === '.') return cwd
    return cwd === '/' ? '/' + path : cwd + '/' + path
  }

  const executeCommand = (cmd) => {
    const parts = cmd.trim().split(/\s+/)
    const command = parts[0]?.toLowerCase()
    const args = parts.slice(1)
    const newHistory = [...history, { type: 'user', text: `${cwd} $ ${cmd}` }]

    const addOutput = (text, type = 'output') => {
      newHistory.push({ type, text })
    }

    switch (command) {
      case 'help':
        addOutput('Available commands:')
        addOutput('  ls          - List files and folders')
        addOutput('  cd <dir>    - Change directory')
        addOutput('  cat <file>  - Read a file')
        addOutput('  mkdir <dir> - Create a new folder')
        addOutput('  pwd         - Print current directory')
        addOutput('  clear       - Clear terminal')
        addOutput('  whoami      - Show current user')
        addOutput('  echo <text> - Print text')
        break
      case 'ls': {
        const node = fs[cwd]
        if (node && node.children) {
          const items = node.children.map(c => {
            const fullPath = cwd === '/' ? '/' + c : cwd + '/' + c
            const isDir = fs[fullPath]?.type === 'dir'
            return isDir ? c + '/' : c
          })
          addOutput(items.join('  '))
        }
        break
      }
      case 'cd': {
        if (!args[0]) { addOutput('Usage: cd <directory>', 'error'); break }
        const target = resolvePath(args[0])
        if (fs[target] && fs[target].type === 'dir') {
          setCwd(target)
          const challenge = CHALLENGES[challengeIdx]
          if (challenge?.check && challenge.check(target)) {
            setChallengeIdx(i => i + 1)
            addOutput('Challenge completed!', 'success')
          }
        } else {
          addOutput(`cd: no such directory: ${args[0]}`, 'error')
        }
        break
      }
      case 'cat': {
        if (!args[0]) { addOutput('Usage: cat <filename>', 'error'); break }
        const filePath = resolvePath(args[0])
        if (fs[filePath] && fs[filePath].type === 'file') {
          fs[filePath].content.split('\n').forEach(line => addOutput(line))
        } else {
          addOutput(`cat: no such file: ${args[0]}`, 'error')
        }
        break
      }
      case 'mkdir': {
        if (!args[0]) { addOutput('Usage: mkdir <dirname>', 'error'); break }
        const newPath = resolvePath(args[0])
        const newFs = { ...fs }
        newFs[newPath] = { type: 'dir', children: [] }
        const parent = newFs[cwd]
        if (parent) parent.children = [...parent.children, args[0]]
        setFs(newFs)
        addOutput(`Directory created: ${args[0]}`, 'success')
        break
      }
      case 'pwd':
        addOutput(cwd)
        break
      case 'whoami':
        addOutput('student')
        break
      case 'echo':
        addOutput(args.join(' '))
        break
      case 'clear':
        setHistory([])
        return
      default:
        addOutput(`Command not found: ${command}. Type "help" for available commands.`, 'error')
    }

    setHistory(newHistory)
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!input.trim()) return
    executeCommand(input)
    setInput('')
  }

  return (
    <div ref={containerRef} className={`min-h-screen bg-slate-950 text-slate-300 font-mono flex flex-col ${isFullscreen ? 'fixed inset-0 z-[9999]' : ''}`}>
      <header className="border-b border-slate-800 bg-slate-900/80 p-4 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/camp')} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div className="flex items-center gap-3">
            <span className="text-2xl">🖥️</span>
            <div>
              <h1 className="text-white font-bold tracking-tight font-sans">Terminal Simulator</h1>
              <div className="text-xs text-lime-400">LINUX_CLI_TRAINER</div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-500 bg-slate-800 px-3 py-1 rounded">Challenge: {Math.min(challengeIdx + 1, CHALLENGES.length)}/{CHALLENGES.length}</div>
          <button onClick={toggleFullscreen} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors" title="Fullscreen">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Terminal */}
        <div className="flex-1 flex flex-col bg-[#0d1117] p-4" onClick={() => inputRef.current?.focus()}>
          <div className="flex-1 overflow-auto space-y-0.5 mb-4">
            {history.map((h, i) => (
              <div key={i} className={`text-sm leading-relaxed ${
                h.type === 'user' ? 'text-lime-400' :
                h.type === 'error' ? 'text-red-400' :
                h.type === 'success' ? 'text-yellow-400 font-bold' :
                h.type === 'system' ? 'text-slate-500' :
                'text-slate-300'
              }`}>{h.text}</div>
            ))}
            <div ref={endRef} />
          </div>
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <span className="text-lime-400 text-sm shrink-0">{cwd} $</span>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm text-white"
              autoFocus
              autoComplete="off"
              spellCheck={false}
            />
          </form>
        </div>

        {/* Sidebar: Challenges */}
        <div className="lg:w-72 bg-slate-900 border-l border-slate-800 p-5 space-y-4 overflow-auto">
          <h3 className="text-sm font-bold text-white font-sans">Challenges</h3>
          {CHALLENGES.map((c, i) => (
            <div key={i} className={`p-3 rounded-lg border text-xs ${
              i < challengeIdx ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
              i === challengeIdx ? 'bg-lime-500/10 border-lime-500/30 text-lime-300' :
              'bg-slate-800/50 border-slate-700 text-slate-500'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <span>{i < challengeIdx ? '✅' : i === challengeIdx ? '▶' : '⬜'}</span>
                <strong>{c.task}</strong>
              </div>
              {i === challengeIdx && <div className="text-[10px] mt-1 opacity-70">Hint: <code>{c.hint}</code></div>}
            </div>
          ))}
          <div className="p-3 bg-lime-500/10 border border-lime-500/20 rounded-lg text-xs text-lime-300">
            <strong>Real Skill:</strong> Linux terminals run 90% of the world's servers, including Google, Facebook, and NASA!
          </div>
        </div>
      </div>
    </div>
  )
}
