import { StyleSheet, View } from 'react-native';

import { Text } from '../../../shared/components/Text';
import { colors } from '../../../shared/theme/colors';
import { spacing } from '../../../shared/theme/spacing';
import type { ExerciseAttempt } from '../types/exercise.types';

type Props = {
  attempt: ExerciseAttempt;
};

function getModeLabel(attempt: ExerciseAttempt) {
  switch (attempt.feedback) {
    case 'matched_expected':
      return 'Palavra esperada';
    case 'matched_other':
      return 'Outra palavra';
    case 'low_confidence':
      return 'Ainda não tenho certeza';
    case 'unsupported_audio':
      return 'Não entendi o áudio';
    case 'no_training':
      return 'Sem treino';
    case 'error':
      return 'Erro';
    case 'recording':
      return 'Gravando';
    case 'recognizing':
      return 'Reconhecendo';
    case 'idle':
    default:
      return 'Aguardando';
  }
}

export function ExerciseFeedbackCard({ attempt }: Props) {
  const expectedWord = attempt.expectedWord?.text ?? 'Escolha uma palavra';
  const identifiedWord = attempt.result?.predictedWord ?? 'Ainda sem resultado';
  const confidence = attempt.result?.confidence === null || attempt.result?.confidence === undefined ? '--' : `${Math.round(attempt.result.confidence * 100)}%`;

  return (
    <View style={styles.card}>
      <Text variant="label">Exercício</Text>
      <Text variant="caption">Palavra para praticar</Text>
      <Text variant="title" style={styles.expected}>
        {expectedWord}
      </Text>
      <Text variant="caption">Palavra identificada</Text>
      <Text variant="headline" style={styles.identified}>
        {identifiedWord}
      </Text>
      <Text style={styles.meta}>Certeza do app: {confidence}</Text>
      <Text style={styles.warning}>Resultado: {getModeLabel(attempt)}</Text>
      <Text style={styles.message}>{attempt.message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  expected: {
    color: colors.primary,
  },
  identified: {
    color: colors.primaryDark,
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
