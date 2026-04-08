import { Pressable, StyleSheet, Text, View } from "react-native";

import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { RootStackParamList } from "..";
import { colors, styles } from "../../styles";

export function ThirdParty() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "ThirdParty">>();
  const insets = useSafeAreaInsets();
  const raw = route.params?.raw;

  const goBack = () =>
    navigation.canGoBack() ? navigation.goBack() : navigation.navigate("Tabs");

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[headerStyles.header, { paddingTop: insets.top }]}>
        <Pressable onPress={goBack} style={headerStyles.backButton}>
          <Text style={headerStyles.backText}>←</Text>
        </Pressable>
        <Text style={headerStyles.title}>Third-party</Text>
        <View style={headerStyles.backButton} />
      </View>
      <View style={styles.screen}>
        <View style={styles.card}>
          <Text style={styles.title}>Third-party deep link</Text>
          <Text style={styles.label}>A custom scheme link was intercepted and redirected here.</Text>
          {raw ? (
            <Text style={styles.label}>
              Raw URL: <Text style={styles.value}>{raw}</Text>
            </Text>
          ) : (
            <Text style={styles.label}>Raw URL not provided.</Text>
          )}
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
  backText: {
    color: colors.accent,
    fontSize: 24,
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
});
