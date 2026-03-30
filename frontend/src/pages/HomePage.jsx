import { Link } from 'react-router-dom'
import { ArrowRight, Heart, Trophy, Target, Star, ChevronRight, Users, TrendingUp, Award } from 'lucide-react'
import { useEffect, useState } from 'react'
import { charityAPI, drawAPI } from '../lib/api'
import { formatCurrency, formatDate } from '../lib/utils'

export default function HomePage() {
  const [charities, setCharities] = useState([])
  const [draws, setDraws] = useState([])

  useEffect(() => {
    charityAPI.list({ limit: 3 }).then((r) => setCharities(r.data.data?.charities || [])).catch(() => {})
    drawAPI.list({ limit: 3 }).then((r) => setDraws(r.data.data?.draws || [])).catch(() => {})
  }, [])

  return (
    <div className="relative overflow-hidden">
      {/* Hero */}
      <section className="relative min-h-screen flex items-center pt-16 hero-gradient">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20">
          <div className="max-w-3xl">
            {/* Pill */}
            <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/20 rounded-full px-4 py-1.5 mb-8">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
              <span className="text-brand-400 text-xs font-display font-600 uppercase tracking-widest">Monthly Draw Now Open</span>
            </div>

            <h1 className="font-display font-800 text-5xl sm:text-6xl md:text-7xl text-white leading-[0.95] mb-6">
              Play Golf.
              <br />
              <span className="text-brand-400">Win Prizes.</span>
              <br />
              <span className="text-gold-400">Give Back.</span>
            </h1>

            <p className="text-lg text-ghost leading-relaxed mb-10 max-w-xl">
              Enter your Stableford scores, join the monthly prize draw, and support the charities you care about. Every subscription makes a difference.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link to="/register" className="btn-primary text-base px-8 py-4">
                Start Your Journey
                <ArrowRight size={18} />
              </Link>
              <Link to="/charities" className="btn-ghost text-base px-8 py-4">
                Explore Charities
              </Link>
            </div>

            {/* Stats row */}
            <div className="flex flex-wrap gap-8 mt-14 pt-10 border-t border-border">
              {[
                { value: '£50K+', label: 'Given to Charities' },
                { value: '2,000+', label: 'Active Players' },
                { value: '12', label: 'Charity Partners' },
              ].map((s) => (
                <div key={s.label}>
                  <p className="font-display font-800 text-white text-2xl">{s.value}</p>
                  <p className="text-xs text-ghost mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <p className="text-xs text-brand-400 font-display font-700 uppercase tracking-widest mb-3">Simple & Transparent</p>
            <h2 className="section-title">How GolfGive Works</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                icon: Users,
                title: 'Subscribe & Play',
                desc: 'Choose monthly or yearly. Enter your last 5 Stableford scores — it takes under a minute.',
                color: 'brand',
              },
              {
                step: '02',
                icon: Trophy,
                title: 'Enter the Draw',
                desc: 'Your scores automatically enter you into the monthly prize draw. 3, 4, and 5-number matches win.',
                color: 'gold',
              },
              {
                step: '03',
                icon: Heart,
                title: 'Give Back',
                desc: 'A guaranteed portion of every subscription goes to your chosen charity — automatically, every month.',
                color: 'brand',
              },
            ].map((item) => (
              <div key={item.step} className="card p-8 relative overflow-hidden group hover:border-brand-500/20 transition-all">
                <div className="absolute top-4 right-4 font-display font-800 text-4xl text-white/4">{item.step}</div>
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-6 ${item.color === 'gold' ? 'bg-gold-500/10' : 'bg-brand-500/10'}`}>
                  <item.icon size={20} className={item.color === 'gold' ? 'text-gold-400' : 'text-brand-400'} />
                </div>
                <h3 className="font-display font-700 text-white text-lg mb-3">{item.title}</h3>
                <p className="text-sm text-ghost leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Prize pool */}
      <section className="py-20 bg-surface border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-xs text-gold-400 font-display font-700 uppercase tracking-widest mb-3">Prize Pool</p>
              <h2 className="section-title mb-6">Three Ways to Win Every Month</h2>
              <p className="text-ghost leading-relaxed mb-8">
                Match 3, 4, or all 5 numbers in the monthly draw. The jackpot rolls over if unclaimed, making it bigger every month.
              </p>
              <Link to="/draws" className="btn-primary">
                View Current Draw
                <ArrowRight size={16} />
              </Link>
            </div>

            <div className="space-y-4">
              {[
                { match: '5-Number Match', share: '40%', label: 'JACKPOT', rollover: true, color: 'gold' },
                { match: '4-Number Match', share: '35%', label: 'TOP PRIZE', color: 'brand' },
                { match: '3-Number Match', share: '25%', label: 'ENTRY PRIZE', color: 'muted' },
              ].map((tier) => (
                <div key={tier.match} className={`card p-5 flex items-center justify-between gap-4 ${tier.color === 'gold' ? 'border-gold-500/20 bg-gold-500/5' : ''}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${tier.color === 'gold' ? 'bg-gold-500/20' : tier.color === 'brand' ? 'bg-brand-500/10' : 'bg-white/5'}`}>
                      <Award size={18} className={tier.color === 'gold' ? 'text-gold-400' : tier.color === 'brand' ? 'text-brand-400' : 'text-ghost'} />
                    </div>
                    <div>
                      <p className="font-display font-700 text-white text-sm">{tier.match}</p>
                      <p className="text-xs text-muted">{tier.label}{tier.rollover ? ' · Rolls over if unclaimed' : ''}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`font-display font-800 text-2xl ${tier.color === 'gold' ? 'text-gold-400' : tier.color === 'brand' ? 'text-brand-400' : 'text-white'}`}>{tier.share}</p>
                    <p className="text-xs text-muted">of pool</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Charities */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-end justify-between mb-12">
            <div>
              <p className="text-xs text-brand-400 font-display font-700 uppercase tracking-widest mb-3">Our Partners</p>
              <h2 className="section-title">Supporting Great Charities</h2>
            </div>
            <Link to="/charities" className="hidden sm:flex items-center gap-1.5 text-sm text-ghost hover:text-brand-400 transition-colors font-display">
              View all <ChevronRight size={16} />
            </Link>
          </div>

          {charities.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {charities.map((c) => (
                <Link
                  key={c.id}
                  to={`/charities/${c.slug}`}
                  className="card p-6 hover:border-brand-500/20 transition-all group"
                >
                  {c.is_featured && (
                    <div className="flex items-center gap-1.5 mb-4">
                      <Star size={12} className="text-gold-400 fill-gold-400" />
                      <span className="text-xs text-gold-400 font-display font-600 uppercase tracking-wider">Featured</span>
                    </div>
                  )}
                  <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mb-4">
                    {c.logo_url ? (
                      <img src={c.logo_url} alt={c.name} className="w-8 h-8 object-contain" />
                    ) : (
                      <Heart size={20} className="text-brand-400" />
                    )}
                  </div>
                  <h3 className="font-display font-700 text-white mb-2 group-hover:text-brand-400 transition-colors">{c.name}</h3>
                  <p className="text-sm text-ghost leading-relaxed line-clamp-2">{c.short_bio || c.description}</p>
                  <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                    <span className="text-xs text-muted">Total received</span>
                    <span className="text-sm font-display font-700 text-brand-400">{formatCurrency(c.total_received || 0)}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card p-6 animate-pulse">
                  <div className="w-12 h-12 rounded-xl bg-white/5 mb-4" />
                  <div className="h-4 bg-white/5 rounded mb-2 w-2/3" />
                  <div className="h-3 bg-white/5 rounded w-full" />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-brand-500/5 border-y border-brand-500/10" />
        <div className="absolute inset-0 gradient-glow" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center mx-auto mb-8">
            <TrendingUp size={28} className="text-brand-400" />
          </div>
          <h2 className="section-title mb-6">
            Ready to Play, Win & Give?
          </h2>
          <p className="text-ghost text-lg mb-10">
            Join thousands of golfers making a difference with every round they play.
          </p>
          <Link to="/register" className="btn-primary text-base px-10 py-4">
            Subscribe Now
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  )
}
