'use client'

import { idb, type OutboxEntry } from './idb'

export type CacheConfig = {
  key: (args: any[]) => string
  ttlMs: number
  roles?: ('student' | 'instructor' | 'admin')[]
  bustOn?: string[]
}

export const CACHE_POLICY: Record<string, CacheConfig> = {
  listMilestoneMetaAction: {
    key: (args) => `milestones-list:${JSON.stringify(args[0] ?? {})}`,
    ttlMs: 60 * 60 * 1000,    // 1h
    bustOn: ['createMilestoneAction', 'versionMilestoneAction', 'archiveMilestoneAction', 'activateMilestoneAction'],
  },
  getMilestoneAction: {
    key: (args) => `milestone:${args[0] ?? ''}`,
    ttlMs: 24 * 60 * 60 * 1000, // 24h
    bustOn: ['versionMilestoneAction'],
  },
  listMySubmissionsAction: {
    key: () => 'my-submissions',
    ttlMs: 30 * 60 * 1000,     // 30 min
    bustOn: ['submitGuidedFormAction', 'submitJsonAction'],
  },
  getLeaderboardAction: {
    key: () => 'leaderboard',
    ttlMs: 30 * 60 * 1000,     // 30 min
  },
  getAssessmentLeadersAction: {
    key: () => 'assessment-leaders',
    ttlMs: 30 * 60 * 1000,     // 30 min
  },
  getStreakBreakdownAction: {
    key: () => 'streak-breakdown',
    ttlMs: 30 * 60 * 1000,     // 30 min
    bustOn: ['submitGuidedFormAction', 'submitJsonAction'],
  },
  getStudentDashboardDataAction: {
    key: () => 'student-dashboard',
    ttlMs: 30 * 60 * 1000,     // 30 min
    bustOn: ['submitGuidedFormAction', 'submitJsonAction'],
  },
  listDomainsAction: {
    key: () => 'domains',
    ttlMs: 24 * 60 * 60 * 1000, // 24h
  },
  getActiveSeasonAction: {
    key: () => 'active-season',
    ttlMs: 24 * 60 * 60 * 1000, // 24h
  },
  listProctoredMocksAction: {
    key: (args) => `proctored-mocks:${args[0] ?? 'all'}`,
    ttlMs: 60 * 60 * 1000,     // 1h
  },
  getCurrentUser: {
    key: () => 'current-user',
    ttlMs: 7 * 24 * 60 * 60 * 1000, // 7 days cache for offline session restore
  },
  listSystemPromptTemplatesAction: {
    key: () => 'prompt-templates',
    ttlMs: 24 * 60 * 60 * 1000, // 24h
  },

  // Staff-role cache
  getInstructorDashboardDataAction: {
    key: () => 'instructor-dashboard',
    ttlMs: 15 * 60 * 1000,
    roles: ['instructor', 'admin'],
  },
  getAdminDashboardDataAction: {
    key: () => 'admin-dashboard',
    ttlMs: 15 * 60 * 1000,
    roles: ['admin'],
  },
  listUsersAction: {
    key: () => 'users-list',
    ttlMs: 30 * 60 * 1000,
    roles: ['admin'],
  },
  listTeamSelectionsAction: {
    key: () => 'team-selections',
    ttlMs: 30 * 60 * 1000,
    roles: ['instructor', 'admin'],
  },
  listCandidateEvaluationsAction: {
    key: (args) => `candidate-evals:${args[0] ?? 'all'}`,
    ttlMs: 30 * 60 * 1000,
    roles: ['instructor', 'admin'], // Handled dynamically for domain captains
  },
  listDomainSubmissionsAction: {
    key: (args) => `domain-submissions:${args[0] ?? 'all'}`,
    ttlMs: 30 * 60 * 1000,
    roles: ['instructor', 'admin'], // Handled dynamically for domain captains
  }
}

export type OutboxConfig = {
  dedupKey: (args: any[]) => string
  onDuplicate: 'replace' | 'keep'
}

