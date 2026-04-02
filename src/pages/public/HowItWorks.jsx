import { useNavigate } from 'react-router-dom'
import {
  UserPlus, Compass, Sparkles, Briefcase, Trophy, MessageSquare,
  CheckCircle, ArrowRight, GraduationCap, BookOpen, Users, Zap
} from 'lucide-react'

const TEACHER_STEPS = [
  {
    icon: UserPlus,
    color: 'from-indigo-500 to-violet-600',
    glow: 'rgba(99,102,241,0.4)',
    step: '01',
    title: 'Sign Up as a Teacher',
    desc: 'Create your free profile in under 2 minutes. Add your subjects, experience, and teaching philosophy.',
    perks: ['Free forever plan', 'No credit card needed', 'Profile in 5 fields'],
  },
  {
    icon: Compass,
    color: 'from-cyan-500 to-blue-600',
    glow: 'rgba(6,182,212,0.4)',
    step: '02',
    title: 'Explore & Connect',
    desc: 'Browse the professional feed, join educator groups, and start following inspiring colleagues.',
    perks: ['Live community feed', 'Subject-based groups', 'Follow system'],
  },
  {
    icon: Sparkles,
    color: 'from-violet-500 to-purple-600',
    glow: 'rgba(139,92,246,0.4)',
    step: '03',
    title: 'Use AI Tools',
    desc: 'Generate lesson plans, create quiz banks, and get subject-specific teaching strategies with AI.',
    perks: ['Lesson plan generator', 'Quiz bank creator', 'Curriculum advisor'],
  },
  {
    icon: Briefcase,
    color: 'from-emerald-500 to-teal-600',
    glow: 'rgba(16,185,129,0.4)',
    step: '04',
    title: 'Find Your Dream Job',
    desc: 'Apply to exclusive teaching roles in top schools. Your profile acts as a living resume.',
    perks: ['Exclusive job listings', '1-click apply', 'School direct messages'],
  },
  {
    icon: Trophy,
    color: 'from-amber-500 to-orange-600',
    glow: 'rgba(245,158,11,0.4)',
    step: '05',
    title: 'Earn XP & Grow',
    desc: 'Every post, comment, and resource you share earns XP. Climb the leaderboard and unlock badges.',
    perks: ['XP reward system', 'Achievement badges', 'National leaderboard'],
  },
]

const SCHOOL_STEPS = [
  {
    icon: GraduationCap,
    color: 'from-rose-500 to-pink-600',
    glow: 'rgba(244,63,94,0.4)',
    step: '01',
    title: 'Create a School Profile',
    desc: 'Set up your institution\'s page, add your mission, facilities, and current openings.',
  },
  {
    icon: BookOpen,
    color: 'from-indigo-500 to-violet-600',
    glow: 'rgba(99,102,241,0.4)',
    step: '02',
    title: 'Post Job Openings',
    desc: 'Create detailed job listings that reach thousands of qualified educators across India.',
  },
  {
    icon: Users,
    color: 'from-cyan-500 to-blue-600',
    glow: 'rgba(6,182,212,0.4)',
    step: '03',
    title: 'Search & Filter Talent',
    desc: 'Browse verified teacher profiles filtered by subject, experience, location, and ratings.',
  },
  {
    icon: MessageSquare,
    color: 'from-emerald-500 to-teal-600',
    glow: 'rgba(16,185,129,0.4)',
    step: '04',
    title: 'Connect Directly',
    desc: 'Message candidates directly and schedule interviews — all within the LDMS platform.',
  },
]

const FAQS = [
  { q: 'Is LDMS free to use?', a: 'Yes! LDMS offers a generous free plan for teachers. Schools get a free trial period to explore all features.' },
  { q: 'Is my data safe?', a: 'Absolutely. We use enterprise-grade encryption and are fully compliant with Indian data protection laws.' },
  { q: 'How is LDMS different from LinkedIn?', a: 'LDMS is built exclusively for educators with features like AI lesson planners, school job boards, gamification, and a teacher-specific community feed.' },
  { q: 'Can schools find me if I\'m a teacher?', a: 'Yes! Schools can discover your public profile and reach out to you directly if your profile matches their requirements.' },
]

