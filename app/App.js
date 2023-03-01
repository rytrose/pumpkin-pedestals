import { StatusBar } from "expo-status-bar";
import { Text, View } from "react-native";

import useBlePeripheral from "./hooks/useBlePeripheral";

export default function App() {
  useBlePeripheral();

  return (
    <View className="flex-1 items-center justify-center">
      <Text>Hello, world!</Text>
      <StatusBar style="auto" />
    </View>
  );
}
