import { useState, useEffect, useCallback, useRef } from "react";
import { LogBox, Platform, PermissionsAndroid } from "react-native";
import { BleManager } from "react-native-ble-plx";
import { Buffer } from "buffer";

import * as Location from "expo-location";

// Ignore the NativeEventEmitter warning from BleManager
LogBox.ignoreLogs(["new NativeEventEmitter"]);
const ble = new BleManager();

export const BleConnectionStatus = {
  BLUETOOTH_UNAVAILABLE: "bluetooth_unavailable",
  READY_TO_CONNECT: "ready_to_connect",
  CONNECTED: "connected",
};

export const useBlePeripheral = (readCallback) => {
  const [peripheral, setPeripheral] = useState(null);
  const [bluetoothPermitted, setBluetoothPermitted] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(
    BleConnectionStatus.BLUETOOTH_UNAVAILABLE
  );
  const [error, setError] = useState(null);
  const readBuffer = useRef("");

  // Ensure correct permissions are requested
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("location permission not granted");
        return;
      }
      if (Platform.OS === "android") {
        const permissions = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        ]);
        for (let permission of Object.keys(permissions)) {
          if (permissions[permission] !== PermissionsAndroid.RESULTS.GRANTED) {
            setError(
              `Android permission ${permission} not granted: ${permissions[permission]}`
            );
            return;
          }
        }
        setBluetoothPermitted(true);
      }
    })();
  }, [setError, setBluetoothPermitted]);

  // Manage BLE adapter state
  useEffect(() => {
    let adapterStatusSubscription;
    if (bluetoothPermitted) {
      // Handle adapter state change
      adapterStatusSubscription = ble.onStateChange((state) => {
        console.log("bluetooth state", state);
        if (state !== "PoweredOn") {
          setConnectionStatus(BleConnectionStatus.BLUETOOTH_UNAVAILABLE);
          setError(`unhandled bluetooth state: ${state}`);
          return;
        }
        setConnectionStatus(BleConnectionStatus.READY_TO_CONNECT);
      }, true);
    }

    return () => {
      if (adapterStatusSubscription) adapterStatusSubscription.remove();
    };
  }, [bluetoothPermitted, setConnectionStatus, setError]);

  // Maintain a peripheral connection
  useEffect(() => {
    if (
      bluetoothPermitted &&
      connectionStatus === BleConnectionStatus.READY_TO_CONNECT &&
      !peripheral
    )
      scanForPeripheral();
  }, [bluetoothPermitted, connectionStatus, peripheral]);

  // Scan BLE devices for expected peripheral
  const scanForPeripheral = useCallback(() => {
    console.log("scanning for device");
    ble.startDeviceScan(null, null, (err, device) => {
      if (err) {
        console.error("blutooth scan error", JSON.stringify(err));
        setError(`blutooth scan error: ${JSON.stringify(err)}`);
        return;
      }
      if (device.name === "CIRCUITPYbd17") {
        console.log("found device");
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
            setConnectionStatus(BleConnectionStatus.CONNECTED);
          })
          .catch((err) => {
            console.error("error connecting to device", JSON.stringify(err));
            setError("error connecting to device");
            setConnectionStatus(BleConnectionStatus.READY_TO_CONNECT);
            setPeripheral(null);
            scanForPeripheral();
          });
      }
    });
  }, [setPeripheral, setConnectionStatus, setError]);

  // Read from RX characteristic
  useEffect(() => {
    let rxSubscription;
    let deviceDisconnectedSubscription;
    if (peripheral) {
      rxSubscription = ble.monitorCharacteristicForDevice(
        peripheral.id,
        "6E400001-B5A3-F393-E0A9-E50E24DCCA9E".toLowerCase(),
        "6E400003-B5A3-F393-E0A9-E50E24DCCA9E".toLowerCase(),
        rxListener
      );

      // Handle device connection state change
      deviceDisconnectedSubscription = ble.onDeviceDisconnected(
        peripheral.id,
        (err, device) => {
          console.log("device disconnected", device, err);
          setConnectionStatus(BleConnectionStatus.READY_TO_CONNECT);
          setPeripheral(null);
        }
      );
    }
    return () => {
      if (rxSubscription) rxSubscription.remove();
      if (deviceDisconnectedSubscription)
        deviceDisconnectedSubscription.remove();
    };
  }, [peripheral]);

  // Read callback
  const rxListener = useCallback(
    (err, characteristic) => {
      if (err) {
        if (err.errorCode === 201 || err.errorCode === 205) {
          console.log("unable to read, device disconnected");
          setConnectionStatus(BleConnectionStatus.READY_TO_CONNECT);
          setPeripheral(null);
          return;
        }

        console.error("error reading RX characteristic", JSON.stringify(err));
        setError("error reading from device");
        setConnectionStatus(BleConnectionStatus.READY_TO_CONNECT);
        setPeripheral(null);
        return;
      }
      if (characteristic) {
        const buffer = readBuffer.current;
        const value = Buffer.from(characteristic.value, "base64").toString();
        const read = buffer + value;
        readBuffer.current = read;
        if (read.endsWith("\n")) {
          const trimmed = read.trim();
          console.log("RX:", trimmed.length, trimmed);
          readCallback(trimmed);
          readBuffer.current = "";
        }
      }
    },
    [readBuffer, readCallback]
  );

  // Write callback
  const writeTx = useCallback(
    (data) => {
      if (peripheral) {
        console.log("TX:", data.length, data);
        peripheral
          .writeCharacteristicWithoutResponseForService(
            "6E400001-B5A3-F393-E0A9-E50E24DCCA9E".toLowerCase(),
            "6E400002-B5A3-F393-E0A9-E50E24DCCA9E".toLowerCase(),
            Buffer.from(data).toString("base64")
          )
          .catch((err) => {
            console.error(
              "error writing TX characteristic",
              JSON.stringify(err)
            );
            setError("error writing to device");
          });
      }
    },
    [peripheral]
  );

  return [error, connectionStatus, writeTx];
};
