import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import { COMMON_CURRENCIES } from '@/constants';
import type { CurrencyCode } from '@/types';
import { toCurrencyCode } from '@/utils';

interface CurrencyPickerProps {
  label?: string;
  value: CurrencyCode;
  onChange: (currency: CurrencyCode) => void;
}

export function CurrencyPicker({ label, value, onChange }: CurrencyPickerProps) {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.grid}>
        {COMMON_CURRENCIES.slice(0, 12).map((c) => (
          <TouchableOpacity
            key={c.code}
            style={[
              styles.chip,
              value === c.code && styles.chipActive,
            ]}
            onPress={() => onChange(toCurrencyCode(c.code))}
          >
            <Text style={[styles.chipSymbol, value === c.code && styles.chipTextActive]}>
              {c.symbol}
            </Text>
            <Text style={[styles.chipCode, value === c.code && styles.chipTextActive]}>
              {c.code}
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
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipSymbol: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  chipCode: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.white,
  },
});
