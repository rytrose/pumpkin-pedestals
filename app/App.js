import { StatusBar } from "expo-status-bar";
import { useCallback, useState } from "react";
import { Text, TextInput, View, useWindowDimensions } from "react-native";
import { Canvas, Rect } from "@shopify/react-native-skia";

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

  const { width } = useWindowDimensions();
  const SIZE = width * 0.8;

  return (
    <View className="flex-1 items-center justify-center">
      <Canvas
        style={{
          width: SIZE,
          height: SIZE,
        }}
      >
        <Rect rect={{ x: 0, y: 0, width: SIZE, height: SIZE }} />
      </Canvas>
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
