/**
 * Base repository with common CRUD patterns.
 * All mutations atomically write to both entity table AND change_log.
 */

import type * as SQLite from 'expo-sqlite';
import type { UUID, ISODateString, EntityType, ChangeOperation } from '@/types';
import { getDatabase } from '@/database';
import { generateUUID, nowISO } from '@/utils';

export abstract class BaseRepository<T extends { id: UUID }> {
  protected abstract tableName: string;
  protected abstract entityType: EntityType;

  protected async getDb(): Promise<SQLite.SQLiteDatabase> {
    return getDatabase();
  }

  protected async logChange(
    db: SQLite.SQLiteDatabase,
    entityId: UUID,
    operation: ChangeOperation,
    version: number,
    payload: Record<string, unknown>
  ): Promise<void> {
    const deviceId = await this.getDeviceId(db);
    await db.runAsync(
      `INSERT INTO change_log (id, entity_type, entity_id, operation, device_id, timestamp, version, payload)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      generateUUID(),
      this.entityType,
      entityId,
      operation,
      deviceId,
      nowISO(),
      version,
      JSON.stringify(payload)
    );
  }

  protected async getDeviceId(db: SQLite.SQLiteDatabase): Promise<UUID> {
    const row = await db.getFirstAsync<{ id: string }>('SELECT id FROM device LIMIT 1');
    if (!row) throw new Error('Device not initialized');
    return row.id as UUID;
  }

  async findById(id: UUID): Promise<T | null> {
    const db = await this.getDb();
    const row = await db.getFirstAsync<T>(
      `SELECT * FROM ${this.tableName} WHERE id = ? AND deleted_at IS NULL`,
      id
    );
    return row ?? null;
  }

  async softDelete(id: UUID): Promise<void> {
    const db = await this.getDb();
    const now = nowISO();
    const existing = await this.findById(id);
    if (!existing) return;

    const newVersion = ((existing as unknown as { version: number }).version ?? 0) + 1;

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `UPDATE ${this.tableName} SET deleted_at = ?, updated_at = ?, version = ? WHERE id = ?`,
        now,
        now,
        newVersion,
        id
      );
      await this.logChange(db, id, 'DELETE', newVersion, { deleted_at: now });
    });
  }
}
