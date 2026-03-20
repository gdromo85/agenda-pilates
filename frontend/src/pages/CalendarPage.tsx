import React, { useEffect, useState } from 'react'
import api from '../api'

type Session = {
  id: string
  startUtc: string
  endUtc: string
  status: string
  capacitySnapshot?: number
  template?: { title?: string; isGroup?: boolean; capacity?: number }
  enrollments?: Array<{ id: string; studentId: string; student?: { name?: string } }>
}

type Student = { id: string; name: string; email: string }

export default function CalendarPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Session | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [enrollStudentId, setEnrollStudentId] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Date range: last 7 days + next 30 days
  useEffect(() => {
    const now = new Date()
    const from = new Date(now)
    from.setDate(from.getDate() - 7)
    const to = new Date(now)
    to.setDate(to.getDate() + 30)
    load(new Date(from), new Date(to))
    loadStudents()
  }, [])

  async function load(from: Date, to: Date) {
    setLoading(true)
    try {
      const q = new URLSearchParams({
        fromUtc: from.toISOString(),
        toUtc: to.toISOString(),
      })
      const data = await api.fetchJson('/sessions?' + q.toString())
      setSessions(data || [])
    } catch {
      setError('Error cargando sesiones')
    } finally {
      setLoading(false)
    }
  }

  async function loadStudents() {
    const data = await api.fetchJson('/students')
    setStudents(data || [])
  }

  async function enroll(sessionId: string) {
    if (!enrollStudentId) return
    setError('')
    setSuccess('')
    try {
      const res = await api.fetchJson('/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, studentId: enrollStudentId }),
      })
      if (res?.error) { setError(String(res.error)); return }
      setSuccess('Alumno inscripto correctamente')
      setEnrollStudentId('')
      // Refresh selected
      if (selected) {
        setSelected({ ...selected })
      }
    } catch {
      setError('Error al inscribir alumno')
    }
  }

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

  return (
    <div>
      <div className="page-header">
        <h2>Calendario</h2>
        <span className="badge badge-info">{sessions.length} sesiones</span>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="card">
        <div className="card-header"><h3>Sesiones</h3></div>
        {loading ? (
          <div className="loading">Cargando sesiones...</div>
        ) : sessions.length === 0 ? (
          <div className="empty-state"><p>No hay sesiones en este período</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Horario</th>
                  <th>Clase</th>
                  <th>Tipo</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sessions.map(s => {
                  const isGroup = s.template?.isGroup
                  const dur = getDuration(s.startUtc, s.endUtc)
                  const enrolled = s.enrollments?.length ?? 0
                  return (
                    <tr key={s.id} className={selected?.id === s.id ? 'selected' : ''}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelected(selected?.id === s.id ? null : s)}>
                      <td style={{ fontWeight: 600 }}>{formatDate(s.startUtc).split(',')[0]}</td>
                      <td>{formatDate(s.startUtc).split(',')[1]} · {dur} min</td>
                      <td>{s.template?.title ?? '—'}</td>
                      <td>
                        <span className={`badge ${isGroup ? 'badge-info' : 'badge-warning'}`}>
                          {isGroup ? 'Grupal' : 'Privada'}
                        </span>
                      </td>
                      <td className="text-right">
                        <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); setSelected(selected?.id === s.id ? null : s) }}>
                          {selected?.id === s.id ? 'Ocultar' : 'Ver'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <div className="card" style={{ marginTop: 0 }}>
          <div className="card-header">
            <h3>{selected.template?.title ?? 'Sesión'}</h3>
            <span className={`badge ${selected.status === 'scheduled' ? 'badge-success' : 'badge-error'}`}>
              {selected.status}
            </span>
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
                    width: `${Math.min(100, ((selected.enrollments?.length ?? 0) / selected.capacitySnapshot) * 100)}%`,
                    height: '100%',
                    background: 'linear-gradient(135deg, #EC4899, #8B5CF6)',
                    borderRadius: '4px',
                  }} />
                </div>
                <span className="text-sm" style={{ fontWeight: 600 }}>
                  {selected.enrollments?.length ?? 0}/{selected.capacitySnapshot}
                </span>
              </div>
            </div>
          )}

          {selected.enrollments && selected.enrollments.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div className="text-sm text-muted" style={{ marginBottom: '6px' }}>Inscriptos</div>
              {selected.enrollments.map(e => (
                <div key={e.id} className="badge badge-success" style={{ marginRight: '4px', marginBottom: '4px' }}>
                  {e.student?.name ?? e.studentId}
                </div>
              ))}
            </div>
          )}

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
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
