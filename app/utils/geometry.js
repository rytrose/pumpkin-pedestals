import { vec } from "@shopify/react-native-skia";

import { PedestalOrientation } from "../components/canvas/Pedestal";

const NUM_HEIGHT_POINTY_TOP = 3;
const NUM_HEIGHT_FLAT_TOP = 5;

export const definePedestalSize = (canvasWidth, canvasHeight, orientation) => {
  // Due to landscape orientation, height will almost certainly be the limiting factor on size
  // Set size such that numHeight hexagons fit vertically
  const numHeight =
    orientation === PedestalOrientation.POINTY_TOP
      ? NUM_HEIGHT_POINTY_TOP
      : NUM_HEIGHT_FLAT_TOP;
  const size =
    orientation === PedestalOrientation.POINTY_TOP
      ? Math.floor(
          canvasHeight /
            (1 + 0.75 * (numHeight - 1)) / // Due to overlap 1 + 3/4 N-1 hexagon heights per screen height
            2 // 2 size per hexagon height
        )
      : Math.floor(
          canvasHeight /
            (1 + 0.5 * (numHeight - 1)) / // numHeight hexagon heights per screen height
            Math.sqrt(3) // √3 size per hexagon height
        );
  let numWidth =
    orientation === PedestalOrientation.POINTY_TOP
      ? Math.floor(canvasWidth / (Math.sqrt(3) * size))
      : Math.floor(canvasWidth / (3 * size));
  // Ensure the hub can be centered horizontally
  numWidth =
    orientation === PedestalOrientation.POINTY_TOP
      ? // Because the middle row has numWidth hexagons, numWidth must be odd
        // to be able to center the hub
        numWidth % 2 === 0
        ? numWidth - 1
        : numWidth
      : // Because the middle row has numWidth-1 hexagons, numWidth must be even
      // to be able to center the hub
      numWidth % 2 !== 0
      ? numWidth - 1
      : numWidth;

  return [numWidth, numHeight, size];
};

export const makePedestalPositions = (
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
      const xNumFromCenter =
        xi -
        Math.floor(numWidth / 2) +
        (orientation === PedestalOrientation.POINTY_TOP ? 0 : 0.5);
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
