import React, { useMemo, useState } from 'react'
import api from '../api'

type NotificationStudent = {
  id: string
  name: string
  email: string
  phone?: string | null
}

type PendingSession = {
  sessionId: string
  classTitle: string
  startUtc: string
  students: NotificationStudent[]
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDateTime(utc: string) {
  return new Date(utc).toLocaleString('es-AR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function NotificationsPage() {
  const today = new Date()
  const [fromDate, setFromDate] = useState(toDateInputValue(today))
  const nextDay = new Date(today)
  nextDay.setDate(nextDay.getDate() + 7)
  const [toDate, setToDate] = useState(toDateInputValue(nextDay))

  const [pending, setPending] = useState<PendingSession[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState('')
  const [message, setMessage] = useState('')

  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null)

  const selectedSession = useMemo(
    () => pending.find(item => item.sessionId === selectedSessionId) ?? null,
    [pending, selectedSessionId],
  )

  async function loadPending() {
    setLoading(true)
    setError('')
    setResult(null)

    const fromUtc = new Date(`${fromDate}T00:00:00`).toISOString()
    const toUtc = new Date(`${toDate}T23:59:59`).toISOString()

    try {
      const query = new URLSearchParams({ fromUtc, toUtc })
      const data = await api.fetchJson(`/notifications/pending?${query.toString()}`)

      if (!Array.isArray(data)) {
        setError('No pudimos obtener las sesiones pendientes.')
        setPending([])
        setSelectedSessionId('')
        return
      }

      setPending(data)
      if (data.length > 0) {
        setSelectedSessionId(prev => prev || data[0].sessionId)
      } else {
        setSelectedSessionId('')
      }
    } catch {
      setError('No pudimos obtener las sesiones pendientes.')
      setPending([])
      setSelectedSessionId('')
    } finally {
      setLoading(false)
    }
  }

  async function sendReminder() {
    if (!selectedSessionId) {
      setError('Seleccioná una sesión para enviar recordatorios.')
      return
    }

    setSending(true)
    setError('')
    setResult(null)

    try {
      const payload: { sessionId: string; message?: string } = {
        sessionId: selectedSessionId,
      }
      if (message.trim()) payload.message = message.trim()

      const data = await api.fetchJson('/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!data || typeof data.sent !== 'number' || typeof data.failed !== 'number') {
        setError('No pudimos enviar recordatorios.')
        return
      }

      setResult({ sent: data.sent, failed: data.failed })
    } catch {
      setError('No pudimos enviar recordatorios.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <h2>Notificaciones</h2>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {result && <div className="alert alert-success">Resultado: enviados {result.sent}, fallidos {result.failed}</div>}

      <div className="card">
        <div className="card-header">
          <h3>Filtros</h3>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Desde</label>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Hasta</label>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
          </div>
        </div>
        <button className="btn btn-primary" onClick={loadPending} disabled={loading}>
          {loading ? <><span className="spinner" /> Cargando...</> : 'Buscar pendientes'}
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Sesiones pendientes</h3>
        </div>

        {pending.length === 0 ? (
          <div className="empty-state" style={{ padding: '20px 12px' }}>
            <p>No hay sesiones pendientes en el rango seleccionado.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th></th>
                  <th>Clase</th>
                  <th>Inicio</th>
                  <th>Alumnos</th>
                </tr>
              </thead>
              <tbody>
                {pending.map(item => (
                  <tr key={item.sessionId}>
                    <td>
                      <input
                        type="radio"
                        name="selectedSession"
                        checked={selectedSessionId === item.sessionId}
                        onChange={() => setSelectedSessionId(item.sessionId)}
                      />
                    </td>
                    <td>{item.classTitle}</td>
                    <td>{formatDateTime(item.startUtc)}</td>
                    <td>{item.students.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Enviar recordatorio</h3>
        </div>
        <div className="form-group">
          <label>Mensaje (opcional)</label>
          <textarea
            rows={3}
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Si lo dejás vacío, se usa el mensaje por defecto"
          />
        </div>
        <div className="text-muted mb-2">
          {selectedSession
            ? `Sesión seleccionada: ${selectedSession.classTitle} (${selectedSession.students.length} alumnos)`
            : 'Seleccioná una sesión en la tabla para enviar.'}
        </div>
        <button className="btn btn-primary" onClick={sendReminder} disabled={sending || !selectedSessionId}>
          {sending ? <><span className="spinner" /> Enviando...</> : 'Enviar recordatorio'}
        </button>
      </div>
    </div>
  )
}
