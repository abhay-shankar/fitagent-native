import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  SafeAreaView, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Colors, FontFamily, Radius, Spacing } from '../tokens';
import { Badge, ProgressBar, PrimaryButton } from '../components/ui';
import { Exercise } from '../services/claude';

interface LoggedSet {
  weight: string;
  reps: string;
}

interface Props {
  exercises: Exercise[];
  onFinish: () => void;
}

export default function WorkoutScreen({ exercises, onFinish }: Props) {
  const [exerciseIndex, setExerciseIndex]   = useState(0);
  const [completedSets, setCompletedSets]   = useState(0);
  const [loggedSets, setLoggedSets]         = useState<LoggedSet[]>([]);
  const [activeWeight, setActiveWeight]     = useState(exercises[0]?.weight ?? '');
  const [activeReps, setActiveReps]         = useState('');

  const current        = exercises[exerciseIndex];
  const isLastExercise = exerciseIndex === exercises.length - 1;
  const isLastSet      = completedSets >= current.sets - 1;
  const upNext         = exercises.slice(exerciseIndex + 1, exerciseIndex + 4);
  const currentSetNumber = completedSets + 1;

  const logSet = () => {
    const entry: LoggedSet = {
      weight: activeWeight.trim() || current.weight,
      reps:   activeReps.trim()   || current.reps,
    };
    const newLogged = [...loggedSets, entry];
    setLoggedSets(newLogged);

    if (!isLastSet) {
      setCompletedSets(c => c + 1);
      setActiveReps('');
      // keep weight the same for next set
    } else if (!isLastExercise) {
      const next = exercises[exerciseIndex + 1];
      setExerciseIndex(i => i + 1);
      setCompletedSets(0);
      setLoggedSets([]);
      setActiveWeight(next.weight);
      setActiveReps('');
    } else {
      onFinish();
    }
  };

  const progress = (exerciseIndex + completedSets / current.sets) / exercises.length;
  const ctaLabel = isLastExercise && isLastSet ? 'FINISH WORKOUT →' : `LOG SET ${currentSetNumber} / ${current.sets}`;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

          {/* Progress */}
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>EXERCISE {exerciseIndex + 1} OF {exercises.length}</Text>
            <Text style={styles.progressLabel}>SET {currentSetNumber} OF {current.sets}</Text>
          </View>
          <ProgressBar progress={progress} />

          {/* Current exercise */}
          <View style={styles.exerciseBlock}>
            <Badge color={Colors.orange}>Current</Badge>
            <Text style={styles.exerciseName}>{current.name}</Text>
            <Text style={styles.exerciseSub}>
              {current.sets} sets · {current.reps} reps · {current.weight}
            </Text>

            {Array.from({ length: current.sets }).map((_, i) => {
              const done   = i < completedSets;
              const active = i === completedSets;
              const logged = loggedSets[i];

              return (
                <View key={i} style={[styles.setRow, active && styles.setRowActive]}>
                  <Text style={styles.setLabel}>SET {i + 1}</Text>

                  <View style={styles.setInputs}>
                    {/* Weight */}
                    {active ? (
                      <TextInput
                        style={[styles.inputBox, styles.inputEditable]}
                        value={activeWeight}
                        onChangeText={setActiveWeight}
                        placeholder={current.weight}
                        placeholderTextColor={Colors.muted}
                        keyboardType="default"
                        returnKeyType="next"
                      />
                    ) : (
                      <View style={styles.inputBox}>
                        <Text style={styles.inputText}>
                          {done ? logged?.weight : current.weight}
                        </Text>
                      </View>
                    )}

                    <Text style={styles.times}>×</Text>

                    {/* Reps */}
                    {active ? (
                      <TextInput
                        style={[styles.inputBox, styles.repsBox, styles.inputEditable]}
                        value={activeReps}
                        onChangeText={setActiveReps}
                        placeholder={current.reps}
                        placeholderTextColor={Colors.muted}
                        keyboardType="numeric"
                        returnKeyType="done"
                      />
                    ) : (
                      <View style={[styles.inputBox, styles.repsBox, !done && styles.repsEmpty]}>
                        <Text style={[styles.inputText, !done && { color: Colors.muted }]}>
                          {done ? logged?.reps : '—'}
                        </Text>
                      </View>
                    )}
                  </View>

                  {done && <Text style={styles.checkmark}>✓</Text>}
                </View>
              );
            })}
          </View>

          {/* Up next */}
          {upNext.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>UP NEXT</Text>
              <View style={styles.nextRow}>
                {upNext.map(ex => (
                  <View key={ex.name} style={styles.nextCard}>
                    <Text style={styles.nextText}>{ex.name}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          <PrimaryButton title={ctaLabel} onPress={logSet} style={styles.cta} />
          <TouchableOpacity onPress={onFinish} style={styles.endBtn}>
            <Text style={styles.endBtnText}>End Workout</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1 },
  container: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs },
  progressLabel: { fontSize: 9, color: Colors.muted, fontFamily: FontFamily.mono },
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
  setRowActive: { borderColor: Colors.lime, backgroundColor: Colors.lime + '10' },
  setLabel: { fontSize: 10, color: Colors.muted, fontFamily: FontFamily.mono, width: 38 },
  setInputs: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  inputBox: {
    flex: 1, backgroundColor: Colors.dim, borderRadius: Radius.sm,
    paddingVertical: 6, alignItems: 'center',
  },
  inputEditable: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.lime + '60',
    color: Colors.text, fontSize: 14, textAlign: 'center', paddingHorizontal: 4,
  },
  repsBox: { flex: 0, width: 56 },
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
  endBtn: { marginTop: Spacing.md, alignItems: 'center', paddingVertical: Spacing.sm },
  endBtnText: { color: Colors.red, fontFamily: FontFamily.mono, fontSize: 12, letterSpacing: 1 },
});
