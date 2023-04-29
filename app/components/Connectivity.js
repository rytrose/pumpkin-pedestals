import { View, Text } from "react-native";
import { BleConnectionStatus } from "../hooks/useBlePeripheral";
import Loading from "./Loading";

const Connectivity = ({ connectionStatus }) => {
  let loading = false;
  let text, color;
  switch (connectionStatus) {
    case BleConnectionStatus.BLUETOOTH_UNAVAILABLE:
      color = "text-rose-700";
      text = "Bluetooth unavailable";
      break;
    case BleConnectionStatus.READY_TO_CONNECT:
      color = "text-blue-500";
      text = "Scanning for hub pedestal";
      loading = true;
      break;
    case BleConnectionStatus.CONNECTED:
      color = "text-green-700";
      text = "Connected";
  }

  return (
    <View className="flex-0 flex-row space-x-1 border">
      <Text className="font-bold text-md">Bluetooth status:</Text>
      <View className="flex-row space-x-1">
        <Text className={`${color} text-sm`}>{text}</Text>
        {loading && <Loading width={20} height={20} />}
      </View>
    </View>
  );
};

export default Connectivity;
