import * as FileSystem from 'expo-file-system/legacy';

import { extractAudioFeatures, extractFeaturesFromPcm } from '../../communication/services/audioAnalysis';
import type { PcmAudioBuffer } from '../../communication/services/audioAnalysis';
import type { Word } from '../../words/types/word.types';
import { getJsonValue, removeValue, setJsonValue } from '../../../shared/services/localStorage';
import type {
  AssessmentSample,
  AssessmentSampleContext,
  AssessmentSession,
  ConfusionRecord,
  HumanAnnotation,
  HumanErrorType,
  HumanListenerType,
} from '../types/assessment.types';

const STORAGE_KEY = 'wspeak.assessmentSessions.v1';

export const MIN_ASSESSMENT_SAMPLES_PER_WORD = 8;
export const MAX_ASSESSMENT_SAMPLES_PER_WORD = 12;

type AddAnnotationInput = {
  sampleId: string;
  listenerType: HumanListenerType;
  perceivedText: string;
  intelligibilityRating: number;
  errorType: HumanErrorType;
  usedContext: boolean;
  neededRepetition: boolean;
  notes?: string;
};

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR');
}

function getNextContext(sampleCount: number): AssessmentSampleContext {
  if (sampleCount < 4) {
    return 'training';
  }

  if (sampleCount < 8) {
    return 'validation';
  }

  return 'test';
}

function normalizeSample(sample: AssessmentSample): AssessmentSample {
  if (sample.analysisStatus === 'ready' && sample.features) {
    return sample;
  }

  return {
    ...sample,
    analysisStatus: sample.analysisStatus === 'error' ? 'error' : 'unsupported',
    analysisMessage: sample.analysisMessage ?? 'Amostra salva para avaliação humana.',
  };
}

async function deleteAudioFileIfExists(audioUri?: string | null) {
  if (!audioUri) {
    return;
  }

  const info = await FileSystem.getInfoAsync(audioUri);
  if (info.exists) {
    await FileSystem.deleteAsync(audioUri, { idempotent: true });
  }
}

async function deleteAssessmentAudioFiles(sessions: AssessmentSession[]) {
  const samples = sessions.flatMap((session) => session.samples);

  await Promise.all(
    samples.map((sample) =>
      deleteAudioFileIfExists(sample.audioUri).catch((error) => {
        console.warn('Falha ao apagar áudio local de avaliação.', error);
      }),
    ),
  );
}

function buildConfusionRecords(sessions: AssessmentSession[]): ConfusionRecord[] {
  const records = new Map<string, ConfusionRecord>();

  sessions.forEach((session) => {
    session.annotations.forEach((annotation) => {
      const targetText = normalizeText(annotation.targetText);
      const perceivedText = normalizeText(annotation.perceivedText);

      if (!perceivedText || perceivedText === targetText) {
        return;
      }

      const key = `${annotation.wordId}:${targetText}:${perceivedText}`;
      const current = records.get(key);

      if (current) {
        records.set(key, {
          ...current,
          count: current.count + 1,
          lastSeenAt: annotation.createdAt > current.lastSeenAt ? annotation.createdAt : current.lastSeenAt,
        });
        return;
      }

      records.set(key, {
        wordId: annotation.wordId,
        targetText: annotation.targetText,
        perceivedText: annotation.perceivedText.trim(),
        count: 1,
        lastSeenAt: annotation.createdAt,
      });
    });
  });

  return [...records.values()].sort((a, b) => b.count - a.count || b.lastSeenAt.localeCompare(a.lastSeenAt));
}

