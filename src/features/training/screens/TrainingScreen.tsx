import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '../../../shared/components/Button';
import { ScreenContainer } from '../../../shared/components/ScreenContainer';
import { Text } from '../../../shared/components/Text';
import { colors } from '../../../shared/theme/colors';
import { spacing } from '../../../shared/theme/spacing';
import { startAudioRecordingAsync, stopActiveAudioRecordingAsync, stopAudioRecordingAsync } from '../../../shared/services/audioRecorder';
import { SampleList } from '../components/SampleList';
import { SampleRecorder } from '../components/SampleRecorder';
import { TrainingWordCard } from '../components/TrainingWordCard';
import { MAX_SAMPLES_PER_WORD, speechTrainer } from '../services/speechTrainer';
import type { TrainedWord } from '../types/training.types';
import type { Word } from '../../words/types/word.types';
import { isPcmCaptureAvailable, startPcmCaptureAsync, stopActivePcmCaptureAsync } from '../../communication/services/audioAnalysis/pcmCapture';
import { MAX_WORD_TEXT_LENGTH, wordRepository } from '../../words/services/wordRepository';

type PcmCaptureSession = Awaited<ReturnType<typeof startPcmCaptureAsync>>;

type Props = {
  words: Word[];
  trainedWords: TrainedWord[];
  onWordsChange: (words: Word[]) => void;
  onTrainedWordsChange: (trainedWords: TrainedWord[]) => void;
  onBack: () => void;
  onOpenCommunication: () => void;
};

