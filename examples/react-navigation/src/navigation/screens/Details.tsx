import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { RootStackParamList } from "..";
import { colors, styles } from "../../styles";

function formatLinkType(type: string | undefined) {
  if (type === "deferred") return "deferred link";
  if (type === "verified")
    return Platform.select({
      ios: "Universal link",
      android: "App link",
      default: "verified link",
    });
  if (type === "scheme") return "scheme link";
  return "unknown";
}

export function Details() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "Details">>();
  const insets = useSafeAreaInsets();
  const fromDeepLink = route.params?.fromDeepLink;
  const linkType = route.params?.linkType;
  const linkParams = route.params?.linkParams;
  const hasLinkParams = linkParams && Object.keys(linkParams).length > 0;

  const goBack = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate("Home"));

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
          <Text style={styles.title}>Details</Text>
          <Text style={styles.label}>
            {fromDeepLink
              ? `Opened via deep link (${formatLinkType(linkType)})`
              : "Opened via button navigation"}
          </Text>

          {hasLinkParams && (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionHeader}>Link params</Text>
              {Object.entries(linkParams).map(([key, value]) => (
                <Text key={key} style={styles.label}>
                  <Text style={styles.bold}>{key}:</Text> {value}
                </Text>
              ))}
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
