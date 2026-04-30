import React, { useCallback, useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useProjectStore } from '@/stores';
import { expenseRepository } from '@/database/repositories';
import { Card, CardHeader } from '@/components/ui';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import { formatCurrency } from '@/utils';
import type { UUID, CurrencyCode } from '@/types';

interface CategoryBreakdown {
  category_id: UUID;
  category_name: string;
  category_color: string;
  total: number;
  count: number;
}

interface DailyTotal {
  date: string;
  total: number;
}

export default function ReportsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const projectId = id as UUID;
  const { currentProject } = useProjectStore();
  const [categories, setCategories] = useState<CategoryBreakdown[]>([]);
  const [dailyTotals, setDailyTotals] = useState<DailyTotal[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      loadReportData();
    }, [projectId])
  );

  async function loadReportData() {
    if (!projectId) return;
    const [cats, daily, total] = await Promise.all([
      expenseRepository.getCategoryBreakdown(projectId),
      expenseRepository.getDailyTotals(projectId),
      expenseRepository.getProjectTotal(projectId),
    ]);
    setCategories(cats as CategoryBreakdown[]);
    setDailyTotals(daily);
    setTotalAmount(total);
  }

  const baseCurrency = currentProject?.base_currency ?? ('CNY' as CurrencyCode);
  const maxDaily = Math.max(...dailyTotals.map(d => d.total), 1);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Summary Stats */}
      <Card style={styles.card}>
        <CardHeader title="概览" />
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatCurrency(totalAmount, baseCurrency)}</Text>
            <Text style={styles.statLabel}>总支出</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {dailyTotals.length > 0
                ? formatCurrency(totalAmount / dailyTotals.length, baseCurrency)
                : formatCurrency(0, baseCurrency)}
            </Text>
            <Text style={styles.statLabel}>日均</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{categories.length}</Text>
            <Text style={styles.statLabel}>分类数</Text>
          </View>
        </View>
        {currentProject?.budget && currentProject.budget > 0 && (
          <View style={styles.budgetSection}>
            <View style={styles.budgetHeader}>
              <Text style={styles.budgetLabel}>预算使用</Text>
              <Text style={styles.budgetValue}>
                {Math.round((totalAmount / currentProject.budget) * 100)}%
              </Text>
            </View>
            <View style={styles.budgetBar}>
              <View
                style={[
                  styles.budgetFill,
                  {
                    width: `${Math.min((totalAmount / currentProject.budget) * 100, 100)}%`,
                    backgroundColor: totalAmount > currentProject.budget ? colors.error : colors.primary,
                  },
                ]}
              />
            </View>
            <Text style={styles.budgetRemaining}>
              剩余 {formatCurrency(Math.max(currentProject.budget - totalAmount, 0), baseCurrency)}
            </Text>
          </View>
        )}
      </Card>

      {/* Category Breakdown */}
      <Card style={styles.card}>
        <CardHeader title="分类统计" />
        {categories.length === 0 ? (
          <Text style={styles.emptyText}>暂无数据</Text>
        ) : (
          categories.map((cat) => {
            const percentage = totalAmount > 0 ? (cat.total / totalAmount) * 100 : 0;
            return (
              <View key={cat.category_id} style={styles.categoryRow}>
                <View style={[styles.categoryDot, { backgroundColor: cat.category_color }]} />
                <Text style={styles.categoryName}>{cat.category_name}</Text>
                <Text style={styles.categoryCount}>{cat.count}笔</Text>
                <View style={styles.categoryBarContainer}>
                  <View
                    style={[
                      styles.categoryBar,
                      { width: `${percentage}%`, backgroundColor: cat.category_color },
                    ]}
                  />
                </View>
                <Text style={styles.categoryAmount}>{formatCurrency(cat.total, baseCurrency)}</Text>
              </View>
            );
          })
        )}
      </Card>

      {/* Daily Chart (Simple bar chart) */}
      <Card style={styles.card}>
        <CardHeader title="每日支出" />
        {dailyTotals.length === 0 ? (
          <Text style={styles.emptyText}>暂无数据</Text>
        ) : (
          <View style={styles.chartContainer}>
            {dailyTotals.slice(-14).map((day) => (
              <View key={day.date} style={styles.barColumn}>
                <View style={styles.barWrapper}>
                  <View
                    style={[
                      styles.bar,
                      { height: `${(day.total / maxDaily) * 100}%` },
                    ]}
                  />
                </View>
                <Text style={styles.barLabel}>
                  {new Date(day.date).getDate()}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  card: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  budgetSection: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  budgetLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  budgetValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  budgetBar: {
    height: 8,
    backgroundColor: colors.borderLight,
    borderRadius: 4,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  budgetFill: {
    height: '100%',
    borderRadius: 4,
  },
  budgetRemaining: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  categoryName: {
    fontSize: fontSize.sm,
    color: colors.text,
    width: 48,
  },
  categoryCount: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    width: 30,
  },
  categoryBarContainer: {
    flex: 1,
    height: 6,
    backgroundColor: colors.borderLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  categoryBar: {
    height: '100%',
    borderRadius: 3,
  },
  categoryAmount: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    width: 80,
    textAlign: 'right',
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 120,
    gap: 2,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
  },
  barWrapper: {
    flex: 1,
    width: '80%',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
    minHeight: 2,
  },
  barLabel: {
    fontSize: 9,
    color: colors.textTertiary,
    marginTop: 2,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textTertiary,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
});
