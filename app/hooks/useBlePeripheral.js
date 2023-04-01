import { useState, useEffect, useCallback, useRef, useReducer } from "react";
import { LogBox, Platform, PermissionsAndroid } from "react-native";
import { BleManager } from "react-native-ble-plx";
import * as Location from "expo-location";
import { Buffer } from "buffer";

import {
  Command,
  CommandType,
  commandReducer,
  parseCommand,
  intToAsciiHexByte,
} from "./commands/command";
import useHealthcheck from "./commands/useHealthcheck";

// Ignore the NativeEventEmitter warning from BleManager
LogBox.ignoreLogs(["new NativeEventEmitter"]);
const ble = new BleManager();

export const BleConnectionStatus = {
  BLUETOOTH_UNAVAILABLE: "bluetooth_unavailable",
  READY_TO_CONNECT: "ready_to_connect",
  CONNECTED: "connected",
};

export const useBlePeripheral = () => {
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
  }, []);

  // Manage BLE adapter state
  useEffect(() => {
    let adapterStatusSubscription;
    if (bluetoothPermitted) {
      // Handle adapter state change
      adapterStatusSubscription = ble.onStateChange((state) => {
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
  }, [bluetoothPermitted]);

  // Maintain a peripheral connection by rescanning on disconnect
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
        console.log("ERROR", "blutooth scan error", JSON.stringify(err));
        setError("blutooth scan error, retrying in 10 seconds");
        setTimeout(scanForPeripheral, 5000);
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
            reset(null, "unable to connect to device", null, {
              error: JSON.stringify(err),
            });
            scanForPeripheral();
          });
      }
    });
  }, []);

  // Handle device disconnection state change
  useEffect(() => {
    let deviceDisconnectedSubscription;
    if (peripheral) {
      deviceDisconnectedSubscription = ble.onDeviceDisconnected(
        peripheral.id,
        (err, _) => {
          console.log("device disconnected", err ? err : "clean disconnect");
          reset(null);
        }
      );
    }
    return () => {
      if (deviceDisconnectedSubscription)
        deviceDisconnectedSubscription.remove();
    };
  }, [peripheral]);

  const rxListener = useRef(null);
  const [pendingCommands, dispatchCommand] = useReducer(commandReducer, {});
  const [packetID, setPacketID] = useState(0);

  // The memoized RX listener used in setting up the subscription
  // that reads the actual listener callback from a ref so state can
  // update while the callback provided to the BLE library stays static.
  const rxWrapper = useCallback(
    (err, characteristic) => {
      const f = rxListener.current;
      if (f) {
        f(err, characteristic);
        return;
      }
      console.log("ERROR", "RX callback called without listener");
    },
    [rxListener]
  );

  // Updates the RX listener with state
  useEffect(() => {
    rxListener.current = (err, characteristic) => {
      if (err) {
        if (err.errorCode === 201 || err.errorCode === 205) {
          reset(null, "unable to read, device disconnected");
          return;
        }
        reset(null, "error reading from device", {
          error: JSON.stringify(err),
        });
        return;
      }
      if (characteristic) {
        const buffer = readBuffer.current;
        const value = Buffer.from(characteristic.value, "base64").toString();
        const read = buffer + value;
        readBuffer.current = read;
        if (read.endsWith("\n")) {
          const trimmed = read.trim();
          console.log("RX:", trimmed);
          const [commandType, id, command, data] = parseCommand(trimmed);
          if (commandType === CommandType.RESPONSE) {
            const callback = pendingCommands[id];
            if (callback) callback(command, data);
            dispatchCommand({
              type: "clear_request",
              id: id,
            });
          } else {
            if (command == Command.HEALTHCHECK) {
              sendCommandResponse(id, command);
            }
          }
          readBuffer.current = "";
        }
      }
    };
  }, [rxListener, pendingCommands, readBuffer, sendCommandResponse]);

  // Setup RX characteristic
  useEffect(() => {
    let rxSubscription;
    if (peripheral) {
      rxSubscription = ble.monitorCharacteristicForDevice(
        peripheral.id,
        "6E400001-B5A3-F393-E0A9-E50E24DCCA9E".toLowerCase(),
        "6E400003-B5A3-F393-E0A9-E50E24DCCA9E".toLowerCase(),
        rxWrapper
      );
    }
    return () => {
      if (rxSubscription && !peripheral) {
        rxSubscription.remove();
      }
    };
  }, [peripheral, rxWrapper]);

  // Writes to the TX characteristic
  const writeTx = useCallback(
    (data) => {
      if (peripheral) {
        console.log("TX:", data);
        peripheral
          .writeCharacteristicWithoutResponseForService(
            "6E400001-B5A3-F393-E0A9-E50E24DCCA9E".toLowerCase(),
            "6E400002-B5A3-F393-E0A9-E50E24DCCA9E".toLowerCase(),
            Buffer.from(data + "\n").toString("base64")
          )
          .catch((err) => {
            reset(peripheral, "error writing to device", {
              error: JSON.stringify(err),
            });
          });
      }
    },
    [peripheral]
  );

  // Sends a command request and awaits the response
  const sendCommandRequest = useCallback(
    (command, ...data) => {
      const id = intToAsciiHexByte(packetID);
      setPacketID((packetID) => packetID + 1);
      const commandID = intToAsciiHexByte(command);
      const dataPayload = data.join("#");
      const packet = `${CommandType.REQUEST}${id}|${commandID}|${dataPayload}`;

      return new Promise((resolve, reject) => {
        dispatchCommand({
          type: "pend_request",
          id: id,
          callback: resolve,
        });
        writeTx(packet);
        setTimeout(() => {
          reject(new Error("did not receive response within 1000ms"));
          dispatchCommand({
            type: "clear_request",
            id: id,
          });
        }, 1000);
      });
    },
    [packetID, writeTx]
  );

  // Sends a command response
  const sendCommandResponse = useCallback(
    (id, command, ...data) => {
      const commandID = intToAsciiHexByte(command);
      const dataPayload = data.join("#");
      const packet = `${CommandType.RESPONSE}${id}|${commandID}|${dataPayload}`;
      writeTx(packet);
    },
    [writeTx]
  );

  // Resets the connection state of the peripheral
  const reset = useCallback((peripheral, err = null, storytime = {}) => {
    if (peripheral) {
      ble
        .cancelDeviceConnection(peripheral.id)
        .catch((disconnectErr) =>
          console.log(
            "unable to disconnect on reset",
            JSON.stringify(disconnectErr)
          )
        );
    }
    if (err) {
      let details = [];
      if (storytime) {
        details = Object.entries(storytime);
      }
      console.log("ERROR", err, ...details);
      setError(err);
    }
    setConnectionStatus(BleConnectionStatus.READY_TO_CONNECT);
    setPeripheral(null);
  }, []);

  // Sets up a healthcheck loop
  useHealthcheck(peripheral, sendCommandRequest, reset);

  // Callback to execute the Get Pedestals command
  const getPedestals = useCallback(async () => {
    const ledState = {};
    if (peripheral) {
      const [_, data] = await sendCommandRequest(Command.GET_PEDESTALS);
      for (let led of data) {
        const address = led.slice(0, 2);
        const color = `#${led.slice(2)}`;
        ledState[address] = color;
      }
    }
    return ledState;
  }, [peripheral, sendCommandRequest]);

  // Callback to execute the Set Pedestals Color command
  const setPedestalsColor = useCallback(
    async (ledState) => {
      if (peripheral) {
        const reqData = Object.entries(ledState).map(([address, color]) => {
          const rawColor = color.slice(1);
          return `${address}${rawColor}`;
        });
        const [_, resAddrs] = await sendCommandRequest(
          Command.SET_PEDESTALS_COLOR,
          ...reqData
        );
        const reqAddrs = Object.keys(reqData);
        const missingAddrs = [];
        for (let addr of reqAddrs) {
          if (!resAddrs.includes(addr)) missingAddrs.push(addr);
        }
        if (missingAddrs.length > 0) {
          console.log(
            "ERROR",
            "missing expected addresses in Set Pedestals Color response:",
            missingAddrs
          );
          return;
        }
      }
      return;
    },
    [peripheral, sendCommandRequest]
  );

  return [error, connectionStatus, getPedestals, setPedestalsColor];
};
