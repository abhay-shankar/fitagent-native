import { useState, useCallback, useEffect, useRef } from 'react';
import Voice, { SpeechResultsEvent, SpeechErrorEvent } from '@react-native-voice/voice';

export type VoiceState = 'idle' | 'listening';

interface UseVoiceRecognitionOptions {
  onError?: (error: string) => void;
}

export function useVoiceRecognition({ onError }: UseVoiceRecognitionOptions = {}) {
  const [state, setState]           = useState<VoiceState>('idle');
  const [partial, setPartial]       = useState('');
  const [transcript, setTranscript] = useState('');
  const onErrorRef = useRef(onError);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  useEffect(() => {
    Voice.onSpeechPartialResults = (e: SpeechResultsEvent) => {
      setPartial(e.value?.[0] ?? '');
    };

    Voice.onSpeechResults = (e: SpeechResultsEvent) => {
      const text = e.value?.[0] ?? '';
      setPartial('');
      if (text) setTranscript(text);
    };

    Voice.onSpeechError = (e: SpeechErrorEvent) => {
      setPartial('');
      onErrorRef.current?.(e.error?.message ?? 'Speech recognition error');
    };

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  const start = useCallback(async () => {
    // Each new session clears previous transcript
    setTranscript('');
    setPartial('');
    try {
      await Voice.start('en-US');
      setState('listening');
    } catch (e: any) {
      onErrorRef.current?.(e.message ?? 'Could not start voice recognition');
    }
  }, []);

  const stop = useCallback(async () => {
    try { await Voice.stop(); } catch { /* ignore */ }
    try { await Voice.destroy(); } catch { /* ignore */ }
    setState('idle');
  }, []);

  const cancel = useCallback(async () => {
    try { await Voice.destroy(); } catch { /* ignore */ }
    setPartial('');
    setTranscript('');
    setState('idle');
  }, []);

  return { state, partial, transcript, start, stop, cancel };
}
