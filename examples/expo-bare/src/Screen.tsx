import { Image, Pressable, ScrollView, Text, View } from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  DetourAnalytics,
  DetourEventNames,
  useDetourContext,
} from "@swmansion/react-native-detour";

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

          <Text style={styles.sectionHeader}>Deferred Link</Text>
          <Text style={styles.bullet}>
            Uninstall the app or clear its data, open a Detour link in the mobile browser, then
            install and launch — the SDK resolves the link automatically.
          </Text>
          <Text style={styles.code}>https://&lt;your-org&gt;.godetour.link/&lt;hash&gt;/</Text>

          <Text style={styles.sectionHeader}>Universal / App Link</Text>
          <Text style={styles.bullet}>
            Open in browser or paste into Notes/Messages and tap — iOS/Android will launch the app.
          </Text>
          <Text style={styles.code}>https://&lt;your-org&gt;.godetour.link/&lt;hash&gt;/</Text>

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

          {link?.params && <Text style={styles.code}>{JSON.stringify(link.params, null, 2)}</Text>}

          <View style={styles.divider} />

          <Text style={styles.sectionHeader}>Test Actions</Text>
          <Text style={styles.bullet}>
            Fire these on demand, then inspect the request body in the RN DevTools Network tab to
            confirm idfv/aaid/idfa/install_id/customer_user_id/att_status/consent/session_id/
            app_version/build_number/os_version/locale/revenue fields are attached.
          </Text>

          <Pressable onPress={() => DetourAnalytics.setUserId("test-user-123")}>
            <Text style={styles.linkButton}>Set test customer_user_id</Text>
          </Pressable>

          <Pressable
            onPress={() => DetourAnalytics.logEvent(DetourEventNames.Purchase, { test: true })}
          >
            <Text style={styles.linkButton}>Log test event (purchase)</Text>
          </Pressable>

          <Pressable
            onPress={() =>
              DetourAnalytics.logConversion({
                revenue: 9.99,
                currency: "USD",
                productId: "test_sku_1",
                quantity: 1,
                transactionId: "test-txn-001",
              })
            }
          >
            <Text style={styles.linkButton}>Log test conversion (revenue)</Text>
          </Pressable>

          <Pressable
            onPress={() =>
              DetourAnalytics.setConsent({ ad: true, analytics: true, tracking: true })
            }
          >
            <Text style={styles.linkButton}>Set consent: all granted</Text>
          </Pressable>

          <Pressable
            onPress={() =>
              DetourAnalytics.setConsent({ ad: false, analytics: false, tracking: false })
            }
          >
            <Text style={styles.linkButton}>Set consent: all denied</Text>
          </Pressable>

          <Pressable
            onPress={() => DetourAnalytics.setAdvertisingId("11111111-2222-3333-4444-555555555555")}
          >
            <Text style={styles.linkButton}>Override advertising id (manual)</Text>
          </Pressable>

          <Pressable onPress={() => DetourAnalytics.setTrackingAuthorizationStatus("granted")}>
            <Text style={styles.linkButton}>Override ATT status: granted</Text>
          </Pressable>

          <Pressable onPress={() => DetourAnalytics.setTrackingAuthorizationStatus("denied")}>
            <Text style={styles.linkButton}>Override ATT status: denied</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
};
