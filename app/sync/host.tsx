import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import * as Network from 'expo-network';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import { useProjectStore } from '@/stores';
import { SyncOrchestrator, type SyncQRPayload } from '@/services/sync';
import type { UUID } from '@/types';

export default function SyncHostScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const { currentProject, loadProject } = useProjectStore();
  const [qrData, setQrData] = useState<string | null>(null);
  const [status, setStatus] = useState<'preparing' | 'ready' | 'connected' | 'syncing' | 'done' | 'error'>('preparing');
  const [error, setError] = useState<string | null>(null);
  const [ip, setIp] = useState<string | null>(null);
  const [peerName, setPeerName] = useState<string | null>(null);
  const [syncStats, setSyncStats] = useState<{ sent: number; received: number } | null>(null);

  useEffect(() => {
    if (projectId) {
      loadProject(projectId as UUID).then(() => prepareShare());
    }
  }, [projectId]);

  async function prepareShare() {
    try {
      const networkState = await Network.getNetworkStateAsync();
      if (!networkState.isConnected) {
        setError('请连接 WiFi 网络后再分享项目');
        setStatus('error');
        return;
      }

      const ipAddress = await Network.getIpAddressAsync();
      setIp(ipAddress);

      const port = 49152 + Math.floor(Math.random() * 1000);
      const serverUrl = `http://${ipAddress}:${port}`;

      const orchestrator = new SyncOrchestrator();
      const payload = await orchestrator.generateSharePayload(
        projectId as UUID,
        serverUrl
      );

      setQrData(JSON.stringify(payload));
      setStatus('ready');

      // TODO: Start HTTP server on `port` to handle incoming sync requests
      // The server should:
      // 1. Accept handshake → call orchestrator.processHandshake()
      // 2. Handle negotiate → call orchestrator.negotiate()
      // 3. Accept push → call orchestrator.applyPeerDeltas()
      // 4. Push own deltas → orchestrator.negotiate().deltasToSend
      // 5. Confirm → orchestrator.confirmSync()
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
          <Text style={styles.statusText}>准备分享项目...</Text>
        </View>
      )}

      {status === 'ready' && qrData && (
        <View style={styles.center}>
          <Text style={styles.projectName}>{currentProject?.name}</Text>
          <View style={styles.qrContainer}>
            <QRCode value={qrData} size={220} backgroundColor="white" />
          </View>
          <Text style={styles.title}>分享项目</Text>
          <Text style={styles.description}>
            让对方打开记账本，扫描此二维码即可加入项目并同步数据
          </Text>
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>对方没有此项目？扫码会自动创建</Text>
            <Text style={styles.infoText}>已有此项目？扫码将双向同步数据</Text>
          </View>
          <Text style={styles.ipText}>局域网 IP: {ip}</Text>
        </View>
      )}

      {status === 'connected' && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.statusText}>
            {peerName ? `${peerName} 已连接` : '设备已连接'}
          </Text>
          <Text style={styles.description}>正在协商同步...</Text>
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
          <View style={styles.doneCircle}>
            <Text style={styles.doneIcon}>✓</Text>
          </View>
          <Text style={styles.title}>同步完成</Text>
          {syncStats && (
            <View style={styles.statsBox}>
              <Text style={styles.statsText}>发送 {syncStats.sent} 条变更</Text>
              <Text style={styles.statsText}>接收 {syncStats.received} 条变更</Text>
            </View>
          )}
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
  projectName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
    marginBottom: spacing.lg,
  },
  qrContainer: {
    padding: spacing.xl,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.xxl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
  description: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center', lineHeight: 22 },
  infoBox: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.md,
  },
  infoText: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20, textAlign: 'center' },
  ipText: { fontSize: fontSize.xs, color: colors.textTertiary, marginTop: spacing.lg },
  statusText: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: spacing.lg },
  doneCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  doneIcon: { fontSize: 36, color: colors.success },
  statsBox: { marginTop: spacing.lg, alignItems: 'center', gap: spacing.xs },
  statsText: { fontSize: fontSize.sm, color: colors.textSecondary },
  errorText: { fontSize: fontSize.md, color: colors.error, textAlign: 'center' },
});
