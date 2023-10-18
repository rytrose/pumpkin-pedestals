import { Spinner } from "@material-tailwind/react";

const StatusLevel = {
  INFO: {
    fontColor: "text-black",
    backgroundColor: "bg-gray-100",
    borderColor: "border-black",
  },
  ACTIVE: {
    fontColor: "text-green-900",
    backgroundColor: "bg-green-100",
    borderColor: "border-green-900",
  },
  WARNING: {
    fontColor: "text-yellow-900",
    backgroundColor: "bg-yellow-100",
    borderColor: "border-yellow-900",
  },
};

export const StatusEnum = {
  IDLE: {
    message: "Idle",
    loading: false,
    level: StatusLevel.INFO,
  },
  CONNECTING: {
    message: "Connecting",
    loading: true,
    level: StatusLevel.ACTIVE,
  },
  DISCONNECTED: {
    message: "Disconnected",
    loading: false,
    level: StatusLevel.WARNING,
  },
};

const Status = ({ statusEnum }) => {
  const message = statusEnum?.message;
  const loading = !!statusEnum?.loading;
  const level = statusEnum?.level;
  const fontColor = level?.fontColor || "text-black";
  const backgroundColor = level?.backgroundColor || "bg-gray-100";
  const borderColor = level?.borderColor || "border-black";

  return (
    <div
      className={`flex grow items-center gap-2 p-2 rounded-xl border-[1px] ${backgroundColor} ${borderColor}`}
    >
      <div className={`${fontColor}`}>{message}</div>
      {loading && <Spinner className="w-4 h-4" />}
    </div>
  );
};

export default Status;
