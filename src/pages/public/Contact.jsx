import { useState } from 'react'
import { Mail, Phone, MapPin, Send, Twitter, Linkedin, Instagram, CheckCircle, MessageSquare } from 'lucide-react'

const CONTACT_METHODS = [
  {
    icon: Mail,
    color: 'from-indigo-500 to-violet-600',
    glow: 'rgba(99,102,241,0.3)',
    title: 'Email Us',
    value: 'hello@ldms.in',
    desc: 'We reply within 24 hours',
    href: 'mailto:hello@ldms.in',
  },
  {
    icon: MessageSquare,
    color: 'from-emerald-500 to-teal-600',
    glow: 'rgba(16,185,129,0.3)',
    title: 'Live Chat',
    value: 'Start a conversation',
    desc: 'Available Mon-Fri 9am-6pm IST',
    href: '#',
  },
  {
    icon: Phone,
    color: 'from-cyan-500 to-blue-600',
    glow: 'rgba(6,182,212,0.3)',
    title: 'Call Us',
    value: '+91 80 1234 5678',
    desc: 'Mon-Fri, 9am-6pm IST',
    href: 'tel:+918012345678',
  },
  {
    icon: MapPin,
    color: 'from-rose-500 to-pink-600',
    glow: 'rgba(244,63,94,0.3)',
    title: 'Office',
    value: 'Bangalore, Karnataka',
    desc: 'India 560001',
    href: '#',
  },
]

const SOCIALS = [
  { icon: Twitter, label: 'Twitter', href: '#', color: 'hover:text-sky-400' },
  { icon: Linkedin, label: 'LinkedIn', href: '#', color: 'hover:text-blue-400' },
  { icon: Instagram, label: 'Instagram', href: '#', color: 'hover:text-pink-400' },
]

const DEPARTMENTS = [
  'General Inquiry',
  'Technical Support',
  'Billing & Payments',
  'Partnership & Schools',
  'Press & Media',
  'Feature Request',
]

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', department: '', message: '' })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    await new Promise(r => setTimeout(r, 1200))
    setSubmitted(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#07070d] pt-[70px]">

      {/* ── Hero ── */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/3 w-[500px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 right-1/3 w-[400px] h-[300px] bg-violet-600/8 rounded-full blur-[80px]" />
        </div>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <span className="inline-block px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-xs font-bold uppercase tracking-widest mb-6">Get in Touch</span>
          <h1 className="text-5xl sm:text-6xl font-extrabold text-white tracking-tight mb-6 leading-tight">
            We'd love to<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">hear from you</span>
          </h1>
          <p className="text-lg text-slate-400 font-medium leading-relaxed max-w-xl mx-auto">
            Have a question, feedback, or just want to say hello? Our team is always happy to help.
          </p>
        </div>
      </section>

      {/* ── Contact Methods ── */}
      <section className="pb-16 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {CONTACT_METHODS.map(method => (
              <a
                key={method.title}
                href={method.href}
                className="group bg-white/3 border border-white/5 rounded-2xl p-6 hover:bg-white/5 hover:-translate-y-1 transition-all duration-300 block"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${method.color} flex items-center justify-center mb-5`}
                  style={{ boxShadow: `0 4px 16px ${method.glow}` }}>
                  <method.icon className="w-6 h-6 text-white" />
                </div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{method.title}</p>
                <p className="text-white font-bold text-sm mb-1 group-hover:text-indigo-300 transition-colors">{method.value}</p>
                <p className="text-slate-500 text-xs font-medium">{method.desc}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── Form + Info ── */}
      <section className="py-16 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">

            {/* Form */}
            <div className="bg-white/3 border border-white/5 rounded-2xl p-7 sm:p-10">
              {submitted ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-5">
                    <CheckCircle className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h3 className="text-2xl font-extrabold text-white mb-2">Message Sent!</h3>
                  <p className="text-slate-400 font-medium">Thanks for reaching out. We'll get back to you within 24 hours at <span className="text-white font-bold">{form.email}</span>.</p>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-extrabold text-white mb-1">Send us a message</h2>
                  <p className="text-slate-400 text-sm font-medium mb-7">We'll get back to you within 24 hours.</p>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Full Name</label>
                        <input
                          name="name"
                          value={form.name}
                          onChange={handleChange}
                          required
                          placeholder="Your name"
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-medium placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 focus:bg-white/8 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
                        <input
                          name="email"
                          type="email"
                          value={form.email}
                          onChange={handleChange}
                          required
                          placeholder="you@example.com"
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-medium placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 focus:bg-white/8 transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Department</label>
                      <select
                        name="department"
                        value={form.department}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-medium focus:outline-none focus:border-indigo-500/50 focus:bg-white/8 transition-all appearance-none"
                      >
                        <option value="" className="bg-[#1a1a2e]">Select a topic...</option>
                        {DEPARTMENTS.map(d => (
                          <option key={d} value={d} className="bg-[#1a1a2e]">{d}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Message</label>
                      <textarea
                        name="message"
                        value={form.message}
                        onChange={handleChange}
                        required
                        rows={5}
                        placeholder="Tell us how we can help you..."
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-medium placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 focus:bg-white/8 transition-all resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-sm rounded-xl shadow-[0_4px_20px_rgba(99,102,241,0.4)] hover:from-indigo-500 hover:to-violet-500 transition-all duration-300 disabled:opacity-60"
                    >
                      {loading ? (
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      {loading ? 'Sending...' : 'Send Message'}
                    </button>
                  </form>
                </>
              )}
            </div>

            {/* Right Info */}
            <div className="space-y-6">
              <div className="bg-white/3 border border-white/5 rounded-2xl p-7">
                <h3 className="text-lg font-extrabold text-white mb-4">Follow LDMS</h3>
                <div className="flex items-center gap-3">
                  {SOCIALS.map(social => (
                    <a
                      key={social.label}
                      href={social.href}
                      className={`w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 ${social.color} hover:bg-white/10 hover:border-white/20 transition-all duration-200`}
                    >
                      <social.icon className="w-5 h-5" />
                    </a>
                  ))}
                </div>
                <p className="text-slate-500 text-xs font-medium mt-4">Stay updated with the latest from LDMS — tips, features, and educator stories.</p>
              </div>

              <div className="bg-gradient-to-br from-indigo-600/10 to-violet-600/10 border border-indigo-500/20 rounded-2xl p-7">
                <h3 className="text-lg font-extrabold text-white mb-2">Partner with Us</h3>
                <p className="text-slate-400 text-sm font-medium leading-relaxed mb-4">
                  Are you an EdTech company, publishing house, or education NGO? Let's build something great together.
                </p>
                <a href="mailto:partners@ldms.in" className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 font-bold text-sm transition-colors">
                  partners@ldms.in →
                </a>
              </div>

              <div className="bg-white/3 border border-white/5 rounded-2xl p-7">
                <h3 className="text-lg font-extrabold text-white mb-2">Press & Media</h3>
                <p className="text-slate-400 text-sm font-medium leading-relaxed mb-4">
                  For media inquiries, interviews, or press kit requests, reach out to our communications team.
                </p>
                <a href="mailto:press@ldms.in" className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 font-bold text-sm transition-colors">
                  press@ldms.in →
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