export const OUTBOX_POLICY: Record<string, OutboxConfig> = {
  submitGuidedFormAction: {
    dedupKey: (args) => `submit-guided-${args[0]?.milestoneId ?? 'unknown'}`,
    onDuplicate: 'keep',
  },
  submitJsonAction: {
    dedupKey: (args) => `submit-json-${args[0]?.milestoneId ?? 'unknown'}`,
    onDuplicate: 'keep',
  },
  updateProfileAction: {
    dedupKey: () => `profile-update`,
    onDuplicate: 'replace',
  },
  selectTeamMemberAction: {
    dedupKey: (args) => `team-select-${args[0]?.userId ?? 'unknown'}-${args[0]?.domainId ?? 'unknown'}`,
    onDuplicate: 'keep',
  },
  removeTeamSelectionAction: {
    dedupKey: (args) => `team-remove-${args[1] ?? 'unknown'}-${args[0] ?? 'unknown'}`,
    onDuplicate: 'keep',
  }
}

export function isCacheableForRole(action: string, user: { role: string; captainOf?: any[] } | null | undefined): boolean {
  const policy = CACHE_POLICY[action]
  if (!policy) return false
  if (!policy.roles) return true

  const role = user?.role || 'student'
  if (policy.roles.includes(role as any)) return true

  const isCaptain = (user?.captainOf?.length ?? 0) > 0
  if (isCaptain && (action === 'listCandidateEvaluationsAction' || action === 'listDomainSubmissionsAction')) {
    return true
  }

  return false
}

export function resolveOutboxConflict(
  newEntry: Omit<OutboxEntry, 'id'>,
  existing: OutboxEntry[]
): {
  type: 'push' | 'replace' | 'cancel'
  targetId?: number
} {
  if (newEntry.action === 'updateProfileAction') {
    const prev = existing.find(e => e.action === 'updateProfileAction')
    if (prev) {
      return { type: 'replace', targetId: prev.id }
    }
  }

  if (newEntry.action === 'selectTeamMemberAction') {
    const { userId, domainId } = newEntry.args[0] || {}
    const prevRemove = existing.find(
      e => e.action === 'removeTeamSelectionAction' &&
           e.args[0] === domainId &&
           e.args[1] === userId
    )
    if (prevRemove) {
      return { type: 'cancel', targetId: prevRemove.id }
    }
  }

  if (newEntry.action === 'removeTeamSelectionAction') {
    const domainId = newEntry.args[0]
    const userId = newEntry.args[1]
    const prevSelect = existing.find(
      e => e.action === 'selectTeamMemberAction' &&
           e.args[0]?.domainId === domainId &&
           e.args[0]?.userId === userId
    )
    if (prevSelect) {
      return { type: 'cancel', targetId: prevSelect.id }
    }
  }

  return { type: 'push' }
}

export async function bustRelatedCaches(action: string): Promise<void> {
  const keysToBust: string[] = []

  for (const [cacheAction, config] of Object.entries(CACHE_POLICY)) {
    if (config.bustOn?.includes(action)) {
      if (cacheAction === 'listMilestoneMetaAction') {
        keysToBust.push('milestones-list:')
      } else if (cacheAction === 'getMilestoneAction') {
        keysToBust.push('milestone:')
      } else if (cacheAction === 'listMySubmissionsAction') {
        keysToBust.push('my-submissions')
      } else if (cacheAction === 'getStreakBreakdownAction') {
        keysToBust.push('streak-breakdown')
      } else if (cacheAction === 'getStudentDashboardDataAction') {
        keysToBust.push('student-dashboard')
      }
    }
  }

  if (keysToBust.length === 0) return

  try {
    const allEntries = await idb.getAll<{ key: string } & any>('rpc-cache')
    for (const entry of allEntries) {
      if (keysToBust.some(k => entry.key.startsWith(k))) {
        await idb.del('rpc-cache', entry.key)
      }
    }
  } catch (e) {
    console.warn('[Cache Policy] Failed to bust caches:', e)
  }
}
