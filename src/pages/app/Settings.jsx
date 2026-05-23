import { useAuth } from '@/hooks/useAuth'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export default function Settings() {
  const { user, signOut } = useAuth()

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Manage your account</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-slate-400">Email</p>
            <p className="mt-0.5 text-sm font-medium text-slate-900">{user?.email}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Member since</p>
            <p className="mt-0.5 text-sm font-medium text-slate-900">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sign out</CardTitle>
        </CardHeader>
        <p className="mb-4 text-sm text-slate-500">
          You'll be returned to the login page.
        </p>
        <Button variant="danger" onClick={signOut}>
          Sign out
        </Button>
      </Card>
    </div>
  )
}
