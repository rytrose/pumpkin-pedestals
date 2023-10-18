import { useCallback, useEffect, useState } from "react";
import useWebSocket from "react-use-websocket";

export const useWebSocketAPI = (method) => {
  const { sendJsonMessage, lastJsonMessage, readyState } = useWebSocket(
    `ws://${window.location.hostname}:${window.location.port}/websocket`,
    {
      shouldReconnect: (closeEvent) => true,
      reconnectAttempts: Infinity,
      share: true,
    }
  );

  const send = useCallback(
    (data = {}) => {
      if (method) {
        sendJsonMessage({
          method: method,
          data: data,
        });
      }
    },
    [sendJsonMessage, method]
  );

  const [lastReceived, setLastReceived] = useState(null);

  useEffect(() => {
    if (
      method &&
      method === lastJsonMessage?.method &&
      !!lastJsonMessage?.data
    ) {
      setLastReceived(lastJsonMessage.data);
    }
  }, [method, lastJsonMessage]);

  return { send, lastReceived, readyState };
};

export const WebSocketAPIMethod = {
  HEALTHCHECK: "healthcheck",
  GET_PEDESTALS: "getPedestals",
  SET_PEDESTALS_COLOR: "setPedestalsColor",
  BLINK_PEDESTAL: "blinkPedestal",
};
