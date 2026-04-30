import React, { useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useProjectStore } from '@/stores';
import { EmptyState, Button } from '@/components/ui';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';
import { formatCurrency, formatDate } from '@/utils';
import type { ProjectWithStats } from '@/types';

export default function ProjectListScreen() {
  const router = useRouter();
  const { projects, loadProjects, isLoading } = useProjectStore();

  useFocusEffect(
    useCallback(() => {
      loadProjects();
    }, [loadProjects])
  );

  const renderProject = ({ item }: { item: ProjectWithStats }) => (
    <TouchableOpacity
      style={styles.projectCard}
      onPress={() => router.push(`/project/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={[styles.colorStrip, { backgroundColor: item.cover_color }]} />
      <View style={styles.projectContent}>
        <View style={styles.projectHeader}>
          <Text style={styles.projectName} numberOfLines={1}>{item.name}</Text>
          {item.budget && (
            <Text style={styles.budgetText}>
              {formatCurrency(item.total_expenses, item.base_currency)} / {formatCurrency(item.budget, item.base_currency)}
            </Text>
          )}
        </View>

        {item.description ? (
          <Text style={styles.description} numberOfLines={1}>{item.description}</Text>
        ) : null}

        <View style={styles.projectFooter}>
          <View style={styles.stat}>
            <Ionicons name="receipt-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.statText}>{item.expense_count} 笔</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="wallet-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.statText}>{formatCurrency(item.total_expenses, item.base_currency)}</Text>
          </View>
          {item.last_expense_date && (
            <Text style={styles.dateText}>{formatDate(item.last_expense_date)}</Text>
          )}
        </View>

        {item.budget && item.budget > 0 && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min((item.total_expenses / item.budget) * 100, 100)}%`,
                    backgroundColor: item.total_expenses > item.budget ? colors.error : colors.primary,
                  },
                ]}
              />
            </View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (projects.length === 0 && !isLoading) {
    return (
      <View style={styles.container}>
        <EmptyState
          title="还没有旅行项目"
          message="创建第一个旅行项目，开始记录你的旅途开支"
          action={
            <Button
              title="创建项目"
              onPress={() => router.push('/project/create')}
              icon={<Ionicons name="add" size={18} color={colors.white} />}
            />
          }
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={projects}
        keyExtractor={(item) => item.id}
        renderItem={renderProject}
        contentContainerStyle={styles.list}
        refreshing={isLoading}
        onRefresh={loadProjects}
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/project/create')}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color={colors.white} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  projectCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    flexDirection: 'row',
    ...shadows.sm,
  },
  colorStrip: {
    width: 4,
  },
  projectContent: {
    flex: 1,
    padding: spacing.lg,
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  projectName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    flex: 1,
  },
  budgetText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  projectFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.lg,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  dateText: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    marginLeft: 'auto',
  },
  progressContainer: {
    marginTop: spacing.md,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.borderLight,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
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
