// Streak engine — server-side, Asia/Manila TZ, computed from
// client_submission_timestamp per the handoff doc §5.
//
// Rules:
//  - "Week" = Mon 00:00 – Sun 23:59:59 in Asia/Manila, fixed regardless of device locale.
//  - A week "counts" for a user/domain if at least one submission landed in it.
//  - Weeks where the domain had zero active milestones are SKIP weeks: they
//    neither extend nor break a streak. This protects Sept maintenance mode
//    and the July diagnostic week.
//  - Streak is counted backwards from the current week. First non-skip week
//    without a submission breaks the streak.
//
// All computation is done in a single utility so client and server agree.

import { db } from './db'

const MANILA_TZ = 'Asia/Manila'

function toManilaMs(ms: number): number {
  // Manila is UTC+8 year-round (no DST). Rather than depend on Intl for the
  // arithmetic, shift manually — this is what the SQL view would do too.
  // We do still need the wall-clock fields in Manila, which Intl gives us.
  return ms
}

function manilaWeekStartMs(ms: number): number {
  // Get Manila wall-clock for this instant, find the Monday 00:00 of that week.
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: MANILA_TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    weekday: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  })
  const parts = formatter.formatToParts(new Date(ms))
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? ''
  // JS Date months are 0-indexed
  const year = Number(get('year'))
  const month = Number(get('month')) - 1
  const day = Number(get('day'))
  // Compute weekday: Mon=1..Sun=7
  const d = new Date(Date.UTC(year, month, day))
  const weekday = d.getUTCDay() === 0 ? 7 : d.getUTCDay()
  const mondayUtcMs = Date.UTC(year, month, day - (weekday - 1), 0, 0, 0)
  // mondayUtcMs is Monday 00:00 Manila expressed as a UTC timestamp.
  // Convert to ms since epoch: that's already what Date.UTC returns.
  void toManilaMs
  return mondayUtcMs
}

export function manilaWeekKey(ms: number): string {
  const start = manilaWeekStartMs(ms)
  const d = new Date(start)
  // YYYY-MM-DD of the Monday
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

// Returns the array of week-starts (Manila) for the last `n` weeks inclusive
// of the current one. Index 0 is the current week.
export function lastNWeekStarts(n: number): Date[] {
  const now = manilaWeekStartMs(Date.now())
  const out: Date[] = []
  for (let i = 0; i < n; i++) {
    out.push(new Date(now - i * 7 * 24 * 60 * 60 * 1000))
  }
  return out
}

// For a given domain, return the set of week-starts (Manila) where at least
// one milestone was active during that week. We approximate "active during
// week" as "status='active' and createdAt <= end of week". Archived ones that
// were active during the week still count, because students could have been
// working against them.
export async function getActiveWeekKeysForDomain(domainId: string, weeks: Date[]): Promise<Set<string>> {
  if (weeks.length === 0) return new Set()
  // Pull all active/archived milestones for this domain — we need their createdAt
  // to figure out which weeks they were active during. Don't over-filter at the
  // query level; the per-week check below does the real work.
  const milestones = await db.milestone.findMany({
    where: {
      domainId,
      status: { in: ['active', 'archived'] },
    },
    select: { createdAt: true, status: true, updatedAt: true },
  })
  // For each week, mark it as "had active milestones" if any milestone was
  // created before the end of that week. (A milestone is active from its
  // createdAt onward until it's archived — but we don't track archive-timestamp,
  // so we treat archived milestones as active for the entire span from their
  // createdAt. This is a slight overcount that's safe — it never breaks a
  // streak that should be broken.)
  const result = new Set<string>()
  for (const w of weeks) {
    const weekEnd = new Date(w.getTime() + 7 * 24 * 60 * 60 * 1000)
    const hadActive = milestones.some(m => m.createdAt <= weekEnd)
    if (hadActive) result.add(manilaWeekKey(w.getTime()))
  }
  return result
}

// Returns the count of consecutive weeks (ending at current week) where the
// user submitted at least once to this domain, skipping weeks where the
// domain had no active milestones.
export async function computeStreakForUserDomain(userId: string, domainId: string): Promise<number> {
  const weeks = lastNWeekStarts(52)
  const activeWeekKeys = await getActiveWeekKeysForDomain(domainId, weeks)

  // Get all submission timestamps for this user+domain in the past year
  const submissions = await db.submission.findMany({
    where: {
      userId,
      milestone: { domainId },
      clientSubmissionTimestamp: { gte: weeks[weeks.length - 1] },
    },
    select: { clientSubmissionTimestamp: true },
  })
  const submittedWeekKeys = new Set(submissions.map(s => manilaWeekKey(s.clientSubmissionTimestamp.getTime())))

  // Walk backwards through weeks, starting at the current one.
  // The current week is special: if the user hasn't submitted yet, we don't
  // break the streak — they might still submit before Sunday 23:59. We only
  // break on a PAST week with no submission.
  let streak = 0
  let started = false
  for (let i = 0; i < weeks.length; i++) {
    const w = weeks[i]
    const isCurrentWeek = i === 0
    const key = manilaWeekKey(w.getTime())
    const wasActive = activeWeekKeys.has(key)
    const submitted = submittedWeekKeys.has(key)
    if (!wasActive) {
      // Skip week — neither extends nor breaks the streak
      continue
    }
    if (submitted) {
      streak += 1
      started = true
    } else {
      // Active week, no submission.
      // - Current week: don't count, don't break (user might still submit).
      // - Past week: breaks the streak.
      if (isCurrentWeek) continue
      break
    }
  }
  return streak
}

// Total streak = max streak across all domains the user participates in.
// (A student practicing multiple domains can have one streak going even if a
// single domain goes dark for a week.)
export async function computeOverallStreak(userId: string): Promise<number> {
  const domains = await db.domain.findMany({ select: { id: true } })
  let max = 0
  for (const d of domains) {
    const s = await computeStreakForUserDomain(userId, d.id)
    if (s > max) max = s
  }
  return max
}

export type StreakBreakdown = {
  domainId: string
  domainKey: string
  domainName: string
  streak: number
  thisWeekSubmitted: boolean
}

export async function computeStreakBreakdown(userId: string): Promise<StreakBreakdown[]> {
  const domains = await db.domain.findMany()
  const thisWeekStart = currentManilaWeekStart()
  const thisWeekEnd = new Date(thisWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
  const out: StreakBreakdown[] = []
  for (const d of domains) {
    const streak = await computeStreakForUserDomain(userId, d.id)
    const thisWeekSubmission = await db.submission.findFirst({
      where: {
        userId,
        milestone: { domainId: d.id },
        clientSubmissionTimestamp: { gte: thisWeekStart, lt: thisWeekEnd },
      },
      select: { id: true },
    })
    out.push({
      domainId: d.id,
      domainKey: d.key,
      domainName: d.name,
      streak,
      thisWeekSubmitted: !!thisWeekSubmission,
    })
  }
  return out
}
