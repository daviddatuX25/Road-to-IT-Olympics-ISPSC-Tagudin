'use client'

import { api } from '@/lib/api-client'
import { LeaderboardEntry } from '@/lib/api-client'
import { useEffect, useState, useTransition } from 'react'
import { Flame, Loader2, Sparkles, Crown, CheckCircle2, Trophy, Star } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { getAvatar } from '@/lib/avatars'
import { useApp } from '@/lib/app-store'
import { DOMAINS } from '@/lib/domains'
import type { SessionUser } from '@/lib/auth'
import { cn } from '@/lib/utils'

export function LeaderboardView({ currentUser }: { currentUser: SessionUser }) {
  const { setView } = useApp()
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null)
  const [spotlightOpen, setSpotlightOpen] = useState(false)
  const [, startTransition] = useTransition()

  async function load() {
    const data = await api.getLeaderboardAction()
    setEntries(data)
  }

  useEffect(() => {
    void load()
  }, [])

  const canSpotlight = currentUser.role === 'admin' || currentUser.role === 'instructor' || currentUser.role === 'student'

  if (!entries) {
    return <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
  }

  const topThree = entries.slice(0, 3)
  const rest = entries.slice(3)

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-gradient-to-br from-primary/8 via-card to-card">
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="size-4 text-primary" /> Leaderboard
            </CardTitle>
            <CardDescription>
              Built on streaks and completion only. AI scores never appear here — those stay private between you, your captain, and instructors.
            </CardDescription>
          </div>
          {canSpotlight && (
            <Button variant="outline" size="sm" onClick={() => setSpotlightOpen(true)}>
              <Sparkles className="size-3.5 mr-1" /> Set spotlight
            </Button>
          )}
        </CardHeader>
      </Card>

      {/* Top 3 podium */}
      {topThree.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          {topThree.map((entry, idx) => {
            const avatar = getAvatar(entry.avatarId)
            const rank = idx + 1
            const podiumStyle = rank === 1 ? 'border-amber-500/40 bg-amber-500/5' : rank === 2 ? 'border-slate-400/40 bg-slate-400/5' : 'border-orange-700/40 bg-orange-700/5'
            const crownColor = rank === 1 ? 'text-amber-500' : rank === 2 ? 'text-slate-400' : 'text-orange-700'
            return (
              <Card key={entry.userId} className={cn('relative overflow-hidden', podiumStyle)}>
                <CardContent className="pt-6 text-center">
                  <div className="flex justify-center mb-2">
                    {rank === 1 ? <Crown className={cn('size-6', crownColor)} /> : <Star className={cn('size-5', crownColor)} />}
                  </div>
                  <Avatar className="size-16 border-2 mx-auto mb-2" style={{ borderColor: avatar.color }}>
                    <AvatarFallback style={{ background: avatar.color, color: 'white' }} className="text-2xl">{avatar.glyph}</AvatarFallback>
                  </Avatar>
                  <p className="font-semibold truncate">{entry.nickname}</p>
                  <div className="flex items-center justify-center gap-1.5 mt-1 text-orange-500">
                    <Flame className="size-3.5" />
                    <span className="text-xl font-semibold tabular-nums">{entry.bestStreak}</span>
                    <span className="text-xs text-muted-foreground">wk streak</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{entry.weeksCompleted} weeks completed</p>
                  {entry.isCaptain && <Badge variant="outline" className="text-[10px] mt-2">Captain</Badge>}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Spotlight display (current week) */}
      {entries.find(e => e.spotlight) && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-4 flex items-start gap-3">
            <div className="size-9 rounded-full bg-primary/15 text-primary grid place-items-center shrink-0">
              <Sparkles className="size-4" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-primary font-medium">This week&apos;s spotlight</p>
              <p className="text-sm mt-0.5">{entries.find(e => e.spotlight)?.spotlight?.blurb}</p>
              <p className="text-xs text-muted-foreground mt-1">— {entries.find(e => e.spotlight)?.nickname}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rest of leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Full standings</CardTitle>
          <CardDescription>Sorted by best streak, then total weeks completed, then this-week activity.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {rest.length === 0 && topThree.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">No submissions yet this season.</p>
          )}
          {rest.map((entry, idx) => {
            const avatar = getAvatar(entry.avatarId)
            const rank = idx + 4
            const isMe = entry.userId === currentUser.id
            return (
              <div
                key={entry.userId}
                className={cn(
                  'flex items-center gap-3 p-2.5 rounded-md',
                  isMe ? 'bg-primary/10 border border-primary/30' : 'hover:bg-accent/50',
                )}
              >
                <span className="text-xs font-mono w-6 text-muted-foreground text-right">{rank}</span>
                <Avatar className="size-9 border">
                  <AvatarFallback style={{ background: avatar.color, color: 'white' }} className="text-sm">{avatar.glyph}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{entry.nickname}</p>
                    {isMe && <Badge variant="outline" className="text-[10px]">You</Badge>}
                    {entry.isCaptain && <Badge variant="outline" className="text-[10px]">Captain</Badge>}
                  </div>
                  <p className="text-[11px] text-muted-foreground">{entry.weeksCompleted} weeks completed</p>
                </div>
                <div className="flex items-center gap-3">
                  {entry.thisWeekSubmitted && (
                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0 hover:bg-emerald-500/20">
                      <CheckCircle2 className="size-3 mr-1" /> This week
                    </Badge>
                  )}
                  <div className="flex items-center gap-1 text-orange-500 min-w-14 justify-end">
                    <Flame className="size-3.5" />
                    <span className="text-sm font-mono tabular-nums">{entry.bestStreak}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <SpotlightDialog
        open={spotlightOpen}
        onOpenChange={setSpotlightOpen}
        onCreated={() => { setSpotlightOpen(false); void load() }}
        canSpotlight={canSpotlight}
      />

      <p className="text-center text-xs text-muted-foreground">
        Streak logic: a week counts if you submit to a domain with an active milestone. September maintenance weeks (no active milestones) don&apos;t break streaks. Timezone: Asia/Manila, Monday-Sunday.
      </p>
    </div>
  )
  void setView
}

function SpotlightDialog({ open, onOpenChange, onCreated, canSpotlight }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onCreated: () => void
  canSpotlight: boolean
}) {
  const [students, setStudents] = useState<Awaited<ReturnType<typeof listUsersAction>>>([])
  const [userId, setUserId] = useState<string>('')
  const [reason, setReason] = useState<'streak' | 'solve' | 'reflection'>('streak')
  const [blurb, setBlurb] = useState('')
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (open && canSpotlight) {
      void (async () => {
        const us = await api.listUsersAction()
        setStudents(us.filter(u => u.role === 'student'))
      })()
    }
  }, [open, canSpotlight])

  function submit() {
    startTransition(async () => {
      if (!userId) { toast.error('Pick a student.'); return }
      const r = await api.createSpotlightAction({ userId, reason, blurb })
      if (r.ok) {
        toast.success('Spotlight set.')
        setBlurb('')
        onCreated()
      } else {
        toast.error(r.error)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set this week&apos;s spotlight</DialogTitle>
          <DialogDescription>
            Featured on the leaderboard for the current week (Monday–Sunday, Asia/Manila). Replaces any existing spotlight.
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
                  return (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="inline-flex items-center gap-2">
                        <span>{a.glyph}</span>
                        <span>{s.nickname}</span>
                      </span>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Select value={reason} onValueChange={(v) => setReason(v as 'streak' | 'solve' | 'reflection')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="streak">Streak — kept it alive</SelectItem>
                <SelectItem value="solve">Solve — clean or clever solution</SelectItem>
                <SelectItem value="reflection">Reflection — sharp self-awareness</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="blurb">Blurb (visible to everyone)</Label>
            <Textarea id="blurb" value={blurb} onChange={(e) => setBlurb(e.target.value)} rows={3}
              placeholder="e.g. 4-week Java streak, kept it alive even on the week she was sick. Discipline over talent." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={pending}>
            {pending && <Loader2 className="size-4 mr-1.5 animate-spin" />} Set spotlight
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

void Input
void DOMAINS
