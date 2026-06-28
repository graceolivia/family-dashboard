'use client'

import { useState, useEffect, useCallback } from 'react'
import type { CSSProperties } from 'react'
import type { CalendarEvent, WeatherData, GroceryItem, MealPlan } from '@/types'

const TZ = process.env.NEXT_PUBLIC_TZ_NAME ?? 'America/New_York'
type Theme = 'day' | 'night'

// ─────────────────────────────────────────────────────────────
// Icon
// ─────────────────────────────────────────────────────────────
const PATHS: Record<string, React.ReactNode> = {
  sun: (<><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>),
  moon: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>,
  'cloud-sun': (<><path d="M12 2v2M5.6 5.6 7 7M2 13h2M20 13h2M18.4 5.6 17 7"/><circle cx="12" cy="11" r="3.2"/><path d="M7 20h11a3 3 0 0 0 0-6 4.5 4.5 0 0 0-8.6-1.2A3.4 3.4 0 0 0 7 20Z"/></>),
  cloud: <path d="M7 19h11a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.6-1.3A3.8 3.8 0 0 0 7 19Z"/>,
  rain: (<><path d="M7 16h11a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.6-1.3A3.8 3.8 0 0 0 7 16Z"/><path d="M9 20l-.6 1.4M14 20l-.6 1.4M12 20.5l-.6 1.4"/></>),
  sunrise: (<><path d="M12 3v5M8.5 6.5 12 3l3.5 3.5M3 19h18M5 15a7 7 0 0 1 14 0"/></>),
  sunset: (<><path d="M12 8V3M8.5 4.5 12 8l3.5-3.5M3 19h18M5 15a7 7 0 0 1 14 0"/></>),
  droplet: <path d="M12 3s6 6.2 6 10.2A6 6 0 1 1 6 13.2C6 9.2 12 3 12 3Z"/>,
  utensils: (<><path d="M5 3v7a2 2 0 0 0 4 0V3M7 11v10"/><path d="M17 3c-1.8 0-3 2.2-3 5s1.2 4 3 4v9"/></>),
  cart: (<><circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/><path d="M2 3h2l2.2 12.2a1.5 1.5 0 0 0 1.5 1.3h9.1a1.5 1.5 0 0 0 1.5-1.2L20 7H5"/></>),
  check: <path d="m5 12 4.5 4.5L19 7"/>,
  chevronLeft: <path d="m15 5-7 7 7 7"/>,
  chevronRight: <path d="m9 5 7 7-7 7"/>,
  plus: <path d="M12 5v14M5 12h14"/>,
}
function Icon({ name, size = 20, sw = 1.5, style }: { name: string; size?: number; sw?: number; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
      strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden
      style={{ display: 'block', flexShrink: 0, ...style }}>
      {PATHS[name] ?? null}
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────
// Eyebrow label
// ─────────────────────────────────────────────────────────────
function Eyebrow({ children, style }: { children: React.ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--t-label)', fontWeight: 'var(--w-medium)',
      letterSpacing: 'var(--track-label)', textTransform: 'uppercase', color: 'var(--ink-3)', ...style }}>
      {children}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Divider
// ─────────────────────────────────────────────────────────────
function Divider() {
  return <hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: 0 }} />
}

// ─────────────────────────────────────────────────────────────
// Clock
// ─────────────────────────────────────────────────────────────
function Clock({ now }: { now: Date }) {
  const h24 = now.toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: TZ })
  const h = parseInt(h24, 10) % 12 || 12
  const m = now.toLocaleString('en-US', { minute: '2-digit', timeZone: TZ }).padStart(2, '0')
  const meridiem = parseInt(h24, 10) >= 12 ? 'PM' : 'AM'
  const date = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: TZ })

  return (
    <div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--t-clock)', fontWeight: 'var(--w-light)',
        lineHeight: 'var(--lead-tight)', letterSpacing: 'var(--track-tight)',
        display: 'flex', alignItems: 'baseline', gap: '0.04em', fontVariantNumeric: 'lining-nums' }}>
        <span>{h}</span>
        <span style={{ opacity: 0.32 }}>:</span>
        <span>{m}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.16em', letterSpacing: 'var(--track-label)',
          color: 'var(--ink-3)', alignSelf: 'flex-start', marginTop: '0.9em', marginLeft: '0.3em' }}>
          {meridiem}
        </span>
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 'var(--t-h2)',
        fontWeight: 'var(--w-regular)', color: 'var(--ink-2)', marginTop: 'var(--space-2)' }}>
        {date}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// WeatherBar
