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

router.delete('/:id', async (req, res) => {
  const { id } = req.params
  try {
    await prisma.student.delete({ where: { id } })
    res.status(204).send()
  } catch (err: any) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'not found' })
    // eslint-disable-next-line no-console
    console.error(err)
    res.status(500).json({ error: 'internal' })
  }
})

router.get('/:id', async (req, res) => {
  const { id } = req.params
  try {
    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        enrollments: {
          include: {
            session: { include: { template: true } }
          }
        }
      }
    })
    if (!student) return res.status(404).json({ error: 'not found' })
    res.json(student)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err)
    res.status(500).json({ error: 'internal' })
  }
})

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  notes: z.string().optional()
})

router.put('/:id', async (req, res) => {
  const { id } = req.params
  const parse = updateSchema.safeParse(req.body)
  if (!parse.success) return res.status(400).json({ error: parse.error.errors })

  try {
    const existing = await prisma.student.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ error: 'not found' })
    const student = await prisma.student.update({ where: { id }, data: parse.data })
    res.json(student)
  } catch (err: any) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Email already exists' })
    }
    // eslint-disable-next-line no-console
    console.error(err)
    res.status(500).json({ error: 'internal' })
  }
})

export default router
