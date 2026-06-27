import type { AudioComparisonScore, AudioFeatureVector, AudioFrameFeature } from './audioTypes';

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

function compareGlobalFeatures(current: AudioFeatureVector, trained: AudioFeatureVector) {
  const currentDuration = getActiveDuration(current);
  const trainedDuration = getActiveDuration(trained);
  const durationDistance = normalizeDistance(currentDuration, trainedDuration, Math.max(currentDuration, trainedDuration, 1));
  const averageAmplitudeDistance = normalizeDistance(current.averageAmplitude, trained.averageAmplitude, Math.max(current.averageAmplitude, trained.averageAmplitude, 0.01));
  const rmsEnergyDistance = normalizeDistance(current.rmsEnergy, trained.rmsEnergy, Math.max(current.rmsEnergy, trained.rmsEnergy, 0.01));
  const zcrDistance = normalizeDistance(current.zeroCrossingRate, trained.zeroCrossingRate, 1);
  const silenceDistance = normalizeDistance(getSilenceRatio(current), getSilenceRatio(trained), 1);
  const energyEnvelopeDistance = getEnvelopeDistance(current.energyEnvelope, trained.energyEnvelope);
  const zcrEnvelopeDistance = getEnvelopeDistance(current.zeroCrossingEnvelope, trained.zeroCrossingEnvelope);

  return (
    durationDistance * 0.2 +
    averageAmplitudeDistance * 0.1 +
    rmsEnergyDistance * 0.15 +
    zcrDistance * 0.15 +
    silenceDistance * 0.1 +
    energyEnvelopeDistance * 0.2 +
    zcrEnvelopeDistance * 0.1
  );
}

function getFrameDistance(current: AudioFrameFeature, trained: AudioFrameFeature) {
  const averageAmplitudeDistance = normalizeDistance(
    current.averageAmplitude,
    trained.averageAmplitude,
    Math.max(current.averageAmplitude, trained.averageAmplitude, 0.01),
  );
  const maxAmplitudeDistance = normalizeDistance(current.maxAmplitude, trained.maxAmplitude, 1);
  const rmsEnergyDistance = normalizeDistance(current.rmsEnergy, trained.rmsEnergy, Math.max(current.rmsEnergy, trained.rmsEnergy, 0.01));
  const zcrDistance = normalizeDistance(current.zeroCrossingRate, trained.zeroCrossingRate, 1);

  return averageAmplitudeDistance * 0.2 + maxAmplitudeDistance * 0.1 + rmsEnergyDistance * 0.45 + zcrDistance * 0.25;
}

function getDtwDistance(currentFrames: AudioFrameFeature[], trainedFrames: AudioFrameFeature[]) {
  if (currentFrames.length < 2 || trainedFrames.length < 2) {
    return null;
  }

  let previousRow = Array(trainedFrames.length + 1).fill(Number.POSITIVE_INFINITY) as number[];
  previousRow[0] = 0;

  for (let currentIndex = 1; currentIndex <= currentFrames.length; currentIndex += 1) {
    const currentRow = Array(trainedFrames.length + 1).fill(Number.POSITIVE_INFINITY) as number[];
    const currentFrame = currentFrames[currentIndex - 1];

    for (let trainedIndex = 1; trainedIndex <= trainedFrames.length; trainedIndex += 1) {
      const trainedFrame = trainedFrames[trainedIndex - 1];
      const localDistance = getFrameDistance(currentFrame, trainedFrame);
      const previousBest = Math.min(previousRow[trainedIndex] ?? Number.POSITIVE_INFINITY, currentRow[trainedIndex - 1] ?? Number.POSITIVE_INFINITY, previousRow[trainedIndex - 1] ?? Number.POSITIVE_INFINITY);
      currentRow[trainedIndex] = localDistance + previousBest;
    }

    previousRow = currentRow;
  }

  const pathLengthEstimate = Math.max(currentFrames.length, trainedFrames.length);
  return Math.min((previousRow[trainedFrames.length] ?? Number.POSITIVE_INFINITY) / Math.max(1, pathLengthEstimate), 1);
}

export function compareAudioFeatures(current: AudioFeatureVector, trained: AudioFeatureVector): AudioComparisonScore {
  const globalDistance = compareGlobalFeatures(current, trained);
  const temporalDistance = getDtwDistance(current.frames ?? [], trained.frames ?? []);
  const weightedDistance =
    temporalDistance === null
      ? globalDistance
      : globalDistance * 0.45 + temporalDistance * 0.55;

  return {
    distance: weightedDistance,
    similarity: Math.max(0, Math.min(1, 1 - weightedDistance)),
  };
}
