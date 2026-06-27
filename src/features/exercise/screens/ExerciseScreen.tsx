import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '../../../shared/components/Button';
import { ScreenContainer } from '../../../shared/components/ScreenContainer';
import { Text } from '../../../shared/components/Text';
import { startAudioRecordingAsync, stopActiveAudioRecordingAsync, stopAudioRecordingAsync } from '../../../shared/services/audioRecorder';
import { colors } from '../../../shared/theme/colors';
import { spacing } from '../../../shared/theme/spacing';
import { CommunicationRecorder } from '../../communication/components/CommunicationRecorder';
import { getCapturedPcmBuffer, isPcmCaptureAvailable, startPcmCaptureAsync, stopActivePcmCaptureAsync } from '../../communication/services/audioAnalysis/pcmCapture';
import type { PcmAudioBuffer } from '../../communication/services/audioAnalysis/audioTypes';
import { personalizedSpeechRecognizer } from '../../communication/services/personalizedSpeechRecognizer';
import { canSpeakRecognitionResult } from '../../communication/services/recognitionConfidence';
import { speakWordAsync, stopSpeechAsync } from '../../communication/services/speechOutput';
import type { RecognitionResult } from '../../communication/types/communication.types';
import type { TrainedWord } from '../../training/types/training.types';
import { ExerciseFeedbackCard } from '../components/ExerciseFeedbackCard';
import { exerciseAttemptRepository } from '../services/exerciseAttemptRepository';
import type { ExerciseAttempt, ExerciseAttemptRecord, ExerciseFeedback } from '../types/exercise.types';

type PcmCaptureSession = {
  stopPcmCaptureAsync: () => Promise<PcmAudioBuffer>;
  getCapturedPcmBuffer: () => PcmAudioBuffer | null;
};

type Props = {
  trainedWords: TrainedWord[];
  onBack: () => void;
  onOpenTraining: () => void;
};

function createAttempt(expectedWord: TrainedWord | null, result: RecognitionResult | null, feedback: ExerciseFeedback, message: string): ExerciseAttempt {
  return {
    expectedWord,
    result,
    feedback,
    message,
  };
}

function createFeedback(expectedWord: TrainedWord | null, result: RecognitionResult): ExerciseAttempt {
  if (!expectedWord) {
    return createAttempt(null, result, 'no_training', 'Treine uma palavra antes de começar.');
  }

  if (result.mode === 'unsupported_audio') {
    return createAttempt(expectedWord, result, 'unsupported_audio', 'Não consegui entender esse áudio. Tente gravar novamente com calma.');
  }

  if (result.mode === 'low_confidence') {
    return createAttempt(expectedWord, result, 'low_confidence', 'Chegou perto de uma palavra, mas ainda não tenho certeza. Tente mais uma vez.');
  }

  if (result.mode !== 'real_comparison' || !result.matchedWordId) {
    return createAttempt(expectedWord, result, 'error', result.message);
  }

  if (result.matchedWordId === expectedWord.id) {
    return createAttempt(expectedWord, result, 'matched_expected', 'O app reconheceu a palavra que você estava praticando.');
  }

  return createAttempt(expectedWord, result, 'matched_other', 'O app ouviu outra palavra treinada. Continue praticando sem pressa.');
}

