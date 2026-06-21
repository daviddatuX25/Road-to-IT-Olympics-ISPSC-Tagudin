const MANILA_TZ = 'Asia/Manila'

export function manilaWeekStartMs(ms: number): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: MANILA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const parts = formatter.formatToParts(new Date(ms))
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  const year = Number(get('year'))
  const month = Number(get('month')) - 1
  const day = Number(get('day'))
  const d = new Date(Date.UTC(year, month, day))
  const weekday = d.getUTCDay() === 0 ? 7 : d.getUTCDay()
  const mondayUtcMs = Date.UTC(year, month, day - (weekday - 1), 0, 0, 0)
  return mondayUtcMs
}

export function manilaWeekKey(ms: number): string {
  const start = manilaWeekStartMs(ms)
  const d = new Date(start)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
export function manilaWeekStart(ms: number): Date {
  return new Date(manilaWeekStartMs(ms))
}

export function currentManilaWeekStart(): Date {
  return manilaWeekStart(Date.now())
}

export function weekStartNDaysAgo(n: number): Date {
  return new Date(manilaWeekStartMs(Date.now()) - n * 24 * 60 * 60 * 1000)
}

export function lastNWeekStarts(n: number): Date[] {
  const now = manilaWeekStartMs(Date.now())
  const out: Date[] = []
  for (let i = 0; i < n; i++) {
    out.push(new Date(now - i * 7 * 24 * 60 * 60 * 1000))
  }
  return out
}
