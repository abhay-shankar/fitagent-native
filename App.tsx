import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { Colors } from './src/tokens';

import OnboardScreen,    { OnboardData } from './src/screens/OnboardScreen';
import GeneratingScreen               from './src/screens/GeneratingScreen';
import DashboardScreen                from './src/screens/DashboardScreen';
import WorkoutScreen                  from './src/screens/WorkoutScreen';
import CheckinScreen                  from './src/screens/CheckinScreen';
import AdaptScreen                    from './src/screens/AdaptScreen';
import HistoryScreen                  from './src/screens/HistoryScreen';
import { WorkoutPlan, CheckinData }   from './src/services/claude';

type Screen = 'onboard' | 'generating' | 'dashboard' | 'workout' | 'checkin' | 'adapt' | 'history';

export default function App() {
  const [screen, setScreen]   = useState<Screen>('onboard');
  const [profile, setProfile]   = useState<OnboardData | null>(null);
  const [plan, setPlan]         = useState<WorkoutPlan | null>(null);
  const [checkin, setCheckin]   = useState<CheckinData | null>(null);

  const nav = (s: Screen) => setScreen(s);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {screen === 'onboard' && (
        <OnboardScreen onComplete={data => { setProfile(data); nav('generating'); }} />
      )}

      {screen === 'generating' && profile && (
        <GeneratingScreen
          profile={profile}
          onReady={generatedPlan => { setPlan(generatedPlan); nav('dashboard'); }}
        />
      )}

      {screen === 'dashboard' && profile && plan && (
        <DashboardScreen
          profile={profile}
          plan={plan}
          onStartWorkout={() => nav('workout')}
          onViewHistory={() => nav('history')}
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
          onSubmit={data => { setCheckin(data); nav('adapt'); }}
        />
      )}
      {screen === 'adapt' && profile && checkin && (
        <AdaptScreen profile={profile} checkin={checkin} onAccept={() => nav('dashboard')} />
      )}

      {screen === 'history' && profile && (
        <HistoryScreen profile={profile} onBack={() => nav('dashboard')} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
});
