import { useCallback } from "react";
import { Command, parseCommand } from "./commands/command";
import { BleConnectionStatus } from "./useBlePeripheral";

export const useMockBlePeripheral = () => {
  const getPedestals = useCallback(async () => {
    return {
      "00": "#ffffff",
      30: "#1abf32",
      31: "#99931a",
      32: "#bbbcde",
    };
  }, []);

  const setPedestalsColor = useCallback(async (pedestalsColor) => {
    console.log("setting pedestals color", pedestalsColor);
    return;
  }, []);

  const blinkPedestal = useCallback(async (address) => {
    console.log("blinking", address);
    return;
  }, []);

  const error = null;
  const connectionStatus = BleConnectionStatus.CONNECTED;

  return [
    error,
    connectionStatus,
    { getPedestals, setPedestalsColor, blinkPedestal },
  ];
};
