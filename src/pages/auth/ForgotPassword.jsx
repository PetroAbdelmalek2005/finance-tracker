import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

const COOLDOWN_SECONDS = 60

export default function ForgotPassword() {
  const [email,     setEmail]     = useState('')
  const [error,     setError]     = useState(null)
  const [loading,   setLoading]   = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [cooldown,  setCooldown]  = useState(0)

  // Countdown timer after each send
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) throw error
      setSubmitted(true)
      setCooldown(COOLDOWN_SECONDS)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-muted px-4">
        <div className="w-full max-w-sm rounded-xl border border-surface-border bg-surface p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50">
            <svg className="h-6 w-6 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="font-display text-2xl text-slate-900">Check your email</h2>
          <p className="mt-2 text-sm text-slate-500">
            If <strong>{email}</strong> is registered, you'll receive a reset link shortly.
            Check your spam folder if it doesn't arrive.
          </p>

          <p className="mt-4 text-xs text-slate-400">
            The link expires in 1 hour. Use it once — clicking it a second time won't work.
          </p>

          <div className="mt-6 space-y-2">
            {cooldown > 0 ? (
              <p className="text-xs text-slate-400">
                Resend available in {cooldown}s
              </p>
            ) : (
              <button
                onClick={() => setSubmitted(false)}
                className="text-sm font-medium text-brand-600 hover:underline"
              >
                Didn't get it? Send again
              </button>
            )}
            <div>
              <Link to="/login" className="text-sm text-slate-500 hover:underline">
                Back to sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-muted px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-semibold text-slate-900">Reset password</h1>
          <p className="mt-2 text-sm text-slate-500">
            Enter your email and we'll send you a reset link.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border border-surface-border bg-surface p-6 shadow-sm"
        >
          <Input
            id="email"
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={loading || cooldown > 0}>
            {loading ? 'Sending…' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Send reset link'}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-500">
          Remembered it?{' '}
          <Link to="/login" className="font-medium text-brand-600 hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
