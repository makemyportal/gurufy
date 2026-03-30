import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '../utils/firebase'
import { BookOpen, GraduationCap, School, Mail, Lock, User, Eye, EyeOff, Sparkles, ArrowLeft, CheckCircle2 } from 'lucide-react'

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
        if (!name.trim()) {
          setError('Please enter your name')
          setLoading(false)
          return
        }
        await signup(email, password, name, role)
      }
      navigate('/')
    } catch (err) {
      setError(
        err.code === 'auth/user-not-found' ? 'No account found with this email' :
        err.code === 'auth/wrong-password' ? 'Incorrect password' :
        err.code === 'auth/email-already-in-use' ? 'Email already registered' :
        err.code === 'auth/weak-password' ? 'Password should be at least 6 characters' :
        err.code === 'auth/invalid-credential' ? 'Invalid email or password' :
        'Something went wrong. Please try again.'
      )
    }
    setLoading(false)
  }

  async function handleGoogle() {
    setError('')
    setLoading(true)
    try {
      await loginWithGoogle(role)
      navigate('/')
    } catch (err) {
      setError('Google sign-in failed. Please try again.')
    }
    setLoading(false)
  }

  async function handleForgotPassword(e) {
    e.preventDefault()
    if (!email.trim()) {
      setError('Please enter your email address first')
      return
    }
    setError('')
    setLoading(true)
    try {
      await sendPasswordResetEmail(auth, email)
      setResetSent(true)
    } catch (err) {
      setError(
        err.code === 'auth/user-not-found' ? 'No account found with this email' :
        'Failed to send reset email. Please try again.'
      )
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-950 relative overflow-hidden font-sans selection:bg-accent-500/30 selection:text-white">
      
      {/* Immersive Dark Aurora Background */}
      <div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[#0a0a0c]" />
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-accent-600/30 blur-[120px] mix-blend-screen animate-pulse-soft" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-primary-600/20 blur-[150px] mix-blend-screen animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[20%] right-[10%] w-[300px] h-[300px] rounded-full bg-emerald-500/20 blur-[100px] mix-blend-screen animate-pulse-soft" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-[20%] left-[20%] w-[400px] h-[400px] rounded-full bg-fuchsia-600/20 blur-[120px] mix-blend-screen animate-float" />
        
        {/* Floating particles */}
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/20 rounded-full animate-float"
            style={{
              left: `${15 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
              animationDelay: `${i * 0.8}s`,
              animationDuration: `${4 + i}s`,
            }}
          />
        ))}
        
        <div className="absolute inset-0 opacity-[0.03] bg-[url('data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMjAwIDIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZmlsdGVyIGlkPSJub2lzZUZpbHRlciI+PGZlVHVyYnVsZW5jZSB0eXBlPSJmcmFjdGFsTm9pc2UiIGJhc2VGcmVxdWVuY3k9IjAuODUiIG51bU9jdGF2ZXM9IjMiIHN0aXRjaFRpbGVzPSJzdGl0Y2giLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWx0ZXI9InVybCgjbm9pc2VGaWx0ZXIpIi8+PC9zdmc+')] mix-blend-overlay" />
      </div>

      <div className="w-full max-w-lg px-4 sm:px-6 relative z-10 animate-fade-in-up">
        
        {/* Floating Glass Card */}
        <div className="bg-surface-900/40 backdrop-blur-[60px] backdrop-saturate-[2] border border-white/10 rounded-[40px] shadow-[0_32px_80px_-16px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.05)] p-8 sm:p-12 relative overflow-hidden">
          
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          {/* Forgot Password View */}
          {showForgotPassword ? (
            <div className="animate-fade-in">
              <button onClick={() => { setShowForgotPassword(false); setResetSent(false); setError('') }} className="flex items-center gap-2 text-surface-400 hover:text-white text-sm font-semibold mb-6 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back to login
              </button>

              {resetSent ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">Check Your Email</h2>
                  <p className="text-surface-400 font-medium">Password reset link has been sent to <strong className="text-white">{email}</strong></p>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-white mb-2">Reset Password</h2>
                  <p className="text-surface-400 font-medium mb-6">Enter your email and we'll send you a reset link</p>
                  
                  {error && (
                    <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm font-semibold flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div className="relative group">
                      <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400 group-focus-within:text-accent-400 transition-colors" />
                      <input
                        type="email"
                        placeholder="Email address"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full pl-14 pr-5 py-4 bg-surface-950/50 border border-white/10 rounded-[20px] text-white font-medium text-[15px] placeholder:text-surface-500 focus:outline-none focus:border-accent-500/50 focus:bg-surface-900/80 focus:ring-4 focus:ring-accent-500/10 transition-all"
                        required
                      />
                    </div>
                    <button type="submit" disabled={loading} className="w-full py-4 bg-gradient-to-r from-accent-600 to-primary-600 text-white font-bold text-[15px] rounded-[20px] hover:from-accent-500 hover:to-primary-500 transition-all duration-300 shadow-[0_8px_32px_-8px_rgba(168,85,247,0.5)] active:scale-[0.98] disabled:opacity-50">
                      {loading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                  </form>
                </>
              )}
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="text-center mb-10">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-[24px] bg-gradient-to-tr from-accent-500 to-primary-500 mb-6 shadow-[0_0_40px_rgba(168,85,247,0.4)] relative overflow-hidden group">
                  <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity" />
                  <BookOpen className="w-8 h-8 text-white drop-shadow-md" />
                </div>
                <h1 className="text-3xl font-extrabold font-display tracking-tight text-white mb-2">
                  {isLogin ? 'Welcome Back' : 'Join Gurufy'}
                </h1>
                <p className="text-surface-400 font-medium">
                  {isLogin ? 'Enter your credentials to access your workspace' : 'Create an account to join the network'}
                </p>
              </div>

              {/* Role Selector (signup only) */}
              {!isLogin && (
                <div className="flex gap-2 p-1.5 bg-surface-950/50 rounded-[20px] mb-8 border border-white/5">
                  <button
                    type="button"
                    onClick={() => setRole('teacher')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[16px] font-bold text-sm transition-all duration-300 ${
                      role === 'teacher'
                        ? 'bg-surface-800 text-white shadow-md border border-white/10'
                        : 'text-surface-500 hover:text-white hover:bg-surface-800/50'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4" /> Teacher
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('school')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[16px] font-bold text-sm transition-all duration-300 ${
                      role === 'school'
                        ? 'bg-surface-800 text-white shadow-md border border-white/10'
                        : 'text-surface-500 hover:text-white hover:bg-surface-800/50'
                    }`}
                  >
                    <School className="w-4 h-4" /> School
                  </button>
                </div>
              )}

              {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm font-semibold flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <div className="relative group">
                    <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400 group-focus-within:text-accent-400 transition-colors" />
                    <input
                      type="text"
                      placeholder={role === 'school' ? 'Institution Name' : 'Full Name'}
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full pl-14 pr-5 py-4 bg-surface-950/50 border border-white/10 rounded-[20px] text-white font-medium text-[15px] placeholder:text-surface-500 focus:outline-none focus:border-accent-500/50 focus:bg-surface-900/80 focus:ring-4 focus:ring-accent-500/10 transition-all"
                      required
                    />
                  </div>
                )}

                <div className="relative group">
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400 group-focus-within:text-accent-400 transition-colors" />
                  <input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-14 pr-5 py-4 bg-surface-950/50 border border-white/10 rounded-[20px] text-white font-medium text-[15px] placeholder:text-surface-500 focus:outline-none focus:border-accent-500/50 focus:bg-surface-900/80 focus:ring-4 focus:ring-accent-500/10 transition-all"
                    required
                  />
                </div>

                <div className="relative group">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400 group-focus-within:text-accent-400 transition-colors" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-14 pr-14 py-4 bg-surface-950/50 border border-white/10 rounded-[20px] text-white font-medium text-[15px] placeholder:text-surface-500 focus:outline-none focus:border-accent-500/50 focus:bg-surface-900/80 focus:ring-4 focus:ring-accent-500/10 transition-all"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-surface-400 hover:text-white transition-colors"
                    tabIndex="-1"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {isLogin && (
                  <div className="text-right">
                    <button type="button" onClick={() => { setShowForgotPassword(true); setError('') }} className="text-sm font-semibold text-accent-400 hover:text-accent-300 transition-colors">
                      Forgot Password?
                    </button>
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full relative overflow-hidden py-4 bg-gradient-to-r from-accent-600 to-primary-600 text-white font-bold text-[15px] tracking-wide rounded-[20px] hover:from-accent-500 hover:to-primary-500 transition-all duration-300 shadow-[0_8px_32px_-8px_rgba(168,85,247,0.5),inset_0_1px_1px_rgba(255,255,255,0.2)] hover:shadow-[0_12px_40px_-8px_rgba(168,85,247,0.6),inset_0_1px_1px_rgba(255,255,255,0.2)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                >
                  {loading ? (
                    <span className="inline-flex items-center justify-center gap-2">
                      <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      {isLogin ? 'Authenticating...' : 'Provisioning Workspace...'}
                    </span>
                  ) : (
                    isLogin ? 'Access Workspace' : 'Create Workspace'
                  )}
                </button>
              </form>

              <div className="my-8 flex items-center gap-4">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent to-white/10" />
                <span className="text-[11px] font-bold text-surface-500 uppercase tracking-widest">or continue with</span>
                <div className="flex-1 h-px bg-gradient-to-l from-transparent to-white/10" />
              </div>

              <button
                onClick={handleGoogle}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-4 bg-white/5 border border-white/10 rounded-[20px] font-bold text-white hover:bg-white/10 hover:border-white/20 transition-all duration-300 active:scale-[0.98]"
              >
                <svg className="w-5 h-5 drop-shadow-sm" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google
              </button>

              <p className="text-center mt-8 text-surface-400 text-[13px] font-medium">
                {isLogin ? "Don't have an account?" : 'Already part of the network?'}
                <button
                  type="button"
                  onClick={() => { setIsLogin(!isLogin); setError('') }}
                  className="ml-2 text-white font-bold hover:text-accent-400 transition-colors"
                >
                  {isLogin ? 'Sign Up' : 'Sign In'}
                </button>
              </p>
            </>
          )}
        </div>

        <p className="text-center mt-8 text-surface-500 text-xs font-semibold tracking-wide">
          Protected by AES-256 Encryption • Enterprise Grade
        </p>

      </div>
    </div>
  )
}
