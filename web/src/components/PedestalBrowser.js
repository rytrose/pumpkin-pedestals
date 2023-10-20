import { WebSocketAPIMethod, useWebSocketAPI } from "../hooks/useWebSocketAPI";
import PedestalCard from "./PedestalCard";
import Carousel from "./Carousel";

const PedestalBrowser = () => {
  // Connected websocket connections should receive async pedestal state updates at
  // a regular interval
  const { lastReceived: pedestalData } = useWebSocketAPI(
    WebSocketAPIMethod.GET_PEDESTALS
  );

  // Transform pedestal data into cards
  const items = pedestalData?.map((data) => {
    return <PedestalCard {...data} />;
  });

  return (
    <div className="grow w-full">
      {!!items && (
        <Carousel
          className={"border-[1px] border-black rounded-xl"}
          items={items}
        />
      )}
    </div>
  );
};

export default PedestalBrowser;
