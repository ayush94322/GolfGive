import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../lib/authStore'
import { Menu, X, Bell, ChevronDown, LogOut, User, LayoutDashboard, Shield } from 'lucide-react'
import { getInitials } from '../../lib/utils'

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuthStore()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const isAdmin = user?.role === 'admin'

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const navLinks = [
    { label: 'Charities', href: '/charities' },
    { label: 'Draws', href: '/draws' },
    { label: 'How It Works', href: '/#how-it-works' },
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-ink/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
              <span className="text-ink font-display font-800 text-sm">G</span>
            </div>
            <span className="font-display font-700 text-white text-lg">GolfGive</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} className="nav-link">
                {l.label}
              </a>
            ))}
          </div>

          {/* Desktop right */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                {/* Notifications */}
                <Link
                  to="/dashboard"
                  className="relative p-2 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <Bell size={18} className="text-ghost" />
                </Link>

                {/* Profile dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center gap-2.5 pl-3 pr-2 py-1.5 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-border"
                  >
                    <div className="w-7 h-7 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center">
                      <span className="text-brand-400 font-display font-700 text-xs">
                        {getInitials(user?.first_name, user?.last_name)}
                      </span>
                    </div>
                    <span className="text-sm text-white font-body">{user?.first_name}</span>
                    <ChevronDown size={14} className="text-ghost" />
                  </button>

                  {profileOpen && (
                    <div className="absolute right-0 top-full mt-2 w-52 card shadow-xl shadow-black/40 py-1 overflow-hidden">
                      <div className="px-4 py-3 border-b border-border">
                        <p className="text-xs text-ghost">{user?.email}</p>
                      </div>
                      <Link
                        to="/dashboard"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-ghost hover:text-white hover:bg-white/5 transition-colors"
                      >
                        <LayoutDashboard size={15} />
                        Dashboard
                      </Link>
                      <Link
                        to="/dashboard/profile"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-ghost hover:text-white hover:bg-white/5 transition-colors"
                      >
                        <User size={15} />
                        Profile
                      </Link>
                      {isAdmin && (
                        <Link
                          to="/admin"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-brand-400 hover:text-brand-300 hover:bg-brand-500/5 transition-colors"
                        >
                          <Shield size={15} />
                          Admin Panel
                        </Link>
                      )}
                      <div className="border-t border-border mt-1">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-colors"
                        >
                          <LogOut size={15} />
                          Sign out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-ghost py-2 px-4 text-xs">
                  Sign in
                </Link>
                <Link to="/register" className="btn-primary py-2 px-4 text-xs">
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile burger */}
          <button
            className="md:hidden p-2 text-ghost hover:text-white transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-ink border-t border-border px-4 py-4 space-y-3">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setMobileOpen(false)}
              className="block text-sm text-ghost hover:text-white py-2"
            >
              {l.label}
            </a>
          ))}
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" onClick={() => setMobileOpen(false)} className="block text-sm text-ghost hover:text-white py-2">
                Dashboard
              </Link>
              {isAdmin && (
                <Link to="/admin" onClick={() => setMobileOpen(false)} className="block text-sm text-brand-400 py-2">
                  Admin Panel
                </Link>
              )}
              <button onClick={handleLogout} className="block text-sm text-red-400 py-2">
                Sign out
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-2 pt-2">
              <Link to="/login" className="btn-ghost justify-center py-2 text-sm">Sign in</Link>
              <Link to="/register" className="btn-primary justify-center py-2 text-sm">Get Started</Link>
            </div>
          )}
        </div>
      )}
    </nav>
  )
}
