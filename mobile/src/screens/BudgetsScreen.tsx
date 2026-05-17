import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal,
  TextInput, KeyboardAvoidingView, Platform, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppState } from '../state/AppStateContext';
import { BudgetBar } from '../components/BudgetBar';
import { CATEGORIES, CATEGORY_COLORS, CATEGORY_ICONS } from '../constants/categories';
import { theme } from '../constants/theme';
import { Budget, CategorySummary } from '../types';
import { nanoid } from 'nanoid/non-secure';
import dayjs from 'dayjs';

export function BudgetsScreen() {
  const { state, addBudget, updateBudget, deleteBudget } = useAppState();
  const [showModal, setShowModal] = useState(false);
  const [editBudget, setEditBudget] = useState<Budget | null>(null);
  const [selCategory, setSelCategory] = useState(CATEGORIES[0] as string);
  const [limitText, setLimitText] = useState('');
  const [showCatPicker, setShowCatPicker] = useState(false);

  const thisMonth = dayjs().format('YYYY-MM');

  const summaries = useMemo<CategorySummary[]>(() => {
    const monthTx = state.transactions.filter(
      (t) => t.date.startsWith(thisMonth) && t.amount > 0
    );
    const spent: Record<string, number> = {};
    const counts: Record<string, number> = {};
    for (const t of monthTx) {
      spent[t.category] = (spent[t.category] ?? 0) + t.amount;
      counts[t.category] = (counts[t.category] ?? 0) + 1;
    }

    // Show all budgeted categories + any category with spending
    const cats = new Set([
      ...state.budgets.map((b) => b.category),
      ...Object.keys(spent),
    ]);

    return [...cats].map((cat) => ({
      category: cat,
      spent: spent[cat] ?? 0,
      budget: state.budgets.find((b) => b.category === cat)?.monthlyLimit ?? 0,
      transactionCount: counts[cat] ?? 0,
      color: CATEGORY_COLORS[cat] ?? theme.colors.textMuted,
    })).sort((a, b) => b.spent - a.spent);
  }, [state.transactions, state.budgets, thisMonth]);

  const totalSpent = summaries.reduce((s, c) => s + c.spent, 0);
  const totalBudget = state.budgets.reduce((s, b) => s + b.monthlyLimit, 0);

  function openAdd() {
    setEditBudget(null);
    setSelCategory(CATEGORIES[0]);
    setLimitText('');
    setShowModal(true);
  }

  function openEdit(cat: string) {
    const b = state.budgets.find((x) => x.category === cat);
    if (b) {
      setEditBudget(b);
      setSelCategory(b.category);
      setLimitText(String(b.monthlyLimit));
      setShowModal(true);
    }
  }

  function save() {
    const limit = parseFloat(limitText);
    if (!limitText || isNaN(limit) || limit <= 0) {
      Alert.alert('Invalid amount', 'Enter a positive monthly limit');
      return;
    }
    if (editBudget) {
      updateBudget(editBudget.id, { category: selCategory, monthlyLimit: limit });
    } else {
      const existing = state.budgets.find((b) => b.category === selCategory);
      if (existing) {
        updateBudget(existing.id, { monthlyLimit: limit });
      } else {
        addBudget({ id: nanoid(), category: selCategory, monthlyLimit: limit });
      }
    }
    setShowModal(false);
  }

  function remove(cat: string) {
    const b = state.budgets.find((x) => x.category === cat);
    if (!b) return;
    Alert.alert('Remove Budget', `Remove budget for ${cat}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteBudget(b.id) },
    ]);
  }

  return (
    <View style={styles.screen}>
      {/* Month Summary */}
      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNum}>${totalSpent.toFixed(0)}</Text>
          <Text style={styles.summaryLabel}>Spent</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNum}>${totalBudget.toFixed(0)}</Text>
          <Text style={styles.summaryLabel}>Budgeted</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNum, { color: totalBudget - totalSpent >= 0 ? theme.colors.success : theme.colors.danger }]}>
            ${Math.abs(totalBudget - totalSpent).toFixed(0)}
          </Text>
          <Text style={styles.summaryLabel}>{totalBudget - totalSpent >= 0 ? 'Left' : 'Over'}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.monthLabel}>{dayjs().format('MMMM YYYY')}</Text>

        {summaries.map((s) => {
          const hasBudget = state.budgets.some((b) => b.category === s.category);
          return (
            <View key={s.category} style={styles.budgetWrap}>
              <BudgetBar summary={s} />
              <View style={styles.budgetActions}>
                <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(s.category)}>
                  <Ionicons name="pencil" size={13} color={theme.colors.textSecondary} />
                  <Text style={styles.editBtnText}>{hasBudget ? 'Edit' : 'Set budget'}</Text>
                </TouchableOpacity>
                {hasBudget && (
                  <TouchableOpacity onPress={() => remove(s.category)}>
                    <Ionicons name="trash-outline" size={15} color={theme.colors.danger} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}

        {summaries.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="pie-chart-outline" size={48} color={theme.colors.textMuted} />
            <Text style={styles.emptyTitle}>No spending yet</Text>
            <Text style={styles.emptyBody}>Sync your accounts to see spending by category</Text>
          </View>
        )}
      </ScrollView>

      {/* Add Budget FAB */}
      <TouchableOpacity style={styles.fab} onPress={openAdd}>
        <Ionicons name="add" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Budget Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowModal(false)}>
            <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
              <View style={styles.sheetHandle} />
              <Text style={styles.modalTitle}>{editBudget ? 'Edit Budget' : 'Set Monthly Budget'}</Text>

              <Text style={styles.fieldLabel}>Category</Text>
              <TouchableOpacity style={styles.catSelector} onPress={() => setShowCatPicker(true)}>
                <View style={[styles.catIcon, { backgroundColor: (CATEGORY_COLORS[selCategory] ?? theme.colors.accent) + '22' }]}>
                  <Ionicons name={(CATEGORY_ICONS[selCategory] ?? 'ellipsis-horizontal') as any} size={16} color={CATEGORY_COLORS[selCategory] ?? theme.colors.accent} />
                </View>
                <Text style={styles.catSelectorText}>{selCategory}</Text>
                <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
              </TouchableOpacity>

              <Text style={styles.fieldLabel}>Monthly Limit</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="e.g. 500"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="decimal-pad"
                value={limitText}
                onChangeText={setLimitText}
              />

              <TouchableOpacity style={styles.saveBtn} onPress={save}>
                <Text style={styles.saveBtnText}>{editBudget ? 'Update Budget' : 'Set Budget'}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>

          {showCatPicker && (
            <View style={styles.innerPickerOverlay}>
              <View style={styles.innerPicker}>
                <View style={styles.sheetHandle} />
                <ScrollView>
                  {CATEGORIES.map((cat) => {
                    const color = CATEGORY_COLORS[cat];
                    const icon = (CATEGORY_ICONS[cat] ?? 'ellipsis-horizontal') as any;
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={styles.pickerRow}
                        onPress={() => { setSelCategory(cat); setShowCatPicker(false); }}
                      >
                        <View style={[styles.pickerIcon, { backgroundColor: color + '22' }]}>
                          <Ionicons name={icon} size={16} color={color} />
                        </View>
                        <Text style={styles.pickerCat}>{cat}</Text>
                        {selCategory === cat && <Ionicons name="checkmark" size={16} color={theme.colors.accent} />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          )}
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  summary: {
    flexDirection: 'row', backgroundColor: theme.colors.bgCard,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
    paddingVertical: theme.spacing.md,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryNum: { fontSize: theme.font.xl, fontWeight: '700', color: theme.colors.textPrimary },
  summaryLabel: { fontSize: theme.font.xs, color: theme.colors.textMuted, marginTop: 2 },
  summaryDivider: { width: 1, backgroundColor: theme.colors.border },
  content: { padding: theme.spacing.md, paddingBottom: 120 },
  monthLabel: {
    fontSize: theme.font.sm, fontWeight: '700', color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  budgetWrap: { marginBottom: 4 },
  budgetActions: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
    gap: 16, paddingHorizontal: 4, marginBottom: theme.spacing.sm,
  },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editBtnText: { fontSize: theme.font.sm, color: theme.colors.textSecondary },
  empty: { alignItems: 'center', padding: 60, gap: 12 },
  emptyTitle: { fontSize: theme.font.lg, fontWeight: '600', color: theme.colors.textSecondary },
  emptyBody: { fontSize: theme.font.sm, color: theme.colors.textMuted, textAlign: 'center' },
  fab: {
    position: 'absolute', bottom: 90, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: theme.colors.accent,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: theme.colors.accent, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: theme.colors.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: theme.spacing.lg,
  },
  sheetHandle: {
    width: 40, height: 4, backgroundColor: theme.colors.border,
    borderRadius: 2, alignSelf: 'center', marginBottom: theme.spacing.md,
  },
  modalTitle: { fontSize: theme.font.lg, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 16 },
  fieldLabel: { fontSize: theme.font.sm, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 6, marginTop: 12 },
  catSelector: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: theme.colors.bgElevated, borderRadius: theme.radius.md,
    padding: 12, borderWidth: 1, borderColor: theme.colors.border,
  },
  catIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  catSelectorText: { flex: 1, fontSize: theme.font.md, color: theme.colors.textPrimary },
  amountInput: {
    backgroundColor: theme.colors.bgElevated, borderRadius: theme.radius.md,
    padding: 12, color: theme.colors.textPrimary, fontSize: theme.font.lg,
    borderWidth: 1, borderColor: theme.colors.border, fontWeight: '700',
  },
  saveBtn: {
    backgroundColor: theme.colors.accent, borderRadius: theme.radius.md,
    paddingVertical: 14, alignItems: 'center', marginTop: 20,
  },
  saveBtnText: { color: '#fff', fontSize: theme.font.md, fontWeight: '700' },
  innerPickerOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
  },
  innerPicker: {
    backgroundColor: theme.colors.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: theme.spacing.md, maxHeight: '70%',
  },
  pickerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  pickerIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  pickerCat: { flex: 1, fontSize: theme.font.md, color: theme.colors.textPrimary },
});
