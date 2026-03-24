import AsyncStorage from '@react-native-async-storage/async-storage';
import { CheckinData } from './claude';

const HISTORY_KEY      = '@fitagent/workout_history';
const DASHBOARD_NOTE_KEY = '@fitagent/dashboard_note';

export interface WorkoutEntry {
  id: string;           // timestamp string used as unique key
  date: string;         // ISO date string e.g. "2026-03-19"
  workoutName: string;
  difficulty: number | null;
  exerciseNames: string[];
  exerciseFeel: Record<number, number>;
  note: string;
}

export async function saveWorkout(checkin: CheckinData): Promise<void> {
  const existing = await loadHistory();
  const entry: WorkoutEntry = {
    id: Date.now().toString(),
    date: new Date().toISOString().split('T')[0],
    workoutName: checkin.workoutName,
    difficulty: checkin.difficulty,
    exerciseNames: checkin.exerciseNames,
    exerciseFeel: checkin.exerciseFeel,
    note: checkin.note,
  };
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify([entry, ...existing]));
}

export async function loadHistory(): Promise<WorkoutEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as WorkoutEntry[]) : [];
  } catch {
    return [];
  }
}

export async function getCachedDashboardNote(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(DASHBOARD_NOTE_KEY);
  } catch {
    return null;
  }
}

export async function cacheDashboardNote(note: string): Promise<void> {
  await AsyncStorage.setItem(DASHBOARD_NOTE_KEY, note);
}

export function calcStats(history: WorkoutEntry[]): {
  total: number;
  streak: number;
  adherence: string;
} {
  const total = history.length;

  if (total === 0) return { total: 0, streak: 0, adherence: '—' };

  // Streak: count consecutive days going back from today
  const dates = new Set(history.map(e => e.date));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const iso = d.toISOString().split('T')[0];
    if (dates.has(iso)) {
      streak++;
    } else if (i > 0) {
      break; // gap found — stop counting
    }
  }

  // Adherence: workouts / days elapsed since first entry
  const firstDate = new Date(history[history.length - 1].date);
  const daysSinceFirst = Math.max(
    1,
    Math.floor((today.getTime() - firstDate.getTime()) / 86_400_000) + 1,
  );
  const pct = Math.min(100, Math.round((total / daysSinceFirst) * 100));
  const adherence = `${pct}%`;

  return { total, streak, adherence };
}
