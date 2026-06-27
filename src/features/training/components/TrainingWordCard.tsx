import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '../../../shared/components/Text';
import { colors } from '../../../shared/theme/colors';
import { spacing } from '../../../shared/theme/spacing';
import type { Word } from '../../words/types/word.types';

type Props = {
  word: Word;
  sampleCount: number;
  isSelected: boolean;
  onSelect: () => void;
};

export function TrainingWordCard({ word, sampleCount, isSelected, onSelect }: Props) {
  return (
    <Pressable
      onPress={onSelect}
      style={[styles.card, isSelected ? styles.selected : null]}
      accessibilityRole="button"
      accessibilityLabel={`Treinar ${word.text}`}
      accessibilityState={{ selected: isSelected }}
      hitSlop={8}
    >
      <View style={styles.row}>
        <Text variant="label" style={styles.wordText}>
          {word.text}
        </Text>
        <Text variant="caption">{sampleCount} amostras</Text>
      </View>
      <Text variant="caption">{isSelected ? 'Selecionada para treinar.' : 'Toque para treinar esta palavra.'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.xs,
  },
  selected: {
    borderColor: colors.primary,
    backgroundColor: '#E9F4FB',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  wordText: {
    flex: 1,
  },
});
