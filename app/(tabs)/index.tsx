import React, { useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import { useProjectStore } from '@/stores';
import { EmptyState, Button, useToast } from '@/components/ui';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';
import { formatCurrency, formatDate, toCurrencyCode } from '@/utils';
import { expenseRepository, categoryRepository } from '@/database/repositories';
import type { ProjectWithStats, UUID, CurrencyCode } from '@/types';

export default function ProjectListScreen() {
  const router = useRouter();
  const { projects, loadProjects, isLoading, createProject } = useProjectStore();
  const toast = useToast();

  useFocusEffect(
    useCallback(() => {
      loadProjects();
    }, [loadProjects])
  );

  const handleExport = async (item: ProjectWithStats) => {
    try {
      const expenses = await expenseRepository.findByProject(item.id);
      const csvLines = ['标题,金额(元),分类,日期,付款人,地点,备注'];
      for (const e of expenses) {
        const line = [
          e.title,
          e.base_amount.toFixed(2),
          e.category_name,
          e.date.split('T')[0],
          e.paid_by,
          e.location,
          e.notes,
        ].map(v => `"${(v ?? '').replace(/"/g, '""')}"`).join(',');
        csvLines.push(line);
      }
      const csv = csvLines.join('\n');
      const fileName = `记账本_${item.name}_${new Date().toISOString().split('T')[0]}.csv`;
      const filePath = `${FileSystem.cacheDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(filePath, csv, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(filePath, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text' });
    } catch (e) {
      toast.error('导出失败', (e as Error).message);
    }
  };

  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['text/csv', 'text/comma-separated-values'] });
      if (result.canceled) return;
      const file = result.assets[0];
      if (!file) return;

      // Only accept files with 记账本_ prefix
      const fileName = file.name ?? '';
      if (!fileName.startsWith('记账本_')) {
        toast.error('文件格式不对', '请选择"记账本_"开头的CSV文件');
        return;
      }

      // Extract project name from filename: 记账本_项目名_日期.csv
      const nameMatch = fileName.match(/^记账本_(.+)_\d{4}-\d{2}-\d{2}\.csv$/);
      const fileProjectName = nameMatch?.[1] ?? '';

      if (!fileProjectName) {
        toast.error('文件名格式不对', '无法识别项目名称');
        return;
      }

      // Check if a project with the same name already exists
      if (projects.some(p => p.name === fileProjectName)) {
        toast.error('项目已存在', `已有同名项目「${fileProjectName}」，请勿重复导入`);
        return;
      }

      await doImport(file.uri, fileProjectName);
    } catch (e) {
      toast.error('导入失败', (e as Error).message);
    }
  };

  const doImport = async (fileUri: string, projectName: string) => {
    try {
      const content = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.UTF8 });
      const lines = content.split('\n').filter(l => l.trim());
      if (lines.length <= 1) {
        toast.error('文件为空', '没有找到可导入的数据');
        return;
      }

      // Create a new project
      const newProject = await createProject({
        name: projectName,
        base_currency: toCurrencyCode('CNY'),
      });

      // Create default categories for the project
      await categoryRepository.createDefaultsForProject(newProject.id);
      const cats = await categoryRepository.findByProject(newProject.id);
      const defaultCatId = cats[0]?.id;
      if (!defaultCatId) return;

      let imported = 0;
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i]!);
        if (cols.length < 2) continue;
        const [title, amountStr, , dateStr, paidBy, location, notes] = cols;
        const amount = parseFloat(amountStr ?? '0');
        if (!title || amount <= 0) continue;

        await expenseRepository.create({
          project_id: newProject.id,
          category_id: defaultCatId,
          amount,
          currency: toCurrencyCode('CNY'),
          exchange_rate: 1,
          title: title.trim(),
          notes: (notes ?? '').trim(),
          date: (dateStr ?? new Date().toISOString().split('T')[0]!).trim(),
          paid_by: (paidBy ?? '').trim(),
          location: (location ?? '').trim(),
        });
        imported++;
      }
      toast.success('导入完成', `创建项目「${projectName}」，导入 ${imported} 条记录`);
      await loadProjects();
    } catch (e) {
      toast.error('导入失败', (e as Error).message);
    }
  };

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
          <View style={styles.projectActions}>
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation(); handleExport(item); }}
              hitSlop={8}
            >
              <Ionicons name="download-outline" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation(); router.push(`/sync/host?projectId=${item.id}`); }}
              hitSlop={8}
            >
              <Ionicons name="sync-outline" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation(); router.push(`/project/${item.id}/settings`); }}
              hitSlop={8}
            >
              <Ionicons name="settings-outline" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
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
        <View style={styles.emptyImport}>
          <TouchableOpacity style={styles.importBtn} onPress={handleImport} activeOpacity={0.7}>
            <Ionicons name="cloud-upload-outline" size={18} color={colors.primary} />
            <Text style={styles.importBtnText}>导入支出数据</Text>
          </TouchableOpacity>
        </View>
        <EmptyState
          title="还没有项目"
          message="创建第一个项目，开始记录你的开支"
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
        ListHeaderComponent={
          <TouchableOpacity style={styles.importBtn} onPress={handleImport} activeOpacity={0.7}>
            <Ionicons name="cloud-upload-outline" size={18} color={colors.primary} />
            <Text style={styles.importBtnText}>导入支出数据</Text>
          </TouchableOpacity>
        }
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
  emptyImport: {
    padding: spacing.lg,
    paddingBottom: 0,
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
  projectActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
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
  importBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  importBtnText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
});

/** Simple CSV line parser that handles quoted fields */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}
