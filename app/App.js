import { useCallback, useState, useEffect, useRef } from "react";
import { Button, useWindowDimensions, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as ScreenOrientation from "expo-screen-orientation";
import { Rect, Paint, Group, add } from "@shopify/react-native-skia";
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

  const [orientation, setOrientation] = useState(
    PedestalOrientation.POINTY_TOP
  );
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const canvasHeight = windowHeight * 0.7;
  // Keep the width padding equal to the Canvas padding, my-2 == 8px top/bottom
  const canvasWidth = windowWidth - 16;

  // The main state containing the pedestals
  const [pedestalState, dispatchPedestalState] = usePedestalState();

  const dispatchResetPedestalState = (
    canvasWidth,
    canvasHeight,
    orientation
  ) => {
    dispatchPedestalState({
      type: "reset",
      canvasWidth: canvasWidth,
      canvasHeight: canvasHeight,
      orientation: orientation,
    });
  };

  // The state of any unset pedestals
  const [pendingPedestals, setPendingPedestals] = useState([]);
  const resetPedestals = useCallback(() => {
    (async () => {
      dispatchResetPedestalState(canvasWidth, canvasHeight, orientation);
      if (connectionStatus === BleConnectionStatus.CONNECTED) {
        const pedestals = await commands.getPedestals();
        let pedestalsWithoutHub = Object.entries(pedestals).filter(
          ([address, color]) => {
            if (address === "00") {
              dispatchPedestalState({
                type: "set_hub_color",
                color: color,
              });
              return false;
            }
            return true;
          }
        );
        setPendingPedestals(pedestalsWithoutHub);
        return;
      }
      // TODO: toast error
    })();
  }, [connectionStatus, canvasWidth, canvasHeight, orientation]);

  // Reset pedestals if layout parameters change
  useEffect(() => {
    resetPedestals();
  }, [canvasWidth, canvasHeight, orientation]);

  // Whenever there are pending pedestals, blink the first outstanding
  useEffect(() => {
    if (pendingPedestals.length > 0) {
      const [address, _] = pendingPedestals[0];
      (async () => {
        await commands.blinkPedestal(address);
      })();
    }
  }, [pendingPedestals]);

  // Specifies behavior when a pedestal is pressed on the app
  const onPedestalPress = useCallback(
    (id) => {
      // Set pedestal if any are outstanding
      if (pendingPedestals.length > 0) {
        const [address, color] = pendingPedestals.shift();
        dispatchPedestalState({
          type: "set_color",
          index: id,
          address: address,
          color: color,
        });
        setPendingPedestals([...pendingPedestals]);
      }
    },
    [pendingPedestals]
  );

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
            {pedestalState.map((pedestal) => {
              return <Pedestal {...pedestal} onPress={onPedestalPress} />;
            })}
          </Group>
        </Touchable.Canvas>
      </View>
      <View className="flex-1 flex-row mx-2 border">
        <View className="flex-1 border justify-between">
          <Configuration
            pendingPedestals={pendingPedestals}
            resetPedestals={resetPedestals}
            setOrientation={setOrientation}
          />
          <Connectivity connectionStatus={connectionStatus} />
        </View>
        <View className="flex-1 border"></View>
      </View>
      <StatusBar style="auto" hidden />
    </View>
  );
}
