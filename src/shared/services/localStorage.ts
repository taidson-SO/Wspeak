import AsyncStorage from '@react-native-async-storage/async-storage';

export async function getJsonValue<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);

  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function setJsonValue<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function removeValue(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}