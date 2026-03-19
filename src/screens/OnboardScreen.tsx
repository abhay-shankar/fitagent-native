import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  SafeAreaView, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Colors, FontFamily, Radius, Spacing } from '../tokens';
import { PrimaryButton, ProgressBar } from '../components/ui';

// ─── Data ─────────────────────────────────────────────────────────────────────

const GOALS     = ['Build muscle', 'Lose weight', 'Improve endurance', 'General fitness'];
const EQUIPMENT = ['Full gym access', 'Dumbbells / barbell', 'Resistance bands', 'Bodyweight only'];
const DURATIONS = ['20–30 min', '30–45 min', '45–60 min', '60 min+'];
const LEVELS    = ['Beginner (< 1 yr)', 'Intermediate (1–3 yrs)', 'Advanced (3+ yrs)'];

const TOTAL_STEPS = 6;

// ─── Sub-components ───────────────────────────────────────────────────────────

function OptionList({
  options,
  selected,
  onToggle,
  max,
}: {
  options: string[];
  selected: number[];
  onToggle: (i: number) => void;
  max?: number;
}) {
  return (
    <>
      {options.map((opt, i) => {
        const active = selected.includes(i);
        // Only dim/disable for multi-select when the cap is reached (not for single-select)
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
    </>
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

export interface OnboardData {
  goals: number[];
  equipment: number[];
  daysPerWeek: number;
  sessionLength: number;
  level: number;
  injuries: string;
}

interface Props {
  onComplete: (data: OnboardData) => void;
}

export default function OnboardScreen({ onComplete }: Props) {
  const [step, setStep]         = useState(1);
  const [goals, setGoals]       = useState<number[]>([]);
  const [equipment, setEquip]   = useState<number[]>([]);
  const [days, setDays]         = useState(3);
  const [duration, setDuration] = useState<number[]>([]);
  const [level, setLevel]       = useState<number[]>([]);
  const [injuries, setInjuries] = useState('');

  const toggle = (
    setter: React.Dispatch<React.SetStateAction<number[]>>,
    i: number,
    max?: number,
  ) => {
    setter(prev => {
      if (prev.includes(i)) return prev.filter(x => x !== i);
      if (max !== undefined && prev.length >= max) return prev;
      return [...prev, i];
    });
  };

  const canAdvance = () => {
    if (step === 1) return goals.length > 0;
    if (step === 2) return equipment.length > 0;
    if (step === 4) return duration.length > 0;
    if (step === 5) return level.length > 0;
    return true;
  };

  const next = () => {
    if (step < TOTAL_STEPS) {
      setStep(s => s + 1);
    } else {
      onComplete({
        goals,
        equipment,
        daysPerWeek: days,
        sessionLength: duration[0],
        level: level[0],
        injuries,
      });
    }
  };

  const STEPS: { label: string; heading: string; sub: string } = (() => {
    const map: Record<number, { label: string; heading: string; sub: string }> = {
      1: { label: 'Goals',        heading: "What are your goals?",           sub: 'Pick up to 2. Your agent uses these to shape every plan it builds.' },
      2: { label: 'Equipment',    heading: 'What do you have to train with?', sub: 'Pick the option that best describes your setup.' },
      3: { label: 'Frequency',    heading: 'Days per week?',                  sub: 'How many days can you realistically commit to?' },
      4: { label: 'Session',      heading: 'How long per session?',           sub: 'Pick the range that fits your schedule.' },
      5: { label: 'Experience',   heading: 'Your experience level?',          sub: 'Be honest — this sets your starting point.' },
      6: { label: 'Limitations',  heading: 'Any injuries to work around?',    sub: 'Optional. Your agent will avoid exercises that strain these areas.' },
    };
    return map[step];
  })();

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.scroll} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <Text style={styles.stepLabel}>STEP {step} OF {TOTAL_STEPS} · {STEPS.label.toUpperCase()}</Text>
          <ProgressBar progress={step / TOTAL_STEPS} />
          <Text style={styles.heading}>{STEPS.heading}</Text>
          <Text style={styles.sub}>{STEPS.sub}</Text>

          {/* Step content */}
          {step === 1 && (
            <OptionList
              options={GOALS}
              selected={goals}
              onToggle={i => toggle(setGoals, i, 2)}
              max={2}
            />
          )}

          {step === 2 && (
            <OptionList
              options={EQUIPMENT}
              selected={equipment}
              onToggle={i => setEquip(prev => prev[0] === i ? [] : [i])}
              max={1}
            />
          )}

          {step === 3 && (
            <View style={styles.stepperWrapper}>
              <Stepper value={days} min={2} max={6} onChange={setDays} />
              <Text style={styles.stepperHint}>days / week</Text>
            </View>
          )}

          {step === 4 && (
            <OptionList
              options={DURATIONS}
              selected={duration}
              onToggle={i => setDuration(prev => prev[0] === i ? [] : [i])}
              max={1}
            />
          )}

          {step === 5 && (
            <OptionList
              options={LEVELS}
              selected={level}
              onToggle={i => setLevel(prev => prev[0] === i ? [] : [i])}
              max={1}
            />
          )}

          {step === 6 && (
            <TextInput
              style={styles.textInput}
              placeholder="e.g. bad lower back, avoid heavy squats…"
              placeholderTextColor={Colors.muted}
              value={injuries}
              onChangeText={setInjuries}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          )}

          {/* Navigation */}
          <PrimaryButton
            title={step < TOTAL_STEPS ? 'NEXT →' : 'BUILD MY PLAN →'}
            onPress={next}
            style={[styles.cta, !canAdvance() && styles.ctaDisabled]}
          />
          {step === 6 && (
            <TouchableOpacity onPress={next} style={styles.skipBtn}>
              <Text style={styles.skipText}>Skip for now</Text>
            </TouchableOpacity>
          )}
          {step > 1 && (
            <TouchableOpacity onPress={() => setStep(s => s - 1)} style={styles.backBtn}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1 },
  container: { padding: Spacing.lg, paddingBottom: Spacing.xxl },

  stepLabel: {
    fontSize: 9, color: Colors.lime, fontFamily: FontFamily.mono,
    letterSpacing: 2, marginBottom: Spacing.xs,
  },
  heading: {
    fontFamily: FontFamily.display, fontSize: 26, color: Colors.text,
    marginTop: Spacing.lg, marginBottom: Spacing.xs,
  },
  sub: {
    fontSize: 13, color: Colors.muted, lineHeight: 19, marginBottom: Spacing.lg,
  },

  option: {
    borderWidth: 1.5, borderColor: Colors.dim, borderRadius: Radius.md,
    padding: Spacing.md, marginBottom: Spacing.sm,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  optionActive:   { borderColor: Colors.lime, backgroundColor: Colors.lime + '10' },
  optionDisabled: { opacity: 0.35 },
  optionText:         { fontSize: 15, color: Colors.text },
  optionTextActive:   { color: Colors.lime },
  optionTextDisabled: { color: Colors.muted },
  check: { color: Colors.lime, fontSize: 16 },

  stepperWrapper: { alignItems: 'center', marginVertical: Spacing.xl },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xl },
  stepperBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  stepperBtnDisabled: { opacity: 0.3 },
  stepperBtnText: { fontSize: 22, color: Colors.lime },
  stepperValue: {
    fontSize: 48, color: Colors.text, fontFamily: FontFamily.display, minWidth: 64, textAlign: 'center',
  },
  stepperHint: {
    marginTop: Spacing.sm, fontSize: 12, color: Colors.muted, fontFamily: FontFamily.mono,
  },

  textInput: {
    backgroundColor: Colors.card, borderWidth: 1.5, borderColor: Colors.dim,
    borderRadius: Radius.md, padding: Spacing.md,
    color: Colors.text, fontSize: 14, lineHeight: 22,
    minHeight: 120, marginBottom: Spacing.lg,
  },

  cta:         { marginTop: Spacing.xl },
  ctaDisabled: { opacity: 0.4 },
  skipBtn:  { marginTop: Spacing.md, alignItems: 'center' },
  skipText: { color: Colors.muted, fontFamily: FontFamily.mono, fontSize: 12 },
  backBtn:  { marginTop: Spacing.sm, alignItems: 'center' },
  backText: { color: Colors.muted, fontFamily: FontFamily.mono, fontSize: 12 },
});
