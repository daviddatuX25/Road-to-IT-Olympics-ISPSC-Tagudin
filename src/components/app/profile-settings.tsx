'use client'

import { api } from '@/lib/api-client'
import { useState, useTransition, useEffect } from 'react'
import { Loader2, Save, UserCircle, Calendar, Flame, ClipboardCheck, Trophy, Palette, Check } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { getAvatar, AVATARS } from '@/lib/avatars'
import { DOMAINS, domainMeta } from '@/lib/domains'
import { currentManilaWeekStart } from '@/lib/timezone'
import { useTheme, THEMES, type ThemeKey } from '@/lib/use-theme'
import type { SessionUser } from '@/lib/auth'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

export function ProfileSettings({ user }: { user: SessionUser }) {
  const isPlaceholderEmail = user.email.endsWith('@ito.local')
  const [nickname, setNickname] = useState(user.nickname)
  const [avatarId, setAvatarId] = useState(user.avatarId)
  const [email, setEmail] = useState(isPlaceholderEmail ? '' : user.email)
  const [pending, startTransition] = useTransition()
  const [breakdown, setBreakdown] = useState<Awaited<ReturnType<typeof api.getStreakBreakdownAction>> | null>(null)

  useEffect(() => {
    void (async () => { setBreakdown(await api.getStreakBreakdownAction()) })()
  }, [])

  const weekStart = currentManilaWeekStart()
  const avatar = getAvatar(avatarId)
  const initialEmail = isPlaceholderEmail ? '' : user.email
  const dirty = nickname !== user.nickname || avatarId !== user.avatarId || email !== initialEmail

  function save() {
    startTransition(async () => {
      const r = await api.updateProfileAction({ nickname, avatarId, email })
      if (r.ok) {
        toast.success('Profile updated.')
      } else {
        toast.error(r.error)
      }
    })
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><UserCircle className="size-4" /> Profile</CardTitle>
          <CardDescription>
            Your nickname and avatar are public. Real name and student ID stay private to admin and instructor only.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-4">
            <Avatar className="size-16 border-2" style={{ borderColor: avatar.color }}>
              <AvatarFallback style={{ background: avatar.color, color: 'white' }} className="text-2xl">{avatar.glyph}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm text-muted-foreground">Currently: {avatar.label}</p>
              <p className="text-xs text-muted-foreground">Pick any of the 12 — feel free to change it whenever.</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Avatar</Label>
            <div className="grid grid-cols-6 sm:grid-cols-12 gap-2">
              {AVATARS.map(a => (
                <button
                  key={a.id}
                  onClick={() => setAvatarId(a.id)}
                  className={`size-11 rounded-md grid place-items-center text-lg border-2 transition-all ${avatarId === a.id ? 'border-primary scale-105' : 'border-transparent'}`}
                  style={{ background: a.color, color: 'white' }}
                  title={a.label}
                >
                  {a.glyph}
                </button>
              ))}
            </div>
          </div>

  <div className="space-y-1.5">
            <Label htmlFor="nickname">Nickname (public)</Label>
            <Input id="nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={32} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Recovery Email (private, for password recovery)</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={isPlaceholderEmail ? 'No recovery email set (e.g. name@domain.com)' : user.email}
              maxLength={100}
            />
            {isPlaceholderEmail && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400">
                ⚠️ You currently have a default placeholder email. Please set a real recovery email to use password recovery features.
              </p>
            )}
          </div>

          <Separator />

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Role</Label>
              <p className="text-sm capitalize">{user.role}</p>
            </div>
            {(user.realName || user.studentId) && (
              <>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Real name (private)</Label>
                  <p className="text-sm">{user.realName ?? '—'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Student ID (private)</Label>
                  <p className="text-sm font-mono">{user.studentId ?? '—'}</p>
                </div>
              </>
            )}
          </div>

          <Button onClick={save} disabled={!dirty || pending}>
            {pending ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Save className="size-4 mr-1.5" />}
            Save changes
          </Button>
        </CardContent>
      </Card>

      {/* Theme picker */}
      <ThemePicker />

      {/* Season context */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Calendar className="size-4" /> Current week</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">
            Week of <span className="font-medium">{format(weekStart, 'EEE MMM d, yyyy')}</span> ·{' '}
            <span className="text-muted-foreground">Asia/Manila · Monday to Sunday</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Streaks reset on Monday 00:00 Manila time. Submit at least once to a domain with an active milestone to keep that domain&apos;s streak alive. Missed weeks with active milestones break the streak — consistency is mastery.
          </p>
        </CardContent>
      </Card>

      {/* Per-domain streaks */}
      {breakdown && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Flame className="size-4 text-orange-500" /> Your streaks by domain</CardTitle>
            <CardDescription>Each domain tracks its own streak. Missed weeks with active milestones break it. Weeks with no active milestones (server downtime, admin pause) are automatically skipped.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {breakdown.map(b => {
              const meta = domainMeta(b.domainKey)
              const Icon = meta.icon
              return (
                <div key={b.domainId} className="flex items-center gap-3 p-2.5 rounded-md border">
                  <div className="size-8 rounded-md grid place-items-center shrink-0" style={{ background: `${meta.color}20`, color: meta.color }}>
                    <Icon className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{b.domainName}</p>
                    {b.thisWeekSubmitted ? (
                      <Badge variant="outline" className="text-[10px] mt-0.5 text-emerald-700 dark:text-emerald-400 border-emerald-500/40">
                        Submitted this week
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] mt-0.5 text-muted-foreground">
                        Not yet this week
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Flame className={`size-4 ${b.streak > 0 ? 'text-orange-500' : 'text-muted-foreground/40'}`} />
                    <span className="text-sm font-mono tabular-nums">{b.streak}</span>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
        <Trophy className="size-3" /> Road to IT Olympics · practice loop informs the gate, never substitutes for it
      </p>
    </div>
  )
}

void DOMAINS
void ClipboardCheck

function ThemePicker() {
  const { theme, setTheme } = useTheme()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><Palette className="size-4" /> Theme</CardTitle>
        <CardDescription>Pick a look. Stored in your browser, not your account — each device can have its own.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {THEMES.map((t) => (
            <button
              key={t.key}
              onClick={() => setTheme(t.key as ThemeKey)}
              className={cn(
                'relative text-left p-3 rounded-lg border-2 transition-all',
                theme === t.key ? 'border-primary shadow-sm' : 'border-border hover:border-primary/40',
              )}
            >
              {theme === t.key && (
                <div className="absolute top-2 right-2 size-5 rounded-full bg-primary text-primary-foreground grid place-items-center">
                  <Check className="size-3" />
                </div>
              )}
              <div className="flex gap-1 mb-2">
                {t.swatch.map((c, i) => (
                  <div key={i} className="size-6 rounded-md border" style={{ background: c }} />
                ))}
              </div>
              <p className="text-sm font-medium">{t.label}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{t.description}</p>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
