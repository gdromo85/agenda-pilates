import { Router } from 'express'
import { z } from 'zod'
import prisma from '../prisma'

const router = Router()

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  notes: z.string().optional()
})

router.post('/', async (req, res) => {
  const parse = createSchema.safeParse(req.body)
  if (!parse.success) return res.status(400).json({ error: parse.error.errors })

  const { name, email, phone, notes } = parse.data
  try {
    const student = await prisma.student.create({ data: { name, email, phone, notes } })
    res.status(201).json(student)
  } catch (err: any) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Email already exists' })
    }
    // eslint-disable-next-line no-console
    console.error(err)
    res.status(500).json({ error: 'internal' })
  }
})

router.get('/', async (req, res) => {
  const students = await prisma.student.findMany({ orderBy: { createdAt: 'desc' } })
  res.json(students)
})

export default router
