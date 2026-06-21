'use client'

import { useEffect } from 'react'
import { useOfflineStore } from '@/lib/offline-store'
import { idb } from '@/lib/idb'

const HEARTBEAT_URL = '/api/health'
const HEARTBEAT_INTERVAL = 30_000     // 30s when online
const HEARTBEAT_RETRY    = 5_000      // 5s when offline

export function useConnectivity() {
  const { isOnline, setOnline, setPendingCount, setLastSyncedAt } = useOfflineStore()

  // Initialize store values from IndexedDB on startup
  useEffect(() => {
    async function initFromIDB() {
      try {
        const count = await idb.countOutbox()
        setPendingCount(count)

        const lastSyncedVal = await idb.get<number>('meta', 'lastSyncedAt')
        if (typeof lastSyncedVal === 'number') {
          setLastSyncedAt(lastSyncedVal)
        }
      } catch (e) {
        console.warn('[useConnectivity] Failed to init offline store from IDB:', e)
      }
    }
    initFromIDB()
  }, [setPendingCount, setLastSyncedAt])

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>

    const probe = async () => {
      try {
        const res = await fetch(HEARTBEAT_URL, {
          method: 'HEAD',
          cache: 'no-store',
          signal: AbortSignal.timeout(4000),
        })
        if (res.ok) {
          if (!isOnline) setOnline(true)
        } else {
          if (isOnline) setOnline(false)
        }
      } catch {
        if (isOnline) setOnline(false)
      }
    }

    const goOnline = () => probe()
    const goOffline = () => setOnline(false)

    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)

    probe()
    timer = setInterval(probe, isOnline ? HEARTBEAT_INTERVAL : HEARTBEAT_RETRY)

    return () => {
      clearInterval(timer)
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [isOnline, setOnline])
}
