import { useCallback, useState } from "react";
import { Skia, Group, Path, vec } from "@shopify/react-native-skia";
import Touchable, { useGestureHandler } from "react-native-skia-gesture";

export const PedestalOrienation = {
  POINTY_TOP: "pointy_top",
  FLAT_TOP: "flat_top",
};

const Pedestal = ({
  x = 0,
  y = 0,
  size = 100,
  orientation = PedestalOrienation.POINTY_TOP,
  neighborIndices = [],
  showNeighbors = false,
}) => {
  [color, setColor] = useState("blue");

  let width, height;
  if (orientation === PedestalOrienation.POINTY_TOP) {
    height = size * 2;
    width = (height * Math.sqrt(3)) / 2;
  } else {
    width = size * 2;
    height = (width * Math.sqrt(3)) / 2;
  }

  const translation = [{ translateX: x }, { translateY: y }];

  const neighbors = generateNeighbors(
    width,
    height,
    orientation,
    neighborIndices,
    {
      style: "stroke",
    }
  );

  const onTouchStart = useCallback(
    (touchInfo, context) => {
      setColor("red");
    },
    [setColor]
  );

  const pathContains = useCallback(
    (path, point) => {
      const transformedX = point.x - x;
      const transformedY = point.y - y;
      return path.contains(transformedX, transformedY);
    },
    [x, y]
  );

  const gestureHandler = useGestureHandler({
    onStart: onTouchStart,
    pathContains: pathContains,
  });

  return (
    <Group transform={translation}>
      <Touchable.Path
        path={hexagonPath(width, height, orientation)}
        style="stroke"
        color={color}
        start={0}
        end={1}
        {...gestureHandler}
      />
      {showNeighbors && neighbors.length > 0 && neighbors}
    </Group>
  );
};

export default Pedestal;

// Many thanks to https://www.redblobgames.com/grids/hexagons/
const generateNeighbors = (
  width,
  height,
  orientation,
  neighborIndices = [],
  pathProps
) => {
  /*
  Sides are indexed as follows (clockwise):
      5
      __
  4 /    \ 0
  3 \ __ / 1
      2

   5 / \ 0
  4 |   | 1
   3 \ / 2
*/

  let generatedNeighbors = [];
  for (let i of neighborIndices) {
    let translateX, translateY;
    switch (i) {
      case 0:
        if (orientation === PedestalOrienation.POINTY_TOP) {
          translateX = width / 2;
          translateY = (-3 * height) / 4;
        } else {
          translateX = (3 * width) / 4;
          translateY = -height / 2;
        }
        break;
      case 1:
        if (orientation === PedestalOrienation.POINTY_TOP) {
          translateX = width;
          translateY = 0;
        } else {
          translateX = (3 * width) / 4;
          translateY = height / 2;
        }
        break;
      case 2:
        if (orientation === PedestalOrienation.POINTY_TOP) {
          translateX = width / 2;
          translateY = (3 * height) / 4;
        } else {
          translateX = 0;
          translateY = height;
        }
        break;
      case 3:
        if (orientation === PedestalOrienation.POINTY_TOP) {
          translateX = -width / 2;
          translateY = (3 * height) / 4;
        } else {
          translateX = -(3 * width) / 4;
          translateY = height / 2;
        }
        break;
      case 4:
        if (orientation === PedestalOrienation.POINTY_TOP) {
          translateX = -width;
          translateY = 0;
        } else {
          translateX = -(3 * width) / 4;
          translateY = -height / 2;
        }
        break;
      case 5:
        if (orientation === PedestalOrienation.POINTY_TOP) {
          translateX = -width / 2;
          translateY = (-3 * height) / 4;
        } else {
          translateX = 0;
          translateY = -height;
        }
        break;
      default:
        throw new Error(`neighbor index must be 0-5, was: ${i}`);
    }
    generatedNeighbors.push(
      <Group
        key={i}
        transform={[{ translateX: translateX }, { translateY: translateY }]}
      >
        <Path
          path={hexagonPath(width, height, orientation)}
          start={0}
          end={1}
          {...pathProps}
        />
      </Group>
    );
  }

  return generatedNeighbors;
};

// All credit to: https://codepen.io/wvr/pen/WrNgJp
const hexagonPath = (width, height, orientation) => {
  let a, b, c, d, e, f;
  if (orientation === PedestalOrienation.POINTY_TOP) {
    a = vec(width / 2, 0);
    b = vec(width, height / 4);
    c = vec(width, (height * 3) / 4);
    d = vec(width / 2, height);
    e = vec(0, (height * 3) / 4);
    f = vec(0, height / 4);
  } else {
    a = vec(0, height / 2);
    b = vec(width / 4, 0);
    c = vec((width * 3) / 4, 0);
    d = vec(width, height / 2);
    e = vec((width * 3) / 4, height);
    f = vec(width / 4, height);
  }

  const M = (v) => `M ${v.x} ${v.y}`;
  const L = (v) => `L ${v.x} ${v.y}`;
  const svgPath = [M(a), L(b), L(c), L(d), L(e), L(f), "Z"].join(" ");
  return Skia.Path.MakeFromSVGString(svgPath);
};
