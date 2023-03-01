import { useState, useEffect, useCallback } from "react";
import { Platform, PermissionsAndroid } from "react-native";
import { BleManager } from "react-native-ble-plx";
import { Buffer } from "buffer";

import * as Location from "expo-location";

const ble = new BleManager();

const useBlePeripheral = () => {
  const [peripheral, setPeripheral] = useState(null);
  const [rx, setRx] = useState(null);

  // Ensure correct permissions are requested
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        throw new Error("FIXME - location permission not granted");
      }
      if (Platform.OS === "android") {
        const permissions = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        ]);
        for (let permission of Object.keys(permissions)) {
          if (permissions[permission] !== PermissionsAndroid.RESULTS.GRANTED) {
            throw new Error(
              `FIXME - Android permission ${permission} not granted: ${permissions[permission]}`
            );
          }
        }
      }
    })();
  }, []);

  // Manage BLE adapter state
  useEffect(() => {
    const subscription = ble.onStateChange((state) => {
      if (state !== "PoweredOn") {
        throw new Error("FIXME - unhandled bluetooth state");
      }
      console.log("bluetooth state", state);
    }, true);

    return () => {
      subscription.remove();
    };
  }, []);

  // Maintain a peripheral connection
  useEffect(() => {
    if (!peripheral) scanForPeripheral();
  }, [peripheral]);

  // Scan BLE devices for expected peripheral
  const scanForPeripheral = useCallback(() => {
    ble.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.error("blutooth scan error", JSON.stringify(error));
        return;
      }
      if (device.name === "CIRCUITPYbd17") {
        console.log("found bluetooth peripheral");
        ble.stopDeviceScan();
        ble
          .connectToDevice(device.id)
          .then((connectedDevice) =>
            ble.discoverAllServicesAndCharacteristicsForDevice(
              connectedDevice.id
            )
          )
          .then((device) => {
            setPeripheral(device);
            return device.services();
          })
          .then((services) => {
            console.log("services", services);
          })
          .catch((error) => console.error(error));
      }
    });
  }, [setPeripheral]);

  // Read from RX characteristic
  useEffect(() => {
    let rxSubscription;
    if (peripheral) {
      rxSubscription = ble.monitorCharacteristicForDevice(
        peripheral.id,
        "6E400001-B5A3-F393-E0A9-E50E24DCCA9E".toLowerCase(),
        "6E400003-B5A3-F393-E0A9-E50E24DCCA9E".toLowerCase(),
        rxListener
      );
    }
    return () => {};
  }, [peripheral]);

  // Read callback
  const rxListener = useCallback((error, characteristic) => {
    if (error) {
      console.error("error reading RX characteristic", JSON.stringify(error));
      return;
    }
    if (characteristic) {
      const value = Buffer.from(characteristic.value, "base64").toString();
      // TODO: buffer chunks with \n as delimiter
      console.log("RX:", value.length, value);
    }
  }, []);
};

export default useBlePeripheral;
