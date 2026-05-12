/**
 * Versioned database migrations.
 * Each migration has a unique version number and SQL to execute.
 * Migrations run in order and are idempotent (tracked in schema_migrations).
 */

export interface Migration {
  version: number;
  description: string;
  sql: string;
}

export const migrations: Migration[] = [
  {
    version: 1,
    description: 'Create device table',
    sql: `
      CREATE TABLE IF NOT EXISTS device (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `,
  },
  {
    version: 2,
    description: 'Create projects table',
    sql: `
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        base_currency TEXT NOT NULL DEFAULT 'CNY',
        budget REAL,
        start_date TEXT,
        end_date TEXT,
        cover_color TEXT NOT NULL DEFAULT '#4F46E5',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        deleted_at TEXT,
        version INTEGER NOT NULL DEFAULT 1
      );
    `,
  },
  {
    version: 3,
    description: 'Create categories table',
    sql: `
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        name TEXT NOT NULL,
        icon TEXT NOT NULL,
        color TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        deleted_at TEXT,
        version INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY (project_id) REFERENCES projects(id)
      );
      CREATE INDEX IF NOT EXISTS idx_categories_project ON categories(project_id);
    `,
  },
  {
    version: 4,
    description: 'Create expenses table',
    sql: `
      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        category_id TEXT NOT NULL,
        amount REAL NOT NULL,
        currency TEXT NOT NULL,
        exchange_rate REAL NOT NULL DEFAULT 1.0,
        base_amount REAL NOT NULL,
        title TEXT NOT NULL,
        notes TEXT NOT NULL DEFAULT '',
        date TEXT NOT NULL,
        paid_by TEXT NOT NULL DEFAULT '',
        split_method TEXT NOT NULL DEFAULT 'full',
        location TEXT NOT NULL DEFAULT '',
        device_id TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        deleted_at TEXT,
        version INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY (project_id) REFERENCES projects(id),
        FOREIGN KEY (category_id) REFERENCES categories(id)
      );
      CREATE INDEX IF NOT EXISTS idx_expenses_project ON expenses(project_id);
      CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
      CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
    `,
  },
  {
    version: 5,
    description: 'Create expense_photos table',
    sql: `
      CREATE TABLE IF NOT EXISTS expense_photos (
        id TEXT PRIMARY KEY,
        expense_id TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_hash TEXT NOT NULL,
        width INTEGER NOT NULL DEFAULT 0,
        height INTEGER NOT NULL DEFAULT 0,
        size_bytes INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        deleted_at TEXT,
        version INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY (expense_id) REFERENCES expenses(id)
      );
      CREATE INDEX IF NOT EXISTS idx_photos_expense ON expense_photos(expense_id);
      CREATE INDEX IF NOT EXISTS idx_photos_hash ON expense_photos(file_hash);
    `,
  },
  {
    version: 6,
    description: 'Create currency_rates table',
    sql: `
      CREATE TABLE IF NOT EXISTS currency_rates (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        from_currency TEXT NOT NULL,
        to_currency TEXT NOT NULL,
        rate REAL NOT NULL,
        recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        deleted_at TEXT,
        version INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY (project_id) REFERENCES projects(id)
      );
      CREATE INDEX IF NOT EXISTS idx_rates_project ON currency_rates(project_id);
      CREATE INDEX IF NOT EXISTS idx_rates_currencies ON currency_rates(from_currency, to_currency);
    `,
  },
  {
    version: 7,
    description: 'Create change_log table for sync',
    sql: `
      CREATE TABLE IF NOT EXISTS change_log (
        id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        device_id TEXT NOT NULL,
        timestamp TEXT NOT NULL DEFAULT (datetime('now')),
        version INTEGER NOT NULL,
        payload TEXT NOT NULL DEFAULT '{}',
        FOREIGN KEY (device_id) REFERENCES device(id)
      );
      CREATE INDEX IF NOT EXISTS idx_changelog_entity ON change_log(entity_type, entity_id);
      CREATE INDEX IF NOT EXISTS idx_changelog_device ON change_log(device_id);
      CREATE INDEX IF NOT EXISTS idx_changelog_version ON change_log(entity_type, version);
    `,
  },
  {
    version: 8,
    description: 'Create sync_vectors table',
    sql: `
      CREATE TABLE IF NOT EXISTS sync_vectors (
        id TEXT PRIMARY KEY,
        device_id TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        last_version INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(device_id, entity_type)
      );
    `,
  },
  {
    version: 9,
    description: 'Create sync_sessions table',
    sql: `
      CREATE TABLE IF NOT EXISTS sync_sessions (
        id TEXT PRIMARY KEY,
        peer_device_id TEXT NOT NULL,
        direction TEXT NOT NULL DEFAULT 'bidirectional',
        started_at TEXT NOT NULL DEFAULT (datetime('now')),
        completed_at TEXT,
        changes_sent INTEGER NOT NULL DEFAULT 0,
        changes_received INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'in_progress',
        error_message TEXT
      );
    `,
  },
  {
    version: 10,
    description: 'Add owner_name to device and create known_devices table',
    sql: `
      ALTER TABLE device ADD COLUMN owner_name TEXT NOT NULL DEFAULT '';

      CREATE TABLE IF NOT EXISTS known_devices (
        id TEXT PRIMARY KEY,
        device_id TEXT NOT NULL UNIQUE,
        owner_name TEXT NOT NULL,
        device_name TEXT NOT NULL,
        last_synced_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `,
  },
];
