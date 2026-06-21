'use client'

import { useEffect, useState } from 'react'
import {
  LayoutDashboard, ListChecks, Trophy, ClipboardCheck, Users,
  UserCog, FileText, UserCircle, LogOut, Menu, X, Loader2, Sparkles, HelpCircle, Crown,
  Sliders, CalendarRange,
} from 'lucide-react'
// (Trophy is used for the sidebar brand icon — kept in the main lucide import above.)
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { useApp, type ViewKey } from '@/lib/app-store'
import { getAvatar } from '@/lib/avatars'
import type { SessionUser } from '@/lib/auth'
import { api } from '@/lib/api-client'
import { Dashboard } from './dashboard'
import { MilestonesView } from './milestones-view'
import { LeaderboardView } from './leaderboard-view'
import { ProcturedMocksView } from './proctored-mocks-view'
import { TeamSelectionView } from './team-selection-view'
import { UsersAdmin } from './users-admin'
import { DomainsAdmin } from './domains-admin'
import { PromptsAdmin } from './prompts-admin'
import { SeasonsAdmin } from './seasons-admin'
import { AdminMilestones } from './admin-milestones'
import { ProfileSettings } from './profile-settings'
import { LeadingCandidates } from './leading-candidates'
import { HelpView } from './help-view'
import { cn } from '@/lib/utils'

type NavItem = {
  key: ViewKey
  label: string
  icon: typeof LayoutDashboard
  roles: Array<SessionUser['role']>
  group: 'main' | 'staff'
}

const NAV: NavItem[] = [
  { key: 'dashboard',         label: 'Dashboard',          icon: LayoutDashboard, roles: ['admin', 'instructor', 'student'], group: 'main' },
  { key: 'milestones',        label: 'Milestones',         icon: ListChecks,      roles: ['admin', 'instructor', 'student'], group: 'main' },
  { key: 'leaderboard',       label: 'Leaderboard',        icon: Trophy,          roles: ['admin', 'instructor', 'student'], group: 'main' },
  { key: 'proctored',         label: 'Proctored Mocks',    icon: ClipboardCheck,  roles: ['admin', 'instructor', 'student'], group: 'main' },
  { key: 'team',              label: 'Team Selection',     icon: Users,           roles: ['admin', 'instructor', 'student'], group: 'main' },
  { key: 'help',              label: 'Tutorial & Help',    icon: HelpCircle,      roles: ['admin', 'instructor', 'student'], group: 'main' },
  { key: 'leading',           label: 'Leading Candidates', icon: Sparkles,        roles: ['admin', 'instructor', 'student'], group: 'staff' },
  { key: 'admin-milestones',  label: 'Author Milestones',  icon: FileText,        roles: ['admin', 'instructor', 'student'], group: 'staff' },
  { key: 'admin-prompts',     label: 'Prompt Templates',   icon: Sliders,         roles: ['admin', 'instructor'],           group: 'staff' },
  { key: 'admin-seasons',     label: 'Manage Seasons',     icon: CalendarRange,   roles: ['admin'],                         group: 'staff' },
  { key: 'admin-users',       label: 'Manage Users',       icon: UserCog,         roles: ['admin'],                         group: 'staff' },
  { key: 'admin-domains',     label: 'Manage Domains',     icon: Crown,           roles: ['admin'],                         group: 'staff' },
  { key: 'profile',           label: 'Profile',            icon: UserCircle,      roles: ['admin', 'instructor', 'student'], group: 'staff' },
]

