import { corsHeaders } from '../_shared/cors.ts';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
const RAPIDAPI_KEY = Deno.env.get('RAPIDAPI_KEY') ?? '';

// ─── Labels (mirrors client OnboardScreen constants) ────────────────────────
const GOAL_LABELS     = ['Build muscle', 'Lose weight', 'Improve endurance', 'General fitness'];
const EQUIP_LABELS    = ['Full gym access', 'Dumbbells / barbell', 'Resistance bands', 'Bodyweight only'];
const LEVEL_LABELS    = ['Beginner', 'Intermediate', 'Advanced'];
const DURATION_LABELS = ['20–30 min', '30–45 min', '45–60 min', '60 min+'];
const DIFFICULTY_LABELS = ['Too Easy', 'Just Right', 'Too Hard'];
const FEEL_LABELS = ['Struggled', 'Good', 'Strong'];

const EQUIPMENT_MAP: Record<number, string[]> = {
  0: ['barbell', 'dumbbell', 'cable', 'machine', 'leverage machine'],
  1: ['barbell', 'dumbbell', 'ez barbell', 'kettlebell'],
  2: ['band'],
  3: ['body weight'],
};

const RAPIDAPI_HEADERS = {
  'X-RapidAPI-Key': RAPIDAPI_KEY,
  'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com',
};

const SYSTEM_PROMPT = `You are a personal AI fitness coach embedded in a workout app.
Keep every response to 1–2 sentences. Be specific, direct, and motivating — sound like a knowledgeable coach, not a generic chatbot.
Never repeat the user's profile back to them verbatim.`;

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildProfileSummary(profile: OnboardData): string {
  const goals    = profile.goals.map((i: number) => GOAL_LABELS[i]).join(' & ');
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

async function callClaude(body: object): Promise<{ content: { type: string; text: string }[] }> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${err}`);
  }
  return res.json();
}

async function fetchExercisesByEquipment(equipmentIndex: number): Promise<string[]> {
  const types = EQUIPMENT_MAP[equipmentIndex] ?? ['body weight'];
  const names = new Set<string>();

  for (const type of types) {
    try {
      const encoded = encodeURIComponent(type);
      const res = await fetch(
        `https://exercisedb.p.rapidapi.com/exercises/equipment/${encoded}?limit=30&offset=0`,
        { headers: RAPIDAPI_HEADERS },
      );
      if (!res.ok) continue;
      const data = await res.json();
      for (const ex of data) {
        if (ex?.name) names.add(ex.name as string);
      }
    } catch { /* silent */ }
  }

  return Array.from(names);
}

function extractJson(raw: string): string {
  return raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
}

// ─── Types (mirrors client types) ───────────────────────────────────────────

interface OnboardData {
  goals: number[];
  equipment: number[];
  daysPerWeek: number;
  sessionLength: number;
  level: number;
  injuries?: string;
}

interface Exercise {
  name: string;
  sets: number;
  reps: string;
  weight: string;
}

interface DayPlan {
  day: string;
  type: string;
  status: 'done' | 'today' | 'rest' | 'upcoming';
  workoutName?: string;
  exercises?: Exercise[];
}

interface WorkoutPlan {
  totalWeeks: number;
  weekSchedule: DayPlan[];
  todayFocus: string;
  todaySummary: string;
}

interface CheckinData {
  workoutName: string;
  difficulty: number | null;
  exerciseFeel: Record<number, number>;
  exerciseNames: string[];
  note: string;
}

// ─── Action handlers ─────────────────────────────────────────────────────────

const FALLBACK_EXERCISES: Exercise[] = [
  { name: 'Push-up',          sets: 3, reps: '10-12', weight: 'Bodyweight' },
  { name: 'Squat',            sets: 3, reps: '12',    weight: '95 lbs' },
  { name: 'Plank',            sets: 3, reps: '30s',   weight: 'Bodyweight' },
  { name: 'Lunge',            sets: 3, reps: '10',    weight: 'Bodyweight' },
  { name: 'Mountain Climber', sets: 3, reps: '20',    weight: 'Bodyweight' },
];

interface RecentWorkout {
  workoutName: string;
  difficulty: number | null;
  exerciseNames: string[];
  exerciseFeel: Record<number, number>;
  note: string;
}