// ─────────────────────────────────────────────────────────────
const CONDITION_ICON: Record<string, string> = {
  clear: 'sun', 'mainly clear': 'sun', 'partly cloudy': 'cloud-sun',
  overcast: 'cloud', foggy: 'cloud', drizzle: 'rain', rain: 'rain',
  showers: 'rain', snow: 'cloud', 'snow showers': 'cloud', thunderstorm: 'rain',
}
function WeatherBar({ weather }: { weather: WeatherData | null }) {
  if (!weather) return (
    <div style={{ color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', fontSize: 'var(--t-label)' }}>
      Loading weather…
    </div>
  )
  const icon = CONDITION_ICON[weather.current.condition.toLowerCase()] ?? 'cloud-sun'
  const Meta = ({ iconName, children }: { iconName?: string; children: React.ReactNode }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
      {iconName && <Icon name={iconName} size={15} style={{ color: 'var(--ink-3)' }} />}
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--t-meta)', letterSpacing: '0.02em', color: 'var(--ink-2)', whiteSpace: 'nowrap' }}>
        {children}
      </span>
    </div>
  )
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-6)', flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
        <Icon name={icon} size={44} sw={1.25} />
        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--t-display)', lineHeight: 1, letterSpacing: 'var(--track-tight)' }}>
            {weather.current.temp}
          </span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 'calc(var(--t-display) * 0.5)', lineHeight: 1 }}>°</span>
          <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 'var(--t-h3)', color: 'var(--ink-2)', marginLeft: 'var(--space-3)' }}>
            {weather.current.condition}
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', alignItems: 'flex-end' }}>
        <Meta>H {weather.today.high}° · L {weather.today.low}°</Meta>
        <Meta iconName="droplet">{weather.today.precipChance}% rain{weather.today.precipHour ? ` · ~${weather.today.precipHour}` : ''}</Meta>
        <div style={{ display: 'flex', gap: 'var(--space-5)' }}>
          <Meta iconName="sunrise">{weather.today.sunrise}</Meta>
          <Meta iconName="sunset">{weather.today.sunset}</Meta>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Calendar month grid
// ─────────────────────────────────────────────────────────────
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const WDAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function buildWeeks(year: number, month: number): Date[][] {
  const first = new Date(year, month, 1)
  const start = new Date(first)
  start.setDate(1 - first.getDay())
  const weeks: Date[][] = []
  const cur = new Date(start)
  for (let w = 0; w < 6; w++) {
    const row: Date[] = []
    for (let d = 0; d < 7; d++) { row.push(new Date(cur)); cur.setDate(cur.getDate() + 1) }
    weeks.push(row)
    if (cur.getMonth() !== month && w >= 4) break
  }
  return weeks
}

