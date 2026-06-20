'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import {
  createSession, destroySession, getSession, requireUser, requireRole,
  verifyPassword, hashPassword,
} from '@/lib/auth'
import { AVATAR_MAP } from '@/lib/avatars'

// -----------------------------------------------------------------------------
// Auth
// -----------------------------------------------------------------------------

export async function loginAction(email: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const normalizedEmail = email.toLowerCase().trim()
  if (!normalizedEmail || !password) return { ok: false, error: 'Email and password required.' }
  // Basic email format check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return { ok: false, error: 'Invalid email format.' }
  }
  const user = await db.user.findUnique({ where: { email: normalizedEmail } })
  if (!user) return { ok: false, error: 'No account with that email.' }
  if (!verifyPassword(password, user.passwordHash)) return { ok: false, error: 'Wrong password.' }
  await createSession(user.id)
  revalidatePath('/')
  return { ok: true }
}

export async function logoutAction(): Promise<void> {
  await destroySession()
  revalidatePath('/')
}

export async function getCurrentUser() {
  return getSession()
}

// -----------------------------------------------------------------------------
// Profile
// -----------------------------------------------------------------------------

export async function updateProfileAction(input: { nickname: string; avatarId: string }): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser()
  const trimmed = input.nickname.trim()
  if (trimmed.length < 2) return { ok: false, error: 'Nickname must be at least 2 characters.' }
  if (trimmed.length > 32) return { ok: false, error: 'Nickname too long (max 32 chars).' }
  if (!AVATAR_MAP[input.avatarId]) return { ok: false, error: 'Unknown avatar.' }

  await db.user.update({
    where: { id: user.id },
    data: { nickname: trimmed, avatarId: input.avatarId },
  })
  revalidatePath('/')
  return { ok: true }
}

// -----------------------------------------------------------------------------
// Users (admin-only)
// -----------------------------------------------------------------------------

export async function listUsersAction() {
  const admin = await requireRole('admin')
  void admin
  return db.user.findMany({
    orderBy: { createdAt: 'asc' },
    include: { captainOf: { include: { domain: true } } },
  })
}

export async function createUserAction(input: {
  email: string
  password: string
  role: 'admin' | 'instructor' | 'student'
  nickname: string
  realName?: string
  studentId?: string
  avatarId?: string
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  await requireRole('admin')
  const email = input.email.toLowerCase().trim()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'Invalid email format.' }
  }
  if (await db.user.findUnique({ where: { email } })) {
    return { ok: false, error: 'Email already in use.' }
  }
  if (input.password.length < 8) return { ok: false, error: 'Password must be at least 8 characters.' }
  if (input.nickname.trim().length < 2) return { ok: false, error: 'Nickname must be at least 2 characters.' }
  if (!['admin', 'instructor', 'student'].includes(input.role)) return { ok: false, error: 'Invalid role.' }
  if (input.avatarId && !AVATAR_MAP[input.avatarId]) return { ok: false, error: 'Invalid avatar.' }

  const user = await db.user.create({
    data: {
      email,
      passwordHash: hashPassword(input.password),
      role: input.role,
      nickname: input.nickname.trim().slice(0, 32),
      realName: input.realName?.trim().slice(0, 100) || null,
      studentId: input.studentId?.trim().slice(0, 50) || null,
      avatarId: input.avatarId ?? 'avatar-01',
    },
  })
  revalidatePath('/')
  return { ok: true, id: user.id }
}

export async function updateUserRoleAction(userId: string, role: 'admin' | 'instructor' | 'student'): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireRole('admin')
  if (!['admin', 'instructor', 'student'].includes(role)) return { ok: false, error: 'Invalid role.' }
  await db.user.update({ where: { id: userId }, data: { role } })
  revalidatePath('/')
  return { ok: true }
}

export async function deleteUserAction(userId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await requireRole('admin')
  if (admin.id === userId) return { ok: false, error: "You can't delete your own account." }
  await db.user.delete({ where: { id: userId } })
  revalidatePath('/')
  return { ok: true }
}

export async function assignCaptainAction(userId: string, domainId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireRole('admin')
  try {
    await db.domainCaptain.create({ data: { user: { connect: { id: userId } }, domain: { connect: { id: domainId } } } })
  } catch {
    return { ok: false, error: 'Already a captain of this domain.' }
  }
  revalidatePath('/')
  return { ok: true }
}

export async function removeCaptainAction(userId: string, domainId: string): Promise<void> {
  await requireRole('admin')
  await db.domainCaptain.delete({ where: { userId_domainId: { userId, domainId } } })
  revalidatePath('/')
}

// -----------------------------------------------------------------------------
// Domains
// -----------------------------------------------------------------------------

export async function listDomainsAction() {
  return db.domain.findMany({ orderBy: { name: 'asc' } })
}

// -----------------------------------------------------------------------------
// Milestones
// -----------------------------------------------------------------------------

export type MilestoneWithMeta = Awaited<ReturnType<typeof listMilestoneMetaAction>>[number]

