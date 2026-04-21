import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator, KeyboardAvoidingView, Platform, Alert, Keyboard,
} from 'react-native';
import { supabase } from '../services/supabase';
import { Colors, FontFamily, Radius, Spacing } from '../tokens';

export default function AuthScreen() {
  const [email, setEmail]     = useState('');
  const [code, setCode]       = useState('');
  const [step, setStep]       = useState<'email' | 'code'>('email');
  const [loading, setLoading] = useState(false);

  async function handleSendCode() {
    if (!email.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      setStep('code');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode() {
    if (code.length < 6) return;
    Keyboard.dismiss();
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(), token: code.trim(), type: 'magiclink',
      });
      if (error) throw error;
    } catch (e: any) {
      Alert.alert('Invalid code', 'Please check the code and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.top}>
          <Text style={styles.logo}>fitagent</Text>
          {step === 'email' ? (
            <>
              <Text style={styles.heading}>Save your plan.</Text>
              <Text style={styles.sub}>Enter your email — we'll send a sign-in code.</Text>
            </>
          ) : (
            <>
              <Text style={styles.heading}>Check your email.</Text>
              <Text style={styles.sub}>We sent a sign-in code to {email.trim()}.</Text>
            </>
          )}
        </View>

        <View style={styles.bottom}>
          {step === 'email' ? (
            <>
              <TextInput
                style={styles.input}
                placeholder="your@email.com"
                placeholderTextColor={Colors.muted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
                onSubmitEditing={handleSendCode}
              />
              <TouchableOpacity
                style={[styles.btn, (!email.trim() || loading) && styles.btnDisabled]}
                onPress={handleSendCode}
                disabled={!email.trim() || loading}
              >
                {loading
                  ? <ActivityIndicator color="#000" size="small" />
                  : <Text style={styles.btnText}>SEND CODE</Text>
                }
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TextInput
                style={[styles.input, styles.codeInput]}
                placeholder="00000000"
                placeholderTextColor={Colors.muted}
                keyboardType="number-pad"
                maxLength={8}
                value={code}
                onChangeText={setCode}
                onSubmitEditing={handleVerifyCode}
                autoFocus
              />
              <TouchableOpacity
                style={[styles.btn, (code.length < 6 || loading) && styles.btnDisabled]}
                onPress={handleVerifyCode}
                disabled={code.length < 6 || loading}
              >
                {loading
                  ? <ActivityIndicator color="#000" size="small" />
                  : <Text style={styles.btnText}>VERIFY</Text>
                }
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setStep('email'); setCode(''); }}>
                <Text style={styles.backText}>← Use a different email</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  container: { flex: 1, paddingHorizontal: Spacing.xl, justifyContent: 'space-between' },
  top: { flex: 1, justifyContent: 'center' },
  logo: {
    fontSize: 12, color: Colors.lime, fontFamily: FontFamily.mono,
    letterSpacing: 3, marginBottom: Spacing.xl,
  },
  heading: {
    fontFamily: FontFamily.display, fontSize: 32, color: Colors.text,
    marginBottom: Spacing.md,
  },
  sub: { fontSize: 15, color: Colors.muted, lineHeight: 22 },
  bottom: { paddingBottom: Spacing.xl, gap: Spacing.md },
  input: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, paddingHorizontal: Spacing.lg, paddingVertical: 14,
    color: Colors.text, fontSize: 15,
  },
  codeInput: {
    fontSize: 28, letterSpacing: 8, textAlign: 'center',
    fontFamily: FontFamily.mono,
  },
  btn: {
    backgroundColor: Colors.lime, borderRadius: Radius.md,
    paddingVertical: 14, alignItems: 'center',
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#000', fontFamily: FontFamily.mono, fontSize: 12, letterSpacing: 1 },
  backText: { color: Colors.muted, fontFamily: FontFamily.mono, fontSize: 11, textAlign: 'center' },
});
