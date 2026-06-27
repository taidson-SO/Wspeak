import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Button } from '../../../shared/components/Button';
import { ScreenContainer } from '../../../shared/components/ScreenContainer';
import { Text } from '../../../shared/components/Text';
import { colors } from '../../../shared/theme/colors';
import { spacing } from '../../../shared/theme/spacing';
import { startAudioRecordingAsync, stopActiveAudioRecordingAsync, stopAudioRecordingAsync } from '../../../shared/services/audioRecorder';
import { personalizedSpeechRecognizer } from '../services/personalizedSpeechRecognizer';
import { canSpeakRecognitionResult } from '../services/recognitionConfidence';
import { speakWordAsync, stopSpeechAsync } from '../services/speechOutput';
import { RecognitionResult } from '../types/communication.types';
import { CommunicationResultPanel } from '../components/CommunicationResultPanel';
import { CommunicationRecorder } from '../components/CommunicationRecorder';
import { getCapturedPcmBuffer, isPcmCaptureAvailable, startPcmCaptureAsync, stopActivePcmCaptureAsync } from '../services/audioAnalysis/pcmCapture';
import type { PcmAudioBuffer } from '../services/audioAnalysis/audioTypes';
import type { TrainedWord } from '../../training/types/training.types';

type PcmCaptureSession = {
  stopPcmCaptureAsync: () => Promise<PcmAudioBuffer>;
  getCapturedPcmBuffer: () => PcmAudioBuffer | null;
};

type Props = {
  trainedWords: TrainedWord[];
  onBack: () => void;
  onOpenTraining: () => void;
};

function logRecognitionResultInDevelopment(result: RecognitionResult) {
  if (!__DEV__) {
    return;
  }

  console.log('Resultado do reconhecimento personalizado', {
    predictedWord: result.predictedWord,
    confidence: result.confidence,
    matchedWordId: result.matchedWordId,
    secondBestWord: result.secondBestWord ?? null,
    confidenceMargin: result.confidenceMargin ?? null,
  });
}