function buildRecentWorkoutsSummary(recent: RecentWorkout[]): string {
  if (!recent || recent.length === 0) return '';
  const lines = recent.map((w, i) => {
    const diff = w.difficulty !== null ? DIFFICULTY_LABELS[w.difficulty] : 'unrated';
    const feel = w.exerciseNames
      .map((name, j) => w.exerciseFeel[j] !== undefined ? `${name} (${FEEL_LABELS[w.exerciseFeel[j]]})` : null)
      .filter(Boolean).join(', ');
    const note = w.note ? ` — "${w.note}"` : '';
    return `${i + 1}. ${w.workoutName}: ${diff}${feel ? ` · ${feel}` : ''}${note}`;
  });
  return `\nRecent workout history (use to inform weights and exercise selection):\n${lines.join('\n')}\n`;
}

async function handleGenerateWorkoutPlan(profile: OnboardData, recentWorkouts?: RecentWorkout[]): Promise<WorkoutPlan> {
  const exerciseList = await fetchExercisesByEquipment(profile.equipment[0] ?? 3);
  const exerciseNote = exerciseList.length > 0
    ? `\nYou MUST only use exercises from this list:\n${exerciseList.join(', ')}\n`
    : '';
  const historyNote = buildRecentWorkoutsSummary(recentWorkouts ?? []);

  const response = await callClaude({
    model: 'claude-opus-4-6',
    max_tokens: 4096,
    system: 'You are a personal AI fitness coach. Respond ONLY with valid JSON — no markdown, no explanation.',
    messages: [{
      role: 'user',
      content: `Create a full weekly workout plan for this user:
${buildProfileSummary(profile)}
${historyNote}${exerciseNote}
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
    }
  ]
}

CRITICAL RULES — follow exactly:
- Exactly 7 entries in weekSchedule (Mon–Sun)
- EXACTLY ${profile.daysPerWeek} days must be training days — no more, no less. The remaining ${7 - profile.daysPerWeek} days must be rest days.
- The FIRST entry (index 0) MUST be a training day — never a rest day.
- Exactly one training day must have status "today", the rest "upcoming"
- Rest days: status "rest", type "Rest", no workoutName or exercises field
- Training days: vary workouts across the week — no repeated sessions
- Avoid exercises that strain: ${profile.injuries || 'none'}
- Match intensity and weights to experience level
- If recent workout history is provided: slightly increase weights on exercises rated "Strong", keep or reduce for "Struggled", adjust overall volume if difficulty was "Too Easy" or "Too Hard"
- Weight should be "Bodyweight" if equipment is bodyweight only, otherwise suggest realistic starting weights in pounds (lbs)
- Session length is "${DURATION_LABELS[profile.sessionLength]}" — strictly follow these exercise/set limits:
  - 20–30 min → max 3 exercises, max 2 sets each
  - 30–45 min → max 4 exercises, max 3 sets each
  - 45–60 min → max 5 exercises, max 3 sets each
  - 60 min+   → max 6 exercises, max 4 sets each`,
    }],
  });

  const raw = response.content[0]?.text ?? '';
  const text = extractJson(raw);

  try {
    const plan = JSON.parse(text) as WorkoutPlan;

    // Enforce session length limits
    const limits: Record<number, { exercises: number; sets: number }> = {
      0: { exercises: 3, sets: 2 },
      1: { exercises: 4, sets: 3 },
      2: { exercises: 5, sets: 3 },
      3: { exercises: 6, sets: 4 },
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

    // Enforce daysPerWeek
    const trainingDays = plan.weekSchedule.filter(d => d.status !== 'rest');
    if (trainingDays.length > profile.daysPerWeek) {
      let excess = trainingDays.length - profile.daysPerWeek;
      for (let i = plan.weekSchedule.length - 1; i >= 0 && excess > 0; i--) {
        const day = plan.weekSchedule[i];
        if (day.status === 'upcoming') {
          plan.weekSchedule[i] = { day: day.day, type: 'Rest', status: 'rest' };
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
    return {
      totalWeeks: 8,
      todayFocus: 'FULL BODY',
      todaySummary: `3 exercises · ~${DURATION_LABELS[profile.sessionLength]}`,
      weekSchedule: [
        { day: 'Mon', type: 'Upper Body', status: 'done',     workoutName: 'Push Day A',  exercises: FALLBACK_EXERCISES },
        { day: 'Tue', type: 'Rest',       status: 'rest' },
        { day: 'Wed', type: 'Lower Body', status: 'today',    workoutName: 'Leg Day A',   exercises: FALLBACK_EXERCISES },
        { day: 'Thu', type: 'Rest',       status: 'rest' },
        { day: 'Fri', type: 'Full Body',  status: 'upcoming', workoutName: 'Full Body A', exercises: FALLBACK_EXERCISES },
        { day: 'Sat', type: 'Rest',       status: 'rest' },
        { day: 'Sun', type: 'Rest',       status: 'rest' },
      ],
    };
  }
}

async function handleGenerateDashboardNote(profile: OnboardData, plan: WorkoutPlan): Promise<string> {
  const today         = plan.weekSchedule.find(d => d.status === 'today');
  const completedDays = plan.weekSchedule.filter(d => d.status === 'done').length;
  const trainingDays  = plan.weekSchedule.filter(d => d.status !== 'rest').length;
  const isFirstDay    = completedDays === 0;
  const workoutDoneToday = !today;

  let context: string;
  if (isFirstDay) {
    context = `This is their very first workout. First session: ${today?.workoutName ?? 'Rest'} — ${plan.todayFocus} (${plan.todaySummary}). Set an encouraging tone for day one.`;
  } else if (workoutDoneToday) {
    context = `They just completed today's workout. ${completedDays} of ${trainingDays} training days done this week. Acknowledge the effort and encourage recovery before tomorrow.`;
  } else {
    context = `They are ${completedDays} of ${trainingDays} training days into the week. Today's session: ${today?.workoutName} — ${plan.todayFocus} (${plan.todaySummary}). Give a focused, specific nudge for today's workout.`;
  }

  const response = await callClaude({
    model: 'claude-opus-4-6',
    max_tokens: 150,
    system: SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: `User profile:\n${buildProfileSummary(profile)}\n\n${context}\n\nWrite a 1-2 sentence coach note for their dashboard. Be specific to their situation — not generic.`,
    }],
  });

  return response.content[0]?.text ?? '';
}

async function handleGenerateHistoryInsight(
  profile: OnboardData,
  stats: { total: number; streak: number; adherence: string },
  recentWorkouts: { workoutName: string; difficulty: number | null }[],
): Promise<string> {
  const recentSummary = recentWorkouts.length === 0
    ? 'No workouts logged yet.'
    : recentWorkouts
        .slice(0, 5)
        .map(w => `${w.workoutName} — ${w.difficulty !== null ? DIFFICULTY_LABELS[w.difficulty] : 'unrated'}`)
        .join('\n');

  const response = await callClaude({
    model: 'claude-opus-4-6',
    max_tokens: 150,
    system: SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: `User profile:\n${buildProfileSummary(profile)}\n\n` +
        `Progress stats: ${stats.total} total workouts, ${stats.streak}-day streak, ${stats.adherence} adherence.\n` +
        `Recent sessions:\n${recentSummary}\n\n` +
        `Write a short insight about their progress and one specific suggestion to keep improving.`,
    }],
  });

  return response.content[0]?.text ?? '';
}

