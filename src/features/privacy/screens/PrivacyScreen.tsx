import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Button } from '../../../shared/components/Button';
import { ScreenContainer } from '../../../shared/components/ScreenContainer';
import { Text } from '../../../shared/components/Text';
import { colors } from '../../../shared/theme/colors';
import { spacing } from '../../../shared/theme/spacing';

type Props = {
  trainedWordCount: number;
  customWordCount: number;
  onBack: () => void;
  onClearData: () => Promise<void>;
};

export function PrivacyScreen({ trainedWordCount, customWordCount, onBack, onClearData }: Props) {
  const [status, setStatus] = useState('Aguardando');
  const [isClearing, setIsClearing] = useState(false);

  function handleClearData() {
    Alert.alert(
      'Apagar dados locais?',
      'Isso apaga palavras criadas, amostras de áudio, avaliações, tentativas de exercício e treino salvo neste aparelho. Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar tudo',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsClearing(true);
              setStatus('Apagando dados');
              await onClearData();
              setStatus('Dados apagados deste aparelho.');
              Alert.alert('Dados apagados', 'O WSpeak voltou ao estado inicial neste aparelho.');
            } catch (error) {
              console.error('Falha ao apagar dados locais.', error);
              setStatus('Não foi possível apagar os dados.');
              Alert.alert('Erro', 'Não foi possível apagar os dados locais. Tente novamente.');
            } finally {
              setIsClearing(false);
            }
          },
        },
      ],
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Button title="Voltar" onPress={onBack} variant="ghost" disabled={isClearing} />
        <Text variant="title" style={styles.title}>
          Dados e privacidade
        </Text>
        <Text variant="body" style={styles.subtitle}>
          Suas amostras de áudio, avaliações, palavras criadas e treino ficam salvos somente neste aparelho.
        </Text>
        <Text variant="caption" accessibilityLiveRegion="polite">
          {status}
        </Text>
      </View>

      <View style={styles.card}>
        <Text variant="headline">O que fica salvo</Text>
        <Text variant="body" style={styles.item}>
          Amostras de áudio gravadas no treinamento.
        </Text>
        <Text variant="body" style={styles.item}>
          Padrões que o app usa para reconhecer suas palavras.
        </Text>
        <Text variant="body" style={styles.item}>
          Palavras que você adicionou à lista.
        </Text>
        <Text variant="body" style={styles.item}>
          Respostas humanas e confusões observadas na avaliação.
        </Text>
        <Text variant="body" style={styles.item}>
          Tentativas de exercício e resumo de evolução por palavra.
        </Text>
      </View>

      <View style={styles.card}>
        <Text variant="headline">Resumo neste aparelho</Text>
        <Text variant="body" style={styles.item}>
          {trainedWordCount} palavra(s) com treino salvo.
        </Text>
        <Text variant="body" style={styles.item}>
          {customWordCount} palavra(s) criada(s) por você.
        </Text>
      </View>

      <View style={styles.dangerCard}>
        <Text variant="headline" style={styles.dangerTitle}>
          Apagar dados
        </Text>
        <Text variant="body" style={styles.item}>
          Use esta opção para remover todo o treino, avaliações e dados locais para voltar ao estado inicial.
        </Text>
        <Button title="Apagar todos os dados locais" onPress={handleClearData} variant="danger" disabled={isClearing} />
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
  card: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  dangerCard: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.danger,
    gap: spacing.sm,
  },
  dangerTitle: {
    color: colors.danger,
  },
  item: {
    color: colors.text,
  },
});
