import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, TouchableOpacity, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useProjectStore, useCategoryStore } from '@/stores';
import { Button, Input, useToast } from '@/components/ui';
import { ColorPicker } from '@/components/forms';
import { colors, spacing, PROJECT_COLORS } from '@/constants';
import { fontSize, fontWeight, borderRadius } from '@/constants/theme';
import type { UUID, Category } from '@/types';

export default function ProjectSettingsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const projectId = id as UUID;
  const { currentProject, updateProject, deleteProject } = useProjectStore();
  const { categories, loadCategories, createCategory, updateCategory, deleteCategory } = useCategoryStore();

  const [name, setName] = useState(currentProject?.name ?? '');
  const [description, setDescription] = useState(currentProject?.description ?? '');
  const [budget, setBudget] = useState(currentProject?.budget?.toString() ?? '');
  const [coverColor, setCoverColor] = useState(currentProject?.cover_color ?? PROJECT_COLORS[0]!);
  const [isSaving, setIsSaving] = useState(false);

  const toast = useToast();

  // Category editing
  const [editingCategoryId, setEditingCategoryId] = useState<UUID | null>(null);
  const [editingName, setEditingName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoriesExpanded, setCategoriesExpanded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadCategories(projectId);
    }, [projectId, loadCategories])
  );

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('请输入项目名称');
      return;
    }
    setIsSaving(true);
    try {
      await updateProject(projectId, {
        name: name.trim(),
        description: description.trim(),
        budget: budget ? parseFloat(budget) : null,
        cover_color: coverColor,
      });
      toast.success('已保存');
    } catch (e) {
      toast.error('保存失败', (e as Error).message);
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
            router.replace('/');
          },
        },
      ]
    );
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      await createCategory({
        project_id: projectId,
        name: newCategoryName.trim(),
        icon: 'pricetag',
        color: '#6B7280',
        sort_order: categories.length,
      });
      setNewCategoryName('');
    } catch (e) {
      toast.error('添加失败', (e as Error).message);
    }
  };

  const handleSaveCategory = async (cat: Category) => {
    if (!editingName.trim()) return;
    try {
      await updateCategory(cat.id, { name: editingName.trim() }, projectId);
      setEditingCategoryId(null);
    } catch (e) {
      toast.error('保存失败', (e as Error).message);
    }
  };

  const handleDeleteCategory = (cat: Category) => {
    Alert.alert('删除分类', `确定删除「${cat.name}」？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => deleteCategory(cat.id, projectId),
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Input label="项目名称" value={name} onChangeText={setName} />
      <Input label="描述" value={description} onChangeText={setDescription} multiline numberOfLines={3} />
      <Input
        label="预算"
        value={budget}
        onChangeText={setBudget}
        keyboardType="decimal-pad"
        prefix="¥"
        suffix="元"
      />
      <ColorPicker label="项目颜色" value={coverColor} onChange={setCoverColor} colors={[...PROJECT_COLORS]} />

      {/* Category Management */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => setCategoriesExpanded(!categoriesExpanded)}
          activeOpacity={0.7}
        >
          <View style={styles.sectionHeaderLeft}>
            <Text style={styles.sectionTitle}>分类管理</Text>
            <Text style={styles.categoryCount}>{categories.length} 项</Text>
          </View>
          <Ionicons
            name={categoriesExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={colors.textSecondary}
          />
        </TouchableOpacity>

        {categoriesExpanded && (
          <>
            {categories.map((cat) => (
              <View key={cat.id} style={styles.categoryRow}>
                {editingCategoryId === cat.id ? (
                  <View style={styles.categoryEditRow}>
                    <TextInput
                      style={styles.categoryInput}
                      value={editingName}
                      onChangeText={setEditingName}
                      autoFocus
                    />
                    <TouchableOpacity onPress={() => handleSaveCategory(cat)} style={styles.iconBtn}>
                      <Ionicons name="checkmark" size={20} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setEditingCategoryId(null)} style={styles.iconBtn}>
                      <Ionicons name="close" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.categoryDisplayRow}>
                    <View style={[styles.categoryDot, { backgroundColor: cat.color }]} />
                    <Text style={styles.categoryName}>{cat.name}</Text>
                    <TouchableOpacity
                      onPress={() => { setEditingCategoryId(cat.id); setEditingName(cat.name); }}
                      style={styles.iconBtn}
                    >
                      <Ionicons name="pencil" size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteCategory(cat)} style={styles.iconBtn}>
                      <Ionicons name="trash-outline" size={16} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}

            <View style={styles.addCategoryRow}>
              <TextInput
                style={styles.categoryInput}
                value={newCategoryName}
                onChangeText={setNewCategoryName}
                placeholder="新增分类..."
                placeholderTextColor={colors.textTertiary}
              />
              <TouchableOpacity onPress={handleAddCategory} style={styles.iconBtn}>
                <Ionicons name="add-circle" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

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
  section: {
    marginTop: spacing.xxxl,
    paddingTop: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  categoryCount: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
  categoryRow: {
    marginBottom: spacing.sm,
  },
  categoryDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
  },
  categoryEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.md,
  },
  categoryName: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  categoryInput: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
    paddingVertical: spacing.sm,
  },
  iconBtn: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
  addCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
  },
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
