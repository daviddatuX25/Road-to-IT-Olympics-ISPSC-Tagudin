// Streak engine — server-side, Asia/Manila TZ, computed from
// client_submission_timestamp per the handoff doc §5.
//
// Rules:
//  - "Week" = Mon 00:00 – Sun 23:59:59 in Asia/Manila, fixed regardless of device locale.
//  - A week "counts" for a user/domain if at least one submission landed in it.
//  - A week with no active milestones is a SKIP week — it neither extends nor
//    breaks the streak. This is the genuine-downtime path: if the server was
//    down, the admin paused the season, or no milestones got published that
//    week, students shouldn't be punished for not submitting. It is NOT a
//    planned strategy — the season expects consistent milestones every week,
//    and the streak reflects actual student practice. Skip weeks only happen
//    when the system genuinely has nothing for the student to submit to.
//  - Streak is counted backwards from the current week. The current week
//    without a submission doesn't break the streak (student might still
//    submit before Sunday 23:59). A past week with active milestones and no
//    submission breaks the streak.
//
// All computation is done in a single utility so client and server agree.

import { db } from './db'
import {
  manilaWeekKey,
  manilaWeekStartMs,
  manilaWeekStart,
  currentManilaWeekStart,
  weekStartNDaysAgo,
  lastNWeekStarts
} from './timezone'

export {
  manilaWeekKey,
  manilaWeekStartMs,
  manilaWeekStart,
  currentManilaWeekStart,
  weekStartNDaysAgo,
  lastNWeekStarts
}

// For a given domain, return the set of week-starts (Manila) where at least
// one milestone was active during that week. We approximate "active during
// week" as "status='active' and createdAt <= end of week". Archived ones that
// were active during the week still count, because students could have been
// working against them.
export async function getActiveWeekKeysForDomain(domainId: string, seasonId: string, weeks: Date[]): Promise<Set<string>> {
  if (weeks.length === 0) return new Set()
  // Pull all active/archived milestones for this domain and season — we need their createdAt
  // to figure out which weeks they were active during. Don't over-filter at the
  // query level; the per-week check below does the real work.
  const milestones = await db.milestone.findMany({
    where: {
      domainId,
      seasonId,
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
export async function computeStreakForUserDomain(userId: string, domainId: string, seasonId: string): Promise<number> {
  const weeks = lastNWeekStarts(52)
  const activeWeekKeys = await getActiveWeekKeysForDomain(domainId, seasonId, weeks)

  // Get all submission timestamps for this user+domain in the past year for this season
  const submissions = await db.submission.findMany({
    where: {
      userId,
      milestone: { domainId, seasonId },
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
export async function computeOverallStreak(userId: string, seasonId: string): Promise<number> {
  const domains = await db.domain.findMany({ select: { id: true } })
  let max = 0
  for (const d of domains) {
    const s = await computeStreakForUserDomain(userId, d.id, seasonId)
    if (s > max) max = s
  }
  return max
}

export type StreakBreakdown = {
  domainId: string
  domainKey: string
  domainName: string
  domainColor: string
  domainIcon: string
  streak: number
  thisWeekSubmitted: boolean
}

export async function computeStreakBreakdown(userId: string, seasonId: string): Promise<StreakBreakdown[]> {
  const domains = await db.domain.findMany()
  const thisWeekStart = currentManilaWeekStart()
  const thisWeekEnd = new Date(thisWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
  const out: StreakBreakdown[] = []
  for (const d of domains) {
    const streak = await computeStreakForUserDomain(userId, d.id, seasonId)
    const thisWeekSubmission = await db.submission.findFirst({
      where: {
        userId,
        milestone: { domainId: d.id, seasonId },
        clientSubmissionTimestamp: { gte: thisWeekStart, lt: thisWeekEnd },
      },
      select: { id: true },
    })
    out.push({
      domainId: d.id,
      domainKey: d.key,
      domainName: d.name,
      domainColor: d.color,
      domainIcon: d.icon,
      streak,
      thisWeekSubmitted: !!thisWeekSubmission,
    })
  }
  return out
}
