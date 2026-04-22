import { useState, useEffect, useCallback } from 'react'
import { Gamepad2, Plus, Trash2, Play, X, ChevronRight, ChevronLeft, Eye, RotateCcw, Save, Trophy, Clock, CheckCircle2, XCircle } from 'lucide-react'

const COLORS = ['bg-blue-500', 'bg-red-500', 'bg-emerald-500', 'bg-amber-500']
const LETTERS = ['A', 'B', 'C', 'D']

function emptyQ() { return { question: '', options: ['', '', '', ''], correct: 0, timeLimit: 20 } }

export default function ClassroomQuiz() {
  const [mode, setMode] = useState('create') // 'create' | 'present'
  const [quizTitle, setQuizTitle] = useState(() => localStorage.getItem('ldms_quiz_title') || 'My Classroom Quiz')
  const [questions, setQuestions] = useState(() => {
    const s = localStorage.getItem('ldms_quiz_questions')
    return s ? JSON.parse(s) : [emptyQ()]
  })
  const [currentQ, setCurrentQ] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [timer, setTimer] = useState(0)
  const [timerActive, setTimerActive] = useState(false)
  const [score, setScore] = useState({ correct: 0, wrong: 0 })
  const [quizDone, setQuizDone] = useState(false)

  useEffect(() => { localStorage.setItem('ldms_quiz_questions', JSON.stringify(questions)) }, [questions])
  useEffect(() => { localStorage.setItem('ldms_quiz_title', quizTitle) }, [quizTitle])

  // Timer
  useEffect(() => {
    if (!timerActive || timer <= 0) { if(timer <= 0 && timerActive) setTimerActive(false); return }
    const id = setInterval(() => setTimer(t => t - 1), 1000)
    return () => clearInterval(id)
  }, [timerActive, timer])

  const updateQ = (idx, field, val) => {
    setQuestions(qs => qs.map((q, i) => i === idx ? { ...q, [field]: val } : q))
  }
  const updateOption = (qIdx, oIdx, val) => {
    setQuestions(qs => qs.map((q, i) => i === qIdx ? { ...q, options: q.options.map((o, j) => j === oIdx ? val : o) } : q))
  }
  const addQuestion = () => setQuestions(qs => [...qs, emptyQ()])
  const removeQuestion = (idx) => { if (questions.length > 1) setQuestions(qs => qs.filter((_, i) => i !== idx)) }

  const startPresentation = () => {
    if (questions.some(q => !q.question.trim() || q.options.some(o => !o.trim()))) {
      alert('Please fill all questions and options before presenting.')
      return
    }
    setMode('present'); setCurrentQ(0); setShowAnswer(false); setScore({ correct: 0, wrong: 0 }); setQuizDone(false)
    setTimer(questions[0].timeLimit); setTimerActive(true)
  }

  const nextQuestion = () => {
    if (currentQ < questions.length - 1) {
      const next = currentQ + 1
      setCurrentQ(next); setShowAnswer(false)
      setTimer(questions[next].timeLimit); setTimerActive(true)
    } else {
      setQuizDone(true); setTimerActive(false)
    }
  }

  const revealAnswer = () => { setShowAnswer(true); setTimerActive(false) }

  const q = questions[currentQ] || {}
  const progress = questions.length > 0 ? ((currentQ + 1) / questions.length) * 100 : 0

  // PRESENT MODE
  if (mode === 'present') {
    if (quizDone) {
      return (
        <div className="fixed inset-0 z-[100] bg-gradient-to-br from-indigo-900 via-slate-900 to-black flex items-center justify-center">
          <div className="text-center animate-fade-in-up max-w-md">
            <div className="w-24 h-24 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-6"><Trophy className="w-14 h-14 text-amber-400" /></div>
            <h1 className="text-4xl font-black text-white mb-3">Quiz Complete!</h1>
            <p className="text-xl text-slate-300 font-bold mb-8">{quizTitle}</p>
            <p className="text-6xl font-black text-white mb-2">{questions.length} Questions</p>
            <p className="text-slate-400 font-medium mb-10">Great job everyone! 🎉</p>
            <button onClick={() => { setMode('create'); setQuizDone(false) }} className="px-8 py-4 bg-white text-slate-900 font-extrabold rounded-2xl text-lg hover:bg-slate-100 transition-colors shadow-xl">
              Exit Presentation
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className="fixed inset-0 z-[100] bg-gradient-to-br from-indigo-900 via-slate-900 to-black flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between p-4 sm:p-6">
          <button onClick={() => setMode('create')} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"><X className="w-5 h-5 text-white" /></button>
          <div className="text-center">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{quizTitle}</p>
            <p className="text-white font-extrabold">Question {currentQ + 1} / {questions.length}</p>
          </div>
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl ${timer <= 5 ? 'bg-red-500 text-white animate-pulse' : 'bg-white/10 text-white'}`}>
            {timer}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mx-6 h-1.5 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-indigo-400 to-fuchsia-400 transition-all duration-500" style={{ width: `${progress}%` }} /></div>

        {/* Question */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 sm:px-12">
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white text-center mb-10 sm:mb-14 leading-tight max-w-3xl">
            {q.question}
          </h2>

          {/* Options Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-3xl">
            {q.options.map((opt, i) => {
              const isCorrect = i === q.correct
              let bg = COLORS[i]
              if (showAnswer) bg = isCorrect ? 'bg-emerald-500 ring-4 ring-emerald-300 scale-105' : 'bg-white/5 opacity-50'
              return (
                <div key={i} className={`${bg} rounded-2xl p-5 sm:p-6 flex items-center gap-4 transition-all duration-500 cursor-default`}>
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-black text-white text-lg shrink-0">{LETTERS[i]}</div>
                  <span className="text-white font-bold text-base sm:text-xl flex-1">{opt}</span>
                  {showAnswer && isCorrect && <CheckCircle2 className="w-7 h-7 text-white shrink-0" />}
                  {showAnswer && !isCorrect && <XCircle className="w-6 h-6 text-white/30 shrink-0" />}
                </div>
              )
            })}
          </div>
        </div>

        {/* Bottom Controls */}
        <div className="flex items-center justify-center gap-4 p-6">
          {!showAnswer ? (
            <button onClick={revealAnswer} className="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-extrabold rounded-2xl text-lg hover:from-amber-400 hover:to-orange-400 transition-all shadow-xl flex items-center gap-2">
              <Eye className="w-5 h-5" /> Reveal Answer
            </button>
          ) : (
            <button onClick={nextQuestion} className="px-8 py-4 bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-extrabold rounded-2xl text-lg hover:from-indigo-400 hover:to-violet-400 transition-all shadow-xl flex items-center gap-2">
              {currentQ < questions.length - 1 ? <><ChevronRight className="w-5 h-5" /> Next Question</> : <><Trophy className="w-5 h-5" /> Finish Quiz</>}
            </button>
          )}
        </div>
      </div>
    )
  }

  // CREATE MODE
  return (
    <div className="max-w-[900px] mx-auto animate-fade-in-up pb-24 lg:pb-8">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-700 rounded-[32px] p-8 sm:p-12 mb-8 shadow-2xl">
        <div className="absolute top-0 right-0 -translate-y-1/3 translate-x-1/4 w-[500px] h-[500px] bg-white/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 border border-white/30 text-white text-xs font-black tracking-widest uppercase mb-5">
            <Gamepad2 className="w-4 h-4" /> Live Quiz
          </div>
          <h1 className="text-3xl sm:text-4xl font-black font-display text-white tracking-tight mb-3">
            Classroom <span className="text-purple-200">Quiz</span>
          </h1>
          <p className="text-purple-100 font-medium text-sm sm:text-base max-w-xl">Create questions and present them Kahoot-style on your projector.</p>
        </div>
      </div>

      {/* Title */}
      <div className="mb-6">
        <input type="text" value={quizTitle} onChange={e => setQuizTitle(e.target.value)} className="w-full px-6 py-4 bg-white border-2 border-surface-200 rounded-2xl text-xl font-extrabold text-surface-900 focus:outline-none focus:border-violet-400 transition-all" placeholder="Quiz Title..." />
      </div>

      {/* Questions */}
      <div className="space-y-6 mb-8">
        {questions.map((q, qi) => (
          <div key={qi} className="bg-white rounded-[24px] border border-surface-200 shadow-sm p-6 sm:p-8 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-black text-surface-400 uppercase tracking-widest">Question {qi + 1}</span>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-50 rounded-lg">
                  <Clock className="w-3.5 h-3.5 text-surface-400" />
                  <input type="number" min={5} max={120} value={q.timeLimit} onChange={e => updateQ(qi, 'timeLimit', +e.target.value)} className="w-10 text-center text-xs font-bold bg-transparent focus:outline-none" />
                  <span className="text-[10px] font-bold text-surface-400">sec</span>
                </div>
                {questions.length > 1 && <button onClick={() => removeQuestion(qi)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>}
              </div>
            </div>
            <input type="text" value={q.question} onChange={e => updateQ(qi, 'question', e.target.value)} placeholder="Type your question here..." className="w-full px-5 py-4 bg-surface-50 border-2 border-surface-200 rounded-2xl text-base font-bold text-surface-900 focus:outline-none focus:border-violet-400 mb-4 transition-all" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {q.options.map((opt, oi) => (
                <div key={oi} className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer ${q.correct === oi ? 'border-emerald-400 bg-emerald-50' : 'border-surface-200 hover:border-surface-300'}`} onClick={() => updateQ(qi, 'correct', oi)}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-black shrink-0 ${COLORS[oi]}`}>{LETTERS[oi]}</div>
                  <input type="text" value={opt} onChange={e => updateOption(qi, oi, e.target.value)} onClick={e => e.stopPropagation()} placeholder={`Option ${LETTERS[oi]}`} className="flex-1 bg-transparent text-sm font-semibold focus:outline-none text-surface-800" />
                  {q.correct === oi && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />}
                </div>
              ))}
            </div>
            <p className="text-[10px] font-bold text-surface-400 mt-2">Click an option to mark it as correct answer</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <button onClick={addQuestion} className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-dashed border-surface-300 text-surface-600 font-bold rounded-xl hover:border-violet-400 hover:text-violet-600 transition-all">
          <Plus className="w-4 h-4" /> Add Question
        </button>
        <button onClick={startPresentation} className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-extrabold rounded-xl hover:from-violet-500 hover:to-fuchsia-500 transition-all shadow-lg ml-auto">
          <Play className="w-5 h-5" /> Start Presentation
        </button>
      </div>
    </div>
  )
}
