'use client'

import { api } from '@/lib/api-client'
import { LeaderboardEntry } from '@/lib/api-client'
import { useEffect, useState, useTransition, useMemo } from 'react'
import { Users, Loader2, Plus, X, Save, Shield, Crown, UserPlus, Trash2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { getAvatar } from '@/lib/avatars'
import { DOMAINS, domainMeta } from '@/lib/domains'
import type { SessionUser } from '@/lib/auth'
import { cn } from '@/lib/utils'

export function TeamSelectionView({ user }: { user: SessionUser }) {
  const [selections, setSelections] = useState<Awaited<ReturnType<typeof listTeamSelectionsAction>> | null>(null)
  const [activeDomain, setActiveDomain] = useState<string>(DOMAINS[0].key)
  const [open, setOpen] = useState(false)
  const [users, setUsers] = useState<Awaited<ReturnType<typeof listUsersAction>> | null>(null)

  async function load() {
    const [sels, us] = await Promise.all([
      api.listTeamSelectionsAction(),
      api.listUsersAction().catch(() => [])
    ])
    setSelections(sels)
    setUsers(us)
  }

  useEffect(() => { void load() }, [])

  if (!selections) return <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>

  const isStaff = user.role === 'admin' || user.role === 'instructor'
  const currentUserFromList = users?.find(u => u.id === user.id)
  const isCaptainOfDomain = (domainKey: string) => {
    return currentUserFromList?.captainOf?.some(c => c.domain.key === domainKey) || false
  }
  const isCaptain = (currentUserFromList?.captainOf?.length ?? 0) > 0

  return (
    <div className="space-y-4">
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-4 flex items-start gap-3">
          <div className="size-9 rounded-full bg-primary/15 text-primary grid place-items-center shrink-0">
            <Shield className="size-4" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Team selection — the eligibility gate, decided</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pair-based contests (Java, Quiz Bee) select two. Solo contests select one. Selections are based ONLY on proctored mock results — practice diagnostics inform but never substitute.
            </p>
          </div>
          {(isStaff || isCaptain) && (
            <Button onClick={() => setOpen(true)}>
              <UserPlus className="size-4 mr-1" /> Select member
            </Button>
          )}
        </CardContent>
      </Card>

      <Tabs value={activeDomain} onValueChange={setActiveDomain}>
        <TabsList className="w-full justify-start overflow-x-auto flex-wrap h-auto">
          {DOMAINS.map(d => (
            <TabsTrigger key={d.key} value={d.key} className="gap-1.5">
              <d.icon className="size-3.5" /> {d.shortName}
            </TabsTrigger>
          ))}
        </TabsList>

        {DOMAINS.map(d => {
          const domSelections = selections.filter(s => s.domain.key === d.key)
          return (
            <TabsContent key={d.key} value={d.key} className="space-y-3">
              <DomainTeamCard
                domainKey={d.key}
                domainName={d.name}
                pairBased={d.pairBased}
                selections={domSelections}
                isStaff={isStaff || isCaptainOfDomain(d.key)}
                currentUserId={user.id}
                onRemoved={async (domainId, uid) => {
                  try {
                    await api.removeTeamSelectionAction(domainId, uid)
                    toast.success('Selection removed.')
                    void load()
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : 'Could not remove selection.')
                  }
                }}
                onOpen={() => { setActiveDomain(d.key); setOpen(true) }}
              />
            </TabsContent>
          )
        })}
      </Tabs>

      <SelectMemberDialog
        open={open}
        onOpenChange={setOpen}
        domainKey={activeDomain}
        onSaved={() => { setOpen(false); void load() }}
      />
    </div>
  )
}

