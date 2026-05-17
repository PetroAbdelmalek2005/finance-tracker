import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { AppState as RNAppState } from 'react-native';
import { AppState, Account, Transaction, Budget, AppConfig } from '../types';
import { loadState, saveState, DEFAULT_STATE } from '../services/storage';
import { pushToSheets } from '../services/sheets';
import { nanoid } from 'nanoid/non-secure';

interface AppStateContextType {
  state: AppState;
  loading: boolean;
  syncing: boolean;
  updateConfig: (cfg: Partial<AppConfig>) => void;
  setAccounts: (accounts: Account[]) => void;
  addTransactions: (txs: Transaction[]) => void;
  updateTransaction: (id: string, patch: Partial<Transaction>) => void;
  addBudget: (budget: Budget) => void;
  updateBudget: (id: string, patch: Partial<Budget>) => void;
  deleteBudget: (id: string) => void;
  updateAccountBalances: (map: Record<string, number>) => void;
  syncNow: () => Promise<void>;
}

const Ctx = createContext<AppStateContextType | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(DEFAULT_STATE);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadState().then((s) => {
      setState(s);
      setLoading(false);
    });
  }, []);

  const persist = useCallback((next: AppState) => {
    setState(next);
    saveState(next);
    if (next.config.autoSync && next.config.sheetsScriptUrl) {
      if (syncTimer.current) clearTimeout(syncTimer.current);
      syncTimer.current = setTimeout(() => {
        pushToSheets(next.config.sheetsScriptUrl, next).catch(() => {});
      }, 3000);
    }
  }, []);

  const syncNow = useCallback(async () => {
    if (!state.config.sheetsScriptUrl) return;
    setSyncing(true);
    try {
      await pushToSheets(state.config.sheetsScriptUrl, state);
      persist({ ...state, lastSynced: new Date().toISOString() });
    } catch {
    } finally {
      setSyncing(false);
    }
  }, [state, persist]);

  const updateConfig = useCallback((cfg: Partial<AppConfig>) => {
    persist({ ...state, config: { ...state.config, ...cfg } });
  }, [state, persist]);

  const setAccounts = useCallback((accounts: Account[]) => {
    persist({ ...state, accounts });
  }, [state, persist]);

  const addTransactions = useCallback((txs: Transaction[]) => {
    // Merge, deduplicating by plaidTransactionId or id
    const existingIds = new Set(state.transactions.map((t) => t.plaidTransactionId ?? t.id));
    const fresh = txs.filter((t) => !(t.plaidTransactionId ? existingIds.has(t.plaidTransactionId) : existingIds.has(t.id)));
    persist({ ...state, transactions: [...state.transactions, ...fresh] });
  }, [state, persist]);

  const updateTransaction = useCallback((id: string, patch: Partial<Transaction>) => {
    persist({
      ...state,
      transactions: state.transactions.map((t) => t.id === id ? { ...t, ...patch } : t),
    });
  }, [state, persist]);

  const addBudget = useCallback((budget: Budget) => {
    persist({ ...state, budgets: [...state.budgets, budget] });
  }, [state, persist]);

  const updateBudget = useCallback((id: string, patch: Partial<Budget>) => {
    persist({
      ...state,
      budgets: state.budgets.map((b) => b.id === id ? { ...b, ...patch } : b),
    });
  }, [state, persist]);

  const deleteBudget = useCallback((id: string) => {
    persist({ ...state, budgets: state.budgets.filter((b) => b.id !== id) });
  }, [state, persist]);

  const updateAccountBalances = useCallback((map: Record<string, number>) => {
    persist({
      ...state,
      accounts: state.accounts.map((a) =>
        a.plaidAccountId && map[a.plaidAccountId] !== undefined
          ? { ...a, balance: map[a.plaidAccountId] }
          : a
      ),
    });
  }, [state, persist]);

  return (
    <Ctx.Provider value={{
      state, loading, syncing,
      updateConfig, setAccounts, addTransactions, updateTransaction,
      addBudget, updateBudget, deleteBudget, updateAccountBalances, syncNow,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAppState(): AppStateContextType {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
}
