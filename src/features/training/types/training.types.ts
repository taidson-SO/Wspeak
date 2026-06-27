import type { AudioFeatureVector } from '../../communication/services/audioAnalysis';
import type { Word } from '../../words/types/word.types';

export type SpeechSample = {
  id: string;
  wordId: string;
  audioUri?: string | null;
  createdAt: string;
  analysisStatus: 'pending' | 'ready' | 'unsupported' | 'error';
  analysisMessage?: string;
  features?: AudioFeatureVector;
};

export type TrainedWord = {
  id: string;
  text: string;
  samples: SpeechSample[];
  trainedAt: string;
};

export type TrainingViewState = {
  selectedWord: Word | null;
  status: string;
};
