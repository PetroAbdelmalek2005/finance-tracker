import React, { useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppState } from '../state/AppStateContext';
import { SpendingChart } from '../components/SpendingChart';
import { BudgetBar } from '../components/BudgetBar';
import { CATEGORY_COLORS } from '../constants/categories';
import { theme } from '../constants/theme';
import { CategorySummary } from '../types';
import dayjs from 'dayjs';

export function DashboardScreen({ navigation }: any) {
  const { state, syncNow, syncing } = useAppState();

  const thisMonth = dayjs().format('YYYY-MM');

  const netWorth = useMemo(() =>
    state.accounts.reduce((s, a) => s + a.balance, 0),
    [state.accounts]
  );

  const pendingReview = useMemo(() =>
    state.transactions.filter((t) => !t.reviewed && t.aiCategory).length,
    [state.transactions]
  );

  const summaries = useMemo<CategorySummary[]>(() => {
    const monthTx = state.transactions.filter(
      (t) => t.date.startsWith(thisMonth) && t.amount > 0
    );
    const grouped: Record<string, number> = {};
    const counts: Record<string, number> = {};
    for (const t of monthTx) {
      grouped[t.category] = (grouped[t.category] ?? 0) + t.amount;
      counts[t.category] = (counts[t.category] ?? 0) + 1;
    }
    return Object.entries(grouped).map(([category, spent]) => ({
      category,
      spent,
      budget: state.budgets.find((b) => b.category === category)?.monthlyLimit ?? 0,
      transactionCount: counts[category] ?? 0,
      color: CATEGORY_COLORS[category] ?? theme.colors.textMuted,
    })).sort((a, b) => b.spent - a.spent);
  }, [state.transactions, state.budgets, thisMonth]);

  const topSummaries = summaries.slice(0, 4);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={syncing} onRefresh={syncNow} tintColor={theme.colors.accent} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good {greeting()}</Text>
          <Text style={styles.subGreeting}>{dayjs().format('MMMM YYYY')}</Text>
        </View>
        <TouchableOpacity style={styles.syncBtn} onPress={syncNow} disabled={syncing}>
          <Ionicons name={syncing ? 'sync' : 'cloud-upload-outline'} size={20} color={theme.colors.accent} />
        </TouchableOpacity>
      </View>

      {/* Net Worth Card */}
      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>Net Worth</Text>
        <Text style={styles.heroAmount}>${netWorth.toLocaleString('en-CA', { minimumFractionDigits: 2 })}</Text>
        <Text style={styles.heroSub}>{state.accounts.length} account{state.accounts.length !== 1 ? 's' : ''} linked</Text>
      </View>

      {/* Review Banner */}
      {pendingReview > 0 && (
        <TouchableOpacity style={styles.reviewBanner} onPress={() => navigation.navigate('Review')}>
          <View style={styles.reviewBannerLeft}>
            <Ionicons name="sparkles" size={18} color={theme.colors.accent} />
            <Text style={styles.reviewBannerText}>
              AI categorized {pendingReview} transaction{pendingReview !== 1 ? 's' : ''} — tap to review
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.accent} />
        </TouchableOpacity>
      )}

      {/* Spending Chart */}
      <Text style={styles.sectionTitle}>Spending This Month</Text>
      <SpendingChart summaries={summaries} />

      {/* Budget Bars */}
      {topSummaries.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Budget Progress</Text>
          {topSummaries.map((s) => (
            <BudgetBar key={s.category} summary={s} />
          ))}
          {summaries.length > 4 && (
            <TouchableOpacity onPress={() => navigation.navigate('Budgets')}>
              <Text style={styles.seeAll}>See all categories →</Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {/* Accounts */}
      <Text style={styles.sectionTitle}>Accounts</Text>
      {state.accounts.length === 0 ? (
        <TouchableOpacity style={styles.emptyCard} onPress={() => navigation.navigate('Settings')}>
          <Ionicons name="card-outline" size={32} color={theme.colors.textMuted} />
          <Text style={styles.emptyTitle}>No accounts linked</Text>
          <Text style={styles.emptyBody}>Connect your bank via Plaid in Settings</Text>
        </TouchableOpacity>
      ) : (
        state.accounts.map((acc) => (
          <View key={acc.id} style={styles.accountCard}>
            <View>
              <Text style={styles.accountName}>{acc.name}</Text>
              <Text style={styles.accountMeta}>{acc.institution} {acc.mask ? `·· ${acc.mask}` : ''}</Text>
            </View>
            <Text style={styles.accountBalance}>${acc.balance.toFixed(2)}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: theme.spacing.md, paddingBottom: 100 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: theme.spacing.lg,
  },
  greeting: { fontSize: theme.font.xxl, fontWeight: '700', color: theme.colors.textPrimary },
  subGreeting: { fontSize: theme.font.sm, color: theme.colors.textSecondary, marginTop: 2 },
  syncBtn: {
    width: 40, height: 40, borderRadius: theme.radius.full,
    backgroundColor: theme.colors.accentDim,
    alignItems: 'center', justifyContent: 'center',
  },
  heroCard: {
    backgroundColor: theme.colors.accent, borderRadius: theme.radius.xl,
    padding: theme.spacing.lg, marginBottom: theme.spacing.md,
  },
  heroLabel: { fontSize: theme.font.sm, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  heroAmount: { fontSize: theme.font.xxxl, fontWeight: '800', color: '#fff', marginBottom: 4 },
  heroSub: { fontSize: theme.font.sm, color: 'rgba(255,255,255,0.6)' },
  reviewBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: theme.colors.accentDim, borderRadius: theme.radius.md,
    padding: theme.spacing.md, marginBottom: theme.spacing.md,
    borderWidth: 1, borderColor: theme.colors.accent + '44',
  },
  reviewBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  reviewBannerText: { fontSize: theme.font.sm, color: theme.colors.accentLight, flex: 1 },
  sectionTitle: {
    fontSize: theme.font.lg, fontWeight: '700', color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm, marginTop: theme.spacing.md,
  },
  seeAll: { color: theme.colors.accent, fontSize: theme.font.sm, textAlign: 'center', paddingVertical: 8 },
  emptyCard: {
    backgroundColor: theme.colors.bgCard, borderRadius: theme.radius.lg,
    padding: theme.spacing.xl, alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: theme.colors.border, borderStyle: 'dashed',
  },
  emptyTitle: { fontSize: theme.font.md, fontWeight: '600', color: theme.colors.textSecondary },
  emptyBody: { fontSize: theme.font.sm, color: theme.colors.textMuted, textAlign: 'center' },
  accountCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: theme.colors.bgCard, borderRadius: theme.radius.md,
    padding: theme.spacing.md, marginBottom: theme.spacing.sm,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  accountName: { fontSize: theme.font.md, fontWeight: '600', color: theme.colors.textPrimary },
  accountMeta: { fontSize: theme.font.sm, color: theme.colors.textSecondary, marginTop: 2 },
  accountBalance: { fontSize: theme.font.lg, fontWeight: '700', color: theme.colors.textPrimary },
});
