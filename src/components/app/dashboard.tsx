'use client'

import { api, LeaderboardEntry } from '@/lib/api-client'
import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import {
  Flame, Calendar, CheckCircle2, Trophy, ArrowRight, Sparkles, ListChecks,
  ClipboardCheck, Users, Activity, Loader2,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { useApp } from '@/lib/app-store'
import { getAvatar } from '@/lib/avatars'
import { getDomainIcon, phaseLabel } from '@/lib/domains'
import type { SessionUser } from '@/lib/auth'
import { formatDistanceToNow } from 'date-fns'
import { manilaWeekKey } from '@/lib/timezone'

export function Dashboard({ user }: { user: SessionUser }) {
  if (user.role === 'student') return <StudentDashboard user={user} />
  if (user.role === 'instructor') return <InstructorDashboard user={user} />
  return <AdminDashboard user={user} />
}

// -----------------------------------------------------------------------------
// Student dashboard
// -----------------------------------------------------------------------------

function StudentDashboard({ user }: { user: SessionUser }) {
  const { setView, setMilestoneFilter, selectMilestone } = useApp()
  const [data, setData] = useState<Awaited<ReturnType<typeof api.getStudentDashboardDataAction>> | null>(null)
  const [, startTransition] = useTransition()

  useEffect(() => {
    startTransition(async () => {
      const d = await api.getStudentDashboardDataAction()
      setData(d)
    })
  }, [startTransition])

  if (!data) return <Loading />

  const bestStreak = Math.max(0, ...data.streakBreakdown.map(b => b.streak))
  const weeksCompleted = data.mySubmissions.length > 0
    ? new Set(data.mySubmissions.map(s => manilaWeekKey(new Date(s.clientSubmissionTimestamp as unknown as string).getTime()))).size
    : 0
  const thisWeekDomains = data.streakBreakdown.filter(b => b.thisWeekSubmitted).length

  return (
    <div className="space-y-6">
      {/* Spotlight */}
      {data.spotlight && (
        <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card">
          <CardContent className="py-5 flex items-start gap-4">
            <div className="size-10 rounded-full bg-primary/15 text-primary grid place-items-center shrink-0">
              <Sparkles className="size-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs uppercase tracking-wider font-medium text-primary">Weekly Spotlight</p>
                <Badge variant="outline" className="capitalize text-[10px]">{data.spotlight.reason}</Badge>
              </div>
              <p className="text-sm">{data.spotlight.blurb}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Greeting + streaks */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Best streak</p>
              <Flame className="size-4 text-orange-500" />
            </div>
            <div className="text-3xl font-semibold tracking-tight">{bestStreak}<span className="text-base text-muted-foreground ml-1">wk</span></div>
            <p className="text-xs text-muted-foreground mt-1">
              {bestStreak === 0 ? 'Submit something this week to start one.' : 'Keep it alive this week.'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Weeks completed</p>
              <CheckCircle2 className="size-4 text-emerald-500" />
            </div>
            <div className="text-3xl font-semibold tracking-tight">{weeksCompleted}</div>
            <p className="text-xs text-muted-foreground mt-1">Total across all {data.streakBreakdown.length} domains</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">This week</p>
              <Calendar className="size-4 text-primary" />
            </div>
            <div className="text-3xl font-semibold tracking-tight">{thisWeekDomains}<span className="text-base text-muted-foreground ml-1">/{data.streakBreakdown.length}</span></div>
            <p className="text-xs text-muted-foreground mt-1">Domains with a submission this week</p>
          </CardContent>
        </Card>
      </div>

      {/* Streak breakdown by domain */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Streaks by domain</CardTitle>
          <CardDescription>Each domain tracks its own streak. Missed weeks with active milestones break it — consistency is mastery.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.streakBreakdown.map((b) => {
            const Icon = getDomainIcon(b.domainIcon)
            return (
              <button
                key={b.domainId}
                onClick={() => { setMilestoneFilter(b.domainId, null); setView('milestones') }}
                className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors text-left"
              >
                <div className="size-9 rounded-md grid place-items-center shrink-0" style={{ background: `${b.domainColor}20`, color: b.domainColor }}>
                  <Icon className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium truncate">{b.domainName}</p>
                    {b.thisWeekSubmitted ? (
                      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0 hover:bg-emerald-500/20">
                        <CheckCircle2 className="size-3 mr-1" /> This week
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">No submission yet</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Flame className={`size-3 ${b.streak > 0 ? 'text-orange-500' : 'text-muted-foreground/40'}`} />
                    <span className="text-xs text-muted-foreground">{b.streak} week streak</span>
                  </div>
                </div>
              </button>
            )
          })}
        </CardContent>
      </Card>

      {/* Active milestones — quick action */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">This week&apos;s milestones</CardTitle>
            <CardDescription>Open one to copy its AI prompt into Claude, Gemini, or ChatGPT.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => setView('milestones')}>
            Browse all <ArrowRight className="size-3.5 ml-1" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.activeMilestones.length === 0 && (
            <p className="text-sm text-muted-foreground py-3">No active milestones right now.</p>
          )}
          {data.activeMilestones.slice(0, 4).map((m) => {
            const Icon = getDomainIcon(m.domain.icon)
            const color = m.domain.color || '#16a34a'
            const alreadySubmitted = data.mySubmissions.some(s => s.milestoneId === m.id)
            return (
              <button
                key={m.id}
                onClick={() => { selectMilestone(m.id); setView('milestones') }}
                className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors text-left"
              >
                <div className="size-9 rounded-md grid place-items-center shrink-0" style={{ background: `${color}20`, color }}>
                  <Icon className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.title}</p>
                  <p className="text-xs text-muted-foreground capitalize">{m.mode} · {m.difficulty} · {phaseLabel(m.weekOrPhase)}</p>
                </div>
                {alreadySubmitted && (
                  <Badge variant="outline" className="text-emerald-600 border-emerald-600/30">
                    <CheckCircle2 className="size-3 mr-1" /> Submitted
                  </Badge>
                )}
              </button>
            )
          })}
        </CardContent>
      </Card>

      {/* My recent submissions + my mock results */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent submissions</CardTitle>
            <CardDescription>Private diagnostics — only you, your captain, and instructors see scores.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 max-h-72 overflow-y-auto">
            {data.mySubmissions.length === 0 && (
              <p className="text-sm text-muted-foreground py-3">No submissions yet. Pick a milestone to start.</p>
            )}
            {data.mySubmissions.map((s) => {
              const Icon = getDomainIcon(s.milestone.domain.icon)
              const color = s.milestone.domain.color || '#16a34a'
              return (
                <button
                  key={s.id}
                  onClick={() => { selectMilestone(s.milestoneId); setView('milestones') }}
                  className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-accent/50 transition-colors text-left"
                >
                  <div className="size-8 rounded-md grid place-items-center shrink-0" style={{ background: `${color}20`, color }}>
                    <Icon className="size-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{s.milestone.title}</p>
                    <p className="text-[11px] text-muted-foreground">{formatDistanceToNow(new Date(s.clientSubmissionTimestamp), { addSuffix: true })}</p>
                  </div>
                  {s.aiScore !== null && (
                    <span className="text-xs font-mono tabular-nums text-muted-foreground">{s.aiScore}</span>
                  )}
                </button>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Proctored mock results</CardTitle>
            <CardDescription>The only thing that decides team selection.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 max-h-72 overflow-y-auto">
            {data.myMocks.length === 0 && (
              <p className="text-sm text-muted-foreground py-3">No proctored mocks yet. First scrimmage is in August.</p>
            )}
            {data.myMocks.map((m) => {
              const Icon = getDomainIcon(m.domain.icon)
              const color = m.domain.color || '#16a34a'
              return (
                <div key={m.id} className="flex items-center gap-3 p-2 rounded-md border">
                  <div className="size-8 rounded-md grid place-items-center shrink-0" style={{ background: `${color}20`, color }}>
                    <Icon className="size-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{m.domain.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(m.eventDate).toLocaleDateString()} {m.partner && `· with ${m.partner.nickname}`}
                    </p>
                  </div>
                  <span className="text-sm font-mono tabular-nums font-medium">{m.score}</span>
                </div>
              )
            })}
            {data.myTeamSelections.length > 0 && (
              <div className="mt-3 pt-3 border-t space-y-2">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Team selections</p>
                {data.myTeamSelections.map((ts) => (
                  <div key={ts.id} className="flex items-center justify-between text-sm">
                    <span>{ts.domain.name}</span>
                    <Badge className="bg-primary/15 text-primary border-0 hover:bg-primary/20">Selected</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Instructor dashboard
// -----------------------------------------------------------------------------

function InstructorDashboard({ user }: { user: SessionUser }) {
  const { setView } = useApp()
  const [data, setData] = useState<Awaited<ReturnType<typeof api.getInstructorDashboardDataAction>> | null>(null)
  const [events, setEvents] = useState<Awaited<ReturnType<typeof api.listAppEventsAction>> | null>(null)

  useEffect(() => {
    ;(async () => {
      const [d, e] = await Promise.all([
        api.getInstructorDashboardDataAction(),
        api.listAppEventsAction(15),
      ])
      setData(d)
      setEvents(e)
    })()
  }, [])

  if (!data || !events) return <Loading />

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Welcome back, {user.nickname}</h2>
        <p className="text-sm text-muted-foreground">You can author milestones across all {data.counts.domains} active domains and watch student progress.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        <StatCard icon={ListChecks}    label="Milestones"        value={data.counts.milestones} />
        <StatCard icon={Activity}      label="Submissions"       value={data.counts.submissions} />
        <StatCard icon={ClipboardCheck} label="Proctored mocks"  value={data.counts.mocks} />
        <StatCard icon={Users}         label="Team selections"   value={data.counts.selections} />
        <StatCard icon={Trophy}        label="Students"          value={data.counts.students} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick actions</CardTitle>
            <CardDescription>Things you do most often.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" onClick={() => setView('admin-milestones')}>
              <ListChecks className="size-4 mr-2" /> Author a new milestone
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => setView('proctored')}>
              <ClipboardCheck className="size-4 mr-2" /> Enter proctored mock scores
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => setView('team')}>
              <Users className="size-4 mr-2" /> Finalize a team pair
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => setView('leaderboard')}>
              <Trophy className="size-4 mr-2" /> See the leaderboard
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent activity</CardTitle>
            <CardDescription>What&apos;s happened across the platform.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 max-h-72 overflow-y-auto">
            {events.map((e) => (
              <div key={e.id} className="flex items-start gap-3 py-1.5 border-b last:border-0">
                <div className="size-2 rounded-full bg-primary mt-2 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{e.title}</p>
                  {e.detail && <p className="text-xs text-muted-foreground">{e.detail}</p>}
                  <p className="text-[10px] text-muted-foreground mt-0.5">{formatDistanceToNow(new Date(e.createdAt), { addSuffix: true })}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Admin dashboard
// -----------------------------------------------------------------------------

function AdminDashboard({ user }: { user: SessionUser }) {
  const { setView } = useApp()
  const [data, setData] = useState<Awaited<ReturnType<typeof api.getAdminDashboardDataAction>> | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[] | null>(null)

  useEffect(() => {
    ;(async () => {
      const [d, lb] = await Promise.all([
        api.getAdminDashboardDataAction(),
        api.getLeaderboardAction(),
      ])
      setData(d)
      setLeaderboard(lb)
    })()
  }, [])

  if (!data || !leaderboard) return <Loading />

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Welcome back, {user.nickname}</h2>
        <p className="text-sm text-muted-foreground">Full system overview. You have admin rights — provision accounts, assign captains, watch the season take shape.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
        <StatCard icon={Users}          label="Users"             value={data.counts.users} />
        <StatCard icon={ListChecks}     label="Milestones"        value={data.counts.milestones} />
        <StatCard icon={Activity}       label="Submissions"       value={data.counts.submissions} />
        <StatCard icon={ClipboardCheck} label="Proctored mocks"   value={data.counts.mocks} />
        <StatCard icon={Users}          label="Team selections"   value={data.counts.selections} />
        <StatCard icon={Trophy}         label="Captains"          value={data.counts.captains} />
        <StatCard icon={ListChecks}     label="Domains"           value={data.counts.domains} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Leaderboard snapshot</CardTitle>
              <CardDescription>Top 5 by best streak</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setView('leaderboard')}>Full board</Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {leaderboard.slice(0, 5).map((entry, idx) => {
              const avatar = getAvatar(entry.avatarId)
              return (
                <div key={entry.userId} className="flex items-center gap-3 py-1.5">
                  <span className="text-xs font-mono w-5 text-muted-foreground">{idx + 1}</span>
                  <Avatar className="size-8 border">
                    <AvatarFallback style={{ background: avatar.color, color: 'white' }} className="text-sm">{avatar.glyph}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{entry.nickname}</p>
                    <p className="text-[11px] text-muted-foreground">{entry.weeksCompleted} weeks · {entry.isCaptain ? 'captain' : 'member'}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-orange-500">
                    <Flame className="size-3.5" />
                    <span className="text-sm font-mono tabular-nums">{entry.bestStreak}</span>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Recent activity</CardTitle>
              <CardDescription>System-wide events feed</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setView('admin-users')}>Manage users</Button>
          </CardHeader>
          <CardContent className="space-y-2 max-h-72 overflow-y-auto">
            {data.events.map((e) => (
              <div key={e.id} className="flex items-start gap-3 py-1.5 border-b last:border-0">
                <div className="size-2 rounded-full bg-primary mt-2 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{e.title}</p>
                  {e.detail && <p className="text-xs text-muted-foreground">{e.detail}</p>}
                  <p className="text-[10px] text-muted-foreground mt-0.5">{formatDistanceToNow(new Date(e.createdAt), { addSuffix: true })}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Shared bits
// -----------------------------------------------------------------------------

function Loading() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  )
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Flame; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
          <Icon className="size-3.5 text-muted-foreground" />
        </div>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  )
}

void Link
void Progress
