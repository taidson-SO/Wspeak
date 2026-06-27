import * as FileSystem from 'expo-file-system/legacy';

import type { AudioFeatureExtractionResult, AudioFeatureVector, PcmAudioBuffer } from './audioTypes';

const WAV_HEADER_MIN_SIZE = 44;
const ENVELOPE_SEGMENTS = 8;
const SILENCE_FLOOR = 0.015;
const MIN_TRIMMED_SAMPLE_COUNT = 256;

function createUnsupported(
  reason: 'PCM_NOT_AVAILABLE' | 'UNSUPPORTED_FORMAT' | 'INVALID_AUDIO',
  message: string,
  sourceFormat: string | null,
): AudioFeatureExtractionResult {
  return {
    status: 'unsupported',
    reason,
    message,
    sourceFormat,
  };
}

function createError(reason: 'READ_FAILED' | 'PARSE_FAILED', message: string, sourceFormat: string | null): AudioFeatureExtractionResult {
  return {
    status: 'error',
    reason,
    message,
    sourceFormat,
  };
}

function base64ToBytes(base64Value: string) {
  const decoder = globalThis.atob;

  if (typeof decoder !== 'function') {
    return null;
  }

  const binaryString = decoder(base64Value);
  const bytes = new Uint8Array(binaryString.length);

  for (let index = 0; index < binaryString.length; index += 1) {
    bytes[index] = binaryString.charCodeAt(index);
  }

  return bytes;
}

function readAscii(bytes: Uint8Array, start: number, length: number) {
  let output = '';

  for (let index = start; index < start + length; index += 1) {
    output += String.fromCharCode(bytes[index]);
  }

  return output;
}

function readUInt16(view: DataView, offset: number) {
  return view.getUint16(offset, true);
}

function readUInt32(view: DataView, offset: number) {
  return view.getUint32(offset, true);
}

function detectFormat(audioUri: string, bytes: Uint8Array | null) {
  const lowerUri = audioUri.toLowerCase();

  if (bytes && bytes.length >= 12 && readAscii(bytes, 0, 4) === 'RIFF' && readAscii(bytes, 8, 4) === 'WAVE') {
    return 'wav' as const;
  }

  if (lowerUri.endsWith('.m4a') || lowerUri.endsWith('.aac') || lowerUri.endsWith('.mp4') || lowerUri.endsWith('.caf')) {
    return 'compressed' as const;
  }

  return null;
}

function clampSample(sample: number) {
  if (!Number.isFinite(sample)) {
    return 0;
  }

  return Math.max(-1, Math.min(1, sample));
}

function trimSilence(samples: number[]) {
  if (samples.length < MIN_TRIMMED_SAMPLE_COUNT) {
    return samples;
  }

  const maxAmplitude = samples.reduce((maxValue, sample) => Math.max(maxValue, Math.abs(sample)), 0);
  const threshold = Math.max(SILENCE_FLOOR, maxAmplitude * 0.08);
  let startIndex = 0;
  let endIndex = samples.length - 1;

  while (startIndex < samples.length && Math.abs(samples[startIndex] ?? 0) < threshold) {
    startIndex += 1;
  }

  while (endIndex > startIndex && Math.abs(samples[endIndex] ?? 0) < threshold) {
    endIndex -= 1;
  }

  if (endIndex - startIndex + 1 < MIN_TRIMMED_SAMPLE_COUNT) {
    return samples;
  }

  return samples.slice(startIndex, endIndex + 1);
}

function normalizeVolume(samples: number[]) {
  const maxAmplitude = samples.reduce((maxValue, sample) => Math.max(maxValue, Math.abs(sample)), 0);

  if (maxAmplitude <= 0) {
    return samples;
  }

  return samples.map((sample) => sample / maxAmplitude);
}

function createSegments(samples: number[], segmentCount: number) {
  return Array.from({ length: segmentCount }, (_, segmentIndex) => {
    const start = Math.floor((samples.length * segmentIndex) / segmentCount);
    const end = Math.floor((samples.length * (segmentIndex + 1)) / segmentCount);
    return samples.slice(start, Math.max(start + 1, end));
  });
}

