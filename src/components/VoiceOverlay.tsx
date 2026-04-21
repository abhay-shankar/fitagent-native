import React, { useEffect, useRef } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, Animated, ActivityIndicator,
} from 'react-native';
import { Colors, FontFamily, Radius, Spacing } from '../tokens';

interface Props {
  visible: boolean;
  partial: string;
  transcript: string;
  parsing: boolean;
  hint: string;
  onStop: () => void;
  onCancel: () => void;
}

export default function VoiceOverlay({ visible, partial, transcript, parsing, hint, onStop, onCancel }: Props) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible && !parsing) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.3, duration: 700, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1,   duration: 700, useNativeDriver: true }),
        ])
      );
      anim.start();
      return () => { anim.stop(); pulse.setValue(1); };
    }
  }, [visible, parsing]);

  const displayText = partial || transcript;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onCancel} />

        <View style={styles.card}>
          {/* Mic circle */}
          <View style={styles.micWrapper}>
            <Animated.View style={[styles.ring, { transform: [{ scale: pulse }] }]} />
            <View style={styles.micCircle}>
              {parsing
                ? <ActivityIndicator color="#000" size="small" />
                : <Text style={styles.micIcon}>🎙</Text>
              }
            </View>
          </View>

          {/* Status label */}
          <Text style={styles.status}>{parsing ? 'PARSING…' : 'LISTENING'}</Text>

          {/* Recognized text or hint */}
          {displayText ? (
            <Text style={styles.transcript}>"{displayText}"</Text>
          ) : (
            <Text style={styles.hint}>{hint}</Text>
          )}

          {/* Stop button — always visible, disabled while parsing */}
          <TouchableOpacity
            style={[styles.stopBtn, parsing && styles.stopBtnDisabled]}
            onPress={onStop}
            disabled={parsing}
            activeOpacity={0.7}
          >
            <Text style={[styles.stopText, parsing && styles.stopTextDisabled]}>
              ■  STOP LISTENING
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const CIRCLE = 72;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 60,
  },
  card: {
    width: '85%', backgroundColor: Colors.surface,
    borderRadius: Radius.md, padding: Spacing.xl,
    alignItems: 'center', gap: Spacing.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  micWrapper: {
    width: CIRCLE, height: CIRCLE,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  ring: {
    position: 'absolute',
    width: CIRCLE, height: CIRCLE, borderRadius: CIRCLE / 2,
    borderWidth: 2, borderColor: Colors.lime + '80',
  },
  micCircle: {
    width: CIRCLE, height: CIRCLE, borderRadius: CIRCLE / 2,
    backgroundColor: Colors.lime,
    alignItems: 'center', justifyContent: 'center',
  },
  micIcon: { fontSize: 30 },
  status: {
    fontFamily: FontFamily.mono, fontSize: 11, letterSpacing: 2, color: Colors.lime,
  },
  transcript: {
    fontSize: 16, color: Colors.text, textAlign: 'center',
    lineHeight: 24, fontStyle: 'italic',
  },
  hint: {
    fontSize: 12, color: Colors.muted, textAlign: 'center', lineHeight: 18,
  },
  stopBtn: {
    marginTop: Spacing.sm, paddingVertical: 14, alignSelf: 'stretch',
    borderRadius: Radius.md, backgroundColor: Colors.red + '20',
    borderWidth: 1, borderColor: Colors.red + '60', alignItems: 'center',
  },
  stopBtnDisabled: { opacity: 0.4 },
  stopText: { fontFamily: FontFamily.mono, fontSize: 12, color: Colors.red, letterSpacing: 1 },
  stopTextDisabled: { color: Colors.muted },
});
