import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { charityAPI } from '../lib/api'
import { formatCurrency, formatDate, errorMessage } from '../lib/utils'
import { Spinner, Empty } from '../components/ui'
import { Heart, Star, ExternalLink, Calendar, Search, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../lib/authStore'

// ── Charities List Page ───────────────────────────────────────────────────────
export function CharitiesPage() {
  const [charities, setCharities] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    charityAPI.list()
      .then((r) => setCharities(r.data.data?.charities || []))
      .catch(() => toast.error('Failed to load charities'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = charities.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.description?.toLowerCase().includes(search.toLowerCase())
  )

  const featured = filtered.filter((c) => c.is_featured)
  const rest = filtered.filter((c) => !c.is_featured)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-24 pt-28">
      {/* Header */}
      <div className="mb-12">
        <p className="text-xs text-brand-400 font-display font-700 uppercase tracking-widest mb-3">Our Partners</p>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <h1 className="section-title">Charities We Support</h1>
          {/* Search */}
          <div className="relative sm:w-72">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              className="input pl-9 py-2.5 text-sm"
              placeholder="Search charities…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {loading ? <Spinner /> : (
        <>
          {/* Featured */}
          {featured.length > 0 && (
            <div className="mb-12">
              <div className="flex items-center gap-2 mb-5">
                <Star size={14} className="text-gold-400 fill-gold-400" />
                <h2 className="font-display font-700 text-white text-sm uppercase tracking-wider">Featured</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {featured.map((c) => <CharityCard key={c.id} charity={c} />)}
              </div>
            </div>
          )}

          {/* All */}
          {rest.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {rest.map((c) => <CharityCard key={c.id} charity={c} />)}
            </div>
          ) : (
            !featured.length && (
              <Empty icon={Heart} title="No charities found" description="Try a different search term" />
            )
          )}
        </>
      )}
    </div>
  )
}

function CharityCard({ charity: c }) {
  return (
    <Link to={`/charities/${c.slug}`} className="card p-6 hover:border-brand-500/20 transition-all group flex flex-col">
      {c.is_featured && (
        <div className="flex items-center gap-1.5 mb-4">
          <Star size={12} className="text-gold-400 fill-gold-400" />
          <span className="text-xs text-gold-400 font-display font-600 uppercase tracking-wider">Featured</span>
        </div>
      )}
      <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mb-4 flex-shrink-0">
        {c.logo_url ? (
          <img src={c.logo_url} alt={c.name} className="w-8 h-8 object-contain rounded" />
        ) : (
          <Heart size={20} className="text-brand-400" />
        )}
      </div>
      <h3 className="font-display font-700 text-white mb-2 group-hover:text-brand-400 transition-colors">{c.name}</h3>
      <p className="text-sm text-ghost leading-relaxed line-clamp-3 flex-1">{c.short_bio || c.description}</p>
      <div className="mt-5 pt-4 border-t border-border flex items-center justify-between">
        <span className="text-xs text-muted">Raised</span>
        <span className="text-sm font-display font-700 text-brand-400">{formatCurrency(c.total_received || 0)}</span>
      </div>
    </Link>
  )
}

