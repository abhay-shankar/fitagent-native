import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  SafeAreaView, TextInput, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { Colors, FontFamily, Radius, Spacing } from '../tokens';
import { Badge, ProgressBar, PrimaryButton } from '../components/ui';
import { Exercise, parseVoiceLog } from '../services/claude';
import { fetchExerciseImage } from '../services/exercises';
import MicButton from '../components/MicButton';
import VoiceOverlay from '../components/VoiceOverlay';
import { useVoiceRecognition } from '../services/voice';

interface LoggedSet {
  weight: string;
  reps: string;
}

interface Props {
  exercises: Exercise[];
  onFinish: () => void;
}

// ─── Weight helpers ───────────────────────────────────────────────────────────

function parseWeight(str: string): { value: number; unit: 'lbs' | 'kg'; isBodyweight: boolean } {
  const s = str.trim().toLowerCase();
  if (s === 'bodyweight' || s === '' || s === '0') return { value: 0, unit: 'lbs', isBodyweight: true };
  const match = s.match(/([\d.]+)\s*(kg|lbs?|pounds?)?/);
  if (!match) return { value: 0, unit: 'lbs', isBodyweight: true };
  const unitStr = match[2] ?? '';
  return {
    value: parseFloat(match[1]),
    unit: unitStr.startsWith('kg') ? 'kg' : 'lbs',
    isBodyweight: false,
  };
}

const STEP = { lbs: 5, kg: 2.5 };

function convertWeight(value: number, from: 'lbs' | 'kg', to: 'lbs' | 'kg'): number {
  if (from === to) return value;
  const converted = from === 'lbs' ? value * 0.453592 : value * 2.20462;
  const step = STEP[to];
  return Math.round(converted / step) * step;
}

function formatWeight(value: number, unit: 'lbs' | 'kg', isBodyweight: boolean): string {
  if (isBodyweight) return 'Bodyweight';
  return `${value} ${unit}`;
}

// ─── Weight stepper ───────────────────────────────────────────────────────────

interface WeightStepperProps {
  value: number;
  unit: 'lbs' | 'kg';
  isBodyweight: boolean;
  onValueChange: (v: number) => void;
  onUnitToggle: () => void;
}

