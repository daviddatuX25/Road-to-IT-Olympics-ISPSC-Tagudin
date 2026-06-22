'use client'

import { api } from '@/lib/api-client'
import { MilestoneWithMeta } from '@/lib/api-client'
import { useEffect, useState, useTransition, useMemo, createElement } from 'react'
import {
  Loader2, ArrowLeft, Copy, Check, Filter, Plus, Lock, Archive,
  FileText, Sparkles, ClipboardList, Code2, X, Save, Gamepad2, List, Compass, CalendarClock,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { useApp } from '@/lib/app-store'
import { getAvatar } from '@/lib/avatars'
import { MODES, DIFFICULTIES, domainMeta, modeMeta, difficultyMeta, phaseLabel, getDomainIcon } from '@/lib/domains'
import type { SessionUser } from '@/lib/auth'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

export function MilestonesView({ user }: { user: SessionUser }) {
  const {
    milestoneFilterDomain, milestoneFilterWeek, selectedMilestoneId,
    setMilestoneFilter, selectMilestone, domains, phases, paceMode, currentPhaseKey,
  } = useApp()

  const [milestones, setMilestones] = useState<MilestoneWithMeta[] | null>(null)
  const isSynchronous = paceMode === 'synchronous'
  const currentPhaseLabel = isSynchronous && currentPhaseKey
    ? phases.find(p => p.key === currentPhaseKey)?.label ?? currentPhaseKey
    : null
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'path' | 'list'>('path')

  // Resolve domain keys → DB IDs so the filter actually matches server-side.
  const domainIdByKey = useMemo(() => {
    const map: Record<string, string> = {}
    for (const d of domains) map[d.key] = d.id
    return map
  }, [domains])

  // Normalize any incoming preset to an ID. If it's already a cuid, keep it;
  // otherwise map it through the key→id table.
  const resolveDomain = (val: string | null): string => {
    if (!val || val === 'all') return 'all'
    if (domainIdByKey[val]) return domainIdByKey[val]
    return val
  }
  
  const [domainFilter, setDomainFilter] = useState<string>('all')
  const [weekFilter, setWeekFilter] = useState<string>('all')
  const [modeFilter, setModeFilter] = useState<string>('all')

  // Set initial filters based on presets when map/lists load
  useEffect(() => {
    if (milestoneFilterDomain) {
      const resolved = resolveDomain(milestoneFilterDomain)
      if (resolved !== 'all') setDomainFilter(resolved)
    }
  }, [milestoneFilterDomain, domainIdByKey])

  useEffect(() => {
    if (milestoneFilterWeek) setWeekFilter(milestoneFilterWeek)
  }, [milestoneFilterWeek])

  async function load() {
    const [data, mySubs] = await Promise.all([
      api.listMilestoneMetaAction({
        domainId: domainFilter === 'all' ? undefined : domainFilter,
        weekOrPhase: weekFilter === 'all' ? undefined : weekFilter,
        mode: modeFilter === 'all' ? undefined : modeFilter as 'tutor' | 'assessment' | 'journal',
        status: 'active',
      }),
      api.listMySubmissionsAction()
    ])
    setMilestones(data)
    setCompletedIds(new Set(mySubs.map(s => s.milestoneId)))
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domainFilter, weekFilter, modeFilter])

  if (selectedMilestoneId) {
    return (
      <MilestoneDetail
        id={selectedMilestoneId}
        user={user}
        onBack={() => { selectMilestone(null); load() }}
      />
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Compass className="size-5 text-emerald-500" /> Milestones
            </CardTitle>
            <CardDescription className="max-w-md">
              Complete practice levels by copying prompts into your AI tutor, then log your submission.
            </CardDescription>
          </div>
          <div className="flex bg-muted p-1 rounded-lg border shrink-0">
            <button
              onClick={() => setViewMode('path')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                viewMode === 'path' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Gamepad2 className="size-3.5" />
              Level Path
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                viewMode === 'list' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <List className="size-3.5" />
              List
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <FilterSelect label="Domain" value={domainFilter} onChange={setDomainFilter}
              options={[
                { value: 'all', label: 'All domains' },
                ...domains.map(d => ({ value: d.id, label: d.name })),
              ]}
            />
            {!isSynchronous ? (
              <FilterSelect label="Phase / week" value={weekFilter} onChange={setWeekFilter}
                options={[{ value: 'all', label: 'All phases' }, ...phases.map(p => ({ value: p.key, label: p.label }))]}
              />
            ) : (
              <div className="hidden sm:block" />
            )}
            <FilterSelect label="Mode" value={modeFilter} onChange={setModeFilter}
              options={[{ value: 'all', label: 'All modes' }, ...MODES.map(m => ({ value: m.key, label: m.label }))]}
            />
            {isSynchronous && (
              <div className="col-span-full flex items-center gap-2 px-3 py-2 rounded-md border bg-muted/40 text-sm mt-1">
                <CalendarClock className="size-4 text-muted-foreground shrink-0" />
                {currentPhaseLabel ? (
                  <span>Current phase: <strong>{currentPhaseLabel}</strong> — all earlier phases are also accessible.</span>
                ) : (
                  <span className="text-muted-foreground">The season hasn&apos;t started yet. Check back soon!</span>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {milestones === null ? (
        <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
      ) : milestones.length === 0 ? (
        isSynchronous && !currentPhaseKey ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              The season hasn&apos;t kicked off yet — milestones will be unlocked one phase at a time.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No milestones match these filters.
            </CardContent>
          </Card>
        )
      ) : viewMode === 'path' ? (
        <MilestonePathView
          milestones={milestones}
          completedIds={completedIds}
          onOpenMilestone={(id) => selectMilestone(id)}
        />
      ) : (
        <div className="grid gap-3">
          {milestones.map((m) => (
            <MilestoneRow key={m.id} milestone={m} onOpen={() => selectMilestone(m.id)} />
          ))}
        </div>
      )}
    </div>
  )
}

function FilterSelect({ label, value, onChange, options }: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function MilestoneRow({ milestone, onOpen }: { milestone: MilestoneWithMeta; onOpen: () => void }) {
  const color = milestone.domain.color || '#16a34a'
  const diff = difficultyMeta(milestone.difficulty)
  const mode = modeMeta(milestone.mode)
  const icon = getDomainIcon(milestone.domain.icon)

  return (
    <button onClick={onOpen} className="text-left">
      <Card className="hover:shadow-md hover:border-primary/30 transition-all">
        <CardContent className="py-4 flex items-start gap-4">
          <div className="size-10 rounded-lg grid place-items-center shrink-0" style={{ background: `${color}20`, color }}>
            {createElement(icon, { className: 'size-5' })}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <p className="text-sm font-semibold truncate">{milestone.title}</p>
              {milestone.isLocked && (
                <Badge variant="outline" className="text-[10px] text-muted-foreground gap-1">
                  <Lock className="size-2.5" /> v{milestone.version} locked
                </Badge>
              )}
              {!milestone.isLocked && milestone.version > 1 && (
                <Badge variant="outline" className="text-[10px]">v{milestone.version}</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
              <span className="capitalize">{mode.label}</span>
              <span>·</span>
              <span style={{ color: diff.color }} className="font-medium capitalize">{diff.label}</span>
              <span>·</span>
              <span>{phaseLabel(milestone.weekOrPhase)}</span>
              <span>·</span>
              <span>{milestone._count.submissions} submission{milestone._count.submissions === 1 ? '' : 's'}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </button>
  )
}

// -----------------------------------------------------------------------------
// Milestone detail + submission flow
// -----------------------------------------------------------------------------

function MilestoneDetail({ id, user, onBack }: { id: string; user: SessionUser; onBack: () => void }) {
  const [data, setData] = useState<Awaited<ReturnType<typeof api.getMilestoneAction>> | null | undefined>(undefined)
  const [copied, setCopied] = useState(false)
  const [showSubmit, setShowSubmit] = useState(false)

  async function load() {
    const d = await api.getMilestoneAction(id)
    setData(d)
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (data === undefined) return <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
  if (data === null) return (
    <Card>
      <CardContent className="py-12 text-center text-sm text-muted-foreground">
        Milestone not found, or you don&apos;t have access.
      </CardContent>
    </Card>
  )

  const Icon = getDomainIcon(data.domain.icon)
  const color = data.domain.color || '#16a34a'
  const diff = difficultyMeta(data.difficulty)
  const mode = modeMeta(data.mode)
  const accepted = JSON.parse(data.acceptedInputTypes) as string[]

  const mySubmission = data.submissions.find(s => s.userId === user.id)

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(data!.promptTemplate)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success('Prompt copied. Paste into Claude, Gemini, or ChatGPT.')
    } catch {
      toast.error('Could not copy. Select the text manually.')
    }
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground">
        <ArrowLeft className="size-4 mr-1" /> Back to milestones
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="size-11 rounded-lg grid place-items-center shrink-0" style={{ background: `${color}20`, color }}>
              <Icon className="size-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <Badge variant="outline" className="text-[10px]">{data.domain.name}</Badge>
                <Badge variant="outline" className="text-[10px] capitalize">{mode.label}</Badge>
                <Badge variant="outline" className="text-[10px] capitalize" style={{ color: diff.color, borderColor: diff.color + '40' }}>{diff.label}</Badge>
                <Badge variant="outline" className="text-[10px]">{phaseLabel(data.weekOrPhase)}</Badge>
                {data.isLocked && (
                  <Badge variant="outline" className="text-[10px] text-muted-foreground gap-1">
                    <Lock className="size-2.5" /> v{data.version} locked
                  </Badge>
                )}
              </div>
              <CardTitle className="text-lg">{data.title}</CardTitle>
              <CardDescription className="mt-1">
                Authored by {data.creator.nickname} · v{data.version} · {data.submissions.length} submission{data.submissions.length === 1 ? '' : 's'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Prompt block */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-primary" /> AI prompt — copy and paste
              </p>
              <Button size="sm" variant="outline" onClick={copyPrompt}>
                {copied ? <Check className="size-3.5 mr-1 text-emerald-500" /> : <Copy className="size-3.5 mr-1" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <pre className="text-sm whitespace-pre-wrap font-mono leading-relaxed text-foreground/90 max-h-80 overflow-y-auto">
{data.promptTemplate}
            </pre>
          </div>

          {/* Submission flow */}
          <div className="mt-6">
            {mySubmission ? (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Check className="size-4 text-emerald-600" />
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">You submitted this milestone</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(mySubmission.clientSubmissionTimestamp), { addSuffix: true })}
                  {mySubmission.inputType === 'guided_form'
                    ? ' via guided form'
                    : mySubmission.inputType === 'freeform'
                      ? ' via freeform paste'
                      : ' via JSON paste'}
                </p>
                {mySubmission.aiScore !== null && (
                  <p className="text-xs mt-1">AI score: <span className="font-mono font-medium">{mySubmission.aiScore}</span></p>
                )}
                {mySubmission.reflection && (
                  <p className="text-xs mt-2 italic text-muted-foreground">&ldquo;{mySubmission.reflection}&rdquo;</p>
                )}
              </div>
            ) : data.status === 'active' ? (
              showSubmit ? (
                <SubmissionForm
                  milestoneId={data.id}
                  acceptedInputTypes={accepted}
                  onSubmit={async () => {
                    setShowSubmit(false)
                    await load()
                  }}
                  onCancel={() => setShowSubmit(false)}
                />
              ) : (
                <Button onClick={() => setShowSubmit(true)}>
                  <ClipboardList className="size-4 mr-1" /> Submit your result
                </Button>
              )
            ) : (
              <p className="text-sm text-muted-foreground">This milestone is no longer accepting submissions.</p>
            )}
          </div>

          {/* Submissions list (visibility-filtered on the server) */}
          {data.submissions.length > 0 && (
            <div className="mt-6">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">
                Submissions ({data.submissions.length})
              </p>
              <ScrollArea className="max-h-72">
                <div className="space-y-2">
                  {data.submissions.map((s) => {
                    const avatar = getAvatar(s.user.avatarId)
                    const isMine = s.userId === user.id
                    return (
                      <div key={s.id} className={cn(
                        'flex items-start gap-3 p-3 rounded-md border',
                        isMine && 'border-primary/30 bg-primary/5',
                      )}>
                        <Avatar className="size-8 border">
                          <AvatarFallback style={{ background: avatar.color, color: 'white' }} className="text-sm">{avatar.glyph}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{s.user.nickname}</p>
                            {isMine && <Badge variant="outline" className="text-[10px]">You</Badge>}
                            <span className="text-[11px] text-muted-foreground">
                              {formatDistanceToNow(new Date(s.clientSubmissionTimestamp), { addSuffix: true })}
                            </span>
                          </div>
                          {s.aiScore !== null && (
                            <p className="text-xs text-muted-foreground mt-0.5">AI score: <span className="font-mono">{s.aiScore}</span> · confidence {s.confidence}/5</p>
                          )}
                          {s.reflection && (
                            <p className="text-xs italic text-muted-foreground mt-1">&ldquo;{s.reflection}&rdquo;</p>
                          )}
                          {s.aiScore === null && !s.reflection && (
                            <p className="text-xs text-muted-foreground/70 mt-0.5">Submission recorded (private detail hidden)</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
              <p className="text-[11px] text-muted-foreground mt-2">
                AI scores, weakness tags, and reflections are private — visible only to the student, their domain captain, and instructors.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Submission form
// -----------------------------------------------------------------------------

function SubmissionForm({ milestoneId, acceptedInputTypes, onSubmit, onCancel }: {
  milestoneId: string
  acceptedInputTypes: string[]
  onSubmit: () => void
  onCancel: () => void
}) {
  const [tab, setTab] = useState<'guided_form' | 'json'>(acceptedInputTypes.includes('guided_form') ? 'guided_form' : 'json')
  const [pending, startTransition] = useTransition()

  // guided form state
  const [score, setScore] = useState<string>('')
  const [confidence, setConfidence] = useState<string>('3')
  const [tags, setTags] = useState<string>('')
  const [reflection, setReflection] = useState('')
  const [shareLink, setShareLink] = useState('')

  // json state
  const [jsonPayload, setJsonPayload] = useState(`{
  "score": null,
  "confidence": null,
  "weaknessTags": [],
  "reflection": ""
}`)

  function submit() {
    startTransition(async () => {
      if (tab === 'guided_form') {
        const result = await api.submitGuidedFormAction({
          milestoneId,
          aiScore: score.trim() ? Number(score) : undefined,
          confidence: Number(confidence),
          weaknessTags: tags.split(',').map(t => t.trim()).filter(Boolean),
          reflection: reflection.trim() || undefined,
          aiShareLink: shareLink.trim() || undefined,
        })
        if (result.ok) {
          toast.success('Submission recorded. Streak updated.')
          onSubmit()
        } else {
          toast.error(result.error)
        }
      } else {
        const result = await api.submitJsonAction({ milestoneId, jsonPayload, aiShareLink: shareLink.trim() || undefined })
        if (result.ok) {
          toast.success(
            result.mode === 'freeform'
              ? 'Saved as a freeform reflection. Streak updated.'
              : 'Submission recorded. Streak updated.',
          )
          onSubmit()
        } else {
          toast.error(result.error)
        }
      }
    })
  }

  return (
    <div className="rounded-lg border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Submit your result</p>
        <Button variant="ghost" size="sm" onClick={onCancel}><X className="size-4" /></Button>
      </div>

      {acceptedInputTypes.length > 1 && (
        <Tabs value={tab} onValueChange={(v) => setTab(v as 'guided_form' | 'json')}>
          <TabsList>
            {acceptedInputTypes.includes('guided_form') && <TabsTrigger value="guided_form"><FileText className="size-3 mr-1" /> Guided form</TabsTrigger>}
            {acceptedInputTypes.includes('json') && <TabsTrigger value="json"><Code2 className="size-3 mr-1" /> JSON paste</TabsTrigger>}
          </TabsList>
        </Tabs>
      )}

      {tab === 'guided_form' && (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Fill in what the AI session gave you. AI scores are private — only you, your captain, and instructors see them.
            They never feed the public leaderboard.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="score">AI score (optional)</Label>
              <Input id="score" type="number" value={score} onChange={(e) => setScore(e.target.value)} placeholder="e.g. 18" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confidence">Confidence (1-5)</Label>
              <Select value={confidence} onValueChange={setConfidence}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map(n => <SelectItem key={n} value={String(n)}>{n} — {['lost','shaky','okay','good','strong'][n-1]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tags">Weakness tags (comma-separated)</Label>
            <Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g. off-by-one, string immutability" />
            <p className="text-[11px] text-muted-foreground">Short phrases. Your captain uses these to plan future sessions.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reflection">Reflection (optional)</Label>
            <Textarea id="reflection" value={reflection} onChange={(e) => setReflection(e.target.value)} rows={3} placeholder="What clicked? What surprised you? What would you do differently?" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="share">AI session share link (optional)</Label>
            <Input id="share" value={shareLink} onChange={(e) => setShareLink(e.target.value)} placeholder="Claude/Gemini/ChatGPT share URL" />
          </div>
        </div>
      )}

      {tab === 'json' && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Paste the AI session output. If it&apos;s JSON, the app extracts <code>score</code>, <code>confidence</code>,
            <code>weaknessTags</code>, and <code>reflection</code> and stores the rest as-is. If it isn&apos;t JSON
            (e.g. a tutor or journal session that returned prose), the whole response is saved as your reflection —
            the streak still counts.
          </p>
          <Textarea
            value={jsonPayload}
            onChange={(e) => setJsonPayload(e.target.value)}
            rows={12}
            className="font-mono text-xs"
          />
          <div className="space-y-1.5">
            <Label htmlFor="share-json">AI session share link (optional)</Label>
            <Input id="share-json" value={shareLink} onChange={(e) => setShareLink(e.target.value)} placeholder="Claude/Gemini/ChatGPT share URL" />
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button onClick={submit} disabled={pending}>
          {pending ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Save className="size-4 mr-1.5" />}
          Submit
        </Button>
      </div>
    </div>
  )
}

function MilestonePathView({
  milestones,
  completedIds,
  onOpenMilestone,
}: {
  milestones: MilestoneWithMeta[]
  completedIds: Set<string>
  onOpenMilestone: (id: string) => void
}) {
  // Reverse milestones to show progression from early to late
  const orderedMilestones = useMemo(() => {
    return [...milestones].reverse()
  }, [milestones])

  if (orderedMilestones.length === 0) return null

  const height = orderedMilestones.length * 120

  return (
    <div className="relative py-8 overflow-x-hidden flex justify-center bg-background/30 rounded-2xl border border-border/50">
      <style>{`
        @keyframes path-flow {
          to {
            stroke-dashoffset: -24;
          }
        }
        .animate-path-flow {
          stroke-dasharray: 8, 4;
          animation: path-flow 1.2s linear infinite;
        }
        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 5px var(--glow-color), 0 0 10px var(--glow-color);
          }
          50% {
            box-shadow: 0 0 20px var(--glow-color), 0 0 35px var(--glow-color);
          }
        }
        .completed-glow {
          animation: pulse-glow 2s infinite ease-in-out;
        }
      `}</style>

      <div className="relative w-[320px] shrink-0" style={{ height: `${height}px` }}>
        {/* SVG connector path connecting all level nodes */}
        <div className="absolute inset-0 pointer-events-none">
          <svg className="w-full h-full" style={{ height: `${height}px` }} width="320" height={height}>
            <path
              d={orderedMilestones.map((_, index) => {
                const y = index * 120 + 32
                const x = index % 2 === 0 ? 80 : 240
                return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
              }).join(' ')}
              fill="none"
              stroke="currentColor"
              className="text-border"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d={orderedMilestones.map((_, index) => {
                const y = index * 120 + 32
                const x = index % 2 === 0 ? 80 : 240
                return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
              }).join(' ')}
              fill="none"
              stroke="currentColor"
              className="text-primary animate-path-flow"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Level nodes */}
        {orderedMilestones.map((m, index) => {
          const isCompleted = completedIds.has(m.id)
          const domain = domainMeta(m.domain.key)
          const DomainIcon = getDomainIcon(m.domain.icon)
          const diff = difficultyMeta(m.difficulty)
          
          const isEven = index % 2 === 0

          return (
            <div
              key={m.id}
              className="absolute w-full h-16 transition-all duration-300 group"
              style={{ top: `${index * 120}px` }}
            >
              {/* Level Circle Bubble */}
              <button
                onClick={() => onOpenMilestone(m.id)}
                className={cn(
                  "absolute size-16 rounded-full flex flex-col items-center justify-center border-4 transition-all duration-300 z-10 shadow-lg hover:scale-110",
                  isEven ? "left-[48px]" : "left-[208px]",
                  isCompleted 
                    ? "bg-background text-foreground completed-glow" 
                    : "bg-muted text-muted-foreground border-border/80 hover:border-muted-foreground"
                )}
                style={isCompleted ? { 
                  borderColor: domain.color,
                  '--glow-color': `${domain.color}40`
                } as React.CSSProperties : {}}
              >
                {isCompleted ? (
                  <div className="relative flex flex-col items-center justify-center">
                    <DomainIcon className="size-6 text-foreground" style={{ color: domain.color }} />
                    <span className="absolute -bottom-2 bg-emerald-500 text-white rounded-full p-0.5 border border-background">
                      <Check className="size-2.5 stroke-[4]" />
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <span className="text-[9px] uppercase font-bold tracking-wider opacity-60">Lvl</span>
                    <span className="text-sm font-black font-mono leading-none">{index + 1}</span>
                  </div>
                )}
              </button>

              {/* Level Info Plate */}
              <div 
                onClick={() => onOpenMilestone(m.id)}
                className={cn(
                  "absolute top-[-4px] w-[144px] p-2.5 rounded-xl border bg-card/90 backdrop-blur-md shadow-sm transition-all duration-300 group-hover:shadow-md cursor-pointer hover:border-primary/40",
                  isEven ? "left-[128px] text-left" : "right-[128px] text-right"
                )}
              >
                <div className={cn("flex items-center gap-1 mb-1", isEven ? "justify-between" : "justify-between flex-row-reverse")}>
                  <span className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground truncate">{phaseLabel(m.weekOrPhase)}</span>
                  <span 
                    className="text-[8px] font-bold px-1.5 py-0.5 rounded-full capitalize shrink-0"
                    style={{ background: `${diff.color}15`, color: diff.color }}
                  >
                    {diff.label}
                  </span>
                </div>
                <h4 className="text-[11px] font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                  {m.title}
                </h4>
                <div className={cn("flex items-center gap-1 mt-1 text-[9px] text-muted-foreground font-medium", isEven ? "" : "justify-end")}>
                  <span className="capitalize">{m.mode}</span>
                  <span>·</span>
                  <span className="font-semibold" style={{ color: domain.color }}>
                    {domain.shortName}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
