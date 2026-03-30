import { Link } from 'react-router-dom'
import { Calendar, Clock, ArrowRight, BookOpen, Sparkles, Users, Trophy, Lightbulb, TrendingUp } from 'lucide-react'

const CATEGORIES = ['All', 'Teaching Tips', 'AI & EdTech', 'Career Growth', 'Community', 'Resources']

const POSTS = [
  {
    id: 1,
    category: 'AI & EdTech',
    title: '10 Ways AI is Transforming the Indian Classroom in 2025',
    excerpt: "From personalized lesson plans to instant quiz generation, discover how LDMS's AI tools are helping 12,000+ teachers save hours every week.",
    author: 'Sanya Kapoor',
    avatar: 'SK',
    avatarColor: '#8b5cf6',
    date: 'March 28, 2025',
    readTime: '6 min read',
    icon: Sparkles,
    color: 'from-violet-500 to-purple-600',
    glow: 'rgba(139,92,246,0.25)',
    featured: true,
  },
  {
    id: 2,
    category: 'Career Growth',
    title: 'How Priya Landed Her Dream Teaching Job Using LDMS',
    excerpt: 'A Delhi mathematics teacher shares her step-by-step journey from browsing job listings to receiving an offer from a top CBSE school.',
    author: 'Arjun Mehta',
    avatar: 'AM',
    avatarColor: '#6366f1',
    date: 'March 24, 2025',
    readTime: '4 min read',
    icon: TrendingUp,
    color: 'from-indigo-500 to-blue-600',
    glow: 'rgba(99,102,241,0.25)',
  },
  {
    id: 3,
    category: 'Teaching Tips',
    title: '15 Classroom Management Strategies That Actually Work',
    excerpt: 'Experienced educators share their tried-and-tested techniques for maintaining engagement and discipline in classrooms of all sizes.',
    author: 'Rohan Das',
    avatar: 'RD',
    avatarColor: '#06b6d4',
    date: 'March 20, 2025',
    readTime: '8 min read',
    icon: Lightbulb,
    color: 'from-cyan-500 to-teal-600',
    glow: 'rgba(6,182,212,0.25)',
  },
  {
    id: 4,
    category: 'Community',
    title: 'Building Your Professional Network as an Educator',
    excerpt: "Networking isn't just for corporate professionals. Here's how India's top teachers are building powerful connections on LDMS.",
    author: 'Meera Nair',
    avatar: 'MN',
    avatarColor: '#10b981',
    date: 'March 16, 2025',
    readTime: '5 min read',
    icon: Users,
    color: 'from-emerald-500 to-teal-600',
    glow: 'rgba(16,185,129,0.25)',
  },
  {
    id: 5,
    category: 'Resources',
    title: 'The Ultimate Resource Library: Best Free Teaching Materials',
    excerpt: 'A curated collection of free worksheets, lesson plan templates, and assessment tools shared by the LDMS community.',
    author: 'Sanya Kapoor',
    avatar: 'SK',
    avatarColor: '#8b5cf6',
    date: 'March 12, 2025',
    readTime: '7 min read',
    icon: BookOpen,
    color: 'from-rose-500 to-pink-600',
    glow: 'rgba(244,63,94,0.25)',
  },
  {
    id: 6,
    category: 'AI & EdTech',
    title: 'Why Gamification is the Future of Teacher Motivation',
    excerpt: "LDMS's XP system and leaderboards aren't just fun — research shows they dramatically increase professional development engagement.",
    author: 'Arjun Mehta',
    avatar: 'AM',
    avatarColor: '#6366f1',
    date: 'March 8, 2025',
    readTime: '5 min read',
    icon: Trophy,
    color: 'from-amber-500 to-orange-600',
    glow: 'rgba(245,158,11,0.25)',
  },
]

