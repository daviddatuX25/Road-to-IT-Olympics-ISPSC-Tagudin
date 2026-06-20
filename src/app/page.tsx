'use client'

import { useEffect, useState, useTransition } from 'react'
import { Login } from '@/components/app/login'
import { AppShell } from '@/components/app/app-shell'
import { api } from '@/lib/api-client'
import type { SessionUser } from '@/lib/auth'
import { Loader2 } from 'lucide-react'

export default function Home() {
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined)
  const [, startTransition] = useTransition()

  useEffect(() => {
    startTransition(async () => {
      try {
        const u = await api.getCurrentUser()
        setUser(u)
      } catch {
        setUser(null)
      }
    })
  }, [startTransition])

  if (user === undefined) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-3 text-sm text-muted-foreground">Loading Road to IT Olympics…</p>
      </div>
    )
  }

  if (user === null) {
    return <Login onLogin={() => setUser(undefined)} />
  }

  return (
    <AppShell
      user={user}
      onLogout={async () => {
        await api.logoutAction()
        setUser(null)
      }}
    />
  )
}
