import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useExpenseStore, useCategoryStore, useProjectStore } from '@/stores';
import { Button, Input } from '@/components/ui';
import { CurrencyPicker, CategoryPicker } from '@/components/forms';
import { colors, spacing } from '@/constants/theme';
import { toCurrencyCode, nowISO } from '@/utils';
import type { UUID, CurrencyCode } from '@/types';

export default function CreateExpenseScreen() {
  const router = useRouter();
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const { createExpense } = useExpenseStore();
  const { categories, loadCategories } = useCategoryStore();
  const { currentProject } = useProjectStore();

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>(
    currentProject?.base_currency ?? toCurrencyCode('CNY')
  );
  const [exchangeRate, setExchangeRate] = useState('1');
  const [categoryId, setCategoryId] = useState<UUID | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]!);
  const [notes, setNotes] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [location, setLocation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (projectId) {
      loadCategories(projectId as UUID);
    }
  }, [projectId, loadCategories]);

  const isDifferentCurrency = currency !== currentProject?.base_currency;

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert('请输入标题');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('请输入有效金额');
      return;
    }
    if (!categoryId) {
      Alert.alert('请选择分类');
      return;
    }

    setIsSubmitting(true);
    try {
      await createExpense({
        project_id: projectId as UUID,
        category_id: categoryId,
        amount: parseFloat(amount),
        currency,
        exchange_rate: isDifferentCurrency ? parseFloat(exchangeRate) || 1 : 1,
        title: title.trim(),
        notes: notes.trim(),
        date,
        paid_by: paidBy.trim(),
        location: location.trim(),
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
      />

      <CurrencyPicker
        label="货币"
        value={currency}
        onChange={setCurrency}
      />

      {isDifferentCurrency && (
        <Input
          label={`汇率（1 ${currency} = ? ${currentProject?.base_currency}）`}
          placeholder="1.0"
          value={exchangeRate}
          onChangeText={setExchangeRate}
          keyboardType="decimal-pad"
        />
      )}

      <CategoryPicker
        label="分类"
        categories={categories}
        value={categoryId}
        onChange={setCategoryId}
      />

      <Input
        label="日期"
        placeholder="YYYY-MM-DD"
        value={date}
        onChangeText={setDate}
      />

      <Input
        label="付款人（可选）"
        placeholder="谁付的钱"
        value={paidBy}
        onChangeText={setPaidBy}
      />

      <Input
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
