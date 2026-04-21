import { OLLAMA_BASE_URL, OLLAMA_MODEL } from '../config';
import { OnboardData } from '../screens/OnboardScreen';
import {
  WorkoutPlan, Exercise, AgentReview, CheckinData,
} from './claude';

const GOAL_LABELS     = ['Build muscle', 'Lose weight', 'Improve endurance', 'General fitness'];
const EQUIP_LABELS    = ['Full gym access', 'Dumbbells / barbell', 'Resistance bands', 'Bodyweight only'];
const LEVEL_LABELS    = ['Beginner', 'Intermediate', 'Advanced'];
const DURATION_LABELS = ['20–30 min', '30–45 min', '45–60 min', '60 min+'];
const DIFFICULTY_LABELS = ['Too Easy', 'Just Right', 'Too Hard'];
const FEEL_LABELS       = ['Struggled', 'Good', 'Strong'];

function buildProfileSummary(profile: OnboardData): string {
  const goals    = profile.goals.map(i => GOAL_LABELS[i]).join(' & ');
  const equip    = EQUIP_LABELS[profile.equipment[0]] ?? 'unknown';
  const level    = LEVEL_LABELS[profile.level] ?? 'unknown';
  const duration = DURATION_LABELS[profile.sessionLength] ?? 'unknown';
  const injuries = profile.injuries?.trim() || 'none';
  return [
    `Goals: ${goals}`,
    `Equipment: ${equip}`,
    `Experience: ${level}`,
    `Session length: ${duration}`,
    `Days/week: ${profile.daysPerWeek}`,
    `Injuries/limitations: ${injuries}`,
  ].join('\n');
}

async function chat(messages: { role: string; content: string }[], json = false): Promise<string> {
  const body: Record<string, unknown> = {
    model: OLLAMA_MODEL,
    messages,
    stream: false,
  };
  if (json) body.format = 'json';

  const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`Ollama error ${res.status}`);
  const data = await res.json();
  return (data.message?.content ?? '') as string;
}

export async function generateWorkoutPlan(profile: OnboardData): Promise<WorkoutPlan> {
  const limits: Record<number, { exercises: number; sets: number }> = {
    0: { exercises: 3, sets: 2 },
    1: { exercises: 4, sets: 3 },
    2: { exercises: 5, sets: 3 },
    3: { exercises: 6, sets: 4 },
  };
  const limit = limits[profile.sessionLength] ?? limits[1];

  const exerciseNote = '';

  const text = await chat([
    {
      role: 'system',
      content: 'You are a personal AI fitness coach. Respond ONLY with valid JSON — no markdown, no explanation.',
    },
    {
      role: 'user',
      content: `Create a weekly workout plan for this user:\n${buildProfileSummary(profile)}\n${exerciseNote}\n` +
        `Return JSON with this exact shape:\n` +
        `{"totalWeeks":<6-12>,"todayFocus":"<e.g. UPPER BODY>","todaySummary":"<e.g. 3 exercises · ~20-30 min>",` +
        `"weekSchedule":[{"day":"Mon","type":"<type>","status":"done"|"today"|"rest"|"upcoming",` +
        `"workoutName":"<name, omit for rest>","exercises":[{"name":"<name>","sets":<n>,"reps":"<e.g. 8-10>","weight":"<e.g. 60 lbs or Bodyweight>"}]},...7 days total]}\n\n` +
        `RULES:\n` +
        `- Exactly 7 days (Mon-Sun)\n` +
        `- Exactly ${profile.daysPerWeek} training days, rest are "rest" status\n` +
        `- Exactly one training day has status "today"\n` +
        `- Rest days: status "rest", type "Rest", no workoutName or exercises\n` +
        `- Max ${limit.exercises} exercises and ${limit.sets} sets per exercise\n` +
        `- Avoid: ${profile.injuries || 'none'}`,
    },
  ], true);

  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

  try {
    const plan = JSON.parse(cleaned) as WorkoutPlan;

    // Enforce limits
    for (const day of plan.weekSchedule) {
      if (day.exercises) {
        day.exercises = day.exercises.slice(0, limit.exercises).map(ex => ({
          ...ex,
          sets: Math.min(ex.sets, limit.sets),
        }));
      }
    }

    // Enforce daysPerWeek
    const trainingDays = plan.weekSchedule.filter(d => d.status !== 'rest');
    if (trainingDays.length > profile.daysPerWeek) {
      let excess = trainingDays.length - profile.daysPerWeek;
      for (let i = plan.weekSchedule.length - 1; i >= 0 && excess > 0; i--) {
        if (plan.weekSchedule[i].status === 'upcoming') {
          plan.weekSchedule[i] = { day: plan.weekSchedule[i].day, type: 'Rest', status: 'rest' };
          excess--;
        }
      }
    }

    const today = plan.weekSchedule.find(d => d.status === 'today');
    if (today?.exercises) {
      plan.todaySummary = `${today.exercises.length} exercises · ~${DURATION_LABELS[profile.sessionLength]}`;
    }

    return plan;
  } catch {
    const fallback: Exercise[] = [
      { name: 'Push-up', sets: limit.sets, reps: '10-12', weight: 'Bodyweight' },
      { name: 'Squat',   sets: limit.sets, reps: '12',    weight: '95 lbs' },
      { name: 'Plank',   sets: limit.sets, reps: '30s',   weight: 'Bodyweight' },
    ].slice(0, limit.exercises);

    return {
      totalWeeks: 8,
      todayFocus: 'FULL BODY',
      todaySummary: `${fallback.length} exercises · ~${DURATION_LABELS[profile.sessionLength]}`,
      weekSchedule: [
        { day: 'Mon', type: 'Rest',       status: 'rest' },
        { day: 'Tue', type: 'Upper Body', status: 'today',    workoutName: 'Push Day A',  exercises: fallback },
        { day: 'Wed', type: 'Rest',       status: 'rest' },
        { day: 'Thu', type: 'Lower Body', status: 'upcoming', workoutName: 'Leg Day A',   exercises: fallback },
        { day: 'Fri', type: 'Rest',       status: 'rest' },
        { day: 'Sat', type: 'Full Body',  status: 'upcoming', workoutName: 'Full Body A', exercises: fallback },
        { day: 'Sun', type: 'Rest',       status: 'rest' },
      ],
    };
  }
}

