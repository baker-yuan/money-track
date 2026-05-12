import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useExpenseStore, useCategoryStore, useProjectStore, useSettingsStore } from '@/stores';
import { Button, Input, useToast } from '@/components/ui';
import { CategoryPicker, LocationInput } from '@/components/forms';
import { colors, spacing } from '@/constants/theme';
import { toCurrencyCode } from '@/utils';
import type { UUID, CurrencyCode } from '@/types';

export default function CreateExpenseScreen() {
  const router = useRouter();
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const { createExpense } = useExpenseStore();
  const { categories, loadCategories } = useCategoryStore();
  const { currentProject } = useProjectStore();
  const { settings } = useSettingsStore();

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<UUID | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]!);
  const [notes, setNotes] = useState('');
  const [paidBy, setPaidBy] = useState(settings.defaultPaidBy);
  const [location, setLocation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  const currency: CurrencyCode = currentProject?.base_currency ?? toCurrencyCode('CNY');

  useEffect(() => {
    if (projectId) {
      loadCategories(projectId as UUID);
    }
  }, [projectId, loadCategories]);

  const handleCreate = async () => {
    if (!projectId) {
      toast.error('缺少项目ID');
      return;
    }
    if (!title.trim()) {
      toast.error('请输入标题');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('请输入有效金额');
      return;
    }
    if (!categoryId) {
      toast.error('请选择分类');
      return;
    }

    setIsSubmitting(true);
    try {
      await createExpense({
        project_id: projectId as UUID,
        category_id: categoryId,
        amount: parseFloat(amount),
        currency,
        exchange_rate: 1,
        title: title.trim(),
        notes: notes.trim(),
        date,
        paid_by: paidBy.trim(),
        location: location.trim(),
      });
      router.back();
    } catch (e) {
      toast.error('创建失败', (e as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Input
        label="标题"
        placeholder="例如：机场大巴"
        value={title}
        onChangeText={setTitle}
      />

      <Input
        label="金额"
        placeholder="0.00"
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        prefix="¥"
        suffix="元"
      />

      <Input
        label="日期"
        placeholder="YYYY-MM-DD"
        value={date}
        onChangeText={setDate}
      />

      <Input
        label="付款人"
        placeholder="谁付的钱"
        value={paidBy}
        onChangeText={setPaidBy}
      />

      <LocationInput
        label="地点（可选）"
        placeholder="在哪消费"
        value={location}
        onChangeText={setLocation}
      />

      <Input
        label="备注（可选）"
        placeholder="补充说明"
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={3}
      />

      <CategoryPicker
        label="分类"
        categories={categories}
        value={categoryId}
        onChange={setCategoryId}
      />

      <View style={styles.actions}>
        <Button title="保存" onPress={handleCreate} loading={isSubmitting} size="lg" />
        <Button title="取消" onPress={() => router.back()} variant="ghost" size="lg" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl },
  actions: { marginTop: spacing.xl, gap: spacing.md },
});
