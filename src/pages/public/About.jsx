import { useNavigate, Link } from 'react-router-dom'
import {
  GraduationCap, Heart, Target, Globe2, Users, Lightbulb,
  Award, ArrowRight, BookOpen, Star, Zap
} from 'lucide-react'

const VALUES = [
  {
    icon: Heart,
    color: 'from-rose-500 to-pink-600',
    glow: 'rgba(244,63,94,0.25)',
    title: 'Educator First',
    desc: 'Every decision we make starts with one question: "Does this make a teacher\'s life better?"',
  },
  {
    icon: Globe2,
    color: 'from-cyan-500 to-blue-600',
    glow: 'rgba(6,182,212,0.25)',
    title: 'Inclusive India',
    desc: 'From metros to small towns — we believe every educator deserves equal opportunity and recognition.',
  },
  {
    icon: Lightbulb,
    color: 'from-amber-500 to-orange-600',
    glow: 'rgba(245,158,11,0.25)',
    title: 'Innovation',
    desc: 'We harness AI and modern technology to solve real classroom challenges, not just add features.',
  },
  {
    icon: Target,
    color: 'from-emerald-500 to-teal-600',
    glow: 'rgba(16,185,129,0.25)',
    title: 'Impact',
    desc: 'Better teachers create better students. We measure success by the lives we help transform.',
  },
]

const TEAM = [
  { name: 'Arjun Mehta', role: 'Co-Founder & CEO', avatar: 'AM', color: '#6366f1', bio: 'Former teacher turned entrepreneur. 10 years in EdTech.' },
  { name: 'Sanya Kapoor', role: 'Co-Founder & CTO', avatar: 'SK', color: '#8b5cf6', bio: 'IIT grad. Built AI systems for top Indian startups.' },
  { name: 'Rohan Das', role: 'Head of Community', avatar: 'RD', color: '#06b6d4', bio: 'Ex-school principal with passion for teacher growth.' },
  { name: 'Meera Nair', role: 'Head of Product', avatar: 'MN', color: '#10b981', bio: 'User researcher obsessed with delightful experiences.' },
]

const MILESTONES = [
  { year: '2022', event: 'Founded in Bangalore with a team of 4' },
  { year: '2023', event: 'Reached 1,000 educators and launched AI tools' },
  { year: '2024', event: 'Crossed 8,000 users and raised seed funding' },
  { year: '2025', event: '12,400+ educators, 2,800+ schools across India' },
]

