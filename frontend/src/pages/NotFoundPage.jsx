import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center pt-16 px-4">
      <div className="text-center">
        <p className="font-display font-800 text-brand-500/30 text-9xl leading-none mb-6">404</p>
        <h1 className="font-display font-800 text-white text-3xl mb-3">Page not found</h1>
        <p className="text-ghost mb-8">The page you're looking for doesn't exist or has moved.</p>
        <Link to="/" className="btn-primary">
          <ArrowLeft size={16} />
          Go Home
        </Link>
      </div>
    </div>
  )
}