function DomainTeamCard({ domainKey, domainName, pairBased, selections, isStaff, currentUserId, onRemoved, onOpen }: {
  domainKey: string
  domainName: string
  pairBased: boolean
  selections: Awaited<ReturnType<typeof listTeamSelectionsAction>>
  isStaff: boolean
  currentUserId: string
  onRemoved: (domainId: string, userId: string) => void
  onOpen: () => void
}) {
  const meta = domainMeta(domainKey)
  const Icon = meta.icon
  const slotsFilled = selections.length
  const slotsNeeded = pairBased ? 2 : 1
  const [pendingRemove, setPendingRemove] = useState<typeof selections[number] | null>(null)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg grid place-items-center" style={{ background: `${meta.color}20`, color: meta.color }}>
              <Icon className="size-5" />
            </div>
            <div>
              <CardTitle className="text-base">{domainName}</CardTitle>
              <CardDescription>
                {pairBased ? 'Pair contest — 2 slots' : 'Solo contest — 1 slot'} · {meta.contestFormat}
              </CardDescription>
            </div>
          </div>
          <Badge variant={slotsFilled >= slotsNeeded ? 'default' : 'outline'} className="capitalize">
            {slotsFilled}/{slotsNeeded} selected
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {selections.length === 0 ? (
          <div className="py-8 text-center">
            <Users className="size-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No one selected yet.</p>
            {isStaff && (
              <Button className="mt-3" onClick={onOpen}>
                <Plus className="size-4 mr-1" /> Select first member
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              {selections.map((s) => {
                const avatar = getAvatar(s.user.avatarId)
                const isMe = s.userId === currentUserId
                return (
                  <div key={s.id} className={cn('flex items-center gap-3 p-3 rounded-md border', isMe && 'border-primary/40 bg-primary/5')}>
                    <Avatar className="size-10 border">
                      <AvatarFallback style={{ background: avatar.color, color: 'white' }} className="text-base">{avatar.glyph}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{s.user.nickname}</p>
                        {isMe && <Badge variant="outline" className="text-[10px]">You</Badge>}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Selected by {s.decidedBy.nickname}
                      </p>
                      {s.rationale && (
                        <p className="text-xs italic text-muted-foreground mt-1 line-clamp-2">&ldquo;{s.rationale}&rdquo;</p>
                      )}
                    </div>
                    {isStaff && (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove ${s.user.nickname} from ${domainName}`}
                        onClick={() => setPendingRemove(s)}
                      >
                        <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
                      </Button>
                    )}
                  </div>
                )
              })}
              {isStaff && selections.length < slotsNeeded && (
                <button
                  onClick={onOpen}
                  className="flex items-center justify-center gap-2 p-3 rounded-md border border-dashed hover:bg-accent/50 transition-colors text-sm text-muted-foreground"
                >
                  <Plus className="size-4" /> Add {slotsNeeded - selections.length} more
                </button>
              )}
            </div>

            {/* Proctored mock scores for context */}
            <MockContext domainKey={domainKey} />
          </div>
        )}
      </CardContent>

      {/* Confirm-before-remove dialog. Removal is the eligibility gate being
          reversed, so we don't let a stray click do it silently. */}
      <AlertDialog open={!!pendingRemove} onOpenChange={(o) => { if (!o) setPendingRemove(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove selection?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes <strong>{pendingRemove?.user.nickname}</strong> from the {domainName} team.
              The eligibility gate decision is reversed and the slot reopens. This is auditable.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingRemove) onRemoved(pendingRemove.domainId, pendingRemove.userId)
                setPendingRemove(null)
              }}
            >
              <Trash2 className="size-4 mr-1.5" /> Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

function MockContext({ domainKey }: { domainKey: string }) {
  const [mocks, setMocks] = useState<Awaited<ReturnType<typeof listProctoredMocksAction>> | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[] | null>(null)

  useEffect(() => {
    void (async () => {
      const domain = DOMAINS.find(d => d.key === domainKey)
      // Find the domain ID by listing users' mocks and matching by key
      const all = await api.listProctoredMocksAction()
      // We need the domain ID. We can fetch by listing all and filtering client-side by domain.key
      // But listProctoredMocksAction returns mocks with .domain populated. So:
      const matching = all.filter(m => m.domain.key === domainKey)
      setMocks(matching)
      setLeaderboard(await api.getLeaderboardAction())
    })()
  }, [domainKey])

  if (!mocks || !leaderboard) return null

  // Aggregate highest score per student
  const bestByStudent = new Map<string, { nickname: string; avatarId: string; best: number; count: number }>()
  for (const m of mocks) {
    const existing = bestByStudent.get(m.userId)
    if (existing) {
      existing.best = Math.max(existing.best, m.score)
      existing.count += 1
    } else {
      bestByStudent.set(m.userId, {
        nickname: m.user.nickname,
        avatarId: m.user.avatarId,
        best: m.score,
        count: 1,
      })
    }
  }
  const ranked = Array.from(bestByStudent.entries()).sort((a, b) => b[1].best - a[1].best)

  return (
    <div className="mt-3 pt-3 border-t">
      <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2 flex items-center gap-1.5">
        <Crown className="size-3" /> Mock scores + streaks (for context)
      </p>
      <div className="space-y-1">
        {ranked.length === 0 && <p className="text-xs text-muted-foreground">No proctored mocks recorded for this domain yet.</p>}
        {ranked.map(([userId, info], idx) => {
          const avatar = getAvatar(info.avatarId)
          const lb = leaderboard.find(e => e.userId === userId)
          return (
            <div key={userId} className="flex items-center gap-3 p-2 rounded-md hover:bg-accent/40">
              <span className="text-xs font-mono w-5 text-muted-foreground">{idx + 1}</span>
              <Avatar className="size-7 border"><AvatarFallback style={{ background: avatar.color, color: 'white' }} className="text-xs">{avatar.glyph}</AvatarFallback></Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{info.nickname}</p>
                <p className="text-[11px] text-muted-foreground">{info.count} mock{info.count === 1 ? '' : 's'} · best {info.best}</p>
              </div>
              {lb && (
                <Badge variant="outline" className="text-[10px] gap-1">
                  <span className="text-orange-500">●</span> {lb.bestStreak}wk
                </Badge>
              )}
              <span className="text-sm font-mono tabular-nums font-medium min-w-12 text-right">{info.best}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SelectMemberDialog({ open, onOpenChange, domainKey, onSaved }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  domainKey: string
  onSaved: () => void
}) {
  const [students, setStudents] = useState<Awaited<ReturnType<typeof listUsersAction>>>([])
  const [domainId, setDomainId] = useState('')
  const [userId, setUserId] = useState('')
  const [rationale, setRationale] = useState('')
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (!open) return
    void (async () => {
      try {
        const us = await api.listUsersAction()
        setStudents(us.filter(u => u.role === 'student'))
        // Look up the domain ID from the leaderboard / domains action
        // Actually we have DOMAINS metadata but not IDs — fetch from any list that returns domains
        // listUsersAction returns captainOf which includes domains, so use that:
        const captainWithDomain = us.flatMap(u => u.captainOf).find(c => c.domain.key === domainKey)
        if (captainWithDomain) setDomainId(captainWithDomain.domainId)
        else {
          // fallback: list domains via the existing actions
          const listDomainsAction = api.listDomainsAction
          const domains = await listDomainsAction()
          const d = domains.find(x => x.key === domainKey)
          if (d) setDomainId(d.id)
        }
      } catch {
        toast.error('Could not load students. You may not have permission.')
      }
    })()
  }, [open, domainKey])

  function submit() {
    startTransition(async () => {
      if (!userId) { toast.error('Pick a student.'); return }
      const r = await api.selectTeamMemberAction({ domainId, userId, rationale: rationale.trim() || undefined })
      if (r.ok) {
        toast.success('Selected.')
        setRationale(''); setUserId('')
        onSaved()
      } else {
        toast.error(r.error)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select a team member</DialogTitle>
          <DialogDescription>
            For {DOMAINS.find(d => d.key === domainKey)?.name ?? domainKey}. This is the eligibility gate — your decision is final and auditable.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Student</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger><SelectValue placeholder="Pick a student" /></SelectTrigger>
              <SelectContent>
                {students.map(s => {
                  const a = getAvatar(s.avatarId)
                  return <SelectItem key={s.id} value={s.id}>{a.glyph} {s.nickname}</SelectItem>
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rationale">Rationale (optional, recommended)</Label>
            <Textarea id="rationale" value={rationale} onChange={(e) => setRationale(e.target.value)} rows={3}
              placeholder="e.g. Highest scrimmage score + longest streak. Locking in early." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Save className="size-4 mr-1.5" />} Confirm selection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

void X
void useMemo
