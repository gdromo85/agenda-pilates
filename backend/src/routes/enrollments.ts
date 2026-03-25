import { Router } from 'express'
import { z } from 'zod'
import prisma from '../prisma'

const router = Router()

const createSchema = z.object({
  sessionId: z.string().uuid(),
  studentId: z.string().uuid()
})

router.post('/', async (req, res) => {
  const parse = createSchema.safeParse(req.body)
  if (!parse.success) return res.status(400).json({ error: parse.error.errors })

  const { sessionId, studentId } = parse.data
  try {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        template: true,
        enrollments: {
          where: { status: 'active' },
          select: { id: true },
        },
      },
    })

    if (!session) return res.status(404).json({ error: 'not found' })
    if (session.status === 'cancelled') return res.status(409).json({ error: 'session_cancelled' })

    const activeEnrollmentsCount = session.enrollments.length
    const hasCapacityLimit =
      session.template?.isGroup &&
      typeof session.capacitySnapshot === 'number'

    if (hasCapacityLimit && activeEnrollmentsCount >= session.capacitySnapshot) {
      return res.status(409).json({ error: 'session_full' })
    }

    const enrollment = await prisma.$transaction(async (tx) => {
      const createdEnrollment = await tx.enrollment.create({ data: { sessionId, studentId } })

      const waitlistEntry = await tx.waitlistEntry.findFirst({
        where: { sessionId, studentId },
        select: { id: true },
      })

      if (waitlistEntry) {
        await tx.waitlistEntry.delete({ where: { id: waitlistEntry.id } })
        const remaining = await tx.waitlistEntry.findMany({
          where: { sessionId },
          orderBy: { position: 'asc' },
          select: { id: true, position: true },
        })

        for (const [index, entry] of remaining.entries()) {
          const nextPosition = index + 1
          if (entry.position !== nextPosition) {
            await tx.waitlistEntry.update({
              where: { id: entry.id },
              data: { position: nextPosition },
            })
          }
        }
      }

      return createdEnrollment
    })

    res.status(201).json(enrollment)
  } catch (err: any) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Already enrolled' })
    }
    // eslint-disable-next-line no-console
    console.error(err)
    res.status(500).json({ error: 'internal' })
  }
})

router.get('/', async (req, res) => {
  const { sessionId, studentId, status } = req.query
  const where: any = {}
  if (sessionId) where.sessionId = sessionId as string
  if (studentId) where.studentId = studentId as string
  if (status) where.status = status as string

  try {
    const enrollments = await prisma.enrollment.findMany({
      where,
      include: { student: true, session: true }
    })
    res.json(enrollments)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err)
    res.status(500).json({ error: 'internal' })
  }
})

router.delete('/:id', async (req, res) => {
  const { id } = req.params
  try {
    const enrollment = await prisma.enrollment.findUnique({ where: { id } })
    if (!enrollment) return res.status(404).json({ error: 'not found' })
    await prisma.enrollment.update({
      where: { id },
      data: { status: 'cancelled', cancelledAt: new Date() }
    })
    res.json({ ok: true })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err)
    res.status(500).json({ error: 'internal' })
  }
})

export default router
