// Tasteful palette for automatic calendar color assignment.
// Chosen to be distinct and readable on a dark (#0d1117) background.
const PALETTE = [
  '#818cf8', // indigo-400
  '#34d399', // emerald-400
  '#fbbf24', // amber-400
  '#fb7185', // rose-400
  '#38bdf8', // sky-400
  '#c084fc', // purple-400
]

export function getCalendarColors(count: number): string[] {
  const envColors = process.env.ICS_COLORS
    ?.split(',')
    .map(c => c.trim())
    .filter(Boolean)

  if (envColors && envColors.length >= count) {
    return envColors.slice(0, count)
  }

  return Array.from({ length: count }, (_, i) => PALETTE[i % PALETTE.length])
}
