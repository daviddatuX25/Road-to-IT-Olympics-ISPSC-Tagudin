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
  'listProctoredMocksAction',
  'createProctoredMockAction',
  'deleteProctoredMockAction',
  'listTeamSelectionsAction',
  'selectTeamMemberAction',
  'removeTeamSelectionAction',
  'createSpotlightAction',
  'listAppEventsAction',
  'getStudentDashboardDataAction',
  'getInstructorDashboardDataAction',
  'getAdminDashboardDataAction',
])

export async function POST(req: NextRequest) {
  let body: { action?: string; args?: unknown[] }
  try {
    body = await req.json()
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
    return NextResponse.json({ ok: false, error: message, stack }, { status })
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'Road to IT Olympics RPC',
    actions: Array.from(ALLOWED).sort(),
  })
}
