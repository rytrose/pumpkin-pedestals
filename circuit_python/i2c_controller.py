import asyncio
import board
import busio
import adafruit_logging as logging

from log import MyHandler


class PedestalCommand:
    """Enum to signal to the peripheral what data is expected."""

    GET_STATE = 0x01
    SET_COLOR = 0x02
    SET_BLINKING = 0x03


class I2CController:
    def __init__(self):
        self.logger = logging.getLogger(self.__class__.__name__)
        self.logger.setLevel(logging.INFO)  # type: ignore
        self.logger.addHandler(MyHandler(self.__class__.__name__))
        self.i2c = busio.I2C(board.SCL, board.SDA)
        self.i2c_lock = asyncio.Lock()
        self.pedestal_addresses = []

    async def scan_for_pedestals(self):
        async with self.i2c_lock:
            if self.i2c.try_lock():
                self.pedestal_addresses = [
                    "%x" % address for address in self.i2c.scan()
                ]
                self.logger.debug(f"scanned pedestals: {self.pedestal_addresses}")
                self.i2c.unlock()
            else:
                self.logger.error("Unable to acquire I2C lock in scan_for_pedestals")

    async def get_pedestals(self):
        """
        Returns the current pedestals found on the I2C bus, in the command format:
            - I2C address (2 char hex string)
            - Red value (2 char hex string)
            - Green value (2 char hex string)
            - Blue value (2 char hex string)
            - Blinking state (1 char, 0 or 1)

        Example: ["63AB2E4F0", "649BCC0A1"]
        """
        await self.scan_for_pedestals()
        pedestals = []
        async with self.i2c_lock:
            for address in self.pedestal_addresses:
                response = self.send_i2c_command(
                    address, PedestalCommand.GET_STATE, [], 4
                )
                if response is None:
                    continue
                pedestals.append(
                    f"{address}"  # Pedestal address, e.g. 62
                    + f"{response[0]:02x}"  # Red hex, e.g. 1A
                    + f"{response[1]:02x}"  # Green hex, e.g. 2B
                    + f"{response[2]:02x}"  # Blue hex, e.g. 3C
                    + f"{response[3]:d}"  # Blinking state, either 0 or 1
                )
        return pedestals

    async def set_pedestals_color(self, pedestal_colors):
        """
        Sets the pedestals to the colors provided in the command format:
            - I2C address (2 char hex string)
            - Red value (2 char hex string)
            - Green value (2 char hex string)
            - Blue value (2 char hex string)

        Example: ["63AB2E4F", "649BCC0A"]

        Returns the current pedestals in command format.
        """
        await self.scan_for_pedestals()
        pedestals = []
        async with self.i2c_lock:
            for pedestal_color in pedestal_colors:
                address = pedestal_color[0:2].lower()
                if address not in self.pedestal_addresses:
                    self.logger.error(
                        "Attempted to set color for address not on I2C bus: %X", address
                    )
                    continue
                red = int(pedestal_color[2:4], 16)
                green = int(pedestal_color[4:6], 16)
                blue = int(pedestal_color[6:8], 16)
                response = self.send_i2c_command(
                    address, PedestalCommand.SET_COLOR, [red, green, blue], 4
                )
                if response is None:
                    continue
        return await self.get_pedestals()

    async def set_pedestals_blinking(self, pedestal_blinking_states):
        """Sets the pedestals to blinking states provided in the command format:
            - I2C address (2 char hex string)
            - Blinking state (1 char, 0 or 1)

        Example: ["631", "640"]

        Returns the current pedestals in command format.
        """
        await self.scan_for_pedestals()
        pedestals = []
        async with self.i2c_lock:
            for pedestal_blinking_state in pedestal_blinking_states:
                address = pedestal_blinking_state[0:2].lower()
                if address not in self.pedestal_addresses:
                    self.logger.error(
                        "Attempted to set blinking for address not on I2C bus: %X",
                        address,
                    )
                    continue

                blinking_state = int(pedestal_blinking_state[2])
                response = self.send_i2c_command(
                    address, PedestalCommand.SET_BLINKING, [blinking_state], 4
                )
                if response is None:
                    continue
        return await self.get_pedestals()

    def send_i2c_command(self, address, command, data, response_length):
        """Sends a command via an I2C transaction.

        Args:
            address (String): Hex I2C peripheral address
            command (PeripheralCommand): The command to send
            data (List[int]): Data to send with the command, or an empty list
            response_length (int): The expected number of bytes to receive from the peripheral

        Returns:
            A bytearray of length `response_length` containing the data returned by the peripheral,
            or None if the peripheral was unable to be reached.
        """
        out_buffer = bytearray([command] + data)
        in_buffer = bytearray(response_length)
        try:
            if self.i2c.try_lock():
                self.logger.debug(f"I2C write: out_buffer {[i for i in out_buffer]}")
                self.i2c.writeto(int(address, 16), out_buffer)
                self.i2c.readfrom_into(int(address, 16), in_buffer)
                self.logger.debug(f"I2C read: in_buffer {[i for i in in_buffer]}")
            else:
                self.logger.error("Unable to acquire I2C lock in send_i2c_command")
        except (RuntimeError, OSError) as e:
            self.logger.error(
                f"Failed i2c for command {command} to address {address}",
            )
            self.pedestal_addresses = [
                a for a in self.pedestal_addresses if a != address
            ]
            return None
        finally:
            self.i2c.unlock()
        return in_buffer
