import React, { useState } from 'react'
import { CheckSquare, Plus, Trash2, CheckCircle2 } from 'lucide-react'

export default function Todo() {
  const [tasks, setTasks] = useState([
    { id: 1, text: 'Mark 8th Grade Science Papers', done: false },
    { id: 2, text: 'Prepare presentation for Morning Assembly', done: true },
    { id: 3, text: 'Upload math worksheet to Resources', done: false }
  ])
  const [newTask, setNewTask] = useState('')

  function handleAdd(e) {
    e.preventDefault()
    if (!newTask.trim()) return
    setTasks([{ id: Date.now(), text: newTask, done: false }, ...tasks])
    setNewTask('')
  }

  function toggleTask(id) {
    setTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t))
  }

  function deleteTask(id) {
    setTasks(tasks.filter(t => t.id !== id))
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 animate-fade-in-up">
      <div className="bg-white rounded-[32px] p-6 sm:p-10 shadow-sm border border-surface-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold font-display text-surface-900 mb-2 flex items-center gap-3">
              <CheckSquare className="w-8 h-8 text-emerald-500" /> Teaching Tasks
            </h1>
            <p className="text-surface-500 font-medium">Manage your daily checklist and stay organized.</p>
          </div>
          <div className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl font-bold flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            {tasks.filter(t => t.done).length} / {tasks.length} Done
          </div>
        </div>

        <form onSubmit={handleAdd} className="flex gap-3 mb-8">
          <input
            type="text"
            value={newTask}
            onChange={e => setNewTask(e.target.value)}
            placeholder="Add a new task (e.g. Schedule PTM meeting)..."
            className="flex-1 bg-surface-50 border border-surface-200 rounded-2xl px-5 py-4 font-medium focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
          />
          <button type="submit" disabled={!newTask.trim()} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 rounded-2xl font-bold flex items-center gap-2 transition-all disabled:opacity-50">
            <Plus className="w-5 h-5" /> <span className="hidden sm:inline">Add Task</span>
          </button>
        </form>

        <div className="space-y-3">
          {tasks.length === 0 ? (
            <div className="text-center py-12 text-surface-400 font-medium">No tasks yet! You are all caught up. 🎉</div>
          ) : (
            tasks.map(task => (
              <div key={task.id} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${task.done ? 'bg-surface-50 border-transparent opacity-60' : 'bg-white border-surface-200 hover:border-emerald-300 shadow-sm'}`}>
                <button
                  onClick={() => toggleTask(task.id)}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${task.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-surface-300'}`}
                >
                  {task.done && <CheckCircle2 className="w-4 h-4" />}
                </button>
                <span className={`flex-1 font-medium ${task.done ? 'line-through text-surface-500' : 'text-surface-900'}`}>
                  {task.text}
                </span>
                <button onClick={() => deleteTask(task.id)} className="p-2 text-surface-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
