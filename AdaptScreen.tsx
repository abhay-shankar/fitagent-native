import React from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView,
} from 'react-native';
import { Colors, FontFamily, Radius, Spacing } from '../tokens';
import { Badge, PrimaryButton } from '../components/ui';

const OBSERVATIONS = [
  'Bench press reps are consistently hitting the top of target range — ready to progress.',
  'You flagged shoulder tightness on OHP two sessions in a row. Dropping volume temporarily.',
  'Friday sessions have been skipped twice. Moving to optional mobility day.',
];

type ChangeType = 'increase' | 'caution' | 'modified';

const CHANGES: { change: string; old: string; next: string; type: ChangeType }[] = [
  { change: 'Bench Press',    old: '3×8 @ 60kg', next: '3×8 @ 65kg',          type: 'increase' },
  { change: 'Overhead Press', old: '4×10',        next: '3×10 (shoulder rest)', type: 'caution' },
  { change: 'Friday session', old: 'Removed',     next: 'Light mobility work',  type: 'modified' },
];

const CHANGE_COLOR: Record<ChangeType, string> = {
  increase: Colors.lime,
  caution:  Colors.orange,
  modified: Colors.blue,
};

interface Props {
  onAccept: () => void;
}

export default function AdaptScreen({ onAccept }: Props) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <Text style={styles.overLabel}>WEEK 4 ADAPTATION</Text>
        <Text style={styles.heading}>Agent Review</Text>
        <Text style={styles.sub}>Based on your last 3 sessions.</Text>

        <Text style={styles.sectionLabel}>OBSERVATIONS</Text>
        {OBSERVATIONS.map((obs, i) => (
          <View key={i} style={styles.obsRow}>
            <Text style={styles.obsArrow}>→</Text>
            <Text style={styles.obsText}>{obs}</Text>
          </View>
        ))}

        <Text style={[styles.sectionLabel, { marginTop: Spacing.lg }]}>CHANGES FOR NEXT WEEK</Text>
        {CHANGES.map((c, i) => (
          <View key={i} style={styles.changeRow}>
            <View style={styles.changeInfo}>
              <Text style={styles.changeName}>{c.change}</Text>
              <Text style={styles.changeDelta}>{c.old} → {c.next}</Text>
            </View>
            <Badge color={CHANGE_COLOR[c.type]}>{c.type}</Badge>
          </View>
        ))}

        <PrimaryButton title="ACCEPT NEW PLAN" onPress={onAccept} style={styles.cta} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1 },
  container: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  overLabel: {
    fontSize: 9, color: Colors.lime, fontFamily: FontFamily.mono,
    letterSpacing: 1, marginBottom: Spacing.xs,
  },
  heading: { fontFamily: FontFamily.display, fontSize: 24, color: Colors.text, marginBottom: Spacing.xs },
  sub: { fontSize: 13, color: Colors.muted, marginBottom: Spacing.lg },
  sectionLabel: {
    fontSize: 9, color: Colors.muted, fontFamily: FontFamily.mono,
    letterSpacing: 1.5, marginBottom: Spacing.sm,
  },
  obsRow: {
    flexDirection: 'row', gap: Spacing.sm,
    backgroundColor: Colors.card, borderRadius: Radius.md,
    padding: Spacing.md, marginBottom: Spacing.xs,
  },
  obsArrow: { color: Colors.lime, fontFamily: FontFamily.mono, fontSize: 12, marginTop: 1 },
  obsText: { flex: 1, fontSize: 12, color: Colors.muted, lineHeight: 18 },
  changeRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.md, marginBottom: Spacing.xs,
  },
  changeInfo: { flex: 1, marginRight: Spacing.sm },
  changeName: { fontSize: 13, color: Colors.text, marginBottom: 2 },
  changeDelta: { fontSize: 11, color: Colors.muted, fontFamily: FontFamily.mono },
  cta: { marginTop: Spacing.lg },
});
