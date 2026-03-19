import { RRule, rrulestr } from 'rrule'
import { DateTime } from 'luxon'

const MAX_OCCURRENCES = 200

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
  let count = 0

  // RRuleSet.all(iterator) — iterator(date, i) returns false to stop.
  // Without an iterator, .all() generates unbounded results and hangs
  // on rules without until/count. We always use the iterator to enforce
  // the MAX_OCCURRENCES safety limit.
  const iterator = (_date: Date, i: number) => {
    if (i < MAX_OCCURRENCES) {
      dates.push(DateTime.fromJSDate(_date).toUTC().toISO())
      return true
    }
    return false // stop after MAX_OCCURRENCES
  }

  ;(options as any).all(iterator)

  return dates
}
