'use client'

import { api } from '@/lib/api-client'
import { useEffect, useState, useTransition } from 'react'
import { Loader2, Plus, Trash2, Shield, UserCog, Save, X, Crown, AlertTriangle, CheckCircle2 } from 'lucide-react'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { getAvatar, AVATARS } from '@/lib/avatars'
import { DOMAINS, domainMeta, getDomainIcon } from '@/lib/domains'

export function UsersAdmin() {
  const [users, setUsers] = useState<Awaited<ReturnType<typeof api.listUsersAction>> | null>(null)
  const [domains, setDomains] = useState<Awaited<ReturnType<typeof api.listDomainsAction>> | null>(null)
  const [pendingUsers, setPendingUsers] = useState<Awaited<ReturnType<typeof api.listPendingUsersAction>> | null>(null)
  const [pendingCount, setPendingCount] = useState(0)
  const [createOpen, setCreateOpen] = useState(false)
  const [captainOpen, setCaptainOpen] = useState<{ userId: string; nickname: string } | null>(null)

  const [bulkJson, setBulkJson] = useState('')
  const [bulkPreview, setBulkPreview] = useState<any[] | null>(null)
  const [bulkErrors, setBulkErrors] = useState<string[]>([])
  const [bulkResult, setBulkResult] = useState<any | null>(null)
  const [bulkPending, startBulkTransition] = useTransition()
  const [pendingActionId, setPendingActionId] = useState<string | null>(null)
  
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])

  async function load() {
    const [us, ds, pendingList] = await Promise.all([
      api.listUsersAction(),
      api.listDomainsAction(),
      api.listPendingUsersAction(),
    ])
    setUsers(us)
    setDomains(ds)
    setPendingUsers(pendingList)
    setPendingCount(pendingList.length)
    setSelectedUserIds([]) // Clear selections on reload
  }

  useEffect(() => { void load() }, [])

  if (!users || !domains) return <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>

  return (
    <div className="space-y-4">
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="all">All Users</TabsTrigger>
          <TabsTrigger value="pending" className="relative">
            Pending Approval
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground animate-pulse">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="bulk">Bulk Create</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
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
              {selectedUserIds.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-muted/60 border rounded-lg mb-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-muted-foreground">
                      {selectedUserIds.length} user{selectedUserIds.length > 1 ? 's' : ''} selected:
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs bg-card h-8 hover:bg-muted"
                      onClick={async () => {
                        const r = await api.bulkUpdateUserStatusAction(selectedUserIds, 'active')
                        if (r.ok) {
                          toast.success('Successfully activated users.')
                          void load()
                        } else {
                          toast.error(r.error)
                        }
                      }}
                    >
                      Bulk Activate
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs bg-card h-8 hover:bg-muted text-amber-600 border-amber-200 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                      onClick={async () => {
                        const r = await api.bulkUpdateUserStatusAction(selectedUserIds, 'archived')
                        if (r.ok) {
                          toast.success('Successfully archived users.')
                          void load()
                        } else {
                          toast.error(r.error)
                        }
                      }}
                    >
                      Bulk Archive
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs bg-card h-8 hover:bg-muted text-destructive border-destructive/20 hover:bg-destructive/10"
                      onClick={async () => {
                        const r = await api.bulkUpdateUserStatusAction(selectedUserIds, 'suspended')
                        if (r.ok) {
                          toast.success('Successfully suspended users.')
                          void load()
                        } else {
                          toast.error(r.error)
                        }
                      }}
                    >
                      Bulk Suspend
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="text-xs h-8"
                      onClick={async () => {
                        if (!confirm(`Delete ${selectedUserIds.length} users? This removes all submissions and is completely irreversible.`)) return
                        const r = await api.bulkDeleteUsersAction(selectedUserIds)
                        if (r.ok) {
                          toast.success('Successfully deleted users.')
                          void load()
                        } else {
                          toast.error(r.error)
                        }
                      }}
                    >
                      Bulk Delete
                    </Button>
                  </div>
                </div>
              )}

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-center">
                        <input
                          type="checkbox"
                          className="rounded border-border bg-background text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                          checked={users.length > 0 && selectedUserIds.length === users.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUserIds(users.map(u => u.id))
                            } else {
                              setSelectedUserIds([])
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Real name / Student ID</TableHead>
                      <TableHead>Captain of</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map(u => {
                      const avatar = getAvatar(u.avatarId)
                      return (
                        <TableRow key={u.id} className={selectedUserIds.includes(u.id) ? 'bg-muted/40' : ''}>
                          <TableCell className="text-center">
                            <input
                              type="checkbox"
                              className="rounded border-border bg-background text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                              checked={selectedUserIds.includes(u.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedUserIds(prev => [...prev, u.id])
                                } else {
                                  setSelectedUserIds(prev => prev.filter(id => id !== u.id))
                                }
                              }}
                            />
                          </TableCell>
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
                          <TableCell>
                            {u.status === 'active' && (
                              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                                Active
                              </Badge>
                            )}
                            {u.status === 'pending' && (
                              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] animate-pulse">
                                Pending
                              </Badge>
                            )}
                            {u.status === 'rejected' && (
                              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-[10px]">
                                Rejected
                              </Badge>
                            )}
                            {u.status === 'archived' && (
                              <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[10px]">
                                Archived
                              </Badge>
                            )}
                            {u.status === 'suspended' && (
                              <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/20 text-[10px] font-semibold">
                                Suspended
                              </Badge>
                            )}
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
        </TabsContent>

        <TabsContent value="pending" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <UserCog className="size-4" /> Pending Approvals
              </CardTitle>
              <CardDescription>
                Students who self-registered. Approve them to grant access, or reject them.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingUsers === null ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : pendingUsers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground space-y-2">
                  <UserCog className="size-8 mx-auto stroke-1 text-muted-foreground/50" />
                  <p className="text-sm font-medium">No pending approval requests</p>
                  <p className="text-xs text-muted-foreground/80">When students self-register, their requests will appear here.</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Student ID</TableHead>
                        <TableHead>Real Name</TableHead>
                        <TableHead>Registered At</TableHead>
                        <TableHead className="w-28 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingUsers.map(u => {
                        const avatar = getAvatar(u.avatarId)
                        return (
                          <TableRow key={u.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Avatar className="size-7 border">
                                  <AvatarFallback style={{ background: avatar.color, color: 'white' }} className="text-xs">
                                    {avatar.glyph}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm font-medium">{u.nickname}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs font-mono">{u.studentId || '—'}</TableCell>
                            <TableCell className="text-xs">{u.realName || '—'}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {new Date(u.createdAt).toLocaleDateString('en-PH', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </TableCell>
                            <TableCell className="text-right space-x-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white border-emerald-500/20 text-xs px-2.5 h-7"
                                disabled={pendingActionId !== null}
                                onClick={async () => {
                                  setPendingActionId(u.id)
                                  try {
                                    const r = await api.approveUserAction(u.id)
                                    if (r.ok) {
                                      toast.success(`Approved ${u.nickname}`)
                                      void load()
                                    } else {
                                      toast.error(r.error)
                                    }
                                  } catch (err: any) {
                                    toast.error(err.message || 'Error approving user')
                                  } finally {
                                    setPendingActionId(null)
                                  }
                                }}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="bg-destructive/10 text-destructive hover:bg-destructive hover:text-white border-destructive/20 text-xs px-2.5 h-7"
                                disabled={pendingActionId !== null}
                                onClick={async () => {
                                  if (!confirm(`Are you sure you want to reject ${u.nickname}?`)) return
                                  setPendingActionId(u.id)
                                  try {
                                    const r = await api.rejectUserAction(u.id)
                                    if (r.ok) {
                                      toast.success(`Rejected ${u.nickname}`)
                                      void load()
                                    } else {
                                      toast.error(r.error)
                                    }
                                  } catch (err: any) {
                                    toast.error(err.message || 'Error rejecting user')
                                  } finally {
                                    setPendingActionId(null)
                                  }
                                }}
                              >
                                Reject
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <UserCog className="size-4" /> Bulk Create Users
              </CardTitle>
              <CardDescription>
                Paste a JSON array of student records. The records will be created immediately with "active" status.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="bulk-json">JSON Array</Label>
                <Textarea
                  id="bulk-json"
                  rows={8}
                  placeholder={`[
  {
    "studentId": "2026-001",
    "nickname": "lia.exe",
    "realName": "Alia Cruz",
    "password": "password1234",
    "role": "student"
  }
]`}
                  value={bulkJson}
                  onChange={(e) => {
                    setBulkJson(e.target.value)
                    setBulkPreview(null)
                    setBulkErrors([])
                    setBulkResult(null)
                  }}
                  className="font-mono text-xs"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (!bulkJson.trim()) {
                      toast.error('JSON input is empty.')
                      return
                    }
                    try {
                      const parsed = JSON.parse(bulkJson)
                      if (!Array.isArray(parsed)) {
                        setBulkErrors(['Input must be a JSON array of objects.'])
                        return
                      }
                      const errs: string[] = []
                      const previewList: any[] = []
                      
                      parsed.forEach((item: any, idx: number) => {
                        const rowNum = idx + 1
                        if (typeof item !== 'object' || item === null) {
                          errs.push(`Row ${rowNum}: Record must be an object.`)
                          return
                        }
                        const studentId = String(item.studentId || '').trim()
                        const nickname = String(item.nickname || '').trim()
                        const password = String(item.password || '')

                        if (!studentId) {
                          errs.push(`Row ${rowNum}: studentId is required.`)
                        } else if (studentId.length < 2 || studentId.length > 20) {
                          errs.push(`Row ${rowNum}: studentId must be 2-20 characters.`)
                        } else if (!/^[a-zA-Z0-9-]+$/.test(studentId)) {
                          errs.push(`Row ${rowNum}: studentId must be alphanumeric and can include dashes.`)
                        }

                        if (!nickname) {
                          errs.push(`Row ${rowNum}: nickname is required.`)
                        } else if (nickname.length < 2 || nickname.length > 32) {
                          errs.push(`Row ${rowNum}: nickname must be 2-32 characters.`)
                        }

                        if (!password) {
                          errs.push(`Row ${rowNum}: password is required.`)
                        } else if (password.length < 8) {
                          errs.push(`Row ${rowNum}: password must be at least 8 characters.`)
                        }

                        const role = item.role || 'student'
                        if (!['admin', 'instructor', 'student'].includes(role)) {
                          errs.push(`Row ${rowNum}: role must be admin, instructor, or student.`)
                        }

                        previewList.push({
                          studentId,
                          nickname,
                          realName: item.realName || '—',
                          password: '••••••••',
                          role,
                        })
                      })

                      setBulkErrors(errs)
                      if (errs.length === 0) {
                        setBulkPreview(previewList)
                        toast.success('JSON validated successfully! Check preview below.')
                      } else {
                        setBulkPreview(null)
                        toast.error('Validation errors found.')
                      }
                    } catch (err: any) {
                      setBulkErrors([`Invalid JSON format: ${err.message}`])
                      setBulkPreview(null)
                      toast.error('Failed to parse JSON.')
                    }
                  }}
                >
                  Validate JSON
                </Button>
                <Button
                  disabled={bulkPreview === null || bulkPending}
                  onClick={() => {
                    if (!bulkPreview) return
                    startBulkTransition(async () => {
                      try {
                        const parsed = JSON.parse(bulkJson)
                        const res = await api.bulkCreateUsersAction(parsed)
                        if (res.ok) {
                          setBulkResult(res)
                          setBulkPreview(null)
                          setBulkJson('')
                          toast.success('Bulk creation completed!')
                          void load()
                        } else {
                          toast.error(res.error)
                        }
                      } catch (err: any) {
                        toast.error(err.message || 'Failed to create records.')
                      }
                    })
                  }}
                >
                  {bulkPending ? <Loader2 className="size-4 animate-spin mr-1.5" /> : null}
                  Create Users
                </Button>
              </div>

              {bulkErrors.length > 0 && (
                <div className="border border-destructive/20 bg-destructive/5 rounded-lg p-3 text-destructive space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    <AlertTriangle className="size-4" /> Validation Failures ({bulkErrors.length})
                  </div>
                  <ul className="text-xs list-disc list-inside space-y-0.5 text-muted-foreground max-h-48 overflow-y-auto font-mono">
                    {bulkErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {bulkResult && (
                <div className="border border-emerald-100 dark:border-emerald-950/40 bg-emerald-500/5 rounded-lg p-3 text-emerald-600 dark:text-emerald-400 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    <CheckCircle2 className="size-4 text-emerald-500" /> Bulk Results Summary
                  </div>
                  <div className="text-xs space-y-0.5 text-muted-foreground">
                    <p>Created: <span className="font-semibold text-foreground">{bulkResult.created}</span></p>
                    <p>Skipped/Errors: <span className="font-semibold text-foreground">{bulkResult.skipped}</span></p>
                  </div>
                  {bulkResult.errors && bulkResult.errors.length > 0 && (
                    <div className="border-t pt-2 mt-2 space-y-1">
                      <p className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground/80">Skip Details</p>
                      <ul className="text-[10px] list-disc list-inside space-y-0.5 text-muted-foreground max-h-32 overflow-y-auto font-mono">
                        {bulkResult.errors.map((err: any, i: number) => (
                          <li key={i}>
                            Row {err.row} ({err.studentId || 'N/A'}): {err.reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {bulkPreview && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Batch Preview ({bulkPreview.length} records)</h4>
                  <div className="rounded-md border max-h-80 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student ID</TableHead>
                          <TableHead>Nickname</TableHead>
                          <TableHead>Real Name</TableHead>
                          <TableHead>Role</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bulkPreview.map((p, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-mono text-xs">{p.studentId}</TableCell>
                            <TableCell className="text-xs font-semibold">{p.nickname}</TableCell>
                            <TableCell className="text-xs">{p.realName}</TableCell>
                            <TableCell className="text-xs capitalize">{p.role}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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



