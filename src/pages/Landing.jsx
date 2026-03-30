import { useNavigate, Link } from 'react-router-dom'
import {
  GraduationCap, Sparkles, Users, Briefcase, Trophy, ArrowRight,
  BookOpen, MessageSquare, CalendarDays, Star, ChevronRight,
  Shield, Zap, TrendingUp, Award, Globe, CheckCircle
} from 'lucide-react'

const FEATURES = [
  {
    icon: Users,
    color: 'from-indigo-500 to-indigo-600',
    glow: 'rgba(99,102,241,0.3)',
    title: 'Community Network',
    desc: 'Join 12,400+ educators. Share ideas, collaborate on projects, and build meaningful professional relationships.',
  },
  {
    icon: Sparkles,
    color: 'from-violet-500 to-purple-600',
    glow: 'rgba(139,92,246,0.3)',
    title: 'AI Teaching Tools',
    desc: 'Generate lesson plans, create quiz banks, and get curriculum suggestions — powered by cutting-edge AI.',
  },
  {
    icon: Briefcase,
    color: 'from-cyan-500 to-blue-600',
    glow: 'rgba(6,182,212,0.3)',
    title: 'Job Marketplace',
    desc: 'Discover exclusive teaching roles in top schools. Let the right opportunity find you.',
  },
  {
    icon: Trophy,
    color: 'from-amber-500 to-orange-600',
    glow: 'rgba(245,158,11,0.3)',
    title: 'Gamification',
    desc: 'Earn XP, climb the leaderboard, and collect badges. Learning professional growth has never been this engaging.',
  },
  {
    icon: BookOpen,
    color: 'from-emerald-500 to-teal-600',
    glow: 'rgba(16,185,129,0.3)',
    title: 'Resource Library',
    desc: 'Access thousands of teaching materials, worksheets, and study resources shared by fellow educators.',
  },
  {
    icon: MessageSquare,
    color: 'from-rose-500 to-pink-600',
    glow: 'rgba(244,63,94,0.3)',
    title: 'Real-Time Messaging',
    desc: 'Connect directly with teachers, schools, and mentors through our seamless chat platform.',
  },
]

const STATS = [
  { value: '12,400+', label: 'Educators' },
  { value: '2,800+', label: 'Schools' },
  { value: '48,000+', label: 'Resources Shared' },
  { value: '96%', label: 'user satisfaction' },
]

const TESTIMONIALS = [
  {
    name: 'Priya Sharma',
    role: 'Mathematics Teacher, Delhi',
    avatar: 'PS',
    color: '#6366f1',
    text: 'LDMS transformed how I connect with other educators. Found my dream job and made lifelong professional friends here!',
    stars: 5,
  },
  {
    name: 'Rajesh Kumar',
    role: 'Principal, Mumbai',
    avatar: 'RK',
    color: '#8b5cf6',
    text: 'We hired 12 excellent teachers through LDMS in just 2 months. The quality of talent on this platform is outstanding.',
    stars: 5,
  },
  {
    name: 'Anita Menon',
    role: 'Science Teacher, Pune',
    avatar: 'AM',
    color: '#06b6d4',
    text: 'The AI lesson planner saves me 3 hours every week. The resource library is absolutely invaluable!',
    stars: 5,
  },
]

