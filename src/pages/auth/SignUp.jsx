import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { checkPasswordStrength } from '@/utils/formatters'

const requirementLabels = {
  length:    'At least 12 characters',
  uppercase: 'One uppercase letter',
  lowercase: 'One lowercase letter',
  number:    'One number',
  special:   'One special character (!@#$...)',
}

const strengthLabel = ['', 'Very weak', 'Weak', 'Fair', 'Strong', 'Very strong']
const strengthColor  = ['', 'bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-blue-400', 'bg-green-500']

export default function SignUp() {
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [error,     setError]     = useState(null)
  const [loading,   setLoading]   = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const { checks, score, strong } = checkPasswordStrength(password)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!strong) {
      setError('Please meet all password requirements before continuing.')
      return
    }
    if (password !== confirm) {
      setError("Passwords don't match.")
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) throw error
      // Supabase returns identities: [] when the email is already registered
      if (data.user?.identities?.length === 0) {
        throw new Error('An account with this email already exists. Try signing in instead.')
      }
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
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50">
            <svg className="h-6 w-6 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="font-display text-2xl text-slate-900">Check your email</h2>
          <p className="mt-2 text-sm text-slate-500">
            We sent a confirmation link to <strong>{email}</strong>.
            Click it to activate your account.
          </p>
          <p className="mt-3 text-xs text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-600 hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-muted px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-semibold text-slate-900">Create account</h1>
          <p className="mt-2 text-sm text-slate-500">Start tracking your finances</p>
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

          <div className="flex flex-col gap-1">
            <Input
              id="password"
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              autoComplete="new-password"
              required
            />

            {/* Strength bar */}
            {password.length > 0 && (
              <div className="mt-1 space-y-2">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        i <= score ? strengthColor[score] : 'bg-slate-200'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-slate-500">{strengthLabel[score]}</p>

                {/* Requirements checklist */}
                <ul className="space-y-0.5">
                  {Object.entries(checks).map(([key, met]) => (
                    <li key={key} className={`flex items-center gap-1.5 text-xs ${met ? 'text-green-600' : 'text-slate-400'}`}>
                      <span>{met ? '✓' : '○'}</span>
                      {requirementLabels[key]}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <Input
            id="confirm"
            label="Confirm password"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••••••"
            autoComplete="new-password"
            required
            error={confirm.length > 0 && confirm !== password ? "Passwords don't match" : undefined}
          />

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-brand-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
