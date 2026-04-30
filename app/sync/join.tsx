import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Button } from '@/components/ui';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

export default function SyncJoinScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [status, setStatus] = useState<'scanning' | 'connecting' | 'syncing' | 'done' | 'error'>('scanning');
  const [error, setError] = useState<string | null>(null);

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    setStatus('connecting');

    try {
      const syncData = JSON.parse(data);
      if (!syncData.url || !syncData.deviceId || !syncData.token) {
        throw new Error('无效的同步二维码');
      }

      // TODO: Connect to host and start sync (Phase 5)
      setStatus('syncing');
      setTimeout(() => {
        setStatus('done');
      }, 2000);
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
            <Text style={styles.scanHint}>将二维码对准框内</Text>
          </View>
        </View>
      )}

      {status === 'connecting' && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.statusText}>正在连接...</Text>
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
  description: { fontSize: fontSize.md, color: colors.textSecondary, marginBottom: spacing.lg, textAlign: 'center' },
  statusText: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: spacing.lg },
  doneIcon: { fontSize: 64, color: colors.success },
  errorText: { fontSize: fontSize.md, color: colors.error, textAlign: 'center' },
});
