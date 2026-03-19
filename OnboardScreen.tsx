import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView,
} from 'react-native';
import { Colors, FontFamily, Radius, Spacing } from '../tokens';
import { Divider, PrimaryButton, ProgressBar } from '../components/ui';

const GOALS = ['Lose weight', 'Build muscle', 'Improve endurance', 'Stay consistent'];
const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function OnboardScreen() {
  const [selectedGoal, setSelectedGoal] = useState(1);
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 3, 4]);

  const toggleDay = (i: number) => {
    setSelectedDays(prev =>
      prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <Text style={styles.stepLabel}>STEP 2 OF 5</Text>
        <ProgressBar progress={0.4} />

        <Text style={styles.heading}>What's your goal?</Text>
        <Text style={styles.sub}>Your agent uses this to calibrate every plan it builds for you.</Text>

        {GOALS.map((g, i) => (
          <TouchableOpacity
            key={g}
            onPress={() => setSelectedGoal(i)}
            style={[styles.goalOption, i === selectedGoal && styles.goalOptionActive]}
          >
            <Text style={[styles.goalText, i === selectedGoal && styles.goalTextActive]}>{g}</Text>
            {i === selectedGoal && <Text style={styles.check}>✓</Text>}
          </TouchableOpacity>
        ))}

        <Divider label="availability" />

        <Text style={styles.sectionLabel}>Days per week</Text>
        <View style={styles.daysRow}>
          {DAYS.map((d, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => toggleDay(i)}
              style={[styles.dayDot, selectedDays.includes(i) && styles.dayDotActive]}
            >
              <Text style={[styles.dayText, selectedDays.includes(i) && styles.dayTextActive]}>{d}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <PrimaryButton title="NEXT →" onPress={() => {}} style={styles.cta} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1 },
  container: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  stepLabel: {
    fontSize: 9, color: Colors.lime, fontFamily: FontFamily.mono,
    letterSpacing: 2, textTransform: 'uppercase', marginBottom: Spacing.xs,
  },
  heading: {
    fontFamily: FontFamily.display, fontSize: 26, color: Colors.text,
    marginTop: Spacing.lg, marginBottom: Spacing.xs,
  },
  sub: {
    fontSize: 13, color: Colors.muted, lineHeight: 19,
    marginBottom: Spacing.lg,
  },
  goalOption: {
    borderWidth: 1.5, borderColor: Colors.dim, borderRadius: Radius.md,
    padding: Spacing.md, marginBottom: Spacing.sm,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  goalOptionActive: {
    borderColor: Colors.lime, backgroundColor: Colors.lime + '10',
  },
  goalText: { fontSize: 15, color: Colors.text },
  goalTextActive: { color: Colors.lime },
  check: { color: Colors.lime, fontSize: 16 },
  sectionLabel: {
    fontSize: 11, color: Colors.muted, fontFamily: FontFamily.mono,
    marginBottom: Spacing.sm,
  },
  daysRow: { flexDirection: 'row', gap: Spacing.sm },
  dayDot: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.dim,
    alignItems: 'center', justifyContent: 'center',
  },
  dayDotActive: { backgroundColor: Colors.lime },
  dayText: { fontSize: 11, fontWeight: 'bold', color: Colors.muted, fontFamily: FontFamily.mono },
  dayTextActive: { color: '#000' },
  cta: { marginTop: Spacing.xl },
});
