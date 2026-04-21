import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, LayoutAnimation,
} from 'react-native';
import { Colors, FontFamily, Radius, Spacing } from '../tokens';
import { Badge, AgentNote } from '../components/ui';
import { OnboardData } from './OnboardScreen';
import { WorkoutPlan, Exercise, generateDashboardNote } from '../services/claude';
import { getCachedDashboardNote, cacheDashboardNote } from '../services/storage';
import ExerciseDetailModal from '../components/ExerciseDetailModal';

type WorkoutStatus = 'done' | 'today' | 'rest' | 'upcoming';

const STATUS_ICON: Record<WorkoutStatus, string> = {
  done: '✓', today: '▶', rest: '—', upcoming: '·',
};

interface Props {
  profile: OnboardData;
  plan: WorkoutPlan;
  onStartWorkout: () => void;
  onViewHistory: () => void;
  onSettings: () => void;
}

export default function DashboardScreen({ profile, plan, onStartWorkout, onViewHistory, onSettings }: Props) {
  const [agentNote, setAgentNote]         = useState('Analyzing your plan…');
  const [showExercises, setShowExercises] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);

  useEffect(() => {
    setAgentNote('Analyzing your plan…');
    getCachedDashboardNote().then(cached => {
      if (cached) {
        setAgentNote(cached);
      } else {
        generateDashboardNote(profile, plan)
          .then(note => { setAgentNote(note); cacheDashboardNote(note); })
          .catch(() => setAgentNote("You're on track — keep the momentum going."));
      }
    });
  }, [plan]);

  const today         = plan.weekSchedule.find(d => d.status === 'today');
  const completedDays = plan.weekSchedule.filter(d => d.status === 'done').length;
  const trainingDays  = plan.weekSchedule.filter(d => d.status !== 'rest').length;

  const todayIndex = plan.weekSchedule.findIndex(d => d.status === 'today');
  const orderedSchedule = todayIndex > 0
    ? [...plan.weekSchedule.slice(todayIndex), ...plan.weekSchedule.slice(0, todayIndex)]
    : plan.weekSchedule;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.weekLabel}>WEEK 1 OF {plan.totalWeeks}</Text>
            <Text style={styles.heading}>Your Plan</Text>
          </View>
          <View style={styles.headerRight}>
            <Badge color={Colors.lime}>On Track</Badge>
            <Text style={styles.workoutCount}>{completedDays}/{trainingDays} workouts</Text>
            <TouchableOpacity onPress={onSettings} style={styles.gearBtn}>
              <Text style={styles.gearIcon}>⚙</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Today card — rest/done state */}
        {!today && (
          <View style={styles.restCard}>
            <Text style={styles.restLabel}>TODAY · DONE</Text>
            <Text style={styles.restTitle}>Workout complete</Text>
            <Text style={styles.restSub}>Your next session will appear tomorrow.</Text>
          </View>
        )}

        {/* Today card — active */}
        {today && <TouchableOpacity style={styles.todayCard} onPress={onStartWorkout} activeOpacity={0.85}>
          <Text style={styles.todayLabel}>TODAY · {plan.todayFocus.toUpperCase()}</Text>
          <Text style={styles.todayTitle}>{today?.workoutName ?? 'Workout'}</Text>
          <Text style={styles.todaySub}>{plan.todaySummary}</Text>
          <View style={styles.todayActions}>
            <View style={styles.startBtn}>
              <Text style={styles.startBtnText}>START WORKOUT →</Text>
            </View>
            <TouchableOpacity
              onPress={() => { LayoutAnimation.easeInEaseOut(); setShowExercises(v => !v); }}
              style={styles.viewBtn}
            >
              <Text style={styles.viewBtnText}>{showExercises ? 'HIDE ↑' : 'VIEW ↓'}</Text>
            </TouchableOpacity>
          </View>

          {showExercises && today?.exercises && (
            <View style={styles.exerciseList}>
              {today.exercises.map((ex, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.exerciseRow}
                  onPress={() => setSelectedExercise(ex)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.exerciseName}>{ex.name}</Text>
                  <Text style={styles.exerciseMeta}>{ex.sets}×{ex.reps} · {ex.weight}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </TouchableOpacity>}

        {/* Week grid */}
        <Text style={styles.sectionLabel}>THIS WEEK</Text>
        <View style={styles.weekGrid}>
          {orderedSchedule.map((w, i) => (
            <View
              key={i}
              style={[
                styles.weekCell,
                w.status === 'today' && styles.weekCellToday,
                w.status === 'done'  && styles.weekCellDone,
              ]}
            >
              <View>
                <Text style={[styles.weekDay, w.status === 'today' && styles.weekDayToday]}>{w.day}</Text>
                <Text style={[styles.weekType, w.status === 'today' && styles.weekTypeToday, w.status === 'done' && { color: Colors.muted }]}>
                  {w.type}
                </Text>
              </View>
              <Text style={[styles.statusIcon, w.status === 'today' && styles.statusIconToday, w.status === 'done' && { color: Colors.lime }]}>
                {STATUS_ICON[w.status as WorkoutStatus]}
              </Text>
            </View>
          ))}
        </View>

        {/* Agent note */}
        <AgentNote message={agentNote} />

        {/* Progress link */}
        <TouchableOpacity onPress={onViewHistory} style={styles.historyLink}>
          <Text style={styles.historyLinkText}>View Progress →</Text>
        </TouchableOpacity>
      </ScrollView>
      <ExerciseDetailModal
        exercise={selectedExercise}
        onClose={() => setSelectedExercise(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1 },
  container: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: Spacing.lg,
  },
  weekLabel: {
    fontSize: 10, color: Colors.muted, fontFamily: FontFamily.mono,
    letterSpacing: 1, marginBottom: 2,
  },
  heading: {
    fontFamily: FontFamily.display, fontSize: 24, color: Colors.text,
  },
  headerRight: { alignItems: 'flex-end', gap: 4 },
  workoutCount: { fontSize: 10, color: Colors.muted, fontFamily: FontFamily.mono, marginTop: 4 },
  gearBtn:  { marginTop: 6, alignSelf: 'flex-end' },
  gearIcon: { fontSize: 18, color: Colors.muted },
  restCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.lg, marginBottom: Spacing.lg,
    borderWidth: 1, borderColor: Colors.border,
  },
  restLabel: {
    fontSize: 10, color: Colors.muted, fontFamily: FontFamily.mono,
    letterSpacing: 1.5, marginBottom: Spacing.xs,
  },
  restTitle: {
    fontFamily: FontFamily.display, fontSize: 22, color: Colors.text, marginBottom: 4,
  },
  restSub: { fontSize: 13, color: Colors.muted },
  todayCard: {
    backgroundColor: Colors.lime, borderRadius: Radius.lg,
    padding: Spacing.lg, marginBottom: Spacing.lg,
  },
  todayLabel: {
    fontSize: 10, color: '#000', fontFamily: FontFamily.mono,
    letterSpacing: 1.5, marginBottom: Spacing.xs,
  },
  todayTitle: {
    fontFamily: FontFamily.display, fontSize: 22, fontWeight: 'bold', color: '#000',
  },
  todaySub: { fontSize: 13, color: '#333', marginVertical: Spacing.sm },
  todayActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  startBtn: {
    backgroundColor: '#000', borderRadius: Radius.sm,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
  },
  startBtnText: {
    color: Colors.lime, fontSize: 12, fontFamily: FontFamily.mono, letterSpacing: 1,
  },
  viewBtn: {
    borderRadius: Radius.sm, borderWidth: 1, borderColor: '#00000033',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  viewBtnText: { color: '#000', fontSize: 11, fontFamily: FontFamily.mono, letterSpacing: 1 },
  exerciseList: { marginTop: Spacing.md, gap: 6 },
  exerciseRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: '#00000015', borderRadius: Radius.sm, padding: Spacing.sm,
  },
  exerciseName: { fontSize: 13, color: '#000', fontWeight: '500' },
  exerciseMeta: { fontSize: 11, color: '#333', fontFamily: FontFamily.mono },
  sectionLabel: {
    fontSize: 9, color: Colors.muted, fontFamily: FontFamily.mono,
    letterSpacing: 1.5, marginBottom: Spacing.sm,
  },
  weekGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg,
  },
  weekCell: {
    width: '47%', backgroundColor: Colors.card, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.sm, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center',
  },
  weekCellToday: { borderColor: Colors.lime, backgroundColor: Colors.lime },
  weekDayToday:  { color: '#000' },
  weekTypeToday: { color: '#000' },
  statusIconToday: { color: '#000' },
  weekCellDone:  { borderColor: Colors.dim },
  weekDay: { fontSize: 9, color: Colors.muted, fontFamily: FontFamily.mono },
  weekType: { fontSize: 12, color: Colors.text, marginTop: 2 },
  statusIcon: { fontSize: 14, color: Colors.muted },
  historyLink: { marginTop: Spacing.lg, alignItems: 'center' },
  historyLinkText: { color: Colors.lime, fontFamily: FontFamily.mono, fontSize: 12, letterSpacing: 1 },
});