export function CommunicationScreen({ trainedWords, onBack, onOpenTraining }: Props) {
  const [status, setStatus] = useState('Aguardando');
  const [isRecording, setIsRecording] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [isPcmExperimentActive, setIsPcmExperimentActive] = useState(false);
  const [pcmSession, setPcmSession] = useState<PcmCaptureSession | null>(null);
  const [result, setResult] = useState<RecognitionResult | null>(null);
  const hasTraining = trainedWords.some((word) => word.samples.filter((sample) => sample.analysisStatus === 'ready' && sample.features).length >= 3);

  useEffect(() => {
    return () => {
      stopSpeechAsync();
      stopOpenCaptureAsync();
    };
  }, []);

  async function stopOpenCaptureAsync() {
    await stopActiveAudioRecordingAsync().catch((error) => {
      console.warn('Falha ao encerrar gravação ativa na comunicação.', error);
    });
    await stopActivePcmCaptureAsync().catch((error) => {
      console.warn('Falha ao encerrar captura PCM ativa na comunicação.', error);
    });
  }

  async function handleBack() {
    if (isRecording || isProcessing) {
      setStatus('Encerrando gravação');
    }

    await stopOpenCaptureAsync();
    stopSpeechAsync();
    setIsRecording(false);
    setIsPreparing(false);
    setIsRecognizing(false);
    setIsPcmExperimentActive(false);
    setPcmSession(null);
    onBack();
  }

  async function handleRecord() {
    if (!hasTraining) {
      setStatus('Treine uma palavra antes de comunicar.');
      setResult({
        predictedWord: null,
        confidence: null,
        matchedWordId: null,
        mode: 'no_training_data',
        message: 'Treine uma palavra antes de comunicar.',
      });
      return;
    }

    if (isProcessing || isPreparing || isRecording) {
      return;
    }

    try {
      stopSpeechAsync();
      setResult(null);
      setIsPreparing(true);
      setStatus('Preparando microfone');
      if (isPcmCaptureAvailable()) {
        try {
          const session = await startPcmCaptureAsync();
          setPcmSession(session);
          setIsPcmExperimentActive(true);
        } catch (pcmError) {
          console.warn('Captura PCM indisponível, usando gravação atual.', pcmError);
          await startAudioRecordingAsync();
          setIsPcmExperimentActive(false);
        }
      } else {
        await startAudioRecordingAsync();
        setIsPcmExperimentActive(false);
      }
      setStatus('Gravando');
      setIsRecording(true);
    } catch (error) {
      console.error('Erro ao iniciar gravação', error);
      setStatus('Não consegui acessar o microfone. Verifique a permissão e tente de novo.');
      setIsRecording(false);
    } finally {
      setIsPreparing(false);
    }
  }

  async function handleStop() {
    if (!isRecording || isRecognizing) {
      return;
    }

    try {
      setIsProcessing(true);
      setIsRecognizing(true);
      setStatus('Reconhecendo');
      const pcmBuffer = isPcmExperimentActive
        ? await pcmSession
            ?.stopPcmCaptureAsync()
            .catch((pcmError) => {
              console.warn('Falha ao finalizar a captura PCM da comunicação.', pcmError);
              return getCapturedPcmBuffer();
            }) ?? getCapturedPcmBuffer()
        : null;
      const audioUri = isPcmExperimentActive ? null : await stopAudioRecordingAsync();
      const recognitionResult = await personalizedSpeechRecognizer.recognizeAsync(audioUri, trainedWords, pcmBuffer);
      setResult(recognitionResult);
      logRecognitionResultInDevelopment(recognitionResult);

      if (canSpeakRecognitionResult(recognitionResult)) {
        setStatus('Reproduzindo');
        await speakWordAsync(recognitionResult.predictedWord);
        setStatus('Palavra pronta para mostrar');
      } else {
        setStatus(recognitionResult.mode === 'low_confidence' ? 'Não tenho certeza' : 'Não entendi');
      }
    } catch (error) {
      console.error('Erro ao reconhecer fala', error);
      Alert.alert('Erro', 'Não foi possível reconhecer a fala.');
      setStatus('Falha ao reconhecer.');
    } finally {
      setIsProcessing(false);
      setIsRecognizing(false);
      setIsRecording(false);
      setIsPcmExperimentActive(false);
      setPcmSession(null);
    }
  }

  async function handleRepeatSpeech() {
    if (!result || !canSpeakRecognitionResult(result) || isProcessing || isRecording) {
      return;
    }

    setIsProcessing(true);
    try {
      setStatus('Repetindo voz');
      await speakWordAsync(result.predictedWord);
      setStatus('Palavra pronta para mostrar');
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Button title="Voltar" onPress={handleBack} variant="ghost" />
        <Text variant="title" style={styles.title}>
          Comunicar
        </Text>
        <Text variant="body" style={styles.subtitle}>
          Grave sua fala e mostre a palavra reconhecida para outra pessoa.
        </Text>
        <Text variant="caption" accessibilityLiveRegion="polite">
          {status}
        </Text>
      </View>

      <View style={styles.card}>
        <CommunicationRecorder
          status={status}
          isRecording={isRecording}
          isPreparing={isPreparing}
          isWorking={isRecognizing}
          workingLabel="Tentando entender"
          disabled={isProcessing || isPreparing}
          stopDisabled={isRecognizing}
          onRecord={handleRecord}
          onStop={handleStop}
        />
        {!hasTraining ? <Text variant="caption">Treine uma palavra antes de comunicar.</Text> : null}
        {!hasTraining ? <Button title="Treinar primeiro" onPress={onOpenTraining} variant="secondary" /> : null}
      </View>

      <CommunicationResultPanel result={result} isBusy={isRecording || isProcessing} onRepeat={handleRepeatSpeech} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.primaryDark,
  },
  subtitle: {
    color: colors.muted,
  },
  card: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
});
