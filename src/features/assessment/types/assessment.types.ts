import type { AudioFeatureVector } from '../../communication/services/audioAnalysis';

export type AssessmentSampleContext = 'training' | 'validation' | 'test';

export type AssessmentSessionStatus = 'in_progress' | 'completed';

export type HumanListenerType = 'familiar' | 'unfamiliar' | 'speech_therapist' | 'caregiver';

export type HumanErrorType = 'omission' | 'substitution' | 'distortion' | 'addition' | 'inconsistent' | 'unclassified';

export type AssessmentSample = {
  id: string;
  sessionId: string;
  wordId: string;
  targetText: string;
  context: AssessmentSampleContext;
  audioUri?: string | null;
  createdAt: string;
  analysisStatus: 'pending' | 'ready' | 'unsupported' | 'error';
  analysisMessage?: string;
  features?: AudioFeatureVector;
};

export type HumanAnnotation = {
  id: string;
  sampleId: string;
  wordId: string;
  targetText: string;
  perceivedText: string;
  listenerType: HumanListenerType;
  intelligibilityRating: number;
  errorType: HumanErrorType;
  usedContext: boolean;
  neededRepetition: boolean;
  notes?: string;
  createdAt: string;
};

export type AssessmentSession = {
  id: string;
  wordId: string;
  targetText: string;
  status: AssessmentSessionStatus;
  createdAt: string;
  updatedAt: string;
  samples: AssessmentSample[];
  annotations: HumanAnnotation[];
};

export type ConfusionRecord = {
  wordId: string;
  targetText: string;
  perceivedText: string;
  count: number;
  lastSeenAt: string;
};
