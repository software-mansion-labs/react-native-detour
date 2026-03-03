import { Link, useLocalSearchParams } from 'expo-router';
import { Platform } from 'react-native';
import { Pressable, Text, View } from 'react-native';
import { styles } from '../../styles';

// This screen is the expected destination for Detour links resolving to /details.
export default function DetailsScreen() {
  const params = useLocalSearchParams();
  // For demonstration purposes, we display some info about the incoming link. In a real app, you would likely use the link parameters to fetch data or customize the screen in some way.
  const fromDeepLink = params.fromDeepLink === 'true';
  let linkType = params.linkType || 'unknown';
  if (linkType === 'verified') {
    linkType = Platform.select({
      ios: 'Universal',
      android: 'App',
      default: linkType,
    });
  }
  // Remove the debug params from the params object to show only the original link params.
  const linkParams = Object.fromEntries(
    Object.entries(params).filter(
      ([key]) => key !== 'fromDeepLink' && key !== 'linkType'
    )
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
            : 'Opened via button navigation'}
        </Text>
        {Object.keys(linkParams).length > 0 && (
          <>
            <Text style={styles.label}>Link parameters: </Text>
            <Text style={styles.label}>
              {JSON.stringify(linkParams, null, 2)}
            </Text>
          </>
        )}
        <Text style={styles.instructions}>
          Trigger a Detour link that resolves to{' '}
          <Text style={styles.bold}>/details</Text> to validate this flow.
        </Text>
        <Link href="/(app)/home" asChild>
          <Pressable style={styles.button}>
            <Text style={styles.buttonText}>Back to Home</Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}
