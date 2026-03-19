import { RRule, rrulestr } from 'rrule'
import { DateTime } from 'luxon'

const MAX_OCCURRENCES = 200 // safety limit to prevent infinite expansion

export function expandRRule(
  rruleText: string,
  dtstartIso: string,
  untilIso?: string,
) {
  const dtstart = DateTime.fromISO(dtstartIso)
  const until = untilIso
    ? DateTime.fromISO(untilIso)
    : dtstart.plus({ days: 90 })

  const options = rrulestr(rruleText, { forceset: true })

  const dates: string[] = []

  // Use .between() with explicit start/end + limit to prevent infinite iteration.
  // .all() without count/until generates unbounded results and hangs on RRULEs
  // without an until constraint.
  const start = dtstart.toJSDate()
  const end = until.toJSDate()

  if ((options as any).all) {
    const all = (options as any).all(start, end, MAX_OCCURRENCES)
    for (const d of all) dates.push(DateTime.fromJSDate(d).toUTC().toISO())
  } else if (options instanceof RRule) {
    const all = options.between(start, end, true)
    for (const d of all.slice(0, MAX_OCCURRENCES)) {
      dates.push(DateTime.fromJSDate(d).toUTC().toISO())
    }
  }

  return dates
}
