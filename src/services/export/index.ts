/**
 * Export/Import service for JSON backup and CSV export.
 * Supports full project backup with all relationships preserved.
 */

import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import Papa from 'papaparse';
import { getDatabase } from '@/database';
import type { UUID, Project, Expense, Category, CurrencyRate, ExpensePhoto } from '@/types';

// ─── JSON Export/Import ──────────────────────────────────────────────────────

export interface ProjectBackup {
  version: 1;
  exported_at: string;
  project: Project;
  categories: Category[];
  expenses: Expense[];
  expense_photos: ExpensePhoto[];
  currency_rates: CurrencyRate[];
}

async function writeTextFile(fileName: string, content: string): Promise<string> {
  const file = new File(Paths.cache, fileName);
  file.create({ overwrite: true });
  file.write(content);
  return file.uri;
}

async function readTextFile(uri: string): Promise<string> {
  const file = new File(uri);
  return await file.text();
}

export async function exportProjectAsJSON(projectId: UUID): Promise<string> {
  const db = await getDatabase();

  const project = await db.getFirstAsync<Project>(
    'SELECT * FROM projects WHERE id = ?', projectId
  );
  if (!project) throw new Error('Project not found');

  const categories = await db.getAllAsync<Category>(
    'SELECT * FROM categories WHERE (project_id = ? OR project_id IS NULL) AND deleted_at IS NULL',
    projectId
  );

  const expenses = await db.getAllAsync<Expense>(
    'SELECT * FROM expenses WHERE project_id = ? AND deleted_at IS NULL',
    projectId
  );

  const expenseIds = expenses.map(e => e.id);
  let photos: ExpensePhoto[] = [];
  if (expenseIds.length > 0) {
    const placeholders = expenseIds.map(() => '?').join(',');
    photos = await db.getAllAsync<ExpensePhoto>(
      `SELECT * FROM expense_photos WHERE expense_id IN (${placeholders}) AND deleted_at IS NULL`,
      ...expenseIds
    );
  }

  const rates = await db.getAllAsync<CurrencyRate>(
    'SELECT * FROM currency_rates WHERE project_id = ? AND deleted_at IS NULL',
    projectId
  );

  const backup: ProjectBackup = {
    version: 1,
    exported_at: new Date().toISOString(),
    project,
    categories,
    expenses,
    expense_photos: photos,
    currency_rates: rates,
  };

  const json = JSON.stringify(backup, null, 2);
  const fileName = `${project.name.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, '_')}_backup_${Date.now()}.json`;
  return writeTextFile(fileName, json);
}

export async function importProjectFromJSON(fileUri: string): Promise<UUID> {
  const json = await readTextFile(fileUri);
  const backup: ProjectBackup = JSON.parse(json);

  if (backup.version !== 1) {
    throw new Error(`Unsupported backup version: ${backup.version}`);
  }

  const db = await getDatabase();

  await db.withTransactionAsync(async () => {
    const p = backup.project;
    await db.runAsync(
      `INSERT OR REPLACE INTO projects (id, name, description, base_currency, budget, start_date, end_date, cover_color, created_at, updated_at, deleted_at, version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      p.id, p.name, p.description, p.base_currency, p.budget,
      p.start_date, p.end_date, p.cover_color, p.created_at, p.updated_at, p.deleted_at, p.version
    );

    for (const c of backup.categories) {
      await db.runAsync(
        `INSERT OR REPLACE INTO categories (id, project_id, name, icon, color, sort_order, created_at, updated_at, deleted_at, version)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        c.id, c.project_id, c.name, c.icon, c.color, c.sort_order, c.created_at, c.updated_at, c.deleted_at, c.version
      );
    }

    for (const e of backup.expenses) {
      await db.runAsync(
        `INSERT OR REPLACE INTO expenses (id, project_id, category_id, amount, currency, exchange_rate, base_amount, title, notes, date, paid_by, split_method, location, device_id, created_at, updated_at, deleted_at, version)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        e.id, e.project_id, e.category_id, e.amount, e.currency, e.exchange_rate, e.base_amount,
        e.title, e.notes, e.date, e.paid_by, e.split_method, e.location, e.device_id,
        e.created_at, e.updated_at, e.deleted_at, e.version
      );
    }

    for (const ph of backup.expense_photos) {
      await db.runAsync(
        `INSERT OR REPLACE INTO expense_photos (id, expense_id, file_path, file_hash, width, height, size_bytes, created_at, updated_at, deleted_at, version)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ph.id, ph.expense_id, ph.file_path, ph.file_hash, ph.width, ph.height, ph.size_bytes,
        ph.created_at, ph.updated_at, ph.deleted_at, ph.version
      );
    }

    for (const r of backup.currency_rates) {
      await db.runAsync(
        `INSERT OR REPLACE INTO currency_rates (id, project_id, from_currency, to_currency, rate, recorded_at, created_at, updated_at, deleted_at, version)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        r.id, r.project_id, r.from_currency, r.to_currency, r.rate, r.recorded_at,
        r.created_at, r.updated_at, r.deleted_at, r.version
      );
    }
  });

  return backup.project.id;
}

// ─── CSV Export ──────────────────────────────────────────────────────────────

export async function exportProjectAsCSV(projectId: UUID): Promise<string> {
  const db = await getDatabase();

  const rows = await db.getAllAsync<Record<string, unknown>>(`
    SELECT
      e.title,
      e.amount,
      e.currency,
      e.exchange_rate,
      e.base_amount,
      c.name as category,
      e.date,
      e.paid_by,
      e.location,
      e.notes
    FROM expenses e
    LEFT JOIN categories c ON c.id = e.category_id
    WHERE e.project_id = ? AND e.deleted_at IS NULL
    ORDER BY e.date DESC
  `, projectId);

  const csv = Papa.unparse(rows, {
    header: true,
    columns: ['title', 'amount', 'currency', 'exchange_rate', 'base_amount', 'category', 'date', 'paid_by', 'location', 'notes'],
  });

  const project = await db.getFirstAsync<Project>('SELECT * FROM projects WHERE id = ?', projectId);
  const fileName = `${(project?.name ?? 'expenses').replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, '_')}_${Date.now()}.csv`;
  return writeTextFile(fileName, csv);
}

// ─── Sharing Helpers ─────────────────────────────────────────────────────────

export async function shareFile(filePath: string): Promise<void> {
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) throw new Error('Sharing not available on this device');
  await Sharing.shareAsync(filePath);
}

export async function pickFile(types?: string[]): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: types ?? ['application/json', 'text/csv'],
    copyToCacheDirectory: true,
  });

  if (result.canceled) return null;
  return result.assets[0]?.uri ?? null;
}
