export type RecognitionMode = 'real_comparison' | 'low_confidence' | 'unsupported_audio' | 'no_training_data';

export type RecognitionResult = {
  predictedWord: string | null;
  confidence: number | null;
  matchedWordId: string | null;
  secondBestWord?: string | null;
  confidenceMargin?: number | null;
  mode: RecognitionMode;
  message: string;
};
