import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, TouchableOpacity, TextInput } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '@/stores';
import { Button, Input, useToast } from '@/components/ui';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import { DEFAULT_CATEGORIES } from '@/constants';
import { categoryRepository } from '@/database/repositories';
import { getDatabase } from '@/database';
import type { UUID } from '@/types';

interface GlobalCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  sort_order: number;
}

export default function ProfileScreen() {
  const { settings, updateSettings } = useSettingsStore();

  const toast = useToast();
  const [userName, setUserName] = useState(settings.userName);
  const [defaultPaidBy, setDefaultPaidBy] = useState(settings.defaultPaidBy);
  const [isSaving, setIsSaving] = useState(false);

  // Global default categories
  const [globalCategories, setGlobalCategories] = useState<GlobalCategory[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoriesExpanded, setCategoriesExpanded] = useState(false);

  useEffect(() => {
    setUserName(settings.userName);
    setDefaultPaidBy(settings.defaultPaidBy);
  }, [settings]);

  useFocusEffect(
    useCallback(() => {
      loadGlobalCategories();
    }, [])
  );

  const loadGlobalCategories = async () => {
    const db = await getDatabase();
    // Ensure table exists
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS global_default_categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        icon TEXT NOT NULL,
        color TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0
      );
    `);
    const rows = await db.getAllAsync<GlobalCategory>(
      'SELECT * FROM global_default_categories ORDER BY sort_order'
    );
    if (rows.length === 0) {
      // Initialize from DEFAULT_CATEGORIES
      await resetGlobalCategories();
    } else {
      setGlobalCategories(rows);
    }
  };

  const resetGlobalCategories = async () => {
    const db = await getDatabase();
    await db.execAsync('DELETE FROM global_default_categories');
    for (let i = 0; i < DEFAULT_CATEGORIES.length; i++) {
      const def = DEFAULT_CATEGORIES[i]!;
      const id = `global_${i}_${Date.now()}`;
      await db.runAsync(
        'INSERT INTO global_default_categories (id, name, icon, color, sort_order) VALUES (?, ?, ?, ?, ?)',
        id, def.name, def.icon, def.color, i
      );
    }
    const rows = await db.getAllAsync<GlobalCategory>(
      'SELECT * FROM global_default_categories ORDER BY sort_order'
    );
    setGlobalCategories(rows);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings({
        userName: userName.trim(),
        defaultPaidBy: defaultPaidBy.trim(),
      });
      toast.success('已保存');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    Alert.alert('重置默认分类', '将恢复为系统预设分类，确定吗？', [
      { text: '取消', style: 'cancel' },
      { text: '重置', onPress: resetGlobalCategories },
    ]);
  };

  const handleAddGlobalCategory = async () => {
    if (!newCategoryName.trim()) return;
    const db = await getDatabase();
    const id = `global_${Date.now()}`;
    await db.runAsync(
      'INSERT INTO global_default_categories (id, name, icon, color, sort_order) VALUES (?, ?, ?, ?, ?)',
      id, newCategoryName.trim(), 'pricetag', '#6B7280', globalCategories.length
    );
    setNewCategoryName('');
    await loadGlobalCategories();
  };

  const handleSaveGlobalCategory = async (cat: GlobalCategory) => {
    if (!editingName.trim()) return;
    const db = await getDatabase();
    await db.runAsync(
      'UPDATE global_default_categories SET name = ? WHERE id = ?',
      editingName.trim(), cat.id
    );
    setEditingId(null);
    await loadGlobalCategories();
  };

  const handleDeleteGlobalCategory = (cat: GlobalCategory) => {
    Alert.alert('删除分类', `确定删除「${cat.name}」？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          const db = await getDatabase();
          await db.runAsync('DELETE FROM global_default_categories WHERE id = ?', cat.id);
          await loadGlobalCategories();
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>个人信息</Text>
        <Input
          label="昵称"
          placeholder="你的名字"
          value={userName}
          onChangeText={setUserName}
        />
        <Input
          label="默认付款人"
          placeholder="记账时自动填充此名字"
          value={defaultPaidBy}
          onChangeText={setDefaultPaidBy}
        />
      </View>

      {/* Global Default Categories */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => setCategoriesExpanded(!categoriesExpanded)}
          activeOpacity={0.7}
        >
          <View style={styles.sectionHeaderLeft}>
            <Text style={styles.sectionTitle}>默认分类</Text>
            <Text style={styles.categoryCount}>{globalCategories.length} 项</Text>
          </View>
          <Ionicons
            name={categoriesExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={colors.textSecondary}
          />
        </TouchableOpacity>
        <Text style={styles.sectionHint}>新建项目时将使用这些分类作为默认值</Text>

        {categoriesExpanded && (
          <>
            {globalCategories.map((cat) => (
              <View key={cat.id} style={styles.categoryRow}>
                {editingId === cat.id ? (
                  <View style={styles.categoryEditRow}>
                    <TextInput
                      style={styles.categoryInput}
                      value={editingName}
                      onChangeText={setEditingName}
                      autoFocus
                    />
                    <TouchableOpacity onPress={() => handleSaveGlobalCategory(cat)} style={styles.iconBtn}>
                      <Ionicons name="checkmark" size={20} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setEditingId(null)} style={styles.iconBtn}>
                      <Ionicons name="close" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.categoryDisplayRow}>
                    <View style={[styles.categoryDot, { backgroundColor: cat.color }]} />
                    <Text style={styles.categoryName}>{cat.name}</Text>
                    <TouchableOpacity
                      onPress={() => { setEditingId(cat.id); setEditingName(cat.name); }}
                      style={styles.iconBtn}
                    >
                      <Ionicons name="pencil" size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteGlobalCategory(cat)} style={styles.iconBtn}>
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
              <TouchableOpacity onPress={handleAddGlobalCategory} style={styles.iconBtn}>
                <Ionicons name="add-circle" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={handleReset} style={styles.resetRow}>
              <Ionicons name="refresh" size={16} color={colors.primary} />
              <Text style={styles.resetBtn}>重置为默认</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={styles.actions}>
        <Button title="保存" onPress={handleSave} loading={isSaving} size="lg" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, paddingBottom: 100 },
  section: {
    marginBottom: spacing.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
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
  sectionHint: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    marginBottom: spacing.md,
  },
  resetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  resetBtn: {
    fontSize: fontSize.sm,
    color: colors.primary,
  },
  actions: { marginTop: spacing.lg, gap: spacing.md },
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
});
