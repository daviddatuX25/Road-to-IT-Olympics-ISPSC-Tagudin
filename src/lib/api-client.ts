'use client'

// Client-side wrappers for the RPC endpoint. The functions in src/lib/actions.ts
// are server actions, but we can't call them directly because the cloud gateway's
// CSRF protection blocks Server Actions. So we route every call through
// /api/rpc which dispatches to the same underlying functions.

type RpcResponse<T> = { ok: true; data: T } | { ok: false; error: string }

async function rpc<T>(action: string, args: unknown[]): Promise<T> {
  const res = await fetch('/api/rpc', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action, args }),
  })
  let json: RpcResponse<T>
  try {
    json = await res.json() as RpcResponse<T>
  } catch {
    throw new Error('Network error talking to the server.')
  }
  if (!json.ok) {
    throw new Error(json.error)
  }
  return json.data
}

// Re-export every action with a typed wrapper. This keeps the call sites in
// components clean — they look the same as calling the server action directly,
// they just go through fetch() under the hood.
import type {
  loginAction, logoutAction, getCurrentUser, updateProfileAction,
  listUsersAction, createUserAction, updateUserRoleAction, deleteUserAction,
  assignCaptainAction, removeCaptainAction,
  listDomainsAction,
  listMilestoneMetaAction, getMilestoneAction, createMilestoneAction,
  versionMilestoneAction, archiveMilestoneAction, activateMilestoneAction,
  submitGuidedFormAction, submitJsonAction,
  listMySubmissionsAction, listDomainSubmissionsAction,
  getStreakBreakdownAction, getLeaderboardAction,
  listProctoredMocksAction, createProctoredMockAction, deleteProctoredMockAction,
  listTeamSelectionsAction, selectTeamMemberAction, removeTeamSelectionAction,
  createSpotlightAction, listAppEventsAction,
  getStudentDashboardDataAction, getInstructorDashboardDataAction, getAdminDashboardDataAction,
} from '@/lib/actions'
import type { LeaderboardEntry, MilestoneWithMeta } from '@/lib/actions'

export type {
  LeaderboardEntry, MilestoneWithMeta,
}

// Arg types are inferred from the server action signatures via Parameters<...>.
// Each wrapper just forwards args through fetch.

