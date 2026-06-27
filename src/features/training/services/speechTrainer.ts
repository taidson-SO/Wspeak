import type { Word } from '../../words/types/word.types';
import { getJsonValue, removeValue, setJsonValue } from '../../../shared/services/localStorage';
import * as FileSystem from 'expo-file-system/legacy';
import { extractAudioFeatures, extractFeaturesFromPcm } from '../../communication/services/audioAnalysis';
import type { PcmAudioBuffer } from '../../communication/services/audioAnalysis';
import type { SpeechSample, TrainedWord } from '../types/training.types';

const STORAGE_KEY = 'wspeak.trainedWords.v1';
export const MAX_SAMPLES_PER_WORD = 5;

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

async function deleteAudioFileIfExists(audioUri?: string | null) {
  if (!audioUri) {
    return;
  }

  const info = await FileSystem.getInfoAsync(audioUri);
  if (info.exists) {
    await FileSystem.deleteAsync(audioUri, { idempotent: true });
  }
}

async function deleteSampleAudioFiles(samples: SpeechSample[]) {
  await Promise.all(
    samples.map((sample) =>
      deleteAudioFileIfExists(sample.audioUri).catch((error) => {
        console.warn('Falha ao apagar arquivo de áudio local.', error);
      }),
    ),
  );
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
      await deleteAudioFileIfExists(audioUri);
      throw new Error(`Limite de ${MAX_SAMPLES_PER_WORD} amostras atingido para esta palavra.`);
    }

    const baseSample: SpeechSample = {
      id: createId('sample'),
      wordId: word.id,
      audioUri,
      createdAt: new Date().toISOString(),
      analysisStatus: 'pending',
    };
    const analysis = pcmBuffer
      ? { status: 'ready' as const, features: extractFeaturesFromPcm(pcmBuffer) }
      : audioUri
        ? await extractAudioFeatures(audioUri)
        : { status: 'unsupported' as const };
    const sample: SpeechSample =
      analysis.status === 'ready'
        ? {
            ...baseSample,
            analysisStatus: 'ready',
            analysisMessage: 'Amostra pronta para usar.',
            features: analysis.features,
          }
        : {
            ...baseSample,
            analysisStatus: 'unsupported',
            analysisMessage: 'Amostra salva. Grave outra se o app não reconhecer bem.',
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
      await deleteAudioFileIfExists(sampleToDelete.audioUri);
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

    const finalized = {
      ...current,
      trainedAt: new Date().toISOString(),
    };

    await this.saveTrainedWords(trainedWords.map((word) => (word.id === wordId ? finalized : word)));
    return finalized;
  },

  async updateWordText(wordId: string, text: string): Promise<TrainedWord[]> {
    const trainedWords = await this.loadTrainedWords();
    const nextWords = trainedWords.map((word) => (word.id === wordId ? { ...word, text } : word));

    await this.saveTrainedWords(nextWords);
    return nextWords;
  },

  async clearAll(): Promise<void> {
    const trainedWords = await this.loadTrainedWords();
    await deleteSampleAudioFiles(trainedWords.flatMap((word) => word.samples));
    await removeValue(STORAGE_KEY);
  },
};
