import type { Word } from '../../words/types/word.types';
import { getJsonValue, removeValue, setJsonValue } from '../../../shared/services/localStorage';
import * as FileSystem from 'expo-file-system/legacy';
import { extractAudioFeatures, extractFeaturesFromPcm } from '../../communication/services/audioAnalysis';
import type { PcmAudioBuffer } from '../../communication/services/audioAnalysis';
import type { SpeechSample, TrainedWord } from '../types/training.types';

const STORAGE_KEY = 'wspeak.trainedWords.v1';
export const MAX_SAMPLES_PER_WORD = 5;
export const MIN_READY_SAMPLES_TO_FINALIZE = 3;

type SampleAnalysisResult =
  | {
      status: 'ready';
      features: NonNullable<SpeechSample['features']>;
      message: string;
    }
  | {
      status: 'unsupported';
      message: string;
    };

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeSample(sample: SpeechSample): SpeechSample {
  if (sample.analysisStatus === 'ready' && sample.features) {
    return sample;
  }

  return {
    ...sample,
    analysisStatus: 'unsupported',
    analysisMessage: sample.analysisMessage ?? 'Amostra salva. Grave outra se o app não reconhecer bem.',
  };
}

export async function analyzeSample(audioUri: string | null, pcmBuffer?: PcmAudioBuffer | null): Promise<SampleAnalysisResult> {
  try {
    if (pcmBuffer) {
      return {
        status: 'ready',
        features: extractFeaturesFromPcm(pcmBuffer),
        message: 'Amostra pronta para usar.',
      };
    }

    if (audioUri) {
      const analysis = await extractAudioFeatures(audioUri);

      if (analysis.status === 'ready') {
        return {
          status: 'ready',
          features: analysis.features,
          message: 'Amostra pronta para usar.',
        };
      }

      return {
        status: 'unsupported',
        message: analysis.message || 'Amostra salva, mas este áudio ainda não pôde ser analisado.',
      };
    }

    return {
      status: 'unsupported',
      message: 'Amostra salva. Grave outra se o app não reconhecer bem.',
    };
  } catch (error) {
    console.warn('Falha ao analisar amostra de fala.', error);
    return {
      status: 'unsupported',
      message: 'Amostra salva, mas não consegui preparar este áudio para reconhecimento.',
    };
  }
}

export async function safeDeleteAudioFile(audioUri?: string | null) {
  if (!audioUri) {
    return;
  }

  try {
    const info = await FileSystem.getInfoAsync(audioUri);
    if (info.exists) {
      await FileSystem.deleteAsync(audioUri, { idempotent: true });
    }
  } catch (error) {
    console.warn('Falha ao apagar arquivo de áudio local.', error);
  }
}

async function deleteSampleAudioFiles(samples: SpeechSample[]) {
  await Promise.all(samples.map((sample) => safeDeleteAudioFile(sample.audioUri)));
}

export const speechTrainer = {
  async loadTrainedWords(): Promise<TrainedWord[]> {
    const trainedWords = await getJsonValue<TrainedWord[]>(STORAGE_KEY, []);

    return trainedWords.map((word) => ({
      ...word,
      samples: word.samples.map(normalizeSample),
    }));
  },

  async saveTrainedWords(trainedWords: TrainedWord[]): Promise<void> {
    await setJsonValue(STORAGE_KEY, trainedWords);
  },

  async addSample(word: Word, audioUri: string | null, pcmBuffer?: PcmAudioBuffer | null): Promise<TrainedWord[]> {
    const trainedWords = await this.loadTrainedWords();
    const existingWord = trainedWords.find((item) => item.id === word.id);

    if ((existingWord?.samples.length ?? 0) >= MAX_SAMPLES_PER_WORD) {
      await safeDeleteAudioFile(audioUri);
      throw new Error(`Limite de ${MAX_SAMPLES_PER_WORD} amostras atingido para esta palavra.`);
    }

    const baseSample: SpeechSample = {
      id: createId('sample'),
      wordId: word.id,
      audioUri,
      createdAt: new Date().toISOString(),
      analysisStatus: 'pending',
    };
    const analysis = await analyzeSample(audioUri, pcmBuffer);
    const sample: SpeechSample =
      analysis.status === 'ready'
        ? {
            ...baseSample,
            analysisStatus: 'ready',
            analysisMessage: analysis.message,
            features: analysis.features,
          }
        : {
            ...baseSample,
            analysisStatus: 'unsupported',
            analysisMessage: analysis.message,
          };

    const index = trainedWords.findIndex((item) => item.id === word.id);

    if (index === -1) {
      trainedWords.push({
        id: word.id,
        text: word.text,
        samples: [sample],
        trainedAt: sample.createdAt,
      });
    } else {
      trainedWords[index] = {
        ...trainedWords[index],
        text: word.text,
        samples: [...trainedWords[index].samples, sample],
        trainedAt: new Date().toISOString(),
      };
    }

    await this.saveTrainedWords(trainedWords);
    return trainedWords;
  },

  async removeSample(wordId: string, sampleId: string): Promise<TrainedWord[]> {
    const trainedWords = await this.loadTrainedWords();
    const nextWords = trainedWords
      .map((word) => {
        if (word.id !== wordId) {
          return word;
        }

        return {
          ...word,
          samples: word.samples.filter((sample) => sample.id !== sampleId),
        };
      })
      .filter((word) => word.samples.length > 0);

    const sampleToDelete = trainedWords.flatMap((word) => word.samples).find((sample) => sample.id === sampleId);
    if (sampleToDelete) {
      await safeDeleteAudioFile(sampleToDelete.audioUri);
    }

    await this.saveTrainedWords(nextWords);
    return nextWords;
  },

  async removeWordTraining(wordId: string): Promise<TrainedWord[]> {
    const trainedWords = await this.loadTrainedWords();
    const wordToDelete = trainedWords.find((word) => word.id === wordId);
    const nextWords = trainedWords.filter((word) => word.id !== wordId);

    if (wordToDelete) {
      await deleteSampleAudioFiles(wordToDelete.samples);
    }

    await this.saveTrainedWords(nextWords);
    return nextWords;
  },

  async finalizeWordTraining(wordId: string): Promise<TrainedWord | null> {
    const trainedWords = await this.loadTrainedWords();
    const current = trainedWords.find((word) => word.id === wordId);

    if (!current) {
      return null;
    }

    const readySampleCount = current.samples.filter((sample) => sample.analysisStatus === 'ready' && sample.features).length;

    if (readySampleCount < MIN_READY_SAMPLES_TO_FINALIZE) {
      throw new Error(`Grave pelo menos ${MIN_READY_SAMPLES_TO_FINALIZE} amostras prontas para usar antes de concluir este treino.`);
    }

    const finalized = {
      ...current,
      trainedAt: new Date().toISOString(),
    };

    await this.saveTrainedWords(trainedWords.map((word) => (word.id === wordId ? finalized : word)));
    return finalized;
  },

  async updateWordText(wordId: string, text: string): Promise<TrainedWord[]> {
    const trainedWords = await this.loadTrainedWords();
    const trimmedText = text.trim();

    if (!trimmedText) {
      throw new Error('Digite uma palavra para salvar.');
    }

    const nextWords = trainedWords.map((word) => (word.id === wordId ? { ...word, text: trimmedText } : word));

    await this.saveTrainedWords(nextWords);
    return nextWords;
  },

  async clearAll(): Promise<void> {
    const trainedWords = await this.loadTrainedWords();
    await deleteSampleAudioFiles(trainedWords.flatMap((word) => word.samples));
    await removeValue(STORAGE_KEY);
  },
};
