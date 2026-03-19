# FitAgent — React Native / Expo

An AI-powered fitness coaching app that adapts your training based on real workout data and check-in feedback.

## Tech Stack
- **React Native** + **Expo** (SDK 51)
- **TypeScript** — strict mode
- **Expo Router** — file-based navigation (ready to adopt)

## Project Structure

```
App.tsx                    # Root — lightweight state-based nav (swap for Expo Router later)
src/
  tokens/index.ts          # Colors, fonts, spacing, border radius
  components/ui.tsx        # Shared primitives: Badge, Card, PrimaryButton, AgentNote, ProgressBar
  screens/
    OnboardScreen.tsx      # 5-step onboarding wizard
    DashboardScreen.tsx    # Weekly plan overview + today's workout
    WorkoutScreen.tsx      # Active session set logger
    CheckinScreen.tsx      # Post-workout feedback
    AdaptScreen.tsx        # AI plan adaptation review
    HistoryScreen.tsx      # Progress, stats, lift chart
```

## Prerequisites

```bash
# Install Expo CLI globally
npm install -g expo-cli

# Install dependencies
npm install
```

## Run on simulator

```bash
# iOS (requires Xcode)
npm run ios

# Android (requires Android Studio + emulator running)
npm run android
```

## Push to GitHub

```bash
# 1. Create a new blank repo on github.com (no README, no .gitignore)

# 2. From this project folder:
git init
git add .
git commit -m "init: fitagent react native scaffold"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/fitagent.git
git push -u origin main
```

## Screen Flow

```
Onboarding → Dashboard → Workout → Check-in → AI Adapt → Dashboard (loop)
                ↓
             History
```

## Agent Architecture

| Screen      | Agent              | Key Actions                                  |
|-------------|--------------------|----------------------------------------------|
| Onboarding  | Intake Agent       | `save_profile()`, `validate_schema()`        |
| Dashboard   | Plan Reader        | `load_plan(week)`, `get_checkins()`          |
| Workout     | (UI only)          | `log_set()`, `complete_exercise()`           |
| Check-in    | Logger Agent       | `log_workout()`, `tag_difficulty()`          |
| Adaptation  | Adaptation Agent   | `analyze_logs()`, `adjust_plan()`, `explain_changes()` |
| Progress    | Insight Agent      | `query_history()`, `detect_patterns()`       |

## Next Steps

- [ ] Add `expo-router` screen files under `app/` for deep linking
- [ ] Wire up a real backend (Supabase / Firebase) for user profiles and session logs
- [ ] Integrate the Adaptation Agent API endpoint
- [ ] Add push notifications for workout reminders
- [ ] Persist workout state with `AsyncStorage` or a state manager (Zustand recommended)
