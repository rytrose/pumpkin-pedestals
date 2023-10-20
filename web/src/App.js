import { library } from "@fortawesome/fontawesome-svg-core";
import {
  faChevronLeft,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";

import Carousel from "./components/Carousel";
import PedestalCard from "./components/PedestalCard";
import Status, { StatusEnum } from "./components/Status";
import { useEffect, useState } from "react";
import { useWebSocketAPI } from "./hooks/useWebSocketAPI";
import { ReadyState } from "react-use-websocket";
import PedestalBrowser from "./components/PedestalBrowser";

library.add(faChevronLeft, faChevronRight);

function App() {
  const [statusEnum, setStatusEnum] = useState(StatusEnum.IDLE);
  // Specifically using useWebSocketAPI without a method as to only track
  // the state of the connection
  const { readyState } = useWebSocketAPI();

  useEffect(() => {
    if (readyState === ReadyState.CONNECTING) {
      setStatusEnum(StatusEnum.CONNECTING);
    } else if (readyState === ReadyState.OPEN) {
      setStatusEnum(StatusEnum.IDLE);
    } else if (
      readyState === ReadyState.CLOSING ||
      readyState === ReadyState.CLOSED
    ) {
      setStatusEnum(StatusEnum.DISCONNECTED);
    }
  }, [readyState, setStatusEnum]);

  const items = [
    <PedestalCard>Hello</PedestalCard>,
    <PedestalCard>World</PedestalCard>,
  ];
  return (
    <div className="flex flex-col h-screen gap-2 py-8 px-8 sm:px-24">
      <div className="flex flex-row-reverse">
        <Status statusEnum={statusEnum} />
      </div>
      <PedestalBrowser />
    </div>
  );
}

export default App;
