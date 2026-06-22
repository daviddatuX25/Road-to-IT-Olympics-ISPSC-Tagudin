'use server'

import { revalidatePath } from 'next/cache'
import crypto from 'node:crypto'
import { db } from '@/lib/db'
import {
  createSession, destroySession, getSession, requireUser, requireActiveUser, requireRole,
  verifyPassword, hashPassword,
} from '@/lib/auth'
import { AVATAR_MAP } from '@/lib/avatars'
import { sendDiscordAlert } from '@/lib/discord'
import { sendResetPasswordEmail } from '@/lib/mail'

// Helper to query active season
async function getActiveSeason() {
  const season = await db.season.findFirst({
    where: { status: 'active' },
    orderBy: { createdAt: 'desc' },
  })
  if (!season) {
    return await db.season.create({
      data: {
        name: 'Default Active Season',
        startDate: new Date('2026-01-01T00:00:00Z'),
        endDate: new Date('2026-12-31T23:59:59Z'),
        status: 'active',
      },
    })
  }
  return season
}

export async function getActiveSeasonAction() {
  return db.season.findFirst({
    where: { status: 'active' },
    include: { phases: true },
    orderBy: { createdAt: 'desc' },
  })
}


// -----------------------------------------------------------------------------
// Auth
// -----------------------------------------------------------------------------

export async function loginAction(identifier: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const idStr = identifier.trim()
  if (!idStr || !password) return { ok: false, error: 'Email / Student ID and password required.' }

  const user = await db.user.findFirst({
    where: {
      OR: [
        { studentId: idStr },
        { studentId: idStr.toUpperCase() },
        { studentId: idStr.toLowerCase() },
        { email: idStr.toLowerCase() },
      ]
    }
  })

  if (!user) return { ok: false, error: 'No account found with that Email / Student ID.' }
  if (!verifyPassword(password, user.passwordHash)) return { ok: false, error: 'Wrong password.' }
  await createSession(user.id)
  revalidatePath('/')
  return { ok: true }
}

export async function logoutAction(): Promise<void> {
  await destroySession()
  revalidatePath('/')
}

const resetCooldown = new Map<string, number>()

export async function requestPasswordResetAction(identifier: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const idStr = identifier.trim()
  if (!idStr) return { ok: false, error: 'Identifier (Email or Student ID) is required.' }

  const now = Date.now()
  const cooldownKey = idStr.toLowerCase()
  const lastTime = resetCooldown.get(cooldownKey) || 0
  if (now - lastTime < 60000) { // 1 minute cooldown per identifier
    return { ok: true } // Silently succeed to prevent spamming
  }
  resetCooldown.set(cooldownKey, now)

  const user = await db.user.findFirst({
    where: {
      OR: [
        { studentId: idStr },
        { studentId: idStr.toUpperCase() },
        { studentId: idStr.toLowerCase() },
        { email: idStr.toLowerCase() },
      ]
    }
  })

  if (!user) {
    return { ok: true } // Silently return success to prevent enumeration
  }

  // Prevent requesting resetting password via email if they only have placeholder emails in production
  const isPlaceholder = user.email.endsWith('@ito.local')
  if (isPlaceholder && process.env.NODE_ENV === 'production' && !process.env.RESEND_API_KEY) {
    return { ok: false, error: 'This account does not have a recovery email configured. Please contact your administrator.' }
  }

  const rawToken = crypto.randomBytes(32).toString('hex')
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex')
  const expiry = new Date(Date.now() + 3600000) // 1 hour expiration

  await db.user.update({
    where: { id: user.id },
    data: {
      resetToken: hashedToken,
      resetTokenExpiry: expiry,
    }
  })

  const appUrl = process.env.APP_PUBLIC_URL || 'http://localhost:3000'
  const resetLink = `${appUrl}/reset-password?token=${rawToken}`

  const mailRes = await sendResetPasswordEmail(user.email, resetLink)
  if (!mailRes.ok) {
    return { ok: false, error: mailRes.error || 'Failed to send recovery email.' }
  }

  return { ok: true }
}

export async function resetPasswordAction(token: string, newPassword: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!token) return { ok: false, error: 'Password reset token is missing.' }
  if (!newPassword || newPassword.length < 8) return { ok: false, error: 'Password must be at least 8 characters long.' }

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex')

  const user = await db.user.findFirst({
    where: {
      resetToken: hashedToken,
      resetTokenExpiry: { gt: new Date() },
    }
  })

  if (!user) {
    return { ok: false, error: 'The password reset link is invalid or has expired.' }
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      passwordHash: hashPassword(newPassword),
      resetToken: null,
      resetTokenExpiry: null,
    }
  })

  await destroySession() // invalidate current session on password change

  return { ok: true }
}

export async function getCurrentUser() {
  return getSession()
}

// -----------------------------------------------------------------------------
// Profile
// -----------------------------------------------------------------------------

export async function updateProfileAction(input: { nickname: string; avatarId: string; email?: string }): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser()
  const trimmed = input.nickname.trim()
  if (trimmed.length < 2) return { ok: false, error: 'Nickname must be at least 2 characters.' }
  if (trimmed.length > 32) return { ok: false, error: 'Nickname too long (max 32 chars).' }
  if (!AVATAR_MAP[input.avatarId]) return { ok: false, error: 'Unknown avatar.' }

  let emailToSet = user.email
  if (input.email !== undefined) {
    const trimmedEmail = input.email.trim().toLowerCase()
    if (trimmedEmail !== user.email) {
      if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        return { ok: false, error: 'Invalid email address format.' }
      }

      // If custom email is cleared, default back to placeholder student email.
      const finalEmail = trimmedEmail || `${user.studentId?.toLowerCase() || user.id.toLowerCase()}@ito.local`

      if (finalEmail !== user.email) {
        const existingEmail = await db.user.findFirst({
          where: { email: finalEmail, id: { not: user.id } }
        })
        if (existingEmail) {
          return { ok: false, error: 'Email is already in use by another account.' }
        }
        emailToSet = finalEmail
      }
    }
  }

  await db.user.update({
    where: { id: user.id },
    data: { nickname: trimmed, avatarId: input.avatarId, email: emailToSet },
  })
  revalidatePath('/')
  return { ok: true }
}

