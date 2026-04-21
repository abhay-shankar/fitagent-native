import React, { useEffect, useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Colors, FontFamily, Radius, Spacing } from '../tokens';
import { Exercise } from '../services/claude';
import { fetchExerciseImage } from '../services/exercises';

interface Props {
  exercise: Exercise | null;
  onClose: () => void;
}

export default function ExerciseDetailModal({ exercise, onClose }: Props) {
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!exercise) return;
    setGifUrl(null);
    setLoading(true);
    fetchExerciseImage(exercise.name)
      .then(setGifUrl)
      .finally(() => setLoading(false));
  }, [exercise?.name]);

  return (
    <Modal
      visible={!!exercise}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={2}>{exercise?.name}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* GIF */}
        <View style={styles.gifContainer}>
          {loading && (
            <ActivityIndicator color={Colors.lime} size="large" />
          )}
          {!loading && gifUrl && (
            <Image
              source={{ uri: gifUrl }}
              style={styles.gif}
              contentFit="contain"
            />
          )}
          {!loading && !gifUrl && (
            <Text style={styles.noGif}>No preview available</Text>
          )}
        </View>

        {/* Stats */}
        {exercise && (
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>SETS</Text>
              <Text style={styles.statValue}>{exercise.sets}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>REPS</Text>
              <Text style={styles.statValue}>{exercise.reps}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>WEIGHT</Text>
              <Text style={styles.statValue}>{exercise.weight}</Text>
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  title: {
    flex: 1, fontFamily: FontFamily.display, fontSize: 22,
    color: Colors.text, textTransform: 'capitalize', paddingRight: Spacing.md,
  },
  closeBtn: {
    backgroundColor: Colors.surface, borderRadius: Radius.pill,
    width: 32, height: 32, alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: { color: Colors.muted, fontSize: 14 },
  gifContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.surface, margin: Spacing.lg, borderRadius: Radius.lg,
  },
  gif: { width: '100%', height: '100%', borderRadius: Radius.lg },
  noGif: { color: Colors.muted, fontFamily: FontFamily.mono, fontSize: 12 },
  statsRow: {
    flexDirection: 'row', marginHorizontal: Spacing.lg, marginBottom: Spacing.xl,
    backgroundColor: Colors.card, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border,
  },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: Spacing.lg },
  statLabel: {
    fontSize: 9, color: Colors.muted, fontFamily: FontFamily.mono,
    letterSpacing: 1.5, marginBottom: Spacing.xs,
  },
  statValue: { fontSize: 20, color: Colors.text, fontFamily: FontFamily.display },
  statDivider: { width: 1, backgroundColor: Colors.border, marginVertical: Spacing.md },
});
