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
    flexGrow: 1,
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
    marginVertical: 8,
  },
  divider: {
    width: "100%",
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.muted,
    marginTop: 4,
  },
  subtitle: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  bullet: {
    fontSize: 14,
    color: colors.subtle,
    lineHeight: 21,
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
  accent: {
    color: colors.accent,
    fontWeight: "500",
  },
  value: {
    fontWeight: "600",
    color: colors.accent,
  },
  linkButton: {
    alignSelf: "stretch",
    marginTop: 4,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.accent,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "700",
    color: colors.background,
    overflow: "hidden",
  },
  error: {
    fontSize: 12,
    color: colors.error,
  },
  description: {
    fontSize: 15,
    color: colors.subtle,
  },
  link: {
    fontSize: 15,
    color: colors.accent,
  },
});
