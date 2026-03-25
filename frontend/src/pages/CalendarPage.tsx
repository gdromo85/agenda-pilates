import React, { useEffect, useState } from 'react'
import api from '../api'

type Session = {
  id: string
  startUtc: string
  endUtc: string
  status: string
  capacitySnapshot?: number
  template?: { title?: string; isGroup?: boolean; capacity?: number }
  enrollments?: Array<{ id: string; studentId: string; status?: string; student?: { name?: string } }>
  waitlistEntries?: Array<{ id: string; position: number; studentId: string; student?: { name?: string } }>
}

type Student = { id: string; name: string; email: string }
type CalendarView = 'week' | 'month'

function startOfWeek(date: Date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = (day + 6) % 7
  d.setDate(d.getDate() - diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfWeek(weekStart: Date) {
  const d = new Date(weekStart)
  d.setDate(d.getDate() + 6)
  d.setHours(23, 59, 59, 999)
  return d
}

function startOfMonth(date: Date) {
  const d = new Date(date)
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfMonth(monthStart: Date) {
  const d = new Date(monthStart)
  d.setMonth(d.getMonth() + 1)
  d.setDate(0)
  d.setHours(23, 59, 59, 999)
  return d
}

function isCanceledStatus(status: string) {
  const value = status.toLowerCase()
  return value === 'canceled' || value === 'cancelled'
}

export default function CalendarPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Session | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [enrollStudentId, setEnrollStudentId] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showCanceled, setShowCanceled] = useState(false)
  const [viewMode, setViewMode] = useState<CalendarView>('week')
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date()))
  const [currentMonthStart, setCurrentMonthStart] = useState(() => startOfMonth(new Date()))
  const [showAddToWaitlistAction, setShowAddToWaitlistAction] = useState(false)

  useEffect(() => {
    if (!selected?.id) return
    if (!selected.waitlistEntries) {
      void refreshSessionDetail(selected.id)
    }
  }, [selected?.id])

  useEffect(() => {
    void reloadSessions()
  }, [viewMode, currentWeekStart, currentMonthStart])

  useEffect(() => {
    void loadStudents()
  }, [])

  function getActiveRange() {
    if (viewMode === 'month') {
      return { from: currentMonthStart, to: endOfMonth(currentMonthStart) }
    }
    return { from: currentWeekStart, to: endOfWeek(currentWeekStart) }
  }

  async function reloadSessions() {
    const { from, to } = getActiveRange()
    await load(from, to)
  }

  async function load(from: Date, to: Date) {
    setLoading(true)
    setError('')
    try {
      const q = new URLSearchParams({
        fromUtc: from.toISOString(),
        toUtc: to.toISOString(),
      })
      const data = await api.fetchJson('/sessions?' + q.toString())
      if (!Array.isArray(data)) {
        setError('No pudimos cargar las sesiones del calendario.')
        setSessions([])
        setSelected(null)
        return
      }
      const nextSessions: Session[] = data
      setSessions(nextSessions)
      setSelected(prev => (prev ? (nextSessions.find(s => s.id === prev.id) ?? null) : prev))
    } catch {
      setError('No pudimos cargar las sesiones del calendario.')
    } finally {
      setLoading(false)
    }
  }

  async function loadStudents() {
    try {
      const data = await api.fetchJson('/students')
      if (!Array.isArray(data)) {
        setStudents([])
        setError('No pudimos cargar la lista de alumnos.')
        return
      }
      setStudents(data)
    } catch {
      setStudents([])
      setError('No pudimos cargar la lista de alumnos.')
    }
  }

  async function fetchJsonWithStatus(path: string, opts: RequestInit = {}) {
    const response = await fetch(`/api${path}`, {
      ...opts,
      credentials: 'include',
    })
    const text = await response.text()
    let body: any = null
    if (text) {
      try {
        body = JSON.parse(text)
      } catch {
        body = text
      }
    }
    return { status: response.status, ok: response.ok, body }
  }

  async function refreshSessionDetail(sessionId: string) {
    try {
      const res = await fetchJsonWithStatus(`/sessions/${sessionId}`)
      if (!res.ok || !res.body) return
      const detailedSession = res.body as Session
      setSelected(prev => (prev?.id === sessionId ? detailedSession : prev))
      setSessions(prev => prev.map(session => (session.id === sessionId ? { ...session, ...detailedSession } : session)))
    } catch {
      setError('Error cargando detalle de sesión')
    }
  }

  async function enroll(sessionId: string) {
    if (!enrollStudentId) return
    setError('')
    setSuccess('')
    setShowAddToWaitlistAction(false)
    try {
      const res = await fetchJsonWithStatus('/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, studentId: enrollStudentId }),
      })

      if (!res.ok) {
        if (res.status === 409 && res.body?.error === 'session_full') {
          setError('La sesión está completa')
          setShowAddToWaitlistAction(true)
          return
        }
        setError(String(res.body?.error ?? 'Error al inscribir alumno'))
        return
      }

      setSuccess('Alumno inscripto correctamente')
      setShowAddToWaitlistAction(false)
      setEnrollStudentId('')
      await reloadSessions()
      await refreshSessionDetail(sessionId)
    } catch {
      setError('Error al inscribir alumno')
    }
  }

  async function addToWaitlist(sessionId: string) {
    if (!enrollStudentId) return
    setError('')
    setSuccess('')
    try {
      const res = await fetchJsonWithStatus(`/sessions/${sessionId}/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: enrollStudentId }),
      })

      if (!res.ok) {
        if (res.status === 409 && res.body?.error === 'already_waitlisted') {
          setError('El alumno ya está en la lista de espera')
          return
        }
        setError(String(res.body?.error ?? 'Error agregando a lista de espera'))
        return
      }

      setSuccess('Alumno agregado a lista de espera')
      setShowAddToWaitlistAction(false)
      await refreshSessionDetail(sessionId)
    } catch {
      setError('Error agregando a lista de espera')
    }
  }

  async function cancelSession(sessionId: string) {
    const ok = window.confirm('¿Seguro que querés cancelar esta sesión?')
    if (!ok) return
    setError('')
    setSuccess('')
    try {
      const res = await api.fetchJson(`/sessions/${sessionId}`, { method: 'DELETE' })
      if (res?.error) {
        setError(String(res.error))
        return
      }
      setSuccess('Sesión cancelada correctamente')
      await reloadSessions()
    } catch {
      setError('Error al cancelar sesión')
    }
  }

  async function unenroll(enrollmentId: string) {
    setError('')
    setSuccess('')
    try {
      const res = await api.fetchJson(`/enrollments/${enrollmentId}`, { method: 'DELETE' })
      if (res?.error) {
        setError(String(res.error))
        return
      }
      setSuccess('Alumno desinscripto correctamente')
      await reloadSessions()
    } catch {
      setError('Error al desinscribir alumno')
    }
  }

  async function removeFromWaitlist(waitlistId: string) {
    setError('')
    setSuccess('')
    try {
      const res = await fetchJsonWithStatus(`/waitlist/${waitlistId}`, { method: 'DELETE' })
      if (!res.ok) {
        setError(String(res.body?.error ?? 'Error quitando de lista de espera'))
        return
      }
      setSuccess('Alumno removido de lista de espera')
      if (selected?.id) {
        await refreshSessionDetail(selected.id)
      }
    } catch {
      setError('Error quitando de lista de espera')
    }
  }

  function changeWeek(deltaWeeks: number) {
    setCurrentWeekStart(prev => {
      const next = new Date(prev)
      next.setDate(next.getDate() + deltaWeeks * 7)
      return next
    })
  }

  function goToTodayWeek() {
    setCurrentWeekStart(startOfWeek(new Date()))
  }

  function changeMonth(deltaMonths: number) {
    setCurrentMonthStart(prev => {
      const next = new Date(prev)
      next.setMonth(next.getMonth() + deltaMonths)
      return startOfMonth(next)
    })
  }

  function goToTodayMonth() {
    setCurrentMonthStart(startOfMonth(new Date()))
  }

  function formatWeekRange(weekStart: Date) {
    const weekEnd = endOfWeek(weekStart)
    const from = weekStart.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
    const to = weekEnd.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
    return `${from} - ${to}`
  }

  function formatMonthRange(monthStart: Date) {
    return monthStart.toLocaleDateString('es-AR', {
      month: 'long',
      year: 'numeric',
    })
  }

  const filteredSessions = showCanceled ? sessions : sessions.filter(s => !isCanceledStatus(s.status))

  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(currentWeekStart)
    day.setDate(day.getDate() + index)
    return day
  })

  function isSameDay(utc: string, day: Date) {
    const d = new Date(utc)
    return (
      d.getFullYear() === day.getFullYear() &&
      d.getMonth() === day.getMonth() &&
      d.getDate() === day.getDate()
    )
  }

  function sortByStartDate(list: Session[]) {
    return [...list].sort((a, b) => new Date(a.startUtc).getTime() - new Date(b.startUtc).getTime())
  }

  const weekSessionsByDay = weekDays.map(day =>
    sortByStartDate(filteredSessions.filter(session => isSameDay(session.startUtc, day))),
  )

  const monthGridDays = (() => {
    const firstDayInGrid = startOfWeek(currentMonthStart)
    const lastDayInGrid = endOfWeek(endOfMonth(currentMonthStart))
    const days: Date[] = []
    const cursor = new Date(firstDayInGrid)

    while (cursor <= lastDayInGrid) {
      days.push(new Date(cursor))
      cursor.setDate(cursor.getDate() + 1)
    }

    return days
  })()

  function formatDate(utc: string) {
    return new Date(utc).toLocaleString('es-AR', {
      weekday: 'short', day: '2-digit', month: 'short',
      hour: '2-digit', minute: '2-digit',
    })
  }

  function getDuration(startUtc: string, endUtc: string) {
    const ms = new Date(endUtc).getTime() - new Date(startUtc).getTime()
    return Math.round(ms / 60000)
  }

  function getActiveEnrollmentsCount(session: Session) {
    return (session.enrollments || []).filter(e => e.status !== 'cancelled').length
  }

  return (
    <div>
      <div className="page-header">
        <h2>Calendario</h2>
        <span className="badge badge-info">{filteredSessions.length} sesiones</span>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="card">
        <div className="card-header">
          <h3>Sesiones</h3>
          <div className="flex gap-2 items-center">
            <button
              className={`btn btn-sm ${viewMode === 'week' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setViewMode('week')}
            >
              Semana
            </button>
            <button
              className={`btn btn-sm ${viewMode === 'month' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setViewMode('month')}
            >
              Mes
            </button>
            {viewMode === 'week' ? (
              <>
                <button className="btn btn-ghost btn-sm" onClick={() => changeWeek(-1)}>Semana anterior</button>
                <button className="btn btn-ghost btn-sm" onClick={goToTodayWeek}>Hoy</button>
                <button className="btn btn-ghost btn-sm" onClick={() => changeWeek(1)}>Semana siguiente</button>
                <span className="badge badge-info">{formatWeekRange(currentWeekStart)}</span>
              </>
            ) : (
              <>
                <button className="btn btn-ghost btn-sm" onClick={() => changeMonth(-1)}>Mes anterior</button>
                <button className="btn btn-ghost btn-sm" onClick={goToTodayMonth}>Hoy</button>
                <button className="btn btn-ghost btn-sm" onClick={() => changeMonth(1)}>Mes siguiente</button>
                <span className="badge badge-info" style={{ textTransform: 'capitalize' }}>{formatMonthRange(currentMonthStart)}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex gap-2 items-center" style={{ marginBottom: '12px' }}>
          <label className="text-sm text-muted" htmlFor="show-canceled">Mostrar canceladas</label>
          <input
            id="show-canceled"
            type="checkbox"
            checked={showCanceled}
            onChange={e => setShowCanceled(e.target.checked)}
          />
        </div>
        {loading ? (
          <div className="loading">Cargando sesiones...</div>
        ) : filteredSessions.length === 0 ? (
          <div className="empty-state"><p>No hay sesiones en este período</p></div>
        ) : viewMode === 'week' ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
              gap: '10px',
            }}
          >
            {weekDays.map((day, index) => (
              <div key={day.toISOString()} className="card" style={{ margin: 0, padding: '10px', minHeight: '220px' }}>
                <div className="text-sm" style={{ fontWeight: 700, marginBottom: '8px' }}>
                  {day.toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                </div>
                {weekSessionsByDay[index].length === 0 ? (
                  <div className="text-sm text-muted">Sin sesiones</div>
                ) : (
                  <div style={{ display: 'grid', gap: '6px' }}>
                    {weekSessionsByDay[index].map(session => {
                      const isGroup = session.template?.isGroup
                      const selectedRow = selected?.id === session.id
                      return (
                        <button
                          key={session.id}
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => setSelected(selectedRow ? null : session)}
                          style={{
                            justifyContent: 'flex-start',
                            textAlign: 'left',
                            height: 'auto',
                            padding: '8px',
                            border: selectedRow ? '1px solid #ec4899' : '1px solid #F3F4F6',
                            borderRadius: '10px',
                            background: '#fff',
                          }}
                        >
                          <div style={{ display: 'grid', gap: '4px', width: '100%' }}>
                            <div className="text-sm" style={{ fontWeight: 700 }}>
                              {new Date(session.startUtc).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div className="text-sm">{session.template?.title ?? 'Sesión'}</div>
                            <div>
                              <span className={`badge ${isGroup ? 'badge-info' : 'badge-warning'}`}>
                                {isGroup ? 'Grupal' : 'Privada'}
                              </span>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
              gap: '8px',
            }}
          >
            {['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'].map(label => (
              <div key={label} className="text-sm text-muted" style={{ fontWeight: 700 }}>{label}</div>
            ))}
            {monthGridDays.map(day => {
              const daySessions = sortByStartDate(filteredSessions.filter(session => isSameDay(session.startUtc, day)))
              const isCurrentMonth = day.getMonth() === currentMonthStart.getMonth()
              const overflowCount = Math.max(0, daySessions.length - 2)
              return (
                <div
                  key={day.toISOString()}
                  style={{
                    border: '1px solid #F3F4F6',
                    borderRadius: '10px',
                    padding: '8px',
                    minHeight: '120px',
                    background: isCurrentMonth ? '#fff' : '#FAFAFA',
                    opacity: isCurrentMonth ? 1 : 0.65,
                  }}
                >
                  <div className="text-sm" style={{ fontWeight: 700, marginBottom: '6px' }}>
                    {day.toLocaleDateString('es-AR', { day: '2-digit' })}
                  </div>
                  {daySessions.length > 0 && (
                    <div className="text-sm text-muted" style={{ marginBottom: '6px' }}>
                      {daySessions.length} sesión{daySessions.length === 1 ? '' : 'es'}
                    </div>
                  )}
                  <div style={{ display: 'grid', gap: '4px' }}>
                    {daySessions.slice(0, 2).map(session => (
                      <button
                        key={session.id}
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => setSelected(selected?.id === session.id ? null : session)}
                        style={{
                          justifyContent: 'space-between',
                          border: '1px solid #F3F4F6',
                          borderRadius: '8px',
                          background: '#fff',
                          height: 'auto',
                          padding: '6px 8px',
                          textAlign: 'left',
                        }}
                      >
                        <span className="text-sm" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {session.template?.title ?? 'Sesión'}
                        </span>
                        <span className={`badge ${session.template?.isGroup ? 'badge-info' : 'badge-warning'}`}>
                          {session.template?.isGroup ? 'G' : 'P'}
                        </span>
                      </button>
                    ))}
                    {overflowCount > 0 && (
                      <div className="text-sm text-muted">+{overflowCount} más</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {selected && (
        <div className="card" style={{ marginTop: 0 }}>
          <div className="card-header">
            <h3>{selected.template?.title ?? 'Sesión'}</h3>
            <div className="flex gap-2 items-center">
              <span className={`badge ${selected.status === 'scheduled' ? 'badge-success' : 'badge-error'}`}>
                {selected.status}
              </span>
              {!!selected.template?.isGroup && !!selected.capacitySnapshot && getActiveEnrollmentsCount(selected) >= selected.capacitySnapshot && (
                <span className="badge badge-error">Completa</span>
              )}
              {!!(selected.waitlistEntries && selected.waitlistEntries.length > 0) && (
                <span className="badge badge-warning">{selected.waitlistEntries.length} en espera</span>
              )}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <div className="text-sm text-muted">Inicio</div>
              <div style={{ fontWeight: 600 }}>{formatDate(selected.startUtc)}</div>
            </div>
            <div>
              <div className="text-sm text-muted">Duración</div>
              <div style={{ fontWeight: 600 }}>{getDuration(selected.startUtc, selected.endUtc)} minutos</div>
            </div>
          </div>

          {selected.template?.isGroup && selected.capacitySnapshot && (
            <div style={{ marginBottom: '16px' }}>
              <div className="text-sm text-muted">Cupos</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ flex: 1, height: '8px', background: '#F3F4F6', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${Math.min(100, (getActiveEnrollmentsCount(selected) / selected.capacitySnapshot) * 100)}%`,
                    height: '100%',
                    background: 'linear-gradient(135deg, #EC4899, #8B5CF6)',
                    borderRadius: '4px',
                  }} />
                </div>
                <span className="text-sm" style={{ fontWeight: 600 }}>
                  {getActiveEnrollmentsCount(selected)}/{selected.capacitySnapshot}
                </span>
              </div>
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <div className="text-sm text-muted" style={{ marginBottom: '6px' }}>Inscriptos</div>
            {!selected.enrollments || selected.enrollments.length === 0 ? (
              <div className="text-sm text-muted">No hay alumnos inscriptos todavía.</div>
            ) : (
              selected.enrollments.map(e => (
                <div key={e.id} className="flex gap-2 items-center" style={{ marginBottom: '6px' }}>
                  <div className="badge badge-success">
                    {e.student?.name ?? e.studentId}
                  </div>
                  <button className="btn btn-danger btn-sm" onClick={() => unenroll(e.id)}>
                    Desinscribir
                  </button>
                </div>
              ))
            )}
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div className="text-sm text-muted" style={{ marginBottom: '6px' }}>Lista de espera</div>
            {!selected.waitlistEntries ? (
              <div className="text-sm text-muted">Cargando lista de espera...</div>
            ) : selected.waitlistEntries.length === 0 ? (
              <div className="text-sm text-muted">No hay alumnos en lista de espera.</div>
            ) : (
              selected.waitlistEntries.map(entry => (
                <div key={entry.id} className="flex gap-2 items-center" style={{ marginBottom: '6px', justifyContent: 'space-between' }}>
                  <div className="text-sm">
                    #{entry.position} · {entry.student?.name ?? entry.studentId}
                  </div>
                  <button className="btn btn-danger btn-sm" onClick={() => removeFromWaitlist(entry.id)}>
                    Quitar
                  </button>
                </div>
              ))
            )}
          </div>

          <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: '16px' }}>
            <div className="text-sm text-muted" style={{ marginBottom: '8px' }}>Inscribir alumno</div>
            <div className="flex gap-2 items-center">
              <select
                value={enrollStudentId}
                onChange={e => setEnrollStudentId(e.target.value)}
                style={{ flex: 1, padding: '9px 12px', border: '1.5px solid #F9A8D4', borderRadius: '10px', fontSize: '0.875rem', fontFamily: 'inherit', outline: 'none', cursor: 'pointer' }}
              >
                <option value="">Seleccionar alumno...</option>
                {students.map(st => (
                  <option key={st.id} value={st.id}>{st.name} ({st.email})</option>
                ))}
              </select>
              <button className="btn btn-primary" onClick={() => enroll(selected.id)} disabled={!enrollStudentId}>
                Inscribir
              </button>
              {showAddToWaitlistAction && (
                <button className="btn btn-secondary" onClick={() => addToWaitlist(selected.id)} disabled={!enrollStudentId}>
                  Agregar a lista de espera
                </button>
              )}
              <button className="btn btn-danger" onClick={() => cancelSession(selected.id)}>
                Cancelar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
