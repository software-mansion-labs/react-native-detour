import { useNavigation, useRoute } from '@react-navigation/native';
import { Platform, Pressable, Text, View } from 'react-native';
import type { RootStackParamList } from '..';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { styles } from '../../styles';

// Helper to format the link type for demonstration purposes.
function formatLinkType(type: string | undefined) {
  if (type === 'deferred') return 'deferred link';
  if (type === 'verified')
    return Platform.select({
      ios: 'Universal link',
      android: 'App link',
      default: 'verified link',
    });
  if (type === 'scheme') return 'scheme link';
  return 'unknown';
}

export function Details() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // Those params are set by the `toPendingDetailsRoute` helper when a deep link resolves to this screen.
  // They are used for demonstration purposes to show additional information about the incoming deep link.
  // In a real app, the params and their usage would depend on the app's specific needs.
  const route = useRoute<RouteProp<RootStackParamList, 'Details'>>();
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
            : 'Opened via button navigation'}
        </Text>
        {hasLinkParams && (
          <>
            <Text style={styles.sectionTitle}>Link params</Text>
            {Object.entries(linkParams).map(([key, value]) => (
              <Text key={key} style={styles.infoValue}>
                <Text style={styles.infoKey}>{key}:</Text> {value}
              </Text>
            ))}
          </>
        )}
        <Text style={styles.instructions}>
          Use this screen to verify Detour route mapping to React Navigation.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('Home')}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Back to Home</Text>
        </Pressable>
      </View>
    </View>
  );
}