// ── Charity Detail Page ───────────────────────────────────────────────────────
export function CharityDetailPage() {
  const { slug } = useParams()
  const { isAuthenticated } = useAuthStore()
  const [charity, setCharity] = useState(null)
  const [loading, setLoading] = useState(true)
  const [donateAmount, setDonateAmount] = useState('')
  const [donating, setDonating] = useState(false)

  useEffect(() => {
    charityAPI.get(slug)
      .then((r) => setCharity(r.data.data?.charity))
      .catch(() => toast.error('Charity not found'))
      .finally(() => setLoading(false))
  }, [slug])

  const handleDonate = async (e) => {
    e.preventDefault()
    if (!isAuthenticated) { toast.error('Please sign in to donate'); return }
    setDonating(true)
    try {
      await charityAPI.donate({ charity_id: charity.id, amount: parseFloat(donateAmount) })
      toast.success(`Donated ${formatCurrency(donateAmount)} to ${charity.name}!`)
      setDonateAmount('')
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setDonating(false)
    }
  }

  if (loading) return <div className="pt-28"><Spinner /></div>
  if (!charity) return (
    <div className="pt-28 max-w-xl mx-auto px-4 text-center py-20">
      <p className="text-ghost">Charity not found.</p>
      <Link to="/charities" className="btn-ghost mt-4 inline-flex">Back to Charities</Link>
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-24 pt-28">
      <Link to="/charities" className="inline-flex items-center gap-2 text-sm text-ghost hover:text-white transition-colors mb-8">
        <ArrowLeft size={15} />
        Back to charities
      </Link>

      {/* Banner */}
      {charity.banner_url && (
        <div className="w-full h-48 rounded-2xl overflow-hidden mb-8 border border-border">
          <img src={charity.banner_url} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-16 h-16 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center flex-shrink-0">
                {charity.logo_url ? (
                  <img src={charity.logo_url} alt={charity.name} className="w-10 h-10 object-contain" />
                ) : (
                  <Heart size={24} className="text-brand-400" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {charity.is_featured && (
                    <span className="badge-gold">Featured</span>
                  )}
                </div>
                <h1 className="font-display font-800 text-white text-2xl">{charity.name}</h1>
                {charity.website_url && (
                  <a href={charity.website_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 mt-1 transition-colors">
                    Visit website <ExternalLink size={11} />
                  </a>
                )}
              </div>
            </div>
            <p className="text-ghost leading-relaxed">{charity.description}</p>
          </div>

          {/* Events */}
          {charity.events?.length > 0 && (
            <div className="card p-6">
              <h2 className="font-display font-700 text-white mb-5 flex items-center gap-2">
                <Calendar size={16} className="text-brand-400" />
                Upcoming Events
              </h2>
              <div className="space-y-3">
                {charity.events.map((ev) => (
                  <div key={ev.id} className="flex items-start gap-4 p-4 bg-surface rounded-xl border border-border">
                    <div className="flex-shrink-0 text-center w-12">
                      <p className="font-display font-800 text-brand-400 text-lg leading-none">{new Date(ev.event_date).getDate()}</p>
                      <p className="text-xs text-muted">{new Date(ev.event_date).toLocaleDateString('en-GB', { month: 'short' })}</p>
                    </div>
                    <div>
                      <p className="font-display font-600 text-white text-sm">{ev.title}</p>
                      {ev.location && <p className="text-xs text-muted mt-0.5">{ev.location}</p>}
                      {ev.description && <p className="text-xs text-ghost mt-1">{ev.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Stats */}
          <div className="card p-6">
            <p className="text-xs text-muted uppercase tracking-wider font-display mb-1">Total Raised</p>
            <p className="font-display font-800 text-brand-400 text-3xl mb-4">{formatCurrency(charity.total_received || 0)}</p>
            <div className="h-2 rounded-full bg-white/5 overflow-hidden">
              <div className="h-full rounded-full bg-brand-500 w-3/4" />
            </div>
          </div>

          {/* Donate */}
          <div className="card p-6">
            <h3 className="font-display font-700 text-white mb-4">Donate Directly</h3>
            {isAuthenticated ? (
              <form onSubmit={handleDonate} className="space-y-3">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">£</span>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    className="input pl-7"
                    placeholder="0.00"
                    value={donateAmount}
                    onChange={(e) => setDonateAmount(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  {[5, 10, 25].map((a) => (
                    <button key={a} type="button" onClick={() => setDonateAmount(String(a))}
                      className="flex-1 text-xs py-1.5 rounded-lg border border-border text-ghost hover:border-brand-500/30 hover:text-brand-400 transition-all font-display">
                      £{a}
                    </button>
                  ))}
                </div>
                <button type="submit" disabled={donating} className="btn-primary w-full justify-center py-2.5 text-sm">
                  <Heart size={14} />
                  {donating ? 'Processing…' : 'Donate'}
                </button>
              </form>
            ) : (
              <div className="text-center">
                <p className="text-sm text-ghost mb-3">Sign in to donate</p>
                <Link to="/login" className="btn-primary text-sm py-2 px-4 justify-center w-full">Sign In</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
