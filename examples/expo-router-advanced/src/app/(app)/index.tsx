import { View } from "react-native";

import { colors } from "../../styles";

// Navigation is handled entirely by useDetourGate in the root layout.
// This screen exists only as the required index for the (app) group.
// A background-colored view prevents a white flash if this screen is
// momentarily visible during transitions.
export default function AppIndex() {
  return <View style={{ flex: 1, backgroundColor: colors.background }} />;
}
