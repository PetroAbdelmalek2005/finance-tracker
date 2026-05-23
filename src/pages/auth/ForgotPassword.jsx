import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function ForgotPassword() {
  const [email,     setEmail]     = useState('')
  const [error,     setError]     = useState(null)
  const [loading,   setLoading]   = useState(false)
  const [submitted, setSubmitted] = useState(false)

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
          <h2 className="font-display text-2xl text-slate-900">Check your email</h2>
          <p className="mt-2 text-sm text-slate-500">
            If that email is registered, you'll receive a reset link shortly.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-block text-sm font-medium text-brand-600 hover:underline"
          >
            Back to sign in
          </Link>
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

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Sending…' : 'Send reset link'}
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
