import { StyleSheet } from 'react-native';

const colors = {
  background: '#f8fafc',
  card: '#ffffff',
  border: '#e2e8f0',
  text: '#0f172a',
  subtle: '#475569',
  muted: '#64748b',
  dark: '#111827',
  errorCard: '#fff7f7',
  errorBorder: '#fecaca',
  errorText: '#991b1b',
};

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.background,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 20,
    gap: 10,
  },
  errorCard: {
    borderColor: colors.errorBorder,
    backgroundColor: colors.errorCard,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  errorTitle: {
    color: colors.errorText,
  },
  label: {
    fontSize: 14,
    color: colors.subtle,
  },
  instructions: {
    fontSize: 13,
    color: colors.muted,
  },
  bold: {
    fontWeight: '600',
    color: colors.text,
  },
  value: {
    fontWeight: '700',
    color: colors.text,
  },
  sectionTitle: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  infoValue: {
    fontSize: 12,
  },
  infoKey: {
    fontWeight: '700',
    color: colors.text,
  },
  button: {
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.dark,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