export const api = {
  loginAction: (...args: Parameters<typeof loginAction>) =>
    rpc<Awaited<ReturnType<typeof loginAction>>>('loginAction', args),

  logoutAction: () =>
    rpc<Awaited<ReturnType<typeof logoutAction>>>('logoutAction', []),

  getCurrentUser: () =>
    rpc<Awaited<ReturnType<typeof getCurrentUser>>>('getCurrentUser', []),

  updateProfileAction: (...args: Parameters<typeof updateProfileAction>) =>
    rpc<Awaited<ReturnType<typeof updateProfileAction>>>('updateProfileAction', args),

  listUsersAction: () =>
    rpc<Awaited<ReturnType<typeof listUsersAction>>>('listUsersAction', []),

  createUserAction: (...args: Parameters<typeof createUserAction>) =>
    rpc<Awaited<ReturnType<typeof createUserAction>>>('createUserAction', args),

  updateUserRoleAction: (...args: Parameters<typeof updateUserRoleAction>) =>
    rpc<Awaited<ReturnType<typeof updateUserRoleAction>>>('updateUserRoleAction', args),

  deleteUserAction: (...args: Parameters<typeof deleteUserAction>) =>
    rpc<Awaited<ReturnType<typeof deleteUserAction>>>('deleteUserAction', args),

  assignCaptainAction: (...args: Parameters<typeof assignCaptainAction>) =>
    rpc<Awaited<ReturnType<typeof assignCaptainAction>>>('assignCaptainAction', args),

  removeCaptainAction: (...args: Parameters<typeof removeCaptainAction>) =>
    rpc<Awaited<ReturnType<typeof removeCaptainAction>>>('removeCaptainAction', args),

  listDomainsAction: () =>
    rpc<Awaited<ReturnType<typeof listDomainsAction>>>('listDomainsAction', []),

  listMilestoneMetaAction: (...args: Parameters<typeof listMilestoneMetaAction>) =>
    rpc<Awaited<ReturnType<typeof listMilestoneMetaAction>>>('listMilestoneMetaAction', args),

  getMilestoneAction: (...args: Parameters<typeof getMilestoneAction>) =>
    rpc<Awaited<ReturnType<typeof getMilestoneAction>>>('getMilestoneAction', args),

  createMilestoneAction: (...args: Parameters<typeof createMilestoneAction>) =>
    rpc<Awaited<ReturnType<typeof createMilestoneAction>>>('createMilestoneAction', args),

  versionMilestoneAction: (...args: Parameters<typeof versionMilestoneAction>) =>
    rpc<Awaited<ReturnType<typeof versionMilestoneAction>>>('versionMilestoneAction', args),

  archiveMilestoneAction: (...args: Parameters<typeof archiveMilestoneAction>) =>
    rpc<Awaited<ReturnType<typeof archiveMilestoneAction>>>('archiveMilestoneAction', args),

  activateMilestoneAction: (...args: Parameters<typeof activateMilestoneAction>) =>
    rpc<Awaited<ReturnType<typeof activateMilestoneAction>>>('activateMilestoneAction', args),

  submitGuidedFormAction: (...args: Parameters<typeof submitGuidedFormAction>) =>
    rpc<Awaited<ReturnType<typeof submitGuidedFormAction>>>('submitGuidedFormAction', args),

  submitJsonAction: (...args: Parameters<typeof submitJsonAction>) =>
    rpc<Awaited<ReturnType<typeof submitJsonAction>>>('submitJsonAction', args),

  listMySubmissionsAction: () =>
    rpc<Awaited<ReturnType<typeof listMySubmissionsAction>>>('listMySubmissionsAction', []),

  listDomainSubmissionsAction: (...args: Parameters<typeof listDomainSubmissionsAction>) =>
    rpc<Awaited<ReturnType<typeof listDomainSubmissionsAction>>>('listDomainSubmissionsAction', args),

  getStreakBreakdownAction: () =>
    rpc<Awaited<ReturnType<typeof getStreakBreakdownAction>>>('getStreakBreakdownAction', []),

  getLeaderboardAction: () =>
    rpc<Awaited<ReturnType<typeof getLeaderboardAction>>>('getLeaderboardAction', []),

  listProctoredMocksAction: (...args: Parameters<typeof listProctoredMocksAction>) =>
    rpc<Awaited<ReturnType<typeof listProctoredMocksAction>>>('listProctoredMocksAction', args),

  createProctoredMockAction: (...args: Parameters<typeof createProctoredMockAction>) =>
    rpc<Awaited<ReturnType<typeof createProctoredMockAction>>>('createProctoredMockAction', args),

  deleteProctoredMockAction: (...args: Parameters<typeof deleteProctoredMockAction>) =>
    rpc<Awaited<ReturnType<typeof deleteProctoredMockAction>>>('deleteProctoredMockAction', args),

  listTeamSelectionsAction: () =>
    rpc<Awaited<ReturnType<typeof listTeamSelectionsAction>>>('listTeamSelectionsAction', []),

  selectTeamMemberAction: (...args: Parameters<typeof selectTeamMemberAction>) =>
    rpc<Awaited<ReturnType<typeof selectTeamMemberAction>>>('selectTeamMemberAction', args),

  removeTeamSelectionAction: (...args: Parameters<typeof removeTeamSelectionAction>) =>
    rpc<Awaited<ReturnType<typeof removeTeamSelectionAction>>>('removeTeamSelectionAction', args),

  createSpotlightAction: (...args: Parameters<typeof createSpotlightAction>) =>
    rpc<Awaited<ReturnType<typeof createSpotlightAction>>>('createSpotlightAction', args),

  listAppEventsAction: (...args: Parameters<typeof listAppEventsAction>) =>
    rpc<Awaited<ReturnType<typeof listAppEventsAction>>>('listAppEventsAction', args),

  getStudentDashboardDataAction: () =>
    rpc<Awaited<ReturnType<typeof getStudentDashboardDataAction>>>('getStudentDashboardDataAction', []),

  getInstructorDashboardDataAction: () =>
    rpc<Awaited<ReturnType<typeof getInstructorDashboardDataAction>>>('getInstructorDashboardDataAction', []),

  getAdminDashboardDataAction: () =>
    rpc<Awaited<ReturnType<typeof getAdminDashboardDataAction>>>('getAdminDashboardDataAction', []),
}
