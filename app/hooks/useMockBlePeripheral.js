import { useCallback } from "react";
import { BleConnectionStatus } from "./useBlePeripheral";

export const useMockBlePeripheral = (readCallback) => {
  const writeTx = useCallback((data) => {
    // Echo back written data
    // TODO: mock out expected behavior
    readCallback(data);
  }, []);

  const error = null;
  const connectionStatus = BleConnectionStatus.READY_TO_CONNECT;

  return [error, connectionStatus, writeTx];
};
