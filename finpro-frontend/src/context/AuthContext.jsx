// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { auth as authApi } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(() => {
    try { return JSON.parse(localStorage.getItem('fp_user')) } catch { return null }
  })
  const [loading, setLoading] = useState(false)

  // Escuchar logout automático por token expirado
  useEffect(() => {
    const handler = () => { setUser(null) }
    window.addEventListener('fp:logout', handler)
    return () => window.removeEventListener('fp:logout', handler)
  }, [])

  const login = useCallback(async (usuario, password) => {
    setLoading(true)
    try {
      const data = await authApi.login(usuario, password)
      localStorage.setItem('fp_token', data.token)
      localStorage.setItem('fp_user', JSON.stringify(data.usuario))
      setUser(data.usuario)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('fp_token')
    localStorage.removeItem('fp_user')
    setUser(null)
  }, [])

  // Helpers de rol
  const isAdmin      = user?.rol === 'Administrador'
  const isSupervisor = user?.rol === 'Supervisor' || isAdmin
  const isCobrador   = user?.rol === 'Cobrador'
  const isCajero     = user?.rol === 'Cajero'
  const can = (roles) => roles.includes(user?.rol)

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, isSupervisor, isCobrador, isCajero, can }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
