'use client'

import { api } from '@/lib/api-client'
import { useEffect, useState, useTransition } from 'react'
import { ClipboardCheck, Plus, Loader2, Trash2, Shield, X, Users2, Save } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { useApp } from '@/lib/app-store'
import { getAvatar } from '@/lib/avatars'
import { DOMAINS, domainMeta } from '@/lib/domains'
import type { SessionUser } from '@/lib/auth'

export function ProcturedMocksView({ user }: { user: SessionUser }) {
  const { proctoredDomain } = useApp()
  const [mocks, setMocks] = useState<Awaited<ReturnType<typeof listProctoredMocksAction>> | null>(null)
  const [domainFilter, setDomainFilter] = useState<string>(proctoredDomain ?? 'all')
  const [open, setOpen] = useState(false)

  async function load() {
    const data = await api.listProctoredMocksAction({
      domainId: domainFilter === 'all' ? undefined : domainFilter,
    })
    setMocks(data)
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domainFilter])

  const isStaff = user.role === 'admin' || user.role === 'instructor'

  return (
    <div className="space-y-4">
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="py-4 flex items-start gap-3">
          <div className="size-9 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 grid place-items-center shrink-0">
            <Shield className="size-4" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Eligibility gate</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Proctored mocks are the only thing that decides team selection. They run in the real contest conditions — watched live, in the literal restricted environment. Practice diagnostics inform but never substitute.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Proctored mock results</CardTitle>
            <CardDescription>Recorded by instructors or domain captains. Visible to all — but notes are private to staff.</CardDescription>
          </div>
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4 mr-1" /> Enter result
          </Button>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Select value={domainFilter} onValueChange={setDomainFilter}>
              <SelectTrigger className="w-full sm:w-64"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All domains</SelectItem>
                {DOMAINS.map(d => <SelectItem key={d.key} value={d.key}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {mocks === null ? (
            <div className="flex justify-center py-8"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
          ) : mocks.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No proctored mocks recorded yet.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Domain</TableHead>
                    <TableHead>Partner</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Entered by</TableHead>
                    {isStaff && <TableHead className="w-10"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mocks.map((m) => {
                    const meta = domainMeta(m.domain.key)
                    const Icon = meta.icon
                    const avatar = getAvatar(m.user.avatarId)
                    return (
                      <TableRow key={m.id}>
                        <TableCell>
                          <div className="size-8 rounded-md grid place-items-center" style={{ background: `${meta.color}20`, color: meta.color }}>
                            <Icon className="size-4" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="size-7 border"><AvatarFallback style={{ background: avatar.color, color: 'white' }} className="text-xs">{avatar.glyph}</AvatarFallback></Avatar>
                            <span className="text-sm font-medium">{m.user.nickname}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{m.domain.name}</TableCell>
                        <TableCell className="text-sm">
                          {m.pairPartnerId && m.partner ? m.partner.nickname : <span className="text-muted-foreground italic">solo</span>}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums font-medium">{m.score}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{new Date(m.eventDate).toLocaleDateString()}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{m.enteredBy.nickname}</TableCell>
                        {isStaff && (
                          <TableCell>
                            <Button
                              variant="ghost" size="icon"
                              onClick={async () => {
                                if (!confirm('Delete this proctored mock result?')) return
                                const r = await api.deleteProctoredMockAction(m.id)
                                if (r.ok) { toast.success('Deleted.'); void load() } else toast.error(r.error)
                              }}
                            >
                              <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <EntryDialog open={open} onOpenChange={setOpen} onSaved={() => { setOpen(false); void load() }} />
    </div>
  )
}

function EntryDialog({ open, onOpenChange, onSaved }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSaved: () => void
}) {
  const [students, setStudents] = useState<Awaited<ReturnType<typeof listUsersAction>>>([])
  const [domainId, setDomainId] = useState('')
  const [userId, setUserId] = useState('')
  const [partnerId, setPartnerId] = useState('none')
  const [score, setScore] = useState('')
  const [eventDate, setEventDate] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (open) {
      void (async () => {
        const us = await api.listUsersAction()
        setStudents(us.filter(u => u.role === 'student'))
      })()
    }
  }, [open])

  function submit() {
    startTransition(async () => {
      if (!domainId || !userId || !score) { toast.error('Fill in domain, student, and score.'); return }
      const r = await api.createProctoredMockAction({
        domainId,
        userId,
        pairPartnerId: partnerId === 'none' ? null : partnerId,
        score: Number(score),
        eventDate,
        notes: notes.trim() || undefined,
      })
      if (r.ok) {
        toast.success('Proctored mock recorded.')
        setScore(''); setNotes(''); setUserId(''); setPartnerId('none')
        onSaved()
      } else {
        toast.error(r.error)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Enter proctored mock result</DialogTitle>
          <DialogDescription>
            Recorded as the eligibility gate. Only instructors or domain captains can enter. Pair-based contests (Java, Quiz Bee) record both partners.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Domain</Label>
              <Select value={domainId} onValueChange={setDomainId}>
                <SelectTrigger><SelectValue placeholder="Pick a domain" /></SelectTrigger>
                <SelectContent>
                  {DOMAINS.map(d => <SelectItem key={d.key} value={d.key}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Event date</Label>
              <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
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
              <Label>Pair partner (optional)</Label>
              <Select value={partnerId} onValueChange={setPartnerId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No partner (solo)</SelectItem>
                  {students.filter(s => s.id !== userId).map(s => {
                    const a = getAvatar(s.avatarId)
                    return <SelectItem key={s.id} value={s.id}>{a.glyph} {s.nickname}</SelectItem>
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="score">Score</Label>
            <Input id="score" type="number" value={score} onChange={(e) => setScore(e.target.value)} placeholder="e.g. 50" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes (staff only)</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
              placeholder="e.g. Clean solve on easy + average. Bitmask problem stumped them." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Save className="size-4 mr-1.5" />} Save result
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

void X
void Users2
void ClipboardCheck