function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function CalendarMonth({ viewDate, todayStr, events }: { viewDate: Date; todayStr: string; events: CalendarEvent[] }) {
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const weeks = buildWeeks(year, month)

  const byDay = new Map<string, CalendarEvent[]>()
  for (const ev of events) {
    const ds = new Date(ev.start).toLocaleDateString('en-CA', { timeZone: TZ })
    if (!byDay.has(ds)) byDay.set(ds, [])
    byDay.get(ds)!.push(ev)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', paddingBottom: 'var(--space-3)' }}>
        {WDAYS.map(d => (
          <div key={d} style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--t-label)', letterSpacing: 'var(--track-label)', textTransform: 'uppercase', color: 'var(--ink-3)', padding: '0 var(--space-3)' }}>{d}</div>
        ))}
      </div>
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gridAutoRows: '1fr', borderTop: 'var(--border)', borderLeft: 'var(--border)' }}>
        {weeks.flat().map((day, i) => {
          const ds = isoDate(day)
          const isToday = ds === todayStr
          const inMonth = day.getMonth() === month
          const dayEvs = byDay.get(ds) ?? []
          const isFirst = day.getDate() === 1
          return (
            <div key={i} style={{ borderRight: 'var(--border)', borderBottom: 'var(--border)',
              padding: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)',
              background: isToday ? 'var(--fill)' : 'transparent', opacity: inMonth ? 1 : 0.34, overflow: 'hidden', minHeight: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <span style={isToday
                  ? { fontFamily: 'var(--font-display)', fontSize: 'var(--t-h3)', lineHeight: 1,
                      width: '1.5em', height: '1.5em', borderRadius: 'var(--radius-pill)',
                      background: 'var(--invert-bg)', color: 'var(--invert-fg)',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontVariantNumeric: 'lining-nums' }
                  : { fontFamily: 'var(--font-display)', fontSize: 'var(--t-h3)', lineHeight: 1, fontVariantNumeric: 'lining-nums' }}>
                  {day.getDate()}
                </span>
                {isFirst && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--t-label)', letterSpacing: 'var(--track-cap)', textTransform: 'uppercase', color: 'var(--ink-3)' }}>{MONTH_SHORT[month]}</span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                {dayEvs.slice(0,3).map((ev, j) => (
                  <div key={j} style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)', minWidth: 0 }}>
                    <span style={{ width: 6, height: 6, borderRadius: 'var(--radius-pill)', background: ev.calendarColor, flexShrink: 0, transform: 'translateY(-1px)' }} />
                    <span title={ev.title} style={{ fontFamily: 'var(--font-text)', fontSize: 'var(--t-small)', lineHeight: 1.25, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.title}</span>
                  </div>
                ))}
                {dayEvs.length > 3 && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--t-label)', letterSpacing: '0.04em', color: 'var(--ink-3)', paddingLeft: 'calc(6px + var(--space-2))' }}>+{dayEvs.length - 3} more</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Agenda list
// ─────────────────────────────────────────────────────────────
function AgendaList({ events }: { events: CalendarEvent[] }) {
  const allDay = events.filter(e => e.allDay)
  const timed = events.filter(e => !e.allDay)

  return (
    <section>
      <Eyebrow style={{ marginBottom: 'var(--space-4)' }}>Today</Eyebrow>
      {events.length === 0 ? (
        <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 'var(--t-lead)', color: 'var(--ink-3)', margin: 0 }}>Nothing scheduled</p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {[...allDay, ...timed].map((ev, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-3)' }}>
              <span style={{ width: 8, height: 8, borderRadius: 'var(--radius-pill)', background: ev.calendarColor, flexShrink: 0, transform: 'translateY(-1px)' }} />
              <span style={{ flex: 1, fontFamily: 'var(--font-text)', fontSize: 'var(--t-lead)', color: 'var(--ink)', lineHeight: 1.3 }}>{ev.title}</span>
              {!ev.allDay && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--t-meta)', color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>
                  {new Date(ev.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: TZ })}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// Meal card
// ─────────────────────────────────────────────────────────────
function MealCard({ dinner, onTap }: { dinner: string; onTap: () => void }) {
  return (
    <section style={{ cursor: 'pointer' }} onClick={onTap}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
        <Icon name="utensils" size={14} style={{ color: 'var(--ink-3)' }} />
        <Eyebrow>Tonight</Eyebrow>
      </div>
      {dinner
        ? <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--t-h1)', fontWeight: 'var(--w-medium)', lineHeight: 1.05, color: 'var(--ink)' }}>{dinner}</div>
        : <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 'var(--t-lead)', color: 'var(--ink-3)', margin: 0 }}>Tap to set dinner</p>
      }
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// Grocery list
// ─────────────────────────────────────────────────────────────
function GroceryList({ items, onToggle }: { items: GroceryItem[]; onToggle: (id: string, checked: boolean) => void }) {
  const sorted = [...items.filter(i => !i.checked), ...items.filter(i => i.checked)].slice(0, 10)
  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
        <Icon name="cart" size={14} style={{ color: 'var(--ink-3)' }} />
        <Eyebrow>Grocery</Eyebrow>
      </div>
      {items.length === 0
        ? <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 'var(--t-lead)', color: 'var(--ink-3)', margin: 0 }}>List is empty</p>
        : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {sorted.map(item => (
              <li key={item.id}>
                <button onClick={() => onToggle(item.id, !item.checked)}
                  style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', width: '100%', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
                  <span style={{ width: 20, height: 20, flexShrink: 0, borderRadius: 'var(--radius-sm)', border: '1px solid var(--line-strong)',
                    background: item.checked ? 'var(--invert-bg)' : 'transparent', color: 'var(--invert-fg)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    transition: `background var(--dur) var(--ease)` }}>
                    {item.checked && <Icon name="check" size={13} sw={2} />}
                  </span>
                  <span style={{ fontFamily: 'var(--font-text)', fontSize: 'var(--t-lead)', color: item.checked ? 'var(--ink-3)' : 'var(--ink)', textDecoration: item.checked ? 'line-through' : 'none', textDecorationThickness: '1px' }}>
                    {item.text}
                  </span>
                </button>
              </li>
            ))}
            {items.length > 10 && <li style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--t-label)', color: 'var(--ink-3)' }}>+{items.length - 10} more on /manage</li>}
          </ul>
        )
      }
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// Theme toggle
// ─────────────────────────────────────────────────────────────
function ThemeToggle({ theme, onChange }: { theme: Theme; onChange: (t: Theme) => void }) {
  const seg = (val: Theme, icon: string) => {
    const active = theme === val
    return (
      <button onClick={() => onChange(val)} aria-pressed={active} aria-label={val}
        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)',
          padding: '7px 13px', border: 'none', borderRadius: 'var(--radius-pill)',
          background: active ? 'var(--invert-bg)' : 'transparent', color: active ? 'var(--invert-fg)' : 'var(--ink-3)',
          cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 'var(--t-label)', letterSpacing: 'var(--track-cap)',
          textTransform: 'uppercase', lineHeight: 1, transition: `background var(--dur) var(--ease), color var(--dur) var(--ease)` }}>
        <Icon name={icon} size={16} sw={1.5} />
        {val === 'day' ? 'Day' : 'Night'}
      </button>
    )
  }
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 2, padding: 3,
      border: 'var(--border)', borderRadius: 'var(--radius-pill)', background: 'var(--fill)' }}>
      {seg('day', 'sun')}{seg('night', 'moon')}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Weekly dinner editor — pop-out modal
