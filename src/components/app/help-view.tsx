'use client'

// Tutorial / Help / System walkthrough.
//
// This is the "everything you need to know about how the system works" page.
// It's deliberately long-form and structured as a left-rail of sections so a
// confused new user (or an existing user who forgot a rule) can jump to the
// exact thing they're unsure about — the practice loop, the wall between
// practice and selection, proctored mocks, team selection, the three
// milestone modes, the leaderboard, leading candidates, and roles.
//
// The content is kept here (not in the DB) on purpose: it's documentation of
// the system's invariants, and those invariants live in the code. If the
// rules ever change, this file is the single place to update them.

import { useEffect, useState } from 'react'
import {
  HelpCircle, Flame, ListChecks, Trophy, ClipboardCheck, Users, Sparkles,
  Shield, Lock, BookOpen, Target, GitBranch, Crown, AlertTriangle, CheckCircle2,
  Code2, Brain, Database, Globe, Network, Terminal, ArrowRight, Lightbulb, FileText,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useApp, type ViewKey } from '@/lib/app-store'
import { DOMAINS, MODES, getDomainIcon } from '@/lib/domains'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api-client'
import type { SessionUser } from '@/lib/auth'
import { TriviaTest } from './trivia-test'

type SectionKey =
  | 'overview' | 'practice-loop' | 'milestones' | 'modes' | 'wall'
  | 'proctored' | 'team' | 'leaderboard' | 'leading' | 'roles'
  | 'calendar' | 'faq' | 'trivia'

const SECTIONS: Array<{ key: SectionKey; label: string; icon: typeof HelpCircle }> = [
  { key: 'overview',      label: 'How the system works',  icon: HelpCircle },
  { key: 'practice-loop', label: 'The weekly practice loop', icon: Flame },
  { key: 'milestones',    label: 'Milestones & prompts',  icon: ListChecks },
  { key: 'modes',         label: 'The three modes',       icon: BookOpen },
  { key: 'wall',          label: 'The wall (practice vs. selection)', icon: Shield },
  { key: 'proctored',     label: 'Proctored mocks',       icon: ClipboardCheck },
  { key: 'team',          label: 'Team selection',        icon: Users },
  { key: 'leaderboard',   label: 'Leaderboards',          icon: Trophy },
  { key: 'leading',       label: 'Leading Candidates',    icon: Sparkles },
  { key: 'roles',         label: 'Roles & permissions',   icon: Crown },
  { key: 'calendar',      label: 'Season calendar',       icon: Target },
  { key: 'faq',           label: 'Common questions',      icon: Lightbulb },
  { key: 'trivia',        label: 'Quick Trivia Test',     icon: Brain },
]