const HOW_STEPS = [
  { step: '01', title: 'Create Your Profile', desc: 'Sign up as a teacher or school in under 2 minutes.' },
  { step: '02', title: 'Connect & Explore', desc: 'Join groups, browse the feed, and discover resources.' },
  { step: '03', title: 'Grow & Succeed', desc: 'Land jobs, build skills, and level up your career.' },
]

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#07070d]">

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-[70px]">

        {/* Background glows */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[10%] w-[600px] h-[600px] bg-indigo-600/15 rounded-full blur-[120px]" />
          <div className="absolute top-[20%] right-[-5%] w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[100px]" />
          <div className="absolute bottom-[0%] left-[30%] w-[400px] h-[400px] bg-cyan-500/8 rounded-full blur-[80px]" />
          {/* Grid */}
          <div className="absolute inset-0 opacity-[0.025]"
            style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)', backgroundSize: '50px 50px' }} />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-20">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full mb-8 animate-fade-in">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-indigo-300 text-xs font-bold uppercase tracking-[0.15em]">India's #1 Educator Network</span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-extrabold tracking-tighter text-white leading-none mb-6">
            Where Great<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400">
              Teachers
            </span>{' '}
            Thrive.
          </h1>

          <p className="text-lg sm:text-xl text-slate-400 font-medium max-w-2xl mx-auto mb-10 leading-relaxed">
            The all-in-one professional platform built exclusively for India's educators.
            Connect, share resources, find jobs, and supercharge your teaching with AI.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <button
              onClick={() => navigate('/login')}
              className="group flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-base rounded-2xl
                         shadow-[0_8px_32px_rgba(99,102,241,0.4)] hover:shadow-[0_16px_48px_rgba(99,102,241,0.5)]
                         hover:from-indigo-500 hover:to-violet-500 transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.98]"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button
              onClick={() => navigate('/how-it-works')}
              className="flex items-center gap-2 px-8 py-4 bg-white/5 border border-white/10 text-white font-bold text-base rounded-2xl
                         hover:bg-white/10 hover:border-white/20 transition-all duration-300"
            >
              See How It Works
            </button>
          </div>

          {/* Social Proof Avatars */}
          <div className="flex items-center justify-center gap-4 mb-20">
            <div className="flex -space-x-3">
              {['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b'].map((c, i) => (
                <div key={i} className="w-9 h-9 rounded-full border-2 border-[#07070d] flex items-center justify-center text-white text-[11px] font-black" style={{ backgroundColor: c }}>
                  {['P','R','A','S','M'][i]}
                </div>
              ))}
            </div>
            <div className="text-left">
              <div className="flex items-center gap-1 mb-0.5">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}
              </div>
              <p className="text-slate-400 text-xs font-medium">Trusted by <span className="text-white font-bold">12,400+</span> educators</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {STATS.map(stat => (
              <div key={stat.label} className="bg-white/3 border border-white/5 rounded-2xl p-5 backdrop-blur-sm hover:bg-white/5 transition-all duration-300">
                <p className="text-3xl font-extrabold text-white mb-1">{stat.value}</p>
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────── */}
      <section className="py-24 sm:py-32 relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-indigo-600/5 rounded-full blur-[100px]" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-16">
            <span className="inline-block px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-xs font-bold uppercase tracking-widest mb-5">Features</span>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight mb-5">
              Everything you need to<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">level up your career</span>
            </h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto font-medium">
              From networking to AI-powered tools — LDMS has it all built for educators, by educators.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group relative bg-white/3 border border-white/5 rounded-2xl p-7 hover:bg-white/5 hover:border-white/10 transition-all duration-300 hover:-translate-y-1 cursor-default overflow-hidden"
              >
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"
                  style={{ background: `radial-gradient(circle at 0% 0%, ${f.glow} 0%, transparent 60%)` }}
                />
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-5 shadow-lg`}
                  style={{ boxShadow: `0 4px 20px ${f.glow}` }}>
                  <f.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed font-medium">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS (mini) ───────────────────────────────── */}
      <section className="py-24 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block px-3 py-1 bg-violet-500/10 border border-violet-500/20 rounded-full text-violet-400 text-xs font-bold uppercase tracking-widest mb-5">Simple Process</span>
            <h2 className="text-4xl font-extrabold text-white tracking-tight mb-4">Get started in minutes</h2>
            <p className="text-slate-400 font-medium">No complicated setup. Just sign up and start growing.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {HOW_STEPS.map((step, i) => (
              <div key={step.step} className="relative text-center group">
                {i < 2 && (
                  <div className="hidden md:block absolute top-8 left-[calc(50%+40px)] right-[-50%] h-px bg-gradient-to-r from-white/10 to-transparent" />
                )}
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600/30 to-violet-600/30 border border-indigo-500/20 text-indigo-400 text-xl font-black mb-4">
                  {step.step}
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
                <p className="text-slate-400 text-sm font-medium">{step.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link to="/how-it-works" className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 font-bold text-sm transition-colors">
              Learn more <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────── */}
      <section className="py-24 border-t border-white/5 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-violet-600/5 rounded-full blur-[80px]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-16">
            <span className="inline-block px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-bold uppercase tracking-widest mb-5">Wall of Love</span>
            <h2 className="text-4xl font-extrabold text-white tracking-tight mb-4">Loved by educators across India</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="bg-white/3 border border-white/5 rounded-2xl p-6 hover:bg-white/5 transition-all duration-300">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(t.stars)].map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-slate-300 text-sm leading-relaxed font-medium mb-5">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-black border-2 border-white/10"
                    style={{ backgroundColor: t.color }}>
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-white text-sm font-bold">{t.name}</p>
                    <p className="text-slate-500 text-xs font-medium">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA SECTION ─────────────────────────────────────── */}
      <section className="py-24 border-t border-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="relative bg-gradient-to-br from-indigo-600/20 to-violet-600/20 border border-indigo-500/20 rounded-3xl p-12 sm:p-16 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.15),transparent_70%)]" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full mb-6">
                <Zap className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-indigo-300 text-xs font-bold uppercase tracking-widest">Free Forever</span>
              </div>
              <h2 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight mb-5">
                Ready to transform<br/>your teaching career?
              </h2>
              <p className="text-slate-400 text-lg font-medium mb-8 max-w-lg mx-auto">
                Join thousands of educators who are already growing with LDMS. No credit card required.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="inline-flex items-center gap-2 px-10 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-base rounded-2xl
                           shadow-[0_8px_32px_rgba(99,102,241,0.5)] hover:shadow-[0_16px_48px_rgba(99,102,241,0.6)]
                           hover:from-indigo-500 hover:to-violet-500 transition-all duration-300 hover:-translate-y-0.5"
              >
                Join LDMS for Free
                <ArrowRight className="w-5 h-5" />
              </button>
              <p className="text-slate-600 text-xs font-medium mt-4">No credit card · Cancel anytime · Free forever plan</p>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
