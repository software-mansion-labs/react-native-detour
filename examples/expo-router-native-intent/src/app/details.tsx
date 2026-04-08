import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { useLocalSearchParams, useRouter } from "expo-router";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, styles } from "../styles";

export default function DetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const fromDeepLink = params.fromDeepLink === "true";
  let linkType = params.linkType || "unknown";
  if (linkType === "verified") {
    linkType = Platform.select({
      ios: "Universal",
      android: "App",
      default: linkType,
    });
  }
  const linkParams = Object.fromEntries(
    Object.entries(params).filter(([key]) => key !== "fromDeepLink" && key !== "linkType"),
  );

  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/"));

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[headerStyles.header, { paddingTop: insets.top }]}>
        <Pressable onPress={goBack} style={headerStyles.backButton}>
          <Text style={headerStyles.backText}>←</Text>
        </Pressable>
        <Text style={headerStyles.title}>Details</Text>
        <View style={headerStyles.backButton} />
      </View>
      <View style={styles.screen}>
        <View style={styles.card}>
          <Text style={styles.title}>
            Route: <Text style={styles.value}>/details</Text>
          </Text>
          <Text style={styles.label}>
            {fromDeepLink
              ? `Opened via deep link (${linkType} link)`
              : "Opened via button navigation"}
          </Text>
          {Object.keys(linkParams).length > 0 && (
            <>
              <Text style={styles.label}>Link parameters: </Text>
              <Text style={styles.label}>{JSON.stringify(linkParams, null, 2)}</Text>
            </>
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
