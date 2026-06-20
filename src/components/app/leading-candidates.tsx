'use client'

import { api, CandidateEvaluationMeta } from '@/lib/api-client'
import { useEffect, useState, useTransition } from 'react'
import {
  Loader2, Sparkles, Crown, Users, Plus, Copy, Check, X, Save,
  ShieldCheck, History, ArrowRight, Star, AlertCircle,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { getAvatar } from '@/lib/avatars'
import { DOMAINS, domainMeta } from '@/lib/domains'
import type { SessionUser } from '@/lib/auth'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

type Candidate = {
  userId: string
  nickname: string
  avatarId: string
  realName: string | null
  studentId: string | null
  isCaptain: boolean
  assessmentCount: number
  assessmentAvg: number
  assessmentBest: number
  streak: number
  proctoredScore: number | null
  proctoredCount: number
  latestEval: CandidateEvaluationMeta | null
}

type SuggestedPair = {
  a: { userId: string; nickname: string; avatarId: string }
  b: { userId: string; nickname: string; avatarId: string }
  combinedAssessmentAvg: number
  combinedStreak: number
  sharedWeaknesses: string[]
  distinctWeaknesses: string[]
  latestEvalId: string | null
}

export function LeadingCandidates({ user }: { user: SessionUser }) {
  const [activeDomain, setActiveDomain] = useState<string>(DOMAINS[0].key)
  const [data, setData] = useState<{ evaluations: CandidateEvaluationMeta[]; candidates: Candidate[] } | null>(null)
  const [pairs, setPairs] = useState<SuggestedPair[] | null>(null)
  const [evalDialog, setEvalDialog] = useState<{ userId: string; pairPartnerId?: string | null } | null>(null)
  const [historyDialog, setHistoryDialog] = useState<{ userId: string } | null>(null)

  async function load() {
    setData(null); setPairs(null)
    const domainId = await resolveDomainId(activeDomain)
    if (!domainId) return
    const [d, p] = await Promise.all([
      api.listCandidateEvaluationsAction(domainId),
      api.suggestPairsAction(domainId),
    ])
    setData(d)
    setPairs(p)
  }

  useEffect(() => { void load() }, [activeDomain])

  return (
    <div className="space-y-4">
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" /> Leading Candidates
          </CardTitle>
          <CardDescription>
            A staff-only decision-support panel. AI reads of each candidate, built from practice history and (once they exist) proctored results. Manually triggered per student or pair — never auto-runs.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-2">
          <p className="flex items-start gap-2">
            <AlertCircle className="size-3.5 mt-0.5 shrink-0 text-amber-600" />
            <span>
              <strong>The hard line:</strong> this panel never writes to team selections by itself. It produces a recommendation a human reads. A human still has to take the separate, explicit action of creating a team selection from the Team Selection view. No auto-fill, no default-checked box, no bulk approve.
            </span>
          </p>
          <p className="flex items-start gap-2">
            <AlertCircle className="size-3.5 mt-0.5 shrink-0 text-amber-600" />
            <span>
              Students have <strong>no read path</strong> to this data — not even their own evaluation. Seeing &quot;the AI thinks you should be paired with X&quot; before staff have decided would create exactly the kind of premature, gameable signal the system is built to avoid.
            </span>
          </p>
        </CardContent>
      </Card>

      <Tabs value={activeDomain} onValueChange={setActiveDomain}>
        <TabsList className="w-full justify-start overflow-x-auto flex-wrap h-auto">
          {DOMAINS.map(d => (
            <TabsTrigger key={d.key} value={d.key} className="gap-1.5">
              <d.icon className="size-3.5" /> {d.shortName}
              {d.pairBased && <Users className="size-3 text-muted-foreground" />}
            </TabsTrigger>
          ))}
        </TabsList>

        {DOMAINS.map(d => (
          <TabsContent key={d.key} value={d.key}>
            {activeDomain === d.key && (
              <DomainCandidatesPanel
                domainKey={d.key}
                data={data}
                pairs={pairs}
                user={user}
                onRunEval={(userId, pairPartnerId) => setEvalDialog({ userId, pairPartnerId: pairPartnerId ?? null })}
                onViewHistory={(userId) => setHistoryDialog({ userId })}
                onChanged={load}
              />
            )}
          </TabsContent>
        ))}
      </Tabs>

      {evalDialog && (
        <EvaluationDialog
          domainKey={activeDomain}
          userId={evalDialog.userId}
          pairPartnerId={evalDialog.pairPartnerId ?? null}
          onClose={() => setEvalDialog(null)}
          onSaved={() => { setEvalDialog(null); void load() }}
        />
      )}

      {historyDialog && (
        <HistoryDialog
          domainKey={activeDomain}
          userId={historyDialog.userId}
          evaluations={data?.evaluations ?? []}
          onClose={() => setHistoryDialog(null)}
        />
      )}
    </div>
  )
}

// Helper to resolve a domain key to its ID — fetches the list once and caches.
const domainIdCache = new Map<string, string>()
async function resolveDomainId(domainKey: string): Promise<string | null> {
  if (domainIdCache.has(domainKey)) return domainIdCache.get(domainKey)!
  const domains = await api.listDomainsAction()
  const d = domains.find(x => x.key === domainKey)
  if (d) {
    domainIdCache.set(domainKey, d.id)
    return d.id
  }
  return null
}

function DomainCandidatesPanel({
  domainKey, data, pairs, user, onRunEval, onViewHistory, onChanged,
}: {
  domainKey: string
  data: { evaluations: CandidateEvaluationMeta[]; candidates: Candidate[] } | null
  pairs: SuggestedPair[] | null
  user: SessionUser
  onRunEval: (userId: string, pairPartnerId?: string | null) => void
  onViewHistory: (userId: string) => void
  onChanged: () => void
}) {
  const meta = domainMeta(domainKey)
  const Icon = meta.icon
  void user; void onChanged

  if (!data || !pairs) {
    return <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg grid place-items-center" style={{ background: `${meta.color}20`, color: meta.color }}>
              <Icon className="size-5" />
            </div>
            <div>
              <CardTitle className="text-base">{meta.name} — candidates</CardTitle>
              <CardDescription>
                {meta.pairBased ? 'Pair-based contest — 2 slots.' : 'Solo contest — 1 slot.'} Sorted by proctored score first, then assessment average, then streak.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.candidates.length === 0 && (
            <p className="text-sm text-muted-foreground py-6 text-center">No students with activity in this domain yet.</p>
          )}
          {data.candidates.map((c) => (
            <CandidateRow
              key={c.userId}
              candidate={c}
              domainKey={domainKey}
              onRunEval={() => onRunEval(c.userId)}
              onViewHistory={() => onViewHistory(c.userId)}
            />
          ))}
        </CardContent>
      </Card>

      {/* Suggested pairings — only for paired domains */}
      {meta.pairBased && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="size-4" /> Suggested pairings
            </CardTitle>
            <CardDescription>
              Top candidate pairs by combined assessment average + combined streak, with a small bonus for complementary weakness profiles (fewer shared weaknesses). The staff still makes the final call — these are suggestions, not selections.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {pairs.length === 0 && (
              <p className="text-sm text-muted-foreground py-6 text-center">Need at least 2 students with assessment submissions or proctored scores to suggest pairs.</p>
            )}
            {pairs.map((p, idx) => {
              const aAvatar = getAvatar(p.a.avatarId)
              const bAvatar = getAvatar(p.b.avatarId)
              return (
                <div key={`${p.a.userId}-${p.b.userId}`} className="flex items-center gap-3 p-3 rounded-md border">
                  <span className="text-xs font-mono w-5 text-muted-foreground text-right">{idx + 1}</span>
                  <div className="flex items-center gap-2">
                    <Avatar className="size-8 border"><AvatarFallback style={{ background: aAvatar.color, color: 'white' }} className="text-xs">{aAvatar.glyph}</AvatarFallback></Avatar>
                    <span className="text-sm font-medium">{p.a.nickname}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">+</span>
                  <div className="flex items-center gap-2">
                    <Avatar className="size-8 border"><AvatarFallback style={{ background: bAvatar.color, color: 'white' }} className="text-xs">{bAvatar.glyph}</AvatarFallback></Avatar>
                    <span className="text-sm font-medium">{p.b.nickname}</span>
                  </div>
                  <div className="flex-1" />
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-muted-foreground">combined avg: <span className="font-mono font-medium text-foreground">{p.combinedAssessmentAvg}</span></span>
                    <span className="text-muted-foreground">streaks: <span className="font-mono font-medium text-foreground">{p.combinedStreak}wk</span></span>
                    {p.sharedWeaknesses.length > 0 && (
                      <Badge variant="outline" className="text-[10px] text-amber-700 dark:text-amber-400 border-amber-600/30">
                        {p.sharedWeaknesses.length} shared weakness{p.sharedWeaknesses.length === 1 ? '' : 'es'}
                      </Badge>
                    )}
                    {p.sharedWeaknesses.length === 0 && p.distinctWeaknesses.length > 0 && (
                      <Badge variant="outline" className="text-[10px] text-emerald-700 dark:text-emerald-400 border-emerald-600/30">
                        complementary
                      </Badge>
                    )}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => {
                    // Open eval dialog with this pair
                    const event = new CustomEvent('open-pair-eval', { detail: { userId: p.a.userId, pairPartnerId: p.b.userId } })
                    window.dispatchEvent(event)
                  }}>
                    <Sparkles className="size-3 mr-1" /> Evaluate pair
                  </Button>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function CandidateRow({
  candidate, domainKey, onRunEval, onViewHistory,
}: {
  candidate: Candidate
  domainKey: string
  onRunEval: () => void
  onViewHistory: () => void
}) {
  const avatar = getAvatar(candidate.avatarId)
  const meta = domainMeta(domainKey)
  void meta

  return (
    <div className="flex items-start gap-3 p-3 rounded-md border">
      <Avatar className="size-10 border mt-0.5"><AvatarFallback style={{ background: avatar.color, color: 'white' }} className="text-base">{avatar.glyph}</AvatarFallback></Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium">{candidate.nickname}</p>
          {candidate.isCaptain && <Badge variant="outline" className="text-[10px]">Captain</Badge>}
          {candidate.realName && <span className="text-xs text-muted-foreground">({candidate.realName})</span>}
        </div>
        <div className="flex items-center gap-3 flex-wrap text-[11px] text-muted-foreground mt-0.5">
          <span>assessments: <span className="font-mono text-foreground">{candidate.assessmentCount}</span></span>
          {candidate.assessmentCount > 0 && <span>avg: <span className="font-mono text-foreground">{candidate.assessmentAvg}</span></span>}
          {candidate.assessmentBest > 0 && <span>best: <span className="font-mono text-foreground">{candidate.assessmentBest}</span></span>}
          <span>streak: <span className="font-mono text-foreground">{candidate.streak}wk</span></span>
          {candidate.proctoredScore !== null && (
            <span className="text-amber-700 dark:text-amber-400 font-medium">proctored best: <span className="font-mono">{candidate.proctoredScore}</span> ({candidate.proctoredCount} mock{candidate.proctoredCount === 1 ? '' : 's'})</span>
          )}
        </div>

        {candidate.latestEval && (
          <div className="mt-2 pt-2 border-t">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-[10px] capitalize">{candidate.latestEval.evaluationBasis.replace('_', ' ')}</Badge>
              <span className="text-[10px] text-muted-foreground">by {candidate.latestEval.evaluatorNickname} · {formatDistanceToNow(new Date(candidate.latestEval.createdAt), { addSuffix: true })}</span>
              <button onClick={onViewHistory} className="text-[10px] text-primary hover:underline ml-auto">
                View history
              </button>
            </div>
            <p className="text-xs text-foreground/90">{candidate.latestEval.aiSummary}</p>
            {candidate.latestEval.strengths.length > 0 && (
              <p className="text-[11px] mt-1"><span className="text-emerald-700 dark:text-emerald-400 font-medium">Strengths:</span> {candidate.latestEval.strengths.join(' · ')}</p>
            )}
            {candidate.latestEval.weaknesses.length > 0 && (
              <p className="text-[11px] mt-0.5"><span className="text-amber-700 dark:text-amber-400 font-medium">Weaknesses:</span> {candidate.latestEval.weaknesses.join(' · ')}</p>
            )}
            {candidate.latestEval.recommendation && (
              <p className="text-[11px] mt-0.5 italic text-muted-foreground">&ldquo;{candidate.latestEval.recommendation}&rdquo;</p>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1 shrink-0">
        <Button size="sm" variant="outline" onClick={onRunEval}>
          <Sparkles className="size-3 mr-1" /> {candidate.latestEval ? 'Re-evaluate' : 'Evaluate'}
        </Button>
        {candidate.latestEval && (
          <Button size="sm" variant="ghost" onClick={onViewHistory} className="text-xs">
            <History className="size-3 mr-1" /> History
          </Button>
        )}
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Evaluation dialog — assembles prompt, staff copies it, runs AI, pastes result back
// -----------------------------------------------------------------------------

function EvaluationDialog({
  domainKey, userId, pairPartnerId, onClose, onSaved,
}: {
  domainKey: string
  userId: string
  pairPartnerId: string | null
  onClose: () => void
  onSaved: () => void
}) {
  const [phase, setPhase] = useState<'prompt' | 'result'>('prompt')
  const [prompt, setPrompt] = useState<string>('')
  const [basis, setBasis] = useState<'practice_only' | 'proctored_only' | 'combined'>('practice_only')
  const [copied, setCopied] = useState(false)
  const [pending, startTransition] = useTransition()

  // Result form state
  const [aiSummary, setAiSummary] = useState('')
  const [strengthsText, setStrengthsText] = useState('')
  const [weaknessesText, setWeaknessesText] = useState('')
  const [complementarity, setComplementarity] = useState('')
  const [recommendation, setRecommendation] = useState('')
  const [rawJson, setRawJson] = useState('')

  useEffect(() => {
    void (async () => {
      const domainId = await resolveDomainId(domainKey)
      if (!domainId) return
      try {
        const result = await api.buildEvaluationPromptAction({ domainId, userId, pairPartnerId })
        setPrompt(result.prompt)
        setBasis(result.basis)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to build prompt')
      }
    })()
  }, [domainKey, userId, pairPartnerId])

  // Listen for the "evaluate pair" custom event from suggested pairings
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { userId: string; pairPartnerId: string }
      void (async () => {
        const domainId = await resolveDomainId(domainKey)
        if (!domainId) return
        try {
          const result = await api.buildEvaluationPromptAction({ domainId, userId: detail.userId, pairPartnerId: detail.pairPartnerId })
          setPrompt(result.prompt)
          setBasis(result.basis)
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Failed to build prompt')
        }
      })()
    }
    window.addEventListener('open-pair-eval', handler)
    return () => window.removeEventListener('open-pair-eval', handler)
  }, [domainKey])

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success('Prompt copied. Paste into Claude, Gemini, or ChatGPT.')
    } catch {
      toast.error('Could not copy. Select manually.')
    }
  }

  function parseAndFillFromJson() {
    try {
      const parsed = JSON.parse(rawJson)
      if (parsed.aiSummary) setAiSummary(parsed.aiSummary)
      if (Array.isArray(parsed.strengths)) setStrengthsText(parsed.strengths.join('\n'))
      if (Array.isArray(parsed.weaknesses)) setWeaknessesText(parsed.weaknesses.join('\n'))
      if (parsed.complementarity) setComplementarity(parsed.complementarity)
      if (parsed.recommendation) setRecommendation(parsed.recommendation)
      toast.success('Filled from JSON.')
    } catch {
      toast.error('Invalid JSON.')
    }
  }

  function save() {
    startTransition(async () => {
      const domainId = await resolveDomainId(domainKey)
      if (!domainId) { toast.error('Domain not found.'); return }
      const r = await api.createCandidateEvaluationAction({
        domainId, userId, pairPartnerId,
        evaluationBasis: basis,
        aiSummary,
        strengths: strengthsText.split('\n').map(s => s.trim()).filter(Boolean),
        weaknesses: weaknessesText.split('\n').map(s => s.trim()).filter(Boolean),
        complementarity: pairPartnerId ? complementarity : undefined,
        recommendation: recommendation || undefined,
        rawPayload: rawJson || '{}',
      })
      if (r.ok) {
        toast.success('Evaluation recorded.')
        onSaved()
      } else {
        toast.error(r.error)
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start sm:items-center justify-center p-4 overflow-y-auto">
      <Card className="w-full max-w-3xl my-8">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">
              {pairPartnerId ? 'Evaluate candidate pair' : 'Evaluate candidate'}
            </CardTitle>
            <CardDescription>
              Manually triggered. Basis: <span className="capitalize font-medium">{basis.replace('_', ' ')}</span>. Append-only — adds a new row, doesn&apos;t overwrite previous evaluations.
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="size-4" /></Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={phase} onValueChange={(v) => setPhase(v as 'prompt' | 'result')}>
            <TabsList>
              <TabsTrigger value="prompt">1. Copy prompt</TabsTrigger>
              <TabsTrigger value="result">2. Paste result</TabsTrigger>
            </TabsList>

            <TabsContent value="prompt" className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Copy this prompt into Claude, Gemini, or ChatGPT. The AI assembles a read from the candidate&apos;s practice history {pairPartnerId ? 'and their pair partner\'s' : ''}, plus proctored results if any exist. Bring the structured JSON back to the next tab.
              </p>
              <div className="rounded-md border bg-muted/30 p-3 max-h-72 overflow-y-auto">
                <pre className="text-xs whitespace-pre-wrap font-mono">{prompt || 'Loading…'}</pre>
              </div>
              <div className="flex gap-2">
                <Button onClick={copyPrompt} disabled={!prompt}>
                  {copied ? <Check className="size-3.5 mr-1 text-emerald-500" /> : <Copy className="size-3.5 mr-1" />}
                  {copied ? 'Copied' : 'Copy prompt'}
                </Button>
                <Button variant="outline" onClick={() => setPhase('result')}>
                  I&apos;ve run the AI <ArrowRight className="size-3.5 ml-1" />
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="result" className="space-y-3">
              <div className="rounded-md border p-3 bg-muted/30">
                <Label className="text-xs">Optional: paste the AI&apos;s JSON output to auto-fill</Label>
                <Textarea
                  value={rawJson}
                  onChange={(e) => setRawJson(e.target.value)}
                  rows={5}
                  placeholder='{"aiSummary": "...", "strengths": [...], "weaknesses": [...], "recommendation": "..."}'
                  className="font-mono text-xs mt-1.5"
                />
                <Button size="sm" variant="outline" className="mt-2" onClick={parseAndFillFromJson}>
                  Fill from JSON
                </Button>
              </div>

              <div className="space-y-1.5">
                <Label>AI summary <span className="text-destructive">*</span></Label>
                <Textarea
                  value={aiSummary}
                  onChange={(e) => setAiSummary(e.target.value)}
                  rows={3}
                  placeholder="2-4 sentence honest read of where this candidate stands right now"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Strengths (one per line)</Label>
                  <Textarea
                    value={strengthsText}
                    onChange={(e) => setStrengthsText(e.target.value)}
                    rows={4}
                    placeholder={'Strong on syntax\nConsistent weekly practice\nClean code style'}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Weaknesses (one per line)</Label>
                  <Textarea
                    value={weaknessesText}
                    onChange={(e) => setWeaknessesText(e.target.value)}
                    rows={4}
                    placeholder={'Off-by-one errors\nBitmask DP not intuitive\nLow confidence under time pressure'}
                  />
                </div>
              </div>

              {pairPartnerId && (
                <div className="space-y-1.5">
                  <Label>Complementarity (pair only)</Label>
                  <Textarea
                    value={complementarity}
                    onChange={(e) => setComplementarity(e.target.value)}
                    rows={2}
                    placeholder="How they complement (or fail to complement) each other"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Recommendation (coaching note)</Label>
                <Textarea
                  value={recommendation}
                  onChange={(e) => setRecommendation(e.target.value)}
                  rows={2}
                  placeholder="What to watch for, what to drill, whether to lock them in or wait"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="ghost" onClick={() => setPhase('prompt')}>Back to prompt</Button>
                <Button onClick={save} disabled={pending || aiSummary.trim().length < 10}>
                  {pending ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Save className="size-4 mr-1.5" />}
                  Save evaluation
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

function HistoryDialog({
  domainKey, userId, evaluations, onClose,
}: {
  domainKey: string
  userId: string
  evaluations: CandidateEvaluationMeta[]
  onClose: () => void
}) {
  void domainKey
  const userEvals = evaluations.filter(e => e.userId === userId || e.pairedWithUserId === userId)

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start sm:items-center justify-center p-4 overflow-y-auto">
      <Card className="w-full max-w-2xl my-8">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Evaluation history</CardTitle>
            <CardDescription>Append-only — every evaluation stays as a permanent record for audit.</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="size-4" /></Button>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-3">
              {userEvals.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">No evaluations yet for this candidate.</p>
              )}
              {userEvals.map((e) => (
                <div key={e.id} className="p-3 rounded-md border">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px] capitalize">{e.evaluationBasis.replace('_', ' ')}</Badge>
                    <span className="text-[11px] text-muted-foreground">by {e.evaluatorNickname} · {formatDistanceToNow(new Date(e.createdAt), { addSuffix: true })}</span>
                  </div>
                  <p className="text-sm">{e.aiSummary}</p>
                  {e.strengths.length > 0 && (
                    <p className="text-xs mt-1"><span className="text-emerald-700 dark:text-emerald-400 font-medium">Strengths:</span> {e.strengths.join(' · ')}</p>
                  )}
                  {e.weaknesses.length > 0 && (
                    <p className="text-xs mt-0.5"><span className="text-amber-700 dark:text-amber-400 font-medium">Weaknesses:</span> {e.weaknesses.join(' · ')}</p>
                  )}
                  {e.complementarity && (
                    <p className="text-xs mt-0.5"><span className="text-primary font-medium">Complementarity:</span> {e.complementarity}</p>
                  )}
                  {e.recommendation && (
                    <p className="text-xs mt-0.5 italic text-muted-foreground">&ldquo;{e.recommendation}&rdquo;</p>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

void Crown
void Plus
void Star
