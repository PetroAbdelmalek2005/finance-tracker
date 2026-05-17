import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Transaction } from '../types';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '../constants/categories';
import { theme } from '../constants/theme';
import dayjs from 'dayjs';

interface Props {
  transaction: Transaction;
  onPress?: () => void;
  showReviewBadge?: boolean;
}

export function TransactionCard({ transaction, onPress, showReviewBadge }: Props) {
  const isIncome = transaction.amount < 0;
  const color = CATEGORY_COLORS[transaction.category] ?? theme.colors.textMuted;
  const icon = (CATEGORY_ICONS[transaction.category] ?? 'ellipsis-horizontal') as any;

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.iconWrap, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>

      <View style={styles.middle}>
        <Text style={styles.merchant} numberOfLines={1}>
          {transaction.merchant || transaction.description}
        </Text>
        <Text style={styles.meta}>
          {transaction.category} · {dayjs(transaction.date).format('MMM D')}
        </Text>
      </View>

      <View style={styles.right}>
        <Text style={[styles.amount, { color: isIncome ? theme.colors.success : theme.colors.textPrimary }]}>
          {isIncome ? '+' : '-'}${Math.abs(transaction.amount).toFixed(2)}
        </Text>
        {showReviewBadge && !transaction.reviewed && (
          <View style={styles.reviewDot} />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  middle: {
    flex: 1,
    marginRight: 8,
  },
  merchant: {
    fontSize: theme.font.md,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 3,
  },
  meta: {
    fontSize: theme.font.sm,
    color: theme.colors.textSecondary,
  },
  right: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: theme.font.md,
    fontWeight: '700',
  },
  reviewDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: theme.colors.accent,
    marginTop: 4,
  },
});
