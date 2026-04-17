import { Pressable, StyleSheet, Text, View } from "react-native";

import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { RootStackParamList } from "..";
import { useAuth } from "../../auth";
import { colors, styles } from "../../styles";

export function NotFound() {
  const { isSignedIn } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "NotFound">>();
  const insets = useSafeAreaInsets();
  const path = route.params?.path;

  const goHome = () =>
    navigation.reset({ index: 0, routes: [{ name: isSignedIn ? "Tabs" : "SignIn" }] });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[headerStyles.header, { paddingTop: insets.top }]}>
        <View style={headerStyles.backButton} />
        <Text style={headerStyles.title}>Not Found</Text>
        <View style={headerStyles.backButton} />
      </View>
      <View style={styles.screen}>
        <View style={styles.card}>
          <Text style={styles.title}>Page not found</Text>
          {path && <Text style={styles.value}>{path}</Text>}
          <Text style={styles.description}>
            The link you followed doesn't match any screen in this app.
          </Text>
          <Pressable onPress={goHome} style={styles.button}>
            <Text style={styles.buttonText}>{isSignedIn ? "Go to Home" : "Go to Sign In"}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const headerStyles = StyleSheet.create({
  header: {
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
});
