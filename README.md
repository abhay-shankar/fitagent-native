# FitAgent

An AI-powered personal fitness app built with React Native and Expo. FitAgent uses Claude to generate personalised workout plans, adapt them based on your check-in feedback, and coach you through every session.

## Features

- **AI onboarding** — 6-step questionnaire captures your goals, equipment, experience level, and schedule
- **Generated workout plans** — Claude builds a full weekly plan tailored to your profile
- **Live workout tracking** — Log sets with editable weight and reps as you go
- **Post-workout check-in** — Rate overall difficulty and how each exercise felt
- **Agent review** — Claude analyses your check-in and adjusts the next session automatically
- **Dashboard coaching note** — Personalised message from your AI coach on every visit
- **Progress history** — AI-generated insight on your trends and progression

## Tech Stack

- [React Native](https://reactnative.dev/) + [Expo](https://expo.dev/) (SDK 54)
- [TypeScript](https://www.typescriptlang.org/)
- [Claude API](https://www.anthropic.com/) (`claude-opus-4-6`) for all AI features

## Getting Started

### Prerequisites

- Node.js 18+
- Expo Go on your phone, or Xcode for the iOS simulator
- An [Anthropic API key](https://console.anthropic.com/)

### Install

```bash
git clone https://github.com/<your-username>/fitagent-native.git
cd fitagent-native
npm install
```

### Configure

Create a `.env` file in the project root:

```
EXPO_PUBLIC_ANTHROPIC_API_KEY=your-api-key-here
```

> **Note:** The API key is used client-side for prototyping only. Before shipping to production, move all Claude calls to a backend proxy.

### Run

```bash
npx expo start --clear
```

Scan the QR code with Expo Go, or press `i` to open the iOS simulator.

## Screen Flow

```
Onboard → Generating → Dashboard → Workout → Check-in → Agent Review → Dashboard (loop)
                            ↓
                         History
```

## Project Structure

```
App.tsx                      # Root — state-based navigation
src/
  services/
    claude.ts                # All Claude API calls and shared types
  screens/
    OnboardScreen.tsx        # 6-step onboarding questionnaire
    GeneratingScreen.tsx     # Loading screen while plan is generated
    DashboardScreen.tsx      # Home dashboard with today's workout
    WorkoutScreen.tsx        # Active workout with set logging
    CheckinScreen.tsx        # Post-workout feedback form
    AdaptScreen.tsx          # AI review and plan adjustments
    HistoryScreen.tsx        # Progress history and insights
  components/
    ui.tsx                   # Shared UI primitives
  tokens.ts                  # Design tokens (colours, spacing, fonts)
```

## Roadmap

- [ ] Persist workout history with `AsyncStorage` or Supabase
- [ ] Push notifications for workout reminders
- [ ] Move Claude API calls to a backend proxy before production
- [ ] Add Expo Router for deep linking support
