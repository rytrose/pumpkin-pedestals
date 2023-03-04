import { StatusBar } from "expo-status-bar";
import { useCallback, useState } from "react";
import { Text, TextInput, View } from "react-native";

import { useBlePeripheral } from "./hooks/useBlePeripheral";

export default function App() {
  const [peripheralData, setPeripheralData] = useState("");
  const onPeripheralData = useCallback(
    (data) => {
      setPeripheralData(`${Date.now()}: ${data}`);
    },
    [setPeripheralData]
  );
  const [error, connectionStatus, writeToPeripheral] =
    useBlePeripheral(onPeripheralData);

  return (
    <View className="flex-1 items-center justify-center">
      <Text>Hello, world!</Text>
      <Text>Error: {error || "none"}</Text>
      <Text>Connection Status: {connectionStatus}</Text>
      <Text>Peripheral data: {peripheralData}</Text>
      <TextInput
        onSubmitEditing={({ nativeEvent: { text } }) => {
          writeToPeripheral(text);
        }}
      />
      <StatusBar style="auto" />
    </View>
  );
}
