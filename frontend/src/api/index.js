import axios from 'axios'

// In development: Vite proxy forwards /api → localhost:3000
// In production:  VITE_API_URL is set in Vercel to the Render backend URL
const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

const api = axios.create({ baseURL: BASE })

api.interceptors.request.use(config => {
  const token = localStorage.getItem('iq_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('iq_token')
      localStorage.removeItem('iq_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  },
)

export default api

export const authAPI       = { login: d => api.post('/auth/login', d), me: () => api.get('/auth/me') }
export const dashAPI       = { stats: () => api.get('/dashboard/stats'), chartData: () => api.get('/dashboard/chart-data') }
export const productsAPI   = { getAll: p => api.get('/products', { params:p }), getById: id => api.get(`/products/${id}`), create: d => api.post('/products', d), update: (id,d) => api.put(`/products/${id}`, d), delete: id => api.delete(`/products/${id}`), alerts: () => api.get('/products/alerts') }
export const categoriesAPI = { getAll: () => api.get('/categories'), create: d => api.post('/categories', d), update: (id,d) => api.put(`/categories/${id}`, d), delete: id => api.delete(`/categories/${id}`), warehouses: () => api.get('/categories/warehouses') }
export const suppliersAPI  = { getAll: p => api.get('/suppliers', { params:p }), getById: id => api.get(`/suppliers/${id}`), create: d => api.post('/suppliers', d), update: (id,d) => api.put(`/suppliers/${id}`, d), delete: id => api.delete(`/suppliers/${id}`) }
export const ordersAPI     = { getAll: p => api.get('/orders', { params:p }), getById: id => api.get(`/orders/${id}`), create: d => api.post('/orders', d), updateStatus: (id,status) => api.put(`/orders/${id}/status`, { status }) }
export const customersAPI  = { getAll: p => api.get('/customers', { params:p }), create: d => api.post('/customers', d), update: (id,d) => api.put(`/customers/${id}`, d), delete: id => api.delete(`/customers/${id}`) }
export const usersAPI      = { getAll: () => api.get('/users'), create: d => api.post('/users', d), update: (id,d) => api.put(`/users/${id}`, d), delete: id => api.delete(`/users/${id}`) }
export const auditAPI      = { getAll: () => api.get('/audit') }
