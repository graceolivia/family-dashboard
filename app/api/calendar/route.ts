import { NextResponse } from 'next/server'
import ical from 'node-ical'
import { getCalendarColors } from '@/lib/colors'
import type { CalendarEvent } from '@/types'
import type { VEvent } from 'node-ical'

// Events are tagged as all-day when node-ical sets dateOnly on the Date object
function isAllDay(d: Date): boolean {
  return !!(d as unknown as { dateOnly?: boolean }).dateOnly
}

// node-ical parses DTSTART;VALUE=DATE:20260701 as new Date(2026, 6, 1) — local midnight.
// Calling .toISOString() converts to UTC, which shifts the date backward in negative-offset
// timezones (e.g. America/New_York). Anchor to noon UTC using local date parts instead so
// toLocaleDateString() on the client always lands on the right calendar date.
function serializeAllDayDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}T12:00:00.000Z`
}

export async function GET() {
  const rawUrls = process.env.ICS_URLS ?? ''
  if (!rawUrls.trim()) return NextResponse.json({ events: [] })

  const urls = rawUrls.split(',').map(u => u.trim()).filter(Boolean)
  const labels = (process.env.ICS_LABELS ?? '')
    .split(',')
    .map(l => l.trim())
  const colors = getCalendarColors(urls.length)

  const windowStart = new Date()
  windowStart.setHours(0, 0, 0, 0)
  const windowEnd = new Date(windowStart.getTime() + 60 * 24 * 60 * 60 * 1000)

  const allEvents: CalendarEvent[] = []

  await Promise.all(
    urls.map(async (url, idx) => {
      try {
        const res = await fetch(url, { next: { revalidate: 600 } })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const text = await res.text()
        const parsed = ical.parseICS(text)
        const label = labels[idx] ?? `Calendar ${idx + 1}`
        const color = colors[idx]

        for (const key of Object.keys(parsed)) {
          const component = parsed[key]
          if (!component || component.type !== 'VEVENT') continue
          const event = component as VEvent

          if (event.rrule) {
            // Expand recurring instances within the window
            const rule = event.rrule as unknown as {
              between: (a: Date, b: Date, inc: boolean) => Date[]
            }
            const dates: Date[] =
              typeof rule.between === 'function'
                ? rule.between(windowStart, windowEnd, true)
                : []

            for (const date of dates) {
              const dateKey = date.toISOString().substring(0, 10)
              if (event.exdate?.[dateKey]) continue

              const override = event.recurrences?.[dateKey]
              const rawTitle = override?.summary ?? event.summary
              const title = typeof rawTitle === 'string' ? rawTitle : (rawTitle as { val: string }).val
              const baseDuration =
                event.end && event.start
                  ? (event.end as Date).getTime() - (event.start as Date).getTime()
                  : 60 * 60 * 1000
              const end = new Date(date.getTime() + baseDuration)

              const recAllDay = isAllDay(date)
              allEvents.push({
                id: `${event.uid ?? key}-${dateKey}`,
                title,
                start: recAllDay ? serializeAllDayDate(date) : date.toISOString(),
                end: recAllDay ? serializeAllDayDate(end) : end.toISOString(),
                allDay: recAllDay,
                calendarIndex: idx,
                calendarLabel: label,
                calendarColor: color,
                location: typeof event.location === 'string' ? event.location : undefined,
              })
            }
          } else if (event.start && event.end) {
            const start = event.start as Date
            const end = event.end as Date
            if (start <= windowEnd && end >= windowStart) {
              const allDay = isAllDay(start)
              allEvents.push({
                id: event.uid ?? key,
                title: typeof event.summary === 'string' ? event.summary : (event.summary as { val: string }).val,
                start: allDay ? serializeAllDayDate(start) : start.toISOString(),
                end: allDay ? serializeAllDayDate(end) : end.toISOString(),
                allDay,
                calendarIndex: idx,
                calendarLabel: label,
                calendarColor: color,
                location: typeof event.location === 'string' ? event.location : undefined,
              })
            }
          }
        }
      } catch (err) {
        console.error(`[calendar] failed to load feed ${idx}:`, err)
      }
    })
  )

  allEvents.sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  )

  return NextResponse.json({ events: allEvents })
}
