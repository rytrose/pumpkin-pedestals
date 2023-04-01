import { useCallback, useState } from "react";
import { Skia, vec } from "@shopify/react-native-skia";
import Touchable, { useGestureHandler } from "react-native-skia-gesture";

export const PedestalOrientation = {
  POINTY_TOP: "pointy_top",
  FLAT_TOP: "flat_top",
};

const Pedestal = ({
  x = 0,
  y = 0,
  size = 100,
  orientation = PedestalOrientation.POINTY_TOP,
  hub = false,
  color = undefined,
  onPress = undefined,
  id,
}) => {
  let width, height;
  if (orientation === PedestalOrientation.POINTY_TOP) {
    height = size * 2;
    width = (height * Math.sqrt(3)) / 2;
  } else {
    width = size * 2;
    height = (width * Math.sqrt(3)) / 2;
  }

  const translation = [{ translateX: x }, { translateY: y }];

  const onTouchStart = useCallback(
    (touchInfo, context) => {
      console.log("touched", id);
      if (!!onPress) onPress(id);
    },
    [id]
  );

  const pathContains = useCallback(
    (path, point) => {
      const transformedX = point.x - x;
      const transformedY = point.y - y;
      const contains = path.contains(transformedX, transformedY);
      return contains;
    },
    [x, y]
  );

  const gestureHandler = useGestureHandler({
    onStart: onTouchStart,
    pathContains: pathContains,
  });

  return (
    <>
      <Touchable.Path
        transform={translation}
        path={hexagonPath(width, height, orientation)}
        style={hub || !!color ? "fill" : "stroke"}
        strokeWidth={1}
        start={0}
        end={1}
        color={color || "black"}
        {...gestureHandler}
      />
    </>
  );
};

export default Pedestal;

// All credit to: https://codepen.io/wvr/pen/WrNgJp
const hexagonPath = (width, height, orientation) => {
  let a, b, c, d, e, f;
  if (orientation === PedestalOrientation.POINTY_TOP) {
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
