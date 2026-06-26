'use client'

import { useState, useEffect, useCallback } from 'react'
import type { MealPlan, GroceryItem } from '@/types'

const TZ = process.env.NEXT_PUBLIC_TZ_NAME ?? 'America/New_York'
const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

export default function ManageClient() {
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null)
  const [grocery, setGrocery] = useState<GroceryItem[]>([])
  const [newItem, setNewItem] = useState('')
  const [saving, setSaving] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2000)
  }

  const loadMeals = useCallback(async () => {
    const r = await fetch('/api/meals')
    if (r.ok) setMealPlan(await r.json())
  }, [])

  const loadGrocery = useCallback(async () => {
    const r = await fetch('/api/grocery')
    if (r.ok) setGrocery(await r.json())
  }, [])

  useEffect(() => {
    loadMeals()
    loadGrocery()
  }, [loadMeals, loadGrocery])

  // --- Meal actions ---

  const saveDefault = async (weekday: string, meal: string) => {
    setSaving(weekday)
    await fetch('/api/meals', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'default', weekday, meal }),
    })
    await loadMeals()
    setSaving(null)
    showToast('Saved')
  }

  const saveOverride = async (date: string, meal: string) => {
    setSaving('override')
    await fetch('/api/meals', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'override', date, meal }),
    })
    await loadMeals()
    setSaving(null)
    showToast('Saved')
  }

  const clearOverride = async (date: string) => {
    await fetch(`/api/meals?date=${date}`, { method: 'DELETE' })
    await loadMeals()
    showToast('Override cleared')
  }

  // --- Grocery actions ---

  const addItem = async () => {
    const text = newItem.trim()
    if (!text) return
    const r = await fetch('/api/grocery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    if (r.ok) {
      const item = await r.json()
      setGrocery(prev => [...prev, item])
      setNewItem('')
    }
  }

  const toggleItem = async (id: string, checked: boolean) => {
    setGrocery(prev => prev.map(i => (i.id === id ? { ...i, checked } : i)))
    await fetch('/api/grocery', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, checked }),
    })
  }

  const deleteItem = async (id: string) => {
    setGrocery(prev => prev.filter(i => i.id !== id))
    await fetch(`/api/grocery?id=${id}`, { method: 'DELETE' })
  }

  const clearChecked = async () => {
    setGrocery(prev => prev.filter(i => !i.checked))
    await fetch('/api/grocery?clearChecked=true', { method: 'DELETE' })
    showToast('Cleared checked items')
  }

  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: TZ })
  const todayOverride = mealPlan?.mealOverrides[todayStr]
  const hasChecked = grocery.some(i => i.checked)

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-16">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm px-4 py-2 rounded-full z-50 shadow-lg">
          {toast}
        </div>
      )}

      <header className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <h1 className="text-xl font-semibold">Family Dashboard</h1>
        <a href="/display" className="text-sm text-blue-600 mt-0.5 block">
          ← Back to display
        </a>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-8">

        {/* ── Grocery ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold">Grocery list</h2>
            {hasChecked && (
              <button
                className="text-sm text-red-500 hover:text-red-700"
                onClick={clearChecked}
              >
                Clear checked
              </button>
            )}
          </div>

          {/* Add item */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-base outline-none focus:border-blue-500 bg-white"
              placeholder="Add item…"
              value={newItem}
              onChange={e => setNewItem(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addItem()}
            />
            <button
              className="bg-blue-600 text-white px-5 py-3 rounded-xl font-medium disabled:opacity-40"
              onClick={addItem}
              disabled={!newItem.trim()}
            >
              Add
            </button>
          </div>

          {/* Items */}
          {grocery.length === 0 ? (
            <p className="text-gray-400 text-sm">List is empty</p>
          ) : (
            <ul className="space-y-1">
              {[...grocery.filter(i => !i.checked), ...grocery.filter(i => i.checked)].map(
                item => (
                  <li key={item.id} className="flex items-center gap-3 py-2">
                    <button
                      className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                        item.checked
                          ? 'bg-green-500 border-green-500'
                          : 'border-gray-300'
                      }`}
                      onClick={() => toggleItem(item.id, !item.checked)}
                    >
                      {item.checked && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
                          <path
                            d="M2 6l3 3 5-5"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </button>
                    <span
                      className={`flex-1 text-base ${
                        item.checked ? 'line-through text-gray-400' : ''
                      }`}
                    >
                      {item.text}
                    </span>
                    <button
                      className="text-gray-300 hover:text-red-500 transition-colors p-1"
                      onClick={() => deleteItem(item.id)}
                      aria-label="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16">
                        <path
                          d="M4 4l8 8M12 4l-8 8"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                  </li>
                )
              )}
            </ul>
          )}
        </section>

        {/* ── Tonight's dinner ── */}
        <section>
          <h2 className="text-base font-semibold mb-3">Tonight's dinner</h2>
          <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
            <p className="text-sm text-gray-500">
              Current:{' '}
              <strong className="text-gray-900">{mealPlan?.today || '—'}</strong>
              {todayOverride && (
                <span className="ml-1 text-xs text-orange-500">(override)</span>
              )}
            </p>
            <OverrideForm
              date={todayStr}
              current={todayOverride ?? ''}
              onSave={saveOverride}
              onClear={todayOverride ? () => clearOverride(todayStr) : undefined}
              saving={saving === 'override'}
            />
          </div>
        </section>

        {/* ── Weekly defaults ── */}
        <section>
          <h2 className="text-base font-semibold mb-3">Weekly defaults</h2>
          <div className="bg-white border border-gray-200 rounded-2xl divide-y divide-gray-100">
            {WEEKDAYS.map(day => (
              <WeekdayRow
                key={day}
                day={day}
                current={mealPlan?.defaultMeals[day] ?? ''}
                saving={saving === day}
                onSave={meal => saveDefault(day, meal)}
              />
            ))}
          </div>
        </section>

      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function WeekdayRow({
  day,
  current,
  saving,
  onSave,
}: {
  day: string
  current: string
  saving: boolean
  onSave: (meal: string) => void
}) {
  const [value, setValue] = useState(current)
  const [editing, setEditing] = useState(false)

  useEffect(() => { setValue(current) }, [current])

  const commit = () => {
    if (value.trim() !== current) onSave(value.trim())
    setEditing(false)
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="w-24 text-sm font-medium capitalize text-gray-700 flex-shrink-0">
        {day}
      </span>
      {editing ? (
        <input
          className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-500"
          value={value}
          autoFocus
          onChange={e => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') commit() }}
        />
      ) : (
        <button
          className="flex-1 text-left text-sm text-gray-900 hover:text-blue-600 transition-colors"
          onClick={() => setEditing(true)}
        >
          {value || <span className="text-gray-400">Tap to set</span>}
        </button>
      )}
      {saving && <span className="text-xs text-gray-400">Saving…</span>}
    </div>
  )
}

function OverrideForm({
  date,
  current,
  onSave,
  onClear,
  saving,
}: {
  date: string
  current: string
  onSave: (date: string, meal: string) => void
  onClear?: () => void
  saving: boolean
}) {
  const [value, setValue] = useState(current)

  useEffect(() => { setValue(current) }, [current])

  return (
    <div className="flex gap-2">
      <input
        type="text"
        className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500"
        placeholder="Override for today only…"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && onSave(date, value.trim())}
      />
      <button
        className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-40"
        onClick={() => onSave(date, value.trim())}
        disabled={saving || !value.trim()}
      >
        {saving ? '…' : 'Set'}
      </button>
      {onClear && (
        <button
          className="text-sm text-gray-400 hover:text-red-500 transition-colors px-1"
          onClick={onClear}
        >
          Clear
        </button>
      )}
    </div>
  )
}
