import { StyleSheet, View } from 'react-native';

import { Button } from '../../../shared/components/Button';
import { Text } from '../../../shared/components/Text';
import { colors } from '../../../shared/theme/colors';
import { spacing } from '../../../shared/theme/spacing';
import { canSpeakRecognitionResult } from '../services/recognitionConfidence';
import type { RecognitionResult } from '../types/communication.types';

type Props = {
  result: RecognitionResult | null;
  isBusy: boolean;
  onRepeat: () => void;
};

function getSimpleMessage(result: RecognitionResult | null) {
  if (!result) {
    return 'A palavra reconhecida vai aparecer aqui.';
  }

  if (result.mode === 'real_comparison') {
    return 'Mostre esta palavra para a outra pessoa.';
  }

  if (result.mode === 'low_confidence') {
    return result.secondBestWord
      ? `Fiquei em dúvida entre ${result.predictedWord} e ${result.secondBestWord}.`
      : 'Talvez seja esta palavra, mas ainda não tenho certeza.';
  }

  if (result.mode === 'no_training_data') {
    return 'Treine uma palavra antes de comunicar.';
  }

  return 'Não consegui entender este áudio. Tente gravar de novo.';
}

function getDisplayWord(result: RecognitionResult | null) {
  if (!result) {
    return '...';
  }

  if (result.mode === 'low_confidence' && result.predictedWord) {
    return `Talvez: ${result.predictedWord}`;
  }

  return result.predictedWord ?? 'Não entendi';
}

export function CommunicationResultPanel({ result, isBusy, onRepeat }: Props) {
  const confidence = result?.confidence === null || result?.confidence === undefined ? null : `${Math.round(result.confidence * 100)}%`;
  const canRepeat = result ? canSpeakRecognitionResult(result) : false;

  return (
    <View style={styles.panel}>
      <Text variant="caption" align="center" style={styles.label}>
        Para mostrar
      </Text>
      <Text align="center" style={styles.word}>
        {getDisplayWord(result)}
      </Text>
      {confidence ? (
        <Text align="center" style={styles.confidence}>
          Certeza do app: {confidence}
        </Text>
      ) : null}
      <Text align="center" style={styles.message}>
        {getSimpleMessage(result)}
      </Text>
      <Button title="Repetir voz" onPress={onRepeat} variant="secondary" disabled={!canRepeat || isBusy} />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  label: {
    color: colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  word: {
    color: colors.primaryDark,
    fontSize: 48,
    fontWeight: '800',
    lineHeight: 58,
  },
  confidence: {
    color: colors.muted,
    fontWeight: '700',
  },
  message: {
    color: colors.text,
  },
});
