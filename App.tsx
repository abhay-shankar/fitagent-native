import React, { useState, useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { Colors } from './src/tokens';
import { supabase } from './src/services/supabase';

import AuthScreen                         from './src/screens/AuthScreen';
import OnboardScreen,    { OnboardData }  from './src/screens/OnboardScreen';
import GeneratingScreen                   from './src/screens/GeneratingScreen';
import DashboardScreen                    from './src/screens/DashboardScreen';
import WorkoutScreen                      from './src/screens/WorkoutScreen';
import CheckinScreen                      from './src/screens/CheckinScreen';
import AdaptScreen                        from './src/screens/AdaptScreen';
import HistoryScreen                      from './src/screens/HistoryScreen';
import SettingsScreen                     from './src/screens/SettingsScreen';
import { WorkoutPlan, CheckinData }       from './src/services/claude';
import { saveWorkout, saveProfile, savePlan, loadProfile, loadPlan, cacheDashboardNote } from './src/services/storage';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Mark today as done — do NOT promote next day yet
function advancePlan(plan: WorkoutPlan): WorkoutPlan {
  const schedule = plan.weekSchedule.map(d =>
    d.status === 'today' ? { ...d, status: 'done' as const } : d
  );
  return { ...plan, weekSchedule: schedule };
}

// On each app open, check if an upcoming day matches today's real calendar day and promote it
function refreshToday(plan: WorkoutPlan): WorkoutPlan {
  const todayName = DAY_NAMES[new Date().getDay()];
  // Already has a today — nothing to do
  if (plan.weekSchedule.some(d => d.status === 'today')) return plan;
  const idx = plan.weekSchedule.findIndex(d => d.status === 'upcoming' && d.day === todayName);
  if (idx === -1) return plan;
  const schedule = [...plan.weekSchedule];
  schedule[idx] = { ...schedule[idx], status: 'today' as const };
  const newToday = schedule[idx];
  return {
    ...plan,
    weekSchedule: schedule,
    todayFocus: newToday.type?.toUpperCase() ?? plan.todayFocus,
    todaySummary: newToday.exercises ? `${newToday.exercises.length} exercises` : 'Rest day',
  };
}

type Screen = 'auth' | 'onboard' | 'generating' | 'dashboard' | 'workout' | 'checkin' | 'adapt' | 'history' | 'settings';

export default function App() {
  const [screen, setScreen]   = useState<Screen>('onboard');
  const [profile, setProfile] = useState<OnboardData | null>(null);
  const [plan, setPlan]       = useState<WorkoutPlan | null>(null);
  const [checkin, setCheckin] = useState<CheckinData | null>(null);

  // Ref so auth callback always sees the latest profile state
  const profileRef = useRef<OnboardData | null>(null);
  useEffect(() => { profileRef.current = profile; }, [profile]);

  const nav = (s: Screen) => setScreen(s);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'INITIAL_SESSION' && session) {
        // Returning user — load their data
        const [savedProfile, savedPlan] = await Promise.all([loadProfile(), loadPlan()]);
        if (savedProfile && savedPlan) {
          setProfile(savedProfile);
          const refreshed = refreshToday(savedPlan);
          setPlan(refreshed);
          if (refreshed !== savedPlan) await savePlan(refreshed);
          nav('dashboard');
        }
        // else: no saved data, stay on onboard
      } else if (event === 'SIGNED_IN') {
        const currentProfile = profileRef.current;
        if (currentProfile) {
          // Came from onboarding — save profile and generate plan
          await saveProfile(currentProfile);
          nav('generating');
        } else {
          // Skipped onboarding — check if they have existing data
          const [savedProfile, savedPlan] = await Promise.all([loadProfile(), loadPlan()]);
          if (savedProfile && savedPlan) {
            setProfile(savedProfile);
            const refreshed = refreshToday(savedPlan);
            setPlan(refreshed);
            if (refreshed !== savedPlan) await savePlan(refreshed);
            nav('dashboard');
          } else if (savedProfile) {
            setProfile(savedProfile);
            nav('generating');
          } else {
            // No profile yet — send them through onboarding
            nav('onboard');
          }
        }
      } else if (event === 'SIGNED_OUT') {
        setProfile(null);
        setPlan(null);
        setCheckin(null);
        nav('onboard');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {screen === 'auth' && <AuthScreen />}

      {screen === 'onboard' && (
        <OnboardScreen
          onComplete={data => { setProfile(data); nav('auth'); }}
          onSkip={() => nav('auth')}
        />
      )}

      {screen === 'generating' && profile && (
        <GeneratingScreen
          profile={profile}
          onReady={async generatedPlan => {
            setPlan(generatedPlan);
            await savePlan(generatedPlan);
            nav('dashboard');
          }}
        />
      )}

      {screen === 'dashboard' && profile && plan && (
        <DashboardScreen
          profile={profile}
          plan={plan}
          onStartWorkout={() => nav('workout')}
          onViewHistory={() => nav('history')}
          onSettings={() => nav('settings')}
        />
      )}

      {screen === 'workout' && plan && (
        <WorkoutScreen
          exercises={plan.weekSchedule.find(d => d.status === 'today')?.exercises ?? []}
          onFinish={() => nav('checkin')}
        />
      )}

      {screen === 'checkin' && plan && (
        <CheckinScreen
          workoutName={plan.weekSchedule.find(d => d.status === 'today')?.workoutName ?? 'Workout'}
          exercises={(plan.weekSchedule.find(d => d.status === 'today')?.exercises ?? []).map(e => e.name)}
          onSubmit={async data => { setCheckin(data); await saveWorkout(data); nav('adapt'); }}
          onCancel={() => nav('dashboard')}
        />
      )}

      {screen === 'adapt' && profile && checkin && (
        <AdaptScreen profile={profile} checkin={checkin} onAccept={async () => {
          if (plan) {
            const advanced = advancePlan(plan);
            setPlan(advanced);
            await Promise.all([savePlan(advanced), cacheDashboardNote('')]);
          }
          nav('dashboard');
        }} />
      )}

      {screen === 'history' && (
        <HistoryScreen onBack={() => nav('dashboard')} />
      )}

      {screen === 'settings' && profile && (
        <SettingsScreen
          profile={profile}
          onBack={() => nav('dashboard')}
          onSave={async (updated, regenerate) => {
            setProfile(updated);
            if (regenerate) {
              setPlan(null);
              nav('generating');
            } else {
              nav('dashboard');
            }
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
});
