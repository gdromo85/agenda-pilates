import { Router } from 'express'
import prisma from '../prisma'
import { z } from 'zod'

const router = Router()

const querySchema = z.object({ fromUtc: z.string().optional(), toUtc: z.string().optional() })

router.get('/', async (req, res) => {
  const parse = querySchema.safeParse(req.query)
  if (!parse.success) return res.status(400).json({ error: parse.error.errors })
  const { fromUtc, toUtc } = parse.data
  const where: any = { }
  if (fromUtc && toUtc) {
    where.startUtc = { gte: new Date(fromUtc), lt: new Date(toUtc) }
  }

  try {
    const sessions = await prisma.session.findMany({ where, include: { template: true } })
    res.json(sessions)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err)
    res.status(500).json({ error: 'internal' })
  }
})

router.get('/:id', async (req, res) => {
  const { id } = req.params
  try {
    const session = await prisma.session.findUnique({
      where: { id },
      include: {
        template: true,
        enrollments: { include: { student: true } },
        waitlistEntries: {
          orderBy: { position: 'asc' },
          include: { student: true },
        },
      }
    })
    if (!session) return res.status(404).json({ error: 'not found' })
    res.json(session)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err)
    res.status(500).json({ error: 'internal' })
  }
})

router.delete('/:id', async (req, res) => {
  const { id } = req.params
  const instructorId = (req as any).instructorId
  try {
    const session = await prisma.session.findUnique({ where: { id } })
    if (!session) return res.status(404).json({ error: 'not found' })
    if (session.instructorId !== instructorId) return res.status(403).json({ error: 'forbidden' })
    await prisma.session.update({ where: { id }, data: { status: 'cancelled' } })
    res.json({ ok: true })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err)
    res.status(500).json({ error: 'internal' })
  }
})

export default router
