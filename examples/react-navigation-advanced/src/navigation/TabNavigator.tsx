import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import { colors } from "../styles";
import { Explore } from "./screens/Explore";
import { Home } from "./screens/Home";
import { Settings } from "./screens/Settings";

export type TabParamList = {
  Home: undefined;
  Explore: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

function tabIcon(name: IoniconName) {
  return ({ color }: { color: string }) => <Ionicons name={name} size={22} color={color} />;
}

const tabBarOptions = {
  tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
  tabBarActiveTintColor: colors.accent,
  tabBarInactiveTintColor: colors.muted,
  headerStyle: { backgroundColor: colors.card },
  headerTintColor: colors.accent,
  headerTitleStyle: { color: colors.text },
};

export function TabNavigator() {
  return (
    <Tab.Navigator screenOptions={tabBarOptions}>
      <Tab.Screen name="Home" component={Home} options={{ tabBarIcon: tabIcon("home") }} />
      <Tab.Screen name="Explore" component={Explore} options={{ tabBarIcon: tabIcon("compass") }} />
      <Tab.Screen
        name="Settings"
        component={Settings}
        options={{ tabBarIcon: tabIcon("settings") }}
      />
    </Tab.Navigator>
  );
}
