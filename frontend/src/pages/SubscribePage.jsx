import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { subscriptionAPI, charityAPI } from '../lib/api'
import { useAuthStore } from '../lib/authStore'
import { errorMessage, formatCurrency } from '../lib/utils'
import { Spinner } from '../components/ui'
import toast from 'react-hot-toast'
import { Check, ArrowRight, Heart, Shield, Trophy, Star } from 'lucide-react'

const PLANS = [
  {
    id: 'monthly',
    label: 'Monthly',
    price: '£9.99',
    period: '/month',
    description: 'Full access, month-to-month',
    badge: null,
  },
  {
    id: 'yearly',
    label: 'Yearly',
    price: '£89.99',
    period: '/year',
    description: 'Save ~25% — best value',
    badge: 'Best Value',
  },
]

const FEATURES = [
  { icon: Trophy, text: 'Monthly prize draw entry' },
  { icon: Star, text: 'Stableford score tracking (5 scores)' },
  { icon: Heart, text: 'Automatic charity contributions' },
  { icon: Shield, text: 'Secure Stripe payments' },
]

export default function SubscribePage() {
  const { isAuthenticated } = useAuthStore()
  const navigate = useNavigate()
  const [plan, setPlan] = useState('monthly')
  const [charities, setCharities] = useState([])
  const [charityId, setCharityId] = useState('')
  const [charityPct, setCharityPct] = useState(10)
  const [loading, setLoading] = useState(false)
  const [charitiesLoading, setCharitiesLoading] = useState(true)

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login'); return }
    charityAPI.list()
      .then(r => setCharities(r.data.data?.charities || []))
      .catch(() => {})
      .finally(() => setCharitiesLoading(false))
  }, [isAuthenticated])

  const handleSubscribe = async () => {
    if (!charityId) { toast.error('Please select a charity'); return }
    setLoading(true)
    try {
      const r = await subscriptionAPI.createCheckout({
        plan,
        charity_id: charityId,
        charity_percentage: parseFloat(charityPct),
      })
      const url = r.data.data?.url
      if (url) {
        window.location.href = url
      } else {
        toast.success('Subscription created!')
        navigate('/dashboard')
      }
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  if (charitiesLoading) return <div className="pt-28"><Spinner /></div>

  return (
    <div className="min-h-screen pt-28 pb-20 hero-gradient">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <p className="text-xs text-brand-400 font-display font-700 uppercase tracking-widest mb-3">Join GolfGive</p>
          <h1 className="font-display font-800 text-4xl sm:text-5xl text-white mb-4">Choose Your Plan</h1>
          <p className="text-ghost max-w-md mx-auto">Play, win prizes, and support charity — all in one subscription.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Plan selector + charity */}
          <div className="lg:col-span-2 space-y-6">
            {/* Plans */}
            <div>
              <p className="label mb-4">Select Plan</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {PLANS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPlan(p.id)}
                    className={`relative p-6 rounded-2xl border-2 text-left transition-all ${
                      plan === p.id
                        ? 'border-brand-500 bg-brand-500/10'
                        : 'border-border bg-card hover:border-brand-500/40'
                    }`}
                  >
                    {p.badge && (
                      <span className="absolute top-3 right-3 badge-gold">{p.badge}</span>
                    )}
                    {plan === p.id && (
                      <div className="absolute top-3 left-3 w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center">
                        <Check size={11} className="text-ink" />
                      </div>
                    )}
                    <p className="font-display font-700 text-white text-lg mt-1">{p.label}</p>
                    <p className="mt-2">
                      <span className="font-display font-800 text-2xl text-white">{p.price}</span>
                      <span className="text-sm text-muted">{p.period}</span>
                    </p>
                    <p className="text-xs text-ghost mt-1">{p.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Charity */}
            <div className="card p-6">
              <h3 className="font-display font-700 text-white mb-5">Choose Your Charity</h3>
              <div className="space-y-4">
                <div>
                  <label className="label">Charity</label>
                  <select className="input" value={charityId} onChange={e => setCharityId(e.target.value)}>
                    <option value="">-- Select a charity --</option>
                    {charities.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Charity Contribution: {charityPct}% (min. 10%)</label>
                  <input
                    type="range" min="10" max="100" step="5"
                    className="w-full accent-green-500"
                    value={charityPct}
                    onChange={e => setCharityPct(e.target.value)}
                  />
                  <div className="flex justify-between text-xs text-muted mt-1">
                    <span>10% minimum</span><span>100%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Summary */}
          <div className="space-y-4">
            <div className="card p-6">
              <h3 className="font-display font-700 text-white mb-5">Summary</h3>
              <div className="space-y-3 mb-5">
                <div className="flex justify-between text-sm">
                  <span className="text-ghost">Plan</span>
                  <span className="text-white font-display font-600 capitalize">{plan}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-ghost">Amount</span>
                  <span className="text-white font-display font-600">{plan === 'monthly' ? '£9.99/mo' : '£89.99/yr'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-ghost">Charity %</span>
                  <span className="text-brand-400 font-display font-600">{charityPct}%</span>
                </div>
                <div className="border-t border-border pt-3 flex justify-between text-sm">
                  <span className="text-ghost">Charity per {plan === 'monthly' ? 'month' : 'year'}</span>
                  <span className="text-brand-400 font-display font-700">
                    {formatCurrency(((plan === 'monthly' ? 9.99 : 89.99) * charityPct) / 100)}
                  </span>
                </div>
              </div>

              <button
                onClick={handleSubscribe}
                disabled={loading || !charityId}
                className="btn-primary w-full justify-center py-3 text-sm"
              >
                {loading ? 'Processing…' : 'Subscribe with Stripe'}
                {!loading && <ArrowRight size={16} />}
              </button>

              <p className="text-xs text-center text-muted mt-3 flex items-center justify-center gap-1">
                <Shield size={11} />
                Secured by Stripe
              </p>
            </div>

            {/* Features */}
            <div className="card p-6">
              <p className="text-xs font-display font-700 text-white uppercase tracking-wider mb-4">What's included</p>
              <ul className="space-y-3">
                {FEATURES.map((f) => (
                  <li key={f.text} className="flex items-center gap-2.5 text-sm text-ghost">
                    <f.icon size={14} className="text-brand-400 flex-shrink-0" />
                    {f.text}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