// -----------------------------------------------------------------------------
// Users (admin / instructor / captain — mirrors the auth pattern used by
// selectTeamMemberAction, createProctoredMockAction, etc.)
// -----------------------------------------------------------------------------

export async function listUsersAction() {
  const user = await requireUser()
  const allowed = user.role === 'admin' || user.role === 'instructor'
  if (!allowed) {
    // Students may only read the user list if they captain at least one domain
    const captaining = await db.domainCaptain.findFirst({
      where: { userId: user.id },
      select: { userId: true },
    })
    if (!captaining) throw new Error('FORBIDDEN')
  }
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

export async function bulkUpdateUserStatusAction(
  userIds: string[],
  status: 'active' | 'pending' | 'rejected' | 'suspended' | 'archived'
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const admin = await requireRole('admin')
    if (!userIds || userIds.length === 0) {
      return { ok: false, error: 'No user IDs specified.' }
    }
    const validStatuses = ['active', 'pending', 'rejected', 'suspended', 'archived']
    if (!validStatuses.includes(status)) {
      return { ok: false, error: 'Invalid status.' }
    }
    // Prevent admin from archiving or suspending themselves
    const filteredIds = userIds.filter(id => id !== admin.id)
    if (filteredIds.length === 0) {
      return { ok: false, error: 'No valid user accounts to modify.' }
    }

    await db.user.updateMany({
      where: { id: { in: filteredIds } },
      data: { status }
    })

    revalidatePath('/')
    return { ok: true }
  } catch (err: any) {
    console.error('Failed bulk updating user status:', err)
    return { ok: false, error: err.message || 'Failed to update user status.' }
  }
}

