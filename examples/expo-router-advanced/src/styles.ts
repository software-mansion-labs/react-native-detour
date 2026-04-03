import { StyleSheet } from "react-native";

const colors = {
  background: "#f8fafc",
  card: "#ffffff",
  border: "#e2e8f0",
  text: "#0f172a",
  subtle: "#475569",
  muted: "#94a3b8",
  error: "#b91c1c",
  success: "#059669",
  danger: "#dc2626",
  dark: "#111827",
};

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: colors.background,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 20,
    gap: 8,
    alignItems: "flex-start",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
  },
  label: {
    fontSize: 13,
    color: colors.subtle,
  },
  instructions: {
    fontSize: 13,
    color: colors.subtle,
  },
  value: {
    fontWeight: "600",
    color: colors.text,
  },
  bold: {
    fontWeight: "600",
  },
  description: {
    fontSize: 15,
  },
  info: {
    fontSize: 12,
    color: colors.success,
    fontWeight: "500",
  },
  error: {
    fontSize: 12,
    color: colors.error,
  },
  link: {
    fontSize: 15,
    color: colors.text,
    textDecorationLine: "underline",
  },
  actions: {
    marginTop: 4,
    gap: 8,
  },
  actionText: {
    fontSize: 15,
    color: colors.text,
    textDecorationLine: "underline",
  },
  actionTextDisabled: {
    color: colors.muted,
    textDecorationLine: "none",
  },
  button: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.dark,
    alignSelf: "center",
  },
  dangerButton: {
    backgroundColor: colors.danger,
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "600",
  },
});