function calculateZeroCrossingRate(samples: number[]) {
  if (samples.length <= 1) {
    return 0;
  }

  let zeroCrossings = 0;
  let previousSample = samples[0] ?? 0;

  for (let index = 1; index < samples.length; index += 1) {
    const sample = samples[index] ?? 0;
    const crossedZero = (previousSample <= 0 && sample > 0) || (previousSample >= 0 && sample < 0);
    if (crossedZero) {
      zeroCrossings += 1;
    }

    previousSample = sample;
  }

  return zeroCrossings / (samples.length - 1);
}

function calculateRmsEnergy(samples: number[]) {
  if (!samples.length) {
    return 0;
  }

  const squaredAmplitudeSum = samples.reduce((sum, sample) => sum + sample * sample, 0);
  return Math.sqrt(squaredAmplitudeSum / samples.length);
}

function calculateFeaturesFromSamples(samples: number[], sampleRate: number, originalDurationMs?: number): AudioFeatureVector {
  if (!samples.length) {
    return {
      durationMs: originalDurationMs ?? 0,
      activeDurationMs: 0,
      silenceRatio: 0,
      averageAmplitude: 0,
      maxAmplitude: 0,
      rmsEnergy: 0,
      zeroCrossingRate: 0,
      energyEnvelope: Array(ENVELOPE_SEGMENTS).fill(0),
      zeroCrossingEnvelope: Array(ENVELOPE_SEGMENTS).fill(0),
      sampleCount: 0,
    };
  }

  const clampedSamples = samples.map(clampSample);
  const trimmedSamples = trimSilence(clampedSamples);
  const normalizedSamples = normalizeVolume(trimmedSamples);
  const absoluteAmplitudeSum = normalizedSamples.reduce((sum, sample) => sum + Math.abs(sample), 0);
  const maxAmplitude = normalizedSamples.reduce((maxValue, sample) => Math.max(maxValue, Math.abs(sample)), 0);
  const segments = createSegments(normalizedSamples, ENVELOPE_SEGMENTS);
  const rawEnergyEnvelope = segments.map(calculateRmsEnergy);
  const maxSegmentEnergy = rawEnergyEnvelope.reduce((maxValue, energy) => Math.max(maxValue, energy), 0);
  const energyEnvelope = maxSegmentEnergy > 0 ? rawEnergyEnvelope.map((energy) => energy / maxSegmentEnergy) : rawEnergyEnvelope;
  const activeDurationMs = (trimmedSamples.length / sampleRate) * 1000;
  const durationMs = originalDurationMs ?? (samples.length / sampleRate) * 1000;

  return {
    durationMs,
    activeDurationMs,
    silenceRatio: Math.max(0, Math.min(1, 1 - trimmedSamples.length / samples.length)),
    averageAmplitude: absoluteAmplitudeSum / normalizedSamples.length,
    maxAmplitude,
    rmsEnergy: calculateRmsEnergy(normalizedSamples),
    zeroCrossingRate: calculateZeroCrossingRate(normalizedSamples),
    energyEnvelope,
    zeroCrossingEnvelope: segments.map(calculateZeroCrossingRate),
    sampleCount: trimmedSamples.length,
  };
}

