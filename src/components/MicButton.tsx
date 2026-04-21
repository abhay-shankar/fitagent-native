import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, Text, StyleSheet, Animated, View } from 'react-native';
import { Colors, Radius, FontFamily } from '../tokens';
import { VoiceState } from '../services/voice';

interface Props {
  state: VoiceState;
  onPress: () => void;
  disabled?: boolean;
}

export default function MicButton({ state, onPress, disabled }: Props) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (state === 'listening') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.25, duration: 600, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1,    duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulse.stopAnimation();
      Animated.timing(pulse, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    }
  }, [state]);

  const bgColor =
    state === 'listening'   ? Colors.lime :
    state === 'processing'  ? Colors.orange :
    Colors.surface;

  const iconColor =
    state === 'listening'   ? '#000' :
    state === 'processing'  ? '#000' :
    Colors.muted;

  const label =
    state === 'listening'  ? 'LISTENING' :
    state === 'processing' ? 'PARSING' :
    'VOICE';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || state === 'processing'}
      style={styles.wrapper}
      activeOpacity={0.7}
    >
      <Animated.View style={[styles.btn, { backgroundColor: bgColor, transform: [{ scale: pulse }] }]}>
        <Text style={[styles.icon, { color: iconColor }]}>🎙</Text>
      </Animated.View>
      <Text style={[styles.label, state !== 'idle' && { color: Colors.lime }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: 4 },
  btn: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  icon: { fontSize: 20 },
  label: {
    fontSize: 8, fontFamily: FontFamily.mono, letterSpacing: 1,
    color: Colors.muted,
  },
});
