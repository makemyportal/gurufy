import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Search, ShoppingCart, User, Star, Zap, Tag, ShieldCheck, CreditCard, ChevronRight, Loader2 } from 'lucide-react'
import { db } from '../utils/firebase'
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore'

export default function Marketplace() {
  const { currentUser, userProfile, updateXP } = useAuth()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [buying, setBuying] = useState(false)
  useEffect(() => {
    const q = query(collection(db, 'marketplace'), orderBy('price'))
    const unsub = onSnapshot(q, snap => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }, () => setLoading(false))
    return () => unsub()
  }, [])

  const categories = ['All', 'PDF Notes', 'Mock Tests', 'Presentation', 'Worksheets']

  const filteredProducts = products.filter(p => {
    const matchSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) || p.author.toLowerCase().includes(searchTerm.toLowerCase())
    const matchCat = activeCategory === 'All' || p.type === activeCategory
    return matchSearch && matchCat
  })

  // Simulated Buy Flow
  function handleBuy(product) {
    if (!currentUser || !userProfile) return alert('Please login to purchase items.')
    if ((userProfile.xp || 0) < product.price) {
      return alert(`Not enough XP! You need ${product.price} XP but only have ${userProfile.xp || 0} XP.`)
    }
    setBuying(true)
    setTimeout(async () => {
      const success = await updateXP(-product.price)
      setBuying(false)
      if (success) {
        setSelectedProduct(null)
        alert(`Unlock Successful! "${product.title}" has been added to your library.`)
      } else {
        alert("Transaction failed. Not enough XP.")
      }
    }, 1500)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-fade-in pb-20 sm:pb-0">
      
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-indigo-900 to-purple-900 border border-indigo-800 p-8 sm:p-12 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px] pointer-events-none" />
        
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-white/90 text-xs font-bold tracking-widest uppercase mb-4">
            <ShoppingCart className="w-4 h-4" /> Educator Store
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold font-display text-white tracking-tight leading-tight mb-4">
            Premium Resources,<br/>By Teachers For Teachers
          </h1>
          <p className="text-indigo-100 font-medium">Support your fellow educators by purchasing high-quality lesson plans, notes, and question banks.</p>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between glass-card-solid p-4">
        <div className="relative w-full md:w-96 shrink-0">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
          <input
            type="text"
            placeholder="Search resources, topics, or authors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-surface-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-[3px] focus:ring-primary-100"
          />
        </div>
        
        <div className="flex gap-2 overflow-x-auto w-full md:w-auto custom-scrollbar pb-2 md:pb-0 hide-scrollbar">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                activeCategory === cat ? 'bg-indigo-600 text-white shadow-md' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      )}

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredProducts.map(product => (
          <div key={product.id} className="bg-white rounded-[20px] overflow-hidden shadow-soft hover:shadow-hover transition-all duration-300 border border-surface-100 flex flex-col group cursor-pointer" onClick={() => setSelectedProduct(product)}>
            <div className="h-48 relative overflow-hidden bg-surface-100">
              <img src={product.image} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-lg text-xs font-bold text-surface-900 shadow-sm flex items-center gap-1">
                <Tag className="w-3 h-3 text-indigo-600" /> {product.type}
              </div>
            </div>
            
            <div className="p-5 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-2 gap-2">
                <h3 className="font-bold text-surface-900 leading-tight flex-1 group-hover:text-indigo-600 transition-colors">{product.title}</h3>
              </div>
              
              <div className="flex items-center gap-1.5 text-xs text-surface-500 font-medium mb-4">
                <User className="w-3.5 h-3.5" />
                <span>{product.author}</span>
                <span className="text-surface-300">•</span>
                <span className="text-indigo-600 font-bold">{product.authorLevel}</span>
              </div>
              
              <div className="mt-auto flex items-center justify-between pt-4 border-t border-surface-100">
                <div className="flex flex-col">
                  <span className="text-xs text-surface-500 font-medium line-through">{product.price + 200} XP</span>
                  <span className="text-lg font-black text-surface-900 flex items-center">
                    <Zap className="w-4 h-4 text-primary-500 mr-1" /> {product.price}
                  </span>
                </div>
                
                <div className="flex items-center gap-1 text-sm font-bold text-amber-500">
                  <Star className="w-4 h-4 fill-current" /> {product.rating}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Checkout Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => !buying && setSelectedProduct(null)}>
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col md:flex-row animate-slide-up" onClick={e => e.stopPropagation()}>
            {/* Left side info */}
            <div className="w-full md:w-1/2 bg-surface-50 p-6 md:p-8 flex flex-col justify-between border-r border-surface-100">
              <div>
                <img src={selectedProduct.image} className="w-full h-40 object-cover rounded-xl shadow-sm mb-6" alt="Preview"/>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-3">
                  <Tag className="w-3 h-3" /> {selectedProduct.type}
                </span>
                <h2 className="text-2xl font-bold font-display text-surface-900 mb-2 leading-tight">{selectedProduct.title}</h2>
                <p className="text-sm text-surface-600 font-medium flex items-center gap-2 mb-4">
                  By <span className="text-surface-900 font-bold">{selectedProduct.author}</span>
                </p>
                <div className="flex items-center gap-4 text-xs font-bold text-surface-500">
                  <span className="flex items-center gap-1"><Star className="w-4 h-4 text-amber-400 fill-amber-400" /> {selectedProduct.rating || 0} ({selectedProduct.reviews || 0} reviews)</span>
                  <span className="flex items-center gap-1 text-emerald-600"><ShieldCheck className="w-4 h-4" /> Verified Resource</span>
                </div>
              </div>
            </div>
            
            {/* Right side checkout */}
            <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col">
              <h3 className="text-lg font-bold text-surface-900 mb-6 flex items-center gap-2">
                <Zap className="w-5 h-5 text-indigo-600 fill-indigo-600"/> Unlock Resource
              </h3>
              
              <div className="space-y-4 mb-8 flex-1">
                <div className="flex justify-between items-center text-sm font-medium text-surface-600">
                  <span>Item Cost</span>
                  <span className="font-bold flex items-center"><Zap className="w-4 h-4 text-indigo-500 mr-1"/> {selectedProduct.price} XP</span>
                </div>
                <div className="flex justify-between items-center text-sm font-medium text-surface-600">
                  <span>Your Balance</span>
                  <span className="font-bold flex items-center"><Zap className="w-4 h-4 text-emerald-500 mr-1"/> {userProfile?.xp || 0} XP</span>
                </div>
                <div className="h-px bg-surface-200" />
                <div className="flex justify-between items-center text-lg font-black text-surface-900">
                  <span>Cost</span>
                  <span className="flex items-center"><Zap className="w-5 h-5 text-indigo-600 mr-1"/> {selectedProduct.price}</span>
                </div>
              </div>
              
              <div className="space-y-3 mt-auto">
                <button
                  onClick={() => handleBuy(selectedProduct)}
                  disabled={buying}
                  className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-[0.98] shadow-[0_8px_20px_-4px_rgba(79,70,229,0.3)] disabled:opacity-70"
                >
                  {buying ? (
                    <><Loader2 className="w-5 h-5 animate-spin"/> Processing Unlock...</>
                  ) : (
                    <>Unlock for {selectedProduct.price} XP <ChevronRight className="w-5 h-5"/></>
                  )}
                </button>
                <button onClick={() => !buying && setSelectedProduct(null)} disabled={buying} className="w-full py-3 text-sm font-bold text-surface-500 hover:text-surface-800 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
