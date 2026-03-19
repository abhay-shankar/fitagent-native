import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { Colors, FontFamily, Spacing } from '../tokens';
import { OnboardData } from './OnboardScreen';
import { generateWorkoutPlan, WorkoutPlan } from '../services/claude';

const STEPS = [
  'Reviewing your goals…',
  'Planning your schedule…',
  'Selecting exercises…',
  'Finalising your plan…',
];

interface Props {
  profile: OnboardData;
  onReady: (plan: WorkoutPlan) => void;
}

export default function GeneratingScreen({ profile, onReady }: Props) {
  const [stepIndex, setStepIndex] = useState(0);

  // Cycle through step labels while Claude works
  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex(i => Math.min(i + 1, STEPS.length - 1));
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  // Kick off the Claude request
  useEffect(() => {
    generateWorkoutPlan(profile).then(onReady);
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.logo}>fitagent</Text>
        <Text style={styles.heading}>Building your plan</Text>

        <View style={styles.steps}>
          {STEPS.map((step, i) => (
            <View key={step} style={styles.stepRow}>
              <Text style={[
                styles.stepDot,
                i <= stepIndex && styles.stepDotActive,
              ]}>●</Text>
              <Text style={[
                styles.stepText,
                i === stepIndex && styles.stepTextActive,
                i < stepIndex  && styles.stepTextDone,
              ]}>
                {step}
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.sub}>Personalised to your goals and equipment</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: Colors.bg },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.xl },
  logo: {
    fontSize: 12, color: Colors.lime, fontFamily: FontFamily.mono,
    letterSpacing: 3, marginBottom: Spacing.xxl, textAlign: 'center',
  },
  heading: {
    fontFamily: FontFamily.display, fontSize: 30, color: Colors.text,
    textAlign: 'center', marginBottom: Spacing.xxl,
  },
  steps: { gap: Spacing.md, marginBottom: Spacing.xxl },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  stepDot: { fontSize: 8, color: Colors.dim },
  stepDotActive: { color: Colors.lime },
  stepText: { fontSize: 15, color: Colors.dim },
  stepTextActive: { color: Colors.text },
  stepTextDone:   { color: Colors.muted },
  sub: {
    fontSize: 12, color: Colors.muted, fontFamily: FontFamily.mono,
    textAlign: 'center', letterSpacing: 0.5,
  },
});
