export type AudioFeatureVector = {
  durationMs: number;
  activeDurationMs?: number;
  silenceRatio?: number;
  averageAmplitude: number;
  maxAmplitude: number;
  rmsEnergy: number;
  zeroCrossingRate: number;
  energyEnvelope?: number[];
  zeroCrossingEnvelope?: number[];
  sampleCount: number;
};

export type PcmAudioBuffer = {
  sampleRate: number;
  channels: number;
  samples: number[];
  durationMs: number;
};

export type AudioComparisonScore = {
  distance: number;
  similarity: number;
};

export type AudioFeatureExtractionResult =
  | {
      status: 'ready';
      sourceFormat: 'wav' | 'pcm';
      features: AudioFeatureVector;
    }
  | {
      status: 'unsupported';
      reason: 'PCM_NOT_AVAILABLE' | 'UNSUPPORTED_FORMAT' | 'INVALID_AUDIO';
      sourceFormat: string | null;
      message: string;
    }
  | {
      status: 'error';
      reason: 'READ_FAILED' | 'PARSE_FAILED';
      sourceFormat: string | null;
      message: string;
    };
