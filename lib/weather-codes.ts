// WMO Weather Code → human-readable condition + emoji
// https://open-meteo.com/en/docs#weathervariables

interface WeatherInfo {
  condition: string
  icon: string
}

export function decodeWeatherCode(code: number): WeatherInfo {
  if (code === 0) return { condition: 'Clear', icon: '☀️' }
  if (code === 1) return { condition: 'Mainly clear', icon: '🌤️' }
  if (code === 2) return { condition: 'Partly cloudy', icon: '⛅' }
  if (code === 3) return { condition: 'Overcast', icon: '☁️' }
  if (code === 45 || code === 48) return { condition: 'Foggy', icon: '🌫️' }
  if (code >= 51 && code <= 57) return { condition: 'Drizzle', icon: '🌦️' }
  if (code >= 61 && code <= 67) return { condition: 'Rain', icon: '🌧️' }
  if (code >= 71 && code <= 77) return { condition: 'Snow', icon: '❄️' }
  if (code >= 80 && code <= 82) return { condition: 'Showers', icon: '🌧️' }
  if (code === 85 || code === 86) return { condition: 'Snow showers', icon: '🌨️' }
  if (code === 95) return { condition: 'Thunderstorm', icon: '⛈️' }
  if (code === 96 || code === 99) return { condition: 'Thunderstorm', icon: '⛈️' }
  return { condition: 'Unknown', icon: '🌡️' }
}
