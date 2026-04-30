/**
 * Currency service for exchange rate management.
 */

import type { UUID, CurrencyCode, CurrencyRate } from '@/types';
import { getDatabase } from '@/database';
import { generateUUID, nowISO } from '@/utils';

export class CurrencyService {
  /**
   * Record a manually-entered exchange rate for a project.
   */
  async recordRate(
    projectId: UUID,
    fromCurrency: CurrencyCode,
    toCurrency: CurrencyCode,
    rate: number
  ): Promise<CurrencyRate> {
    const db = await getDatabase();
    const id = generateUUID();
    const now = nowISO();

    await db.runAsync(
      `INSERT INTO currency_rates (id, project_id, from_currency, to_currency, rate, recorded_at, created_at, updated_at, version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      id, projectId, fromCurrency, toCurrency, rate, now, now, now
    );

    return {
      id, project_id: projectId, from_currency: fromCurrency,
      to_currency: toCurrency, rate, recorded_at: now,
      created_at: now, updated_at: now, deleted_at: null, version: 1,
    };
  }

  /**
   * Get the latest exchange rate for a currency pair within a project.
   */
  async getLatestRate(
    projectId: UUID,
    fromCurrency: CurrencyCode,
    toCurrency: CurrencyCode
  ): Promise<number | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ rate: number }>(
      `SELECT rate FROM currency_rates
       WHERE project_id = ? AND from_currency = ? AND to_currency = ? AND deleted_at IS NULL
       ORDER BY recorded_at DESC LIMIT 1`,
      projectId, fromCurrency, toCurrency
    );
    return row?.rate ?? null;
  }

  /**
   * Get all rates for a project.
   */
  async getProjectRates(projectId: UUID): Promise<CurrencyRate[]> {
    const db = await getDatabase();
    return db.getAllAsync<CurrencyRate>(
      `SELECT * FROM currency_rates
       WHERE project_id = ? AND deleted_at IS NULL
       ORDER BY recorded_at DESC`,
      projectId
    );
  }

  /**
   * Convert amount between currencies using recorded rate.
   */
  async convert(
    projectId: UUID,
    amount: number,
    fromCurrency: CurrencyCode,
    toCurrency: CurrencyCode
  ): Promise<{ convertedAmount: number; rate: number } | null> {
    if (fromCurrency === toCurrency) {
      return { convertedAmount: amount, rate: 1 };
    }

    const rate = await this.getLatestRate(projectId, fromCurrency, toCurrency);
    if (rate === null) return null;

    return { convertedAmount: amount * rate, rate };
  }
}

export const currencyService = new CurrencyService();