// ─── Voice: parse workout log ─────────────────────────────────────────────────

async function handleParseVoiceLog(transcript: string, exerciseName: string): Promise<{
  weight: string | null;
  reps: string | null;
  sets: number | null;
  action: 'next_set' | 'next_exercise' | null;
}> {
  const response = await callClaude({
    model: 'claude-opus-4-6',
    max_tokens: 128,
    system: 'You are a workout logging assistant. Respond ONLY with valid JSON — no markdown, no explanation.',
    messages: [{
      role: 'user',
      content: `The user is logging a set for exercise: "${exerciseName}".\nThey said: "${transcript}"\n\nFirst check if they said a navigation command:\n- "next set", "done", "log set", "complete set" → action: "next_set"\n- "next exercise", "skip", "skip exercise" → action: "next_exercise"\n\nIf it's a navigation command, return:\n{ "weight": null, "reps": null, "sets": null, "action": "next_set" | "next_exercise" }\n\nOtherwise extract weight, reps, and sets:\n- Weight: normalize to "<number> lbs" or "<number> kg". Treat "pounds" as lbs. Use "Bodyweight" if bodyweight.\n- Reps: just the number as a string, e.g. "8"\n- Sets: number or null\n\nReturn JSON:\n{\n  "weight": "<e.g. 120 lbs, Bodyweight, or null>",\n  "reps": "<e.g. 8 or null>",\n  "sets": <number or null>,\n  "action": null\n}`,
    }],
  });

  const raw = response.content[0]?.text ?? '{}';
  try {
    return JSON.parse(extractJson(raw));
  } catch {
    return { weight: null, reps: null, sets: null, action: null };
  }
}

