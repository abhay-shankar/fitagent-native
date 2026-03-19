import Anthropic from '@anthropic-ai/sdk';
import { OnboardData } from '../screens/OnboardScreen';

const GOAL_LABELS     = ['Build muscle', 'Lose weight', 'Improve endurance', 'General fitness'];
const EQUIP_LABELS    = ['Full gym access', 'Dumbbells / barbell', 'Resistance bands', 'Bodyweight only'];
const LEVEL_LABELS    = ['Beginner', 'Intermediate', 'Advanced'];
const DURATION_LABELS = ['20–30 min', '30–45 min', '45–60 min', '60 min+'];

// ⚠️  Prototype only — move to a backend proxy before shipping.
const client = new Anthropic({
  apiKey: process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '',
  dangerouslyAllowBrowser: true,
});

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

const SYSTEM_PROMPT = `You are a personal AI fitness coach embedded in a workout app.
Keep every response to 1–2 sentences. Be specific, direct, and motivating — sound like a knowledgeable coach, not a generic chatbot.
Never repeat the user's profile back to them verbatim.`;

const FALLBACK_EXERCISES: Exercise[] = [
  { name: 'Push-up',          sets: 3, reps: '10-12', weight: 'Bodyweight' },
  { name: 'Squat',            sets: 3, reps: '12',    weight: '95 lbs' },
  { name: 'Plank',            sets: 3, reps: '30s',   weight: 'Bodyweight' },
  { name: 'Lunge',            sets: 3, reps: '10',    weight: 'Bodyweight' },
  { name: 'Mountain Climber', sets: 3, reps: '20',    weight: 'Bodyweight' },
];

