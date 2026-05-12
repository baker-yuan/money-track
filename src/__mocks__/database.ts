/**
 * Mock for expo-sqlite database.
 * Simulates SQLite behavior with in-memory data structures.
 */

interface Row {
  [key: string]: unknown;
}

export class MockDatabase {
  private tables: Map<string, Row[]> = new Map();
  private foreignKeys = true;

  // Table schemas for FK validation
  private fkConstraints: { table: string; column: string; refTable: string; refColumn: string }[] = [
    { table: 'expenses', column: 'project_id', refTable: 'projects', refColumn: 'id' },
    { table: 'expenses', column: 'category_id', refTable: 'categories', refColumn: 'id' },
    { table: 'categories', column: 'project_id', refTable: 'projects', refColumn: 'id' },
    { table: 'change_log', column: 'device_id', refTable: 'device', refColumn: 'id' },
  ];

  constructor() {
    this.reset();
  }

  reset() {
    this.tables = new Map([
      ['device', []],
      ['projects', []],
      ['categories', []],
      ['expenses', []],
      ['change_log', []],
      ['expense_photos', []],
      ['currency_rates', []],
      ['schema_migrations', []],
      ['sync_vectors', []],
      ['sync_sessions', []],
      ['user_settings', []],
    ]);
  }

  private checkForeignKeys(table: string, row: Row): void {
    if (!this.foreignKeys) return;

    for (const fk of this.fkConstraints) {
      if (fk.table !== table) continue;
      const value = row[fk.column];
      if (value === null || value === undefined) continue; // NULL bypasses FK

      const refTable = this.tables.get(fk.refTable);
      if (!refTable) {
        throw new Error(`FOREIGN KEY constraint failed: ${fk.table}.${fk.column} -> ${fk.refTable}.${fk.refColumn}`);
      }
      const exists = refTable.some(r => r[fk.refColumn] === value);
      if (!exists) {
        throw new Error(`FOREIGN KEY constraint failed: ${fk.table}.${fk.column} -> ${fk.refTable}.${fk.refColumn} (value: ${value})`);
      }
    }
  }

  insert(table: string, row: Row): void {
    this.checkForeignKeys(table, row);
    const rows = this.tables.get(table);
    if (!rows) throw new Error(`Table ${table} does not exist`);
    rows.push({ ...row });
  }

  select(table: string, where?: (row: Row) => boolean): Row[] {
    const rows = this.tables.get(table) ?? [];
    return where ? rows.filter(where) : [...rows];
  }

  selectFirst(table: string, where?: (row: Row) => boolean): Row | null {
    const rows = this.select(table, where);
    return rows[0] ?? null;
  }

  update(table: string, where: (row: Row) => boolean, updates: Partial<Row>): number {
    const rows = this.tables.get(table) ?? [];
    let count = 0;
    for (let i = 0; i < rows.length; i++) {
      if (where(rows[i]!)) {
        rows[i] = { ...rows[i]!, ...updates };
        count++;
      }
    }
    return count;
  }

  getTable(table: string): Row[] {
    return this.tables.get(table) ?? [];
  }

  setForeignKeys(enabled: boolean) {
    this.foreignKeys = enabled;
  }
}

// Singleton mock DB for tests
export const mockDb = new MockDatabase();

/**
 * Create a mock SQLiteDatabase interface that delegates to MockDatabase.
 */
export function createMockSQLiteDb() {
  const db = {
    runAsync: jest.fn(async (sql: string, ...params: unknown[]) => {
      const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
      const table = parseTable(sql);
      const operation = parseOperation(sql);

      if (operation === 'INSERT') {
        const columns = parseInsertColumns(sql);
        const row: Row = {};
        columns.forEach((col, i) => {
          row[col] = flatParams[i] ?? null;
        });
        mockDb.insert(table, row);
      } else if (operation === 'UPDATE') {
        // Simplified - just track the call
      }

      return { changes: 1, lastInsertRowId: 1 };
    }),

    getFirstAsync: jest.fn(async <T>(sql: string, ...params: unknown[]): Promise<T | null> => {
      const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
      const table = parseTable(sql);

      if (sql.includes('SELECT id FROM')) {
        // FK validation query
        const id = flatParams[0];
        const row = mockDb.selectFirst(table, r => r.id === id);
        return row as T | null;
      }

      if (table === 'device') {
        const row = mockDb.selectFirst('device');
        return row as T | null;
      }

      const rows = mockDb.select(table);
      return (rows[0] as T) ?? null;
    }),

    getAllAsync: jest.fn(async <T>(sql: string, ...params: unknown[]): Promise<T[]> => {
      const table = parseTable(sql);
      const rows = mockDb.select(table);
      return rows as T[];
    }),

    execAsync: jest.fn(async () => {}),

    withTransactionAsync: jest.fn(async (task: () => Promise<void>) => {
      await task();
    }),
  };

  return db;
}

function parseOperation(sql: string): string {
  const normalized = sql.trim().toUpperCase();
  if (normalized.startsWith('INSERT')) return 'INSERT';
  if (normalized.startsWith('UPDATE')) return 'UPDATE';
  if (normalized.startsWith('DELETE')) return 'DELETE';
  if (normalized.startsWith('SELECT')) return 'SELECT';
  if (normalized.startsWith('CREATE')) return 'CREATE';
  return 'UNKNOWN';
}

function parseTable(sql: string): string {
  const normalized = sql.replace(/\s+/g, ' ').trim();
  // INSERT INTO table_name
  let match = normalized.match(/INSERT\s+INTO\s+(\w+)/i);
  if (match) return match[1]!;
  // SELECT ... FROM table_name
  match = normalized.match(/FROM\s+(\w+)/i);
  if (match) return match[1]!;
  // UPDATE table_name
  match = normalized.match(/UPDATE\s+(\w+)/i);
  if (match) return match[1]!;
  return 'unknown';
}

function parseInsertColumns(sql: string): string[] {
  const match = sql.match(/\(([^)]+)\)\s*VALUES/i);
  if (!match) return [];
  return match[1]!.split(',').map(c => c.trim());
}
