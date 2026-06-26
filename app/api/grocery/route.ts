import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/lib/redis'
import type { GroceryItem } from '@/types'

const KEY = 'grocery:items'

export async function GET() {
  const items = (await redis.get<GroceryItem[]>(KEY)) ?? []
  return NextResponse.json(items)
}

export async function POST(request: NextRequest) {
  const { text } = await request.json() as { text: string }
  if (!text?.trim()) return NextResponse.json({ error: 'Empty text' }, { status: 400 })

  const items = (await redis.get<GroceryItem[]>(KEY)) ?? []
  const newItem: GroceryItem = {
    id: crypto.randomUUID(),
    text: text.trim(),
    checked: false,
  }
  await redis.set(KEY, [...items, newItem])
  return NextResponse.json(newItem, { status: 201 })
}

export async function PUT(request: NextRequest) {
  const { id, checked } = await request.json() as { id: string; checked: boolean }
  const items = (await redis.get<GroceryItem[]>(KEY)) ?? []
  const updated = items.map(item =>
    item.id === id ? { ...item, checked } : item
  )
  await redis.set(KEY, updated)
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const clearChecked = searchParams.get('clearChecked')

  const items = (await redis.get<GroceryItem[]>(KEY)) ?? []

  if (clearChecked === 'true') {
    await redis.set(KEY, items.filter(i => !i.checked))
  } else if (id) {
    await redis.set(KEY, items.filter(i => i.id !== id))
  } else {
    return NextResponse.json({ error: 'Missing id or clearChecked' }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
