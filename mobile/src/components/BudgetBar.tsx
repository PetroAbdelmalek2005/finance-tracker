import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CategorySummary } from '../types';
import { CATEGORY_ICONS } from '../constants/categories';
import { theme } from '../constants/theme';

interface Props {
  summary: CategorySummary;
  onPress?: () => void;
}

export function BudgetBar({ summary }: Props) {
  const pct = summary.budget > 0 ? Math.min(summary.spent / summary.budget, 1) : 0;
  const over = summary.budget > 0 && summary.spent > summary.budget;
  const barColor = over ? theme.colors.danger : pct > 0.85 ? theme.colors.warning : summary.color;
  const icon = (CATEGORY_ICONS[summary.category] ?? 'ellipsis-horizontal') as any;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.labelRow}>
          <View style={[styles.iconWrap, { backgroundColor: summary.color + '22' }]}>
            <Ionicons name={icon} size={14} color={summary.color} />
          </View>
          <Text style={styles.category}>{summary.category}</Text>
        </View>
        <View style={styles.amountRow}>
          <Text style={[styles.spent, { color: over ? theme.colors.danger : theme.colors.textPrimary }]}>
            ${summary.spent.toFixed(0)}
          </Text>
          {summary.budget > 0 && (
            <Text style={styles.budget}> / ${summary.budget.toFixed(0)}</Text>
          )}
        </View>
      </View>

      {summary.budget > 0 && (
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${pct * 100}%` as any, backgroundColor: barColor }]} />
        </View>
      )}

      <Text style={styles.count}>{summary.transactionCount} transactions</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.bgCard,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  category: {
    fontSize: theme.font.md,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  spent: {
    fontSize: theme.font.md,
    fontWeight: '700',
  },
  budget: {
    fontSize: theme.font.sm,
    color: theme.colors.textMuted,
  },
  track: {
    height: 6,
    backgroundColor: theme.colors.bgElevated,
    borderRadius: theme.radius.full,
    overflow: 'hidden',
    marginBottom: 8,
  },
  fill: {
    height: '100%',
    borderRadius: theme.radius.full,
  },
  count: {
    fontSize: theme.font.xs,
    color: theme.colors.textMuted,
  },
});
