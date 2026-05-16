import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

const INITIAL_COMMITS = [
  { id: 'a1b2c3', message: 'Initial commit', branch: 'main', files: ['index.html', 'style.css'] },
  { id: 'd4e5f6', message: 'Add header component', branch: 'main', files: ['header.jsx'] },
  { id: 'g7h8i9', message: 'Create login page', branch: 'main', files: ['login.jsx', 'auth.js'] }
]

export default function GitSimulator() {
  const navigate = useNavigate()
  const [commits, setCommits] = useState(INITIAL_COMMITS)
  const [branches, setBranches] = useState(['main'])
  const [currentBranch, setCurrentBranch] = useState('main')
  const [stagedFiles, setStagedFiles] = useState([])
  const [workingFiles, setWorkingFiles] = useState(['app.jsx', 'utils.js'])
  const [commitMsg, setCommitMsg] = useState('')
  const [terminal, setTerminal] = useState([
    { type: 'system', text: 'Git Simulator v1.0 - Learn version control!' },
    { type: 'system', text: 'Repository initialized with 3 commits on main branch.' }
  ])
  const [input, setInput] = useState('')
  const [newBranchName, setNewBranchName] = useState('')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef(null)
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

  const addTerminal = (text, type = 'output') => {
    setTerminal(prev => [...prev, { type, text }])
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  const gitAdd = (file) => {
    if (stagedFiles.includes(file)) return
    setStagedFiles(prev => [...prev, file])
    setWorkingFiles(prev => prev.filter(f => f !== file))
    addTerminal(`$ git add ${file}`, 'user')
    addTerminal(`Staged: ${file}`, 'success')
  }

  const gitAddAll = () => {
    if (workingFiles.length === 0) { addTerminal('Nothing to stage.', 'error'); return }
    addTerminal('$ git add .', 'user')
    setStagedFiles(prev => [...prev, ...workingFiles])
    addTerminal(`Staged ${workingFiles.length} files.`, 'success')
    setWorkingFiles([])
  }

  const gitCommit = () => {
    if (stagedFiles.length === 0) { addTerminal('Nothing staged to commit.', 'error'); return }
    if (!commitMsg.trim()) { addTerminal('Please enter a commit message.', 'error'); return }
    const id = Math.random().toString(36).substr(2, 6)
    const newCommit = { id, message: commitMsg, branch: currentBranch, files: [...stagedFiles] }
    setCommits(prev => [...prev, newCommit])
    addTerminal(`$ git commit -m "${commitMsg}"`, 'user')
    addTerminal(`[${currentBranch} ${id}] ${commitMsg}`, 'success')
    addTerminal(` ${stagedFiles.length} file(s) changed`, 'output')
    setStagedFiles([])
    setCommitMsg('')
  }

  const gitBranch = () => {
    if (!newBranchName.trim()) return
    if (branches.includes(newBranchName)) { addTerminal(`Branch '${newBranchName}' already exists.`, 'error'); return }
    setBranches(prev => [...prev, newBranchName])
    addTerminal(`$ git branch ${newBranchName}`, 'user')
    addTerminal(`Created branch: ${newBranchName}`, 'success')
    setNewBranchName('')
  }

  const gitCheckout = (branch) => {
    setCurrentBranch(branch)
    addTerminal(`$ git checkout ${branch}`, 'user')
    addTerminal(`Switched to branch '${branch}'`, 'success')
  }

  const gitMerge = (fromBranch) => {
    if (fromBranch === currentBranch) return
    addTerminal(`$ git merge ${fromBranch}`, 'user')
    const branchCommits = commits.filter(c => c.branch === fromBranch && !commits.some(mc => mc.branch === currentBranch && mc.id === c.id))
    if (branchCommits.length === 0) {
      addTerminal('Already up to date.', 'output')
    } else {
      addTerminal(`Merge successful! ${branchCommits.length} commit(s) merged.`, 'success')
    }
  }

  const createNewFile = () => {
    const names = ['component.jsx', 'helper.js', 'config.json', 'readme.md', 'test.js', 'api.js']
    const name = names[Math.floor(Math.random() * names.length)]
    if (!workingFiles.includes(name) && !stagedFiles.includes(name)) {
      setWorkingFiles(prev => [...prev, name])
      addTerminal(`Created new file: ${name}`)
    }
  }

  const branchCommits = commits.filter(c => c.branch === currentBranch)

  return (
    <div ref={containerRef} className={`min-h-screen bg-slate-950 text-slate-300 font-sans flex flex-col ${isFullscreen ? 'fixed inset-0 z-[9999]' : ''}`}>
      <header className="border-b border-slate-800 bg-slate-900/80 p-4 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/camp')} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div className="flex items-center gap-3">
            <span className="text-2xl">🌐</span>
            <div>
              <h1 className="text-white font-bold tracking-tight">Git Version Control</h1>
              <div className="text-xs text-orange-400 font-mono">DEVOPS_FUNDAMENTALS</div>
            </div>
          </div>
        </div>
        <button onClick={toggleFullscreen} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors" title="Fullscreen">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
        </button>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-0">
        {/* Working Area */}
        <div className="border-r border-slate-800 flex flex-col">
          <div className="p-4 bg-slate-900 border-b border-slate-800">
            <h2 className="text-sm font-bold text-white mb-2">Working Directory</h2>
            <p className="text-[10px] text-orange-300 bg-orange-500/10 p-2 rounded border border-orange-500/20">
              <strong>Tip:</strong> Git tracks file changes. Modified files appear here. Stage them with "git add" before committing.
            </p>
          </div>
          <div className="flex-1 p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-400">Unstaged Files ({workingFiles.length})</span>
              <button onClick={createNewFile} className="text-[10px] px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300">+ New File</button>
            </div>
            {workingFiles.map(f => (
              <div key={f} className="flex items-center justify-between bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                <span className="text-xs font-mono text-red-400">M {f}</span>
                <button onClick={() => gitAdd(f)} className="text-[10px] px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded font-bold hover:bg-emerald-500/30">Stage</button>
              </div>
            ))}
            <button onClick={gitAddAll} className="w-full text-xs py-2 bg-slate-800 hover:bg-slate-700 rounded-lg font-bold text-slate-300">git add . (Stage All)</button>

            <div className="border-t border-slate-800 pt-3 mt-3">
              <span className="text-xs font-bold text-slate-400">Staged Files ({stagedFiles.length})</span>
              {stagedFiles.map(f => (
                <div key={f} className="flex items-center bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 mt-2">
                  <span className="text-xs font-mono text-emerald-400">A {f}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-800 pt-3 mt-3">
              <input value={commitMsg} onChange={e => setCommitMsg(e.target.value)} placeholder="Commit message..." className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white outline-none mb-2" />
              <button onClick={gitCommit} className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg">git commit</button>
            </div>
          </div>
        </div>

        {/* Commit Graph */}
        <div className="border-r border-slate-800 flex flex-col">
          <div className="p-4 bg-slate-900 border-b border-slate-800">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-white">Commit History</h2>
              <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded font-bold">{currentBranch}</span>
            </div>
          </div>
          <div className="flex-1 p-4 overflow-auto">
            <div className="flex gap-2 mb-4 flex-wrap">
              {branches.map(b => (
                <button key={b} onClick={() => gitCheckout(b)} className={`px-3 py-1 text-xs font-bold rounded-lg ${b === currentBranch ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>{b}</button>
              ))}
            </div>
            <div className="flex gap-2 mb-4">
              <input value={newBranchName} onChange={e => setNewBranchName(e.target.value)} placeholder="new-branch" className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white outline-none" />
              <button onClick={gitBranch} className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded text-slate-300">Create</button>
            </div>
            <div className="space-y-2">
              {[...branchCommits].reverse().map((c, i) => (
                <div key={c.id} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-4 h-4 rounded-full ${i === 0 ? 'bg-orange-500' : 'bg-slate-600'}`}></div>
                    {i < branchCommits.length - 1 && <div className="w-0.5 h-8 bg-slate-700"></div>}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-white font-semibold">{c.message}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{c.id} | {c.files.length} file(s)</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Terminal */}
        <div className="flex flex-col bg-[#0d1117]">
          <div className="p-4 bg-slate-900 border-b border-slate-800">
            <h2 className="text-sm font-bold text-white">Git Terminal</h2>
          </div>
          <div className="flex-1 p-4 overflow-auto font-mono text-xs space-y-0.5">
            {terminal.map((t, i) => (
              <div key={i} className={
                t.type === 'user' ? 'text-lime-400' :
                t.type === 'error' ? 'text-red-400' :
                t.type === 'success' ? 'text-yellow-400' :
                t.type === 'system' ? 'text-slate-500' : 'text-slate-300'
              }>{t.text}</div>
            ))}
            <div ref={endRef} />
          </div>
        </div>
      </div>
    </div>
  )
}
