'use client'

import { api } from '@/lib/api-client'
import { useEffect, useState, useTransition } from 'react'
import { Loader2, Plus, Trash2, Shield, UserCog, Save, X, Crown } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { getAvatar, AVATARS } from '@/lib/avatars'
import { DOMAINS, domainMeta, getDomainIcon } from '@/lib/domains'

export function UsersAdmin() {
  const [users, setUsers] = useState<Awaited<ReturnType<typeof api.listUsersAction>> | null>(null)
  const [domains, setDomains] = useState<Awaited<ReturnType<typeof api.listDomainsAction>> | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [captainOpen, setCaptainOpen] = useState<{ userId: string; nickname: string } | null>(null)

  async function load() {
    const [us, ds] = await Promise.all([api.listUsersAction(), api.listDomainsAction()])
    setUsers(us)
    setDomains(ds)
  }

  useEffect(() => { void load() }, [])

  if (!users || !domains) return <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <UserCog className="size-4" /> Users &amp; roles
            </CardTitle>
            <CardDescription>
              Admin-provisioned accounts. Three roles + per-domain captain join table (so one student can captain Java and just participate in Python).
            </CardDescription>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4 mr-1" /> New account
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Real name / Student ID</TableHead>
                  <TableHead>Captain of</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(u => {
                  const avatar = getAvatar(u.avatarId)
                  return (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="size-7 border"><AvatarFallback style={{ background: avatar.color, color: 'white' }} className="text-xs">{avatar.glyph}</AvatarFallback></Avatar>
                          <span className="text-sm font-medium">{u.nickname}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">{u.email}</TableCell>
                      <TableCell>
                        <Select
                          value={u.role}
                          onValueChange={async (v) => {
                            const r = await api.updateUserRoleAction(u.id, v as 'admin' | 'instructor' | 'student')
                            if (r.ok) { toast.success('Role updated.'); void load() } else toast.error(r.error)
                          }}
                        >
                          <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="instructor">Instructor</SelectItem>
                            <SelectItem value="student">Student</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {u.realName || '—'}{u.studentId && <span className="ml-2 font-mono">{u.studentId}</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 flex-wrap">
                          {u.captainOf.length === 0 ? (
                            <button onClick={() => setCaptainOpen({ userId: u.id, nickname: u.nickname })} className="text-xs text-muted-foreground hover:text-foreground">
                              + assign
                            </button>
                          ) : (
                            <>
                              {u.captainOf.map(c => {
                                const meta = domainMeta(c.domain.key)
                                const Icon = meta.icon
                                return (
                                  <Badge key={c.domainId} variant="outline" className="text-[10px] gap-1 pr-1">
                                    <Icon className="size-2.5" style={{ color: meta.color }} />
                                    {meta.shortName}
                                    <button
                                      onClick={async () => { await api.removeCaptainAction(u.id, c.domainId); void load() }}
                                      className="ml-0.5 hover:text-destructive"
                                    >
                                      <X className="size-2.5" />
                                    </button>
                                  </Badge>
                                )
                              })}
                              <button onClick={() => setCaptainOpen({ userId: u.id, nickname: u.nickname })} className="text-xs text-muted-foreground hover:text-foreground ml-1">+</button>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost" size="icon"
                          onClick={async () => {
                            if (!confirm(`Delete ${u.nickname}? This removes their submissions and history.`)) return
                            const r = await api.deleteUserAction(u.id)
                            if (r.ok) { toast.success('Deleted.'); void load() } else toast.error(r.error)
                          }}
                        >
                          <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} onSaved={() => { setCreateOpen(false); void load() }} />
      {captainOpen && (
        <CaptainDialog
          userId={captainOpen.userId}
          nickname={captainOpen.nickname}
          domains={domains}
          existing={users.find(u => u.id === captainOpen.userId)?.captainOf ?? []}
          onOpenChange={(v) => !v && setCaptainOpen(null)}
          onSaved={() => { setCaptainOpen(null); void load() }}
        />
      )}
    </div>
  )
}

function CreateUserDialog({ open, onOpenChange, onSaved }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSaved: () => void
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'admin' | 'instructor' | 'student'>('student')
  const [nickname, setNickname] = useState('')
  const [realName, setRealName] = useState('')
  const [studentId, setStudentId] = useState('')
  const [avatarId, setAvatarId] = useState('avatar-01')
  const [pending, startTransition] = useTransition()

  function submit() {
    startTransition(async () => {
      const r = await api.createUserAction({
        email, password, role, nickname, realName: realName || undefined,
        studentId: studentId || undefined, avatarId,
      })
      if (r.ok) {
        toast.success('Account created.')
        setEmail(''); setPassword(''); setNickname(''); setRealName(''); setStudentId('')
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
          <DialogTitle>Create account</DialogTitle>
          <DialogDescription>Admin-provisioned. Students can&apos;t self-register.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@school.edu" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Initial password</Label>
              <Input id="password" type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="min 6 chars" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="nickname">Nickname (public)</Label>
              <Input id="nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="lia.exe" />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as 'admin' | 'instructor' | 'student')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="instructor">Instructor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="realname">Real name (private)</Label>
              <Input id="realname" value={realName} onChange={(e) => setRealName(e.target.value)} placeholder="Alia Cruz" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="studentid">Student ID (private)</Label>
              <Input id="studentid" value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="2024-001" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Avatar</Label>
            <div className="grid grid-cols-6 gap-2">
              {AVATARS.map(a => (
                <button
                  key={a.id}
                  onClick={() => setAvatarId(a.id)}
                  className={`size-10 rounded-md grid place-items-center text-lg border-2 transition-all ${avatarId === a.id ? 'border-primary scale-105' : 'border-transparent'}`}
                  style={{ background: a.color, color: 'white' }}
                  title={a.label}
                >
                  {a.glyph}
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Save className="size-4 mr-1.5" />} Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CaptainDialog({ userId, nickname, domains, existing, onOpenChange, onSaved }: {
  userId: string
  nickname: string
  domains: Awaited<ReturnType<typeof api.listDomainsAction>>
  existing: { domainId: string }[]
  onOpenChange: (v: boolean) => void
  onSaved: () => void
}) {
  const [domainId, setDomainId] = useState('')
  const available = domains.filter(d => !existing.some(e => e.domainId === d.id))

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign captain: {nickname}</DialogTitle>
          <DialogDescription>
            Captains can author milestones and enter proctored mocks for their domain. They don&apos;t see private diagnostics from other domains.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {available.length === 0 ? (
            <p className="text-sm text-muted-foreground">Already a captain of all domains.</p>
          ) : (
            <div className="space-y-1.5">
              <Label>Domain</Label>
              <Select value={domainId} onValueChange={setDomainId}>
                <SelectTrigger><SelectValue placeholder="Pick a domain" /></SelectTrigger>
                <SelectContent>
                  {available.map(d => {
                    const meta = domainMeta(d.key)
                    const Icon = meta.icon
                    return <SelectItem key={d.id} value={d.id}><span className="inline-flex items-center gap-2"><Icon className="size-3.5" /> {d.name}</span></SelectItem>
                  })}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={!domainId}
            onClick={async () => {
              const r = await api.assignCaptainAction(userId, domainId)
              if (r.ok) { toast.success('Captain assigned.'); onSaved() } else toast.error(r.error)
            }}
          >
            <Crown className="size-4 mr-1.5" /> Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}



