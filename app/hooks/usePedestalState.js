import { useReducer } from "react";
import { PedestalOrientation } from "../components/canvas/Pedestal";
import { definePedestalSize, makePedestalPositions } from "../utils/geometry";

const makeState = (orientation, hexSize, positions) => {
  return positions.map((position, i) => ({
    orientation: orientation,
    x: position.x,
    y: position.y,
    size: hexSize,
    key: `pedestal-${i}`,
    id: i,
    hub:
      i ===
      Math.floor(positions.length / 2) +
        (orientation === PedestalOrientation.POINTY_TOP ? 1 : -1),
    address: undefined,
  }));
};

const pedestalStateReducer = (state, action) => {
  switch (action.type) {
    case "reset":
      const { canvasWidth, canvasHeight, orientation } = action;
      const [numHexWidth, numHexHeight, hexSize] = definePedestalSize(
        canvasWidth,
        canvasHeight,
        orientation
      );
      const positions = makePedestalPositions(
        canvasWidth,
        canvasHeight,
        numHexWidth,
        numHexHeight,
        orientation,
        hexSize
      );
      return makeState(orientation, hexSize, positions);
    case "set_color":
      return state.map((pedestal, i) => {
        if (action.index === i) {
          return {
            ...pedestal,
            address: action.address,
            color: action.color,
          };
        }
        return pedestal;
      });
    case "set_hub_color":
      return state.map((pedestal) => {
        if (pedestal.hub) {
          return {
            ...pedestal,
            address: "00",
            color: action.color,
          };
        }
        return pedestal;
      });
    default:
      console.log("ERROR", `unknown action ${action.type}`);
      return [];
  }
};

const usePedestalState = () => {
  const [state, dispatch] = useReducer(pedestalStateReducer, []);

  return [state, dispatch];
};

export default usePedestalState;
