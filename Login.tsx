import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth'
import { Eye, EyeOff, CheckCircle } from 'lucide-react'
import { auth, googleProvider } from './firebase'
import { ensureUserDoc } from './firestore'
import { Spinner } from './Spinner'
import { Logo } from './Logo'

function mapFirebaseError(code: string): string {
  const map: Record<string, string> = {
    'auth/wrong-password': 'Incorrect password',
    'auth/user-not-found': 'No account with that email',
    'auth/invalid-email': 'Invalid email address',
    'auth/too-many-requests': 'Too many attempts. Try again later.',
    'auth/invalid-credential': 'Invalid email or password',
  }
  return map[code] || 'Something went wrong. Please try again.'
}

export function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      navigate('/dashboard')
    } catch (err: unknown) {
      const code = (err as { code?: string }).code || ''
      setError(mapFirebaseError(code))
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setError('')
    setGoogleLoading(true)
    try {
      const result = await signInWithPopup(auth, googleProvider)
      await ensureUserDoc(result.user)
      navigate('/dashboard')
    } catch (err: unknown) {
      const code = (err as { code?: string }).code || ''
      setError(mapFirebaseError(code))
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-[#F8F9FC]">
      {/* Left panel */}
      <div
        className="hidden md:flex flex-1 flex-col items-center justify-center relative overflow-hidden"
        style={{ background: '#080c18' }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 60% 40%, rgba(59,123,255,0.25) 0%, transparent 70%)' }}
        />
        <div className="absolute w-64 h-64 rounded-full bg-accent/10 blur-3xl top-1/4 left-1/4 pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center text-center">
          <Logo size="lg" />
          <p className="text-white/50 text-sm mt-3 max-w-[220px] leading-relaxed">
            Practice trading with live market data. No risk, real experience.
          </p>
          <div className="mt-10 space-y-3 text-left">
            {['Real-time Firestore prices', 'Secure Firebase Auth', 'Instant order execution'].map((t) => (
              <div key={t} className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-accent flex-shrink-0" />
                <span className="text-white/60 text-xs">{t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <div className="max-w-[380px] w-full">
          <h2 className="text-2xl font-medium tracking-tight text-gray-950 mb-1">Welcome back</h2>
          <p className="text-gray-500 text-sm mb-8">Sign in to your account</p>

          {/* Google */}
          <button
            onClick={handleGoogle}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-2.5 border border-gray-200 rounded-full py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition mb-5 disabled:opacity-60"
          >
            {googleLoading ? (
              <Spinner size={16} className="text-gray-400" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
                <path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
            )}
            Continue with Google
          </button>

          <div className="relative my-5 flex items-center">
            <div className="flex-1 border-t border-gray-200" />
            <span className="mx-3 text-xs text-gray-400">or</span>
            <div className="flex-1 border-t border-gray-200" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 text-gray-900"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 pr-10 text-sm bg-white focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 text-gray-900"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && <p className="text-loss text-xs">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 mt-4 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading && <Spinner size={16} />}
              Sign in
            </button>
          </form>

          <p className="text-sm text-gray-500 mt-6 text-center">
            Don't have an account?{' '}
            <Link to="/register" className="text-accent hover:underline">Create one →</Link>
          </p>
        </div>
      </div>
    </div>
  )
}





