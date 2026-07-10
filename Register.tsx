import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createUserWithEmailAndPassword, updateProfile, signInWithPopup } from 'firebase/auth'
import { Eye, EyeOff, CheckCircle } from 'lucide-react'
import { auth, googleProvider } from './firebase'
import { ensureUserDoc, updateUserProfile } from './firestore'
import { Spinner } from './Spinner'
import { Logo } from './Logo'

export function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', country: '', password: '', confirm: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!form.name || form.name.length < 2) errs.name = 'Name must be at least 2 characters'
    if (!form.email || !/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Enter a valid email'
    if (!form.country) errs.country = 'Country is required'
    if (!form.password || form.password.length < 8) errs.password = 'Password must be at least 8 characters'
    if (form.password !== form.confirm) errs.confirm = 'Passwords do not match'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSubmitError('')
    setLoading(true)
    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password)
      await updateProfile(cred.user, { displayName: form.name })
      await ensureUserDoc(cred.user)
      await updateUserProfile(cred.user.uid, {
        uid: cred.user.uid,
        name: form.name,
        email: form.email,
        country: form.country,
        photoURL: '',
        role: 'user',
        createdAt: null,
      })
      navigate('/dashboard')
    } catch (err: unknown) {
      const code = (err as { code?: string }).code || ''
      setSubmitError(code === 'auth/email-already-in-use' ? 'Email already in use' : 'Registration failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setSubmitError('')
    setGoogleLoading(true)
    try {
      const result = await signInWithPopup(auth, googleProvider)
      await ensureUserDoc(result.user)
      navigate('/dashboard')
    } catch {
      setSubmitError('Google sign-in failed. Try again.')
    } finally {
      setGoogleLoading(false)
    }
  }

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value }),
  })

  return (
    <div className="min-h-screen flex bg-[#F8F9FC]">
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
            Start your trading journey. Create a free account in seconds.
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

      <div className="flex-1 flex flex-col items-center justify-center px-8 py-10">
        <div className="max-w-[380px] w-full">
          <h2 className="text-2xl font-medium tracking-tight text-gray-950 mb-1">Create account</h2>
          <p className="text-gray-500 text-sm mb-8">Join Tesla Stock Investment</p>

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
            {[
              { key: 'name', label: 'Full name', type: 'text', placeholder: 'John Doe' },
              { key: 'email', label: 'Email address', type: 'email', placeholder: 'you@example.com' },
              { key: 'country', label: 'Country', type: 'text', placeholder: 'United States' },
            ].map(({ key, label, type, placeholder }) => (
              <div key={key}>
                <label className="text-xs text-gray-500 mb-1.5 block">{label}</label>
                <input
                  type={type}
                  placeholder={placeholder}
                  {...field(key as keyof typeof form)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 text-gray-900"
                />
                {errors[key] && <p className="text-loss text-xs mt-1">{errors[key]}</p>}
              </div>
            ))}

            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="Min. 8 characters"
                  {...field('password')}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 pr-10 text-sm bg-white focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 text-gray-900"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-loss text-xs mt-1">{errors.password}</p>}
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Confirm password</label>
              <input
                type="password"
                placeholder="Repeat password"
                {...field('confirm')}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 text-gray-900"
              />
              {errors.confirm && <p className="text-loss text-xs mt-1">{errors.confirm}</p>}
            </div>

            {submitError && <p className="text-loss text-xs">{submitError}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 mt-2 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading && <Spinner size={16} />}
              Create account
            </button>
          </form>

          <p className="text-sm text-gray-500 mt-6 text-center">
            Already have an account?{' '}
            <Link to="/login" className="text-accent hover:underline">Sign in →</Link>
          </p>
        </div>
      </div>
    </div>
  )
}





