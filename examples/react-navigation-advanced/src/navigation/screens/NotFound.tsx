import { Pressable, Text, View } from "react-native";

import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import type { RootStackParamList } from "..";
import { useAuth } from "../../AuthContext";
import { styles } from "../../styles";

// This screen is used as a fallback for any links that don't match a known route in the app.
export function NotFound() {
  const { isLoggedIn } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "NotFound">>();

  const path = route.params?.path;
  const params = route.params?.params;
  const hasParams = params && Object.keys(params).length > 0;

  return (
    <View style={styles.screen}>
      <View style={[styles.card, styles.errorCard]}>
        <Text style={[styles.title, styles.errorTitle]}>Page Not Found</Text>
        <Text style={styles.label}>
          The link you followed doesn't match any screen in this app.
        </Text>
        {path && (
          <Text style={styles.path}>
            <Text style={styles.pathKey}>path: </Text>
            {path}
          </Text>
        )}
        {hasParams && (
          <Text style={styles.path}>
            <Text style={styles.pathKey}>query params: </Text>
            {JSON.stringify(params, null, 2)}
          </Text>
        )}
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            navigation.reset({
              index: 0,
              routes: [{ name: isLoggedIn ? "Home" : "Login" }],
            })
          }
          style={styles.button}
        >
          <Text style={styles.buttonText}>{isLoggedIn ? "Go to Home" : "Go to Login"}</Text>
        </Pressable>
      </View>
    </View>
  );
}
