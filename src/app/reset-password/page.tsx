'use client'

import { Suspense, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api-client'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!token) {
      toast.error('Token is missing. Please use the link sent to your email.')
      return
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters long.')
      return
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match.')
      return
    }

    setPending(true)
    const loadingId = toast.loading('Resetting your password…')

    try {
      const res = await api.resetPasswordAction(token, password)
      toast.dismiss(loadingId)
      setPending(false)
      if (res.ok) {
        toast.success('Password reset successful! You can now log in.')
        setSuccess(true)
      } else {
        toast.error(res.error)
      }
    } catch (err: any) {
      toast.dismiss(loadingId)
      setPending(false)
      toast.error(err.message || 'An unexpected error occurred.')
    }
  }

  if (!token) {
    return (
      <>
        <CardHeader className="text-center">
          <CardTitle className="text-xl font-bold text-destructive">Invalid Link</CardTitle>
          <CardDescription>
            This password reset link is invalid or missing a token.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button asChild className="w-full">
            <a href="/">Go back home</a>
          </Button>
        </CardContent>
      </>
    )
  }

  return (
    <>
      {!success ? (
        <>
          <CardHeader>
            <CardTitle className="text-xl font-bold tracking-tight">Reset Password</CardTitle>
            <CardDescription>
              Enter a strong, secure new password for your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  disabled={pending}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  required
                  disabled={pending}
                />
              </div>

              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                Save Password & Sign In
              </Button>
            </form>
          </CardContent>
        </>
      ) : (
        <>
          <CardHeader className="text-center">
            <div className="mx-auto my-3 size-12 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 grid place-items-center">
              <CheckCircle2 className="size-6" />
            </div>
            <CardTitle className="text-lg font-bold tracking-tight">Password Updated</CardTitle>
            <CardDescription>
              Your password has been successfully reset.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-xs text-muted-foreground">
              You can now sign in using your new credentials.
            </p>
            <Button asChild className="w-full">
              <a href="/">Log In</a>
            </Button>
          </CardContent>
        </>
      )}
    </>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md shadow-lg border border-border/30 bg-card/60 backdrop-blur-md">
        <Suspense fallback={
          <div className="p-12 flex flex-col items-center justify-center">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="mt-3 text-xs text-muted-foreground animate-pulse">Initializing reset form…</p>
          </div>
        }>
          <ResetPasswordForm />
        </Suspense>
      </Card>
    </div>
  )
}