export function ExerciseScreen({ trainedWords, onBack, onOpenTraining }: Props) {
  const trainedOptions = useMemo(
    () => trainedWords.filter((word) => word.samples.filter((sample) => sample.analysisStatus === 'ready' && sample.features).length >= 3),
    [trainedWords],
  );
  const [selectedWordId, setSelectedWordId] = useState(trainedOptions[0]?.id ?? '');
  const [status, setStatus] = useState('Aguardando');
  const [isRecording, setIsRecording] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPcmExperimentActive, setIsPcmExperimentActive] = useState(false);
  const [pcmSession, setPcmSession] = useState<PcmCaptureSession | null>(null);
  const [attemptRecords, setAttemptRecords] = useState<ExerciseAttemptRecord[]>([]);
  const selectedWord = trainedOptions.find((word) => word.id === selectedWordId) ?? trainedOptions[0] ?? null;
  const progressSummary = selectedWord ? exerciseAttemptRepository.getSummary(attemptRecords, selectedWord.id) : null;
  const [attempt, setAttempt] = useState<ExerciseAttempt>(() =>
    createAttempt(selectedWord, null, trainedOptions.length > 0 ? 'idle' : 'no_training', trainedOptions.length > 0 ? 'Escolha uma palavra e grave sua tentativa.' : 'Treine uma palavra com 3 amostras prontas.'),
  );

  useEffect(() => {
    if (!selectedWord && trainedOptions[0]) {
      setSelectedWordId(trainedOptions[0].id);
    }
  }, [selectedWord, trainedOptions]);

  useEffect(() => {
    setAttempt((currentAttempt) => ({
      ...currentAttempt,
      expectedWord: selectedWord,
      message: currentAttempt.result ? currentAttempt.message : selectedWord ? 'Grave sua tentativa quando estiver pronto.' : 'Treine uma palavra com 3 amostras prontas.',
    }));
  }, [selectedWord]);

  useEffect(() => {
    exerciseAttemptRepository.loadAttempts().then(setAttemptRecords).catch((error) => {
      console.warn('Falha ao carregar tentativas de exercício.', error);
    });

    return () => {
      stopOpenCaptureAsync();
    };
  }, []);

  async function stopOpenCaptureAsync() {
    await stopActiveAudioRecordingAsync().catch((error) => {
      console.warn('Falha ao encerrar gravação ativa no exercício.', error);
    });
    await stopActivePcmCaptureAsync().catch((error) => {
      console.warn('Falha ao encerrar captura PCM ativa no exercício.', error);
    });
  }

  async function handleBack() {
    if (isRecording) {
      setStatus('Encerrando gravação');
    }

    await stopOpenCaptureAsync();
    setIsRecording(false);
    setIsPreparing(false);
    setIsProcessing(false);
    setIsPcmExperimentActive(false);
    setPcmSession(null);
    onBack();
  }

  async function handleRecord() {
    if (isRecording || isPreparing || isProcessing) {
      return;
    }

    if (!selectedWord) {
      setStatus('Treine uma palavra antes de exercitar.');
      setAttempt(createAttempt(null, null, 'no_training', 'Treine uma palavra com 3 amostras prontas.'));
      return;
    }

    try {
      stopSpeechAsync();
      setIsPreparing(true);
      setStatus('Preparando microfone');
      setAttempt(createAttempt(selectedWord, null, 'recording', 'Gravando sua tentativa.'));

      if (isPcmCaptureAvailable()) {
        try {
          const session = await startPcmCaptureAsync();
          setPcmSession(session);
          setIsPcmExperimentActive(true);
        } catch (pcmError) {
          console.warn('Captura PCM indisponível no exercício, usando gravação atual.', pcmError);
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
      console.error('Erro ao iniciar exercício', error);
      setStatus('Não consegui acessar o microfone.');
      setAttempt(createAttempt(selectedWord, null, 'error', 'Verifique a permissão do microfone e tente de novo.'));
      setIsRecording(false);
    } finally {
      setIsPreparing(false);
    }
  }

  async function handleStop() {
    if (!isRecording || !selectedWord || isProcessing) {
      return;
    }

    try {
      setIsProcessing(true);
      setStatus('Comparando');
      setAttempt(createAttempt(selectedWord, null, 'recognizing', 'Comparando com suas palavras treinadas.'));
      const pcmBuffer = isPcmExperimentActive ? await pcmSession?.stopPcmCaptureAsync() ?? getCapturedPcmBuffer() : null;
      const audioUri = isPcmExperimentActive ? null : await stopAudioRecordingAsync();
      const result = await personalizedSpeechRecognizer.recognizeAsync(audioUri, trainedWords, pcmBuffer);
      const nextAttempt = createFeedback(selectedWord, result);
      const nextRecords = await exerciseAttemptRepository.saveAttempt(selectedWord, nextAttempt);

      setAttempt(nextAttempt);
      setAttemptRecords(nextRecords);
      setStatus(nextAttempt.message);
    } catch (error) {
      console.error('Erro ao reconhecer exercício', error);
      Alert.alert('Erro', 'Não foi possível comparar sua tentativa.');
      setStatus('Não foi possível comparar.');
      setAttempt(createAttempt(selectedWord, null, 'error', 'Não foi possível comparar sua tentativa.'));
    } finally {
      setIsRecording(false);
      setIsProcessing(false);
      setIsPcmExperimentActive(false);
      setPcmSession(null);
    }
  }

  async function handlePlayExpectedWord() {
    if (!selectedWord) {
      setStatus('Escolha uma palavra para ouvir.');
      return;
    }

    setStatus('Reproduzindo palavra');
    await speakWordAsync(selectedWord.text);
    setStatus('Aguardando');
  }

  async function handlePlayIdentifiedWord() {
    if (!attempt.result || !canSpeakRecognitionResult(attempt.result)) {
      setStatus('Sem palavra clara para reproduzir.');
      return;
    }

    setStatus('Reproduzindo resultado');
    await speakWordAsync(attempt.result.predictedWord);
    setStatus(attempt.message);
  }

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Button title="Voltar" onPress={handleBack} variant="ghost" />
        <Text variant="title" style={styles.title}>
          Exercitar
        </Text>
        <Text variant="body" style={styles.subtitle}>
          Pratique uma palavra treinada e veja se o app reconhece.
        </Text>
        <Text variant="caption" accessibilityLiveRegion="polite">
          {status}
        </Text>
      </View>

      <View style={styles.section}>
        <Text variant="headline">Palavra para praticar</Text>
        {trainedOptions.length === 0 ? <Text variant="body">Treine uma palavra com 3 amostras prontas para liberar o exercício.</Text> : null}
        {trainedOptions.length === 0 ? <Button title="Treinar primeiro" onPress={onOpenTraining} variant="secondary" disabled={isRecording} /> : null}
        <View style={styles.wordList}>
          {trainedOptions.map((word) => (
            <Pressable
              key={word.id}
              accessibilityRole="button"
              accessibilityLabel={`Praticar ${word.text}`}
              accessibilityState={{ selected: word.id === selectedWord?.id, disabled: isRecording }}
              hitSlop={8}
              onPress={() => setSelectedWordId(word.id)}
              style={[styles.wordButton, word.id === selectedWord?.id ? styles.selectedWord : null]}
              disabled={isRecording}
            >
              <Text variant="label" style={styles.wordText}>
                {word.text}
              </Text>
              <Text variant="caption">{word.samples.length} amostras</Text>
              {word.id === selectedWord?.id ? <Text variant="caption">Selecionada</Text> : null}
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <CommunicationRecorder
          status={status}
          isRecording={isRecording}
          isPreparing={isPreparing}
          isWorking={isProcessing}
          workingLabel="Comparando tentativa"
          disabled={isProcessing}
          stopDisabled={isProcessing}
          onRecord={handleRecord}
          onStop={handleStop}
        />
        <Button title="Ouvir palavra comum" onPress={handlePlayExpectedWord} variant="secondary" disabled={!selectedWord || isRecording || isPreparing || isProcessing} />
        <Button
          title="Ouvir resultado"
          onPress={handlePlayIdentifiedWord}
          variant="ghost"
          disabled={!attempt.result || !canSpeakRecognitionResult(attempt.result) || isRecording || isPreparing || isProcessing}
        />
      </View>

      <ExerciseFeedbackCard attempt={attempt} />

      <View style={styles.progressCard}>
        <Text variant="headline">Evolução local</Text>
        {progressSummary && progressSummary.totalAttempts > 0 ? (
          <>
            <Text variant="body" style={styles.progressText}>
              {progressSummary.totalAttempts} tentativa(s) registradas para {selectedWord?.text}.
            </Text>
            <View style={styles.progressGrid}>
              <View style={styles.progressItem}>
                <Text variant="label">{progressSummary.expectedMatches}</Text>
                <Text variant="caption">palavra esperada</Text>
              </View>
              <View style={styles.progressItem}>
                <Text variant="label">{progressSummary.otherMatches}</Text>
                <Text variant="caption">outra palavra</Text>
              </View>
              <View style={styles.progressItem}>
                <Text variant="label">{progressSummary.uncertainAttempts}</Text>
                <Text variant="caption">sem certeza</Text>
              </View>
              <View style={styles.progressItem}>
                <Text variant="label">{progressSummary.unsupportedAttempts}</Text>
                <Text variant="caption">não analisável</Text>
              </View>
            </View>
            <Text variant="caption">Este histórico fica somente neste aparelho.</Text>
          </>
        ) : (
          <Text variant="body" style={styles.progressText}>
            As tentativas desta palavra aparecerão aqui depois da primeira comparação.
          </Text>
        )}
      </View>
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
  section: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  wordList: {
    gap: spacing.sm,
  },
  wordButton: {
    padding: spacing.lg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.xs,
  },
  selectedWord: {
    borderColor: colors.primary,
    backgroundColor: '#E9F4FB',
  },
  wordText: {
    color: colors.primaryDark,
  },
  card: {
    padding: spacing.lg,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  progressCard: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  progressText: {
    color: colors.muted,
  },
  progressGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  progressItem: {
    flexGrow: 1,
    flexBasis: '45%',
    minHeight: 72,
    padding: spacing.md,
    borderRadius: 14,
    backgroundColor: colors.surfaceSoft,
    gap: spacing.xs,
  },
});
