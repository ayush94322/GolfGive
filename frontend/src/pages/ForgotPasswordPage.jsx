import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authAPI } from '../lib/api'
import { errorMessage } from '../lib/utils'
import toast from 'react-hot-toast'
import { ArrowLeft, Mail } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authAPI.forgotPassword(email)
      setSent(true)
      toast.success('Reset email sent!')
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center pt-16 px-4 hero-gradient">
      <div className="w-full max-w-md">
        <Link to="/login" className="inline-flex items-center gap-2 text-sm text-ghost hover:text-white mb-8 transition-colors">
          <ArrowLeft size={15} />
          Back to sign in
        </Link>

        <div className="card p-8">
          <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mb-6">
            <Mail size={22} className="text-brand-400" />
          </div>

          <h1 className="font-display font-800 text-white text-2xl mb-2">Forgot password?</h1>
          <p className="text-ghost text-sm mb-7">
            Enter your email and we'll send you a link to reset your password.
          </p>

          {sent ? (
            <div className="bg-brand-500/10 border border-brand-500/20 rounded-xl p-4">
              <p className="text-sm text-brand-300">
                If an account exists for <strong>{email}</strong>, you'll receive a reset link shortly.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Email address</label>
                <input
                  type="email"
                  required
                  className="input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-sm">
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
