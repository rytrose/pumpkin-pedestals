import { View, Button, Text } from "react-native";
import { PedestalOrientation } from "./canvas/Pedestal";

const Configuration = ({
  pendingPedestals,
  resetPedestals,
  setOrientation,
}) => {
  const pedestalAddresses = Object.keys(pendingPedestals);
  const numPendingPedestals = pedestalAddresses.length;
  const arePedestalsPending = numPendingPedestals > 0;

  return (
    <View className="flex-1">
      <View className="flex-initial flex-row justify-evenly">
        <Button
          title="Orientation"
          onPress={() =>
            setOrientation((lastOrientation) =>
              lastOrientation === PedestalOrientation.POINTY_TOP
                ? PedestalOrientation.FLAT_TOP
                : PedestalOrientation.POINTY_TOP
            )
          }
        />
        <Button title="Reset pedestals" onPress={resetPedestals} />
      </View>
      <View className="flex-1 justify-center border">
        {arePedestalsPending && (
          <Text>Pedestals pending placement: {numPendingPedestals}</Text>
        )}
      </View>
    </View>
  );
};

export default Configuration;
