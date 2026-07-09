import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { Layout } from './components/layout'
import Login            from './pages/Login'
import Dashboard        from './pages/Dashboard'
import Products         from './pages/Products'
import Categories       from './pages/Categories'
import Suppliers        from './pages/Suppliers'
import Orders           from './pages/Orders'
import Customers        from './pages/Customers'
import Reports          from './pages/Reports'
import Users            from './pages/Users'
import Audit            from './pages/Audit'
import { Zap } from 'lucide-react'

function Guard({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center gap-3" style={{ background:'var(--bg-base)' }}>
      <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background:'var(--accent)' }}>
        <Zap size={18} className="text-white" />
      </div>
      <p className="text-xs" style={{ color:'var(--text-muted)' }}>Loading…</p>
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}
function Public({ children })     { const { user } = useAuth(); return user ? <Navigate to="/" replace /> : children }
function AdminOnly({ children })  { const { isAdmin } = useAuth(); return isAdmin ? children : <Navigate to="/" replace /> }
function ManagerOnly({ children }){ const { isManager } = useAuth(); return isManager ? children : <Navigate to="/" replace /> }

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Public><Login /></Public>} />
          <Route path="/" element={<Guard><Layout /></Guard>}>
            <Route index             element={<Dashboard />} />
            <Route path="products"   element={<Products />} />
            <Route path="categories" element={<Categories />} />
            <Route path="suppliers"  element={<Suppliers />} />
            <Route path="orders"     element={<Orders />} />
            <Route path="customers"  element={<ManagerOnly><Customers /></ManagerOnly>} />
            <Route path="reports"    element={<Reports />} />

            <Route path="users"      element={<AdminOnly><Users /></AdminOnly>} />
            <Route path="audit"      element={<AdminOnly><Audit /></AdminOnly>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
