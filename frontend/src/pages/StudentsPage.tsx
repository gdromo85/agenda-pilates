import React, { useEffect, useState } from 'react'
import api from '../api'

type Student = { id: string; name: string; email: string; phone?: string }

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const data = await api.fetchJson('/students')
      setStudents(data || [])
    } catch {
      setError('Error loading students')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function create(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const res = await api.fetchJson('/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone }),
      })
      if (res?.error) { setError(typeof res.error === 'string' ? res.error : JSON.stringify(res.error)); return }
      setName(''); setEmail(''); setPhone('')
      load()
    } catch {
      setError('Error creating student')
    } finally {
      setSubmitting(false)
    }
  }

  async function del(id: string) {
    if (!confirm('¿Eliminar este alumno?')) return
    await api.fetchJson(`/students/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div>
      <div className="page-header">
        <h2>Alumnos</h2>
      </div>

      <div className="card">
        <div className="card-header"><h3>Agregar nuevo alumno</h3></div>
        <form onSubmit={create}>
          <div className="form-row">
            <div className="form-group">
              <label>Nombre</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Nombre completo" required />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@ejemplo.com" required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Teléfono</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+54 9 11 1234 5678" />
            </div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button className="btn btn-primary" type="submit" disabled={submitting}>
                {submitting ? <><span className="spinner" /> Guardando...</> : '+ Agregar'}
              </button>
            </div>
          </div>
          {error && <div className="alert alert-error">{error}</div>}
        </form>
      </div>

      <div className="card">
        <div className="card-header"><h3>Todos los alumnos ({students.length})</h3></div>
        {loading ? (
          <div className="loading">Cargando alumnos...</div>
        ) : students.length === 0 ? (
          <div className="empty-state">
            <p>No hay alumnos registrados</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Teléfono</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {students.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                    <td>{s.email}</td>
                    <td className="text-muted">{s.phone ?? '—'}</td>
                    <td className="text-right">
                      <button className="btn btn-danger btn-sm" onClick={() => del(s.id)}>Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
