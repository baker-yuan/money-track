/**
 * Sync protocol types and service orchestration.
 * Handles the full sync lifecycle: handshake → negotiate → push/pull → confirm.
 */

import type { UUID, EntityType } from '@/types';
import { mergeEngine, type SyncDelta, type MergeResult } from './merge-engine';
import { deviceRepository } from '@/database/repositories';
import { generateUUID, nowISO } from '@/utils';
import { getDatabase } from '@/database';

// ─── Protocol Messages ───────────────────────────────────────────────────────

export interface HandshakeRequest {
  type: 'handshake';
  deviceId: UUID;
  deviceName: string;
  projectIds: UUID[];
}

export interface HandshakeResponse {
  type: 'handshake_ack';
  deviceId: UUID;
  deviceName: string;
  projectIds: UUID[];
}

export interface NegotiateRequest {
  type: 'negotiate';
  projectId: UUID;
  vectors: { entityType: EntityType; lastVersion: number }[];
}

export interface NegotiateResponse {
  type: 'negotiate_ack';
  projectId: UUID;
  vectors: { entityType: EntityType; lastVersion: number }[];
}

export interface PushRequest {
  type: 'push';
  projectId: UUID;
  deltas: SyncDelta[];
}

export interface PushResponse {
  type: 'push_ack';
  result: MergeResult;
}

export interface ConfirmRequest {
  type: 'confirm';
  sessionId: UUID;
}

export type SyncMessage =
  | HandshakeRequest | HandshakeResponse
  | NegotiateRequest | NegotiateResponse
  | PushRequest | PushResponse
  | ConfirmRequest;

// ─── Sync Session Orchestration ──────────────────────────────────────────────

const ENTITY_TYPES: EntityType[] = ['project', 'category', 'expense', 'expense_photo', 'currency_rate'];

export class SyncOrchestrator {
  private sessionId: UUID;
  private peerDeviceId: UUID | null = null;

  constructor() {
    this.sessionId = generateUUID();
  }

  /**
   * Create a handshake message for this device.
   */
  async createHandshake(projectIds: UUID[]): Promise<HandshakeRequest> {
    const device = await deviceRepository.getOrCreate();
    return {
      type: 'handshake',
      deviceId: device.id,
      deviceName: device.name,
      projectIds,
    };
  }

  /**
   * Process incoming handshake and respond.
   */
  async processHandshake(request: HandshakeRequest): Promise<HandshakeResponse> {
    this.peerDeviceId = request.deviceId;
    const device = await deviceRepository.getOrCreate();
    const db = await getDatabase();
    const projects = await db.getAllAsync<{ id: UUID }>(
      'SELECT id FROM projects WHERE deleted_at IS NULL'
    );
    return {
      type: 'handshake_ack',
      deviceId: device.id,
      deviceName: device.name,
      projectIds: projects.map(p => p.id),
    };
  }

  /**
   * Negotiate sync by comparing version vectors.
   */
  async negotiate(projectId: UUID, peerDeviceId: UUID): Promise<{ localVectors: NegotiateRequest; deltasToSend: SyncDelta[] }> {
    const vectors: { entityType: EntityType; lastVersion: number }[] = [];
    const deltasToSend: SyncDelta[] = [];

    for (const entityType of ENTITY_TYPES) {
      const lastVersion = await mergeEngine.getSyncVector(peerDeviceId, entityType);
      vectors.push({ entityType, lastVersion });

      const changes = await mergeEngine.getChangesSince(entityType, lastVersion);
      deltasToSend.push(...changes);
    }

    return {
      localVectors: { type: 'negotiate', projectId, vectors },
      deltasToSend,
    };
  }

  /**
   * Apply received deltas from peer.
   */
  async applyPeerDeltas(deltas: SyncDelta[]): Promise<MergeResult> {
    return mergeEngine.applyDeltas(deltas);
  }

  /**
   * Confirm sync session and update vectors.
   */
  async confirmSync(peerDeviceId: UUID, result: MergeResult): Promise<void> {
    const db = await getDatabase();

    // Record sync session
    await db.runAsync(
      `INSERT INTO sync_sessions (id, peer_device_id, direction, started_at, completed_at, changes_sent, changes_received, status)
       VALUES (?, ?, 'bidirectional', ?, ?, ?, ?, 'completed')`,
      this.sessionId, peerDeviceId, nowISO(), nowISO(), result.applied, result.applied
    );

    // Update vectors for all entity types
    for (const entityType of ENTITY_TYPES) {
      const rows = await db.getAllAsync<{ max_version: number }>(
        'SELECT MAX(version) as max_version FROM change_log WHERE entity_type = ?',
        entityType
      );
      const maxVersion = rows[0]?.max_version ?? 0;
      await mergeEngine.updateSyncVector(peerDeviceId, entityType, maxVersion);
    }
  }
}

export { mergeEngine, type SyncDelta, type MergeResult };
