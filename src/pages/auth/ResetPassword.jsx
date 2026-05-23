import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
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

export default function ResetPassword() {
  const navigate   = useNavigate()
  const authEvent  = useAuthStore((s) => s.authEvent)
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [error,    setError]    = useState(null)
  const [loading,  setLoading]  = useState(false)

  const { checks, score, strong } = checkPasswordStrength(password)

  // Valid recovery: Supabase fires PASSWORD_RECOVERY after processing the link.
  // Expired/invalid link: Supabase puts error params in the URL hash.
  // INITIAL_SESSION fires on every page load — do not treat it as expired.
  const isRecovery = authEvent === 'PASSWORD_RECOVERY'
  const isExpired  = window.location.hash.includes('error=')

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
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      await supabase.auth.signOut()
      navigate('/login', { replace: true, state: { message: 'Password updated. Please sign in with your new password.' } })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Link is expired or invalid
  if (isExpired) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-muted px-4">
        <div className="w-full max-w-sm rounded-xl border border-surface-border bg-surface p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
            <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <h2 className="font-display text-2xl text-slate-900">Link expired</h2>
          <p className="mt-2 text-sm text-slate-500">
            This reset link has expired or already been used. Request a new one.
          </p>
          <Link
            to="/forgot-password"
            className="mt-6 inline-block rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            Request new link
          </Link>
        </div>
      </div>
    )
  }

  // Waiting for PASSWORD_RECOVERY event
  if (!isRecovery) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-muted px-4">
        <div className="w-full max-w-sm rounded-xl border border-surface-border bg-surface p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          <p className="mt-2 text-sm text-slate-500">Verifying reset link…</p>
          <p className="mt-4 text-xs text-slate-400">
            Taking too long?{' '}
            <Link to="/forgot-password" className="text-brand-600 hover:underline">
              Request a new link
            </Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-muted px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-semibold text-slate-900">New password</h1>
          <p className="mt-2 text-sm text-slate-500">Choose a strong password for your account</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border border-surface-border bg-surface p-6 shadow-sm"
        >
          <div className="flex flex-col gap-1">
            <Input
              id="password"
              label="New password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              autoComplete="new-password"
              required
            />

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
            label="Confirm new password"
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
            {loading ? 'Updating…' : 'Update password'}
          </Button>
        </form>
      </div>
    </div>
  )
}
