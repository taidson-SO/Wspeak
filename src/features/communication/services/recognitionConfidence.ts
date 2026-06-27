import type { RecognitionResult } from '../types/communication.types';
import { MIN_RECOGNITION_CONFIDENCE } from './personalizedSpeechRecognizer';

export function canSpeakRecognitionResult(result: RecognitionResult): result is RecognitionResult & { predictedWord: string; confidence: number } {
  return Boolean(
    result.mode === 'real_comparison' &&
      result.predictedWord &&
      result.confidence !== null &&
      result.confidence >= MIN_RECOGNITION_CONFIDENCE,
  );
}
