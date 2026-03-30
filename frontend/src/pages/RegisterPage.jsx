import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../lib/authStore'
import { errorMessage } from '../lib/utils'
import toast from 'react-hot-toast'
import { Eye, EyeOff, ArrowRight, Check } from 'lucide-react'

export default function RegisterPage() {
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', password: '', phone: ''
  })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const { register } = useAuthStore()
  const navigate = useNavigate()

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    try {
      await register(form)
      toast.success('Account created! Please verify your email.')
      navigate('/dashboard')
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const benefits = [
    'Monthly prize draws with jackpots',
    'Support your chosen charity automatically',
    'Track your Stableford scores',
    'Cancel anytime',
  ]

  return (
    <div className="min-h-screen flex items-center justify-center pt-16 px-4 hero-gradient py-12">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
        {/* Left: Benefits */}
        <div className="hidden lg:block pt-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-10">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
              <span className="text-ink font-display font-800 text-sm">G</span>
            </div>
            <span className="font-display font-700 text-white text-lg">GolfGive</span>
          </Link>
          <h2 className="font-display font-800 text-4xl text-white leading-tight mb-6">
            Play Golf.<br /><span className="text-brand-400">Make Impact.</span>
          </h2>
          <p className="text-ghost leading-relaxed mb-10">
            Join thousands of golfers who play, win, and give back — all through one simple subscription.
          </p>
          <ul className="space-y-4">
            {benefits.map((b) => (
              <li key={b} className="flex items-center gap-3 text-sm text-ghost">
                <div className="w-5 h-5 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center flex-shrink-0">
                  <Check size={11} className="text-brand-400" />
                </div>
                {b}
              </li>
            ))}
          </ul>
        </div>

        {/* Right: Form */}
        <div>
          <div className="text-center lg:text-left mb-8">
            <Link to="/" className="lg:hidden inline-flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
                <span className="text-ink font-display font-800 text-sm">G</span>
              </div>
              <span className="font-display font-700 text-white text-lg">GolfGive</span>
            </Link>
            <h1 className="font-display font-800 text-3xl text-white mb-2">Create your account</h1>
            <p className="text-ghost text-sm">Start your journey today</p>
          </div>

          <div className="card p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">First Name</label>
                  <input type="text" required className="input" placeholder="John" value={form.first_name} onChange={set('first_name')} />
                </div>
                <div>
                  <label className="label">Last Name</label>
                  <input type="text" required className="input" placeholder="Smith" value={form.last_name} onChange={set('last_name')} />
                </div>
              </div>

              <div>
                <label className="label">Email address</label>
                <input type="email" required className="input" placeholder="you@example.com" value={form.email} onChange={set('email')} />
              </div>

              <div>
                <label className="label">Phone (optional)</label>
                <input type="tel" className="input" placeholder="+44 7700 000000" value={form.phone} onChange={set('phone')} />
              </div>

              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    required
                    className="input pr-11"
                    placeholder="Min. 8 characters"
                    value={form.password}
                    onChange={set('password')}
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ghost transition-colors">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-sm mt-2">
                {loading ? 'Creating account…' : 'Create Account'}
                {!loading && <ArrowRight size={16} />}
              </button>
            </form>

            <p className="text-center text-sm text-ghost mt-6">
              Already have an account?{' '}
              <Link to="/login" className="text-brand-400 hover:text-brand-300 transition-colors font-display font-600">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
