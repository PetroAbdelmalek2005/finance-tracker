import { Building2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'

// Phase 3: this component will be replaced with the full react-plaid-link integration
// once Plaid credentials (PLAID_CLIENT_ID, PLAID_SECRET) are configured in Supabase Edge Functions.
export function PlaidLinkButton() {
  return (
    <div className="flex flex-col items-end gap-0.5">
      <Button variant="secondary" size="sm" disabled className="gap-1.5">
        <Building2 className="h-3.5 w-3.5" />
        Link Bank
      </Button>
      <p className="text-xs text-slate-400">Coming in Phase 3</p>
    </div>
  )
}
