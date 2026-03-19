import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView, ActivityIndicator,
} from 'react-native';
import { Colors, FontFamily, Radius, Spacing } from '../tokens';
import { Badge, PrimaryButton } from '../components/ui';
import { generateAgentReview, AgentReview, CheckinData } from '../services/claude';
import { OnboardData } from './OnboardScreen';

const CHANGE_COLOR: Record<string, string> = {
  increase: Colors.lime,
  caution:  Colors.orange,
  modified: Colors.blue,
};

interface Props {
  profile: OnboardData;
  checkin: CheckinData;
  onAccept: () => void;
}

export default function AdaptScreen({ profile, checkin, onAccept }: Props) {
  const [review, setReview]   = useState<AgentReview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    generateAgentReview(profile, checkin)
      .then(setReview)
      .finally(() => setLoading(false));
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <Text style={styles.overLabel}>POST-WORKOUT ADAPTATION</Text>
        <Text style={styles.heading}>Agent Review</Text>
        <Text style={styles.sub}>Based on your check-in for {checkin.workoutName}.</Text>

        {loading ? (
          <View style={styles.loadingBlock}>
            <ActivityIndicator color={Colors.lime} size="large" />
            <Text style={styles.loadingText}>Analysing your session…</Text>
          </View>
        ) : review ? (
          <>
            <Text style={styles.sectionLabel}>OBSERVATIONS</Text>
            {review.observations.map((obs, i) => (
              <View key={i} style={styles.obsRow}>
                <Text style={styles.obsArrow}>→</Text>
                <Text style={styles.obsText}>{obs}</Text>
              </View>
            ))}

            <Text style={[styles.sectionLabel, { marginTop: Spacing.lg }]}>CHANGES FOR NEXT SESSION</Text>
            {review.changes.map((c, i) => (
              <View key={i} style={styles.changeRow}>
                <View style={styles.changeInfo}>
                  <Text style={styles.changeName}>{c.change}</Text>
                  <Text style={styles.changeDelta}>{c.old} → {c.next}</Text>
                </View>
                <Badge color={CHANGE_COLOR[c.type] ?? Colors.lime}>{c.type}</Badge>
              </View>
            ))}
          </>
        ) : null}

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
  loadingBlock: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.md },
  loadingText: { fontSize: 13, color: Colors.muted, fontFamily: FontFamily.mono },
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
