import type { RecognitionResult } from '../../communication/types/communication.types';
import type { TrainedWord } from '../../training/types/training.types';

export type ExerciseFeedback =
  | 'idle'
  | 'no_training'
  | 'recording'
  | 'recognizing'
  | 'matched_expected'
  | 'matched_other'
  | 'low_confidence'
  | 'unsupported_audio'
  | 'error';

export type ExerciseAttempt = {
  expectedWord: TrainedWord | null;
  result: RecognitionResult | null;
  feedback: ExerciseFeedback;
  message: string;
};

export type ExerciseAttemptRecord = {
  id: string;
  expectedWordId: string;
  expectedWordText: string;
  predictedWord: string | null;
  matchedWordId: string | null;
  confidence: number | null;
  recognitionMode: RecognitionResult['mode'];
  feedback: ExerciseFeedback;
  message: string;
  createdAt: string;
};

export type ExerciseProgressSummary = {
  wordId: string;
  totalAttempts: number;
  expectedMatches: number;
  otherMatches: number;
  uncertainAttempts: number;
  unsupportedAttempts: number;
  lastAttemptAt: string | null;
};
