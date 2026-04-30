import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import type { Category, UUID } from '@/types';

interface CategoryPickerProps {
  label?: string;
  categories: Category[];
  value: UUID | null;
  onChange: (categoryId: UUID) => void;
}

export function CategoryPicker({ label, categories, value, onChange }: CategoryPickerProps) {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.grid}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.chip,
              value === cat.id && { backgroundColor: cat.color, borderColor: cat.color },
            ]}
            onPress={() => onChange(cat.id)}
          >
            <Ionicons
              name={(cat.icon as keyof typeof Ionicons.glyphMap) ?? 'ellipsis-horizontal'}
              size={16}
              color={value === cat.id ? colors.white : cat.color}
            />
            <Text
              style={[
                styles.chipText,
                value === cat.id && { color: colors.white },
              ]}
              numberOfLines={1}
            >
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
});
