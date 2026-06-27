import { StyleSheet, View } from 'react-native';

import { Text } from '../../../shared/components/Text';
import { colors } from '../../../shared/theme/colors';
import { spacing } from '../../../shared/theme/spacing';
import type { RecognitionResult } from '../types/communication.types';

const modeLabels: Record<RecognitionResult['mode'], string> = {
  real_comparison: 'Palavra reconhecida',
  low_confidence: 'Ainda não tenho certeza',
  unsupported_audio: 'Não entendi o áudio',
  no_training_data: 'Sem treinamento suficiente',
};

type Props = {
  result: RecognitionResult | null;
};

export function RecognitionResultCard({ result }: Props) {
  if (!result) {
    return (
      <View style={styles.card}>
        <Text variant="label">Resultado</Text>
        <Text style={styles.placeholder}>O resultado do reconhecimento vai aparecer aqui.</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text variant="label">Resultado</Text>
      {result.mode === 'low_confidence' ? <Text style={styles.warning}>Possível palavra</Text> : null}
      <Text variant="title" style={styles.word}>
        {result.predictedWord ?? 'Nenhuma palavra identificada'}
      </Text>
      <Text style={styles.meta}>
        Certeza do app: {result.confidence === null ? '--' : `${Math.round(result.confidence * 100)}%`}
      </Text>
      <Text style={styles.warning}>Resultado: {modeLabels[result.mode]}</Text>
      <Text style={styles.message}>{result.message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  placeholder: {
    color: colors.muted,
  },
  word: {
    color: colors.primary,
  },
  meta: {
    color: colors.muted,
    fontWeight: '700',
  },
  warning: {
    color: colors.warning,
    fontWeight: '700',
  },
  message: {
    color: colors.text,
  },
});
