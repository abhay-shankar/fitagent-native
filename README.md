# FitAgent

An AI-powered personal fitness coach built with React Native, Supabase, and Claude. FitAgent generates a personalized weekly workout plan, coaches you through each session with voice input, and adapts your plan based on how every workout actually felt.

---

## Features

- **AI-generated workout plans** — Claude builds a full multi-week plan based on your goals, equipment, experience level, injuries, and schedule
- **Voice-controlled logging** — say "log 8 reps with 135 pounds" or "log 3 sets" during a workout; the app updates automatically
- **Adaptive training** — after each session you rate difficulty and how each exercise felt; Claude adjusts future sessions (increases weight on exercises that felt strong, backs off on ones that felt hard)
- **Daily coaching note** — a context-aware AI message on your dashboard that refreshes once per day and changes tone based on where you are in the week
- **Workout history** — full log of every session with difficulty ratings, per-exercise feel scores, and notes
- **Profile editing** — update goals, equipment, schedule, or experience level at any time and optionally regenerate your plan
- **Account management** — sign out or permanently delete your account and all associated data

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile | React Native 0.81 + Expo SDK 54 |
| Language | TypeScript |
| Auth + Database | Supabase (PostgreSQL + Auth) |
| AI | Claude claude-sonnet-4-6 via Anthropic API |
| Edge Functions | Supabase Edge Functions (Deno) |
| Voice Input | `@react-native-voice/voice` |
| Local Cache | AsyncStorage |

---

## Architecture

```
┌─────────────────────────────────────────┐
│              React Native App           │
│                                         │
│  AuthScreen                             │
│  OnboardScreen → GeneratingScreen       │
│       ↓                                 │
│  DashboardScreen                        │
│    ↓            ↓           ↓           │
│  WorkoutScreen  HistoryScreen Settings  │
│    ↓                                    │
│  CheckinScreen → AdaptScreen            │
└────────────────┬────────────────────────┘
                 │ HTTPS + Supabase JWT
┌────────────────▼────────────────────────┐
│         Supabase Edge Functions         │
│                                         │
│  /functions/v1/claude                   │
│    • generate-workout-plan              │
│    • parse-voice-log                    │
│    • parse-voice-checkin                │
│    • generate-dashboard-note            │
│    • adapt-plan                         │
│                                         │
│  /functions/v1/delete-account           │
└────────────────┬────────────────────────┘
                 │ Anthropic SDK
         Claude claude-sonnet-4-6
```

All AI calls go through a Supabase edge function — the Anthropic API key never touches the client.

---

## Database Schema

```sql
-- User fitness preferences
create table profiles (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users(id) unique,
  goals          int[],
  equipment      int[],
  days_per_week  int,
  session_length int,
  level          int,
  injuries       text,
  created_at     timestamptz default now()
);

-- Generated workout plan stored as JSON
create table workout_plans (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) unique,
  plan       jsonb,
  updated_at timestamptz default now()
);

-- Per-session workout log
create table workout_history (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users(id),
  date           date,
  workout_name   text,
  difficulty     int,
  exercise_names text[],
  exercise_feel  jsonb,
  note           text,
  created_at     timestamptz default now()
);
```

Enable Row Level Security on all three tables with policies restricting each user to their own rows.

---

## Setup

### Prerequisites

- Node.js 18+
- EAS CLI: `npm install -g eas-cli`
- Supabase account + project
- Anthropic API key

### 1. Clone and install

```bash
git clone https://github.com/yourusername/fitagent-native.git
cd fitagent-native
npm install
```

### 2. Environment variables

Create `.env` in the project root:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Supabase setup

1. Create a new Supabase project
2. Run the schema SQL above in the SQL editor
3. Enable RLS on each table with appropriate policies
4. Enable email auth in Authentication → Providers
5. Deploy edge functions (see below)

### 4. Deploy edge functions

```bash
supabase login
supabase link --project-ref your-project-ref

supabase functions deploy claude
supabase functions deploy delete-account

# Set the Anthropic key as a secret (never committed to git)
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

The `delete-account` function uses `SUPABASE_SERVICE_ROLE_KEY`, which is automatically available in all edge functions — no extra setup needed.

### 5. Run the app

Voice input requires a native build and does not work in Expo Go:

```bash
# iOS (requires Xcode and an Apple developer account)
npx expo run:ios

# Android
npx expo run:android
```

For UI development without voice, `npx expo start` works in Expo Go.

---

## Voice Commands

**During a workout** — tap the microphone and say:

| Command | Effect |
|---------|--------|
| `"log 8 reps"` | Sets reps to 8 for current set |
| `"log 135 pounds"` | Sets weight to 135 lbs |
| `"log 8 reps with 135 pounds"` | Sets both at once |
| `"log 3 sets with 120 pounds each"` | Completes 3 sets |
| `"next exercise"` | Advances to next exercise |

**During check-in** — tap the microphone and say:

| Command | Effect |
|---------|--------|
| `"difficulty 7"` | Sets overall session difficulty |
| `"bench felt great"` | Positive feel for that exercise |
| `"squats were really hard"` | Negative feel for that exercise |

---

## Design Notes

**API key security** — The Anthropic API key lives only in the Supabase edge function environment. The mobile client calls edge functions with the user's Supabase JWT; it never touches the Anthropic API directly.

**Stale closure problem** — React's stale closure issue is significant for voice callbacks. All mutable state consumed in `onSpeechResults` is mirrored to refs via `useEffect`, so async callbacks always read current values.

**Plan advancement** — `advancePlan` marks today's workout as done but never promotes the next day. A separate `refreshToday` check runs on app open and promotes the next calendar day's workout to 'today', preventing accidental mid-day advancement.

**Daily note caching** — The dashboard coaching note is generated once per day and stored in AsyncStorage alongside a date stamp. On app open, if the cached date matches today the stored note is used; otherwise Claude generates a fresh context-aware message.

---

## Project Structure

```
fitagent-native/
├── App.tsx                     # Root: auth state, screen routing, plan state
├── src/
│   ├── screens/
│   │   ├── AuthScreen.tsx      # Sign in / sign up
│   │   ├── OnboardScreen.tsx   # First-run preference collection (6 steps)
│   │   ├── GeneratingScreen.tsx
│   │   ├── DashboardScreen.tsx # Home with today's workout + coaching note
│   │   ├── WorkoutScreen.tsx   # Live workout tracking + voice logging
│   │   ├── CheckinScreen.tsx   # Post-workout rating (difficulty + per-exercise)
│   │   ├── AdaptScreen.tsx     # AI adaptation summary
│   │   ├── HistoryScreen.tsx   # Full workout log with stats
│   │   └── SettingsScreen.tsx  # Profile editing + sign out / delete account
│   ├── components/
│   │   ├── VoiceOverlay.tsx    # Listening / parsing UI
│   │   ├── MicButton.tsx       # Animated microphone trigger
│   │   ├── ExerciseDetailModal.tsx
│   │   └── ui.tsx              # Shared UI primitives
│   ├── services/
│   │   ├── claude.ts           # Client-side API wrappers + types
│   │   ├── storage.ts          # Supabase + AsyncStorage helpers
│   │   ├── voice.ts            # useVoiceRecognition hook
│   │   ├── supabase.ts         # Supabase client initialization
│   │   └── exercises.ts        # Exercise database
│   └── tokens.ts               # Design tokens (colors, spacing, fonts)
└── supabase/
    └── functions/
        ├── claude/             # AI orchestration (plan gen, voice parse, adapt, note)
        └── delete-account/     # Hard account deletion using service role
```

---

## License

MIT
