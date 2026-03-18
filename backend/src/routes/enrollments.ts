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
    const enrollment = await prisma.enrollment.create({ data: { sessionId, studentId } })
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

export default router
