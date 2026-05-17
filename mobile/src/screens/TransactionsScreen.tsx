import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppState } from '../state/AppStateContext';
import { TransactionCard } from '../components/TransactionCard';
import { CATEGORIES, CATEGORY_COLORS, CATEGORY_ICONS } from '../constants/categories';
import { theme } from '../constants/theme';
import { Transaction } from '../types';
import dayjs from 'dayjs';

export function TransactionsScreen() {
  const { state, updateTransaction } = useAppState();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [editCat, setEditCat] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [showPicker, setShowPicker] = useState(false);

  const filtered = useMemo(() => {
    let list = [...state.transactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    if (catFilter !== 'All') list = list.filter((t) => t.category === catFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) => t.description.toLowerCase().includes(q) || (t.merchant ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [state.transactions, catFilter, search]);

  function openDetail(t: Transaction) {
    setSelected(t);
    setEditCat(t.category);
    setEditNotes(t.notes ?? '');
  }

  function saveDetail() {
    if (!selected) return;
    updateTransaction(selected.id, { category: editCat, notes: editNotes, reviewed: true });
    setSelected(null);
  }

  const sections = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of filtered) {
      const key = dayjs(t.date).format('MMMM D, YYYY');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return [...map.entries()].map(([date, items]) => ({ date, items }));
  }, [filtered]);

  return (
    <View style={styles.screen}>
      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={theme.colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search transactions..."
            placeholderTextColor={theme.colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={theme.colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Filter Chips */}
      <View style={styles.chipScrollWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
          {['All', ...CATEGORIES].map((cat) => {
            const active = cat === catFilter;
            const color = cat === 'All' ? theme.colors.accent : CATEGORY_COLORS[cat] ?? theme.colors.accent;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.chip, active && { backgroundColor: color + '33', borderColor: color }]}
                onPress={() => setCatFilter(cat)}
              >
                <Text style={[styles.chipText, active && { color }]}>{cat}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* List */}
      <FlatList
        data={sections}
        keyExtractor={(s) => s.date}
        renderItem={({ item: section }) => (
          <View>
            <Text style={styles.dateHeader}>{section.date}</Text>
            {section.items.map((t) => (
              <TransactionCard
                key={t.id}
                transaction={t}
                onPress={() => openDetail(t)}
                showReviewBadge
              />
            ))}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={48} color={theme.colors.textMuted} />
            <Text style={styles.emptyText}>No transactions found</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />

      {/* Detail Modal */}
      <Modal visible={!!selected} animationType="slide" transparent>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSelected(null)}>
          <View style={styles.detailSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.sheetHandle} />
            {selected && (
              <>
                <Text style={styles.detailMerchant}>{selected.merchant || selected.description}</Text>
                <Text style={styles.detailDate}>{dayjs(selected.date).format('MMMM D, YYYY')}</Text>
                <Text style={styles.detailAmount}>
                  {selected.amount < 0 ? '+' : '-'}${Math.abs(selected.amount).toFixed(2)}
                </Text>

                {/* Category Selector */}
                <Text style={styles.fieldLabel}>Category</Text>
                <TouchableOpacity
                  style={styles.catSelector}
                  onPress={() => setShowPicker(true)}
                >
                  <View style={[styles.catSelectorIcon, { backgroundColor: (CATEGORY_COLORS[editCat] ?? theme.colors.accent) + '22' }]}>
                    <Ionicons name={(CATEGORY_ICONS[editCat] ?? 'ellipsis-horizontal') as any} size={16} color={CATEGORY_COLORS[editCat] ?? theme.colors.accent} />
                  </View>
                  <Text style={styles.catSelectorText}>{editCat}</Text>
                  <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
                </TouchableOpacity>

                {/* Notes */}
                <Text style={styles.fieldLabel}>Notes</Text>
                <TextInput
                  style={styles.notesInput}
                  placeholder="Add a note..."
                  placeholderTextColor={theme.colors.textMuted}
                  value={editNotes}
                  onChangeText={setEditNotes}
                  multiline
                />

                {selected.aiCategory && (
                  <View style={styles.aiHint}>
                    <Ionicons name="sparkles" size={13} color={theme.colors.accent} />
                    <Text style={styles.aiHintText}>AI suggested: {selected.aiCategory}</Text>
                  </View>
                )}

                <TouchableOpacity style={styles.saveBtn} onPress={saveDetail}>
                  <Text style={styles.saveBtnText}>Save</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>

        {/* Inline category picker */}
        {showPicker && (
          <View style={styles.innerPickerOverlay}>
            <View style={styles.innerPicker}>
              <View style={styles.pickerHandle} />
              <ScrollView>
                {CATEGORIES.map((cat) => {
                  const color = CATEGORY_COLORS[cat];
                  const icon = (CATEGORY_ICONS[cat] ?? 'ellipsis-horizontal') as any;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={styles.pickerRow}
                      onPress={() => { setEditCat(cat); setShowPicker(false); }}
                    >
                      <View style={[styles.pickerIcon, { backgroundColor: color + '22' }]}>
                        <Ionicons name={icon} size={16} color={color} />
                      </View>
                      <Text style={styles.pickerCat}>{cat}</Text>
                      {editCat === cat && <Ionicons name="checkmark" size={16} color={theme.colors.accent} />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  searchRow: { padding: theme.spacing.md, paddingBottom: 8 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: theme.colors.bgCard, borderRadius: theme.radius.md,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  searchInput: { flex: 1, color: theme.colors.textPrimary, fontSize: theme.font.md },
  chipScrollWrap: { marginBottom: 4 },
  chipScroll: { paddingHorizontal: theme.spacing.md, gap: 8 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: theme.radius.full,
    borderWidth: 1, borderColor: theme.colors.border,
    backgroundColor: theme.colors.bgCard,
  },
  chipText: { fontSize: theme.font.sm, color: theme.colors.textSecondary, fontWeight: '500' },
  dateHeader: {
    fontSize: theme.font.sm, fontWeight: '700', color: theme.colors.textMuted,
    paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.md, paddingBottom: 4,
  },
  listContent: { paddingBottom: 100 },
  empty: { alignItems: 'center', justifyContent: 'center', padding: 60, gap: 12 },
  emptyText: { color: theme.colors.textMuted, fontSize: theme.font.md },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  detailSheet: {
    backgroundColor: theme.colors.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: theme.spacing.lg, gap: 4,
  },
  sheetHandle: {
    width: 40, height: 4, backgroundColor: theme.colors.border,
    borderRadius: 2, alignSelf: 'center', marginBottom: theme.spacing.md,
  },
  detailMerchant: { fontSize: theme.font.xl, fontWeight: '700', color: theme.colors.textPrimary },
  detailDate: { fontSize: theme.font.sm, color: theme.colors.textSecondary, marginBottom: 4 },
  detailAmount: { fontSize: theme.font.xxl, fontWeight: '800', color: theme.colors.textPrimary, marginBottom: 16 },
  fieldLabel: { fontSize: theme.font.sm, fontWeight: '600', color: theme.colors.textSecondary, marginTop: 12, marginBottom: 6 },
  catSelector: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: theme.colors.bgElevated, borderRadius: theme.radius.md,
    padding: 12, borderWidth: 1, borderColor: theme.colors.border,
  },
  catSelectorIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  catSelectorText: { flex: 1, fontSize: theme.font.md, color: theme.colors.textPrimary },
  notesInput: {
    backgroundColor: theme.colors.bgElevated, borderRadius: theme.radius.md,
    padding: 12, color: theme.colors.textPrimary, fontSize: theme.font.md,
    minHeight: 72, textAlignVertical: 'top',
    borderWidth: 1, borderColor: theme.colors.border,
  },
  aiHint: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8,
  },
  aiHintText: { fontSize: theme.font.sm, color: theme.colors.textSecondary },
  saveBtn: {
    backgroundColor: theme.colors.accent, borderRadius: theme.radius.md,
    paddingVertical: 14, alignItems: 'center', marginTop: 8,
  },
  saveBtnText: { color: '#fff', fontSize: theme.font.md, fontWeight: '700' },
  innerPickerOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
  },
  innerPicker: {
    backgroundColor: theme.colors.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: theme.spacing.md, maxHeight: '70%',
  },
  pickerHandle: {
    width: 40, height: 4, backgroundColor: theme.colors.border,
    borderRadius: 2, alignSelf: 'center', marginBottom: theme.spacing.md,
  },
  pickerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  pickerIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  pickerCat: { flex: 1, fontSize: theme.font.md, color: theme.colors.textPrimary },
});
