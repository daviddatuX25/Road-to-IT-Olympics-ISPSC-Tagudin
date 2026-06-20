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
  const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } })
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
  if (await db.user.findUnique({ where: { email } })) {
    return { ok: false, error: 'Email already in use.' }
  }
  if (input.password.length < 6) return { ok: false, error: 'Password must be at least 6 characters.' }
  const user = await db.user.create({
    data: {
      email,
      passwordHash: hashPassword(input.password),
      role: input.role,
      nickname: input.nickname.trim(),
      realName: input.realName?.trim() || null,
      studentId: input.studentId?.trim() || null,
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
  if (input.promptTemplate.trim().length < 10) return { ok: false, error: 'Prompt template is too short.' }

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
      weaknessTags: JSON.stringify(input.weaknessTags.filter(t => t.trim().length)),
      reflection: input.reflection?.trim() || null,
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
