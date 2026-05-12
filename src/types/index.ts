/**
 * Core domain types for the Travel Expense Tracker.
 * All entity types use UUID primary keys, soft deletes, and version numbers.
 */

// ─── Branded Types ───────────────────────────────────────────────────────────

export type UUID = string & { readonly __brand: 'UUID' };
export type ISODateString = string & { readonly __brand: 'ISODateString' };
export type CurrencyCode = string & { readonly __brand: 'CurrencyCode' };

// ─── Base Entity ─────────────────────────────────────────────────────────────

export interface BaseEntity {
  id: UUID;
  created_at: ISODateString;
  updated_at: ISODateString;
  deleted_at: ISODateString | null;
  version: number;
}

// ─── Device ──────────────────────────────────────────────────────────────────

export interface Device {
  id: UUID;
  name: string;
  owner_name: string;
  created_at: ISODateString;
}

export interface KnownDevice {
  id: UUID;
  device_id: UUID;
  owner_name: string;
  device_name: string;
  last_synced_at: ISODateString | null;
  created_at: ISODateString;
}

// ─── Project ─────────────────────────────────────────────────────────────────

export interface Project extends BaseEntity {
  name: string;
  description: string;
  base_currency: CurrencyCode;
  budget: number | null;
  start_date: ISODateString | null;
  end_date: ISODateString | null;
  cover_color: string;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  base_currency: CurrencyCode;
  budget?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  cover_color?: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  base_currency?: CurrencyCode;
  budget?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  cover_color?: string;
}

// ─── Category ────────────────────────────────────────────────────────────────

export interface Category extends BaseEntity {
  project_id: UUID | null; // null = global default
  name: string;
  icon: string;
  color: string;
  sort_order: number;
}

export interface CreateCategoryInput {
  project_id?: UUID | null;
  name: string;
  icon: string;
  color: string;
  sort_order?: number;
}

// ─── Expense ─────────────────────────────────────────────────────────────────

export type SplitMethod = 'equal' | 'custom' | 'full';

export interface Expense extends BaseEntity {
  project_id: UUID;
  category_id: UUID;
  amount: number;
  currency: CurrencyCode;
  exchange_rate: number;
  base_amount: number;
  title: string;
  notes: string;
  date: ISODateString;
  paid_by: string;
  split_method: SplitMethod;
  location: string;
  device_id: UUID;
}

export interface CreateExpenseInput {
  project_id: UUID;
  category_id: UUID;
  amount: number;
  currency: CurrencyCode;
  exchange_rate?: number;
  title: string;
  notes?: string;
  date: string;
  paid_by?: string;
  split_method?: SplitMethod;
  location?: string;
}

export interface UpdateExpenseInput {
  category_id?: UUID;
  amount?: number;
  currency?: CurrencyCode;
  exchange_rate?: number;
  title?: string;
  notes?: string;
  date?: string;
  paid_by?: string;
  split_method?: SplitMethod;
  location?: string;
}

// ─── Expense Photo ───────────────────────────────────────────────────────────

export interface ExpensePhoto extends BaseEntity {
  expense_id: UUID;
  file_path: string;
  file_hash: string;
  width: number;
  height: number;
  size_bytes: number;
}

// ─── Currency Rate ───────────────────────────────────────────────────────────

export interface CurrencyRate extends BaseEntity {
  project_id: UUID;
  from_currency: CurrencyCode;
  to_currency: CurrencyCode;
  rate: number;
  recorded_at: ISODateString;
}

// ─── Change Log (Sync) ──────────────────────────────────────────────────────

export type ChangeOperation = 'INSERT' | 'UPDATE' | 'DELETE';
export type EntityType = 'project' | 'expense' | 'category' | 'currency_rate' | 'expense_photo';

export interface ChangeLogEntry {
  id: UUID;
  entity_type: EntityType;
  entity_id: UUID;
  operation: ChangeOperation;
  device_id: UUID;
  timestamp: ISODateString;
  version: number;
  payload: string; // JSON serialized changed fields
}

// ─── Sync ────────────────────────────────────────────────────────────────────

export interface SyncVector {
  id: UUID;
  device_id: UUID;
  entity_type: EntityType;
  last_version: number;
  updated_at: ISODateString;
}

export interface SyncSession {
  id: UUID;
  peer_device_id: UUID;
  direction: 'push' | 'pull' | 'bidirectional';
  started_at: ISODateString;
  completed_at: ISODateString | null;
  changes_sent: number;
  changes_received: number;
  status: 'in_progress' | 'completed' | 'failed';
  error_message: string | null;
}

// ─── UI Types ────────────────────────────────────────────────────────────────

export interface ProjectWithStats extends Project {
  total_expenses: number;
  expense_count: number;
  last_expense_date: ISODateString | null;
}

export interface ExpenseWithCategory extends Expense {
  category_name: string;
  category_icon: string;
  category_color: string;
  photo_count: number;
  /** Whether this expense was created on the local device */
  is_local: boolean;
  /** Name of the person who created this expense (from known_devices) */
  author_name: string;
}

// ─── Result Type ─────────────────────────────────────────────────────────────

export type Result<T, E = Error> =
  | { ok: true; data: T }
  | { ok: false; error: E };
