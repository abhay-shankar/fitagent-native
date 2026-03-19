import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView,
} from 'react-native';
import { Colors, FontFamily, Radius, Spacing } from '../tokens';
import { Badge, ProgressBar, PrimaryButton } from '../components/ui';

interface SetData {
  id: number;
  weight: string;
  reps: string;
  done: boolean;
}

const INITIAL_SETS: SetData[] = [
  { id: 1, weight: '60kg', reps: '10', done: true },
  { id: 2, weight: '60kg', reps: '',   done: false },
  { id: 3, weight: '60kg', reps: '',   done: false },
];

const NEXT_EXERCISES = ['Incline DB Press', 'Cable Fly', 'Tricep Dips'];

interface Props {
  onFinish: () => void;
}

export default function WorkoutScreen({ onFinish }: Props) {
  const [sets, setSets] = useState<SetData[]>(INITIAL_SETS);
  const [currentSet, setCurrentSet] = useState(2);

  const logSet = () => {
    setSets(prev => prev.map(s =>
      s.id === currentSet ? { ...s, reps: '10', done: true } : s
    ));
    if (currentSet < 3) {
      setCurrentSet(c => c + 1);
    } else {
      onFinish();
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        {/* Progress */}
        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>EXERCISE 2 OF 5</Text>
          <Text style={styles.progressLabel}>28 min elapsed</Text>
        </View>
        <ProgressBar progress={0.4} />

        {/* Current exercise */}
        <View style={styles.exerciseBlock}>
          <Badge color={Colors.orange}>Current</Badge>
          <Text style={styles.exerciseName}>Bench Press</Text>
          <Text style={styles.exerciseSub}>3 sets · 8–10 reps · 60kg</Text>

          {sets.map(set => (
            <View
              key={set.id}
              style={[styles.setRow, set.id === currentSet && styles.setRowActive]}
            >
              <Text style={styles.setLabel}>SET {set.id}</Text>
              <View style={styles.setInputs}>
                <View style={styles.inputBox}>
                  <Text style={styles.inputText}>{set.weight}</Text>
                </View>
                <Text style={styles.times}>×</Text>
                <View style={[styles.inputBox, styles.repsBox, !set.done && styles.repsEmpty]}>
                  <Text style={[styles.inputText, !set.done && { color: Colors.muted }]}>
                    {set.done ? set.reps : '—'}
                  </Text>
                </View>
              </View>
              {set.done && <Text style={styles.checkmark}>✓</Text>}
            </View>
          ))}
        </View>

        {/* Up next */}
        <Text style={styles.sectionLabel}>UP NEXT</Text>
        <View style={styles.nextRow}>
          {NEXT_EXERCISES.map(ex => (
            <View key={ex} style={styles.nextCard}>
              <Text style={styles.nextText}>{ex}</Text>
            </View>
          ))}
        </View>

        <PrimaryButton
          title={currentSet <= 3 ? `LOG SET ${currentSet} COMPLETE` : 'FINISH WORKOUT →'}
          onPress={logSet}
          style={styles.cta}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1 },
  container: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  progressRow: {
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs,
  },
  progressLabel: {
    fontSize: 9, color: Colors.muted, fontFamily: FontFamily.mono,
  },
  exerciseBlock: {
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    padding: Spacing.lg, marginTop: Spacing.lg, marginBottom: Spacing.lg,
  },
  exerciseName: {
    fontFamily: FontFamily.display, fontSize: 26, color: Colors.text,
    marginTop: Spacing.sm, marginBottom: 2,
  },
  exerciseSub: { fontSize: 12, color: Colors.muted, marginBottom: Spacing.lg },
  setRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.dim,
    borderRadius: Radius.md, padding: Spacing.sm, marginBottom: Spacing.xs,
  },
  setRowActive: {
    borderColor: Colors.lime, backgroundColor: Colors.lime + '10',
  },
  setLabel: {
    fontSize: 10, color: Colors.muted, fontFamily: FontFamily.mono, width: 38,
  },
  setInputs: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  inputBox: {
    flex: 1, backgroundColor: Colors.dim, borderRadius: Radius.sm,
    paddingVertical: 6, alignItems: 'center',
  },
  repsBox: { flex: 0, width: 48, backgroundColor: Colors.border },
  repsEmpty: { backgroundColor: Colors.border },
  inputText: { fontSize: 14, color: Colors.text },
  times: { fontSize: 12, color: Colors.muted },
  checkmark: { color: Colors.lime, fontSize: 14 },
  sectionLabel: {
    fontSize: 9, color: Colors.muted, fontFamily: FontFamily.mono,
    letterSpacing: 1, marginBottom: Spacing.sm,
  },
  nextRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  nextCard: {
    flex: 1, backgroundColor: Colors.card, borderRadius: Radius.sm,
    padding: Spacing.sm, alignItems: 'center',
  },
  nextText: { fontSize: 10, color: Colors.muted, textAlign: 'center', lineHeight: 15 },
  cta: {},
});
