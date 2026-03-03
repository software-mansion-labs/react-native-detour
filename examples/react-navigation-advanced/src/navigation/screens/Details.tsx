import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Platform, Pressable, Text, View } from 'react-native';
import type { RootStackParamList } from '..';
import { styles } from '../../styles';

// For demonstration purposes, this screen displays info about how it was opened and any incoming link parameters.
function formatOpenedVia(type: string | undefined, source: string | undefined) {
  if (source === 'linking')
    return 'Opened via custom scheme deep link (Detour not involved)';
  if (type === 'deferred')
    return 'Opened via Detour handled deep link (deferred link)';
  if (type === 'verified')
    return Platform.select({
      ios: 'Opened via Detour handled deep link (Universal link)',
      android: 'Opened via Detour handled deep link (App link)',
      default: 'Opened via Detour handled deep link (verified link)',
    });
  return 'Opened via deep link';
}

export function Details() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Details'>>();

  const fromDeepLink = route.params?.fromDeepLink;
  const source = route.params?.source;
  const linkType = route.params?.linkType;
  const linkParams = route.params?.linkParams;
  const hasLinkParams = linkParams && Object.keys(linkParams).length > 0;

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Details</Text>
        <Text style={styles.label}>
          {fromDeepLink
            ? formatOpenedVia(linkType, source)
            : 'Opened via button navigation'}
        </Text>
        {fromDeepLink && (
          <>
            <Text style={styles.sectionTitle}>Navigation params</Text>
            <Text style={styles.infoValue}>
              <Text style={styles.infoKey}>source:</Text> {source ?? 'manual'}
            </Text>
          </>
        )}
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
