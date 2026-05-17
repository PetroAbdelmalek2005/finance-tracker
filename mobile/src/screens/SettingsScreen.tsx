import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity,
  Alert, Switch, Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PlaidLink, LinkSuccess, LinkExit } from 'react-native-plaid-link-sdk';
import { useAppState } from '../state/AppStateContext';
import { theme } from '../constants/theme';
import { createLinkToken, exchangePublicToken, fetchTransactions, fetchBalances } from '../services/plaid';
import { categorizeBatch } from '../services/ai';
import { pushToSheets, pullFromSheets } from '../services/sheets';

export function SettingsScreen() {
  const { state, updateConfig, setAccounts, addTransactions, updateAccountBalances, syncNow, syncing } = useAppState();
  const cfg = state.config;

  const [backendUrl, setBackendUrl] = useState(cfg.backendUrl);
  const [sheetsUrl, setSheetsUrl] = useState(cfg.sheetsScriptUrl);
  const [autoSync, setAutoSync] = useState(cfg.autoSync);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);
  const [syncing2, setSyncing2] = useState(false);

  function saveConfig() {
    updateConfig({
      backendUrl: backendUrl.trim(),
      sheetsScriptUrl: sheetsUrl.trim(),
      autoSync,
    });
    Alert.alert('Saved', 'Settings saved');
  }

  async function startPlaidLink() {
    if (!backendUrl.trim()) {
      Alert.alert('Missing Backend URL', 'Enter your backend URL first and save');
      return;
    }
    setLinking(true);
    try {
      const token = await createLinkToken(backendUrl.trim());
      setLinkToken(token);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLinking(false);
    }
  }

  async function onPlaidSuccess(success: LinkSuccess) {
    setLinkToken(null);
    try {
      const { publicToken, metadata } = success;
      const { itemId, accounts: newAccounts } = await exchangePublicToken(
        backendUrl.trim(),
        publicToken,
        metadata.institution?.name ?? 'Bank',
        metadata.accounts ?? []
      );

      const accountMap: Record<string, string> = {};
      for (const acc of newAccounts) {
        if (acc.plaidAccountId) accountMap[acc.plaidAccountId] = acc.id;
      }

      const [rawTx, balances] = await Promise.all([
        fetchTransactions(backendUrl.trim(), itemId, accountMap),
        fetchBalances(backendUrl.trim(), itemId),
      ]);

      // Update balances on new accounts
      for (const acc of newAccounts) {
        if (acc.plaidAccountId && balances[acc.plaidAccountId] !== undefined) {
          acc.balance = balances[acc.plaidAccountId];
        }
      }

      setAccounts([...state.accounts, ...newAccounts]);

      // Deduplicate by plaidTransactionId
      const existing = new Set(state.transactions.map((t) => t.plaidTransactionId).filter(Boolean));
      const fresh = rawTx.filter((t) => !t.plaidTransactionId || !existing.has(t.plaidTransactionId));

      if (fresh.length > 0 && backendUrl.trim()) {
        // AI categorize
        const results = await categorizeBatch(
          backendUrl.trim(),
          fresh.map((t) => ({ id: t.id, description: t.description, merchant: t.merchant, amount: t.amount }))
        );
        for (const t of fresh) {
          const r = results[t.id];
          if (r) {
            t.aiCategory = r.category;
            t.aiConfidence = r.confidence;
          }
        }
      }

      addTransactions(fresh);
      Alert.alert('Success', `Linked ${newAccounts.length} account(s), imported ${fresh.length} transactions`);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }

  async function manualSync() {
    if (!sheetsUrl.trim()) {
      Alert.alert('No Sheets URL', 'Enter your Google Apps Script URL first');
      return;
    }
    setSyncing2(true);
    try {
      await pushToSheets(sheetsUrl.trim(), state);
      Alert.alert('Synced', 'Data pushed to Google Sheets');
    } catch (e: any) {
      Alert.alert('Sync Error', e.message);
    } finally {
      setSyncing2(false);
    }
  }

  async function pullFromSheetsNow() {
    if (!sheetsUrl.trim()) {
      Alert.alert('No Sheets URL', 'Enter your Google Apps Script URL first');
      return;
    }
    setSyncing2(true);
    try {
      const remote = await pullFromSheets(sheetsUrl.trim());
      if (remote) {
        if (remote.accounts) setAccounts(remote.accounts);
        if (remote.transactions) addTransactions(remote.transactions);
        Alert.alert('Pulled', 'Data pulled from Google Sheets');
      }
    } catch (e: any) {
      Alert.alert('Pull Error', e.message);
    } finally {
      setSyncing2(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>

      {/* Plaid Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bank Connection</Text>
        <Text style={styles.sectionBody}>
          Plaid connects to 10,000+ banks and credit cards to import your real transactions automatically.
        </Text>

        <Text style={styles.fieldLabel}>Backend URL</Text>
        <TextInput
          style={styles.input}
          placeholder="https://your-backend.railway.app"
          placeholderTextColor={theme.colors.textMuted}
          value={backendUrl}
          onChangeText={setBackendUrl}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Text style={styles.hint}>
          Deploy the included /backend server to Railway, Render, or any Node host.
          See backend/README.md for instructions.
        </Text>

        {linkToken ? (
          <PlaidLink
            tokenConfig={{ token: linkToken, noLoadingState: false }}
            onSuccess={onPlaidSuccess}
            onExit={(exit: LinkExit) => { setLinkToken(null); }}
          >
            <View style={styles.plaidBtn}>
              <Ionicons name="card" size={18} color="#fff" />
              <Text style={styles.plaidBtnText}>Opening Plaid...</Text>
            </View>
          </PlaidLink>
        ) : (
          <TouchableOpacity style={styles.plaidBtn} onPress={startPlaidLink} disabled={linking}>
            <Ionicons name="card" size={18} color="#fff" />
            <Text style={styles.plaidBtnText}>{linking ? 'Loading...' : 'Connect Bank / Credit Card'}</Text>
          </TouchableOpacity>
        )}

        {state.accounts.length > 0 && (
          <View style={styles.linkedAccounts}>
            <Text style={styles.linkedLabel}>Linked accounts:</Text>
            {state.accounts.map((a) => (
              <Text key={a.id} style={styles.linkedAccount}>
                · {a.institution} {a.name} {a.mask ? `(···${a.mask})` : ''}
              </Text>
            ))}
          </View>
        )}
      </View>

      {/* Google Sheets Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Google Sheets Sync</Text>
        <Text style={styles.sectionBody}>
          Sync all data to Google Sheets. Deploy the included Apps Script (sheets/Code.gs) to your sheet,
          then paste the deployment URL below.
        </Text>

        <Text style={styles.fieldLabel}>Apps Script URL</Text>
        <TextInput
          style={styles.input}
          placeholder="https://script.google.com/macros/s/.../exec"
          placeholderTextColor={theme.colors.textMuted}
          value={sheetsUrl}
          onChangeText={setSheetsUrl}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <View style={styles.autoSyncRow}>
          <Text style={styles.autoSyncLabel}>Auto-sync after changes</Text>
          <Switch
            value={autoSync}
            onValueChange={setAutoSync}
            trackColor={{ false: theme.colors.border, true: theme.colors.accent }}
            thumbColor="#fff"
          />
        </View>

        <View style={styles.syncBtnRow}>
          <TouchableOpacity style={styles.syncBtn} onPress={manualSync} disabled={syncing2}>
            <Ionicons name="cloud-upload-outline" size={16} color={theme.colors.accent} />
            <Text style={styles.syncBtnText}>{syncing2 ? 'Pushing...' : 'Push to Sheets'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.syncBtn} onPress={pullFromSheetsNow} disabled={syncing2}>
            <Ionicons name="cloud-download-outline" size={16} color={theme.colors.accent} />
            <Text style={styles.syncBtnText}>{syncing2 ? 'Pulling...' : 'Pull from Sheets'}</Text>
          </TouchableOpacity>
        </View>

        {state.lastSynced && (
          <Text style={styles.lastSynced}>Last synced: {new Date(state.lastSynced).toLocaleString()}</Text>
        )}
      </View>

      {/* Save Button */}
      <TouchableOpacity style={styles.saveBtn} onPress={saveConfig}>
        <Ionicons name="save-outline" size={18} color="#fff" />
        <Text style={styles.saveBtnText}>Save Settings</Text>
      </TouchableOpacity>

      {/* Setup Guide */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Setup Guide</Text>
        {[
          { step: '1', text: 'Deploy backend/server.js to Railway or Render (free tier)' },
          { step: '2', text: 'Add PLAID_CLIENT_ID, PLAID_SECRET, and ANTHROPIC_API_KEY to your backend env vars' },
          { step: '3', text: 'Open Google Sheets → Extensions → Apps Script → paste sheets/Code.gs → Deploy' },
          { step: '4', text: 'Enter backend URL above, tap "Connect Bank / Credit Card" to link your first card' },
          { step: '5', text: 'AI will categorize all transactions. Tap Review tab to approve or change them.' },
        ].map(({ step, text }) => (
          <View key={step} style={styles.guideRow}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepNum}>{step}</Text>
            </View>
            <Text style={styles.guideText}>{text}</Text>
          </View>
        ))}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: theme.spacing.md },
  section: {
    backgroundColor: theme.colors.bgCard, borderRadius: theme.radius.lg,
    padding: theme.spacing.md, marginBottom: theme.spacing.md,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  sectionTitle: { fontSize: theme.font.lg, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 6 },
  sectionBody: { fontSize: theme.font.sm, color: theme.colors.textSecondary, marginBottom: theme.spacing.md, lineHeight: 20 },
  fieldLabel: { fontSize: theme.font.sm, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 6, marginTop: 8 },
  input: {
    backgroundColor: theme.colors.bgElevated, borderRadius: theme.radius.md,
    padding: 12, color: theme.colors.textPrimary, fontSize: theme.font.sm,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  hint: { fontSize: theme.font.xs, color: theme.colors.textMuted, marginTop: 6, lineHeight: 18 },
  plaidBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#00B4DB', borderRadius: theme.radius.md,
    paddingVertical: 14, marginTop: theme.spacing.md,
  },
  plaidBtnText: { color: '#fff', fontWeight: '700', fontSize: theme.font.md },
  linkedAccounts: { marginTop: theme.spacing.md, padding: 10, backgroundColor: theme.colors.bgElevated, borderRadius: theme.radius.sm },
  linkedLabel: { fontSize: theme.font.xs, fontWeight: '700', color: theme.colors.textMuted, marginBottom: 4 },
  linkedAccount: { fontSize: theme.font.sm, color: theme.colors.textSecondary, marginTop: 2 },
  autoSyncRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm, marginTop: theme.spacing.sm,
  },
  autoSyncLabel: { fontSize: theme.font.md, color: theme.colors.textPrimary },
  syncBtnRow: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: 8 },
  syncBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: theme.radius.md,
    backgroundColor: theme.colors.accentDim, borderWidth: 1, borderColor: theme.colors.accent + '44',
  },
  syncBtnText: { color: theme.colors.accent, fontSize: theme.font.sm, fontWeight: '600' },
  lastSynced: { fontSize: theme.font.xs, color: theme.colors.textMuted, marginTop: 8, textAlign: 'center' },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: theme.colors.accent, borderRadius: theme.radius.md,
    paddingVertical: 14, marginBottom: theme.spacing.md,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: theme.font.md },
  guideRow: {
    flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 12,
  },
  stepBadge: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: theme.colors.accentDim,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
  },
  stepNum: { fontSize: theme.font.xs, fontWeight: '700', color: theme.colors.accent },
  guideText: { fontSize: theme.font.sm, color: theme.colors.textSecondary, flex: 1, lineHeight: 20 },
});
