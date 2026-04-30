import React, { useCallback } from 'react';
import { Tabs, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useProjectStore } from '@/stores';
import { colors } from '@/constants/theme';
import type { UUID } from '@/types';

export default function ProjectLayout() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentProject, loadProject } = useProjectStore();

  useFocusEffect(
    useCallback(() => {
      if (id) loadProject(id as UUID);
    }, [id, loadProject])
  );

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.borderLight },
      }}
    >
      <Tabs.Screen
        name="expenses"
        options={{
          title: currentProject?.name ?? '支出',
          tabBarLabel: '支出',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="receipt-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: '报表',
          tabBarLabel: '报表',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="pie-chart-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="sync"
        options={{
          title: '同步',
          tabBarLabel: '同步',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="sync-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '设置',
          tabBarLabel: '设置',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
