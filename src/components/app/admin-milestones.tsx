'use client'

import { api } from '@/lib/api-client'
import { MilestoneWithMeta } from '@/lib/api-client'
import { useEffect, useState, useTransition } from 'react'
import {
  Loader2, Plus, Save, FileText, Lock, Archive, History, Edit3, X,
  ArrowLeft, Copy,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { useApp } from '@/lib/app-store'
import { MODES, DIFFICULTIES, domainMeta, modeMeta, difficultyMeta, phaseLabel, getDomainIcon } from '@/lib/domains'
import type { SessionUser } from '@/lib/auth'
import { cn } from '@/lib/utils'

export function AdminMilestones({ user }: { user: SessionUser }) {
  const { selectMilestone, domains } = useApp()
  const [milestones, setMilestones] = useState<MilestoneWithMeta[] | null>(null)
  const [editorOpen, setEditorOpen] = useState<null | { mode: 'create' } | { mode: 'version'; milestone: MilestoneWithMeta } | { mode: 'edit'; milestone: MilestoneWithMeta }>(null)
  const [versionView, setVersionView] = useState<MilestoneWithMeta | null>(null)

  async function load() {
    // Show all milestones (draft + active + archived) for staff/captains
    const milestonesData = await api.listMilestoneMetaAction()
    setMilestones(milestonesData)
  }

  useEffect(() => { void load() }, [])

  if (versionView) {
    return <VersionDetail milestone={versionView} onBack={() => setVersionView(null)} onEdit={() => {
      setEditorOpen({ mode: 'version', milestone: versionView })
      setVersionView(null)
    }} />
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base flex items-center gap-2"><FileText className="size-4" /> Milestone authoring</CardTitle>
            <CardDescription>
              Once a milestone has at least one submission, it locks from edits — create a new version to change the prompt. Old versions and their submissions stay exactly as they were.
            </CardDescription>
          </div>
          <Button onClick={() => setEditorOpen({ mode: 'create' })}>
            <Plus className="size-4 mr-1" /> New milestone
          </Button>
        </CardHeader>
        <CardContent>
          {milestones === null ? (
            <div className="flex justify-center py-8"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
          ) : milestones.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No milestones yet. Create the first one.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Domain</TableHead>
                    <TableHead>Phase</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Difficulty</TableHead>
                    <TableHead>Subs</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {milestones.map(m => {
                    const meta = domainMeta(m.domain.key)
                    const Icon = meta.icon
                    const diff = difficultyMeta(m.difficulty)
                    return (
                      <TableRow key={m.id} className="cursor-pointer hover:bg-accent/50" onClick={() => setVersionView(m)}>
                        <TableCell>
                          <div className="size-7 rounded-md grid place-items-center" style={{ background: `${meta.color}20`, color: meta.color }}>
                            <Icon className="size-3.5" />
                          </div>
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          <div className="flex items-center gap-2">
                            {m.title}
                            {m.version > 1 && <Badge variant="outline" className="text-[10px]">v{m.version}</Badge>}
                            {m.isLocked && <Lock className="size-3 text-muted-foreground" />}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{m.domain.name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{phaseLabel(m.weekOrPhase)}</TableCell>
                        <TableCell className="text-xs capitalize">{modeMeta(m.mode).label}</TableCell>
                        <TableCell className="text-xs capitalize" style={{ color: diff.color }}>{diff.label}</TableCell>
                        <TableCell className="text-xs tabular-nums">{m._count.submissions}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px] capitalize',
                              m.status === 'active' && 'border-emerald-500/40 text-emerald-700 dark:text-emerald-400',
                              m.status === 'draft' && 'border-amber-500/40 text-amber-700 dark:text-amber-400',
                              m.status === 'archived' && 'text-muted-foreground',
                            )}
                          >
                            {m.status}
                          </Badge>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" onClick={() => setVersionView(m)}>
                            <Edit3 className="size-3.5" />
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

      {editorOpen && (
        <MilestoneEditor
          mode={editorOpen.mode}
          milestone={'milestone' in editorOpen ? editorOpen.milestone : undefined}
          onClose={() => setEditorOpen(null)}
          onSaved={() => { setEditorOpen(null); void load() }}
        />
      )}
    </div>
  )
}

function VersionDetail({ milestone, onBack, onEdit }: {
  milestone: MilestoneWithMeta
  onBack: () => void
  onEdit: () => void
}) {
  const [, startTransition] = useTransition()
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof api.getMilestoneAction>> | null>(null)
  const { selectMilestone, setView } = useApp()

  useEffect(() => {
    void (async () => {
      const d = await api.getMilestoneAction(milestone.id)
      setDetail(d)
    })()
  }, [milestone.id])

  async function activate() {
    startTransition(async () => {
      const r = await api.activateMilestoneAction(milestone.id)
      if (r.ok) { toast.success('Milestone published.'); onBack() } else toast.error(r.error)
    })
  }
  async function archive() {
    startTransition(async () => {
      const r = await api.archiveMilestoneAction(milestone.id)
      if (r.ok) { toast.success('Archived.'); onBack() } else toast.error(r.error)
    })
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground">
        <ArrowLeft className="size-4 mr-1" /> Back to milestone list
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge variant="outline" className="text-[10px] capitalize">{milestone.status}</Badge>
            <Badge variant="outline" className="text-[10px]">v{milestone.version}</Badge>
            {milestone.isLocked && (
              <Badge variant="outline" className="text-[10px] gap-1 text-muted-foreground">
                <Lock className="size-2.5" /> Locked — has submissions
              </Badge>
            )}
          </div>
          <CardTitle className="text-lg">{milestone.title}</CardTitle>
          <CardDescription>
            {milestone.domain.name} · {modeMeta(milestone.mode).label} · {difficultyMeta(milestone.difficulty).label} · {phaseLabel(milestone.weekOrPhase)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Prompt template</p>
              <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(detail?.promptTemplate ?? ''); toast.success('Copied') }}>
                <Copy className="size-3 mr-1" /> Copy
              </Button>
            </div>
            <pre className="text-xs whitespace-pre-wrap font-mono bg-muted/40 p-3 rounded-md max-h-72 overflow-y-auto">
{detail?.promptTemplate}
            </pre>
          </div>

          {detail && detail.submissions.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">
                Submissions ({detail.submissions.length})
              </p>
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {detail.submissions.map(s => (
                  <div key={s.id} className="flex items-center gap-3 p-2 rounded-md border text-xs">
                    <span className="font-medium">{s.user.nickname}</span>
                    <span className="text-muted-foreground">{new Date(s.clientSubmissionTimestamp).toLocaleDateString()}</span>
                    {s.aiScore !== null && <span className="font-mono">score: {s.aiScore}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2 border-t">
            {milestone.isLocked ? (
              <Button onClick={onEdit}>
                <History className="size-4 mr-1.5" /> Create new version
              </Button>
            ) : (
              <>
                {milestone.status === 'draft' && (
                  <Button onClick={activate}>
                    <FileText className="size-4 mr-1.5" /> Publish (set active)
                  </Button>
                )}
                {milestone.status === 'active' && (
                  <Button variant="outline" onClick={archive}>
                    <Archive className="size-4 mr-1.5" /> Archive
                  </Button>
                )}
                {milestone.status === 'archived' && (
                  <Button variant="outline" onClick={activate}>
                    <FileText className="size-4 mr-1.5" /> Re-activate
                  </Button>
                )}
                <Button variant="outline" onClick={onEdit}>
                  <Edit3 className="size-4 mr-1.5" /> Edit (will create new version once locked)
                </Button>
              </>
            )}
            <Button variant="ghost" onClick={() => { selectMilestone(milestone.id); setView('milestones') }}>
              Open as student view →
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function MilestoneEditor({ mode, milestone, onClose, onSaved }: {
  mode: 'create' | 'version' | 'edit'
  milestone?: MilestoneWithMeta
  onClose: () => void
  onSaved: () => void
}) {
  const { domains, phases } = useApp()
  // Seed fields from existing milestone when versioning/editing
  const initial = milestone
  const [domainKey, setDomainKey] = useState(initial?.domain.key ?? domains?.[0]?.key ?? '')
  const [weekOrPhase, setWeekOrPhase] = useState(initial?.weekOrPhase ?? phases?.[2]?.key ?? phases?.[0]?.key ?? '')
  const [modeVal, setModeVal] = useState<'tutor' | 'assessment' | 'journal'>(initial?.mode as 'tutor' | 'assessment' | 'journal' ?? 'tutor')
  const [difficulty, setDifficulty] = useState<'easy' | 'average' | 'difficult'>(initial?.difficulty as 'easy' | 'average' | 'difficult' ?? 'easy')
  const [title, setTitle] = useState(initial?.title ?? '')
  const [prompt, setPrompt] = useState(initial?.promptTemplate ?? '')
  const [templates, setTemplates] = useState<Awaited<ReturnType<typeof api.listSystemPromptTemplatesAction>>>([])

  useEffect(() => {
    if (!domainKey && domains.length > 0) {
      setDomainKey(domains[0].key)
    }
  }, [domains, domainKey])

  useEffect(() => {
    if (!weekOrPhase && phases.length > 0) {
      setWeekOrPhase(phases[2]?.key ?? phases[0]?.key)
    }
  }, [phases, weekOrPhase])

  useEffect(() => {
    async function loadTemplates() {
      try {
        const data = await api.listSystemPromptTemplatesAction()
        setTemplates(data)
      } catch (err) {
        console.error('Failed to load system prompt templates', err)
      }
    }
    void loadTemplates()
  }, [])
  const [accepted, setAccepted] = useState<string[]>(() => {
    if (!initial) return ['guided_form']
    try { return JSON.parse(initial.acceptedInputTypes) as string[] } catch { return ['guided_form'] }
  })
  const [status, setStatus] = useState<'draft' | 'active'>(initial?.status === 'active' ? 'active' : 'draft')
  const [pending, startTransition] = useTransition()

  function toggleAccepted(key: string) {
    setAccepted(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  }

  // When the mode changes, keep accepted input types sensible:
  //  - assessment → JSON must be accepted (it's how a score reaches the
  //    assessment leaderboard). Add it if the author hasn't already.
  function changeMode(next: 'tutor' | 'assessment' | 'journal') {
    setModeVal(next)
    if (next === 'assessment' && !accepted.includes('json')) {
      setAccepted(prev => [...prev, 'json'])
    }
  }

  function submit() {
    startTransition(async () => {
      if (title.trim().length < 3) { toast.error('Title must be at least 3 characters.'); return }
      if (prompt.trim().length < 10) { toast.error('Prompt template is too short.'); return }
      if (accepted.length === 0) { toast.error('Pick at least one input type.'); return }

      // Resolve domainId from key — we can fetch via listDomainsAction
      const listDomainsAction = api.listDomainsAction
      const domains = await listDomainsAction()
      const domain = domains.find(d => d.key === domainKey)
      if (!domain) { toast.error('Pick a domain.'); return }

      if (mode === 'create') {
        const r = await api.createMilestoneAction({
          domainId: domain.id, weekOrPhase, mode: modeVal, difficulty,
          title, promptTemplate: prompt, acceptedInputTypes: accepted, status,
        })
        if (r.ok) { toast.success('Milestone created.'); onSaved() } else toast.error(r.error)
      } else if (mode === 'version' || mode === 'edit') {
        // If the original is locked, this creates a new version.
        // If it's not locked, this still creates a new version per the handoff spec
        // (because "milestones don't disappear once scored" — but for unlocked,
        // we'd ideally allow direct edits. For simplicity in this build, versioning always.)
        if (initial?.isLocked || mode === 'version') {
          const r = await api.versionMilestoneAction(initial!.id, {
            title, promptTemplate: prompt, acceptedInputTypes: accepted,
            weekOrPhase, mode: modeVal, difficulty,
          })
          if (r.ok) { toast.success('New version created. Old version is locked and archived.'); onSaved() }
          else toast.error(r.error)
        } else {
          // Direct edit path: for unlocked milestones, archive the old + create new active
          // Simpler than a true edit and keeps the audit trail clean.
          if (initial) {
            await api.archiveMilestoneAction(initial.id)
          }
          const r = await api.createMilestoneAction({
            domainId: domain.id, weekOrPhase, mode: modeVal, difficulty,
            title, promptTemplate: prompt, acceptedInputTypes: accepted, status: 'active',
          })
          if (r.ok) { toast.success('Updated (old version archived).'); onSaved() }
          else toast.error(r.error)
        }
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start sm:items-center justify-center p-4 overflow-y-auto">
      <Card className="w-full max-w-3xl my-8">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">
              {mode === 'create' && 'New milestone'}
              {mode === 'version' && `New version (v${(initial?.version ?? 1) + 1})`}
              {mode === 'edit' && 'Edit milestone'}
            </CardTitle>
            <CardDescription>
              {mode === 'create' && 'Engineer a prompt students paste into Claude / Gemini / ChatGPT.'}
              {mode === 'version' && 'The old version stays locked. Submissions against it stay exactly as they were.'}
              {mode === 'edit' && 'Editing an unlocked milestone archives the old version.'}
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="size-4" /></Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Domain</Label>
              <Select value={domainKey} onValueChange={setDomainKey} disabled={mode !== 'create'}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {domains.map(d => <SelectItem key={d.key} value={d.key}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Phase / week</Label>
              <Select value={weekOrPhase} onValueChange={setWeekOrPhase}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {phases.map(p => <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Mode</Label>
              <Select value={modeVal} onValueChange={(v) => changeMode(v as 'tutor' | 'assessment' | 'journal')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MODES.map(m => <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Difficulty</Label>
              <Select value={difficulty} onValueChange={(v) => setDifficulty(v as 'easy' | 'average' | 'difficult')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DIFFICULTIES.map(d => <SelectItem key={d.key} value={d.key}>{d.label} ({d.points}pts)</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as 'draft' | 'active')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft (only you &amp; staff)</SelectItem>
                  <SelectItem value="active">Active (students can submit)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Java · Week 1 · Loops & Conditionals" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="prompt">Prompt template</Label>
            {templates.length > 0 && (
              <div className="mb-2">
                <Select
                  onValueChange={(val) => {
                    const selected = templates.find(t => t.id === val)
                    if (selected) {
                      setPrompt(selected.template)
                      toast.success(`Loaded preset: ${selected.name}`)
                    }
                  }}
                >
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue placeholder="Load preset prompt template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name} ({t.mode})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Textarea
              id="prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={14}
              className="font-mono text-xs"
              placeholder={`You are my Java tutor for IT Skills Olympics prep.\n\nRules:\n- Notepad + javac only (no IDE — that's the contest format)\n- Don't hand me the answer\n- After each problem, ask a follow-up\n\nToday's topic: ...\n\nProblems:\n1. ...\n2. ...\n\nEnd with a reflection prompt.`}
            />
            <p className="text-[11px] text-muted-foreground">
              This is the entire student-facing output. What comes back into the app is the structured result (guided form or JSON).
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Accepted input types</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={accepted.includes('guided_form')} onCheckedChange={() => toggleAccepted('guided_form')} />
                Guided form (score, weaknesses, reflection)
              </label>
              <label className={cn('flex items-center gap-2 text-sm', modeVal === 'assessment' ? 'cursor-not-allowed opacity-80' : 'cursor-pointer')}>
                <Checkbox
                  checked={accepted.includes('json')}
                  disabled={modeVal === 'assessment'}
                  onCheckedChange={() => toggleAccepted('json')}
                />
                JSON paste-box
                {modeVal === 'assessment' && (
                  <span className="text-[10px] text-muted-foreground">(required for assessment — feeds the leaderboard)</span>
                )}
              </label>
            </div>
            {modeVal === 'assessment' && (
              <p className="text-[11px] text-muted-foreground">
                Assessment submissions need a <code className="bg-muted px-1 rounded">score</code> in the JSON to land on the
                assessment leaderboard. JSON stays locked on.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={submit} disabled={pending}>
              {pending ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Save className="size-4 mr-1.5" />}
              {mode === 'create' ? 'Create milestone' : mode === 'version' ? 'Create new version' : 'Save changes'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
