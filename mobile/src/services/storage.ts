import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { AppState, AppConfig } from '../types';

const STORAGE_KEY = 'bt_state_v1';
const CONFIG_KEY = 'bt_config_v1';

const DEFAULT_CONFIG: AppConfig = {
  backendUrl: '',
  sheetsScriptUrl: '',
  autoSync: true,
};

export const DEFAULT_STATE: AppState = {
  accounts: [],
  transactions: [],
  budgets: [],
  config: DEFAULT_CONFIG,
};

export async function loadState(): Promise<AppState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    const config = await loadConfig();
    return {
      ...DEFAULT_STATE,
      ...parsed,
      config,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export async function saveState(state: AppState): Promise<void> {
  const { config, ...rest } = state;
  await Promise.all([
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(rest)),
    saveConfig(config),
  ]);
}

export async function loadConfig(): Promise<AppConfig> {
  try {
    const raw = await SecureStore.getItemAsync(CONFIG_KEY);
    if (!raw) return DEFAULT_CONFIG;
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function saveConfig(config: AppConfig): Promise<void> {
  await SecureStore.setItemAsync(CONFIG_KEY, JSON.stringify(config));
}

export async function clearAll(): Promise<void> {
  await Promise.all([
    AsyncStorage.removeItem(STORAGE_KEY),
    SecureStore.deleteItemAsync(CONFIG_KEY),
  ]);
}