export default function Blog() {
  const featured = POSTS.find(p => p.featured)
  const regular = POSTS.filter(p => !p.featured)

  return (
    <div className="min-h-screen bg-[#07070d] pt-[70px]">

      {/* ── Hero ── */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] bg-violet-600/8 rounded-full blur-[80px]" />
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <span className="inline-block px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-xs font-bold uppercase tracking-widest mb-6">LDMS Blog</span>
          <h1 className="text-5xl sm:text-6xl font-extrabold text-white tracking-tight mb-6 leading-tight">
            Insights for<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">Modern Educators</span>
          </h1>
          <p className="text-lg text-slate-400 font-medium leading-relaxed max-w-xl mx-auto">
            Tips, stories, and strategies to help you teach better, grow faster, and thrive in your career.
          </p>
        </div>
      </section>

      {/* ── Featured Post ── */}
      {featured && (
        <section className="pb-12 border-t border-white/5 pt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-xs font-extrabold text-indigo-400 uppercase tracking-widest mb-6">Featured Article</p>
            <div className="group relative bg-gradient-to-br from-white/5 to-white/2 border border-white/10 rounded-2xl p-8 sm:p-10 hover:bg-white/5 hover:border-white/15 transition-all duration-300 overflow-hidden cursor-pointer">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"
                style={{ background: `radial-gradient(circle at 0% 0%, ${featured.glow} 0%, transparent 50%)` }} />
              <div className="relative flex flex-col lg:flex-row gap-8 items-start">
                <div className={`shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br ${featured.color} flex items-center justify-center`}
                  style={{ boxShadow: `0 4px 24px ${featured.glow}` }}>
                  <featured.icon className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <span className="inline-block px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-xs font-bold uppercase tracking-wider mb-3">{featured.category}</span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-3 leading-tight group-hover:text-indigo-200 transition-colors">{featured.title}</h2>
                  <p className="text-slate-400 font-medium leading-relaxed mb-5">{featured.excerpt}</p>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black border border-white/10"
                        style={{ backgroundColor: featured.avatarColor }}>{featured.avatar}</div>
                      <span className="text-white text-sm font-bold">{featured.author}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium">
                      <Calendar className="w-3.5 h-3.5" />
                      {featured.date}
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      {featured.readTime}
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-6 h-6 text-slate-600 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all duration-300 shrink-0 mt-1" />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Article Grid ── */}
      <section className="py-16 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-10">
            <p className="text-xs font-extrabold text-slate-500 uppercase tracking-widest">Latest Articles</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {regular.map(post => (
              <div key={post.id} className="group bg-white/3 border border-white/5 rounded-2xl p-6 hover:bg-white/5 hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden relative">
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"
                  style={{ background: `radial-gradient(circle at 0% 100%, ${post.glow} 0%, transparent 50%)` }} />
                <div className="relative">
                  <div className="flex items-center justify-between mb-5">
                    <span className="px-3 py-1 bg-white/5 border border-white/5 rounded-full text-xs font-bold text-slate-400 uppercase tracking-wider">{post.category}</span>
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${post.color} flex items-center justify-center shrink-0`}
                      style={{ boxShadow: `0 4px 12px ${post.glow}` }}>
                      <post.icon className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <h3 className="text-base font-bold text-white mb-2 leading-tight group-hover:text-indigo-200 transition-colors">{post.title}</h3>
                  <p className="text-slate-400 text-sm font-medium leading-relaxed mb-5 line-clamp-2">{post.excerpt}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-black border border-white/10"
                        style={{ backgroundColor: post.avatarColor }}>{post.avatar}</div>
                      <span className="text-slate-400 text-xs font-semibold">{post.author}</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-600 text-xs">
                      <Clock className="w-3 h-3" />
                      {post.readTime}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Load More */}
          <div className="text-center mt-10">
            <button className="px-8 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-bold text-slate-300 hover:bg-white/10 hover:text-white transition-all duration-200">
              Load More Articles
            </button>
          </div>
        </div>
      </section>

      {/* ── Newsletter CTA ── */}
      <section className="py-20 border-t border-white/5">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <div className="bg-gradient-to-br from-indigo-600/10 to-violet-600/10 border border-indigo-500/20 rounded-2xl p-10">
            <h2 className="text-3xl font-extrabold text-white tracking-tight mb-3">Never miss an article</h2>
            <p className="text-slate-400 font-medium mb-6">Get the best teaching insights delivered to your inbox every week.</p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder="your@email.com"
                className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-medium placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 transition-all"
              />
              <button className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-sm rounded-xl shadow-[0_4px_20px_rgba(99,102,241,0.4)] hover:from-indigo-500 hover:to-violet-500 transition-all whitespace-nowrap">
                Subscribe Free
              </button>
            </div>
            <p className="text-slate-600 text-xs font-medium mt-3">No spam. Unsubscribe at any time.</p>
          </div>
        </div>
      </section>

    </div>
  )
}
