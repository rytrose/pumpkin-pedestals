import { WebSocketAPIMethod, useWebSocketAPI } from "../hooks/useWebSocketAPI";
import PedestalCard from "./PedestalCard";
import Carousel from "./Carousel";
import { Spinner } from "@material-tailwind/react";

const PedestalBrowser = () => {
  // Connected websocket connections will receive async pedestal state updates at
  // a regular interval
  const { lastReceived: pedestalData } = useWebSocketAPI(
    WebSocketAPIMethod.GET_PEDESTALS
  );

  // Transform pedestal data into cards
  const items = pedestalData?.map((data) => {
    return <PedestalCard {...data} />;
  });

  return (
    <div className="grow flex flex-col gap-4 w-full border-[1px] border-black rounded-xl">
      {items?.length > 0 ? (
        <>
          <div>
            <div className="text-center">
              {items?.length || 0} pedestals discovered
            </div>
          </div>
          <div className="grow">
            {!!items && <Carousel className={""} items={items} />}
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
