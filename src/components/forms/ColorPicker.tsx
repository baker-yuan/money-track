import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface ColorPickerProps {
  label?: string;
  value: string;
  onChange: (color: string) => void;
  colors: string[];
}

export function ColorPicker({ label, value, onChange, colors: colorOptions }: ColorPickerProps) {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.grid}>
        {colorOptions.map((color) => (
          <TouchableOpacity
            key={color}
            style={[styles.swatch, { backgroundColor: color }]}
            onPress={() => onChange(color)}
          >
            {value === color && (
              <Ionicons name="checkmark" size={18} color="#FFFFFF" />
            )}
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
    gap: spacing.md,
  },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
