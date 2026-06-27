import { getJsonValue, removeValue, setJsonValue } from '../../../shared/services/localStorage';
import type { RecognitionResult } from '../../communication/types/communication.types';
import type { TrainedWord } from '../../training/types/training.types';
import type { ExerciseAttempt, ExerciseAttemptRecord, ExerciseProgressSummary } from '../types/exercise.types';

const STORAGE_KEY = 'wspeak.exerciseAttempts.v1';
const MAX_STORED_ATTEMPTS = 120;

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createEmptySummary(wordId: string): ExerciseProgressSummary {
  return {
    wordId,
    totalAttempts: 0,
    expectedMatches: 0,
    otherMatches: 0,
    uncertainAttempts: 0,
    unsupportedAttempts: 0,
    lastAttemptAt: null,
  };
}

function toRecord(expectedWord: TrainedWord, attempt: ExerciseAttempt, result: RecognitionResult): ExerciseAttemptRecord {
  return {
    id: createId('exercise-attempt'),
    expectedWordId: expectedWord.id,
    expectedWordText: expectedWord.text,
    predictedWord: result.predictedWord,
    matchedWordId: result.matchedWordId,
    confidence: result.confidence,
    recognitionMode: result.mode,
    feedback: attempt.feedback,
    message: attempt.message,
    createdAt: new Date().toISOString(),
  };
}

function summarize(records: ExerciseAttemptRecord[], wordId: string): ExerciseProgressSummary {
  return records
    .filter((record) => record.expectedWordId === wordId)
    .reduce((summary, record) => {
      return {
        wordId,
        totalAttempts: summary.totalAttempts + 1,
        expectedMatches: summary.expectedMatches + (record.feedback === 'matched_expected' ? 1 : 0),
        otherMatches: summary.otherMatches + (record.feedback === 'matched_other' ? 1 : 0),
        uncertainAttempts: summary.uncertainAttempts + (record.feedback === 'low_confidence' ? 1 : 0),
        unsupportedAttempts: summary.unsupportedAttempts + (record.feedback === 'unsupported_audio' ? 1 : 0),
        lastAttemptAt:
          !summary.lastAttemptAt || record.createdAt > summary.lastAttemptAt ? record.createdAt : summary.lastAttemptAt,
      };
    }, createEmptySummary(wordId));
}

export const exerciseAttemptRepository = {
  async loadAttempts(): Promise<ExerciseAttemptRecord[]> {
    return await getJsonValue<ExerciseAttemptRecord[]>(STORAGE_KEY, []);
  },

  async saveAttempt(expectedWord: TrainedWord, attempt: ExerciseAttempt): Promise<ExerciseAttemptRecord[]> {
    if (!attempt.result) {
      return await this.loadAttempts();
    }

    const attempts = await this.loadAttempts();
    const nextAttempts = [toRecord(expectedWord, attempt, attempt.result), ...attempts].slice(0, MAX_STORED_ATTEMPTS);

    await setJsonValue(STORAGE_KEY, nextAttempts);
    return nextAttempts;
  },

  getSummary(records: ExerciseAttemptRecord[], wordId: string): ExerciseProgressSummary {
    return summarize(records, wordId);
  },

  async clearAll(): Promise<void> {
    await removeValue(STORAGE_KEY);
  },
};
