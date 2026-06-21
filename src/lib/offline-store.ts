'use client'

import { create } from 'zustand'

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'partial'

type OfflineState = {
  isOnline: boolean
  pendingCount: number
  lastSyncedAt: number | null
  syncStatus: SyncStatus
  syncError: string | null

  setOnline: (v: boolean) => void
  setPendingCount: (n: number) => void
  incrementPending: () => void
  decrementPending: () => void
  setSyncStatus: (s: SyncStatus) => void
  setSyncError: (e: string | null) => void
  setLastSyncedAt: (t: number | null) => void
}

export const useOfflineStore = create<OfflineState>((set) => ({
  isOnline: true,
  pendingCount: 0,
  lastSyncedAt: null,
  syncStatus: 'idle',
  syncError: null,

  setOnline: (v) => set({ isOnline: v }),
  setPendingCount: (n) => set({ pendingCount: n }),
  incrementPending: () => set((s) => ({ pendingCount: s.pendingCount + 1 })),
  decrementPending: () => set((s) => ({ pendingCount: Math.max(0, s.pendingCount - 1) })),
  setSyncStatus: (s) => set({ syncStatus: s }),
  setSyncError: (e) => set({ syncError: e }),
  setLastSyncedAt: (t) => set({ lastSyncedAt: t }),
}))
