import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/lib/redis'
import type { MealPlan } from '@/types'

const DEFAULT_WEEKLY: Record<string, string> = {
  monday: 'Spaghetti',
  tuesday: 'Tacos',
  wednesday: 'Stir-fry',
  thursday: 'Sheet-pan chicken',
  friday: 'Pizza',
  saturday: 'Leftovers / out',
  sunday: 'Slow cooker',
}

function resolveToday(
  defaults: Record<string, string>,
  overrides: Record<string, string>,
  tz: string
): string {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: tz })
  if (overrides[today]) return overrides[today]
  const dayName = new Date()
    .toLocaleDateString('en-US', { weekday: 'long', timeZone: tz })
    .toLowerCase()
  return defaults[dayName] ?? ''
}

export async function GET() {
  const tz = process.env.TZ_NAME ?? 'America/New_York'

  const [defaults, overrides] = await Promise.all([
    redis.get<Record<string, string>>('meals:defaults'),
    redis.get<Record<string, string>>('meals:overrides'),
  ])

  const defaultMeals = defaults ?? DEFAULT_WEEKLY
  const mealOverrides = overrides ?? {}
  const today = resolveToday(defaultMeals, mealOverrides, tz)

  return NextResponse.json({ defaultMeals, mealOverrides, today } satisfies MealPlan)
}

export async function PUT(request: NextRequest) {
  const body = await request.json()
  const { type, weekday, date, meal } = body as {
    type: 'default' | 'override'
    weekday?: string
    date?: string
    meal: string
  }

  if (type === 'default' && weekday) {
    const current = (await redis.get<Record<string, string>>('meals:defaults')) ?? DEFAULT_WEEKLY
    const updated = { ...current, [weekday.toLowerCase()]: meal }
    await redis.set('meals:defaults', updated)
    return NextResponse.json({ ok: true })
  }

  if (type === 'override' && date) {
    const current = (await redis.get<Record<string, string>>('meals:overrides')) ?? {}
    const updated = { ...current, [date]: meal }
    await redis.set('meals:overrides', updated)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')
  if (!date) return NextResponse.json({ error: 'Missing date' }, { status: 400 })

  const current = (await redis.get<Record<string, string>>('meals:overrides')) ?? {}
  const { [date]: _removed, ...rest } = current
  await redis.set('meals:overrides', rest)
  return NextResponse.json({ ok: true })
}
