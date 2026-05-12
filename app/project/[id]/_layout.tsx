import React, { useCallback } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Stack, useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useProjectStore } from '@/stores';
import { colors, spacing } from '@/constants/theme';
import type { UUID } from '@/types';

export default function ProjectLayout() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { currentProject, loadProject } = useProjectStore();

  useFocusEffect(
    useCallback(() => {
      if (id) loadProject(id as UUID);
    }, [id, loadProject])
  );

  const projectName = currentProject?.name ?? '项目';

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: projectName,
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push(`/project/${id}/reports`)}
              style={styles.headerBtn}
            >
              <Ionicons name="pie-chart-outline" size={22} color={colors.text} />
            </TouchableOpacity>
          ),
        }}
      />
      <Stack.Screen
        name="settings"
        options={{ title: '项目设置' }}
      />
      <Stack.Screen
        name="reports"
        options={{ title: '统计报表' }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  headerBtn: {
    padding: spacing.xs,
  },
});
