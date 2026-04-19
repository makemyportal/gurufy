import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../utils/firebase'
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, limit } from 'firebase/firestore'
import { useNavigate } from 'react-router-dom'
import { History, Trash2, ExternalLink, Search, Loader2, FileText, Clock } from 'lucide-react'

export default function GenerationHistory() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [generations, setGenerations] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchFilter, setSearchFilter] = useState('')
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    if (!currentUser) return
    const q = query(
      collection(db, 'users', currentUser.uid, 'generations'),
      orderBy('createdAt', 'desc'),
      limit(100)
    )
    const unsub = onSnapshot(q, snap => {
      setGenerations(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }, () => setLoading(false))
    return () => unsub()
  }, [currentUser])

  async function handleDelete(id) {
    if (!confirm('Delete this generation permanently?')) return
    await deleteDoc(doc(db, 'users', currentUser.uid, 'generations', id))
  }

  function handleReopen(gen) {
    navigate(`/ai-tools?tool=${gen.toolId}`)
  }

  function formatDate(ts) {
    if (!ts) return ''
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const filtered = generations.filter(g =>
    g.toolTitle?.toLowerCase().includes(searchFilter.toLowerCase()) ||
    g.content?.toLowerCase().includes(searchFilter.toLowerCase())
  )

  return (
    <div className="max-w-5xl mx-auto py-8 px-2 sm:px-6 animate-fade-in-up">
      <div className="bg-white rounded-[32px] p-6 sm:p-10 shadow-sm border border-surface-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold font-display text-surface-900 mb-2 flex items-center gap-3">
              <History className="w-8 h-8 text-purple-500" /> Generation History
            </h1>
            <p className="text-surface-500 font-medium">All your AI-generated content, saved automatically.</p>
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input
              type="text"
              placeholder="Search by tool or content..."
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              className="pl-11 pr-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-400 transition-all w-64"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <History className="w-16 h-16 text-surface-200 mx-auto mb-4" />
            <p className="text-surface-500 font-bold text-lg">No generations yet</p>
            <p className="text-surface-400 text-sm mt-1">Use any AI tool and your results will be saved here automatically.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(gen => (
              <div key={gen.id} className="border border-surface-200 rounded-2xl overflow-hidden hover:border-purple-200 transition-all group">
                <div
                  className="flex items-center justify-between p-5 cursor-pointer hover:bg-surface-50 transition-colors"
                  onClick={() => setExpandedId(expandedId === gen.id ? null : gen.id)}
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gen.toolColor || 'from-purple-500 to-violet-600'} flex items-center justify-center text-white shadow-md flex-shrink-0`}>
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-surface-900 text-sm">{gen.toolTitle || 'AI Generation'}</h3>
                      <p className="text-xs text-surface-400 flex items-center gap-1.5 mt-0.5">
                        <Clock className="w-3.5 h-3.5" /> {formatDate(gen.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={(e) => { e.stopPropagation(); handleReopen(gen) }} className="opacity-0 group-hover:opacity-100 p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-all" title="Re-launch tool">
                      <ExternalLink className="w-4 h-4" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(gen.id) }} className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {expandedId === gen.id && (
                  <div className="px-5 pb-5 border-t border-surface-100 pt-4 animate-fade-in">
                    <div className="bg-surface-50 rounded-xl p-5 max-h-[400px] overflow-y-auto custom-scrollbar">
                      <pre className="whitespace-pre-wrap text-sm text-surface-700 font-medium leading-relaxed">{gen.content}</pre>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
