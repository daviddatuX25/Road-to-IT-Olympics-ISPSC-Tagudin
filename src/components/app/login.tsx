'use client'

import { api } from '@/lib/api-client'
import { useState, useTransition } from 'react'
import { Trophy, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

const QUICK_PICKS = [
  { label: 'Admin (Capt. Mara)',          email: 'admin@ito.test',       role: 'Admin · full system config' },
  { label: 'Instructor (Prof. Reyes)',     email: 'instructor@ito.test',  role: 'Author milestones, see all' },
  { label: 'Student · lia.exe · Java Cpt', email: 'lia@ito.test',         role: 'Student + Java captain · 4-week streak' },
  { label: 'Student · markbyte',           email: 'mark@ito.test',        role: 'Student · pair partner to lia' },
  { label: 'Student · tashadb · DB Cpt',   email: 'tasha@ito.test',       role: 'Student + DB captain · 3-week streak' },
  { label: 'Student · jico.bin · Quiz Cpt',email: 'jico@ito.test',        role: 'Student + Quiz captain' },
  { label: 'Student · rico_byte',          email: 'rico@ito.test',        role: 'Student · lapsed (week 1 only)' },
]

export function Login({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('lia@ito.test')
  const [password, setPassword] = useState('olypmics2026')
  const [pending, startTransition] = useTransition()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const result = await api.loginAction(email, password)
      if (result.ok) {
        toast.success('Signed in.')
        onLogin()
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <div className="min-h-screen flex items-stretch bg-background">
      {/* Left: branding / concept */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-primary/15 via-background to-background border-r">
        <div>
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-xl bg-primary text-primary-foreground grid place-items-center shadow-sm">
              <Trophy className="size-6" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">15th IT Skills Olympics · Makati · Nov 2026</p>
              <h1 className="text-2xl font-semibold tracking-tight">Road to IT Olympics</h1>
            </div>
          </div>

          <div className="mt-10 space-y-5 max-w-md">
            <h2 className="text-3xl font-semibold tracking-tight leading-tight">
              A low-friction weekly practice habit, an AI-guided study loop, and a real proctored gate.
            </h2>
            <p className="text-muted-foreground">
              Six domains. Four working months. One rule the whole system is built around: practice data
              is useful as a coaching signal but never decides who represents the school — that decision
              happens at the proctored mock, where it can&apos;t be faked.
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2"><Sparkles className="size-4 text-primary mt-0.5" /> Weekly AI-guided prompts you copy into Claude, Gemini, or ChatGPT.</li>
              <li className="flex gap-2"><Sparkles className="size-4 text-primary mt-0.5" /> Leaderboard on streaks and completion — never on AI scores.</li>
              <li className="flex gap-2"><Sparkles className="size-4 text-primary mt-0.5" /> Proctored mocks are the only thing that decides the team.</li>
            </ul>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Diagnostic week in July. Practice cycles in August. Maintenance in September. Sprint in October.
          Taper into November.
        </p>
      </div>

      {/* Right: login */}
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md shadow-sm">
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
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@school.edu"
                  autoComplete="email"
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

            <div className="mt-6 pt-6 border-t">
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Quick sign-in</p>
              <div className="space-y-1 max-h-72 overflow-y-auto pr-1 -mr-1">
                {QUICK_PICKS.map((p) => (
                  <button
                    key={p.email}
                    onClick={() => {
                      setEmail(p.email)
                      setPassword('olypmics2026')
                    }}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-accent transition-colors border border-transparent hover:border-border"
                  >
                    <div className="text-sm font-medium">{p.label}</div>
                    <div className="text-xs text-muted-foreground">{p.role}</div>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