export async function generateWorkoutPlan(profile: OnboardData): Promise<WorkoutPlan> {
  console.log('[generateWorkoutPlan] sessionLength:', profile.sessionLength, '→', DURATION_LABELS[profile.sessionLength]);

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 4096,
    system: `You are a personal AI fitness coach. Respond ONLY with valid JSON — no markdown, no explanation.`,
    messages: [{
      role: 'user',
      content: `Create a full weekly workout plan for this user:
${buildProfileSummary(profile)}

Return a JSON object with exactly this shape:
{
  "totalWeeks": <number between 6 and 12>,
  "todayFocus": "<muscle focus in 1-2 words, e.g. UPPER BODY>",
  "todaySummary": "<short summary of today's workout, e.g. 5 exercises · ~45 min>",
  "weekSchedule": [
    {
      "day": "Mon",
      "type": "<workout type, e.g. Upper Body>",
      "status": "done" | "today" | "rest" | "upcoming",
      "workoutName": "<name, e.g. Push Day A — omit for rest days>",
      "exercises": [
        { "name": "<exercise>", "sets": <number>, "reps": "<e.g. 8-10>", "weight": "<e.g. 60kg or Bodyweight>" }
      ]
    },
    { "day": "Tue", ... },
    { "day": "Wed", ... },
    { "day": "Thu", ... },
    { "day": "Fri", ... },
    { "day": "Sat", ... },
    { "day": "Sun", ... }
  ]
}

CRITICAL RULES — follow exactly:
- Exactly 7 entries in weekSchedule (Mon–Sun)
- EXACTLY ${profile.daysPerWeek} days must be training days — no more, no less. The remaining ${7 - profile.daysPerWeek} days must be rest days.
- Exactly one training day must have status "today", the rest "upcoming"
- Rest days: status "rest", type "Rest", no workoutName or exercises field
- Training days: vary workouts across the week — no repeated sessions
- Avoid exercises that strain: ${profile.injuries || 'none'}
- Match intensity and weights to experience level
- Weight should be "Bodyweight" if equipment is bodyweight only, otherwise suggest realistic starting weights in pounds (lbs)
- Session length is "${DURATION_LABELS[profile.sessionLength]}" — strictly follow these exercise/set limits:
  - 20–30 min → max 3 exercises, max 2 sets each
  - 30–45 min → max 4 exercises, max 3 sets each
  - 45–60 min → max 5 exercises, max 3 sets each
  - 60 min+   → max 6 exercises, max 4 sets each`,
    }],
  });

  const block = response.content[0];
  const raw = block.type === 'text' ? block.text.trim() : '';
  // Strip markdown code fences if Claude wrapped the JSON
  const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

  try {
    const plan = JSON.parse(text) as WorkoutPlan;

    // Enforce session length limits
    const limits: Record<number, { exercises: number; sets: number }> = {
      0: { exercises: 3, sets: 2 }, // 20–30 min
      1: { exercises: 4, sets: 3 }, // 30–45 min
      2: { exercises: 5, sets: 3 }, // 45–60 min
      3: { exercises: 6, sets: 4 }, // 60 min+
    };
    const limit = limits[profile.sessionLength] ?? limits[1];
    for (const day of plan.weekSchedule) {
      if (day.exercises) {
        day.exercises = day.exercises.slice(0, limit.exercises).map(ex => ({
          ...ex,
          sets: Math.min(ex.sets, limit.sets),
        }));
      }
    }

    // Enforce daysPerWeek — if Claude returned too many training days, convert extras to rest
    const trainingDays = plan.weekSchedule.filter(d => d.status !== 'rest');
    if (trainingDays.length > profile.daysPerWeek) {
      let excess = trainingDays.length - profile.daysPerWeek;
      // Convert from the end (keep "today" and earliest days)
      for (let i = plan.weekSchedule.length - 1; i >= 0 && excess > 0; i--) {
        const day = plan.weekSchedule[i];
        if (day.status === 'upcoming') {
          plan.weekSchedule[i] = { day: day.day, type: 'Rest', status: 'rest' };
          excess--;
        }
      }
    }

    // Recompute todaySummary to reflect enforced exercise count
    const today = plan.weekSchedule.find(d => d.status === 'today');
    if (today?.exercises) {
      plan.todaySummary = `${today.exercises.length} exercises · ~${DURATION_LABELS[profile.sessionLength]}`;
    }

    return plan;
  } catch (e) {
    console.warn('[generateWorkoutPlan] parse/enforce failed:', e, '\nRaw text:', text.slice(0, 300));
    return {
      totalWeeks: 8,
      todayFocus: 'FULL BODY',
      todaySummary: `3 exercises · ~${DURATION_LABELS[profile.sessionLength]}`,
      weekSchedule: [
        { day: 'Mon', type: 'Upper Body', status: 'done',     workoutName: 'Push Day A', exercises: FALLBACK_EXERCISES },
        { day: 'Tue', type: 'Rest',       status: 'rest' },
        { day: 'Wed', type: 'Lower Body', status: 'today',    workoutName: 'Leg Day A',  exercises: FALLBACK_EXERCISES },
        { day: 'Thu', type: 'Rest',       status: 'rest' },
        { day: 'Fri', type: 'Full Body',  status: 'upcoming', workoutName: 'Full Body A', exercises: FALLBACK_EXERCISES },
        { day: 'Sat', type: 'Rest',       status: 'rest' },
        { day: 'Sun', type: 'Rest',       status: 'rest' },
      ],
    };
  }
}

export async function generateDashboardNote(profile: OnboardData, plan: WorkoutPlan): Promise<string> {
  const today        = plan.weekSchedule.find(d => d.status === 'today');
  const completedDays = plan.weekSchedule.filter(d => d.status === 'done').length;
  const trainingDays  = plan.weekSchedule.filter(d => d.status !== 'rest').length;

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 150,
    system: SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: `User profile:\n${buildProfileSummary(profile)}\n\n` +
        `This is a brand new user who just completed onboarding and is about to start their very first workout.\n` +
        `Plan: ${plan.totalWeeks} weeks total. Today is Day 1, Week 1.\n` +
        `First workout: ${today?.workoutName ?? 'Rest'} — ${plan.todayFocus} (${plan.todaySummary}).\n\n` +
        `Write a short welcome note for the dashboard. Acknowledge this is the start of their journey and set the tone for their first session.`,
    }],
  });

  const block = response.content[0];
  return block.type === 'text' ? block.text : '';
}

