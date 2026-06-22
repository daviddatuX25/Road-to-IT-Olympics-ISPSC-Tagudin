'use client'

import { api } from '@/lib/api-client'
import { useEffect, useState } from 'react'
import type { SessionUser } from '@/lib/auth'
import { getAvatar } from '@/lib/avatars'
import { LeaderboardView } from './leaderboard-view'
import { HelpView } from './help-view'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Trophy, HelpCircle, LogOut, Hourglass, AlertTriangle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export function PendingShell({
  user,
  onLogout,
}: {
  user: SessionUser
  onLogout: () => Promise<void>
}) {
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'help'>('leaderboard')
  const [activeSeasonName, setActiveSeasonName] = useState<string>('')
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    api.getActiveSeasonAction()
      .then((season) => {
        if (season) {
          setActiveSeasonName(season.name)
        }
      })
      .catch((err) => {
        console.error('Failed to load active season details:', err)
      })
  }, [])

  const handleLogout = async () => {
    setLoggingOut(true)
    const loadingId = toast.loading('Signing you out…')
    try {
      await onLogout()
      toast.dismiss(loadingId)
      toast.success('Signed out. See you next time!')
    } catch (err: any) {
      console.error('Logout failed:', err)
      toast.dismiss(loadingId)
      toast.error('Sign-out failed. Please try again.')
    } finally {
      setLoggingOut(false)
    }
  }

  const avatar = getAvatar(user.avatarId)

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="flex items-center justify-between px-4 sm:px-6 h-14 max-w-7xl w-full mx-auto">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary text-primary-foreground grid place-items-center">
              <Trophy className="size-4.5" />
            </div>
            <div>
              <span className="text-sm font-semibold tracking-tight">Road to IT Olympics</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest block leading-none">
                {activeSeasonName || 'ISPSC Tagudin'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Avatar className="size-8 border">
                <AvatarFallback style={{ background: avatar.color, color: 'white' }} className="text-base">
                  {avatar.glyph}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-medium leading-tight">{user.nickname}</div>
                <div className="text-[10px] text-muted-foreground capitalize leading-tight">
                  {user.status === 'pending' ? 'Pending Approval' :
                   user.status === 'suspended' ? 'Suspended' :
                   user.status === 'archived' ? 'Archived' : 'Rejected'}
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              disabled={loggingOut}
              title="Sign out"
            >
              {loggingOut ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* Banner */}
        {user.status === 'rejected' ? (
          <div className="border border-destructive/20 rounded-xl p-4 sm:p-5 bg-destructive/5 text-destructive flex gap-3 items-start shadow-sm animate-in fade-in duration-300">
            <AlertTriangle className="size-5 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-semibold text-sm leading-none">Registration Not Approved</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your application to join the IT Olympics training portal was not approved. Please contact a domain instructor or system administrator if you believe this is in error.
              </p>
            </div>
          </div>
        ) : user.status === 'suspended' ? (
          <div className="border border-destructive/20 rounded-xl p-4 sm:p-5 bg-destructive/5 text-destructive flex gap-3 items-start shadow-sm animate-in fade-in duration-300">
            <AlertTriangle className="size-5 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-semibold text-sm leading-none">Account Suspended</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your account has been suspended by an administrator. You will not be able to perform training actions or access active materials. Please contact an instructor if you believe this is in error.
              </p>
            </div>
          </div>
        ) : user.status === 'archived' ? (
          <div className="border border-destructive/20 rounded-xl p-4 sm:p-5 bg-destructive/5 text-destructive flex gap-3 items-start shadow-sm animate-in fade-in duration-300">
            <AlertTriangle className="size-5 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-semibold text-sm leading-none">Account Archived</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your account has been archived. You will not be able to perform training actions or access active materials.
              </p>
            </div>
          </div>
        ) : (
          <div className="border border-violet-100 dark:border-violet-950/40 rounded-xl p-4 sm:p-5 bg-gradient-to-r from-violet-500/5 to-primary/5 text-primary flex gap-3 items-start shadow-sm animate-in fade-in duration-300">
            <Hourglass className="size-5 shrink-0 mt-0.5 text-primary animate-pulse" />
            <div className="space-y-1">
              <h4 className="font-semibold text-sm leading-none">Account Awaiting Admin Approval</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your application has been submitted and is currently in the queue. You can already explore the Leaderboard and Tutorial below to familiarize yourself with the rules. Once an instructor or administrator approves your account, all training actions (milestones, mocks, evaluations) will unlock automatically.
              </p>
            </div>
          </div>
        )}

        {/* Tab Selection */}
        <div className="flex gap-2 border-b pb-2">
          <Button
            variant={activeTab === 'leaderboard' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('leaderboard')}
            className="flex items-center gap-1.5"
          >
            <Trophy className="size-4" />
            Leaderboard
          </Button>
          <Button
            variant={activeTab === 'help' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('help')}
            className="flex items-center gap-1.5"
          >
            <HelpCircle className="size-4" />
            Tutorial & Help
          </Button>
        </div>

        {/* View render */}
        <div className="animate-in fade-in-50 duration-300">
          {activeTab === 'leaderboard' ? (
            <LeaderboardView currentUser={user} />
          ) : (
            <HelpView user={user} />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t py-3 px-4 text-center text-xs text-muted-foreground bg-muted/20">
        ISPSC Tagudin · {activeSeasonName || 'Road to IT Olympics'} · practice loop informs the proctor, never replaces it
      </footer>
    </div>
  )
}
