import { useEffect, useMemo, useState } from 'react';
import { Alert, ActivityIndicator, StyleSheet, Switch, TextInput, View } from 'react-native';

import { Button } from '../../../shared/components/Button';
import { ScreenContainer } from '../../../shared/components/ScreenContainer';
import { Text } from '../../../shared/components/Text';
import { startAudioRecordingAsync, stopActiveAudioRecordingAsync, stopAudioRecordingAsync } from '../../../shared/services/audioRecorder';
import { colors } from '../../../shared/theme/colors';
import { spacing } from '../../../shared/theme/spacing';
import { isPcmCaptureAvailable, startPcmCaptureAsync, stopActivePcmCaptureAsync } from '../../communication/services/audioAnalysis/pcmCapture';
import type { Word } from '../../words/types/word.types';
import { TrainingWordCard } from '../../training/components/TrainingWordCard';
import {
  assessmentRepository,
  MAX_ASSESSMENT_SAMPLES_PER_WORD,
  MIN_ASSESSMENT_SAMPLES_PER_WORD,
} from '../services/assessmentRepository';
import type {
  AssessmentSampleContext,
  AssessmentSession,
  HumanErrorType,
  HumanListenerType,
} from '../types/assessment.types';

type PcmCaptureSession = Awaited<ReturnType<typeof startPcmCaptureAsync>>;

type Props = {
  words: Word[];
  onBack: () => void;
};

const listenerOptions: Array<{ value: HumanListenerType; label: string }> = [
  { value: 'unfamiliar', label: 'Pessoa desconhecida' },
  { value: 'familiar', label: 'Pessoa familiar' },
  { value: 'caregiver', label: 'Cuidador' },
  { value: 'speech_therapist', label: 'Fonoaudiólogo' },
];

const errorOptions: Array<{ value: HumanErrorType; label: string }> = [
  { value: 'unclassified', label: 'Não classificado' },
  { value: 'substitution', label: 'Troca' },
  { value: 'omission', label: 'Omissão' },
  { value: 'distortion', label: 'Distorção' },
  { value: 'addition', label: 'Acréscimo' },
  { value: 'inconsistent', label: 'Inconsistente' },
];

function getContextLabel(context: AssessmentSampleContext) {
  if (context === 'training') {
    return 'Treino';
  }

  if (context === 'validation') {
    return 'Validação';
  }

  return 'Teste';
}

