import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Button } from '@/components/ui';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import { SyncOrchestrator, type SyncQRPayload } from '@/services/sync';
import { useProjectStore } from '@/stores';
import type { UUID } from '@/types';

type SyncStatus = 'scanning' | 'connecting' | 'bootstrapping' | 'syncing' | 'done' | 'error';

export default function SyncJoinScreen() {
  const router = useRouter();
  const { loadProjects } = useProjectStore();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [status, setStatus] = useState<SyncStatus>('scanning');
  const [error, setError] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string | null>(null);
  const [isNewProject, setIsNewProject] = useState(false);
  const [syncStats, setSyncStats] = useState<{ sent: number; received: number } | null>(null);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    setStatus('connecting');

    try {
      const payload: SyncQRPayload = JSON.parse(data);

      // Validate QR payload
      if (!payload.url || !payload.deviceId || !payload.token || !payload.project) {
        throw new Error('无效的同步二维码');
      }

      setProjectName(payload.project.name);

      const orchestrator = new SyncOrchestrator();
      const projectId = payload.project.id as UUID;

      // Check if we have this project locally
      const hasLocally = await orchestrator.hasProjectLocally(projectId);
      setIsNewProject(!hasLocally);

      // Step 1: Send handshake to host
      const handshake = await orchestrator.createHandshake(projectId);

      // TODO: Actually send HTTP request to payload.url
      // For now, simulate the flow:
      // const response = await fetch(`${payload.url}/handshake`, {
      //   method: 'POST',
      //   headers: { 'Authorization': `Bearer ${payload.token}` },
      //   body: JSON.stringify(handshake),
      // });
      // const handshakeAck = await response.json();

      // Step 2: If we don't have the project, bootstrap it
      if (!hasLocally) {
        setStatus('bootstrapping');
        // In real implementation:
        // if (handshakeAck.projectData && handshakeAck.categories) {
        //   await orchestrator.bootstrapProject(handshakeAck.projectData, handshakeAck.categories);
        // }
      }

      // Step 3: Negotiate + push/pull deltas
      setStatus('syncing');

      // In real implementation:
      // const { localVectors, deltasToSend } = await orchestrator.negotiate(projectId, payload.deviceId as UUID);
      // const pushResult = await fetch(`${payload.url}/push`, { body: deltasToSend });
      // const peerDeltas = await fetch(`${payload.url}/pull`, { body: localVectors });
      // const mergeResult = await orchestrator.applyPeerDeltas(peerDeltas);
      // await orchestrator.confirmSync(payload.deviceId as UUID, deltasToSend.length, peerDeltas.length);

      // Refresh project list
      await loadProjects();

      setSyncStats({ sent: 0, received: 0 });
      setStatus('done');
    } catch (e) {
      setError((e as Error).message);
      setStatus('error');
    }
  };

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.description}>需要相机权限来扫描二维码</Text>
        <Button title="授权相机" onPress={requestPermission} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {status === 'scanning' && (
        <View style={styles.cameraContainer}>
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={handleBarCodeScanned}
          />
          <View style={styles.overlay}>
            <View style={styles.scanFrame} />
            <Text style={styles.scanHint}>扫描对方分享的项目二维码</Text>
          </View>
        </View>
      )}

      {status === 'connecting' && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.statusText}>正在连接到「{projectName}」...</Text>
        </View>
      )}

      {status === 'bootstrapping' && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.statusText}>正在创建项目「{projectName}」...</Text>
          <Text style={styles.subText}>首次加入，正在同步项目结构</Text>
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
          <Text style={styles.title}>
            {isNewProject ? '项目加入成功' : '同步完成'}
          </Text>
          {projectName && (
            <Text style={styles.projectNameDone}>「{projectName}」</Text>
          )}
          {syncStats && (
            <View style={styles.statsBox}>
              <Text style={styles.statsText}>发送 {syncStats.sent} 条变更</Text>
              <Text style={styles.statsText}>接收 {syncStats.received} 条变更</Text>
            </View>
          )}
          <Button
            title="查看项目"
            onPress={() => router.dismissAll()}
            style={{ marginTop: spacing.xxl }}
          />
        </View>
      )}

      {status === 'error' && (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <Button
            title="重新扫描"
            onPress={() => { setScanned(false); setStatus('scanning'); setError(null); }}
            style={{ marginTop: spacing.lg }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, backgroundColor: colors.background },
  cameraContainer: { flex: 1, position: 'relative' },
  camera: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  scanFrame: { width: 240, height: 240, borderWidth: 2, borderColor: colors.white, borderRadius: borderRadius.lg },
  scanHint: { color: colors.white, fontSize: fontSize.md, marginTop: spacing.lg },
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
  projectNameDone: { fontSize: fontSize.lg, color: colors.primary, fontWeight: fontWeight.semibold, marginTop: spacing.sm },
  description: { fontSize: fontSize.md, color: colors.textSecondary, marginBottom: spacing.lg, textAlign: 'center' },
  statusText: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: spacing.lg },
  subText: { fontSize: fontSize.sm, color: colors.textTertiary, marginTop: spacing.xs },
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
