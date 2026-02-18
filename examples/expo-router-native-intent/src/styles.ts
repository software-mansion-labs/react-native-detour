import { StyleSheet } from 'react-native';

const colors = {
  background: '#f8fafc',
  card: '#ffffff',
  border: '#e2e8f0',
  text: '#0f172a',
  subtle: '#475569',
  muted: '#94a3b8',
  error: '#b91c1c',
};

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.background,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 20,
    gap: 8,
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  label: {
    fontSize: 13,
    color: colors.subtle,
  },
  instructions: {
    fontSize: 13,
    color: colors.subtle,
    marginVertical: 8,
  },
  bold: {
    fontWeight: '600',
  },
  value: {
    fontWeight: '600',
    color: colors.text,
  },
  error: {
    fontSize: 12,
    color: colors.error,
  },
  actions: {
    marginTop: 4,
    gap: 8,
  },
  actionText: {
    fontSize: 15,
    color: colors.text,
    textDecorationLine: 'underline',
  },
  actionTextDisabled: {
    color: colors.muted,
    textDecorationLine: 'none',
  },
  description: {
    fontSize: 15,
  },
  link: {
    fontSize: 15,
    color: colors.text,
    textDecorationLine: 'underline',
  },
});
