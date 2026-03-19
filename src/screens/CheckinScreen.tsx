import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView, StyleSheet, SafeAreaView,
} from 'react-native';
import { Colors, FontFamily, Radius, Spacing } from '../tokens';
import { PrimaryButton } from '../components/ui';
import { CheckinData } from '../services/claude';

const DIFFICULTY_OPTIONS = ['Too Easy', 'Just Right', 'Too Hard'];
const EMOJIS = ['😓', '👍', '💪'];

interface Props {
  exercises: string[];
  workoutName: string;
  onSubmit: (data: CheckinData) => void;
}

export default function CheckinScreen({ exercises, workoutName, onSubmit }: Props) {
  const [difficulty, setDifficulty] = useState<number | null>(null);
  const [exerciseFeel, setExerciseFeel] = useState<Record<number, number>>({});
  const [note, setNote] = useState('');

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <Text style={styles.overLabel}>POST-WORKOUT CHECK-IN</Text>
        <Text style={styles.heading}>How was {workoutName}?</Text>
        <Text style={styles.sub}>Your answers train the agent to adapt your next plan.</Text>

        {/* Difficulty */}
        <Text style={styles.sectionLabel}>OVERALL DIFFICULTY</Text>
        <View style={styles.diffRow}>
          {DIFFICULTY_OPTIONS.map((label, i) => (
            <TouchableOpacity
              key={label}
              onPress={() => setDifficulty(i)}
              style={[styles.diffBtn, difficulty === i && styles.diffBtnActive]}
            >
              <Text style={[styles.diffText, difficulty === i && styles.diffTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Exercise feel */}
        <Text style={[styles.sectionLabel, { marginTop: Spacing.md }]}>HOW DID EACH FEEL?</Text>
        {exercises.map((ex, i) => (
          <View key={ex} style={styles.exerciseRow}>
            <Text style={styles.exerciseName}>{ex}</Text>
            <View style={styles.emojiRow}>
              {EMOJIS.map((emoji, j) => (
                <TouchableOpacity
                  key={j}
                  onPress={() => setExerciseFeel(prev => ({ ...prev, [i]: j }))}
                  style={[styles.emojiBtn, exerciseFeel[i] === j && styles.emojiBtnActive]}
                >
                  <Text style={styles.emoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Notes */}
        <Text style={[styles.sectionLabel, { marginTop: Spacing.md }]}>NOTES (OPTIONAL)</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          multiline
          placeholder="Anything the agent should know..."
          placeholderTextColor={Colors.muted}
          style={styles.noteInput}
        />

        <PrimaryButton
          title="SUBMIT CHECK-IN →"
          onPress={() => onSubmit({ workoutName, difficulty, exerciseFeel, exerciseNames: exercises, note })}
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
  overLabel: {
    fontSize: 9, color: Colors.muted, fontFamily: FontFamily.mono,
    letterSpacing: 1, marginBottom: Spacing.xs,
  },
  heading: { fontFamily: FontFamily.display, fontSize: 24, color: Colors.text, marginBottom: Spacing.xs },
  sub: { fontSize: 13, color: Colors.muted, lineHeight: 19, marginBottom: Spacing.lg },
  sectionLabel: {
    fontSize: 9, color: Colors.muted, fontFamily: FontFamily.mono,
    letterSpacing: 1.5, marginBottom: Spacing.sm,
  },
  diffRow: { flexDirection: 'row', gap: Spacing.sm },
  diffBtn: {
    flex: 1, paddingVertical: 10, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Colors.dim, alignItems: 'center',
  },
  diffBtnActive: { borderColor: Colors.lime, backgroundColor: Colors.lime + '12' },
  diffText: { fontSize: 11, color: Colors.muted, fontFamily: FontFamily.mono },
  diffTextActive: { color: Colors.lime },
  exerciseRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.card, borderRadius: Radius.md,
    padding: Spacing.sm, marginBottom: Spacing.sm,
  },
  exerciseName: { fontSize: 13, color: Colors.text },
  emojiRow: { flexDirection: 'row', gap: Spacing.xs },
  emojiBtn: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.dim,
    alignItems: 'center', justifyContent: 'center',
  },
  emojiBtnActive: { borderColor: Colors.lime, backgroundColor: Colors.lime + '15' },
  emoji: { fontSize: 16 },
  noteInput: {
    backgroundColor: Colors.card, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.dim,
    padding: Spacing.sm, fontSize: 13, color: Colors.text,
    lineHeight: 20, height: 70, textAlignVertical: 'top',
  },
  cta: { marginTop: Spacing.lg },
});
