'use client'

import { api } from '@/lib/api-client'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { RegistrationForm } from './registration-form'

export function Login({ onLogin }: { onLogin: () => void }) {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'signin' | 'register'>('signin')
  const [pending, setPending] = useState(false)

  function submit(e: React.FormEvent) {
    e.preventDefault()

    const id = identifier.trim()
    if (!id) {
      toast.error('Please enter your Email or Student ID.')
      return
    }
    if (!password) {
      toast.error('Please enter your password.')
      return
    }

    setPending(true)
    const loadingId = toast.loading('Signing you in…')
    api.loginAction(id, password)
      .then((result) => {
        toast.dismiss(loadingId)
        setPending(false)
        if (result.ok) {
          toast.success('Welcome back! Signed in successfully.')
          onLogin()
        } else {
          toast.error(result.error)
        }
      })
      .catch((err) => {
        toast.dismiss(loadingId)
        setPending(false)
        toast.error(err.message || 'An unexpected error occurred.')
      })
  }

  return (
    <Card className="w-full border-none shadow-none bg-transparent">
      {mode === 'signin' ? (
        <>
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-xl font-bold tracking-tight">Sign in to Road to IT Olympics</CardTitle>
            <CardDescription>
              Enter your credentials below to access the platform.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="identifier">Email / Student ID</Label>
                <Input
                  id="identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Enter your Email or Student ID"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <a href="/forgot-password" className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline">
                    Forgot password?
                  </a>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
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
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-xl font-bold tracking-tight">Student Registration</CardTitle>
            <CardDescription>
              Apply to join the training program. All applications require administrator approval.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <RegistrationForm onBackToLogin={() => setMode('signin')} onLogin={onLogin} />
          </CardContent>
        </>
      )}
    </Card>
  )
}
