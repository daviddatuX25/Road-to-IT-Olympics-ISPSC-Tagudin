'use client'

// Client-side wrappers for the RPC endpoint. The functions in src/lib/actions.ts
// are server actions, but we can't call them directly because the cloud gateway's
// CSRF protection blocks Server Actions. So we route every call through
// /api/rpc which dispatches to the same underlying functions.

import { idb } from './idb'
import {
  CACHE_POLICY,
  OUTBOX_POLICY,
  isCacheableForRole,
  resolveOutboxConflict,
  bustRelatedCaches,
} from './cache-policy'
import { useOfflineStore } from './offline-store'
import { toast } from 'sonner'

type RpcResponse<T> = { ok: true; data: T } | { ok: false; error: string }

export class OfflineQueuedError extends Error {
  action: string
  constructor(action: string) {
    super(`Action ${action} has been queued offline.`)
    this.name = 'OfflineQueuedError'
    this.action = action
  }
}

export class OfflineBlockedError extends Error {
  action: string
  constructor(action: string, message: string) {
    super(message)
    this.name = 'OfflineBlockedError'
    this.action = action
  }
}

function isNetworkError(err: any): boolean {
  if (err instanceof TypeError) return true
  const msg = String(err.message || '').toLowerCase()
  return msg.includes('network') || msg.includes('failed to fetch') || msg.includes('load failed')
}

export function friendlyName(action: string): string {
  if (action === 'submitGuidedFormAction' || action === 'submitJsonAction') return 'Submission'
  if (action === 'updateProfileAction') return 'Profile Update'
  if (action === 'selectTeamMemberAction') return 'Team Selection'
  if (action === 'removeTeamSelectionAction') return 'Team Removal'
  return action
}

export async function fetchRpc<T>(action: string, args: unknown[]): Promise<T> {
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

async function rpc<T>(action: string, args: unknown[]): Promise<T> {
  const { isOnline } = useOfflineStore.getState()

  // Get current cached user details to determine role-based cache policies
  const userCache = await idb.get<any>('rpc-cache', 'current-user')
  const currentUser = userCache?.data

  // ── 1. ONLINE: try server first ──
  if (isOnline) {
    try {
      const data = await fetchRpc<T>(action, args)

      // Cache the response if this action is cacheable for this role
      if (isCacheableForRole(action, currentUser)) {
        const policy = CACHE_POLICY[action]
        const key = policy.key(args)
        await idb.set('rpc-cache', key, { data, cachedAt: Date.now() })
      }

      // Bust related caches
      await bustRelatedCaches(action)

      return data
    } catch (err: any) {
      if (!isNetworkError(err)) {
        throw err
      }
    }
  }

  // ── 2. OFFLINE READS: try cache ──
  if (isCacheableForRole(action, currentUser)) {
    const policy = CACHE_POLICY[action]
    const key = policy.key(args)
    const cached = await idb.get<any>('rpc-cache', key)

    if (cached) {
      const age = Date.now() - cached.cachedAt
      const isStale = age > policy.ttlMs

      if (isStale) {
        console.warn(`[offline] Serving stale cache for ${action} (age: ${Math.round(age / 60000)}min)`)
      }
      return cached.data as T
    }
    
    throw new OfflineBlockedError(action, 'You are offline and this data has not been cached yet.')
  }

  // ── 3. OFFLINE WRITES: queue in outbox ──
  if (OUTBOX_POLICY[action]) {
    const policy = OUTBOX_POLICY[action]
    
    if (action === 'submitGuidedFormAction' || action === 'submitJsonAction') {
      if (args[0] && typeof args[0] === 'object') {
        const inputObj = args[0] as any
        if (!inputObj.clientSubmissionTimestamp) {
          inputObj.clientSubmissionTimestamp = new Date().toISOString()
        }
      }
    }

    const dedupKey = policy.dedupKey(args)

    const existing = await idb.getAll<any>('outbox')
    const resolution = resolveOutboxConflict(
      { action, args, queuedAt: Date.now(), retries: 0, dedupKey },
      existing
    )

    if (resolution.type === 'replace' && resolution.targetId !== undefined) {
      await idb.replaceOutbox(dedupKey, { action, args, queuedAt: Date.now(), retries: 0, dedupKey })
      toast.info(`Updated queued ${friendlyName(action)} (offline).`)
    } else if (resolution.type === 'cancel' && resolution.targetId !== undefined) {
      await idb.removeOutbox(resolution.targetId)
      useOfflineStore.getState().decrementPending()
      toast.info(`Cancelled contradictory queued action (offline).`)
    } else if (resolution.type === 'push') {
      await idb.pushOutbox({ action, args, queuedAt: Date.now(), retries: 0, dedupKey })
      useOfflineStore.getState().incrementPending()
      toast.info(`${friendlyName(action)} queued. Will sync when back online.`)
    }

    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready
        if ('sync' in reg) {
          await (reg as any).sync.register('rio-outbox-sync')
        }
      } catch (swErr) {
        console.warn('[SW Background Sync] Registration failed:', swErr)
      }
    }

    throw new OfflineQueuedError(action)
  }

  // ── 4. NOT CACHEABLE & NOT QUEUEABLE: blocked ──
  const blockedMessage = 'You must be online to perform this action.'
  toast.error(blockedMessage)
  throw new OfflineBlockedError(action, blockedMessage)
}


