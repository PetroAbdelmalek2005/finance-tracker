import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppState } from '../state/AppStateContext';
import { CATEGORIES, CATEGORY_COLORS, CATEGORY_ICONS } from '../constants/categories';
import { theme } from '../constants/theme';
import { Transaction } from '../types';
import dayjs from 'dayjs';

export function ReviewScreen() {
  const { state, updateTransaction } = useAppState();
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [pickingCategory, setPickingCategory] = useState(false);

  const pending = useMemo(
    () => state.transactions.filter((t) => !t.reviewed && t.aiCategory).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    ),
    [state.transactions]
  );

  const approved = useMemo(
    () => state.transactions.filter((t) => t.reviewed).length,
    [state.transactions]
  );

  function approve(t: Transaction) {
    updateTransaction(t.id, { category: t.aiCategory!, reviewed: true });
  }

  function approveAll() {
    for (const t of pending) {
      updateTransaction(t.id, { category: t.aiCategory!, reviewed: true });
    }
  }

  function changeCategory(t: Transaction, category: string) {
    updateTransaction(t.id, { category, reviewed: true, aiCategory: t.aiCategory });
    setSelected(null);
    setPickingCategory(false);
  }

  return (
    <View style={styles.screen}>
      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.stat}>
          <Text style={styles.statNum}>{pending.length}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={[styles.statNum, { color: theme.colors.success }]}>{approved}</Text>
          <Text style={styles.statLabel}>Reviewed</Text>
        </View>
        {pending.length > 0 && (
          <>
            <View style={styles.statDivider} />
            <TouchableOpacity style={styles.approveAllBtn} onPress={approveAll}>
              <Ionicons name="checkmark-done" size={14} color={theme.colors.success} />
              <Text style={styles.approveAllText}>Approve All</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {pending.length === 0 ? (
        <View style={styles.allDone}>
          <Ionicons name="checkmark-circle" size={64} color={theme.colors.success} />
          <Text style={styles.allDoneTitle}>All caught up!</Text>
          <Text style={styles.allDoneBody}>New transactions will appear here when your cards sync.</Text>
        </View>
      ) : (
        <FlatList
          data={pending}
          keyExtractor={(t) => t.id}
          contentContainerStyle={styles.list}
          renderItem={({ item: t }) => {
            const aiColor = CATEGORY_COLORS[t.aiCategory!] ?? theme.colors.textMuted;
            const aiIcon = (CATEGORY_ICONS[t.aiCategory!] ?? 'ellipsis-horizontal') as any;
            const conf = t.aiConfidence ?? 0;

            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardLeft}>
                    <Text style={styles.cardMerchant} numberOfLines={1}>
                      {t.merchant || t.description}
                    </Text>
                    <Text style={styles.cardMeta}>
                      {dayjs(t.date).format('MMM D')} · ${Math.abs(t.amount).toFixed(2)}
                    </Text>
                  </View>
                  <Text style={styles.cardAmount}>
                    ${Math.abs(t.amount).toFixed(2)}
                  </Text>
                </View>

                {/* AI Suggestion */}
                <View style={styles.aiRow}>
                  <Ionicons name="sparkles" size={13} color={theme.colors.accent} />
                  <Text style={styles.aiLabel}>AI suggests:</Text>
                  <View style={[styles.catChip, { backgroundColor: aiColor + '22' }]}>
                    <Ionicons name={aiIcon} size={12} color={aiColor} />
                    <Text style={[styles.catChipText, { color: aiColor }]}>{t.aiCategory}</Text>
                  </View>
                  <View style={[styles.confBadge, { backgroundColor: conf >= 0.8 ? theme.colors.successDim : theme.colors.warningDim }]}>
                    <Text style={[styles.confText, { color: conf >= 0.8 ? theme.colors.success : theme.colors.warning }]}>
                      {Math.round(conf * 100)}%
                    </Text>
                  </View>
                </View>

                {/* Actions */}
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={styles.approveBtn}
                    onPress={() => approve(t)}
                  >
                    <Ionicons name="checkmark" size={16} color={theme.colors.success} />
                    <Text style={styles.approveBtnText}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.changeBtn}
                    onPress={() => { setSelected(t); setPickingCategory(true); }}
                  >
                    <Ionicons name="pencil" size={14} color={theme.colors.textSecondary} />
                    <Text style={styles.changeBtnText}>Change</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Category Picker Modal */}
      <Modal visible={pickingCategory} animationType="slide" transparent>
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setPickingCategory(false)} activeOpacity={1}>
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHandle} />
            <Text style={styles.pickerTitle}>Choose Category</Text>
            <ScrollView>
              {CATEGORIES.map((cat) => {
                const color = CATEGORY_COLORS[cat];
                const icon = (CATEGORY_ICONS[cat] ?? 'ellipsis-horizontal') as any;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={styles.pickerRow}
                    onPress={() => selected && changeCategory(selected, cat)}
                  >
                    <View style={[styles.pickerIcon, { backgroundColor: color + '22' }]}>
                      <Ionicons name={icon} size={16} color={color} />
                    </View>
                    <Text style={styles.pickerCat}>{cat}</Text>
                    {selected?.aiCategory === cat && (
                      <Ionicons name="sparkles" size={14} color={theme.colors.accent} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  statsBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.colors.bgCard, padding: theme.spacing.md,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  stat: { alignItems: 'center', paddingHorizontal: theme.spacing.md },
  statNum: { fontSize: theme.font.xl, fontWeight: '700', color: theme.colors.textPrimary },
  statLabel: { fontSize: theme.font.xs, color: theme.colors.textMuted, marginTop: 2 },
  statDivider: { width: 1, height: 36, backgroundColor: theme.colors.border },
  approveAllBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginLeft: 'auto', backgroundColor: theme.colors.successDim,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: theme.radius.full,
  },
  approveAllText: { color: theme.colors.success, fontSize: theme.font.sm, fontWeight: '600' },
  list: { padding: theme.spacing.md, gap: 12 },
  card: {
    backgroundColor: theme.colors.bgCard, borderRadius: theme.radius.lg,
    padding: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  cardLeft: { flex: 1, marginRight: 8 },
  cardMerchant: { fontSize: theme.font.md, fontWeight: '700', color: theme.colors.textPrimary },
  cardMeta: { fontSize: theme.font.sm, color: theme.colors.textSecondary, marginTop: 2 },
  cardAmount: { fontSize: theme.font.lg, fontWeight: '700', color: theme.colors.textPrimary },
  aiRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: theme.colors.bgElevated, borderRadius: theme.radius.sm,
    padding: 8, marginBottom: 10,
  },
  aiLabel: { fontSize: theme.font.sm, color: theme.colors.textSecondary },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: theme.radius.full,
  },
  catChipText: { fontSize: theme.font.xs, fontWeight: '600' },
  confBadge: {
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: theme.radius.full, marginLeft: 'auto',
  },
  confText: { fontSize: theme.font.xs, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 8 },
  approveBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: theme.radius.md,
    backgroundColor: theme.colors.successDim, borderWidth: 1, borderColor: theme.colors.success + '44',
  },
  approveBtnText: { color: theme.colors.success, fontWeight: '700', fontSize: theme.font.sm },
  changeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.bgElevated, borderWidth: 1, borderColor: theme.colors.border,
  },
  changeBtnText: { color: theme.colors.textSecondary, fontSize: theme.font.sm },
  allDone: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: 12, padding: theme.spacing.xl,
  },
  allDoneTitle: { fontSize: theme.font.xl, fontWeight: '700', color: theme.colors.textPrimary },
  allDoneBody: { fontSize: theme.font.md, color: theme.colors.textSecondary, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  pickerSheet: {
    backgroundColor: theme.colors.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: theme.spacing.md, maxHeight: '75%',
  },
  pickerHandle: {
    width: 40, height: 4, backgroundColor: theme.colors.border,
    borderRadius: 2, alignSelf: 'center', marginBottom: theme.spacing.md,
  },
  pickerTitle: {
    fontSize: theme.font.lg, fontWeight: '700', color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  pickerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  pickerIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  pickerCat: { flex: 1, fontSize: theme.font.md, color: theme.colors.textPrimary },
});
