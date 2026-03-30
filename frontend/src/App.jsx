import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useEffect } from 'react'
import { useAuthStore } from './lib/authStore'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import { Spinner } from './components/ui'

// Pages
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import { CharitiesPage, CharityDetailPage } from './pages/CharitiesPage'
import { DrawsPage, DrawDetailPage } from './pages/DrawsPage'
import DashboardPage from './pages/DashboardPage'
import AdminPage from './pages/AdminPage'
import SubscribePage from './pages/SubscribePage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import NotFoundPage from './pages/NotFoundPage'

// ── Auth guards ───────────────────────────────────────────────────────────────
function RequireAuth({ children }) {
  const { isAuthenticated, isLoading } = useAuthStore()
  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner />
    </div>
  )
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

function RequireAdmin({ children }) {
  const { user, isAuthenticated, isLoading } = useAuthStore()
  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner />
    </div>
  )
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />
  return children
}

function GuestOnly({ children }) {
  const { isAuthenticated, isLoading } = useAuthStore()
  if (isLoading) return null
  return !isAuthenticated ? children : <Navigate to="/dashboard" replace />
}

// ── Layouts ───────────────────────────────────────────────────────────────────
function PublicLayout({ children }) {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  )
}

function AppLayout({ children }) {
  return (
    <>
      <Navbar />
      {children}
    </>
  )
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const { init } = useAuthStore()

  useEffect(() => {
    init()
  }, [])

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#16261c',
            color: '#e8f2ec',
            border: '1px solid #1f3829',
            borderRadius: '12px',
            fontSize: '13px',
            fontFamily: 'DM Sans, sans-serif',
          },
          success: { iconTheme: { primary: '#22c55e', secondary: '#16261c' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#16261c' } },
        }}
      />

      <Routes>
        {/* Public routes */}
        <Route path="/" element={<PublicLayout><HomePage /></PublicLayout>} />
        <Route path="/charities" element={<PublicLayout><CharitiesPage /></PublicLayout>} />
        <Route path="/charities/:slug" element={<PublicLayout><CharityDetailPage /></PublicLayout>} />
        <Route path="/draws" element={<PublicLayout><DrawsPage /></PublicLayout>} />
        <Route path="/draws/:id" element={<PublicLayout><DrawDetailPage /></PublicLayout>} />

        {/* Guest only */}
        <Route path="/login" element={<GuestOnly><AppLayout><LoginPage /></AppLayout></GuestOnly>} />
        <Route path="/register" element={<GuestOnly><AppLayout><RegisterPage /></AppLayout></GuestOnly>} />
        <Route path="/forgot-password" element={<AppLayout><ForgotPasswordPage /></AppLayout>} />

        {/* Authenticated */}
        <Route path="/dashboard" element={<RequireAuth><AppLayout><DashboardPage /></AppLayout></RequireAuth>} />
        <Route path="/dashboard/:tab" element={<RequireAuth><AppLayout><DashboardPage /></AppLayout></RequireAuth>} />
        <Route path="/subscribe" element={<RequireAuth><AppLayout><SubscribePage /></AppLayout></RequireAuth>} />

        {/* Admin */}
        <Route path="/admin" element={<RequireAdmin><AdminPage /></RequireAdmin>} />
        <Route path="/admin/:tab" element={<RequireAdmin><AdminPage /></RequireAdmin>} />

        {/* 404 */}
        <Route path="*" element={<PublicLayout><NotFoundPage /></PublicLayout>} />
      </Routes>
    </BrowserRouter>
  )
}
