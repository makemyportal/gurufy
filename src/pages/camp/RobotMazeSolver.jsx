import React, { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

const GRID_SIZE = 10
const LEVELS = [
  {
    name: 'Level 1: Straight Path',
    start: [0, 0],
    end: [0, 4],
    walls: [],
    hint: 'Just go RIGHT 4 times!'
  },
  {
    name: 'Level 2: Turn the Corner',
    start: [0, 0],
    end: [3, 3],
    walls: [[0,3],[1,3],[0,4],[1,4],[2,4]],
    hint: 'Go RIGHT 2 times, then DOWN 3 times, then RIGHT 1 time.'
  },
  {
    name: 'Level 3: The Maze',
    start: [0, 0],
    end: [5, 7],
    walls: [
      [1,0],[1,1],[1,2],[1,3],
      [3,2],[3,3],[3,4],[3,5],[3,6],
      [0,5],[1,5],[2,5],
      [5,1],[5,2],[5,3],[5,4],[5,5]
    ],
    hint: 'Plan your route carefully. You need to go around the walls!'
  }
]

const COMMANDS = [
  { id: 'UP', label: '⬆️ Move Up', desc: 'Move robot 1 step up', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { id: 'DOWN', label: '⬇️ Move Down', desc: 'Move robot 1 step down', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { id: 'LEFT', label: '⬅️ Move Left', desc: 'Move robot 1 step left', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  { id: 'RIGHT', label: '➡️ Move Right', desc: 'Move robot 1 step right', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' }
]

export default function RobotMazeSolver() {
  const navigate = useNavigate()
  const [currentLevel, setCurrentLevel] = useState(0)
  const [program, setProgram] = useState([])
  const [robotPos, setRobotPos] = useState([...LEVELS[0].start])
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState(null) // 'win' | 'crash' | null
  const [path, setPath] = useState([])

  const level = LEVELS[currentLevel]

  const addCommand = (cmd) => {
    if (isRunning) return
    setProgram(prev => [...prev, cmd])
  }

  const removeCommand = (index) => {
    if (isRunning) return
    setProgram(prev => prev.filter((_, i) => i !== index))
  }

  const clearProgram = () => {
    if (isRunning) return
    setProgram([])
    setRobotPos([...level.start])
    setResult(null)
    setPath([])
  }

  const isWall = useCallback((r, c) => {
    return level.walls.some(w => w[0] === r && w[1] === c)
  }, [level])

  const runProgram = async () => {
    if (program.length === 0) return
    setIsRunning(true)
    setResult(null)
    setPath([])

    let pos = [...level.start]
    setRobotPos([...pos])
    const trail = [pos.join(',')]

    for (let i = 0; i < program.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 400))

      let newPos = [...pos]
      if (program[i] === 'UP') newPos[0]--
      if (program[i] === 'DOWN') newPos[0]++
      if (program[i] === 'LEFT') newPos[1]--
      if (program[i] === 'RIGHT') newPos[1]++

      // Check boundaries
      if (newPos[0] < 0 || newPos[0] >= GRID_SIZE || newPos[1] < 0 || newPos[1] >= GRID_SIZE) {
        setResult('crash')
        setIsRunning(false)
        return
      }

      // Check walls
      if (isWall(newPos[0], newPos[1])) {
        setResult('crash')
        setIsRunning(false)
        return
      }

      pos = newPos
      trail.push(pos.join(','))
      setPath([...trail])
      setRobotPos([...pos])
    }

    // Check win
    if (pos[0] === level.end[0] && pos[1] === level.end[1]) {
      setResult('win')
    } else {
      setResult('crash')
    }
    setIsRunning(false)
  }

  const nextLevel = () => {
    const next = (currentLevel + 1) % LEVELS.length
    setCurrentLevel(next)
    setProgram([])
    setRobotPos([...LEVELS[next].start])
    setResult(null)
    setPath([])
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-sans flex flex-col">
      <header className="border-b border-slate-800 bg-slate-900/80 p-4 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/camp')} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div className="flex items-center gap-3">
            <span className="text-2xl">🤖</span>
            <div>
              <h1 className="text-white font-bold tracking-tight">Robot Maze Solver</h1>
              <div className="text-xs text-amber-400 font-mono">ALGORITHM_TRAINER</div>
            </div>
          </div>
        </div>
        <div className="text-sm font-bold text-white bg-slate-800 px-3 py-1 rounded-lg">{level.name}</div>
      </header>

      <div className="flex-1 p-6 max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left: Program Builder */}
        <div className="flex flex-col gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-2">1. Write the Robot's Program</h2>
            <p className="text-xs text-amber-300 mb-4 bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
              <strong>Teacher Tip:</strong> Programming means giving step-by-step instructions. The robot can ONLY follow YOUR commands. Think before you click!
            </p>

            {/* Command Buttons */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {COMMANDS.map(cmd => (
                <button
                  key={cmd.id}
                  onClick={() => addCommand(cmd.id)}
                  disabled={isRunning}
                  className={`p-3 rounded-xl border text-sm font-bold transition-all hover:scale-[1.02] disabled:opacity-50 ${cmd.color}`}
                >
                  {cmd.label}
                </button>
              ))}
            </div>

            {/* Program Steps */}
            <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 min-h-[150px]">
              <div className="text-xs text-slate-500 mb-2 font-bold">Your Program ({program.length} steps):</div>
              <div className="flex flex-wrap gap-1.5">
                {program.map((cmd, i) => (
                  <button
                    key={i}
                    onClick={() => removeCommand(i)}
                    className="px-2.5 py-1.5 bg-slate-800 text-white text-xs font-mono rounded-md border border-slate-700 hover:bg-red-500/20 hover:border-red-500/30 hover:text-red-400 transition-colors"
                    title="Click to remove"
                  >
                    {i + 1}. {cmd}
                  </button>
                ))}
                {program.length === 0 && <span className="text-slate-600 text-xs">Click the buttons above to add commands...</span>}
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button onClick={runProgram} disabled={isRunning || program.length === 0} className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl disabled:opacity-50 transition-colors">
                {isRunning ? '⏳ Running...' : '▶ Run Program'}
              </button>
              <button onClick={clearProgram} disabled={isRunning} className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl disabled:opacity-50 transition-colors">
                Clear
              </button>
            </div>

            {/* Hint */}
            <details className="mt-4 text-xs">
              <summary className="text-slate-500 cursor-pointer hover:text-slate-300">💡 Need a hint?</summary>
              <p className="mt-2 text-amber-400 bg-amber-500/10 p-2 rounded border border-amber-500/20">{level.hint}</p>
            </details>
          </div>

          {result && (
            <div className={`p-4 rounded-2xl border text-center ${result === 'win' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
              {result === 'win' ? (
                <div>
                  <div className="text-3xl mb-2">🎉</div>
                  <div className="text-emerald-400 font-bold text-lg">Level Complete!</div>
                  <button onClick={nextLevel} className="mt-3 px-4 py-2 bg-emerald-500 text-white font-bold rounded-lg hover:bg-emerald-600 transition-colors">Next Level →</button>
                </div>
              ) : (
                <div>
                  <div className="text-3xl mb-2">💥</div>
                  <div className="text-red-400 font-bold text-lg">Robot Crashed!</div>
                  <p className="text-xs text-red-300 mt-1">It hit a wall or went off the grid. Try a different path!</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Maze Grid */}
        <div className="flex flex-col items-center">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-lg font-bold text-white mb-4 text-center">2. The Maze</h2>
            <div className="inline-grid gap-[2px] bg-slate-800 p-1 rounded-xl" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}>
              {Array(GRID_SIZE).fill(0).map((_, r) =>
                Array(GRID_SIZE).fill(0).map((_, c) => {
                  const isStart = r === level.start[0] && c === level.start[1]
                  const isEnd = r === level.end[0] && c === level.end[1]
                  const isRobot = r === robotPos[0] && c === robotPos[1]
                  const wall = isWall(r, c)
                  const onPath = path.includes(`${r},${c}`)

                  let bg = 'bg-slate-900'
                  if (wall) bg = 'bg-slate-600'
                  if (onPath) bg = 'bg-blue-500/20'
                  if (isStart) bg = 'bg-emerald-500/30'
                  if (isEnd) bg = 'bg-yellow-500/30'

                  return (
                    <div
                      key={`${r}-${c}`}
                      className={`w-9 h-9 rounded-sm flex items-center justify-center text-lg transition-all ${bg}`}
                    >
                      {isRobot ? '🤖' : isEnd ? '🏁' : isStart && !isRobot ? '🟢' : wall ? '' : ''}
                    </div>
                  )
                })
              )}
            </div>
            <div className="flex justify-center gap-4 mt-4 text-xs text-slate-400">
              <span>🟢 Start</span>
              <span>🏁 Finish</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-slate-600 rounded-sm inline-block"></span> Wall</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
