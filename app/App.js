import { useCallback, useState, useEffect, useRef } from "react";
import { Button, useWindowDimensions, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as ScreenOrientation from "expo-screen-orientation";
import { Rect, Paint, Group } from "@shopify/react-native-skia";
import Touchable from "react-native-skia-gesture";

import Pedestal, { PedestalOrientation } from "./components/canvas/Pedestal";
import {
  BleConnectionStatus,
  useBlePeripheral,
} from "./hooks/useBlePeripheral";
import { useMockBlePeripheral } from "./hooks/useMockBlePeripheral";
import { definePedestalSize, makePedestalPositions } from "./utils/geometry";
import Connectivity from "./components/Connectivity";
import Configuration from "./components/Configuration";
import usePedestalState from "./hooks/usePedestalState";

// For development purposes
const MOCK_BLE = true;

export default function App() {
  // Force landscape
  useEffect(() => {
    (async () => {
      try {
        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.LANDSCAPE
        );
      } catch (err) {
        console.log("ERROR", err);
      }
    })();
  }, []);

  const [bleError, connectionStatus, commands] = MOCK_BLE
    ? useMockBlePeripheral()
    : useBlePeripheral();

  const [pendingPedestals, setPendingPedestals] = useState({});
  const resetPedestals = useCallback(() => {
    (async () => {
      if (connectionStatus === BleConnectionStatus.CONNECTED) {
        const pedestals = await commands.getPedestals();
        setPendingPedestals(pedestals);
        return;
      }
      // TODO: toast error
    })();
  }, [connectionStatus]);

  const [orientation, setOrientation] = useState(
    PedestalOrientation.POINTY_TOP
  );
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const canvasHeight = windowHeight * 0.7;
  // Keep the width padding equal to the Canvas padding, my-2 == 8px top/bottom
  const canvasWidth = windowWidth - 16;

  // The main state containing the pedestals
  const [pedestalState, dispatchPedestalState] = usePedestalState();

  // Reset pedestal state if layout parameters change
  useEffect(() => {
    dispatchPedestalState({
      type: "reset",
      canvasWidth: canvasWidth,
      canvasHeight: canvasHeight,
      orientation: orientation,
    });
  }, [canvasWidth, canvasHeight, orientation]);

  return (
    <View className="flex-1 flex-col items-center">
      <View className="my-2">
        <Touchable.Canvas
          style={{
            width: canvasWidth,
            height: canvasHeight,
          }}
        >
          <Group antiAlias={true}>
            <Rect
              rect={{ x: 0, y: 0, width: canvasWidth, height: canvasHeight }}
              opacity={0}
            >
              <Paint style="stroke" color={"black"} />
            </Rect>
            {pedestalState.map((pedestal, i) => {
              return <Pedestal {...pedestal} />;
            })}
          </Group>
        </Touchable.Canvas>
      </View>
      <View className="flex-1 flex-row mx-2 border">
        <View className="flex-1 border">
          <Connectivity connectionStatus={connectionStatus} />
          <Configuration
            pendingPedestals={pendingPedestals}
            resetPedestals={resetPedestals}
          />
        </View>
        <View className="border flex-1">
          <Button
            title="Orientation"
            onPress={() =>
              setOrientation((lastOrientation) =>
                lastOrientation === PedestalOrientation.POINTY_TOP
                  ? PedestalOrientation.FLAT_TOP
                  : PedestalOrientation.POINTY_TOP
              )
            }
          />
        </View>
      </View>
      <StatusBar style="auto" hidden />
    </View>
  );
}
