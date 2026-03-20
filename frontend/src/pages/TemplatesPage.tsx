import React, { useState } from 'react'
import api from '../api'

const RRULE_EXAMPLES = [
  { label: 'Semanal (lunes)', value: 'FREQ=WEEKLY;BYDAY=MO' },
  { label: 'Semanal (martes y jueves)', value: 'FREQ=WEEKLY;BYDAY=TU,TH' },
  { label: 'Quincenal (lunes)', value: 'FREQ=WEEKLY;INTERVAL=2;BYDAY=MO' },
  { label: 'Diaria', value: 'FREQ=DAILY' },
]

export default function TemplatesPage() {
  const [title, setTitle] = useState('')
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

  async function create(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSubmitting(true)

    const body = {
      title,
      isGroup,
      capacity: capacity === '' ? undefined : Number(capacity),
      startTimeLocal,
      startDateLocal: startDateLocal || undefined,
      durationMinutes,
      recurrenceRule,
      reminderOffsetMinutes,
    }

    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })

      if (res.status === 409) {
        const payload = await res.json()
        setError('⚠️ Conflicto con clases existentes: ' + JSON.stringify(payload.conflicts))
        return
      }

      if (!res.ok) {
        const payload = await res.json()
        setError('Error: ' + (payload.error ?? res.statusText))
        return
      }

      const created = await res.json()
      setSuccess(`✅ Clase "${title}" creada — ${created.createdSessions} sesiones generadas`)
      setTitle('')
      setCapacity('')
    } catch {
      setError('Error de red al crear la clase')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <h2>Crear clase</h2>
      </div>

      <div className="card">
        <div className="card-header"><h3>Nueva clase</h3></div>
        <form onSubmit={create}>
          <div className="form-group">
            <label>Nombre de la clase</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej: Pilates Mat Nivel 2" required />
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

          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? <><span className="spinner" /> Creando...</> : '💫 Crear clase'}
          </button>
        </form>
      </div>
    </div>
  )
}
