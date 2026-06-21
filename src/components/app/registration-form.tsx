'use client'

import { api } from '@/lib/api-client'
import { useState, useTransition } from 'react'
import { Loader2, ArrowLeft, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AVATARS } from '@/lib/avatars'
import { toast } from 'sonner'

export function RegistrationForm({
  onBackToLogin,
  onLogin,
}: {
  onBackToLogin: () => void
  onLogin?: () => void
}) {
  const [studentId, setStudentId] = useState('')
  const [nickname, setNickname] = useState('')
  const [realName, setRealName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [avatarId, setAvatarId] = useState('avatar-01')
  const [showAvatars, setShowAvatars] = useState(false)
  const [registered, setRegistered] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const sId = studentId.trim()
    const nick = nickname.trim()
    const real = realName.trim()

    if (sId.length < 2 || sId.length > 20) {
      toast.error('Student ID must be between 2 and 20 characters.')
      return
    }
    if (!/^[a-zA-Z0-9-]+$/.test(sId)) {
      toast.error('Student ID must be alphanumeric and can include dashes.')
      return
    }
    if (nick.length < 2 || nick.length > 32) {
      toast.error('Nickname must be between 2 and 32 characters.')
      return
    }
    if (real.length < 2 || real.length > 100) {
      toast.error('Real name must be between 2 and 100 characters.')
      return
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match.')
      return
    }

    startTransition(async () => {
      try {
        const res = await api.registerAction({
          studentId: sId,
          nickname: nick,
          realName: real,
          password,
          avatarId,
        })
        if (res.ok) {
          toast.success('Registration request submitted successfully!')
          if (onLogin) {
            onLogin()
          } else {
            setRegistered(true)
          }
        } else {
          toast.error(res.error)
        }
      } catch (err: any) {
        toast.error(err.message || 'An unexpected error occurred.')
      }
    })
  }

  if (registered) {
    return (
      <div className="space-y-6 text-center py-4 animate-in fade-in zoom-in duration-300">
        <div className="mx-auto size-14 rounded-full bg-emerald-100 dark:bg-emerald-950/50 grid place-items-center text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-8" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-semibold tracking-tight">You're registered!</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
            Your application has been submitted. Check back once an admin approves your account — it usually takes less than 24 hours.
          </p>
          <p className="text-xs text-muted-foreground/80 max-w-sm mx-auto leading-relaxed">
            In the meantime, you can already sign in and access the Leaderboard and Tutorial content.
          </p>
        </div>
        <Button onClick={onBackToLogin} className="w-full">
          Back to Sign In
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in duration-300">
      <div className="space-y-1.5">
        <Label htmlFor="studentId">Student ID</Label>
        <Input
          id="studentId"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          placeholder="e.g. 2026-001"
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="nickname">Nickname (Public display name)</Label>
        <Input
          id="nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="e.g. byte_knight"
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="realName">Real Name (Private, for admin verification)</Label>
        <Input
          id="realName"
          value={realName}
          onChange={(e) => setRealName(e.target.value)}
          placeholder="e.g. John Doe"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="reg-password">Password</Label>
          <Input
            id="reg-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min 8 chars"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm-password">Confirm</Label>
          <Input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-1.5 border rounded-lg p-3 bg-muted/20">
        <button
          type="button"
          onClick={() => setShowAvatars(!showAvatars)}
          className="flex items-center justify-between w-full text-left text-sm font-medium text-muted-foreground"
        >
          <div className="flex items-center gap-2">
            <span>Choose avatar (optional)</span>
            <span className="text-lg bg-background p-1 border rounded-md shadow-sm">
              {AVATARS.find((a) => a.id === avatarId)?.glyph || '🐯'}
            </span>
          </div>
          {showAvatars ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </button>

        {showAvatars && (
          <div className="grid grid-cols-6 gap-2 pt-3 border-t mt-2 animate-in slide-in-from-top-1 duration-200">
            {AVATARS.map((av) => (
              <button
                key={av.id}
                type="button"
                onClick={() => {
                  setAvatarId(av.id)
                  setShowAvatars(false)
                }}
                className={`aspect-square rounded-md flex items-center justify-center text-lg border transition-all hover:scale-105 ${
                  avatarId === av.id
                    ? 'border-primary ring-2 ring-primary/20 scale-105'
                    : 'border-transparent hover:border-muted-foreground/30'
                }`}
                style={{ backgroundColor: `${av.color}15` }}
                title={av.label}
              >
                <span>{av.glyph}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 pt-2">
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
          Submit Registration
        </Button>
        <Button type="button" variant="ghost" onClick={onBackToLogin} className="w-full">
          <ArrowLeft className="size-4 mr-2" /> Back to Sign In
        </Button>
      </div>
    </form>
  )
}
