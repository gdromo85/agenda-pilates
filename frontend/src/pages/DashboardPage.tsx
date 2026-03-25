import React, { useEffect, useMemo, useState } from 'react'
import api from '../api'

type Session = {
  id: string
  startUtc: string
  endUtc: string
  status: string
  template?: {
    title?: string
  }
}

type Student = {
  id: string
  name: string
  email: string
  createdAt?: string
}

function startOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

function addDays(date: Date, days: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function formatSessionDate(utc: string) {
  return new Date(utc).toLocaleString('es-AR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function isCanceledStatus(status: string) {
  const value = status.toLowerCase()
  return value === 'canceled' || value === 'cancelled'
}

export default function DashboardPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true)
      setError('')

      const now = new Date()
      const todayStart = startOfDay(now)
      const todayEnd = endOfDay(now)
      const nextWeekEnd = endOfDay(addDays(now, 7))

      try {
        const q = new URLSearchParams({
          fromUtc: todayStart.toISOString(),
          toUtc: nextWeekEnd.toISOString(),
        })

        const [sessionsData, studentsData] = await Promise.all([
          api.fetchJson('/sessions?' + q.toString()),
          api.fetchJson('/students'),
        ])

        if (!Array.isArray(sessionsData)) {
          throw new Error('sessions_invalid')
        }

        if (!Array.isArray(studentsData)) {
          throw new Error('students_invalid')
        }

        const activeSessions = sessionsData.filter(
          (session: Session) => !isCanceledStatus(session.status),
        )

        setSessions(activeSessions)
        setStudents(studentsData)
      } catch {
        setError('No pudimos cargar el dashboard. Probá de nuevo en unos segundos.')
        setSessions([])
        setStudents([])
      } finally {
        setLoading(false)
      }
    }

    void loadDashboard()
  }, [])

  const today = new Date()
  const todayStart = startOfDay(today)
  const todayEnd = endOfDay(today)

  const todaySessions = useMemo(
    () => sessions.filter(session => {
      const start = new Date(session.startUtc)
      return start >= todayStart && start <= todayEnd
    }).sort((a, b) => new Date(a.startUtc).getTime() - new Date(b.startUtc).getTime()),
    [sessions, todayStart, todayEnd],
  )

  const upcomingSessions = useMemo(
    () => sessions
      .filter(session => new Date(session.startUtc).getTime() > Date.now())
      .sort((a, b) => new Date(a.startUtc).getTime() - new Date(b.startUtc).getTime())
      .slice(0, 7),
    [sessions],
  )

  const recentStudents = useMemo(() => students.slice(0, 5), [students])

  if (loading) {
    return <div className="loading">Cargando dashboard...</div>
  }

  return (
    <div>
      <div className="page-header">
        <h2>Dashboard</h2>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        <div className="card" style={{ margin: 0 }}>
          <div className="text-muted">Clases hoy</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>{todaySessions.length}</div>
        </div>
        <div className="card" style={{ margin: 0 }}>
          <div className="text-muted">Próximas 7 clases</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>{upcomingSessions.length}</div>
        </div>
        <div className="card" style={{ margin: 0 }}>
          <div className="text-muted">Alumnos totales</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>{students.length}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
        <div className="card">
          <div className="card-header">
            <h3>Clases de hoy</h3>
          </div>
          {todaySessions.length === 0 ? (
            <div className="empty-state" style={{ padding: '20px 12px' }}>
              <p>No hay clases para hoy.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '8px' }}>
              {todaySessions.map(session => (
                <div key={session.id} className="badge badge-neutral" style={{ padding: '8px 10px', borderRadius: '10px', textTransform: 'none' }}>
                  {session.template?.title ?? 'Sesión'} · {formatSessionDate(session.startUtc)}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Próximas clases</h3>
          </div>
          {upcomingSessions.length === 0 ? (
            <div className="empty-state" style={{ padding: '20px 12px' }}>
              <p>No hay clases próximas en los siguientes días.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '8px' }}>
              {upcomingSessions.map(session => (
                <div key={session.id} className="badge badge-info" style={{ padding: '8px 10px', borderRadius: '10px', textTransform: 'none' }}>
                  {session.template?.title ?? 'Sesión'} · {formatSessionDate(session.startUtc)}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Alumnos recientes</h3>
          </div>
          {recentStudents.length === 0 ? (
            <div className="empty-state" style={{ padding: '20px 12px' }}>
              <p>No hay alumnos cargados todavía.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '8px' }}>
              {recentStudents.map(student => (
                <div key={student.id} className="badge badge-neutral" style={{ padding: '8px 10px', borderRadius: '10px', textTransform: 'none' }}>
                  {student.name} · {student.email}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
