import { useEffect } from "react";
import Carousel from "./components/Carousel";

import { useWebSocketAPI, WebSocketAPIMethod } from "./hooks/useWebSocketAPI";

function App() {
  const [sendHealthcheck, lastHealthcheck] = useWebSocketAPI(
    WebSocketAPIMethod.HEALTHCHECK
  );

  useEffect(() => {
    sendHealthcheck();
  }, [sendHealthcheck]);

  useEffect(() => {
    if (lastHealthcheck) {
      console.log("received healthcheck", lastHealthcheck);
    }
  }, [lastHealthcheck]);

  const items = [
    <div className="border-[1px] border-red-100 rounded-xl">Hello</div>,
    <div>World</div>,
  ];
  return (
    <div className="flex flex-col items-center my-8 mx-8 sm:mx-24">
      <Carousel
        className={"border-[1px] border-black rounded-xl"}
        items={items}
      />
    </div>
  );
}

export default App;
