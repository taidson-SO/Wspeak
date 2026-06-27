import { AudioModule, requestRecordingPermissionsAsync, setAudioModeAsync } from 'expo-audio';
import { Platform } from 'react-native';

import type { PcmAudioBuffer } from './audioTypes';

type AudioStreamInstance = InstanceType<typeof AudioModule.AudioStream>;

type PcmCaptureSession = {
  stopPcmCaptureAsync: () => Promise<PcmAudioBuffer>;
  getCapturedPcmBuffer: () => PcmAudioBuffer | null;
};

type PcmDiagnosticsSummary = {
  bufferCount: number;
  byteLength: number;
  sampleCount: number;
  finiteSampleCount: number;
  outOfRangeSampleCount: number;
  averageAmplitude: number;
  maxAmplitude: number;
};

const PCM_CAPTURE_DIAGNOSTICS_ENABLED = false;
const PCM_CAPTURE_DIAGNOSTIC_BUFFER_LIMIT = 3;

let currentStream: AudioStreamInstance | null = null;
let currentSubscription: { remove: () => void } | null = null;
let capturedSamples: number[] = [];
let capturedSampleRate = 48000;
let capturedChannels = 1;
let captureStartedAt = 0;
let capturedBufferCount = 0;
let capturedByteLength = 0;
let finiteSampleCount = 0;
let outOfRangeSampleCount = 0;
let absoluteAmplitudeSum = 0;
let maxAmplitude = 0;

async function ensureAudioModeAsync() {
  await setAudioModeAsync({
    allowsRecording: true,
    playsInSilentMode: true,
    interruptionMode: 'doNotMix',
  });
}

function bytesToFloatSamples(buffer: ArrayBuffer) {
  const floatSamples = new Float32Array(buffer);
  return Array.from(floatSamples);
}

function resetDiagnostics() {
  capturedBufferCount = 0;
  capturedByteLength = 0;
  finiteSampleCount = 0;
  outOfRangeSampleCount = 0;
  absoluteAmplitudeSum = 0;
  maxAmplitude = 0;
}

function updateDiagnostics(samples: number[], byteLength: number) {
  capturedBufferCount += 1;
  capturedByteLength += byteLength;

  samples.forEach((sample) => {
    if (!Number.isFinite(sample)) {
      return;
    }

    const absoluteAmplitude = Math.abs(sample);
    finiteSampleCount += 1;
    absoluteAmplitudeSum += absoluteAmplitude;
    maxAmplitude = Math.max(maxAmplitude, absoluteAmplitude);

    if (sample < -1 || sample > 1) {
      outOfRangeSampleCount += 1;
    }
  });
}

function getDiagnosticsSummary(): PcmDiagnosticsSummary {
  return {
    bufferCount: capturedBufferCount,
    byteLength: capturedByteLength,
    sampleCount: capturedSamples.length,
    finiteSampleCount,
    outOfRangeSampleCount,
    averageAmplitude: finiteSampleCount > 0 ? absoluteAmplitudeSum / finiteSampleCount : 0,
    maxAmplitude,
  };
}

function logDiagnostics(event: string, details: Record<string, unknown>) {
  if (!PCM_CAPTURE_DIAGNOSTICS_ENABLED) {
    return;
  }

  console.info(`[WSpeak PCM] ${event}`, details);
}

export function isPcmCaptureAvailable() {
  return Platform.OS === 'android' && typeof AudioModule.AudioStream === 'function';
}

export async function startPcmCaptureAsync(): Promise<PcmCaptureSession> {
  const permission = await requestRecordingPermissionsAsync();

  if (!permission.granted) {
    throw new Error('Permissão de microfone negada.');
  }

  if (!isPcmCaptureAvailable()) {
    throw new Error('Captura PCM em tempo real não está disponível nesta plataforma.');
  }

  if (currentStream) {
    throw new Error('Já existe uma captura PCM em andamento.');
  }

  await ensureAudioModeAsync();

  capturedSamples = [];
  capturedSampleRate = 48000;
  capturedChannels = 1;
  captureStartedAt = Date.now();
  resetDiagnostics();

  const stream = new AudioModule.AudioStream({
    sampleRate: 48000,
    channels: 1,
    encoding: 'float32',
  });
  currentStream = stream;

  currentSubscription = stream.addListener('audioStreamBuffer', (buffer) => {
    const isArrayBuffer = buffer.data instanceof ArrayBuffer;
    const byteLength = isArrayBuffer ? buffer.data.byteLength : 0;
    const isFloat32Aligned = byteLength % Float32Array.BYTES_PER_ELEMENT === 0;

    capturedSampleRate = buffer.sampleRate;
    capturedChannels = buffer.channels;

    if (!isArrayBuffer || !isFloat32Aligned) {
      logDiagnostics('buffer-invalido', {
        isArrayBuffer,
        byteLength,
        sampleRate: buffer.sampleRate,
        channels: buffer.channels,
      });
      return;
    }

    const samples = bytesToFloatSamples(buffer.data);
    capturedSamples.push(...samples);
    updateDiagnostics(samples, byteLength);

    if (capturedBufferCount <= PCM_CAPTURE_DIAGNOSTIC_BUFFER_LIMIT) {
      logDiagnostics('buffer', {
        bufferIndex: capturedBufferCount,
        sampleRate: buffer.sampleRate,
        channels: buffer.channels,
        byteLength,
        floatSampleCount: samples.length,
        durationMs: Date.now() - captureStartedAt,
        averageAmplitude: getDiagnosticsSummary().averageAmplitude,
        maxAmplitude: getDiagnosticsSummary().maxAmplitude,
        outOfRangeSampleCount,
      });
    }
  });

  try {
    logDiagnostics('inicio', {
      platform: Platform.OS,
      sampleRate: 48000,
      channels: 1,
      encoding: 'float32',
    });
    await stream.start();
  } catch (error) {
    stopActivePcmCapture();
    throw error;
  }

  return {
    stopPcmCaptureAsync: async () => {
      const pcmBuffer = await stopActivePcmCaptureAsync();

      if (!pcmBuffer) {
        throw new Error('Nenhum PCM capturado para finalizar.');
      }

      return pcmBuffer;
    },
    getCapturedPcmBuffer,
  };
}

function stopActivePcmCapture() {
  currentStream?.stop();
  currentSubscription?.remove();
  logDiagnostics('fim', {
    durationMs: Date.now() - captureStartedAt,
    sampleRate: capturedSampleRate,
    channels: capturedChannels,
    ...getDiagnosticsSummary(),
  });
  currentStream = null;
  currentSubscription = null;
}

export async function stopActivePcmCaptureAsync(): Promise<PcmAudioBuffer | null> {
  const pcmBuffer = getCapturedPcmBuffer();

  if (!currentStream) {
    return pcmBuffer;
  }

  stopActivePcmCapture();
  return pcmBuffer;
}

export function getCapturedPcmBuffer(): PcmAudioBuffer | null {
  if (!capturedSamples.length) {
    return null;
  }

  return {
    sampleRate: capturedSampleRate,
    channels: capturedChannels,
    samples: [...capturedSamples],
    durationMs: Date.now() - captureStartedAt,
  };
}
