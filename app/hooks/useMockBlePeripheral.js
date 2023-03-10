import { useCallback } from "react";
import { Command, parseCommand } from "./commands/command";
import { BleConnectionStatus } from "./useBlePeripheral";

export const useMockBlePeripheral = () => {
  const getLEDs = useCallback(async () => {
    return {
      30: "#1abf32",
      31: "#99931a",
      32: "#bbbcde",
    };
  }, []);

  const setLEDs = useCallback(async (ledState) => {
    return;
  }, []);

  const error = null;
  const connectionStatus = BleConnectionStatus.CONNECTED;

  return [error, connectionStatus, getLEDs, setLEDs];
};