function parseWav(bytes: Uint8Array): AudioFeatureVector | AudioFeatureExtractionResult {
  if (bytes.length < WAV_HEADER_MIN_SIZE) {
    return createUnsupported('INVALID_AUDIO', 'O WAV está incompleto ou corrompido.', 'wav');
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let formatCode = 0;
  let channels = 0;
  let sampleRate = 0;
  let bitsPerSample = 0;
  let dataOffset = -1;
  let dataSize = 0;

  let offset = 12;

  while (offset + 8 <= bytes.length) {
    const chunkId = readAscii(bytes, offset, 4);
    const chunkSize = readUInt32(view, offset + 4);
    const chunkDataStart = offset + 8;

    if (chunkId === 'fmt ') {
      formatCode = readUInt16(view, chunkDataStart);
      channels = readUInt16(view, chunkDataStart + 2);
      sampleRate = readUInt32(view, chunkDataStart + 4);
      bitsPerSample = readUInt16(view, chunkDataStart + 14);
    }

    if (chunkId === 'data') {
      dataOffset = chunkDataStart;
      dataSize = chunkSize;
      break;
    }

    offset = chunkDataStart + chunkSize + (chunkSize % 2);
  }

  if (!channels || !sampleRate || !bitsPerSample || dataOffset < 0) {
    return createUnsupported('INVALID_AUDIO', 'O WAV não expõe metadados suficientes para análise.', 'wav');
  }

  if (formatCode !== 1 && formatCode !== 3) {
    return createUnsupported('UNSUPPORTED_FORMAT', 'O WAV usa um codec ainda não tratado pela análise local.', 'wav');
  }

  const bytesPerSample = bitsPerSample / 8;

  if (!Number.isFinite(bytesPerSample) || bytesPerSample <= 0) {
    return createUnsupported('INVALID_AUDIO', 'A profundidade de bits do WAV é inválida.', 'wav');
  }

  const framesAvailable = Math.floor(dataSize / (bytesPerSample * channels));

  if (framesAvailable <= 0) {
    return createUnsupported('INVALID_AUDIO', 'O WAV não contém amostras suficientes para análise.', 'wav');
  }

  const samples: number[] = [];

  for (let frameIndex = 0; frameIndex < framesAvailable; frameIndex += 1) {
    let mixedSample = 0;

    for (let channelIndex = 0; channelIndex < channels; channelIndex += 1) {
      const sampleOffset = dataOffset + (frameIndex * channels + channelIndex) * bytesPerSample;
      let sampleValue = 0;

      if (formatCode === 1 && bitsPerSample === 16) {
        sampleValue = view.getInt16(sampleOffset, true) / 32768;
      } else if (formatCode === 1 && bitsPerSample === 8) {
        sampleValue = (view.getUint8(sampleOffset) - 128) / 128;
      } else if (formatCode === 3 && bitsPerSample === 32) {
        sampleValue = view.getFloat32(sampleOffset, true);
      } else {
        return createUnsupported('UNSUPPORTED_FORMAT', 'O WAV usa um formato numérico ainda não tratado.', 'wav');
      }

      mixedSample += sampleValue;
    }

    mixedSample /= channels;
    samples.push(mixedSample);
  }

  return calculateFeaturesFromSamples(samples, sampleRate);
}

export function extractFeaturesFromPcm(buffer: PcmAudioBuffer): AudioFeatureVector {
  return calculateFeaturesFromSamples(buffer.samples, buffer.sampleRate, buffer.durationMs);
}

export async function extractAudioFeatures(audioUri: string): Promise<AudioFeatureExtractionResult> {
  try {
    const info = await FileSystem.getInfoAsync(audioUri);

    if (!info.exists) {
      return createError('READ_FAILED', 'O arquivo de áudio não existe mais no armazenamento local.', null);
    }

    const formatHint = detectFormat(audioUri, null);

    if (formatHint === 'compressed') {
      return createUnsupported('PCM_NOT_AVAILABLE', 'O áudio gravado ainda está comprimido e não expõe PCM para análise local.', formatHint);
    }

    const base64Content = await FileSystem.readAsStringAsync(audioUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const bytes = base64ToBytes(base64Content);

    if (!bytes) {
      return createUnsupported('PCM_NOT_AVAILABLE', 'O ambiente atual não conseguiu converter o áudio em bytes analisáveis.', formatHint);
    }

    const detectedFormat = detectFormat(audioUri, bytes);

    if (detectedFormat !== 'wav') {
      return createUnsupported('PCM_NOT_AVAILABLE', 'O áudio ainda não está em formato PCM/WAV para comparação local.', detectedFormat);
    }

    const parsed = parseWav(bytes);

    if (typeof parsed !== 'object' || parsed === null || !('status' in parsed)) {
      return {
        status: 'ready',
        sourceFormat: 'wav',
        features: parsed,
      };
    }

    return parsed;
  } catch (error) {
    return createError('READ_FAILED', error instanceof Error ? error.message : 'Falha ao ler o arquivo de áudio.', null);
  }
}
