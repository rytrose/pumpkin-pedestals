import { useCallback, useState, useEffect } from "react";
import { Text, TextInput, useWindowDimensions, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as ScreenOrientation from "expo-screen-orientation";
import { Rect, Paint, Group } from "@shopify/react-native-skia";
import Touchable, { useGestureHandler } from "react-native-skia-gesture";

import Pedestal, { PedestalOrienation } from "./components/canvas/Pedestal";
import { useBlePeripheral } from "./hooks/useBlePeripheral";

export default function App() {
  // Force landscape
  useEffect(() => {
    (async () => {
      try {
        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.LANDSCAPE
        );
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  const [peripheralData, setPeripheralData] = useState("");
  const onPeripheralData = useCallback(
    (data) => {
      setPeripheralData(`${Date.now()}: ${data}`);
    },
    [setPeripheralData]
  );
  const [error, connectionStatus, writeToPeripheral] =
    useBlePeripheral(onPeripheralData);

  const { height, width } = useWindowDimensions();
  const HEIGHT = height * 0.6;
  // Keep the width padding equal to the Canvas padding, my-4 == 16px top/bottom
  const WIDTH = width - 32;

  return (
    <View className="flex-1 flex-col items-center">
      <View className={`my-4`}>
        <Touchable.Canvas
          style={{
            width: WIDTH,
            height: HEIGHT,
          }}
        >
          <Group antiAlias={true}>
            <Rect
              rect={{ x: 0, y: 0, width: WIDTH, height: HEIGHT }}
              opacity={0}
            >
              <Paint style="stroke" color={"black"} />
            </Rect>
            <Pedestal
              orientation={PedestalOrienation.POINTY_TOP}
              x={50}
              y={50}
              size={50}
              neighborIndices={[0]}
              showNeighbors
            />
          </Group>
        </Touchable.Canvas>
      </View>
      <Text>Connection Status: {connectionStatus}</Text>
      <Text>Peripheral data: {peripheralData}</Text>
      <Text>Error: {error || "none"}</Text>
      <TextInput
        onSubmitEditing={({ nativeEvent: { text } }) => {
          writeToPeripheral(text);
        }}
      />
      <StatusBar style="auto" hidden />
    </View>
  );
}
