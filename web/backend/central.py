import asyncio
import contextlib
import adafruit_logging as logging
from adafruit_ble import BLERadio
from adafruit_ble.advertising.standard import ProvideServicesAdvertisement
from adafruit_ble.services.nordic import UARTService

from log import MyHandler
from command import CommandType, Command, int_to_ascii_byte, parse_command

from concurrent.futures import ThreadPoolExecutor


class BLEClient:
    def __init__(self):
        self.executor = ThreadPoolExecutor(1)
        self.logger = logging.getLogger(self.__class__.__name__)
        self.logger.setLevel(logging.INFO)  # type: ignore
        self.logger.addHandler(MyHandler(self.__class__.__name__))
        self.ble = BLERadio()
        self.uart = None
        self.healthcheck_task = None
        self.healthcheck_num_failed = 0
        self.pending_commands = {}
        self.packet_id = 0

    async def connect(self):
        if not self.ble.connected:
            self.logger.info("starting scanning")

            def scan():
                try:
                    for advertisement in self.ble.start_scan(
                        ProvideServicesAdvertisement, timeout=5
                    ):
                        if (
                            advertisement is not None
                            and UARTService not in advertisement.services  # type: ignore
                        ):
                            continue
                        self.logger.info("found UART service, connecting")
                        connection = self.ble.connect(advertisement)
                        self.uart = connection[UARTService]
                        self.logger.info("connected")
                        break
                except Exception as e:
                    self.logger.error(f"BLE scanning failed: {e}")

            # Allow the coroutine to yield by scanning in a new thread
            await asyncio.get_running_loop().run_in_executor(self.executor, scan)

            self.ble.stop_scan()
            asyncio.create_task(self._read())
            self.healthcheck_task = asyncio.create_task(self._healthcheck())

    def write(self, data):
        self.logger.debug("TX: %s", data)
        if self.ble.connected and self.uart is not None:
            self.uart.write((data + "\n").encode("utf-8"))

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
            l = await asyncio.create_task(self._read_line())
            if l:
                self.logger.debug("RX: %s", l)
                command_type, id, command, data = parse_command(l)
                if command_type == CommandType.RESPONSE:
                    callback, event = self.pending_commands.get(id, None)
                    if callback:
                        callback(command, data)
                        event.set()
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

        self.logger.info("not connected, reconnecting")
        asyncio.create_task(self._reset())

    async def _read_line(self):
        if self.uart is not None and self.uart.in_waiting > 0:
            l = self.uart.readline()
            if l != b"":
                l = l.decode("utf-8").strip("\n")
                return l
        return None

    async def send_command_request(self, command, *data, response_handler=None):
        if self.ble.connected:
            packet_id = int_to_ascii_byte(self.packet_id)
            id = "{}{}".format(CommandType.REQUEST, packet_id)
            packet = "{}|{}|{}".format(id, int_to_ascii_byte(command), "#".join(data))
            event = asyncio.Event()
            self.pending_commands[packet_id] = (response_handler, event)
            self.packet_id = self.packet_id + 1
            self.write(packet)
            if not await event_wait(event, 5):
                self.logger.error(
                    f"command {command} with ID {id} did not see a response after 5 seconds"
                )

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
            try:
                await asyncio.create_task(
                    self.send_command_request(
                        Command.HEALTHCHECK,
                        response_handler=self.on_healthcheck_response,
                    )
                )
            except Exception as e:
                self.logger.error(f"sending healthcheck failed: {e}")
            if self.healthcheck_num_failed > 2:
                self.logger.error("failed healthcheck, disconnecting")
                if self.ble.connections and len(self.ble.connections) > 0:
                    self.ble.connections[0].disconnect()  # type: ignore
                return
            await asyncio.sleep(1)


async def event_wait(event, timeout):
    """
    Waits on an asyncio.Event() until the timeout.

    Returns True when the event is set, returns False if the timeout elapses.

        See: https://stackoverflow.com/a/49632779
    """
    # suppress TimeoutError because we'll return False in case of timeout
    with contextlib.suppress(asyncio.TimeoutError):
        await asyncio.wait_for(event.wait(), timeout)
    return event.is_set()
