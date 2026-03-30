import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '../utils/firebase'
import {
  BookOpen, GraduationCap, School, Mail, Lock, User,
  Eye, EyeOff, ArrowLeft, CheckCircle2, ChevronRight,
  Sparkles, Users, Trophy, Briefcase
} from 'lucide-react'

// ─── ALL helper components defined OUTSIDE Login (critical for stable refs) ───

function InputField({ icon: Icon, type, placeholder, value, onChange, children, required, minLength }) {
  return (
    <div className="relative group">
      <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400 group-focus-within:text-indigo-500 transition-colors duration-200 z-10" />
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        minLength={minLength}
        className="w-full pl-11 pr-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium text-sm
                   placeholder:text-slate-400 placeholder:font-normal
                   focus:outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50
                   hover:border-slate-300 hover:bg-white transition-all duration-200"
      />
      {children}
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

function ErrorBox({ msg }) {
  return (
    <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm font-semibold mb-5">
      <svg className="w-4 h-4 shrink-0 mt-0.5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
      </svg>
      {msg}
    </div>
  )
}

const FEATURES = [
  { icon: Users, title: 'Community Network', desc: 'Connect with 10,000+ educators' },
  { icon: Sparkles, title: 'AI Teaching Tools', desc: 'Generate lesson plans instantly' },
  { icon: Briefcase, title: 'Job Marketplace', desc: 'Access exclusive teaching roles' },
  { icon: Trophy, title: 'Gamification', desc: 'Earn XP, badges, and recognition' },
]

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function Login() {
  const [isLogin, setIsLogin] = useState(true)
  const [role, setRole] = useState('teacher')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const { login, signup, loginWithGoogle } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isLogin) {
        await login(email, password)
      } else {
        if (!name.trim()) { setError('Please enter your name'); setLoading(false); return }
        await signup(email, password, name, role)
      }
      navigate('/')
    } catch (err) {
      setError(
        err.code === 'auth/user-not-found' ? 'No account found with this email' :
        err.code === 'auth/wrong-password' ? 'Incorrect password' :
        err.code === 'auth/email-already-in-use' ? 'Email already registered' :
        err.code === 'auth/weak-password' ? 'Password must be at least 6 characters' :
        err.code === 'auth/invalid-credential' ? 'Invalid email or password' :
        'Something went wrong. Please try again.'
      )
    }
    setLoading(false)
  }

  async function handleGoogle() {
    setError('')
    setLoading(true)
    try { await loginWithGoogle(role); navigate('/') }
    catch { setError('Google sign-in failed. Please try again.') }
    setLoading(false)
  }

  async function handleForgotPassword(e) {
    e.preventDefault()
    if (!email.trim()) { setError('Please enter your email first'); return }
    setError('')
    setLoading(true)
    try { await sendPasswordResetEmail(auth, email); setResetSent(true) }
    catch (err) { setError(err.code === 'auth/user-not-found' ? 'No account found' : 'Failed to send reset email') }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex bg-white">

      {/* ─── LEFT PANEL (Brand) ─── */}
      <div className="hidden lg:flex lg:w-[52%] bg-[#0f0f14] relative overflow-hidden flex-col">

        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />

        {/* Glows */}
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-violet-600/15 rounded-full blur-[80px]" />
        <div className="absolute top-[45%] right-[5%] w-[250px] h-[250px] bg-cyan-500/10 rounded-full blur-[60px]" />

        <div className="relative z-10 flex flex-col h-full p-12 xl:p-16">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.5)]">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-extrabold text-xl tracking-tight">LDMS</span>
            <span className="ml-1 px-2 py-0.5 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[10px] font-bold uppercase tracking-widest rounded-full">Pro</span>
          </div>

          {/* Main content */}
          <div className="my-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-indigo-300 text-xs font-bold uppercase tracking-widest">Educator's Professional Network</span>
            </div>

            <h1 className="text-4xl xl:text-5xl font-extrabold text-white leading-tight tracking-tight mb-6">
              Where Great<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400">
                Teachers
              </span>{' '}Connect.
            </h1>

            <p className="text-slate-400 text-base leading-relaxed mb-12 max-w-sm font-medium">
              The all-in-one platform built for India's educators. Share knowledge, find opportunities, and grow professionally.
            </p>

            <div className="space-y-4">
              {FEATURES.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-center gap-4 group">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:bg-indigo-500/10 group-hover:border-indigo-500/20 transition-all duration-300">
                    <Icon className="w-5 h-5 text-slate-400 group-hover:text-indigo-400 transition-colors duration-300" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">{title}</p>
                    <p className="text-slate-500 text-xs font-medium">{desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-700 ml-auto group-hover:text-slate-500 transition-colors" />
                </div>
              ))}
            </div>

            {/* Social proof */}
            <div className="flex items-center gap-4 mt-12 pt-8 border-t border-white/5">
              <div className="flex -space-x-2">
                {['#6366f1','#8b5cf6','#06b6d4','#10b981'].map((c, i) => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-[#0f0f14] flex items-center justify-center text-white text-[10px] font-black" style={{ backgroundColor: c }}>
                    {['R', 'S', 'A', 'M'][i]}
                  </div>
                ))}
              </div>
              <div>
                <p className="text-white font-bold text-sm">12,400+ educators</p>
                <p className="text-slate-500 text-xs font-medium">already on the platform</p>
              </div>
            </div>
          </div>

          <p className="text-slate-600 text-xs font-medium">© 2025 LDMS. All rights reserved.</p>
        </div>
      </div>

      {/* ─── RIGHT PANEL (Form) ─── */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 sm:px-12 xl:px-20 bg-white overflow-y-auto">

        {/* Mobile logo */}
        <div className="flex items-center gap-2 mb-10 lg:hidden">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <span className="font-extrabold text-slate-900 text-lg tracking-tight">LDMS</span>
        </div>

        <div className="w-full max-w-[400px] mx-auto">

          {/* ── FORGOT PASSWORD ── */}
          {showForgotPassword ? (
            <div>
              <button
                onClick={() => { setShowForgotPassword(false); setResetSent(false); setError('') }}
                className="flex items-center gap-2 text-slate-500 hover:text-slate-800 text-sm font-semibold mb-8 transition-colors group"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> Back to sign in
              </button>

              {resetSent ? (
                <div className="text-center py-12">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-5">
                    <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                  </div>
                  <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Email sent!</h2>
                  <p className="text-slate-500 text-sm font-medium">Reset link sent to <span className="font-bold text-slate-800">{email}</span>. Check your inbox.</p>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-extrabold text-slate-900 mb-1">Forgot password?</h2>
                  <p className="text-slate-500 text-sm font-medium mb-8">No worries. Enter your email to get a reset link.</p>

                  {error && <ErrorBox msg={error} />}

                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <InputField
                      icon={Mail} type="email" placeholder="Email address"
                      value={email} onChange={e => setEmail(e.target.value)} required
                    />
                    <button type="submit" disabled={loading}
                      className="w-full py-3.5 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-black transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-slate-900/10">
                      {loading ? 'Sending...' : 'Send reset link'}
                    </button>
                  </form>
                </>
              )}
            </div>

          ) : (
            <>
              {/* Heading */}
              <div className="mb-8">
                <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-1">
                  {isLogin ? 'Welcome back' : 'Create account'}
                </h2>
                <p className="text-slate-500 text-sm font-medium">
                  {isLogin ? 'Sign in to access your workspace' : 'Join the professional network for educators'}
                </p>
              </div>

              {/* Google Button */}
              <button onClick={handleGoogle} disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-3.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 active:scale-[0.98] shadow-sm mb-6">
                <GoogleIcon />
                Continue with Google
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 mb-6">
                <div className="flex-1 h-px bg-slate-100" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">or</span>
                <div className="flex-1 h-px bg-slate-100" />
              </div>

              {error && <ErrorBox msg={error} />}

              {/* Role Selector (signup only) */}
              {!isLogin && (
                <div className="grid grid-cols-2 gap-2 mb-6">
                  {[
                    { key: 'teacher', label: 'Teacher', icon: GraduationCap },
                    { key: 'school', label: 'School', icon: School }
                  ].map(r => (
                    <button key={r.key} type="button" onClick={() => setRole(r.key)}
                      className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-bold transition-all duration-200 active:scale-[0.97] ${
                        role === r.key
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-sm'
                          : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
                      }`}>
                      <r.icon className="w-4 h-4" /> {r.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <InputField
                    icon={User} type="text"
                    placeholder={role === 'school' ? 'Institution name' : 'Full name'}
                    value={name} onChange={e => setName(e.target.value)} required
                  />
                )}
                <InputField
                  icon={Mail} type="email" placeholder="Email address"
                  value={email} onChange={e => setEmail(e.target.value)} required
                />
                <InputField
                  icon={Lock}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                >
                  <button type="button" tabIndex="-1" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors z-10">
                    {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                  </button>
                </InputField>

                {isLogin && (
                  <div className="flex justify-end">
                    <button type="button" onClick={() => { setShowForgotPassword(true); setError('') }}
                      className="text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
                      Forgot password?
                    </button>
                  </div>
                )}

                <button type="submit" disabled={loading}
                  className="w-full py-3.5 mt-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-sm rounded-xl
                             hover:from-indigo-500 hover:to-violet-500 transition-all duration-300
                             shadow-[0_8px_20px_-6px_rgba(99,102,241,0.5)] hover:shadow-[0_12px_28px_-6px_rgba(99,102,241,0.6)]
                             active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      {isLogin ? 'Signing in...' : 'Creating account...'}
                    </span>
                  ) : (
                    isLogin ? 'Sign in' : 'Create account'
                  )}
                </button>
              </form>

              {/* Toggle */}
              <p className="text-center mt-6 text-slate-500 text-sm font-medium">
                {isLogin ? "Don't have an account? " : 'Already have an account? '}
                <button type="button" onClick={() => { setIsLogin(!isLogin); setError('') }}
                  className="font-extrabold text-indigo-600 hover:text-indigo-800 transition-colors">
                  {isLogin ? 'Sign up' : 'Sign in'}
                </button>
              </p>

              {/* Trust badges */}
              <div className="flex items-center justify-center gap-4 mt-10 pt-8 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  <span className="text-[11px] font-bold uppercase tracking-wider">SSL Secured</span>
                </div>
                <div className="w-1 h-1 rounded-full bg-slate-200" />
                <div className="flex items-center gap-1.5 text-slate-400">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
                  <span className="text-[11px] font-bold uppercase tracking-wider">24/7 Support</span>
                </div>
                <div className="w-1 h-1 rounded-full bg-slate-200" />
                <div className="flex items-center gap-1.5 text-slate-400">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  <span className="text-[11px] font-bold uppercase tracking-wider">Free Forever</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
