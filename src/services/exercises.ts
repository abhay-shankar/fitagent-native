import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { edgeFunctionUrl } from './supabase';

const IMG_CACHE_PREFIX = '@fitagent/exercise_img/';

export async function fetchExerciseImage(exerciseName: string): Promise<string | null> {
  // Check if already saved to disk
  const imgCacheKey = IMG_CACHE_PREFIX + exerciseName.toLowerCase();
  const cachedPath  = await AsyncStorage.getItem(imgCacheKey).catch(() => null);
  if (cachedPath) {
    const info = await FileSystem.getInfoAsync(cachedPath);
    if (info.exists) return cachedPath;
  }

  const url = edgeFunctionUrl('exercises', { action: 'image', name: exerciseName });
  const localPath = `${FileSystem.cacheDirectory}exercise_${encodeURIComponent(exerciseName.toLowerCase())}.gif`;

  try {
    const result = await FileSystem.downloadAsync(url, localPath, {
      headers: {},
    });
    if (result.status !== 200) {
      console.warn('[exercises] image download failed:', result.status);
      return null;
    }
    await AsyncStorage.setItem(imgCacheKey, result.uri).catch(() => {});
    return result.uri;
  } catch (e) {
    console.warn('[exercises] download error:', e);
    return null;
  }
}