// Re-export every action with a typed wrapper. This keeps the call sites in
// components clean — they look the same as calling the server action directly,
// they just go through fetch() under the hood.
import type {
  loginAction, logoutAction, getCurrentUser, updateProfileAction,
  requestPasswordResetAction, resetPasswordAction,
  listUsersAction, createUserAction, updateUserRoleAction, deleteUserAction,
  assignCaptainAction, removeCaptainAction,
  registerAction, listPendingUsersAction, approveUserAction, rejectUserAction, bulkCreateUsersAction,
  listDomainsAction,
  listMilestoneMetaAction, getMilestoneAction, createMilestoneAction,
  versionMilestoneAction, archiveMilestoneAction, activateMilestoneAction,
  submitGuidedFormAction, submitJsonAction,
  listMySubmissionsAction, listDomainSubmissionsAction,
  getStreakBreakdownAction, getLeaderboardAction, getAssessmentLeadersAction,
  listProctoredMocksAction, createProctoredMockAction, deleteProctoredMockAction,
  listTeamSelectionsAction, selectTeamMemberAction, removeTeamSelectionAction,
  createSpotlightAction, listAppEventsAction,
  listCandidateEvaluationsAction, buildEvaluationPromptAction,
  createCandidateEvaluationAction, suggestPairsAction,
  getStudentDashboardDataAction, getInstructorDashboardDataAction, getAdminDashboardDataAction,
  listSystemPromptTemplatesAction,
  updateSystemPromptTemplateAction,
  createDomainAction,
  updateDomainAction,
  deleteDomainAction,
  getActiveSeasonAction,
  listSeasonsAction,
  createSeasonAction,
  updateSeasonAction,
  deleteSeasonAction,
} from '@/lib/actions'
import type { LeaderboardEntry, MilestoneWithMeta, AssessmentLeader, CandidateEvaluationMeta } from '@/lib/actions'

