import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button } from '../../../shared/components/Button';
import { Text } from '../../../shared/components/Text';
import { colors } from '../../../shared/theme/colors';
import { spacing } from '../../../shared/theme/spacing';

type Props = {
  status: string;
  isRecording: boolean;
  isPreparing?: boolean;
  isWorking?: boolean;
  workingLabel?: string;
  disabled?: boolean;
  stopDisabled?: boolean;
  onRecord: () => void;
  onStop: () => void;
};

export function CommunicationRecorder({
  status,
  isRecording,
  isPreparing = false,
  isWorking = false,
  workingLabel = 'Aguarde',
  disabled = false,
  stopDisabled = false,
  onRecord,
  onStop,
}: Props) {
  const isBusy = isPreparing || isWorking;
  const recordTitle = isPreparing ? 'Preparando...' : isRecording ? 'Gravando...' : 'Iniciar gravação';

  return (
    <View style={styles.container}>
      <Text variant="label">Gravar fala</Text>
      <View style={styles.statusBox} accessibilityLiveRegion="polite">
        <Text style={styles.status}>{isBusy ? workingLabel : status}</Text>
      </View>
      <View style={styles.actions}>
        <Button title={recordTitle} onPress={onRecord} disabled={isRecording || disabled || isBusy} />
        <Button title="Parar gravação" onPress={onStop} variant="danger" disabled={!isRecording || stopDisabled || isWorking} />
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
