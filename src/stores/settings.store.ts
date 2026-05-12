import { create } from 'zustand';
import { getDatabase } from '@/database';
import { deviceRepository } from '@/database/repositories';

export interface UserSettings {
  defaultPaidBy: string;
  defaultCurrency: string;
  userName: string;
}

interface SettingsState {
  settings: UserSettings;
  isLoaded: boolean;
  loadSettings: () => Promise<void>;
  updateSettings: (partial: Partial<UserSettings>) => Promise<void>;
}

const DEFAULT_SETTINGS: UserSettings = {
  defaultPaidBy: '',
  defaultCurrency: 'CNY',
  userName: '',
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  isLoaded: false,

  loadSettings: async () => {
    const db = await getDatabase();
    // Ensure settings table exists
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS user_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    const rows = await db.getAllAsync<{ key: string; value: string }>(
      'SELECT key, value FROM user_settings'
    );

    const loaded: Partial<UserSettings> = {};
    for (const row of rows) {
      if (row.key === 'defaultPaidBy') loaded.defaultPaidBy = row.value;
      if (row.key === 'defaultCurrency') loaded.defaultCurrency = row.value;
      if (row.key === 'userName') loaded.userName = row.value;
    }

    set({ settings: { ...DEFAULT_SETTINGS, ...loaded }, isLoaded: true });
  },

  updateSettings: async (partial) => {
    const db = await getDatabase();
    const current = get().settings;
    const updated = { ...current, ...partial };

    for (const [key, value] of Object.entries(partial)) {
      await db.runAsync(
        'INSERT OR REPLACE INTO user_settings (key, value) VALUES (?, ?)',
        key, value as string
      );
    }

    // Sync userName to device.owner_name so sync protocol knows who we are
    if (partial.userName !== undefined) {
      await deviceRepository.updateOwnerName(partial.userName);
    }

    set({ settings: updated });
  },
}));