export default function About() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#07070d] pt-[70px]">

      {/* ── Hero ── */}
      <section className="relative py-24 sm:py-32 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-600/12 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-violet-600/10 rounded-full blur-[80px]" />
          <div className="absolute inset-0 opacity-[0.02]"
            style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)', backgroundSize: '50px 50px' }} />
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <span className="inline-block px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-xs font-bold uppercase tracking-widest mb-6">Our Story</span>
          <h1 className="text-5xl sm:text-6xl font-extrabold text-white tracking-tight mb-6 leading-tight">
            Built by teachers,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">for teachers.</span>
          </h1>
          <p className="text-lg text-slate-400 font-medium leading-relaxed max-w-2xl mx-auto">
            LDMS was born from a simple frustration: India's incredible educators lacked a dedicated space to connect, grow, and be recognized. We set out to change that.
          </p>
        </div>
      </section>

      {/* ── Mission ── */}
      <section className="py-16 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <span className="inline-block px-3 py-1 bg-violet-500/10 border border-violet-500/20 rounded-full text-violet-400 text-xs font-bold uppercase tracking-widest mb-5">Our Mission</span>
              <h2 className="text-4xl font-extrabold text-white tracking-tight mb-5 leading-tight">
                Empowering every educator in India to reach their fullest potential.
              </h2>
              <p className="text-slate-400 font-medium leading-relaxed mb-6">
                We believe teachers are the backbone of a nation. Yet they're often underserved, isolated, and underappreciated in their professional growth. LDMS changes that by giving every educator a powerful platform to learn, connect, and thrive.
              </p>
              <p className="text-slate-400 font-medium leading-relaxed">
                From a first-year teacher in a small-town school to a veteran principal in a metro — LDMS is built to uplift everyone in the education ecosystem.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { num: '12,400+', label: 'Educators', icon: Users },
                { num: '2,800+', label: 'Schools', icon: BookOpen },
                { num: '48K+', label: 'Resources', icon: GraduationCap },
                { num: '96%', label: 'Satisfaction', icon: Star },
              ].map(stat => (
                <div key={stat.label} className="bg-white/3 border border-white/5 rounded-2xl p-6 text-center hover:bg-white/5 transition-all duration-300">
                  <stat.icon className="w-6 h-6 text-indigo-400 mx-auto mb-3" />
                  <p className="text-3xl font-extrabold text-white mb-1">{stat.num}</p>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Values ── */}
      <section className="py-24 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="inline-block px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-bold uppercase tracking-widest mb-5">What We Stand For</span>
            <h2 className="text-4xl font-extrabold text-white tracking-tight">Our Core Values</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {VALUES.map(v => (
              <div key={v.title} className="group relative bg-white/3 border border-white/5 rounded-2xl p-7 hover:bg-white/5 hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"
                  style={{ background: `radial-gradient(circle at 0% 100%, ${v.glow} 0%, transparent 60%)` }} />
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${v.color} flex items-center justify-center mb-5`}
                  style={{ boxShadow: `0 4px 16px ${v.glow}` }}>
                  <v.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-base font-bold text-white mb-2">{v.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed font-medium">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Timeline ── */}
      <section className="py-24 border-t border-white/5">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="inline-block px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-cyan-400 text-xs font-bold uppercase tracking-widest mb-5">Our Journey</span>
            <h2 className="text-4xl font-extrabold text-white tracking-tight">From Idea to Movement</h2>
          </div>
          <div className="relative">
            <div className="absolute left-[60px] top-0 bottom-0 w-px bg-gradient-to-b from-indigo-500/50 via-violet-500/30 to-transparent" />
            <div className="space-y-8">
              {MILESTONES.map((m, i) => (
                <div key={m.year} className="flex items-start gap-6">
                  <div className="shrink-0 w-[60px] text-right">
                    <span className="text-indigo-400 font-extrabold text-sm">{m.year}</span>
                  </div>
                  <div className="relative shrink-0 mt-0.5">
                    <div className="w-4 h-4 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 border-2 border-[#07070d] shadow-[0_0_12px_rgba(99,102,241,0.6)]" />
                  </div>
                  <div className="bg-white/3 border border-white/5 rounded-xl p-4 flex-1 hover:bg-white/5 transition-all">
                    <p className="text-slate-300 text-sm font-medium leading-relaxed">{m.event}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Team ── */}
      <section className="py-24 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="inline-block px-3 py-1 bg-rose-500/10 border border-rose-500/20 rounded-full text-rose-400 text-xs font-bold uppercase tracking-widest mb-5">The People</span>
            <h2 className="text-4xl font-extrabold text-white tracking-tight">Meet the Team</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {TEAM.map(member => (
              <div key={member.name} className="group bg-white/3 border border-white/5 rounded-2xl p-6 text-center hover:bg-white/5 hover:-translate-y-1 transition-all duration-300">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-black mx-auto mb-4 border-2 border-white/10"
                  style={{ backgroundColor: member.color }}>
                  {member.avatar}
                </div>
                <h3 className="text-base font-bold text-white mb-0.5">{member.name}</h3>
                <p className="text-indigo-400 text-xs font-bold uppercase tracking-wider mb-3">{member.role}</p>
                <p className="text-slate-400 text-xs font-medium leading-relaxed">{member.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 border-t border-white/5">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-extrabold text-white tracking-tight mb-5">Be part of the story</h2>
          <p className="text-slate-400 font-medium mb-8">Join thousands of educators who are shaping the future of education in India.</p>
          <button
            onClick={() => navigate('/login')}
            className="inline-flex items-center gap-2 px-10 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-base rounded-2xl shadow-[0_8px_32px_rgba(99,102,241,0.5)] hover:shadow-[0_16px_48px_rgba(99,102,241,0.6)] hover:from-indigo-500 hover:to-violet-500 transition-all duration-300 hover:-translate-y-0.5"
          >
            Join LDMS Free <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>
    </div>
  )
}
