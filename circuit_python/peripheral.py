import asyncio
import adafruit_logging as logging
from adafruit_ble import BLERadio
from adafruit_ble.advertising.standard import ProvideServicesAdvertisement
from adafruit_ble.services.nordic import UARTService

from log import MyHandler
from command import CommandType, Command, int_to_ascii_byte, parse_command
from i2c_controller import I2CController


class BLEClient:
    def __init__(self):
        self.ble = BLERadio()
        self.uart = UARTService()
        self.advertisement = ProvideServicesAdvertisement(self.uart)
        self.i2c_controller = I2CController()
        self.logger = logging.getLogger(self.__class__.__name__)
        self.logger.setLevel(logging.INFO)  # type: ignore
        self.logger.addHandler(MyHandler(self.__class__.__name__))
        self.healthcheck_task = None
        self.healthcheck_num_failed = 0
        self.pending_commands = {}
        self.packet_id = 0

    async def connect(self):
        if not self.ble.connected:
            self.logger.info("starting advertising")
            self.ble.start_advertising(self.advertisement)
            while not self.ble.connected:
                await asyncio.sleep(0)
            self.logger.info("connected")
            self.ble.stop_advertising()
            asyncio.create_task(self._read())
            self.healthcheck_task = asyncio.create_task(self._healthcheck())

    def write(self, data):
        self.logger.debug("TX: %s", data)
        if self.ble.connected:
            self.uart.write(data + "\n")

    async def _reset(self):
        for conn in self.ble.connections:
            if conn is not None:
                conn.disconnect()
        self.pending_commands = {}
        if self.healthcheck_task is not None:
            self.healthcheck_task.cancel()
        self.healthcheck_num_failed = 0
        asyncio.create_task(self.connect())

    async def _read(self):
        while self.ble.connected:
            l = await self._read_line()
            if l:
                self.logger.debug("RX: %s", l)
                command_type, id, command, data = parse_command(l)
                if command_type == CommandType.RESPONSE:
                    callback = self.pending_commands.get(id, None)
                    if callback:
                        callback(command, data)
                    else:
                        self.logger.error(
                            "no callback for id: "
                            + id
                            + " "
                            + str(self.pending_commands)
                        )
                else:
                    if command == Command.HEALTHCHECK:
                        await self.send_command_response(id, command)
                    if command == Command.GET_PEDESTALS:
                        pedestals = await self.i2c_controller.get_pedestals()
                        await self.send_command_response(id, command, *pedestals)
                    if command == Command.SET_PEDESTALS_COLOR:
                        pedestals = await self.i2c_controller.set_pedestals_color(data)
                        await self.send_command_response(id, command, *pedestals)
                    if command == Command.BLINK_PEDESTALS:
                        data = [address + "1" for address in data]
                        pedestals = await self.i2c_controller.set_pedestals_blinking(
                            data
                        )
                        await self.send_command_response(id, command, *pedestals)
                    if command == Command.STOP_PEDESTALS_BLINKING:
                        data = [address + "0" for address in data]
                        pedestals = await self.i2c_controller.set_pedestals_blinking(
                            data
                        )
                        await self.send_command_response(id, command, *pedestals)

        self.logger.info("no longer connected, reconnecting")
        asyncio.create_task(self._reset())

    async def _read_line(self):
        if self.uart.in_waiting > 0:
            l = self.uart.readline()
            if l != b"" and l is not None:
                l = l.decode("utf-8").strip("\n")
                return l
        return None

    async def send_command_request(self, command, *data, response_handler=None):
        if self.ble.connected:
            packet_id = int_to_ascii_byte(self.packet_id)
            id = "{}{}".format(CommandType.REQUEST, packet_id)
            packet = "{}|{}|{}".format(id, int_to_ascii_byte(command), "#".join(data))
            self.pending_commands[packet_id] = response_handler
            self.packet_id = self.packet_id + 1
            self.write(packet)

    async def send_command_response(self, id, command, *data):
        if self.ble.connected:
            packet = "{}|{}|{}".format(
                CommandType.RESPONSE + id, int_to_ascii_byte(command), "#".join(data)
            )
            self.write(packet)

    def on_healthcheck_response(self, command, data):
        self.healthcheck_num_failed = 0

    async def _healthcheck(self):
        # Let the connection settle for a few seconds
        await asyncio.sleep(3)

        while True:
            # Pessimistically set failed to have healthcheck responder reset to 0 on success
            self.healthcheck_num_failed += 1
            await self.send_command_request(
                Command.HEALTHCHECK, response_handler=self.on_healthcheck_response
            )
            if self.healthcheck_num_failed > 2:
                self.logger.error("failed healthcheck")
                asyncio.create_task(self._reset())
            await asyncio.sleep(1)
