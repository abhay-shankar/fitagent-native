import React from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView, Dimensions,
} from 'react-native';
import { Colors, FontFamily, Radius, Spacing } from '../tokens';
import { AgentNote } from '../components/ui';

const STATS = [
  { label: 'Workouts', value: '11', unit: 'total' },
  { label: 'Streak',   value: '6',  unit: 'days' },
  { label: 'Adherence',value: '78%',unit: 'avg' },
];

const BENCH_DATA = [50, 55, 55, 60, 60, 60, 65];
const MAX_KG = Math.max(...BENCH_DATA) + 10;
const BAR_HEIGHT = 80;

export default function HistoryScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <Text style={styles.heading}>Progress</Text>

        {/* Stats row */}
        <View style={styles.statsRow}>
          {STATS.map((s, i) => (
            <View key={i} style={styles.statCard}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Lift chart */}
        <Text style={styles.sectionLabel}>BENCH PRESS PROGRESSION</Text>
        <View style={styles.chartCard}>
          <View style={styles.chartBars}>
            {BENCH_DATA.map((kg, i) => {
              const height = (kg / MAX_KG) * BAR_HEIGHT;
              const isLast = i === BENCH_DATA.length - 1;
              return (
                <View key={i} style={styles.barWrapper}>
                  <View style={{ height: BAR_HEIGHT, justifyContent: 'flex-end' }}>
                    <View style={[
                      styles.bar,
                      { height, backgroundColor: isLast ? Colors.lime : Colors.lime + '44' },
                    ]} />
                  </View>
                  <Text style={styles.barLabel}>W{i + 1}</Text>
                </View>
              );
            })}
          </View>
          <Text style={styles.chartGain}>+30% over 7 weeks</Text>
        </View>

        {/* Agent insight */}
        <AgentNote
          label="AGENT INSIGHT"
          accentColor={Colors.orange}
          message="You consistently skip sessions after back-to-back work days. I've restructured Weeks 5–6 to place rest days on Tue/Thu."
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1 },
  container: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  heading: { fontFamily: FontFamily.display, fontSize: 26, color: Colors.text, marginBottom: Spacing.lg },
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  statCard: {
    flex: 1, backgroundColor: Colors.card, borderRadius: Radius.md,
    padding: Spacing.sm, alignItems: 'center',
  },
  statValue: { fontSize: 22, color: Colors.lime, fontWeight: 'bold', marginBottom: 2 },
  statLabel: { fontSize: 9, color: Colors.muted, fontFamily: FontFamily.mono },
  sectionLabel: {
    fontSize: 9, color: Colors.muted, fontFamily: FontFamily.mono,
    letterSpacing: 1.5, marginBottom: Spacing.sm,
  },
  chartCard: {
    backgroundColor: Colors.card, borderRadius: Radius.md,
    padding: Spacing.md, marginBottom: Spacing.lg,
  },
  chartBars: { flexDirection: 'row', gap: Spacing.xs, alignItems: 'flex-end' },
  barWrapper: { flex: 1, alignItems: 'center', gap: 4 },
  bar: { width: '100%', borderRadius: 2 },
  barLabel: { fontSize: 8, color: Colors.muted, fontFamily: FontFamily.mono },
  chartGain: {
    textAlign: 'right', fontSize: 10, color: Colors.lime,
    fontFamily: FontFamily.mono, marginTop: Spacing.sm,
  },
});
