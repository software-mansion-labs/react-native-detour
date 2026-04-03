import { Platform, Text, View } from "react-native";

import { Link, useLocalSearchParams } from "expo-router";

import { styles } from "../styles";

// This screen is used to test deferred deep linking. It can be accessible via a link that resolves to /details.
export default function DetailsScreen() {
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
  // Remove the debug params from the params object to show only the original link params.
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
            <Text style={styles.label}>Link parameters: </Text>
            <Text style={styles.label}>{JSON.stringify(linkParams, null, 2)}</Text>
          </>
        )}
        <Link href="/" style={styles.link}>
          Back to /
        </Link>
      </View>
    </View>
  );
}
