import { describe, it, expect } from 'vitest'
import { expandRRule } from '../src/utils/rruleUtil'

describe('rrule util', () => {
  it('expands a daily rule into occurrences', () => {
    const rrule = 'FREQ=DAILY;COUNT=3'
    const dtstart = '2026-03-18T09:00:00.000Z'
    const res = expandRRule(rrule, dtstart)
    expect(res.length).toBeGreaterThanOrEqual(3)
  })
})