export const assessmentRepository = {
  async loadSessions(): Promise<AssessmentSession[]> {
    const sessions = await getJsonValue<AssessmentSession[]>(STORAGE_KEY, []);

    return sessions.map((session) => ({
      ...session,
      samples: session.samples.map(normalizeSample),
      annotations: session.annotations ?? [],
    }));
  },

  async saveSessions(sessions: AssessmentSession[]): Promise<void> {
    await setJsonValue(STORAGE_KEY, sessions);
  },

  async getOrCreateSession(word: Word): Promise<AssessmentSession[]> {
    const sessions = await this.loadSessions();
    const existing = sessions.find((session) => session.wordId === word.id);

    if (existing) {
      const nextSessions = sessions.map((session) =>
        session.wordId === word.id
          ? {
              ...session,
              targetText: word.text,
              updatedAt: new Date().toISOString(),
            }
          : session,
      );

      await this.saveSessions(nextSessions);
      return nextSessions;
    }

    const now = new Date().toISOString();
    const nextSessions = [
      ...sessions,
      {
        id: createId('assessment'),
        wordId: word.id,
        targetText: word.text,
        status: 'in_progress' as const,
        createdAt: now,
        updatedAt: now,
        samples: [],
        annotations: [],
      },
    ];

    await this.saveSessions(nextSessions);
    return nextSessions;
  },

  async addSample(word: Word, audioUri: string | null, pcmBuffer?: PcmAudioBuffer | null): Promise<AssessmentSession[]> {
    const sessions = await this.getOrCreateSession(word);
    const session = sessions.find((item) => item.wordId === word.id);

    if (!session) {
      throw new Error('Não foi possível preparar a avaliação desta palavra.');
    }

    if (session.samples.length >= MAX_ASSESSMENT_SAMPLES_PER_WORD) {
      await deleteAudioFileIfExists(audioUri);
      throw new Error(`Limite de ${MAX_ASSESSMENT_SAMPLES_PER_WORD} amostras de avaliação atingido para esta palavra.`);
    }

    const createdAt = new Date().toISOString();
    const baseSample: AssessmentSample = {
      id: createId('assessment-sample'),
      sessionId: session.id,
      wordId: word.id,
      targetText: word.text,
      context: getNextContext(session.samples.length),
      audioUri,
      createdAt,
      analysisStatus: 'pending',
    };
    const analysis = pcmBuffer
      ? { status: 'ready' as const, features: extractFeaturesFromPcm(pcmBuffer) }
      : audioUri
        ? await extractAudioFeatures(audioUri)
        : { status: 'unsupported' as const };
    const sample: AssessmentSample =
      analysis.status === 'ready'
        ? {
            ...baseSample,
            analysisStatus: 'ready',
            analysisMessage: 'Amostra pronta para avaliação.',
            features: analysis.features,
          }
        : {
            ...baseSample,
            analysisStatus: 'unsupported',
            analysisMessage: 'Amostra salva para avaliação humana.',
          };

    const nextSessions = sessions.map((item) =>
      item.id === session.id
        ? {
            ...item,
            targetText: word.text,
            updatedAt: createdAt,
            status: item.samples.length + 1 >= MIN_ASSESSMENT_SAMPLES_PER_WORD ? ('completed' as const) : item.status,
            samples: [...item.samples, sample],
          }
        : item,
    );

    await this.saveSessions(nextSessions);
    return nextSessions;
  },

  async addAnnotation(sessionId: string, input: AddAnnotationInput): Promise<AssessmentSession[]> {
    const sessions = await this.loadSessions();
    const session = sessions.find((item) => item.id === sessionId);
    const sample = session?.samples.find((item) => item.id === input.sampleId);

    if (!session || !sample) {
      throw new Error('Escolha uma amostra de avaliação antes de salvar a resposta.');
    }

    const perceivedText = input.perceivedText.trim();

    if (!perceivedText) {
      throw new Error('Informe o que a pessoa entendeu.');
    }

    const annotation: HumanAnnotation = {
      id: createId('annotation'),
      sampleId: sample.id,
      wordId: session.wordId,
      targetText: session.targetText,
      perceivedText,
      listenerType: input.listenerType,
      intelligibilityRating: Math.max(0, Math.min(5, input.intelligibilityRating)),
      errorType: input.errorType,
      usedContext: input.usedContext,
      neededRepetition: input.neededRepetition,
      notes: input.notes?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    const nextSessions = sessions.map((item) =>
      item.id === session.id
        ? {
            ...item,
            updatedAt: annotation.createdAt,
            annotations: [...item.annotations.filter((saved) => saved.sampleId !== sample.id), annotation],
          }
        : item,
    );

    await this.saveSessions(nextSessions);
    return nextSessions;
  },

  getConfusionRecords(sessions: AssessmentSession[]): ConfusionRecord[] {
    return buildConfusionRecords(sessions);
  },

  async clearAll(): Promise<void> {
    const sessions = await this.loadSessions();
    await deleteAssessmentAudioFiles(sessions);
    await removeValue(STORAGE_KEY);
  },
};
