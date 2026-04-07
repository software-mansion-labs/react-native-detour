import { Image, ScrollView, Text, View } from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useDetourContext } from "@swmansion/react-native-detour";

import { colors, styles } from "./styles";

export const Screen = () => {
  const { isLinkProcessed, link } = useDetourContext();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          backgroundColor: colors.card,
          paddingHorizontal: 16,
          paddingBottom: 12,
          paddingTop: insets.top,
          alignItems: "center",
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Image
          source={require("../assets/detour-logo-transparent.png")}
          style={{ width: 32, height: 32 }}
          resizeMode="contain"
        />
      </View>
      <ScrollView contentContainerStyle={styles.screen}>
        <View style={styles.card}>
          <Text style={styles.title}>Detour Expo Bare Example</Text>
          <Text style={styles.subtitle}>
            Add credentials from the Detour panel to <Text style={styles.accent}>.env</Text> before
            testing.
          </Text>

          <View style={styles.divider} />

          <Text style={styles.sectionHeader}>Universal / App Link</Text>
          <Text style={styles.bullet}>
            Open a Detour link in the browser — iOS/Android will launch the app. Test with the
            simulator using:
          </Text>
          <Text style={styles.code}>
            npx uri-scheme open {`"detour-expo-bare://"`} --ios
          </Text>

          <Text style={styles.sectionHeader}>Deferred Link</Text>
          <Text style={styles.bullet}>
            Copy a Detour link to your clipboard, then kill and relaunch the app. Because{" "}
            <Text style={styles.accent}>shouldUseClipboard</Text> is enabled, Detour reads the
            clipboard on startup and resolves the pending link automatically.
          </Text>
          <Text style={styles.code}>
            https://&lt;your-org&gt;.godetour.link/&lt;hash&gt;/
          </Text>

          <View style={styles.divider} />

          <Text style={styles.sectionHeader}>Status</Text>

          <Text style={styles.label}>
            isLinkProcessed:{" "}
            <Text style={isLinkProcessed ? styles.accent : styles.subtitle}>
              {isLinkProcessed ? "true" : "false"}
            </Text>
          </Text>

          <Text style={styles.label}>
            type: <Text style={styles.value}>{link?.type ?? "none"}</Text>
          </Text>

          <Text style={styles.label}>
            url: <Text style={styles.value}>{String(link?.url ?? "none")}</Text>
          </Text>

          <Text style={styles.label}>
            route: <Text style={styles.value}>{link?.route ?? "none"}</Text>
          </Text>

          {link?.params && (
            <Text style={styles.code}>{JSON.stringify(link.params, null, 2)}</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
};
