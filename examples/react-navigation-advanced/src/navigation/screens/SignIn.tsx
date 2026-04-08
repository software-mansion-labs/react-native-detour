import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { useAuth } from "../../auth";
import { colors, styles } from "../../styles";

export function SignIn() {
  const { signIn } = useAuth();

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to continue to the app.</Text>

        <View style={styles.divider} />

        <TextInput
          style={inputStyles.input}
          value="demo@godetour.dev"
          editable={false}
          placeholderTextColor={colors.muted}
        />
        <TextInput
          style={inputStyles.input}
          value="••••••••"
          editable={false}
          placeholderTextColor={colors.muted}
        />
      </View>

      <Pressable onPress={signIn} style={[styles.button, inputStyles.signInButton]}>
        <Text style={styles.buttonText}>Sign In</Text>
      </Pressable>
    </View>
  );
}

const inputStyles = StyleSheet.create({
  input: {
    alignSelf: "stretch",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: colors.subtle,
    backgroundColor: colors.background,
  },
  signInButton: {
    alignSelf: "stretch",
    marginTop: 12,
  },
});
