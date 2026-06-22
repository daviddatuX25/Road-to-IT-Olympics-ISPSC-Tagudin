'use client'

import { api } from '@/lib/api-client'
import { useEffect, useState, useTransition } from 'react'
import { Loader2, Plus, Trash2, CalendarRange, Edit3, Save, CheckCircle, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { useApp } from '@/lib/app-store'
import { toast } from 'sonner'

type PhaseInput = {
  id?: string
  key: string
  label: string
  shortLabel: string
  description: string
  isMockHeavy: boolean
  sequence: number
}

const DEFAULT_PHASES: PhaseInput[] = [
  { key: 'july-diagnostic', label: 'July — Diagnostic Week', shortLabel: 'July', description: 'Diagnostic per domain to find natural strengths. Open trivia nights to recruit.', isMockHeavy: false, sequence: 1 },
  { key: 'aug-w1',          label: 'August W1 — Practice Starts',    shortLabel: 'Aug W1',  description: 'Captains per domain take the lead. Real practice cycles begin.', isMockHeavy: false, sequence: 2 },
  { key: 'aug-w2',          label: 'August W2 — Practice',           shortLabel: 'Aug W2',  description: 'Weekly reps continue. Spaced-repetition callbacks to earlier material.', isMockHeavy: false, sequence: 3 },
  { key: 'aug-w3',          label: 'August W3 — First Scrimmage',    shortLabel: 'Aug W3',  description: 'First scrimmage under timed conditions.', isMockHeavy: true, sequence: 4 },
  { key: 'aug-w4',          label: 'August W4 — Practice',           shortLabel: 'Aug W4',  description: 'Continue reps. Captains review scrimmage gaps.', isMockHeavy: false, sequence: 5 },
  { key: 'sep-w1',          label: 'September W1 — Practice',        shortLabel: 'Sep W1',  description: 'Practice continues. Lighter load if exam season overlaps, but milestones stay consistent.', isMockHeavy: false, sequence: 6 },
  { key: 'sep-w2',          label: 'September W2 — Practice',        shortLabel: 'Sep W2',  description: 'Practice continues. Spaced-repetition callbacks to August material.', isMockHeavy: false, sequence: 7 },
  { key: 'sep-w3',          label: 'September W3 — Practice',        shortLabel: 'Sep W3',  description: 'Practice continues. Optional async milestones if exam season is heavy.', isMockHeavy: false, sequence: 8 },
  { key: 'sep-w4',          label: 'September W4 — Practice',        shortLabel: 'Sep W4',  description: 'Practice continues. Last week before October sprint — keep the rhythm.', isMockHeavy: false, sequence: 9 },
  { key: 'oct-sprint',      label: 'October — Intensive Sprint',     shortLabel: 'Oct',     description: 'Full-dress mock contests in real restricted environment. Pairs finalized.', isMockHeavy: true, sequence: 10 },
  { key: 'nov-final',       label: 'November — Final Taper',         shortLabel: 'Nov',     description: 'High-frequency mocks for speed and nerves, then light review and real rest.', isMockHeavy: true, sequence: 11 },
]

export function SeasonsAdmin() {
  const [seasons, setSeasons] = useState<Awaited<ReturnType<typeof api.listSeasonsAction>> | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState<Awaited<ReturnType<typeof api.listSeasonsAction>>[number] | null>(null)
  const [isPending, startTransition] = useTransition()
  const { bump } = useApp()

  // Form states for creation
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('2026-06-01')
  const [endDate, setEndDate] = useState('2026-11-30')
  const [status, setStatus] = useState('inactive')
  const [phases, setPhases] = useState<PhaseInput[]>([])
  const [paceMode, setPaceModeLocal] = useState<'synchronous' | 'asynchronous'>('asynchronous')
  const [currentPhaseKey, setCurrentPhaseKeyLocal] = useState<string | null>(null)

  async function load() {
    try {
      const ss = await api.listSeasonsAction()
      setSeasons(ss)
    } catch (err: any) {
      toast.error('Failed to load seasons: ' + err.message)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  // Auto-populate phases for new season creation
  const handlePrepopulatePhases = () => {
    setPhases([...DEFAULT_PHASES])
    toast.success('Prepopulated standard phases!')
  }

  const handleAddPhase = () => {
    const newSeq = phases.length + 1
    const p: PhaseInput = {
      key: `phase-${newSeq}`,
      label: `Phase ${newSeq}`,
      shortLabel: `Ph ${newSeq}`,
      description: 'Phase description here.',
      isMockHeavy: false,
      sequence: newSeq,
    }
    setPhases([...phases, p])
  }

  const handleUpdatePhase = (index: number, field: keyof PhaseInput, value: any) => {
    const updated = [...phases]
    updated[index] = { ...updated[index], [field]: value }
    setPhases(updated)
  }

  const handleRemovePhase = (index: number) => {
    const updated = phases.filter((_, i) => i !== index).map((p, idx) => ({
      ...p,
      sequence: idx + 1,
    }))
    setPhases(updated)
  }

  const handleCreate = () => {
    if (!name.trim()) return toast.error('Season name required.')
    startTransition(async () => {
      try {
        await api.createSeasonAction({
          name: name.trim(),
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
          status,
          paceMode,
          currentPhaseKey,
          phases: phases.map(p => ({
            key: p.key.trim().toLowerCase(),
            label: p.label.trim(),
            shortLabel: p.shortLabel.trim(),
            description: p.description.trim(),
            isMockHeavy: p.isMockHeavy,
            sequence: p.sequence,
          })),
        })
        toast.success('Season created successfully!')
        setCreateOpen(false)
        // Reset form
        setName('')
        setStartDate('2026-06-01')
        setEndDate('2026-11-30')
        setStatus('inactive')
        setPhases([])
        setPaceModeLocal('asynchronous')
        setCurrentPhaseKeyLocal(null)
        await load()
        bump()
        // Reload page to bootstrap active season update
        window.location.reload()
      } catch (err: any) {
        toast.error('Failed to create season: ' + err.message)
      }
    })
  }

  // Edit states mapping
  useEffect(() => {
    if (editOpen) {
      setName(editOpen.name)
      setStartDate(new Date(editOpen.startDate).toISOString().slice(0, 10))
      setEndDate(new Date(editOpen.endDate).toISOString().slice(0, 10))
      setStatus(editOpen.status)
      setPhases((editOpen as any).phases?.map((p: any) => ({
        id: p.id,
        key: p.key,
        label: p.label,
        shortLabel: p.shortLabel,
        description: p.description,
        isMockHeavy: p.isMockHeavy,
        sequence: p.sequence,
      })).sort((a: any, b: any) => a.sequence - b.sequence) || [])
      setPaceModeLocal((editOpen as any).paceMode ?? 'asynchronous')
      setCurrentPhaseKeyLocal((editOpen as any).currentPhaseKey ?? null)
    }
  }, [editOpen])

  const handleUpdate = () => {
    if (!editOpen) return
    if (!name.trim()) return toast.error('Season name required.')
    startTransition(async () => {
      try {
        await api.updateSeasonAction(editOpen.id, {
          name: name.trim(),
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
          status,
          paceMode,
          currentPhaseKey,
          phases: phases.map(p => ({
            id: p.id,
            key: p.key.trim().toLowerCase(),
            label: p.label.trim(),
            shortLabel: p.shortLabel.trim(),
            description: p.description.trim(),
            isMockHeavy: p.isMockHeavy,
            sequence: p.sequence,
          })),
        })
        toast.success('Season updated successfully!')
        setEditOpen(null)
        await load()
        bump()
        // Reload page to bootstrap active season update
        window.location.reload()
      } catch (err: any) {
        toast.error('Failed to update season: ' + err.message)
      }
    })
  }

  const handleDelete = (id: string) => {
    const s = seasons?.find(x => x.id === id)
    if (s?.status === 'active') {
      return toast.error('Cannot delete the active season. Activate another season first.')
    }
    if (!confirm('Are you absolutely sure you want to delete this season? This will cascade-delete all its milestones, mocks, team selections, and evaluations!')) return
    startTransition(async () => {
      try {
        await api.deleteSeasonAction(id)
        toast.success('Season deleted successfully.')
        await load()
        bump()
      } catch (err: any) {
        toast.error('Failed to delete season: ' + err.message)
      }
    })
  }

  if (!seasons) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarRange className="size-4 text-primary" /> Seasons &amp; Rollovers
            </CardTitle>
            <CardDescription>
              Archive old tracks and bootstrap next year&apos;s season. Only one season is active at any time.
            </CardDescription>
          </div>
          <Button onClick={() => { setPhases([]); setCreateOpen(true) }}>
            <Plus className="size-4 mr-1" /> New Season
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Season Name</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Timeline Phases</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {seasons.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-semibold text-sm">{s.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(s.startDate).toISOString().slice(0, 10)} to {new Date(s.endDate).toISOString().slice(0, 10)}
                    </TableCell>
                    <TableCell className="text-xs">
                      <Badge variant="secondary">
                        {(s as any).phases?.length || 0} Phases
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {s.status === 'active' ? (
                        <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white flex items-center gap-1 w-fit">
                          <CheckCircle className="size-3" /> Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground w-fit">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setEditOpen(s)}>
                          <Edit3 className="size-3.5 text-muted-foreground hover:text-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}>
                          <Trash2 className="size-3.5 text-destructive hover:bg-destructive/10" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Creation Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Season</DialogTitle>
            <DialogDescription>
              Setup next year&apos;s competition cycle. Standard phases can be pre-loaded dynamically.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="c-name" className="text-xs font-semibold">Season Name</Label>
                <Input id="c-name" placeholder="e.g. 2027 Season" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-status" className="text-xs font-semibold">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger id="c-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active (Deactivates other seasons)</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Pace Mode</Label>
                <Select value={paceMode} onValueChange={v => setPaceModeLocal(v as 'synchronous' | 'asynchronous')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asynchronous">Asynchronous — all active milestones visible</SelectItem>
                    <SelectItem value="synchronous">Synchronous — gated by current phase</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {paceMode === 'synchronous' ? (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Current Phase</Label>
                  <Select
                    value={currentPhaseKey ?? '__none__'}
                    onValueChange={v => setCurrentPhaseKeyLocal(v === '__none__' ? null : v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Not started (no milestones unlocked) —</SelectItem>
                      {[...phases].sort((a, b) => a.sequence - b.sequence).map(p => (
                        <SelectItem key={p.key} value={p.key}>{p.label || p.key}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2 invisible" />
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="c-start" className="text-xs font-semibold">Start Date</Label>
                <Input id="c-start" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-end" className="text-xs font-semibold">End Date</Label>
                <Input id="c-end" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Timeline Phases</Label>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handlePrepopulatePhases}>
                    Prepopulate Defaults
                  </Button>
                  <Button size="sm" onClick={handleAddPhase}>
                    <Plus className="size-3 mr-1" /> Add Phase
                  </Button>
                </div>
              </div>

              {phases.length === 0 ? (
                <div className="text-center py-6 border border-dashed rounded-md text-xs text-muted-foreground">
                  No timeline phases added yet. Click Prepopulate Defaults or Add Phase.
                </div>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {phases.map((p, idx) => (
                    <div key={idx} className="p-3 border rounded-md relative bg-muted/40 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-primary">Phase {p.sequence}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={() => handleRemovePhase(idx)}>
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[10px]">Key (unique)</Label>
                          <Input className="h-7 text-xs font-mono" value={p.key} onChange={e => handleUpdatePhase(idx, 'key', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px]">Label</Label>
                          <Input className="h-7 text-xs" value={p.label} onChange={e => handleUpdatePhase(idx, 'label', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px]">Short Label</Label>
                          <Input className="h-7 text-xs" value={p.shortLabel} onChange={e => handleUpdatePhase(idx, 'shortLabel', e.target.value)} />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px]">Description</Label>
                        <Input className="h-7 text-xs" value={p.description} onChange={e => handleUpdatePhase(idx, 'description', e.target.value)} />
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <Checkbox
                          id={`mock-c-${idx}`}
                          checked={p.isMockHeavy}
                          onCheckedChange={checked => handleUpdatePhase(idx, 'isMockHeavy', !!checked)}
                        />
                        <Label htmlFor={`mock-c-${idx}`} className="text-[10px] select-none font-medium text-muted-foreground cursor-pointer">
                          Mock-heavy Phase (timed proctored scrimmages focus)
                        </Label>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={isPending}>
              {isPending && <Loader2 className="size-4 mr-1 animate-spin" />}
              Create Season
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Editing Dialog */}
      <Dialog open={!!editOpen} onOpenChange={open => !open && setEditOpen(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Season: {editOpen?.name}</DialogTitle>
            <DialogDescription>
              Modify season parameters or update phases. Changes apply immediately.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {status === 'active' && editOpen?.status !== 'active' && (
              <div className="rounded-lg border bg-amber-500/10 border-amber-500/20 p-3 text-xs text-amber-600 dark:text-amber-400 flex items-start gap-2">
                <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                <p>
                  Activating this season will immediately deactivate the current active season, switching the dashboard and milestones view contexts systemwide.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="e-name" className="text-xs font-semibold">Season Name</Label>
                <Input id="e-name" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="e-status" className="text-xs font-semibold">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger id="e-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active (Deactivates other seasons)</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Pace Mode</Label>
                <Select value={paceMode} onValueChange={v => setPaceModeLocal(v as 'synchronous' | 'asynchronous')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asynchronous">Asynchronous — all active milestones visible</SelectItem>
                    <SelectItem value="synchronous">Synchronous — gated by current phase</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {paceMode === 'synchronous' ? (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Current Phase</Label>
                  <Select
                    value={currentPhaseKey ?? '__none__'}
                    onValueChange={v => setCurrentPhaseKeyLocal(v === '__none__' ? null : v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Not started (no milestones unlocked) —</SelectItem>
                      {[...phases].sort((a, b) => a.sequence - b.sequence).map(p => (
                        <SelectItem key={p.key} value={p.key}>{p.label || p.key}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2 invisible" />
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="e-start" className="text-xs font-semibold">Start Date</Label>
                <Input id="e-start" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="e-end" className="text-xs font-semibold">End Date</Label>
                <Input id="e-end" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Timeline Phases</Label>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handlePrepopulatePhases}>
                    Prepopulate Defaults
                  </Button>
                  <Button size="sm" onClick={handleAddPhase}>
                    <Plus className="size-3 mr-1" /> Add Phase
                  </Button>
                </div>
              </div>

              {phases.length === 0 ? (
                <div className="text-center py-6 border border-dashed rounded-md text-xs text-muted-foreground">
                  No timeline phases added yet. Click Prepopulate Defaults or Add Phase.
                </div>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {phases.map((p, idx) => (
                    <div key={idx} className="p-3 border rounded-md relative bg-muted/40 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-primary">Phase {p.sequence}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={() => handleRemovePhase(idx)}>
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[10px]">Key (unique)</Label>
                          <Input className="h-7 text-xs font-mono" value={p.key} onChange={e => handleUpdatePhase(idx, 'key', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px]">Label</Label>
                          <Input className="h-7 text-xs" value={p.label} onChange={e => handleUpdatePhase(idx, 'label', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px]">Short Label</Label>
                          <Input className="h-7 text-xs" value={p.shortLabel} onChange={e => handleUpdatePhase(idx, 'shortLabel', e.target.value)} />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px]">Description</Label>
                        <Input className="h-7 text-xs" value={p.description} onChange={e => handleUpdatePhase(idx, 'description', e.target.value)} />
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <Checkbox
                          id={`mock-e-${idx}`}
                          checked={p.isMockHeavy}
                          onCheckedChange={checked => handleUpdatePhase(idx, 'isMockHeavy', !!checked)}
                        />
                        <Label htmlFor={`mock-e-${idx}`} className="text-[10px] select-none font-medium text-muted-foreground cursor-pointer">
                          Mock-heavy Phase (timed proctored scrimmages focus)
                        </Label>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setEditOpen(null)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={isPending}>
              {isPending && <Loader2 className="size-4 mr-1 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
