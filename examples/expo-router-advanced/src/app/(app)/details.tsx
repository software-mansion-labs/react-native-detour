import { Platform, Pressable, Text, View } from "react-native";

import { useLocalSearchParams, useRouter } from "expo-router";

import { styles } from "../../styles";

export default function DetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const fromDeepLink = params.fromDeepLink === "true";
  let linkType = params.linkType || "unknown";
  if (linkType === "verified") {
    linkType = Platform.select({ ios: "Universal", android: "App", default: linkType });
  }
  const linkParams = Object.fromEntries(
    Object.entries(params).filter(([key]) => key !== "fromDeepLink" && key !== "linkType"),
  );

  return (
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
            <View style={styles.divider} />
            <Text style={styles.sectionHeader}>Link params</Text>
            <Text style={styles.label}>{JSON.stringify(linkParams, null, 2)}</Text>
          </>
        )}
      </View>

      <Pressable
        onPress={() => router.back()}
        style={[styles.button, { alignSelf: "stretch", marginTop: 12 }]}
      >
        <Text style={styles.buttonText}>← Back</Text>
      </Pressable>
    </View>
  );
}
