'use client'

import { api } from '@/lib/api-client'
import { useEffect, useState, useTransition } from 'react'
import { Loader2, Plus, Trash2, Crown, Edit3, Save } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { getDomainIcon, DOMAINS } from '@/lib/domains'

export function DomainsAdmin() {
  const [domains, setDomains] = useState<Awaited<ReturnType<typeof api.listDomainsAction>> | null>(null)
  const [createDomainOpen, setCreateDomainOpen] = useState(false)
  const [editDomainOpen, setEditDomainOpen] = useState<Awaited<ReturnType<typeof api.listDomainsAction>>[number] | null>(null)

  async function load() {
    const ds = await api.listDomainsAction()
    setDomains(ds)
  }

  useEffect(() => { void load() }, [])

  if (!domains) return <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Crown className="size-4 text-primary" /> Practice &amp; Contest Domains
            </CardTitle>
            <CardDescription>
              Decoupled domains defining each competition track&apos;s rules, formats, and style guides.
            </CardDescription>
          </div>
          <Button onClick={() => setCreateDomainOpen(true)}>
            <Plus className="size-4 mr-1" /> New domain
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Key / Name</TableHead>
                  <TableHead>Short Name</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead>Practice Rules</TableHead>
                  <TableHead>Structure</TableHead>
                  <TableHead className="w-10">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {domains.map(d => {
                  const Icon = getDomainIcon(d.icon)
                  return (
                    <TableRow key={d.id}>
                      <TableCell>
                        <div className="size-8 rounded-md grid place-items-center" style={{ background: `${d.color}20`, color: d.color }}>
                          <Icon className="size-4" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-sm">{d.name}</div>
                        <code className="text-[10px] bg-muted px-1 rounded font-mono text-muted-foreground">{d.key}</code>
                      </TableCell>
                      <TableCell className="text-sm font-medium">{d.shortName}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate" title={d.contestFormat}>
                        {d.contestFormat}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[250px] truncate" title={d.practiceNote}>
                        {d.practiceNote}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {d.pairBased ? 'Pairs contest' : 'Solo contest'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost" size="icon"
                            onClick={() => setEditDomainOpen(d)}
                          >
                            <Edit3 className="size-3.5 text-muted-foreground hover:text-foreground" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            onClick={async () => {
                              if (!confirm(`Delete domain "${d.name}"? This is destructive and check-protected.`)) return
                              try {
                                await api.deleteDomainAction(d.id)
                                toast.success('Domain deleted.')
                                void load()
                              } catch (err: any) {
                                toast.error(err.message || 'Failed to delete domain')
                              }
                            }}
                          >
                            <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <CreateDomainDialog open={createDomainOpen} onOpenChange={setCreateDomainOpen} onSaved={() => { setCreateDomainOpen(false); void load() }} />
      {editDomainOpen && (
        <EditDomainDialog
          open={!!editDomainOpen}
          domain={editDomainOpen}
          onOpenChange={(v) => !v && setEditDomainOpen(null)}
          onSaved={() => { setEditDomainOpen(null); void load() }}
        />
      )}
    </div>
  )
}

function CreateDomainDialog({ open, onOpenChange, onSaved }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSaved: () => void
}) {
  const [key, setKey] = useState('')
  const [name, setName] = useState('')
  const [shortName, setShortName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('#16a34a')
  const [icon, setIcon] = useState('Trophy')
  const [practiceNote, setPracticeNote] = useState('')
  const [contestFormat, setContestFormat] = useState('')
  const [pairBased, setPairBased] = useState(false)
  const [pending, startTransition] = useTransition()

  function submit() {
    startTransition(async () => {
      if (!key || !name || !shortName || !practiceNote || !contestFormat) {
        toast.error('All fields except description are required.')
        return
      }
      try {
        await api.createDomainAction({
          key, name, shortName, description: description || undefined,
          color, icon, practiceNote, contestFormat, pairBased,
        })
        toast.success('Domain created successfully.')
        setKey(''); setName(''); setShortName(''); setDescription('')
        setPracticeNote(''); setContestFormat(''); setPairBased(false)
        onSaved()
      } catch (err: any) {
        toast.error(err.message || 'Failed to create domain')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg overflow-y-auto max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Create new domain</DialogTitle>
          <DialogDescription>Add a practice &amp; contest category dynamically to the platform.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="domainKey">Unique key (lowercase, alphanumeric)</Label>
              <Input id="domainKey" value={key} onChange={(e) => setKey(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="e.g. cpp" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="domainName">Domain name</Label>
              <Input id="domainName" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. C++ Programming" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="shortName">Short name</Label>
              <Input id="shortName" value={shortName} onChange={(e) => setShortName(e.target.value)} placeholder="e.g. C++" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="icon">Lucide icon key</Label>
              <Select value={icon} onValueChange={setIcon}>
                <SelectTrigger id="icon"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Trophy">Trophy (Default)</SelectItem>
                  <SelectItem value="Code2">Code2</SelectItem>
                  <SelectItem value="Database">Database</SelectItem>
                  <SelectItem value="Brain">Brain</SelectItem>
                  <SelectItem value="Globe">Globe</SelectItem>
                  <SelectItem value="Terminal">Terminal</SelectItem>
                  <SelectItem value="Network">Network</SelectItem>
                  <SelectItem value="Cpu">Cpu</SelectItem>
                  <SelectItem value="Laptop">Laptop</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="color">Tailwind color hex</Label>
              <Input id="color" type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-9 p-0.5" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="desc">Description (optional)</Label>
            <Input id="desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. OOP, STL, memory management mechanics." />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="practiceNote">Practice guidelines / notes</Label>
            <Input id="practiceNote" value={practiceNote} onChange={(e) => setPracticeNote(e.target.value)} placeholder="e.g. Notepad++ and local compilation reps" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contestFormat">Contest format / rules</Label>
            <Input id="contestFormat" value={contestFormat} onChange={(e) => setContestFormat(e.target.value)} placeholder="e.g. 5 timed problems in 2.5 hours, solo" />
          </div>
          <div className="flex items-center gap-2 pt-1.5">
            <input
              type="checkbox"
              id="pairBased"
              checked={pairBased}
              onChange={(e) => setPairBased(e.target.checked)}
              className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
            />
            <Label htmlFor="pairBased" className="cursor-pointer">This is a pair-based contest track</Label>
          </div>
        </div>
        <DialogFooter className="pt-2 border-t">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin mr-1.5" /> : <Save className="size-4 mr-1.5" />} Create domain
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EditDomainDialog({ open, onOpenChange, domain, onSaved }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  domain: Awaited<ReturnType<typeof api.listDomainsAction>>[number]
  onSaved: () => void
}) {
  const [name, setName] = useState(domain.name)
  const [shortName, setShortName] = useState(domain.shortName)
  const [description, setDescription] = useState(domain.description || '')
  const [color, setColor] = useState(domain.color)
  const [icon, setIcon] = useState(domain.icon)
  const [practiceNote, setPracticeNote] = useState(domain.practiceNote)
  const [contestFormat, setContestFormat] = useState(domain.contestFormat)
  const [pairBased, setPairBased] = useState(domain.pairBased)
  const [pending, startTransition] = useTransition()

  function submit() {
    startTransition(async () => {
      if (!name || !shortName || !practiceNote || !contestFormat) {
        toast.error('All fields except description are required.')
        return
      }
      try {
        await api.updateDomainAction(domain.id, {
          name, shortName, description: description || undefined,
          color, icon, practiceNote, contestFormat, pairBased,
        })
        toast.success('Domain updated successfully.')
        onSaved()
      } catch (err: any) {
        toast.error(err.message || 'Failed to update domain')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg overflow-y-auto max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Edit domain: {domain.name}</DialogTitle>
          <DialogDescription>Modify settings and guidelines for this contest category.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Unique key</Label>
              <Input value={domain.key} disabled className="bg-muted text-muted-foreground" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="editName">Domain name</Label>
              <Input id="editName" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. C++ Programming" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="editShortName">Short name</Label>
              <Input id="editShortName" value={shortName} onChange={(e) => setShortName(e.target.value)} placeholder="e.g. C++" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="editIcon">Lucide icon key</Label>
              <Select value={icon} onValueChange={setIcon}>
                <SelectTrigger id="editIcon"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Trophy">Trophy (Default)</SelectItem>
                  <SelectItem value="Code2">Code2</SelectItem>
                  <SelectItem value="Database">Database</SelectItem>
                  <SelectItem value="Brain">Brain</SelectItem>
                  <SelectItem value="Globe">Globe</SelectItem>
                  <SelectItem value="Terminal">Terminal</SelectItem>
                  <SelectItem value="Network">Network</SelectItem>
                  <SelectItem value="Cpu">Cpu</SelectItem>
                  <SelectItem value="Laptop">Laptop</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="editColor">Tailwind color hex</Label>
              <Input id="editColor" type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-9 p-0.5" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="editDesc">Description (optional)</Label>
            <Input id="editDesc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. OOP, STL, memory management mechanics." />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="editPracticeNote">Practice guidelines / notes</Label>
            <Input id="editPracticeNote" value={practiceNote} onChange={(e) => setPracticeNote(e.target.value)} placeholder="e.g. Notepad++ and local compilation reps" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="editContestFormat">Contest format / rules</Label>
            <Input id="editContestFormat" value={contestFormat} onChange={(e) => setContestFormat(e.target.value)} placeholder="e.g. 5 timed problems in 2.5 hours, solo" />
          </div>
          <div className="flex items-center gap-2 pt-1.5">
            <input
              type="checkbox"
              id="editPairBased"
              checked={pairBased}
              onChange={(e) => setPairBased(e.target.checked)}
              className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
            />
            <Label htmlFor="editPairBased" className="cursor-pointer">This is a pair-based contest track</Label>
          </div>
        </div>
        <DialogFooter className="pt-2 border-t">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin mr-1.5" /> : <Save className="size-4 mr-1.5" />} Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
