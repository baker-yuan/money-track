import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useProjectStore } from '@/stores';
import { Button, Input } from '@/components/ui';
import { CurrencyPicker, ColorPicker } from '@/components/forms';
import { colors, spacing } from '@/constants/theme';
import { PROJECT_COLORS, COMMON_CURRENCIES } from '@/constants';
import { fontSize, fontWeight } from '@/constants/theme';
import type { UUID, CurrencyCode } from '@/types';
import { toCurrencyCode } from '@/utils';

export default function ProjectSettingsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const projectId = id as UUID;
  const { currentProject, updateProject, deleteProject } = useProjectStore();

  const [name, setName] = useState(currentProject?.name ?? '');
  const [description, setDescription] = useState(currentProject?.description ?? '');
  const [currency, setCurrency] = useState<CurrencyCode>(currentProject?.base_currency ?? toCurrencyCode('CNY'));
  const [budget, setBudget] = useState(currentProject?.budget?.toString() ?? '');
  const [coverColor, setCoverColor] = useState(currentProject?.cover_color ?? PROJECT_COLORS[0]!);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('请输入项目名称');
      return;
    }
    setIsSaving(true);
    try {
      await updateProject(projectId, {
        name: name.trim(),
        description: description.trim(),
        base_currency: currency,
        budget: budget ? parseFloat(budget) : null,
        cover_color: coverColor,
      });
      Alert.alert('已保存');
    } catch (e) {
      Alert.alert('保存失败', (e as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      '确认删除',
      `确定要删除项目「${currentProject?.name}」吗？此操作不可撤销。`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            await deleteProject(projectId);
            router.dismissAll();
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Input label="项目名称" value={name} onChangeText={setName} />
      <Input label="描述" value={description} onChangeText={setDescription} multiline numberOfLines={3} />
      <CurrencyPicker label="基准货币" value={currency} onChange={setCurrency} />
      <Input
        label="预算"
        value={budget}
        onChangeText={setBudget}
        keyboardType="decimal-pad"
        prefix={COMMON_CURRENCIES.find(c => c.code === (currency as string))?.symbol}
      />
      <ColorPicker label="项目颜色" value={coverColor} onChange={setCoverColor} colors={[...PROJECT_COLORS]} />

      <View style={styles.actions}>
        <Button title="保存修改" onPress={handleSave} loading={isSaving} size="lg" />
      </View>

      <View style={styles.dangerZone}>
        <Text style={styles.dangerTitle}>危险操作</Text>
        <Button title="删除项目" onPress={handleDelete} variant="danger" size="lg" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl },
  actions: { marginTop: spacing.xl, gap: spacing.md },
  dangerZone: {
    marginTop: spacing.xxxl,
    paddingTop: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  dangerTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.error,
    marginBottom: spacing.md,
  },
});
