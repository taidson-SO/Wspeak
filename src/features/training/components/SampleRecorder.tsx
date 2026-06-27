import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button } from '../../../shared/components/Button';
import { Text } from '../../../shared/components/Text';
import { colors } from '../../../shared/theme/colors';
import { spacing } from '../../../shared/theme/spacing';

type Props = {
  status: string;
  isRecording: boolean;
  isPreparing?: boolean;
  isSaving?: boolean;
  disabled?: boolean;
  onRecord: () => void;
  onStop: () => void;
};

export function SampleRecorder({ status, isRecording, isPreparing = false, isSaving = false, disabled = false, onRecord, onStop }: Props) {
  const isBusy = isPreparing || isSaving;
  const recordTitle = isPreparing ? 'Preparando...' : isRecording ? 'Gravando...' : 'Gravar amostra';

  return (
    <View style={styles.container}>
      <Text variant="label">Gravação da amostra</Text>
      <View style={styles.statusBox} accessibilityLiveRegion="polite">
        <Text style={styles.status}>{isBusy ? (isSaving ? 'Salvando amostra' : 'Preparando microfone') : status}</Text>
      </View>
      <View style={styles.actions}>
        <Button title={recordTitle} onPress={onRecord} disabled={isRecording || disabled || isBusy} />
        <Button title="Parar gravação" onPress={onStop} variant="danger" disabled={!isRecording || isSaving} />
      </View>
      {isRecording || isBusy ? <ActivityIndicator color={isRecording ? colors.danger : colors.primary} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  statusBox: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSoft,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  status: {
    color: colors.text,
    fontWeight: '700',
  },
  actions: {
    gap: spacing.sm,
  },
});
