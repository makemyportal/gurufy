import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom'
import { GraduationCap, Menu, X, ChevronRight, Twitter, Linkedin, Instagram, Youtube, Mail, Phone, MapPin } from 'lucide-react'
import AIChatWidget from './AIChatWidget'

const NAV_LINKS = [
  { to: '/about', label: 'About Us' },
  { to: '/how-it-works', label: 'How It Works' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/blog', label: 'Blog' },
  { to: '/contact', label: 'Contact' },
]

const FOOTER_LINKS = {
  Product: [
    { to: '/how-it-works', label: 'How It Works' },
    { to: '/pricing', label: 'Pricing' },
    { to: '/blog', label: 'Blog' },
  ],
  Company: [
    { to: '/about', label: 'About Us' },
    { to: '/contact', label: 'Contact' },
  ],
  Legal: [
    { to: '/privacy', label: 'Privacy Policy' },
    { to: '/terms', label: 'Terms of Service' },
  ],
}

export default function PublicLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="min-h-screen bg-[#07070d] text-white font-sans overflow-x-hidden">

      {/* ── Navbar ── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'bg-[#07070d]/90 backdrop-blur-xl border-b border-white/5 shadow-2xl shadow-black/50'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[70px] flex items-center justify-between">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden shadow-[0_0_20px_rgba(99,102,241,0.4)] group-hover:shadow-[0_0_30px_rgba(99,102,241,0.6)] transition-all duration-300">
              <img src="/logo.png" alt="LDMS Logo" className="w-[120%] h-[120%] object-contain mix-blend-multiply" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-white">LDMS</span>
            <span className="hidden sm:inline-flex px-2 py-0.5 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[10px] font-bold uppercase tracking-widest rounded-full">Pro</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? 'text-white bg-white/10'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* CTA Buttons */}
          <div className="hidden lg:flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-300 hover:text-white hover:bg-white/5 transition-all duration-200"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate('/login')}
              className="px-5 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-500 hover:to-violet-500 shadow-[0_4px_20px_rgba(99,102,241,0.4)] hover:shadow-[0_8px_30px_rgba(99,102,241,0.5)] transition-all duration-300 -translate-y-0 hover:-translate-y-0.5"
            >
              Get Started Free
            </button>
          </div>

          {/* Hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="lg:hidden bg-[#0d0d1a]/98 backdrop-blur-xl border-t border-white/5 animate-slide-down">
            <div className="max-w-7xl mx-auto px-4 py-4 space-y-1">
              {NAV_LINKS.map(link => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                      isActive ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`
                  }
                >
                  {link.label}
                  <ChevronRight className="w-4 h-4 opacity-40" />
                </NavLink>
              ))}
              <div className="pt-3 pb-1 grid grid-cols-2 gap-2">
                <button onClick={() => { navigate('/login'); setMobileOpen(false) }}
                  className="py-3 rounded-xl text-sm font-bold border border-white/10 text-slate-300 hover:border-white/20 hover:text-white transition-all">
                  Sign In
                </button>
                <button onClick={() => { navigate('/login'); setMobileOpen(false) }}
                  className="py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-indigo-600 to-violet-600 text-white">
                  Get Started
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ── Page Content ── */}
      <main>
        <Outlet />
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 bg-[#05050a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 text-center lg:text-left">

            {/* Brand Column */}
            <div className="lg:col-span-2 flex flex-col items-center lg:items-start">
              <Link to="/" className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden">
                  <img src="/logo.png" alt="LDMS Logo" className="w-[120%] h-[120%] object-contain mix-blend-multiply" />
                </div>
                <span className="text-xl font-extrabold tracking-tight">LDMS</span>
              </Link>
              <p className="text-slate-400 text-sm leading-relaxed max-w-xs mb-6 mx-auto lg:mx-0">
                India's smartest professional network for educators. Connect, grow, and thrive together.
              </p>
              {/* Social */}
              <div className="flex items-center justify-center lg:justify-start gap-3">
                {[Twitter, Linkedin, Instagram, Youtube].map((Icon, i) => (
                  <a key={i} href="#" className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all duration-200">
                    <Icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>

            {/* Link Columns */}
            {Object.entries(FOOTER_LINKS).map(([category, links]) => (
              <div key={category}>
                <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest mb-4">{category}</h4>
                <ul className="space-y-2.5">
                  {links.map(link => (
                    <li key={link.to}>
                      <Link
                        to={link.to}
                        className="text-sm font-medium text-slate-400 hover:text-white transition-colors duration-200"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom Bar */}
          <div className="mt-12 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <p className="text-slate-600 text-xs font-medium">© 2025 LDMS Technologies Pvt. Ltd. All rights reserved.</p>
            <div className="flex items-center justify-center gap-2 text-slate-600 text-xs font-medium">
              <MapPin className="w-3.5 h-3.5" />
              Made with ❤️ in India
            </div>
          </div>
        </div>
      </footer>

      <AIChatWidget />
    </div>
  )
}