export async function listMilestoneMetaAction(filters?: {
  domainId?: string
  status?: 'draft' | 'active' | 'archived'
  mode?: 'tutor' | 'assessment' | 'journal'
  weekOrPhase?: string
}) {
  const where: Record<string, unknown> = {}
  if (filters?.domainId) where.domainId = filters.domainId
  if (filters?.status) where.status = filters.status
  if (filters?.mode) where.mode = filters.mode
  if (filters?.weekOrPhase) where.weekOrPhase = filters.weekOrPhase

  const session = await getSession()
  // For students, only show active or archived (no draft). For instructors/admins, all.
  if (session?.role === 'student') {
    where.status = { in: ['active', 'archived'] }
  }

  return db.milestone.findMany({
    where: where as Parameters<typeof db.milestone.findMany>[0]['where'],
    include: {
      domain: true,
      creator: { select: { id: true, nickname: true, avatarId: true } },
      _count: { select: { submissions: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getMilestoneAction(id: string) {
  const milestone = await db.milestone.findUnique({
    where: { id },
    include: {
      domain: true,
      creator: { select: { id: true, nickname: true, avatarId: true, role: true } },
      submissions: {
        orderBy: { clientSubmissionTimestamp: 'desc' },
        include: {
          user: { select: { id: true, nickname: true, avatarId: true, role: true } },
        },
      },
    },
  })
  if (!milestone) return null

  const session = await getSession()
  if (!session) return null

  // Visibility rules:
  //  - draft milestones: only admin/instructor + the creator
  //  - private diagnostic data (AI score, weakness tags, reflection, rawPayload):
  //    visible to the student themselves, the domain captain (if not the student),
  //    instructors, and admins. NOT visible to other students.
  const isAuthor = session.id === milestone.createdById
  const isStaff = session.role === 'admin' || session.role === 'instructor'
  let isCaptain = false
  if (session.role === 'student') {
    const cap = await db.domainCaptain.findUnique({
      where: { userId_domainId: { userId: session.id, domainId: milestone.domainId } },
    })
    isCaptain = !!cap
  }

  if (milestone.status === 'draft' && !isStaff && !isAuthor) return null

  const filteredSubs = milestone.submissions.map(s => {
    const isOwn = s.userId === session.id
    const canSeePrivate = isOwn || isStaff || isCaptain
    if (canSeePrivate) return s
    // Hide private diagnostic fields from other students
    return {
      ...s,
      aiScore: null,
      confidence: null,
      weaknessTags: '[]',
      reflection: null,
      rawPayload: '{}',
    }
  })

  return { ...milestone, submissions: filteredSubs }
}

export async function createMilestoneAction(input: {
  domainId: string
  weekOrPhase: string
  mode: 'tutor' | 'assessment' | 'journal'
  difficulty: 'easy' | 'average' | 'difficult'
  title: string
  promptTemplate: string
  acceptedInputTypes: string[]
  status?: 'draft' | 'active'
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const user = await requireUser()
  // Admins, instructors, and captains of the domain can create milestones
  let canCreate = user.role === 'admin' || user.role === 'instructor'
  if (!canCreate && user.role === 'student') {
    const cap = await db.domainCaptain.findUnique({
      where: { userId_domainId: { userId: user.id, domainId: input.domainId } },
    })
    canCreate = !!cap
  }
  if (!canCreate) return { ok: false, error: 'Not authorized to create milestones in this domain.' }

  if (input.title.trim().length < 3) return { ok: false, error: 'Title must be at least 3 characters.' }
  if (input.title.length > 200) return { ok: false, error: 'Title too long (max 200 chars).' }
  if (input.promptTemplate.trim().length < 10) return { ok: false, error: 'Prompt template is too short.' }
  if (input.promptTemplate.length > 50000) return { ok: false, error: 'Prompt template too long (max 50000 chars).' }

  const milestone = await db.milestone.create({
    data: {
      domain: { connect: { id: input.domainId } },
      creator: { connect: { id: user.id } },
      weekOrPhase: input.weekOrPhase,
      mode: input.mode,
      difficulty: input.difficulty,
      title: input.title.trim(),
      promptTemplate: input.promptTemplate,
      acceptedInputTypes: JSON.stringify(input.acceptedInputTypes.length ? input.acceptedInputTypes : ['guided_form']),
      status: input.status ?? 'draft',
    },
  })
  await db.appEvent.create({
    data: {
      kind: 'milestone-published',
      title: `Milestone ${input.status === 'active' ? 'published' : 'drafted'}: ${input.title}`,
      detail: `by ${user.nickname}`,
    },
  })
  revalidatePath('/')
  return { ok: true, id: milestone.id }
}

// Create a new version of a milestone (the "milestones don't disappear once
// they're scored" rule from the concept doc). The old version stays locked
// in place; the new version becomes editable and inherits the title/prompt.
export async function versionMilestoneAction(milestoneId: string, updates: {
  title: string
  promptTemplate: string
  acceptedInputTypes: string[]
  weekOrPhase?: string
  mode?: 'tutor' | 'assessment' | 'journal'
  difficulty?: 'easy' | 'average' | 'difficult'
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const user = await requireUser()
  const old = await db.milestone.findUnique({ where: { id: milestoneId }, include: { domain: true } })
  if (!old) return { ok: false, error: 'Milestone not found.' }

  // Same authorization as create
  let canEdit = user.role === 'admin' || user.role === 'instructor'
  if (!canEdit && user.role === 'student') {
    const cap = await db.domainCaptain.findUnique({
      where: { userId_domainId: { userId: user.id, domainId: old.domainId } },
    })
    canEdit = !!cap
  }
  if (!canEdit) return { ok: false, error: 'Not authorized to version this milestone.' }

  // Lock the old version if not already locked
  if (!old.isLocked) {
    await db.milestone.update({ where: { id: old.id }, data: { isLocked: true, status: 'archived' } })
  }

  const newVersion = await db.milestone.create({
    data: {
      domain: { connect: { id: old.domainId } },
      creator: { connect: { id: user.id } },
      parentMilestoneId: old.id,
      version: old.version + 1,
      weekOrPhase: updates.weekOrPhase ?? old.weekOrPhase,
      mode: updates.mode ?? old.mode,
      difficulty: updates.difficulty ?? old.difficulty,
      title: updates.title.trim(),
      promptTemplate: updates.promptTemplate,
      acceptedInputTypes: JSON.stringify(updates.acceptedInputTypes.length ? updates.acceptedInputTypes : ['guided_form']),
      status: 'active',
    },
  })
  revalidatePath('/')
  return { ok: true, id: newVersion.id }
}

export async function archiveMilestoneAction(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser()
  const m = await db.milestone.findUnique({ where: { id } })
  if (!m) return { ok: false, error: 'Not found.' }
  if (m.isLocked) return { ok: false, error: 'Milestone is locked (has submissions). Create a new version instead.' }

  let canEdit = user.role === 'admin' || user.role === 'instructor'
  if (!canEdit && user.role === 'student') {
    const cap = await db.domainCaptain.findUnique({
      where: { userId_domainId: { userId: user.id, domainId: m.domainId } },
    })
    canEdit = !!cap
  }
  if (!canEdit) return { ok: false, error: 'Not authorized.' }

  await db.milestone.update({ where: { id }, data: { status: 'archived' } })
  revalidatePath('/')
  return { ok: true }
}

export async function activateMilestoneAction(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser()
  const m = await db.milestone.findUnique({ where: { id } })
  if (!m) return { ok: false, error: 'Not found.' }
  if (m.isLocked) return { ok: false, error: 'Milestone is locked (has submissions). Create a new version instead.' }

  let canEdit = user.role === 'admin' || user.role === 'instructor'
  if (!canEdit && user.role === 'student') {
    const cap = await db.domainCaptain.findUnique({
      where: { userId_domainId: { userId: user.id, domainId: m.domainId } },
    })
    canEdit = !!cap
  }
  if (!canEdit) return { ok: false, error: 'Not authorized.' }

  await db.milestone.update({ where: { id }, data: { status: 'active' } })
  revalidatePath('/')
  return { ok: true }
}

// -----------------------------------------------------------------------------
// Submissions
// -----------------------------------------------------------------------------

export async function submitGuidedFormAction(input: {
  milestoneId: string
  aiScore?: number
  confidence?: number
  weaknessTags: string[]
  reflection?: string
  aiShareLink?: string
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const user = await requireUser()
  const milestone = await db.milestone.findUnique({ where: { id: input.milestoneId } })
  if (!milestone) return { ok: false, error: 'Milestone not found.' }
  if (milestone.status !== 'active') return { ok: false, error: 'Milestone is not active.' }

  // Validate score range
  if (input.aiScore !== undefined && (input.aiScore < 0 || input.aiScore > 1000)) {
    return { ok: false, error: 'AI score must be between 0 and 1000.' }
  }
  // Validate confidence range
  if (input.confidence !== undefined && (input.confidence < 1 || input.confidence > 5)) {
    return { ok: false, error: 'Confidence must be between 1 and 5.' }
  }
  // Limit number of weakness tags
  if (input.weaknessTags.length > 20) {
    return { ok: false, error: 'Too many weakness tags (max 20).' }
  }
  // Limit reflection length
  if (input.reflection && input.reflection.length > 5000) {
    return { ok: false, error: 'Reflection is too long (max 5000 characters).' }
  }
  // Validate share link URL if provided
  if (input.aiShareLink) {
    try {
      const url = new URL(input.aiShareLink)
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error()
    } catch {
      return { ok: false, error: 'AI share link must be a valid HTTP(S) URL.' }
    }
  }

  const sub = await db.submission.create({
    data: {
      milestone: { connect: { id: milestone.id } },
      milestoneVersion: milestone.version,
      user: { connect: { id: user.id } },
      clientSubmissionTimestamp: new Date(),
      syncStatus: 'synced',
      inputType: 'guided_form',
      aiShareLink: input.aiShareLink?.trim() || null,
      aiScore: input.aiScore ?? null,
      confidence: input.confidence ?? null,
      weaknessTags: JSON.stringify(input.weaknessTags.filter(t => t.trim().length).slice(0, 20)),
      reflection: input.reflection?.trim().slice(0, 5000) || null,
      rawPayload: JSON.stringify({ source: 'guided_form' }),
    },
  })

  // Lock the milestone now that it has at least one submission
  await db.milestone.update({ where: { id: milestone.id }, data: { isLocked: true } })

  revalidatePath('/')
  return { ok: true, id: sub.id }
}

export async function submitJsonAction(input: {
  milestoneId: string
  jsonPayload: string
  aiShareLink?: string
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const user = await requireUser()
  const milestone = await db.milestone.findUnique({ where: { id: input.milestoneId } })
  if (!milestone) return { ok: false, error: 'Milestone not found.' }
  if (milestone.status !== 'active') return { ok: false, error: 'Milestone is not active.' }
  if (input.jsonPayload.length > 100000) return { ok: false, error: 'JSON payload too large (max 100KB).' }

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(input.jsonPayload)
    if (typeof parsed !== 'object' || Array.isArray(parsed) || parsed === null) {
      return { ok: false, error: 'JSON must be an object.' }
    }
  } catch {
    return { ok: false, error: 'Invalid JSON.' }
  }

  // Try to extract standard fields if present
  const aiScore = typeof parsed.score === 'number' ? parsed.score : typeof parsed.aiScore === 'number' ? parsed.aiScore : null
  const confidence = typeof parsed.confidence === 'number' ? parsed.confidence : null
  const weaknessTags = Array.isArray(parsed.weaknessTags)
    ? parsed.weaknessTags.filter((t): t is string => typeof t === 'string')
    : []
  const reflection = typeof parsed.reflection === 'string' ? parsed.reflection : null

  const sub = await db.submission.create({
    data: {
      milestone: { connect: { id: milestone.id } },
      milestoneVersion: milestone.version,
      user: { connect: { id: user.id } },
      clientSubmissionTimestamp: new Date(),
      syncStatus: 'synced',
      inputType: 'json',
      aiShareLink: input.aiShareLink?.trim() || null,
      aiScore,
      confidence,
      weaknessTags: JSON.stringify(weaknessTags),
      reflection,
      rawPayload: JSON.stringify(parsed),
    },
  })

  await db.milestone.update({ where: { id: milestone.id }, data: { isLocked: true } })
  revalidatePath('/')
  return { ok: true, id: sub.id }
}

export async function listMySubmissionsAction() {
  const user = await requireUser()
  return db.submission.findMany({
    where: { userId: user.id },
    include: {
      milestone: { include: { domain: true } },
    },
    orderBy: { clientSubmissionTimestamp: 'desc' },
  })
}

// For captain/instructor/admin: see all submissions for a domain (with private
// diagnostics visible). For a student, see only their own.
export async function listDomainSubmissionsAction(domainId: string) {
  const user = await requireUser()
  const isStaff = user.role === 'admin' || user.role === 'instructor'
  let isCaptain = false
  if (user.role === 'student') {
    const cap = await db.domainCaptain.findUnique({
      where: { userId_domainId: { userId: user.id, domainId } },
    })
    isCaptain = !!cap
  }
  const canSeeAll = isStaff || isCaptain

  const subs = await db.submission.findMany({
    where: { milestone: { domainId } },
    include: {
      user: { select: { id: true, nickname: true, avatarId: true, role: true } },
      milestone: true,
    },
    orderBy: { clientSubmissionTimestamp: 'desc' },
    take: 100,
  })

  if (canSeeAll) return subs
  // Students not captain: see only their own submissions, full detail.
  // For others, see the completion mark only (no AI score, weakness tags, etc.)
  return subs.map(s => {
    if (s.userId === user.id) return s
    return {
      ...s,
      aiScore: null,
      confidence: null,
      weaknessTags: '[]',
      reflection: null,
      rawPayload: '{}',
    }
  })
}

// -----------------------------------------------------------------------------
// Streaks / Leaderboard
// -----------------------------------------------------------------------------

export async function getStreakBreakdownAction() {
  const user = await requireUser()
  const { computeStreakBreakdown } = await import('@/lib/streaks')
  return computeStreakBreakdown(user.id)
}

export type LeaderboardEntry = {
  userId: string
  nickname: string
  avatarId: string
  role: string
  bestStreak: number
  weeksCompleted: number
  thisWeekSubmitted: boolean
  isCaptain: boolean
  spotlight?: { reason: string; blurb: string } | null
}

export async function getLeaderboardAction(): Promise<LeaderboardEntry[]> {
  const session = await getSession()
  if (!session) return []

  const { computeStreakBreakdown, currentManilaWeekStart } = await import('@/lib/streaks')
  const weekStart = currentManilaWeekStart()
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)

  const students = await db.user.findMany({
    where: { role: 'student' },
    select: {
      id: true, nickname: true, avatarId: true, role: true,
      captainOf: { include: { domain: true } },
    },
  })

  const out: LeaderboardEntry[] = []
  for (const s of students) {
    const breakdown = await computeStreakBreakdown(s.id)
    const bestStreak = Math.max(0, ...breakdown.map(b => b.streak))
    const thisWeekSubmitted = breakdown.some(b => b.thisWeekSubmitted)
    // Count distinct weeks with at least one submission
    const subs = await db.submission.findMany({
      where: { userId: s.id },
      select: { clientSubmissionTimestamp: true },
    })
    const weekKeys = new Set(subs.map(sub => {
      const d = sub.clientSubmissionTimestamp
      // Manila Monday week key
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Manila',
        year: 'numeric', month: '2-digit', day: '2-digit',
      })
      const parts = formatter.formatToParts(d)
      const get = (t: string) => parts.find(p => p.type === t)?.value ?? ''
      const year = Number(get('year'))
      const month = Number(get('month')) - 1
      const day = Number(get('day'))
      const wd = new Date(Date.UTC(year, month, day)).getUTCDay()
      const weekday = wd === 0 ? 7 : wd
      const monday = new Date(Date.UTC(year, month, day - (weekday - 1)))
      return `${monday.getUTCFullYear()}-${String(monday.getUTCMonth() + 1).padStart(2, '0')}-${String(monday.getUTCDate()).padStart(2, '0')}`
    }))
    out.push({
      userId: s.id,
      nickname: s.nickname,
      avatarId: s.avatarId,
      role: s.role,
      bestStreak,
      weeksCompleted: weekKeys.size,
      thisWeekSubmitted,
      isCaptain: s.captainOf.length > 0,
      spotlight: null,
    })
    void weekEnd
  }

  // Attach weekly spotlight
  const spotlights = await db.weeklySpotlight.findMany({
    where: { weekOf: { gte: weekStart } },
    include: { user: true },
  })
  for (const spot of spotlights) {
    const entry = out.find(e => e.userId === spot.userId)
    if (entry) entry.spotlight = { reason: spot.reason, blurb: spot.blurb }
  }

  // Sort by bestStreak desc, then weeksCompleted desc, then thisWeekSubmitted desc
  out.sort((a, b) =>
    b.bestStreak - a.bestStreak ||
    b.weeksCompleted - a.weeksCompleted ||
    (b.thisWeekSubmitted ? 1 : 0) - (a.thisWeekSubmitted ? 1 : 0)
  )
  return out
}

// -----------------------------------------------------------------------------
// Assessment leaderboard (separate from the streak leaderboard)
// -----------------------------------------------------------------------------
// The original concept doc kept AI scores off the public leaderboard entirely.
// The user explicitly overrode that — they accept the cheating risk and will
// screen + remind students. So this view shows top scorers by domain.
// AI scores are still private on the submissions themselves (a student can't
// see another student's reflection or weakness tags), but the aggregate
// ranking is public.

export type AssessmentLeader = {
  userId: string
  nickname: string
  avatarId: string
  isCaptain: boolean
  totalScore: number       // sum of all assessment-mode scores
  averageScore: number     // average across assessment-mode submissions
  assessmentCount: number  // how many assessment-mode submissions
  bestScore: number        // highest single assessment score
  perDomain: Array<{
    domainKey: string
    domainName: string
    domainColor: string
    totalScore: number
    averageScore: number
    count: number
  }>
}

export async function getAssessmentLeadersAction(): Promise<AssessmentLeader[]> {
  const session = await getSession()
  if (!session) return []

  // Get all assessment-mode submissions with a score, joined to the milestone's domain
  const submissions = await db.submission.findMany({
    where: {
      aiScore: { not: null },
      milestone: { mode: 'assessment' },
    },
    include: {
      user: {
        select: {
          id: true, nickname: true, avatarId: true, role: true,
          captainOf: { include: { domain: true } },
        },
      },
      milestone: { include: { domain: true } },
    },
  })

  // Group by user
  const byUser = new Map<string, AssessmentLeader & { _perDomainMap: Map<string, { domainKey: string; domainName: string; domainColor: string; totalScore: number; count: number }> }>()
  for (const sub of submissions) {
    if (sub.user.role !== 'student') continue
    const score = sub.aiScore ?? 0
    if (!byUser.has(sub.userId)) {
      byUser.set(sub.userId, {
        userId: sub.userId,
        nickname: sub.user.nickname,
        avatarId: sub.user.avatarId,
        isCaptain: sub.user.captainOf.length > 0,
        totalScore: 0,
        averageScore: 0,
        assessmentCount: 0,
        bestScore: 0,
        perDomain: [],
        _perDomainMap: new Map(),
      })
    }
    const entry = byUser.get(sub.userId)!
    entry.totalScore += score
    entry.assessmentCount += 1
    entry.bestScore = Math.max(entry.bestScore, score)

    const dkey = sub.milestone.domain.key
    if (!entry._perDomainMap.has(dkey)) {
      entry._perDomainMap.set(dkey, {
        domainKey: dkey,
        domainName: sub.milestone.domain.name,
        domainColor: sub.milestone.domain.color,
        totalScore: 0,
        count: 0,
      })
    }
    const pd = entry._perDomainMap.get(dkey)!
    pd.totalScore += score
    pd.count += 1
  }

  const out: AssessmentLeader[] = []
  for (const e of byUser.values()) {
    e.averageScore = e.assessmentCount > 0 ? Math.round((e.totalScore / e.assessmentCount) * 10) / 10 : 0
    e.perDomain = Array.from(e._perDomainMap.values()).map(pd => ({
      domainKey: pd.domainKey,
      domainName: pd.domainName,
      domainColor: pd.domainColor,
      totalScore: pd.totalScore,
      count: pd.count,
      averageScore: pd.count > 0 ? Math.round((pd.totalScore / pd.count) * 10) / 10 : 0,
    })).sort((a, b) => b.totalScore - a.totalScore)
    // Strip the internal map
    const { _perDomainMap, ...rest } = e
    void _perDomainMap
    out.push(rest)
  }

  // Sort by total score desc, then average desc, then count desc
  out.sort((a, b) =>
    b.totalScore - a.totalScore ||
    b.averageScore - a.averageScore ||
    b.assessmentCount - a.assessmentCount
  )
  return out
}

// -----------------------------------------------------------------------------
// Proctored Mocks (eligibility gate)
// -----------------------------------------------------------------------------

export async function listProctoredMocksAction(filters?: { domainId?: string }) {
  const session = await getSession()
  if (!session) return []

  const where: Record<string, unknown> = {}
  if (filters?.domainId) where.domainId = filters.domainId

  const isStaff = session.role === 'admin' || session.role === 'instructor'
  let isCaptain = false
  if (session.role === 'student' && filters?.domainId) {
    const cap = await db.domainCaptain.findUnique({
      where: { userId_domainId: { userId: session.id, domainId: filters.domainId } },
    })
    isCaptain = !!cap
  }

  const mocks = await db.proctoredMock.findMany({
    where: where as Parameters<typeof db.proctoredMock.findMany>[0]['where'],
    include: {
      user: { select: { id: true, nickname: true, avatarId: true, role: true } },
      partner: { select: { id: true, nickname: true, avatarId: true } },
      domain: true,
      enteredBy: { select: { id: true, nickname: true } },
    },
    orderBy: { eventDate: 'desc' },
  })

  if (isStaff || isCaptain) return mocks
  // Students: see only their own mocks (with full detail). Other students'
  // mocks are visible (this is the public, in-person record) but without notes.
  return mocks.map(m => {
    if (m.userId === session.id || m.pairPartnerId === session.id) return m
    return { ...m, notes: null }
  })
}

export async function createProctoredMockAction(input: {
  domainId: string
  userId: string
  pairPartnerId?: string | null
  score: number
  eventDate: string // ISO date
  notes?: string
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const user = await requireUser()
  // Admin, instructor, or captain of this domain can enter
  let canEnter = user.role === 'admin' || user.role === 'instructor'
  if (!canEnter && user.role === 'student') {
    const cap = await db.domainCaptain.findUnique({
      where: { userId_domainId: { userId: user.id, domainId: input.domainId } },
    })
    canEnter = !!cap
  }
  if (!canEnter) return { ok: false, error: 'Only instructors or domain captains can enter proctored mock results.' }

  if (Number.isNaN(input.score)) return { ok: false, error: 'Score must be a number.' }
  if (input.score < 0 || input.score > 10000) return { ok: false, error: 'Score out of range.' }
  if (input.notes && input.notes.length > 2000) return { ok: false, error: 'Notes too long (max 2000 chars).' }

  const mock = await db.proctoredMock.create({
    data: {
      domain: { connect: { id: input.domainId } },
      user: { connect: { id: input.userId } },
      partner: input.pairPartnerId ? { connect: { id: input.pairPartnerId } } : undefined,
      score: input.score,
      enteredBy: { connect: { id: user.id } },
      eventDate: new Date(input.eventDate),
      notes: input.notes?.trim() || null,
    },
  })
  await db.appEvent.create({
    data: {
      kind: 'mock-graded',
      title: `Proctored mock graded: ${input.score}`,
      detail: `Entered by ${user.nickname}`,
    },
  })
  revalidatePath('/')
  return { ok: true, id: mock.id }
}

export async function deleteProctoredMockAction(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser()
  const m = await db.proctoredMock.findUnique({ where: { id } })
  if (!m) return { ok: false, error: 'Not found.' }
  let canDelete = user.role === 'admin' || user.role === 'instructor'
  if (!canDelete && user.role === 'student') {
    const cap = await db.domainCaptain.findUnique({
      where: { userId_domainId: { userId: user.id, domainId: m.domainId } },
    })
    canDelete = !!cap
  }
  if (!canDelete) return { ok: false, error: 'Not authorized.' }
  await db.proctoredMock.delete({ where: { id } })
  revalidatePath('/')
  return { ok: true }
}

// -----------------------------------------------------------------------------
// Team Selection
// -----------------------------------------------------------------------------

export async function listTeamSelectionsAction() {
  const session = await getSession()
  if (!session) return []
  const sels = await db.teamSelection.findMany({
    include: {
      user: { select: { id: true, nickname: true, avatarId: true } },
      domain: true,
      decidedBy: { select: { id: true, nickname: true } },
    },
    orderBy: { decidedAt: 'desc' },
  })
  return sels
}

export async function selectTeamMemberAction(input: {
  domainId: string
  userId: string
  rationale?: string
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const user = await requireUser()
  let canSelect = user.role === 'admin' || user.role === 'instructor'
  if (!canSelect && user.role === 'student') {
    const cap = await db.domainCaptain.findUnique({
      where: { userId_domainId: { userId: user.id, domainId: input.domainId } },
    })
    canSelect = !!cap
  }
  if (!canSelect) return { ok: false, error: 'Not authorized to select team members.' }

  const existing = await db.teamSelection.findUnique({
    where: { domainId_userId: { domainId: input.domainId, userId: input.userId } },
  })
  if (existing) return { ok: false, error: 'Already selected.' }

  const sel = await db.teamSelection.create({
    data: {
      domain: { connect: { id: input.domainId } },
      user: { connect: { id: input.userId } },
      decidedBy: { connect: { id: user.id } },
      rationale: input.rationale?.trim() || null,
    },
  })
  await db.appEvent.create({
    data: {
      kind: 'team-selected',
      title: 'Team selection recorded',
      detail: `Decided by ${user.nickname}`,
    },
  })
  revalidatePath('/')
  return { ok: true, id: sel.id }
}

export async function removeTeamSelectionAction(domainId: string, userId: string): Promise<void> {
  const user = await requireUser()
  let canRemove = user.role === 'admin' || user.role === 'instructor'
  if (!canRemove && user.role === 'student') {
    const cap = await db.domainCaptain.findUnique({
      where: { userId_domainId: { userId: user.id, domainId } },
    })
    canRemove = !!cap
  }
  if (!canRemove) throw new Error('Not authorized')
  await db.teamSelection.delete({
    where: { domainId_userId: { domainId, userId } },
  })
  revalidatePath('/')
}

// -----------------------------------------------------------------------------
// Spotlight
// -----------------------------------------------------------------------------

export async function createSpotlightAction(input: {
  userId: string
  reason: 'streak' | 'solve' | 'reflection'
  blurb: string
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const user = await requireUser()
  if (user.role !== 'admin' && user.role !== 'instructor') {
    // Captains can also create spotlights for their domain
    let isCaptain = false
    if (user.role === 'student') {
      const caps = await db.domainCaptain.findMany({ where: { userId: user.id } })
      isCaptain = caps.length > 0
    }
    if (!isCaptain) return { ok: false, error: 'Not authorized.' }
  }
  if (input.blurb.trim().length < 10) return { ok: false, error: 'Blurb must be at least 10 characters.' }

  // Use this week's Monday (Manila) as weekOf
  const { currentManilaWeekStart } = await import('@/lib/streaks')
  const weekOf = currentManilaWeekStart()

  const spot = await db.weeklySpotlight.create({
    data: {
      user: { connect: { id: input.userId } },
      weekOf,
      reason: input.reason,
      blurb: input.blurb.trim(),
    },
  })
  await db.appEvent.create({
    data: {
      kind: 'spotlight',
      title: 'Weekly spotlight set',
      detail: input.blurb.slice(0, 80),
    },
  })
  revalidatePath('/')
  return { ok: true, id: spot.id }
}

// -----------------------------------------------------------------------------
// App events (activity feed)
// -----------------------------------------------------------------------------

export async function listAppEventsAction(limit = 10) {
  return db.appEvent.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

// -----------------------------------------------------------------------------
// Dashboard helpers
// -----------------------------------------------------------------------------

export async function getStudentDashboardDataAction() {
  const user = await requireUser()
  const { computeStreakBreakdown, currentManilaWeekStart } = await import('@/lib/streaks')

  const weekStart = currentManilaWeekStart()
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)

  const [streakBreakdown, mySubmissions, activeMilestones, myTeamSelections, myMocks, spotlight] = await Promise.all([
    computeStreakBreakdown(user.id),
    db.submission.findMany({
      where: { userId: user.id },
      include: { milestone: { include: { domain: true } } },
      orderBy: { clientSubmissionTimestamp: 'desc' },
      take: 10,
    }),
    db.milestone.findMany({
      where: { status: 'active' },
      include: { domain: true, _count: { select: { submissions: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    db.teamSelection.findMany({
      where: { userId: user.id },
      include: { domain: true, decidedBy: { select: { nickname: true } } },
    }),
    db.proctoredMock.findMany({
      where: { OR: [{ userId: user.id }, { pairPartnerId: user.id }] },
      include: { domain: true, partner: { select: { nickname: true } } },
      orderBy: { eventDate: 'desc' },
    }),
    db.weeklySpotlight.findFirst({
      where: { weekOf: { gte: weekStart }, userId: user.id },
    }),
  ])

  // This week's milestones: active ones created in this week or earlier this season
  void weekEnd
  return {
    streakBreakdown,
    mySubmissions,
    activeMilestones,
    myTeamSelections,
    myMocks,
    spotlight,
  }
}

export async function getInstructorDashboardDataAction() {
  await requireRole('admin', 'instructor')
  const [milestones, submissions, mocks, selections, students, events] = await Promise.all([
    db.milestone.count(),
    db.submission.count(),
    db.proctoredMock.count(),
    db.teamSelection.count(),
    db.user.count({ where: { role: 'student' } }),
    db.appEvent.findMany({ orderBy: { createdAt: 'desc' }, take: 10 }),
  ])
  return { counts: { milestones, submissions, mocks, selections, students }, events }
}

export async function getAdminDashboardDataAction() {
  await requireRole('admin')
  const [users, domains, captains, milestones, submissions, mocks, selections, events] = await Promise.all([
    db.user.count(),
    db.domain.count(),
    db.domainCaptain.count(),
    db.milestone.count(),
    db.submission.count(),
    db.proctoredMock.count(),
    db.teamSelection.count(),
    db.appEvent.findMany({ orderBy: { createdAt: 'desc' }, take: 15 }),
  ])
  return {
    counts: { users, domains, captains, milestones, submissions, mocks, selections },
    events,
  }
}

// -----------------------------------------------------------------------------
// Candidate evaluations (staff-only, from handoff_added.md)
// -----------------------------------------------------------------------------
//
// The Leading Candidates panel. Never auto-writes to team_selections.
// Append-only. Students have no read path to this data, not even their own row.

export type CandidateEvaluationMeta = {
  id: string
  domainId: string
  userId: string
  pairedWithUserId: string | null
  evaluatedById: string
  evaluatorNickname: string
  evaluationBasis: 'practice_only' | 'proctored_only' | 'combined'
  aiSummary: string
  strengths: string[]
  weaknesses: string[]
  complementarity: string | null
  roleAssignment: string | null
  recommendation: string | null
  createdAt: Date
}

async function requireStaffForDomain(domainId: string) {
  const user = await requireUser()
  if (user.role === 'admin' || user.role === 'instructor') return user
  if (user.role === 'student') {
    const cap = await db.domainCaptain.findUnique({
      where: { userId_domainId: { userId: user.id, domainId } },
    })
    if (cap) return user
  }
  throw new Error('FORBIDDEN')
}

export async function listCandidateEvaluationsAction(domainId: string): Promise<{
  evaluations: CandidateEvaluationMeta[]
  candidates: Array<{
    userId: string
    nickname: string
    avatarId: string
    realName: string | null
    studentId: string | null
    isCaptain: boolean
    assessmentCount: number
    assessmentAvg: number
    assessmentBest: number
    streak: number
    proctoredScore: number | null
    proctoredCount: number
    latestEval: CandidateEvaluationMeta | null
  }>
}> {
  await requireStaffForDomain(domainId)

  const [evaluations, students, domain] = await Promise.all([
    db.candidateEvaluation.findMany({
      where: { domainId },
      include: {
        user: { select: { id: true, nickname: true, avatarId: true, realName: true, studentId: true } },
        pairedWith: { select: { id: true, nickname: true, avatarId: true } },
        evaluatedBy_: { select: { id: true, nickname: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    db.user.findMany({
      where: { role: 'student' },
      select: {
        id: true, nickname: true, avatarId: true, realName: true, studentId: true,
        captainOf: { where: { domainId }, select: { domainId: true } },
        submissions: {
          where: { milestone: { domainId } },
          include: { milestone: { select: { mode: true } } },
        },
        proctoredMocksFor: {
          where: { domainId },
          select: { score: true },
        },
      },
    }),
    db.domain.findUnique({ where: { id: domainId } }),
  ])

  void domain

  // Build candidate summary per student
  const { computeStreakForUserDomain } = await import('@/lib/streaks')
  const candidates = []
  for (const s of students) {
    const assessmentSubs = s.submissions.filter(sub => sub.milestone.mode === 'assessment' && sub.aiScore !== null)
    const scores = assessmentSubs.map(sub => sub.aiScore ?? 0)
    const streak = await computeStreakForUserDomain(s.id, domainId)
    const proctored = s.proctoredMocksFor
    const latestEval = evaluations.find(e => e.userId === s.id || e.pairedWithUserId === s.id)
    candidates.push({
      userId: s.id,
      nickname: s.nickname,
      avatarId: s.avatarId,
      realName: s.realName,
      studentId: s.studentId,
      isCaptain: s.captainOf.length > 0,
      assessmentCount: scores.length,
      assessmentAvg: scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : 0,
      assessmentBest: scores.length > 0 ? Math.max(...scores) : 0,
      streak,
      proctoredScore: proctored.length > 0 ? Math.max(...proctored.map(p => p.score)) : null,
      proctoredCount: proctored.length,
      latestEval: latestEval ? {
        id: latestEval.id,
        domainId: latestEval.domainId,
        userId: latestEval.userId,
        pairedWithUserId: latestEval.pairedWithUserId,
        evaluatedById: latestEval.evaluatedBy,
        evaluatorNickname: latestEval.evaluatedBy_.nickname,
        evaluationBasis: latestEval.evaluationBasis as 'practice_only' | 'proctored_only' | 'combined',
        aiSummary: latestEval.aiSummary,
        strengths: JSON.parse(latestEval.strengths || '[]'),
        weaknesses: JSON.parse(latestEval.weaknesses || '[]'),
        complementarity: latestEval.complementarity,
        roleAssignment: latestEval.roleAssignment,
        recommendation: latestEval.recommendation,
        createdAt: latestEval.createdAt,
      } : null,
    })
  }

  // Sort candidates: those with proctored scores first (by score desc), then by assessment avg desc, then streak
  candidates.sort((a, b) => {
    if (a.proctoredScore !== null && b.proctoredScore !== null) return b.proctoredScore - a.proctoredScore
    if (a.proctoredScore !== null) return -1
    if (b.proctoredScore !== null) return 1
    return b.assessmentAvg - a.assessmentAvg || b.streak - a.streak
  })

  return {
    evaluations: evaluations.map(e => ({
      id: e.id,
      domainId: e.domainId,
      userId: e.userId,
      pairedWithUserId: e.pairedWithUserId,
      evaluatedById: e.evaluatedBy,
      evaluatorNickname: e.evaluatedBy_.nickname,
      evaluationBasis: e.evaluationBasis as 'practice_only' | 'proctored_only' | 'combined',
      aiSummary: e.aiSummary,
      strengths: JSON.parse(e.strengths || '[]'),
      weaknesses: JSON.parse(e.weaknesses || '[]'),
      complementarity: e.complementarity,
      roleAssignment: e.roleAssignment,
      recommendation: e.recommendation,
      createdAt: e.createdAt,
    })),
    candidates,
  }
}

// Build the evaluation prompt for staff to copy into their AI tool.
// Pulls in the student's submission history, weakness tags, reflections,
// and proctored mock scores. The basis is determined by what data exists:
//  - proctored_only: proctored mocks exist but no assessment submissions
//  - practice_only: assessment submissions exist but no proctored mocks
//  - combined: both exist
export async function buildEvaluationPromptAction(input: {
  domainId: string
  userId: string
  pairPartnerId?: string | null
}): Promise<{ prompt: string; basis: 'practice_only' | 'proctored_only' | 'combined' }> {
  await requireStaffForDomain(input.domainId)

  const [student, domain, partner] = await Promise.all([
    db.user.findUnique({
      where: { id: input.userId },
      select: { id: true, nickname: true, avatarId: true, realName: true, studentId: true },
    }),
    db.domain.findUnique({ where: { id: input.domainId } }),
    input.pairPartnerId
      ? db.user.findUnique({ where: { id: input.pairPartnerId }, select: { id: true, nickname: true, realName: true } })
      : Promise.resolve(null),
  ])
  if (!student || !domain) throw new Error('Not found')

  const [submissions, mocks, partnerSubs, partnerMocks] = await Promise.all([
    db.submission.findMany({
      where: { userId: student.id, milestone: { domainId: domain.id } },
      include: { milestone: { select: { title: true, mode: true, difficulty: true, weekOrPhase: true } } },
      orderBy: { clientSubmissionTimestamp: 'desc' },
      take: 30,
    }),
    db.proctoredMock.findMany({
      where: { userId: student.id, domainId: domain.id },
      orderBy: { eventDate: 'desc' },
    }),
    partner
      ? db.submission.findMany({
          where: { userId: partner.id, milestone: { domainId: domain.id } },
          include: { milestone: { select: { title: true, mode: true, difficulty: true, weekOrPhase: true } } },
          orderBy: { clientSubmissionTimestamp: 'desc' },
          take: 20,
        })
      : Promise.resolve([]),
    partner
      ? db.proctoredMock.findMany({
          where: { userId: partner.id, domainId: domain.id },
          orderBy: { eventDate: 'desc' },
        })
      : Promise.resolve([]),
  ])

  const hasPractice = submissions.some(s => s.aiScore !== null)
  const hasProctored = mocks.length > 0
  const basis: 'practice_only' | 'proctored_only' | 'combined' =
    hasPractice && hasProctored ? 'combined' : hasProctored ? 'proctored_only' : 'practice_only'

  const formatSubs = (subs: typeof submissions, who: string) => {
    if (subs.length === 0) return `  ${who}: no practice submissions in this domain yet.`
    return subs.slice(0, 15).map(s => {
      const tags = JSON.parse(s.weaknessTags || '[]').join(', ')
      const reflection = s.reflection ? ` | reflection: "${s.reflection.slice(0, 200)}${s.reflection.length > 200 ? '…' : ''}"` : ''
      return `  ${who} — ${s.milestone.title} (${s.milestone.mode}, ${s.milestone.difficulty}, ${s.milestone.weekOrPhase}) | score: ${s.aiScore ?? 'n/a'} | confidence: ${s.confidence ?? 'n/a'}/5${tags ? ` | weakness tags: ${tags}` : ''}${reflection}`
    }).join('\n')
  }

  type MockArray = { eventDate: Date; score: number; notes: string | null }[]
  const formatMocks = (mocks: MockArray, who: string) => {
    if (mocks.length === 0) return `  ${who}: no proctored mocks in this domain yet.`
    return mocks.map(m => `  ${who} — ${m.eventDate.toISOString().slice(0, 10)} | score: ${m.score}${m.notes ? ` | notes: "${m.notes.slice(0, 200)}${m.notes.length > 200 ? '…' : ''}"` : ''}`).join('\n')
  }

  const prompt = `You are evaluating ${partner ? 'a candidate pair' : 'a candidate'} for the IT Skills Olympics ${domain.name} team. This is a staff-only read to help a human (the instructor or domain captain) decide whether to select ${partner ? 'them as a pair' : 'them'} for the November competition. Your output is INPUT to a human decision, not the decision itself.

CRITICAL RULES:
- Be honest, specific, and brief. Avoid hedging fluff.
- Cite the data you're drawing on (which weeks, which scores).
- If the data is thin, say so explicitly in plain language — don't invent a confidence score.
- Don't just summarize; give the staff a useful read. What pattern do you see? What's the risk? What would you want to see more of before locking in the pick?
- ${partner ? `For pairs: explicitly assess complementarity — do their strengths/weaknesses cover each other? Are there red flags (e.g. both weak on the same thing, both low confidence under time pressure)? MOST IMPORTANTLY: assign roles. Who should take which kind of problem during the contest? Base this on their actual practice data — if A is consistently faster on easy-tier syntax problems and B is stronger on edge-case debugging, say so. The role assignment is the single most useful thing you can produce for a pair; the staff will use it to coach them on division of labor before November.` : 'For solo candidates: focus on readiness, consistency, and trajectory.'}

DOMAIN: ${domain.name}
DOMAIN CONTEXT: ${domain.description ?? '(no description)'}
CONTEST FORMAT: ${domain.contestFormat}

${partner ? `CANDIDATE A: ${student.nickname}${student.realName ? ` (${student.realName})` : ''}${student.studentId ? ` [${student.studentId}]` : ''}
CANDIDATE B: ${partner.nickname}${partner.realName ? ` (${partner.realName})` : ''}` : `CANDIDATE: ${student.nickname}${student.realName ? ` (${student.realName})` : ''}${student.studentId ? ` [${student.studentId}]` : ''}`}

PRACTICE DATA (most recent first):
${formatSubs(submissions, partner ? 'A' : 'Student')}
${partner ? formatSubs(partnerSubs, 'B') : ''}

PROCTORED MOCK RESULTS (most recent first):
${formatMocks(mocks, partner ? 'A' : 'Student')}
${partner ? formatMocks(partnerMocks, 'B') : ''}

EVALUATION BASIS: ${basis}
${basis === 'practice_only' ? '(Practice data only — no proctored results yet. Treat this read as tentative; the real signal comes from proctored mocks in October.)' : ''}
${basis === 'proctored_only' ? '(Proctored results only — no scored practice data. The proctored signal is the more reliable one.)' : ''}
${basis === 'combined' ? '(Both practice and proctored data available — weight the proctored results more heavily for selection calls.)' : ''}

OUTPUT FORMAT (respond as valid JSON, no markdown fences):
{
  "aiSummary": "2-4 sentence honest read of where this ${partner ? 'pair' : 'candidate'} stands right now",
  "strengths": ["2-4 specific strengths, citing data where possible"],
  "weaknesses": ["2-4 specific weaknesses or risks"]${partner ? `,
  "complementarity": "1-2 sentence assessment of how they complement (or fail to complement) each other",
  "roleAssignment": "Specific role assignment for the contest. Format: 'A handles X (because...); B handles Y (because...)'. Be concrete — reference the problem types, tiers, or phases where each should lead. This is the actionable output the staff will coach to."` : ''},
  "recommendation": "1-2 sentence coaching note for the instructor — what to watch for, what to drill, whether to lock them in or wait"
}`

  return { prompt, basis }
}

export async function createCandidateEvaluationAction(input: {
  domainId: string
  userId: string
  pairPartnerId?: string | null
  evaluationBasis: 'practice_only' | 'proctored_only' | 'combined'
  aiSummary: string
  strengths: string[]
  weaknesses: string[]
  complementarity?: string
  roleAssignment?: string
  recommendation?: string
  rawPayload?: string
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const user = await requireStaffForDomain(input.domainId)

  if (input.aiSummary.trim().length < 10) return { ok: false, error: 'AI summary is too short.' }

  const eval_ = await db.candidateEvaluation.create({
    data: {
      domain: { connect: { id: input.domainId } },
      user: { connect: { id: input.userId } },
      pairedWith: input.pairPartnerId ? { connect: { id: input.pairPartnerId } } : undefined,
      evaluatedBy_: { connect: { id: user.id } },
      evaluationBasis: input.evaluationBasis,
      aiSummary: input.aiSummary.trim(),
      strengths: JSON.stringify(input.strengths.filter(s => s.trim().length)),
      weaknesses: JSON.stringify(input.weaknesses.filter(w => w.trim().length)),
      complementarity: input.complementarity?.trim() || null,
      roleAssignment: input.roleAssignment?.trim() || null,
      recommendation: input.recommendation?.trim() || null,
      rawPayload: input.rawPayload || '{}',
    },
  })

  await db.appEvent.create({
    data: {
      kind: 'candidate-evaluated',
      title: `Candidate evaluation recorded: ${input.evaluationBasis}`,
      detail: `by ${user.nickname}`,
    },
  })

  revalidatePath('/')
  return { ok: true, id: eval_.id }
}

// Suggest pairs for paired domains (Java, Quiz Bee). Returns all possible
// 2-student combinations ranked by a simple heuristic: combined assessment
// avg + combined streak, with a small bonus for complementary weakness profiles
// (different weakness tags). The staff still makes the final call.
export async function suggestPairsAction(domainId: string): Promise<Array<{
  a: { userId: string; nickname: string; avatarId: string }
  b: { userId: string; nickname: string; avatarId: string }
  combinedAssessmentAvg: number
  combinedStreak: number
  sharedWeaknesses: string[]
  distinctWeaknesses: string[]
  latestEvalId: string | null
}>> {
  await requireStaffForDomain(domainId)

  const data = await listCandidateEvaluationsAction(domainId)
  // Only consider students who have at least one assessment submission OR a proctored score
  const eligible = data.candidates.filter(c => c.assessmentCount > 0 || c.proctoredScore !== null)
  if (eligible.length < 2) return []

  // Fetch weakness tags per student
  const weaknessByUser = new Map<string, Set<string>>()
  for (const c of eligible) {
    const subs = await db.submission.findMany({
      where: { userId: c.userId, milestone: { domainId } },
      select: { weaknessTags: true },
    })
    const tags = new Set<string>()
    for (const s of subs) {
      const arr = JSON.parse(s.weaknessTags || '[]') as string[]
      for (const t of arr) if (t.trim()) tags.add(t.trim())
    }
    weaknessByUser.set(c.userId, tags)
  }

  const pairs = []
  for (let i = 0; i < eligible.length; i++) {
    for (let j = i + 1; j < eligible.length; j++) {
      const a = eligible[i], b = eligible[j]
      const combinedAvg = (a.assessmentAvg * a.assessmentCount + b.assessmentAvg * b.assessmentCount) / Math.max(1, a.assessmentCount + b.assessmentCount)
      const combinedStreak = a.streak + b.streak
      const aTags = weaknessByUser.get(a.userId) ?? new Set<string>()
      const bTags = weaknessByUser.get(b.userId) ?? new Set<string>()
      const shared = [...aTags].filter(t => bTags.has(t))
      const distinct = [...aTags, ...bTags].filter(t => !(aTags.has(t) && bTags.has(t)))
      const latestEval = data.evaluations.find(e =>
        (e.userId === a.userId && e.pairedWithUserId === b.userId) ||
        (e.userId === b.userId && e.pairedWithUserId === a.userId)
      )
      pairs.push({
        a: { userId: a.userId, nickname: a.nickname, avatarId: a.avatarId },
        b: { userId: b.userId, nickname: b.nickname, avatarId: b.avatarId },
        combinedAssessmentAvg: Math.round(combinedAvg * 10) / 10,
        combinedStreak,
        sharedWeaknesses: shared,
        distinctWeaknesses: distinct,
        latestEvalId: latestEval?.id ?? null,
      })
    }
  }

  // Rank: higher combinedAvg better, higher streak better, FEWER shared weaknesses better
  pairs.sort((p, q) =>
    q.combinedAssessmentAvg - p.combinedAssessmentAvg ||
    q.combinedStreak - p.combinedStreak ||
    p.sharedWeaknesses.length - q.sharedWeaknesses.length
  )

  return pairs.slice(0, 10) // top 10 suggested pairs
}
