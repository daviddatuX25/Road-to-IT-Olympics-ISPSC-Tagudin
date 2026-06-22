'use client'

import { create } from 'zustand'
import type { Domain, SeasonPhase } from '@prisma/client'

export type ViewKey =
  | 'dashboard'
  | 'milestones'
  | 'leaderboard'
  | 'proctored'
  | 'team'
  | 'leading'
  | 'admin-users'
  | 'admin-milestones'
  | 'admin-domains'
  | 'admin-prompts'
  | 'admin-seasons'
  | 'profile'
  | 'help'

type AppState = {
  view: ViewKey
  setView: (v: ViewKey) => void

  // Optional context: pre-selected domain/week/milestone for the milestones view
  milestoneFilterDomain: string | null
  milestoneFilterWeek: string | null
  selectedMilestoneId: string | null
  setMilestoneFilter: (domain: string | null, week: string | null) => void
  selectMilestone: (id: string | null) => void

  // Optional context: pre-selected domain for proctored / team views
  proctoredDomain: string | null
  teamDomain: string | null
  setProctoredDomain: (d: string | null) => void
  setTeamDomain: (d: string | null) => void

  // Global season and domain metadata cache
  domains: Domain[]
  phases: SeasonPhase[]
  activeSeasonId: string | null
  paceMode: 'synchronous' | 'asynchronous'
  currentPhaseKey: string | null
  setDomains: (domains: Domain[]) => void
  setPhases: (phases: SeasonPhase[]) => void
  setActiveSeasonId: (id: string | null) => void
  setPaceMode: (mode: 'synchronous' | 'asynchronous') => void
  setCurrentPhaseKey: (key: string | null) => void
  getDomainByKey: (key: string) => Domain | undefined
  getPhaseByKey: (key: string) => SeasonPhase | undefined

  // Bump on every action that mutates data, so views can refetch
  refreshTick: number
  bump: () => void
}

export const useApp = create<AppState>((set, get) => ({
  view: 'dashboard',
  setView: (v) => set({ view: v }),

  milestoneFilterDomain: null,
  milestoneFilterWeek: null,
  selectedMilestoneId: null,
  setMilestoneFilter: (domain, week) => set({ milestoneFilterDomain: domain, milestoneFilterWeek: week }),
  selectMilestone: (id) => set({ selectedMilestoneId: id }),

  proctoredDomain: null,
  teamDomain: null,
  setProctoredDomain: (d) => set({ proctoredDomain: d }),
  setTeamDomain: (d) => set({ teamDomain: d }),

  domains: [],
  phases: [],
  activeSeasonId: null,
  paceMode: 'asynchronous',
  currentPhaseKey: null,
  setDomains: (domains) => set({ domains }),
  setPhases: (phases) => set({ phases }),
  setActiveSeasonId: (id) => set({ activeSeasonId: id }),
  setPaceMode: (mode) => set({ paceMode: mode }),
  setCurrentPhaseKey: (key) => set({ currentPhaseKey: key }),
  getDomainByKey: (key) => get().domains.find((d) => d.key === key),
  getPhaseByKey: (key) => get().phases.find((p) => p.key === key),

  refreshTick: 0,
  bump: () => set((s) => ({ refreshTick: s.refreshTick + 1 })),
}))
