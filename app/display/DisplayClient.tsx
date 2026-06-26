'use client'

import { useState, useEffect, useCallback } from 'react'
import type { CalendarEvent, WeatherData, GroceryItem } from '@/types'

const TZ = process.env.NEXT_PUBLIC_TZ_NAME ?? 'America/New_York'
const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// ---------------------------------------------------------------------------
// Widget: clock + date
// ---------------------------------------------------------------------------
function ClockWidget({ now }: { now: Date }) {
  const time = now.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: TZ,
  })
  const date = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: TZ,
  })
  return (
    <div className="px-4 pt-4 pb-3 border-b border-[#21262d]">
      <div className="text-[5.5rem] font-thin leading-none tracking-tight text-white">
        {time}
      </div>
      <div className="text-lg text-[#8b949e] mt-1">{date}</div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Widget: weather
// ---------------------------------------------------------------------------
function WeatherWidget({ weather }: { weather: WeatherData | null }) {
  if (!weather) {
    return (
      <div className="px-5 py-4 border-b border-[#21262d] flex items-center text-[#8b949e] h-[140px]">
        Loading weather…
      </div>
    )
  }
  return (
    <div className="px-5 py-4 border-b border-[#21262d]">
      <div className="flex items-start gap-4">
        <span className="text-5xl leading-none">{weather.current.icon}</span>
        <div>
          <div className="text-5xl font-light text-white leading-none">
            {weather.current.temp}°
          </div>
          <div className="text-[#8b949e] text-sm mt-1">{weather.current.condition}</div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-white font-medium">
            H: {weather.today.high}° · L: {weather.today.low}°
          </div>
          <div className="text-[#8b949e] text-sm mt-0.5">
            {weather.today.precipChance}% chance of rain
            {weather.today.precipHour && ` · ~${weather.today.precipHour}`}
          </div>
          <div className="text-[#8b949e] text-sm mt-0.5">
            ↑ {weather.today.sunrise} · ↓ {weather.today.sunset}
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Widget: today's agenda
// ---------------------------------------------------------------------------
function AgendaWidget({ events }: { events: CalendarEvent[] }) {
  const allDay = events.filter(e => e.allDay)
  const timed = events.filter(e => !e.allDay)

  return (
    <div className="flex-1 overflow-hidden flex flex-col px-4 py-3 border-b border-[#21262d]">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-[#8b949e] mb-2">
        Today
      </div>
      {events.length === 0 && (
        <div className="text-[#8b949e] text-sm">Nothing scheduled</div>
      )}
      <div className="flex-1 overflow-hidden space-y-1">
        {allDay.map(e => (
          <div key={e.id} className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: e.calendarColor }}
            />
            <span className="text-sm text-[#e6edf3] truncate">{e.title}</span>
          </div>
        ))}
        {allDay.length > 0 && timed.length > 0 && (
          <div className="border-t border-[#21262d] my-1" />
        )}
        {timed.map(e => (
          <div key={e.id} className="flex gap-2">
            <span className="text-xs text-[#8b949e] w-[52px] flex-shrink-0 pt-0.5">
              {new Date(e.start).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                timeZone: TZ,
              })}
            </span>
            <div className="flex items-start gap-1.5 min-w-0">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
                style={{ backgroundColor: e.calendarColor }}
              />
              <span className="text-sm text-[#e6edf3] truncate leading-tight">
                {e.title}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Widget: 4-week calendar grid
// ---------------------------------------------------------------------------
function CalendarGrid({ events, now }: { events: CalendarEvent[]; now: Date }) {
  const todayStr = now.toLocaleDateString('en-CA', { timeZone: TZ })

  // Start from Sunday of the current week
  const todayDate = new Date(todayStr + 'T12:00:00')
  const offset = todayDate.getDay()
  const gridStart = new Date(todayDate)
  gridStart.setDate(gridStart.getDate() - offset)

  const days: Date[] = Array.from({ length: 28 }, (_, i) => {
    const d = new Date(gridStart)
    d.setDate(d.getDate() + i)
    return d
  })

  // Group events by date string
  const byDay = new Map<string, CalendarEvent[]>()
  for (const ev of events) {
    const ds = new Date(ev.start).toLocaleDateString('en-CA', { timeZone: TZ })
    if (!byDay.has(ds)) byDay.set(ds, [])
    byDay.get(ds)!.push(ev)
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col p-2">
      {/* Day headers */}
      <div className="grid grid-cols-7 mb-0.5">
        {DAY_ABBR.map(d => (
          <div key={d} className="text-center text-[10px] text-[#8b949e] font-medium py-1">
            {d}
          </div>
        ))}
      </div>
      {/* 4 × 7 day grid */}
      <div className="flex-1 grid grid-cols-7 grid-rows-4">
        {days.map(day => {
          const ds = day.toLocaleDateString('en-CA')
          const isToday = ds === todayStr
          const dayEvs = byDay.get(ds) ?? []
          const isFirst = day.getDate() === 1

          return (
            <div
              key={ds}
              className={`border-t border-l border-[#21262d] p-1 overflow-hidden min-h-0 ${
                isToday ? 'bg-[#1c2128]' : ''
              }`}
            >
              <div className="flex items-center gap-1">
                <span
                  className={`text-[11px] font-medium w-5 h-5 flex items-center justify-center rounded-full flex-shrink-0 ${
                    isToday ? 'bg-[#238636] text-white' : 'text-[#e6edf3]'
                  }`}
                >
                  {day.getDate()}
                </span>
                {isFirst && (
                  <span className="text-[9px] text-[#8b949e] truncate leading-none">
                    {day.toLocaleDateString('en-US', { month: 'short' })}
                  </span>
                )}
              </div>
              <div className="mt-0.5 space-y-px">
                {dayEvs.slice(0, 2).map(e => (
                  <div
                    key={e.id}
                    className="text-[9px] leading-tight truncate rounded-sm px-0.5 font-medium"
                    style={{ color: e.calendarColor }}
                  >
                    {e.title}
                  </div>
                ))}
                {dayEvs.length > 2 && (
                  <div className="text-[9px] text-[#8b949e]">+{dayEvs.length - 2}</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Widget: tonight's dinner
// ---------------------------------------------------------------------------
function DinnerWidget({ dinner, onTap }: { dinner: string; onTap: () => void }) {
  return (
    <div
      className="px-4 py-3 border-t border-[#21262d] cursor-pointer select-none active:bg-[#1c2128] transition-colors"
      onClick={onTap}
    >
      <div className="text-[10px] font-semibold uppercase tracking-widest text-[#8b949e] mb-1">
        Tonight
      </div>
      <div className="text-2xl font-medium text-white truncate">
        {dinner || (
          <span className="text-[#8b949e] font-normal">Tap to set dinner</span>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Widget: grocery list (read + tap-to-toggle)
// ---------------------------------------------------------------------------
function GroceryWidget({
  items,
  onToggle,
}: {
  items: GroceryItem[]
  onToggle: (id: string, checked: boolean) => void
}) {
  const sorted = [...items.filter(i => !i.checked), ...items.filter(i => i.checked)]
  const visible = sorted.slice(0, 9)

  return (
    <div className="px-4 py-3 border-t border-l border-[#21262d] overflow-hidden">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-[#8b949e] mb-2">
        Grocery
      </div>
      {items.length === 0 ? (
        <div className="text-[#8b949e] text-sm">List is empty</div>
      ) : (
        <div className="space-y-1.5">
          {visible.map(item => (
            <button
              key={item.id}
              className="flex items-center gap-2 w-full text-left"
              onClick={() => onToggle(item.id, !item.checked)}
            >
              <span
                className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                  item.checked
                    ? 'bg-[#238636] border-[#238636]'
                    : 'border-[#30363d]'
                }`}
              >
                {item.checked && (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12">
                    <path
                      d="M2 6l3 3 5-5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>
              <span
                className={`text-sm truncate ${
                  item.checked ? 'line-through text-[#8b949e]' : 'text-[#e6edf3]'
                }`}
              >
                {item.text}
              </span>
            </button>
          ))}
          {items.length > 9 && (
            <div className="text-[10px] text-[#8b949e]">
              +{items.length - 9} more — see /manage
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Dinner edit modal
// ---------------------------------------------------------------------------
function DinnerModal({
  current,
  onSave,
  onClose,
}: {
  current: string
  onSave: (meal: string) => void
  onClose: () => void
}) {
  const [value, setValue] = useState(current)

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 w-[420px]"
        onClick={e => e.stopPropagation()}
      >
        <div className="text-lg font-semibold text-white mb-4">Tonight's dinner</div>
        <input
          type="text"
          className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-4 py-3 text-white text-base outline-none focus:border-[#388bfd] transition-colors"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') onSave(value.trim())
            if (e.key === 'Escape') onClose()
          }}
          autoFocus
          placeholder="What's for dinner?"
        />
        <div className="flex gap-3 mt-4 justify-end">
          <button
            className="px-4 py-2 rounded-xl text-[#8b949e] hover:text-white transition-colors"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 rounded-xl bg-[#238636] text-white hover:bg-[#2ea043] transition-colors"
            onClick={() => onSave(value.trim())}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main display client
// ---------------------------------------------------------------------------
export default function DisplayClient() {
  const [now, setNow] = useState<Date>(new Date())
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [dinner, setDinner] = useState('')
  const [grocery, setGrocery] = useState<GroceryItem[]>([])
  const [editingDinner, setEditingDinner] = useState(false)

  // Clock — ticks every second
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  // Hard reload every 4 hours to prevent memory leaks on A10 silicon
  useEffect(() => {
    const id = setTimeout(() => location.reload(), 4 * 60 * 60 * 1000)
    return () => clearTimeout(id)
  }, [])

  // Wake Lock — keep screen on; re-acquire after visibility change
  useEffect(() => {
    let lock: WakeLockSentinel | null = null
    const acquire = async () => {
      try { lock = await navigator.wakeLock.request('screen') } catch { /* no-op */ }
    }
    acquire()
    const onVis = () => { if (document.visibilityState === 'visible') acquire() }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      lock?.release().catch(() => { /* no-op */ })
    }
  }, [])

  const fetchWeather = useCallback(async () => {
    try {
      const r = await fetch('/api/weather')
      if (r.ok) setWeather(await r.json())
    } catch { /* no-op */ }
  }, [])

  const fetchCalendar = useCallback(async () => {
    try {
      const r = await fetch('/api/calendar')
      if (r.ok) {
        const data = await r.json()
        setEvents(data.events ?? [])
      }
    } catch { /* no-op */ }
  }, [])

  const fetchMeals = useCallback(async () => {
    try {
      const r = await fetch('/api/meals')
      if (r.ok) {
        const data = await r.json()
        setDinner(data.today ?? '')
      }
    } catch { /* no-op */ }
  }, [])

  const fetchGrocery = useCallback(async () => {
    try {
      const r = await fetch('/api/grocery')
      if (r.ok) setGrocery(await r.json())
    } catch { /* no-op */ }
  }, [])

  // Initial load
  useEffect(() => {
    fetchWeather()
    fetchCalendar()
    fetchMeals()
    fetchGrocery()
  }, [fetchWeather, fetchCalendar, fetchMeals, fetchGrocery])

  // Polling
  useEffect(() => {
    const w = setInterval(fetchWeather, 10 * 60 * 1000)
    const c = setInterval(fetchCalendar, 10 * 60 * 1000)
    const m = setInterval(fetchMeals, 60 * 1000)
    const g = setInterval(fetchGrocery, 60 * 1000)
    return () => { clearInterval(w); clearInterval(c); clearInterval(m); clearInterval(g) }
  }, [fetchWeather, fetchCalendar, fetchMeals, fetchGrocery])

  // Today's events
  const todayStr = now.toLocaleDateString('en-CA', { timeZone: TZ })
  const todayEvents = events
    .filter(e => new Date(e.start).toLocaleDateString('en-CA', { timeZone: TZ }) === todayStr)
    .sort((a, b) => {
      if (a.allDay && !b.allDay) return -1
      if (!a.allDay && b.allDay) return 1
      return new Date(a.start).getTime() - new Date(b.start).getTime()
    })

  const saveDinner = async (meal: string) => {
    setEditingDinner(false)
    setDinner(meal)
    await fetch('/api/meals', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'override', date: todayStr, meal }),
    })
  }

  const toggleGrocery = async (id: string, checked: boolean) => {
    setGrocery(prev => prev.map(i => (i.id === id ? { ...i, checked } : i)))
    await fetch('/api/grocery', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, checked }),
    })
  }

  return (
    <div className="h-screen bg-[#0d1117] text-[#e6edf3] grid grid-cols-[380px_1fr] overflow-hidden">
      {/* Left column */}
      <div className="flex flex-col border-r border-[#21262d] overflow-hidden">
        <ClockWidget now={now} />
        <DinnerWidget dinner={dinner} onTap={() => setEditingDinner(true)} />
        <AgendaWidget events={todayEvents} />
        <GroceryWidget items={grocery} onToggle={toggleGrocery} />
      </div>

      {/* Right column */}
      <div className="flex flex-col overflow-hidden">
        <WeatherWidget weather={weather} />
        <CalendarGrid events={events} now={now} />
      </div>

      {editingDinner && (
        <DinnerModal
          current={dinner}
          onSave={saveDinner}
          onClose={() => setEditingDinner(false)}
        />
      )}
    </div>
  )
}
