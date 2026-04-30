import { useEffect, useState } from 'react';
import { getDatabase } from '@/database';
import { deviceRepository, categoryRepository } from '@/database/repositories';
import { DEFAULT_CATEGORIES } from '@/constants';

/**
 * Initializes the database and device on app start.
 * Returns loading state for splash screen management.
 */
export function useAppInit() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        await getDatabase();
        await deviceRepository.getOrCreate();
        await categoryRepository.ensureDefaults(DEFAULT_CATEGORIES);
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
