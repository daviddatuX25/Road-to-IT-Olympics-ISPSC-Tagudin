'use client'

import { api } from '@/lib/api-client'
import { useState } from 'react'
import { Loader2, ArrowLeft, MailCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState('')
  const [pending, setPending] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = identifier.trim()
    if (!trimmed) {
      toast.error('Please enter your Email or Student ID.')
      return
    }

    setPending(true)
    const loadingId = toast.loading('Sending password reset link…')
    
    try {
      const res = await api.requestPasswordResetAction(trimmed)
      toast.dismiss(loadingId)
      setPending(false)
      if (res.ok) {
        toast.success('Reset link generated successfully!')
        setSent(true)
      } else {
        toast.error(res.error)
      }
    } catch (err: any) {
      toast.dismiss(loadingId)
      setPending(false)
      toast.error(err.message || 'An unexpected error occurred.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md shadow-lg border border-border/30 bg-card/60 backdrop-blur-md">
        {!sent ? (
          <>
            <CardHeader>
              <CardTitle className="text-xl font-bold tracking-tight">Forgot Password</CardTitle>
              <CardDescription>
                Enter your Email or Student ID. If you have a configured recovery email, we will send you a reset link.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="identifier">Email / Student ID</Label>
                  <Input
                    id="identifier"
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. 2024-001 or admin@ito.test"
                    required
                    disabled={pending}
                  />
                </div>
                
                <Button type="submit" className="w-full" disabled={pending}>
                  {pending ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                  Send Reset Link
                </Button>
              </form>

              <div className="mt-6 pt-4 border-t text-center">
                <a href="/" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 hover:underline">
                  <ArrowLeft className="size-3" />
                  Back to Sign In
                </a>
              </div>
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto my-3 size-12 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 grid place-items-center">
                <MailCheck className="size-6" />
              </div>
              <CardTitle className="text-lg font-bold tracking-tight">Check your inbox</CardTitle>
              <CardDescription className="text-xs">
                We have processed your request. If a matching user exists and has a valid recovery email, a password reset link has been dispatched.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg border border-border/10">
                💡 <strong>Development Notice:</strong> If running locally or no Resend API key is configured, check your terminal server console logs / <code>dev.log</code> to view the reset link.
              </p>
              
              <Button asChild className="w-full" variant="outline">
                <a href="/">Return to login</a>
              </Button>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  )
}
