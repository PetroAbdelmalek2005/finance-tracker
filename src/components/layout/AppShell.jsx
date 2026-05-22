import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  ArrowLeftRight,
  Landmark,
  TrendingUp,
  Settings,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

const navItems = [
  { to: '/dashboard',    label: 'Dashboard',     Icon: LayoutDashboard },
  { to: '/transactions', label: 'Transactions',  Icon: ArrowLeftRight  },
  { to: '/accounts',     label: 'Accounts',      Icon: Landmark        },
  { to: '/investments',  label: 'Investments',   Icon: TrendingUp      },
  { to: '/settings',     label: 'Settings',      Icon: Settings        },
]

export default function AppShell() {
  const { user, signOut } = useAuth()

  return (
    <div className="flex h-screen bg-surface-muted">

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-[220px] md:flex-col border-r border-surface-border bg-surface">
        <div className="flex h-16 items-center border-b border-surface-border px-5">
          <span className="font-display text-lg font-semibold text-brand-700">
            Finance Tracker
          </span>
        </div>

        <nav className="flex-1 space-y-0.5 p-3">
          {navItems.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-50 text-brand-600'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-surface-border p-3">
          <p className="truncate px-3 py-1 text-xs text-slate-400">{user?.email}</p>
          <button
            onClick={signOut}
            className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm text-slate-600
                       transition-colors hover:bg-slate-50 hover:text-red-600"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-4 pb-24 md:p-6 md:pb-6">
          <Outlet />
        </main>

        {/* Mobile bottom nav */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center
                        justify-around border-t border-surface-border bg-surface md:hidden">
          {navItems.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-3 py-1 ${
                  isActive ? 'text-brand-500' : 'text-slate-400'
                }`
              }
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

    </div>
  )
}
