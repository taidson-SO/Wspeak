import { StyleSheet, Text as RNText, type TextProps } from 'react-native';

import { colors } from '../theme/colors';

type Props = TextProps & {
  variant?: 'title' | 'headline' | 'body' | 'caption' | 'label';
  align?: 'left' | 'center' | 'right';
};

export function Text({ variant = 'body', align = 'left', style, ...props }: Props) {
  return <RNText {...props} style={[styles.base, styles[variant], { textAlign: align }, style]} />;
}

const styles = StyleSheet.create({
  base: {
    color: colors.text,
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
  },
  headline: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
  },
  caption: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
  },
  label: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
});
