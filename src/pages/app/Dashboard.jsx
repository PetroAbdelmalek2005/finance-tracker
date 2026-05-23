import { ArrowLeftRight } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { getGreeting } from '@/utils/formatters'

const summaryCards = [
  { title: 'Net Worth',       sub: 'Connect accounts to see your net worth' },
  { title: 'Monthly Income',  sub: 'No income transactions this month yet'   },
  { title: 'Monthly Spending', sub: 'No spending data available'             },
]

export default function Dashboard() {
  const { user } = useAuth()
  const displayName = user?.user_metadata?.full_name ?? user?.email?.split('@')[0]

  return (
    <div className="mx-auto max-w-4xl space-y-6">

      <div>
        <h1 className="font-display text-2xl font-semibold text-slate-900">
          {getGreeting()}, {displayName}
        </h1>
        <p className="mt-1 text-sm text-slate-500">Here's your financial overview</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {summaryCards.map((card) => (
          <Card key={card.title}>
            <CardHeader>
              <CardTitle>{card.title}</CardTitle>
            </CardHeader>
            <p className="text-2xl font-semibold text-slate-300">—</p>
            <p className="mt-1 text-xs text-slate-400">{card.sub}</p>
          </Card>
        ))}
      </div>

      {/* Recent transactions empty state */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <ArrowLeftRight className="h-5 w-5 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-700">No transactions yet</p>
          <p className="mt-1 text-xs text-slate-400">
            Transactions will appear here once you connect a bank account.
          </p>
        </div>
      </Card>

    </div>
  )
}
