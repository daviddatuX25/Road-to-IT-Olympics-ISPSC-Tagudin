'use client'

import { create } from 'zustand'

export type ViewKey =
  | 'dashboard'
  | 'milestones'
  | 'leaderboard'
  | 'proctored'
  | 'team'
  | 'admin-users'
  | 'admin-milestones'
  | 'profile'

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

  // Bump on every action that mutates data, so views can refetch
  refreshTick: number
  bump: () => void
}

export const useApp = create<AppState>((set) => ({
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

  refreshTick: 0,
  bump: () => set((s) => ({ refreshTick: s.refreshTick + 1 })),
}))