export async function bulkDeleteUsersAction(userIds: string[]): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const admin = await requireRole('admin')
    if (!userIds || userIds.length === 0) {
      return { ok: false, error: 'No user IDs specified.' }
    }
    const filteredIds = userIds.filter(id => id !== admin.id)
    if (filteredIds.length === 0) {
      return { ok: false, error: 'No valid user accounts to delete.' }
    }

    // Check if any of these users created a milestone
    const milestoneAuthorCount = await db.milestone.count({
      where: { createdBy: { in: filteredIds } }
    })
    if (milestoneAuthorCount > 0) {
      return { ok: false, error: 'Cannot delete users who have authored milestones. Please delete or reassign those milestones first.' }
    }

    // Run cascade delete inside transaction
    await db.$transaction(async (tx) => {
      // 1. Delete DomainCaptains
      await tx.domainCaptain.deleteMany({ where: { userId: { in: filteredIds } } })
      
      // 2. Delete Submissions
      await tx.submission.deleteMany({ where: { userId: { in: filteredIds } } })

      // 3. Delete ProctoredMocks (as subject, partner, or enteredBy)
      await tx.proctoredMock.deleteMany({
        where: {
          OR: [
            { userId: { in: filteredIds } },
            { pairPartnerId: { in: filteredIds } },
            { enteredById: { in: filteredIds } }
          ]
        }
      })

      // 4. Delete TeamSelections (as selected user or decidedBy)
      await tx.teamSelection.deleteMany({
        where: {
          OR: [
            { userId: { in: filteredIds } },
            { decidedById: { in: filteredIds } }
          ]
        }
      })

      // 5. Delete WeeklySpotlights
      await tx.weeklySpotlight.deleteMany({ where: { userId: { in: filteredIds } } })

      // 6. Delete CandidateEvaluations (as subject, partner, or evaluator)
      await tx.candidateEvaluation.deleteMany({
        where: {
          OR: [
            { userId: { in: filteredIds } },
            { pairedWithUserId: { in: filteredIds } },
            { evaluatedBy: { in: filteredIds } }
          ]
        }
      })

      // 7. Finally delete the users
      await tx.user.deleteMany({
        where: { id: { in: filteredIds } }
      })
    })

    revalidatePath('/')
    return { ok: true }
  } catch (err: any) {
    console.error('Failed bulk deleting users:', err)
    return { ok: false, error: err.message || 'Failed to bulk delete users.' }
  }
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
  seasonId?: string
}) {
  const activeSeason = await getActiveSeason()
  const targetSeasonId = filters?.seasonId ?? activeSeason.id

  // Fetch the TARGET season (may differ from activeSeason) with its phases
  // for correct paceMode/currentPhaseKey computation
  const targetSeason = await db.season.findUnique({
    where: { id: targetSeasonId },
    include: { phases: { orderBy: { sequence: 'asc' } } },
  })
  if (!targetSeason) return []

  const where: any = { seasonId: targetSeasonId }
  if (filters?.domainId) where.domainId = filters.domainId
  if (filters?.status) where.status = filters.status
  if (filters?.mode) where.mode = filters.mode
  // Note: weekOrPhase filter is intentionally applied BEFORE the gate
  // The gate will overwrite it for sync seasons — see note below
  if (filters?.weekOrPhase) where.weekOrPhase = filters.weekOrPhase

  const session = await getSession()

  // ── PHASE GATE ──────────────────────────────────────────────────────────────
  // Only applies when: paceMode === 'synchronous' AND session is a student.
  // Staff/admin/instructor always see all milestones regardless of paceMode.
  const isSynchronous = targetSeason.paceMode === 'synchronous'
  const isStudent = session?.role === 'student'

  if (isSynchronous && isStudent) {
    const { currentPhaseKey, phases } = targetSeason

    if (!currentPhaseKey || phases.length === 0) {
      // Season not started — no milestones visible yet
      return []
    }

    const currentPhase = phases.find(p => p.key === currentPhaseKey)
    if (!currentPhase) {
      // currentPhaseKey is set but doesn't exist in this season's phases
      // Fail safe: return nothing rather than exposing everything
      return []
    }

    // All phases with sequence <= currentPhase.sequence are unlocked
    const unlockedPhaseKeys = phases
      .filter(p => p.sequence <= currentPhase.sequence)
      .map(p => p.key)

    // Overwrite any manual weekOrPhase filter — the gate takes priority
    where.weekOrPhase = { in: unlockedPhaseKeys }
  }
  // ── END PHASE GATE ──────────────────────────────────────────────────────────

  // Draft visibility gate (existing logic — unchanged)
  if (session?.role === 'student') {
    const captainedDomainIds = session.captainOf?.map(c => c.domainId) || []
    if (captainedDomainIds.length > 0) {
      where.OR = [
        { domainId: { in: captainedDomainIds } },
        { status: { in: ['active', 'archived'] } },
      ]
    } else {
      where.status = { in: ['active', 'archived'] }
    }
  }

  return db.milestone.findMany({
    where,
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
  if (!session || session.status !== 'active') return null

  // Visibility rules:
  //  - draft milestones: only admin/instructor + the creator
  //  - private diagnostic data (AI score, weakness tags, reflection, rawPayload):
  //    visible to the student themselves, the domain captain (if not the student),
  //    instructors, and admins. NOT visible to other students.
  const isAuthor = session.id === milestone.createdBy
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

  // Assessment milestones must accept JSON — that's the only submission path
  // that carries a score onto the assessment leaderboard.
  const effectiveAccepted = input.acceptedInputTypes.length ? input.acceptedInputTypes : ['guided_form']
  if (input.mode === 'assessment' && !effectiveAccepted.includes('json')) {
    effectiveAccepted.push('json')
  }

  const activeSeason = await getActiveSeason()
  const milestone = await db.milestone.create({
    data: {
      domain: { connect: { id: input.domainId } },
      season: { connect: { id: activeSeason.id } },
      creator: { connect: { id: user.id } },
      weekOrPhase: input.weekOrPhase,
      mode: input.mode,
      difficulty: input.difficulty,
      title: input.title.trim(),
      promptTemplate: input.promptTemplate,
      acceptedInputTypes: JSON.stringify(effectiveAccepted),
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

  // Notify Discord if published immediately as active
  if (input.status === 'active') {
    const domain = await db.domain.findUnique({ where: { id: input.domainId } })
    void sendDiscordAlert('milestone-published', {
      milestoneTitle: input.title,
      milestoneDomain: domain?.name ?? input.domainId,
      milestoneMode: input.mode,
      milestoneDifficulty: input.difficulty,
      milestonePhase: input.weekOrPhase,
      createdBy: user.nickname,
    })
  }

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

  // Resolve the new mode (defaults to the old one) and enforce the assessment→JSON rule.
  const newMode = updates.mode ?? old.mode
  const effectiveAccepted = updates.acceptedInputTypes.length ? [...updates.acceptedInputTypes] : ['guided_form']
  if (newMode === 'assessment' && !effectiveAccepted.includes('json')) {
    effectiveAccepted.push('json')
  }

  const newVersion = await db.milestone.create({
    data: {
      domain: { connect: { id: old.domainId } },
      season: { connect: { id: old.seasonId } },
      creator: { connect: { id: user.id } },
      parentMilestoneId: old.id,
      version: old.version + 1,
      weekOrPhase: updates.weekOrPhase ?? old.weekOrPhase,
      mode: newMode,
      difficulty: updates.difficulty ?? old.difficulty,
      title: updates.title.trim(),
      promptTemplate: updates.promptTemplate,
      acceptedInputTypes: JSON.stringify(effectiveAccepted),
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

  // Notify Discord — milestone is now live for submissions
  const domain = await db.domain.findUnique({ where: { id: m.domainId } })
  void sendDiscordAlert('milestone-activated', {
    milestoneTitle: m.title,
    milestoneDomain: domain?.name ?? m.domainId,
    milestoneMode: m.mode,
    milestoneDifficulty: m.difficulty,
    milestonePhase: m.weekOrPhase,
    createdBy: user.nickname,
  })

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
  clientSubmissionTimestamp?: string | Date
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const user = await requireActiveUser()
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

  const clientTimestamp = input.clientSubmissionTimestamp 
    ? new Date(input.clientSubmissionTimestamp) 
    : new Date()

  // Logical Idempotency Guard: prevent double-inserting duplicate offline syncs
  const existingSub = await db.submission.findFirst({
    where: {
      userId: user.id,
      milestoneId: milestone.id,
      clientSubmissionTimestamp: clientTimestamp,
      reflection: input.reflection?.trim().slice(0, 5000) || null,
      aiShareLink: input.aiShareLink?.trim() || null,
    }
  })
  if (existingSub) {
    return { ok: true, id: existingSub.id }
  }

  const sub = await db.submission.create({
    data: {
      milestone: { connect: { id: milestone.id } },
      milestoneVersion: milestone.version,
      user: { connect: { id: user.id } },
      clientSubmissionTimestamp: clientTimestamp,
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

  // Fire leaderboard notification (debounced — max once per 5 min)
  void notifyLeaderboardUpdate()

  return { ok: true, id: sub.id }
}

export async function submitJsonAction(input: {
  milestoneId: string
  jsonPayload: string
  aiShareLink?: string
  clientSubmissionTimestamp?: string | Date
}): Promise<{ ok: true; id: string; mode?: 'json' | 'freeform' } | { ok: false; error: string }> {
  const user = await requireActiveUser()
  const milestone = await db.milestone.findUnique({ where: { id: input.milestoneId } })
  if (!milestone) return { ok: false, error: 'Milestone not found.' }
  if (milestone.status !== 'active') return { ok: false, error: 'Milestone is not active.' }
  if (input.jsonPayload.length > 100000) return { ok: false, error: 'Payload too large (max 100KB).' }

  const trimmed = input.jsonPayload.trim()

  // Try to parse as JSON. If it parses to an object, extract the standard
  // fields (score / confidence / weaknessTags / reflection) the way the
  // assessment leaderboard expects.
  let parsed: Record<string, unknown> | null = null
  if (trimmed) {
    try {
      const candidate = JSON.parse(trimmed)
      if (typeof candidate === 'object' && candidate !== null && !Array.isArray(candidate)) {
        parsed = candidate as Record<string, unknown>
      }
    } catch {
      // Not JSON — fall through to freeform handling below.
      parsed = null
    }
  }

  // For assessment mode we want a real score on the leaderboard, so a
  // non-JSON payload is rejected with a clear message rather than silently
  // saved without one.
  if (milestone.mode === 'assessment' && !parsed) {
    return {
      ok: false,
      error: 'Assessment milestones need structured JSON with a "score" field so the result lands on the leaderboard. Paste the AI\'s JSON output (or wrap your text as { "score": ..., "reflection": "..." }).',
    }
  }

  let aiScore: number | null
  let confidence: number | null
  let weaknessTags: string[]
  let reflection: string | null
  let rawPayload: string
  let inputType: 'json' | 'freeform'

  if (parsed) {
    // Structured JSON path — extract whatever standard fields are present.
    aiScore = typeof parsed.score === 'number' ? parsed.score : typeof parsed.aiScore === 'number' ? parsed.aiScore : null
    confidence = typeof parsed.confidence === 'number' ? parsed.confidence : null
    weaknessTags = Array.isArray(parsed.weaknessTags)
      ? parsed.weaknessTags.filter((t): t is string => typeof t === 'string')
      : []
    reflection = typeof parsed.reflection === 'string' ? parsed.reflection : null
    rawPayload = JSON.stringify(parsed)
    inputType = 'json'
  } else {
    // Freeform path — tutor / journal sessions where the AI returns prose,
    // not JSON. We save the whole response as a reflection (so the streak
    // counts and the captain can read it) and store the raw text as-is.
    aiScore = null
    confidence = null
    weaknessTags = []
    reflection = trimmed || null
    rawPayload = JSON.stringify({ source: 'freeform', text: trimmed })
    inputType = 'freeform'
  }

  const clientTimestamp = input.clientSubmissionTimestamp 
    ? new Date(input.clientSubmissionTimestamp) 
    : new Date()

  // Logical Idempotency Guard: prevent double-inserting duplicate offline syncs
  const existingSub = await db.submission.findFirst({
    where: {
      userId: user.id,
      milestoneId: milestone.id,
      clientSubmissionTimestamp: clientTimestamp,
      reflection,
      aiShareLink: input.aiShareLink?.trim() || null,
    }
  })
  if (existingSub) {
    return { ok: true, id: existingSub.id, mode: inputType }
  }

  const sub = await db.submission.create({
    data: {
      milestone: { connect: { id: milestone.id } },
      milestoneVersion: milestone.version,
      user: { connect: { id: user.id } },
      clientSubmissionTimestamp: clientTimestamp,
      syncStatus: 'synced',
      inputType,
      aiShareLink: input.aiShareLink?.trim() || null,
      aiScore,
      confidence,
      weaknessTags: JSON.stringify(weaknessTags),
      reflection,
      rawPayload,
    },
  })

  await db.milestone.update({ where: { id: milestone.id }, data: { isLocked: true } })
  revalidatePath('/')

  // Fire leaderboard notification (debounced — max once per 5 min)
  void notifyLeaderboardUpdate()

  return { ok: true, id: sub.id, mode: inputType }
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
  const user = await requireActiveUser()
  const activeSeason = await getActiveSeason()
  const { computeStreakBreakdown } = await import('@/lib/streaks')
  return computeStreakBreakdown(user.id, activeSeason.id)
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

  const activeSeason = await getActiveSeason()
  const { computeStreakBreakdown, currentManilaWeekStart, manilaWeekKey } = await import('@/lib/streaks')
  const weekStart = currentManilaWeekStart()
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)

  const students = await db.user.findMany({
    where: { role: 'student', status: 'active' },
    select: {
      id: true, nickname: true, avatarId: true, role: true,
      captainOf: { include: { domain: true } },
    },
  })

  const out: LeaderboardEntry[] = []
  for (const s of students) {
    const breakdown = await computeStreakBreakdown(s.id, activeSeason.id)
    const bestStreak = Math.max(0, ...breakdown.map(b => b.streak))
    const thisWeekSubmitted = breakdown.some(b => b.thisWeekSubmitted)
    // Count distinct weeks with at least one submission in active season
    const subs = await db.submission.findMany({
      where: { userId: s.id, milestone: { seasonId: activeSeason.id } },
      select: { clientSubmissionTimestamp: true },
    })
    const weekKeys = new Set(subs.map(sub => manilaWeekKey(sub.clientSubmissionTimestamp.getTime())))
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
    where: { weekOf: { gte: weekStart }, seasonId: activeSeason.id },
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

  const activeSeason = await getActiveSeason()
  const where: any = { seasonId: activeSeason.id }
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
    where,
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

  const activeSeason = await getActiveSeason()
  const mock = await db.proctoredMock.create({
    data: {
      domain: { connect: { id: input.domainId } },
      season: { connect: { id: activeSeason.id } },
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
  const activeSeason = await getActiveSeason()
  const sels = await db.teamSelection.findMany({
    where: { seasonId: activeSeason.id },
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

  const activeSeason = await getActiveSeason()
  const existing = await db.teamSelection.findUnique({
    where: { seasonId_domainId_userId: { seasonId: activeSeason.id, domainId: input.domainId, userId: input.userId } },
  })
  if (existing) return { ok: false, error: 'Already selected.' }

  const sel = await db.teamSelection.create({
    data: {
      domain: { connect: { id: input.domainId } },
      season: { connect: { id: activeSeason.id } },
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
  const activeSeason = await getActiveSeason()
  await db.teamSelection.delete({
    where: { seasonId_domainId_userId: { seasonId: activeSeason.id, domainId, userId } },
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

  const activeSeason = await getActiveSeason()
  const spot = await db.weeklySpotlight.create({
    data: {
      user: { connect: { id: input.userId } },
      season: { connect: { id: activeSeason.id } },
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
  const user = await requireActiveUser()
  const activeSeason = await getActiveSeason()
  const { computeStreakBreakdown, currentManilaWeekStart } = await import('@/lib/streaks')

  const weekStart = currentManilaWeekStart()
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)

  const [streakBreakdown, mySubmissions, activeMilestones, myTeamSelections, myMocks, spotlight] = await Promise.all([
    computeStreakBreakdown(user.id, activeSeason.id),
    db.submission.findMany({
      where: { userId: user.id, milestone: { seasonId: activeSeason.id } },
      include: { milestone: { include: { domain: true } } },
      orderBy: { clientSubmissionTimestamp: 'desc' },
      take: 10,
    }),
    db.milestone.findMany({
      where: { status: 'active', seasonId: activeSeason.id },
      include: { domain: true, _count: { select: { submissions: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    db.teamSelection.findMany({
      where: { userId: user.id, seasonId: activeSeason.id },
      include: { domain: true, decidedBy: { select: { nickname: true } } },
    }),
    db.proctoredMock.findMany({
      where: { OR: [{ userId: user.id }, { pairPartnerId: user.id }], seasonId: activeSeason.id },
      include: { domain: true, partner: { select: { nickname: true } } },
      orderBy: { eventDate: 'desc' },
    }),
    db.weeklySpotlight.findFirst({
      where: { weekOf: { gte: weekStart }, userId: user.id, seasonId: activeSeason.id },
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
  const activeSeason = await getActiveSeason()
  const [milestones, submissions, mocks, selections, students, events, domains] = await Promise.all([
    db.milestone.count({ where: { seasonId: activeSeason.id } }),
    db.submission.count({ where: { milestone: { seasonId: activeSeason.id } } }),
    db.proctoredMock.count({ where: { seasonId: activeSeason.id } }),
    db.teamSelection.count({ where: { seasonId: activeSeason.id } }),
    db.user.count({ where: { role: 'student' } }),
    db.appEvent.findMany({ orderBy: { createdAt: 'desc' }, take: 10 }),
    db.domain.count(),
  ])
  return { counts: { milestones, submissions, mocks, selections, students, domains }, events }
}

export async function getAdminDashboardDataAction() {
  await requireRole('admin')
  const activeSeason = await getActiveSeason()
  const [users, domains, captains, milestones, submissions, mocks, selections, events] = await Promise.all([
    db.user.count(),
    db.domain.count(),
    db.domainCaptain.count(),
    db.milestone.count({ where: { seasonId: activeSeason.id } }),
    db.submission.count({ where: { milestone: { seasonId: activeSeason.id } } }),
    db.proctoredMock.count({ where: { seasonId: activeSeason.id } }),
    db.teamSelection.count({ where: { seasonId: activeSeason.id } }),
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
  const activeSeason = await getActiveSeason()

  const [evaluations, students, domain] = await Promise.all([
    db.candidateEvaluation.findMany({
      where: { domainId, seasonId: activeSeason.id },
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
          where: { milestone: { domainId, seasonId: activeSeason.id } },
          include: { milestone: { select: { mode: true } } },
        },
        proctoredMocksFor: {
          where: { domainId, seasonId: activeSeason.id },
          select: { score: true },
        },
      },
    }),
    db.domain.findUnique({ where: { id: domainId } }),
  ])

  void domain

  // Build candidate summary per student
  const { computeStreakForUserDomain } = await import('@/lib/streaks')
  const candidates: any[] = []
  for (const s of students) {
    const assessmentSubs = s.submissions.filter(sub => sub.milestone.mode === 'assessment' && sub.aiScore !== null)
    const scores = assessmentSubs.map(sub => sub.aiScore ?? 0)
    const streak = await computeStreakForUserDomain(s.id, domainId, activeSeason.id)
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
  const activeSeason = await getActiveSeason()

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
      where: { userId: student.id, milestone: { domainId: domain.id, seasonId: activeSeason.id } },
      include: { milestone: { select: { title: true, mode: true, difficulty: true, weekOrPhase: true } } },
      orderBy: { clientSubmissionTimestamp: 'desc' },
      take: 30,
    }),
    db.proctoredMock.findMany({
      where: { userId: student.id, domainId: domain.id, seasonId: activeSeason.id },
      orderBy: { eventDate: 'desc' },
    }),
    partner
      ? db.submission.findMany({
          where: { userId: partner.id, milestone: { domainId: domain.id, seasonId: activeSeason.id } },
          include: { milestone: { select: { title: true, mode: true, difficulty: true, weekOrPhase: true } } },
          orderBy: { clientSubmissionTimestamp: 'desc' },
          take: 20,
        })
      : Promise.resolve([]),
    partner
      ? db.proctoredMock.findMany({
          where: { userId: partner.id, domainId: domain.id, seasonId: activeSeason.id },
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

  // Load the prompt template from the database
  let promptTemplateObj = await db.systemPromptTemplate.findUnique({
    where: { name: 'candidate_evaluation' },
  })

  if (!promptTemplateObj) {
    promptTemplateObj = {
      id: 'default',
      name: 'candidate_evaluation',
      description: 'Default evaluation prompt template',
      mode: 'assessment',
      createdAt: new Date(),
      template: `You are evaluating {{candidate_name}} for the IT Skills Olympics {{domain_name}} team. This is a staff-only read to help a human (the instructor or domain captain) decide whether to select them for the November competition. Your output is INPUT to a human decision, not the decision itself.\n\nCRITICAL RULES:\n- Be honest, specific, and brief. Avoid hedging fluff.\n- Cite the data you\'re drawing on (which weeks, which scores).\n- If the data is thin, say so explicitly in plain language — don\'t invent a confidence score.\n- Don\'t just summarize; give the staff a useful read. What pattern do you see? What\'s the risk? What would you want to see more of before locking in the pick?\n- {{partner_rules}}\n\nDOMAIN: {{domain_name}}\nDOMAIN CONTEXT: {{domain_description}}\nCONTEST FORMAT: {{contest_format}}\n\n{{candidate_identity}}\n\nPRACTICE DATA (most recent first):\n{{practice_data}}\n\nPROCTORED MOCK RESULTS (most recent first):\n{{mock_data}}\n\nEVALUATION BASIS: {{basis}}\n{{basis_guidelines}}\n\nOUTPUT FORMAT (respond as valid JSON, no markdown fences):\n{\n  "aiSummary": "2-4 sentence honest read of where this candidate stands right now",\n  "strengths": ["2-4 specific strengths, citing data where possible"],\n  "weaknesses": ["2-4 specific weaknesses or risks"]{{partner_output_format}},\n  "recommendation": "1-2 sentence coaching note for the instructor — what to watch for, what to drill, whether to lock them in or wait"\n}`,
    }
  }

  let prompt = promptTemplateObj.template

  const partner_rules = partner
    ? `For pairs: explicitly assess complementarity — do their strengths/weaknesses cover each other? Are there red flags (e.g. both weak on the same thing, both low confidence under time pressure)? MOST IMPORTANTLY: assign roles. Who should take which kind of problem during the contest? Base this on their actual practice data — if A is consistently faster on easy-tier syntax problems and B is stronger on edge-case debugging, say so. The role assignment is the single most useful thing you can produce for a pair; the staff will use it to coach them on division of labor before November.`
    : `For solo candidates: focus on readiness, consistency, and trajectory.`

  const candidate_identity = partner
    ? `CANDIDATE A: ${student.nickname}${student.realName ? ` (${student.realName})` : ''}${student.studentId ? ` [${student.studentId}]` : ''}\nCANDIDATE B: ${partner.nickname}${partner.realName ? ` (${partner.realName})` : ''}`
    : `CANDIDATE: ${student.nickname}${student.realName ? ` (${student.realName})` : ''}${student.studentId ? ` [${student.studentId}]` : ''}`

  const practice_data = `${formatSubs(submissions, partner ? 'A' : 'Student')}\n${partner ? formatSubs(partnerSubs, 'B') : ''}`
  const mock_data = `${formatMocks(mocks, partner ? 'A' : 'Student')}\n${partner ? formatMocks(partnerMocks, 'B') : ''}`

  const basis_guidelines = basis === 'practice_only'
    ? `(Practice data only — no proctored results yet. Treat this read as tentative; the real signal comes from proctored mocks in October.)`
    : basis === 'proctored_only'
      ? `(Proctored results only — no scored practice data. The proctored signal is the more reliable one.)`
      : `(Both practice and proctored data available — weight the proctored results more heavily for selection calls.)`

  const partner_output_format = partner
    ? `,\n  "complementarity": "1-2 sentence assessment of how they complement (or fail to complement) each other",\n  "roleAssignment": "Specific role assignment for the contest. Format: 'A handles X (because...); B handles Y (because...)'. Be concrete — reference the problem types, tiers, or phases where each should lead. This is the actionable output the staff will coach to."`
    : ''

  prompt = prompt.replace(/\{\{candidate_name\}\}/g, partner ? 'a candidate pair' : 'a candidate')
  prompt = prompt.replace(/\{\{domain_name\}\}/g, domain.name)
  prompt = prompt.replace(/\{\{domain_description\}\}/g, domain.description ?? '(no description)')
  prompt = prompt.replace(/\{\{contest_format\}\}/g, domain.contestFormat)
  prompt = prompt.replace(/\{\{partner_rules\}\}/g, partner_rules)
  prompt = prompt.replace(/\{\{candidate_identity\}\}/g, candidate_identity)
  prompt = prompt.replace(/\{\{practice_data\}\}/g, practice_data)
  prompt = prompt.replace(/\{\{mock_data\}\}/g, mock_data)
  prompt = prompt.replace(/\{\{basis\}\}/g, basis)
  prompt = prompt.replace(/\{\{basis_guidelines\}\}/g, basis_guidelines)
  prompt = prompt.replace(/\{\{partner_output_format\}\}/g, partner_output_format)

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

  const activeSeason = await getActiveSeason()
  const eval_ = await db.candidateEvaluation.create({
    data: {
      domain: { connect: { id: input.domainId } },
      season: { connect: { id: activeSeason.id } },
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
  const activeSeason = await getActiveSeason()

  const data = await listCandidateEvaluationsAction(domainId)
  // Only consider students who have at least one assessment submission OR a proctored score
  const eligible = data.candidates.filter(c => c.assessmentCount > 0 || c.proctoredScore !== null)
  if (eligible.length < 2) return []

  // Fetch weakness tags per student
  const weaknessByUser = new Map<string, Set<string>>()
  for (const c of eligible) {
    const subs = await db.submission.findMany({
      where: { userId: c.userId, milestone: { domainId, seasonId: activeSeason.id } },
      select: { weaknessTags: true },
    })
    const tags = new Set<string>()
    for (const s of subs) {
      const arr = JSON.parse(s.weaknessTags || '[]') as string[]
      for (const t of arr) if (t.trim()) tags.add(t.trim())
    }
    weaknessByUser.set(c.userId, tags)
  }

  const pairs: any[] = []
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

// -----------------------------------------------------------------------------
// System Prompt Templates Management
// -----------------------------------------------------------------------------

export async function listSystemPromptTemplatesAction() {
  await requireRole('admin', 'instructor')
  return db.systemPromptTemplate.findMany({
    orderBy: { name: 'asc' },
  })
}

export async function updateSystemPromptTemplateAction(id: string, template: string, description?: string) {
  await requireRole('admin', 'instructor')
  if (template.trim().length < 10) throw new Error('Prompt template is too short.')
  return db.systemPromptTemplate.update({
    where: { id },
    data: {
      template: template.trim(),
      ...(description !== undefined ? { description: description.trim() } : {}),
    },
  })
}

// -----------------------------------------------------------------------------
// Dynamic Domains CRUD (scalable next year seasons too)
// -----------------------------------------------------------------------------

export async function createDomainAction(data: {
  key: string
  name: string
  shortName?: string
  description?: string | null
  color?: string
  icon?: string
  practiceNote?: string
  contestFormat?: string
  pairBased?: boolean
  teamSize?: number
}) {
  await requireRole('admin')
  return db.domain.create({
    data: {
      key: data.key.trim().toLowerCase(),
      name: data.name.trim(),
      shortName: data.shortName?.trim() || '',
      description: data.description?.trim() || null,
      color: data.color || '#16a34a',
      icon: data.icon || 'Trophy',
      practiceNote: data.practiceNote?.trim() || '',
      contestFormat: data.contestFormat?.trim() || '',
      pairBased: data.pairBased ?? false,
      teamSize: data.teamSize ?? 1,
    },
  })
}

export async function updateDomainAction(
  id: string,
  data: {
    key?: string
    name?: string
    shortName?: string
    description?: string | null
    color?: string
    icon?: string
    practiceNote?: string
    contestFormat?: string
    pairBased?: boolean
    teamSize?: number
  }
) {
  await requireRole('admin')
  return db.domain.update({
    where: { id },
    data: {
      ...(data.key ? { key: data.key.trim().toLowerCase() } : {}),
      ...(data.name ? { name: data.name.trim() } : {}),
      ...(data.shortName !== undefined ? { shortName: data.shortName.trim() } : {}),
      ...(data.description !== undefined ? { description: data.description?.trim() || null } : {}),
      ...(data.color ? { color: data.color } : {}),
      ...(data.icon ? { icon: data.icon } : {}),
      ...(data.practiceNote !== undefined ? { practiceNote: data.practiceNote.trim() } : {}),
      ...(data.contestFormat !== undefined ? { contestFormat: data.contestFormat.trim() } : {}),
      ...(data.pairBased !== undefined ? { pairBased: data.pairBased } : {}),
      ...(data.teamSize !== undefined ? { teamSize: data.teamSize } : {}),
    },
  })
}

export async function deleteDomainAction(id: string) {
  await requireRole('admin')
  return db.domain.delete({
    where: { id },
  })
}

// -----------------------------------------------------------------------------
// Seasons CRUD & Rollovers (scalability and multi-season next year support)
// -----------------------------------------------------------------------------

export async function listSeasonsAction() {
  await requireRole('admin', 'instructor')
  return db.season.findMany({
    include: { phases: true },
    orderBy: { createdAt: 'desc' },
  })
}

export async function createSeasonAction(data: {
  name: string
  startDate: string
  endDate: string
  status?: string
  paceMode?: 'synchronous' | 'asynchronous'
  currentPhaseKey?: string | null
  phases?: Array<{
    key: string
    label: string
    shortLabel: string
    description: string
    isMockHeavy?: boolean
    sequence: number
  }>
}) {
  await requireRole('admin')

  // If status is active, deactivate other seasons first
  if (data.status === 'active') {
    await db.season.updateMany({
      where: { status: 'active' },
      data: { status: 'inactive' },
    })
  }

  const season = await db.season.create({
    data: {
      name: data.name.trim(),
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      status: data.status || 'inactive',
      paceMode: data.paceMode ?? 'asynchronous',
      currentPhaseKey: data.currentPhaseKey ?? null,
    },
  })

  // Create timeline phases if provided
  if (data.phases && data.phases.length > 0) {
    for (const p of data.phases) {
      await db.seasonPhase.create({
        data: {
          seasonId: season.id,
          key: p.key,
          label: p.label,
          shortLabel: p.shortLabel,
          description: p.description,
          isMockHeavy: p.isMockHeavy ?? false,
          sequence: p.sequence,
        },
      })
    }
  }

  revalidatePath('/')
  return season
}

export async function updateSeasonAction(
  id: string,
  data: {
    name?: string
    startDate?: string
    endDate?: string
    status?: string
    paceMode?: 'synchronous' | 'asynchronous'
    currentPhaseKey?: string | null
    phases?: Array<{
      id?: string
      key: string
      label: string
      shortLabel: string
      description: string
      isMockHeavy?: boolean
      sequence: number
    }>
  }
) {
  await requireRole('admin')

  // If status is updated to active, deactivate other seasons
  if (data.status === 'active') {
    await db.season.updateMany({
      where: { status: 'active', NOT: { id } },
      data: { status: 'inactive' },
    })
  }

  const season = await db.season.update({
    where: { id },
    data: {
      ...(data.name ? { name: data.name.trim() } : {}),
      ...(data.startDate ? { startDate: new Date(data.startDate) } : {}),
      ...(data.endDate ? { endDate: new Date(data.endDate) } : {}),
      ...(data.status ? { status: data.status } : {}),
      ...('paceMode' in data && data.paceMode ? { paceMode: data.paceMode } : {}),
      ...('currentPhaseKey' in data ? { currentPhaseKey: data.currentPhaseKey } : {}),
    },
  })

  // If phases are provided, replace/update them
  if (data.phases) {
    // Delete existing phases for this season first, then recreate
    await db.seasonPhase.deleteMany({
      where: { seasonId: id },
    })
    for (const p of data.phases) {
      await db.seasonPhase.create({
        data: {
          seasonId: id,
          key: p.key,
          label: p.label,
          shortLabel: p.shortLabel,
          description: p.description,
          isMockHeavy: p.isMockHeavy ?? false,
          sequence: p.sequence,
        },
      })
    }
  }

  revalidatePath('/')
  return season
}

export async function deleteSeasonAction(id: string) {
  await requireRole('admin')
  const season = await db.season.delete({
    where: { id },
  })
  revalidatePath('/')
  return season
}

// -----------------------------------------------------------------------------
// Registration & Approvals
// -----------------------------------------------------------------------------

export async function registerAction(input: {
  studentId: string
  nickname: string
  realName: string
  password: string
  avatarId?: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const studentId = input.studentId.trim()
  const nickname = input.nickname.trim()
  const realName = input.realName.trim()
  const password = input.password
  const avatarId = input.avatarId || 'avatar-01'

  if (studentId.length < 2 || studentId.length > 20) {
    return { ok: false, error: 'Student ID must be between 2 and 20 characters.' }
  }
  if (!/^[a-zA-Z0-9-]+$/.test(studentId)) {
    return { ok: false, error: 'Student ID must be alphanumeric and can include dashes.' }
  }
  if (nickname.length < 2 || nickname.length > 32) {
    return { ok: false, error: 'Nickname must be between 2 and 32 characters.' }
  }
  if (realName.length < 2 || realName.length > 100) {
    return { ok: false, error: 'Real name must be between 2 and 100 characters.' }
  }
  if (password.length < 8) {
    return { ok: false, error: 'Password must be at least 8 characters.' }
  }
  if (avatarId && !AVATAR_MAP[avatarId]) {
    return { ok: false, error: 'Invalid avatar selection.' }
  }

  // Check unique student ID
  const existingStudent = await db.user.findFirst({
    where: { studentId },
  })
  if (existingStudent) {
    return { ok: false, error: 'Student ID is already registered.' }
  }

  const email = `${studentId.toLowerCase()}@ito.local`
  const existingEmail = await db.user.findUnique({
    where: { email },
  })
  if (existingEmail) {
    return { ok: false, error: 'Student ID placeholder email is already in use.' }
  }

  const newUser = await db.user.create({
    data: {
      email,
      passwordHash: hashPassword(password),
      role: 'student',
      status: 'pending',
      nickname,
      realName,
      studentId,
      avatarId,
    },
  })

  // Log in immediately by creating session
  await createSession(newUser.id)

  return { ok: true }
}

export async function listPendingUsersAction() {
  await requireRole('admin')
  return db.user.findMany({
    where: { status: 'pending' },
    orderBy: { createdAt: 'asc' },
  })
}

export async function approveUserAction(userId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireRole('admin')
  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user) return { ok: false, error: 'User not found.' }
  await db.user.update({
    where: { id: userId },
    data: { status: 'active' },
  })
  revalidatePath('/')
  return { ok: true }
}

export async function rejectUserAction(userId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireRole('admin')
  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user) return { ok: false, error: 'User not found.' }
  await db.user.update({
    where: { id: userId },
    data: { status: 'rejected' },
  })
  revalidatePath('/')
  return { ok: true }
}

export async function bulkCreateUsersAction(
  records: Array<{
    studentId: string
    nickname: string
    realName?: string
    password: string
    role?: 'admin' | 'instructor' | 'student'
    avatarId?: string
  }>
): Promise<{
  ok: true
  created: number
  skipped: number
  errors: Array<{ row: number; studentId: string; reason: string }>
} | { ok: false; error: string }> {
  await requireRole('admin')
  if (!records || records.length === 0) {
    return { ok: false, error: 'No records provided.' }
  }
  if (records.length > 200) {
    return { ok: false, error: 'Maximum batch size is 200 records.' }
  }

  let created = 0
  let skipped = 0
  const errors: Array<{ row: number; studentId: string; reason: string }> = []

  for (let i = 0; i < records.length; i++) {
    const rec = records[i]
    const rowNum = i + 1
    const studentId = (rec.studentId || '').trim()
    const nickname = (rec.nickname || '').trim()
    const realName = (rec.realName || '').trim()
    const password = rec.password
    const role = rec.role ?? 'student'
    const avatarId = rec.avatarId ?? 'avatar-01'

    if (!studentId) {
      errors.push({ row: rowNum, studentId: '', reason: 'Student ID is required.' })
      skipped++
      continue
    }
    if (studentId.length < 2 || studentId.length > 20) {
      errors.push({ row: rowNum, studentId, reason: 'Student ID must be 2-20 characters.' })
      skipped++
      continue
    }
    if (!/^[a-zA-Z0-9-]+$/.test(studentId)) {
      errors.push({ row: rowNum, studentId, reason: 'Student ID must be alphanumeric and can include dashes.' })
      skipped++
      continue
    }
    if (!nickname || nickname.length < 2 || nickname.length > 32) {
      errors.push({ row: rowNum, studentId, reason: 'Nickname must be 2-32 characters.' })
      skipped++
      continue
    }
    if (realName && realName.length > 100) {
      errors.push({ row: rowNum, studentId, reason: 'Real name max 100 characters.' })
      skipped++
      continue
    }
    if (!password || password.length < 8) {
      errors.push({ row: rowNum, studentId, reason: 'Password must be at least 8 characters.' })
      skipped++
      continue
    }
    if (!['admin', 'instructor', 'student'].includes(role)) {
      errors.push({ row: rowNum, studentId, reason: 'Invalid role.' })
      skipped++
      continue
    }
    if (avatarId && !AVATAR_MAP[avatarId]) {
      errors.push({ row: rowNum, studentId, reason: 'Invalid avatarId.' })
      skipped++
      continue
    }

    // Check unique studentId
    const existingStudent = await db.user.findFirst({
      where: { studentId },
    })
    if (existingStudent) {
      errors.push({ row: rowNum, studentId, reason: 'Student ID is already registered.' })
      skipped++
      continue
    }

    const email = `${studentId.toLowerCase()}@ito.local`
    const existingEmail = await db.user.findUnique({
      where: { email },
    })
    if (existingEmail) {
      errors.push({ row: rowNum, studentId, reason: 'Generated email is already in use.' })
      skipped++
      continue
    }

    try {
      await db.user.create({
        data: {
          email,
          passwordHash: hashPassword(password),
          role,
          status: 'active', // Bulk created users are auto-approved
          nickname,
          realName: realName || null,
          studentId,
          avatarId,
        },
      })
      created++
    } catch (e: any) {
      errors.push({ row: rowNum, studentId, reason: e.message || 'Database error.' })
      skipped++
    }
  }

  revalidatePath('/')
  return { ok: true, created, skipped, errors }
}

// ── Discord notification helpers ──────────────────────────────────────────────
// These are fire-and-forget. They MUST NOT throw or interfere with the
// calling action's return value.

let _lastLeaderboardNotifiedAt = 0
const LEADERBOARD_NOTIFY_DEBOUNCE_MS = 5 * 60 * 1000  // 5 minutes

async function _computeLeaderboardTop3(): Promise<Array<{ rank: number; nickname: string; bestStreak: number; weeksCompleted: number }>> {
  // Direct DB computation — avoids calling getLeaderboardAction() which
  // needs an HTTP request context for getSession() / cookies().
  const { computeStreakBreakdown, manilaWeekKey } = await import('@/lib/streaks')

  const activeSeason = await getActiveSeason()
  const students = await db.user.findMany({
    where: { role: 'student', status: 'active' },
    select: { id: true, nickname: true },
  })

  const entries: Array<{ nickname: string; bestStreak: number; weeksCompleted: number }> = []
  for (const s of students) {
    const breakdown = await computeStreakBreakdown(s.id, activeSeason.id)
    const bestStreak = Math.max(0, ...breakdown.map((b: { streak: number }) => b.streak))
    const subs = await db.submission.findMany({
      where: { userId: s.id, milestone: { seasonId: activeSeason.id } },
      select: { clientSubmissionTimestamp: true },
    })
    const weekKeys = new Set(subs.map((sub: { clientSubmissionTimestamp: Date }) => manilaWeekKey(sub.clientSubmissionTimestamp.getTime())))
    entries.push({ nickname: s.nickname, bestStreak, weeksCompleted: weekKeys.size })
  }

  entries.sort((a, b) => b.bestStreak - a.bestStreak || b.weeksCompleted - a.weeksCompleted)
  return entries.slice(0, 3).map((e, i) => ({ rank: i + 1, ...e }))
}

async function notifyLeaderboardUpdate() {
  const now = Date.now()
  if (now - _lastLeaderboardNotifiedAt < LEADERBOARD_NOTIFY_DEBOUNCE_MS) return
  _lastLeaderboardNotifiedAt = now

  try {
    const top3 = await _computeLeaderboardTop3()
    await sendDiscordAlert('leaderboard', { top3 })
  } catch (err) {
    console.error('[discord] notifyLeaderboardUpdate failed:', err)
  }
}