// ─────────────────────────────────────────────────────────────
const WEEKDAY_ROWS: { key: string; label: string }[] = [
  { key: 'monday',    label: 'Mon' },
  { key: 'tuesday',  label: 'Tue' },
  { key: 'wednesday',label: 'Wed' },
  { key: 'thursday', label: 'Thu' },
  { key: 'friday',   label: 'Fri' },
]

function WeekdayEditRow({
  label, defaultValue, isToday, saving, saved, onSave,
}: {
  label: string; defaultValue: string; isToday: boolean
  saving: boolean; saved: boolean; onSave: (meal: string) => void
}) {
  const [value, setValue] = useState(defaultValue)
  const [focused, setFocused] = useState(false)

  useEffect(() => { setValue(defaultValue) }, [defaultValue])

  const commit = () => {
    setFocused(false)
    if (value.trim() !== defaultValue) onSave(value.trim())
  }

  const rowStyle: CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
    padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-md)',
    background: isToday ? 'var(--fill)' : 'transparent',
  }
  const labelStyle: CSSProperties = {
    width: 44, flexShrink: 0, fontFamily: 'var(--font-mono)',
    fontSize: 'var(--t-label)', letterSpacing: 'var(--track-cap)', textTransform: 'uppercase',
    color: isToday ? 'var(--ink)' : 'var(--ink-3)',
  }
  const inputStyle: CSSProperties = {
    flex: 1, background: focused ? 'var(--fill)' : 'transparent',
    border: focused ? 'var(--border-strong)' : '1px solid transparent',
    borderRadius: 'var(--radius-sm)', padding: 'var(--space-2) var(--space-3)',
    fontFamily: 'var(--font-text)', fontSize: 'var(--t-body)', color: 'var(--ink)',
    outline: 'none', transition: 'border-color 0.15s, background 0.15s',
  }
  const statusStyle: CSSProperties = {
    width: 20, textAlign: 'center', fontFamily: 'var(--font-mono)',
    fontSize: 'var(--t-label)', flexShrink: 0,
    color: saving ? 'var(--ink-3)' : saved ? 'oklch(0.55 0.15 145)' : 'transparent',
  }

  return (
    <div style={rowStyle}>
      <span style={labelStyle}>
        {label}
        {isToday && <span style={{ display: 'block', fontSize: '0.75em', letterSpacing: 0, marginTop: 1 }}>today</span>}
      </span>
      <input
        type="text" value={value} placeholder="Not set"
        onChange={e => setValue(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
        style={inputStyle}
      />
      <span style={statusStyle}>{saving ? '…' : '✓'}</span>
    </div>
  )
}

function WeeklyMealEditor({
  mealPlan, todayStr, todayDayName, onClose, onRefresh,
}: {
  mealPlan: MealPlan; todayStr: string; todayDayName: string
  onClose: () => void; onRefresh: () => void
}) {
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const todayOverride = mealPlan.mealOverrides[todayStr] ?? ''
  const [override, setOverride] = useState(todayOverride)
  const [overrideSaving, setOverrideSaving] = useState(false)
  const [overrideSaved, setOverrideSaved] = useState(false)
  const hasExistingOverride = Boolean(mealPlan.mealOverrides[todayStr])

  const saveDefault = async (weekday: string, meal: string) => {
    setSaving(weekday); setSaved(null)
    await fetch('/api/meals', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'default', weekday, meal }),
    })
    setSaving(null); setSaved(weekday)
    setTimeout(() => setSaved((s: string | null) => s === weekday ? null : s), 1500)
    onRefresh()
  }

  const saveOverride = async () => {
    if (!override.trim()) return
    setOverrideSaving(true)
    await fetch('/api/meals', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'override', date: todayStr, meal: override.trim() }),
    })
    setOverrideSaving(false); setOverrideSaved(true)
    setTimeout(() => setOverrideSaved(false), 1500)
    onRefresh()
  }

  const clearOverride = async () => {
    await fetch(`/api/meals?date=${todayStr}`, { method: 'DELETE' })
    setOverride(''); onRefresh()
  }

  const modal: CSSProperties = {
    background: 'var(--card)', border: 'var(--border-strong)', borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-7)', width: 460, boxShadow: 'var(--shadow-pop)', maxHeight: '90vh', overflowY: 'auto',
  }
  const monoLabel: CSSProperties = {
    fontFamily: 'var(--font-mono)', fontSize: 'var(--t-label)', letterSpacing: 'var(--track-label)',
    textTransform: 'uppercase', color: 'var(--ink-3)',
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'oklch(0 0 0 / 0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div onClick={e => e.stopPropagation()} style={modal}>

        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--t-h2)', marginBottom: 'var(--space-6)' }}>
          Dinner schedule
        </div>

        {/* M–F weekly defaults */}
        <div style={{ ...monoLabel, marginBottom: 'var(--space-3)' }}>Weekly rotation</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', marginBottom: 'var(--space-6)' }}>
          {WEEKDAY_ROWS.map(({ key, label }) => (
            <WeekdayEditRow
              key={key}
              label={label}
              defaultValue={mealPlan.defaultMeals[key] ?? ''}
              isToday={key === todayDayName}
              saving={saving === key}
              saved={saved === key}
              onSave={meal => saveDefault(key, meal)}
            />
          ))}
        </div>

        <hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: `0 0 var(--space-5)` }} />

        {/* Tonight-only override */}
        <div style={{ ...monoLabel, marginBottom: 'var(--space-3)' }}>Tonight only</div>
        <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
          <input
            type="text" value={override} placeholder="Override tonight's dinner…"
            onChange={e => setOverride(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') saveOverride() }}
            style={{ flex: 1, background: 'var(--fill)', border: 'var(--border-strong)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)', fontFamily: 'var(--font-text)', fontSize: 'var(--t-body)', color: 'var(--ink)', outline: 'none' }}
          />
          <button
            onClick={saveOverride}
            disabled={!override.trim() || overrideSaving}
            style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--t-label)', letterSpacing: 'var(--track-cap)', textTransform: 'uppercase', padding: 'var(--space-2) var(--space-4)', background: 'var(--invert-bg)', color: 'var(--invert-fg)', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', opacity: !override.trim() || overrideSaving ? 0.4 : 1 }}>
            {overrideSaved ? 'Saved' : 'Set'}
          </button>
          {hasExistingOverride && (
            <button
              onClick={clearOverride}
              style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--t-label)', letterSpacing: 'var(--track-cap)', textTransform: 'uppercase', padding: 'var(--space-2) var(--space-4)', background: 'transparent', border: 'none', color: 'var(--ink-3)', cursor: 'pointer' }}>
              Clear
            </button>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--t-label)', letterSpacing: 'var(--track-cap)', textTransform: 'uppercase', padding: 'var(--space-2) var(--space-4)', background: 'transparent', border: 'none', color: 'var(--ink-3)', cursor: 'pointer' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Main display client
