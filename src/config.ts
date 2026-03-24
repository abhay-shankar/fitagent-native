export const AI_PROVIDER = (process.env.EXPO_PUBLIC_AI_PROVIDER ?? 'claude') as 'claude' | 'ollama';
export const OLLAMA_BASE_URL = process.env.EXPO_PUBLIC_OLLAMA_URL ?? 'http://localhost:11434';
export const OLLAMA_MODEL = process.env.EXPO_PUBLIC_OLLAMA_MODEL ?? 'llama3.2';
