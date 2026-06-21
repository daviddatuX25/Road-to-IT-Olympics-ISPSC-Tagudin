'use client'

import { api } from '@/lib/api-client'
import { useState, useEffect, useTransition } from 'react'
import { Trophy, Loader2, Zap, Flame, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { RegistrationForm } from './registration-form'

// Use the seeded credentials to test the roles:
// Admin: ADMIN-001 | Instructor: FAC-001 | Student: 2024-001

export function Login({ onLogin }: { onLogin: () => void }) {
  const [identifier, setIdentifier] = useState('2024-001')
  const [password, setPassword] = useState('olypmics2026')
  const [mode, setMode] = useState<'signin' | 'register'>('signin')
  const [pending, startTransition] = useTransition()
  
  const [activeSeasonName, setActiveSeasonName] = useState<string>('')
  const [phases, setPhases] = useState<Array<{ label: string; shortLabel: string; sequence: number }>>([])

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

  function submit(e: React.FormEvent) {
    e.preventDefault()

    const id = identifier.trim()
    if (!id) {
      toast.error('Please enter your ID or username.')
      return
    }
    if (!password) {
      toast.error('Please enter your password.')
      return
    }

    startTransition(async () => {
      const loadingId = toast.loading('Signing you in…')
      const result = await api.loginAction(id, password)
      toast.dismiss(loadingId)
      if (result.ok) {
        toast.success('Welcome back! Signed in successfully.')
        onLogin()
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row items-stretch bg-background">
      {/* Left/Top: branding / concept */}
      <div className="flex lg:w-1/2 flex-col justify-between p-8 sm:p-12 bg-gradient-to-br from-primary/15 via-background to-background border-b lg:border-b-0 lg:border-r gap-8 lg:gap-0">
        <div>
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-xl bg-primary text-primary-foreground grid place-items-center shadow-sm">
              <Trophy className="size-6" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                {activeSeasonName || 'IT Skills Olympics'} · ISPSC Tagudin Campus
              </p>
              <h1 className="text-2xl font-semibold tracking-tight">The Forge: Selection & Training</h1>
            </div>
          </div>

          <div className="mt-10 space-y-5 max-w-md">
            <h2 className="text-3xl font-semibold tracking-tight leading-tight bg-gradient-to-r from-primary to-violet-600 bg-clip-text text-transparent">
              Forging Tagudin's Next Generation of Tech Champions.
            </h2>
            <p className="text-muted-foreground">
              Decoupled contest tracks. Custom seasonal timeline. A single governing rule: consistent
              practice builds the skills, while high-stakes, proctored scrimmages select our elite delegates.
            </p>
            <ul className="space-y-3.5 text-sm text-muted-foreground">
              <li className="flex gap-2.5">
                <Zap className="size-4 text-primary mt-0.5 shrink-0" />
                <span><strong>Interactive AI-Tutor Mentorship</strong> — Paste custom milestone blueprints directly into ChatGPT, Gemini, or Claude to audit your skills.</span>
              </li>
              <li className="flex gap-2.5">
                <Flame className="size-4 text-orange-500 mt-0.5 shrink-0" />
                <span><strong>Consistency Over Metrics</strong> — The public leaderboard ranks your streak and dedication, keeping raw diagnostics private to you and your captain.</span>
              </li>
              <li className="flex gap-2.5">
                <Shield className="size-4 text-emerald-500 mt-0.5 shrink-0" />
                <span><strong>The Gate of Truth</strong> — Authentic proctored mocks run under real-world time and system restrictions determine the final delegation.</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="text-xs text-muted-foreground border-t pt-4 border-primary/10">
          <p className="font-semibold uppercase tracking-wider mb-2 text-[10px] text-primary/80">Active Training Pipeline</p>
          <p className="leading-relaxed">
            {phases.length > 0
              ? phases.slice().sort((a, b) => a.sequence - b.sequence).map(p => p.shortLabel || p.label).join(' ➡️ ')
              : 'Diagnostics ➡️ Scrimmages ➡️ Spaced Recall ➡️ Intensive Sprint ➡️ Finals'}
          </p>
        </div>
      </div>

      {/* Right/Bottom: login */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <Card className="w-full max-w-md shadow-sm">
          {mode === 'signin' ? (
            <>
              <CardHeader>
                <CardTitle className="text-xl">Sign in</CardTitle>
                <CardDescription>
                  Use one of the seeded accounts to explore the platform. Password for all demo accounts:{' '}
                  <code className="text-foreground bg-muted px-1.5 py-0.5 rounded text-xs">olypmics2026</code>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={submit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="identifier">Username / ID Number</Label>
                    <Input
                      id="identifier"
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="e.g. E23-00345, 2024-001, FAC-001"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={pending}>
                    {pending ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                    Sign in
                  </Button>
                </form>

                <div className="mt-6 pt-6 border-t text-center flex flex-col gap-2">
                  <p className="text-xs text-muted-foreground">
                    Don't have an account yet?
                  </p>
                  <Button variant="outline" size="sm" onClick={() => setMode('register')}>
                    Register student account
                  </Button>
                </div>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader>
                <CardTitle className="text-xl">Student Registration</CardTitle>
                <CardDescription>
                  Apply to join the training program. All applications require administrator approval.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RegistrationForm onBackToLogin={() => setMode('signin')} onLogin={onLogin} />
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
