import { useCallback, useEffect, useRef, useState } from "react";
import useWebSocket from "react-use-websocket";
import usePrevious from "./usePrevious";

export const useWebSocketAPI = (method) => {
  const {
    sendJsonMessage,
    lastJsonMessage: latestJsonMessage,
    readyState,
  } = useWebSocket(
    `ws://${window.location.hostname}:${window.location.port}/websocket`,
    {
      shouldReconnect: (closeEvent) => true,
      reconnectAttempts: Infinity,
      share: true,
    }
  );
  const previousJsonMessage = usePrevious(latestJsonMessage);

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
      method === latestJsonMessage?.method &&
      !!latestJsonMessage?.data &&
      JSON.stringify(latestJsonMessage) !== JSON.stringify(previousJsonMessage)
    ) {
      setLastReceived(latestJsonMessage.data);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [method, latestJsonMessage]);

  return { send, lastReceived, readyState };
};

export const WebSocketAPIMethod = {
  HEALTHCHECK: "healthcheck",
  GET_PEDESTALS: "getPedestals",
  SET_PEDESTALS_COLOR: "setPedestalsColor",
  BLINK_PEDESTAL: "blinkPedestal",
};
