'use client'

import { useEffect, useState } from 'react'
import { Login } from '@/components/app/login'
import { AppShell } from '@/components/app/app-shell'
import { PendingShell } from '@/components/app/pending-shell'
import { api } from '@/lib/api-client'
import type { SessionUser } from '@/lib/auth'
import {
  Trophy,
  Loader2,
  Zap,
  Flame,
  Shield,
  Database,
  Coffee,
  Brain,
  Terminal,
  Network,
  Globe,
  ArrowRight,
  Sparkles,
  LogIn,
  ChevronRight,
  Star
} from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

// Discord SVG icon (not in lucide-react)
function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>
  )
}

const discordInviteUrl = process.env.NEXT_PUBLIC_DISCORD_INVITE_URL || ''

export default function Home() {
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [activeSeasonName, setActiveSeasonName] = useState<string>('')
  const [phases, setPhases] = useState<Array<{ label: string; shortLabel: string; sequence: number }>>([])

  // Fetch session details on mount
  useEffect(() => {
    api.getCurrentUser()
      .then((u) => {
        setUser(u)
      })
      .catch(() => {
        setUser(null)
      })
  }, [])

  // Fetch active season info for landing page branding
  useEffect(() => {
    api.getActiveSeasonAction()
      .then((season) => {
        if (season) {
          setActiveSeasonName(season.name)
          if (season.phases) {
            setPhases(season.phases)
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load active season details:', err)
      })
  }, [])

  if (user === undefined) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-3 text-sm text-muted-foreground animate-pulse">Loading Platform…</p>
      </div>
    )
  }

  // Handle successful login/registration by re-fetching session
  const handleLoginSuccess = async () => {
    try {
      const u = await api.getCurrentUser()
      setUser(u)
      setShowLoginModal(false)
    } catch {
      setUser(null)
    }
  }

  if (user === null) {
    // 6 Domain configuration
    const domains = [
      {
        key: 'db',
        name: 'Database Management',
        shortName: 'DB',
        description: 'SQL fluency under time pressure, mysql CLI via XAMPP.',
        color: 'sky',
        icon: Database,
        details: 'Raw mysql CLI reps + timed documentation. Fastest correct submission wins.'
      },
      {
        key: 'java',
        name: 'Java Programming',
        shortName: 'Java',
        description: 'Algorithmic thinking. 6 problems in 2 hours. Notepad + CLI only. Pair-based.',
        color: 'orange',
        icon: Coffee,
        details: 'No IDE from week one. Practice in Notepad + javac in pairs — exact gate setup.'
      },
      {
        key: 'quiz',
        name: 'IT Quiz Bee',
        shortName: 'Quiz',
        description: 'Broad recall fluency covering all IT fundamentals.',
        color: 'violet',
        icon: Brain,
        details: 'Bottleneck is the elimination round. Consistent spaced recall ensures finals qualification.'
      },
      {
        key: 'web',
        name: 'Web Design',
        shortName: 'Web',
        description: 'Single themed page in 2 hours. HTML/CSS only, Notepad++.',
        color: 'pink',
        icon: Globe,
        details: 'Fast, decisive layout against unseen briefs. Hand-coded structure without frameworks.'
      },
      {
        key: 'python',
        name: 'Python Programming',
        shortName: 'Python',
        description: 'Algorithm optimization, file handling, and scripting automation.',
        color: 'emerald',
        icon: Terminal,
        details: 'Decoupled practice loop preparing candidates for advanced scripting diagnostic gates.'
      },
      {
        key: 'net',
        name: 'Computer Networking',
        shortName: 'Net',
        description: 'Packet analysis, subnetting drills, routing & switching configurations.',
        color: 'amber',
        icon: Network,
        details: 'Hands-on system configuration diagnostics matching official contest guidelines.'
      }
    ]

    const pipelineSteps = phases.length > 0
      ? phases.slice().sort((a, b) => a.sequence - b.sequence)
      : [
          { label: 'Diagnostics', shortLabel: 'Diagnostics', description: 'Baseline skill identification and platform onboarding.' },
          { label: 'Scrimmages', shortLabel: 'Scrimmages', description: 'Weekly domain practice sprints with AI auditing.' },
          { label: 'Spaced Recall', shortLabel: 'Spaced Recall', description: 'Streaks and spaced retention loops.' },
          { label: 'Intensive Sprint', shortLabel: 'Intensive Sprint', description: 'High-stakes simulated contest mocks.' },
          { label: 'Finals Selection', shortLabel: 'Finals', description: 'The Gate of Truth proctored scrimmages.' }
        ]

    return (
      <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 flex flex-col relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-gradient-to-b from-primary/10 via-primary/5 to-transparent blur-3xl opacity-60 pointer-events-none z-0" />

        {/* Global Nav Bar */}
        <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-xl bg-primary text-primary-foreground grid place-items-center shadow-sm">
                <Trophy className="size-5" />
              </div>
              <div>
                <span className="font-bold tracking-tight text-sm sm:text-base">Road to IT Olympics</span>
                <span className="text-[10px] sm:text-xs text-muted-foreground block -mt-1 font-medium">ISPSC Tagudin Campus</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {discordInviteUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="text-muted-foreground hover:text-foreground flex items-center gap-2"
                >
                  <a href={discordInviteUrl} target="_blank" rel="noopener noreferrer">
                    <DiscordIcon className="size-4 text-[#5865F2]" />
                    <span className="hidden sm:inline">Join us on Discord</span>
                    <span className="sm:hidden">Discord</span>
                  </a>
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => setShowLoginModal(true)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
              >
                Enter Platform
              </Button>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-6 pt-16 pb-20 relative z-10 flex-1 flex flex-col justify-center items-center text-center">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary tracking-wide mb-6 animate-fade-in">
            <Sparkles className="size-3.5" />
            <span>{activeSeasonName || 'IT Skills Olympics'} selection pipeline</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-5xl leading-[1.1] text-balance">
            Forging Tagudin's Next Generation of{' '}
            <span className="bg-gradient-to-r from-primary via-violet-500 to-primary bg-clip-text text-transparent bg-[size:200%] animate-pulse">
              Tech Champions
            </span>
          </h1>

          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mt-6 leading-relaxed text-balance">
            Decoupled contest tracks. Custom seasonal timeline. A single governing rule: consistent practice builds the skills, while high-stakes, proctored scrimmages select our elite delegates.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-4 items-center justify-center">
            <Button
              size="lg"
              onClick={() => setShowLoginModal(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 shadow-lg shadow-primary/10 hover:shadow-primary/25 transition-all text-sm font-semibold h-12 flex items-center gap-2 group"
            >
              Enter Platform
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Button>
            {discordInviteUrl && (
              <Button
                variant="outline"
                size="lg"
                asChild
                className="px-8 text-sm font-semibold h-12 border-violet-500/30 hover:border-violet-500 bg-violet-500/5 hover:bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center gap-2"
              >
                <a href={discordInviteUrl} target="_blank" rel="noopener noreferrer">
                  <DiscordIcon className="size-4 text-[#5865F2]" />
                  Join us on Discord
                </a>
              </Button>
            )}
            <Button
              variant="ghost"
              size="lg"
              onClick={() => {
                document.getElementById('tracks-section')?.scrollIntoView({ behavior: 'smooth' })
              }}
              className="px-8 text-sm font-semibold h-12 text-muted-foreground hover:text-foreground"
            >
              Explore Tracks
            </Button>
          </div>
        </section>

        {/* Features / Pillars Section */}
        <section className="border-t border-border/30 bg-muted/10 py-20 relative z-10">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="flex gap-4 p-6 rounded-2xl border border-border/30 bg-background/50 hover:bg-background/80 transition-colors shadow-sm">
                <div className="size-10 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
                  <Zap className="size-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-base mb-1.5">Interactive AI-Tutor Mentorship</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Paste custom milestone blueprints directly into ChatGPT, Gemini, or Claude to audit your skills against rigorous standards.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-6 rounded-2xl border border-border/30 bg-background/50 hover:bg-background/80 transition-colors shadow-sm">
                <div className="size-10 rounded-lg bg-orange-500/10 text-orange-500 grid place-items-center shrink-0">
                  <Flame className="size-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-base mb-1.5">Consistency Over Metrics</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    The public leaderboard ranks your streak and dedication, keeping raw diagnostics private to you and your captain.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-6 rounded-2xl border border-border/30 bg-background/50 hover:bg-background/80 transition-colors shadow-sm">
                <div className="size-10 rounded-lg bg-emerald-500/10 text-emerald-500 grid place-items-center shrink-0">
                  <Shield className="size-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-base mb-1.5">The Gate of Truth</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Authentic proctored mocks run under real-world time and system restrictions determine the final delegation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Training Timeline Pipeline Section */}
        <section className="py-20 relative z-10 border-t border-border/30">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-xl mx-auto mb-14">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Active Training Pipeline</h2>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                Step-by-step roadmap designed to gradually compound skills from initial diagnostic baseline to final delegation match rules.
              </p>
            </div>

            <div className="relative">
              {/* Connecting line */}
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-border/40 -translate-y-1/2 hidden md:block" />

              <div className="grid grid-cols-1 md:grid-cols-5 gap-8 relative">
                {pipelineSteps.map((step, idx) => (
                  <div key={idx} className="flex flex-col items-center text-center bg-background border border-border/30 md:border-none p-5 md:p-0 rounded-xl shadow-xs md:shadow-none">
                    <div className="size-8 rounded-full bg-primary/10 text-primary border border-primary/30 flex items-center justify-center font-semibold text-sm mb-3 z-10 shadow-xs">
                      {idx + 1}
                    </div>
                    <h4 className="font-semibold text-sm tracking-tight text-foreground">{step.shortLabel || step.label}</h4>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed max-w-[200px]">
                      {step.description || 'Continuous practice loop phase.'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Contest Tracks / Domains Section */}
        <section id="tracks-section" className="py-20 relative z-10 border-t border-border/30 bg-muted/5">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-xl mx-auto mb-14">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Contest Domains</h2>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                Training pipelines are customized for specific rules and restriction sets of each skill event.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {domains.map((d) => {
                const Icon = d.icon
                // Generate theme class mappings dynamically
                const colorClasses: Record<string, { bg: string, text: string, hover: string, glow: string }> = {
                  sky: { bg: 'bg-sky-500/10', text: 'text-sky-500', hover: 'hover:border-sky-500/30', glow: 'hover:shadow-sky-500/5' },
                  orange: { bg: 'bg-orange-500/10', text: 'text-orange-500', hover: 'hover:border-orange-500/30', glow: 'hover:shadow-orange-500/5' },
                  violet: { bg: 'bg-violet-500/10', text: 'text-violet-500', hover: 'hover:border-violet-500/30', glow: 'hover:shadow-violet-500/5' },
                  pink: { bg: 'bg-pink-500/10', text: 'text-pink-500', hover: 'hover:border-pink-500/30', glow: 'hover:shadow-pink-500/5' },
                  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', hover: 'hover:border-emerald-500/30', glow: 'hover:shadow-emerald-500/5' },
                  amber: { bg: 'bg-amber-500/10', text: 'text-amber-500', hover: 'hover:border-amber-500/30', glow: 'hover:shadow-amber-500/5' },
                }

                const c = colorClasses[d.color] || colorClasses.emerald

                return (
                  <div
                    key={d.key}
                    className={`flex flex-col justify-between p-6 rounded-2xl border border-border/40 bg-card/60 backdrop-blur-xs transition-all ${c.hover} ${c.glow} hover:-translate-y-0.5 shadow-sm group`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className={`size-10 rounded-xl ${c.bg} ${c.text} grid place-items-center shadow-xs`}>
                          <Icon className="size-5" />
                        </div>
                        <span className="text-[10px] tracking-wider uppercase font-semibold text-muted-foreground/80 px-2 py-0.5 rounded-md bg-muted">
                          {d.shortName}
                        </span>
                      </div>

                      <h3 className="font-bold text-base mt-4 text-foreground">{d.name}</h3>
                      <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                        {d.description}
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-border/10 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="italic line-clamp-1 pr-4">{d.details}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowLoginModal(true)}
                        className="text-primary hover:text-primary/80 h-7 text-xs font-semibold p-0 flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        Enter
                        <ChevronRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border/30 bg-muted/20 py-10 mt-auto text-center text-xs text-muted-foreground">
          <p className="font-semibold uppercase tracking-wider mb-2 text-[10px] text-primary/80">Active Season Pipeline</p>
          <p className="max-w-2xl mx-auto px-6 leading-relaxed mb-6">
            {pipelineSteps.map(p => p.shortLabel || p.label).join(' ➡️ ')}
          </p>
          <p className="border-t border-border/10 pt-4">
            &copy; {new Date().getFullYear()} Road to IT Olympics · ISPSC Tagudin Campus. All rights reserved.
          </p>
        </footer>

        {/* Dialog popup for Login and Registration */}
        <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
          <DialogContent className="max-w-md p-6 overflow-hidden rounded-2xl border border-border/30 shadow-2xl bg-card">
            <Login onLogin={handleLoginSuccess} />
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // Active status checks: pendings go to PendingShell
  if (user.status === 'pending' || user.status === 'rejected') {
    return (
      <PendingShell
        user={user}
        onLogout={async () => {
          await api.logoutAction()
          setUser(null)
        }}
      />
    )
  }

  // Active/approved user dashboard app shell
  return (
    <AppShell
      user={user}
      onLogout={async () => {
        await api.logoutAction()
        setUser(null)
      }}
    />
  )
}
