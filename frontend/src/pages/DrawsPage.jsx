import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { drawAPI } from '../lib/api'
import { formatDate, getStatusColor } from '../lib/utils'
import { Spinner, Empty, Badge } from '../components/ui'
import { Trophy, ArrowLeft, Calendar, Hash } from 'lucide-react'
import toast from 'react-hot-toast'

export function DrawsPage() {
  const [draws, setDraws] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    drawAPI.list()
      .then((r) => setDraws(r.data.data?.draws || []))
      .catch(() => toast.error('Failed to load draws'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-24 pt-28">
      <div className="mb-12">
        <p className="text-xs text-brand-400 font-display font-700 uppercase tracking-widest mb-3">Monthly Prize Draws</p>
        <h1 className="section-title">Draw Results & Schedule</h1>
        <p className="text-ghost mt-3 max-w-xl">
          Every month a new draw takes place. Match 3, 4, or all 5 numbers and win a share of the prize pool.
        </p>
      </div>

      {loading ? <Spinner /> : draws.length === 0 ? (
        <Empty icon={Trophy} title="No draws yet" description="Check back soon for the first draw." />
      ) : (
        <div className="space-y-4">
          {draws.map((draw) => (
            <Link
              key={draw.id}
              to={`/draws/${draw.id}`}
              className="card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-brand-500/20 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center flex-shrink-0">
                  <Trophy size={18} className="text-brand-400" />
                </div>
                <div>
                  <h3 className="font-display font-700 text-white group-hover:text-brand-400 transition-colors">{draw.title}</h3>
                  <p className="text-xs text-ghost mt-0.5 flex items-center gap-1.5">
                    <Calendar size={11} />
                    {formatDate(draw.draw_month)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {draw.winning_numbers && (
                  <div className="flex gap-1.5">
                    {draw.winning_numbers.map((n, i) => (
                      <div key={i} className="w-7 h-7 rounded-full border border-gold-500/30 bg-gold-500/10 flex items-center justify-center">
                        <span className="text-xs font-display font-700 text-gold-400">{n}</span>
                      </div>
                    ))}
                  </div>
                )}
                <span className={getStatusColor(draw.status) + ' badge'}>
                  {draw.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export function DrawDetailPage() {
  const { id } = useParams()
  const [draw, setDraw] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    drawAPI.get(id)
      .then((r) => setDraw(r.data.data?.draw))
      .catch(() => toast.error('Draw not found'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="pt-28"><Spinner /></div>
  if (!draw) return (
    <div className="pt-28 text-center py-20">
      <p className="text-ghost">Draw not found.</p>
      <Link to="/draws" className="btn-ghost mt-4 inline-flex">Back to Draws</Link>
    </div>
  )

  const tiers = [
    { key: 'five_match', label: '5-Number Match', share: '40%', color: 'gold' },
    { key: 'four_match', label: '4-Number Match', share: '35%', color: 'green' },
    { key: 'three_match', label: '3-Number Match', share: '25%', color: 'muted' },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-24 pt-28">
      <Link to="/draws" className="inline-flex items-center gap-2 text-sm text-ghost hover:text-white mb-8 transition-colors">
        <ArrowLeft size={15} />
        Back to draws
      </Link>

      <div className="card p-8 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <p className="text-xs text-muted uppercase tracking-wider font-display mb-1">
              <Calendar size={11} className="inline mr-1" />
              {formatDate(draw.draw_month)}
            </p>
            <h1 className="font-display font-800 text-white text-3xl">{draw.title}</h1>
          </div>
          <span className={getStatusColor(draw.status) + ' badge text-sm py-1 px-3'}>
            {draw.status}
          </span>
        </div>

        {/* Winning numbers */}
        {draw.winning_numbers && (
          <div className="mb-8">
            <p className="label flex items-center gap-1.5 mb-4"><Hash size={12} />Winning Numbers</p>
            <div className="flex gap-3 flex-wrap">
              {draw.winning_numbers.map((n, i) => (
                <div key={i} className="w-14 h-14 rounded-full border-2 border-gold-500/50 bg-gold-500/10 flex items-center justify-center animate-float" style={{ animationDelay: `${i * 0.2}s` }}>
                  <span className="font-display font-800 text-gold-400 text-xl">{n}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Prize tiers */}
        <div>
          <p className="label mb-4">Prize Tiers</p>
          <div className="space-y-3">
            {tiers.map((tier) => {
              const winners = draw.winners?.filter((w) => w.match_type === tier.key) || []
              return (
                <div key={tier.key} className={`rounded-xl p-4 border flex items-center justify-between gap-4 ${tier.color === 'gold' ? 'bg-gold-500/5 border-gold-500/20' : 'bg-white/3 border-border'}`}>
                  <div>
                    <p className={`font-display font-700 text-sm ${tier.color === 'gold' ? 'text-gold-400' : tier.color === 'green' ? 'text-brand-400' : 'text-white'}`}>
                      {tier.label}
                    </p>
                    <p className="text-xs text-muted mt-0.5">{winners.length} winner{winners.length !== 1 ? 's' : ''}</p>
                  </div>
                  <span className="font-display font-800 text-2xl text-white">{tier.share}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Winners */}
      {draw.winners?.length > 0 && (
        <div className="card p-6">
          <h2 className="font-display font-700 text-white mb-5">Winners</h2>
          <div className="space-y-3">
            {draw.winners.map((w) => (
              <div key={w.id} className="flex items-center justify-between p-4 bg-surface rounded-xl border border-border">
                <div>
                  <p className="font-display font-600 text-white text-sm">{w.user?.first_name} {w.user?.last_name?.[0]}.</p>
                  <p className="text-xs text-muted mt-0.5">{w.match_type?.replace('_', ' ')}</p>
                </div>
                <span className={getStatusColor(w.payment_status) + ' badge'}>
                  {w.payment_status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
