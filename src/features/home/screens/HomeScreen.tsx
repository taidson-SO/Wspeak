import { StyleSheet, View } from 'react-native';

import { Button } from '../../../shared/components/Button';
import { ScreenContainer } from '../../../shared/components/ScreenContainer';
import { Text } from '../../../shared/components/Text';
import { colors } from '../../../shared/theme/colors';
import { spacing } from '../../../shared/theme/spacing';

type Props = {
  trainedWordCount: number;
  readyWordCount: number;
  onOpenTraining: () => void;
  onOpenAssessment: () => void;
  onOpenExercise: () => void;
  onOpenCommunication: () => void;
  onOpenPrivacy: () => void;
};

export function HomeScreen({
  trainedWordCount,
  readyWordCount,
  onOpenTraining,
  onOpenAssessment,
  onOpenExercise,
  onOpenCommunication,
  onOpenPrivacy,
}: Props) {
  const hasReadyWords = readyWordCount > 0;
  const nextStepTitle = hasReadyWords ? 'Conversar agora' : 'Começar pelo treino';
  const nextStepDescription = hasReadyWords
    ? `${readyWordCount} palavra(s) já podem ser usadas para conversar.`
    : 'Grave 3 exemplos de uma palavra para liberar prática e conversa.';
  const handleNextStep = hasReadyWords ? onOpenCommunication : onOpenTraining;

  return (
    <ScreenContainer>
      <View style={styles.hero}>
        <Text variant="caption" align="center" style={styles.kicker}>
          Aprendizado personalizado de fala
        </Text>
        <Text variant="title" align="center" style={styles.title}>
          WSpeak
        </Text>
        <Text variant="body" align="center" style={styles.description}>
          Grave exemplos, avalie com pessoas reais e use o app com mais cuidado para praticar ou conversar.
        </Text>
      </View>

      <View style={styles.nextStepCard}>
        <Text variant="headline">Próximo passo</Text>
        <Text variant="body" style={styles.infoText}>
          {nextStepDescription}
        </Text>
        <Button title={nextStepTitle} onPress={handleNextStep} />
      </View>

      <View style={styles.actions}>
        <Button title="1. Treinar palavras" onPress={onOpenTraining} variant="ghost" />
        <Button title="2. Avaliar fala" onPress={onOpenAssessment} variant="ghost" />
        <Button title="3. Praticar" onPress={onOpenExercise} variant="ghost" />
        <Button title="4. Conversar" onPress={onOpenCommunication} variant="ghost" />
        <Button title="Dados e privacidade" onPress={onOpenPrivacy} variant="ghost" />
      </View>

      <View style={styles.infoCard}>
        <Text variant="headline">Meu treino</Text>
        <Text variant="body" style={styles.infoText}>
          {trainedWordCount > 0
            ? `${trainedWordCount} palavra(s) já possuem amostras treinadas.`
            : 'Nenhuma palavra treinada ainda.'}
        </Text>
        <Text variant="caption">{readyWordCount} palavra(s) prontas para praticar e conversar.</Text>
        <Text variant="caption">Os exemplos ficam salvos neste aparelho.</Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  kicker: {
    color: colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  title: {
    color: colors.primaryDark,
  },
  description: {
    color: colors.muted,
  },
  actions: {
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  nextStepCard: {
    padding: spacing.lg,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    gap: spacing.sm,
  },
  infoCard: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  infoText: {
    color: colors.muted,
  },
});
