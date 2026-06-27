import { compareAudioFeatures, extractAudioFeatures } from './audioAnalysis';
import { extractFeaturesFromPcm } from './audioAnalysis';
import type { PcmAudioBuffer } from './audioAnalysis';
import type { TrainedWord } from '../../training/types/training.types';
import type { RecognitionResult } from '../types/communication.types';

export const MIN_RECOGNITION_CONFIDENCE = 0.75;
const LOW_CONFIDENCE_MARGIN = 0.045;
const MEDIUM_CONFIDENCE_MARGIN = 0.03;
const HIGH_CONFIDENCE_MARGIN = 0.018;

function getRequiredConfidenceMargin(confidence: number) {
  if (confidence >= 0.9) {
    return HIGH_CONFIDENCE_MARGIN;
  }

  if (confidence >= 0.84) {
    return MEDIUM_CONFIDENCE_MARGIN;
  }

  return LOW_CONFIDENCE_MARGIN;
}

function calculateWordSimilarity(scores: number[]) {
  const bestSimilarity = Math.max(...scores);
  const averageSimilarity = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const variation = scores.reduce((sum, score) => sum + Math.abs(score - averageSimilarity), 0) / scores.length;
  const consistency = Math.max(0, 1 - variation);

  return bestSimilarity * 0.55 + averageSimilarity * 0.35 + consistency * 0.1;
}

export const personalizedSpeechRecognizer = {
  async recognizeAsync(audioUri: string | null, trainedWords: TrainedWord[], pcmBuffer?: PcmAudioBuffer | null): Promise<RecognitionResult> {
    const trainedWordsWithFeatures = trainedWords
      .map((word) => ({
        ...word,
        samples: word.samples.filter((sample) => sample.analysisStatus === 'ready' && sample.features),
      }))
      .filter((word) => word.samples.length > 0);

    if (trainedWords.length === 0) {
      return {
        predictedWord: null,
        confidence: null,
        matchedWordId: null,
        mode: 'no_training_data',
        message: 'Treine pelo menos uma palavra antes de usar a comunicação.',
      };
    }

    if (trainedWordsWithFeatures.length === 0) {
      return {
        predictedWord: null,
        confidence: null,
        matchedWordId: null,
        mode: 'unsupported_audio',
        message: 'Grave novas amostras para melhorar o reconhecimento.',
      };
    }

    const currentAnalysis = pcmBuffer
      ? { status: 'ready' as const, sourceFormat: 'pcm' as const, features: extractFeaturesFromPcm(pcmBuffer) }
      : audioUri
        ? await extractAudioFeatures(audioUri)
        : {
            status: 'unsupported' as const,
            reason: 'PCM_NOT_AVAILABLE' as const,
            sourceFormat: null,
            message: 'Nenhuma origem de áudio analisável foi fornecida.',
          };

    if (currentAnalysis.status !== 'ready') {
      return {
        predictedWord: null,
        confidence: null,
        matchedWordId: null,
        mode: 'unsupported_audio',
        message: 'Não consegui entender esse áudio. Grave de novo com calma.',
      };
    }

    const rankedWords = trainedWordsWithFeatures
      .map((word) => {
        const scores = word.samples.map((sample) =>
          compareAudioFeatures(currentAnalysis.features, sample.features as NonNullable<typeof sample.features>),
        );
        const similarityScores = scores.map((score) => score.similarity);
        const similarity = calculateWordSimilarity(similarityScores);

        return {
          word,
          similarity,
        };
      })
      .sort((left, right) => right.similarity - left.similarity);

    const bestMatch = rankedWords[0];
    const secondBestMatch = rankedWords[1] ?? null;

    if (!bestMatch) {
      return {
        predictedWord: null,
        confidence: null,
        matchedWordId: null,
        mode: 'unsupported_audio',
        message: 'Não foi possível calcular uma comparação útil com as amostras treinadas.',
      };
    }

    const confidence = Math.max(0, Math.min(1, bestMatch.similarity));
    const confidenceMargin = secondBestMatch ? Math.max(0, bestMatch.similarity - secondBestMatch.similarity) : 1;
    const requiredConfidenceMargin = getRequiredConfidenceMargin(confidence);

    if (confidence < MIN_RECOGNITION_CONFIDENCE || confidenceMargin < requiredConfidenceMargin) {
      return {
        predictedWord: bestMatch.word.text,
        confidence,
        matchedWordId: bestMatch.word.id,
        secondBestWord: secondBestMatch?.word.text ?? null,
        confidenceMargin,
        mode: 'low_confidence',
        message: secondBestMatch
          ? `Fiquei em dúvida entre ${bestMatch.word.text} e ${secondBestMatch.word.text}. Grave de novo com calma.`
          : 'Encontrei uma palavra parecida, mas ainda não tenho certeza para falar por voz.',
      };
    }

    return {
      predictedWord: bestMatch.word.text,
      confidence,
      matchedWordId: bestMatch.word.id,
      secondBestWord: secondBestMatch?.word.text ?? null,
      confidenceMargin,
      mode: 'real_comparison',
      message: 'O app comparou com as suas amostras treinadas.',
    };
  },
};
