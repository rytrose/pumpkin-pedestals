import asyncio
import adafruit_logging as logging
from adafruit_ble import BLERadio
from adafruit_ble.advertising.standard import ProvideServicesAdvertisement
from adafruit_ble.services.nordic import UARTService

from log import MyHandler


class BLEClient:

    def __init__(self):
        self.ble = BLERadio()
        self.uart = UARTService()
        self.advertisement = ProvideServicesAdvertisement(self.uart)
        self.logger = logging.getLogger(self.__class__.__name__)
        self.logger.setLevel(logging.DEBUG)
        self.logger.addHandler(MyHandler(self.__class__.__name__))

    async def connect(self):
        if not self.ble.connected:
            self.ble.start_advertising(self.advertisement)
            while not self.ble.connected:
                await asyncio.sleep(0)
            self.logger.info("connected")
            self.ble.stop_advertising()
            asyncio.create_task(self._read())

    async def _read(self):
        while self.ble.connected:
            l = await asyncio.create_task(self._read_line())
            if l:
                self.logger.debug("read: %s", l)
        self.logger.info("no longer connected, reconnecting")
        asyncio.create_task(self.connect())

    async def _read_line(self):
        if self.uart.in_waiting > 0:
            l = self.uart.readline()
            if l != b'':
                l = l.decode("utf-8").strip('\n')
                self.uart.write("ACK\n".encode("utf-8"))
                return l
        return None
