import { clsx } from 'clsx'

export function cn(...args) {
  return clsx(...args)
}

export function formatCurrency(amount, currency = 'GBP') {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(date) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateShort(date) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  })
}

export function getInitials(firstName, lastName) {
  return `${(firstName?.[0] || '').toUpperCase()}${(lastName?.[0] || '').toUpperCase()}`
}

export function getStatusColor(status) {
  const map = {
    active: 'badge-green',
    inactive: 'badge-muted',
    cancelled: 'badge-red',
    lapsed: 'badge-red',
    pending: 'badge-gold',
    paid: 'badge-green',
    rejected: 'badge-red',
    approved: 'badge-green',
    published: 'badge-green',
    scheduled: 'badge-gold',
    simulation: 'badge-muted',
  }
  return map[status] || 'badge-muted'
}

export function truncate(str, len = 80) {
  if (!str) return ''
  return str.length > len ? str.slice(0, len) + '…' : str
}

export function errorMessage(err) {
  return err?.response?.data?.message || err?.message || 'Something went wrong'
}
