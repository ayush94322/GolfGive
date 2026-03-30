import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../lib/authStore'
import { analyticsAPI, userAPI, drawAPI, charityAPI, winnerAPI, subscriptionAPI } from '../lib/api'
import { formatCurrency, formatDate, getStatusColor, errorMessage } from '../lib/utils'
import { Spinner, StatCard, Card, Empty, SectionHeader } from '../components/ui'
import toast from 'react-hot-toast'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid
} from 'recharts'
import {
  LayoutDashboard, Users, Trophy, Heart, Award, TrendingUp,
  Plus, Check, X, Edit2, Trash2, Play, Eye, ChevronRight,
  Shield, LogOut, Settings, CreditCard
} from 'lucide-react'

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'draws', label: 'Draws', icon: Trophy },
  { id: 'charities', label: 'Charities', icon: Heart },
  { id: 'winners', label: 'Winners', icon: Award },
  { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
]

export default function AdminPage() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    if (user?.role !== 'admin') navigate('/dashboard')
  }, [user])

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen pt-16 flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 border-r border-border bg-surface fixed left-0 top-16 bottom-0 z-30">
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-brand-400" />
            <p className="font-display font-700 text-white text-sm">Admin Panel</p>
          </div>
          <p className="text-xs text-muted mt-0.5">{user?.first_name} {user?.last_name}</p>
        </div>

        <nav className="flex-1 py-3">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-5 py-2.5 text-sm transition-all ${
                activeTab === tab.id
                  ? 'text-brand-400 bg-brand-500/8 border-r-2 border-brand-400 font-display font-600'
                  : 'text-ghost hover:text-white hover:bg-white/3'
              }`}
            >
              <tab.icon size={15} />
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="border-t border-border p-4 space-y-1">
          <Link to="/dashboard" className="w-full flex items-center gap-3 px-3 py-2 text-sm text-ghost hover:text-white hover:bg-white/5 rounded-lg transition-all">
            <LayoutDashboard size={15} />
            User Dashboard
          </Link>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-red-500/5 rounded-lg transition-all">
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile tabs */}
      <div className="lg:hidden fixed top-16 left-0 right-0 z-40 bg-ink border-b border-border px-4 py-2 flex gap-2 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-display font-600 transition-all ${
              activeTab === tab.id ? 'bg-brand-500 text-ink' : 'bg-surface border border-border text-ghost'
            }`}
          >
            <tab.icon size={11} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main content */}
      <main className="flex-1 lg:ml-60 px-4 sm:px-6 lg:px-8 py-8 mt-14 lg:mt-0 overflow-x-hidden">
        {activeTab === 'overview' && <AdminOverview />}
        {activeTab === 'users' && <AdminUsers />}
        {activeTab === 'draws' && <AdminDraws />}
        {activeTab === 'charities' && <AdminCharities />}
        {activeTab === 'winners' && <AdminWinners />}
        {activeTab === 'subscriptions' && <AdminSubscriptions />}
      </main>
    </div>
  )
}

