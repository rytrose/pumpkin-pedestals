import { WebSocketAPIMethod, useWebSocketAPI } from "../hooks/useWebSocketAPI";
import PedestalCard from "./PedestalCard";
import Carousel from "./Carousel";
import { rgbToHex } from "../utils/color";
import { Button, Spinner } from "@material-tailwind/react";
import { RgbColorPicker } from "react-colorful";
import { useCallback, useEffect, useState } from "react";

const PedestalBrowser = () => {
  // Connected websocket connections will receive async pedestal state updates at
  // a regular interval
  const { lastReceived: getPedestalData } = useWebSocketAPI(
    WebSocketAPIMethod.GET_PEDESTALS
  );

  const { send: setPedestalsColor, lastReceived: pedestalDataAfterSetColor } =
    useWebSocketAPI(WebSocketAPIMethod.SET_PEDESTALS_COLOR);

  const { send: blinkPedestals, lastReceived: pedestalDataAfterBlink } =
    useWebSocketAPI(WebSocketAPIMethod.BLINK_PEDESTALS);

  const {
    send: stopPedestalsBlinking,
    lastReceived: pedestalDataAfterStopBlinking,
  } = useWebSocketAPI(WebSocketAPIMethod.STOP_PEDESTALS_BLINKING);

  // Keep the pedestal data as state that can be set by either the backend
  // updates or in response to setting pedestals color
  const [pedestalData, setPedestalData] = useState();

  // Update pedestal state whenever it's provided by the backend
  useEffect(() => {
    setPedestalData(getPedestalData);
  }, [getPedestalData]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [pickerColor, setPickerColor] = useState();
  const [newPedestalColor, setNewPedestalColor] = useState();

  // When the picker color is changed update the new pedestal color indicator
  // and the color picker handle
  const onPickerColorChange = (color) => {
    setNewPedestalColor(color);
    setPickerColor(color);
  };

  // Whenever a new pedestal is shown move the color picker
  // to its color and set the new pedestal color indicator
  const onCarouselChange = useCallback(
    (index) => {
      const pedestal = pedestalData[index];
      const rgbColor = {
        r: parseInt(pedestal.color.substring(0, 2), 16),
        g: parseInt(pedestal.color.substring(2, 4), 16),
        b: parseInt(pedestal.color.substring(4, 6), 16),
      };
      setPickerColor(rgbColor);
      setNewPedestalColor(rgbColor);
      setCurrentIndex(index);
    },
    [pedestalData]
  );

  const [setColorLoading, setSetColorLoading] = useState(false);

  // When "Set Color" is clicked, attempt to set the pedestal to the new color
  const onSetColor = () => {
    setSetColorLoading(true);
    setPedestalsColor([
      {
        address: pedestalData[currentIndex].address,
        color: rgbToHex(
          newPedestalColor.r,
          newPedestalColor.g,
          newPedestalColor.b
        ),
      },
    ]);
  };

  // Update the state when set pedestals color returns
  useEffect(() => {
    setSetColorLoading(false);
    setPedestalData(pedestalDataAfterSetColor);
  }, [pedestalDataAfterSetColor]);

  const [blinkPedestalLoading, setBlinkPedestalLoading] = useState(false);

  // When button is clicked, attempt to toggle the pedestal blinking
  const onBlinkPedestal = () => {
    setBlinkPedestalLoading(true);
    const pedestal = pedestalData[currentIndex];
    if (pedestal.blinking) {
      stopPedestalsBlinking([pedestal.address]);
    } else {
      blinkPedestals([pedestal.address]);
    }
  };

  // Update the state when blink pedestals returns
  useEffect(() => {
    setBlinkPedestalLoading(false);
    setPedestalData(pedestalDataAfterBlink);
  }, [pedestalDataAfterBlink]);

  // Update the state when stop pedestals blinking returns
  useEffect(() => {
    setBlinkPedestalLoading(false);
    setPedestalData(pedestalDataAfterStopBlinking);
  }, [pedestalDataAfterStopBlinking]);

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
                <div>
                  <div
                    className="rounded-xl p-2"
                    style={{
                      backgroundColor: newPedestalColor
                        ? `rgb(${newPedestalColor.r},${newPedestalColor.g},${newPedestalColor.b})`
                        : "",
                    }}
                  ></div>
                  <p className="pb-1 text-xs text-center">New pedestal color</p>
                </div>
                <RgbColorPicker
                  color={pickerColor}
                  onChange={onPickerColorChange}
                />
              </div>
              <div className="flex gap-2 justify-center lg:flex-col lg:gap-4">
                <Button onClick={onSetColor} loading={setColorLoading}>
                  Set Color
                </Button>
                <Button
                  onClick={onBlinkPedestal}
                  loading={blinkPedestalLoading}
                >
                  {pedestalData[currentIndex].blinking
                    ? "Stop Pedestal Blinking"
                    : "Blink Pedestal"}
                </Button>
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
