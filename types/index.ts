export interface CalendarEvent {
  id: string
  title: string
  start: string   // ISO datetime string
  end: string     // ISO datetime string
  allDay: boolean
  calendarIndex: number
  calendarLabel: string
  calendarColor: string
}

export interface WeatherData {
  current: {
    temp: number
    conditionCode: number
    condition: string
    icon: string
  }
  today: {
    high: number
    low: number
    precipChance: number
    precipHour: string | null  // e.g. "3 PM" if rain expected, null otherwise
    sunrise: string            // e.g. "5:24 AM"
    sunset: string             // e.g. "8:35 PM"
  }
}

export interface MealPlan {
  defaultMeals: Record<string, string>   // weekday name → meal
  mealOverrides: Record<string, string>  // ISO date → meal
  today: string                          // resolved dinner for today
}

export interface GroceryItem {
  id: string
  text: string
  checked: boolean
}
