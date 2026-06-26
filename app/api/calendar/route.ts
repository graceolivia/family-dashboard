import { NextResponse } from 'next/server'
import ical from 'node-ical'
import { getCalendarColors } from '@/lib/colors'
import type { CalendarEvent } from '@/types'
import type { VEvent } from 'node-ical'

// Events are tagged as all-day when node-ical sets dateOnly on the Date object
function isAllDay(d: Date): boolean {
  return !!(d as unknown as { dateOnly?: boolean }).dateOnly
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
  const windowEnd = new Date(windowStart.getTime() + 28 * 24 * 60 * 60 * 1000)

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
          if (component.type !== 'VEVENT') continue
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
              const title = override?.summary ?? event.summary ?? 'Untitled'
              const baseDuration =
                event.end && event.start
                  ? (event.end as Date).getTime() - (event.start as Date).getTime()
                  : 60 * 60 * 1000
              const end = new Date(date.getTime() + baseDuration)

              allEvents.push({
                id: `${event.uid ?? key}-${dateKey}`,
                title,
                start: date.toISOString(),
                end: end.toISOString(),
                allDay: isAllDay(date),
                calendarIndex: idx,
                calendarLabel: label,
                calendarColor: color,
              })
            }
          } else if (event.start && event.end) {
            const start = event.start as Date
            const end = event.end as Date
            if (start <= windowEnd && end >= windowStart) {
              allEvents.push({
                id: event.uid ?? key,
                title: event.summary ?? 'Untitled',
                start: start.toISOString(),
                end: end.toISOString(),
                allDay: isAllDay(start),
                calendarIndex: idx,
                calendarLabel: label,
                calendarColor: color,
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