export async function generateHistoryInsight(profile: OnboardData): Promise<string> {
  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 150,
    system: SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: `User profile:\n${buildProfileSummary(profile)}\n\n` +
        `Progress stats: 11 total workouts, 6-day streak, 78% adherence.\n` +
        `Bench press progression over 7 weeks: 50 → 55 → 55 → 60 → 60 → 60 → 65 kg (+30%).\n\n` +
        `Write a short insight about their progress and one specific suggestion to keep improving.`,
    }],
  });

  const historyBlock = response.content[0];
  return historyBlock.type === 'text' ? historyBlock.text : '';
}

export interface CheckinData {
  workoutName: string;
  difficulty: number | null;   // 0=Too Easy, 1=Just Right, 2=Too Hard
  exerciseFeel: Record<number, number>; // index → 0/1/2
  exerciseNames: string[];
  note: string;
}

export type ChangeType = 'increase' | 'caution' | 'modified';

export interface AgentReview {
  observations: string[];
  changes: { change: string; old: string; next: string; type: ChangeType }[];
}

const DIFFICULTY_LABELS = ['Too Easy', 'Just Right', 'Too Hard'];
const FEEL_LABELS = ['Struggled', 'Good', 'Strong'];

export async function generateAgentReview(
  profile: OnboardData,
  checkin: CheckinData,
): Promise<AgentReview> {
  const exerciseSummary = checkin.exerciseNames
    .map((name, i) => {
      const feel = checkin.exerciseFeel[i] !== undefined
        ? FEEL_LABELS[checkin.exerciseFeel[i]]
        : 'Not rated';
      return `- ${name}: ${feel}`;
    })
    .join('\n');

  const reviewResponse = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 1024,
    system: `You are a personal AI fitness coach. Respond ONLY with valid JSON — no markdown, no explanation.`,
    messages: [{
      role: 'user',
      content: `User profile:\n${buildProfileSummary(profile)}\n\n` +
        `Just completed: ${checkin.workoutName}\n` +
        `Overall difficulty: ${checkin.difficulty !== null ? DIFFICULTY_LABELS[checkin.difficulty] : 'Not rated'}\n` +
        `Exercise feedback:\n${exerciseSummary}\n` +
        (checkin.note ? `Notes: ${checkin.note}\n` : '') +
        `\nAnalyze this check-in and return a JSON object with exactly this shape:\n` +
        `{\n` +
        `  "observations": ["<1-2 sentence observation about performance>", "<another observation>"],\n` +
        `  "changes": [\n` +
        `    { "change": "<short label>", "old": "<current value>", "next": "<adjusted value>", "type": "increase" | "caution" | "modified" }\n` +
        `  ]\n` +
        `}\n\n` +
        `RULES:\n` +
        `- 2-3 observations: specific, coach-like, based on the data\n` +
        `- 1-3 changes to the next workout plan (volume, intensity, exercise swaps)\n` +
        `- type "increase" = progression, "caution" = back off, "modified" = swap/change\n` +
        `- old/next should be short concrete values (e.g. "3×10" → "3×12", "60 lbs" → "65 lbs")`,
    }],
  });

  const reviewBlock = reviewResponse.content[0];
  const raw = reviewBlock.type === 'text' ? reviewBlock.text.trim() : '';
  const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

  try {
    return JSON.parse(text) as AgentReview;
  } catch (e) {
    console.warn('[generateAgentReview] parse failed:', e, '\nRaw:', text.slice(0, 200));
    return {
      observations: [
        'Workout logged successfully. Keep showing up — consistency is the foundation.',
        'Your agent will calibrate your next session based on today\'s effort.',
      ],
      changes: [
        { change: 'Volume', old: 'Current plan', next: 'Adjusted next session', type: 'modified' },
      ],
    };
  }
}
