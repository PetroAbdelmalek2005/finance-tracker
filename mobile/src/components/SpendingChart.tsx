import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { CategorySummary } from '../types';
import { theme } from '../constants/theme';

const W = Dimensions.get('window').width;

interface Props {
  summaries: CategorySummary[];
}

export function SpendingChart({ summaries }: Props) {
  const top = summaries
    .filter((s) => s.spent > 0 && s.category !== 'Income' && s.category !== 'Transfer')
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 6);

  if (top.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No spending data yet</Text>
      </View>
    );
  }

  const total = top.reduce((s, c) => s + c.spent, 0);

  const data = top.map((s) => ({
    name: s.category,
    population: s.spent,
    color: s.color,
    legendFontColor: theme.colors.textSecondary,
    legendFontSize: 11,
  }));

  return (
    <View style={styles.container}>
      <PieChart
        data={data}
        width={W - 32}
        height={180}
        chartConfig={{
          color: () => theme.colors.textPrimary,
          backgroundColor: 'transparent',
          backgroundGradientFrom: theme.colors.bgCard,
          backgroundGradientTo: theme.colors.bgCard,
        }}
        accessor="population"
        backgroundColor="transparent"
        paddingLeft="12"
        hasLegend={true}
        absolute={false}
      />
      <Text style={styles.total}>Total spent: ${total.toFixed(2)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.bgCard,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  empty: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.bgCard,
    borderRadius: theme.radius.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: theme.font.sm,
  },
  total: {
    textAlign: 'center',
    fontSize: theme.font.sm,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
});
