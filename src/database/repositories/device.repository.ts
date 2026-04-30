import type { UUID, Device } from '@/types';
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
      'INSERT INTO device (id, name, created_at) VALUES (?, ?, ?)',
      id, name, now
    );

    return { id, name, created_at: now };
  }

  async getDeviceId(): Promise<UUID> {
    const device = await this.getOrCreate();
    return device.id;
  }
}

export const deviceRepository = new DeviceRepository();
