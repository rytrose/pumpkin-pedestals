import asyncio
import board
import busio
import adafruit_logging as logging

from log import MyHandler

# Pedestal commands
COMMAND_GET_STATE = 0x01
COMMAND_SET_COLOR = 0x02
COMMAND_SET_BLINKING = 0x03


class I2CController:
    def __init__(self):
        self.logger = logging.getLogger(self.__class__.__name__)
        self.logger.setLevel(logging.DEBUG)
        self.logger.addHandler(MyHandler(self.__class__.__name__))
        self.i2c = busio.I2C(board.SCL, board.SDA)
        self.i2c_lock = asyncio.Lock()
        self.pedestal_addresses = []

    async def scan_for_pedestals(self):
        async with self.i2c_lock:
            self.pedestals = [hex(address) for address in self.i2c.scan()]

    async def get_pedestals(self):
        """Returns the current pedestals found on the I2C bus, in the command format:
        I2C address (2 char hex string)
        Red value (2 char hex string)
        Green value (2 char hex string)
        Blue value (2 char hex string)
        Blinling state (1 char, 0 or 1)
        """
        await self.scan_for_pedestals()
        pedestals = []
        async with self.i2c_lock:
            for address in self.pedestal_addresses:
                command = bytearray([COMMAND_GET_STATE])
                response = bytearray(4)
                try:
                    self.i2c.writeto_then_readfrom(address, command, response)
                except RuntimeError as e:
                    self.logger.error(
                        "Failed on writeto_then_readfrom to address %X", address
                    )
                    self.pedestal_addresses = [
                        a for a in self.pedestal_addresses if a != address
                    ]
                    continue
                pedestals.append(
                    f"{address:X}"  # Pedestal address, e.g. 62
                    + f"{response[0]:X}"  # Red hex, e.g. 1A
                    + f"{response[1]:X}"  # Green hex, e.g. 2B
                    + f"{response[2]:X}"  # Blue hex, e.g. 3C
                    + f"{response[3]:d}"  # Blinking state, either 0 or 1
                )
        return pedestals

    async def set_pedestals_color(self, pedestal_colors):
        """Sets the pedestals to the colors provided."""
        await self.scan_for_pedestals()
        pedestals = []
        async with self.i2c_lock:
            for pedestal_color in pedestal_colors:
                address = int(pedestal_color[0:2], 16)
                if address in not self.pedestal_addresses:
                   self.logger.error(
                        "Attempted to set color for address not on I2C bus: %X", address
                    )
                    continue

                red = int(pedestal_color[2:4], 16)
                green = int(pedestal_color[4:6], 16)
                blue = int(pedestal_color[6:8], 16)
                command = bytearray([COMMAND_SET_COLOR, red, green, blue])
                response = bytearray(4)
                try:
                    self.i2c.writeto_then_readfrom(address, command, response)
                except RuntimeError as e:
                    self.logger.error(
                        "Failed on writeto_then_readfrom to address %X", address
                    )
                    self.pedestal_addresses = [
                        a for a in self.pedestal_addresses if a != address
                    ]
                    continue
        return await self.get_pedestals()
