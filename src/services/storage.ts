import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { CheckinData, WorkoutPlan } from './claude';
import { OnboardData } from '../screens/OnboardScreen';

const DASHBOARD_NOTE_KEY      = '@fitagent/dashboard_note';
const DASHBOARD_NOTE_DATE_KEY = '@fitagent/dashboard_note_date';

export interface WorkoutEntry {
  id: string;
  date: string;
  workoutName: string;
  difficulty: number | null;
  exerciseNames: string[];
  exerciseFeel: Record<number, number>;
  note: string;
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export async function saveProfile(profile: OnboardData): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('profiles').upsert({
    user_id: user.id,
    goals: profile.goals,
    equipment: profile.equipment,
    days_per_week: profile.daysPerWeek,
    session_length: profile.sessionLength,
    level: profile.level,
    injuries: profile.injuries ?? '',
  });
}

export async function loadProfile(): Promise<OnboardData | null> {
  const { data, error } = await supabase.from('profiles').select('*').single();
  if (error || !data) return null;
  return {
    goals: data.goals,
    equipment: data.equipment,
    daysPerWeek: data.days_per_week,
    sessionLength: data.session_length,
    level: data.level,
    injuries: data.injuries,
  };
}

// ─── Plan ─────────────────────────────────────────────────────────────────────

export async function savePlan(plan: WorkoutPlan): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('workout_plans').upsert({
    user_id: user.id,
    plan,
    updated_at: new Date().toISOString(),
  });
}

export async function loadPlan(): Promise<WorkoutPlan | null> {
  const { data, error } = await supabase.from('workout_plans').select('plan').single();
  if (error || !data) return null;
  return data.plan as WorkoutPlan;
}

// ─── Workout history ──────────────────────────────────────────────────────────

export async function saveWorkout(checkin: CheckinData): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('workout_history').insert({
    user_id: user.id,
    date: new Date().toISOString().split('T')[0],
    workout_name: checkin.workoutName,
    difficulty: checkin.difficulty,
    exercise_names: checkin.exerciseNames,
    exercise_feel: checkin.exerciseFeel,
    note: checkin.note,
  });
}

export async function loadHistory(): Promise<WorkoutEntry[]> {
  const { data, error } = await supabase
    .from('workout_history')
    .select('*')
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map(row => ({
    id: row.id,
    date: row.date,
    workoutName: row.workout_name,
    difficulty: row.difficulty,
    exerciseNames: row.exercise_names,
    exerciseFeel: row.exercise_feel,
    note: row.note,
  }));
}

// ─── Dashboard note cache (stays local) ──────────────────────────────────────

export async function getCachedDashboardNote(): Promise<string | null> {
  try {
    const [note, date] = await Promise.all([
      AsyncStorage.getItem(DASHBOARD_NOTE_KEY),
      AsyncStorage.getItem(DASHBOARD_NOTE_DATE_KEY),
    ]);
    const today = new Date().toISOString().split('T')[0];
    if (note && date === today) return note;
    return null; // stale or missing — caller should regenerate
  } catch {
    return null;
  }
}

export async function cacheDashboardNote(note: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  await Promise.all([
    AsyncStorage.setItem(DASHBOARD_NOTE_KEY, note),
    AsyncStorage.setItem(DASHBOARD_NOTE_DATE_KEY, today),
  ]);
}

// ─── Account deletion ─────────────────────────────────────────────────────────

export async function deleteAccount(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const res = await fetch(
    `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/delete-account`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    }
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? 'Failed to delete account');
  }

  // Clear all local cache
  await AsyncStorage.multiRemove([DASHBOARD_NOTE_KEY, DASHBOARD_NOTE_DATE_KEY]);
}

// ─── Stats ───────────────────────────────────────────────────────────────────

export function calcStats(history: WorkoutEntry[]): {
  total: number; streak: number; adherence: string;
} {
  const total = history.length;
  if (total === 0) return { total: 0, streak: 0, adherence: '—' };

  const dates = new Set(history.map(e => e.date));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const iso = d.toISOString().split('T')[0];
    if (dates.has(iso)) streak++;
    else if (i > 0) break;
  }

  const firstDate = new Date(history[history.length - 1].date);
  const daysSinceFirst = Math.max(1, Math.floor((today.getTime() - firstDate.getTime()) / 86_400_000) + 1);
  const pct = Math.min(100, Math.round((total / daysSinceFirst) * 100));

  return { total, streak, adherence: `${pct}%` };
}