export function HelpView({ user }: { user: SessionUser }) {
  const [active, setActive] = useState<SectionKey>('overview')
  const [domains, setDomains] = useState<Awaited<ReturnType<typeof api.listDomainsAction>>>([])

  const isStaff = user.role === 'admin' || user.role === 'instructor' || (user.captainOf?.length ?? 0) > 0

  const filteredSections = SECTIONS.filter(s => {
    if (s.key === 'leading' && !isStaff) return false
    return true
  })

  useEffect(() => {
    async function loadDomains() {
      try {
        const data = await api.listDomainsAction()
        setDomains(data)
      } catch (err) {
        console.error('Failed to load domains', err)
      }
    }
    void loadDomains()
  }, [])

  // Scroll to top whenever the section changes — long-form content otherwise
  // keeps the user's previous scroll position, which is disorienting.
  useEffect(() => {
    const el = document.getElementById('help-content')
    el?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [active])

  return (
    <div className="space-y-4">
      {/* Community Discord Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-violet-500 to-amber-500 p-6 text-white shadow-md animate-in fade-in duration-300">
        {/* Decorative background shape */}
        <div className="absolute right-0 top-0 -mt-4 -mr-4 size-32 rounded-full bg-white/10 blur-2xl animate-pulse" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <h3 className="text-base font-bold flex items-center gap-2">
              <span>🌟</span> You're part of something bigger.
            </h3>
            <p className="text-xs text-white/90 leading-relaxed">
              Our community Discord is where the real prep happens — tips, practice runs, announcements, and teammates cheering each other on. If your account approval is taking longer than expected, just ping an admin there. We're friendly, we're fast, and we want you here. 💬
            </p>
          </div>
          <div className="shrink-0 flex items-center">
            <a
              href={process.env.NEXT_PUBLIC_DISCORD_INVITE_URL || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-violet-600 hover:bg-white/90 font-semibold text-xs transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm select-none"
            >
              Join the Discord Server
              <ArrowRight className="size-3.5" />
            </a>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        {/* Section rail */}
        <nav className="lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardContent className="p-2">
              <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible">
                {filteredSections.map(s => {
                  const Icon = s.icon
                  const isActive = active === s.key
                  return (
                    <button
                      key={s.key}
                      onClick={() => setActive(s.key)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-md text-sm whitespace-nowrap lg:whitespace-normal text-left transition-colors',
                        isActive ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-accent',
                      )}
                    >
                      <Icon className="size-4 shrink-0" />
                      <span className="truncate">{s.label}</span>
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </nav>

        {/* Content */}
        <div id="help-content" className="min-h-[60vh]">
          {active === 'overview'      && <OverviewSection onJump={setActive} isStaff={isStaff} />}
          {active === 'practice-loop' && <PracticeLoopSection />}
          {active === 'milestones'    && <MilestonesSection isStaff={isStaff} />}
          {active === 'modes'         && <ModesSection />}
          {active === 'wall'          && <WallSection />}
          {active === 'proctored'     && <ProctoredSection isStaff={isStaff} />}
          {active === 'team'          && <TeamSection isStaff={isStaff} />}
          {active === 'leaderboard'   && <LeaderboardSection />}
          {active === 'leading'       && isStaff && <LeadingSection />}
          {active === 'roles'         && <RolesSection user={user} />}
          {active === 'calendar'      && <CalendarSection domains={domains} />}
          {active === 'faq'           && <FaqSection isStaff={isStaff} />}
          {active === 'trivia'        && <TriviaTest />}
        </div>
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Shared building blocks
// -----------------------------------------------------------------------------

function Goto({ view, label }: { view: ViewKey; label: string }) {
  const { setView } = useApp()
  return (
    <button
      onClick={() => setView(view)}
      className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
    >
      {label} <ArrowRight className="size-3" />
    </button>
  )
}

function Callout({ kind, title, children }: {
  kind: 'info' | 'warn' | 'rule'
  title: string
  children: React.ReactNode
}) {
  const styles = {
    info: { border: 'border-primary/30', bg: 'bg-primary/5', icon: Sparkles, iconColor: 'text-primary' },
    warn: { border: 'border-amber-500/40', bg: 'bg-amber-500/5', icon: AlertTriangle, iconColor: 'text-amber-600' },
    rule: { border: 'border-emerald-500/40', bg: 'bg-emerald-500/5', icon: Shield, iconColor: 'text-emerald-600' },
  }[kind]
  const Icon = styles.icon
  return (
    <div className={cn('rounded-lg border p-4 my-3', styles.border, styles.bg)}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={cn('size-4', styles.iconColor)} />
        <p className="text-sm font-medium">{title}</p>
      </div>
      <div className="text-sm text-muted-foreground space-y-1">{children}</div>
    </div>
  )
}

function H({ children }: { children: React.ReactNode }) {
  return <h3 className="text-base font-semibold tracking-tight mt-5 mb-2 first:mt-0">{children}</h3>
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground leading-relaxed mb-2">{children}</p>
}

const DOMAIN_ICONS: Record<string, typeof Code2> = {
  db: Database, java: Code2, quiz: Brain, web: Globe, python: Terminal, net: Network,
}

// -----------------------------------------------------------------------------
// Sections
// -----------------------------------------------------------------------------

function OverviewSection({ onJump, isStaff }: { onJump: (s: SectionKey) => void; isStaff: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">How the system works</CardTitle>
        <CardDescription>The 30-second version, then where to go next.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <P>
          <strong>Road to IT Olympics</strong> is a four-month prep track for the 15th IT Skills Olympics. It builds a
          low-friction weekly practice habit around AI-guided prompts, and ends with a real proctored gate that decides
          who actually represents the school in November.
        </P>

        <P>The whole system is built around one rule:</P>

        <Callout kind="rule" title="The one rule">
          <p>
            Practice data is a coaching signal — it informs decisions, but it never <em>decides</em> who makes the team.
            Only the proctored mock does that, because it&apos;s the one thing that can&apos;t be faked.
          </p>
        </Callout>

        <H>The flow at a glance</H>
        <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
          <li>
            <button onClick={() => onJump('practice-loop')} className="text-primary hover:underline">Each week, you open a milestone</button>,
            copy its AI prompt into Claude/Gemini/ChatGPT, and run a session.
          </li>
          <li>
            <button onClick={() => onJump('milestones')} className="text-primary hover:underline">You submit the result</button> — a guided form,
            JSON, or a freeform reflection depending on the mode. Your streak updates.
          </li>
          <li>
            <button onClick={() => onJump('leaderboard')} className="text-primary hover:underline">The public leaderboard</button> ranks by streak
            and completion — never by AI score. Assessment scores have their own separate board.
          </li>
          <li>
            <button onClick={() => onJump('proctored')} className="text-primary hover:underline">In October, captains run proctored mocks</button> —
            full-dress rehearsals in the real restricted conditions.
          </li>
          <li>
            <button onClick={() => onJump('team')} className="text-primary hover:underline">Team selection is based ONLY on those mocks.</button> Practice
            diagnostics inform the call but cannot substitute for it.
          </li>
        </ol>

        <div className="grid sm:grid-cols-2 gap-2 mt-4 not-prose">
          {isStaff ? (
            <>
              <GotoCard view="admin-milestones" icon={FileText} title="Author Milestones" desc="Create and edit weekly prompts" />
              <GotoCard view="leading" icon={Sparkles} title="Leading Candidates" desc="Review streaks and evaluate candidates" />
            </>
          ) : (
            <>
              <GotoCard view="milestones" icon={ListChecks} title="Browse milestones" desc="See this week's open prompts" />
              <GotoCard view="dashboard" icon={Flame} title="My dashboard" desc="Your streaks and submissions" />
            </>
          )}
          <GotoCard view="proctored" icon={ClipboardCheck} title="Proctored mocks" desc="The eligibility gate" />
          <GotoCard view="leaderboard" icon={Trophy} title="Leaderboard" desc="Where you stand by streak" />
        </div>
      </CardContent>
    </Card>
  )
}

function GotoCard({ view, icon: Icon, title, desc }: { view: ViewKey; icon: typeof Flame; title: string; desc: string }) {
  const { setView } = useApp()
  return (
    <button
      onClick={() => setView(view)}
      className="flex items-start gap-3 p-3 rounded-md border text-left hover:bg-accent/50 transition-colors"
    >
      <div className="size-8 rounded-md bg-primary/10 text-primary grid place-items-center shrink-0">
        <Icon className="size-4" />
      </div>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </button>
  )
}

function PracticeLoopSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2"><Flame className="size-5 text-orange-500" /> The weekly practice loop</CardTitle>
        <CardDescription>The habit the whole season is built on.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <P>Each week, for each domain you&apos;re tracking, the loop is:</P>
        <ol className="space-y-2 text-sm list-decimal list-inside">
          <li><strong>Open the milestone.</strong> Captains and instructors author one prompt per domain per week. It&apos;s a ready-to-paste instruction for your AI tool.</li>
          <li><strong>Copy the prompt</strong> into Claude, Gemini, or ChatGPT.</li>
          <li><strong>Run the session.</strong> Work the problems. The prompt enforces contest conditions (no IDE for Java, notepad-only for Web, etc.).</li>
          <li><strong>Submit the result</strong> back here — score, weaknesses, confidence, and a short reflection. This is what your captain reads.</li>
        </ol>

        <Callout kind="info" title="The streak">
          <p>
            Each domain keeps its own streak. Submit at least once in a week (Monday–Sunday, Manila time) and the streak
            grows. Miss a week that has an active milestone and it resets. Consistency is mastery — that&apos;s the point.
          </p>
        </Callout>

        <H>What gets stored, and who sees it</H>
        <P>
          Your AI score, weakness tags, confidence, and reflection are <strong>private</strong>. Only you, your domain
          captain, and instructors can see them. Other students only see that you submitted — not your score, not your
          reflection. See <em>The wall</em> for why.
        </P>

        <Goto view="milestones" label="Browse open milestones" />
      </CardContent>
    </Card>
  )
}

function MilestonesSection({ isStaff }: { isStaff: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2"><ListChecks className="size-5 text-primary" /> Milestones &amp; prompts</CardTitle>
        <CardDescription>What a milestone is and how to work one.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <P>
          A <strong>milestone</strong> is a single unit of weekly practice: a prompt, a difficulty, a phase, and a mode.
          Think of it as a pre-engineered session plan. You don&apos;t write the prompt — your captain or instructor does.
        </P>

        <H>Anatomy of a milestone</H>
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          <li><strong className="text-foreground">Domain</strong> — which of the six contest domains it belongs to.</li>
          <li><strong className="text-foreground">Phase / week</strong> — where it sits on the season calendar (July diagnostic → November taper).</li>
          <li><strong className="text-foreground">Mode</strong> — <em>tutor</em>, <em>assessment</em>, or <em>journal</em>. See <em>The three modes</em>.</li>
          <li><strong className="text-foreground">Difficulty</strong> — Easy (10pts) / Average (20pts) / Difficult (30pts), mirroring the contest&apos;s own tiers.</li>
          <li><strong className="text-foreground">Accepted input types</strong> — guided form, JSON, or both. Assessment milestones always accept JSON.</li>
        </ul>

        <Callout kind="rule" title="Milestones don't disappear once they're scored">
          <p>
            Once a milestone has at least one submission, it <strong>locks</strong>. The prompt can&apos;t be edited and the
            submissions stay exactly as they were — that&apos;s the audit trail. To change the prompt, a captain creates a
            <em> new version</em>; the old version is archived but still readable.
          </p>
        </Callout>

        {isStaff && (
          <Callout kind="info" title="Authoring Milestones (Staff Only)">
            <p>
              As staff/captain, you can create and manage milestones in the <strong>Author Milestones</strong> view.
              When you author a milestone, you define its domain, phase, difficulty, mode, and prompt.
              Once a milestone has student submissions, it locks and cannot be edited.
            </p>
          </Callout>
        )}

        <H>How to submit</H>
        <ol className="space-y-1.5 text-sm list-decimal list-inside text-muted-foreground">
          <li>Open the milestone and click <strong>Copy</strong> on the prompt block.</li>
          <li>Paste into your AI tool and run the session.</li>
          <li>Come back, click <strong>Submit your result</strong>, and fill the form (or paste the AI&apos;s JSON output).</li>
        </ol>

        <Goto view="milestones" label="Go to milestones" />
      </CardContent>
    </Card>
  )
}

function ModesSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2"><BookOpen className="size-5 text-primary" /> The three modes</CardTitle>
        <CardDescription>Every milestone is one of these. They differ in what the AI does and what you submit.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <P>The mode changes the shape of the session and what comes back into the app.</P>

        <div className="space-y-3">
          {MODES.map(m => {
            const isAssessment = m.key === 'assessment'
            const isJournal = m.key === 'journal'
            const isTutor = m.key === 'tutor'
            return (
              <div key={m.key} className="rounded-lg border p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="capitalize">{m.label}</Badge>
                  {isAssessment && <Badge className="bg-primary/15 text-primary border-0">feeds assessment leaderboard</Badge>}
                  {isJournal && <Badge variant="outline" className="text-muted-foreground">no score</Badge>}
                </div>
                <p className="text-sm text-muted-foreground mb-2">{m.description}</p>
                <div className="text-xs text-muted-foreground space-y-1">
                  {isTutor && (
                    <p><strong className="text-foreground">What you submit:</strong> a reflection (freeform or guided). The AI returns prose — paste it as your reflection; the streak still counts.</p>
                  )}
                  {isAssessment && (
                    <p><strong className="text-foreground">What you submit:</strong> structured JSON with a <code className="bg-muted px-1 rounded">score</code> field. JSON is locked on for assessment milestones — that score is what lands on the assessment leaderboard.</p>
                  )}
                  {isJournal && (
                    <p><strong className="text-foreground">What you submit:</strong> a freeform journal entry. No score, no leaderboard impact — just a habit of reflection. Paste the AI&apos;s prose response, or write your own.</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <Callout kind="info" title="What if the AI returns prose, not JSON?">
          <p>
            For tutor and journal milestones, that&apos;s expected — paste the prose and it&apos;s saved as your reflection.
            For assessment milestones, the system asks for JSON so the score reaches the leaderboard; if you paste prose
            by mistake it&apos;ll tell you and ask for JSON instead.
          </p>
        </Callout>
      </CardContent>
    </Card>
  )
}

function WallSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2"><Shield className="size-5 text-emerald-600" /> The wall between practice and selection</CardTitle>
        <CardDescription>The single most important rule in the system.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Callout kind="rule" title="The wall">
          <p>
            Practice data <strong>informs</strong> the team selection decision. It never <strong>decides</strong> it.
            Only the proctored mock decides it.
          </p>
        </Callout>

        <H>Why the wall exists</H>
        <P>
          AI-assisted practice is great for building a habit and surfacing weaknesses — but it can be gamed. A student
          could inflate an AI score, ask the AI to do the work, or submit something they didn&apos;t really do. If team
          selection were based on practice data, the wrong people would make the team.
        </P>
        <P>
          The proctored mock fixes that. It runs in the <em>literal restricted conditions</em> of the real contest — no
          AI, no IDE where the contest forbids one, time pressure, a captain watching. You can&apos;t fake it. So it&apos;s
          the one signal trusted to decide the team.
        </P>

        <H>What this means in practice</H>
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          <li className="flex gap-2"><CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" /> Your AI scores are private — visible to you, your captain, and instructors only.</li>
          <li className="flex gap-2"><CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" /> The public leaderboard ranks by <strong>streak and completion</strong>, never by AI score.</li>
          <li className="flex gap-2"><CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" /> Assessment scores have their own separate board — public, but explicitly decoupled from selection.</li>
          <li className="flex gap-2"><CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" /> The Leading Candidates panel uses practice data as a <em>coaching read</em> for staff — it never auto-selects anyone.</li>
        </ul>

        <Callout kind="warn" title="The one place AI scores ARE public">
          <p>
            The assessment leaderboard. The team made a deliberate call to show top assessment scores publicly (with the
            cheating risk acknowledged and screened for). That board is clearly separated from the streak leaderboard and
            from the selection decision.
          </p>
        </Callout>
      </CardContent>
    </Card>
  )
}

function ProctoredSection({ isStaff }: { isStaff: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2"><ClipboardCheck className="size-5 text-primary" /> Proctored mocks</CardTitle>
        <CardDescription>The eligibility gate — the only thing that decides who represents the school in November.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Callout kind="rule" title="What proctored mocks are">
          <p>
            Full-dress rehearsals run in the literal restricted conditions of the real contest. No AI, no unapproved
            tools, timed, and proctored by a captain or instructor. They&apos;re the closest thing to the November event
            before November.
          </p>
        </Callout>

        <H>When they happen</H>
        <P>
          Mocks cluster in the heavy phases: the first scrimmage in <strong>August W3</strong>, then intensify through
          <strong> October</strong> (full-dress mock contests in real restricted environments, pairs finalized) and
          <strong> November</strong> (high-frequency mocks for speed and nerves, then light review and real rest).
        </P>

        <H>Who enters them</H>
        <P>
          Captains and instructors enter mock scores — students don&apos;t self-report. Each entry records the student,
          optional pair partner, score, date, who entered it, and optional notes. This keeps the gate auditable.
        </P>

        {isStaff && (
          <Callout kind="info" title="Entering Mock Scores (Staff Only)">
            <p>
              As a staff member or captain, you can record mock results in the <strong>Proctored Mocks</strong> view.
              You must specify the student, date, score, and optionally their pair partner or private coaching notes.
              Private notes are visible ONLY to staff.
            </p>
          </Callout>
        )}

        <H>What students see</H>
        <P>
          You see your own mock results in full. Other students&apos; mocks are visible (it&apos;s a public, in-person record)
          but without the private notes. The Team Selection view shows mock scores alongside streaks as context for the
          selection call.
        </P>

        <Goto view="proctored" label="Go to proctored mocks" />
      </CardContent>
    </Card>
  )
}

function TeamSection({ isStaff }: { isStaff: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2"><Users className="size-5 text-primary" /> Team selection</CardTitle>
        <CardDescription>The final call — made by staff, based only on proctored mocks.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <P>
          Each domain selects its representative(s) for November. Pair-based contests (Java, Quiz Bee) select two; solo
          contests select one. The decision is made by an admin, instructor, or domain captain.
        </P>

        <Callout kind="rule" title="What selection is based on">
          <p>
            <strong>Only proctored mock results.</strong> Practice diagnostics (streaks, AI scores, reflections) inform
            the discussion but never substitute for the gate. Each selection records who decided, when, and an optional
            rationale — so the call is auditable.
          </p>
        </Callout>

        <H>How it appears</H>
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          <li>The <strong>Team Selection</strong> view has a tab per domain showing filled vs. open slots.</li>
          <li>Mock scores and streaks appear beneath each domain as <em>context</em>, not as the decision itself.</li>
          {isStaff ? (
            <li>Staff can add a selection (with rationale) or remove one. Removing reopens the slot and is logged.</li>
          ) : (
            <>
              <li>Students can view active selections, along with who made the selection, when, and the rationale.</li>
              <li>Students cannot add or remove selections.</li>
            </>
          )}
        </ul>

        {isStaff && (
          <Callout kind="warn" title="Selections can be reversed">
            <p>
              Removing a team selection is a real action — it reverses the eligibility gate decision and reopens the slot.
              The confirmation dialog is there on purpose: don&apos;t click through it casually.
            </p>
          </Callout>
        )}

        <Goto view="team" label="Go to team selection" />
      </CardContent>
    </Card>
  )
}

function LeaderboardSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2"><Trophy className="size-5 text-primary" /> Leaderboards</CardTitle>
        <CardDescription>Two boards, deliberately kept separate.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <H>1. The streak leaderboard (the main one)</H>
        <P>
          Ranks every student by <strong>best streak</strong>, then <strong>weeks completed</strong>, then whether they
          submitted this week. This is the board the season rallies around — it rewards consistency, not score-chasing.
          Captains are flagged. A weekly spotlight can highlight a streak, a solve, or a reflection.
        </P>

        <Callout kind="rule" title="No AI scores here">
          <p>AI scores never appear on this leaderboard. That&apos;s the wall, enforced.</p>
        </Callout>

        <H>2. The assessment leaderboard</H>
        <P>
          A separate board ranking students by their <strong>assessment-mode</strong> scores: total, average, count, and
          best, broken down per domain. It exists because the team decided the competitive signal is worth surfacing —
          with the cheating risk acknowledged and screened for.
        </P>
        <P>
          Assessment scores are still private on the <em>submissions</em> themselves (a student can&apos;t see another&apos;s
          reflection or weakness tags). Only the aggregate ranking is public.
        </P>

        <Goto view="leaderboard" label="Go to leaderboard" />
      </CardContent>
    </Card>
  )
}

function LeadingSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2"><Sparkles className="size-5 text-primary" /> Leading Candidates</CardTitle>
        <CardDescription>Staff-only coaching panel. Never auto-selects.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <P>
          The Leading Candidates view is a staff-only read that pulls together, per domain, each student&apos;s assessment
          scores, streak, and proctored mock results, and lets staff generate an AI evaluation prompt to copy into their
          own AI tool.
        </P>

        <Callout kind="rule" title="Append-only, never auto-writes">
          <p>
            Evaluations are append-only and never write to team selection automatically. The AI output is
            <strong> input to a human decision</strong>, not the decision itself. Students have no read path to this
            data — not even their own row.
          </p>
        </Callout>

        <H>How staff use it</H>
        <ol className="space-y-1.5 text-sm list-decimal list-inside text-muted-foreground">
          <li>Open a domain. Each candidate shows assessment avg/best, streak, and proctored score.</li>
          <li>Click <strong>Build evaluation prompt</strong> — the system assembles the student&apos;s submission history, weakness tags, reflections, and mock scores into a ready-to-paste prompt.</li>
          <li>Run that prompt in their own AI tool, then paste the structured result back as an evaluation.</li>
          <li>For pair-based domains, use <strong>Suggest pairs</strong> to rank 2-student combos by combined strength and complementary weaknesses.</li>
        </ol>
      </CardContent>
    </Card>
  )
}

function RolesSection({ user }: { user: SessionUser }) {
  const isCaptain = (user.captainOf?.length ?? 0) > 0;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2"><Crown className="size-5 text-amber-500" /> Roles &amp; permissions</CardTitle>
        <CardDescription>What each role can do. Your current role is highlighted below.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-3">
          <RoleRow
            icon={Crown}
            color="text-amber-500"
            name="Admin"
            isCurrent={user.role === 'admin'}
            can={['Everything instructors and captains can do, plus:', 'Provision and delete user accounts', 'Assign / remove domain captains', 'Change user roles', 'Full system overview on the dashboard']}
          />
          <RoleRow
            icon={Target}
            color="text-primary"
            name="Instructor"
            isCurrent={user.role === 'instructor'}
            can={['Author, edit, and publish milestones across all six domains', 'Enter and delete proctored mock scores', 'Make and remove team selections', 'Create weekly spotlights', 'Use the Leading Candidates panel']}
          />
          <RoleRow
            icon={Shield}
            color="text-emerald-600"
            name="Captain (a student + a domain)"
            isCurrent={user.role === 'student' && isCaptain}
            can={['Author and edit milestones in their own domain', 'Enter proctored mocks in their domain', 'Select / remove team members in their domain', 'See private diagnostics for their domain', 'Use Leading Candidates for their domain']}
          />
          <RoleRow
            icon={Users}
            color="text-muted-foreground"
            name="Student"
            isCurrent={user.role === 'student' && !isCaptain}
            can={['Open milestones, copy prompts, submit results', 'See their own private diagnostics', 'See their own proctored mock results', 'See the public leaderboards and the activity feed']}
          />
        </div>
      </CardContent>
    </Card>
  )
}

function RoleRow({ icon: Icon, color, name, can, isCurrent }: {
  icon: typeof Crown
  color: string
  name: string
  can: string[]
  isCurrent: boolean
}) {
  return (
    <div className={cn(
      "rounded-lg border p-4 transition-all",
      isCurrent ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-sm" : "border-border"
    )}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <Icon className={cn('size-4', color)} />
          <p className="text-sm font-medium">{name}</p>
        </div>
        {isCurrent && (
          <Badge className="bg-primary/20 text-primary border-primary/20 text-[10px] uppercase font-semibold tracking-wider hover:bg-primary/20">
            Your Role
          </Badge>
        )}
      </div>
      <ul className="space-y-1 text-xs text-muted-foreground">
        {can.map((c, i) => <li key={i} className="flex gap-1.5"><span className="text-foreground/40">•</span> {c}</li>)}
      </ul>
    </div>
  )
}

function CalendarSection({ domains }: { domains: Awaited<ReturnType<typeof api.listDomainsAction>> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2"><Target className="size-5 text-primary" /> Season calendar</CardTitle>
        <CardDescription>Four working months, structured around the November event.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <P>The season moves through distinct phases. Mock-heavy phases are where the gate signal comes from.</P>

        <div className="space-y-2">
          {[
            { phase: 'July', title: 'Diagnostic week', desc: 'Diagnostic per domain to find natural strengths. Open trivia nights to recruit.', mock: false },
            { phase: 'August', title: 'Practice starts → first scrimmage', desc: 'Captains take the lead. Real practice cycles begin. First timed scrimmage in W3.', mock: true },
            { phase: 'September', title: 'Maintenance', desc: 'Continue reps with spaced-repetition callbacks. Lighter if exam season overlaps, but milestones stay consistent.', mock: false },
            { phase: 'October', title: 'Intensive sprint', desc: 'Full-dress mock contests in the real restricted environment. Pairs finalized.', mock: true },
            { phase: 'November', title: 'Final taper → event', desc: 'High-frequency mocks for speed and nerves, then light review and real rest. Then: the Olympics.', mock: true },
          ].map(p => (
            <div key={p.phase} className="flex items-start gap-3 p-3 rounded-md border">
              <div className={cn('size-9 rounded-md grid place-items-center shrink-0', p.mock ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground')}>
                {p.mock ? <ClipboardCheck className="size-4" /> : <Flame className="size-4" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{p.phase} · {p.title}</p>
                  {p.mock && <Badge className="bg-primary/15 text-primary border-0 text-[10px]">mock-heavy</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <H>The six domains</H>
        <div className="grid sm:grid-cols-2 gap-2">
          {(domains.length > 0 ? domains : DOMAINS).map(d => {
            const Icon = getDomainIcon(d.icon)
            return (
              <div key={d.key} className="flex items-start gap-2 p-3 rounded-md border">
                <div className="size-8 rounded-md grid place-items-center shrink-0" style={{ background: `${d.color}20`, color: d.color }}>
                  <Icon className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">{d.name}{d.pairBased && <span className="text-[10px] text-muted-foreground ml-1">(pair)</span>}</p>
                  <p className="text-xs text-muted-foreground">{d.contestFormat}</p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function FaqSection({ isStaff }: { isStaff: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2"><Lightbulb className="size-5 text-amber-500" /> Common questions</CardTitle>
        <CardDescription>The things people ask most often.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Faq q="Do I have to use a specific AI tool?">
          No. The prompts are tool-agnostic — paste them into Claude, Gemini, ChatGPT, or whatever you prefer. The app
          only cares about the structured result you paste back.
        </Faq>
        <Faq q="Can other students see my AI score?">
          No. Your AI score, weakness tags, confidence, and reflection are private — visible only to you, your domain
          captain, and instructors. Other students only see that you submitted. The only place scores are public is the
          separate assessment leaderboard (aggregate only).
        </Faq>
        <Faq q="Why did my streak reset?">
          Streaks are per-domain and per-week (Monday–Sunday, Manila time). If a week has an active milestone and you
          don&apos;t submit, that domain&apos;s streak resets. Consistency is the whole point.
        </Faq>
        <Faq q="Can I edit a milestone after it has submissions?">
          No — it locks. To change the prompt, a captain creates a new version. The old version and all its submissions
          stay exactly as they were. That&apos;s the audit trail.
        </Faq>
        <Faq q="I'm a student — why can't I enter my own mock score?">
          Because the proctored mock is the eligibility gate, it has to be entered by someone who proctored it (a captain
          or instructor). Self-reported scores would defeat the purpose.
        </Faq>
        <Faq q="Does practice data decide who makes the team?">
          No. Only the proctored mock decides that. Practice data informs the discussion — it surfaces strengths,
          weaknesses, and consistency — but it can never substitute for the gate. See <em>The wall</em>.
        </Faq>
        <Faq q="What happens if I paste prose instead of JSON on an assessment milestone?">
          The system will ask for JSON instead, because the assessment leaderboard needs a <code className="bg-muted px-1 rounded">score</code> field.
          For tutor or journal milestones, prose is fine — it&apos;s saved as your reflection and the streak still counts.
        </Faq>
        <Faq q="Where do I see how the team is picked?">
          The Team Selection view. Each domain shows its filled/open slots, the selection rationale, and mock scores +
          streaks as context.
        </Faq>
        {isStaff && (
          <>
            <Faq q="As staff, how do I create a new season or manage users?">
              Only users with the <strong>Admin</strong> role can provision users, manage seasons, or change roles. Instructors and captains can manage their respective domains and milestones but cannot perform system administration.
            </Faq>
            <Faq q="How do I suggest pairs in the Leading Candidates view?">
              For pair-based domains like Java and Quiz Bee, open the Leading Candidates view and click <strong>Suggest pairs</strong>. The system will rank student pairs by their combined strengths and highlight complementary weakness areas to help you form the most competitive team.
            </Faq>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-md border">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 p-3 text-left"
      >
        <p className="text-sm font-medium">{q}</p>
        <ArrowRight className={cn('size-4 text-muted-foreground shrink-0 transition-transform', open && 'rotate-90')} />
      </button>
      {open && <div className="px-3 pb-3 text-sm text-muted-foreground leading-relaxed">{children}</div>}
    </div>
  )
}

// Keep tree-shaking honest if icons go unused in a section.
void Lock
void GitBranch
