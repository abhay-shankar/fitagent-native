import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView, StyleSheet, SafeAreaView, Alert,
} from 'react-native';
import { Colors, FontFamily, Radius, Spacing } from '../tokens';
import { PrimaryButton } from '../components/ui';
import { CheckinData, parseVoiceCheckin } from '../services/claude';
import MicButton from '../components/MicButton';
import VoiceOverlay from '../components/VoiceOverlay';
import { useVoiceRecognition } from '../services/voice';

const DIFFICULTY_OPTIONS = ['Too Easy', 'Just Right', 'Too Hard'];
const EMOJIS = ['😓', '👍', '💪'];

interface Props {
  exercises: string[];
  workoutName: string;
  onSubmit: (data: CheckinData) => void;
  onCancel: () => void;
}

export default function CheckinScreen({ exercises, workoutName, onSubmit, onCancel }: Props) {
  const [difficulty, setDifficulty] = useState<number | null>(null);
  const [exerciseFeel, setExerciseFeel] = useState<Record<number, number>>({});
  const [note, setNote] = useState('');

  const [voiceParsing, setVoiceParsing] = useState(false);

  const { state: voiceState, partial: voicePartial, transcript: voiceTranscript, start: voiceStart, stop: voiceStop, cancel: voiceCancel } =
    useVoiceRecognition({ onError: (err) => Alert.alert('Voice error', err) });

  async function handleVoiceStop() {
    await voiceStop();
    const text = voiceTranscript || voicePartial;
    if (!text) return;
    setVoiceParsing(true);
    try {
      const result = await parseVoiceCheckin(text, exercises);
      if (result.difficulty !== null) setDifficulty(result.difficulty);
      if (result.exerciseFeel) setExerciseFeel(prev => ({ ...prev, ...result.exerciseFeel }));
      if (result.note) setNote(prev => prev ? `${prev}\n${result.note}` : result.note!);
    } catch (e: any) {
      Alert.alert('Voice error', e.message ?? 'Could not parse voice input');
    } finally {
      setVoiceParsing(false);
    }
  }

  function handleMicPress() {
    if (voiceState === 'listening') return;
    voiceStart();
  }




  return (
    <SafeAreaView style={styles.safe}>
      <VoiceOverlay
        visible={voiceState === 'listening' || voiceParsing}
        partial={voicePartial}
        transcript={voiceTranscript}
        parsing={voiceParsing}
        hint={'Say something like "felt too hard, squats were strong, bench was rough"'}
        onStop={handleVoiceStop}
        onCancel={voiceCancel}
      />
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

        {/* Voice */}
        <View style={styles.voiceRow}>
          <MicButton state={voiceState} onPress={handleMicPress} />
          <Text style={styles.voiceHint}>
            {voiceState === 'idle'
              ? 'Say "felt too hard, squats felt strong, bench was rough"'
              : voiceState === 'listening'
              ? 'Listening — tap to stop'
              : 'Parsing your feedback...'}
          </Text>
        </View>

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
        <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
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
  voiceRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.card, borderRadius: Radius.md,
    padding: Spacing.md, marginTop: Spacing.md,
    borderWidth: 1, borderColor: Colors.dim,
  },
  voiceHint: { flex: 1, fontSize: 11, color: Colors.muted, lineHeight: 16 },
  cta: { marginTop: Spacing.lg },
  cancelBtn: { marginTop: Spacing.md, alignItems: 'center', paddingVertical: Spacing.sm },
  cancelText: { color: Colors.muted, fontFamily: FontFamily.mono, fontSize: 12, letterSpacing: 1 },
});