export type {
  LeaderboardEntry, MilestoneWithMeta, AssessmentLeader, CandidateEvaluationMeta,
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

  requestPasswordResetAction: (...args: Parameters<typeof requestPasswordResetAction>) =>
    rpc<Awaited<ReturnType<typeof requestPasswordResetAction>>>('requestPasswordResetAction', args),

  resetPasswordAction: (...args: Parameters<typeof resetPasswordAction>) =>
    rpc<Awaited<ReturnType<typeof resetPasswordAction>>>('resetPasswordAction', args),

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

  getAssessmentLeadersAction: () =>
    rpc<Awaited<ReturnType<typeof getAssessmentLeadersAction>>>('getAssessmentLeadersAction', []),

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

  listCandidateEvaluationsAction: (...args: Parameters<typeof listCandidateEvaluationsAction>) =>
    rpc<Awaited<ReturnType<typeof listCandidateEvaluationsAction>>>('listCandidateEvaluationsAction', args),

  buildEvaluationPromptAction: (...args: Parameters<typeof buildEvaluationPromptAction>) =>
    rpc<Awaited<ReturnType<typeof buildEvaluationPromptAction>>>('buildEvaluationPromptAction', args),

  createCandidateEvaluationAction: (...args: Parameters<typeof createCandidateEvaluationAction>) =>
    rpc<Awaited<ReturnType<typeof createCandidateEvaluationAction>>>('createCandidateEvaluationAction', args),

  suggestPairsAction: (...args: Parameters<typeof suggestPairsAction>) =>
    rpc<Awaited<ReturnType<typeof suggestPairsAction>>>('suggestPairsAction', args),

  getStudentDashboardDataAction: () =>
    rpc<Awaited<ReturnType<typeof getStudentDashboardDataAction>>>('getStudentDashboardDataAction', []),

  getInstructorDashboardDataAction: () =>
    rpc<Awaited<ReturnType<typeof getInstructorDashboardDataAction>>>('getInstructorDashboardDataAction', []),

  getAdminDashboardDataAction: () =>
    rpc<Awaited<ReturnType<typeof getAdminDashboardDataAction>>>('getAdminDashboardDataAction', []),

  listSystemPromptTemplatesAction: () =>
    rpc<Awaited<ReturnType<typeof listSystemPromptTemplatesAction>>>('listSystemPromptTemplatesAction', []),

  updateSystemPromptTemplateAction: (...args: Parameters<typeof updateSystemPromptTemplateAction>) =>
    rpc<Awaited<ReturnType<typeof updateSystemPromptTemplateAction>>>('updateSystemPromptTemplateAction', args),

  createDomainAction: (...args: Parameters<typeof createDomainAction>) =>
    rpc<Awaited<ReturnType<typeof createDomainAction>>>('createDomainAction', args),

  updateDomainAction: (...args: Parameters<typeof updateDomainAction>) =>
    rpc<Awaited<ReturnType<typeof updateDomainAction>>>('updateDomainAction', args),

  deleteDomainAction: (...args: Parameters<typeof deleteDomainAction>) =>
    rpc<Awaited<ReturnType<typeof deleteDomainAction>>>('deleteDomainAction', args),

  getActiveSeasonAction: () =>
    rpc<Awaited<ReturnType<typeof getActiveSeasonAction>>>('getActiveSeasonAction', []),

  listSeasonsAction: () =>
    rpc<Awaited<ReturnType<typeof listSeasonsAction>>>('listSeasonsAction', []),

  createSeasonAction: (...args: Parameters<typeof createSeasonAction>) =>
    rpc<Awaited<ReturnType<typeof createSeasonAction>>>('createSeasonAction', args),

  updateSeasonAction: (...args: Parameters<typeof updateSeasonAction>) =>
    rpc<Awaited<ReturnType<typeof updateSeasonAction>>>('updateSeasonAction', args),

  deleteSeasonAction: (...args: Parameters<typeof deleteSeasonAction>) =>
    rpc<Awaited<ReturnType<typeof deleteSeasonAction>>>('deleteSeasonAction', args),

  registerAction: (...args: Parameters<typeof registerAction>) =>
    rpc<Awaited<ReturnType<typeof registerAction>>>('registerAction', args),

  listPendingUsersAction: () =>
    rpc<Awaited<ReturnType<typeof listPendingUsersAction>>>('listPendingUsersAction', []),

  approveUserAction: (...args: Parameters<typeof approveUserAction>) =>
    rpc<Awaited<ReturnType<typeof approveUserAction>>>('approveUserAction', args),

  rejectUserAction: (...args: Parameters<typeof rejectUserAction>) =>
    rpc<Awaited<ReturnType<typeof rejectUserAction>>>('rejectUserAction', args),

  bulkCreateUsersAction: (...args: Parameters<typeof bulkCreateUsersAction>) =>
    rpc<Awaited<ReturnType<typeof bulkCreateUsersAction>>>('bulkCreateUsersAction', args),
}
