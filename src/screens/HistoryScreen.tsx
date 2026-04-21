import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity,
} from 'react-native';
import { Colors, FontFamily, Radius, Spacing } from '../tokens';
import { loadHistory, calcStats, WorkoutEntry } from '../services/storage';

const DIFFICULTY_LABELS = ['Too Easy', 'Just Right', 'Too Hard'];
const DIFFICULTY_COLORS = [Colors.lime, Colors.blue, Colors.orange];

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function HistoryScreen({ onBack }: { onBack: () => void }) {
  const [history, setHistory] = useState<WorkoutEntry[]>([]);
  const [stats, setStats]     = useState({ total: 0, streak: 0, adherence: '—' });

  useEffect(() => {
    loadHistory().then(entries => {
      setHistory(entries);
      setStats(calcStats(entries));
    });
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.heading}>Progress</Text>

        {history.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyHeading}>Your journey starts today.</Text>
            <Text style={styles.emptyBody}>
              Complete your first workout and your progress will appear here — streaks, adherence, and a full history of every session.
            </Text>
            <View style={styles.emptyHint}>
              <Text style={styles.emptyHintText}>← Head back and hit Start Workout</Text>
            </View>
          </View>
        ) : (
          <>
            {/* Stats row */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats.total}</Text>
                <Text style={styles.statLabel}>Workouts</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats.streak}</Text>
                <Text style={styles.statLabel}>Day streak</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats.adherence}</Text>
                <Text style={styles.statLabel}>Adherence</Text>
              </View>
            </View>

            {/* Workout history */}
            <Text style={[styles.sectionLabel, { marginTop: Spacing.lg }]}>WORKOUT HISTORY</Text>
            {history.map(entry => (
              <View key={entry.id} style={styles.entryCard}>
                <View style={styles.entryHeader}>
                  <Text style={styles.entryName}>{entry.workoutName}</Text>
                  <Text style={styles.entryDate}>{formatDate(entry.date)}</Text>
                </View>
                {entry.difficulty !== null && (
                  <Text style={[styles.difficultyTag, { color: DIFFICULTY_COLORS[entry.difficulty] }]}>
                    {DIFFICULTY_LABELS[entry.difficulty]}
                  </Text>
                )}
                <Text style={styles.entryExercises}>
                  {entry.exerciseNames.join(' · ')}
                </Text>
                {entry.note ? (
                  <Text style={styles.entryNote}>"{entry.note}"</Text>
                ) : null}
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1 },
  container: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  backBtn: { marginBottom: Spacing.md },
  backText: { color: Colors.lime, fontFamily: FontFamily.mono, fontSize: 12, letterSpacing: 1 },
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
  emptyState: { flex: 1, paddingTop: Spacing.xxl },
  emptyHeading: {
    fontFamily: FontFamily.display, fontSize: 26, color: Colors.text,
    marginBottom: Spacing.md,
  },
  emptyBody: {
    fontSize: 14, color: Colors.muted, lineHeight: 22, marginBottom: Spacing.xl,
  },
  emptyHint: {
    borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.lg,
  },
  emptyHintText: {
    fontSize: 12, color: Colors.lime, fontFamily: FontFamily.mono, letterSpacing: 0.5,
  },
  entryCard: {
    backgroundColor: Colors.card, borderRadius: Radius.md,
    padding: Spacing.md, marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: Colors.border,
  },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  entryName: { fontSize: 14, color: Colors.text, fontWeight: '600' },
  entryDate: { fontSize: 10, color: Colors.muted, fontFamily: FontFamily.mono },
  difficultyTag: { fontSize: 10, fontFamily: FontFamily.mono, marginBottom: 4 },
  entryExercises: { fontSize: 11, color: Colors.muted, lineHeight: 16 },
  entryNote: { fontSize: 11, color: Colors.muted, fontStyle: 'italic', marginTop: 4 },
});
