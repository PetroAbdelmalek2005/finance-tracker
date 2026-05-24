import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

function getUserId() {
  return useAuthStore.getState().user?.id
}

export const useFinanceStore = create((set, get) => ({
  accounts: [],
  accountsLoading: false,
  accountsError: null,

  transactions: [],
  transactionsLoading: false,
  transactionsError: null,
  transactionsMeta: { total: 0, page: 0, pageSize: 50 },

  budgets: [],
  budgetsLoading: false,

  goals: [],
  goalsLoading: false,

  stocks: [],
  stocksLoading: false,

  usdCadRate: 1.36,
  rateLoading: false,

  txFilters: { startDate: null, endDate: null, accountId: null, type: null, category: null },

  // ── Bootstrap ──────────────────────────────────────────────
  async fetchAll() {
    const { fetchAccounts, fetchTransactions, fetchBudgets, fetchGoals, fetchUsdRate } = get()
    await Promise.all([fetchAccounts(), fetchTransactions(), fetchBudgets(), fetchGoals(), fetchUsdRate()])
  },

  clearAll() {
    set({
      accounts: [], accountsError: null,
      transactions: [], transactionsError: null,
      transactionsMeta: { total: 0, page: 0, pageSize: 50 },
      budgets: [], goals: [], stocks: [],
    })
  },

  // ── Accounts ───────────────────────────────────────────────
  async fetchAccounts() {
    set({ accountsLoading: true, accountsError: null })
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .order('created_at', { ascending: true })
    set({ accounts: data ?? [], accountsLoading: false, accountsError: error?.message ?? null })
  },

  async addAccount({ name, type, balance, currency }) {
    const user_id = getUserId()
    const { data, error } = await supabase
      .from('accounts')
      .insert({ user_id, name, type, balance: parseFloat(balance), currency })
      .select()
      .single()
    if (error) throw error
    set(s => ({ accounts: [...s.accounts, data] }))
    return data
  },

  async updateAccount(id, fields) {
    const { data, error } = await supabase
      .from('accounts')
      .update(fields)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    set(s => ({ accounts: s.accounts.map(a => (a.id === id ? data : a)) }))
    return data
  },

  async deleteAccount(id) {
    const { error } = await supabase.from('accounts').delete().eq('id', id)
    if (error) throw error
    set(s => ({
      accounts: s.accounts.filter(a => a.id !== id),
      transactions: s.transactions.filter(t => t.account_id !== id),
    }))
  },

  // ── Transactions ───────────────────────────────────────────
  async fetchTransactions(overrideFilters = {}) {
    set({ transactionsLoading: true, transactionsError: null })
    const filters = { ...get().txFilters, ...overrideFilters }
    const { pageSize } = get().transactionsMeta

    let query = supabase
      .from('transactions')
      .select('*', { count: 'exact' })
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(0, pageSize - 1)

    if (filters.startDate) query = query.gte('date', filters.startDate)
    if (filters.endDate)   query = query.lte('date', filters.endDate)
    if (filters.accountId) query = query.eq('account_id', filters.accountId)
    if (filters.type)      query = query.eq('type', filters.type)
    if (filters.category)  query = query.eq('category', filters.category)

    const { data, error, count } = await query
    set({
      transactions: data ?? [],
      transactionsLoading: false,
      transactionsError: error?.message ?? null,
      transactionsMeta: { ...get().transactionsMeta, total: count ?? 0, page: 0 },
    })
  },

  async loadMoreTransactions() {
    const { transactionsMeta, transactions, txFilters } = get()
    const nextPage = transactionsMeta.page + 1
    const from = nextPage * transactionsMeta.pageSize
    const to = from + transactionsMeta.pageSize - 1

    let query = supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (txFilters.startDate) query = query.gte('date', txFilters.startDate)
    if (txFilters.endDate)   query = query.lte('date', txFilters.endDate)
    if (txFilters.accountId) query = query.eq('account_id', txFilters.accountId)
    if (txFilters.type)      query = query.eq('type', txFilters.type)
    if (txFilters.category)  query = query.eq('category', txFilters.category)

    const { data } = await query
    set({
      transactions: [...transactions, ...(data ?? [])],
      transactionsMeta: { ...transactionsMeta, page: nextPage },
    })
  },

  async addTransaction({ date, description, type, amount, category, account_id, bucket, due_date, goal_id }) {
    const user_id = getUserId()
    const parsed = parseFloat(amount)
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        user_id, date, description, type, amount: parsed, category, account_id,
        bucket: bucket || null,
        due_date: due_date || null,
        goal_id: goal_id || null,
      })
      .select()
      .single()
    if (error) throw error

    const balanceDelta = type === 'income' ? parsed : -parsed
    set(s => ({
      transactions: [data, ...s.transactions],
      accounts: s.accounts.map(a =>
        a.id === account_id ? { ...a, balance: a.balance + balanceDelta } : a
      ),
      transactionsMeta: { ...s.transactionsMeta, total: s.transactionsMeta.total + 1 },
    }))
    return data
  },

  async addTransfer({ date, description, amount, fromAccountId, toAccountId, category, bucket }) {
    const user_id = getUserId()
    const parsed = parseFloat(amount)
    const xfer_ref = crypto.randomUUID()

    const { data, error } = await supabase
      .from('transactions')
      .insert([
        {
          user_id, date, description, type: 'transfer', amount: parsed,
          category, account_id: fromAccountId, xfer_ref, xfer_dir: 'out',
          bucket: bucket || null,
        },
        {
          user_id, date, description, type: 'transfer', amount: parsed,
          category, account_id: toAccountId, xfer_ref, xfer_dir: 'in',
          bucket: bucket || null,
        },
      ])
      .select()
    if (error) throw error

    set(s => ({
      transactions: [...data, ...s.transactions],
      accounts: s.accounts.map(a => {
        if (a.id === fromAccountId) return { ...a, balance: a.balance - parsed }
        if (a.id === toAccountId)   return { ...a, balance: a.balance + parsed }
        return a
      }),
      transactionsMeta: { ...s.transactionsMeta, total: s.transactionsMeta.total + 2 },
    }))
    return data
  },

  async updateTransaction(id, fields) {
    const { data, error } = await supabase
      .from('transactions')
      .update(fields)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    set(s => ({ transactions: s.transactions.map(tx => (tx.id === id ? data : tx)) }))
    await get().fetchAccounts()
    return data
  },

  async deleteTransaction(id) {
    const tx = get().transactions.find(t => t.id === id)
    if (!tx) return

    if (tx.type === 'transfer' && tx.xfer_ref) {
      const { error } = await supabase.from('transactions').delete().eq('xfer_ref', tx.xfer_ref)
      if (error) throw error
      set(s => ({ transactions: s.transactions.filter(t => t.xfer_ref !== tx.xfer_ref) }))
    } else {
      const { error } = await supabase.from('transactions').delete().eq('id', id)
      if (error) throw error
      set(s => ({ transactions: s.transactions.filter(t => t.id !== id) }))
    }
    await get().fetchAccounts()
  },

  setTxFilters(filters) {
    set(s => ({ txFilters: { ...s.txFilters, ...filters } }))
    get().fetchTransactions()
  },

  // ── Budgets ────────────────────────────────────────────────
  async fetchBudgets() {
    set({ budgetsLoading: true })
    const { data } = await supabase.from('budgets').select('*').order('category')
    set({ budgets: data ?? [], budgetsLoading: false })
  },

  async upsertBudget({ category, amount }) {
    const user_id = getUserId()
    const { data, error } = await supabase
      .from('budgets')
      .upsert({ user_id, category, amount: parseFloat(amount) }, { onConflict: 'user_id,category' })
      .select()
      .single()
    if (error) throw error
    set(s => {
      const exists = s.budgets.find(b => b.category === category)
      return {
        budgets: exists
          ? s.budgets.map(b => (b.category === category ? data : b))
          : [...s.budgets, data],
      }
    })
    return data
  },

  async deleteBudget(id) {
    const { error } = await supabase.from('budgets').delete().eq('id', id)
    if (error) throw error
    set(s => ({ budgets: s.budgets.filter(b => b.id !== id) }))
  },

  // ── Goals ──────────────────────────────────────────────────
  async fetchGoals() {
    set({ goalsLoading: true })
    const { data } = await supabase.from('goals').select('*').order('created_at')
    set({ goals: data ?? [], goalsLoading: false })
  },

  async addGoal({ name, target_amount, current_amount, deadline, linked_account_id, track_mode }) {
    const user_id = getUserId()
    const { data, error } = await supabase
      .from('goals')
      .insert({
        user_id, name, target_amount, current_amount: current_amount ?? 0,
        deadline: deadline || null,
        linked_account_id: linked_account_id || null,
        track_mode,
      })
      .select()
      .single()
    if (error) throw error
    set(s => ({ goals: [...s.goals, data] }))
    return data
  },

  async updateGoal(id, fields) {
    const { data, error } = await supabase
      .from('goals')
      .update(fields)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    set(s => ({ goals: s.goals.map(g => (g.id === id ? data : g)) }))
    return data
  },

  async deleteGoal(id) {
    const { error } = await supabase.from('goals').delete().eq('id', id)
    if (error) throw error
    set(s => ({ goals: s.goals.filter(g => g.id !== id) }))
  },

  // ── USD Rate ───────────────────────────────────────────────
  async fetchUsdRate() {
    set({ rateLoading: true })
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('usd_cad_rate, rate_fetched_at')
        .single()

      // PGRST116 = no rows found; treat as stale
      const stale =
        error?.code === 'PGRST116' ||
        !data?.rate_fetched_at ||
        Date.now() - new Date(data.rate_fetched_at).getTime() > 24 * 60 * 60 * 1000

      if (data && !stale) {
        set({ usdCadRate: parseFloat(data.usd_cad_rate), rateLoading: false })
        return
      }

      const res = await fetch('https://open.er-api.com/v6/latest/USD')
      const json = await res.json()
      const rate = json?.rates?.CAD ?? 1.36

      const user_id = getUserId()
      await supabase
        .from('user_preferences')
        .upsert({ user_id, usd_cad_rate: rate, rate_fetched_at: new Date().toISOString() })

      set({ usdCadRate: rate, rateLoading: false })
    } catch {
      set({ rateLoading: false })
    }
  },
}))
