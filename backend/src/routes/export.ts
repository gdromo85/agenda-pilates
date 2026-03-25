import { Router } from 'express'
import prisma from '../prisma'

const router = Router()

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  const raw = String(value)
  const escaped = raw.replace(/"/g, '""')
  return /[",\n\r]/.test(escaped) ? `"${escaped}"` : escaped
}

function toCsv(headers: string[], rows: Array<Array<unknown>>): string {
  const lines = [headers.join(',')]
  for (const row of rows) {
    lines.push(row.map(csvCell).join(','))
  }
  return `${lines.join('\n')}\n`
}

router.get('/students.csv', async (_req, res) => {
  try {
    const students = await prisma.student.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        notes: true,
        createdAt: true,
      },
    })

    const csv = toCsv(
      ['id', 'name', 'email', 'phone', 'notes', 'createdAt'],
      students.map((student) => [
        student.id,
        student.name,
        student.email,
        student.phone,
        student.notes,
        student.createdAt.toISOString(),
      ])
    )

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="students.csv"')
    return res.status(200).send(csv)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err)
    return res.status(500).json({ error: 'internal' })
  }
})

router.get('/sessions.csv', async (_req, res) => {
  try {
    const sessions = await prisma.session.findMany({
      orderBy: { startUtc: 'desc' },
      include: {
        template: {
          select: { title: true },
        },
      },
    })

    const csv = toCsv(
      ['id', 'templateTitle', 'startUtc', 'endUtc', 'status', 'capacitySnapshot', 'instructorId'],
      sessions.map((session) => [
        session.id,
        session.template?.title ?? '',
        session.startUtc.toISOString(),
        session.endUtc.toISOString(),
        session.status,
        session.capacitySnapshot,
        session.instructorId,
      ])
    )

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="sessions.csv"')
    return res.status(200).send(csv)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err)
    return res.status(500).json({ error: 'internal' })
  }
})

export default router
