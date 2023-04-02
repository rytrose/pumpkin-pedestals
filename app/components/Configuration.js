import { View, Button, Text } from "react-native";

const Configuration = ({ pendingPedestals, resetPedestals, blinkPedestal }) => {
  const pedestalAddresses = Object.keys(pendingPedestals);
  const numPendingPedestals = pedestalAddresses.length;

  return (
    <View className="flex-initial flex-row m-2 justify-around items-center">
      {numPendingPedestals > 0 ? (
        <Text>Pedestals pending placement: {numPendingPedestals}</Text>
      ) : (
        <Button title="Reset pedestals" onPress={resetPedestals} />
      )}
    </View>
  );
};

export default Configuration;
