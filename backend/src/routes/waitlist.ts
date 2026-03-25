import { Router } from 'express'
import { z } from 'zod'
import prisma from '../prisma'

const router = Router()

const createSchema = z.object({
  studentId: z.string().uuid(),
})

router.post('/sessions/:id/waitlist', async (req, res) => {
  const parse = createSchema.safeParse(req.body)
  if (!parse.success) return res.status(400).json({ error: parse.error.errors })

  const sessionId = req.params.id
  const { studentId } = parse.data

  try {
    const [session, student] = await Promise.all([
      prisma.session.findUnique({ where: { id: sessionId } }),
      prisma.student.findUnique({ where: { id: studentId } }),
    ])

    if (!session) return res.status(404).json({ error: 'session_not_found' })
    if (!student) return res.status(404).json({ error: 'student_not_found' })

    const existing = await prisma.waitlistEntry.findFirst({ where: { sessionId, studentId } })
    if (existing) return res.status(409).json({ error: 'already_waitlisted' })

    const last = await prisma.waitlistEntry.findFirst({
      where: { sessionId },
      orderBy: { position: 'desc' },
      select: { position: true },
    })

    const entry = await prisma.waitlistEntry.create({
      data: {
        sessionId,
        studentId,
        position: (last?.position ?? 0) + 1,
      },
      include: { student: true },
    })

    res.status(201).json(entry)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err)
    res.status(500).json({ error: 'internal' })
  }
})

router.get('/sessions/:id/waitlist', async (req, res) => {
  const sessionId = req.params.id
  try {
    const entries = await prisma.waitlistEntry.findMany({
      where: { sessionId },
      orderBy: { position: 'asc' },
      include: { student: true },
    })
    res.json(entries)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err)
    res.status(500).json({ error: 'internal' })
  }
})

router.delete('/waitlist/:id', async (req, res) => {
  const { id } = req.params
  try {
    const deleted = await prisma.waitlistEntry.delete({ where: { id } })

    const remaining = await prisma.waitlistEntry.findMany({
      where: { sessionId: deleted.sessionId },
      orderBy: { position: 'asc' },
      select: { id: true, position: true },
    })

    const updates = remaining
      .map((entry, index) => {
        const nextPosition = index + 1
        if (entry.position === nextPosition) return null
        return prisma.waitlistEntry.update({
          where: { id: entry.id },
          data: { position: nextPosition },
        })
      })
      .filter(Boolean)

    if (updates.length > 0) {
      await prisma.$transaction(updates as any)
    }

    res.json({ ok: true })
  } catch (err: any) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'not found' })
    // eslint-disable-next-line no-console
    console.error(err)
    res.status(500).json({ error: 'internal' })
  }
})

export default router
