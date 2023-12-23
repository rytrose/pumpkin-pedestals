import { WebSocketAPIMethod, useWebSocketAPI } from "../hooks/useWebSocketAPI";
import PedestalCard from "./PedestalCard";
import Carousel from "./Carousel";
import { Button, Spinner } from "@material-tailwind/react";
import { RgbColorPicker } from "react-colorful";
import { useCallback, useState } from "react";

const PedestalBrowser = () => {
  // Connected websocket connections will receive async pedestal state updates at
  // a regular interval
  const { lastReceived: pedestalData } = useWebSocketAPI(
    WebSocketAPIMethod.GET_PEDESTALS
  );

  const { sendJsonMessage: setPedestalsColor } = useWebSocketAPI(
    WebSocketAPIMethod.SET_PEDESTALS_COLOR
  );

  const { sendJsonMessage: blinkPedestal } = useWebSocketAPI(
    WebSocketAPIMethod.BLINK_PEDESTAL
  );

  const [pickerColor, setPickerColor] = useState();
  const [currentPedestalColor, setCurrentPedestalColor] = useState();

  const onPickerColorChange = (color) => {
    setPickerColor(color);
  };

  // Whenever a new pedestal is shown, move the color picker
  // to its color
  const onCarouselChange = useCallback(
    (index) => {
      const pedestal = pedestalData[index];
      const rgbColor = {
        r: parseInt(pedestal.color.substring(0, 2), 16),
        g: parseInt(pedestal.color.substring(2, 4), 16),
        b: parseInt(pedestal.color.substring(4, 6), 16),
      };
      setPickerColor(rgbColor);
      setCurrentPedestalColor(`#${pedestal.color}`);
    },
    [pedestalData]
  );

  // Transform pedestal data into cards
  const items = pedestalData?.map((data) => {
    return <PedestalCard {...data} />;
  });

  return (
    <div className="grow flex flex-col gap-4 w-full">
      {items?.length > 0 ? (
        <>
          <div>
            <div className="text-center pt-4">
              {items?.length || 0} pedestals discovered
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <div>
              {!!items && (
                <Carousel
                  className={"py-4"}
                  items={items}
                  onChange={onCarouselChange}
                />
              )}
            </div>
            <div className="flex flex-col gap-4 lg:flex-row lg:justify-center lg:gap-8">
              <div className="w-3/4 m-auto lg:w-1/2 lg:m-0 [&>div]:w-auto">
                <div className="">
                  <div
                    className="rounded-xl p-2"
                    style={{ backgroundColor: currentPedestalColor }}
                  ></div>
                  <p className="pb-1 text-xs text-center">
                    Current pedestal color
                  </p>
                </div>
                <RgbColorPicker
                  color={pickerColor}
                  onChange={onPickerColorChange}
                />
              </div>
              <div className="flex gap-2 justify-center lg:flex-col lg:gap-4">
                <Button>Set Color</Button>
                <Button>Blink Pedestal</Button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="flex justify-center items-center gap-2">
          Discovering pedestals <Spinner className="w-4 h-4" />
        </div>
      )}
    </div>
  );
};

export default PedestalBrowser;
