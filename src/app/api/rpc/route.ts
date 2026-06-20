// Single JSON-RPC style endpoint that dispatches to all the action functions
// in lib/actions.ts. We use this instead of Next.js Server Actions because
// the cloud gateway's CSRF protection rejects server actions when the
// x-forwarded-host (set by the gateway to its own internal hostname) doesn't
// match the origin (the user-visible preview URL).
//
// POST /api/rpc  { action: 'loginAction', args: [...] }
// → 200 { ok: true, data: ... } | { ok: false, error: '...' }

import { NextRequest, NextResponse } from 'next/server'
import * as actions from '@/lib/actions'

export const runtime = 'nodejs'
export const maxDuration = 30  // 30 second timeout

// Max request body size — 1 MB. Submission reflections are capped at 5 KB,
// so 1 MB is generous and prevents abuse.
const MAX_BODY_SIZE = 1024 * 1024

// Whitelist of action names that can be called via RPC.
const ALLOWED: ReadonlySet<string> = new Set([
  'loginAction',
  'logoutAction',
  'getCurrentUser',
  'updateProfileAction',
  'listUsersAction',
  'createUserAction',
  'updateUserRoleAction',
  'deleteUserAction',
  'assignCaptainAction',
  'removeCaptainAction',
  'listDomainsAction',
  'listMilestoneMetaAction',
  'getMilestoneAction',
  'createMilestoneAction',
  'versionMilestoneAction',
  'archiveMilestoneAction',
  'activateMilestoneAction',
  'submitGuidedFormAction',
  'submitJsonAction',
  'listMySubmissionsAction',
  'listDomainSubmissionsAction',
  'getStreakBreakdownAction',
  'getLeaderboardAction',
  'getAssessmentLeadersAction',
  'listProctoredMocksAction',
  'createProctoredMockAction',
  'deleteProctoredMockAction',
  'listTeamSelectionsAction',
  'selectTeamMemberAction',
  'removeTeamSelectionAction',
  'createSpotlightAction',
  'listAppEventsAction',
  'listCandidateEvaluationsAction',
  'buildEvaluationPromptAction',
  'createCandidateEvaluationAction',
  'suggestPairsAction',
  'getStudentDashboardDataAction',
  'getInstructorDashboardDataAction',
  'getAdminDashboardDataAction',
])

// Simple in-memory rate limiter — per IP, per action.
// Not persistent across restarts, but enough to slow down brute force.
// For a club app this is fine; for larger scale, use Redis or similar.
const RATE_LIMIT_WINDOW_MS = 60 * 1000  // 1 minute
const RATE_LIMIT_MAX = 60               // 60 calls per minute per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }
  if (entry.count >= RATE_LIMIT_MAX) return false
  entry.count++
  return true
}

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [ip, entry] of rateLimitMap) {
    if (entry.resetAt < now) rateLimitMap.delete(ip)
  }
}, 5 * 60 * 1000).unref?.()

function getClientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown'
}

export async function POST(req: NextRequest) {
  // Rate limit check
  const ip = getClientIp(req)
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { ok: false, error: 'Too many requests. Slow down.' },
      { status: 429 },
    )
  }

  // Read body with size limit
  const text = await req.text()
  if (text.length > MAX_BODY_SIZE) {
    return NextResponse.json(
      { ok: false, error: 'Request body too large.' },
      { status: 413 },
    )
  }

  let body: { action?: string; args?: unknown[] }
  try {
    body = JSON.parse(text)
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body.' }, { status: 400 })
  }

  const actionName = body.action
  const args = Array.isArray(body.args) ? body.args : []

  if (!actionName || !ALLOWED.has(actionName)) {
    return NextResponse.json(
      { ok: false, error: `Unknown action: ${actionName ?? '(none)'}` },
      { status: 400 },
    )
  }

  const fn = (actions as Record<string, (...a: unknown[]) => unknown>)[actionName]
  if (typeof fn !== 'function') {
    return NextResponse.json({ ok: false, error: 'Action not callable.' }, { status: 500 })
  }

  try {
    const result = await fn(...args)
    return NextResponse.json({ ok: true, data: result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    const stack = err instanceof Error ? err.stack : undefined
    console.error('[RPC] action', actionName, 'threw:', message, stack)
    const status = message === 'NOT_AUTHENTICATED' ? 401 : message === 'FORBIDDEN' ? 403 : 500
    return NextResponse.json({ ok: false, error: message }, { status })
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'Road to IT Olympics RPC',
    actions: Array.from(ALLOWED).sort(),
  })
}
