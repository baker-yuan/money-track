import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import * as Network from 'expo-network';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import { deviceRepository } from '@/database/repositories';
import { generateUUID } from '@/utils';
import type { UUID } from '@/types';

interface SyncQRData {
  url: string;
  deviceId: string;
  token: string;
  projectId: string;
}

export default function SyncHostScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const [qrData, setQrData] = useState<string | null>(null);
  const [status, setStatus] = useState<'preparing' | 'ready' | 'connected' | 'syncing' | 'done' | 'error'>('preparing');
  const [error, setError] = useState<string | null>(null);
  const [ip, setIp] = useState<string | null>(null);

  useEffect(() => {
    prepareSync();
  }, []);

  async function prepareSync() {
    try {
      const networkState = await Network.getNetworkStateAsync();
      if (!networkState.isConnected) {
        setError('请连接 WiFi 网络');
        setStatus('error');
        return;
      }

      const ipAddress = await Network.getIpAddressAsync();
      setIp(ipAddress);

      const deviceId = await deviceRepository.getDeviceId();
      const token = generateUUID();
      const port = 49152 + Math.floor(Math.random() * 1000);

      const data: SyncQRData = {
        url: `http://${ipAddress}:${port}`,
        deviceId: deviceId as string,
        token: token as string,
        projectId: projectId ?? '',
      };

      setQrData(JSON.stringify(data));
      setStatus('ready');

      // TODO: Start actual HTTP server here (Phase 5 full implementation)
    } catch (e) {
      setError((e as Error).message);
      setStatus('error');
    }
  }

  return (
    <View style={styles.container}>
      {status === 'preparing' && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.statusText}>准备中...</Text>
        </View>
      )}

      {status === 'ready' && qrData && (
        <View style={styles.center}>
          <View style={styles.qrContainer}>
            <QRCode value={qrData} size={220} backgroundColor="white" />
          </View>
          <Text style={styles.title}>扫描二维码</Text>
          <Text style={styles.description}>请让对方设备扫描此二维码以开始同步</Text>
          <Text style={styles.ipText}>IP: {ip}</Text>
        </View>
      )}

      {status === 'syncing' && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.statusText}>正在同步数据...</Text>
        </View>
      )}

      {status === 'done' && (
        <View style={styles.center}>
          <Text style={styles.doneIcon}>✓</Text>
          <Text style={styles.title}>同步完成</Text>
        </View>
      )}

      {status === 'error' && (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  qrContainer: {
    padding: spacing.xl,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.xxl,
  },
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text, marginTop: spacing.lg },
  description: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' },
  ipText: { fontSize: fontSize.sm, color: colors.textTertiary, marginTop: spacing.md },
  statusText: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: spacing.lg },
  doneIcon: { fontSize: 64, color: colors.success },
  errorText: { fontSize: fontSize.md, color: colors.error, textAlign: 'center' },
});
