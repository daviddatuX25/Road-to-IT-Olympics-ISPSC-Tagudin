'use client'

import { useEffect } from 'react'
import { useOfflineStore } from '@/lib/offline-store'
import { idb } from '@/lib/idb'
import { fetchRpc, friendlyName } from '@/lib/api-client'
import { bustRelatedCaches } from '@/lib/cache-policy'
import { useApp } from '@/lib/app-store'
import { toast } from 'sonner'

function isAuthError(err: any): boolean {
  const msg = String(err.message || '').toLowerCase()
  return msg.includes('unauthorized') || msg.includes('session expired') || msg.includes('not logged in') || msg.includes('auth')
}

export function useSync() {
  const { isOnline } = useOfflineStore()

  useEffect(() => {
    if (!isOnline) return

    const sync = async () => {
      const store = useOfflineStore.getState()
      if (store.syncStatus === 'syncing') return

      const count = await idb.countOutbox()
      if (count === 0) return

      store.setSyncStatus('syncing')
      let failed = 0

      while (true) {
        const op = await idb.peekOutbox()
        if (!op) break

        try {
          await fetchRpc(op.action, op.args)
          if (op.id !== undefined) {
            await idb.removeOutbox(op.id)
          }
          store.decrementPending()
          toast.success(`Synced: ${friendlyName(op.action)}`)

          // Bust related caches so fresh data is fetched next
          await bustRelatedCaches(op.action)
        } catch (err) {
          if (isAuthError(err)) {
            toast.error('Session expired. Log in again to sync your queued actions.')
            store.setSyncStatus('error')
            store.setSyncError('Session expired')
            return
          }

          if (op.retries < 3) {
            if (op.id !== undefined) {
              await idb.removeOutbox(op.id)
            }
            await idb.pushOutbox({ ...op, retries: op.retries + 1 })
            failed++
          } else {
            console.error(`[sync] Discarding after 3 retries:`, op)
            if (op.id !== undefined) {
              await idb.removeOutbox(op.id)
            }
            store.decrementPending()
            toast.warning(`Could not sync "${friendlyName(op.action)}" after 3 retries. Discarded.`)
            failed++
          }
        }
      }

      const now = Date.now()
      store.setLastSyncedAt(now)
      await idb.set('meta', 'lastSyncedAt', now)

      if (failed > 0) {
        store.setSyncStatus('partial')
      } else {
        store.setSyncStatus('idle')
        store.setSyncError(null)
      }

      // Trigger a global refresh so views re-fetch with fresh data
      useApp.getState().bump()
    }

    sync()
  }, [isOnline])
}