export function AssessmentScreen({ words, onBack }: Props) {
  const [sessions, setSessions] = useState<AssessmentSession[]>([]);
  const [selectedWordId, setSelectedWordId] = useState(words[0]?.id ?? '');
  const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null);
  const [status, setStatus] = useState('Aguardando');
  const [isRecording, setIsRecording] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pcmSession, setPcmSession] = useState<PcmCaptureSession | null>(null);
  const [listenerType, setListenerType] = useState<HumanListenerType>('unfamiliar');
  const [perceivedText, setPerceivedText] = useState('');
  const [intelligibilityRating, setIntelligibilityRating] = useState(3);
  const [errorType, setErrorType] = useState<HumanErrorType>('unclassified');
  const [usedContext, setUsedContext] = useState(false);
  const [neededRepetition, setNeededRepetition] = useState(false);
  const [notes, setNotes] = useState('');

  const selectedWord = useMemo(() => words.find((word) => word.id === selectedWordId) ?? words[0] ?? null, [selectedWordId, words]);
  const selectedSession = sessions.find((session) => session.wordId === selectedWord?.id) ?? null;
  const samples = selectedSession?.samples ?? [];
  const annotatedSampleIds = useMemo(() => new Set(selectedSession?.annotations.map((annotation) => annotation.sampleId) ?? []), [selectedSession]);
  const selectedSample = samples.find((sample) => sample.id === selectedSampleId) ?? samples[samples.length - 1] ?? null;
  const readyCount = samples.filter((sample) => sample.analysisStatus === 'ready').length;
  const confusionRecords = useMemo(() => assessmentRepository.getConfusionRecords(sessions), [sessions]);
  const canRecordMore = samples.length < MAX_ASSESSMENT_SAMPLES_PER_WORD;
  const hasEnoughSamples = samples.length >= MIN_ASSESSMENT_SAMPLES_PER_WORD;
  const isInteractionLocked = isRecording || isPreparing || isSaving;

  useEffect(() => {
    let isMounted = true;

    assessmentRepository
      .loadSessions()
      .then((loadedSessions) => {
        if (isMounted) {
          setSessions(loadedSessions);
        }
      })
      .catch((error) => {
        console.error('Falha ao carregar avaliações', error);
        setStatus('Não foi possível carregar as avaliações.');
      });

    return () => {
      isMounted = false;
      stopOpenCaptureAsync();
    };
  }, []);

  useEffect(() => {
    if (!selectedWord && words[0]) {
      setSelectedWordId(words[0].id);
    }
  }, [selectedWord, words]);

  async function stopOpenCaptureAsync() {
    await stopActiveAudioRecordingAsync().catch((error) => {
      console.warn('Falha ao encerrar gravação ativa na avaliação.', error);
    });
    await stopActivePcmCaptureAsync().catch((error) => {
      console.warn('Falha ao encerrar captura PCM ativa na avaliação.', error);
    });
  }

  async function handleBack() {
    if (isRecording) {
      setStatus('Encerrando gravação');
    }

    await stopOpenCaptureAsync();
    setIsRecording(false);
    setIsPreparing(false);
    setPcmSession(null);
    onBack();
  }

  async function handleSelectWord(wordId: string) {
    if (isInteractionLocked) {
      return;
    }

    setSelectedWordId(wordId);
    setSelectedSampleId(null);
    setPerceivedText('');
    setNotes('');

    const word = words.find((item) => item.id === wordId);

    if (!word) {
      return;
    }

    try {
      const nextSessions = await assessmentRepository.getOrCreateSession(word);
      setSessions(nextSessions);
      setStatus('Palavra pronta para avaliação.');
    } catch (error) {
      console.error('Falha ao preparar avaliação', error);
      setStatus('Não foi possível preparar esta palavra.');
    }
  }

  async function handleRecord() {
    if (isRecording || isPreparing || isSaving) {
      return;
    }

    if (!selectedWord) {
      setStatus('Selecione uma palavra para avaliar.');
      return;
    }

    if (!canRecordMore) {
      setStatus(`Limite de ${MAX_ASSESSMENT_SAMPLES_PER_WORD} amostras atingido para esta palavra.`);
      return;
    }

    try {
      setIsPreparing(true);
      setStatus('Preparando microfone');

      if (isPcmCaptureAvailable()) {
        try {
          const session = await startPcmCaptureAsync();
          setPcmSession(session);
          setStatus('Gravando avaliação');
          setIsRecording(true);
          return;
        } catch (pcmError) {
          console.warn('Captura PCM indisponível na avaliação, mantendo gravação normal.', pcmError);
          setPcmSession(null);
        }
      }

      await startAudioRecordingAsync();
      setStatus('Gravando avaliação');
      setIsRecording(true);
    } catch (error) {
      console.error('Erro ao iniciar avaliação', error);
      setStatus('Não consegui acessar o microfone. Verifique a permissão e tente de novo.');
      setIsRecording(false);
    } finally {
      setIsPreparing(false);
    }
  }

  async function handleStop() {
    if (!selectedWord || !isRecording || isSaving) {
      return;
    }

    try {
      setIsSaving(true);
      setStatus('Salvando amostra de avaliação');
      const pcmBuffer = pcmSession
        ? await pcmSession.stopPcmCaptureAsync().catch((pcmError) => {
            console.warn('Falha ao finalizar captura PCM da avaliação.', pcmError);
            return null;
          })
        : null;
      const audioUri = pcmSession ? null : await stopAudioRecordingAsync();
      const nextSessions = await assessmentRepository.addSample(selectedWord, audioUri, pcmBuffer ?? null);
      const nextSession = nextSessions.find((session) => session.wordId === selectedWord.id) ?? null;
      const nextSample = nextSession?.samples[nextSession.samples.length - 1] ?? null;

      setSessions(nextSessions);
      setSelectedSampleId(nextSample?.id ?? null);
      setPerceivedText('');
      setNotes('');
      setStatus('Amostra salva. Registre o que a pessoa entendeu.');
    } catch (error) {
      console.error('Erro ao salvar avaliação', error);
      const message = error instanceof Error ? error.message : 'Não foi possível salvar a avaliação.';
      Alert.alert('Erro', message);
      setStatus(message);
    } finally {
      setIsRecording(false);
      setIsSaving(false);
      setPcmSession(null);
    }
  }

  async function handleSaveAnnotation() {
    if (!selectedSession || !selectedSample) {
      setStatus('Grave uma amostra antes de registrar a resposta.');
      return;
    }

    try {
      setIsSaving(true);
      const nextSessions = await assessmentRepository.addAnnotation(selectedSession.id, {
        sampleId: selectedSample.id,
        listenerType,
        perceivedText,
        intelligibilityRating,
        errorType,
        usedContext,
        neededRepetition,
        notes,
      });

      setSessions(nextSessions);
      setPerceivedText('');
      setNotes('');
      setStatus('Resposta salva para a matriz de confusão.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível salvar a resposta.';
      setStatus(message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Button title="Voltar" onPress={handleBack} variant="ghost" />
        <Text variant="title" style={styles.title}>
          Avaliar fala
        </Text>
        <Text variant="body" style={styles.subtitle}>
          Grave mais exemplos e registre o que outra pessoa entendeu. Estes dados ajudam a medir confusões reais por palavra.
        </Text>
        <Text variant="caption" accessibilityLiveRegion="polite">
          {status}
        </Text>
      </View>

      <View style={styles.section}>
        <Text variant="headline">Palavra avaliada</Text>
        <View style={styles.wordList}>
          {words.map((word) => {
            const session = sessions.find((item) => item.wordId === word.id);

            return (
              <TrainingWordCard
                key={word.id}
                word={word}
                sampleCount={session?.samples.length ?? 0}
                isSelected={word.id === selectedWord?.id}
                onSelect={() => {
                  if (!isInteractionLocked) {
                    handleSelectWord(word.id);
                  }
                }}
              />
            );
          })}
        </View>
      </View>

      <View style={styles.card}>
        <Text variant="headline">{selectedWord?.text ?? 'Nenhuma palavra'}</Text>
        <Text variant="body" style={styles.infoText}>
          {samples.length}/{MAX_ASSESSMENT_SAMPLES_PER_WORD} amostras de avaliação. Meta mínima: {MIN_ASSESSMENT_SAMPLES_PER_WORD}.
        </Text>
        <Text variant="caption">
          {readyCount} amostra(s) com sinal analisável. A avaliação humana continua sendo a referência principal.
        </Text>
        <Text variant="caption">
          {hasEnoughSamples ? 'Meta mínima atingida para revisar confusões.' : 'Colete amostras em dias e momentos diferentes quando possível.'}
        </Text>

        <Button
          title={isPreparing ? 'Preparando...' : isRecording ? 'Parar e salvar' : 'Gravar amostra'}
          onPress={isRecording ? handleStop : handleRecord}
          variant={isRecording ? 'danger' : 'primary'}
          disabled={!selectedWord || isPreparing || isSaving || (!isRecording && !canRecordMore)}
        />

        {isPreparing || isSaving ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.primary} />
            <Text variant="caption">{isSaving ? 'Salvando' : 'Preparando microfone'}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text variant="headline">Amostras</Text>
        {samples.length === 0 ? (
          <Text variant="body" style={styles.infoText}>
            Ainda não há amostras de avaliação para esta palavra.
          </Text>
        ) : (
          <View style={styles.sampleList}>
            {samples.map((sample, index) => {
              const isSelected = sample.id === selectedSample?.id;
              const isAnnotated = annotatedSampleIds.has(sample.id);

              return (
                <Button
                  key={sample.id}
                  title={`${index + 1}. ${getContextLabel(sample.context)} ${isAnnotated ? '- resposta salva' : '- sem resposta'}`}
                  onPress={() => setSelectedSampleId(sample.id)}
                  variant={isSelected ? 'secondary' : 'ghost'}
                />
              );
            })}
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text variant="headline">Resposta humana</Text>
        <Text variant="body" style={styles.infoText}>
          Registre exatamente o que a pessoa entendeu nesta amostra.
        </Text>

        <TextInput
          accessibilityLabel="O que a pessoa entendeu"
          value={perceivedText}
          onChangeText={setPerceivedText}
          placeholder="Exemplo: casa"
          placeholderTextColor={colors.muted}
          style={styles.input}
          editable={!isInteractionLocked}
        />

        <Text variant="label">Quem escutou</Text>
        <View style={styles.optionGrid}>
          {listenerOptions.map((option) => (
            <Button
              key={option.value}
              title={option.label}
              onPress={() => setListenerType(option.value)}
              variant={listenerType === option.value ? 'secondary' : 'ghost'}
              disabled={isInteractionLocked}
              style={styles.optionButton}
            />
          ))}
        </View>

        <Text variant="label">Quanto deu para entender</Text>
        <View style={styles.ratingRow}>
          {[0, 1, 2, 3, 4, 5].map((rating) => (
            <Button
              key={rating}
              title={String(rating)}
              onPress={() => setIntelligibilityRating(rating)}
              variant={intelligibilityRating === rating ? 'secondary' : 'ghost'}
              disabled={isInteractionLocked}
              style={styles.ratingButton}
            />
          ))}
        </View>
        <Text variant="caption">0 significa nada claro. 5 significa muito claro.</Text>

        <Text variant="label">Diferença observada</Text>
        <View style={styles.optionGrid}>
          {errorOptions.map((option) => (
            <Button
              key={option.value}
              title={option.label}
              onPress={() => setErrorType(option.value)}
              variant={errorType === option.value ? 'secondary' : 'ghost'}
              disabled={isInteractionLocked}
              style={styles.optionButton}
            />
          ))}
        </View>

        <View style={styles.switchRow}>
          <Text variant="body">Usou contexto para entender</Text>
          <Switch
            accessibilityLabel="Usou contexto para entender"
            value={usedContext}
            onValueChange={setUsedContext}
            disabled={isInteractionLocked}
            trackColor={{ false: colors.border, true: colors.secondary }}
            thumbColor={colors.surface}
          />
        </View>

        <View style={styles.switchRow}>
          <Text variant="body">Precisou repetir</Text>
          <Switch
            accessibilityLabel="Precisou repetir"
            value={neededRepetition}
            onValueChange={setNeededRepetition}
            disabled={isInteractionLocked}
            trackColor={{ false: colors.border, true: colors.secondary }}
            thumbColor={colors.surface}
          />
        </View>

        <TextInput
          accessibilityLabel="Observações da avaliação"
          value={notes}
          onChangeText={setNotes}
          placeholder="Observações opcionais"
          placeholderTextColor={colors.muted}
          multiline
          style={[styles.input, styles.notesInput]}
          editable={!isInteractionLocked}
        />

        <Button title="Salvar resposta" onPress={handleSaveAnnotation} disabled={!selectedSample || isInteractionLocked} />
      </View>

      <View style={styles.section}>
        <Text variant="headline">Confusões observadas</Text>
        {confusionRecords.length === 0 ? (
          <Text variant="body" style={styles.infoText}>
            Nenhuma confusão registrada ainda.
          </Text>
        ) : (
          <View style={styles.confusionList}>
            {confusionRecords.slice(0, 8).map((record) => (
              <View key={`${record.wordId}-${record.perceivedText}`} style={styles.confusionItem}>
                <Text variant="label">
                  {record.targetText} foi entendido como {record.perceivedText}
                </Text>
                <Text variant="caption">{record.count} vez(es)</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.md,
  },
  title: {
    color: colors.primaryDark,
  },
  subtitle: {
    color: colors.muted,
  },
  section: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  wordList: {
    gap: spacing.md,
  },
  card: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  infoText: {
    color: colors.muted,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sampleList: {
    gap: spacing.sm,
  },
  input: {
    minHeight: 56,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: spacing.lg,
    color: colors.text,
    fontSize: 16,
  },
  notesInput: {
    minHeight: 96,
    paddingTop: spacing.md,
    textAlignVertical: 'top',
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  optionButton: {
    flexGrow: 1,
    flexBasis: '45%',
  },
  ratingRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  ratingButton: {
    minWidth: 44,
    flex: 1,
    paddingHorizontal: spacing.sm,
  },
  switchRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  confusionList: {
    gap: spacing.sm,
  },
  confusionItem: {
    padding: spacing.md,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
});
