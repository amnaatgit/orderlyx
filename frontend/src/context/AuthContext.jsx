import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authAPI } from '../api'

const Ctx = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)

  /**
   * On mount: if a token exists in localStorage, validate it against the
   * server (/auth/me) to ensure the role hasn't changed and the account is
   * still active.  This prevents stale role data from persisting after an
   * admin changes a user's role or deactivates their account.
   */
  useEffect(() => {
    const token = localStorage.getItem('iq_token')
    if (!token) {
      setLoading(false)
      return
    }
    authAPI.me()
      .then(({ data }) => {
        // Refresh stored user with latest server data (role may have changed)
        localStorage.setItem('iq_user', JSON.stringify(data.user))
        setUser(data.user)
      })
      .catch(() => {
        // Token invalid or expired — clear session
        localStorage.removeItem('iq_token')
        localStorage.removeItem('iq_user')
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const login = async (email, password) => {
    const { data } = await authAPI.login({ email, password })
    localStorage.setItem('iq_token', data.token)
    localStorage.setItem('iq_user',  JSON.stringify(data.user))
    setUser(data.user)
    return data
  }

  const logout = useCallback(() => {
    localStorage.removeItem('iq_token')
    localStorage.removeItem('iq_user')
    setUser(null)
  }, [])

  // Role helpers — derived from server-validated user object
  const isAdmin   = user?.role === 'ADMIN'
  const isManager = user?.role === 'ADMIN' || user?.role === 'MANAGER'
  const isStaff   = user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'STAFF'
  const isViewer  = user?.role === 'VIEWER'

  return (
    <Ctx.Provider value={{ user, login, logout, loading, isAdmin, isManager, isStaff, isViewer }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)
