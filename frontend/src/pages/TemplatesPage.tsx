import React, { useEffect, useState } from 'react'

const RRULE_EXAMPLES = [
  { label: 'Semanal (lunes)', value: 'FREQ=WEEKLY;BYDAY=MO' },
  { label: 'Semanal (martes y jueves)', value: 'FREQ=WEEKLY;BYDAY=TU,TH' },
  { label: 'Quincenal (lunes)', value: 'FREQ=WEEKLY;INTERVAL=2;BYDAY=MO' },
  { label: 'Diaria', value: 'FREQ=DAILY' },
]

type Template = {
  id: string
  title: string
  description?: string
  isGroup: boolean
  capacity?: number
  startTimeLocal: string
  recurrenceRule: string
  active: boolean
  reminderOffsetMinutes: number
  sessionCount?: number
  _count?: {
    sessions: number
  }
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isGroup, setIsGroup] = useState(true)
  const [capacity, setCapacity] = useState<string>('')
  const [startTimeLocal, setStartTimeLocal] = useState('09:00')
  const [startDateLocal, setStartDateLocal] = useState('')
  const [durationMinutes, setDurationMinutes] = useState(60)
  const [recurrenceRule, setRecurrenceRule] = useState('FREQ=WEEKLY;BYDAY=MO')
  const [reminderOffsetMinutes, setReminderOffsetMinutes] = useState(1440)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const API_BASE = '/api'

  async function loadTemplates() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/templates`, { credentials: 'include' })
      if (!res.ok) {
        setError('No pudimos cargar las clases. Intentá nuevamente.')
        setTemplates([])
        return
      }
      const data = await res.json()
      if (!Array.isArray(data)) {
        setError('El formato de datos de clases no es válido.')
        setTemplates([])
        return
      }
      setTemplates(data)
    } catch {
      setError('No pudimos cargar las clases. Intentá nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadTemplates() }, [])

  async function viewTemplateDetail(template: Template) {
    try {
      const res = await fetch(`${API_BASE}/templates/${template.id}`, { credentials: 'include' })

      if (!res.ok) {
        setError('No pudimos cargar los detalles de la clase.')
        return
      }

      const data = await res.json()

      const upcomingSessions = Array.isArray(data?.upcomingSessions) ? data.upcomingSessions.length : 0
      alert(`Sesiones futuras: ${upcomingSessions}`)
    } catch {
      setError('No pudimos cargar los detalles de la clase.')
    }
  }

  async function promptEditTemplate(template: Template) {
    const nextTitle = prompt('Nuevo título de la clase (opcional):', template.title)

    if (nextTitle === null) return

    const trimmedTitle = nextTitle.trim()
    if (trimmedTitle.length === 0 || trimmedTitle === template.title) return

    try {
      const res = await fetch(`${API_BASE}/templates/${template.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title: trimmedTitle }),
      })

      if (!res.ok) {
        setError('No pudimos actualizar la clase.')
        return
      }

      await loadTemplates()
    } catch {
      setError('No pudimos actualizar la clase por un problema de red.')
    }
  }

  async function deleteTemplate(template: Template) {
    if (!confirm(`¿Eliminar la clase "${template.title}"?`)) return

    try {
      const res = await fetch(`${API_BASE}/templates/${template.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!res.ok) {
        setError('No pudimos eliminar la clase.')
        return
      }

      await loadTemplates()
    } catch {
      setError('No pudimos eliminar la clase.')
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSubmitting(true)

    const body = {
      title,
      description,
      isGroup,
      capacity: capacity === '' ? undefined : Number(capacity),
      startTimeLocal,
      startDateLocal: startDateLocal || undefined,
      durationMinutes,
      recurrenceRule,
      reminderOffsetMinutes,
    }

    try {
      const res = await fetch(`${API_BASE}/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })

      if (res.status === 409) {
        const payload = await res.json()
        setError('Conflicto con clases existentes: ' + JSON.stringify(payload.conflicts))
        return
      }

      if (!res.ok) {
        const payload = await res.json()
        setError('No pudimos crear la clase: ' + (payload.error ?? res.statusText))
        return
      }

      const created = await res.json()
      setSuccess(`✅ Clase "${title}" creada — ${created.createdSessions} sesiones generadas`)
      setTitle('')
      setDescription('')
      setCapacity('')
      setStartDateLocal('')
      await loadTemplates()
    } catch {
      setError('No pudimos crear la clase por un problema de red.')
    } finally {
      setSubmitting(false)
    }
  }

  function getSessionsCount(template: Template): number {
    if (template._count?.sessions !== undefined) return template._count.sessions
    return template.sessionCount ?? 0
  }

  return (
    <div>
      <div className="page-header">
        <h2>Clases</h2>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card" style={{ marginBottom: '32px' }}>
        <div className="card-header"><h3>Clases existentes</h3></div>

        {loading ? (
          <div className="loading">Cargando...</div>
        ) : templates.length === 0 ? (
          <div className="empty-state"><p>Todavía no hay clases creadas. Creá la primera desde el formulario.</p></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
            {templates.map(t => (
              <div key={t.id} className="card">
                <div className="card-header">
                  <h3>{t.title}</h3>
                  <span className={`badge ${t.isGroup ? 'badge-info' : 'badge-warning'}`}>
                    {t.isGroup ? 'Grupal' : 'Privada'}
                  </span>
                </div>
                <div style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '12px' }}>
                  <div><strong>Hora:</strong> {t.startTimeLocal}</div>
                  <div><strong>Recurrencia:</strong> {t.recurrenceRule}</div>
                  <div><strong>Capacidad:</strong> {t.capacity ?? 'Ilimitado'}</div>
                  <div><strong>Sesiones:</strong> {getSessionsCount(t)}</div>
                  <div><strong>Estado:</strong> {t.active ? 'active' : 'inactive'}</div>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <button className="btn btn-sm btn-ghost" onClick={() => viewTemplateDetail(t)}>Ver</button>
                  <button className="btn btn-sm btn-ghost" onClick={() => promptEditTemplate(t)}>Editar</button>
                  <button className="btn btn-sm btn-danger" onClick={() => deleteTemplate(t)}>Eliminar</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: '32px' }}>
        <div className="card-header"><h3>Crear nueva clase</h3></div>
        <form onSubmit={create}>
          <div className="form-group">
            <label>Nombre de la clase</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej: Pilates Mat Nivel 2" required />
          </div>

          <div className="form-group">
            <label>Descripción</label>
            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Descripción opcional" />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Fecha de inicio</label>
              <input type="date" value={startDateLocal} onChange={e => setStartDateLocal(e.target.value)} />
              <div className="form-hint">Primera fecha de la recurrencia</div>
            </div>
            <div className="form-group">
              <label>Hora</label>
              <input type="time" value={startTimeLocal} onChange={e => setStartTimeLocal(e.target.value)} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Duración (minutos)</label>
              <input type="number" value={durationMinutes} onChange={e => setDurationMinutes(Number(e.target.value))} min="15" step="15" />
            </div>
            <div className="form-group">
              <label>Capacidad</label>
              <input type="number" value={capacity} onChange={e => setCapacity(e.target.value)} placeholder="Ilimitado" min="1" />
              <div className="form-hint">Dejar vacío para ilimitado</div>
            </div>
          </div>

          <div className="form-group">
            <label>Regla de recurrencia</label>
            <input value={recurrenceRule} onChange={e => setRecurrenceRule(e.target.value)} placeholder="FREQ=WEEKLY;BYDAY=MO" />
            <div className="form-hint">Formato RRULE (RFC 5545)</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
              {RRULE_EXAMPLES.map(ex => (
                <button
                  key={ex.value}
                  type="button"
                  className={`btn btn-sm ${recurrenceRule === ex.value ? 'btn-secondary' : 'btn-ghost'}`}
                  onClick={() => setRecurrenceRule(ex.value)}
                >
                  {ex.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Recordatorio (minutos antes)</label>
            <input type="number" value={reminderOffsetMinutes} onChange={e => setReminderOffsetMinutes(Number(e.target.value))} min="30" />
            <div className="form-hint">1440 min = 24 horas. 60 min = 1 hora.</div>
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'none', fontSize: '0.875rem', fontWeight: 500 }}>
              <input type="checkbox" checked={isGroup} onChange={e => setIsGroup(e.target.checked)} style={{ width: 'auto' }} />
              Clase grupal
            </label>
          </div>

          {success && <div className="alert alert-success">{success}</div>}

          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? <><span className="spinner" /> Creando...</> : '💫 Crear clase'}
          </button>
        </form>
      </div>
    </div>
  )
}
