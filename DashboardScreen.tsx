import React from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView,
} from 'react-native';
import { Colors, FontFamily, Radius, Spacing } from '../tokens';
import { Badge, AgentNote } from '../components/ui';

type WorkoutStatus = 'done' | 'today' | 'rest' | 'upcoming';

const WEEK: { day: string; type: string; status: WorkoutStatus }[] = [
  { day: 'Mon', type: 'Lower Body',  status: 'done' },
  { day: 'Tue', type: 'Rest',        status: 'rest' },
  { day: 'Wed', type: 'Upper Body',  status: 'today' },
  { day: 'Thu', type: 'Cardio',      status: 'upcoming' },
  { day: 'Fri', type: 'Full Body',   status: 'upcoming' },
  { day: 'Sat–Sun', type: 'Rest',    status: 'rest' },
];

const STATUS_ICON: Record<WorkoutStatus, string> = {
  done: '✓', today: '▶', rest: '—', upcoming: '·',
};

interface Props {
  onStartWorkout: () => void;
  onViewHistory: () => void;
}

export default function DashboardScreen({ onStartWorkout, onViewHistory }: Props) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.weekLabel}>WEEK 3 OF 8</Text>
            <Text style={styles.heading}>Your Plan</Text>
          </View>
          <View style={styles.headerRight}>
            <Badge color={Colors.lime}>On Track</Badge>
            <Text style={styles.workoutCount}>3/4 workouts</Text>
          </View>
        </View>

        {/* Today card */}
        <TouchableOpacity style={styles.todayCard} onPress={onStartWorkout} activeOpacity={0.85}>
          <Text style={styles.todayLabel}>TODAY · UPPER BODY</Text>
          <Text style={styles.todayTitle}>Push Day A</Text>
          <Text style={styles.todaySub}>5 exercises · ~45 min</Text>
          <View style={styles.startBtn}>
            <Text style={styles.startBtnText}>START WORKOUT →</Text>
          </View>
        </TouchableOpacity>

        {/* Week grid */}
        <Text style={styles.sectionLabel}>THIS WEEK</Text>
        <View style={styles.weekGrid}>
          {WEEK.map((w, i) => (
            <View
              key={i}
              style={[
                styles.weekCell,
                w.status === 'today' && styles.weekCellToday,
                w.status === 'done'  && styles.weekCellDone,
              ]}
            >
              <View>
                <Text style={styles.weekDay}>{w.day}</Text>
                <Text style={[styles.weekType, w.status === 'done' && { color: Colors.muted }]}>
                  {w.type}
                </Text>
              </View>
              <Text style={[styles.statusIcon, w.status === 'done' && { color: Colors.lime }]}>
                {STATUS_ICON[w.status]}
              </Text>
            </View>
          ))}
        </View>

        {/* Agent note */}
        <AgentNote message="You crushed Monday's squats. I've added 5kg to Friday's deadlift progression." />

        {/* Progress link */}
        <TouchableOpacity onPress={onViewHistory} style={styles.historyLink}>
          <Text style={styles.historyLinkText}>View Progress →</Text>
        </TouchableOpacity>
      </ScrollView>
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
  startBtn: {
    backgroundColor: '#000', borderRadius: Radius.sm,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    alignSelf: 'flex-start',
  },
  startBtnText: {
    color: Colors.lime, fontSize: 12, fontFamily: FontFamily.mono, letterSpacing: 1,
  },
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
  weekCellToday: { borderColor: Colors.lime, backgroundColor: Colors.lime + '15' },
  weekCellDone:  { borderColor: Colors.dim },
  weekDay: { fontSize: 9, color: Colors.muted, fontFamily: FontFamily.mono },
  weekType: { fontSize: 12, color: Colors.text, marginTop: 2 },
  statusIcon: { fontSize: 14, color: Colors.muted },
  historyLink: { marginTop: Spacing.lg, alignItems: 'center' },
  historyLinkText: { color: Colors.lime, fontFamily: FontFamily.mono, fontSize: 12, letterSpacing: 1 },
});
