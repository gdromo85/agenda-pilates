import { Router } from 'express'
import { z } from 'zod'
import prisma from '../prisma'
import { expandRRule } from '../utils/rruleUtil'
import { DateTime } from 'luxon'

const router = Router()

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  isGroup: z.boolean().optional().default(true),
  capacity: z.number().int().positive().optional(),
  recurrenceRule: z.string().min(1).optional(),
  startTimeLocal: z.string().regex(/^\d{2}:\d{2}$/),
  startDateLocal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  durationMinutes: z.number().int().positive(),
  active: z.boolean().optional().default(true),
  reminderOffsetMinutes: z.number().int().positive().optional().default(1440),
})

// Helper to check overlap: existing.startUtc < newEnd && existing.endUtc > newStart
async function hasConflict(instructorId: string, startUtcISO: string, endUtcISO: string) {
  const conflict = await prisma.session.findFirst({
    where: {
      instructorId,
      status: { not: 'cancelled' },
      AND: [
        { startUtc: { lt: new Date(endUtcISO) } },
        { endUtc: { gt: new Date(startUtcISO) } },
      ],
    },
  })
  return conflict
}

router.post('/', async (req, res) => {
  const parse = createSchema.safeParse(req.body)
  if (!parse.success) return res.status(400).json({ error: parse.error.errors })

  const instructorId = (req as any).instructorId
  if (!instructorId) return res.status(401).json({ error: 'unauthenticated' })

  const data = parse.data

  // Fetch instructor timezone
  const instructor = await prisma.instructor.findUnique({ where: { id: instructorId } })
  if (!instructor) return res.status(404).json({ error: 'instructor not found' })

  // Determine dtstart for expansion: prefer explicit startDateLocal + startTimeLocal
  let dtstartIso: string | undefined = undefined
  if (data.startDateLocal) {
    const local = DateTime.fromISO(`${data.startDateLocal}T${data.startTimeLocal}`, { zone: instructor.timezone })
    dtstartIso = local.toISO()
  } else {
    // fallback to now in instructor timezone
    dtstartIso = DateTime.now().setZone(instructor.timezone).toISO()
  }

  // Must have recurrenceRule to create a template that expands occurrences
  if (!data.recurrenceRule) return res.status(400).json({ error: 'recurrenceRule is required for templates' })

  // Expand occurrences for next 90 days
  let occurrences: string[] = []
  try {
    occurrences = expandRRule(data.recurrenceRule, dtstartIso)
  } catch (err: any) {
    return res.status(400).json({ error: 'invalid recurrenceRule', details: err.message })
  }

  // For each occurrence, compute endUtc and check conflicts
  const duration = data.durationMinutes
  const conflicts: Array<{ start: string; end: string; existingSessionId: string } > = []
  for (const occ of occurrences) {
    const startUtc = DateTime.fromISO(occ)
    const endUtc = startUtc.plus({ minutes: duration })
    const conflict = await hasConflict(instructorId, startUtc.toISO(), endUtc.toISO())
    if (conflict) {
      conflicts.push({ start: startUtc.toISO(), end: endUtc.toISO(), existingSessionId: conflict.id })
      break
    }
  }

  if (conflicts.length > 0) return res.status(409).json({ error: 'conflict', conflicts })

  // Create template and Sessions in transaction
  try {
    const created = await prisma.$transaction(async (tx) => {
      const template = await tx.classTemplate.create({ data: {
        instructorId,
        title: data.title,
        description: data.description,
        isGroup: data.isGroup ?? true,
        capacity: data.capacity ?? null,
        recurrenceRule: data.recurrenceRule,
        startTimeLocal: data.startTimeLocal,
        durationMinutes: data.durationMinutes,
        active: data.active ?? true,
        reminderOffsetMinutes: data.reminderOffsetMinutes ?? 1440,
      } })

      const sessionsData = occurrences.map((occ) => {
        const start = DateTime.fromISO(occ)
        const end = start.plus({ minutes: duration })
        return {
          templateId: template.id,
          instructorId,
          startUtc: start.toJSDate(),
          endUtc: end.toJSDate(),
          capacitySnapshot: data.capacity ?? null,
          status: 'scheduled',
        }
      })

      // createMany for performance; tolerate some DB that doesn't support it in tests
      await tx.session.createMany({ data: sessionsData })

      return { template, createdSessions: sessionsData.length }
    })

    res.status(201).json(created)
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error(err)
    res.status(500).json({ error: 'internal' })
  }
})

export default router
