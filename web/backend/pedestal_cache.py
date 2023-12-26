import asyncio
import adafruit_logging as logging

from log import MyHandler
from central import BLEClient
from command import Command


class PedestalCache:
    def __init__(self, mock=False):
        self.mock = mock
        self.mock_pedestals = [
            {"address": "00", "color": "eb2e34", "blinking": True},
            {"address": "01", "color": "a2bdf1", "blinking": False},
            {"address": "02", "color": "00a12d", "blinking": False},
        ]
        self.logger = logging.getLogger(self.__class__.__name__)
        self.logger.setLevel(logging.DEBUG)  # type: ignore
        self.logger.addHandler(MyHandler(self.__class__.__name__))
        self.ble_client = BLEClient()
        asyncio.create_task(self.ble_client.connect())
        asyncio.create_task(self._update_pedestal_state_loop())
        self.pedestals = []

    async def get_pedestals(self, refresh_cache=False):
        """Gets pedestals, with or without refreshing the cache by reaching out to the hub."""
        if self.mock:
            return self.mock_pedestals
        if refresh_cache:
            await asyncio.create_task(
                self.ble_client.send_command_request(
                    Command.GET_PEDESTALS,
                    response_handler=self._parse_pedestal_response_data(
                        "get_pedestals"
                    ),
                )
            )
        return self.pedestals

    async def _update_pedestal_state_loop(self):
        while True:
            await self.get_pedestals(refresh_cache=True)
            await asyncio.sleep(1)

    async def set_pedestals_color(self, pedestals_color):
        data = [
            pedestal_color["address"] + pedestal_color["color"]
            for pedestal_color in pedestals_color
        ]
        if self.mock:
            for new_pedestal in pedestals_color:
                for pedestal in self.mock_pedestals:
                    if pedestal["address"] == new_pedestal["address"]:
                        pedestal["color"] = new_pedestal["color"]
            return self.mock_pedestals
        await asyncio.create_task(
            self.ble_client.send_command_request(
                Command.SET_PEDESTALS_COLOR,
                *data,
                response_handler=self._parse_pedestal_response_data(
                    "set_pedestals_color"
                ),
            )
        )
        return self.pedestals

    async def blink_pedestals(self, addresses):
        if self.mock:
            for new_address in addresses:
                for pedestal in self.mock_pedestals:
                    if pedestal["address"] == new_address:
                        pedestal["blinking"] = True
            return self.mock_pedestals
        await asyncio.create_task(
            self.ble_client.send_command_request(
                Command.BLINK_PEDESTALS,
                *addresses,
                response_handler=self._parse_pedestal_response_data("blink_pedestals"),
            )
        )
        return self.pedestals

    async def stop_pedestals_blinking(self, addresses):
        if self.mock:
            for new_address in addresses:
                for pedestal in self.mock_pedestals:
                    if pedestal["address"] == new_address:
                        pedestal["blinking"] = False
            return self.mock_pedestals
        await asyncio.create_task(
            self.ble_client.send_command_request(
                Command.STOP_PEDESTALS_BLINKING,
                *addresses,
                response_handler=self._parse_pedestal_response_data(
                    "stop_pedestals_blinking"
                ),
            )
        )
        return self.pedestals

    def _parse_pedestal_response_data(self, method):
        def _parse_data(command, data):
            pedestals = []
            for pedestal in data:
                address = pedestal[0:2]
                hex_color = pedestal[2:-1]
                blinking = True if pedestal[-1] == "1" else False
                self.logger.debug(
                    "%s responded with pedestal at address %s with color #%s and blinking state %b",
                    method,
                    address,
                    hex_color,
                    blinking,
                )
                pedestals.append(
                    {"address": address, "color": hex_color, "blinking": blinking}
                )
            self.pedestals = pedestals

        return _parse_data