export function TrainingScreen({ words, trainedWords, onWordsChange, onTrainedWordsChange, onBack, onOpenCommunication }: Props) {
  const [selectedWordId, setSelectedWordId] = useState(words[0]?.id ?? '');
  const [wordText, setWordText] = useState('');
  const [editingWordId, setEditingWordId] = useState<string | null>(null);
  const [status, setStatus] = useState('Aguardando');
  const [isRecording, setIsRecording] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isSavingSample, setIsSavingSample] = useState(false);
  const [pcmSession, setPcmSession] = useState<PcmCaptureSession | null>(null);

  const selectedWord = useMemo(() => words.find((word) => word.id === selectedWordId) ?? words[0] ?? null, [selectedWordId, words]);
  const selectedTraining = trainedWords.find((word) => word.id === selectedWord?.id) ?? null;
  const editingWord = editingWordId ? words.find((word) => word.id === editingWordId) ?? null : null;
  const samples = selectedTraining?.samples ?? [];
  const readySamples = samples.filter((sample) => sample.analysisStatus === 'ready' && sample.features);
  const trainingProgress = Math.min(readySamples.length, 3);
  const trainingStatus = readySamples.length >= 3 ? 'pronta para usar' : `${readySamples.length}/3 amostras prontas`;

  useEffect(() => {
    if (!selectedWord && words[0]) {
      setSelectedWordId(words[0].id);
    }
  }, [selectedWord, words]);

  useEffect(() => {
    return () => {
      stopOpenCaptureAsync();
    };
  }, []);

  async function stopOpenCaptureAsync() {
    await stopActiveAudioRecordingAsync().catch((error) => {
      console.warn('Falha ao encerrar gravação ativa no treinamento.', error);
    });
    await stopActivePcmCaptureAsync().catch((error) => {
      console.warn('Falha ao encerrar captura PCM ativa no treinamento.', error);
    });
  }

  async function handleBack() {
    if (isRecording) {
      setStatus('Encerrando gravação');
    }

    await stopOpenCaptureAsync();
    setIsRecording(false);
    setIsPreparing(false);
    setIsSavingSample(false);
    setPcmSession(null);
    onBack();
  }

  async function handleRecord() {
    if (isRecording || isPreparing || isSavingSample) {
      return;
    }

    if (!selectedWord) {
      setStatus('Selecione uma palavra para gravar.');
      return;
    }

    if (samples.length >= MAX_SAMPLES_PER_WORD) {
      setStatus(`Limite de ${MAX_SAMPLES_PER_WORD} amostras atingido para esta palavra.`);
      return;
    }

    try {
      setIsPreparing(true);
      setStatus('Preparando microfone');

      if (isPcmCaptureAvailable()) {
        try {
          const session = await startPcmCaptureAsync();
          setPcmSession(session);
          setStatus('Gravando');
          setIsRecording(true);
          return;
        } catch (pcmError) {
          console.warn('Captura PCM indisponível no treinamento, mantendo gravação normal.', pcmError);
          setPcmSession(null);
        }
      }

      await startAudioRecordingAsync();
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

  async function handleSaveWord() {
    try {
      setStatus('Salvando palavra');
      const nextWords = editingWordId ? await wordRepository.updateCustomWord(editingWordId, wordText) : await wordRepository.addCustomWord(wordText);
      const savedWord = editingWordId ? nextWords.find((word) => word.id === editingWordId) ?? null : nextWords[nextWords.length - 1] ?? null;
      onWordsChange(nextWords);

      if (savedWord) {
        setSelectedWordId(savedWord.id);

        if (editingWordId) {
          const nextTrainedWords = await speechTrainer.updateWordText(savedWord.id, savedWord.text);
          onTrainedWordsChange(nextTrainedWords);
        }
      }

      setWordText('');
      setEditingWordId(null);
      setStatus(editingWordId ? 'Palavra atualizada.' : 'Palavra adicionada.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível salvar a palavra.';
      setStatus(message);
    }
  }

  function handleStartEditingWord() {
    if (!selectedWord?.isCustom) {
      setStatus('Só é possível editar palavras criadas pelo usuário.');
      return;
    }

    setEditingWordId(selectedWord.id);
    setWordText(selectedWord.text);
    setStatus('Editando palavra.');
  }

  function handleCancelEditingWord() {
    setEditingWordId(null);
    setWordText('');
    setStatus('Edição cancelada.');
  }

  function handleRemoveSelectedWord() {
    if (!selectedWord?.isCustom) {
      setStatus('Só é possível remover palavras criadas pelo usuário.');
      return;
    }

    const hasSamples = samples.length > 0;
    Alert.alert(
      'Remover palavra',
      hasSamples
        ? 'A palavra será removida da lista, mas as amostras já gravadas não serão apagadas.'
        : 'A palavra será removida da lista de treinamento.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => {
            wordRepository
              .removeCustomWord(selectedWord.id)
              .then((nextWords) => {
                onWordsChange(nextWords);
                setSelectedWordId(nextWords[0]?.id ?? '');
                setEditingWordId(null);
                setWordText('');
                setStatus('Palavra removida.');
              })
              .catch((error) => {
                const message = error instanceof Error ? error.message : 'Não foi possível remover a palavra.';
                setStatus(message);
              });
          },
        },
      ],
    );
  }

  async function handleStop() {
    if (!selectedWord || !isRecording || isSavingSample) {
      return;
    }

    try {
      setIsSavingSample(true);
      setStatus('Salvando amostra');
      const pcmBuffer = pcmSession
        ? await pcmSession.stopPcmCaptureAsync().catch((pcmError) => {
            console.warn('Falha ao finalizar a captura PCM do treinamento.', pcmError);
            return null;
          })
        : null;
      const audioUri = pcmSession ? null : await stopAudioRecordingAsync();
      const nextWords = await speechTrainer.addSample(selectedWord, audioUri, pcmBuffer ?? null);
      onTrainedWordsChange(nextWords);
      setStatus(pcmBuffer ? 'Amostra salva e pronta para usar.' : 'Amostra salva.');
    } catch (error) {
      console.error('Erro ao salvar amostra', error);
      const message = error instanceof Error ? error.message : 'Não foi possível salvar a amostra.';
      Alert.alert('Erro', message);
      setStatus(message);
    } finally {
      setIsRecording(false);
      setIsSavingSample(false);
      setPcmSession(null);
    }
  }

  async function handleDeleteSample(sampleId: string) {
    if (!selectedWord) {
      return;
    }

    try {
      setStatus('Apagando amostra');
      const nextWords = await speechTrainer.removeSample(selectedWord.id, sampleId);
      onTrainedWordsChange(nextWords);
      setStatus('Amostra apagada.');
    } catch (error) {
      console.error('Erro ao apagar amostra', error);
      setStatus('Falha ao apagar a amostra.');
    }
  }

  async function handleFinishTraining() {
    if (!selectedWord) {
      return;
    }

    if (readySamples.length < 3) {
      setStatus('Registre pelo menos 3 amostras prontas para concluir o treinamento.');
      return;
    }

    const finalized = await speechTrainer.finalizeWordTraining(selectedWord.id);
    if (finalized) {
      onTrainedWordsChange(trainedWords.map((word) => (word.id === finalized.id ? finalized : word)));
      setStatus('Treinamento concluído');
    }
  }

  const canRecordMore = samples.length < MAX_SAMPLES_PER_WORD;
  const canFinish = readySamples.length >= 3;
  const isInteractionLocked = isRecording || isPreparing || isSavingSample;

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Button title="Voltar" onPress={handleBack} variant="ghost" />
        <Text variant="title" style={styles.title}>
          Treinar fala
        </Text>
        <Text variant="body" style={styles.subtitle}>
          Escolha uma palavra e grave de 3 a 5 amostras do seu jeito de falar.
        </Text>
        <Text variant="caption" accessibilityLiveRegion="polite">
          {status}
        </Text>
      </View>

      <View style={styles.section}>
        <Text variant="headline">Palavras</Text>
        <View style={styles.wordForm}>
          <TextInput
            accessibilityLabel="Palavra personalizada"
            value={wordText}
            onChangeText={setWordText}
            maxLength={MAX_WORD_TEXT_LENGTH}
            placeholder="Nova palavra"
            placeholderTextColor={colors.muted}
            returnKeyType="done"
            onSubmitEditing={handleSaveWord}
            style={styles.input}
          />
          <Button title={editingWord ? 'Salvar palavra' : 'Adicionar palavra'} onPress={handleSaveWord} disabled={isInteractionLocked} />
          {editingWord ? <Button title="Cancelar edição" onPress={handleCancelEditingWord} variant="ghost" disabled={isInteractionLocked} /> : null}
        </View>
        <View style={styles.wordsGrid}>
          {words.map((word) => (
            <TrainingWordCard
              key={word.id}
              word={word}
              sampleCount={trainedWords.find((item) => item.id === word.id)?.samples.length ?? 0}
              isSelected={word.id === selectedWord?.id}
              onSelect={() => {
                if (!isInteractionLocked) {
                  setSelectedWordId(word.id);
                }
              }}
            />
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text variant="headline">Palavra selecionada</Text>
        <Text variant="title" style={styles.selectedWord}>
          {selectedWord?.text ?? 'Selecione uma palavra'}
        </Text>
        <Text variant="caption">{selectedWord?.isCustom ? 'Palavra criada pelo usuário.' : 'Palavra sugerida pelo app.'}</Text>
        <Text variant="caption">Treino: {trainingStatus}</Text>
        <Text variant="caption">
          {trainingProgress}/3 amostras prontas para usar
        </Text>
        <Text variant="caption">
          {samples.length} de {MAX_SAMPLES_PER_WORD} amostras gravadas
        </Text>
        {selectedWord?.isCustom ? (
          <View style={styles.actions}>
            <Button title="Editar palavra" onPress={handleStartEditingWord} variant="ghost" disabled={isInteractionLocked} />
            <Button title="Remover palavra" onPress={handleRemoveSelectedWord} variant="danger" disabled={isInteractionLocked} />
          </View>
        ) : null}
      </View>

      <View style={styles.card}>
        <SampleRecorder
          status={status}
          isRecording={isRecording}
          isPreparing={isPreparing}
          isSaving={isSavingSample}
          disabled={!canRecordMore}
          onRecord={handleRecord}
          onStop={handleStop}
        />
        {!canRecordMore ? <Text variant="caption">Limite de {MAX_SAMPLES_PER_WORD} amostras atingido para esta palavra.</Text> : null}
      </View>

      <View style={styles.section}>
        <Text variant="headline">Amostras gravadas</Text>
        <SampleList samples={samples} onDelete={handleDeleteSample} />
      </View>

      <View style={styles.footer}>
        <Button title="Conversar agora" onPress={onOpenCommunication} disabled={!canFinish || isInteractionLocked} />
        <Button title="Salvar treino" onPress={handleFinishTraining} disabled={!canFinish || isInteractionLocked} variant="secondary" />
        <Text variant="caption" align="center">
          {canFinish ? 'Esta palavra já pode ser usada em Exercitar e Comunicar.' : 'Ainda faltam amostras para usar esta palavra.'}
        </Text>
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
    marginTop: spacing.md,
  },
  wordForm: {
    gap: spacing.sm,
  },
  input: {
    minHeight: 56,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    color: colors.text,
    fontSize: 18,
  },
  wordsGrid: {
    gap: spacing.sm,
  },
  actions: {
    gap: spacing.sm,
  },
  card: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  selectedWord: {
    color: colors.primary,
  },
  footer: {
    marginTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
});
