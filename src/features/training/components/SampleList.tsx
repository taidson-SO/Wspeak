import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '../../../shared/components/Text';
import { colors } from '../../../shared/theme/colors';
import { spacing } from '../../../shared/theme/spacing';
import type { SpeechSample } from '../types/training.types';

function getAnalysisLabel(status: SpeechSample['analysisStatus']) {
  switch (status) {
    case 'ready':
      return 'Pronta para usar';
    case 'error':
      return 'Não foi possível preparar esta amostra';
    case 'unsupported':
      return 'Amostra salva. Grave outra se o app não reconhecer bem.';
    default:
      return 'Preparando amostra';
  }
}

type Props = {
  samples: SpeechSample[];
  onDelete: (sampleId: string) => void;
};

export function SampleList({ samples, onDelete }: Props) {
  if (samples.length === 0) {
    return <Text variant="caption">Nenhuma amostra gravada ainda.</Text>;
  }

  return (
    <View style={styles.list}>
      {samples.map((sample, index) => (
        <View key={sample.id} style={styles.item}>
          <View style={styles.itemText}>
            <Text variant="label">Amostra {index + 1}</Text>
            <Text variant="caption">{new Date(sample.createdAt).toLocaleString('pt-BR')}</Text>
            <Text variant="caption">{getAnalysisLabel(sample.analysisStatus)}</Text>
            {sample.analysisStatus !== 'ready' && sample.analysisMessage ? <Text variant="caption">{sample.analysisMessage}</Text> : null}
          </View>
          <Pressable
            onPress={() => onDelete(sample.id)}
            accessibilityRole="button"
            accessibilityLabel={`Apagar amostra ${index + 1}`}
            hitSlop={8}
            style={styles.deleteButton}
          >
            <Text variant="caption" style={styles.deleteText}>
              Apagar
            </Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  itemText: {
    flex: 1,
    gap: 2,
  },
  deleteButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    backgroundColor: '#FDECEC',
  },
  deleteText: {
    color: colors.danger,
    fontWeight: '700',
  },
});
