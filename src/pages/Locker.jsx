import React, { useState, useEffect } from 'react'
import { Lock, FileText, Plus, Save, Clock, Trash2, Share2, MessageCircle, Send, Mail, Link as LinkIcon } from 'lucide-react'

export default function Locker() {
  const [notes, setNotes] = useState(() => {
    const saved = localStorage.getItem('ldms_locker_notes')
    if (saved) return JSON.parse(saved)
    return [
      { id: 1, title: 'Term 2 Reflection', content: 'Need to focus more on interactive science experiments. Students loved the volcano project.', date: new Date().toISOString() }
    ]
  })
  
  const [activeNoteId, setActiveNoteId] = useState(notes[0]?.id || null)
  const [editorTitle, setEditorTitle] = useState('')
  const [editorContent, setEditorContent] = useState('')
  const [showShareMenu, setShowShareMenu] = useState(false)

  const activeNote = notes.find(n => n.id === activeNoteId)

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('ldms_locker_notes', JSON.stringify(notes))
  }, [notes])

  // Load active note into editor
  useEffect(() => {
    if (activeNote) {
      setEditorTitle(activeNote.title)
      setEditorContent(activeNote.content)
    } else {
      setEditorTitle('')
      setEditorContent('')
    }
  }, [activeNoteId])

  function createNewNote() {
    const newId = Date.now()
    const newNote = { id: newId, title: 'Untitled Note', content: '', date: new Date().toISOString() }
    setNotes([newNote, ...notes])
    setActiveNoteId(newId)
  }

  function saveNote() {
    if (!activeNoteId) return
    setNotes(notes.map(n => 
      n.id === activeNoteId 
        ? { ...n, title: editorTitle || 'Untitled', content: editorContent, date: new Date().toISOString() } 
        : n
    ))
  }

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(`*${editorTitle}*\n\n${editorContent}\n\n_Shared from LDMS Private Locker_`)
    window.open(`https://wa.me/?text=${text}`, '_blank')
    setShowShareMenu(false)
  }

  const handleShareTelegram = () => {
    const text = encodeURIComponent(`${editorTitle}\n\n${editorContent}\n\nShared from LDMS Private Locker`)
    window.open(`https://t.me/share/url?text=${text}`, '_blank')
    setShowShareMenu(false)
  }

  const handleShareEmail = () => {
    const subject = encodeURIComponent(editorTitle)
    const body = encodeURIComponent(`${editorContent}\n\n---\nShared from LDMS Private Locker`)
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank')
    setShowShareMenu(false)
  }

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: editorTitle,
          text: editorContent
        })
      } catch (err) { /* user cancelled */ }
    }
    setShowShareMenu(false)
  }

  function deleteNote(id) {
    if (confirm("Are you sure you want to delete this private note?")) {
      const remaining = notes.filter(n => n.id !== id)
      setNotes(remaining)
      if (activeNoteId === id) {
        setActiveNoteId(remaining.length > 0 ? remaining[0].id : null)
      }
    }
  }

  function getFormattedDate(isoString) {
    return new Date(isoString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="max-w-7xl mx-auto py-8 animate-fade-in-up">
      <div className="bg-white rounded-[32px] p-6 sm:p-10 shadow-sm border border-surface-200">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold font-display text-surface-900 mb-2 flex items-center gap-3">
              <Lock className="w-8 h-8 text-violet-500" /> Private Locker
            </h1>
            <p className="text-surface-500 font-medium max-w-xl">
              Securely store your personal teaching notes, drafts, and reflections. Data is stored locally on your device.
            </p>
          </div>
          <button onClick={createNewNote} className="px-5 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold flex items-center gap-2 transition-all shadow-[0_4px_12px_rgba(139,92,246,0.3)] hover:shadow-[0_8px_20px_rgba(139,92,246,0.4)]">
            <Plus className="w-5 h-5" /> New Note
          </button>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 h-[600px]">
          {/* Note List Sidebar */}
          <div className="lg:col-span-4 flex flex-col border border-surface-200 rounded-2xl overflow-hidden bg-surface-50">
            <div className="p-4 border-b border-surface-200 bg-surface-100/50 flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-widest text-surface-500">Your Files</span>
              <span className="text-xs font-bold text-surface-500 bg-surface-200 px-2.5 py-1 rounded-full">{notes.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
              {notes.length === 0 ? (
                <div className="text-center p-8 text-surface-400 font-medium">Locker is empty.</div>
              ) : (
                notes.map(note => (
                  <button
                    key={note.id}
                    onClick={() => setActiveNoteId(note.id)}
                    className={`w-full text-left p-4 rounded-xl transition-all group ${activeNoteId === note.id ? 'bg-white shadow-sm ring-1 ring-violet-200' : 'hover:bg-white/60'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="truncate flex-1">
                        <div className={`font-bold truncate mb-1 ${activeNoteId === note.id ? 'text-violet-700' : 'text-surface-800'}`}>
                          {note.title}
                        </div>
                        <div className="text-xs text-surface-400 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" /> {getFormattedDate(note.date)}
                        </div>
                      </div>
                      <div
                        onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-surface-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Editor */}
          <div className="lg:col-span-8 flex flex-col border border-surface-200 rounded-2xl overflow-hidden bg-white shadow-sm">
            {activeNoteId ? (
              <>
                <div className="p-4 border-b border-surface-100 flex items-center justify-between bg-surface-50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-violet-100 text-violet-600 rounded-lg"><FileText className="w-5 h-5" /></div>
                    <span className="text-sm font-bold text-surface-500">Editing Document</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <button onClick={() => setShowShareMenu(!showShareMenu)} className="px-4 py-2 bg-white border border-surface-200 hover:bg-surface-50 text-surface-700 text-sm font-bold rounded-lg flex items-center gap-2 transition-colors">
                        <Share2 className="w-4 h-4" /> Share
                      </button>
                      {showShareMenu && (
                        <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-surface-200 rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in">
                          <button onClick={handleShareWhatsApp} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-surface-700 hover:bg-[#25D366]/10 hover:text-[#25D366] transition-colors"><MessageCircle className="w-4 h-4" /> WhatsApp</button>
                          <button onClick={handleShareTelegram} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-surface-700 hover:bg-[#0088cc]/10 hover:text-[#0088cc] transition-colors border-t border-surface-100"><Send className="w-4 h-4" /> Telegram</button>
                          <button onClick={handleShareEmail} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-surface-700 hover:bg-surface-100 transition-colors border-t border-surface-100"><Mail className="w-4 h-4" /> Email</button>
                          {navigator.share && (
                            <button onClick={handleNativeShare} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-surface-700 hover:bg-surface-100 transition-colors border-t border-surface-100"><LinkIcon className="w-4 h-4" /> Share via...</button>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <button 
                      onClick={saveNote}
                      className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-sm font-bold rounded-lg flex items-center gap-2 transition-colors"
                    >
                      <Save className="w-4 h-4" /> Save
                    </button>
                  </div>
                </div>
                <div className="p-6 sm:p-10 flex-1 flex flex-col gap-6">
                  <input
                    type="text"
                    value={editorTitle}
                    onChange={e => setEditorTitle(e.target.value)}
                    placeholder="Document Title..."
                    className="text-3xl font-extrabold font-display text-surface-900 border-none focus:outline-none focus:ring-0 placeholder:text-surface-300"
                  />
                  <textarea
                    value={editorContent}
                    onChange={e => setEditorContent(e.target.value)}
                    placeholder="Start typing your private notes here..."
                    className="flex-1 w-full resize-none text-surface-700 leading-relaxed font-medium text-lg border-none focus:outline-none focus:ring-0 placeholder:text-surface-300 custom-scrollbar"
                  />
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-surface-400">
                <Lock className="w-16 h-16 text-surface-200 mb-4" />
                <p className="font-bold">Select a note to read or create a new one.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
