import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useExpenseStore, useCategoryStore, useProjectStore } from '@/stores';
import { Button, Input, Card, useToast } from '@/components/ui';
import { CategoryPicker, LocationInput } from '@/components/forms';
import { colors, spacing, fontSize, fontWeight } from '@/constants/theme';
import { formatDate } from '@/utils';
import type { UUID } from '@/types';

export default function ExpenseDetailScreen() {
  const router = useRouter();
  const { id, projectId } = useLocalSearchParams<{ id: string; projectId: string }>();
  const { currentExpense, loadExpense, updateExpense, deleteExpense } = useExpenseStore();
  const { categories, loadCategories } = useCategoryStore();
  const { currentProject } = useProjectStore();

  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<UUID | null>(null);
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [location, setLocation] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (id) loadExpense(id as UUID);
    if (projectId) loadCategories(projectId as UUID);
  }, [id, projectId]);

  useEffect(() => {
    if (currentExpense) {
      setTitle(currentExpense.title);
      setAmount(currentExpense.amount.toString());
      setCategoryId(currentExpense.category_id);
      setDate(currentExpense.date.split('T')[0] ?? '');
      setNotes(currentExpense.notes);
      setPaidBy(currentExpense.paid_by);
      setLocation(currentExpense.location);
    }
  }, [currentExpense]);

  const handleSave = async () => {
    if (!title.trim() || !amount || !categoryId) {
      toast.error('请填写必要字段');
      return;
    }
    setIsSaving(true);
    try {
      await updateExpense(id as UUID, {
        title: title.trim(),
        amount: parseFloat(amount),
        exchange_rate: 1,
        category_id: categoryId,
        date,
        notes: notes.trim(),
        paid_by: paidBy.trim(),
        location: location.trim(),
      });
      setIsEditing(false);
      toast.success('已保存');
    } catch (e) {
      toast.error('保存失败', (e as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('确认删除', '确定要删除这笔支出吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          await deleteExpense(id as UUID, projectId as UUID);
          router.back();
        },
      },
    ]);
  };

  if (!currentExpense) return null;

  if (isEditing) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Input label="标题" value={title} onChangeText={setTitle} />
        <Input label="金额" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" prefix="¥" suffix="元" />
        <CategoryPicker label="分类" categories={categories} value={categoryId} onChange={setCategoryId} />
        <Input label="日期" value={date} onChangeText={setDate} />
        <Input label="付款人" value={paidBy} onChangeText={setPaidBy} />
        <LocationInput label="地点" value={location} onChangeText={setLocation} />
        <Input label="备注" value={notes} onChangeText={setNotes} multiline numberOfLines={3} />
        <View style={styles.actions}>
          <Button title="保存" onPress={handleSave} loading={isSaving} size="lg" />
          <Button title="取消" onPress={() => setIsEditing(false)} variant="ghost" size="lg" />
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        <Text style={styles.expenseTitle}>{currentExpense.title}</Text>
        <Text style={styles.expenseAmount}>
          ¥{currentExpense.base_amount.toFixed(2)} 元
        </Text>
      </Card>

      <Card style={styles.card}>
        <DetailRow icon="calendar-outline" label="日期" value={formatDate(currentExpense.date)} />
        <DetailRow icon="pricetag-outline" label="分类" value={categories.find(c => c.id === currentExpense.category_id)?.name ?? '-'} />
        {currentExpense.paid_by && <DetailRow icon="person-outline" label="付款人" value={currentExpense.paid_by} />}
        {currentExpense.location && <DetailRow icon="location-outline" label="地点" value={currentExpense.location} />}
        {currentExpense.notes && <DetailRow icon="document-text-outline" label="备注" value={currentExpense.notes} />}
      </Card>

      <View style={styles.actions}>
        <Button title="编辑" onPress={() => setIsEditing(true)} variant="outline" size="lg" />
        <Button title="删除" onPress={handleDelete} variant="danger" size="lg" />
      </View>
    </ScrollView>
  );
}

function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon as any} size={18} color={colors.textSecondary} />
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl },
  card: { padding: spacing.lg, marginBottom: spacing.lg },
  expenseTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
  expenseAmount: { fontSize: fontSize.xxxl, fontWeight: fontWeight.bold, color: colors.primary, marginTop: spacing.sm },
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, gap: spacing.md },
  detailLabel: { fontSize: fontSize.sm, color: colors.textSecondary, width: 50 },
  detailValue: { fontSize: fontSize.md, color: colors.text, flex: 1 },
  actions: { marginTop: spacing.xl, gap: spacing.md },
});
