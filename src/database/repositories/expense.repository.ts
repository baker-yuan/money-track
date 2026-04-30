import type {
  UUID, Expense, CreateExpenseInput, UpdateExpenseInput,
  ExpenseWithCategory, EntityType, ISODateString
} from '@/types';
import { generateUUID, nowISO, toISO } from '@/utils';
import { BaseRepository } from './base.repository';

export class ExpenseRepository extends BaseRepository<Expense> {
  protected tableName = 'expenses';
  protected entityType: EntityType = 'expense';

  async findByProject(projectId: UUID): Promise<ExpenseWithCategory[]> {
    const db = await this.getDb();
    return db.getAllAsync<ExpenseWithCategory>(`
      SELECT
        e.*,
        c.name as category_name,
        c.icon as category_icon,
        c.color as category_color,
        (SELECT COUNT(*) FROM expense_photos p WHERE p.expense_id = e.id AND p.deleted_at IS NULL) as photo_count
      FROM expenses e
      LEFT JOIN categories c ON c.id = e.category_id
      WHERE e.project_id = ? AND e.deleted_at IS NULL
      ORDER BY e.date DESC, e.created_at DESC
    `, projectId);
  }

  async findByProjectWithFilters(
    projectId: UUID,
    filters: {
      categoryId?: UUID;
      startDate?: string;
      endDate?: string;
      minAmount?: number;
      maxAmount?: number;
      searchText?: string;
    }
  ): Promise<ExpenseWithCategory[]> {
    const db = await this.getDb();
    const conditions: string[] = ['e.project_id = ?', 'e.deleted_at IS NULL'];
    const params: (string | number)[] = [projectId];

    if (filters.categoryId) {
      conditions.push('e.category_id = ?');
      params.push(filters.categoryId);
    }
    if (filters.startDate) {
      conditions.push('e.date >= ?');
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      conditions.push('e.date <= ?');
      params.push(filters.endDate);
    }
    if (filters.minAmount !== undefined) {
      conditions.push('e.base_amount >= ?');
      params.push(filters.minAmount);
    }
    if (filters.maxAmount !== undefined) {
      conditions.push('e.base_amount <= ?');
      params.push(filters.maxAmount);
    }
    if (filters.searchText) {
      conditions.push('(e.title LIKE ? OR e.notes LIKE ?)');
      const like = `%${filters.searchText}%`;
      params.push(like, like);
    }

    return db.getAllAsync<ExpenseWithCategory>(`
      SELECT
        e.*,
        c.name as category_name,
        c.icon as category_icon,
        c.color as category_color,
        (SELECT COUNT(*) FROM expense_photos p WHERE p.expense_id = e.id AND p.deleted_at IS NULL) as photo_count
      FROM expenses e
      LEFT JOIN categories c ON c.id = e.category_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY e.date DESC, e.created_at DESC
    `, ...params);
  }

  async create(input: CreateExpenseInput): Promise<Expense> {
    const db = await this.getDb();
    const id = generateUUID();
    const now = nowISO();
    const deviceId = await this.getDeviceId(db);

    const exchangeRate = input.exchange_rate ?? 1;
    const baseAmount = input.amount * exchangeRate;

    const expense: Expense = {
      id,
      project_id: input.project_id,
      category_id: input.category_id,
      amount: input.amount,
      currency: input.currency,
      exchange_rate: exchangeRate,
      base_amount: baseAmount,
      title: input.title,
      notes: input.notes ?? '',
      date: toISO(input.date),
      paid_by: input.paid_by ?? '',
      split_method: input.split_method ?? 'full',
      location: input.location ?? '',
      device_id: deviceId,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      version: 1,
    };

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO expenses (id, project_id, category_id, amount, currency, exchange_rate, base_amount,
         title, notes, date, paid_by, split_method, location, device_id, created_at, updated_at, version)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        expense.id, expense.project_id, expense.category_id, expense.amount,
        expense.currency, expense.exchange_rate, expense.base_amount,
        expense.title, expense.notes, expense.date, expense.paid_by,
        expense.split_method, expense.location, expense.device_id,
        expense.created_at, expense.updated_at, expense.version
      );
      await this.logChange(db, id, 'INSERT', 1, expense as unknown as Record<string, unknown>);
    });

    return expense;
  }

  async update(id: UUID, input: UpdateExpenseInput): Promise<Expense | null> {
    const db = await this.getDb();
    const existing = await this.findById(id);
    if (!existing) return null;

    const now = nowISO();
    const newVersion = existing.version + 1;

    const amount = input.amount ?? existing.amount;
    const exchangeRate = input.exchange_rate ?? existing.exchange_rate;
    const baseAmount = amount * exchangeRate;

    const updated: Expense = {
      ...existing,
      ...input,
      amount,
      exchange_rate: exchangeRate,
      base_amount: baseAmount,
      date: input.date ? toISO(input.date) : existing.date,
      updated_at: now,
      version: newVersion,
    };

    const changedFields: Record<string, unknown> = {};
    for (const key of Object.keys(input) as (keyof UpdateExpenseInput)[]) {
      if (input[key] !== undefined) {
        changedFields[key] = input[key];
      }
    }
    changedFields.base_amount = baseAmount;

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `UPDATE expenses SET category_id = ?, amount = ?, currency = ?, exchange_rate = ?,
         base_amount = ?, title = ?, notes = ?, date = ?, paid_by = ?, split_method = ?,
         location = ?, updated_at = ?, version = ?
         WHERE id = ?`,
        updated.category_id, updated.amount, updated.currency, updated.exchange_rate,
        updated.base_amount, updated.title, updated.notes, updated.date,
        updated.paid_by, updated.split_method, updated.location,
        updated.updated_at, updated.version, id
      );
      await this.logChange(db, id, 'UPDATE', newVersion, changedFields);
    });

    return updated;
  }

  async getProjectTotal(projectId: UUID): Promise<number> {
    const db = await this.getDb();
    const row = await db.getFirstAsync<{ total: number }>(
      'SELECT COALESCE(SUM(base_amount), 0) as total FROM expenses WHERE project_id = ? AND deleted_at IS NULL',
      projectId
    );
    return row?.total ?? 0;
  }

  async getCategoryBreakdown(projectId: UUID): Promise<{ category_id: UUID; category_name: string; category_color: string; total: number; count: number }[]> {
    const db = await this.getDb();
    return db.getAllAsync(`
      SELECT
        e.category_id,
        c.name as category_name,
        c.color as category_color,
        SUM(e.base_amount) as total,
        COUNT(*) as count
      FROM expenses e
      JOIN categories c ON c.id = e.category_id
      WHERE e.project_id = ? AND e.deleted_at IS NULL
      GROUP BY e.category_id
      ORDER BY total DESC
    `, projectId);
  }

  async getDailyTotals(projectId: UUID): Promise<{ date: string; total: number }[]> {
    const db = await this.getDb();
    return db.getAllAsync(`
      SELECT
        DATE(date) as date,
        SUM(base_amount) as total
      FROM expenses
      WHERE project_id = ? AND deleted_at IS NULL
      GROUP BY DATE(date)
      ORDER BY date ASC
    `, projectId);
  }
}

export const expenseRepository = new ExpenseRepository();
