import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="border-t border-border bg-surface mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
                <span className="text-ink font-display font-800 text-sm">G</span>
              </div>
              <span className="font-display font-700 text-white text-lg">GolfGive</span>
            </div>
            <p className="text-sm text-ghost leading-relaxed max-w-xs">
              Play golf, win prizes, and make a difference. Every swing counts — for you and for the charities you love.
            </p>
          </div>

          {/* Platform */}
          <div>
            <p className="text-xs font-display font-700 text-white uppercase tracking-widest mb-4">Platform</p>
            <ul className="space-y-2">
              {[
                { label: 'Charities', href: '/charities' },
                { label: 'Monthly Draws', href: '/draws' },
                { label: 'How It Works', href: '/#how-it-works' },
                { label: 'Subscribe', href: '/register' },
              ].map((l) => (
                <li key={l.label}>
                  <Link to={l.href} className="text-sm text-ghost hover:text-brand-400 transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div>
            <p className="text-xs font-display font-700 text-white uppercase tracking-widest mb-4">Account</p>
            <ul className="space-y-2">
              {[
                { label: 'Sign In', href: '/login' },
                { label: 'Register', href: '/register' },
                { label: 'Dashboard', href: '/dashboard' },
              ].map((l) => (
                <li key={l.label}>
                  <Link to={l.href} className="text-sm text-ghost hover:text-brand-400 transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted">© {new Date().getFullYear()} GolfGive. All rights reserved.</p>
          <p className="text-xs text-muted flex items-center gap-1">
            Made with <Heart size={11} className="text-brand-500 fill-brand-500" /> for golfers who care
          </p>
        </div>
      </div>
    </footer>
  )
}
