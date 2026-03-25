import { Router } from 'express'
import { z } from 'zod'
import prisma from '../prisma'
import { sendNotificationEmail } from '../services/notificationSender'

const router = Router()

const pendingQuerySchema = z.object({
  fromUtc: z.string().datetime(),
  toUtc: z.string().datetime(),
})

const sendBodySchema = z.object({
  sessionId: z.string().uuid(),
  studentIds: z.array(z.string().uuid()).optional(),
  message: z.string().min(1).optional(),
})

router.get('/pending', async (req, res) => {
  const parse = pendingQuerySchema.safeParse(req.query)
  if (!parse.success) return res.status(400).json({ error: parse.error.errors })

  const { fromUtc, toUtc } = parse.data

  try {
    const sessions = await prisma.session.findMany({
      where: {
        startUtc: {
          gte: new Date(fromUtc),
          lt: new Date(toUtc),
        },
        status: {
          not: 'cancelled',
        },
      },
      orderBy: { startUtc: 'asc' },
      include: {
        template: { select: { title: true } },
        enrollments: {
          where: { status: 'active' },
          include: {
            student: {
              select: { id: true, name: true, email: true, phone: true },
            },
          },
        },
      },
    })

    const payload = sessions.map(session => ({
      sessionId: session.id,
      classTitle: session.template?.title ?? 'Clase',
      startUtc: session.startUtc.toISOString(),
      students: session.enrollments.map(enrollment => enrollment.student),
    }))

    return res.json(payload)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err)
    return res.status(500).json({ error: 'internal' })
  }
})

router.post('/send', async (req, res) => {
  const parse = sendBodySchema.safeParse(req.body)
  if (!parse.success) return res.status(400).json({ error: parse.error.errors })

  const { sessionId, studentIds, message } = parse.data

  try {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        template: { select: { title: true } },
        enrollments: {
          where: { status: 'active' },
          include: {
            student: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    })

    if (!session) return res.status(404).json({ error: 'not found' })

    const allStudents = session.enrollments.map(enrollment => enrollment.student)
    const studentsToNotify = studentIds?.length
      ? allStudents.filter(student => studentIds.includes(student.id))
      : allStudents

    let sent = 0
    let failed = 0

    for (const student of studentsToNotify) {
      const classTitle = session.template?.title ?? 'Clase'
      const defaultText = `Hola ${student.name}, te recordamos tu clase ${classTitle} el ${session.startUtc.toISOString()}.`

      try {
        // eslint-disable-next-line no-await-in-loop
        await sendNotificationEmail({
          to: student.email,
          subject: `Recordatorio: ${classTitle}`,
          text: message ?? defaultText,
        })
        sent += 1
      } catch (err) {
        failed += 1
        // eslint-disable-next-line no-console
        console.error('notification send failed', {
          sessionId,
          studentId: student.id,
          error: err,
        })
      }
    }

    return res.json({ sent, failed })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err)
    return res.status(500).json({ error: 'internal' })
  }
})

export default router
