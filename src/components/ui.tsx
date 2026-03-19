import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Colors, FontFamily, Radius, Spacing } from '../tokens';

// ─── Badge ────────────────────────────────────────────────────────────────────
interface BadgeProps {
  children: string;
  color?: string;
}
export function Badge({ children, color = Colors.lime }: BadgeProps) {
  return (
    <View style={[styles.badge, { borderColor: color + '55', backgroundColor: color + '18' }]}>
      <Text style={[styles.badgeText, { color }]}>{children}</Text>
    </View>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────
export function Divider({ label }: { label?: string }) {
  return (
    <View style={styles.dividerRow}>
      <View style={styles.dividerLine} />
      {label && <Text style={styles.dividerLabel}>{label.toUpperCase()}</Text>}
      <View style={styles.dividerLine} />
    </View>
  );
}

// ─── Label ────────────────────────────────────────────────────────────────────
export function Label({ children, color = Colors.muted }: { children: string; color?: string }) {
  return <Text style={[styles.label, { color }]}>{children}</Text>;
}

// ─── PrimaryButton ────────────────────────────────────────────────────────────
interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  style?: ViewStyle;
}
export function PrimaryButton({ title, onPress, style }: PrimaryButtonProps) {
  return (
    <TouchableOpacity style={[styles.primaryBtn, style]} onPress={onPress} activeOpacity={0.85}>
      <Text style={styles.primaryBtnText}>{title}</Text>
    </TouchableOpacity>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────
export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

// ─── AgentNote ────────────────────────────────────────────────────────────────
export function AgentNote({ label = 'AGENT NOTE', message, accentColor = Colors.lime }: {
  label?: string;
  message: string;
  accentColor?: string;
}) {
  return (
    <View style={[styles.agentNote, { borderLeftColor: accentColor }]}>
      <Text style={[styles.agentNoteLabel, { color: accentColor }]}>{label}</Text>
      <Text style={styles.agentNoteText}>"{message}"</Text>
    </View>
  );
}

// ─── ProgressBar ─────────────────────────────────────────────────────────────
export function ProgressBar({ progress }: { progress: number }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: 7,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 10,
    fontFamily: FontFamily.mono,
    letterSpacing: 0.5,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginVertical: Spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.dim,
  },
  dividerLabel: {
    fontSize: 9,
    color: Colors.muted,
    fontFamily: FontFamily.mono,
    letterSpacing: 1,
  },
  label: {
    fontSize: 9,
    fontFamily: FontFamily.mono,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  primaryBtn: {
    backgroundColor: Colors.lime,
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#000',
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: FontFamily.mono,
    letterSpacing: 1,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  agentNote: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.dim,
    borderLeftWidth: 2,
    padding: Spacing.md,
  },
  agentNoteLabel: {
    fontSize: 9,
    fontFamily: FontFamily.mono,
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  agentNoteText: {
    fontSize: 12,
    color: Colors.muted,
    lineHeight: 18,
  },
  progressTrack: {
    height: 3,
    backgroundColor: Colors.dim,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.lime,
    borderRadius: 2,
  },
});
