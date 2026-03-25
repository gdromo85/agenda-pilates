import React, { useEffect, useState } from 'react'
import api from '../api'

type Student = { id: string; name: string; email: string; phone?: string; notes?: string }
type Enrollment = { id: string; sessionId: string; session: { title: string; date: string; time: string }; status: string }
type WaitlistEntry = { id: string; position: number; session: { title?: string; date?: string; time?: string } }

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  const [detailStudent, setDetailStudent] = useState<Student | null>(null)
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [waitlistEntries, setWaitlistEntries] = useState<WaitlistEntry[] | null>(null)
  const [loadingEnrollments, setLoadingEnrollments] = useState(false)
  const [detailError, setDetailError] = useState('')

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  )

  async function load() {
    setLoading(true)
    setError('')
    try {
      const data = await api.fetchJson('/students')
      if (!Array.isArray(data)) {
        setError('No pudimos cargar los alumnos en este momento.')
        setStudents([])
        return
      }
      setStudents(data)
    } catch {
      setError('No pudimos cargar los alumnos en este momento.')
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
        body: JSON.stringify({ name, email, phone, notes }),
      })
      if (res?.error) { setError(typeof res.error === 'string' ? res.error : JSON.stringify(res.error)); return }
      setName(''); setEmail(''); setPhone(''); setNotes('')
      load()
    } catch {
      setError('No pudimos crear el alumno. Probá nuevamente.')
    } finally {
      setSubmitting(false)
    }
  }

  async function del(id: string) {
    if (!confirm('¿Eliminar este alumno?')) return
    await api.fetchJson(`/students/${id}`, { method: 'DELETE' })
    load()
  }

  function startEdit(s: Student) {
    setEditingId(s.id)
    setEditName(s.name)
    setEditEmail(s.email)
    setEditPhone(s.phone || '')
    setEditNotes(s.notes || '')
  }

  function cancelEdit() {
    setEditingId(null)
    setEditName('')
    setEditEmail('')
    setEditPhone('')
    setEditNotes('')
  }

  async function saveEdit(id: string) {
    setEditSaving(true)
    setError('')
    try {
      const res = await api.fetchJson(`/students/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, email: editEmail, phone: editPhone, notes: editNotes }),
      })
      if (res?.error) {
        alert(typeof res.error === 'string' ? res.error : JSON.stringify(res.error))
        return
      }
      cancelEdit()
      load()
    } catch {
      setError('No pudimos guardar los cambios del alumno.')
    } finally {
      setEditSaving(false)
    }
  }

  async function openDetail(s: Student) {
    setDetailStudent(s)
    setEnrollments([])
    setWaitlistEntries(null)
    setDetailError('')
    setLoadingEnrollments(true)
    try {
      const data = await api.fetchJson(`/students/${s.id}`)
      if (data?.enrollments) {
        setEnrollments(data.enrollments)
      }
      if (Array.isArray(data?.waitlistEntries)) {
        setWaitlistEntries(data.waitlistEntries)
      }
    } catch {
      setDetailError('No pudimos cargar las inscripciones del alumno.')
    } finally {
      setLoadingEnrollments(false)
    }
  }

  function closeDetail() {
    setDetailStudent(null)
    setEnrollments([])
    setWaitlistEntries(null)
  }

  async function unenroll(enrollmentId: string) {
    if (!confirm('¿Desinscribir de esta clase?')) return
    try {
      await api.fetchJson(`/enrollments/${enrollmentId}`, { method: 'DELETE' })
      setEnrollments(prev => prev.filter(e => e.id !== enrollmentId))
    } catch {
      setError('No pudimos desinscribir al alumno de la clase.')
    }
  }

  return (
    <div>
      <div className="page-header">
        <h2>Alumnos</h2>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

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
            <div className="form-group">
              <label>Notas</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notas sobre el alumno" rows={2} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button className="btn btn-primary" type="submit" disabled={submitting}>
                {submitting ? <><span className="spinner" /> Guardando...</> : '+ Agregar'}
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>{search ? `${filteredStudents.length} de ${students.length} alumnos` : `Todos los alumnos (${students.length})`}</h3>
        </div>
        <div className="form-group" style={{ maxWidth: 320, marginBottom: 16 }}>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o email..."
          />
        </div>
        {loading ? (
          <div className="loading">Cargando alumnos...</div>
        ) : filteredStudents.length === 0 ? (
          <div className="empty-state">
            <p>{search ? 'No hay alumnos que coincidan con la búsqueda' : 'No hay alumnos registrados'}</p>
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
                {filteredStudents.map(s => (
                  <tr key={s.id} onClick={() => openDetail(s)} style={{ cursor: 'pointer' }}>
                    {editingId === s.id ? (
                      <>
                        <td><input value={editName} onChange={e => setEditName(e.target.value)} onClick={e => e.stopPropagation()} /></td>
                        <td><input value={editEmail} onChange={e => setEditEmail(e.target.value)} onClick={e => e.stopPropagation()} /></td>
                        <td><input value={editPhone} onChange={e => setEditPhone(e.target.value)} onClick={e => e.stopPropagation()} style={{ width: '100%' }} /></td>
                        <td className="text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
                            <button className="btn btn-primary btn-sm" onClick={() => saveEdit(s.id)} disabled={editSaving}>
                              {editSaving ? '...' : 'Guardar'}
                            </button>
                            <button className="btn btn-ghost btn-sm" onClick={cancelEdit}>Cancelar</button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={{ fontWeight: 600 }}>{s.name}</td>
                        <td>{s.email}</td>
                        <td className="text-muted">{s.phone ?? '—'}</td>
                        <td className="text-right">
                          <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
                            <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); openDetail(s); }}>Detalle</button>
                            <button className="btn btn-secondary btn-sm" onClick={e => { e.stopPropagation(); startEdit(s); }}>Editar</button>
                            <button className="btn btn-danger btn-sm" onClick={e => { e.stopPropagation(); del(s.id); }}>Eliminar</button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {detailStudent && (
        <div className="modal-overlay" onClick={closeDetail}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{detailStudent.name}</h3>
              <button className="modal-close" onClick={closeDetail}>×</button>
            </div>
            <div className="form-group">
              <label>Email</label>
              <p className="text-sm">{detailStudent.email}</p>
            </div>
            <div className="form-group">
              <label>Teléfono</label>
              <p className="text-sm">{detailStudent.phone ?? '—'}</p>
            </div>
            {detailStudent.notes && (
              <div className="form-group">
                <label>Notas</label>
                <p className="text-sm">{detailStudent.notes}</p>
              </div>
            )}
            <div className="form-group">
              <label>Inscripciones</label>
              {loadingEnrollments ? (
                <div className="text-muted text-sm">Cargando...</div>
              ) : detailError ? (
                <div className="alert alert-error">{detailError}</div>
              ) : enrollments.length === 0 ? (
                <p className="text-muted text-sm">No hay inscripciones</p>
              ) : (
                <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                  {enrollments.map(e => (
                    <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #F9A8D4' }}>
                      <div>
                        <div className="text-sm" style={{ fontWeight: 500 }}>{e.session.title}</div>
                        <div className="text-sm text-muted">{e.session.date} {e.session.time}</div>
                      </div>
                      <div className="flex gap-2 items-center">
                        <span className={`badge ${e.status === 'active' ? 'badge-success' : 'badge-neutral'}`}>
                          {e.status === 'active' ? 'Activa' : 'Cancelada'}
                        </span>
                        {e.status === 'active' && (
                          <button className="btn btn-danger btn-sm" onClick={() => unenroll(e.id)}>Desinscribir</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {waitlistEntries !== null && (
              <div className="form-group">
                <label>En lista de espera</label>
                {waitlistEntries.length === 0 ? (
                  <p className="text-muted text-sm">No está en lista de espera</p>
                ) : (
                  <div style={{ maxHeight: 160, overflowY: 'auto' }}>
                    {waitlistEntries.map(entry => (
                      <div key={entry.id} style={{ padding: '8px 0', borderBottom: '1px solid #F9A8D4' }}>
                        <div className="text-sm" style={{ fontWeight: 500 }}>
                          {entry.session?.title ?? 'Sesión'}
                        </div>
                        <div className="text-sm text-muted">
                          Posición #{entry.position}
                          {(entry.session?.date || entry.session?.time) ? ` · ${entry.session?.date ?? ''} ${entry.session?.time ?? ''}` : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
