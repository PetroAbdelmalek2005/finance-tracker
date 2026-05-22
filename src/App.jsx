import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import ProtectedRoute from '@/components/ProtectedRoute'
import AppShell from '@/components/layout/AppShell'

import Login          from '@/pages/auth/Login'
import SignUp         from '@/pages/auth/SignUp'
import ForgotPassword from '@/pages/auth/ForgotPassword'
import Dashboard      from '@/pages/app/Dashboard'

export default function App() {
  const initialize = useAuthStore((s) => s.initialize)

  useEffect(() => {
    const { unsubscribe } = initialize()
    return unsubscribe
  }, [initialize])

  return (
    <Routes>
      {/* Public auth routes */}
      <Route path="/login"           element={<Login />} />
      <Route path="/signup"          element={<SignUp />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      {/* Protected app routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<Dashboard />} />
        </Route>
      </Route>

      {/* Root → dashboard (ProtectedRoute handles redirect to /login if unauthed) */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
