import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useProjectStore } from '@/stores';
import { Button, Input } from '@/components/ui';
import { colors, spacing, PROJECT_COLORS } from '@/constants';
import { toCurrencyCode } from '@/utils';
import { ColorPicker } from '@/components/forms/ColorPicker';

export default function CreateProjectScreen() {
  const router = useRouter();
  const { createProject } = useProjectStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [coverColor, setCoverColor] = useState<string>(PROJECT_COLORS[0]!);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('请输入项目名称');
      return;
    }

    setIsSubmitting(true);
    try {
      await createProject({
        name: name.trim(),
        description: description.trim(),
        base_currency: toCurrencyCode('CNY'),
        budget: budget ? parseFloat(budget) : null,
        cover_color: coverColor,
      });
      router.back();
    } catch (e) {
      Alert.alert('创建失败', (e as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Input
        label="项目名称"
        placeholder="例如：家庭开支、旅行记账"
        value={name}
        onChangeText={setName}
      />

      <Input
        label="描述（可选）"
        placeholder="简短描述这个项目"
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={3}
      />

      <Input
        label="预算（可选）"
        placeholder="0.00"
        value={budget}
        onChangeText={setBudget}
        keyboardType="decimal-pad"
        prefix="¥"
      />

      <ColorPicker
        label="项目颜色"
        value={coverColor}
        onChange={setCoverColor}
        colors={[...PROJECT_COLORS]}
      />

      <View style={styles.actions}>
        <Button
          title="创建项目"
          onPress={handleCreate}
          loading={isSubmitting}
          size="lg"
        />
        <Button
          title="取消"
          onPress={() => router.back()}
          variant="ghost"
          size="lg"
        />
      </View>
    </ScrollView>
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
  actions: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
});