// ── Overview ──────────────────────────────────────────────────────────────────
function AdminOverview() {
  const [overview, setOverview] = useState(null)
  const [monthly, setMonthly] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      analyticsAPI.getOverview(),
      analyticsAPI.getMonthly(),
    ]).then(([ov, mo]) => {
      setOverview(ov.data.data)
      setMonthly(mo.data.data?.months || [])
    }).catch(() => toast.error('Failed to load analytics'))
    .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />

  return (
    <div className="space-y-6">
      <h1 className="font-display font-800 text-white text-2xl">Overview</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={overview?.total_users ?? '—'} icon={Users} color="green" />
        <StatCard label="Active Subscribers" value={overview?.active_subscribers ?? '—'} icon={CreditCard} color="gold" />
        <StatCard label="Prize Pool" value={formatCurrency(overview?.total_prize_pool || 0)} icon={Trophy} color="gold" />
        <StatCard label="Charity Total" value={formatCurrency(overview?.total_charity || 0)} icon={Heart} color="green" />
      </div>

      {/* Monthly chart */}
      {monthly.length > 0 && (
        <Card>
          <SectionHeader title="Monthly Revenue" subtitle="Subscription income over time" />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthly} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f3829" />
              <XAxis dataKey="month" tick={{ fill: '#4d7a5e', fontSize: 11 }} />
              <YAxis tick={{ fill: '#4d7a5e', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#16261c', border: '1px solid #1f3829', borderRadius: '8px', color: '#e8f2ec' }}
                formatter={(v) => [formatCurrency(v), 'Revenue']}
              />
              <Bar dataKey="revenue" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  )
}

// ── Users ─────────────────────────────────────────────────────────────────────
function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    userAPI.adminListUsers()
      .then(r => setUsers(r.data.data?.users || []))
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = users.filter(u =>
    `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="font-display font-800 text-white text-2xl">Users</h1>
        <input className="input sm:w-64 py-2 text-sm" placeholder="Search users…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? <Spinner /> : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {['Name', 'Email', 'Role', 'Verified', 'Joined'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-display font-600 text-ghost uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, i) => (
                  <tr key={u.id} className={`border-b border-border last:border-0 hover:bg-white/2 transition-colors ${i % 2 === 0 ? '' : 'bg-white/1'}`}>
                    <td className="px-5 py-3">
                      <p className="font-display font-600 text-white">{u.first_name} {u.last_name}</p>
                    </td>
                    <td className="px-5 py-3 text-ghost">{u.email}</td>
                    <td className="px-5 py-3">
                      <span className={u.role === 'admin' ? 'badge-gold' : 'badge-muted'}>{u.role}</span>
                    </td>
                    <td className="px-5 py-3">
                      {u.is_email_verified ? (
                        <Check size={14} className="text-brand-400" />
                      ) : (
                        <X size={14} className="text-red-400" />
                      )}
                    </td>
                    <td className="px-5 py-3 text-ghost text-xs">{formatDate(u.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}

// ── Draws ─────────────────────────────────────────────────────────────────────
function AdminDraws() {
  const [draws, setDraws] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ title: '', draw_month: '', logic: 'random' })
  const [creating, setCreating] = useState(false)
  const [simulating, setSimulating] = useState(null)
  const [publishing, setPublishing] = useState(null)

  const load = () => {
    drawAPI.adminList()
      .then(r => setDraws(r.data.data?.draws || []))
      .catch(() => toast.error('Failed to load draws'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setCreating(true)
    try {
      await drawAPI.adminCreate(form)
      toast.success('Draw created')
      setShowCreate(false)
      setForm({ title: '', draw_month: '', logic: 'random' })
      load()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setCreating(false)
    }
  }

  const handleSimulate = async (id) => {
    setSimulating(id)
    try {
      const r = await drawAPI.adminSimulate(id)
      toast.success('Simulation complete')
      load()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setSimulating(null)
    }
  }

  const handlePublish = async (id) => {
    if (!confirm('Publish this draw? This cannot be undone.')) return
    setPublishing(id)
    try {
      await drawAPI.adminPublish(id)
      toast.success('Draw published!')
      load()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setPublishing(null)
    }
  }

  const handleCancel = async (id) => {
    if (!confirm('Cancel this draw?')) return
    try {
      await drawAPI.adminCancel(id)
      toast.success('Draw cancelled')
      load()
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display font-800 text-white text-2xl">Draw Management</h1>
        <button onClick={() => setShowCreate(!showCreate)} className="btn-primary text-sm py-2 px-4">
          <Plus size={15} />
          Create Draw
        </button>
      </div>

      {showCreate && (
        <Card>
          <h3 className="font-display font-700 text-white mb-5">New Draw</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="label">Title</label>
                <input className="input" required placeholder="e.g. January 2026 Draw" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <label className="label">Draw Month</label>
                <input type="date" className="input" required value={form.draw_month} onChange={e => setForm({ ...form, draw_month: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="label">Logic</label>
              <select className="input sm:w-48" value={form.logic} onChange={e => setForm({ ...form, logic: e.target.value })}>
                <option value="random">Random</option>
                <option value="algorithmic">Algorithmic (weighted)</option>
              </select>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={creating} className="btn-primary text-sm py-2 px-5">
                {creating ? 'Creating…' : 'Create Draw'}
              </button>
              <button type="button" onClick={() => setShowCreate(false)} className="btn-ghost text-sm py-2 px-5">Cancel</button>
            </div>
          </form>
        </Card>
      )}

      {loading ? <Spinner /> : draws.length === 0 ? (
        <Empty icon={Trophy} title="No draws yet" description="Create the first monthly draw" />
      ) : (
        <div className="space-y-3">
          {draws.map((d) => (
            <Card key={d.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="font-display font-700 text-white">{d.title}</h3>
                  <p className="text-xs text-muted mt-0.5">{formatDate(d.draw_month)} · {d.logic}</p>
                  {d.winning_numbers && (
                    <div className="flex gap-1.5 mt-2">
                      {d.winning_numbers.map((n, i) => (
                        <div key={i} className="w-6 h-6 rounded-full bg-gold-500/15 border border-gold-500/30 flex items-center justify-center">
                          <span className="text-xs font-display font-700 text-gold-400">{n}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={getStatusColor(d.status) + ' badge'}>{d.status}</span>
                  {(d.status === 'scheduled' || d.status === 'simulation') && (
                    <button
                      onClick={() => handleSimulate(d.id)}
                      disabled={simulating === d.id}
                      className="bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20 text-xs px-3 py-1.5 rounded-lg font-display font-600 transition-all flex items-center gap-1.5"
                    >
                      <Play size={12} />
                      {simulating === d.id ? 'Simulating…' : 'Simulate'}
                    </button>
                  )}
                  {d.status === 'simulation' && (
                    <button
                      onClick={() => handlePublish(d.id)}
                      disabled={publishing === d.id}
                      className="bg-brand-500/10 border border-brand-500/30 text-brand-400 hover:bg-brand-500/20 text-xs px-3 py-1.5 rounded-lg font-display font-600 transition-all flex items-center gap-1.5"
                    >
                      <Check size={12} />
                      {publishing === d.id ? 'Publishing…' : 'Publish'}
                    </button>
                  )}
                  {d.status !== 'published' && d.status !== 'cancelled' && (
                    <button
                      onClick={() => handleCancel(d.id)}
                      className="bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 text-xs px-3 py-1.5 rounded-lg font-display font-600 transition-all"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Charities ─────────────────────────────────────────────────────────────────
function AdminCharities() {
  const [charities, setCharities] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', slug: '', description: '', short_bio: '', website_url: '', is_featured: false })
  const [creating, setCreating] = useState(false)

  const load = () => {
    charityAPI.list()
      .then(r => setCharities(r.data.data?.charities || []))
      .catch(() => toast.error('Failed to load charities'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const autoSlug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const handleCreate = async (e) => {
    e.preventDefault()
    setCreating(true)
    try {
      await charityAPI.adminCreate(form)
      toast.success('Charity created')
      setShowCreate(false)
      setForm({ name: '', slug: '', description: '', short_bio: '', website_url: '', is_featured: false })
      load()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this charity?')) return
    try {
      await charityAPI.adminDelete(id)
      toast.success('Charity deleted')
      load()
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display font-800 text-white text-2xl">Charity Management</h1>
        <button onClick={() => setShowCreate(!showCreate)} className="btn-primary text-sm py-2 px-4">
          <Plus size={15} />
          Add Charity
        </button>
      </div>

      {showCreate && (
        <Card>
          <h3 className="font-display font-700 text-white mb-5">New Charity</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Name</label>
                <input className="input" required value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value, slug: autoSlug(e.target.value) })} />
              </div>
              <div>
                <label className="label">Slug</label>
                <input className="input" required value={form.slug}
                  onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="auto-generated" />
              </div>
            </div>
            <div>
              <label className="label">Short Bio</label>
              <input className="input" value={form.short_bio} onChange={e => setForm({ ...form, short_bio: e.target.value })} placeholder="One-line summary" />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea className="input resize-none h-24" required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <label className="label">Website URL</label>
              <input type="url" className="input" value={form.website_url} onChange={e => setForm({ ...form, website_url: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_featured} onChange={e => setForm({ ...form, is_featured: e.target.checked })} className="accent-green-500" />
              <span className="text-sm text-ghost">Feature this charity on homepage</span>
            </label>
            <div className="flex gap-3">
              <button type="submit" disabled={creating} className="btn-primary text-sm py-2 px-5">
                {creating ? 'Creating…' : 'Create Charity'}
              </button>
              <button type="button" onClick={() => setShowCreate(false)} className="btn-ghost text-sm py-2 px-5">Cancel</button>
            </div>
          </form>
        </Card>
      )}

      {loading ? <Spinner /> : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {['Name', 'Slug', 'Total Raised', 'Featured', 'Actions'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-display font-600 text-ghost uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {charities.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-white/2 transition-colors">
                    <td className="px-5 py-3 font-display font-600 text-white">{c.name}</td>
                    <td className="px-5 py-3 text-muted text-xs font-mono">{c.slug}</td>
                    <td className="px-5 py-3 text-brand-400 font-display font-600">{formatCurrency(c.total_received || 0)}</td>
                    <td className="px-5 py-3">
                      {c.is_featured ? <Check size={14} className="text-gold-400" /> : <span className="text-muted">—</span>}
                    </td>
                    <td className="px-5 py-3">
                      <button onClick={() => handleDelete(c.id)} className="text-red-400 hover:text-red-300 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}

// ── Winners ───────────────────────────────────────────────────────────────────
function AdminWinners() {
  const [winners, setWinners] = useState([])
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState(null)
  const [paying, setPaying] = useState(null)

  const load = () => {
    winnerAPI.adminList()
      .then(r => setWinners(r.data.data?.winners || []))
      .catch(() => toast.error('Failed to load winners'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleVerify = async (id, action) => {
    setVerifying(id)
    try {
      await winnerAPI.adminVerify(id, { action })
      toast.success(`Winner ${action}d`)
      load()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setVerifying(null)
    }
  }

  const handlePay = async (id) => {
    setPaying(id)
    try {
      await winnerAPI.adminMarkPaid(id)
      toast.success('Marked as paid')
      load()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setPaying(null)
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="font-display font-800 text-white text-2xl">Winners Management</h1>

      {loading ? <Spinner /> : winners.length === 0 ? (
        <Empty icon={Award} title="No winners yet" description="Winners will appear here after draws are published." />
      ) : (
        <div className="space-y-4">
          {winners.map((w) => (
            <Card key={w.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-display font-700 text-white">{w.user?.first_name} {w.user?.last_name}</p>
                  <p className="text-xs text-muted mt-0.5">{w.user?.email}</p>
                  <p className="text-xs text-ghost mt-1">{w.draw?.title} · {w.match_type?.replace('_', ' ')}</p>
                  <p className="font-display font-700 text-brand-400 text-lg mt-2">{formatCurrency(w.prize_amount || 0)}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex gap-2">
                    <span className={getStatusColor(w.verification_status) + ' badge'}>Verify: {w.verification_status}</span>
                    <span className={getStatusColor(w.payment_status) + ' badge'}>Pay: {w.payment_status}</span>
                  </div>

                  {/* Proof link */}
                  {w.proof_url && (
                    <a href={w.proof_url} target="_blank" rel="noreferrer" className="text-xs text-brand-400 hover:underline">View Proof</a>
                  )}

                  {/* Verify actions */}
                  {w.verification_status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleVerify(w.id, 'approve')}
                        disabled={verifying === w.id}
                        className="flex items-center gap-1 bg-brand-500/10 border border-brand-500/30 text-brand-400 text-xs px-3 py-1.5 rounded-lg font-display font-600 hover:bg-brand-500/20 transition-all"
                      >
                        <Check size={12} />
                        Approve
                      </button>
                      <button
                        onClick={() => handleVerify(w.id, 'reject')}
                        disabled={verifying === w.id}
                        className="flex items-center gap-1 bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-3 py-1.5 rounded-lg font-display font-600 hover:bg-red-500/20 transition-all"
                      >
                        <X size={12} />
                        Reject
                      </button>
                    </div>
                  )}

                  {/* Pay action */}
                  {w.verification_status === 'approved' && w.payment_status === 'pending' && (
                    <button
                      onClick={() => handlePay(w.id)}
                      disabled={paying === w.id}
                      className="bg-gold-500/10 border border-gold-500/30 text-gold-400 text-xs px-3 py-1.5 rounded-lg font-display font-600 hover:bg-gold-500/20 transition-all"
                    >
                      {paying === w.id ? 'Marking…' : 'Mark as Paid'}
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Subscriptions ─────────────────────────────────────────────────────────────
function AdminSubscriptions() {
  const [subs, setSubs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    subscriptionAPI.adminList()
      .then(r => setSubs(r.data.data?.subscriptions || []))
      .catch(() => toast.error('Failed to load subscriptions'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-5">
      <h1 className="font-display font-800 text-white text-2xl">Subscriptions</h1>

      {loading ? <Spinner /> : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {['User', 'Plan', 'Amount', 'Status', 'Charity %', 'Renews'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-display font-600 text-ghost uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {subs.map((s) => (
                  <tr key={s.id} className="border-b border-border last:border-0 hover:bg-white/2 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-display font-600 text-white">{s.user?.first_name} {s.user?.last_name}</p>
                      <p className="text-xs text-muted">{s.user?.email}</p>
                    </td>
                    <td className="px-5 py-3 capitalize text-ghost">{s.plan}</td>
                    <td className="px-5 py-3 text-white font-display font-600">{formatCurrency(s.amount_paid)}</td>
                    <td className="px-5 py-3">
                      <span className={getStatusColor(s.status) + ' badge'}>{s.status}</span>
                    </td>
                    <td className="px-5 py-3 text-brand-400">{s.charity_percentage}%</td>
                    <td className="px-5 py-3 text-xs text-muted">{formatDate(s.current_period_end)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