// ─────────────────────────────────────────────────────────────
export default function DisplayClient() {
  const [now, setNow] = useState<Date>(new Date())
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [dinner, setDinner] = useState('')
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null)
  const [grocery, setGrocery] = useState<GroceryItem[]>([])
  const [editingDinner, setEditingDinner] = useState(false)
  const [theme, setTheme] = useState<Theme>('night')
  const [monthOffset, setMonthOffset] = useState(0)

  // Sync theme from/to localStorage + html attr
  useEffect(() => {
    try {
      const saved = (localStorage.getItem('almanac-theme') as Theme | null) ?? 'night'
      setTheme(saved)
      document.documentElement.setAttribute('data-theme', saved)
    } catch { /* no-op */ }
  }, [])

  const applyTheme = (t: Theme) => {
    setTheme(t)
    document.documentElement.setAttribute('data-theme', t)
    try { localStorage.setItem('almanac-theme', t) } catch { /* no-op */ }
  }

  // Clock tick
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  // Hard reload every 4 h to prevent memory drift on A10 silicon
  useEffect(() => {
    const id = setTimeout(() => location.reload(), 4 * 60 * 60 * 1000)
    return () => clearTimeout(id)
  }, [])

  // Wake Lock
  useEffect(() => {
    let lock: WakeLockSentinel | null = null
    const acquire = async () => { try { lock = await navigator.wakeLock.request('screen') } catch { /* no-op */ } }
    acquire()
    const onVis = () => { if (document.visibilityState === 'visible') acquire() }
    document.addEventListener('visibilitychange', onVis)
    return () => { document.removeEventListener('visibilitychange', onVis); lock?.release().catch(() => { /* no-op */ }) }
  }, [])

  const fetchWeather = useCallback(async () => {
    try { const r = await fetch('/api/weather'); if (r.ok) setWeather(await r.json()) } catch { /* no-op */ }
  }, [])
  const fetchCalendar = useCallback(async () => {
    try { const r = await fetch('/api/calendar'); if (r.ok) { const d = await r.json(); setEvents(d.events ?? []) } } catch { /* no-op */ }
  }, [])
  const fetchMeals = useCallback(async () => {
    try {
      const r = await fetch('/api/meals')
      if (r.ok) { const d = await r.json(); setMealPlan(d); setDinner(d.today ?? '') }
    } catch { /* no-op */ }
  }, [])
  const fetchGrocery = useCallback(async () => {
    try { const r = await fetch('/api/grocery'); if (r.ok) setGrocery(await r.json()) } catch { /* no-op */ }
  }, [])

  useEffect(() => { fetchWeather(); fetchCalendar(); fetchMeals(); fetchGrocery() }, [fetchWeather, fetchCalendar, fetchMeals, fetchGrocery])
  useEffect(() => {
    const w = setInterval(fetchWeather, 10 * 60 * 1000)
    const c = setInterval(fetchCalendar, 10 * 60 * 1000)
    const m = setInterval(fetchMeals, 60 * 1000)
    const g = setInterval(fetchGrocery, 60 * 1000)
    return () => { clearInterval(w); clearInterval(c); clearInterval(m); clearInterval(g) }
  }, [fetchWeather, fetchCalendar, fetchMeals, fetchGrocery])

  const todayStr = now.toLocaleDateString('en-CA', { timeZone: TZ })
  const todayDayName = now.toLocaleDateString('en-US', { weekday: 'long', timeZone: TZ }).toLowerCase()
  const todayEvents = events
    .filter(e => new Date(e.start).toLocaleDateString('en-CA', { timeZone: TZ }) === todayStr)
    .sort((a, b) => {
      if (a.allDay && !b.allDay) return -1
      if (!a.allDay && b.allDay) return 1
      return new Date(a.start).getTime() - new Date(b.start).getTime()
    })

  const todayDate = new Date(todayStr + 'T12:00:00')
  const viewDate = new Date(todayDate.getFullYear(), todayDate.getMonth() + monthOffset, 1)

  const toggleGrocery = async (id: string, checked: boolean) => {
    setGrocery(prev => prev.map(i => i.id === id ? { ...i, checked } : i))
    await fetch('/api/grocery', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, checked }) })
  }

  const navBtn: CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, borderRadius: 'var(--radius-pill)', border: 'var(--border)', background: 'transparent', color: 'var(--ink-2)', cursor: 'pointer' }

  return (
    <div style={{ height: '100vh', overflow: 'hidden', display: 'grid', gridTemplateColumns: 'minmax(360px,30%) 1fr', background: 'var(--paper)', color: 'var(--ink)' }}>

      {/* ── Sidebar ── */}
      <aside style={{ borderRight: 'var(--border)', background: 'var(--paper-2)', padding: 'var(--space-8) var(--space-7)', display: 'flex', flexDirection: 'column', gap: 'var(--space-7)', minWidth: 0, overflowY: 'hidden' }}>
        <Clock now={now} />
        <Divider />
        <AgendaList events={todayEvents} />
        <div style={{ flex: 1 }} />
        <MealCard dinner={dinner} onTap={() => setEditingDinner(true)} />
        <Divider />
        <GroceryList items={grocery} onToggle={toggleGrocery} />
      </aside>

      {/* ── Main ── */}
      <main style={{ padding: 'var(--space-8) var(--space-8) var(--space-7)', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', minWidth: 0, overflowY: 'hidden' }}>
        <WeatherBar weather={weather} />
        <Divider />

        {/* Month nav + controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-5)', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            <button aria-label="Previous month" style={navBtn} onClick={() => setMonthOffset(o => o - 1)}>
              <Icon name="chevronLeft" size={20} />
            </button>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--t-h1)', fontWeight: 'var(--w-regular)', margin: 0, letterSpacing: 'var(--track-tight)', whiteSpace: 'nowrap' }}>
              {MONTHS[viewDate.getMonth()]} <span style={{ fontStyle: 'italic', color: 'var(--ink-3)' }}>{viewDate.getFullYear()}</span>
            </h1>
            <button aria-label="Next month" style={navBtn} onClick={() => setMonthOffset(o => o + 1)}>
              <Icon name="chevronRight" size={20} />
            </button>
          </div>
          <ThemeToggle theme={theme} onChange={applyTheme} />
        </div>

        {/* Calendar grid */}
        <div style={{ flex: 1, minHeight: 0 }}>
          <CalendarMonth viewDate={viewDate} todayStr={todayStr} events={events} />
        </div>
      </main>

      {editingDinner && mealPlan && (
        <WeeklyMealEditor
          mealPlan={mealPlan}
          todayStr={todayStr}
          todayDayName={todayDayName}
          onClose={() => setEditingDinner(false)}
          onRefresh={fetchMeals}
        />
      )}
    </div>
  )
}
