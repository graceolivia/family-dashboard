import { NextResponse } from 'next/server'
import { decodeWeatherCode } from '@/lib/weather-codes'

export async function GET() {
  const lat = process.env.WEATHER_LAT ?? '40.85'
  const lon = process.env.WEATHER_LON ?? '-73.94'
  const tz = process.env.TZ_NAME ?? 'America/New_York'

  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    temperature_unit: 'fahrenheit',
    timezone: tz,
    forecast_days: '2',
    current: 'temperature_2m,weather_code',
    daily: [
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_probability_max',
      'sunrise',
      'sunset',
    ].join(','),
    hourly: 'precipitation_probability,temperature_2m',
  })

  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?${params}`,
    { next: { revalidate: 600 } }
  )
  if (!res.ok) {
    return NextResponse.json({ error: 'Weather unavailable' }, { status: 502 })
  }

  const data = await res.json()

  const code: number = data.current.weather_code
  const { condition, icon } = decodeWeatherCode(code)

  // Open-Meteo returns times as local strings ("2026-06-26T13:00") in the requested timezone.
  // Parsing them with new Date() on a UTC server would shift the hour, so extract directly.
  const localHour = (iso: string) => parseInt(iso.split('T')[1].split(':')[0], 10)
  const formatLocalTime = (iso: string): string => {
    const h = localHour(iso)
    const m = parseInt(iso.split('T')[1].split(':')[1], 10)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 || 12
    return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`
  }

  // Current hour in the configured timezone
  const nowHour = parseInt(
    new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: tz }).format(
      new Date()
    ),
    10
  )

  const hourlyTimes: string[] = data.hourly.time
  const hourlyPrecip: number[] = data.hourly.precipitation_probability
  const hourlyTemp: number[] = data.hourly.temperature_2m

  // Today's date prefix (first 10 chars of the first hourly time)
  const todayPrefix = hourlyTimes[0]?.slice(0, 10) ?? ''

  // Find today's indices
  const todayIndices = hourlyTimes
    .map((t, i) => ({ i, t }))
    .filter(({ t }) => t.startsWith(todayPrefix))
    .map(({ i }) => i)

  // Hour of daily high temperature
  let highHour: string | null = null
  let highTemp = -Infinity
  for (const i of todayIndices) {
    if (hourlyTemp[i] > highTemp) { highTemp = hourlyTemp[i]; highHour = formatLocalTime(hourlyTimes[i]) }
  }

  // Hour of daily low temperature (among today's hours from now onward, prefer morning)
  let lowHour: string | null = null
  let lowTemp = Infinity
  for (const i of todayIndices) {
    if (hourlyTemp[i] < lowTemp) { lowTemp = hourlyTemp[i]; lowHour = formatLocalTime(hourlyTimes[i]) }
  }

  // Hour with peak precipitation chance today (remaining hours)
  let precipHour: string | null = null
  let precipMax = 0
  for (const i of todayIndices) {
    if (localHour(hourlyTimes[i]) >= nowHour && hourlyPrecip[i] > precipMax) {
      precipMax = hourlyPrecip[i]
      precipHour = formatLocalTime(hourlyTimes[i])
    }
  }

  const sunrise = data.daily.sunrise?.[0] ? formatLocalTime(data.daily.sunrise[0]) : null
  const sunset = data.daily.sunset?.[0] ? formatLocalTime(data.daily.sunset[0]) : null

  return NextResponse.json({
    current: {
      temp: Math.round(data.current.temperature_2m),
      conditionCode: code,
      condition,
      icon,
    },
    today: {
      high: Math.round(data.daily.temperature_2m_max?.[0] ?? 0),
      highHour,
      low: Math.round(data.daily.temperature_2m_min?.[0] ?? 0),
      lowHour,
      precipChance: data.daily.precipitation_probability_max?.[0] ?? 0,
      precipHour,
      sunrise,
      sunset,
    },
  })
}
