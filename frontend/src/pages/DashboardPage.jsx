import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../lib/authStore'
import { userAPI, scoreAPI, subscriptionAPI, winnerAPI, charityAPI } from '../lib/api'
import { formatCurrency, formatDate, formatDateShort, getStatusColor, errorMessage, getInitials } from '../lib/utils'
import { Spinner, StatCard, Card, Empty, Modal, Badge } from '../components/ui'
import toast from 'react-hot-toast'
import {
  LayoutDashboard, Star, Trophy, Heart, Settings, Bell, CreditCard,
  Plus, Trash2, Edit2, Upload, Check, X, ChevronRight, TrendingUp,
  Calendar, Award, User, Lock, LogOut, Shield
} from 'lucide-react'

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'scores', label: 'Scores', icon: Star },
  { id: 'draws', label: 'My Draws', icon: Trophy },
  { id: 'charity', label: 'Charity', icon: Heart },
  { id: 'winnings', label: 'Winnings', icon: Award },
  { id: 'subscription', label: 'Subscription', icon: CreditCard },
  { id: 'profile', label: 'Profile', icon: Settings },
]

export default function DashboardPage() {
  const { user, logout } = useAuthStore()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Detect tab from URL path segment
  useEffect(() => {
    const seg = pathname.split('/').pop()
    if (TABS.find((t) => t.id === seg)) setActiveTab(seg)
    else setActiveTab('overview')
  }, [pathname])

  useEffect(() => {
    userAPI.getDashboard()
      .then((r) => setDashboard(r.data.data))
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false))
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const isAdmin = user?.role === 'admin'

  return (
    <div className="min-h-screen pt-16 flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 border-r border-border bg-surface fixed left-0 top-16 bottom-0 z-30">
        {/* User info */}
        <div className="px-5 py-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center flex-shrink-0">
              <span className="text-brand-400 font-display font-700 text-xs">{getInitials(user?.first_name, user?.last_name)}</span>
            </div>
            <div className="min-w-0">
              <p className="font-display font-700 text-white text-sm truncate">{user?.first_name} {user?.last_name}</p>
              <p className="text-xs text-muted truncate">{user?.email}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id)
                navigate(`/dashboard${tab.id === 'overview' ? '' : '/' + tab.id}`)
              }}
              className={`w-full flex items-center gap-3 px-5 py-2.5 text-sm transition-all ${
                activeTab === tab.id
                  ? 'text-brand-400 bg-brand-500/8 border-r-2 border-brand-400 font-display font-600'
                  : 'text-ghost hover:text-white hover:bg-white/3'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}

          {isAdmin && (
            <Link to="/admin" className="w-full flex items-center gap-3 px-5 py-2.5 text-sm text-brand-500 hover:text-brand-400 hover:bg-brand-500/5 transition-all mt-2 border-t border-border pt-4">
              <Shield size={16} />
              Admin Panel
            </Link>
          )}
        </nav>

        <div className="border-t border-border p-4">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-red-500/5 rounded-lg transition-all">
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 lg:ml-60 px-4 sm:px-6 lg:px-8 py-8 max-w-full overflow-x-hidden">
        {/* Mobile tab selector */}
        <div className="lg:hidden mb-6 flex gap-2 overflow-x-auto pb-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-display font-600 transition-all ${
                activeTab === tab.id
                  ? 'bg-brand-500 text-ink'
                  : 'bg-surface border border-border text-ghost'
              }`}
            >
              <tab.icon size={12} />
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? <Spinner /> : (
          <>
            {activeTab === 'overview' && <OverviewTab dashboard={dashboard} />}
            {activeTab === 'scores' && <ScoresTab />}
            {activeTab === 'draws' && <DrawsTab draws={dashboard?.recent_draws || []} />}
            {activeTab === 'charity' && <CharityTab dashboard={dashboard} onUpdate={() => {
              userAPI.getDashboard().then(r => setDashboard(r.data.data)).catch(() => {})
            }} />}
            {activeTab === 'winnings' && <WinningsTab />}
            {activeTab === 'subscription' && <SubscriptionTab dashboard={dashboard} />}
            {activeTab === 'profile' && <ProfileTab />}
          </>
        )}
      </main>
    </div>
  )
}