export function AppShell({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const { view, setView } = useApp()
  const { setDomains, setPhases, setActiveSeasonId } = useApp()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    async function bootstrap() {
      try {
        const [activeSeason, domains] = await Promise.all([
          api.getActiveSeasonAction(),
          api.listDomainsAction(),
        ])
        if (activeSeason) {
          setActiveSeasonId(activeSeason.id)
          setPhases(activeSeason.phases || [])
        }
        setDomains(domains)
      } catch (err) {
        console.error('Failed to bootstrap app data:', err)
      }
    }
    bootstrap()
  }, [setDomains, setPhases, setActiveSeasonId])

  // Close mobile sidebar when changing views (via setView wrapper, not effect)
  const handleSetView = (v: ViewKey) => {
    setView(v)
    setMobileOpen(false)
  }

  const visibleNav = NAV.filter(n => {
    if (n.group === 'staff') {
      if (user.role === 'admin' || user.role === 'instructor') {
        return n.roles.includes(user.role)
      }
      if (user.role === 'student') {
        const isCaptain = (user.captainOf?.length ?? 0) > 0
        if (!isCaptain) return false
        return (n.key === 'leading' || n.key === 'admin-milestones') && n.roles.includes('student')
      }
      return false
    }
    return n.roles.includes(user.role)
  })
  const mainNav = visibleNav.filter(n => n.group === 'main')
  const staffNav = visibleNav.filter(n => n.group === 'staff')
  const avatar = getAvatar(user.avatarId)

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex w-64 flex-col border-r bg-sidebar/60 backdrop-blur sticky top-0 h-screen">
        <SidebarContent
          user={user}
          mainNav={mainNav}
          staffNav={staffNav}
          view={view}
          setView={handleSetView}
          onLogout={async () => {
            setLoggingOut(true)
            await onLogout()
          }}
          loggingOut={loggingOut}
        />
      </aside>

      {/* Sidebar — mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 bg-sidebar border-r shadow-xl flex flex-col">
            <div className="flex justify-end p-2">
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
                <X className="size-5" />
              </Button>
            </div>
            <SidebarContent
              user={user}
              mainNav={mainNav}
              staffNav={staffNav}
              view={view}
              setView={handleSetView}
              onLogout={async () => {
                setLoggingOut(true)
                await onLogout()
              }}
              loggingOut={loggingOut}
            />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
          <div className="flex items-center justify-between px-4 h-14">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(true)}>
                <Menu className="size-5" />
              </Button>
              <h1 className="text-base font-semibold tracking-tight">
                {NAV.find(n => n.key === view)?.label ?? 'Dashboard'}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  Online · synced
                </span>
              </div>
              <button
                onClick={() => handleSetView('profile')}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <Avatar className="size-8 border">
                  <AvatarFallback style={{ background: avatar.color, color: 'white' }} className="text-base">
                    {avatar.glyph}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-medium leading-tight">{user.nickname}</div>
                  <div className="text-[10px] text-muted-foreground capitalize leading-tight">{user.role}</div>
                </div>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
          {view === 'dashboard'        && <Dashboard user={user} />}
          {view === 'milestones'       && <MilestonesView user={user} />}
          {view === 'leaderboard'      && <LeaderboardView currentUser={user} />}
          {view === 'proctored'        && <ProcturedMocksView user={user} />}
          {view === 'team'             && <TeamSelectionView user={user} />}
          {view === 'help'             && <HelpView />}
          {view === 'leading'          && (user.role === 'admin' || user.role === 'instructor' || (user.captainOf?.length ?? 0) > 0) && <LeadingCandidates user={user} />}
          {view === 'admin-users'      && user.role === 'admin' && <UsersAdmin />}
          {view === 'admin-domains'    && user.role === 'admin' && <DomainsAdmin />}
          {view === 'admin-prompts'    && (user.role === 'admin' || user.role === 'instructor') && <PromptsAdmin />}
          {view === 'admin-seasons'    && user.role === 'admin' && <SeasonsAdmin />}
          {view === 'admin-milestones' && (user.role === 'admin' || user.role === 'instructor' || (user.captainOf?.length ?? 0) > 0) && <AdminMilestones user={user} />}
          {view === 'profile'          && <ProfileSettings user={user} />}
        </main>

        <footer className="mt-auto border-t py-3 px-4 text-center text-xs text-muted-foreground">
          Road to IT Olympics · practice loop informs the gate, never substitutes for it
        </footer>
      </div>
    </div>
  )
}

function SidebarContent({
  user, mainNav, staffNav, view, setView, onLogout, loggingOut,
}: {
  user: SessionUser
  mainNav: NavItem[]
  staffNav: NavItem[]
  view: ViewKey
  setView: (v: ViewKey) => void
  onLogout: () => void
  loggingOut: boolean
}) {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Brand */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-2.5">
          <div className="size-9 rounded-lg bg-primary text-primary-foreground grid place-items-center shadow-sm">
            <Trophy className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight truncate">Road to IT Olympics</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">15th Skills Olympics</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-6">
        <div className="space-y-1">
          <p className="px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Practice</p>
          {mainNav.map((item) => {
            const Icon = item.icon
            const active = view === item.key
            return (
              <button
                key={item.key}
                onClick={() => setView(item.key)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
                  active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-sidebar-foreground hover:bg-sidebar-accent',
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            )
          })}
        </div>

        {staffNav.length > 0 && (
          <div className="space-y-1">
            <p className="px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {user.role === 'admin' ? 'Admin Tools' : user.role === 'instructor' ? 'Instructor Tools' : 'Captain Tools'}
            </p>
            {staffNav.map((item) => {
              const Icon = item.icon
              const active = view === item.key
              return (
                <button
                  key={item.key}
                  onClick={() => setView(item.key)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
                    active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-sidebar-foreground hover:bg-sidebar-accent',
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              )
            })}
          </div>
        )}
      </nav>

      {/* User footer */}
      <div className="p-3 border-t space-y-2">
        <div className="flex items-center gap-2 px-2">
          <Badge variant="outline" className="text-[10px] capitalize">{user.role}</Badge>
          {user.role === 'student' && (
            <span className="text-[10px] text-muted-foreground">Member since season start</span>
          )}
        </div>
        <Separator />
        <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-foreground" onClick={onLogout} disabled={loggingOut}>
          {loggingOut ? <Loader2 className="size-4 mr-2 animate-spin" /> : <LogOut className="size-4 mr-2" />}
          Sign out
        </Button>
      </div>
    </div>
  )
}
