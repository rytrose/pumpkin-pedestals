import { useCallback, useState, useEffect, useRef } from "react";
import {
  Animated,
  Button,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import * as ScreenOrientation from "expo-screen-orientation";
import { Rect, Paint, Group, vec } from "@shopify/react-native-skia";
import Touchable, { useGestureHandler } from "react-native-skia-gesture";

import Pedestal, { PedestalOrientation } from "./components/canvas/Pedestal";
import {
  BleConnectionStatus,
  useBlePeripheral,
} from "./hooks/useBlePeripheral";
import { useMockBlePeripheral } from "./hooks/useMockBlePeripheral";
import Connectivity from "./components/Connectivity";
import Configuration from "./components/Configuration";

// For development purposes
const MOCK_BLE = true;

const makePedestalPositions = (
  canvasWidth,
  canvasHeight,
  numWidth,
  numHeight,
  orientation,
  size
) => {
  let width, height;
  if (orientation === PedestalOrientation.POINTY_TOP) {
    height = size * 2;
    width = (height * Math.sqrt(3)) / 2;
  } else {
    width = size * 2;
    height = (width * Math.sqrt(3)) / 2;
  }

  const positions = [];

  const center = vec(canvasWidth / 2, canvasHeight / 2);

  for (let xi = 0; xi < numWidth; xi++) {
    for (let yi = 0; yi < numHeight; yi++) {
      // For symmetry, skip the last of every other row
      if (yi % 2 === 0 && xi === numWidth - 1) {
        continue;
      }
      const xNumFromCenter = xi - Math.floor(numWidth / 2);
      const yNumFromCenter = yi - Math.floor(numHeight / 2);
      let xOffset = 0;
      if (yi % 2 === 0) {
        xOffset =
          orientation === PedestalOrientation.POINTY_TOP
            ? 0.5 * width
            : 0.75 * width;
      }
      const position =
        orientation === PedestalOrientation.POINTY_TOP
          ? vec(
              center.x + xNumFromCenter * width + xOffset,
              center.y + yNumFromCenter * (height * 0.75)
            )
          : vec(
              center.x + xNumFromCenter * (width * 1.5) + xOffset,
              center.y + yNumFromCenter * (height * 0.5)
            );
      positions.push(position);
    }
  }

  // Move XY to top left
  return positions.map((p) => vec(p.x - width / 2, p.y - height / 2));
};

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
  const { height, width } = useWindowDimensions();
  const HEIGHT = height * 0.7;
  // Keep the width padding equal to the Canvas padding, my-2 == 8px top/bottom
  const WIDTH = width - 16;

  // Due to landscape orientation, height will almost certainly be the limiting factor on size
  // Set size such that numHexHeight hexagons fit vertically
  const numHexHeight = orientation === PedestalOrientation.POINTY_TOP ? 3 : 5;
  const size =
    orientation === PedestalOrientation.POINTY_TOP
      ? Math.floor(
          HEIGHT /
            (1 + 0.75 * (numHexHeight - 1)) / // Due to overlap 1 + 3/4 N-1 hexagon heights per screen height
            2 // 2 size per hexagon height
        )
      : Math.floor(
          HEIGHT /
            (1 + 0.5 * (numHexHeight - 1)) / // numHexHeight hexagon heights per screen height
            Math.sqrt(3) // √3 size per hexagon height
        );
  let numHexWidth =
    orientation === PedestalOrientation.POINTY_TOP
      ? Math.floor(WIDTH / (Math.sqrt(3) * size))
      : Math.floor(WIDTH / (3 * size));
  // Ensure odd number so hub can be centered horizontally
  numHexWidth = numHexWidth % 2 === 0 ? numHexWidth - 1 : numHexWidth;

  // Determine pedestal grid positions
  const positions = makePedestalPositions(
    WIDTH,
    HEIGHT,
    numHexWidth,
    numHexHeight,
    orientation,
    size
  );

  return (
    <View className="flex-1 flex-col items-center">
      <View className="my-2">
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
            {positions.map((position, i) => {
              return (
                <Pedestal
                  orientation={orientation}
                  x={position.x}
                  y={position.y}
                  size={size}
                  key={`pedestal-${i}`}
                  id={`pedestal-${i}`}
                  hub={i === Math.floor((numHexWidth * numHexHeight) / 2)}
                />
              );
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
            blinkPedestal={commands.blinkPedestal}
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
