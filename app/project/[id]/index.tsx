import React, { useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useExpenseStore, useProjectStore } from '@/stores';
import { EmptyState, Button } from '@/components/ui';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';
import { formatCurrency, formatDateShort } from '@/utils';
import type { UUID, ExpenseWithCategory } from '@/types';

export default function ProjectIndexScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const projectId = id as UUID;
  const { expenses, loadExpenses, isLoading } = useExpenseStore();
  const { currentProject } = useProjectStore();

  useFocusEffect(
    useCallback(() => {
      if (projectId) loadExpenses(projectId);
    }, [projectId, loadExpenses])
  );

  const renderExpense = ({ item }: { item: ExpenseWithCategory }) => (
    <TouchableOpacity
      style={styles.expenseCard}
      onPress={() => router.push(`/expense/${item.id}?projectId=${projectId}`)}
      activeOpacity={0.7}
    >
      <View style={[styles.categoryDot, { backgroundColor: item.category_color }]} />
      <View style={styles.expenseContent}>
        <View style={styles.expenseHeader}>
          <Text style={styles.expenseTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.expenseAmount}>
            ¥{item.base_amount.toFixed(2)} 元
          </Text>
        </View>
        <View style={styles.expenseFooter}>
          <Text style={styles.categoryText}>{item.category_name}</Text>
          {!item.is_local && (
            <View style={styles.syncBadge}>
              <Ionicons name="sync" size={10} color={colors.primary} />
              <Text style={styles.syncText}>
                {item.author_name || '同步'}
              </Text>
            </View>
          )}
          <Text style={styles.dateText}>{formatDateShort(item.date)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const totalAmount = expenses.reduce((sum, e) => sum + e.base_amount, 0);

  return (
    <View style={styles.container}>
      {expenses.length > 0 && (
        <View style={styles.summaryBar}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>总支出</Text>
            <Text style={styles.summaryAmount}>¥{totalAmount.toFixed(2)} 元</Text>
          </View>
          {currentProject?.budget && currentProject.budget > 0 && (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>剩余预算</Text>
              <Text style={[
                styles.summaryAmount,
                { color: currentProject.budget - totalAmount < 0 ? colors.error : colors.success }
              ]}>
                ¥{(currentProject.budget - totalAmount).toFixed(2)} 元
              </Text>
            </View>
          )}
        </View>
      )}

      {expenses.length === 0 && !isLoading ? (
        <EmptyState
          title="暂无支出记录"
          message="记录你的第一笔开支"
          action={
            <Button
              title="新增支出"
              onPress={() => router.push(`/expense/create?projectId=${projectId}`)}
              icon={<Ionicons name="add" size={18} color={colors.white} />}
            />
          }
        />
      ) : (
        <FlatList
          data={expenses}
          keyExtractor={(item) => item.id}
          renderItem={renderExpense}
          contentContainerStyle={styles.list}
          refreshing={isLoading}
          onRefresh={() => loadExpenses(projectId)}
        />
      )}

      {expenses.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push(`/expense/create?projectId=${projectId}`)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color={colors.white} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  summaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  summaryAmount: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: 2,
  },
  list: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  expenseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.md,
  },
  expenseContent: {
    flex: 1,
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expenseTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  expenseAmount: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  expenseFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  categoryText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    borderRadius: 4,
  },
  syncText: {
    fontSize: fontSize.xs,
    color: colors.primary,
  },
  dateText: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    marginLeft: 'auto',
  },
  fab: {
    position: 'absolute',
    bottom: spacing.xxl,
    right: spacing.xxl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
});
