'use client'

import { api } from '@/lib/api-client'
import { useState, useMemo } from 'react'
import { Loader2, ArrowLeft, CheckCircle2, ChevronDown, ChevronUp, Eye, EyeOff, Check, X } from 'lucide-react'
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
  const [pending, setPending] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // Password strength: 0-4
  const passwordStrength = useMemo(() => {
    if (!password) return 0
    let score = 0
    if (password.length >= 8) score++
    if (password.length >= 12) score++
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
    if (/[0-9]/.test(password) && /[^a-zA-Z0-9]/.test(password)) score++
    return score
  }, [password])

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][passwordStrength]
  const strengthColor = ['', 'bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-emerald-500'][passwordStrength]
  const strengthText  = ['', 'text-red-500', 'text-orange-400', 'text-yellow-500', 'text-emerald-500'][passwordStrength]

  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword

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

    setPending(true)
    const loadingId = toast.loading('Submitting your registration…')
    api.registerAction({
      studentId: sId,
      nickname: nick,
      realName: real,
      password,
      avatarId,
    })
      .then((res) => {
        toast.dismiss(loadingId)
        setPending(false)
        if (res.ok) {
          toast.success('Registration submitted! Welcome to the program.')
          if (onLogin) {
            onLogin()
          } else {
            setRegistered(true)
          }
        } else {
          toast.error(res.error)
        }
      })
      .catch((err) => {
        toast.dismiss(loadingId)
        setPending(false)
        toast.error(err.message || 'An unexpected error occurred.')
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
          placeholder="e.g. E23-00345 or 2026-001"
          required
        />
        <p className="text-[11px] text-muted-foreground">
          Alphanumeric with dashes — e.g. <code className="bg-muted px-1 rounded">E23-00345</code>, <code className="bg-muted px-1 rounded">2026-001</code>
        </p>
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
          <div className="relative">
            <Input
              id="reg-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 8 chars"
              className="pr-9"
              required
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            </button>
          </div>
          {/* Strength bar */}
          {password.length > 0 && (
            <div className="space-y-1">
              <div className="flex gap-1">
                {[1,2,3,4].map(i => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                      i <= passwordStrength ? strengthColor : 'bg-muted'
                    }`}
                  />
                ))}
              </div>
              <p className={`text-[11px] font-medium ${strengthText}`}>{strengthLabel}</p>
            </div>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm-password">Confirm</Label>
          <div className="relative">
            <Input
              id="confirm-password"
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`pr-9 transition-colors ${
                passwordsMismatch ? 'border-red-500 focus-visible:ring-red-500/30' :
                passwordsMatch    ? 'border-emerald-500 focus-visible:ring-emerald-500/30' : ''
              }`}
              required
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowConfirm(v => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showConfirm ? 'Hide password' : 'Show password'}
            >
              {showConfirm ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            </button>
          </div>
          {/* Match indicator */}
          {confirmPassword.length > 0 && (
            <p className={`text-[11px] flex items-center gap-1 font-medium ${
              passwordsMatch ? 'text-emerald-500' : 'text-red-500'
            }`}>
              {passwordsMatch
                ? <><Check className="size-3" /> Passwords match</>  
                : <><X className="size-3" /> Passwords don&apos;t match</>}
            </p>
          )}
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
