import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useFinanceStore } from '@/store/financeStore'
import ProtectedRoute from '@/components/ProtectedRoute'
import AppShell from '@/components/layout/AppShell'

import Login          from '@/pages/auth/Login'
import SignUp         from '@/pages/auth/SignUp'
import ForgotPassword from '@/pages/auth/ForgotPassword'
import ResetPassword  from '@/pages/auth/ResetPassword'

import Dashboard     from '@/pages/app/Dashboard'
import Accounts      from '@/pages/app/Accounts'
import Transactions  from '@/pages/app/Transactions'
import Investments   from '@/pages/app/Investments'
import Settings      from '@/pages/app/Settings'

export default function App() {
  const initialize = useAuthStore((s) => s.initialize)
  const user       = useAuthStore((s) => s.user)
  const loading    = useAuthStore((s) => s.loading)
  const fetchAll   = useFinanceStore((s) => s.fetchAll)
  const clearAll   = useFinanceStore((s) => s.clearAll)

  useEffect(() => {
    const { unsubscribe } = initialize()
    return unsubscribe
  }, [initialize])

  useEffect(() => {
    if (loading) return
    if (user) {
      fetchAll()
    } else {
      clearAll()
    }
  }, [user, loading, fetchAll, clearAll])

  return (
    <Routes>
      {/* Public auth routes */}
      <Route path="/login"           element={<Login />} />
      <Route path="/signup"          element={<SignUp />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password"  element={<ResetPassword />} />

      {/* Protected app routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/dashboard"    element={<Dashboard />} />
          <Route path="/accounts"     element={<Accounts />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/investments"  element={<Investments />} />
          <Route path="/settings"     element={<Settings />} />
        </Route>
      </Route>

      {/* Root → dashboard */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
