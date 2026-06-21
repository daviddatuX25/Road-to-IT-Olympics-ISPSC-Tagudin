'use client'

import { useOfflineStore } from '@/lib/offline-store'
import { motion, AnimatePresence } from 'framer-motion'
import { WifiOff, RefreshCw, AlertTriangle, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'

export function OfflineBanner() {
  const { isOnline, pendingCount, lastSyncedAt, syncStatus } = useOfflineStore()
  const [timeAgo, setTimeAgo] = useState<string>('')

  useEffect(() => {
    if (isOnline || !lastSyncedAt) {
      setTimeAgo('')
      return
    }

    const updateTime = () => {
      const diffSec = Math.round((Date.now() - lastSyncedAt) / 1000)
      if (diffSec < 60) {
        setTimeAgo('just now')
      } else if (diffSec < 3600) {
        const min = Math.floor(diffSec / 60)
        setTimeAgo(`${min}m ago`)
      } else {
        const hr = Math.floor(diffSec / 3600)
        setTimeAgo(`${hr}h ago`)
      }
    }

    updateTime()
    const interval = setInterval(updateTime, 10000)
    return () => clearInterval(interval)
  }, [isOnline, lastSyncedAt])

  let show = false
  let bgClass = ''
  let textClass = ''
  let icon: React.ReactNode = null
  let message = ''
  let subMessage = ''

  if (!isOnline) {
    show = true
    bgClass = 'bg-gradient-to-r from-amber-600/90 to-amber-700/90 border-amber-500/30'
    textClass = 'text-amber-50'
    icon = <WifiOff className="size-4 animate-bounce" />
    message = "You're offline"
    subMessage = pendingCount > 0 
      ? `Viewing cached data. ${pendingCount} action${pendingCount > 1 ? 's' : ''} queued.` 
      : 'Viewing cached data.'
    if (timeAgo) {
      subMessage += ` (Synced ${timeAgo})`
    }
  } else if (syncStatus === 'syncing') {
    show = true
    bgClass = 'bg-gradient-to-r from-violet-600/90 to-indigo-600/90 border-indigo-500/30'
    textClass = 'text-violet-50'
    icon = <RefreshCw className="size-4 animate-spin" />
    message = 'Reconnected'
    subMessage = `Syncing ${pendingCount} queued action${pendingCount > 1 ? 's' : ''}...`
  } else if (syncStatus === 'partial') {
    show = true
    bgClass = 'bg-gradient-to-r from-amber-500/90 to-orange-500/90 border-amber-400/30'
    textClass = 'text-amber-950'
    icon = <AlertTriangle className="size-4" />
    message = 'Sync issue'
    subMessage = 'Some actions failed to sync. Please verify.'
  } else if (syncStatus === 'error') {
    show = true
    bgClass = 'bg-gradient-to-r from-red-600/90 to-rose-700/90 border-red-500/30'
    textClass = 'text-red-50'
    icon = <XCircle className="size-4" />
    message = 'Sync failed'
    subMessage = 'Session expired. Please log in again.'
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ height: 0, opacity: 0, y: -20 }}
          animate={{ height: 'auto', opacity: 1, y: 0 }}
          exit={{ height: 0, opacity: 0, y: -20 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="overflow-hidden w-full sticky top-0 z-50 border-b backdrop-blur-sm"
        >
          <div className={`${bgClass} px-4 py-2 flex items-center justify-between text-xs sm:text-sm font-medium ${textClass}`}>
            <div className="flex items-center gap-2 max-w-[90%] truncate">
              {icon}
              <span className="font-bold">{message}:</span>
              <span className="opacity-90 font-light truncate">{subMessage}</span>
            </div>
            {timeAgo && !isOnline && (
              <div className="text-[10px] uppercase tracking-wider opacity-60 hidden sm:block">
                Cached Mode
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