function WeightStepper({ value, unit, isBodyweight, onValueChange, onUnitToggle }: WeightStepperProps) {
  if (isBodyweight) {
    return (
      <View style={stepperStyles.container}>
        <Text style={stepperStyles.bodyweightText}>Bodyweight</Text>
      </View>
    );
  }

  return (
    <View style={stepperStyles.container}>
      <TouchableOpacity
        style={stepperStyles.btn}
        onPress={() => onValueChange(Math.max(0, value - STEP[unit]))}
      >
        <Text style={stepperStyles.btnText}>−</Text>
      </TouchableOpacity>

      <Text style={stepperStyles.value}>{value}</Text>

      <TouchableOpacity style={stepperStyles.unitBtn} onPress={onUnitToggle}>
        <Text style={stepperStyles.unitText}>{unit}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={stepperStyles.btn}
        onPress={() => onValueChange(value + STEP[unit])}
      >
        <Text style={stepperStyles.btnText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const stepperStyles = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    flex: 1,
  },
  btn: {
    width: 32, height: 32, borderRadius: Radius.sm,
    backgroundColor: Colors.dim, alignItems: 'center', justifyContent: 'center',
  },
  btnText: { color: Colors.text, fontSize: 18, lineHeight: 22 },
  value: {
    fontFamily: FontFamily.mono, fontSize: 20, color: Colors.text,
    minWidth: 44, textAlign: 'center',
  },
  unitBtn: {
    paddingHorizontal: Spacing.sm, paddingVertical: 4,
    backgroundColor: Colors.surface, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: Colors.border,
  },
  unitText: { color: Colors.lime, fontFamily: FontFamily.mono, fontSize: 11, letterSpacing: 1 },
  bodyweightText: { color: Colors.muted, fontFamily: FontFamily.mono, fontSize: 13 },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function WorkoutScreen({ exercises, onFinish }: Props) {
  // ── All state first ──────────────────────────────────────────────────────────
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [completedSets, setCompletedSets] = useState(0);
  const [loggedSets, setLoggedSets]       = useState<LoggedSet[]>([]);
  const [activeReps, setActiveReps]       = useState('');
  const [gifUrl, setGifUrl]               = useState<string | null>(null);

  const initWeight = parseWeight(exercises[0]?.weight ?? '');
  const [weightNum, setWeightNum]       = useState(initWeight.value);
  const [weightUnit, setWeightUnit]     = useState<'lbs' | 'kg'>(initWeight.unit);
  const [isBodyweight, setIsBodyweight] = useState(initWeight.isBodyweight);

  useEffect(() => {
    setGifUrl(null);
    fetchExerciseImage(exercises[exerciseIndex]?.name ?? '').then(setGifUrl);
  }, [exerciseIndex]);

  const current          = exercises[exerciseIndex];
  const isLastExercise   = exerciseIndex === exercises.length - 1;
  const isLastSet        = completedSets >= current.sets - 1;
  const upNext           = exercises.slice(exerciseIndex + 1, exerciseIndex + 4);
  const currentSetNumber = completedSets + 1;

  // ── Refs so voice callback always sees latest values ─────────────────────────
  const weightNumRef    = useRef(weightNum);
  const weightUnitRef   = useRef(weightUnit);
  const isBodyweightRef = useRef(isBodyweight);
  const activeRepsRef   = useRef(activeReps);
  const exerciseIndexRef = useRef(exerciseIndex);
  const completedSetsRef = useRef(completedSets);
  const loggedSetsRef    = useRef(loggedSets);
  const isLastSetRef     = useRef(isLastSet);
  const isLastExerciseRef = useRef(isLastExercise);
  useEffect(() => { weightNumRef.current    = weightNum;    }, [weightNum]);
  useEffect(() => { weightUnitRef.current   = weightUnit;   }, [weightUnit]);
  useEffect(() => { isBodyweightRef.current = isBodyweight; }, [isBodyweight]);
  useEffect(() => { activeRepsRef.current   = activeReps;   }, [activeReps]);
  useEffect(() => { exerciseIndexRef.current  = exerciseIndex;  }, [exerciseIndex]);
  useEffect(() => { completedSetsRef.current  = completedSets;  }, [completedSets]);
  useEffect(() => { loggedSetsRef.current     = loggedSets;     }, [loggedSets]);
  useEffect(() => { isLastSetRef.current      = isLastSet;      }, [isLastSet]);
  useEffect(() => { isLastExerciseRef.current = isLastExercise; }, [isLastExercise]);

  // ── Core actions ─────────────────────────────────────────────────────────────
  function toggleUnit() {
    const newUnit = weightUnitRef.current === 'lbs' ? 'kg' : 'lbs';
    setWeightNum(convertWeight(weightNumRef.current, weightUnitRef.current, newUnit));
    setWeightUnit(newUnit);
  }

  const logSet = useCallback(() => {
    const wn  = weightNumRef.current;
    const wu  = weightUnitRef.current;
    const ibw = isBodyweightRef.current;
    const ar  = activeRepsRef.current;
    const ei  = exerciseIndexRef.current;
    const cs  = completedSetsRef.current;
    const ls  = loggedSetsRef.current;
    const cur = exercises[ei];

    const entry: LoggedSet = {
      weight: formatWeight(wn, wu, ibw),
      reps:   ar.trim() || cur.reps,
    };
    setLoggedSets([...ls, entry]);

    if (!isLastSetRef.current) {
      setCompletedSets(c => c + 1);
      setActiveReps('');
    } else if (!isLastExerciseRef.current) {
      const next   = exercises[ei + 1];
      const parsed = parseWeight(next.weight);
      setExerciseIndex(i => i + 1);
      setCompletedSets(0);
      setLoggedSets([]);
      setWeightNum(parsed.unit === wu ? parsed.value : convertWeight(parsed.value, parsed.unit, wu));
      setIsBodyweight(parsed.isBodyweight);
      setActiveReps('');
    } else {
      onFinish();
    }
  }, [exercises, onFinish]);

  // Logs N sets at once with the given weight/reps, then advances appropriately
  const logMultipleSets = useCallback((count: number, weightOverride?: string, repsOverride?: string) => {
    const wn  = weightNumRef.current;
    const wu  = weightUnitRef.current;
    const ibw = isBodyweightRef.current;
    const ei  = exerciseIndexRef.current;
    const cs  = completedSetsRef.current;
    const ls  = loggedSetsRef.current;
    const cur = exercises[ei];

    const setsToLog = Math.min(count, cur.sets - cs);
    if (setsToLog <= 0) return;

    const entryWeight = weightOverride ?? formatWeight(wn, wu, ibw);
    const entryReps   = repsOverride   ?? (activeRepsRef.current.trim() || cur.reps);
    const newEntries: LoggedSet[] = Array(setsToLog).fill({ weight: entryWeight, reps: entryReps });
    const newCompleted = cs + setsToLog;

    setLoggedSets([...ls, ...newEntries]);

    if (newCompleted >= cur.sets) {
      if (ei < exercises.length - 1) {
        const next   = exercises[ei + 1];
        const parsed = parseWeight(next.weight);
        setExerciseIndex(i => i + 1);
        setCompletedSets(0);
        setLoggedSets([]);
        setWeightNum(parsed.unit === wu ? parsed.value : convertWeight(parsed.value, parsed.unit, wu));
        setIsBodyweight(parsed.isBodyweight);
        setActiveReps('');
      } else {
        onFinish();
      }
    } else {
      setCompletedSets(newCompleted);
      setActiveReps('');
    }
  }, [exercises, onFinish]);

  // ── Voice ────────────────────────────────────────────────────────────────────
  const [voiceParsing, setVoiceParsing] = useState(false);
  const logSetRef         = useRef(logSet);
  const logMultiSetsRef   = useRef(logMultipleSets);
  useEffect(() => { logSetRef.current       = logSet;           }, [logSet]);
  useEffect(() => { logMultiSetsRef.current = logMultipleSets;  }, [logMultipleSets]);

  const { state: voiceState, partial: voicePartial, transcript: voiceTranscript, start: voiceStart, stop: voiceStop, cancel: voiceCancel } =
    useVoiceRecognition({ onError: (err) => Alert.alert('Voice error', err) });

  async function handleVoiceStop() {
    await voiceStop();
    const text = voiceTranscript || voicePartial;
    if (!text) return;
    setVoiceParsing(true);
    try {
      const result = await parseVoiceLog(text, exercises[exerciseIndexRef.current]?.name ?? '');

      if (result.action === 'next_set' || result.action === 'next_exercise') {
        logSetRef.current();
        return;
      }

      // Apply weight/reps to stepper first
      let resolvedWeight: string | undefined;
      if (result.weight) {
        const parsed = parseWeight(result.weight);
        if (!parsed.isBodyweight) {
          const converted = parsed.unit === weightUnitRef.current
            ? parsed.value
            : convertWeight(parsed.value, parsed.unit, weightUnitRef.current);
          setWeightNum(converted);
          setIsBodyweight(false);
          resolvedWeight = formatWeight(converted, weightUnitRef.current, false);
        } else {
          setIsBodyweight(true);
          resolvedWeight = 'Bodyweight';
        }
      }

      // If sets were specified, log them all at once
      if (result.sets && result.sets > 0) {
        logMultiSetsRef.current(result.sets, resolvedWeight, result.reps ?? undefined);
      } else if (result.reps) {
        setActiveReps(result.reps);
      }
    } catch (e: any) {
      Alert.alert('Voice error', e.message ?? 'Could not parse voice input');
    } finally {
      setVoiceParsing(false);
    }
  }

  function handleMicPress() {
    if (voiceState === 'listening') return;
    voiceStart();
  }

  const progress = (exerciseIndex + completedSets / current.sets) / exercises.length;
  const ctaLabel = isLastExercise && isLastSet ? 'FINISH WORKOUT →' : `LOG SET ${currentSetNumber} / ${current.sets}`;

  return (
    <SafeAreaView style={styles.safe}>
      <VoiceOverlay
        visible={voiceState === 'listening' || voiceParsing}
        partial={voicePartial}
        transcript={voiceTranscript}
        parsing={voiceParsing}
        hint={`Say something like "120 lbs, 8 reps" or "next set"`}
        onStop={handleVoiceStop}
        onCancel={voiceCancel}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

          {/* Progress */}
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>EXERCISE {exerciseIndex + 1} OF {exercises.length}</Text>
            <Text style={styles.progressLabel}>SET {currentSetNumber} OF {current.sets}</Text>
          </View>
          <ProgressBar progress={progress} />

          {/* Current exercise */}
          <View style={styles.exerciseBlock}>
            <Badge color={Colors.orange}>Current</Badge>
            <Text style={styles.exerciseName}>{current.name}</Text>
            <Text style={styles.exerciseSub}>
              {current.sets} sets · {current.reps} reps · {current.weight}
            </Text>

            {gifUrl && (
              <Image
                source={{ uri: gifUrl }}
                style={styles.exerciseGif}
                resizeMode="contain"
              />
            )}

            {Array.from({ length: current.sets }).map((_, i) => {
              const done   = i < completedSets;
              const active = i === completedSets;
              const logged = loggedSets[i];

              return (
                <View key={i} style={[styles.setRow, active && styles.setRowActive]}>
                  <Text style={styles.setLabel}>SET {i + 1}</Text>

                  <View style={styles.setInputs}>
                    {/* Weight */}
                    {active ? (
                      <WeightStepper
                        value={weightNum}
                        unit={weightUnit}
                        isBodyweight={isBodyweight}
                        onValueChange={setWeightNum}
                        onUnitToggle={toggleUnit}
                      />
                    ) : (
                      <View style={styles.staticWeight}>
                        <Text style={styles.inputText}>
                          {done ? logged?.weight : current.weight}
                        </Text>
                      </View>
                    )}

                    <Text style={styles.times}>×</Text>

                    {/* Reps */}
                    {active ? (
                      <TextInput
                        style={[styles.repsBox, styles.repsEditable]}
                        value={activeReps}
                        onChangeText={setActiveReps}
                        placeholder={current.reps}
                        placeholderTextColor={Colors.muted}
                        keyboardType="numeric"
                        returnKeyType="done"
                      />
                    ) : (
                      <View style={[styles.repsBox, !done && styles.repsEmpty]}>
                        <Text style={[styles.inputText, !done && { color: Colors.muted }]}>
                          {done ? logged?.reps : '—'}
                        </Text>
                      </View>
                    )}
                  </View>

                  {done && <Text style={styles.checkmark}>✓</Text>}
                </View>
              );
            })}
          </View>

          {/* Up next */}
          {upNext.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>UP NEXT</Text>
              <View style={styles.nextRow}>
                {upNext.map(ex => (
                  <View key={ex.name} style={styles.nextCard}>
                    <Text style={styles.nextText}>{ex.name}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          <View style={styles.voiceRow}>
            <MicButton state={voiceState} onPress={handleMicPress} />
            <Text style={styles.voiceHint}>
              {voiceState === 'idle'
                ? 'Say "log 3 sets with 120 lbs each" or "8 reps"'
                : voiceState === 'listening'
                ? 'Listening — tap to stop'
                : 'Parsing...'}
            </Text>
          </View>

          <PrimaryButton title={ctaLabel} onPress={logSet} style={styles.cta} />
          <TouchableOpacity onPress={onFinish} style={styles.endBtn}>
            <Text style={styles.endBtnText}>End Workout</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1 },
  container: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs },
  progressLabel: { fontSize: 9, color: Colors.muted, fontFamily: FontFamily.mono },
  exerciseBlock: {
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    padding: Spacing.lg, marginTop: Spacing.lg, marginBottom: Spacing.lg,
  },
  exerciseName: {
    fontFamily: FontFamily.display, fontSize: 26, color: Colors.text,
    marginTop: Spacing.sm, marginBottom: 2, textTransform: 'capitalize',
  },
  exerciseSub: { fontSize: 12, color: Colors.muted, marginBottom: Spacing.sm },
  exerciseGif: { width: '100%', height: 180, borderRadius: Radius.md, marginBottom: Spacing.md },
  setRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.dim,
    borderRadius: Radius.md, padding: Spacing.sm, marginBottom: Spacing.xs,
  },
  setRowActive: { borderColor: Colors.lime, backgroundColor: Colors.lime + '10' },
  setLabel: { fontSize: 10, color: Colors.muted, fontFamily: FontFamily.mono, width: 38 },
  setInputs: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  staticWeight: { flex: 1, alignItems: 'flex-start' },
  inputText: { fontSize: 14, color: Colors.text },
  times: { fontSize: 12, color: Colors.muted },
  repsBox: {
    width: 56, backgroundColor: Colors.dim, borderRadius: Radius.sm,
    paddingVertical: 6, alignItems: 'center',
  },
  repsEditable: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.lime + '60',
    color: Colors.text, fontSize: 14, textAlign: 'center',
  },
  repsEmpty: { backgroundColor: Colors.border },
  checkmark: { color: Colors.lime, fontSize: 14 },
  sectionLabel: {
    fontSize: 9, color: Colors.muted, fontFamily: FontFamily.mono,
    letterSpacing: 1, marginBottom: Spacing.sm,
  },
  nextRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  nextCard: {
    flex: 1, backgroundColor: Colors.card, borderRadius: Radius.sm,
    padding: Spacing.sm, alignItems: 'center',
  },
  nextText: { fontSize: 10, color: Colors.muted, textAlign: 'center', lineHeight: 15 },
  voiceRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.card, borderRadius: Radius.md,
    padding: Spacing.md, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: Colors.dim,
  },
  voiceHint: { flex: 1, fontSize: 11, color: Colors.muted, lineHeight: 16 },
  cta: {},
  endBtn: { marginTop: Spacing.md, alignItems: 'center', paddingVertical: Spacing.sm },
  endBtnText: { color: Colors.red, fontFamily: FontFamily.mono, fontSize: 12, letterSpacing: 1 },
});
