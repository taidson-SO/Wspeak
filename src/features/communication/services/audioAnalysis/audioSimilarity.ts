import type { AudioComparisonScore, AudioFeatureVector } from './audioTypes';

function normalizeDistance(valueA: number, valueB: number, scale: number) {
  if (scale <= 0) {
    return 0;
  }

  return Math.min(Math.abs(valueA - valueB) / scale, 1);
}

function getActiveDuration(features: AudioFeatureVector) {
  return features.activeDurationMs ?? features.durationMs;
}

function getSilenceRatio(features: AudioFeatureVector) {
  return features.silenceRatio ?? 0;
}

function getEnvelopeDistance(currentEnvelope: number[] | undefined, trainedEnvelope: number[] | undefined) {
  if (!currentEnvelope?.length || !trainedEnvelope?.length) {
    return 0.5;
  }

  const length = Math.min(currentEnvelope.length, trainedEnvelope.length);
  let distanceSum = 0;

  for (let index = 0; index < length; index += 1) {
    distanceSum += normalizeDistance(currentEnvelope[index] ?? 0, trainedEnvelope[index] ?? 0, 1);
  }

  return distanceSum / length;
}

export function compareAudioFeatures(current: AudioFeatureVector, trained: AudioFeatureVector): AudioComparisonScore {
  const currentDuration = getActiveDuration(current);
  const trainedDuration = getActiveDuration(trained);
  const durationDistance = normalizeDistance(currentDuration, trainedDuration, Math.max(currentDuration, trainedDuration, 1));
  const averageAmplitudeDistance = normalizeDistance(current.averageAmplitude, trained.averageAmplitude, Math.max(current.averageAmplitude, trained.averageAmplitude, 0.01));
  const rmsEnergyDistance = normalizeDistance(current.rmsEnergy, trained.rmsEnergy, Math.max(current.rmsEnergy, trained.rmsEnergy, 0.01));
  const zcrDistance = normalizeDistance(current.zeroCrossingRate, trained.zeroCrossingRate, 1);
  const silenceDistance = normalizeDistance(getSilenceRatio(current), getSilenceRatio(trained), 1);
  const energyEnvelopeDistance = getEnvelopeDistance(current.energyEnvelope, trained.energyEnvelope);
  const zcrEnvelopeDistance = getEnvelopeDistance(current.zeroCrossingEnvelope, trained.zeroCrossingEnvelope);

  const weightedDistance =
    durationDistance * 0.2 +
    averageAmplitudeDistance * 0.1 +
    rmsEnergyDistance * 0.15 +
    zcrDistance * 0.15 +
    silenceDistance * 0.1 +
    energyEnvelopeDistance * 0.2 +
    zcrEnvelopeDistance * 0.1;

  return {
    distance: weightedDistance,
    similarity: Math.max(0, Math.min(1, 1 - weightedDistance)),
  };
}
