import { OnboardData } from '../screens/OnboardScreen';
import { AI_PROVIDER } from '../config';
import * as Ollama from './ollama';
import { callEdgeFunction } from './supabase';

export interface Exercise {
  name: string;
  sets: number;
  reps: string;
  weight: string;
}

export interface DayPlan {
  day: string;
  type: string;
  status: 'done' | 'today' | 'rest' | 'upcoming';
  workoutName?: string;
  exercises?: Exercise[];
}

export interface WorkoutPlan {
  totalWeeks: number;
  weekSchedule: DayPlan[];
  todayFocus: string;
  todaySummary: string;
}

export interface CheckinData {
  workoutName: string;
  difficulty: number | null;
  exerciseFeel: Record<number, number>;
  exerciseNames: string[];
  note: string;
}

export type ChangeType = 'increase' | 'caution' | 'modified';

export interface AgentReview {
  observations: string[];
  changes: { change: string; old: string; next: string; type: ChangeType }[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function mapScheduleToCalendar(plan: WorkoutPlan): WorkoutPlan {
  const todayIndex = new Date().getDay(); // 0=Sun, 1=Mon, …

  const schedule: DayPlan[] = plan.weekSchedule.map((d, i) => ({
    ...d,
    day: DAY_NAMES[(todayIndex + i) % 7],
    status: i === 0 ? 'today' : d.status === 'rest' ? 'rest' : 'upcoming',
  }));

  const today = schedule[0];
  return {
    ...plan,
    weekSchedule: schedule,
    todayFocus: today.type?.toUpperCase() ?? plan.todayFocus,
  };
}

// ─── Edge function calls ──────────────────────────────────────────────────────

async function claudeGenerateWorkoutPlan(profile: OnboardData): Promise<WorkoutPlan> {
  const { loadHistory } = await import('./storage');
  const history = await loadHistory();
  const recentWorkouts = history.slice(0, 2).map(w => ({
    workoutName:  w.workoutName,
    difficulty:   w.difficulty,
    exerciseNames: w.exerciseNames,
    exerciseFeel:  w.exerciseFeel,
    note:          w.note,
  }));
  const plan = await callEdgeFunction<WorkoutPlan>('claude', {
    action: 'generateWorkoutPlan',
    payload: { profile, recentWorkouts },
  });
  return mapScheduleToCalendar(plan);
}

async function claudeGenerateDashboardNote(profile: OnboardData, plan: WorkoutPlan): Promise<string> {
  const result = await callEdgeFunction<string>('claude', { action: 'generateDashboardNote', payload: { profile, plan } });
  return result ?? '';
}

async function claudeGenerateHistoryInsight(
  profile: OnboardData,
  stats: { total: number; streak: number; adherence: string },
  recentWorkouts: { workoutName: string; difficulty: number | null }[],
): Promise<string> {
  const result = await callEdgeFunction<string>('claude', {
    action: 'generateHistoryInsight',
    payload: { profile, stats, recentWorkouts },
  });
  return result ?? '';
}

async function claudeGenerateAgentReview(profile: OnboardData, checkin: CheckinData): Promise<AgentReview> {
  return callEdgeFunction<AgentReview>('claude', { action: 'generateAgentReview', payload: { profile, checkin } });
}

// ─── Provider routing ─────────────────────────────────────────────────────────

export const generateWorkoutPlan = (profile: OnboardData) =>
  AI_PROVIDER === 'ollama' ? Ollama.generateWorkoutPlan(profile) : claudeGenerateWorkoutPlan(profile);

export const generateDashboardNote = (profile: OnboardData, plan: WorkoutPlan) =>
  AI_PROVIDER === 'ollama' ? Ollama.generateDashboardNote(profile, plan) : claudeGenerateDashboardNote(profile, plan);

export const generateHistoryInsight = (
  profile: OnboardData,
  stats: { total: number; streak: number; adherence: string },
  recentWorkouts: { workoutName: string; difficulty: number | null }[],
) =>
  AI_PROVIDER === 'ollama'
    ? Promise.resolve('Keep logging your workouts — your agent will build insights as your history grows.')
    : claudeGenerateHistoryInsight(profile, stats, recentWorkouts);

export const generateAgentReview = (profile: OnboardData, checkin: CheckinData) =>
  AI_PROVIDER === 'ollama' ? Ollama.generateAgentReview(profile, checkin) : claudeGenerateAgentReview(profile, checkin);

// ─── Voice parsing (always uses edge function) ────────────────────────────────

export interface VoiceLogResult {
  weight: string | null;
  reps: string | null;
  sets: number | null;
  action: 'next_set' | 'next_exercise' | null;
}

export interface VoiceCheckinResult {
  difficulty: number | null;
  exerciseFeel: Record<number, number> | null;
  note: string | null;
}

export async function parseVoiceLog(transcript: string, exerciseName: string): Promise<VoiceLogResult> {
  return callEdgeFunction<VoiceLogResult>('claude', {
    action: 'parseVoiceLog',
    payload: { transcript, exerciseName },
  });
}

export async function parseVoiceCheckin(transcript: string, exerciseNames: string[]): Promise<VoiceCheckinResult> {
  return callEdgeFunction<VoiceCheckinResult>('claude', {
    action: 'parseVoiceCheckin',
    payload: { transcript, exerciseNames },
  });
}
