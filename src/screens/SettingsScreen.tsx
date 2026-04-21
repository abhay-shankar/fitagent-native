import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  SafeAreaView, TextInput, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { Colors, FontFamily, Radius, Spacing } from '../tokens';
import { PrimaryButton } from '../components/ui';
import { OnboardData } from './OnboardScreen';
import { saveProfile } from '../services/storage';

const GOALS     = ['Build muscle', 'Lose weight', 'Improve endurance', 'General fitness'];
const EQUIPMENT = ['Full gym access', 'Dumbbells / barbell', 'Resistance bands', 'Bodyweight only'];
const DURATIONS = ['20–30 min', '30–45 min', '45–60 min', '60 min+'];
const LEVELS    = ['Beginner (< 1 yr)', 'Intermediate (1–3 yrs)', 'Advanced (3+ yrs)'];

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

function OptionList({
  options, selected, onToggle, max,
}: {
  options: string[]; selected: number[]; onToggle: (i: number) => void; max?: number;
}) {
  return (
    <View style={styles.optionGroup}>
      {options.map((opt, i) => {
        const active   = selected.includes(i);
        const disabled = !active && max !== undefined && max > 1 && selected.length >= max;
        return (
          <TouchableOpacity
            key={opt}
            onPress={() => !disabled && onToggle(i)}
            style={[styles.option, active && styles.optionActive, disabled && styles.optionDisabled]}
            activeOpacity={disabled ? 1 : 0.75}
          >
            <Text style={[styles.optionText, active && styles.optionTextActive, disabled && styles.optionTextDisabled]}>
              {opt}
            </Text>
            {active && <Text style={styles.check}>✓</Text>}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function Stepper({ value, min, max, onChange }: {
  value: number; min: number; max: number; onChange: (v: number) => void;
}) {
  return (
    <View style={styles.stepperRow}>
      <TouchableOpacity
        style={[styles.stepperBtn, value <= min && styles.stepperBtnDisabled]}
        onPress={() => value > min && onChange(value - 1)}
      >
        <Text style={styles.stepperBtnText}>−</Text>
      </TouchableOpacity>
      <Text style={styles.stepperValue}>{value}</Text>
      <TouchableOpacity
        style={[styles.stepperBtn, value >= max && styles.stepperBtnDisabled]}
        onPress={() => value < max && onChange(value + 1)}
      >
        <Text style={styles.stepperBtnText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

interface Props {
  profile: OnboardData;
  onSave: (updated: OnboardData, regenerate: boolean) => void;
  onBack: () => void;
}

export default function SettingsScreen({ profile, onSave, onBack }: Props) {
  const [goals,    setGoals]    = useState<number[]>(profile.goals);
  const [equip,    setEquip]    = useState<number[]>(profile.equipment);
  const [days,     setDays]     = useState(profile.daysPerWeek);
  const [duration, setDuration] = useState<number[]>([profile.sessionLength]);
  const [level,    setLevel]    = useState<number[]>([profile.level]);
  const [injuries, setInjuries] = useState(profile.injuries ?? '');
  const [saving,   setSaving]   = useState(false);

  const toggle = (
    setter: React.Dispatch<React.SetStateAction<number[]>>,
    i: number, max?: number,
  ) => {
    setter(prev => {
      if (prev.includes(i)) return prev.filter(x => x !== i);
      if (max !== undefined && prev.length >= max) return prev;
      return [...prev, i];
    });
  };

  const hasChanges =
    JSON.stringify(goals)    !== JSON.stringify(profile.goals)      ||
    JSON.stringify(equip)    !== JSON.stringify(profile.equipment)  ||
    days                     !== profile.daysPerWeek                ||
    duration[0]              !== profile.sessionLength              ||
    level[0]                 !== profile.level                      ||
    injuries.trim()          !== (profile.injuries ?? '').trim();

  async function handleSave() {
    const updated: OnboardData = {
      goals, equipment: equip, daysPerWeek: days,
      sessionLength: duration[0], level: level[0], injuries,
    };

    setSaving(true);
    try {
      await saveProfile(updated);
    } catch {
      Alert.alert('Error', 'Could not save profile. Try again.');
      setSaving(false);
      return;
    }
    setSaving(false);

    Alert.alert(
      'Regenerate plan?',
      'Your profile was saved. Would you like to generate a new workout plan based on your updated answers?',
      [
        { text: 'Keep current plan', onPress: () => onSave(updated, false) },
        { text: 'Regenerate', style: 'default', onPress: () => onSave(updated, true) },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Profile</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

          <SectionLabel>GOALS</SectionLabel>
          <OptionList
            options={GOALS} selected={goals} max={2}
            onToggle={i => toggle(setGoals, i, 2)}
          />

          <SectionLabel>EQUIPMENT</SectionLabel>
          <OptionList
            options={EQUIPMENT} selected={equip} max={1}
            onToggle={i => setEquip(prev => prev[0] === i ? [] : [i])}
          />

          <SectionLabel>DAYS PER WEEK</SectionLabel>
          <View style={styles.stepperWrapper}>
            <Stepper value={days} min={2} max={6} onChange={setDays} />
            <Text style={styles.stepperHint}>days / week</Text>
          </View>

          <SectionLabel>SESSION LENGTH</SectionLabel>
          <OptionList
            options={DURATIONS} selected={duration} max={1}
            onToggle={i => setDuration(prev => prev[0] === i ? [] : [i])}
          />

          <SectionLabel>EXPERIENCE LEVEL</SectionLabel>
          <OptionList
            options={LEVELS} selected={level} max={1}
            onToggle={i => setLevel(prev => prev[0] === i ? [] : [i])}
          />

          <SectionLabel>INJURIES / LIMITATIONS</SectionLabel>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. bad lower back, avoid heavy squats…"
            placeholderTextColor={Colors.muted}
            value={injuries}
            onChangeText={setInjuries}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          <PrimaryButton
            title={saving ? '' : 'SAVE CHANGES'}
            onPress={handleSave}
            style={[styles.cta, (!hasChanges || saving) && styles.ctaDisabled]}
            disabled={!hasChanges || saving}
          />
          {saving && (
            <ActivityIndicator style={StyleSheet.absoluteFill} color={Colors.bg} />
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1 },
  container: { padding: Spacing.lg, paddingBottom: Spacing.xxl },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn:  { width: 60 },
  backText: { color: Colors.lime, fontFamily: FontFamily.mono, fontSize: 12 },
  title:    { fontFamily: FontFamily.display, fontSize: 18, color: Colors.text },

  sectionLabel: {
    fontSize: 9, color: Colors.muted, fontFamily: FontFamily.mono,
    letterSpacing: 1.5, marginTop: Spacing.lg, marginBottom: Spacing.sm,
  },
  optionGroup: { gap: Spacing.xs },
  option: {
    borderWidth: 1.5, borderColor: Colors.dim, borderRadius: Radius.md,
    padding: Spacing.md, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center',
  },
  optionActive:         { borderColor: Colors.lime, backgroundColor: Colors.lime + '10' },
  optionDisabled:       { opacity: 0.35 },
  optionText:           { fontSize: 15, color: Colors.text },
  optionTextActive:     { color: Colors.lime },
  optionTextDisabled:   { color: Colors.muted },
  check: { color: Colors.lime, fontSize: 16 },

  stepperWrapper: { alignItems: 'center', paddingVertical: Spacing.md },
  stepperRow:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.xl },
  stepperBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  stepperBtnDisabled: { opacity: 0.3 },
  stepperBtnText:     { fontSize: 22, color: Colors.lime },
  stepperValue: {
    fontSize: 40, color: Colors.text, fontFamily: FontFamily.display,
    minWidth: 56, textAlign: 'center',
  },
  stepperHint: { marginTop: Spacing.xs, fontSize: 11, color: Colors.muted, fontFamily: FontFamily.mono },

  textInput: {
    backgroundColor: Colors.card, borderWidth: 1.5, borderColor: Colors.dim,
    borderRadius: Radius.md, padding: Spacing.md,
    color: Colors.text, fontSize: 14, lineHeight: 22, minHeight: 90,
  },

  cta:         { marginTop: Spacing.xl },
  ctaDisabled: { opacity: 0.4 },
});
