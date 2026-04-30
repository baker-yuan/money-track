import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAppInit } from '@/hooks/useAppInit';
import { LoadingScreen } from '@/components/ui';
import { colors } from '@/constants/theme';

export default function RootLayout() {
  const { isReady } = useAppInit();

  if (!isReady) {
    return <LoadingScreen />;
  }

  return (
    <>
      <StatusBar style="dark" />
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
          options={{ title: '我的旅行', headerLargeTitle: true }}
        />
        <Stack.Screen
          name="project/[id]"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="expense/create"
          options={{ title: '新增支出', presentation: 'modal' }}
        />
        <Stack.Screen
          name="expense/[id]"
          options={{ title: '支出详情' }}
        />
        <Stack.Screen
          name="project/create"
          options={{ title: '新建项目', presentation: 'modal' }}
        />
        <Stack.Screen
          name="sync/host"
          options={{ title: '发起同步', presentation: 'modal' }}
        />
        <Stack.Screen
          name="sync/join"
          options={{ title: '加入同步', presentation: 'modal' }}
        />
      </Stack>
    </>
  );
}
