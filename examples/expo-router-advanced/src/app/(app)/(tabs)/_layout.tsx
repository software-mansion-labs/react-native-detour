import type { ColorValue } from "react-native";

import { Tabs } from "expo-router";

import { Ionicons } from "@expo/vector-icons";

import { colors } from "../../../styles";

const tabBarOptions = {
  tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
  tabBarActiveTintColor: colors.accent,
  tabBarInactiveTintColor: colors.muted,
  headerStyle: { backgroundColor: colors.card },
  headerTintColor: colors.accent,
  headerTitleStyle: { color: colors.text },
};

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

function tabIcon(name: IoniconName) {
  // The tab bar passes the string tint colors from tabBarOptions. Its ColorValue type also
  // allows numbers and null, which Ionicons does not accept.
  return ({ color }: { color: ColorValue }) => (
    <Ionicons name={name} size={22} color={typeof color === "string" ? color : undefined} />
  );
}

export default function TabsLayout() {
  return (
    <Tabs screenOptions={tabBarOptions}>
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: tabIcon("home") }} />
      <Tabs.Screen name="explore" options={{ title: "Explore", tabBarIcon: tabIcon("compass") }} />
      <Tabs.Screen
        name="settings"
        options={{ title: "Settings", tabBarIcon: tabIcon("settings") }}
      />
    </Tabs>
  );
}
