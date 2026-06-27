import { AudioModule, RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync } from 'expo-audio';
import type { AudioRecorder } from 'expo-audio';

let currentRecording: AudioRecorder | null = null;

export async function requestMicrophonePermissionAsync() {
  return await requestRecordingPermissionsAsync();
}

async function ensureAudioModeAsync() {
  await setAudioModeAsync({
    allowsRecording: true,
    playsInSilentMode: true,
    interruptionMode: 'doNotMix',
  });
}

function createRecorder() {
  return new AudioModule.AudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    directory: 'document',
  });
}

export async function startAudioRecordingAsync() {
  const permission = await requestMicrophonePermissionAsync();

  if (!permission.granted) {
    throw new Error('Permissão de microfone negada.');
  }

  if (currentRecording?.isRecording) {
    throw new Error('Já existe uma gravação em andamento.');
  }

  await ensureAudioModeAsync();

  const recorder = createRecorder();

  try {
    await recorder.prepareToRecordAsync();
    recorder.record();
    currentRecording = recorder;
  } catch (error) {
    currentRecording = null;
    throw error;
  }
}

export async function stopAudioRecordingAsync(): Promise<string> {
  const uri = await stopActiveAudioRecordingAsync();

  if (!uri) {
    throw new Error('Não foi possível recuperar o áudio gravado.');
  }

  return uri;
}

export async function stopActiveAudioRecordingAsync(): Promise<string | null> {
  if (!currentRecording) {
    return null;
  }

  const recording = currentRecording;
  currentRecording = null;

  if (recording.isRecording) {
    await recording.stop();
  }

  return recording.uri ?? null;
}

export function hasActiveRecording() {
  return currentRecording?.isRecording ?? false;
}