export async function generateDashboardNote(profile: OnboardData, plan: WorkoutPlan): Promise<string> {
  const today = plan.weekSchedule.find(d => d.status === 'today');
  return chat([
    {
      role: 'system',
      content: 'You are a personal AI fitness coach. Keep responses to 1-2 sentences. Be specific and motivating.',
    },
    {
      role: 'user',
      content: `User profile:\n${buildProfileSummary(profile)}\n\n` +
        `Brand new user, Day 1 Week 1. First workout: ${today?.workoutName ?? 'Rest'} — ${plan.todayFocus} (${plan.todaySummary}).\n\n` +
        `Write a short welcome note for the dashboard.`,
    },
  ]);
}

export async function generateAgentReview(
  profile: OnboardData,
  checkin: CheckinData,
): Promise<AgentReview> {
  const exerciseSummary = checkin.exerciseNames
    .map((name, i) => `- ${name}: ${checkin.exerciseFeel[i] !== undefined ? FEEL_LABELS[checkin.exerciseFeel[i]] : 'Not rated'}`)
    .join('\n');

  const text = await chat([
    {
      role: 'system',
      content: 'You are a personal AI fitness coach. Respond ONLY with valid JSON — no markdown, no explanation.',
    },
    {
      role: 'user',
      content: `User profile:\n${buildProfileSummary(profile)}\n\n` +
        `Completed: ${checkin.workoutName}\n` +
        `Difficulty: ${checkin.difficulty !== null ? DIFFICULTY_LABELS[checkin.difficulty] : 'Not rated'}\n` +
        `Exercise feedback:\n${exerciseSummary}\n` +
        (checkin.note ? `Notes: ${checkin.note}\n` : '') +
        `\nReturn JSON: {"observations":["<observation>","<observation>"],"changes":[{"change":"<label>","old":"<value>","next":"<value>","type":"increase"|"caution"|"modified"}]}`,
    },
  ], true);

  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  try {
    return JSON.parse(cleaned) as AgentReview;
  } catch {
    return {
      observations: ['Workout logged. Your agent will calibrate your next session.'],
      changes: [{ change: 'Volume', old: 'Current', next: 'Adjusted', type: 'modified' }],
    };
  }
}
