import { StyleSheet } from "react-native";

export const colors = {
  background: "#0C1221",
  card: "#141C32",
  border: "#1E2A40",
  text: "#F0F4FF",
  subtle: "#8A9BBF",
  muted: "#4E5E80",
  accent: "#17C9F5",
  error: "#FF4D6A",
};

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 440,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 20,
    gap: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
  },
  label: {
    fontSize: 14,
    color: colors.subtle,
  },
  instructions: {
    fontSize: 13,
    color: colors.muted,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.muted,
    marginTop: 4,
  },
  bold: {
    fontWeight: "600",
    color: colors.text,
  },
  value: {
    fontWeight: "700",
    color: colors.accent,
  },
  divider: {
    width: "100%",
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  code: {
    fontSize: 12,
    fontFamily: "Menlo",
    color: colors.text,
    backgroundColor: colors.background,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  button: {
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.accent,
    alignItems: "center",
  },
  buttonText: {
    color: colors.background,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  accent: {
    color: colors.accent,
    fontWeight: "500",
  },
  bullet: {
    fontSize: 14,
    color: colors.subtle,
    lineHeight: 21,
  },
  error: {
    fontSize: 13,
    color: colors.error,
  },
});
