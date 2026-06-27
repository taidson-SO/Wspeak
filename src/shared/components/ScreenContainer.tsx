import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

type Props = PropsWithChildren<{
  padded?: boolean;
}>;

export function ScreenContainer({ children, padded = true }: Props) {
  return (
    <ScrollView contentContainerStyle={[styles.content, padded ? styles.padded : null]} keyboardShouldPersistTaps="handled">
      <View style={styles.inner}>{children}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    backgroundColor: colors.background,
  },
  padded: {
    padding: spacing.lg,
  },
  inner: {
    flex: 1,
  },
});