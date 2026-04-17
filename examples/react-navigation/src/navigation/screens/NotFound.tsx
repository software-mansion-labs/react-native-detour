import { Pressable, Text, View } from "react-native";

import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import type { RootStackParamList } from "..";
import { colors, styles } from "../../styles";

export function NotFound() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "NotFound">>();
  const path = route.params?.path;
  const params = route.params?.params;
  const hasParams = params && Object.keys(params).length > 0;

  return (
    <View style={styles.screen}>
      <View style={[styles.card, { borderColor: colors.error }]}>
        <Text style={[styles.title, { color: colors.error }]}>Not Found</Text>
        <Text style={styles.label}>
          The link you followed doesn't match any screen in this app.
        </Text>

        {path && (
          <>
            <View style={styles.divider} />
            <Text style={styles.label}>
              <Text style={styles.bold}>path:</Text> {path}
            </Text>
          </>
        )}

        {hasParams &&
          Object.entries(params).map(([key, value]) => (
            <Text key={key} style={styles.label}>
              <Text style={styles.bold}>{key}:</Text> {value}
            </Text>
          ))}

        <View style={styles.divider} />

        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={styles.button}
        >
          <Text style={styles.buttonText}>← Go to Home</Text>
        </Pressable>
      </View>
    </View>
  );
}
