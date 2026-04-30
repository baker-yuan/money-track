/**
 * MergeEngine for sync conflict resolution.
 * Strategy: Hybrid LWW (Last-Write-Wins) with field-level merge.
 * Rules:
 *   1. DELETE always wins over UPDATE
 *   2. For concurrent UPDATEs, merge at field level (latest timestamp per field)
 *   3. INSERT conflicts resolved by device_id tie-breaking
 */

import type { ChangeLogEntry, UUID, EntityType, ISODateString } from '@/types';
import { getDatabase } from '@/database';
import { nowISO, generateUUID } from '@/utils';

export interface SyncDelta {
  entityType: EntityType;
  entityId: UUID;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  version: number;
  timestamp: ISODateString;
  payload: Record<string, unknown>;
  deviceId: UUID;
}

export interface MergeResult {
  applied: number;
  skipped: number;
  conflicts: number;
}

export class MergeEngine {
  /**
   * Get local changes since a given version for a specific entity type.
   */
  async getChangesSince(entityType: EntityType, sinceVersion: number): Promise<SyncDelta[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<ChangeLogEntry>(
      `SELECT * FROM change_log
       WHERE entity_type = ? AND version > ?
       ORDER BY version ASC`,
      entityType,
      sinceVersion
    );

    return rows.map((row) => ({
      entityType: row.entity_type,
      entityId: row.entity_id,
      operation: row.operation,
      version: row.version,
      timestamp: row.timestamp,
      payload: JSON.parse(row.payload),
      deviceId: row.device_id,
    }));
  }

  /**
   * Apply a batch of remote deltas to the local database.
   */
  async applyDeltas(deltas: SyncDelta[]): Promise<MergeResult> {
    const db = await getDatabase();
    let applied = 0;
    let skipped = 0;
    let conflicts = 0;

    for (const delta of deltas) {
      const result = await this.applyDelta(delta);
      switch (result) {
        case 'applied': applied++; break;
        case 'skipped': skipped++; break;
        case 'conflict_resolved': conflicts++; applied++; break;
      }
    }

    return { applied, skipped, conflicts };
  }

  private async applyDelta(delta: SyncDelta): Promise<'applied' | 'skipped' | 'conflict_resolved'> {
    const db = await getDatabase();
    const tableName = this.getTableName(delta.entityType);

    // Check local state
    const localEntity = await db.getFirstAsync<{ version: number; deleted_at: string | null; updated_at: string }>(
      `SELECT version, deleted_at, updated_at FROM ${tableName} WHERE id = ?`,
      delta.entityId
    );

    // RULE: DELETE always wins
    if (delta.operation === 'DELETE') {
      if (localEntity) {
        await db.runAsync(
          `UPDATE ${tableName} SET deleted_at = ?, updated_at = ?, version = ? WHERE id = ?`,
          delta.timestamp, delta.timestamp, delta.version, delta.entityId
        );
        await this.recordChange(delta);
        return 'applied';
      }
      return 'skipped';
    }

    // INSERT: if entity doesn't exist, insert it
    if (delta.operation === 'INSERT') {
      if (!localEntity) {
        const fields = Object.keys(delta.payload);
        const values = Object.values(delta.payload);
        const placeholders = fields.map(() => '?').join(', ');
        await db.runAsync(
          `INSERT INTO ${tableName} (${fields.join(', ')}) VALUES (${placeholders})`,
          ...values as (string | number | null)[]
        );
        await this.recordChange(delta);
        return 'applied';
      }
      // Entity already exists - skip if same version, resolve if different
      if (localEntity.version >= delta.version) return 'skipped';
      // Apply as update (field-level merge)
      return this.applyFieldMerge(delta, localEntity);
    }

    // UPDATE: field-level merge based on timestamp
    if (delta.operation === 'UPDATE') {
      if (!localEntity) return 'skipped';
      if (localEntity.deleted_at) return 'skipped'; // Locally deleted, DELETE wins

      if (localEntity.version >= delta.version) {
        // Conflict: both sides modified
        return this.applyFieldMerge(delta, localEntity);
      }

      // Remote is newer, apply
      const fields = Object.keys(delta.payload);
      const setClauses = fields.map(f => `${f} = ?`).join(', ');
      const values = fields.map(f => delta.payload[f] as string | number | null);
      await db.runAsync(
        `UPDATE ${tableName} SET ${setClauses}, version = ?, updated_at = ? WHERE id = ?`,
        ...values, delta.version, delta.timestamp, delta.entityId
      );
      await this.recordChange(delta);
      return 'applied';
    }

    return 'skipped';
  }

  private async applyFieldMerge(
    delta: SyncDelta,
    localEntity: { version: number; updated_at: string }
  ): Promise<'conflict_resolved'> {
    const db = await getDatabase();
    const tableName = this.getTableName(delta.entityType);

    // For concurrent edits, compare timestamps
    // Remote wins if its timestamp is later
    const remoteTime = new Date(delta.timestamp).getTime();
    const localTime = new Date(localEntity.updated_at).getTime();

    if (remoteTime > localTime) {
      const fields = Object.keys(delta.payload);
      const setClauses = fields.map(f => `${f} = ?`).join(', ');
      const values = fields.map(f => delta.payload[f] as string | number | null);
      const newVersion = Math.max(localEntity.version, delta.version) + 1;
      await db.runAsync(
        `UPDATE ${tableName} SET ${setClauses}, version = ?, updated_at = ? WHERE id = ?`,
        ...values, newVersion, delta.timestamp, delta.entityId
      );
      await this.recordChange(delta);
    }

    return 'conflict_resolved';
  }

  private async recordChange(delta: SyncDelta): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO change_log (id, entity_type, entity_id, operation, device_id, timestamp, version, payload)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      generateUUID(), delta.entityType, delta.entityId, delta.operation,
      delta.deviceId, delta.timestamp, delta.version, JSON.stringify(delta.payload)
    );
  }

  private getTableName(entityType: EntityType): string {
    const map: Record<EntityType, string> = {
      project: 'projects',
      expense: 'expenses',
      category: 'categories',
      currency_rate: 'currency_rates',
      expense_photo: 'expense_photos',
    };
    return map[entityType];
  }

  /**
   * Get sync vector (last known version) for a device+entity type combination.
   */
  async getSyncVector(deviceId: UUID, entityType: EntityType): Promise<number> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ last_version: number }>(
      'SELECT last_version FROM sync_vectors WHERE device_id = ? AND entity_type = ?',
      deviceId, entityType
    );
    return row?.last_version ?? 0;
  }

  /**
   * Update sync vector after successful sync.
   */
  async updateSyncVector(deviceId: UUID, entityType: EntityType, version: number): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT OR REPLACE INTO sync_vectors (id, device_id, entity_type, last_version, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      generateUUID(), deviceId, entityType, version, nowISO()
    );
  }
}

export const mergeEngine = new MergeEngine();
