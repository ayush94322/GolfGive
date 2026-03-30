import axios from 'axios'
import toast from 'react-hot-toast'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle 401 — try refresh
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config
    if (err.response?.status === 401 && !original._retry && !original.url.includes('/auth/refresh')) {
      original._retry = true
      try {
        const refreshToken = localStorage.getItem('refreshToken')
        if (!refreshToken) throw new Error('No refresh token')
        const { data } = await axios.post(`${API_BASE}/api/auth/refresh`, { refreshToken })
        localStorage.setItem('accessToken', data.data.accessToken)
        original.headers.Authorization = `Bearer ${data.data.accessToken}`
        return api(original)
      } catch {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        window.location.replace('/login')
      }
    }
    return Promise.reject(err)
  }
)

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }),
  verifyEmail: (token) => api.get(`/auth/verify-email/${token}`),
}

// ── Users / Dashboard ─────────────────────────────────────────────────────────
export const userAPI = {
  getDashboard: () => api.get('/users/dashboard'),
  updateProfile: (data) => api.patch('/users/profile', data),
  changePassword: (data) => api.post('/users/change-password', data),
  getNotifications: () => api.get('/users/notifications'),
  markNotificationRead: (id) => api.patch(`/users/notifications/${id}/read`),
  markAllRead: () => api.post('/users/notifications/read-all'),
  // Admin
  adminListUsers: (params) => api.get('/users/admin', { params }),
  adminGetUser: (id) => api.get(`/users/admin/${id}`),
  adminUpdateUser: (id, data) => api.patch(`/users/admin/${id}`, data),
}

// ── Scores ────────────────────────────────────────────────────────────────────
export const scoreAPI = {
  getMyScores: () => api.get('/scores/my'),
  addScore: (data) => api.post('/scores/my', data),
  updateScore: (id, data) => api.patch(`/scores/my/${id}`, data),
  deleteScore: (id) => api.delete(`/scores/my/${id}`),
  // Admin
  getUserScores: (userId) => api.get(`/scores/user/${userId}`),
  adminEditScore: (id, data) => api.patch(`/scores/admin/${id}`, data),
  getFrequency: () => api.get('/scores/frequency'),
}

// ── Subscriptions ─────────────────────────────────────────────────────────────
export const subscriptionAPI = {
  createCheckout: (data) => api.post('/subscriptions/checkout', data),
  getMy: () => api.get('/subscriptions/my'),
  cancel: () => api.post('/subscriptions/cancel'),
  updateCharity: (data) => api.patch('/subscriptions/charity', data),
  getPaymentHistory: () => api.get('/subscriptions/payments'),
  // Admin
  adminList: (params) => api.get('/subscriptions/admin', { params }),
}

// ── Draws ─────────────────────────────────────────────────────────────────────
export const drawAPI = {
  list: (params) => api.get('/draws', { params }),
  get: (id) => api.get(`/draws/${id}`),
  myHistory: () => api.get('/draws/my-history'),
  // Admin
  adminList: (params) => api.get('/draws/admin/all', { params }),
  adminCreate: (data) => api.post('/draws/admin', data),
  adminUpdate: (id, data) => api.patch(`/draws/admin/${id}`, data),
  adminSimulate: (id) => api.post(`/draws/admin/${id}/simulate`),
  adminPublish: (id) => api.post(`/draws/admin/${id}/publish`),
  adminCancel: (id) => api.delete(`/draws/admin/${id}`),
}

// ── Charities ─────────────────────────────────────────────────────────────────
export const charityAPI = {
  list: (params) => api.get('/charities', { params }),
  get: (slug) => api.get(`/charities/${slug}`),
  donate: (data) => api.post('/charities/donate', data),
  // Admin
  adminStats: () => api.get('/charities/admin/stats'),
  adminCreate: (data) => api.post('/charities/admin', data),
  adminUpdate: (id, data) => api.patch(`/charities/admin/${id}`, data),
  adminDelete: (id) => api.delete(`/charities/admin/${id}`),
  adminAddEvent: (charityId, data) => api.post(`/charities/admin/${charityId}/events`, data),
}

// ── Winners ───────────────────────────────────────────────────────────────────
export const winnerAPI = {
  getMyWinnings: () => api.get('/winners/my'),
  uploadProof: (id, formData) =>
    api.post(`/winners/my/${id}/proof`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  // Admin
  adminList: (params) => api.get('/winners/admin', { params }),
  adminVerify: (id, data) => api.post(`/winners/admin/${id}/verify`, data),
  adminMarkPaid: (id) => api.post(`/winners/admin/${id}/pay`),
}

// ── Analytics ─────────────────────────────────────────────────────────────────
export const analyticsAPI = {
  getOverview: () => api.get('/analytics/overview'),
  getMonthly: () => api.get('/analytics/monthly'),
  getDrawStats: () => api.get('/analytics/draws'),
  getSubscriptionStats: () => api.get('/analytics/subscriptions'),
}

export default api
