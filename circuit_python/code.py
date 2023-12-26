# pyright: ignore
import asyncio
import board
import digitalio

from peripheral import BLEClient

led = digitalio.DigitalInOut(board.LED)
led.direction = digitalio.Direction.OUTPUT


async def main():
    ble_client = BLEClient()
    asyncio.create_task(ble_client.connect())

    while True:
        await asyncio.sleep(10)


asyncio.run(main())
