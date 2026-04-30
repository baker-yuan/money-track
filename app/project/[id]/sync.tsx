import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';
import type { UUID } from '@/types';

export default function SyncScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const projectId = id as UUID;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>局域网同步</Text>
        <Text style={styles.description}>
          与同一 WiFi 下的设备同步数据。一台设备作为主机生成二维码，另一台扫码连接。
        </Text>

        <View style={styles.options}>
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => router.push(`/sync/host?projectId=${projectId}`)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons name="qr-code-outline" size={32} color={colors.primary} />
            </View>
            <Text style={styles.optionTitle}>发起同步</Text>
            <Text style={styles.optionDesc}>生成二维码供对方扫描</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => router.push(`/sync/join?projectId=${projectId}`)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="scan-outline" size={32} color={colors.success} />
            </View>
            <Text style={styles.optionTitle}>加入同步</Text>
            <Text style={styles.optionDesc}>扫描对方的二维码连接</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.xxl,
  },
  options: {
    gap: spacing.lg,
  },
  optionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.sm,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  optionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  optionDesc: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
