import asyncio
import adafruit_logging as logging

from log import MyHandler
from central import BLEClient
from command import Command


class PedestalCache:
    def __init__(self, mock=False):
        self.mock = mock
        self.logger = logging.getLogger(self.__class__.__name__)
        self.logger.setLevel(logging.DEBUG)
        self.logger.addHandler(MyHandler(self.__class__.__name__))
        self.ble_client = BLEClient()
        asyncio.create_task(self.ble_client.connect())
        asyncio.create_task(self._update_pedestal_state_loop())
        self.pedestals = []

    async def get_pedestals(self, refresh_cache=False):
        """Gets pedestals, with or without refreshing the cache by reaching out to the hub."""
        if self.mock:
            return [
                {"address": "00", "color": "ab1234"},
                {"address": "01", "color": "a2bdf1"},
            ]
        if refresh_cache:
            await asyncio.create_task(
                self.ble_client.send_command_request(
                    Command.GET_PEDESTALS,
                    response_handler=self._on_get_pedestals_response,
                )
            )
        return self.pedestals

    def _on_get_pedestals_response(self, command, data):
        pedestals = []
        for pedestal in data:
            address = pedestal[0:2]
            hex_color = pedestal[2:]
            self.logger.debug(
                "found pedestal at address %s with color #%s", address, hex_color
            )
            pedestals.append({"address": address, "color": hex_color})
        self.pedestals = pedestals

    async def _update_pedestal_state_loop(self):
        while True:
            await self.get_pedestals(refresh_cache=True)
            await asyncio.sleep(3)