export default function HowItWorks() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#07070d] pt-[70px]">

      {/* ── Hero ── */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/3 w-[500px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[300px] bg-violet-600/10 rounded-full blur-[80px]" />
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <span className="inline-block px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-xs font-bold uppercase tracking-widest mb-6">Simple & Powerful</span>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tight mb-6 leading-tight">
            How LDMS<br className="hidden sm:block" />{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">Works</span>
          </h1>
          <p className="text-base sm:text-lg text-slate-400 font-medium leading-relaxed max-w-xl mx-auto px-2">
            Whether you're a teacher looking to grow or a school seeking talent — LDMS makes it effortlessly powerful.
          </p>
        </div>
      </section>

      {/* ── For Teachers ── */}
      <section className="py-16 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center sm:justify-start justify-center text-center sm:text-left gap-3 mb-10 sm:mb-12">
            <div className="w-10 h-10 rounded-xl mx-auto sm:mx-0 bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest">For Teachers</p>
              <h2 className="text-2xl font-extrabold text-white">Your path to professional mastery</h2>
            </div>
          </div>
          <div className="space-y-5">
            {TEACHER_STEPS.map((step, i) => (
              <div key={step.step} className="group relative bg-white/3 border border-white/5 rounded-2xl p-6 sm:p-8 hover:bg-white/5 hover:border-white/10 transition-all duration-300 overflow-hidden">
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"
                  style={{ background: `radial-gradient(circle at 0% 50%, ${step.glow.replace('0.4', '0.08')} 0%, transparent 50%)` }} />
                <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start text-center sm:text-left relative">
                  <div className={`shrink-0 w-14 h-14 rounded-2xl mx-auto sm:mx-0 bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg`}
                    style={{ boxShadow: `0 4px 20px ${step.glow}` }}>
                    <step.icon className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs font-extrabold text-slate-600 uppercase tracking-widest">Step {step.step}</span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">{step.title}</h3>
                    <p className="text-slate-400 font-medium mb-4 leading-relaxed">{step.desc}</p>
                    <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                      {step.perks.map(perk => (
                        <div key={perk} className="flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/5 rounded-full">
                          <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span className="text-xs font-semibold text-slate-400">{perk}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── For Schools ── */}
      <section className="py-16 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center sm:justify-start justify-center text-center sm:text-left gap-3 mb-10 sm:mb-12">
            <div className="w-10 h-10 rounded-xl mx-auto sm:mx-0 bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-bold text-rose-400 uppercase tracking-widest">For Schools</p>
              <h2 className="text-2xl font-extrabold text-white">Find the right teachers, faster</h2>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {SCHOOL_STEPS.map(step => (
              <div key={step.step} className="group bg-white/3 border border-white/5 rounded-2xl p-6 hover:bg-white/5 hover:-translate-y-1 transition-all duration-300 text-center">
                <div className={`w-12 h-12 rounded-xl mx-auto bg-gradient-to-br ${step.color} flex items-center justify-center mb-5`}
                  style={{ boxShadow: `0 4px 16px ${step.glow}` }}>
                  <step.icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs font-extrabold text-slate-600 uppercase tracking-widest">Step {step.step}</span>
                <h3 className="text-base font-bold text-white mt-1 mb-2">{step.title}</h3>
                <p className="text-slate-400 text-sm font-medium leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-24 border-t border-white/5">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="inline-block px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-400 text-xs font-bold uppercase tracking-widest mb-5">FAQ</span>
            <h2 className="text-3xl font-extrabold text-white tracking-tight">Common Questions</h2>
          </div>
          <div className="space-y-4">
            {FAQS.map(faq => (
              <div key={faq.q} className="bg-white/3 border border-white/5 rounded-2xl p-6 hover:bg-white/5 transition-all duration-300">
                <h3 className="text-base font-bold text-white mb-2">{faq.q}</h3>
                <p className="text-slate-400 text-sm font-medium leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 border-t border-white/5">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-5 leading-tight">Ready to get started?</h2>
          <p className="text-slate-400 font-medium mb-8">It takes less than 2 minutes to join 12,400+ educators.</p>
          <button
            onClick={() => navigate('/login')}
            className="w-full sm:w-auto inline-flex justify-center items-center gap-2 px-10 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-base rounded-2xl shadow-[0_8px_32px_rgba(99,102,241,0.5)] hover:shadow-[0_16px_48px_rgba(99,102,241,0.6)] hover:from-indigo-500 hover:to-violet-500 transition-all duration-300 hover:-translate-y-0.5"
          >
            Join for Free <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

    </div>
  )
}
