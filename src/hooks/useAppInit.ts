import { useEffect, useState } from 'react';
import { getDatabase } from '@/database';
import { deviceRepository } from '@/database/repositories';
import { useSettingsStore } from '@/stores';

/**
 * Initializes the database and device on app start.
 * Returns loading state for splash screen management.
 */
export function useAppInit() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { loadSettings } = useSettingsStore();

  useEffect(() => {
    async function init() {
      try {
        await getDatabase();
        await deviceRepository.getOrCreate();
        await loadSettings();

        // Sync userName to device.owner_name (for sync protocol identification)
        const settings = useSettingsStore.getState().settings;
        if (settings.userName) {
          await deviceRepository.updateOwnerName(settings.userName);
        }

        setIsReady(true);
      } catch (e) {
        setError((e as Error).message);
        setIsReady(true);
      }
    }
    init();
  }, []);

  return { isReady, error };
}