// ─── Voice: parse checkin ─────────────────────────────────────────────────────

async function handleParseVoiceCheckin(transcript: string, exerciseNames: string[]): Promise<{
  difficulty: number | null;
  exerciseFeel: Record<number, number> | null;
  note: string | null;
}> {
  const exerciseList = exerciseNames.map((n, i) => `${i}: ${n}`).join(', ');

  const response = await callClaude({
    model: 'claude-opus-4-6',
    max_tokens: 256,
    system: 'You are a workout logging assistant. Respond ONLY with valid JSON — no markdown, no explanation.',
    messages: [{
      role: 'user',
      content: `The user is doing a post-workout check-in.\nThey said: "${transcript}"\n\nExercises by index: ${exerciseList}\n\nExtract:\n- difficulty: 0 (Too Easy), 1 (Just Right), 2 (Too Hard), or null\n- exerciseFeel: object mapping exercise index to 0 (Struggled), 1 (Good), 2 (Strong) — only include exercises mentioned, or null\n- note: any extra notes or general comments as a string, or null\n\nReturn JSON:\n{\n  "difficulty": <0|1|2|null>,\n  "exerciseFeel": { "<index>": <0|1|2> } or null,\n  "note": "<string or null>"\n}`,
    }],
  });

  const raw = response.content[0]?.text ?? '{}';
  try {
    return JSON.parse(extractJson(raw));
  } catch {
    return { difficulty: null, exerciseFeel: null, note: null };
  }
}

// ─── Agent review ─────────────────────────────────────────────────────────────

async function handleGenerateAgentReview(profile: OnboardData, checkin: CheckinData) {
  const exerciseSummary = checkin.exerciseNames
    .map((name: string, i: number) => {
      const feel = checkin.exerciseFeel[i] !== undefined
        ? FEEL_LABELS[checkin.exerciseFeel[i]]
        : 'Not rated';
      return `- ${name}: ${feel}`;
    })
    .join('\n');

  const response = await callClaude({
    model: 'claude-opus-4-6',
    max_tokens: 1024,
    system: 'You are a personal AI fitness coach. Respond ONLY with valid JSON — no markdown, no explanation.',
    messages: [{
      role: 'user',
      content: `User profile:\n${buildProfileSummary(profile)}\n\n` +
        `Just completed: ${checkin.workoutName}\n` +
        `Overall difficulty: ${checkin.difficulty !== null ? DIFFICULTY_LABELS[checkin.difficulty] : 'Not rated'}\n` +
        `Exercise feedback:\n${exerciseSummary}\n` +
        (checkin.note ? `Notes: ${checkin.note}\n` : '') +
        `\nAnalyze this check-in and return a JSON object with exactly this shape:\n` +
        `{\n` +
        `  "observations": ["<1-2 sentence observation>", "<another observation>"],\n` +
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

  const raw = response.content[0]?.text ?? '';
  const text = extractJson(raw);

  try {
    return JSON.parse(text);
  } catch {
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

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, payload } = await req.json();

    let result;
    switch (action) {
      case 'generateWorkoutPlan':
        result = await handleGenerateWorkoutPlan(payload.profile, payload.recentWorkouts);
        break;
      case 'generateDashboardNote':
        result = await handleGenerateDashboardNote(payload.profile, payload.plan);
        break;
      case 'generateHistoryInsight':
        result = await handleGenerateHistoryInsight(payload.profile, payload.stats, payload.recentWorkouts);
        break;
      case 'generateAgentReview':
        result = await handleGenerateAgentReview(payload.profile, payload.checkin);
        break;
      case 'parseVoiceLog':
        result = await handleParseVoiceLog(payload.transcript, payload.exerciseName);
        break;
      case 'parseVoiceCheckin':
        result = await handleParseVoiceCheckin(payload.transcript, payload.exerciseNames);
        break;
      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[claude function]', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
