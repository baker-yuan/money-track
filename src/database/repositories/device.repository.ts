import type { UUID, Device, KnownDevice } from '@/types';
import { generateUUID, nowISO } from '@/utils';
import { getDatabase } from '@/database';
import * as Device_API from 'expo-constants';

export class DeviceRepository {
  async getOrCreate(): Promise<Device> {
    const db = await getDatabase();
    const existing = await db.getFirstAsync<Device>('SELECT * FROM device LIMIT 1');
    if (existing) return existing;

    const id = generateUUID();
    const name = Device_API.default.deviceName ?? 'My Device';
    const now = nowISO();

    await db.runAsync(
      'INSERT INTO device (id, name, owner_name, created_at) VALUES (?, ?, ?, ?)',
      id, name, '', now
    );

    return { id, name, owner_name: '', created_at: now };
  }

  async getDeviceId(): Promise<UUID> {
    const device = await this.getOrCreate();
    return device.id;
  }

  async updateOwnerName(ownerName: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('UPDATE device SET owner_name = ?', ownerName);
  }

  async getOwnerName(): Promise<string> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ owner_name: string }>('SELECT owner_name FROM device LIMIT 1');
    return row?.owner_name ?? '';
  }

  // ─── Known Devices (peers we've synced with) ─────────────────────────────

  async upsertKnownDevice(deviceId: UUID, ownerName: string, deviceName: string): Promise<void> {
    const db = await getDatabase();
    const now = nowISO();
    await db.runAsync(
      `INSERT INTO known_devices (id, device_id, owner_name, device_name, last_synced_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(device_id) DO UPDATE SET
         owner_name = excluded.owner_name,
         device_name = excluded.device_name,
         last_synced_at = excluded.last_synced_at`,
      generateUUID(), deviceId, ownerName, deviceName, now, now
    );
  }

  async getKnownDevice(deviceId: UUID): Promise<KnownDevice | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<KnownDevice>(
      'SELECT * FROM known_devices WHERE device_id = ?', deviceId
    );
    return row ?? null;
  }

  async getAllKnownDevices(): Promise<KnownDevice[]> {
    const db = await getDatabase();
    return db.getAllAsync<KnownDevice>('SELECT * FROM known_devices ORDER BY last_synced_at DESC');
  }
}

export const deviceRepository = new DeviceRepository();
