export interface CalendarEvent {
  id: string
  title: string
  start: string   // ISO datetime string
  end: string     // ISO datetime string
  allDay: boolean
  calendarIndex: number
  calendarLabel: string
  calendarColor: string
  location?: string
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
    highHour: string | null
    low: number
    lowHour: string | null
    precipChance: number
    precipHour: string | null
    sunrise: string
    sunset: string
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
