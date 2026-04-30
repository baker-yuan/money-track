/**
 * Sync protocol types and service orchestration.
 *
 * Flow:
 * 1. Host "shares" a project → generates QR code with project metadata + connection info
 * 2. Guest scans QR → if project doesn't exist locally, auto-creates it
 * 3. Bidirectional sync: exchange deltas, merge conflicts, confirm
 *
 * Handles: handshake → project bootstrap → negotiate → push/pull → confirm
 */

import type { UUID, EntityType, Project, Category, ISODateString } from '@/types';
import { mergeEngine, type SyncDelta, type MergeResult } from './merge-engine';
import { deviceRepository, projectRepository, categoryRepository } from '@/database/repositories';
import { generateUUID, nowISO } from '@/utils';
import { getDatabase } from '@/database';

// ─── QR Code Payload ─────────────────────────────────────────────────────────

/**
 * Data encoded in the QR code when sharing a project.
 * Contains everything the guest needs to connect and bootstrap the project.
 */
export interface SyncQRPayload {
  /** HTTP server URL on LAN */
  url: string;
  /** Host device ID */
  deviceId: string;
  /** One-time session token for authentication */
  token: string;
  /** Project to sync */
  project: {
    id: string;
    name: string;
    description: string;
    base_currency: string;
    budget: number | null;
    cover_color: string;
    start_date: string | null;
    end_date: string | null;
  };
}

// ─── Protocol Messages ───────────────────────────────────────────────────────

export interface HandshakeRequest {
  type: 'handshake';
  deviceId: UUID;
  deviceName: string;
  /** The project ID being synced */
  projectId: UUID;
  /** Whether the guest already has this project */
  hasProject: boolean;
}

export interface HandshakeResponse {
  type: 'handshake_ack';
  deviceId: UUID;
  deviceName: string;
  /** Full project data for bootstrap (if guest doesn't have it) */
  projectData: Project | null;
  /** Categories to bootstrap (global + project-specific) */
  categories: Category[] | null;
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
  deltas: SyncDelta[];
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
  private projectId: UUID | null = null;

  constructor() {
    this.sessionId = generateUUID();
  }

  // ─── Host Side ───────────────────────────────────────────────────────────

  /**
   * Generate QR payload for sharing a project.
   * Called by the host when they tap "share project".
   */
  async generateSharePayload(projectId: UUID, serverUrl: string): Promise<SyncQRPayload> {
    const device = await deviceRepository.getOrCreate();
    const project = await projectRepository.findById(projectId);
    if (!project) throw new Error('Project not found');

    const token = generateUUID();

    return {
      url: serverUrl,
      deviceId: device.id as string,
      token: token as string,
      project: {
        id: project.id as string,
        name: project.name,
        description: project.description,
        base_currency: project.base_currency as string,
        budget: project.budget,
        cover_color: project.cover_color,
        start_date: project.start_date as string | null,
        end_date: project.end_date as string | null,
      },
    };
  }

  /**
   * Host processes guest's handshake.
   * If guest doesn't have the project, include full project + categories for bootstrap.
   */
  async processHandshake(request: HandshakeRequest): Promise<HandshakeResponse> {
    this.peerDeviceId = request.deviceId;
    this.projectId = request.projectId;
    const device = await deviceRepository.getOrCreate();

    let projectData: Project | null = null;
    let categories: Category[] | null = null;

    if (!request.hasProject) {
      // Guest doesn't have this project - send full data for bootstrap
      projectData = await projectRepository.findById(request.projectId);
      if (projectData) {
        categories = await categoryRepository.findByProject(request.projectId);
      }
    }

    return {
      type: 'handshake_ack',
      deviceId: device.id,
      deviceName: device.name,
      projectData,
      categories,
    };
  }

  // ─── Guest Side ──────────────────────────────────────────────────────────

  /**
   * Guest: Check if we already have this project locally.
   */
  async hasProjectLocally(projectId: UUID): Promise<boolean> {
    const project = await projectRepository.findById(projectId);
    return project !== null;
  }

  /**
   * Guest: Bootstrap a project received from host.
   * Creates the project and categories locally if they don't exist.
   */
  async bootstrapProject(projectData: Project, categories: Category[]): Promise<void> {
    const db = await getDatabase();

    await db.withTransactionAsync(async () => {
      // Insert the project
      const p = projectData;
      await db.runAsync(
        `INSERT OR IGNORE INTO projects (id, name, description, base_currency, budget, start_date, end_date, cover_color, created_at, updated_at, deleted_at, version)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        p.id, p.name, p.description, p.base_currency, p.budget,
        p.start_date, p.end_date, p.cover_color, p.created_at, p.updated_at, p.deleted_at, p.version
      );

      // Insert categories
      for (const c of categories) {
        await db.runAsync(
          `INSERT OR IGNORE INTO categories (id, project_id, name, icon, color, sort_order, created_at, updated_at, deleted_at, version)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          c.id, c.project_id, c.name, c.icon, c.color, c.sort_order, c.created_at, c.updated_at, c.deleted_at, c.version
        );
      }
    });
  }

  /**
   * Guest: Create handshake request to send to host.
   */
  async createHandshake(projectId: UUID): Promise<HandshakeRequest> {
    const device = await deviceRepository.getOrCreate();
    const hasProject = await this.hasProjectLocally(projectId);
    this.projectId = projectId;

    return {
      type: 'handshake',
      deviceId: device.id,
      deviceName: device.name,
      projectId,
      hasProject,
    };
  }

  // ─── Shared (Both Sides) ─────────────────────────────────────────────────

  /**
   * Negotiate sync by comparing version vectors.
   * Returns our vectors + the deltas we want to send to the peer.
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
  async confirmSync(peerDeviceId: UUID, changesSent: number, changesReceived: number): Promise<void> {
    const db = await getDatabase();

    // Record sync session
    await db.runAsync(
      `INSERT INTO sync_sessions (id, peer_device_id, direction, started_at, completed_at, changes_sent, changes_received, status)
       VALUES (?, ?, 'bidirectional', ?, ?, ?, ?, 'completed')`,
      this.sessionId, peerDeviceId, nowISO(), nowISO(), changesSent, changesReceived
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