// ── Overview Tab ───────────────────────────────────────────────────────────────
function OverviewTab({ dashboard }) {
  const sub = dashboard?.subscription
  const scores = dashboard?.scores || []
  const winnings = dashboard?.winnings || {}

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-800 text-white text-2xl">Dashboard</h1>
        <p className="text-ghost text-sm mt-1">
          {sub?.status === 'active' ? (
            <span className="text-brand-400">Active subscriber · Renews {formatDate(sub.current_period_end)}</span>
          ) : (
            <span className="text-red-400">No active subscription</span>
          )}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Subscription"
          value={sub?.status === 'active' ? 'Active' : 'Inactive'}
          icon={CreditCard}
          color={sub?.status === 'active' ? 'green' : 'blue'}
        />
        <StatCard
          label="Scores Entered"
          value={scores.length}
          icon={Star}
          trend="Last 5 scores tracked"
          color="gold"
        />
        <StatCard
          label="Total Winnings"
          value={formatCurrency(winnings.total || 0)}
          icon={Trophy}
          color="green"
        />
        <StatCard
          label="Charity Given"
          value={formatCurrency(winnings.charity_given || 0)}
          icon={Heart}
          trend={`${sub?.charity_percentage || 10}% of subscription`}
          color="green"
        />
      </div>

      {/* Scores preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display font-700 text-white">My Scores</h2>
            <button className="text-xs text-brand-400 hover:text-brand-300 font-display">View all</button>
          </div>
          {scores.length === 0 ? (
            <Empty icon={Star} title="No scores yet" description="Add your first Stableford score" />
          ) : (
            <div className="space-y-3">
              {scores.slice(0, 5).map((s) => (
                <div key={s.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm text-white font-display font-600">{s.course_name || 'Round'}</p>
                    <p className="text-xs text-muted">{formatDateShort(s.played_at)}</p>
                  </div>
                  <span className="font-display font-800 text-brand-400 text-lg">{s.score}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Subscription info */}
        <Card>
          <h2 className="font-display font-700 text-white mb-5">Subscription</h2>
          {sub ? (
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-ghost">Plan</span>
                <span className="text-sm text-white font-display font-600 capitalize">{sub.plan}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-ghost">Status</span>
                <span className={getStatusColor(sub.status) + ' badge'}>{sub.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-ghost">Amount</span>
                <span className="text-sm text-white font-display font-600">{formatCurrency(sub.amount_paid)}/{sub.plan === 'monthly' ? 'mo' : 'yr'}</span>
              </div>
              {sub.current_period_end && (
                <div className="flex justify-between">
                  <span className="text-sm text-ghost">Renews</span>
                  <span className="text-sm text-white">{formatDate(sub.current_period_end)}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-ghost mb-4">Subscribe to start entering draws</p>
              <Link to="/subscribe" className="btn-primary text-sm py-2 px-4">Subscribe Now</Link>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

// ── Scores Tab ─────────────────────────────────────────────────────────────────
function ScoresTab() {
  const [scores, setScores] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({ score: '', played_at: '', course_name: '', notes: '' })
  const [submitting, setSubmitting] = useState(false)

  const load = () => {
    scoreAPI.getMyScores()
      .then(r => setScores(r.data.data?.scores || []))
      .catch(() => toast.error('Failed to load scores'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.score < 1 || form.score > 45) { toast.error('Score must be between 1–45'); return }
    setSubmitting(true)
    try {
      if (editId) {
        await scoreAPI.updateScore(editId, form)
        toast.success('Score updated')
      } else {
        await scoreAPI.addScore(form)
        toast.success('Score added')
      }
      setShowAdd(false)
      setEditId(null)
      setForm({ score: '', played_at: '', course_name: '', notes: '' })
      load()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this score?')) return
    try {
      await scoreAPI.deleteScore(id)
      toast.success('Score deleted')
      load()
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  const openEdit = (s) => {
    setForm({ score: s.score, played_at: s.played_at?.split('T')[0] || '', course_name: s.course_name || '', notes: s.notes || '' })
    setEditId(s.id)
    setShowAdd(true)
  }

  if (loading) return <Spinner />

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-800 text-white text-2xl">My Scores</h1>
          <p className="text-ghost text-sm mt-1">Last 5 Stableford scores · Range 1–45</p>
        </div>
        {scores.length < 5 && (
          <button onClick={() => { setShowAdd(true); setEditId(null); setForm({ score: '', played_at: '', course_name: '', notes: '' }) }} className="btn-primary text-sm py-2 px-4">
            <Plus size={15} />
            Add Score
          </button>
        )}
      </div>

      {/* Info banner */}
      <div className="bg-brand-500/5 border border-brand-500/15 rounded-xl p-4 mb-6">
        <p className="text-xs text-brand-300">
          Only your latest 5 scores are retained. A new score automatically replaces the oldest one. Scores are shown most recent first.
        </p>
      </div>

      {/* Add/Edit form */}
      {showAdd && (
        <Card className="mb-6">
          <h3 className="font-display font-700 text-white mb-5">{editId ? 'Edit Score' : 'Add Score'}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Stableford Score</label>
                <input type="number" min="1" max="45" required className="input" placeholder="e.g. 36"
                  value={form.score} onChange={e => setForm({ ...form, score: e.target.value })} />
              </div>
              <div>
                <label className="label">Date Played</label>
                <input type="date" required className="input" max={new Date().toISOString().split('T')[0]}
                  value={form.played_at} onChange={e => setForm({ ...form, played_at: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="label">Course Name (optional)</label>
              <input type="text" className="input" placeholder="e.g. Royal St George's"
                value={form.course_name} onChange={e => setForm({ ...form, course_name: e.target.value })} />
            </div>
            <div>
              <label className="label">Notes (optional)</label>
              <textarea className="input resize-none h-20" placeholder="Any notes…"
                value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={submitting} className="btn-primary text-sm py-2 px-5">
                {submitting ? 'Saving…' : editId ? 'Update Score' : 'Add Score'}
              </button>
              <button type="button" onClick={() => { setShowAdd(false); setEditId(null) }} className="btn-ghost text-sm py-2 px-5">
                Cancel
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Scores list */}
      {scores.length === 0 ? (
        <Empty icon={Star} title="No scores yet" description="Add your first Stableford score to enter monthly draws." />
      ) : (
        <div className="space-y-3">
          {scores.map((s, i) => (
            <div key={s.id} className="card p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center flex-shrink-0">
                <span className="font-display font-800 text-brand-400 text-xl">{s.score}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display font-600 text-white text-sm">{s.course_name || 'Round ' + (i + 1)}</p>
                <p className="text-xs text-muted mt-0.5">{formatDate(s.played_at)}</p>
                {s.notes && <p className="text-xs text-ghost mt-1 truncate">{s.notes}</p>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-white/5 text-ghost hover:text-white transition-colors">
                  <Edit2 size={14} />
                </button>
                <button onClick={() => handleDelete(s.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-ghost hover:text-red-400 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}

          {scores.length >= 5 && (
            <p className="text-xs text-center text-muted pt-2">
              Maximum 5 scores reached. Adding a new score will remove the oldest.
            </p>
          )}

          {scores.length >= 5 && (
            <button onClick={() => { setShowAdd(true); setEditId(null); setForm({ score: '', played_at: '', course_name: '', notes: '' }) }} className="btn-primary text-sm py-2 px-4 w-full justify-center">
              <Plus size={15} />
              Add Score (replaces oldest)
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Draws Tab ─────────────────────────────────────────────────────────────────
function DrawsTab({ draws }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Try getting user draw history
    setLoading(false)
    setHistory(draws)
  }, [draws])

  return (
    <div className="max-w-2xl">
      <h1 className="font-display font-800 text-white text-2xl mb-6">My Draw Participation</h1>

      {loading ? <Spinner /> : history.length === 0 ? (
        <Empty icon={Trophy} title="No draws yet" description="Enter scores to be included in monthly draws." />
      ) : (
        <div className="space-y-3">
          {history.map((d) => (
            <div key={d.id} className="card p-5 flex items-center justify-between gap-4">
              <div>
                <p className="font-display font-600 text-white">{d.title}</p>
                <p className="text-xs text-muted mt-0.5">{formatDate(d.draw_month)}</p>
              </div>
              <span className={getStatusColor(d.status) + ' badge'}>{d.status}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6">
        <Link to="/draws" className="btn-ghost text-sm">View All Public Draws <ChevronRight size={14} /></Link>
      </div>
    </div>
  )
}

// ── Charity Tab ───────────────────────────────────────────────────────────────
function CharityTab({ dashboard, onUpdate }) {
  const sub = dashboard?.subscription
  const [charities, setCharities] = useState([])
  const [selectedCharity, setSelectedCharity] = useState(sub?.charity_id || '')
  const [percentage, setPercentage] = useState(sub?.charity_percentage || 10)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    charityAPI.list()
      .then(r => setCharities(r.data.data?.charities || []))
      .catch(() => {})
  }, [])

  const handleSave = async () => {
    if (!selectedCharity) { toast.error('Please select a charity'); return }
    setSaving(true)
    try {
      await subscriptionAPI.updateCharity({ charity_id: selectedCharity, charity_percentage: parseFloat(percentage) })
      toast.success('Charity updated!')
      onUpdate()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-display font-800 text-white text-2xl mb-2">Charity Selection</h1>
      <p className="text-ghost text-sm mb-8">At least 10% of your subscription goes to your chosen charity automatically.</p>

      {/* Current charity */}
      {sub?.charity && (
        <Card className="mb-6 border-brand-500/20 bg-brand-500/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center">
              <Heart size={18} className="text-brand-400" />
            </div>
            <div>
              <p className="text-xs text-muted mb-0.5">Currently supporting</p>
              <p className="font-display font-700 text-white">{sub.charity.name}</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-xs text-muted mb-0.5">Your contribution</p>
              <p className="font-display font-700 text-brand-400 text-lg">{sub.charity_percentage}%</p>
            </div>
          </div>
        </Card>
      )}

      {/* Change charity */}
      <Card>
        <h3 className="font-display font-700 text-white mb-5">Change Charity</h3>
        <div className="space-y-4">
          <div>
            <label className="label">Select Charity</label>
            <select className="input" value={selectedCharity} onChange={e => setSelectedCharity(e.target.value)}>
              <option value="">-- Choose a charity --</option>
              {charities.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Contribution Percentage (min. 10%)</label>
            <div className="flex items-center gap-4">
              <input type="range" min="10" max="100" step="5"
                className="flex-1 accent-green-500"
                value={percentage} onChange={e => setPercentage(e.target.value)} />
              <span className="font-display font-700 text-brand-400 text-lg w-12 text-right">{percentage}%</span>
            </div>
            <div className="flex justify-between text-xs text-muted mt-1">
              <span>Min 10%</span><span>100%</span>
            </div>
          </div>
          <button onClick={handleSave} disabled={saving} className="btn-primary text-sm py-2.5 px-6">
            <Heart size={14} />
            {saving ? 'Saving…' : 'Update Charity'}
          </button>
        </div>
      </Card>
    </div>
  )
}

// ── Winnings Tab ──────────────────────────────────────────────────────────────
function WinningsTab() {
  const [winnings, setWinnings] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploadId, setUploadId] = useState(null)
  const [proofFile, setProofFile] = useState(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    winnerAPI.getMyWinnings()
      .then(r => setWinnings(r.data.data?.winnings || []))
      .catch(() => toast.error('Failed to load winnings'))
      .finally(() => setLoading(false))
  }, [])

  const handleUploadProof = async (id) => {
    if (!proofFile) { toast.error('Please select a file'); return }
    setUploading(true)
    const fd = new FormData()
    fd.append('proof', proofFile)
    try {
      await winnerAPI.uploadProof(id, fd)
      toast.success('Proof uploaded! Awaiting verification.')
      setUploadId(null)
      setProofFile(null)
      winnerAPI.getMyWinnings().then(r => setWinnings(r.data.data?.winnings || []))
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setUploading(false)
    }
  }

  if (loading) return <Spinner />

  return (
    <div className="max-w-2xl">
      <h1 className="font-display font-800 text-white text-2xl mb-6">My Winnings</h1>

      {winnings.length === 0 ? (
        <Empty icon={Award} title="No winnings yet" description="Keep entering scores — your time will come!" />
      ) : (
        <div className="space-y-4">
          {winnings.map((w) => (
            <Card key={w.id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-display font-700 text-white">{w.draw?.title}</p>
                  <p className="text-xs text-muted mt-0.5">{w.match_type?.replace('_', ' ')}</p>
                  <p className="font-display font-800 text-brand-400 text-xl mt-2">{formatCurrency(w.prize_amount || 0)}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={getStatusColor(w.verification_status) + ' badge'}>
                    {w.verification_status}
                  </span>
                  <span className={getStatusColor(w.payment_status) + ' badge'}>
                    {w.payment_status}
                  </span>
                </div>
              </div>

              {/* Upload proof */}
              {w.verification_status === 'pending' && !w.proof_url && (
                <div className="mt-4 pt-4 border-t border-border">
                  {uploadId === w.id ? (
                    <div className="space-y-3">
                      <input type="file" accept="image/*,.pdf" onChange={e => setProofFile(e.target.files[0])} className="block text-xs text-ghost" />
                      <div className="flex gap-2">
                        <button onClick={() => handleUploadProof(w.id)} disabled={uploading} className="btn-primary text-xs py-1.5 px-4">
                          <Upload size={12} />
                          {uploading ? 'Uploading…' : 'Upload'}
                        </button>
                        <button onClick={() => setUploadId(null)} className="btn-ghost text-xs py-1.5 px-4">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setUploadId(w.id)} className="btn-ghost text-xs py-1.5 px-4">
                      <Upload size={12} />
                      Upload Score Proof
                    </button>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Subscription Tab ──────────────────────────────────────────────────────────
function SubscriptionTab({ dashboard }) {
  const sub = dashboard?.subscription
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    subscriptionAPI.getPaymentHistory()
      .then(r => setPayments(r.data.data?.payments || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will retain access until the end of the billing period.')) return
    setCancelling(true)
    try {
      await subscriptionAPI.cancel()
      toast.success('Subscription cancelled. Access continues until period end.')
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="font-display font-800 text-white text-2xl">Subscription</h1>

      {sub ? (
        <Card>
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-4 border-b border-border">
              <h3 className="font-display font-700 text-white">Current Plan</h3>
              <span className={getStatusColor(sub.status) + ' badge'}>{sub.status}</span>
            </div>
            {[
              { label: 'Plan', value: sub.plan === 'monthly' ? 'Monthly' : 'Yearly (discounted)' },
              { label: 'Amount', value: `${formatCurrency(sub.amount_paid)}/${sub.plan === 'monthly' ? 'month' : 'year'}` },
              { label: 'Current Period', value: `${formatDate(sub.current_period_start)} – ${formatDate(sub.current_period_end)}` },
              { label: 'Charity Contribution', value: `${sub.charity_percentage}% to ${sub.charity?.name || 'N/A'}` },
            ].map((row) => (
              <div key={row.label} className="flex justify-between text-sm">
                <span className="text-ghost">{row.label}</span>
                <span className="text-white font-display font-600">{row.value}</span>
              </div>
            ))}
            {sub.status === 'active' && (
              <div className="pt-4 border-t border-border">
                <button onClick={handleCancel} disabled={cancelling} className="text-xs text-red-400 hover:text-red-300 transition-colors">
                  {cancelling ? 'Cancelling…' : 'Cancel subscription'}
                </button>
              </div>
            )}
          </div>
        </Card>
      ) : (
        <Card className="text-center py-8">
          <Trophy size={32} className="text-muted mx-auto mb-4" />
          <p className="font-display font-700 text-white mb-2">No Active Subscription</p>
          <p className="text-sm text-ghost mb-6">Subscribe to enter monthly draws and support charities.</p>
          <Link to="/subscribe" className="btn-primary">Subscribe Now</Link>
        </Card>
      )}

      {/* Payment history */}
      {loading ? <Spinner size={16} /> : payments.length > 0 && (
        <Card>
          <h3 className="font-display font-700 text-white mb-5">Payment History</h3>
          <div className="space-y-3">
            {payments.map((p) => (
              <div key={p.id} className="flex justify-between text-sm py-2 border-b border-border last:border-0">
                <span className="text-ghost">{formatDate(p.created_at)}</span>
                <span className="font-display font-600 text-white">{formatCurrency(p.amount)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

// ── Profile Tab ───────────────────────────────────────────────────────────────
function ProfileTab() {
  const { user, updateUser } = useAuthStore()
  const [form, setForm] = useState({ first_name: user?.first_name || '', last_name: user?.last_name || '', phone: user?.phone || '' })
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '' })
  const [saving, setSaving] = useState(false)
  const [savingPw, setSavingPw] = useState(false)

  const handleProfileSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const r = await userAPI.updateProfile(form)
      updateUser(r.data.data.user)
      toast.success('Profile updated')
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordSave = async (e) => {
    e.preventDefault()
    if (pwForm.new_password.length < 8) { toast.error('New password must be at least 8 characters'); return }
    setSavingPw(true)
    try {
      await userAPI.changePassword(pwForm)
      toast.success('Password changed')
      setPwForm({ current_password: '', new_password: '' })
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setSavingPw(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="font-display font-800 text-white text-2xl">Profile Settings</h1>

      <Card>
        <h3 className="font-display font-700 text-white mb-5 flex items-center gap-2">
          <User size={16} className="text-brand-400" />
          Personal Information
        </h3>
        <form onSubmit={handleProfileSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">First Name</label>
              <input className="input" value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} />
            </div>
            <div>
              <label className="label">Last Name</label>
              <input className="input" value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" value={user?.email} disabled />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+44 7700 000000" />
          </div>
          <button type="submit" disabled={saving} className="btn-primary text-sm py-2.5 px-6">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
      </Card>

      <Card>
        <h3 className="font-display font-700 text-white mb-5 flex items-center gap-2">
          <Lock size={16} className="text-brand-400" />
          Change Password
        </h3>
        <form onSubmit={handlePasswordSave} className="space-y-4">
          <div>
            <label className="label">Current Password</label>
            <input type="password" className="input" value={pwForm.current_password} onChange={e => setPwForm({ ...pwForm, current_password: e.target.value })} required />
          </div>
          <div>
            <label className="label">New Password</label>
            <input type="password" className="input" value={pwForm.new_password} onChange={e => setPwForm({ ...pwForm, new_password: e.target.value })} required placeholder="Min 8 characters" />
          </div>
          <button type="submit" disabled={savingPw} className="btn-primary text-sm py-2.5 px-6">
            {savingPw ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </Card>
    </div>
  )
}
