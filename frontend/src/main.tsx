import React, { useState, useEffect, createContext, useContext } from 'react'
import { BrowserRouter, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom'
import StudentsPage from './pages/StudentsPage'
import TemplatesPage from './pages/TemplatesPage'
import CalendarPage from './pages/CalendarPage'
import LoginPage from './pages/LoginPage'
import './styles.css'

interface AuthUser {
  id: string
  username: string
  instructorId: string
}

const AuthContext = createContext<{
  user: AuthUser | null
  loading: boolean
  logout: () => void
  refetch: () => void
}>({ user: null, loading: true, logout: () => {}, refetch: () => {} })

function useAuth() {
  return useContext(AuthContext)
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) return <div className="loading">Cargando...</div>
  if (!user) return <Navigate to="/login" replace />

  return <>{children}</>
}

function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()

  return (
    <div className="app">
      <nav className="nav">
        <h1>Agenda Pilates - Admin</h1>
        <div className="links">
          <Link to="/">Alumnos</Link>
          <Link to="/templates">Clases</Link>
          <Link to="/calendar">Calendario</Link>
        </div>
        <div className="nav-right">
          <span className="user-info">{user?.username}</span>
          <button onClick={logout} className="btn-logout">Salir</button>
        </div>
      </nav>
      <main className="main">{children}</main>
    </div>
  )
}

function AppRoutes() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  async function checkAuth() {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' })
      if (res.ok) {
        setUser(await res.json())
      } else {
        setUser(null)
      }
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { checkAuth() }, [])

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    setUser(null)
    navigate('/login')
  }

  return (
    <AuthContext.Provider value={{ user, loading, logout, refetch: checkAuth }}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<AuthGuard><Layout><StudentsPage /></Layout></AuthGuard>} />
        <Route path="/templates" element={<AuthGuard><Layout><TemplatesPage /></Layout></AuthGuard>} />
        <Route path="/calendar" element={<AuthGuard><Layout><CalendarPage /></Layout></AuthGuard>} />
      </Routes>
    </AuthContext.Provider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
