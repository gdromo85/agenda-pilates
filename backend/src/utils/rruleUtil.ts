import { RRule, rrulestr } from 'rrule'
import { DateTime } from 'luxon'

export function expandRRule(rruleText: string, dtstartIso: string, untilIso?: string) {
  const options = rrulestr(rruleText, { forceset: true })
  // rrulestr may return RRuleSet — normalize
  const dtstart = DateTime.fromISO(dtstartIso)
  const until = untilIso ? DateTime.fromISO(untilIso) : dtstart.plus({ days: 90 })

  const dates: string[] = []
  if ((options as any).all) {
    const all = (options as any).all()
    for (const d of all) dates.push(DateTime.fromJSDate(d).toUTC().toISO())
  } else if (options instanceof RRule) {
    const all = options.between(dtstart.toJSDate(), until.toJSDate(), true)
    for (const d of all) dates.push(DateTime.fromJSDate(d).toUTC().toISO())
  }
  return dates
}
