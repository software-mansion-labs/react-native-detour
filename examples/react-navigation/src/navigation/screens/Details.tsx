import { Platform, Pressable, Text, View } from "react-native";

import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import type { RootStackParamList } from "..";
import { styles } from "../../styles";

function formatLinkType(type: string | undefined) {
  if (type === "deferred") return "deferred link";
  if (type === "verified")
    return Platform.select({ ios: "Universal link", android: "App link", default: "verified link" });
  if (type === "scheme") return "scheme link";
  return "unknown";
}

export function Details() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "Details">>();
  const fromDeepLink = route.params?.fromDeepLink;
  const linkType = route.params?.linkType;
  const linkParams = route.params?.linkParams;
  const hasLinkParams = linkParams && Object.keys(linkParams).length > 0;

  return (
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

        <View style={styles.divider} />

        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={styles.button}
        >
          <Text style={styles.buttonText}>← Back to Home</Text>
        </Pressable>
      </View>
    </View>
  );
}
