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

  // Check conflicts with a single range query instead of one query per occurrence.
  // This reduces N database round-trips to 1, dramatically improving performance
  // when many occurrences are generated (e.g. weekly for 90 days).
  const duration = data.durationMinutes

  if (occurrences.length > 0) {
    const firstStart = DateTime.fromISO(occurrences[0])
    const lastEnd = DateTime.fromISO(occurrences[occurrences.length - 1]).plus({ minutes: duration })

    const overlapping = await prisma.session.findMany({
      where: {
        instructorId,
        status: { not: 'cancelled' },
        AND: [
          { startUtc: { lt: lastEnd.toJSDate() } },
          { endUtc: { gt: firstStart.toJSDate() } },
        ],
      },
      select: { id: true, startUtc: true, endUtc: true },
    })

    if (overlapping.length > 0) {
      return res.status(409).json({
        error: 'conflict',
        conflicts: overlapping.map(s => ({
          start: s.startUtc.toISOString(),
          end: s.endUtc.toISOString(),
          existingSessionId: s.id,
        })),
      })
    }
  }

  // Create template and Sessions in transaction with advisory lock to
  // prevent concurrent expansion creating duplicate Session rows.
  try {
    const created = await prisma.$transaction(async (tx) => {
      // Acquire a transaction-scoped advisory lock based on instructorId.
      // Use hashtext(instructorId) to derive a stable BIGINT key.
      // This ensures concurrent requests for the same instructor serialize
      // here and avoid duplicate session creation.
      // NOTE: pg_advisory_xact_lock ties the lock lifetime to the DB
      // transaction, so it is released automatically at commit/rollback.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${instructorId}));`

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

    // After transaction commit, create ReminderJob rows (idempotent) and
    // enqueue delayed BullMQ jobs if Redis is configured. We do this
    // outside the DB transaction to avoid mixing external queue side-effects
    // with DB rollback semantics.
    try {
      // Retrieve sessions we just created to compute reminder times.
      // We query by template id returned above.
      const sessions = await prisma.session.findMany({ where: { templateId: created.template.id } })

      const reminderOffset = created.template.reminderOffsetMinutes ?? 1440
      const { createReminderForSession } = await import('../services/reminderService')
      for (const s of sessions) {
        // createReminderForSession is idempotent: it ensures no duplicate
        // ReminderJob for the same sessionId + studentId + scheduledAtUtc
        // will be created when called multiple times.
        // For now we create a per-session (studentId = null) reminder job.
        // Student-specific reminders will be created when enrollments are added.
        // eslint-disable-next-line no-await-in-loop
        await createReminderForSession(prisma, s, reminderOffset)
      }
    } catch (err: any) {
      // Best effort: don't fail the API if scheduling reminders fails.
      // Log and continue.
      // eslint-disable-next-line no-console
      console.error('failed to schedule reminders after template creation', err)
    }

    res.status(201).json(created)
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error(err)
    res.status(500).json({ error: 'internal' })
  }
})

export default router
