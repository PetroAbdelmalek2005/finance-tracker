import { ArrowLeftRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'

export default function Transactions() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-slate-900">Transactions</h1>
        <p className="mt-1 text-sm text-slate-500">All your transactions in one place</p>
      </div>
      <Card>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <ArrowLeftRight className="h-5 w-5 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-700">Coming soon</p>
          <p className="mt-1 text-xs text-slate-400">Transactions sync after linking a bank account</p>
        </div>
      </Card>
    </div>
  )
}
